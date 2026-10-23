// Cerita satu "masa depan" dalam bahasa sehari-hari. Dipakai di grid 100 kemungkinan dan tombol
// lempar dadu. Fungsi murni: jalan di browser, bisa dites.

import { rupiahWords } from "./format.ts";

export interface Sample {
  final: number;
  path: number[];
  src: [string, number][] | null;
}

interface Event {
  from: string;
  to: string;
  label: string;
  /** label khusus per jenis instrumen */
  crypto?: string;
  /** kejadian yang hanya relevan untuk kripto */
  onlyCrypto?: boolean;
  idr?: string;
}

/** Kejadian pasar terkenal, untuk menamai potongan sejarah yang dipakai sebuah jalur. */
const EVENTS: Event[] = [
  { from: "1997-07", to: "1998-12", label: "krisis moneter 1998" },
  { from: "2000-03", to: "2002-10", label: "pecahnya gelembung dot-com" },
  { from: "2007-10", to: "2009-03", label: "krisis keuangan 2008" },
  { from: "2011-05", to: "2011-10", label: "krisis utang Eropa 2011" },
  { from: "2013-05", to: "2013-12", label: "taper tantrum 2013" },
  { from: "2014-12", to: "2015-08", label: "anjloknya kripto 2015", onlyCrypto: true },
  { from: "2015-04", to: "2016-01", label: "gejolak pasar 2015" },
  { from: "2018-01", to: "2018-12", label: "gejolak 2018", crypto: "ambruknya kripto 2018" },
  { from: "2020-02", to: "2020-04", label: "awal pandemi COVID" },
  { from: "2021-11", to: "2022-12", label: "naiknya suku bunga 2022", crypto: "musim dingin kripto 2022" },
  { from: "2025-10", to: "2026-10", label: "guncangan pasar 2026", idr: "guncangan MSCI 2026" },
];

export interface Story {
  fate: "rugi" | "untung" | "target";
  final: number;
  contributed: number;
  /** penurunan terdalam dari puncak (negatif) */
  drop: number;
  /** bulan (0-based) titik terendah */
  troughAt: number;
  event: string | null;
  /** bulan dari titik terendah sampai balik ke puncak; null = belum balik */
  recover: number | null;
  /** jumlah bulan nilai di bawah total setoran */
  underwater: number;
  headline: string;
  lines: string[];
  lesson: string;
}

export function duration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m} bulan`;
  return m ? `${y} tahun ${m} bulan` : `${y} tahun`;
}

function pctWord(x: number) {
  return `${Math.round(Math.abs(x) * 100)}%`;
}

/** Bulan sumber sejarah untuk bulan simulasi ke-m. */
function sourceAt(src: [string, number][], m: number): string | null {
  let acc = 0;
  for (const [start, len] of src) {
    if (m < acc + len) {
      const [y, mo] = start.split("-").map(Number);
      const t = y * 12 + (mo - 1) + (m - acc);
      return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
    }
    acc += len;
  }
  return null;
}

function eventLabel(e: Event, kind: string, currency: string) {
  if (kind === "kripto" && e.crypto) return e.crypto;
  if (currency === "IDR" && e.idr) return e.idr;
  return e.label;
}

/**
 * @param s jalur contoh, per Rp1 setoran/bulan
 * @param contributedPath setoran kumulatif per Rp1
 * @param amount setoran per bulan (Rp)
 */
export function storyOf(
  s: Sample,
  contributedPath: number[],
  amount: number,
  opts: { kind: string; currency: string; goal: number | null; buyFee: number },
): Story {
  const n = s.path.length;
  const v = s.path.map((x) => x * amount);
  const c = contributedPath.map((x) => x * amount);

  // Naik-turun pasar tanpa efek setoran baru (time-weighted): g = nilai / (nilai lalu + setoran bersih).
  let idx = 1;
  let peak = 1;
  let peakAt = -1;
  let drop = 0;
  let troughAt = 0;
  let dropPeakAt = -1;
  const level: number[] = [];
  for (let m = 0; m < n; m++) {
    const added = (c[m] - (m ? c[m - 1] : 0)) * (1 - opts.buyFee);
    const before = (m ? v[m - 1] : 0) + added;
    idx *= before > 0 ? v[m] / before : 1;
    level.push(idx);
    if (idx > peak) {
      peak = idx;
      peakAt = m;
    }
    const dd = idx / peak - 1;
    if (dd < drop) {
      drop = dd;
      troughAt = m;
      dropPeakAt = peakAt;
    }
  }
  let recover: number | null = null;
  if (drop < 0) {
    const peakLevel = dropPeakAt >= 0 ? level[dropPeakAt] : 1;
    for (let m = troughAt + 1; m < n; m++) {
      if (level[m] >= peakLevel) {
        recover = m - troughAt;
        break;
      }
    }
  }
  const underwater = v.filter((x, m) => x < c[m]).length;

  // Kejadian sejarah yang paling banyak mengisi masa penurunan.
  let event: string | null = null;
  if (s.src && drop <= -0.15) {
    const counts = new Map<Event, number>();
    for (let m = Math.max(0, dropPeakAt + 1); m <= troughAt; m++) {
      const mo = sourceAt(s.src, m);
      if (!mo) continue;
      const e = EVENTS.find((x) => mo >= x.from && mo <= x.to && (!x.onlyCrypto || opts.kind === "kripto"));
      if (e) counts.set(e, (counts.get(e) ?? 0) + 1);
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 2) event = eventLabel(best[0], opts.kind, opts.currency);
  }

  const net = s.final * amount; // nilai bersih setelah biaya jual & pajak
  const contributed = c[n - 1];
  const fate = net < contributed ? "rugi" : opts.goal && net >= opts.goal ? "target" : "untung";
  const year = Math.floor(troughAt / 12) + 1;

  const headline =
    fate === "rugi" ? `Uangmu jadi ${rupiahWords(net)}, rugi ${rupiahWords(contributed - net)}`
    : `Uangmu jadi ${rupiahWords(net)}, untung ${rupiahWords(net - contributed)}`;

  const lines: string[] = [];
  if (drop <= -0.15) {
    lines.push(
      `Di tahun ke-${year}, nilainya sempat anjlok ${pctWord(drop)} dari puncaknya${event ? `, mirip waktu ${event}` : ""}.` +
        (recover !== null ? ` Butuh ${duration(recover)} buat balik lagi.` : " Sampai akhir belum balik ke puncaknya."),
    );
  } else if (drop <= -0.05) {
    lines.push(`Jalannya lumayan tenang. Paling dalam cuma turun ${pctWord(drop)}.`);
  } else {
    lines.push("Jalannya mulus banget, hampir nggak pernah turun.");
  }
  if (underwater >= 6 && fate !== "rugi") lines.push(`Selama ${duration(underwater)}, nilainya sempat di bawah uang yang kamu setor.`);
  if (opts.goal) lines.push(net >= opts.goal ? "Targetmu tercapai." : `Masih kurang ${rupiahWords(opts.goal - net)} dari targetmu.`);

  const lesson =
    fate === "rugi" ? "Kadang memang apes. Makanya uang yang bakal dipakai dalam waktu dekat jangan ditaruh di sini."
    : drop <= -0.3 ? "Kuncinya: tetap nabung pas harga lagi jatuh, jangan panik jual."
    : "Kuncinya: konsisten nabung tiap bulan.";

  return { fate, final: net, contributed, drop, troughAt, event, recover, underwater, headline, lines, lesson };
}
