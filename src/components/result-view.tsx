"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { dateLabel, monthLabel, percent, price, rupiahWords } from "@/lib/app/format";
import type { Mode, Projection } from "@/lib/app/types";
import { FanChart } from "./fan-chart";
import { FuturesLab } from "./futures-lab";
import { Icon3D, type Icon3DName } from "./icon3d";
import { YearTable } from "./year-table";

export const MODE_OPTIONS: { value: Mode; label: string; hint: string }[] = [
  { value: "dasar", label: "Normal", hint: "Pakai perkiraan para ahli." },
  { value: "konservatif", label: "Pas seret", hint: "Kalau pasar lagi ngecewain. Paling aman buat bikin rencana." },
  { value: "historis", label: "Kayak dulu", hint: "Kalau masa lalu keulang persis. Biasanya kebagusan." },
];

/** Titik-titik slider setoran (Rp). */
const STOPS = [100_000, 200_000, 300_000, 500_000, 750_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000, 7_500_000, 10_000_000, 15_000_000, 20_000_000, 50_000_000];

interface Props {
  data: Projection;
  amount: number;
  onAmount: (v: number) => void;
  goal: number | null;
  mode: Mode;
  onMode: (m: Mode) => void;
  busy: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}

export function ResultView({ data, amount, onAmount, goal, mode, onMode, busy, headingRef }: Props) {
  const uid = useId();
  const o = data.outcome;
  const k = amount;
  const e = data.explain;
  const years = data.plan.years;
  const contributed = o.contributed * k;
  const median = o.final.p50 * k;
  const gain = median - contributed;
  const loss = data.samples.filter((s) => s.final * k < contributed).length;
  const goalHit = goal ? data.samples.filter((s) => s.final * k >= goal).length : 0;
  // Proyeksi baru → kembali ke masa depan yang paling tengah.
  const [selected, setSelected] = useState(49);
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setSelected(49);
  }

  const stopIndex = STOPS.reduce((best, v, i) => (Math.abs(v - amount) < Math.abs(STOPS[best] - amount) ? i : best), 0);

  return (
    <div className={`dim-transition flex flex-col gap-5 ${busy ? "opacity-50" : ""}`} aria-busy={busy}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-ink-2">
          <strong className="text-ink">{data.instrument.name}</strong>, {rupiahWords(amount)} sebulan, {years} tahun
          {data.plan.stepUp ? `, naik ${percent(data.plan.stepUp, 1)} tiap tahun` : ""}.
        </p>
        <fieldset>
          <legend className="sr-only">Versi hitungan</legend>
          <div className="inline-flex rounded-full bg-surface p-1">
            {MODE_OPTIONS.map((m) => (
              <label
                key={m.value}
                className={`relative inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-coral-ink ${
                  mode === m.value ? "bg-selected text-on-selected" : "text-ink hover:bg-page"
                }`}
              >
                <input type="radio" name={`${uid}-mode`} value={m.value} checked={mode === m.value} onChange={() => onMode(m.value)} className="sr-only" />
                {m.label}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-right text-sm text-muted">{MODE_OPTIONS.find((m) => m.value === mode)?.hint}</p>
        </fieldset>
      </div>

      {/* Hasil utama */}
      <section aria-labelledby="hasil-judul" className="on-dark relative overflow-hidden rounded-[var(--radius-card)] bg-night p-6 text-on-night sm:p-9">
        <Icon3D name="dadu-trio" size={120} className="absolute -right-6 -top-3 hidden opacity-95 sm:block" />
        <h2 ref={headingRef} tabIndex={-1} id="hasil-judul" className="outline-none">
          <span className="block text-lg font-bold text-on-night-2">Kemungkinan besar jadi</span>
          <span className="mt-1 block font-display text-[2.75rem] font-extrabold leading-none sm:text-4xl">{rupiahWords(median)}</span>
        </h2>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-on-night-2">
          dari {rupiahWords(contributed)} yang kamu setor
          <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${gain >= 0 ? "bg-butter text-night" : "bg-coral text-on-coral"}`}>
            {gain >= 0 ? "+" : "−"}
            {rupiahWords(Math.abs(gain))}
          </span>
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] bg-night-raise p-4">
            <dt className="flex items-center gap-2 text-sm font-bold text-on-night-2">
              <Icon3D name="awan" size={28} /> Kalau lagi apes
            </dt>
            <dd className="mt-1 font-display text-xl font-extrabold">{rupiahWords(o.final.p5 * k)}</dd>
          </div>
          <div className="rounded-[20px] bg-night-raise p-4">
            <dt className="flex items-center gap-2 text-sm font-bold text-on-night-2">
              <Icon3D name="tunas" size={28} /> Kalau lagi hoki
            </dt>
            <dd className="mt-1 font-display text-xl font-extrabold">{rupiahWords(o.final.p95 * k)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-on-night-2">Apes = 5 dari 100 masa depan terburuk. Hoki = 5 dari 100 terbaik.</p>

        <div className="mt-6">
          <label htmlFor={`${uid}-slider`} className="flex items-baseline justify-between gap-3 font-bold">
            <span>Geser setoranmu</span>
            <span className="font-display text-lg text-butter">{rupiahWords(amount)}/bulan</span>
          </label>
          <input
            id={`${uid}-slider`}
            type="range"
            min={0}
            max={STOPS.length - 1}
            step={1}
            value={stopIndex}
            aria-valuetext={`${rupiahWords(STOPS[stopIndex])} per bulan`}
            onChange={(ev) => onAmount(STOPS[Number(ev.target.value)])}
            className="slider mt-3 w-full"
            style={{ ["--fill" as string]: `${(stopIndex / (STOPS.length - 1)) * 100}%` }}
          />
          <p className="mt-2 text-sm text-on-night-2">Angkanya langsung berubah. Nggak perlu hitung ulang.</p>
        </div>

        <p className="mt-6 border-t border-white/15 pt-4 text-sm text-on-night-2">
          Kalau diukur pakai harga hari ini, itu setara {rupiahWords(o.finalReal.p50 * k)}, soalnya harga-harga naik ±{percent(e.inflation)} setahun.
        </p>
      </section>

      <FuturesLab
        samples={data.samples}
        contributedPath={data.contributedPath}
        amount={amount}
        goal={goal}
        kind={data.instrument.kind}
        currency={data.instrument.currency}
        buyFee={e.buyFee}
        years={years}
        selected={selected}
        onSelect={setSelected}
      />

      <section aria-label="Angka penting" className="grid gap-4 sm:grid-cols-2">
        <Fact icon="awan" tone="bg-coral-soft" term="Peluang rugi" value={`${loss} dari 100`} more="Rugi artinya pas dicairin di akhir, uangnya lebih kecil dari total yang kamu setor.">
          Dari 100 orang yang nabung persis kayak kamu, {loss} orang uangnya malah berkurang.
        </Fact>
        <Fact
          icon="kilat"
          tone="bg-butter-soft"
          term="Siap-siap turun"
          value={percent(o.maxDrawdown.p50)}
          more={`Kayak naik roller coaster, pasti ada turunannya. Kalau lagi apes, bisa sampai ${percent(o.maxDrawdown.p5)}. Yang penting jangan panik jual.`}
        >
          Di tengah jalan, nilainya biasanya pernah anjlok segini dari titik tertingginya.
        </Fact>
        <Fact
          icon="celengan"
          tone="bg-sky-soft"
          term="Menang dari deposito"
          value={`${Math.round(o.probBeatDeposit * 100)} dari 100`}
          more={`Deposito kita anggap ngasih ${percent(e.depositRate, 1)} setahun setelah pajak.`}
        >
          Segini kemungkinan hasilnya lebih gede daripada ditaruh di deposito.
        </Fact>
        <Fact
          icon="tunas"
          tone="bg-mint-soft"
          term="Tumbuh per tahun"
          value={percent(o.xirr.p50, 1)}
          more="Mirip bunga, tapi nggak pasti: ada tahun naik banyak, ada tahun turun. Ini rata-ratanya, udah ngitung kapan tiap setoran masuk."
        >
          Kira-kira segini uangmu tumbuh tiap tahun (versi tengah-tengah).
        </Fact>
      </section>

      {goal ? (
        <section aria-labelledby={`${uid}-target`} className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-mint-soft p-6 sm:flex-row sm:items-center">
          <Icon3D name="bendera" size={72} />
          <div className="flex-1">
            <h3 id={`${uid}-target`} className="font-display text-xl font-extrabold text-ink">
              Target {rupiahWords(goal)}: {goalHit} dari 100 masa depan nyampe
            </h3>
            <p className="mt-1 text-ink-2">
              Biar 8 dari 10 nyampe, setor ±<strong className="text-ink">{rupiahWords(goal / o.finalQuantiles[20])}</strong> sebulan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAmount(Math.ceil(goal / o.finalQuantiles[20] / 10_000) * 10_000)}
            className="min-h-12 rounded-full bg-night px-5 font-bold text-on-night hover:bg-night-raise"
          >
            Pakai angka ini
          </button>
        </section>
      ) : null}

      <section aria-label="Grafik perjalanan" className="rounded-[var(--radius-card)] bg-surface p-5 sm:p-7">
        <FanChart
          fan={data.fan}
          contributed={data.contributedPath}
          amount={amount}
          title="Perjalanan uangmu"
          pick={{ path: data.samples[selected].path, label: `Masa depan #${selected + 1}` }}
        />
      </section>

      <YearTable data={data} amount={amount} goal={goal} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby={`${uid}-why`} className="rounded-[var(--radius-card)] bg-surface p-6">
          <h3 id={`${uid}-why`} className="font-display text-xl font-extrabold text-ink">
            Kenapa angkanya segini?
          </h3>
          <ol className="mt-4 flex flex-col gap-4">
            <Step n={1} title="Lihat sejarahnya">
              {e.historyFrom && e.historyTo
                ? `Harga ${data.instrument.name} dari ${monthLabel(e.historyFrom)} sampai ${monthLabel(e.historyTo)} (${Math.floor(e.historyYears)} tahun).`
                : "Nggak ada harga pasarnya, jadi kita hitung dari suku bunga."}
            </Step>
            <Step n={2} title={`Pakai perkiraan ${percent(e.expectedIdr, 1)} setahun`}>
              {e.why}
              {e.past && mode !== "historis" ? ` (Dulu ${percent(e.past.median, 1)} setahun, kebagusan buat patokan.)` : ""}
            </Step>
            <Step n={3} title="Kocok kayak kartu">
              Naik-turunnya diambil dari sejarah asli, dipotong-potong, terus diacak jadi 4.000 masa depan. Krisis yang pernah terjadi ikut kebawa.
            </Step>
            <Step n={4} title="Potong biaya & pajak">
              {e.costs}
            </Step>
          </ol>
          <p className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full px-3 py-1 font-bold ${e.reliability === "rendah" ? "bg-coral-soft text-coral-ink" : "bg-page text-ink"}`}>
              Keandalan: {e.reliability === "model" ? "hitungan bunga" : e.reliability}
            </span>
            {e.reliability === "rendah" && <span className="text-muted">Datanya masih pendek, jadi hasilnya lebih untung-untungan.</span>}
          </p>
          <p className="mt-4">
            <Link href="/metodologi" className="font-bold text-coral-ink underline underline-offset-4">
              Cara ngitung lengkap + bukti ketepatannya
            </Link>
          </p>
        </section>

        <div className="flex flex-col gap-5">
          {data.latest && (
            <section aria-labelledby={`${uid}-new`} className="rounded-[var(--radius-card)] bg-surface p-6">
              <h3 id={`${uid}-new`} className="font-display text-xl font-extrabold text-ink">
                Kabar terbaru
              </h3>
              <p className="mt-2 text-ink-2">
                Harga terakhir <strong className="text-ink">{price(data.latest.price, data.latest.currency)}</strong> ({dateLabel(data.latest.date)}).
                {data.latest.change1y != null && <> Setahun terakhir {data.latest.change1y >= 0 ? "naik" : "turun"} {percent(Math.abs(data.latest.change1y))}.</>}{" "}
                {data.latest.fromAllTimeHigh < -0.01 ? <>Sekarang {percent(-data.latest.fromAllTimeHigh)} di bawah puncaknya.</> : <>Lagi dekat puncaknya.</>}
              </p>
              {data.latest.fromAllTimeHigh <= -0.3 && (
                <p className="mt-2 text-sm text-muted">Lagi jauh di bawah puncak. Bisa jadi lagi murah, bisa juga lagi ada masalah. Hitungan ini nggak nebak arahnya.</p>
              )}
            </section>
          )}
          {e.warnings.length > 0 && (
            <section aria-labelledby={`${uid}-warn`} className="rounded-[var(--radius-card)] bg-warn-bg p-6 text-warn-ink">
              <h3 id={`${uid}-warn`} className="flex items-center gap-2 font-display text-lg font-extrabold">
                <Icon3D name="kilat" size={32} /> Perlu kamu tahu
              </h3>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
                {e.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ icon, tone, term, value, more, children }: { icon: Icon3DName; tone: string; term: string; value: string; more: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-[var(--radius-card)] ${tone} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-2">{term}</p>
          <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
        </div>
        <Icon3D name={icon} size={56} className="-mr-1 -mt-1" />
      </div>
      <p className="mt-2 text-ink">{children}</p>
      <details className="group mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-bold text-ink-2 underline decoration-dotted underline-offset-4">
          Maksudnya?
        </summary>
        <p className="pb-1 text-sm text-ink-2">{more}</p>
      </details>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-coral font-display font-extrabold text-on-coral">
        {n}
      </span>
      <div>
        <p className="font-bold text-ink">{title}</p>
        <p className="text-ink-2">{children}</p>
      </div>
    </li>
  );
}
