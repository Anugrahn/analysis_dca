import { assumptionsFor } from "./assumptions.ts";
import { commonWindow, componentsOf, CPI_ID, dividendPart, divId, type Panel } from "./data.ts";
import { runDca, type DcaPlan } from "./dca.ts";
import { fxId, INSTRUMENTS, type Instrument } from "./instruments.ts";
import { medianRisk, riskMetrics, stabilityScore, type RiskMetrics } from "./risk.ts";
import { pct, type Pct } from "./stats.ts";

/** Bunga bebas risiko untuk Sharpe/Sortino sejarah: 6%, sama dengan seandainya (±rata-rata bunga deposito 2005–2025). */
export const HISTORY_RISK_FREE = 0.06;

export interface BacktestRun {
  start: string;
  end: string;
  contributed: number;
  finalValue: number;
  xirr: number;
  /** XIRR di atas inflasi aktual selama periode; null kalau data CPI tidak ada */
  realXirr: number | null;
  maxDrawdown: number;
  worstVsContrib: number;
  /** inflasi tahunan aktual selama periode, null jika data CPI belum sampai */
  inflation: number | null;
  risk: RiskMetrics;
}

export interface BacktestSummary {
  runs: BacktestRun[];
  xirr: Pct;
  maxDrawdown: Pct;
  pctProfit: number;
  /** di antara run yang data inflasinya lengkap */
  pctBeatInflation: number | null;
  /** median metrik risiko semua titik mulai */
  risk: RiskMetrics;
  /** skor stabilitas 0–100 (risk.ts) */
  stability: number;
}

/**
 * Backtest "rolling start": jalankan DCA yang sama dari SETIAP bulan mulai yang mungkin.
 * Ini yang dilakukan seandainya.vercel.app — menjawab "apa yang SUDAH terjadi", bukan proyeksi.
 * Instrumen model (RDPU/SBN/deposito) memakai tingkat konstan skenario dasar.
 */
export function backtest(panel: Panel, plan: DcaPlan, instruments: Instrument[] = INSTRUMENTS): BacktestSummary {
  const used = Object.keys(plan.weights)
    .filter((id) => plan.weights[id] > 0)
    .map((id) => instruments.find((i) => i.id === id)!);
  const comps = [...new Set(used.flatMap(componentsOf))];
  const [from, to] = comps.length ? commonWindow(panel, comps) : [0, panel.months.length];
  const model = assumptionsFor("dasar").model;
  const cpi = panel.comps[CPI_ID];

  const runs: BacktestRun[] = [];
  for (let s = from; s + plan.months <= to; s++) {
    const ret = (m: number, id: string) => {
      const ins = used.find((i) => i.id === id)!;
      if (ins.source.kind !== "yahoo") return Math.pow(1 + model[id].rate, 1 / 12) - 1;
      let lr = panel.comps[id][s + m] as number;
      if (ins.source.currency !== "IDR") lr += panel.comps[fxId(ins.source.currency)][s + m] as number;
      return Math.exp(lr) - 1;
    };
    const div = (m: number, id: string) => {
      const ins = used.find((i) => i.id === id)!;
      if (ins.source.kind !== "yahoo") return 0;
      const ld = panel.comps[divId(id)]?.[s + m];
      return ld == null ? (ins.source.divYield ?? 0) / 12 : dividendPart(ret(m, id), ld);
    };
    const res = runDca(plan, instruments, ret, div);
    let infl: number | null = 0;
    for (let m = 0; m < plan.months && infl !== null; m++) {
      const c = cpi?.[s + m];
      infl = c == null ? null : infl + c;
    }
    const inflation = infl === null ? null : Math.exp((infl * 12) / plan.months) - 1;
    runs.push({
      start: panel.months[s],
      end: panel.months[s + plan.months - 1],
      contributed: res.contributed,
      finalValue: res.finalValue,
      xirr: res.xirr,
      realXirr: inflation === null ? null : (1 + res.xirr) / (1 + inflation) - 1,
      maxDrawdown: res.maxDrawdown,
      worstVsContrib: res.worstVsContrib,
      inflation,
      risk: riskMetrics(res.returns, HISTORY_RISK_FREE),
    });
  }

  const withCpi = runs.filter((r) => r.realXirr !== null);
  const xirr = pct(runs.map((r) => r.xirr));
  const maxDrawdown = pct(runs.map((r) => r.maxDrawdown));
  const pctProfit = runs.filter((r) => r.finalValue > r.contributed).length / runs.length;
  const pctBeatInflation = withCpi.length ? withCpi.filter((r) => r.realXirr! > 0).length / withCpi.length : null;
  return {
    runs,
    xirr,
    maxDrawdown,
    pctProfit,
    pctBeatInflation,
    risk: runs.length ? medianRisk(runs.map((r) => r.risk)) : riskMetrics([0], HISTORY_RISK_FREE),
    stability: stabilityScore({ pctProfit, pctBeatInflation, iqrGrowth: xirr.p75 - xirr.p25, medianMdd: maxDrawdown.p50 }),
  };
}
