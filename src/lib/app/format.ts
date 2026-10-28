// Format angka untuk pembaca Indonesia. Kata ("juta", "miliar") lebih mudah dibaca dan
// dibacakan pembaca layar daripada singkatan; singkatan hanya untuk sumbu grafik.

const MINUS = "−";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** Angka desimal gaya Indonesia dengan tanda minus tipografis: −0,42 */
export function decimal(x: number, digits = 2): string {
  return `${x < 0 ? MINUS : ""}${Math.abs(x).toFixed(digits).replace(".", ",")}`;
}

/** "YYYY-MM" + n bulan */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

function dec(v: number, digits: number) {
  return v.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

/** Rp1.234.567 */
export function rupiah(v: number): string {
  const s = Math.round(Math.abs(v)).toLocaleString("id-ID");
  return `${v < 0 ? MINUS : ""}Rp${s}`;
}

const UNITS: [number, string, string][] = [
  [1e12, "triliun", "T"],
  [1e9, "miliar", "M"],
  [1e6, "juta", "jt"],
  [1e3, "ribu", "rb"],
];

/** Desimal untuk kata: makin kecil angkanya, makin banyak desimal (Rp1,44 juta, Rp12,5 juta, Rp195 juta). */
function wordDigits(n: number, unit: number) {
  if (unit === 1e12) return 1;
  if (unit === 1e9) return n >= 10 ? 1 : 2;
  if (unit === 1e6) return n >= 100 ? 0 : n >= 10 ? 1 : 2;
  return 0;
}

/**
 * Pilih satuan SETELAH pembulatan, supaya 999.600 jadi "1 juta", bukan "1.000 ribu".
 * Mengembalikan angka (sudah dibulatkan) & indeks satuan, atau -1 untuk di bawah seribu.
 */
function scale(a: number, digits: (n: number, unit: number) => number): [number, number] {
  for (let i = 0; i < UNITS.length; i++) {
    const unit = UNITS[i][0];
    if (a < unit) continue;
    const n = a / unit;
    const d = digits(n, unit);
    const r = Math.round(n * 10 ** d) / 10 ** d;
    if (r >= 1000 && i > 0) return [Math.round((a / UNITS[i - 1][0]) * 100) / 100, i - 1];
    return [r, i];
  }
  // Di bawah seribu, tapi bisa dibulatkan ke "1 ribu".
  if (Math.round(a) >= 1000) return [1, UNITS.length - 1];
  return [Math.round(a), -1];
}

/** Rp195 juta · Rp1,44 juta · Rp3,1 miliar · Rp850 ribu */
export function rupiahWords(v: number): string {
  const sign = v < 0 ? MINUS : "";
  const [n, i] = scale(Math.abs(v), wordDigits);
  return i < 0 ? `${sign}Rp${dec(n, 0)}` : `${sign}Rp${dec(n, 2)} ${UNITS[i][1]}`;
}

/** Untuk sumbu grafik: Rp200 jt · Rp1,5 M */
export function rupiahShort(v: number): string {
  const [n, i] = scale(Math.abs(v), (_n, unit) => (unit >= 1e9 ? 1 : 0));
  return i < 0 ? `Rp${dec(n, 0)}` : `Rp${dec(n, 1)} ${UNITS[i][2]}`;
}

/** 9,1% · −39% */
export function percent(x: number, digits = 0): string {
  const s = dec(Math.abs(x) * 100, digits);
  return `${x < 0 && Math.abs(x) * 100 >= 0.5 / 10 ** digits ? MINUS : ""}${s}%`;
}

/** "Jun 2004" */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "23 Okt 2026" */
export function dateLabel(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Harga dalam mata uang aslinya. */
export function price(v: number, currency: string): string {
  if (currency === "IDR") return rupiah(v);
  const digits = v >= 1000 ? 0 : v >= 1 ? 2 : 4;
  return `${currency} ${v.toLocaleString("id-ID", { maximumFractionDigits: digits, minimumFractionDigits: v >= 1000 ? 0 : 2 })}`;
}

/**
 * Terima cara orang mengetik nominal: "1000000", "1.000.000", "Rp 1.000.000", "1jt", "1,5 juta",
 * "1.5jt", "500rb", "500 ribu", "2 m" (miliar). Kembalikan null jika tidak bisa dibaca.
 */
export function parseAmount(text: string): number | null {
  const t = text.toLowerCase().replace(/rp\.?/g, "").replace(/\s+/g, "").trim();
  if (!t) return null;
  const m = t.match(/^([\d.,]+)(rb|ribu|k|jt|juta|m|miliar|milyar)?$/);
  if (!m) return null;
  let num = m[1];
  const unit = m[2];
  if (unit) {
    // Dengan satuan, koma ATAU titik tunggal adalah desimal: "1,5jt" = "1.5jt".
    num = num.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  } else {
    // Tanpa satuan, titik & koma adalah pemisah ribuan Indonesia.
    num = num.replace(/[.,]/g, "");
  }
  const v = Number(num);
  if (!Number.isFinite(v)) return null;
  const mult = !unit ? 1 : /^(rb|ribu|k)$/.test(unit) ? 1e3 : /^(jt|juta)$/.test(unit) ? 1e6 : 1e9;
  return Math.round(v * mult);
}

export function formatAmountInput(v: number): string {
  return Math.round(v).toLocaleString("id-ID");
}

/**
 * Format saat mengetik: sisipkan titik ribuan ("1000000" → "1.000.000") dan kembalikan posisi kursor
 * yang baru, supaya kursor tidak lompat ke ujung. Kalau ada huruf ("1,5jt", "500rb"), teks dibiarkan
 * apa adanya — itu singkatan yang dibaca parseAmount.
 */
export function formatTyping(raw: string, caret: number): { text: string; caret: number } {
  // Huruf (satuan "jt", "rb") atau koma (desimal, "1,5jt" yang sedang diketik) = biarkan apa adanya.
  if (/[a-z,]/i.test(raw.replace(/^\s*rp\.?\s*/i, ""))) return { text: raw, caret };
  const digitsBefore = raw.slice(0, caret).replace(/\D/g, "").length;
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 13);
  if (!digits) return { text: "", caret: 0 };
  const text = Number(digits).toLocaleString("id-ID");
  let seen = 0;
  let pos = 0;
  while (pos < text.length && seen < Math.min(digitsBefore, digits.length)) {
    if (/\d/.test(text[pos])) seen++;
    pos++;
  }
  return { text, caret: pos };
}
