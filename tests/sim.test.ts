import assert from "node:assert/strict";
import { test } from "node:test";
import { backtest } from "../src/lib/sim/backtest.ts";
import { commonWindow, type Panel } from "../src/lib/sim/data.ts";
import { runDca, xirrMonthly } from "../src/lib/sim/dca.ts";
import { FX_ID, type Instrument } from "../src/lib/sim/instruments.ts";
import { simulate } from "../src/lib/sim/montecarlo.ts";
import { recommend } from "../src/lib/sim/profile.ts";
import { rng } from "../src/lib/sim/stats.ts";

const free = (id: string, currency: "IDR" | "USD" = "IDR"): Instrument => ({
  id, name: id, cls: "saham-id", source: { kind: "yahoo", symbol: id, currency }, buyFee: 0, sellFee: 0, divDrag: 0, note: "",
});
const close = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b} (±${tol})`);

test("XIRR: return 1%/bln konstan → (1,01)^12 - 1", () => {
  const ins = [free("a")];
  const r = runDca({ monthly: 1_000_000, months: 60, weights: { a: 1 } }, ins, () => 0.01);
  close(r.xirr, Math.pow(1.01, 12) - 1, 1e-6);
  assert.equal(r.contributed, 60_000_000);
});

test("XIRR: tanpa return → 0, rugi total → -100%", () => {
  close(xirrMonthly([100, 100, 100], 300), 0, 1e-9);
  assert.equal(xirrMonthly([100], 0), -1);
});

test("biaya beli & jual mengurangi nilai akhir secara proporsional", () => {
  const ins: Instrument[] = [{ ...free("a"), buyFee: 0.01, sellFee: 0.02 }];
  const r = runDca({ monthly: 100, months: 12, weights: { a: 1 } }, ins, () => 0);
  close(r.finalValue, 1200 * 0.99 * 0.98, 1e-9);
});

test("step-up: setoran naik tiap 12 bulan", () => {
  const r = runDca({ monthly: 100, months: 24, stepUpYearly: 0.1, weights: { a: 1 } }, [free("a")], () => 0);
  close(r.contributed, 1200 + 1320, 1e-9);
});

test("rebalance tahunan mengembalikan bobot ke target", () => {
  const ins = [free("a"), free("b")];
  // a naik 10%/bln, b datar → tanpa rebalance bobot a melonjak
  const ret = (_m: number, id: string) => (id === "a" ? 0.1 : 0);
  const plan = { monthly: 100, months: 13, weights: { a: 0.5, b: 0.5 } };
  const no = runDca(plan, ins, ret);
  const yes = runDca({ ...plan, rebalanceYearly: true }, ins, ret);
  assert.ok(yes.finalValue < no.finalValue, "rebalance menjual pemenang");
});

test("drawdown & rugi-vs-setoran terdeteksi", () => {
  const r = runDca({ monthly: 100, months: 3, weights: { a: 1 } }, [free("a")], (m) => [0, -0.5, 0][m]);
  close(r.maxDrawdown, -0.5, 1e-9);
  assert.ok(r.worstVsContrib < -0.3);
});

function syntheticPanel(months: number, ids: string[], muAnnual: number, volAnnual: number): Panel {
  const R = rng(7);
  const comps: Panel["comps"] = {};
  for (const id of ids) {
    comps[id] = Array.from({ length: months }, (_, t) =>
      t === 0 ? null : Math.log(1 + muAnnual) / 12 + (volAnnual / Math.sqrt(12)) * R.normal(),
    );
  }
  return { months: Array.from({ length: months }, (_, t) => `m${t}`), comps };
}

test("Monte Carlo mode dasar: median XIRR mendekati target CMA, bukan rata-rata sejarah", () => {
  const panel = syntheticPanel(240, ["a"], 0.3, 0.15); // sejarah 30%/thn
  const ins = [free("a")];
  const plan = { monthly: 1, months: 120, weights: { a: 1 } };
  const s = simulate({ panel, plan, mode: "dasar", instruments: ins, targets: { a: 0.08 }, paths: 3000 });
  close(s.xirr.p50, 0.08, 0.01);
  const h = simulate({ panel, plan, mode: "historis", instruments: ins, paths: 3000 });
  assert.ok(h.xirr.p50 > 0.2, "mode historis memakai rata-rata sejarah");
});

test("Monte Carlo: aset USD = return lokal + kurs", () => {
  const panel = syntheticPanel(240, ["u", FX_ID], 0.0, 0.0001);
  const ins = [free("u", "USD")];
  const s = simulate({
    panel, mode: "dasar", instruments: ins, paths: 200,
    plan: { monthly: 1, months: 60, weights: { u: 1 } },
    targets: { u: 0.05, [FX_ID]: 0.02 },
  });
  close(s.xirr.p50, 1.05 * 1.02 - 1, 0.002);
});

test("setoran yang dibutuhkan untuk keyakinan 80% benar-benar memberi ~80%", () => {
  const panel = syntheticPanel(240, ["a"], 0.1, 0.2);
  const ins = [free("a")];
  const base = { panel, mode: "dasar" as const, instruments: ins, targets: { a: 0.08 }, paths: 4000, seed: 1, goal: 100_000_000 };
  const s = simulate({ ...base, plan: { monthly: 1_000_000, months: 60, weights: { a: 1 } } });
  const again = simulate({ ...base, plan: { monthly: s.goal!.requiredMonthly.p80, months: 60, weights: { a: 1 } } });
  close(again.goal!.prob, 0.8, 0.01);
});

test("instrumen model tanpa volatilitas → hasil deterministik", () => {
  const s = simulate({
    panel: { months: [], comps: {} }, mode: "dasar", paths: 50,
    plan: { monthly: 1_000_000, months: 36, weights: { sbn: 1 } },
  });
  close(s.xirr.p5, 0.054, 1e-6);
  close(s.xirr.p95, 0.054, 1e-6);
  assert.equal(s.probLoss, 0);
});

test("commonWindow: ambil rentang di mana semua komponen ada", () => {
  const panel: Panel = { months: ["1", "2", "3", "4", "5"], comps: { a: [null, 1, 1, 1, 1], b: [null, null, null, 1, 1] } };
  assert.deepEqual(commonWindow(panel, ["a", "b"]), [3, 5]);
});

test("backtest rolling: jumlah run = bulan tersedia - durasi + 1", () => {
  const panel = syntheticPanel(100, ["a"], 0.1, 0.1);
  const b = backtest(panel, { monthly: 1, months: 36, weights: { a: 1 } }, [free("a")]);
  assert.equal(b.runs.length, 99 - 36 + 1);
});

test("profil: dana darurat kurang → semua ke RD Pasar Uang", () => {
  const r = recommend({ horizonYears: 10, maxLossTolerated: 0.5, stableIncome: true, emergencyFundMonths: 2 });
  assert.deepEqual(r.weights, { rdpu: 1 });
});

test("profil: horizon pendek membatasi risiko walau toleransi tinggi", () => {
  const r = recommend({ horizonYears: 2, maxLossTolerated: 0.5, stableIncome: true, emergencyFundMonths: 6 });
  assert.equal(r.level, "konservatif");
  const g = recommend({ horizonYears: 10, maxLossTolerated: 0.5, stableIncome: false, emergencyFundMonths: 6 });
  assert.equal(g.level, "bertumbuh");
});

test("aset bersejarah pendek di-backfill, jendela tetap mengikuti aset bersejarah panjang", () => {
  const panel = syntheticPanel(240, ["a", "b"], 0.08, 0.2);
  panel.comps.b = panel.comps.b.map((x, t) => (t < 180 ? null : x)); // b baru ada 60 bln terakhir
  const s = simulate({
    panel, mode: "dasar", instruments: [free("a"), free("b")], targets: { a: 0.08, b: 0.08 }, paths: 100,
    plan: { monthly: 1, months: 24, weights: { a: 0.5, b: 0.5 } },
  });
  assert.equal(s.history!.months, 239);
  assert.deepEqual(s.history!.backfilled, ["b"]);
});

test("samples: 100 jalur di persentil nilai akhir, dengan potongan sejarah berurutan", () => {
  const panel = syntheticPanel(240, ["a"], 0.08, 0.2);
  panel.months = Array.from({ length: 240 }, (_, t) => `${2000 + Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`);
  const s = simulate({
    panel, mode: "dasar", instruments: [free("a")], targets: { a: 0.08 }, paths: 2000, samples: 100,
    plan: { monthly: 1, months: 60, weights: { a: 1 } },
  });
  assert.equal(s.samples!.length, 100);
  const finals = s.samples!.map((x) => x.final);
  assert.deepEqual([...finals].sort((x, y) => x - y), finals, "urut dari terburuk ke terbaik");
  close(finals[50], s.final.p50, s.final.p50 * 0.05);
  for (const x of s.samples!) {
    assert.equal(x.path.length, 60);
    assert.equal(x.src!.reduce((n, [, len]) => n + len, 0), 60);
  }
});
