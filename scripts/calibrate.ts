// Uji kalibrasi walk-forward: apakah pita proyeksi "jujur"?
//
// Untuk setiap bulan mulai s di masa lalu: buat proyeksi DCA 5 tahun HANYA dari data sebelum s,
// lalu bandingkan dengan hasil nyata s..s+59. Jika model terkalibrasi, hasil nyata jatuh di
// pita p5–p95 ~90% kali dan di pita p25–p75 ~50% kali. PIT rata-rata ~0,5 (>0,5 = model terlalu
// pesimis, <0,5 = terlalu optimis).
//
// Catatan: jendela 5 thn saling tumpang tindih, jadi jumlah pengamatan independen jauh lebih
// kecil dari jumlah titik uji. Anggap angka ini indikatif, bukan bukti statistik ketat.
import { readFileSync } from "node:fs";
import { buildPanel, commonWindow, componentsOf, type PriceDb } from "../src/lib/sim/data.ts";
import { runDca } from "../src/lib/sim/dca.ts";
import { FX_ID, getInstrument, INSTRUMENTS } from "../src/lib/sim/instruments.ts";
import { sigmaMu, simulate } from "../src/lib/sim/montecarlo.ts";
import { mean, std } from "../src/lib/sim/stats.ts";

const db: PriceDb = JSON.parse(readFileSync(new URL("../data/prices.json", import.meta.url), "utf8"));
const panel = buildPanel(db);
const HORIZON = 60;
const MIN_HIST = 120;
const STEP = 3;
const PATHS = 1000;

// Prior "netral" yang dipilih tanpa melihat data uji: ekuitas ≈ inflasi + premi risiko saham.
const PRIOR: Record<string, number> = { ihsg: 0.09, bbca: 0.09, tlkm: 0.09, sp500: 0.065, gold: 0.04 };

type Variant = { name: string; blockLen: number; shrink: number; uncertainty?: boolean; volBlend?: number };
const VARIANTS: Variant[] = [
  { name: "block bootstrap, rata2 sejarah", blockLen: 12, shrink: 0 },
  { name: "prior (mode dasar v1)", blockLen: 12, shrink: 1 },
  { name: "prior + ketidakpastian rata2", blockLen: 12, shrink: 1, uncertainty: true },
  { name: "prior + ketidakpastian + vol terkini", blockLen: 12, shrink: 1, uncertainty: true, volBlend: 0.5 },
];


for (const id of ["ihsg", "sp500", "bbca", "tlkm", "gold"]) {
  const ins = getInstrument(id);
  const comps = componentsOf(ins);
  const [from, to] = commonWindow(panel, comps);
  const plan = { monthly: 1, months: HORIZON, weights: { [id]: 1 } };
  const rows: Record<string, number[]> = Object.fromEntries(VARIANTS.map((v) => [v.name, []]));

  for (let s = from + MIN_HIST; s + HORIZON <= to; s += STEP) {
    if (!comps.every((c) => panel.comps[c].slice(s, s + HORIZON).every((x) => x != null))) continue;
    const realized = runDca(plan, INSTRUMENTS, (m) => {
      let lr = panel.comps[id][s + m]!;
      if (comps.includes(FX_ID)) lr += panel.comps[FX_ID][s + m]!;
      return Math.exp(lr) - 1;
    }).xirr;

    for (const v of VARIANTS) {
      const targets: Record<string, number> = {};
      const uncertainty: Record<string, number> = {};
      for (const c of comps) {
        const [a] = commonWindow(panel, [c], s);
        const xs = panel.comps[c].slice(a, s) as number[];
        const trailing = Math.exp(12 * mean(xs)) - 1;
        const prior = c === FX_ID ? trailing : PRIOR[id];
        targets[c] = (1 - v.shrink) * trailing + v.shrink * prior;
        if (v.uncertainty) uncertainty[c] = sigmaMu(std(xs) * Math.sqrt(12));
      }
      const sim = simulate({
        panel, plan, mode: "dasar", targets, uncertainty, volBlend: v.volBlend,
        historyEnd: s, blockLen: v.blockLen, paths: PATHS, seed: s,
      });
      // PIT dari persentil yang tersedia: posisi hasil nyata di antara p5/p25/p50/p75/p95.
      const q = sim.xirr;
      const pit = realized < q.p5 ? 0.025 : realized < q.p25 ? 0.15 : realized < q.p50 ? 0.375 : realized < q.p75 ? 0.625 : realized < q.p95 ? 0.85 : 0.975;
      rows[v.name].push(pit);
    }
  }

  const n = rows[VARIANTS[0].name].length;
  console.log(`\n${ins.name} — DCA ${HORIZON} bln, ${n} titik uji (tiap ${STEP} bln, sejarah min ${MIN_HIST} bln)`);
  console.log("varian                                          di p5–p95 (ideal 90%)  di p25–p75 (ideal 50%)  PIT rata2 (ideal 0,50)");
  for (const v of VARIANTS) {
    const p = rows[v.name];
    const in90 = p.filter((x) => x > 0.025 && x < 0.975).length / p.length;
    const in50 = p.filter((x) => x === 0.375 || x === 0.625).length / p.length;
    console.log(`${v.name.padEnd(48)} ${(in90 * 100).toFixed(0).padStart(5)}%                 ${(in50 * 100).toFixed(0).padStart(5)}%                 ${mean(p).toFixed(2)}`);
  }
}
