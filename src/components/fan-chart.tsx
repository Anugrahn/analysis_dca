"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { rupiahShort, rupiahWords } from "@/lib/app/format";

interface Props {
  fan: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] };
  contributed: number[];
  /** setoran per bulan: semua seri dikirim per Rp1, dikalikan di sini */
  amount: number;
  title: string;
  /** satu masa depan yang sedang dipilih (per Rp1), digambar di atas pita */
  pick?: { path: number[]; label: string } | null;
}

const H = 300;
const PAD = { top: 16, right: 16, bottom: 34, left: 64 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceStep(max: number, n = 4) {
  const raw = max / n;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

export function FanChart({ fan, contributed, amount, title, pick }: Props) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const n = fan.p50.length;
  const s = (xs: number[]) => xs.map((v) => v * amount);
  const d = useMemo(
    () => ({ p5: s(fan.p5), p25: s(fan.p25), p50: s(fan.p50), p75: s(fan.p75), p95: s(fan.p95), c: s(contributed), pick: pick ? s(pick.path) : null }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fan, contributed, amount, pick],
  );

  // Skala Y: pita atas aset sangat bergejolak bisa 10× median. Grafik dipotong supaya garis tengah
  // tetap terbaca, dan potongannya diberi tahu terang-terangan.
  const p95max = Math.max(...d.p95);
  const softMax = Math.max(Math.max(...d.p75) * 1.6, d.c[n - 1] * 1.5, d.pick ? Math.max(...d.pick) * 1.05 : 0);
  const clipped = p95max > softMax * 1.05;
  const top = clipped ? softMax : p95max;
  const step = niceStep(top);
  const yMax = Math.ceil(top / step) * step;
  const iw = width - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + ((i + 1) / n) * iw;
  const y = (v: number) => PAD.top + ih - (Math.min(v, yMax) / yMax) * ih;
  const x0 = PAD.left;

  const area = (lo: number[], hi: number[]) =>
    `M${x0},${y(0)} ` +
    hi.map((v, i) => `L${x(i)},${y(v)}`).join(" ") +
    " " +
    lo.map((_, i) => `L${x(n - 1 - i)},${y(lo[n - 1 - i])}`).join(" ") +
    ` L${x0},${y(0)} Z`;
  const line = (xs: number[]) => `M${x0},${y(0)} ` + xs.map((v, i) => `L${x(i)},${y(v)}`).join(" ");

  const years = n / 12;
  // Label tahun sebanyak yang muat (~56px per label), dengan langkah 1/2/5/10 tahun.
  const maxLabels = Math.max(2, Math.floor(iw / 56));
  const yearStep = [1, 2, 5, 10].find((st) => years / st + 1 <= maxLabels) ?? 10;
  const xTicks = Array.from({ length: Math.floor(years / yearStep) + 1 }, (_, k) => k * yearStep);
  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, k) => k * step);

  function hoverAt(clientX: number, rect: DOMRect) {
    const px = clientX - rect.left;
    const i = Math.round(((px - PAD.left) / iw) * n) - 1;
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  function onKey(e: React.KeyboardEvent) {
    const cur = hover ?? n - 1;
    const jump = e.shiftKey ? 12 : 1;
    if (e.key === "ArrowRight") setHover(Math.min(n - 1, cur + jump));
    else if (e.key === "ArrowLeft") setHover(Math.max(0, cur - jump));
    else if (e.key === "Home") setHover(0);
    else if (e.key === "End") setHover(n - 1);
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  }

  const h = hover;
  const tipLeft = h !== null ? Math.min(Math.max(x(h) - 110, 4), width - 224) : 0;
  const tableRows = Array.from({ length: Math.floor(years) }, (_, k) => (k + 1) * 12 - 1).concat(n % 12 ? [n - 1] : []);

  return (
    <figure className="m-0">
      <figcaption className="mb-3">
        <span className="block font-display text-xl font-extrabold text-ink sm:text-2xl">{title}</span>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2" aria-label="Keterangan grafik">
          <li className="flex items-center gap-2">
            <svg width="22" height="10" aria-hidden="true"><path d="M1 5h20" stroke="var(--median)" strokeWidth="2.5" strokeLinecap="round" /></svg>
            Tengah-tengah
          </li>
          <li className="flex items-center gap-2">
            <svg width="14" height="12" aria-hidden="true"><rect width="14" height="12" rx="2" fill="var(--band-inner)" /></svg>
            Setengah kemungkinan
          </li>
          <li className="flex items-center gap-2">
            <svg width="14" height="12" aria-hidden="true"><rect width="14" height="12" rx="2" fill="var(--band-outer)" /></svg>
            9 dari 10 kemungkinan
          </li>
          <li className="flex items-center gap-2">
            <svg width="22" height="10" aria-hidden="true"><path d="M1 5h20" stroke="var(--contrib)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Uang yang kamu setor
          </li>
          {pick && (
            <li className="flex items-center gap-2">
              <svg width="22" height="10" aria-hidden="true"><path d="M1 5h20" stroke="var(--pick)" strokeWidth="3" strokeLinecap="round" /></svg>
              {pick.label}
            </li>
          )}
        </ul>
      </figcaption>

      {clipped && (
        <p className="mb-2 text-sm text-ink-2">
          Bagian atasnya kita potong biar garisnya kebaca. Kalau lagi hoki banget, nilainya bisa tembus{" "}
          <strong className="font-bold text-ink">{rupiahWords(d.p95[n - 1])}</strong>.
        </p>
      )}

      <div ref={wrapRef} className="relative">
        <div
          role="application"
          tabIndex={0}
          aria-label={`${title}. Pakai panah kiri-kanan buat geser per bulan, tahan Shift buat per tahun. Angka lengkapnya ada di tabel di bawah.`}
          onKeyDown={onKey}
          onFocus={() => {
            setFocused(true);
            setHover((v) => v ?? n - 1);
          }}
          onBlur={() => {
            setFocused(false);
            setHover(null);
          }}
          onPointerMove={(e) => hoverAt(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
          className="touch-pan-y rounded-lg"
        >
          <svg width={width} height={H} className="block">
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth="1" />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="12" fill="var(--muted)" className="tabular">
                  {rupiahShort(t)}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <text
                key={t}
                x={t === 0 ? x0 : x(t * 12 - 1)}
                y={H - 10}
                textAnchor={t === 0 ? "start" : t * 12 >= n ? "end" : "middle"}
                fontSize="12"
                fill="var(--muted)"
                className="tabular"
              >
                {t === 0 ? "Mulai" : `Thn ${t}`}
              </text>
            ))}
            <path d={area(d.p5, d.p95)} fill="var(--band-outer)" />
            <path d={area(d.p25, d.p75)} fill="var(--band-inner)" />
            <path d={line(d.c)} fill="none" stroke="var(--contrib)" strokeWidth="1.5" strokeLinejoin="round" />
            <path d={line(d.p50)} fill="none" stroke="var(--median)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {d.pick && (
              <path
                key={pick?.label}
                d={line(d.pick)}
                fill="none"
                stroke="var(--pick)"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={1000}
                className="draw-path"
                style={{ ["--len" as string]: 1000 }}
              />
            )}
            <circle cx={x(n - 1)} cy={y(d.p50[n - 1])} r="4.5" fill="var(--median)" stroke="var(--surface)" strokeWidth="2" />
            {clipped && (
              <path d={`M${x(n - 1) - 6},${PAD.top + 8} L${x(n - 1)},${PAD.top} L${x(n - 1) + 6},${PAD.top + 8}`} fill="none" stroke="var(--median)" strokeWidth="2" />
            )}
            {h !== null && (
              <g>
                <line x1={x(h)} x2={x(h)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--ink-2)" strokeWidth="1" />
                <circle cx={x(h)} cy={y(d.p50[h])} r="4.5" fill="var(--median)" stroke="var(--surface)" strokeWidth="2" />
              </g>
            )}
            <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" strokeWidth="1" />
          </svg>
        </div>
        {h !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-2 w-[220px] rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-[0_8px_24px_-12px_rgb(16_23_58/0.4)]"
            style={{ left: tipLeft }}
          >
            <p className="text-muted">{when(h)}</p>
            <p className="mt-1 flex justify-between gap-2">
              <strong className="font-bold text-ink">{rupiahWords(d.p50[h])}</strong>
              <span className="text-ink-2">tengah-tengah</span>
            </p>
            <p className="flex justify-between gap-2">
              <span className="font-semibold text-ink">
                {rupiahShort(d.p5[h])} – {rupiahShort(d.p95[h])}
              </span>
              <span className="text-ink-2">9 dari 10</span>
            </p>
            <p className="flex justify-between gap-2">
              <span className="font-semibold text-ink">{rupiahWords(d.c[h])}</span>
              <span className="text-ink-2">disetor</span>
            </p>
            {d.pick && (
              <p className="flex justify-between gap-2">
                <span className="font-semibold text-coral-ink">{rupiahWords(d.pick[h])}</span>
                <span className="text-ink-2">{pick?.label}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {focused && h !== null
          ? `${when(h)}: tengah-tengah ${rupiahWords(d.p50[h])}, 9 dari 10 kemungkinan antara ${rupiahWords(d.p5[h])} dan ${rupiahWords(d.p95[h])}, udah disetor ${rupiahWords(d.c[h])}.`
          : ""}
      </p>

      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-bold text-coral-ink">Lihat angkanya per tahun</summary>
        <div className="mt-2 overflow-x-auto rounded-xl" tabIndex={0} role="region" aria-label="Tabel angka per tahun, bisa digeser">
          <table className="w-full min-w-[520px] border-collapse text-sm tabular">
            <caption className="sr-only">{title}, per akhir tahun</caption>
            <thead>
              <tr className="border-b border-line text-left text-ink-2">
                <th scope="col" className="py-2 pr-3 font-semibold">Akhir</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Disetor</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Lagi apes</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">Tengah</th>
                <th scope="col" className="py-2 text-right font-semibold">Lagi hoki</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((i) => (
                <tr key={i} className="border-b border-line">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">{when(i)}</th>
                  <td className="py-2 pr-3 text-right">{rupiahWords(d.c[i])}</td>
                  <td className="py-2 pr-3 text-right">{rupiahWords(d.p5[i])}</td>
                  <td className="py-2 pr-3 text-right font-semibold">{rupiahWords(d.p50[i])}</td>
                  <td className="py-2 text-right">{rupiahWords(d.p95[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function when(i: number) {
  const y = Math.floor((i + 1) / 12);
  const m = (i + 1) % 12;
  if (m === 0) return `Tahun ke-${y}`;
  return y === 0 ? `Bulan ke-${m}` : `Tahun ke-${y}, bulan ke-${m}`;
}
