// Contoh: Rp1 jt/bulan selama 10 tahun → backtest + proyeksi 3 mode. Jalankan: npm run demo
import { readFileSync } from "node:fs";
import { backtest } from "../src/lib/sim/backtest.ts";
import { buildPanel, type PriceDb } from "../src/lib/sim/data.ts";
import type { DcaPlan } from "../src/lib/sim/dca.ts";
import { simulate } from "../src/lib/sim/montecarlo.ts";
import { MODEL_PORTFOLIOS } from "../src/lib/sim/profile.ts";

const db: PriceDb = JSON.parse(readFileSync(new URL("../data/prices.json", import.meta.url), "utf8"));
const panel = buildPanel(db);
const MONTHLY = 1_000_000;
const MONTHS = Number(process.env.MONTHS ?? 120);
const GOAL = Number(process.env.GOAL ?? 200_000_000);

const jt = (v: number) => `${(v / 1e6).toFixed(0)} jt`.padStart(7);
const pc = (v: number) => `${(v * 100).toFixed(1)}%`.padStart(6);

const cases: [string, Record<string, number>][] = [
  ["RD Pasar Uang", { rdpu: 1 }],
  ["IHSG", { ihsg: 1 }],
  ["BBCA", { bbca: 1 }],
  ["TLKM", { tlkm: 1 }],
  ["S&P 500", { sp500: 1 }],
  ["Emas", { gold: 1 }],
  ["Bitcoin", { btc: 1 }],
  ...Object.entries(MODEL_PORTFOLIOS).map(([k, w]) => [`Portofolio ${k}`, w] as [string, Record<string, number>]),
];

console.log(`\nDCA Rp${MONTHLY / 1e6} jt/bln × ${MONTHS} bln (setor ${MONTHLY * MONTHS / 1e6} jt), target ${GOAL / 1e6} jt\n`);
console.log("BACKTEST (semua bulan mulai historis)");
console.log("instrumen                 run  XIRR p5 / p50 / p95       untung  >inflasi  maxDD p50");
for (const [name, weights] of cases) {
  const plan: DcaPlan = { monthly: MONTHLY, months: MONTHS, weights };
  const b = backtest(panel, plan);
  if (!b.runs.length) continue;
  console.log(
    `${name.padEnd(24)} ${String(b.runs.length).padStart(4)}  ${pc(b.xirr.p5)} ${pc(b.xirr.p50)} ${pc(b.xirr.p95)}   ${pc(b.pctProfit)}  ${b.pctBeatInflation == null ? "    –" : pc(b.pctBeatInflation)}   ${pc(b.maxDrawdown.p50)}`,
  );
}

for (const mode of ["historis", "dasar", "konservatif"] as const) {
  console.log(`\nPROYEKSI MONTE CARLO — mode ${mode} (5.000 jalur, blok rata-rata 12 bln)`);
  console.log("instrumen                 nilai akhir p5 / p50 / p95   riil p50  XIRR p50  rugi   >depo  maxDD p50  P(target)  setoran utk 80%");
  for (const [name, weights] of cases) {
    const s = simulate({ panel, mode, plan: { monthly: MONTHLY, months: MONTHS, weights }, goal: GOAL });
    console.log(
      `${name.padEnd(24)} ${jt(s.final.p5)} ${jt(s.final.p50)} ${jt(s.final.p95)}    ${jt(s.finalReal.p50)}   ${pc(s.xirr.p50)}  ${pc(s.probLoss)} ${pc(s.probBeatDeposit)}   ${pc(s.maxDrawdown.p50)}     ${pc(s.goal!.prob)}    Rp${(s.goal!.requiredMonthly.p80 / 1e6).toFixed(2)} jt`,
    );
  }
}
