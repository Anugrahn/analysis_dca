import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAmount, percent, rupiahShort, rupiahWords } from "../src/lib/app/format.ts";
import { compare } from "../src/lib/app/projection.ts";

test("parseAmount menerima cara orang Indonesia mengetik nominal", () => {
  const cases: [string, number | null][] = [
    ["1000000", 1_000_000], ["1.000.000", 1_000_000], ["Rp 1.000.000", 1_000_000], ["rp1.250.000", 1_250_000],
    ["1jt", 1_000_000], ["1,5 juta", 1_500_000], ["1.5jt", 1_500_000], ["500rb", 500_000], ["500 ribu", 500_000],
    ["2m", 2_000_000_000], ["1.250jt", 1_250_000_000], ["", null], ["abc", null], ["1jt2", null],
  ];
  for (const [input, want] of cases) assert.equal(parseAmount(input), want, input);
});

test("rupiahWords & rupiahShort memilih satuan setelah pembulatan", () => {
  assert.equal(rupiahWords(999_600), "Rp1 juta");
  assert.equal(rupiahWords(999_700_000), "Rp1 miliar");
  assert.equal(rupiahWords(999), "Rp999");
  assert.equal(rupiahWords(999.7), "Rp1 ribu");
  assert.equal(rupiahShort(999_700), "Rp1 jt");
  assert.equal(rupiahShort(1_500_000_000), "Rp1,5 M");
  assert.equal(rupiahShort(200_000_000), "Rp200 jt");
  assert.equal(rupiahWords(12_450_000), "Rp12,5 juta");
});

test("rupiahWords memakai kata, bukan singkatan", () => {
  assert.equal(rupiahWords(195_400_000), "Rp195 juta");
  assert.equal(rupiahWords(1_440_000), "Rp1,44 juta");
  assert.equal(rupiahWords(3_065_000_000), "Rp3,07 miliar");
  assert.equal(rupiahWords(850_000), "Rp850 ribu");
});

test("percent memakai tanda minus tipografis dan koma desimal", () => {
  assert.equal(percent(-0.39), "−39%");
  assert.equal(percent(0.091, 1), "9,1%");
  assert.equal(percent(-0.001), "0%");
});

const o = (p50: number, probLoss: number) => ({
  contributed: 1, final: { p5: 0, p25: 0, p50, p75: 0, p95: 0 }, finalReal: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 },
  finalQuantiles: [], probLoss, probBeatDeposit: 0, xirr: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 },
  maxDrawdown: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 },
});

test("kalimat perbandingan alternatif konsisten dengan angkanya", () => {
  assert.equal(compare(o(195, 0.06), o(201, 0.17)), "Hasilnya mirip, dan lebih jarang rugi (6 vs 17 dari 100).");
  assert.equal(compare(o(175, 0.09), o(195, 0.12)), "Hasilnya 10% lebih kecil, tapi lebih jarang rugi (9 vs 12 dari 100).");
  assert.equal(compare(o(300, 0.3), o(200, 0.1)), "Hasilnya 50% lebih gede, tapi lebih sering rugi (30 vs 10 dari 100).");
  assert.equal(compare(o(240, 0.11), o(200, 0.1)), "Hasilnya 20% lebih gede, peluang ruginya mirip (11 dari 100).");
});

import { formatTyping } from "../src/lib/app/format.ts";

test("formatTyping menyisipkan titik ribuan dan menjaga posisi kursor", () => {
  assert.deepEqual(formatTyping("1000", 4), { text: "1.000", caret: 5 });
  assert.deepEqual(formatTyping("1.0000", 6), { text: "10.000", caret: 6 });
  assert.deepEqual(formatTyping("1500000", 7), { text: "1.500.000", caret: 9 });
  // sisip angka di tengah: "1.000|.000" + "5" → kursor setelah 5
  assert.deepEqual(formatTyping("1.0005.000", 6), { text: "10.005.000", caret: 6 });
  // hapus satu digit
  assert.deepEqual(formatTyping("1.00.000", 4), { text: "100.000", caret: 3 });
  assert.deepEqual(formatTyping("", 0), { text: "", caret: 0 });
  assert.deepEqual(formatTyping("007", 3), { text: "7", caret: 1 });
  // singkatan & desimal dibiarkan, termasuk saat masih diketik huruf per huruf
  assert.deepEqual(formatTyping("1,5jt", 5), { text: "1,5jt", caret: 5 });
  assert.deepEqual(formatTyping("1,", 2), { text: "1,", caret: 2 });
  assert.deepEqual(formatTyping("1,5", 3), { text: "1,5", caret: 3 });
  assert.deepEqual(formatTyping("Rp 2.000", 8), { text: "2.000", caret: 5 });
});

import { matches } from "../src/lib/app/search.ts";

test("alias pencarian cocok per kata, bukan awalan sembarang", () => {
  assert.ok(matches("emas", "em"));
  assert.ok(matches("emas", "emas"));
  assert.ok(!matches("gold", "goldman"));
  assert.ok(!matches("global", "global payments"));
  assert.ok(!matches("ori", "oriental"));
  assert.ok(!matches("deposito", "deposits"));
});
