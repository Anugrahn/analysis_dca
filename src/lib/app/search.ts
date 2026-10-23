import { MODEL_PROFILES } from "../market/classify.ts";
import { searchYahoo } from "../market/yahoo.ts";
import type { SearchItem } from "./types.ts";

const KIND: Record<string, string> = {
  EQUITY: "Saham",
  ETF: "ETF",
  MUTUALFUND: "Reksa dana",
  INDEX: "Indeks",
  CRYPTOCURRENCY: "Kripto",
  FUTURE: "Komoditas",
};

/** Kata yang biasa diketik orang Indonesia tapi tidak dikenali Yahoo. */
const ALIASES: { words: string[]; item: SearchItem }[] = [
  { words: ["ihsg", "idx composite", "indeks harga saham gabungan"], item: { symbol: "^JKSE", name: "IHSG (lewat reksa dana indeks)", kindLabel: "Indeks", exchangeName: "Jakarta" } },
  { words: ["lq45"], item: { symbol: "^JKLQ45", name: "LQ45 (lewat reksa dana indeks)", kindLabel: "Indeks", exchangeName: "Jakarta" } },
  { words: ["emas", "gold", "logam mulia", "antam emas"], item: { symbol: "GC=F", name: "Emas", kindLabel: "Komoditas", exchangeName: "Harga dunia" } },
  { words: ["saham dunia", "global", "acwi", "msci world"], item: { symbol: "ACWI", name: "Saham seluruh dunia (ETF ACWI)", kindLabel: "ETF", exchangeName: "Nasdaq" } },
  { words: ["s&p", "sp500", "s&p 500", "snp"], item: { symbol: "SPY", name: "S&P 500 (ETF SPY)", kindLabel: "ETF", exchangeName: "NYSE Arca" } },
];

const MODEL_WORDS: Record<string, string[]> = {
  rdpu: ["rdpu", "pasar uang", "reksa dana pasar uang", "reksadana pasar uang", "money market"],
  sbn: ["sbn", "ori", "sr0", "sukuk", "obligasi", "surat berharga negara"],
  deposito: ["deposito", "deposit", "tabungan"],
};

/**
 * Kata kunci cocok kalau pengguna sedang mengetiknya ("em" → emas) atau mengetiknya persis.
 * "goldman" dan "global payments" TIDAK memunculkan emas / saham dunia.
 */
export function matches(word: string, q: string): boolean {
  return word.startsWith(q);
}

export async function searchInstruments(q: string): Promise<{ items: SearchItem[]; degraded: boolean }> {
  const lower = q.toLowerCase();
  const local: SearchItem[] = [];
  for (const p of MODEL_PROFILES) {
    if (MODEL_WORDS[p.symbol].some((w) => matches(w, lower))) {
      local.push({ symbol: p.symbol, name: p.name, kindLabel: p.kindLabel, exchangeName: "Model suku bunga" });
    }
  }
  for (const a of ALIASES) if (a.words.some((w) => matches(w, lower))) local.push(a.item);

  // Pengguna di Indonesia: listing Bursa Efek Indonesia didahulukan ("bbca" → BBCA.JK, bukan ETF Kanada
  // berkode BBCA), lalu listing utama lain. Listing ganda di bursa Eropa/OTC diturunkan.
  const upper = q.toUpperCase().replace(/\s+/g, "");
  const score = (h: { symbol: string; exchange: string }) =>
    h.symbol === `${upper}.JK` ? 0 : h.exchange === "JKT" ? 1 : /^(FRA|STU|BER|MUN|DUS|HAM|PNK|BUE)$/.test(h.exchange) ? 3 : 2;
  let degraded = false;
  const remote = (
    await searchYahoo(q).catch(() => {
      degraded = true;
      return [];
    })
  )
    .map((h, i) => ({ h, i }))
    .sort((a, b) => score(a.h) - score(b.h) || a.i - b.i)
    .map((x) => x.h);
  const seen = new Set(local.map((x) => x.symbol));
  const items = [...local];
  for (const h of remote) {
    if (seen.has(h.symbol)) continue;
    seen.add(h.symbol);
    items.push({
      symbol: h.symbol,
      name: h.name,
      kindLabel: KIND[h.quoteType] ?? h.quoteType,
      exchangeName: h.exchangeName,
      detail: h.industry ?? h.sector,
    });
  }
  return { items: items.slice(0, 10), degraded };
}
