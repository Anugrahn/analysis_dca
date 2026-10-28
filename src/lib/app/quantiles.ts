/**
 * Posisi `value` di antara 101 kuantil (persentil 0..100), sebagai porsi 0–1: berapa bagian
 * kemungkinan yang nilainya di bawah `value`. Interpolasi linear di antara persentil.
 */
export function quantileAt(quantiles: number[], value: number): number {
  const n = quantiles.length - 1;
  if (value <= quantiles[0]) return 0;
  if (value >= quantiles[n]) return 1;
  for (let i = 1; i <= n; i++) {
    if (value <= quantiles[i]) {
      const lo = quantiles[i - 1];
      const hi = quantiles[i];
      const t = hi > lo ? (value - lo) / (hi - lo) : 0;
      return (i - 1 + t) / n;
    }
  }
  return 1;
}
