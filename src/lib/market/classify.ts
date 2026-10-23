// Aturan asumsi untuk instrumen apa pun: jenis, biaya & pajak, ekspektasi return ke depan,
// beserta alasan dalam bahasa sederhana. Setiap angka di sini harus bisa dijelaskan ke pengguna.
//
// Prinsip (docs/MODEL-RESEARCH.md):
// - Ekspektasi return = ekspektasi PASARNYA, bukan sejarah instrumen itu sendiri. Uji kalibrasi
//   menunjukkan sejarah saham tunggal terlalu optimis (BBCA: PIT 0,13 → 0,58 dengan prior pasar).
// - Naik-turunnya (volatilitas, crash) tetap dari sejarah instrumen itu sendiri.
// - Instrumen yang jarang bergerak (obligasi/pasar uang) tidak diberi ekspektasi saham.

import type { Mode } from "../sim/assumptions.ts";
import { ASSUMPTIONS } from "../sim/assumptions.ts";
import type { Instrument } from "../sim/instruments.ts";

export type Kind = "saham" | "etf" | "reksadana" | "indeks" | "kripto" | "komoditas" | "kas";

export interface Assumption {
  /** return majemuk tahunan dalam mata uang lokal, per skenario */
  target: Record<Exclude<Mode, "historis">, number>;
  /** kalimat sederhana: dari mana angka ini */
  why: string;
}

export interface Profile {
  symbol: string;
  name: string;
  kind: Kind;
  kindLabel: string;
  exchangeName: string;
  currency: string;
  sector?: string;
  industry?: string;
  instrument: Instrument;
  assumption: Assumption;
  /** biaya & pajak dalam bahasa sederhana */
  costs: string;
  /** peringatan khusus instrumen ini */
  warnings: string[];
}

export interface ClassifyInput {
  symbol: string;
  name: string;
  quoteType: string;
  exchange: string;
  exchangeName: string;
  currency: string;
  /** volatilitas tahunan historis (log-return bulanan × √12) */
  annualVol: number;
  dividendYield: number;
  sector?: string;
  industry?: string;
}

const KIND_LABEL: Record<Kind, string> = {
  saham: "Saham",
  etf: "ETF",
  reksadana: "Reksa dana",
  indeks: "Indeks",
  kripto: "Kripto",
  komoditas: "Komoditas",
  kas: "Pasar uang",
};

const US_EXCHANGES = new Set(["NMS", "NYQ", "NGM", "NCM", "PCX", "ASE", "BTS", "NAS", "NYS", "PNK", "NIM", "OQB", "OQX", "CXI", "SNP", "DJI", "WCB"]);
const LEVERAGED = /\b(2x|3x|-2x|-3x|ultra|leveraged|inverse|bear|short|daily)\b/i;

/** Ekspektasi saham per pasar (mata uang lokal), sama dengan sim/assumptions.ts. */
function equityTarget(currency: string): Assumption {
  if (currency === "IDR") {
    return {
      target: { dasar: ASSUMPTIONS.dasar.targets.ihsg, konservatif: ASSUMPTIONS.konservatif.targets.ihsg },
      why: "Kita pakai perkiraan buat pasar saham Indonesia: dividen ±3% + laba tumbuh ±6% setahun.",
    };
  }
  if (currency === "USD") {
    return {
      target: { dasar: ASSUMPTIONS.dasar.targets.sp500, konservatif: ASSUMPTIONS.konservatif.targets.sp500 },
      why: "Kita pakai perkiraan para ahli (Vanguard & J.P. Morgan 2026) buat saham Amerika 10 tahun ke depan. Lebih rendah dari masa lalu, soalnya harganya lagi mahal.",
    };
  }
  return {
    target: { dasar: 0.06, konservatif: 0.045 },
    why: "Kita pakai perkiraan rata-rata pasar saham dunia.",
  };
}

const CASH_RATE: Record<string, number> = { IDR: 0.0475, USD: 0.035 };

/** Nama yang lebih dikenal untuk simbol populer. */
const DISPLAY_NAME: Record<string, string> = {
  "^JKSE": "IHSG (lewat reksa dana indeks)",
  "^JKLQ45": "LQ45 (lewat reksa dana indeks)",
  "^GSPC": "S&P 500 (indeks)",
  SPY: "S&P 500 (ETF SPY)",
  VOO: "S&P 500 (ETF VOO)",
  QQQ: "Nasdaq-100 (ETF QQQ)",
  ACWI: "Saham seluruh dunia (ETF ACWI)",
  VT: "Saham seluruh dunia (ETF VT)",
  "GC=F": "Emas",
  "SI=F": "Perak",
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
};

export function classify(x: ClassifyInput): Profile {
  const warnings: string[] = [];
  const qt = x.quoteType.toUpperCase();
  let kind: Kind =
    qt === "CRYPTOCURRENCY" ? "kripto"
    : qt === "ETF" ? "etf"
    : qt === "MUTUALFUND" ? "reksadana"
    : qt === "INDEX" ? "indeks"
    : qt === "FUTURE" ? "komoditas"
    : "saham";

  let assumption: Assumption;
  if (kind === "kripto") {
    const isBtc = x.symbol.startsWith("BTC-");
    const isEth = x.symbol.startsWith("ETH-");
    assumption = isBtc || isEth
      ? {
          target: { dasar: ASSUMPTIONS.dasar.targets[isBtc ? "btc" : "eth"], konservatif: ASSUMPTIONS.konservatif.targets[isBtc ? "btc" : "eth"] },
          why: "Kripto nggak punya laba atau dividen buat jadi patokan, jadi angka ini cuma asumsi yang sengaja nggak lebay.",
        }
      : {
          target: { dasar: 0.05, konservatif: -0.05 },
          why: "Kebanyakan koin selain Bitcoin & Ethereum nilainya habis dalam jangka panjang, jadi perkiraannya lebih rendah.",
        };
    if (!isBtc && !isEth) warnings.push("Koin kecil bisa kehilangan hampir semua nilainya, dan sejarah harganya biasanya pendek.");
  } else if (kind === "komoditas") {
    const gold = /^(GC|MGC|SI)=F$/.test(x.symbol);
    assumption = gold
      ? { target: { dasar: ASSUMPTIONS.dasar.targets.gold, konservatif: ASSUMPTIONS.konservatif.targets.gold }, why: "Emas nggak ngasih bunga atau dividen. Jangka panjang, harganya kira-kira ngikutin inflasi plus sedikit." }
      : { target: { dasar: 0.02, konservatif: 0 }, why: "Komoditas nggak ngasih bunga atau dividen. Jangka panjang kira-kira ngikutin inflasi." };
    warnings.push(
      gold
        ? "Kita pakai harga emas dunia. Kalau beli emas fisik atau digital, ada selisih harga jual-beli sendiri."
        : "Kita pakai harga kontrak berjangka. Produk yang bisa kamu beli (ETF/reksa dana komoditas) bisa beda hasilnya karena biaya ganti kontrak.",
    );
  } else if (x.annualVol < 0.08 && (kind === "etf" || kind === "reksadana")) {
    // Obligasi / pasar uang: premi risiko kecil di atas bunga kas, sebanding dengan gejolaknya.
    const cash = CASH_RATE[x.currency] ?? 0.03;
    const t = cash + 0.25 * x.annualVol;
    kind = "kas";
    assumption = { target: { dasar: t, konservatif: t - 0.01 }, why: "Instrumen ini jarang naik-turun, mirip obligasi atau pasar uang. Jadi perkiraannya: bunga simpanan plus sedikit." };
  } else {
    assumption = equityTarget(x.currency);
    if (kind === "saham") {
      assumption = {
        ...assumption,
        why: `Kita nggak pakai sejarah ${x.symbol.replace(/\.JK$/, "")} sendiri, soalnya yang dulu melesat belum tentu melesat lagi. ${assumption.why.replace("Kita pakai perkiraan buat", "Kita pakai perkiraan")}`,
      };
    }
  }

  if (LEVERAGED.test(x.name) && kind === "etf") {
    warnings.push("Ini ETF leverage/inverse harian. Nilainya bisa kegerus walau pasarnya naik, jadi nggak cocok buat nabung jangka panjang.");
  }
  if (kind === "indeks") {
    warnings.push("Indeks nggak bisa dibeli langsung. Kita hitung seolah kamu beli lewat reksa dana indeks atau ETF-nya.");
  }

  // Biaya & pajak.
  let buyFee = 0.003;
  let sellFee = 0.003;
  let divDrag = 0;
  let costs = "";
  const isUs = US_EXCHANGES.has(x.exchange) || (kind === "indeks" && x.currency === "USD");
  if (kind === "kripto") {
    buyFee = 0.002;
    sellFee = 0.002 + 0.0021;
    costs = "Fee exchange ±0,2% tiap beli & jual, plus pajak 0,21% pas jual (exchange terdaftar OJK).";
  } else if (kind === "komoditas" && /^(GC|MGC|SI)=F$/.test(x.symbol)) {
    buyFee = 0.015;
    sellFee = 0.015;
    costs = "Selisih harga jual-beli emas ±3%.";
  } else if (kind === "komoditas") {
    buyFee = 0.005;
    sellFee = 0.005;
    divDrag = 0.006;
    costs = "Komisi ±0,5% tiap transaksi plus biaya kelola produk komoditas ±0,6% setahun.";
  } else if (kind === "indeks") {
    buyFee = 0;
    sellFee = 0;
    divDrag = 0.005;
    costs = "Biaya kelola reksa dana indeks ±0,5% setahun.";
  } else if (x.currency === "IDR") {
    buyFee = 0.0015;
    sellFee = 0.0025;
    costs = "Fee broker ±0,15% pas beli dan ±0,25% pas jual (udah termasuk pajak 0,1%). Dividen dianggap diputar lagi, jadi bebas pajak.";
  } else if (isUs) {
    divDrag = 0.15 * x.dividendYield;
    costs = "Komisi + selisih kurs ±0,3% tiap transaksi. Dividen kena pajak Amerika 15%.";
  } else {
    buyFee = 0.005;
    sellFee = 0.005;
    divDrag = 0.15 * x.dividendYield;
    costs = "Komisi broker luar + selisih kurs ±0,5% tiap transaksi. Dividen kena pajak ±15%.";
  }
  if (x.currency !== "IDR") {
    costs += ` Semua dihitung ke Rupiah tiap bulan pakai kurs ${x.currency}/IDR.`;
  }

  const instrument: Instrument = {
    id: x.symbol,
    name: x.name,
    cls: kind === "kripto" ? "kripto" : kind === "komoditas" ? "emas" : kind === "kas" ? "kas" : x.currency === "IDR" ? "saham-id" : "saham-us",
    source: { kind: "yahoo", symbol: x.symbol, currency: x.currency },
    buyFee,
    sellFee,
    divDrag,
    note: "",
  };

  const name = DISPLAY_NAME[x.symbol] ?? x.name;
  instrument.name = name;
  return {
    symbol: x.symbol,
    name,
    kind,
    kindLabel: KIND_LABEL[kind],
    exchangeName: x.exchangeName,
    currency: x.currency,
    sector: x.sector,
    industry: x.industry,
    instrument,
    assumption,
    costs,
    warnings,
  };
}

/** Instrumen tanpa data harga publik: dimodelkan dari asumsi (sim/assumptions.ts). */
export const MODEL_PROFILES: Profile[] = [
  {
    symbol: "rdpu", name: "Reksa Dana Pasar Uang", kind: "kas", kindLabel: KIND_LABEL.kas, exchangeName: "Model", currency: "IDR",
    instrument: { id: "rdpu", name: "Reksa Dana Pasar Uang", cls: "kas", source: { kind: "model" }, buyFee: 0, sellFee: 0, divDrag: 0, note: "" },
    assumption: { target: { dasar: ASSUMPTIONS.dasar.model.rdpu.rate, konservatif: ASSUMPTIONS.konservatif.model.rdpu.rate }, why: "Imbal hasil bersih reksa dana pasar uang saat ini (udah dipotong biaya)." },
    costs: "Nggak ada biaya beli/jual, dan hasilnya bebas pajak.",
    warnings: ["Ini hitungan dari suku bunga, bukan produk tertentu. Hasilnya ikut naik-turun sama bunga BI."],
  },
  {
    symbol: "sbn", name: "SBN Ritel (ORI / SR)", kind: "kas", kindLabel: KIND_LABEL.kas, exchangeName: "Model", currency: "IDR",
    instrument: { id: "sbn", name: "SBN Ritel (ORI / SR)", cls: "obligasi", source: { kind: "model" }, buyFee: 0, sellFee: 0, divDrag: 0, note: "" },
    assumption: { target: { dasar: ASSUMPTIONS.dasar.model.sbn.rate, konservatif: ASSUMPTIONS.konservatif.model.sbn.rate }, why: "Kupon SBN ritel ±6% setahun, dipotong pajak 10%." },
    costs: "Gratis kalau dipegang sampai jatuh tempo. Kupon kena pajak 10%.",
    warnings: ["SBN ritel cuma dijual di masa penawaran tertentu, minimal Rp1 juta. Dianggap dipegang sampai jatuh tempo."],
  },
  {
    symbol: "deposito", name: "Deposito bank", kind: "kas", kindLabel: KIND_LABEL.kas, exchangeName: "Model", currency: "IDR",
    instrument: { id: "deposito", name: "Deposito bank", cls: "kas", source: { kind: "model" }, buyFee: 0, sellFee: 0, divDrag: 0, note: "" },
    assumption: { target: { dasar: ASSUMPTIONS.dasar.model.deposito.rate, konservatif: ASSUMPTIONS.konservatif.model.deposito.rate }, why: "Bunga deposito bank besar, dipotong pajak 20%." },
    costs: "Bunga kena pajak 20%. Dijamin LPS sampai batas tertentu.",
    warnings: [],
  },
];
