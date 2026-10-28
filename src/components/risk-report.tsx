"use client";

import Link from "next/link";
import { Fragment, useId, useState } from "react";
import { decimal, monthLabel, percent } from "@/lib/app/format";
import type { Projection, Rapor } from "@/lib/app/types";
import { stabilityBand } from "@/lib/sim/risk";
import { Icon3D } from "./icon3d";

interface Row {
  label: string;
  more: string;
  value: (r: Rapor) => string;
}

const n100 = (x: number) => `${Math.round(x * 100)} dari 100`;
/** Rasio per gejolak tidak bermakna untuk instrumen yang hampir tidak naik-turun. */
const ratio = (x: number | null, r: Rapor) => (x === null || r.risk.vol < 0.02 ? "—" : decimal(x));

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "Seberapa sering berhasil?",
    rows: [
      {
        label: "Berakhir untung",
        more: "Pas dicairin di akhir, uangnya lebih gede dari total setoran.",
        value: (r) => n100(r.pctProfit),
      },
      {
        label: "Ngalahin kenaikan harga",
        more: "Untung belum tentu nambah daya beli. Ini yang tumbuhnya lebih cepat dari inflasi.",
        value: (r) => (r.pctBeatInflation === null ? "—" : n100(r.pctBeatInflation)),
      },
      {
        label: "Tumbuh per tahun",
        more: "Versi tengah, udah ngitung kapan tiap setoran masuk.",
        value: (r) => percent(r.growth, 1),
      },
      {
        label: "Tumbuh di atas inflasi",
        more: "Tumbuh per tahun setelah dikurangi kenaikan harga-harga.",
        value: (r) => (r.realGrowth === null ? "—" : percent(r.realGrowth, 1)),
      },
      {
        label: "Jarak hasil bagus–jelek",
        more: "Separuh hasil yang di tengah tersebar selebar ini (poin persen tumbuh per tahun). Makin sempit, makin bisa ditebak.",
        value: (r) => `${decimal(r.iqrGrowth * 100, 1)} poin`,
      },
    ],
  },
  {
    title: "Seberapa sakit jatuhnya?",
    rows: [
      {
        label: "Jatuh terdalam",
        more: "Turun paling dalam dari titik tertinggi, di tengah jalan.",
        value: (r) => percent(r.risk.mdd),
      },
      {
        label: "Paling lama nunggu pulih",
        more: "Dari puncak, jatuh, sampai tembus puncak lagi. Diambil yang paling lama.",
        value: (r) => `${Math.round(r.risk.recovery)} bulan`,
      },
      {
        label: "Bulan di bawah puncak",
        more: "Dari 100 bulan, segini yang nilainya lagi di bawah rekor tertingginya. Wajar kalau besar, yang penting tetap nabung.",
        value: (r) => n100(r.risk.underwater),
      },
      {
        label: "Paling jauh di bawah setoran",
        more: "Titik terburuk nilai tabungan dibanding total yang udah kamu setor saat itu.",
        value: (r) => (r.worstVsContrib > -0.005 ? "nggak pernah" : percent(r.worstVsContrib)),
      },
      {
        label: "Bulan apes",
        more: "Di 1 dari 20 bulan, nilainya turun segini atau lebih dalam sebulan.",
        value: (r) => percent(r.risk.var95, 1),
      },
      {
        label: "Rata-rata bulan apes",
        more: "Kalau lagi kena bulan apes itu, rata-rata turunnya segini.",
        value: (r) => percent(r.risk.cvar95, 1),
      },
      {
        label: "Naik-turun setahun",
        more: "Seberapa liar geraknya dalam setahun. Deposito hampir 0, saham besar ±15–25%, kripto bisa ±50% lebih.",
        value: (r) => `±${percent(r.risk.vol)}`,
      },
    ],
  },
  {
    title: "Sepadan sama deg-degannya?",
    rows: [
      {
        label: "Untung per goyangan",
        more: "Kelebihan tumbuh di atas deposito, dibagi naik-turunnya. Di atas 0,5 lumayan, di atas 1 bagus banget.",
        value: (r) => ratio(r.risk.sharpe, r),
      },
      {
        label: "Untung per goyangan turun",
        more: "Sama, tapi cuma goyangan ke bawah yang dihitung. Naik tinggi nggak dianggap risiko.",
        value: (r) => ratio(r.risk.sortino, r),
      },
      {
        label: "Untung per jatuh terdalam",
        more: "Tumbuh per tahun dibagi jatuh terdalam. Makin gede, makin sepadan.",
        value: (r) => ratio(r.risk.calmar, r),
      },
    ],
  },
];

const BAND_TONE: Record<ReturnType<typeof stabilityBand>, string> = {
  "sangat stabil": "bg-[var(--target)]",
  "cukup stabil": "bg-[var(--gain)]",
  "naik-turun": "bg-butter",
  liar: "bg-coral",
};

/**
 * Rapor risiko: metrik seandainya.vercel.app (rumus sama, lihat src/lib/sim/risk.ts), sejarah dan
 * proyeksi berdampingan. Nama metrik dalam bahasa sehari-hari; istilah teknisnya di /metodologi.
 */
export function RiskReport({ data }: { data: Projection }) {
  const uid = useId();
  const [explain, setExplain] = useState(false);
  const { past, future } = data.rapor;
  const runs = data.pastRuns;
  const cols: { key: string; label: string; sub: string; r: Rapor }[] = [
    ...(past
      ? [{ key: "past", label: "Masa lalu", sub: `${past.n} kali mulai, ${monthLabel(runs[0].start)}–${monthLabel(runs[runs.length - 1].start)}`, r: past }]
      : []),
    { key: "future", label: "Ke depan", sub: `${future.n.toLocaleString("id-ID")} masa depan`, r: future },
  ];

  const note =
    past && past.score - future.score >= 10
      ? "Sejarahnya kelihatan lebih mulus dari perkiraan ke depan. Wajar: kita sengaja nggak berasumsi masa lalu yang bagus bakal terulang."
      : past && future.score - past.score >= 10
        ? "Ke depan kelihatan lebih tenang dari sejarahnya, karena kita pakai perkiraan para ahli, bukan masa lalu yang lagi jelek."
        : past
          ? "Sejarah dan perkiraan ke depan kurang lebih sejalan."
          : "Belum ada sejarah harga pasar buat dibandingin, jadi yang ada cuma perkiraan ke depan.";

  return (
    <section aria-labelledby={`${uid}-h`} className="rounded-[var(--radius-card)] bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[56ch]">
          <h2 id={`${uid}-h`} className="font-display text-xl font-extrabold text-ink sm:text-2xl">
            Rapor risiko
          </h2>
          <p className="mt-1 text-ink-2">
            Seberapa stabil, seberapa sakit jatuhnya, dan sepadan nggak. Masa lalu dan ke depan dihitung pakai rumus yang sama.
          </p>
        </div>
        <Icon3D name="kilat" size={64} className="hidden sm:block" />
      </div>

      <div className={`mt-5 grid gap-3 ${past ? "sm:grid-cols-2" : ""}`}>
        {cols.map((c) => (
          <ScoreCard key={c.key} label={c.label} sub={c.sub} score={c.r.score} />
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-2">{note}</p>
      <details className="mt-1">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-bold text-ink-2 underline decoration-dotted underline-offset-4">
          Skornya dari mana?
        </summary>
        <p className="max-w-[66ch] pb-1 text-sm text-ink-2">
          Gabungan empat hal: seberapa sering untung (35%), seberapa sering ngalahin inflasi (25%), seberapa rapat hasilnya (20%), dan seberapa tahan
          pas jatuh (20%). 75 ke atas sangat stabil, 55 cukup stabil, 35 naik-turun, di bawahnya liar. Rumusnya ngikutin seandainya.vercel.app buatan
          Rio, biar angkanya bisa dibandingin.
        </p>
      </details>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          “Sepadan” dibanding deposito: {past ? `masa lalu ${percent(past.riskFree)}, ` : ""}ke depan {percent(future.riskFree, 1)} setahun.
        </p>
        <button
          type="button"
          aria-pressed={explain}
          onClick={() => setExplain((x) => !x)}
          className="inline-flex min-h-11 items-center rounded-full bg-page px-4 text-sm font-bold text-ink hover:bg-line"
        >
          {explain ? "Sembunyikan penjelasan" : "Jelasin tiap baris"}
        </button>
      </div>

      <div role="region" aria-labelledby={`${uid}-cap`} tabIndex={0} className="mt-3 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full border-collapse text-sm tabular">
          <caption id={`${uid}-cap`} className="sr-only">
            Rapor risiko {data.instrument.name}, nabung {data.plan.years} tahun{past ? ": masa lalu dibanding ke depan" : ""}.
          </caption>
          <thead>
            <tr className="border-b border-line text-left align-bottom text-ink-2">
              <th scope="col" className="px-2 py-3 sm:px-3 font-bold">
                Yang diukur
              </th>
              {cols.map((c) => (
                <th key={c.key} scope="col" className="px-2 py-3 sm:px-3 text-right font-bold">
                  {c.label}
                  <span className="block text-xs font-normal text-muted">{c.sub}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <Fragment key={g.title}>
                <tr className="bg-page">
                  <th scope="colgroup" colSpan={cols.length + 1} className="px-2 py-2 text-left font-display sm:px-3 text-base font-extrabold text-ink">
                    {g.title}
                  </th>
                </tr>
                {g.rows.map((row) => (
                  <tr key={row.label} className="border-b border-line align-top">
                    <th scope="row" className="px-2 py-2.5 sm:px-3 text-left font-bold text-ink">
                      {row.label}
                      {explain && <span className="mt-0.5 block max-w-[34ch] text-xs font-normal text-ink-2">{row.more}</span>}
                    </th>
                    {cols.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-2 py-2.5 sm:px-3 text-right text-ink">
                        {row.value(c.r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-muted">
        {past && (
          <>
            Masa lalu: nabung {data.plan.years} tahun dari tiap bulan mulai yang pernah ada, dengan biaya & pajak yang sama.
            {data.explain.cpi
              ? ` Inflasi dari data harga konsumen sampai ${monthLabel(data.explain.cpi.measuredTo)}${
                  data.explain.cpi.filledTo ? `, lalu inflasi tahunan Bank Dunia sampai ${monthLabel(data.explain.cpi.filledTo)}` : ""
                }, sesudahnya dianggap ${percent(data.explain.inflation)} setahun.`
              : ""}{" "}
          </>
        )}
        Angka ke depan adalah nilai tengah dari semua masa depan, dengan inflasi {percent(data.explain.inflation)} setahun.{" "}
        <Link href="/metodologi#rapor" className="font-bold text-coral-ink underline underline-offset-4">
          Rumus lengkapnya
        </Link>
      </p>
    </section>
  );
}

function ScoreCard({ label, sub, score }: { label: string; sub: string; score: number }) {
  const band = stabilityBand(score);
  return (
    <div className="rounded-[20px] bg-page p-4">
      <p className="text-sm font-bold text-ink-2">
        Skor stabilitas · {label}
        <span className="block text-xs font-normal text-muted">{sub}</span>
      </p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-4xl font-extrabold text-ink">{score}</span>
        <span className="text-ink-2">dari 100</span>
        <span className="ml-auto rounded-full bg-surface px-3 py-1 text-sm font-bold text-ink">{band}</span>
      </p>
      <div aria-hidden="true" className="relative mt-3 h-2.5 rounded-full bg-line">
        <span className={`absolute inset-y-0 left-0 rounded-full ${BAND_TONE[band]}`} style={{ width: `${score}%` }} />
        {[35, 55, 75].map((t) => (
          <span key={t} className="absolute -top-1 h-[18px] w-[2px] rounded bg-[var(--contrib)] opacity-60" style={{ left: `${t}%` }} />
        ))}
      </div>
    </div>
  );
}
