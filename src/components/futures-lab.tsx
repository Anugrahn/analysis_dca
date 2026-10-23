"use client";

import { useId, useMemo, useRef, useState } from "react";
import { rupiahShort, rupiahWords } from "@/lib/app/format";
import { storyOf, type Sample } from "@/lib/app/story";
import { Icon3D } from "./icon3d";

export type Fate = "rugi" | "untung" | "target";

export function fateOf(v: number, contributed: number, goal: number | null): Fate {
  if (v < contributed) return "rugi";
  if (goal && v >= goal) return "target";
  return "untung";
}

interface Props {
  samples: Sample[];
  contributedPath: number[];
  amount: number;
  goal: number | null;
  kind: string;
  currency: string;
  buyFee: number;
  years: number;
  selected: number;
  onSelect: (i: number) => void;
}

const MEDIAN = 49;

/**
 * 100 masa depan yang bisa diketuk. Format frekuensi ("12 dari 100") lebih gampang dipahami daripada
 * persen (Gigerenzer & Hoffrage 1995). Bentuk beda per nasib, jadi nggak cuma mengandalkan warna.
 */
export function FuturesLab({ samples, contributedPath, amount, goal, kind, currency, buyFee, years, selected, onSelect }: Props) {
  const id = useId();
  const contributed = contributedPath[contributedPath.length - 1] * amount;
  const fates = samples.map((s) => fateOf(s.final * amount, contributed, goal));
  const count = (f: Fate) => fates.filter((x) => x === f).length;
  const [rolls, setRolls] = useState(0);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);

  const story = useMemo(
    () => storyOf(samples[selected], contributedPath, amount, { kind, currency, goal, buyFee }),
    [samples, selected, contributedPath, amount, kind, currency, goal, buyFee],
  );

  function roll() {
    let next = selected;
    while (next === selected) next = Math.floor(Math.random() * samples.length);
    setRolls((r) => r + 1);
    onSelect(next);
  }

  function onKey(e: React.KeyboardEvent, i: number) {
    const map: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10 };
    let next = i;
    if (e.key in map) next = Math.min(99, Math.max(0, i + map[e.key]));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 99;
    else return;
    e.preventDefault();
    onSelect(next);
    btns.current[next]?.focus();
  }

  const icon = story.fate === "rugi" ? "awan" : story.fate === "target" ? "bendera" : "tunas";
  const tone = story.fate === "rugi" ? "bg-coral-soft" : story.fate === "target" ? "bg-mint-soft" : "bg-sky-soft";

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-[var(--radius-card)] bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[46ch]">
          <h2 id={`${id}-h`} className="font-display text-xl font-extrabold text-ink sm:text-2xl">
            100 masa depan kamu
          </h2>
          <p className="mt-1 text-ink-2">
            Kita lempar dadu 4.000 kali, ini 100 contohnya. Urut dari paling apes (kiri atas) sampai paling hoki (kanan bawah).
            Ketuk satu buat lihat ceritanya.
          </p>
        </div>
        <button
          type="button"
          onClick={roll}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-night py-1.5 pl-2 pr-5 font-bold text-on-night hover:bg-night-raise active:scale-95"
        >
          <span key={rolls} className={rolls ? "roll inline-block" : "inline-block"}>
            <Icon3D name="dadu" size={34} />
          </span>
          Lempar dadu
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-8">
        <div>
          <div role="radiogroup" aria-label={`100 masa depan. ${count("rugi")} rugi, ${count("untung") + count("target")} untung.`} className="grid w-fit grid-cols-10 gap-[3px]">
            {samples.map((s, i) => {
              const f = fates[i];
              const on = i === selected;
              return (
                <button
                  key={i}
                  ref={(el) => {
                    btns.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  aria-label={`Masa depan ${i + 1}: ${rupiahWords(s.final * amount)}, ${f === "rugi" ? "rugi" : f === "target" ? "capai target" : "untung"}`}
                  onClick={() => onSelect(i)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={`grid h-[30px] w-[30px] place-items-center rounded-full transition-transform ${on ? "scale-125 bg-night/10 ring-[3px] ring-ink" : "hover:scale-110"}`}
                >
                  <Dot fate={f} />
                </button>
              );
            })}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
            <li className="flex items-center gap-2">
              <Dot fate="rugi" />
              <span>
                <strong className="text-ink">{count("rugi")}</strong> rugi
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Dot fate="untung" />
              <span>
                <strong className="text-ink">{count("untung")}</strong> untung
              </span>
            </li>
            {goal ? (
              <li className="flex items-center gap-2">
                <Dot fate="target" />
                <span>
                  <strong className="text-ink">{count("target")}</strong> capai target
                </span>
              </li>
            ) : null}
          </ul>
        </div>

        <div aria-live="polite" aria-atomic="true">
        <div className={`pop-in rounded-[22px] ${tone} p-5`} key={`${selected}-${rolls}`}>
          <div className="flex items-start gap-3">
            <Icon3D name={icon} size={56} className="-mt-1" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink-2">
                Masa depan #{selected + 1} dari 100{selected === MEDIAN ? " (paling tengah)" : selected < 10 ? " (lagi apes)" : selected >= 90 ? " (lagi hoki)" : ""}
              </p>
              <p className="font-display text-lg font-extrabold leading-tight text-ink sm:text-xl">{story.headline}</p>
            </div>
          </div>
          <Spark sample={samples[selected]} contributedPath={contributedPath} amount={amount} years={years} troughAt={story.drop <= -0.15 ? story.troughAt : null} />
          <ul className="mt-3 flex flex-col gap-1.5 text-ink">
            {story.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-bold text-ink-2">{story.lesson}</p>
        </div>
        </div>
      </div>
    </section>
  );
}

export function Dot({ fate, size = 20 }: { fate: Fate; size?: number }) {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {fate === "rugi" && <circle cx={r} cy={r} r={r - 2.5} fill="none" stroke="var(--loss)" strokeWidth="3.5" className="dot-loss" />}
      {fate === "untung" && <circle cx={r} cy={r} r={r - 1} fill="var(--gain)" />}
      {fate === "target" && <path d={`M${r},0 L${size},${r} L${r},${size} L0,${r} Z`} fill="var(--target)" />}
    </svg>
  );
}

/** Grafik mini satu masa depan: nilai (garis tebal) vs total setoran (garis tipis). */
function Spark({ sample, contributedPath, amount, years, troughAt }: { sample: Sample; contributedPath: number[]; amount: number; years: number; troughAt: number | null }) {
  const W = 320;
  const H = 86;
  const n = sample.path.length;
  const max = Math.max(...sample.path, contributedPath[n - 1]) * 1.05;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - (v / max) * H;
  const line = (xs: number[]) => xs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H + 4}`} className="h-auto w-full" role="img" aria-label={`Perjalanan masa depan ini selama ${years} tahun, berakhir di ${rupiahWords(sample.final * amount)}.`}>
        <path d={line(contributedPath)} fill="none" stroke="var(--contrib)" strokeWidth="1.5" opacity="0.7" />
        <path d={line(sample.path)} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
        {troughAt !== null && <circle cx={x(troughAt)} cy={y(sample.path[troughAt])} r="5" fill="var(--loss)" stroke="var(--surface)" strokeWidth="2" />}
        <circle cx={x(n - 1)} cy={y(sample.path[n - 1])} r="4.5" fill="var(--ink)" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs font-bold text-ink-2">
        <span>Mulai</span>
        <span className="flex items-center gap-1.5">
          <svg width="16" height="6" aria-hidden="true"><path d="M0 3h16" stroke="var(--contrib)" strokeWidth="1.5" /></svg>
          setoranmu {rupiahShort(contributedPath[n - 1] * amount)}
        </span>
        <span>Tahun ke-{years}</span>
      </figcaption>
    </figure>
  );
}
