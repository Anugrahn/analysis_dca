import { assumptionsFor, type Mode } from "./assumptions.ts";
import { commonWindow, componentsOf, nextMonth, type Panel } from "./data.ts";
import { runDca, type DcaPlan } from "./dca.ts";
import { fxId, INSTRUMENTS, type Instrument } from "./instruments.ts";
import { mean, pct, quantile, rng, std, type Pct } from "./stats.ts";

/** Komponen dengan sejarah sepanjang ini (bulan) yang menentukan jendela bootstrap. */
const LONG_HISTORY = 180;
/** Jendela "volatilitas terkini" untuk volBlend. */
const RECENT_MONTHS = 36;

/**
 * Simpangan baku rata-rata return tahunan yang dipakai sebagai ketidakpastian parameter:
 * 10% dari volatilitas tahunan, minimal 0,5%. Lolos uji kalibrasi (docs/riset/02-riset-model-dan-pandangan-investasi.md).
 */
export const sigmaMu = (annualVol: number) => Math.max(0.005, 0.1 * annualVol);

export interface McInput {
  panel: Panel;
  plan: DcaPlan;
  mode: Mode;
  instruments?: Instrument[];
  paths?: number;
  /** rata-rata panjang blok bootstrap (bulan). 12 = menjaga musim crash/rally tetap utuh. */
  blockLen?: number;
  seed?: number;
  /** hanya pakai sejarah sebelum indeks ini — untuk uji kalibrasi tanpa bocoran masa depan */
  historyEnd?: number;
  /** override target return majemuk tahunan per komponen (id instrumen atau fxId(mata uang)) */
  targets?: Record<string, number>;
  /**
   * Ketidakpastian rata-rata return (simpangan baku tahunan) per komponen / instrumen model.
   * Tiap jalur menarik rata-ratanya sendiri, karena kita tidak tahu rata-rata yang sebenarnya
   * (Fama & French 2018). Tanpa ini pita proyeksi terlalu sempit di horizon panjang.
   */
  uncertainty?: Record<string, number>;
  /**
   * Bobot volatilitas 36 bulan terakhir (0–1) terhadap volatilitas seluruh sejarah. 0,5 = rata-rata
   * keduanya. Menyesuaikan dengan rezim saat ini (kripto yang makin tenang, pasar yang sedang
   * bergejolak) tanpa membuang sejarah krisis.
   */
  volBlend?: number | Record<string, number>;
  /**
   * Simpan sekian jalur contoh, dipilih di persentil nilai akhir (k+0,5)/n — jadi titik ke-k di grid
   * "100 masa depan" adalah jalur simulasi sungguhan. Tiap jalur membawa potongan sejarah yang
   * dipakainya (untuk cerita "mirip krisis 2008").
   */
  samples?: number;
  /** komponen yang bulan sumbernya dilaporkan di `samples[].src` (default: komponen pertama) */
  storySource?: string;
  /** nilai target tabungan (Rp), untuk peluang tercapai & setoran yang dibutuhkan */
  goal?: number;
}

export interface McSummary {
  mode: Mode;
  paths: number;
  history: { from: string; to: string; months: number; backfilled: string[] } | null;
  contributed: number;
  final: Pct;
  /** nilai akhir dalam Rupiah hari ini (dikurangi asumsi inflasi) */
  finalReal: Pct;
  xirr: Pct;
  maxDrawdown: Pct;
  worstVsContrib: Pct;
  probLoss: number;
  probBeatInflation: number;
  probBeatDeposit: number;
  goal?: {
    target: number;
    prob: number;
    /** setoran bulanan awal yang dibutuhkan agar target tercapai dengan keyakinan 50/80/90% */
    requiredMonthly: { p50: number; p80: number; p90: number };
  };
  /** pita persentil nilai portofolio per bulan, untuk fan chart */
  fan: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] };
  /** nilai akhir di persentil 0,1,…,100 — untuk menghitung peluang target apa pun di klien */
  finalQuantiles: number[];
  /** jalur contoh (lihat McInput.samples); src = potongan sejarah [bulan mulai, panjang] */
  samples?: { final: number; path: number[]; src: [string, number][] | null }[];
  /** "kalau dicairkan di akhir tahun ke-k": distribusi nilai bersih per akhir tahun */
  yearly: YearStat[];
}

export interface YearStat {
  /** bulan ke- (12, 24, …; bulan terakhir kalau durasinya tidak bulat tahunan) */
  month: number;
  /** total setoran sampai bulan itu */
  contributed: number;
  /** porsi jalur yang nilainya (setelah biaya jual) di bawah total setoran */
  probLoss: number;
  /** nilai bersih di persentil 0,1,…,100 */
  quantiles: number[];
}

/**
 * Proyeksi DCA dengan stationary block bootstrap (Politis & Romano, 1994).
 *
 * 1. Ambil log-return bulanan historis semua komponen pada bulan-bulan yang SAMA
 *    (korelasi antar-aset & antara aset AS dan kurs terjaga).
 * 2. Mode dasar/konservatif: geser rata-rata tiap komponen ke asumsi CMA, bentuk distribusinya
 *    (volatilitas, ekor tebal, crash, autokorelasi) tetap dari sejarah.
 * 3. Rangkai ulang sejarah dalam blok berpanjang acak (rata-rata `blockLen`) menjadi ribuan
 *    masa depan, lalu jalankan mekanika DCA yang sama dengan backtest di tiap jalur.
 */
export function simulate(input: McInput): McSummary {
  const instruments = input.instruments ?? INSTRUMENTS;
  const paths = input.paths ?? 5000;
  const blockLen = input.blockLen ?? 12;
  const { plan, mode, panel } = input;
  const A = assumptionsFor(mode);
  const R = rng(input.seed ?? 42);

  const used = Object.keys(plan.weights)
    .filter((id) => plan.weights[id] > 0)
    .map((id) => {
      const ins = instruments.find((i) => i.id === id);
      if (!ins) throw new Error(`Instrumen tidak dikenal: ${id}`);
      return ins;
    });
  const comps = [...new Set(used.flatMap(componentsOf))];

  // Matriks sejarah [bulan][komponen], sudah di-recenter jika perlu.
  let hist: Float64Array[] = [];
  let history: McSummary["history"] = null;
  let srcOf: ((t: number) => string) | null = null;
  if (comps.length > 0) {
    // Jendela sejarah ditentukan oleh komponen bersejarah panjang (≥15 thn) saja. Kalau tidak,
    // satu aset muda (BTC 2014, ETH 2017) memotong krisis 1998/2008 dari saham di portofolio yang sama.
    // Bulan sebelum aset muda lahir diisi ulang dengan potongan sejarahnya sendiri secara berurutan
    // (crash & rally tetap utuh); korelasinya dengan aset lain di bulan-bulan itu memang hilang.
    const own = Object.fromEntries(comps.map((c) => [c, commonWindow(panel, [c], input.historyEnd)]));
    const span = (c: string) => own[c][1] - own[c][0];
    const long = comps.filter((c) => span(c) >= LONG_HISTORY);
    const [from, to] = commonWindow(panel, long.length ? long : comps, input.historyEnd);
    const short = comps.filter((c) => span(c) < 36);
    if (to - from < 36 || short.length) {
      throw new Error(`Sejarah terlalu pendek untuk ${short.length ? short.join(", ") : comps.join(", ")}`);
    }
    const backfilled = comps.filter((c) => own[c][0] > from || own[c][1] < to);
    const sc = input.storySource && comps.includes(input.storySource) ? input.storySource : comps[0];
    {
      const [a, b] = own[sc];
      const n = b - a;
      srcOf = (t) => {
        const i = from + t;
        return panel.months[i >= a && i < b ? i : a + ((((i - a) % n) + n) % n)];
      };
    }
    history = { from: panel.months[from], to: panel.months[to - 1], months: to - from, backfilled };
    hist = Array.from({ length: to - from }, (_, t) =>
      Float64Array.from(comps, (c) => {
        const [a, b] = own[c];
        const i = from + t;
        if (i >= a && i < b) return panel.comps[c][i] as number;
        const n = b - a;
        return panel.comps[c][a + ((((i - a) % n) + n) % n)] as number;
      }),
    );
    if (mode !== "historis") {
      comps.forEach((c, k) => {
        const target = input.targets?.[c] ?? (c.startsWith("fx:") ? A.fx : A.targets[c]);
        if (target === undefined) throw new Error(`Tidak ada asumsi return untuk ${c}`);
        const shift = Math.log(1 + target) / 12 - mean(hist.map((row) => row[k]));
        for (const row of hist) row[k] += shift;
      });
    }
    const blend = input.volBlend ?? 0;
    {
      comps.forEach((c, k) => {
        const w = typeof blend === "number" ? blend : blend[c] ?? 0;
        if (!(w > 0)) return;
        const xs = hist.map((row) => row[k]);
        const m = mean(xs);
        const full = std(xs);
        const recent = std(xs.slice(-RECENT_MONTHS));
        if (!(full > 0)) return;
        const scale = ((1 - w) * full + w * recent) / full;
        for (const row of hist) row[k] = m + (row[k] - m) * scale;
      });
    }
  }
  const L = hist.length;
  const col = Object.fromEntries(used.map((ins) => [ins.id, comps.indexOf(ins.id)]));
  const fxCol = Object.fromEntries(
    used.map((ins) => [ins.id, ins.source.kind === "yahoo" ? comps.indexOf(fxId(ins.source.currency)) : -1]),
  );

  const finals = new Float64Array(paths);
  const xirrs = new Float64Array(paths);
  const dds = new Float64Array(paths);
  const worst = new Float64Array(paths);
  const pathVals = Array.from({ length: plan.months }, () => new Float64Array(paths));
  let contributed = 0;

  const rets: Record<string, Float64Array> = {};
  for (const ins of used) rets[ins.id] = new Float64Array(plan.months);

  // Ketidakpastian rata-rata: geser bulanan per jalur, per komponen (dan per instrumen model).
  const sigComp = comps.map((c) => input.uncertainty?.[c] ?? 0);
  const sigModel = Object.fromEntries(used.map((ins) => [ins.id, input.uncertainty?.[ins.id] ?? 0]));
  const shiftComp = new Float64Array(comps.length);
  const shiftModel: Record<string, number> = {};
  const nSamples = Math.min(input.samples ?? 0, paths);
  const idxs = nSamples ? new Int32Array(paths * plan.months) : null;

  for (let p = 0; p < paths; p++) {
    for (let k = 0; k < comps.length; k++) shiftComp[k] = sigComp[k] ? (sigComp[k] * R.normal()) / 12 : 0;
    for (const ins of used) shiftModel[ins.id] = sigModel[ins.id] ? (sigModel[ins.id] * R.normal()) / 12 : 0;
    let idx = L > 0 ? R.int(L) : 0;
    for (let m = 0; m < plan.months; m++) {
      if (L > 0) {
        if (m > 0) idx = R.next() < 1 / blockLen ? R.int(L) : (idx + 1) % L;
        if (idxs) idxs[p * plan.months + m] = idx;
      }
      for (const ins of used) {
        let lr: number;
        if (ins.source.kind === "yahoo") {
          lr = hist[idx][col[ins.id]] + shiftComp[col[ins.id]];
          const f = fxCol[ins.id];
          if (f >= 0) lr += hist[idx][f] + shiftComp[f];
        } else {
          const a = A.model[ins.id];
          lr = Math.log(1 + a.rate) / 12 + shiftModel[ins.id] + (a.vol / Math.sqrt(12)) * R.normal();
        }
        rets[ins.id][m] = Math.exp(lr) - 1;
      }
    }
    const res = runDca(plan, instruments, (m, id) => rets[id][m]);
    contributed = res.contributed;
    finals[p] = res.finalValue;
    xirrs[p] = res.xirr;
    dds[p] = res.maxDrawdown;
    worst[p] = res.worstVsContrib;
    for (let m = 0; m < plan.months; m++) pathVals[m][p] = res.path[m];
  }

  const years = plan.months / 12;
  const deflator = Math.pow(1 + A.inflation, years);
  const deposit = A.model.deposito.rate;
  const share = (pred: (i: number) => boolean) => {
    let n = 0;
    for (let i = 0; i < paths; i++) if (pred(i)) n++;
    return n / paths;
  };

  const sortedFinals = Float64Array.from(finals).sort();
  const out: McSummary = {
    mode,
    paths,
    history,
    contributed,
    final: pct(finals),
    finalReal: pct(finals.map((v) => v / deflator)),
    xirr: pct(xirrs),
    maxDrawdown: pct(dds),
    worstVsContrib: pct(worst),
    probLoss: share((i) => finals[i] < contributed),
    probBeatInflation: share((i) => xirrs[i] > A.inflation),
    probBeatDeposit: share((i) => xirrs[i] > deposit),
    fan: { p5: [], p25: [], p50: [], p75: [], p95: [] },
    finalQuantiles: Array.from({ length: 101 }, (_, i) => quantile(sortedFinals, i / 100)),
    yearly: [],
  };
  for (const col of pathVals) {
    const f = pct(col);
    out.fan.p5.push(f.p5);
    out.fan.p25.push(f.p25);
    out.fan.p50.push(f.p50);
    out.fan.p75.push(f.p75);
    out.fan.p95.push(f.p95);
  }
  // Per akhir tahun: nilai pasar dikurangi biaya jual (rata-rata tertimbang bobot — tepat untuk satu
  // instrumen, perkiraan untuk campuran), dibandingkan dengan total setoran sampai saat itu.
  const sellFee = used.reduce((acc, ins) => acc + plan.weights[ins.id] * ins.sellFee, 0);
  const yearEnds = Array.from({ length: Math.floor(plan.months / 12) }, (_, k) => (k + 1) * 12 - 1);
  if (plan.months % 12) yearEnds.push(plan.months - 1);
  const cumContrib: number[] = [];
  for (let m = 0, c = 0; m < plan.months; m++) {
    c += plan.monthly * Math.pow(1 + (plan.stepUpYearly ?? 0), Math.floor(m / 12));
    cumContrib.push(c);
  }
  out.yearly = yearEnds.map((m) => {
    const net = Float64Array.from(pathVals[m], (v) => v * (1 - sellFee)).sort();
    let losses = 0;
    for (const v of net) if (v < cumContrib[m]) losses++;
    return { month: m + 1, contributed: cumContrib[m], probLoss: losses / paths, quantiles: Array.from({ length: 101 }, (_, i) => quantile(net, i / 100)) };
  });

  if (nSamples && idxs) {
    const order = Array.from({ length: paths }, (_, i) => i).sort((a, b) => finals[a] - finals[b]);
    out.samples = Array.from({ length: nSamples }, (_, k) => {
      const p = order[Math.min(paths - 1, Math.floor(((k + 0.5) / nSamples) * paths))];
      let src: [string, number][] | null = null;
      if (srcOf) {
        src = [];
        for (let m = 0; m < plan.months; m++) {
          const mo = srcOf(idxs[p * plan.months + m]);
          const last = src[src.length - 1];
          if (last && nextMonthN(last[0], last[1]) === mo) last[1]++;
          else src.push([mo, 1]);
        }
      }
      return { final: finals[p], path: Array.from({ length: plan.months }, (_, m) => pathVals[m][p]), src };
    });
  }
  if (input.goal) {
    // Semua biaya proporsional → nilai akhir linear terhadap setoran. Setoran yang dibutuhkan
    // untuk keyakinan q cukup diskalakan dari persentil (1-q) nilai akhir.
    const need = (q: number) => (input.goal! / quantile(sortedFinals, 1 - q)) * plan.monthly;
    out.goal = {
      target: input.goal,
      prob: share((i) => finals[i] >= input.goal!),
      requiredMonthly: { p50: need(0.5), p80: need(0.8), p90: need(0.9) },
    };
  }
  return out;
}

/** Bulan ke-n setelah `m` ("YYYY-MM"). */
function nextMonthN(m: string, n: number): string {
  let x = m;
  for (let i = 0; i < n; i++) x = nextMonth(x);
  return x;
}
