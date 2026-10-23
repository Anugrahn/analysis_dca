export interface Pct {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

/** Persentil dengan interpolasi linear; `sorted` harus sudah urut naik. */
export function quantile(sorted: ArrayLike<number>, q: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.min(n - 1, lo + 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function pct(xs: ArrayLike<number>): Pct {
  const s = Float64Array.from(xs).sort();
  return { p5: quantile(s, 0.05), p25: quantile(s, 0.25), p50: quantile(s, 0.5), p75: quantile(s, 0.75), p95: quantile(s, 0.95) };
}

export function mean(xs: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += xs[i];
  return s / xs.length;
}

export function std(xs: ArrayLike<number>): number {
  const m = mean(xs);
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += (xs[i] - m) ** 2;
  return Math.sqrt(s / Math.max(1, xs.length - 1));
}

/** PRNG deterministik (mulberry32) supaya hasil simulasi bisa diulang dan dites. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => {
    const u = next() || 1e-12;
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
  };
  return { next, normal, int: (n: number) => Math.floor(next() * n) };
}
