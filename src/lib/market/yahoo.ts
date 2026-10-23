// Data pasar langsung: pencarian, harga bulanan, dividen, kurs ke Rupiah.
// Sumber: Yahoo Finance chart/search API (tanpa kunci) + FRED untuk menambal kurs USD/IDR.
// Di Next.js, opsi `next.revalidate` membuat respons di-cache; di Node biasa opsi itu diabaikan.

const UA = { "User-Agent": "Mozilla/5.0" };
const HOUR = 3600;

type FetchInit = RequestInit & { next?: { revalidate?: number } };

// Bentuk minimal respons Yahoo yang kita pakai (semua opsional: API tidak resmi).
interface YahooSearch {
  quotes?: { symbol?: string; shortname?: string; longname?: string; quoteType?: string; exchange?: string; exchDisp?: string; sector?: string; industry?: string }[];
}
interface YahooRecs {
  finance?: { result?: { recommendedSymbols?: { symbol: string }[] }[] };
}
interface YahooChart {
  chart?: {
    result?: {
      meta?: { longName?: string; shortName?: string; instrumentType?: string; exchangeName?: string; fullExchangeName?: string; currency?: string; gmtoffset?: number };
      timestamp?: number[];
      indicators: { quote: { close: (number | null)[] }[]; adjclose?: { adjclose: (number | null)[] }[] };
      events?: { dividends?: Record<string, { amount?: number; date: number }> };
    }[];
  };
}

async function getJson<T>(url: string, revalidate = 6 * HOUR): Promise<T> {
  const init: FetchInit = { headers: UA, next: { revalidate } };
  const res = await fetch(url, init);
  if (!res.ok) throw new MarketError(`Sumber datanya lagi nolak (${res.status}). Coba lagi sebentar ya.`, res.status);
  return (await res.json()) as T;
}

export class MarketError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}

export interface SearchHit {
  symbol: string;
  name: string;
  /** EQUITY | ETF | MUTUALFUND | INDEX | CRYPTOCURRENCY | FUTURE */
  quoteType: string;
  exchange: string;
  exchangeName: string;
  sector?: string;
  industry?: string;
}

const SEARCHABLE = new Set(["EQUITY", "ETF", "MUTUALFUND", "INDEX", "CRYPTOCURRENCY", "FUTURE"]);

export async function searchYahoo(q: string): Promise<SearchHit[]> {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&listsCount=0&lang=en-US`;
  const d = await getJson<YahooSearch>(url, 24 * HOUR);
  return (d.quotes ?? [])
    .filter((x): x is typeof x & { symbol: string; quoteType: string } => !!x.symbol && !!x.quoteType && SEARCHABLE.has(x.quoteType))
    .map((x) => ({
      symbol: x.symbol,
      name: x.longname || x.shortname || x.symbol,
      quoteType: x.quoteType,
      exchange: x.exchange ?? "",
      exchangeName: x.exchDisp ?? x.exchange ?? "",
      sector: x.sector || undefined,
      industry: x.industry || undefined,
    }));
}

/** Simbol sejenis menurut Yahoo ("people also watch"), urut dari yang paling mirip. */
export async function peersOf(symbol: string): Promise<string[]> {
  const d = await getJson<YahooRecs>(`https://query2.finance.yahoo.com/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`, 24 * HOUR);
  return (d.finance?.result?.[0]?.recommendedSymbols ?? []).map((r) => r.symbol);
}

export interface MonthlyHistory {
  symbol: string;
  name: string;
  quoteType: string;
  exchange: string;
  exchangeName: string;
  currency: string;
  /** "YYYY-MM", penutupan (adjusted) terakhir tiap bulan yang sudah selesai */
  months: string[];
  values: number[];
  /** harga terakhir (bisa di bulan berjalan) */
  last: { price: number; date: string };
  /** dividen 12 bulan terakhir ÷ harga terakhir */
  dividendYield: number;
  /** kondisi terkini dari harga harian (harga penutupan, sudah disesuaikan split) */
  recent: { change1y: number | null; fromAllTimeHigh: number };
}

/**
 * Harga harian → penutupan akhir bulan. Bar bulanan Yahoo bolong untuk sebagian simbol, dan
 * `range=max` diam-diam diturunkan jadi bulanan, jadi rentang ditulis eksplisit.
 */
export async function monthlyHistory(symbol: string, closeOf: "last" | "median5" = "last"): Promise<MonthlyHistory> {
  // Dibulatkan ke jam: URL sama selama satu jam, jadi cache fetch Next.js benar-benar terpakai.
  const now = Math.floor(Date.now() / 3_600_000) * 3600;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=0&period2=${now}&interval=1d&events=div`;
  const d = await getJson<YahooChart>(url).catch((e) => {
    if (e instanceof MarketError && e.status === 404) throw new MarketError(`Kode ${symbol} nggak ketemu. Coba pilih dari daftar pencarian ya.`, 404);
    throw e;
  });
  const r = d.chart?.result?.[0];
  if (!r?.timestamp?.length) throw new MarketError(`Data harga ${symbol} nggak ketemu.`, 404);
  const meta = r.meta ?? {};
  const ts: number[] = r.timestamp;
  const raw: (number | null)[] = r.indicators.adjclose?.[0]?.adjclose ?? r.indicators.quote[0].close;
  const close: (number | null)[] = r.indicators.quote[0].close;
  const days = ts
    .map((t, i) => ({ t, v: raw[i], c: close[i] }))
    .filter((x): x is { t: number; v: number; c: number } => x.v != null && x.v > 0 && x.c != null);
  const clean = days.filter((x, i) => !isSpike(days[i - 1]?.v, x.v, days[i + 1]?.v));
  if (!clean.length) throw new MarketError(`Data harga ${symbol} kosong.`, 404);

  // Tanggal bar = tanggal lokal bursanya. Bar harian AS bertanggal 13:30 UTC, BEI 02:00 UTC, kurs
  // 23:00 UTC hari sebelumnya — offset bursa menaruh semuanya di hari (dan bulan) yang benar.
  const offset = meta.gmtoffset ?? 0;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const byMonth = new Map<string, number[]>();
  for (const { t, v } of clean) {
    const m = monthOf(t, offset);
    if (m < thisMonth) byMonth.set(m, [...(byMonth.get(m) ?? []), v]);
  }
  const months = [...byMonth.keys()].sort();
  const pick = (vs: number[]) => (closeOf === "last" ? vs[vs.length - 1] : median(vs.slice(-5)));

  const lastDay = clean[clean.length - 1];
  const yearAgo = lastDay.t - 365 * 86400;
  const divs = Object.values(r.events?.dividends ?? {})
    .filter((x) => x.date >= yearAgo)
    .reduce((s, x) => s + (x.amount ?? 0), 0);

  const ago = [...clean].reverse().find((x) => x.t <= yearAgo);
  const ath = clean.reduce((mx, x) => Math.max(mx, x.c), 0);

  return {
    symbol,
    name: meta.longName || meta.shortName || symbol,
    quoteType: meta.instrumentType ?? "",
    exchange: meta.exchangeName ?? "",
    exchangeName: meta.fullExchangeName ?? meta.exchangeName ?? "",
    currency: normalizeCurrency(meta.currency ?? "USD").code,
    months,
    values: months.map((m) => pick(byMonth.get(m)!)),
    // Harga dalam pence/sen ditampilkan dalam mata uang induknya (GBp 117,65 → GBP 1,18).
    last: { price: lastDay.c / normalizeCurrency(meta.currency ?? "USD").divisor, date: new Date((lastDay.t + offset) * 1000).toISOString().slice(0, 10) },
    dividendYield: lastDay.c > 0 ? divs / lastDay.c : 0,
    recent: { change1y: ago ? lastDay.c / ago.c - 1 : null, fromAllTimeHigh: ath > 0 ? lastDay.c / ath - 1 : 0 },
  };
}

/** Kurs bulanan 1 unit `cur` dalam Rupiah. */
export async function fxToIdr(cur: string): Promise<{ months: string[]; values: number[] }> {
  const usd = await usdIdr();
  if (cur === "USD") return usd;
  // Kurs silang lewat USD: (IDR per USD) / (CUR per USD). Pasangan mayor jauh lebih bersih di Yahoo.
  const per = await monthlyHistory(`${cur}=X`, "median5");
  const map = new Map(per.months.map((m, i) => [m, per.values[i]]));
  const months = usd.months.filter((m) => map.has(m));
  const usdMap = new Map(usd.months.map((m, i) => [m, usd.values[i]]));
  return { months, values: months.map((m) => usdMap.get(m)! / map.get(m)!) };
}

/**
 * USD/IDR: Yahoo IDR=X punya nilai basi & bolong (Jun–Nov 2003, nilai 1 di 2014–2015). Ambil
 * median 5 hari terakhir tiap bulan, lalu isi/ganti bulan yang hilang atau melenceng >7% dengan
 * rata-rata bulanan OECD via FRED.
 */
export async function usdIdr(): Promise<{ months: string[]; values: number[] }> {
  const y = await monthlyHistory("IDR=X", "median5");
  const got = new Map(y.months.map((m, i) => [m, y.values[i]]).filter(([, v]) => (v as number) > 5000 && (v as number) < 50000) as [string, number][]);
  try {
    const f = await fredSeries("CCUSMA02IDM618N");
    f.months.forEach((m, i) => {
      if (m < y.months[0] || m > y.months[y.months.length - 1]) return;
      const v = got.get(m);
      if (v === undefined || Math.abs(v / f.values[i] - 1) > 0.07) got.set(m, f.values[i]);
    });
  } catch {
    // FRED tidak wajib: tanpa tambalan, bulan yang hilang hanya memendekkan jendela sejarah.
  }
  const months = [...got.keys()].sort();
  return { months, values: months.map((m) => got.get(m)!) };
}

export async function fredSeries(id: string): Promise<{ months: string[]; values: number[] }> {
  const init: FetchInit = { next: { revalidate: 24 * HOUR } };
  const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, init);
  if (!res.ok) throw new MarketError(`FRED ${id}: ${res.status}`, res.status);
  const rows = (await res.text()).trim().split("\n").slice(1).map((l) => l.split(","));
  const ok = rows.filter(([, v]) => v && v !== ".");
  return { months: ok.map(([dt]) => dt.slice(0, 7)), values: ok.map(([, v]) => Number(v)) };
}

/** Bulan "YYYY-MM" menurut waktu lokal bursa (`offset` = gmtoffset detik dari meta chart Yahoo). */
export function monthOf(unixSeconds: number, offset = 0): string {
  return new Date((unixSeconds + offset) * 1000).toISOString().slice(0, 7);
}

/** Titik yang melonjak >25% dari KEDUA tetangganya sementara tetangganya saling dekat = data rusak. */
export function isSpike(prev: number | undefined, v: number, next: number | undefined): boolean {
  if (prev === undefined || next === undefined) return false;
  const a = v / prev - 1;
  const b = v / next - 1;
  return Math.abs(a) > 0.25 && Math.abs(b) > 0.25 && Math.sign(a) === Math.sign(b) && Math.abs(next / prev - 1) < 0.1;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/**
 * Bursa London mengutip dalam pence (GBp), Johannesburg dalam sen (ZAc), Tel Aviv dalam agorot (ILA).
 * Return-nya sama dengan mata uang induk; harganya dibagi 100 untuk ditampilkan.
 */
export function normalizeCurrency(c: string): { code: string; divisor: number } {
  if (c === "GBp") return { code: "GBP", divisor: 100 };
  if (c === "ZAc") return { code: "ZAR", divisor: 100 };
  if (c === "ILA") return { code: "ILS", divisor: 100 };
  return { code: c.toUpperCase(), divisor: 1 };
}
