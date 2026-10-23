"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatAmountInput, formatTyping, parseAmount, rupiahWords } from "@/lib/app/format";
import type { Alternatives, Mode, Projection, SearchItem } from "@/lib/app/types";
import { AlternativesView } from "./alternatives-view";
import { Icon3D } from "./icon3d";
import { InstrumentSearch } from "./instrument-search";
import { ResultView } from "./result-view";

export interface PlannerInitial {
  symbol: string | null;
  amount: number;
  years: number;
  mode: Mode;
  stepUp: number;
  goal: number | null;
}

const AMOUNT_PRESETS = [300_000, 500_000, 1_000_000, 2_000_000, 5_000_000];
const YEAR_PRESETS = [1, 3, 5, 10, 20];
const MIN_AMOUNT = 10_000;
const MAX_AMOUNT = 10_000_000_000;
const MAX_STEPUP = 20;

interface Plan {
  symbol: string;
  years: number;
  mode: Mode;
  stepUp: number;
}

type Load<T> = { state: "idle" | "loading" | "done" | "error"; data: T | null; error?: string };

export function Planner({ initial }: { initial: PlannerInitial }) {
  const uid = useId();
  const [selected, setSelected] = useState<SearchItem | null>(
    initial.symbol ? { symbol: initial.symbol, name: initial.symbol, kindLabel: "", exchangeName: "" } : null,
  );
  const [amountText, setAmountText] = useState(formatAmountInput(initial.amount));
  const [years, setYears] = useState(initial.years);
  const [yearsText, setYearsText] = useState(YEAR_PRESETS.includes(initial.years) ? "" : String(initial.years));
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [stepUpText, setStepUpText] = useState(String(Math.round(initial.stepUp * 1000) / 10).replace(".", ","));
  const [goalText, setGoalText] = useState(initial.goal ? formatAmountInput(initial.goal) : "");
  const [plan, setPlan] = useState<Plan | null>(
    initial.symbol ? { symbol: initial.symbol, years: initial.years, mode: initial.mode, stepUp: initial.stepUp } : null,
  );
  const [errors, setErrors] = useState<{ instrument?: string; amount?: string; years?: string; goal?: string; stepUp?: string }>({});
  const [proj, setProj] = useState<Load<Projection>>({ state: initial.symbol ? "loading" : "idle", data: null });
  const [alts, setAlts] = useState<Load<Alternatives>>({ state: initial.symbol ? "loading" : "idle", data: null });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const focusAfterLoad = useRef(false);
  const searchWrap = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const amount = parseAmount(amountText);
  const amountOk = amount !== null && amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
  const goal = goalText.trim() ? parseAmount(goalText) : null;
  const stepUpNum = Number(stepUpText.replace(",", ".") || "0");
  const stepUpOk = Number.isFinite(stepUpNum) && stepUpNum >= 0 && stepUpNum <= MAX_STEPUP;
  const stepUp = stepUpOk ? Math.round(stepUpNum * 10) / 1000 : 0;

  useEffect(() => {
    if (!plan) return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ symbol: plan.symbol, years: String(plan.years), mode: plan.mode, stepUp: String(plan.stepUp) });
    (async () => {
      try {
        const res = await fetch(`/api/projection?${qs}`, { signal: ctrl.signal });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Lagi gagal ngitung.");
        const data = body as Projection;
        setProj({ state: "done", data });
        setSelected((s) => (s && s.symbol === data.instrument.symbol && s.name === s.symbol ? { ...s, name: data.instrument.name } : s));
        if (focusAfterLoad.current) {
          focusAfterLoad.current = false;
          requestAnimationFrame(() => {
            headingRef.current?.focus({ preventScroll: true });
            resultsRef.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
          });
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setProj({ state: "error", data: null, error: (e as Error).message });
        setAlts({ state: "idle", data: null });
        return;
      }
      try {
        const res = await fetch(`/api/alternatives?${qs}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        setAlts({ state: "done", data: (await res.json()) as Alternatives });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setAlts({ state: "error", data: null });
      }
    })();
    return () => ctrl.abort();
  }, [plan]);

  // Alamat halaman = isian: bisa dibagikan, muat ulang nggak menghapus apa-apa.
  useEffect(() => {
    if (!plan) return;
    const qs = new URLSearchParams({ s: plan.symbol, m: String(amountOk ? amount : initial.amount), y: String(plan.years) });
    if (plan.mode !== "dasar") qs.set("mode", plan.mode);
    if (plan.stepUp) qs.set("naik", String(plan.stepUp));
    if (goal) qs.set("target", String(goal));
    window.history.replaceState(null, "", `?${qs}`);
  }, [plan, amount, amountOk, goal, initial.amount]);

  /** Ganti rencana: tandai sedang menghitung (hasil lama tetap tampil, diredupkan), lalu effect mengambil data. */
  function go(next: Plan) {
    setPlan(next);
    setProj((p) => ({ ...p, state: "loading", error: undefined }));
    setAlts((a) => ({ ...a, state: "loading" }));
  }

  // Setelah hasil pertama tampil, ganti durasi/kenaikan/instrumen langsung dihitung ulang.
  const live = proj.data !== null;
  function update(next: Partial<Plan>) {
    if (!live || !plan) return;
    go({ ...plan, ...next });
  }
  // Durasi yang diketik: tunggu sebentar sebelum hitung ulang.
  useEffect(() => {
    if (!live || !plan || !yearsText || !(years >= 1 && years <= 30) || years === plan.years) return;
    const t = setTimeout(() => go({ ...plan, years }), 600);
    return () => clearTimeout(t);
  }, [years, yearsText, live, plan]);
  // Kenaikan setoran diketik bebas: tunggu sebentar sebelum hitung ulang.
  useEffect(() => {
    if (!live || !plan || !stepUpOk || stepUp === plan.stepUp) return;
    const t = setTimeout(() => go({ ...plan, stepUp }), 500);
    return () => clearTimeout(t);
  }, [stepUp, stepUpOk, live, plan]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!selected) errs.instrument = "Pilih dulu mau nabung di mana. Ketik namanya, atau ketuk salah satu di bawah.";
    if (!amountOk) errs.amount = amount === null ? "Tulis pakai angka ya, misalnya 1.000.000 atau 1jt." : amount < MIN_AMOUNT ? "Minimal Rp10 ribu sebulan." : "Maksimal Rp10 miliar sebulan.";
    if (!(years >= 1 && years <= 30)) errs.years = "Pilih 1 sampai 30 tahun.";
    if (!stepUpOk) errs.stepUp = `Isi 0 sampai ${MAX_STEPUP}%.`;
    if (goalText.trim() && (goal === null || goal <= 0)) errs.goal = "Tulis targetnya pakai angka, misalnya 200jt.";
    setErrors(errs);
    if (errs.instrument) return searchWrap.current?.querySelector("input")?.focus();
    if (errs.amount) return amountRef.current?.focus();
    if (Object.keys(errs).length) return;
    focusAfterLoad.current = true;
    go({ symbol: selected!.symbol, years, mode, stepUp });
  }

  function pick(item: SearchItem) {
    setSelected(item);
    setErrors((x) => ({ ...x, instrument: undefined }));
    update({ symbol: item.symbol });
  }

  function chooseYears(y: number, fromText = false) {
    setYears(y);
    if (y >= 1 && y <= 30) setErrors((x) => ({ ...x, years: undefined }));
    // Chip: langsung hitung ulang. Ketikan: tunggu sampai selesai mengetik (lihat effect di atas),
    // supaya "15" tidak sempat menghitung untuk 1 tahun.
    if (!fromText) {
      setYearsText("");
      update({ years: y });
    }
  }

  function nudgeStepUp(delta: number) {
    const next = Math.min(MAX_STEPUP, Math.max(0, Math.round((stepUpOk ? stepUpNum : 0) + delta)));
    setStepUpText(String(next));
    setErrors((x) => ({ ...x, stepUp: undefined }));
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {/* Hero koral: pertanyaan + pencarian */}
        <section aria-labelledby={`${uid}-h1`} className="on-coral relative rounded-[var(--radius-card)] bg-coral p-6 text-on-coral sm:p-10">
          <Icon3D name="dadu-trio" size={250} className="absolute right-4 top-1/2 hidden -translate-y-[60%] lg:block xl:right-10" />
          <h1 id={`${uid}-h1`} className="max-w-[15ch] font-display text-[2.6rem] font-extrabold leading-[0.98] sm:text-4xl lg:text-[4.25rem]">
            Nabung rutin di sini, jadinya berapa ya?
          </h1>
          <p className="mt-4 max-w-[46ch] text-lg font-bold">Kita lempar dadu 4.000 kali buat ngintip masa depan uangmu.</p>

          <div ref={searchWrap} className="mt-7 max-w-[680px]">
            <p id={`${uid}-ins`} className="mb-2 flex items-center gap-2 font-display text-xl font-extrabold">
              <StepBadge n={1} done={!!selected} /> Mau nabung di mana?
            </p>
            <InstrumentSearch labelledBy={`${uid}-ins`} value={selected} onSelect={pick} invalid={!!errors.instrument} errorId={`${uid}-err-ins`} />
            <ErrorText id={`${uid}-err-ins`} text={errors.instrument} onColor />
          </div>
        </section>

        {/* Setoran */}
        <section aria-labelledby={`${uid}-s2`} className="rounded-[var(--radius-card)] bg-surface p-6 sm:p-8">
          <h2 id={`${uid}-s2`} className="flex items-center gap-2 font-display text-xl font-extrabold text-ink">
            <StepBadge n={2} done={amountOk} /> Sebulan berapa, berapa lama?
          </h2>

          <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div>
              <label htmlFor={`${uid}-amount`} className="font-bold text-ink">
                Setoran per bulan
              </label>
              <div className="relative mt-2">
                <span aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-display text-2xl font-extrabold text-muted">
                  Rp
                </span>
                <input
                  ref={amountRef}
                  id={`${uid}-amount`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={amountText}
                  onChange={(e) => {
                    typeMoney(e.currentTarget, setAmountText);
                    setErrors((x) => ({ ...x, amount: undefined }));
                  }}
                  onBlur={() => amountOk && setAmountText(formatAmountInput(amount!))}
                  aria-invalid={!!errors.amount || undefined}
                  aria-describedby={`${uid}-amount-hint ${errors.amount ? `${uid}-err-amount` : ""}`}
                  className={`h-16 w-full rounded-[20px] border-[3px] bg-page pl-[4.6rem] pr-4 font-display text-[1.75rem] font-extrabold text-ink tabular ${errors.amount ? "border-loss" : "border-transparent focus:border-ink"}`}
                />
              </div>
              <p id={`${uid}-amount-hint`} className="mt-1.5 text-sm text-muted">
                {amountOk ? `${rupiahWords(amount!)} sebulan.` : "Ketik angkanya aja, titiknya muncul sendiri. Bisa juga 1jt atau 1,5jt."}
              </p>
              <ErrorText id={`${uid}-err-amount`} text={errors.amount} />
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Nominal cepat">
                {AMOUNT_PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={amount === v}
                    onClick={() => {
                      setAmountText(formatAmountInput(v));
                      setErrors((x) => ({ ...x, amount: undefined }));
                    }}
                    className={chip(amount === v)}
                  >
                    {rupiahWords(v).replace("Rp", "")}
                  </button>
                ))}
              </div>
            </div>

            <fieldset>
              <legend className="font-bold text-ink">Berapa lama?</legend>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {YEAR_PRESETS.map((y) => (
                  <label key={y} className={`${chip(years === y && !yearsText)} cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-coral-ink`}>
                    <input type="radio" name={`${uid}-years`} className="sr-only" checked={years === y && !yearsText} onChange={() => chooseYears(y)} />
                    {y} tahun
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm font-bold text-ink-2">
                  atau
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Durasi lain, dalam tahun"
                    value={yearsText}
                    onChange={(e) => {
                      const t = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setYearsText(t);
                      if (t) chooseYears(Number(t), true);
                    }}
                    aria-invalid={!!errors.years || undefined}
                    aria-describedby={errors.years ? `${uid}-err-years` : undefined}
                    className="h-12 w-16 rounded-full border-2 border-line-strong bg-surface text-center text-base font-bold text-ink tabular"
                  />
                  tahun
                </label>
              </div>
              <ErrorText id={`${uid}-err-years`} text={errors.years} />
            </fieldset>
          </div>

          <div className="mt-7 grid gap-6 border-t-2 border-dashed border-line pt-6 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-up`} className="font-bold text-ink">
                Setoran naik tiap tahun <span className="font-normal text-muted">(opsional)</span>
              </label>
              <p id={`${uid}-up-hint`} className="text-sm text-muted">
                Misal ikut naik gaji. 0 = setoran tetap.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => nudgeStepUp(-1)} aria-label="Kurangi 1 persen" className={stepBtn}>
                  −
                </button>
                <div className="relative">
                  <input
                    id={`${uid}-up`}
                    type="text"
                    inputMode="decimal"
                    value={stepUpText}
                    onChange={(e) => {
                      setStepUpText(e.target.value.replace(/[^\d.,]/g, "").slice(0, 4));
                      setErrors((x) => ({ ...x, stepUp: undefined }));
                    }}
                    aria-describedby={`${uid}-up-hint ${!stepUpOk ? `${uid}-err-up` : ""}`}
                    aria-invalid={!stepUpOk || undefined}
                    className={`h-12 w-24 rounded-full border-2 bg-surface pr-8 text-center text-lg font-extrabold text-ink tabular ${stepUpOk ? "border-line-strong" : "border-loss"}`}
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-bold text-ink-2">
                    %
                  </span>
                </div>
                <button type="button" onClick={() => nudgeStepUp(1)} aria-label="Tambah 1 persen" className={stepBtn}>
                  +
                </button>
                {[5, 10].map((v) => (
                  <button key={v} type="button" onClick={() => setStepUpText(String(v))} aria-pressed={stepUpNum === v} className={chip(stepUpNum === v)}>
                    {v}%
                  </button>
                ))}
              </div>
              <ErrorText id={`${uid}-err-up`} text={errors.stepUp ?? (!stepUpOk ? `Isi 0 sampai ${MAX_STEPUP}%.` : undefined)} />
            </div>
            <div>
              <label htmlFor={`${uid}-goal`} className="font-bold text-ink">
                Punya target? <span className="font-normal text-muted">(opsional)</span>
              </label>
              <p id={`${uid}-goal-hint`} className="text-sm text-muted">
                Misal DP rumah. Nanti kita hitung peluang nyampenya.
              </p>
              <div className="relative mt-2">
                <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-ink-2">
                  Rp
                </span>
                <input
                  id={`${uid}-goal`}
                  type="text"
                  inputMode="numeric"
                  placeholder="200.000.000"
                  value={goalText}
                  onChange={(e) => {
                    typeMoney(e.currentTarget, setGoalText);
                    setErrors((x) => ({ ...x, goal: undefined }));
                  }}
                  onBlur={() => goal && setGoalText(formatAmountInput(goal))}
                  aria-describedby={`${uid}-goal-hint ${errors.goal ? `${uid}-err-goal` : ""}`}
                  aria-invalid={!!errors.goal || undefined}
                  className="h-12 w-full rounded-full border-2 border-line-strong bg-surface pl-12 pr-4 text-lg font-bold text-ink tabular placeholder:font-normal placeholder:text-muted"
                />
              </div>
              <ErrorText id={`${uid}-err-goal`} text={errors.goal} />
            </div>
          </div>

          <button type="submit" className="mt-8 flex min-h-16 w-full items-center justify-center gap-3 rounded-full bg-coral px-6 text-[1.2rem] font-extrabold text-on-coral hover:brightness-105 active:scale-[0.99] sm:w-auto sm:px-10">
            <Icon3D name="dadu" size={36} />
            {live ? "Lempar ulang" : "Lempar dadunya"}
          </button>
        </section>
      </form>

      <section ref={resultsRef} aria-label="Hasil" className="scroll-mt-4">
        <p role="status" className="sr-only">
          {proj.state === "loading" ? "Lagi lempar dadu 4.000 kali…" : proj.state === "done" ? "Hasilnya udah keluar." : ""}
        </p>

        {proj.state === "error" && (
          <div role="alert" className="mb-5 flex items-start gap-4 rounded-[var(--radius-card)] bg-coral-soft p-6">
            <Icon3D name="awan" size={56} />
            <div>
              <p className="font-display text-lg font-extrabold text-ink">Waduh, belum bisa dihitung</p>
              <p className="mt-1 text-ink-2">{proj.error}</p>
              <p className="mt-1 text-sm text-muted">Coba pilih yang lain, atau ketuk salah satu yang populer di atas.</p>
            </div>
          </div>
        )}

        {proj.data && amountOk ? (
          <>
            <ResultView
              data={proj.data}
              amount={amount!}
              onAmount={(v) => setAmountText(formatAmountInput(v))}
              goal={goal}
              mode={plan?.mode ?? mode}
              onMode={(m) => {
                setMode(m);
                if (plan) go({ ...plan, mode: m });
              }}
              busy={proj.state === "loading"}
              headingRef={headingRef}
            />
            <AlternativesView
              data={alts.data}
              state={alts.state === "idle" ? "loading" : alts.state}
              current={{ name: proj.data.instrument.name, kind: proj.data.instrument.kind, symbol: proj.data.instrument.symbol, outcome: proj.data.outcome }}
              amount={amount!}
              onPick={(symbol, name) => {
                pick({ symbol, name, kindLabel: "", exchangeName: "" });
                focusAfterLoad.current = true;
                if (plan) go({ ...plan, symbol });
              }}
            />
          </>
        ) : proj.state === "loading" && !proj.data ? (
          <Waiting />
        ) : proj.data ? null : (
          <HowItWorks />
        )}
      </section>
    </div>
  );
}

function HowItWorks() {
  const steps: { icon: "saham" | "celengan" | "dadu"; title: string; text: string }[] = [
    { icon: "saham", title: "Pilih tempat nabung", text: "Saham, kripto, emas, reksa dana, apa aja." },
    { icon: "celengan", title: "Isi setoran", text: "Berapa sebulan, berapa lama." },
    { icon: "dadu", title: "Lempar dadu", text: "Kita simulasiin 4.000 masa depan. Kamu lihat yang paling mungkin, yang apes, dan yang hoki." },
  ];
  return (
    <ol className="grid gap-4 sm:grid-cols-3" aria-label="Cara kerjanya">
      {steps.map((s, i) => (
        <li key={s.title} className="flex items-start gap-3 rounded-[var(--radius-card)] bg-surface p-5">
          <Icon3D name={s.icon} size={56} />
          <div>
            <p className="font-display text-lg font-extrabold text-ink">
              <span className="sr-only">Langkah {i + 1}: </span>
              {s.title}
            </p>
            <p className="text-ink-2">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Waiting() {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-card)] bg-night p-8 text-on-night">
      <span className="roll inline-block">
        <Icon3D name="dadu" size={64} />
      </span>
      <p className="font-display text-xl font-extrabold">Lagi lempar dadu 4.000 kali…</p>
    </div>
  );
}

function StepBadge({ n, done }: { n: number; done: boolean }) {
  return (
    <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-base font-extrabold ${done ? "bg-selected text-on-selected" : "bg-page text-ink"}`}>
      {done ? (
        <svg width="16" height="16" viewBox="0 0 14 14">
          <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        n
      )}
    </span>
  );
}

function ErrorText({ id, text, onColor }: { id: string; text?: string; onColor?: boolean }) {
  return (
    <p id={id} className={`mt-2 text-sm font-bold ${onColor ? "rounded-xl bg-surface px-3 py-2 text-loss-ink" : "text-loss-ink"}`} hidden={!text}>
      {text}
    </p>
  );
}

/** Titik ribuan muncul saat mengetik; kursor dikembalikan ke posisi yang sama di antara angka. */
function typeMoney(el: HTMLInputElement, set: (v: string) => void) {
  const { text, caret } = formatTyping(el.value, el.selectionStart ?? el.value.length);
  set(text);
  requestAnimationFrame(() => {
    if (document.activeElement === el) el.setSelectionRange(caret, caret);
  });
}

const stepBtn = "grid h-12 w-12 place-items-center rounded-full bg-page text-2xl font-extrabold text-ink hover:bg-line active:scale-95";

function chip(active: boolean) {
  return `inline-flex min-h-12 items-center rounded-full px-4 text-sm font-bold active:scale-95 ${active ? "bg-selected text-on-selected" : "bg-page text-ink hover:bg-line"}`;
}
