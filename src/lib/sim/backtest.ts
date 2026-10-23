import { assumptionsFor } from "./assumptions.ts";
import { commonWindow, componentsOf, CPI_ID, type Panel } from "./data.ts";
import { runDca, type DcaPlan, type DcaResult } from "./dca.ts";
import { fxId, INSTRUMENTS, type Instrument } from "./instruments.ts";
import { pct, type Pct } from "./stats.ts";

export interface BacktestRun extends Omit<DcaResult, "path"> {
  start: string;
  end: string;
  /** inflasi tahunan aktual selama periode, null jika data CPI belum sampai */
  inflation: number | null;
}

export interface BacktestSummary {
  runs: BacktestRun[];
  xirr: Pct;
  maxDrawdown: Pct;
  pctProfit: number;
  /** di antara run yang data inflasinya lengkap */
  pctBeatInflation: number | null;
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
    const full = runDca(plan, instruments, ret);
    const res = {
      contributed: full.contributed,
      finalValue: full.finalValue,
      xirr: full.xirr,
      maxDrawdown: full.maxDrawdown,
      worstVsContrib: full.worstVsContrib,
    };
    let infl: number | null = 0;
    for (let m = 0; m < plan.months && infl !== null; m++) {
      const c = cpi?.[s + m];
      infl = c == null ? null : infl + c;
    }
    runs.push({
      ...res,
      start: panel.months[s],
      end: panel.months[s + plan.months - 1],
      inflation: infl === null ? null : Math.exp((infl * 12) / plan.months) - 1,
    });
  }

  const withCpi = runs.filter((r) => r.inflation !== null);
  return {
    runs,
    xirr: pct(runs.map((r) => r.xirr)),
    maxDrawdown: pct(runs.map((r) => r.maxDrawdown)),
    pctProfit: runs.filter((r) => r.finalValue > r.contributed).length / runs.length,
    pctBeatInflation: withCpi.length ? withCpi.filter((r) => r.xirr > r.inflation!).length / withCpi.length : null,
  };
}
