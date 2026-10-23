// Asumsi pasar ke depan (capital market assumptions / CMA).
//
// Semua angka = return majemuk tahunan (geometrik, ≈ median jangka panjang), nominal,
// dalam MATA UANG LOKAL instrumen (USD untuk aset AS/kripto/emas). Pelemahan Rupiah
// dimodelkan terpisah lewat `fx`, sehingga return Rupiah = (1+lokal)(1+fx) - 1.
//
// Mode:
// - "historis": pakai rata-rata sejarah apa adanya (seperti backtest; cenderung terlalu optimis
//   untuk aset yang sejarahnya pendek dan berada di fase pertumbuhan awal, mis. kripto).
// - "dasar": bentuk distribusi dari sejarah, tetapi titik tengahnya digeser ke CMA di bawah.
// - "konservatif": sama, dengan CMA yang dipangkas.
//
// Sumber pembanding (lihat docs/RESEARCH.md): Vanguard VCMM Jan 2026 (saham AS 3,9–5,9%/thn
// 10 thn), J.P. Morgan LTCMA 2026 (60/40 USD 6,4%), building-block saham IDX
// (dividend yield ~3% + pertumbuhan laba nominal ~6%). Angka kripto bukan estimasi
// fundamental — tidak ada jangkar valuasi — melainkan asumsi skenario yang sengaja moderat.

export type Mode = "historis" | "dasar" | "konservatif";

export interface ModelAsset {
  /** return tahunan bersih */
  rate: number;
  /** volatilitas tahunan */
  vol: number;
}

export interface AssumptionSet {
  /** target return majemuk tahunan per instrumen berbasis data harga (mata uang lokal) */
  targets: Record<string, number>;
  /** pelemahan Rupiah terhadap USD per tahun */
  fx: number;
  /** instrumen berbasis model (tanpa data harga) */
  model: Record<string, ModelAsset>;
  /** inflasi Indonesia per tahun, untuk nilai riil */
  inflation: number;
}

const ID_EQUITY_BASE = 0.09;
const ID_EQUITY_CONS = 0.07;

export const ASSUMPTIONS: Record<Exclude<Mode, "historis">, AssumptionSet> = {
  dasar: {
    targets: {
      ihsg: ID_EQUITY_BASE,
      // Saham tunggal diberi ekspektasi = pasar. Risiko spesifik perusahaan tidak "dibayar"
      // dengan return tambahan; volatilitasnya tetap diambil dari sejarah sahamnya sendiri.
      bbca: ID_EQUITY_BASE, bbri: ID_EQUITY_BASE, bmri: ID_EQUITY_BASE, tlkm: ID_EQUITY_BASE,
      sp500: 0.055,
      nasdaq100: 0.055,
      gold: 0.04,
      btc: 0.12,
      eth: 0.12,
    },
    fx: 0.02,
    model: {
      rdpu: { rate: 0.0475, vol: 0.002 },
      sbn: { rate: 0.054, vol: 0 },
      deposito: { rate: 0.03, vol: 0 },
    },
    inflation: 0.03,
  },
  konservatif: {
    targets: {
      ihsg: ID_EQUITY_CONS,
      bbca: ID_EQUITY_CONS, bbri: ID_EQUITY_CONS, bmri: ID_EQUITY_CONS, tlkm: ID_EQUITY_CONS,
      sp500: 0.04,
      nasdaq100: 0.035,
      gold: 0.025,
      btc: 0.03,
      eth: 0.0,
    },
    fx: 0.01,
    model: {
      rdpu: { rate: 0.04, vol: 0.002 },
      sbn: { rate: 0.05, vol: 0 },
      deposito: { rate: 0.025, vol: 0 },
    },
    inflation: 0.035,
  },
};

/** Mode historis tetap butuh angka untuk instrumen model & inflasi; pakai skenario dasar. */
export function assumptionsFor(mode: Mode): AssumptionSet {
  return mode === "historis" ? ASSUMPTIONS.dasar : ASSUMPTIONS[mode];
}
