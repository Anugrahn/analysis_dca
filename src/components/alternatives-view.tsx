"use client";

import { percent, rupiahShort, rupiahWords } from "@/lib/app/format";
import type { AltGroup, Alternative, Alternatives, Outcome } from "@/lib/app/types";
import { Icon3D, iconFor } from "./icon3d";

const GROUPS: { key: AltGroup; title: string }[] = [
  { key: "sejenis", title: "Yang mirip" },
  { key: "terdiversifikasi", title: "Lebih nyebar, biasanya lebih tenang" },
  { key: "pembanding", title: "Yang paling kalem" },
];

interface Props {
  data: Alternatives | null;
  state: "loading" | "done" | "error";
  current: { name: string; kind: string; symbol: string; outcome: Outcome };
  amount: number;
  onPick: (symbol: string, name: string) => void;
}

export function AlternativesView({ data, state, current, amount, onPick }: Props) {
  const all = [current.outcome, ...(data?.items.map((i) => i.outcome) ?? [])];
  const max = Math.min(Math.max(...all.map((o) => o.final.p95)), 2.2 * Math.max(...all.map((o) => o.final.p50)));

  return (
    <section aria-labelledby="alternatif" className="mt-5 rounded-[var(--radius-card)] bg-surface p-5 sm:p-7">
      <h2 id="alternatif" className="font-display text-2xl font-extrabold text-ink">
        Coba bandingin sama yang lain
      </h2>
      <p className="mt-1 max-w-[60ch] text-ink-2">Uang dan waktunya sama, pakai data terbaru. Ini bahan mikir, bukan suruhan beli ya.</p>

      <ul className="mt-5" aria-label="Pilihanmu">
        <Row label={current.name} kind={current.kind} symbol={current.symbol} tag="Pilihanmu" outcome={current.outcome} max={max} amount={amount} />
      </ul>

      {state === "loading" && !data && (
        <p role="status" className="mt-6 flex items-center gap-3 font-bold text-ink-2">
          <span className="roll inline-block">
            <Icon3D name="dadu" size={32} />
          </span>
          Lagi nyari yang mirip & ngitung ulang…
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="mt-6 font-bold text-loss-ink">
          Alternatifnya belum bisa dihitung. Hasil utamamu tetap aman, coba muat ulang sebentar lagi.
        </p>
      )}

      <div className={`dim-transition ${state === "loading" && data ? "opacity-50" : ""}`}>
        {GROUPS.map((g) => {
          const items = data?.items.filter((i) => i.group === g.key) ?? [];
          if (!items.length) return null;
          return (
            <div key={g.key} className="mt-7">
              <h3 className="font-display text-lg font-extrabold text-ink">{g.title}</h3>
              <ul className="mt-1">
                {items.map((it) => (
                  <Row key={it.key} label={it.label} kind={it.kind} symbol={it.symbol ?? undefined} alt={it} outcome={it.outcome} max={max} amount={amount} onPick={onPick} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Row({
  label,
  kind,
  symbol,
  tag,
  alt,
  outcome,
  max,
  amount,
  onPick,
}: {
  label: string;
  kind: string;
  symbol?: string;
  tag?: string;
  alt?: Alternative;
  outcome: Outcome;
  max: number;
  amount: number;
  onPick?: (symbol: string, name: string) => void;
}) {
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const loss = Math.round(outcome.probLoss * 100);
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-line py-5 last:border-b-0 lg:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_9.5rem] lg:items-center">
      <Icon3D name={iconFor(kind, symbol)} size={52} className="row-span-3 self-start lg:row-span-1 lg:self-center" />
      <div className="min-w-0">
        <p className="font-bold text-ink">
          {label}
          {tag && <span className="ml-2 rounded-full bg-coral px-2.5 py-0.5 text-xs font-extrabold text-on-coral">{tag}</span>}
        </p>
        {alt && <p className="mt-0.5 text-sm text-ink-2">{alt.why}</p>}
        {alt && <p className="mt-1 text-sm font-bold text-ink">{alt.comparison}</p>}
        {alt?.latest && alt.latest.change1y != null && (
          <p className="mt-1 text-xs text-muted">
            Setahun terakhir {alt.latest.change1y >= 0 ? "naik" : "turun"} {percent(Math.abs(alt.latest.change1y))}.
          </p>
        )}
      </div>

      <div className="col-start-2 lg:col-start-auto">
        <div
          className="relative h-7"
          role="img"
          aria-label={`9 dari 10 kemungkinan antara ${rupiahWords(outcome.final.p5 * amount)} dan ${rupiahWords(outcome.final.p95 * amount)}, tengah-tengah ${rupiahWords(outcome.final.p50 * amount)}.`}
        >
          <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-page" />
          <span className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-[var(--band-outer)]" style={{ left: pos(outcome.final.p5), right: `calc(100% - ${pos(outcome.final.p95)})` }} />
          <span className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-[var(--band-inner)]" style={{ left: pos(outcome.final.p25), right: `calc(100% - ${pos(outcome.final.p75)})` }} />
          <span className="absolute top-0 h-7 w-[2px] -translate-x-1/2 rounded bg-[var(--contrib)]" style={{ left: pos(outcome.contributed) }} />
          <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--surface)] bg-[var(--median)]" style={{ left: pos(outcome.final.p50) }} />
        </div>
        <p className="mt-0.5 text-xs text-muted tabular">
          {rupiahShort(outcome.final.p5 * amount)} – {rupiahShort(outcome.final.p95 * amount)}
        </p>
      </div>

      <div className="col-start-2 flex items-center justify-between gap-3 lg:col-start-auto lg:block lg:text-right">
        <p>
          <span className="block font-display text-xl font-extrabold text-ink">{rupiahWords(outcome.final.p50 * amount)}</span>
          <span className={`block text-sm ${loss >= 20 ? "font-bold text-loss-ink" : "text-muted"}`}>rugi {loss} dari 100</span>
        </p>
        {alt?.symbol && onPick && (
          <button
            type="button"
            onClick={() => onPick(alt.symbol!, alt.label)}
            aria-label={`Coba ini: ${alt.label}`}
            className="mt-2 inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-night px-4 text-sm font-bold text-on-night hover:bg-night-raise"
          >
            Coba ini
          </button>
        )}
      </div>
    </li>
  );
}
