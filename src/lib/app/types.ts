// Bentuk data yang dikirim API ke halaman. Semua nilai uang dinyatakan PER Rp1 setoran per bulan:
// karena semua biaya proporsional, nilai akhir linear terhadap setoran, jadi halaman cukup
// mengalikan dengan nominal yang diketik pengguna tanpa menghitung ulang (respons instan).

import type { Mode } from "../sim/assumptions.ts";
import type { DividendMode } from "../sim/dca.ts";
import type { RiskMetrics } from "../sim/risk.ts";
import type { Pct } from "../sim/stats.ts";

export type { DividendMode, Mode, Pct, RiskMetrics };

export interface InstrumentInfo {
  symbol: string;
  name: string;
  kind: string;
  kindLabel: string;
  exchangeName: string;
  currency: string;
  sector?: string;
  industry?: string;
}

export interface Latest {
  price: number;
  date: string;
  currency: string;
  change1y: number | null;
  fromAllTimeHigh: number;
}

export interface Outcome {
  contributed: number;
  final: Pct;
  finalReal: Pct;
  finalQuantiles: number[];
  probLoss: number;
  probBeatDeposit: number;
  xirr: Pct;
  maxDrawdown: Pct;
}

/** Rapor satu sisi (sejarah atau proyeksi): rumus sama, supaya bisa dibandingkan berdampingan. */
export interface Rapor {
  /** jumlah titik mulai (sejarah) atau jalur (proyeksi) */
  n: number;
  pctProfit: number;
  /** null = data inflasi tidak ada */
  pctBeatInflation: number | null;
  /** median pertumbuhan tahunan (XIRR) */
  growth: number;
  /** median pertumbuhan di atas inflasi */
  realGrowth: number | null;
  /** jarak kuartil pertumbuhan tahunan */
  iqrGrowth: number;
  /** median titik terburuk dibanding setoran */
  worstVsContrib: number;
  /** median metrik risiko */
  risk: RiskMetrics;
  /** bunga bebas risiko untuk Sharpe/Sortino */
  riskFree: number;
  /** skor stabilitas 0–100 */
  score: number;
}

/** Satu titik mulai di masa lalu, durasi utama (uang per Rp1 setoran per bulan). */
export interface PastRun {
  start: string;
  final: number;
  xirr: number;
  /** pertumbuhan di atas inflasi aktual; null kalau CPI tidak ada */
  real: number | null;
  mdd: number;
  worst: number;
}

export interface Projection {
  instrument: InstrumentInfo;
  plan: { years: number; months: number; mode: Mode; stepUp: number; dividends: DividendMode };
  /** rapor risiko: sejarah (null kalau sejarah kurang) vs proyeksi */
  rapor: { past: Rapor | null; future: Rapor };
  /** "kalau dulu mulai…": semua titik mulai untuk durasi utama, urut waktu */
  pastRuns: PastRun[];
  /** total setoran per Rp1 untuk durasi utama */
  pastContributed: number;
  /**
   * Ambang konsistensi (ide seandainya): durasi terpendek (tahun) yang dari SEMUA titik mulai, dan
   * semua durasi lebih panjang yang dicek, selalu berakhir di atas setoran. null = tidak ada.
   */
  consistentFrom: number | null;
  /** dividen: yield 12 bulan terakhir dan, kalau diambil tunai, uang dividen yang terkumpul (per Rp1) */
  dividends: { yield: number; cash: Pct | null };
  outcome: Outcome;
  fan: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] };
  /** setoran kumulatif per bulan (per Rp1) */
  contributedPath: number[];
  /** 100 jalur contoh, urut dari nilai akhir terburuk ke terbaik (per Rp1) */
  samples: { final: number; path: number[]; src: [string, number][] | null }[];
  /** distribusi nilai bersih di tiap akhir tahun (per Rp1), untuk tabel per tahun */
  yearly: { month: number; contributed: number; probLoss: number; quantiles: number[] }[];
  /**
   * Sejarah per durasi: DCA selama `month` bulan dari semua bulan mulai di masa lalu (per Rp1).
   * Kosong untuk instrumen model; berhenti di durasi yang sejarahnya terlalu pendek.
   */
  pastYearly: {
    month: number;
    runs: number;
    /** bulan mulai pertama & terakhir yang dicoba */
    from: string;
    to: string;
    pctProfit: number;
    medianGrowth: number;
    p10: number;
    p50: number;
    p90: number;
    worst: number;
  }[];
  explain: {
    historyFrom: string | null;
    historyTo: string | null;
    historyYears: number;
    reliability: "tinggi" | "sedang" | "rendah" | "model";
    /** ekspektasi tahunan dalam Rupiah yang dipakai skenario ini (lokal + kurs) */
    expectedIdr: number;
    expectedLocal: number;
    why: string;
    uncertainty: number;
    costs: string;
    /** biaya beli (pecahan), untuk memisahkan efek biaya dari naik-turun pasar di cerita */
    buyFee: number;
    warnings: string[];
    inflation: number;
    depositRate: number;
    /** CPI asli sampai `measuredTo`; sampai `filledTo` diisi inflasi tahunan Bank Dunia; sesudahnya asumsi */
    cpi: { measuredTo: string; filledTo: string | null } | null;
    past: { runs: number; median: number; worst: number; best: number; pctProfit: number } | null;
  };
  latest: Latest | null;
  generatedAt: string;
}

export type AltGroup = "sejenis" | "terdiversifikasi" | "pembanding";

export interface Alternative {
  key: string;
  group: AltGroup;
  label: string;
  /** satu instrumen (bisa dibuka sebagai proyeksi utama) atau campuran */
  symbol: string | null;
  /** jenis instrumen ("saham", "kripto", …) atau "campuran" */
  kind: string;
  weights: Record<string, number>;
  why: string;
  comparison: string;
  outcome: Outcome;
  latest: Latest | null;
}

export interface Alternatives {
  base: string;
  /** true kalau ada sumber data yang gagal → jangan di-cache */
  degraded?: boolean;
  items: Alternative[];
  generatedAt: string;
}

export interface SearchItem {
  symbol: string;
  name: string;
  kindLabel: string;
  exchangeName: string;
  detail?: string;
}
