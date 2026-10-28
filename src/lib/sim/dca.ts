import type { Instrument } from "./instruments.ts";

export interface DcaPlan {
  /** setoran per bulan (Rp) */
  monthly: number;
  /** lama menabung, bulan */
  months: number;
  /** kenaikan setoran tiap 12 bulan, mis. 0.05 = naik 5%/thn mengikuti gaji */
  stepUpYearly?: number;
  /** bobot alokasi per id instrumen, total = 1 */
  weights: Record<string, number>;
  /** kembalikan ke bobot target tiap 12 bulan (kena biaya jual/beli) */
  rebalanceYearly?: boolean;
  /** dividen dibelikan lagi (default) atau diambil tunai dan didiamkan tanpa bunga */
  dividends?: DividendMode;
}

export type DividendMode = "putar" | "tunai";

export interface DcaResult {
  contributed: number;
  /** nilai bersih jika semuanya dijual di akhir (setelah biaya jual & pajak final) */
  finalValue: number;
  /** return tahunan memperhitungkan waktu setiap setoran */
  xirr: number;
  /** penurunan terdalam portofolio dari puncaknya (time-weighted, tanpa efek setoran baru) */
  maxDrawdown: number;
  /** titik terburuk nilai portofolio dibanding total setoran saat itu (negatif = sempat rugi) */
  worstVsContrib: number;
  /** nilai pasar portofolio di akhir tiap bulan (termasuk dividen tunai) */
  path: number[];
  /** return bulanan portofolio (time-weighted: tanpa efek setoran baru), untuk metrik risiko */
  returns: Float64Array;
  /** dividen tunai yang terkumpul (setelah pajak) di akhir tiap bulan; null kalau dividen diputar */
  cashPath: Float64Array | null;
}

/**
 * Jalankan satu skenario DCA.
 * Urutan per bulan: setor di awal bulan → beli sesuai bobot (dikurangi biaya beli) →
 * kena return bulan itu → (opsional) rebalance di akhir bulan ke-12, 24, ...
 * `ret(m, id)` = return total sederhana Rupiah instrumen `id` pada bulan ke-m (dividen termasuk).
 * `div(m, id)` = bagian dividen dari return itu; tanpa `div`, dipakai `source.divYield / 12`.
 * Dividen kena pajak `divTax`; dalam mode tunai dividen keluar dari portofolio dan menganggur
 * dengan bunga 0% sampai akhir (sama dengan seandainya), tidak ikut di-rebalance.
 */
export function runDca(
  plan: DcaPlan,
  instruments: Instrument[],
  ret: (m: number, id: string) => number,
  div?: (m: number, id: string) => number,
): DcaResult {
  const ids = Object.keys(plan.weights).filter((id) => plan.weights[id] > 0);
  const ins = ids.map((id) => {
    const i = instruments.find((x) => x.id === id);
    if (!i) throw new Error(`Instrumen tidak dikenal: ${id}`);
    return i;
  });
  const w = ids.map((id) => plan.weights[id]);
  const wSum = w.reduce((a, b) => a + b, 0);
  if (Math.abs(wSum - 1) > 1e-6) throw new Error(`Total bobot harus 1 (sekarang ${wSum})`);

  const tunai = plan.dividends === "tunai";
  const divOf = ins.map((i) => (div ? null : i.source.kind === "yahoo" ? (i.source.divYield ?? 0) / 12 : 0));
  const hold = new Array<number>(ids.length).fill(0);
  const flows: number[] = [];
  const path: number[] = [];
  const returns = new Float64Array(plan.months);
  const cashPath = tunai ? new Float64Array(plan.months) : null;
  let cash = 0;
  let contributed = 0;
  let twr = 1;
  let twrPeak = 1;
  let maxDrawdown = 0;
  let worstVsContrib = 0;

  for (let m = 0; m < plan.months; m++) {
    const c = plan.monthly * Math.pow(1 + (plan.stepUpYearly ?? 0), Math.floor(m / 12));
    contributed += c;
    flows.push(c);
    for (let k = 0; k < ids.length; k++) hold[k] += c * w[k] * (1 - ins[k].buyFee);

    const before = sum(hold) + cash;
    for (let k = 0; k < ids.length; k++) {
      const d = divOf[k] ?? div!(m, ids[k]);
      const r = ret(m, ids[k]) - ins[k].annualFee / 12;
      if (tunai) {
        cash += hold[k] * d * (1 - ins[k].divTax.tunai);
        hold[k] *= 1 + r - d;
      } else {
        hold[k] *= 1 + r - d * ins[k].divTax.putar;
      }
    }
    const after = sum(hold) + cash;

    returns[m] = after / before - 1;
    twr *= after / before;
    twrPeak = Math.max(twrPeak, twr);
    maxDrawdown = Math.min(maxDrawdown, twr / twrPeak - 1);
    worstVsContrib = Math.min(worstVsContrib, after / contributed - 1);

    if (plan.rebalanceYearly && (m + 1) % 12 === 0 && m + 1 < plan.months) rebalance(hold, w, ins);
    path.push(sum(hold) + cash);
    if (cashPath) cashPath[m] = cash;
  }

  const finalValue = hold.reduce((acc, v, k) => acc + v * (1 - ins[k].sellFee), cash);
  return { contributed, finalValue, xirr: xirrMonthly(flows, finalValue), maxDrawdown, worstVsContrib, path, returns, cashPath };
}

function rebalance(hold: number[], w: number[], ins: Instrument[]) {
  // Jual yang kelebihan dulu (kena biaya jual), hasilnya dibelikan yang kekurangan (kena biaya beli).
  const total = sum(hold);
  let cash = 0;
  for (let k = 0; k < hold.length; k++) {
    const excess = hold[k] - total * w[k];
    if (excess > 0) {
      hold[k] -= excess;
      cash += excess * (1 - ins[k].sellFee);
    }
  }
  const deficits = hold.map((v, k) => Math.max(0, total * w[k] - v));
  const need = sum(deficits);
  if (need === 0) return;
  for (let k = 0; k < hold.length; k++) hold[k] += (cash * deficits[k] / need) * (1 - ins[k].buyFee);
}

function sum(xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

/**
 * XIRR untuk arus kas bulanan: setoran flows[m] di awal bulan m, nilai akhir di bulan N.
 * Dikembalikan sebagai return tahunan efektif.
 */
export function xirrMonthly(flows: number[], finalValue: number): number {
  const n = flows.length;
  const npv = (r: number) => {
    let v = finalValue / Math.pow(1 + r, n);
    for (let m = 0; m < n; m++) v -= flows[m] / Math.pow(1 + r, m);
    return v;
  };
  if (finalValue <= 0) return -1;
  // NPV turun monoton terhadap r (semua setoran sebelum nilai akhir) → bisection aman.
  let lo = -0.99;
  let hi = 1;
  while (npv(hi) > 0 && hi < 1e3) hi *= 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  return Math.pow(1 + (lo + hi) / 2, 12) - 1;
}
