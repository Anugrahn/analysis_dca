import { FX_ID, FX_SYMBOL, fxId, INSTRUMENTS, type Instrument } from "./instruments.ts";

/** Bentuk file data/prices.json yang ditulis scripts/fetch-data.ts. */
export interface PriceDb {
  updatedAt: string;
  /** per simbol Yahoo: bulan "YYYY-MM" + adjusted close akhir bulan */
  series: Record<string, { months: string[]; adj: number[] }>;
  /** CPI Indonesia (FRED IDNCPIALLMINMEI) */
  cpi: { months: string[]; values: number[] };
}

/**
 * Panel log-return bulanan pada satu grid bulan.
 * comps[id][t] = ln(P_t / P_{t-1}) untuk bulan months[t], atau null jika tidak ada data.
 * Komponen: id instrumen (return mata uang lokal), fxId(mata uang) (kurs → IDR), dan "cpi".
 */
export interface Panel {
  months: string[];
  comps: Record<string, (number | null)[]>;
}

export const CPI_ID = "cpi";

export function nextMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}

function monthGrid(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to; m = nextMonth(m)) out.push(m);
  return out;
}

function logReturns(grid: string[], months: string[], values: number[], addYield = 0): (number | null)[] {
  const byMonth = new Map(months.map((m, i) => [m, values[i]]));
  const extra = Math.log(1 + addYield) / 12;
  return grid.map((m, t) => {
    if (t === 0) return null;
    const a = byMonth.get(grid[t - 1]);
    const b = byMonth.get(m);
    return a && b && a > 0 && b > 0 ? Math.log(b / a) + extra : null;
  });
}

export function buildPanel(db: PriceDb, instruments: Instrument[] = INSTRUMENTS): Panel {
  const all = [...Object.values(db.series).flatMap((s) => s.months), ...db.cpi.months].sort();
  const months = monthGrid(all[0], all[all.length - 1]);
  const comps: Panel["comps"] = {};
  for (const ins of instruments) {
    if (ins.source.kind !== "yahoo") continue;
    const s = db.series[ins.source.symbol];
    if (!s) continue;
    comps[ins.id] = logReturns(months, s.months, s.adj, ins.source.addYield);
  }
  const fx = db.series[FX_SYMBOL];
  if (fx) comps[FX_ID] = logReturns(months, fx.months, fx.adj);
  comps[CPI_ID] = logReturns(months, db.cpi.months, db.cpi.values);
  return { months, comps };
}

/** Panel dari seri bebas (dipakai aplikasi untuk instrumen apa pun yang dicari pengguna). */
export function panelFrom(series: { id: string; months: string[]; values: number[]; addYield?: number }[]): Panel {
  const all = series.flatMap((s) => s.months).sort();
  if (!all.length) return { months: [], comps: {} };
  const months = monthGrid(all[0], all[all.length - 1]);
  const comps: Panel["comps"] = {};
  for (const s of series) comps[s.id] = logReturns(months, s.months, s.values, s.addYield);
  return { months, comps };
}

/** Komponen panel yang dibutuhkan sebuah instrumen. Instrumen model tidak butuh apa pun. */
export function componentsOf(ins: Instrument): string[] {
  if (ins.source.kind !== "yahoo") return [];
  return ins.source.currency === "IDR" ? [ins.id] : [ins.id, fxId(ins.source.currency)];
}

/**
 * Rentang [start, end) terpanjang yang berakhir paling akhir di mana semua komponen punya data.
 * Dipakai agar bootstrap menarik bulan yang SAMA untuk semua aset (korelasi tetap terjaga).
 */
export function commonWindow(panel: Panel, comps: string[], end = panel.months.length): [number, number] {
  let last = end - 1;
  while (last >= 0 && !comps.every((c) => panel.comps[c]?.[last] != null)) last--;
  let first = last;
  while (first - 1 >= 0 && comps.every((c) => panel.comps[c]?.[first - 1] != null)) first--;
  return last < 0 ? [0, 0] : [first, last + 1];
}
