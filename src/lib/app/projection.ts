// Layanan proyeksi & rekomendasi: data pasar langsung → aturan asumsi → mesin simulasi.
import { assumptionsFor, type Mode } from "../sim/assumptions.ts";
import { backtest, HISTORY_RISK_FREE, type BacktestSummary } from "../sim/backtest.ts";
import { commonWindow, componentsOf, CPI_ID, divId, nextMonth, panelFrom, type Panel } from "../sim/data.ts";
import type { DcaPlan } from "../sim/dca.ts";
import { fxId } from "../sim/instruments.ts";
import { sigmaMu, simulate, type McSummary } from "../sim/montecarlo.ts";
import { mean, quantile, std } from "../sim/stats.ts";
import { classify, MODEL_PROFILES, type Profile } from "../market/classify.ts";
import { cpiIndonesia, fxToIdr, MarketError, monthlyHistory, peersOf, searchYahoo, type MonthlyHistory } from "../market/yahoo.ts";
import type { PlanParams } from "./params.ts";
import type { Alternative, AltGroup, Alternatives, Latest, Outcome, Projection, Rapor } from "./types.ts";

const MIN_MONTHS = 36;
const TTL_MS = 6 * 3600 * 1000;

// Cache dalam memori per instance server, di atas cache fetch Next.js.
const memo = new Map<string, { at: number; value: Promise<unknown> }>();
const MEMO_MAX = 400;
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Promise<T>;
  const value = fn();
  memo.delete(key);
  memo.set(key, { at: Date.now(), value });
  // Batasi ukuran: buang yang kedaluwarsa, lalu yang paling lama (Map menyimpan urutan masuk).
  if (memo.size > MEMO_MAX) {
    for (const [k, v] of memo) if (Date.now() - v.at >= TTL_MS) memo.delete(k);
    for (const k of memo.keys()) {
      if (memo.size <= MEMO_MAX) break;
      memo.delete(k);
    }
  }
  value.catch(() => memo.delete(key));
  return value;
}

interface Loaded {
  profile: Profile;
  history: MonthlyHistory | null;
  annualVol: number;
}

/** Indeks harga tidak memuat dividen; perkiraan dividend yield untuk backtest "di masa lalu". */
const INDEX_YIELD: Record<string, number> = { "^JKSE": 0.025, "^JKLQ45": 0.03, "^GSPC": 0.018, "^NDX": 0.008 };

export function isModel(symbol: string) {
  return MODEL_PROFILES.some((p) => p.symbol === symbol);
}

export function load(symbol: string): Promise<Loaded> {
  return cached(`load:${symbol}`, async () => {
    const model = MODEL_PROFILES.find((p) => p.symbol === symbol);
    if (model) return { profile: model, history: null, annualVol: 0 };
    const [h, hit] = await Promise.all([
      monthlyHistory(symbol),
      searchYahoo(symbol).then((xs) => xs.find((x) => x.symbol === symbol)).catch(() => undefined),
    ]);
    // Hanya pasangan bulan yang berurutan: bulan tanpa transaksi (mis. saham disuspensi) tidak
    // boleh dihitung sebagai satu lonjakan bulanan.
    const lr: number[] = [];
    for (let i = 1; i < h.months.length; i++) {
      if (nextMonth(h.months[i - 1]) === h.months[i]) lr.push(Math.log(h.values[i] / h.values[i - 1]));
    }
    const annualVol = lr.length > 1 ? std(lr) * Math.sqrt(12) : 0;
    const profile = classify({
      symbol,
      name: h.name,
      quoteType: hit?.quoteType ?? h.quoteType,
      exchange: hit?.exchange ?? h.exchange,
      exchangeName: hit?.exchangeName ?? h.exchangeName,
      currency: h.currency,
      annualVol,
      dividendYield: h.dividendYield,
      sector: hit?.sector,
      industry: hit?.industry,
    });
    return { profile, history: h, annualVol };
  });
}

type Cpi = Awaited<ReturnType<typeof cpiIndonesia>>;

/** Panel harga + dividen + kurs; dengan `cpi`, juga inflasi untuk backtest (null = gagal diambil). */
async function panelOf(items: Loaded[], cpi?: Cpi | null): Promise<Panel> {
  const series: { id: string; months: string[]; values: number[]; addYield?: number }[] = [];
  const currencies = new Set<string>();
  for (const l of items) {
    if (!l.history) continue;
    const h = l.history;
    const addYield = l.profile.kind === "indeks" ? INDEX_YIELD[l.profile.symbol] ?? 0.02 : 0;
    series.push({ id: l.profile.symbol, months: h.months, values: h.values, addYield });
    // adjusted ÷ close naik setiap ada dividen; indeks harga memakai perkiraan yield-nya.
    series.push({ id: divId(l.profile.symbol), months: h.months, values: h.values.map((v, i) => v / h.closes[i]), addYield });
    if (l.profile.currency !== "IDR") currencies.add(l.profile.currency);
  }
  for (const cur of currencies) {
    const fx = await cached(`fx:${cur}`, () => fxToIdr(cur));
    series.push({ id: fxId(cur), ...fx });
  }
  if (cpi) series.push({ id: CPI_ID, months: cpi.months, values: cpi.values });
  return panelFrom(series);
}

function cpiOf(): Promise<Cpi | null> {
  return cached("cpi", () => cpiIndonesia(assumptionsFor("dasar").inflation)).catch(() => null);
}

function compVol(panel: Panel, c: string) {
  const xs = panel.comps[c].filter((x): x is number => x != null);
  return std(xs) * Math.sqrt(12);
}

/** Batas atas ekspektasi rata-rata tahunan (aritmetika) untuk aset apa pun. */
const MAX_ARITHMETIC = 0.25;

/** Volatilitas tahunan 36 bulan terakhir dari sebuah komponen panel. */
function recentVol(panel: Panel, c: string) {
  const xs = panel.comps[c].filter((x): x is number => x != null).slice(-36);
  return std(xs) * Math.sqrt(12);
}

function assumptionsOf(items: Loaded[], panel: Panel, mode: Mode) {
  const targets: Record<string, number> = {};
  const uncertainty: Record<string, number> = {};
  const volBlend: Record<string, number> = {};
  const A = assumptionsFor(mode);
  for (const l of items) {
    const id = l.profile.symbol;
    if (!l.history) {
      uncertainty[id] = id === "sbn" ? 0.005 : 0.01; // suku bunga bisa berubah selama horizon
      continue;
    }
    // Kripto: volatilitasnya turun secara struktural seiring pasarnya membesar (BTC ~80%/thn di
    // 2014–2018 → ~40% di 2026), jadi pakai rezim 36 bulan terakhir. Untuk saham, penyesuaian ini
    // gagal uji kalibrasi, jadi tidak dipakai.
    const crypto = l.profile.kind === "kripto";
    if (crypto) volBlend[id] = 1;
    const vol = crypto ? recentVol(panel, id) : l.annualVol;
    if (mode !== "historis") {
      // Target geometrik + gejolak besar = rata-rata aritmetika yang tidak masuk akal (vol 100% →
      // +50%/thn). Batasi supaya aset tidak terlihat menjanjikan hanya karena gejolaknya.
      targets[id] = Math.min(l.profile.assumption.target[mode], MAX_ARITHMETIC - (vol * vol) / 2);
    }
    uncertainty[id] = sigmaMu(vol);
    if (l.profile.currency !== "IDR") {
      const f = fxId(l.profile.currency);
      if (mode !== "historis") targets[f] = A.fx;
      uncertainty[f] = sigmaMu(compVol(panel, f));
    }
  }
  return { targets, uncertainty, volBlend };
}

function ensureHistory(l: Loaded, panel: Panel) {
  if (!l.history) return;
  const comps = componentsOf(l.profile.instrument);
  const [a, b] = commonWindow(panel, comps);
  if (b - a < MIN_MONTHS) {
    throw new MarketError(
      `Data harga ${l.profile.name} baru ${b - a} bulan. Biar hitungannya masuk akal, kita butuh minimal 3 tahun data.`,
      422,
    );
  }
}

function outcomeOf(s: McSummary): Outcome {
  return {
    contributed: s.contributed,
    final: s.final,
    finalReal: s.finalReal,
    finalQuantiles: s.finalQuantiles,
    probLoss: s.probLoss,
    probBeatDeposit: s.probBeatDeposit,
    xirr: s.xirr,
    maxDrawdown: s.maxDrawdown,
  };
}

function latestOf(l: Loaded): Latest | null {
  if (!l.history) return null;
  return { ...l.history.last, currency: l.profile.currency, ...l.history.recent };
}

function info(p: Profile) {
  return {
    symbol: p.symbol,
    name: p.name,
    kind: p.kind,
    kindLabel: p.kindLabel,
    exchangeName: p.exchangeName,
    currency: p.currency,
    sector: p.sector,
    industry: p.industry,
  };
}

export async function project({ symbol, years, mode, stepUp, dividends }: PlanParams): Promise<Projection> {
  const [l, cpi] = await Promise.all([load(symbol), cpiOf()]);
  const panel = await panelOf([l], cpi);
  ensureHistory(l, panel);
  const ins = l.profile.instrument;
  const plan: DcaPlan = { monthly: 1, months: years * 12, stepUpYearly: stepUp, weights: { [ins.id]: 1 }, dividends };
  const { targets, uncertainty, volBlend } = assumptionsOf([l], panel, mode);
  const sim = simulate({
    panel, plan, mode, instruments: [ins], targets, uncertainty, volBlend, paths: 4000, seed: 7, samples: 100, storySource: ins.id,
  });
  const A = assumptionsFor(mode);

  let past: Projection["explain"]["past"] = null;
  let main: BacktestSummary | null = null;
  if (l.history) {
    const bt = backtest(panel, plan, [ins]);
    if (bt.runs.length >= 3) {
      main = bt;
      const xs = bt.runs.map((r) => r.xirr);
      past = { runs: xs.length, median: bt.xirr.p50, worst: Math.min(...xs), best: Math.max(...xs), pctProfit: bt.pctProfit };
    }
  }

  // Sejarah per durasi (ide "Bedah instrumen" seandainya): untuk tiap tahun ke-k, DCA k tahun dari
  // SEMUA bulan mulai yang pernah ada. Dipakai sebagai pembanding proyeksi, bukan sebagai harapan.
  const pastYearly: Projection["pastYearly"] = [];
  if (l.history) {
    for (const y of sim.yearly) {
      const bt = backtest(panel, { ...plan, months: y.month }, [ins]);
      if (bt.runs.length < 3) break;
      const finals = Float64Array.from(bt.runs, (r) => r.finalValue).sort();
      pastYearly.push({
        month: y.month,
        runs: bt.runs.length,
        from: bt.runs[0].start,
        to: bt.runs[bt.runs.length - 1].start,
        pctProfit: bt.pctProfit,
        medianGrowth: bt.xirr.p50,
        p10: round4(quantile(finals, 0.1)),
        p50: round4(quantile(finals, 0.5)),
        p90: round4(quantile(finals, 0.9)),
        worst: round4(finals[0]),
      });
    }
  }
  // Ambang konsistensi: dari durasi ini ke atas, semua titik mulai berakhir untung.
  let consistentFrom: number | null = null;
  for (let k = pastYearly.length - 1; k >= 0 && pastYearly[k].pctProfit === 1; k--) consistentFrom = pastYearly[k].month / 12;

  // Ekspektasi yang benar-benar dipakai (untuk dijelaskan): lokal + kurs.
  let expectedLocal: number;
  let fx = 0;
  if (!l.history) expectedLocal = A.model[ins.id].rate;
  else if (mode === "historis") {
    expectedLocal = Math.exp(12 * mean(panel.comps[ins.id].filter((x): x is number => x != null))) - 1;
    if (l.profile.currency !== "IDR") fx = Math.exp(12 * mean(panel.comps[fxId(l.profile.currency)].filter((x): x is number => x != null))) - 1;
  } else {
    expectedLocal = targets[ins.id];
    if (l.profile.currency !== "IDR") fx = A.fx;
  }

  // Keandalan & rentang data mengikuti umur instrumen itu sendiri, bukan jendela bootstrap
  // (yang bisa lebih panjang karena aset muda di-backfill dengan potongan sejarahnya sendiri).
  const ownMonths = l.history ? l.history.months : [];
  const years_ = ownMonths.length / 12;
  return {
    instrument: info(l.profile),
    plan: { years, months: years * 12, mode, stepUp, dividends },
    outcome: outcomeOf(sim),
    rapor: {
      past: main ? raporOfPast(main) : null,
      future: {
        n: sim.paths,
        pctProfit: 1 - sim.probLoss,
        pctBeatInflation: sim.probBeatInflation,
        growth: sim.xirr.p50,
        realGrowth: sim.realXirr.p50,
        iqrGrowth: sim.xirr.p75 - sim.xirr.p25,
        worstVsContrib: sim.worstVsContrib.p50,
        risk: sim.risk,
        riskFree: A.model.deposito.rate,
        score: sim.stability,
      },
    },
    pastRuns: (main?.runs ?? []).map((r) => ({
      start: r.start,
      final: round4(r.finalValue),
      xirr: round4(r.xirr),
      real: r.realXirr === null ? null : round4(r.realXirr),
      mdd: round4(r.maxDrawdown),
      worst: round4(r.worstVsContrib),
    })),
    pastContributed: sim.contributed,
    consistentFrom,
    dividends: { yield: !l.history ? 0 : l.profile.kind === "indeks" ? INDEX_YIELD[l.profile.symbol] ?? 0.02 : l.history.dividendYield, cash: sim.cash },
    fan: sim.fan,
    samples: (sim.samples ?? []).map((x) => ({ final: round4(x.final), path: x.path.map(round4), src: x.src })),
    yearly: sim.yearly.map((y) => ({ month: y.month, contributed: round4(y.contributed), probLoss: y.probLoss, quantiles: y.quantiles.map(round4) })),
    pastYearly,
    contributedPath: Array.from({ length: years * 12 }, (_, m) => {
      let c = 0;
      for (let k = 0; k <= m; k++) c += Math.pow(1 + stepUp, Math.floor(k / 12));
      return c;
    }),
    explain: {
      historyFrom: ownMonths[0] ?? null,
      historyTo: ownMonths[ownMonths.length - 1] ?? null,
      historyYears: years_,
      reliability: !l.history ? "model" : years_ >= 15 ? "tinggi" : years_ >= 7 ? "sedang" : "rendah",
      expectedIdr: (1 + expectedLocal) * (1 + fx) - 1,
      expectedLocal,
      why:
        mode === "historis" && l.history
          ? `Versi ini pakai rata-rata masa lalu ${l.profile.name} apa adanya. Hati-hati, masa lalu yang bagus belum tentu keulang.`
          : mode !== "historis" && l.history && targets[ins.id] < l.profile.assumption.target[mode] - 1e-9
            ? `${l.profile.assumption.why} Karena naik-turunnya ekstrem banget, perkiraannya kita turunin jadi ${(targets[ins.id] * 100).toFixed(1).replace(".", ",")}% setahun, biar gejolak gede nggak keliatan kayak untung.`
            : l.profile.assumption.why,
      uncertainty: uncertainty[ins.id] ?? 0,
      costs: l.profile.costs,
      buyFee: ins.buyFee,
      warnings: l.profile.warnings,
      inflation: A.inflation,
      depositRate: A.model.deposito.rate,
      cpi: cpi ? { measuredTo: cpi.measuredTo, filledTo: cpi.filledTo } : null,
      past,
    },
    latest: latestOf(l),
    generatedAt: new Date().toISOString(),
  };
}

function raporOfPast(bt: BacktestSummary): Rapor {
  const reals = bt.runs.map((r) => r.realXirr).filter((x): x is number => x !== null);
  const worst = Float64Array.from(bt.runs, (r) => r.worstVsContrib).sort();
  return {
    n: bt.runs.length,
    pctProfit: bt.pctProfit,
    pctBeatInflation: bt.pctBeatInflation,
    growth: bt.xirr.p50,
    realGrowth: reals.length ? quantile(Float64Array.from(reals).sort(), 0.5) : null,
    iqrGrowth: bt.xirr.p75 - bt.xirr.p25,
    worstVsContrib: quantile(worst, 0.5),
    risk: bt.risk,
    riskFree: HISTORY_RISK_FREE,
    score: bt.stability,
  };
}

// ---------------------------------------------------------------------------
// Rekomendasi alternatif
// ---------------------------------------------------------------------------

interface Candidate {
  key: string;
  group: AltGroup;
  label?: string;
  weights: Record<string, number>;
  why: (main: Profile, alt: Profile[]) => string;
}

const GLOBAL = "ACWI";

function marketIndexFor(p: Profile): string | null {
  if (p.kind === "kripto") return p.symbol === "BTC-USD" ? "ETH-USD" : "BTC-USD";
  if (p.kind === "kas") return null;
  if (p.currency === "IDR") return "^JKSE";
  if (p.currency === "USD") return "SPY";
  // Pasar lain: kandidat "saham dunia" (ACWI) sudah ditambahkan terpisah dengan penjelasan yang benar.
  return null;
}

/** null = daftar emiten sejenis gagal diambil (hasil dianggap menurun, tidak di-cache). */
async function peerCandidates(main: Loaded): Promise<string[] | null> {
  if (!main.history || main.profile.kind === "indeks") return [];
  const raw = await cached(`peers:${main.profile.symbol}`, () => peersOf(main.profile.symbol)).catch(() => null);
  if (!raw) return null;
  // Ambil paralel, lalu pertahankan urutan "paling mirip" dari Yahoo.
  const loaded = await Promise.all(raw.slice(0, 6).map((sym) => load(sym).catch(() => null)));
  return raw
    .slice(0, 6)
    .filter((_, i) => {
      const l = loaded[i];
      return !!l && l.profile.kind === main.profile.kind && (l.history?.months.length ?? 0) >= 60 && l.profile.currency === main.profile.currency;
    })
    .slice(0, 2);
}

function pctText(x: number) {
  return `${Math.round(Math.abs(x) * 100)}%`;
}

/** Kalimat perbandingan berbasis angka, dibaca dari sudut pandang pengguna. */
export function compare(alt: Outcome, main: Outcome): string {
  const med = alt.final.p50 / main.final.p50 - 1;
  const lossA = Math.round(alt.probLoss * 100);
  const lossM = Math.round(main.probLoss * 100);
  const medText = Math.abs(med) < 0.07 ? "Hasilnya mirip" : med > 0 ? `Hasilnya ${pctText(med)} lebih gede` : `Hasilnya ${pctText(med)} lebih kecil`;
  const diff = lossA - lossM;
  const lossText =
    diff <= -3 ? `lebih jarang rugi (${lossA} vs ${lossM} dari 100)`
    : diff >= 3 ? `lebih sering rugi (${lossA} vs ${lossM} dari 100)`
    : `peluang ruginya mirip (${lossA} dari 100)`;
  const joiner =
    Math.abs(diff) < 3 ? ", "
    : (med >= -0.07 && diff <= -3) || (med < -0.07 && diff >= 3) ? ", dan "
    : ", tapi ";
  return `${medText}${joiner}${lossText}.`;
}

export async function alternatives({ symbol, years, mode, stepUp, dividends }: PlanParams): Promise<Alternatives> {
  const main = await load(symbol);
  const p = main.profile;
  const candidates: Candidate[] = [];

  const peers = await peerCandidates(main);
  let degraded = peers === null;
  for (const peer of peers ?? []) {
    candidates.push({
      key: peer, group: "sejenis", weights: { [peer]: 1 },
      why: (_m, [alt]) =>
        alt.kind === "kripto" ? "Kripto lain yang sering dibandingin sama pilihanmu."
        : alt.industry ? `Satu industri sama pilihanmu (${alt.industry}).` : `${alt.kindLabel} yang sering dibandingin sama pilihanmu.`,
    });
  }

  if (p.kind === "kas") {
    for (const other of MODEL_PROFILES.filter((m) => m.symbol !== symbol && m.symbol !== "deposito")) {
      candidates.push({ key: other.symbol, group: "sejenis", weights: { [other.symbol]: 1 }, why: () => "Sama-sama hampir nggak pernah turun." });
    }
    candidates.push({
      key: "mix-kas-global", group: "terdiversifikasi", label: `80% ${p.name} + 20% saham dunia`,
      weights: { [symbol]: 0.8, [GLOBAL]: 0.2 },
      why: () => "Ditambah sedikit saham dunia, biar bisa tumbuh lebih cepat.",
    });
  } else {
    const idx = marketIndexFor(p);
    if (idx && idx !== symbol) {
      candidates.push({
        key: idx, group: p.kind === "kripto" ? "sejenis" : "terdiversifikasi", weights: { [idx]: 1 },
        why: (_m, [alt]) =>
          alt.kind === "kripto" ? "Kripto besar lainnya."
          : alt.kind === "indeks" ? "Satu produk isinya ratusan saham, jadi nggak bergantung ke satu perusahaan."
          : "Satu ETF isinya 500 perusahaan terbesar Amerika.",
      });
    }
    if (symbol !== GLOBAL) {
      candidates.push({
        key: GLOBAL, group: "terdiversifikasi", weights: { [GLOBAL]: 1 },
        why: () => "Satu ETF isinya ribuan perusahaan dari puluhan negara.",
      });
    }
    const partner = p.kind === "kripto" ? GLOBAL : idx && idx !== symbol && p.kind !== "indeks" ? idx : GLOBAL;
    const share = p.kind === "kripto" ? 0.1 : 0.5;
    if (partner !== symbol) {
      candidates.push({
        key: `mix-${partner}`, group: "terdiversifikasi",
        label: `${Math.round(share * 100)}% ${shortName(p)} + ${Math.round((1 - share) * 100)}% ${partner === GLOBAL ? "saham dunia" : partner === "^JKSE" ? "IHSG" : partner === "SPY" ? "S&P 500" : partner}`,
        weights: { [symbol]: share, [partner]: 1 - share },
        why: () =>
          p.kind === "kripto"
            ? "Tetap punya kripto, tapi secuil aja. Banyak perencana keuangan nyaranin maksimal 5–10%."
            : "Separuh di pilihanmu, separuh di yang lebih nyebar. Diseimbangin tiap tahun.",
      });
    }
  }
  candidates.push({ key: "rdpu", group: "pembanding", weights: { rdpu: 1 }, why: () => "Paling kalem: hampir nggak pernah turun, tapi tumbuhnya pelan." });
  if (symbol === "rdpu") candidates.pop();

  const seen = new Set<string>();
  const unique = candidates.filter((c) => (seen.has(c.key) ? false : (seen.add(c.key), true)));
  const months = years * 12;

  /** Simulasi ringan (tanpa jalur contoh & backtest) dengan setoran, durasi, dan benih acak yang sama. */
  async function outcomeFor(weights: Record<string, number>) {
    const ids = Object.keys(weights);
    const loaded = await Promise.all(ids.map(load));
    const panel = await panelOf(loaded);
    loaded.forEach((l) => ensureHistory(l, panel));
    const { targets, uncertainty, volBlend } = assumptionsOf(loaded, panel, mode);
    const plan: DcaPlan = { monthly: 1, months, stepUpYearly: stepUp, weights, rebalanceYearly: ids.length > 1, dividends };
    const sim = simulate({ panel, plan, mode, instruments: loaded.map((l) => l.profile.instrument), targets, uncertainty, volBlend, paths: 1500, seed: 11 });
    return { outcome: outcomeOf(sim), loaded };
  }

  // Pilihan utama dan semua kandidat dihitung bersamaan, dengan cara yang persis sama.
  const [mainRun, ...sims] = await Promise.all([
    outcomeFor({ [symbol]: 1 }),
    ...unique.slice(0, 6).map((c) =>
      outcomeFor(c.weights).catch((e) => {
        // Data terlalu pendek = sifat instrumennya; selain itu = sumber data gagal.
        if (!(e instanceof MarketError && e.status === 422)) degraded = true;
        return null;
      }),
    ),
  ]);
  const results = unique.slice(0, 6).map((c, i): Alternative | null => {
    const r = sims[i];
    if (!r) return null;
    const ids = Object.keys(c.weights);
    const altProfiles = r.loaded.filter((l) => l.profile.symbol !== symbol).map((l) => l.profile);
    const single = ids.length === 1 ? r.loaded[0] : null;
    return {
      key: c.key,
      group: c.group,
      label: c.label ?? single!.profile.name,
      symbol: single ? single.profile.symbol : null,
      kind: single ? single.profile.kind : "campuran",
      weights: c.weights,
      why: c.why(p, altProfiles.length ? altProfiles : [r.loaded[0].profile]),
      comparison: compare(r.outcome, mainRun.outcome),
      outcome: r.outcome,
      latest: single ? latestOf(single) : null,
    };
  });
  return { base: symbol, degraded, items: results.filter((x): x is Alternative => x !== null), generatedAt: new Date().toISOString() };
}

/** 4 angka penting: cukup untuk grafik, memangkas ukuran respons ~60%. */
function round4(x: number) {
  return Number(x.toPrecision(4));
}

function shortName(p: Profile) {
  return p.symbol.startsWith("^") || p.kind === "kas" ? p.name : p.symbol.replace(/\.JK$/, "").replace(/-USD$/, "");
}
