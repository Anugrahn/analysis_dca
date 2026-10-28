import assert from "node:assert/strict";
import { test } from "node:test";
import { medianRisk, riskMetrics, stabilityBand, stabilityScore } from "../src/lib/sim/risk.ts";

const close = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b} (±${tol})`);

test("riskMetrics: deret konstan → tanpa risiko", () => {
  const m = riskMetrics(Array(24).fill(0.01), 0.05);
  close(m.twr, Math.pow(1.01, 12) - 1, 1e-12);
  close(m.vol, 0, 1e-12);
  assert.equal(m.mdd, 0);
  assert.equal(m.underwater, 0);
  assert.equal(m.recovery, 0);
  close(m.var95, 0.01, 1e-12);
  assert.equal(m.sharpe, null, "tanpa naik-turun, rasio per gejolak tidak bermakna");
  assert.equal(m.calmar, null);
});

test("riskMetrics: jatuh 50%, pulih 2 bulan kemudian", () => {
  // naik, jatuh 50%, lalu dua bulan naik sampai melewati puncak → pemulihan selesai
  const m = riskMetrics([0.1, -0.5, 0.5, 0.3334, 0.01], 0.0);
  close(m.mdd, -0.5, 1e-9);
  assert.equal(m.recovery, 3, "dari puncak (bulan 0) sampai puncak baru (bulan 3)");
  assert.equal(m.stillUnderwater, 0);
  close(m.underwater, 2 / 5, 1e-9);
  assert.ok(m.cvar95 <= m.var95);
});

test("riskMetrics: belum pulih di akhir dicatat terpisah", () => {
  const m = riskMetrics([0.1, -0.3, 0.05, 0.05], 0.0);
  assert.equal(m.recovery, 0, "tidak ada pemulihan yang selesai");
  assert.equal(m.stillUnderwater, 3);
});

test("riskMetrics: Sharpe & Sortino memakai risk-free yang diberikan", () => {
  const r = [0.03, -0.02, 0.04, -0.01, 0.02, 0.01, -0.03, 0.05, 0.0, 0.02, -0.01, 0.03];
  const a = riskMetrics(r, 0.0);
  const b = riskMetrics(r, 0.06);
  close(a.sharpe! - b.sharpe!, 0.06 / a.vol, 1e-9);
  assert.ok(a.sortino! > b.sortino!);
});

test("stabilityScore mengikuti bobot 35/25/20/20 dan batas 30 poin / −60%", () => {
  assert.equal(stabilityScore({ pctProfit: 1, pctBeatInflation: 1, iqrGrowth: 0, medianMdd: 0 }), 100);
  assert.equal(stabilityScore({ pctProfit: 0, pctBeatInflation: 0, iqrGrowth: 0.3, medianMdd: -0.6 }), 0);
  // 35·0,8 + 25·0,6 + 20·(1−0,15/0,3) + 20·(1−0,3/0,6) = 28 + 15 + 10 + 10 = 63
  assert.equal(stabilityScore({ pctProfit: 0.8, pctBeatInflation: 0.6, iqrGrowth: 0.15, medianMdd: -0.3 }), 63);
  // inflasi tak diketahui: bobot 25% dibagi ke komponen lain, bukan dianggap 0
  assert.equal(stabilityScore({ pctProfit: 1, pctBeatInflation: null, iqrGrowth: 0, medianMdd: 0 }), 100);
  assert.equal(stabilityBand(80), "sangat stabil");
  assert.equal(stabilityBand(40), "naik-turun");
});

test("medianRisk: median per metrik, rasio null kalau mayoritas tak terdefinisi", () => {
  const up = riskMetrics([0.01, 0.02, -0.01, 0.03], 0);
  const flat = riskMetrics([0, 0, 0, 0], 0);
  const m = medianRisk([up, up, flat]);
  close(m.vol, up.vol, 1e-12);
  assert.equal(m.sharpe, up.sharpe);
  assert.equal(medianRisk([flat, flat, up]).sharpe, null);
});
