// Ambil harga bulanan (Yahoo Finance) + CPI Indonesia (FRED) → data/prices.json, untuk skrip
// demo & uji kalibrasi. Aplikasi sendiri mengambil data langsung lewat src/lib/market/yahoo.ts.
// Jalankan: npm run fetch-data
import { writeFileSync } from "node:fs";
import type { PriceDb } from "../src/lib/sim/data.ts";
import { FX_SYMBOL, INSTRUMENTS } from "../src/lib/sim/instruments.ts";
import { fredSeries, monthlyHistory, usdIdr } from "../src/lib/market/yahoo.ts";

const symbols = INSTRUMENTS.flatMap((i) => (i.source.kind === "yahoo" ? [i.source.symbol] : []));

const db: PriceDb = { updatedAt: new Date().toISOString(), series: {}, cpi: await fredSeries("IDNCPIALLMINMEI") };
for (const s of symbols) {
  const h = await monthlyHistory(s);
  db.series[s] = { months: h.months, adj: h.values };
  console.log(`${s.padEnd(9)} ${h.months[0]} → ${h.months.at(-1)}  (${h.months.length} bln)`);
}
const fx = await usdIdr();
db.series[FX_SYMBOL] = { months: fx.months, adj: fx.values };
console.log(`${FX_SYMBOL.padEnd(9)} ${fx.months[0]} → ${fx.months.at(-1)}  (${fx.months.length} bln, ditambal FRED)`);
console.log(`CPI       ${db.cpi.months[0]} → ${db.cpi.months.at(-1)}`);
writeFileSync(new URL("../data/prices.json", import.meta.url), JSON.stringify(db));
