import assert from "node:assert/strict";
import { test } from "node:test";
import { duration, storyOf } from "../src/lib/app/story.ts";

/** Jalur DCA Rp1/bln dari daftar return bulanan pasar. */
function pathFrom(rets: number[]) {
  const path: number[] = [];
  let v = 0;
  for (const r of rets) {
    v = (v + 1) * (1 + r);
    path.push(v);
  }
  return path;
}

test("cerita menangkap anjlok, kejadian sejarah, dan waktu pulih", () => {
  // 24 bln naik 1%, 6 bln turun 8% (≈ -39%), lalu naik 3% sampai bulan 120.
  const rets = [...Array(24).fill(0.01), ...Array(6).fill(-0.08), ...Array(90).fill(0.03)];
  const path = pathFrom(rets);
  const contributed = Array.from({ length: 120 }, (_, m) => m + 1);
  // Bulan 25–30 simulasi bersumber dari Okt 2008–Mar 2009.
  const src: [string, number][] = [["2006-01", 24], ["2008-10", 6], ["2010-01", 90]];
  const s = storyOf({ final: path[119], path, src }, contributed, 1_000_000, { kind: "saham", currency: "IDR", goal: null, buyFee: 0 });
  assert.equal(s.fate, "untung");
  assert.ok(s.drop < -0.38 && s.drop > -0.4, `drop ${s.drop}`);
  assert.equal(s.troughAt, 29);
  assert.equal(s.event, "krisis keuangan 2008");
  assert.ok(s.recover !== null && s.recover > 0);
  assert.match(s.lines[0], /tahun ke-3, nilainya sempat anjlok 39% dari puncaknya, mirip waktu krisis keuangan 2008/);
});

test("cerita untuk jalur rugi & jalur mulus", () => {
  const flat = pathFrom(Array(36).fill(0.002));
  const c = Array.from({ length: 36 }, (_, m) => m + 1);
  const ok = storyOf({ final: flat[35], path: flat, src: null }, c, 100_000, { kind: "kas", currency: "IDR", goal: null, buyFee: 0 });
  assert.equal(ok.lines[0], "Jalannya mulus banget, hampir nggak pernah turun.");
  const bad = storyOf({ final: 30, path: flat, src: null }, c, 100_000, { kind: "kripto", currency: "USD", goal: null, buyFee: 0 });
  assert.equal(bad.fate, "rugi");
  assert.match(bad.headline, /rugi Rp600 ribu/);
});

test("durasi dibaca manusia", () => {
  assert.equal(duration(8), "8 bulan");
  assert.equal(duration(12), "1 tahun");
  assert.equal(duration(16), "1 tahun 4 bulan");
});

test("kejadian khusus kripto tidak dipakai untuk saham", () => {
  const rets = [...Array(6).fill(0.01), ...Array(6).fill(-0.06), ...Array(24).fill(0.02)];
  const path = pathFrom(rets);
  const c = Array.from({ length: 36 }, (_, m) => m + 1);
  const src: [string, number][] = [["2014-07", 36]]; // penurunan bersumber dari 2015-01..06
  const saham = storyOf({ final: path[35], path, src }, c, 1, { kind: "saham", currency: "IDR", goal: null, buyFee: 0 });
  const kripto = storyOf({ final: path[35], path, src }, c, 1, { kind: "kripto", currency: "USD", goal: null, buyFee: 0 });
  assert.equal(kripto.event, "anjloknya kripto 2015");
  assert.notEqual(saham.event, "anjloknya kripto 2015");
});
