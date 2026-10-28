import assert from "node:assert/strict";
import { test } from "node:test";
import { quantileAt } from "../src/lib/app/quantiles.ts";
import { analyzeYears, type YearInput } from "../src/lib/app/yearly.ts";

const close = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b} (±${tol})`);

/** Kuantil sintetis: rentang [lo, hi] linear dari persentil 0 ke 100. */
const lin = (lo: number, hi: number) => Array.from({ length: 101 }, (_, i) => lo + ((hi - lo) * i) / 100);

test("quantileAt membaca posisi nilai di antara persentil", () => {
  const q = lin(0, 100);
  close(quantileAt(q, 50), 0.5, 1e-9);
  close(quantileAt(q, 80), 0.8, 1e-9);
  assert.equal(quantileAt(q, -1), 0);
  assert.equal(quantileAt(q, 101), 1);
});

test("analyzeYears: kolom per tahun dihitung dari distribusi × setoran", () => {
  const input: YearInput[] = [
    { month: 12, contributed: 12, probLoss: 0.4, quantiles: lin(9, 15) },
    { month: 24, contributed: 24, probLoss: 0.2, quantiles: lin(20, 34) },
    { month: 30, contributed: 30, probLoss: 0.05, quantiles: lin(31, 60) },
  ];
  const a = analyzeYears(input, { amount: 1_000_000, stepUp: 0, inflation: 0.03, goal: 40_000_000 });
  const [y1, y2, y3] = a.rows;
  assert.deepEqual(a.rows.map((r) => r.year), [1, 2, 3]);
  close(y1.tengah, 12_000_000, 1);
  close(y2.depositThisYear, 12_000_000, 1);
  close(y3.depositThisYear, 6_000_000, 1);
  close(y2.earnedThisYear, 27_000_000 - 12_000_000 - 12_000_000, 1);
  close(y1.gain, 0, 1);
  close(y3.probGoal!, 1 - (40 - 31) / 29, 1e-6);
  close(y1.realTengah, 12_000_000 / 1.03, 1);
  close(y1.growth, 0, 1e-6);
  assert.ok(y3.growth > 0);
});

test("milestones: momen penting terdeteksi sekali, urut tahun", () => {
  const input: YearInput[] = [
    { month: 12, contributed: 12, probLoss: 0.4, quantiles: lin(9, 15) },
    { month: 24, contributed: 24, probLoss: 0.2, quantiles: lin(20, 34) },
    { month: 36, contributed: 36, probLoss: 0.05, quantiles: lin(37, 80) },
    { month: 48, contributed: 48, probLoss: 0.02, quantiles: lin(60, 140) },
  ];
  const a = analyzeYears(input, { amount: 1, stepUp: 0, inflation: 0, goal: 50 });
  const kinds = a.milestones.map((m) => `${m.year}:${m.kind}`);
  assert.ok(kinds.includes("2:rugi-separuh"), kinds.join());
  assert.ok(kinds.includes("3:rugi-mengecil"), kinds.join());
  assert.ok(kinds.includes("4:dua-kali"), kinds.join());
  assert.ok(kinds.includes("3:apes-pun-untung"), kinds.join());
  assert.ok(kinds.includes("3:bunga-berbunga"), kinds.join());
  assert.ok(kinds.includes("3:target-mungkin"), kinds.join());
  assert.ok(kinds.includes("4:target-yakin"), kinds.join());
  assert.deepEqual([...a.milestones].map((m) => m.year), [...a.milestones].map((m) => m.year).sort((x, y) => x - y));
});

test("milestones: tidak ada klaim kalau kondisinya tidak pernah terjadi", () => {
  const input: YearInput[] = [
    { month: 12, contributed: 12, probLoss: 0.05, quantiles: lin(11, 13) },
    { month: 24, contributed: 24, probLoss: 0.04, quantiles: lin(23, 26) },
  ];
  const a = analyzeYears(input, { amount: 1, stepUp: 0, inflation: 0, goal: null });
  assert.equal(a.milestones.find((m) => m.kind === "rugi-mengecil"), undefined, "peluang rugi sudah kecil sejak awal");
  assert.equal(a.milestones.find((m) => m.kind === "bunga-berbunga"), undefined);
  assert.ok(a.rows.every((r) => r.probGoal === null));
});
