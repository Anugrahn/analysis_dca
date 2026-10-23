// Rekomendasi alokasi berbasis profil — DRAFT, angka bobot untuk didiskusikan.
//
// Prinsip (lihat docs/RESEARCH.md §4):
// - Yang menentukan hasil jangka panjang terutama alokasi antar kelas aset, biaya, dan disiplin,
//   bukan memilih saham/koin. Jadi rekomendasi = komposisi kelas aset, bukan sinyal beli.
// - Uang yang dipakai < 3 tahun lagi tidak ditaruh di aset yang bisa turun 30–70%.
// - Dana darurat dulu: selama belum 6× pengeluaran bulanan, setoran diarahkan ke RD Pasar Uang.
// - Kripto dibatasi kecil (≤10%) karena drawdown historisnya -70% s.d. -80%.
// - Saham tunggal = "satelit": total ≤20%, per emiten ≤10%; inti tetap indeks.

export type RiskLevel = "konservatif" | "moderat" | "bertumbuh" | "agresif";

export interface ProfileInput {
  /** kapan uangnya akan dipakai, tahun */
  horizonYears: number;
  /** penurunan terdalam yang masih bisa ditahan tanpa panik jual, mis. 0.2 = -20% */
  maxLossTolerated: number;
  /** pendapatan stabil (karyawan tetap) vs tidak */
  stableIncome: boolean;
  /** dana darurat sekarang ÷ pengeluaran bulanan */
  emergencyFundMonths: number;
}

export interface Recommendation {
  level: RiskLevel;
  weights: Record<string, number>;
  reasons: string[];
}

export const MODEL_PORTFOLIOS: Record<RiskLevel, Record<string, number>> = {
  konservatif: { rdpu: 0.4, sbn: 0.3, ihsg: 0.15, sp500: 0.15 },
  moderat: { rdpu: 0.15, sbn: 0.2, ihsg: 0.25, sp500: 0.3, gold: 0.1 },
  bertumbuh: { rdpu: 0.05, sbn: 0.1, ihsg: 0.3, sp500: 0.4, gold: 0.1, btc: 0.05 },
  agresif: { ihsg: 0.35, sp500: 0.35, nasdaq100: 0.1, gold: 0.1, btc: 0.07, eth: 0.03 },
};

const ORDER: RiskLevel[] = ["konservatif", "moderat", "bertumbuh", "agresif"];

export function recommend(p: ProfileInput): Recommendation {
  const reasons: string[] = [];

  if (p.emergencyFundMonths < 6) {
    reasons.push(`Dana darurat baru ${p.emergencyFundMonths} bln dari target 6 bln: setoran ke RD Pasar Uang dulu sampai terpenuhi.`);
    return { level: "konservatif", weights: { rdpu: 1 }, reasons };
  }

  // Toleransi rugi → level maksimum. Ambang ≈ median max drawdown portofolio model pada proyeksi
  // mode dasar 10 thn (npm run demo): konservatif -7%, moderat -17%, bertumbuh -28%, agresif -37%.
  let byLoss: RiskLevel = "konservatif";
  if (p.maxLossTolerated >= 0.2) byLoss = "moderat";
  if (p.maxLossTolerated >= 0.3) byLoss = "bertumbuh";
  if (p.maxLossTolerated >= 0.4) byLoss = "agresif";

  // Horizon → level maksimum.
  let byHorizon: RiskLevel = "konservatif";
  if (p.horizonYears >= 3) byHorizon = "moderat";
  if (p.horizonYears >= 5) byHorizon = "bertumbuh";
  if (p.horizonYears >= 8) byHorizon = "agresif";

  let level = ORDER[Math.min(ORDER.indexOf(byLoss), ORDER.indexOf(byHorizon))];
  reasons.push(`Toleransi rugi ${(p.maxLossTolerated * 100).toFixed(0)}% → maksimal ${byLoss}.`);
  reasons.push(`Horizon ${p.horizonYears} thn → maksimal ${byHorizon}.`);

  if (!p.stableIncome && level !== "konservatif") {
    level = ORDER[ORDER.indexOf(level) - 1];
    reasons.push("Pendapatan tidak tetap → turun satu tingkat agar tidak terpaksa jual saat pasar jatuh.");
  }
  return { level, weights: MODEL_PORTFOLIOS[level], reasons };
}
