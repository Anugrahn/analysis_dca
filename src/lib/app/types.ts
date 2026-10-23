// Bentuk data yang dikirim API ke halaman. Semua nilai uang dinyatakan PER Rp1 setoran per bulan:
// karena semua biaya proporsional, nilai akhir linear terhadap setoran, jadi halaman cukup
// mengalikan dengan nominal yang diketik pengguna tanpa menghitung ulang (respons instan).

import type { Mode } from "../sim/assumptions.ts";
import type { Pct } from "../sim/stats.ts";

export type { Mode, Pct };

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

export interface Projection {
  instrument: InstrumentInfo;
  plan: { years: number; months: number; mode: Mode; stepUp: number };
  outcome: Outcome;
  fan: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] };
  /** setoran kumulatif per bulan (per Rp1) */
  contributedPath: number[];
  /** 100 jalur contoh, urut dari nilai akhir terburuk ke terbaik (per Rp1) */
  samples: { final: number; path: number[]; src: [string, number][] | null }[];
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
