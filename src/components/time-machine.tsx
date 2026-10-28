"use client";

import { useId, useMemo, useState } from "react";
import { addMonths, MONTH_NAMES, monthLabel, percent, rupiahWords } from "@/lib/app/format";
import type { PastRun, Projection } from "@/lib/app/types";
import { Icon3D } from "./icon3d";

type View = "sepuluh" | "satu" | "semua";

const VIEWS: { key: View; label: string; hint: string }[] = [
  { key: "sepuluh", label: "10 tahun berbeda", hint: "Mulai di bulan yang sama, tiap tahun beda. Kelihatan seberapa ngaruh waktu masuknya." },
  { key: "satu", label: "Satu tanggal", hint: "Pilih sendiri kapan mulainya." },
  { key: "semua", label: "Semua bulan", hint: "Semua bulan mulai yang pernah ada. Ketuk kotaknya buat lihat rinciannya." },
];

const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));

interface Props {
  data: Projection;
  amount: number;
}

/**
 * "Kalau dulu mulai…": backtest DCA dari tiap bulan mulai di masa lalu, dengan tiga cara lihat
 * seperti seandainya.vercel.app. Semua angka per Rp1 dari server, dikali setoran di sini.
 */
export function TimeMachine({ data, amount }: Props) {
  const uid = useId();
  const runs = data.pastRuns;
  const months = data.plan.months;
  const last = runs[runs.length - 1];
  const [view, setView] = useState<View>("sepuluh");
  const [calMonth, setCalMonth] = useState(() => (last ? Number(last.start.slice(5, 7)) : 1));
  const [start, setStart] = useState(() => last?.start ?? "");
  const [prevRuns, setPrevRuns] = useState(runs);
  if (runs !== prevRuns) {
    setPrevRuns(runs);
    if (last && !runs.some((r) => r.start === start)) setStart(last.start);
    if (last && !runs.some((r) => Number(r.start.slice(5, 7)) === calMonth)) setCalMonth(Number(last.start.slice(5, 7)));
  }

  const contributed = data.pastContributed * amount;
  const byYear = useMemo(() => {
    const m = new Map<number, (PastRun | undefined)[]>();
    for (const r of runs) {
      const y = Number(r.start.slice(0, 4));
      if (!m.has(y)) m.set(y, Array(12).fill(undefined));
      m.get(y)![Number(r.start.slice(5, 7)) - 1] = r;
    }
    return [...m.entries()];
  }, [runs]);

  if (runs.length < 3) return null;

  const span = `${data.plan.years} tahun`;
  const endOf = (r: PastRun) => addMonths(r.start, months - 1);
  const gainText = (r: PastRun) => {
    const g = r.final * amount - contributed;
    return `${g >= 0 ? "+" : "−"}${rupiahWords(Math.abs(g))}`;
  };
  const hint = VIEWS.find((v) => v.key === view)!.hint;

  return (
    <section aria-labelledby={`${uid}-h`} className="rounded-[var(--radius-card)] bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[56ch]">
          <h2 id={`${uid}-h`} className="font-display text-xl font-extrabold text-ink sm:text-2xl">
            Kalau dulu mulai…
          </h2>
          <p className="mt-1 text-ink-2">
            Ini yang beneran terjadi kalau dulu nabung {rupiahWords(amount)} sebulan selama {span} di sini. Bukan tebakan, tapi juga bukan janji.
          </p>
        </div>
        <Icon3D name="bendera" size={64} className="hidden sm:block" />
      </div>

      <fieldset className="mt-5">
        <legend className="sr-only">Cara lihat</legend>
        <div className="grid grid-cols-3 gap-1 rounded-[24px] bg-page p-1 sm:inline-grid">
          {VIEWS.map((v) => (
            <label
              key={v.key}
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[20px] px-1.5 py-1 text-center text-sm font-bold leading-tight min-[360px]:px-3 sm:px-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-coral-ink ${
                view === v.key ? "bg-selected text-on-selected" : "text-ink hover:bg-line"
              }`}
            >
              <input type="radio" name={`${uid}-view`} className="sr-only" checked={view === v.key} onChange={() => setView(v.key)} />
              {v.label}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-2 text-sm text-muted">{hint}</p>

      {view === "sepuluh" && (
        <TenYears
          uid={uid}
          runs={runs}
          calMonth={calMonth}
          onMonth={setCalMonth}
          amount={amount}
          contributed={contributed}
          endOf={endOf}
          gainText={gainText}
          onPick={(s) => {
            setStart(s);
            setView("satu");
          }}
        />
      )}
      {view === "satu" && (
        <OneDate uid={uid} runs={runs} byYear={byYear} start={start} onStart={setStart} amount={amount} contributed={contributed} endOf={endOf} gainText={gainText} />
      )}
      {view === "semua" && (
        <AllMonths
          uid={uid}
          runs={runs}
          byYear={byYear}
          amount={amount}
          contributed={contributed}
          onPick={(s) => {
            setStart(s);
            setView("satu");
          }}
        />
      )}

      <p className="mt-4 text-sm text-muted">
        Sudah dipotong biaya & pajak, dihitung ke Rupiah tiap bulan.{" "}
        {data.plan.dividends === "tunai" ? "Dividen diambil tunai dan didiamkan." : "Dividen dibelikan lagi."} Masa lalu yang bagus belum tentu terulang.
      </p>
    </section>
  );
}

interface SharedProps {
  uid: string;
  runs: PastRun[];
  amount: number;
  contributed: number;
}

function TenYears({
  uid,
  runs,
  calMonth,
  onMonth,
  amount,
  contributed,
  endOf,
  gainText,
  onPick,
}: SharedProps & {
  calMonth: number;
  onMonth: (m: number) => void;
  endOf: (r: PastRun) => string;
  gainText: (r: PastRun) => string;
  onPick: (start: string) => void;
}) {
  const picked = runs.filter((r) => Number(r.start.slice(5, 7)) === calMonth).slice(-10);
  const available = new Set(runs.map((r) => Number(r.start.slice(5, 7))));
  const wins = picked.filter((r) => r.final * amount > contributed).length;
  const best = picked.reduce((a, b) => (b.final > a.final ? b : a), picked[0]);
  const worst = picked.reduce((a, b) => (b.final < a.final ? b : a), picked[0]);
  const max = Math.max(...picked.map((r) => r.final));
  const pos = (v: number) => `${Math.min(100, (v / (max * amount)) * 100)}%`;

  return (
    <div className="mt-4">
      <label htmlFor={`${uid}-cal`} className="text-sm font-bold text-ink">
        Mulai tiap bulan
      </label>
      <select
        id={`${uid}-cal`}
        value={calMonth}
        onChange={(e) => onMonth(Number(e.target.value))}
        className="ml-2 min-h-11 rounded-full border-2 border-line-strong bg-surface px-3 text-sm font-bold text-ink"
      >
        {MONTH_NAMES.map((m, i) => (
          <option key={m} value={i + 1} disabled={!available.has(i + 1)}>
            {m}
          </option>
        ))}
      </select>

      {picked.length > 0 && (
        <>
          <ul className="mt-4 flex flex-wrap gap-2 text-sm" aria-label="Ringkasan">
            <li className="rounded-full bg-mint-soft px-3 py-1.5 font-bold text-ink">
              {wins} dari {picked.length} untung
            </li>
            <li className="rounded-full bg-page px-3 py-1.5 text-ink">
              Terbaik: mulai {monthLabel(best.start)} → <strong>{rupiahWords(best.final * amount)}</strong>
            </li>
            <li className="rounded-full bg-page px-3 py-1.5 text-ink">
              Terburuk: mulai {monthLabel(worst.start)} → <strong>{rupiahWords(worst.final * amount)}</strong>
            </li>
          </ul>

          <div role="region" aria-labelledby={`${uid}-ten`} tabIndex={0} className="mt-3 overflow-x-auto rounded-2xl border border-line [scroll-padding-inline-start:7rem]">
            <table className="w-full min-w-max border-collapse whitespace-nowrap text-sm tabular">
              <caption id={`${uid}-ten`} className="sr-only">
                Hasil nabung kalau mulai tiap {MONTH_NAMES[calMonth - 1]}, {picked.length} tahun berbeda. Total setoran {rupiahWords(contributed)}. Bisa digeser ke
                samping.
              </caption>
              <thead>
                <tr className="border-b border-line text-left align-bottom text-ink-2">
                  <th scope="col" className="sticky left-0 z-10 bg-surface px-3 py-3 font-bold">
                    Mulai
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">
                    Jadinya
                    <span className="block text-xs font-normal text-muted">dari {rupiahWords(contributed)}</span>
                  </th>
                  <th scope="col" className="min-w-[140px] px-3 py-3 font-bold">
                    <span className="sr-only">Grafik nilai akhir</span>
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Tumbuh per tahun</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Di atas inflasi</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Jatuh terdalam</th>
                </tr>
              </thead>
              <tbody>
                {[...picked].reverse().map((r) => {
                  const loss = r.final * amount < contributed;
                  return (
                    <tr key={r.start} className="border-b border-line">
                      <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-bold text-ink">
                        <button
                          type="button"
                          onClick={() => onPick(r.start)}
                          className="inline-flex min-h-6 items-center text-left underline decoration-dotted underline-offset-4"
                        >
                          {monthLabel(r.start)}
                        </button>
                        <span className="block text-xs font-normal text-muted">s.d. {monthLabel(endOf(r))}</span>
                      </th>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`block font-bold ${loss ? "text-loss-ink" : "text-ink"}`}>{rupiahWords(r.final * amount)}</span>
                        <span className={`block text-xs ${loss ? "text-loss-ink" : "text-muted"}`}>{gainText(r)}</span>
                      </td>
                      <td className="px-3 py-2.5" aria-hidden="true">
                        <div className="relative h-6">
                          <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-page" />
                          <span
                            className={`absolute left-0 top-1/2 h-3 -translate-y-1/2 rounded-full ${loss ? "bg-[var(--loss)]" : "bg-[var(--band-inner)]"}`}
                            style={{ width: pos(r.final * amount) }}
                          />
                          <span className="absolute top-0 h-6 w-[2px] -translate-x-1/2 rounded bg-[var(--contrib)]" style={{ left: pos(contributed) }} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">{percent(r.xirr, 1)}</td>
                      <td className="px-3 py-2.5 text-right">{r.real === null ? "—" : percent(r.real, 1)}</td>
                      <td className="px-3 py-2.5 text-right">{percent(r.mdd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-2">
            <span aria-hidden="true" className="h-3.5 w-[2px] rounded bg-[var(--contrib)]" /> Garis = total setoran. Ketuk bulannya buat rincian.
          </p>
        </>
      )}
    </div>
  );
}

function OneDate({
  uid,
  runs,
  byYear,
  start,
  onStart,
  amount,
  contributed,
  endOf,
  gainText,
}: SharedProps & {
  byYear: [number, (PastRun | undefined)[]][];
  start: string;
  onStart: (s: string) => void;
  endOf: (r: PastRun) => string;
  gainText: (r: PastRun) => string;
}) {
  const r = runs.find((x) => x.start === start) ?? runs[runs.length - 1];
  const final = r.final * amount;
  const loss = final < contributed;
  const beaten = Math.round((runs.filter((x) => x.final < r.final).length / Math.max(1, runs.length - 1)) * 100);
  const facts: [string, string][] = [
    ["Total setoran", rupiahWords(contributed)],
    ["Untung/rugi", gainText(r)],
    ["Tumbuh per tahun", percent(r.xirr, 1)],
    ["Di atas inflasi", r.real === null ? "belum ada datanya" : percent(r.real, 1)],
    ["Jatuh terdalam di jalan", percent(r.mdd)],
    ["Paling jauh di bawah setoran", r.worst > -0.005 ? "nggak pernah" : percent(r.worst)],
  ];

  return (
    <div className="mt-4">
      <label htmlFor={`${uid}-start`} className="text-sm font-bold text-ink">
        Mulai nabung
      </label>
      <select
        id={`${uid}-start`}
        value={r.start}
        onChange={(e) => onStart(e.target.value)}
        className="ml-2 min-h-11 rounded-full border-2 border-line-strong bg-surface px-3 text-sm font-bold text-ink"
      >
        {[...byYear].reverse().map(([y, ms]) => (
          <optgroup key={y} label={String(y)}>
            {ms.map((x, i) =>
              x ? (
                <option key={x.start} value={x.start}>
                  {MONTH_NAMES[i]} {y}
                </option>
              ) : null,
            )}
          </optgroup>
        ))}
      </select>

      <div className={`mt-4 rounded-[20px] p-5 ${loss ? "bg-coral-soft" : "bg-mint-soft"}`} aria-live="polite">
        <p className="text-ink-2">
          Mulai {monthLabel(r.start)}, dicairin {monthLabel(endOf(r))}:
        </p>
        <p className="font-display text-3xl font-extrabold text-ink">{rupiahWords(final)}</p>
        <p className="mt-1 text-sm text-ink-2">
          {loss ? "Rugi. " : ""}Hasilnya ngalahin {beaten} dari 100 bulan mulai lainnya.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-ink-2">{k}</dt>
              <dd className="font-bold text-ink tabular">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function AllMonths({
  uid,
  runs,
  byYear,
  amount,
  contributed,
  onPick,
}: SharedProps & { byYear: [number, (PastRun | undefined)[]][]; onPick: (start: string) => void }) {
  const wins = runs.filter((r) => r.final * amount > contributed).length;
  const sorted = [...runs].sort((a, b) => a.xirr - b.xirr);
  const median = sorted[Math.floor(sorted.length / 2)];
  const best = sorted[sorted.length - 1];
  const worst = sorted[0];
  // Skala warna simetris di sekitar 0, dipotong di ±30%/thn supaya satu bulan ekstrem tidak memudarkan sisanya.
  const cap = Math.min(0.3, Math.max(0.05, ...runs.map((r) => Math.abs(r.xirr))));
  const tint = (x: number) => {
    const a = Math.round(12 + 48 * Math.min(1, Math.abs(x) / cap));
    return `color-mix(in oklab, var(${x < 0 ? "--loss" : "--target"}) ${a}%, var(--surface))`;
  };

  return (
    <div className="mt-4">
      <ul className="flex flex-wrap gap-2 text-sm" aria-label="Ringkasan">
        <li className="rounded-full bg-mint-soft px-3 py-1.5 font-bold text-ink">
          {Math.round((wins / runs.length) * 100)} dari 100 bulan mulai untung
        </li>
        <li className="rounded-full bg-page px-3 py-1.5 text-ink">Tengah: tumbuh {percent(median.xirr, 1)}/thn</li>
        <li className="rounded-full bg-page px-3 py-1.5 text-ink">
          Terbaik {monthLabel(best.start)} ({percent(best.xirr, 1)})
        </li>
        <li className="rounded-full bg-page px-3 py-1.5 text-ink">
          Terburuk {monthLabel(worst.start)} ({percent(worst.xirr, 1)})
        </li>
      </ul>

      <div role="region" aria-labelledby={`${uid}-all`} tabIndex={0} className="mt-3 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-max border-collapse text-xs tabular">
          <caption id={`${uid}-all`} className="sr-only">
            Tumbuh per tahun untuk tiap bulan mulai, {runs.length} bulan. Baris = tahun mulai, kolom = bulan mulai. Bisa digeser ke samping.
          </caption>
          <thead>
            <tr className="text-ink-2">
              <th scope="col" className="sticky left-0 z-10 bg-surface px-2 py-2 text-left font-bold">
                Mulai
              </th>
              {SHORT_MONTHS.map((m) => (
                <th key={m} scope="col" className="px-0.5 py-2 text-center font-bold">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...byYear].reverse().map(([y, ms]) => (
              <tr key={y}>
                <th scope="row" className="sticky left-0 z-10 bg-surface px-2 py-0.5 text-left font-bold text-ink">
                  {y}
                </th>
                {ms.map((r, i) => (
                  <td key={i} className="p-0.5">
                    {r ? (
                      <button
                        type="button"
                        onClick={() => onPick(r.start)}
                        aria-label={`Mulai ${MONTH_NAMES[i]} ${y}: tumbuh ${percent(r.xirr, 1)} per tahun, jadi ${rupiahWords(r.final * amount)}`}
                        className="grid h-9 w-11 place-items-center rounded-md font-bold text-ink hover:outline hover:outline-2 hover:outline-ink"
                        style={{ background: tint(r.xirr) }}
                      >
                        {Math.round(r.xirr * 100)}
                      </button>
                    ) : (
                      <span className="block h-9 w-11" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
        <span>Angka = tumbuh per tahun (%).</span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-5 rounded" style={{ background: tint(cap) }} /> untung
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-5 rounded" style={{ background: tint(-cap) }} /> rugi
        </span>
        <span>Makin pekat, makin jauh dari nol.</span>
      </p>
    </div>
  );
}
