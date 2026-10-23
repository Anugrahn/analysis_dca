"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SearchItem } from "@/lib/app/types";
import { Icon3D, iconFor } from "./icon3d";

/** Pilihan cepat (Hick's law: sedikit pilihan yang paling sering dicari). */
export const POPULAR: (SearchItem & { short: string })[] = [
  { symbol: "BBCA.JK", short: "BBCA", name: "Bank Central Asia", kindLabel: "Saham", exchangeName: "Jakarta" },
  { symbol: "^JKSE", short: "IHSG", name: "IHSG (lewat reksa dana indeks)", kindLabel: "Indeks", exchangeName: "Jakarta" },
  { symbol: "SPY", short: "S&P 500", name: "S&P 500 (ETF SPY)", kindLabel: "ETF", exchangeName: "Amerika" },
  { symbol: "BTC-USD", short: "Bitcoin", name: "Bitcoin", kindLabel: "Kripto", exchangeName: "Kripto" },
  { symbol: "GC=F", short: "Emas", name: "Emas", kindLabel: "Komoditas", exchangeName: "Harga dunia" },
  { symbol: "rdpu", short: "Pasar uang", name: "Reksa Dana Pasar Uang", kindLabel: "Pasar uang", exchangeName: "Hitungan suku bunga" },
];

interface Props {
  labelledBy: string;
  value: SearchItem | null;
  onSelect: (item: SearchItem) => void;
  errorId?: string;
  invalid?: boolean;
}

export function InstrumentSearch({ labelledBy, value, onSelect, errorId, invalid }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState(value?.name ?? "");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const typed = useRef(false);
  // Kata yang benar-benar diketik pengguna (bukan nama dari pilihan) — hanya ini yang dicari.
  const [term, setTerm] = useState("");

  // Pilihan dari luar (chip populer, tombol alternatif, URL) menimpa teks input.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value) {
      setQuery(value.name);
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!term) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { items?: SearchItem[] };
        setItems(data.items ?? []);
        setActive(data.items?.length ? 0 : -1);
        setState("done");
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState("error");
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  function onType(v: string) {
    typed.current = true;
    setQuery(v);
    const q = v.trim();
    setTerm(q);
    if (q) setState("loading");
    else {
      setItems([]);
      setState("idle");
    }
  }

  function choose(item: SearchItem) {
    typed.current = false;
    setQuery(item.name);
    setOpen(false);
    setActive(-1);
    onSelect(item);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && items.length) setOpen(true);
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && items[active]) {
        e.preventDefault();
        choose(items[active]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      } else if (query) setQuery("");
    }
  }

  const showList = open && state !== "idle" && items.length > 0;
  const status =
    state === "loading" ? "Nyari dulu…"
    : state === "error" ? "Gagal nyari. Cek koneksi, terus coba lagi ya."
    : state === "done" && items.length === 0 ? `“${query.trim()}” nggak ketemu. Coba kode saham (BBCA) atau nama (Bitcoin, emas).`
    : "";
  const srStatus = state === "done" && items.length ? `${items.length} hasil. Pilih pakai panah atas-bawah, lalu Enter.` : status;

  return (
    <div>
      <div className="relative">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 20 20" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-2">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M13 13l4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          role="combobox"
          aria-labelledby={labelledBy}
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-describedby={invalid ? errorId : undefined}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="BBCA, Bitcoin, emas…"
          value={query}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            e.currentTarget.select();
            if (items.length && typed.current) setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          className={`h-16 w-full rounded-full border-[3px] bg-surface pl-14 pr-6 text-lg font-bold text-ink shadow-[0_10px_30px_-12px_rgb(18_26_69/0.45)] placeholder:font-normal placeholder:text-muted ${
            invalid ? "border-ink" : "border-transparent"
          }`}
        />
        <ul
          id={listId}
          role="listbox"
          aria-label="Hasil pencarian"
          hidden={!showList}
          className="absolute inset-x-0 top-[calc(100%+8px)] z-30 max-h-[min(440px,60vh)] overflow-auto rounded-[22px] bg-surface p-2 shadow-[0_24px_48px_-16px_rgb(18_26_69/0.5)]"
        >
          {items.map((it, i) => (
            <li
              key={it.symbol}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(it)}
              onMouseMove={() => setActive(i)}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 ${i === active ? "bg-coral-soft" : ""}`}
            >
              <Icon3D name={iconFor(it.kindLabel, it.symbol)} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink">{it.name}</span>
                <span className="block truncate text-sm text-muted">{[it.kindLabel, it.exchangeName, it.detail].filter(Boolean).join(", ")}</span>
              </span>
              <span className="shrink-0 rounded-full bg-page px-2.5 py-1 text-xs font-bold text-ink-2 tabular">{displaySymbol(it.symbol)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 min-h-[1.5em] text-sm font-bold text-on-coral" aria-hidden={!status}>
        {status}
      </p>
      <p role="status" className="sr-only">
        {srStatus}
      </p>

      <p className="mb-2 mt-1 text-sm font-bold text-on-coral" id={`${id}-pop`}>
        Yang sering dicoba:
      </p>
      <ul aria-labelledby={`${id}-pop`} className="flex flex-wrap gap-2">
        {POPULAR.map((p) => {
          const selected = value?.symbol === p.symbol;
          return (
            <li key={p.symbol}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => choose(p)}
                className={`flex min-h-12 items-center gap-1.5 rounded-full py-1 pl-1.5 pr-4 text-sm font-bold transition-transform active:scale-95 ${
                  selected ? "bg-selected text-on-selected" : "bg-surface text-ink hover:-translate-y-0.5"
                }`}
              >
                <Icon3D name={iconFor(p.kindLabel, p.symbol)} size={32} />
                {p.short}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function displaySymbol(s: string) {
  if (s === "rdpu" || s === "sbn" || s === "deposito") return "Model";
  return s.replace(/\.JK$/, "").replace(/-USD$/, "").replace(/^\^JKSE$/, "IHSG").replace(/^GC=F$/, "XAU");
}
