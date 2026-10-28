"use client";

import Link from "next/link";
import { Fragment, useId, useMemo, useState } from "react";
import { monthLabel, percent, rupiahWords } from "@/lib/app/format";
import type { Projection } from "@/lib/app/types";
import { analyzeYears, type Milestone, type YearRow } from "@/lib/app/yearly";
import { Icon3D } from "./icon3d";

type Scenario = "apes" | "tengah" | "hoki";

const SCENARIOS: { key: Scenario; label: string; hint: string }[] = [
  { key: "apes", label: "Apes", hint: "5 dari 100 masa depan lebih jelek dari ini." },
  { key: "tengah", label: "Tengah", hint: "Separuh masa depan lebih bagus, separuh lebih jelek." },
  { key: "hoki", label: "Hoki", hint: "Cuma 5 dari 100 masa depan yang lebih bagus dari ini." },
];

interface Props {
  data: Projection;
  amount: number;
  goal: number | null;
}

/**
 * "Tahun demi tahun": kalau dicairkan di akhir tiap tahun, kira-kira jadi berapa. Tabel sungguhan
 * (bukan kartu) supaya bisa dibandingkan ke bawah antar-tahun; kolom tahun menempel saat digeser.
 * Pola mengikuti GOV.UK/USWDS/NN/g; skenario apes–tengah–hoki mengikuti SEOJK 12/2014 & PRIIPs
 * (lihat docs/riset/04-uiux-tabel-proyeksi.md).
 */
export function YearTable({ data, amount, goal }: Props) {
  const uid = useId();
  const [scenario, setScenario] = useState<Scenario>("tengah");
  const [detail, setDetail] = useState(false);
  const [allYears, setAllYears] = useState(false);
  const e = data.explain;

  const { rows, milestones } = useMemo(
    () => analyzeYears(data.yearly, { amount, stepUp: data.plan.stepUp, inflation: e.inflation, goal, consistentFrom: data.consistentFrom }),
    [data.yearly, amount, data.plan.stepUp, e.inflation, goal, data.consistentFrom],
  );
  const past = useMemo(() => new Map(data.pastYearly.map((p) => [p.month, p])), [data.pastYearly]);
  const startYear = new Date().getFullYear();
  const last = rows[rows.length - 1];

  // Lebih dari 10 tahun: tampilkan tahun penting dulu (1, 3, 5, 10, separuh, akhir, + tahun momen).
  const many = rows.length > 10;
  const keyYears = new Set([1, 3, 5, 10, Math.ceil(rows.length / 2), last?.year, ...milestones.map((m) => m.year)]);
  const shown = many && !allYears ? rows.filter((r) => keyYears.has(r.year)) : rows;
  const byYear = new Map<number, Milestone[]>();
  for (const m of milestones) byYear.set(m.year, [...(byYear.get(m.year) ?? []), m]);

  // Sumbu bersama untuk bar rentang: dipotong supaya ekor hoki yang ekstrem tidak menelan sisanya.
  const axisMax = Math.min(
    Math.max(...rows.map((r) => r.hoki)),
    Math.max(1.6 * Math.max(...rows.map((r) => r.atas)), 1.15 * (goal ?? 0), 1.3 * (last?.deposited ?? 0)),
  );
  const pos = (v: number) => `${Math.max(0, Math.min(100, (v / axisMax) * 100))}%`;
  const value = (r: YearRow) => r[scenario];
  const probLabel = goal ? "Peluang capai target" : "Peluang rugi";
  const prob = (r: YearRow) => (goal ? (r.probGoal ?? 0) : r.probLoss);
  const n100 = (x: number) => Math.round(x * 100);

  // Wawasan ringkas di atas tabel (ELI5).
  const pastLast = last ? past.get(last.month) : undefined;
  const insights: string[] = [];
  if (last) {
    insights.push(
      `${rupiahWords(last.tengah)} di ${startYear + last.year} kira-kira setara ${rupiahWords(last.realTengah)} uang hari ini, karena harga-harga ikut naik.`,
    );
  }
  if (last && pastLast) {
    insights.push(
      `Di masa lalu, ${n100(pastLast.pctProfit)} dari 100 orang yang nabung ${last.year} tahun di sini berakhir untung. Hitungan ke depan kita lebih hati-hati: ${100 - n100(last.probLoss)} dari 100, karena sejarah yang bagus belum tentu terulang.`,
    );
  }
  if (data.pastYearly.length >= 2 && !data.consistentFrom) {
    insights.push(
      `Di sejarah, belum ada lama nabung (1–${data.pastYearly.length} tahun) yang selalu untung dari semua bulan mulai. Selalu ada yang apes masuk di waktu yang salah.`,
    );
  }
  insights.push("Jarak apes ke hoki melebar tiap tahun. Itu normal: makin jauh ke depan, makin banyak yang bisa terjadi.");

  function downloadCsv() {
    const rp = (v: number) => Math.round(v);
    const cols: [string, (r: YearRow) => string | number][] = [
      ["Tahun ke-", (r) => r.year],
      ["Akhir tahun", (r) => (r.month % 12 ? `bulan ke-${r.month}` : startYear + r.year)],
      ["Total setoran (Rp)", (r) => rp(r.deposited)],
      ["Apes P5 (Rp)", (r) => rp(r.apes)],
      ["Bawah P25 (Rp)", (r) => rp(r.bawah)],
      ["Tengah P50 (Rp)", (r) => rp(r.tengah)],
      ["Atas P75 (Rp)", (r) => rp(r.atas)],
      ["Hoki P95 (Rp)", (r) => rp(r.hoki)],
      ["Daya beli hari ini, tengah (Rp)", (r) => rp(r.realTengah)],
      ["Hasil investasi tahun ini, tengah (Rp)", (r) => rp(r.earnedThisYear)],
      ["Tumbuh per tahun, tengah (%)", (r) => (r.growth * 100).toFixed(1).replace(".", ",")],
      ["Peluang rugi (dari 100)", (r) => n100(r.probLoss)],
      ...(goal ? [["Peluang capai target (dari 100)", (r: YearRow) => n100(r.probGoal ?? 0)] as [string, (r: YearRow) => number]] : []),
      ["Sejarah: untung per 100 titik mulai", (r) => (past.get(r.month) ? n100(past.get(r.month)!.pctProfit) : "")],
    ];
    const csv = [
      `# Cobain: ${data.instrument.name}, ${rupiahWords(amount)}/bulan, ${data.plan.years} tahun. Hanya simulasi, bukan jaminan hasil.`,
      cols.map(([h]) => h).join(";"),
      ...rows.map((r) => cols.map(([, f]) => f(r)).join(";")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cobain-${data.instrument.symbol.replace(/[^A-Za-z0-9]+/g, "")}-${data.plan.years}thn.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const capId = `${uid}-cap`;
  const sticky = "sticky left-0 z-10";

  return (
    <section aria-labelledby={`${uid}-h`} className="rounded-[var(--radius-card)] bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[52ch]">
          <h2 id={`${uid}-h`} className="font-display text-xl font-extrabold text-ink sm:text-2xl">
            Tahun demi tahun
          </h2>
          <p className="mt-1 text-ink-2">Kalau dicairkan di akhir tiap tahun, kira-kira jadi berapa? Sudah dipotong biaya & pajak.</p>
        </div>
        <Icon3D name="bendera" size={64} className="hidden sm:block" />
      </div>

      <ul className="mt-4 flex flex-col gap-1.5 text-sm text-ink-2" aria-label="Yang perlu kamu tahu">
        {insights.map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden="true" className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
            {t}
          </li>
        ))}
      </ul>

      {/* Kontrol: satu baris di atas tabel yang dikendalikannya. */}
      <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-3">
        <fieldset>
          <legend className="mb-1.5 text-sm font-bold text-ink">Versi angka</legend>
          <div className="inline-flex rounded-full bg-page p-1">
            {SCENARIOS.map((s) => (
              <label
                key={s.key}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-coral-ink ${
                  scenario === s.key ? "bg-selected text-on-selected" : "text-ink hover:bg-line"
                }`}
              >
                <input type="radio" name={`${uid}-sc`} className="sr-only" checked={scenario === s.key} onChange={() => setScenario(s.key)} />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          aria-expanded={detail}
          aria-controls={`${uid}-wrap`}
          onClick={() => setDetail((d) => !d)}
          className="inline-flex min-h-11 items-center rounded-full bg-night px-4 text-sm font-bold text-on-night hover:bg-night-raise"
        >
          {detail ? "Ringkas lagi" : "Lihat rincian"}
        </button>
        {many && (
          <button
            type="button"
            aria-expanded={allYears}
            aria-controls={`${uid}-wrap`}
            onClick={() => setAllYears((a) => !a)}
            className="inline-flex min-h-11 items-center rounded-full bg-page px-4 text-sm font-bold text-ink hover:bg-line"
          >
            {allYears ? "Tahun penting saja" : `Semua ${rows.length} tahun`}
          </button>
        )}
        <button type="button" onClick={downloadCsv} className="inline-flex min-h-11 items-center rounded-full bg-page px-4 text-sm font-bold text-ink hover:bg-line">
          Unduh CSV
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">{SCENARIOS.find((s) => s.key === scenario)?.hint}</p>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-2" aria-label="Keterangan kolom sebaran">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-[var(--median)] ring-1 ring-[var(--median)]" />
          Tengah
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-[var(--band-inner)]" />
          Separuh kemungkinan
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-[var(--band-outer)] ring-1 ring-[var(--band-inner)]" />
          Apes sampai hoki
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3.5 w-[2px] rounded bg-[var(--contrib)]" />
          Total setoran
        </li>
        {goal ? (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3.5 w-[3px] rounded bg-[var(--target)]" />
            Target
          </li>
        ) : null}
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="font-bold text-[var(--median)]">›</span>
          Hoki lebih jauh dari skala
        </li>
      </ul>

      <div
        id={`${uid}-wrap`}
        role="region"
        aria-labelledby={capId}
        tabIndex={0}
        className="mt-3 overflow-x-auto rounded-2xl border border-line [scroll-padding-inline-start:6.5rem]"
      >
        <table className="w-full min-w-max border-collapse whitespace-nowrap text-sm tabular">
          <caption id={capId} className="sr-only">
            Tahun demi tahun: {data.instrument.name}, {rupiahWords(amount)} per bulan selama {data.plan.years} tahun. Nilai kalau dicairkan di akhir
            tiap tahun, versi {scenario}. Bisa digeser ke samping.
          </caption>
          <thead>
            <tr className="border-b border-line text-left align-bottom text-ink-2">
              <th scope="col" className={`${sticky} bg-surface px-3 py-3 font-bold`}>
                Tahun
              </th>
              <th scope="col" className="px-3 py-3 text-right font-bold">
                Total setoran
              </th>
              <th scope="col" className="px-3 py-3 text-right font-bold">
                Perkiraan nilai
                <span className="block text-xs font-normal text-muted">versi {scenario}; di bawahnya separuh kemungkinan</span>
              </th>
              <th scope="col" className="min-w-[180px] px-3 py-3 font-bold">
                Sebaran
                <span className="block text-xs font-normal text-muted">apes → hoki</span>
              </th>
              <th scope="col" className="px-3 py-3 text-right font-bold">
                {probLabel}
              </th>
              {detail && (
                <>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Apes</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Bawah</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Tengah</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Atas</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Hoki</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">
                    Daya beli hari ini
                    <span className="block text-xs font-normal text-muted">versi tengah</span>
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">
                    Hasil investasi tahun ini
                    <span className="block text-xs font-normal text-muted">vs setoran tahun ini</span>
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">
                    Tumbuh per tahun
                    <span className="block text-xs font-normal text-muted">versi tengah</span>
                  </th>
                  {goal ? <th scope="col" className="px-3 py-3 text-right font-bold">Peluang rugi</th> : null}
                  <th scope="col" className="px-3 py-3 text-right font-bold">
                    Kata sejarah
                    <span className="block text-xs font-normal text-muted">untung per 100 titik mulai</span>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const p = past.get(r.month);
              const ms = byYear.get(r.year);
              const pr = prob(r);
              return (
                <Fragment key={r.year}>
                  <tr className={`border-b border-line ${ms ? "bg-mint-soft" : ""}`}>
                    <th scope="row" className={`${sticky} ${ms ? "bg-mint-soft" : "bg-surface"} px-3 py-3 text-left font-bold text-ink`}>
                      <span className="flex items-center gap-1.5">
                        {ms && (
                          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 text-ink">
                            <path fill="currentColor" d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" />
                          </svg>
                        )}
                        Thn {r.year}
                      </span>
                      <span className="block text-xs font-normal text-muted">
                        {r.month % 12 ? `bln ke-${r.month}` : startYear + r.year}
                        {ms && <span className="sr-only">, ada momen penting</span>}
                      </span>
                    </th>
                    <td className="px-3 py-3 text-right text-ink-2">{rupiahWords(r.deposited)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`block font-bold ${value(r) < r.deposited ? "text-loss-ink" : "text-ink"}`}>{rupiahWords(value(r))}</span>
                      <span className="block text-xs text-muted">
                        {rupiahWords(r.bawah)} – {rupiahWords(r.atas)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <RangeBar r={r} pos={pos} goal={goal} clipped={r.hoki > axisMax} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`block font-bold ${!goal && pr >= 0.2 ? "text-loss-ink" : "text-ink"}`}>{n100(pr)} dari 100</span>
                      <span className="block text-xs text-muted">{goal ? `${100 - n100(pr)} belum nyampe` : `${100 - n100(pr)} untung`}</span>
                    </td>
                    {detail && (
                      <>
                        <td className={`px-3 py-3 text-right ${r.apes < r.deposited ? "text-loss-ink" : ""}`}>{rupiahWords(r.apes)}</td>
                        <td className="px-3 py-3 text-right">{rupiahWords(r.bawah)}</td>
                        <td className="px-3 py-3 text-right font-bold">{rupiahWords(r.tengah)}</td>
                        <td className="px-3 py-3 text-right">{rupiahWords(r.atas)}</td>
                        <td className="px-3 py-3 text-right">{rupiahWords(r.hoki)}</td>
                        <td className="px-3 py-3 text-right">{rupiahWords(r.realTengah)}</td>
                        <td className="px-3 py-3 text-right">
                          <span className={`block font-bold ${r.earnedThisYear < 0 ? "text-loss-ink" : "text-ink"}`}>
                            {r.earnedThisYear >= 0 ? "+" : ""}
                            {rupiahWords(r.earnedThisYear)}
                          </span>
                          <span className="block text-xs text-muted">setor {rupiahWords(r.depositThisYear)}</span>
                        </td>
                        <td className="px-3 py-3 text-right">{percent(r.growth, 1)}</td>
                        {goal ? <td className="px-3 py-3 text-right">{n100(r.probLoss)} dari 100</td> : null}
                        <td className="px-3 py-3 text-right">
                          {p ? (
                            <>
                              <span className="block font-bold">{n100(p.pctProfit)} dari 100</span>
                              <span className="block text-xs text-muted">
                                {p.runs} titik mulai, {monthLabel(p.from)}–{monthLabel(p.to)}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted">belum ada</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                  {ms?.map((m) => (
                    <tr key={m.kind} className="border-b border-line bg-mint-soft">
                      <td colSpan={detail ? (goal ? 15 : 14) : 5} className="px-3 py-2 text-sm text-ink">
                        {/* Menempel di kiri selebar layar: tetap terbaca walau tabelnya digeser ke samping. */}
                        <div className="sticky left-3 w-[min(40rem,calc(100vw-6rem))] whitespace-normal">
                          <strong>Momen penting tahun ke-{m.year}:</strong> {m.text}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted sm:hidden">Geser tabel ke samping buat lihat kolom lainnya.</p>

      <div className="mt-5 rounded-2xl bg-page p-4 text-sm text-ink-2">
        <p>
          <strong className="text-ink">Hanya simulasi, bukan jaminan hasil.</strong> Angka-angka ini hipotetis, bukan hasil investasi nyata, dan tidak
          menjamin hasil di masa depan. Asumsi: tumbuh ±{percent(e.expectedIdr, 1)} setahun (versi tengah, dalam Rupiah), inflasi {percent(e.inflation)}{" "}
          setahun, biaya & pajak sudah dipotong
          {e.historyFrom && e.historyTo ? `, naik-turun dari data harga ${monthLabel(e.historyFrom)}–${monthLabel(e.historyTo)}` : ""}. Hasilnya bisa
          berubah kalau datanya diperbarui.{" "}
          <Link href="/metodologi" className="font-bold text-coral-ink underline underline-offset-4">
            Lihat rumus & cara ngitungnya
          </Link>
        </p>
      </div>
    </section>
  );
}

function RangeBar({ r, pos, goal, clipped }: { r: YearRow; pos: (v: number) => string; goal: number | null; clipped: boolean }) {
  return (
    <div className="relative h-7 min-w-[160px]">
      <span className="sr-only">
        Apes {rupiahWords(r.apes)}, separuh kemungkinan antara {rupiahWords(r.bawah)} dan {rupiahWords(r.atas)}, tengah {rupiahWords(r.tengah)}, hoki{" "}
        {rupiahWords(r.hoki)}. Total setoran {rupiahWords(r.deposited)}.
      </span>
      <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-page" />
      <span
        aria-hidden="true"
        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-[var(--band-outer)] ring-1 ring-[var(--band-inner)]"
        style={{ left: pos(r.apes), right: `calc(100% - ${pos(r.hoki)})` }}
      />
      <span
        aria-hidden="true"
        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-[var(--band-inner)]"
        style={{ left: pos(r.bawah), right: `calc(100% - ${pos(r.atas)})` }}
      />
      <span aria-hidden="true" title="Total setoran" className="absolute top-0 h-7 w-[2px] -translate-x-1/2 rounded bg-[var(--contrib)]" style={{ left: pos(r.deposited) }} />
      {goal ? (
        <span aria-hidden="true" title="Target" className="absolute top-0 h-7 w-[3px] -translate-x-1/2 rounded bg-[var(--target)]" style={{ left: pos(goal) }} />
      ) : null}
      <span
        aria-hidden="true"
        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--surface)] bg-[var(--median)]"
        style={{ left: pos(r.tengah) }}
      />
      {clipped && (
        <span aria-hidden="true" className="absolute -right-1 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--median)]">
          ›
        </span>
      )}
    </div>
  );
}
