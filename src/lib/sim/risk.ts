// Metrik risiko dari deret return bulanan. Definisinya disamakan dengan seandainya.vercel.app
// (docs/riset/03-benchmark-seandainya.md) supaya angkanya bisa dibandingkan, dengan dua perbaikan:
// - dihitung dari return portofolio PENABUNG (time-weighted: tanpa efek setoran baru, sudah kena
//   biaya & pajak dividen), bukan dari harga aset mentah;
// - suku bunga bebas risiko = asumsi deposito Cobain untuk proyeksi (sejarah tetap 6% seperti seandainya).

import { quantile } from "./stats.ts";

export interface RiskMetrics {
  /** pertumbuhan tahunan majemuk (time-weighted) */
  twr: number;
  /** volatilitas tahunan: simpangan baku sampel × √12 */
  vol: number;
  /** penurunan terdalam dari puncak (negatif) */
  mdd: number;
  /** pemulihan terlama yang selesai: bulan dari puncak sampai puncak baru */
  recovery: number;
  /** bulan di bawah puncak di akhir periode (0 = sedang di puncak) */
  stillUnderwater: number;
  /** porsi bulan yang nilainya di bawah puncak sebelumnya */
  underwater: number;
  /** null kalau penyebutnya 0 (tidak pernah naik-turun / turun) */
  sharpe: number | null;
  sortino: number | null;
  /** pertumbuhan tahunan ÷ |penurunan terdalam| */
  calmar: number | null;
  /** persentil 5 return bulanan (negatif = rugi) */
  var95: number;
  /** rata-rata return bulanan di bawah VaR */
  cvar95: number;
}

export function riskMetrics(r: ArrayLike<number>, rfAnnual: number): RiskMetrics {
  const n = r.length;
  let idx = 1;
  let peak = 1;
  // bulan puncak terakhir; -1 = modal awal sebelum bulan pertama
  let peakAt = -1;
  let mdd = 0;
  let below = 0;
  let recovery = 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += r[i];
    idx *= 1 + r[i];
    if (idx >= peak) {
      if (i - peakAt > 1) recovery = Math.max(recovery, i - peakAt);
      peak = idx;
      peakAt = i;
    } else {
      below++;
      mdd = Math.min(mdd, idx / peak - 1);
    }
  }
  const mean = sum / n;
  let ss = 0;
  for (let i = 0; i < n; i++) ss += (r[i] - mean) ** 2;
  const vol = Math.sqrt(ss / Math.max(1, n - 1)) * Math.sqrt(12);
  const rfM = Math.pow(1 + rfAnnual, 1 / 12) - 1;
  let dd = 0;
  for (let i = 0; i < n; i++) dd += Math.min(0, r[i] - rfM) ** 2;
  const downside = Math.sqrt(dd / n) * Math.sqrt(12);
  const twr = Math.pow(idx, 12 / n) - 1;
  const sorted = Float64Array.from(r).sort();
  const var95 = quantile(sorted, 0.05);
  let tail = 0;
  let tailN = 0;
  for (const x of sorted) {
    if (x > var95) break;
    tail += x;
    tailN++;
  }
  return {
    twr,
    vol,
    mdd,
    recovery,
    stillUnderwater: n - 1 - peakAt,
    underwater: below / n,
    sharpe: vol > 1e-9 ? (twr - rfAnnual) / vol : null,
    sortino: downside > 1e-9 ? (twr - rfAnnual) / downside : null,
    calmar: mdd < -1e-9 ? twr / Math.abs(mdd) : null,
    var95,
    cvar95: tailN ? tail / tailN : var95,
  };
}

/**
 * Median tiap metrik dari banyak periode (titik mulai sejarah atau jalur simulasi). Rasio yang
 * tidak terdefinisi di lebih dari separuh periode ikut null.
 */
export function medianRisk(ms: RiskMetrics[]): RiskMetrics {
  const keys = Object.keys(ms[0]) as (keyof RiskMetrics)[];
  const med = (k: keyof RiskMetrics) => {
    const xs = ms.map((m) => m[k]).filter((x): x is number => x !== null);
    return xs.length * 2 < ms.length ? null : quantile(Float64Array.from(xs).sort(), 0.5);
  };
  return Object.fromEntries(keys.map((k) => [k, med(k)])) as unknown as RiskMetrics;
}

export interface StabilityInput {
  /** porsi hasil yang berakhir untung (0–1) */
  pctProfit: number;
  /** porsi hasil yang mengalahkan inflasi (0–1); null = tidak diketahui */
  pctBeatInflation: number | null;
  /** jarak kuartil (P75 − P25) pertumbuhan tahunan */
  iqrGrowth: number;
  /** median penurunan terdalam (negatif) */
  medianMdd: number;
}

/**
 * Skor stabilitas 0–100, rumus seandainya:
 * 35% sering untung + 25% sering kalahkan inflasi + 20% rentang hasil rapat + 20% tahan penurunan.
 * Rentang hasil = 0 saat jarak kuartil mencapai 30 poin persen; ketahanan = 0 saat penurunan
 * terdalam median mencapai −60%. Perbaikan: inflasi yang tidak diketahui tidak dihitung 0, bobotnya
 * dibagi rata ke tiga komponen lain (seandainya menghitungnya 0, jadi skor jatuh diam-diam).
 */
export function stabilityScore(x: StabilityInput): number {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const range = clamp(1 - x.iqrGrowth / 0.3);
  const resist = clamp(1 - Math.abs(x.medianMdd) / 0.6);
  if (x.pctBeatInflation === null) return Math.round(100 * ((0.35 * x.pctProfit + 0.2 * range + 0.2 * resist) / 0.75));
  return Math.round(100 * (0.35 * x.pctProfit + 0.25 * x.pctBeatInflation + 0.2 * range + 0.2 * resist));
}

/** Label skor, pita warna 75 / 55 / 35 seperti seandainya. */
export function stabilityBand(score: number): "sangat stabil" | "cukup stabil" | "naik-turun" | "liar" {
  if (score >= 75) return "sangat stabil";
  if (score >= 55) return "cukup stabil";
  if (score >= 35) return "naik-turun";
  return "liar";
}
