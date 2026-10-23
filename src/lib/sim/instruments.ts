// Katalog instrumen. Biaya & pajak dinyatakan sebagai pecahan (0.001 = 0,1%).
// sellFee sudah termasuk pajak final atas penjualan (mis. PPh 0,1% saham IDX,
// PPh 0,21% kripto di exchange domestik — PMK 50/2025).

export type AssetClass = "saham-id" | "saham-us" | "kripto" | "emas" | "kas" | "obligasi";

export type Source =
  // Harga bulanan dari Yahoo Finance (adjusted close = dividen diinvestasikan ulang).
  // addYield: tambahan yield tahunan untuk indeks harga yang tidak memuat dividen (IHSG).
  | { kind: "yahoo"; symbol: string; currency: string; addYield?: number }
  // Instrumen tanpa data harga publik yang bersih (RDPU, SBN, deposito):
  // dimodelkan dari asumsi return + volatilitas kecil.
  | { kind: "model" };

export interface Instrument {
  id: string;
  name: string;
  cls: AssetClass;
  source: Source;
  buyFee: number;
  sellFee: number;
  /** Potongan tahunan atas return, mis. pajak dividen AS 15% × dividend yield. */
  divDrag: number;
  note: string;
}

const IDX_FEES = { buyFee: 0.0015, sellFee: 0.0025 }; // broker 0,15% + (0,15% + PPh final 0,1%)
const US_FEES = { buyFee: 0.003, sellFee: 0.003 }; // komisi + spread kurs via broker lokal
const CRYPTO_FEES = { buyFee: 0.002, sellFee: 0.002 + 0.0021 }; // fee exchange + PPh final 0,21%

export const INSTRUMENTS: Instrument[] = [
  {
    id: "ihsg", name: "IHSG (reksa dana indeks / ETF)", cls: "saham-id",
    source: { kind: "yahoo", symbol: "^JKSE", currency: "IDR", addYield: 0.025 },
    ...IDX_FEES, divDrag: 0,
    note: "^JKSE adalah indeks harga; ditambah proxy dividen 2,5%/thn. Tidak bisa dibeli langsung — wakili dengan RD indeks/ETF.",
  },
  { id: "bbca", name: "BBCA", cls: "saham-id", source: { kind: "yahoo", symbol: "BBCA.JK", currency: "IDR" }, ...IDX_FEES, divDrag: 0, note: "Saham tunggal; dividen bebas pajak jika diinvestasikan ulang ≥3 thn (UU HPP)." },
  { id: "bbri", name: "BBRI", cls: "saham-id", source: { kind: "yahoo", symbol: "BBRI.JK", currency: "IDR" }, ...IDX_FEES, divDrag: 0, note: "Saham tunggal." },
  { id: "bmri", name: "BMRI", cls: "saham-id", source: { kind: "yahoo", symbol: "BMRI.JK", currency: "IDR" }, ...IDX_FEES, divDrag: 0, note: "Saham tunggal." },
  { id: "tlkm", name: "TLKM", cls: "saham-id", source: { kind: "yahoo", symbol: "TLKM.JK", currency: "IDR" }, ...IDX_FEES, divDrag: 0, note: "Saham tunggal." },
  {
    id: "sp500", name: "S&P 500 (SPY)", cls: "saham-us",
    source: { kind: "yahoo", symbol: "SPY", currency: "USD" },
    ...US_FEES, divDrag: 0.013 * 0.15,
    note: "Dividen dipotong 15% (tarif treaty AS–RI, perlu W-8BEN). Dikonversi ke Rupiah tiap bulan, tanpa hedging kurs.",
  },
  {
    id: "nasdaq100", name: "Nasdaq-100 (QQQ)", cls: "saham-us",
    source: { kind: "yahoo", symbol: "QQQ", currency: "USD" },
    ...US_FEES, divDrag: 0.006 * 0.15, note: "Konsentrasi teknologi tinggi.",
  },
  {
    id: "gold", name: "Emas (XAU)", cls: "emas",
    source: { kind: "yahoo", symbol: "GC=F", currency: "USD" },
    buyFee: 0.015, sellFee: 0.015,
    divDrag: 0, note: "Proxy futures emas → Rupiah. Biaya mewakili spread jual-beli emas digital/batangan (~3% pulang-pergi).",
  },
  { id: "btc", name: "Bitcoin", cls: "kripto", source: { kind: "yahoo", symbol: "BTC-USD", currency: "USD" }, ...CRYPTO_FEES, divDrag: 0, note: "Data sejak Sep 2014." },
  { id: "eth", name: "Ethereum", cls: "kripto", source: { kind: "yahoo", symbol: "ETH-USD", currency: "USD" }, ...CRYPTO_FEES, divDrag: 0, note: "Data sejak Nov 2017 — sejarah sangat pendek." },
  { id: "rdpu", name: "RD Pasar Uang", cls: "kas", source: { kind: "model" }, buyFee: 0, sellFee: 0, divDrag: 0, note: "Model: return bersih NAB (sudah dipotong biaya MI), bukan produk tertentu." },
  { id: "sbn", name: "SBN Ritel (ORI/SR)", cls: "obligasi", source: { kind: "model" }, buyFee: 0, sellFee: 0, divDrag: 0, note: "Model: kupon setelah PPh final 10%, dipegang sampai jatuh tempo." },
  { id: "deposito", name: "Deposito", cls: "kas", source: { kind: "model" }, buyFee: 0, sellFee: 0, divDrag: 0, note: "Pembanding. Bunga setelah PPh final 20%." },
];

/** Komponen panel untuk kurs mata uang `cur` → Rupiah (log-return bulanan). */
export const fxId = (cur: string) => `fx:${cur}`;
export const FX_ID = fxId("USD");
export const FX_SYMBOL = "IDR=X";

export function getInstrument(id: string): Instrument {
  const ins = INSTRUMENTS.find((i) => i.id === id);
  if (!ins) throw new Error(`Instrumen tidak dikenal: ${id}`);
  return ins;
}
