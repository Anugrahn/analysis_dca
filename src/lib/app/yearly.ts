// Analisis per tahun untuk tabel "tahun demi tahun". Fungsi murni: jalan di browser, mengikuti
// slider setoran & target tanpa memanggil server (semua angka dari server per Rp1 setoran/bulan).

import { xirrMonthly } from "../sim/dca.ts";
import { quantileAt } from "./quantiles.ts";

export interface YearInput {
  month: number;
  contributed: number;
  probLoss: number;
  quantiles: number[];
}

export interface YearRow {
  year: number;
  /** bulan ke- (kelipatan 12, atau bulan terakhir kalau durasinya tidak bulat) */
  month: number;
  /** setoran selama tahun ini saja */
  depositThisYear: number;
  /** total setoran sampai akhir tahun ini */
  deposited: number;
  /** nilai kalau dicairkan di akhir tahun ini, per skenario */
  apes: number;
  bawah: number;
  tengah: number;
  atas: number;
  hoki: number;
  /** untung/rugi versi tengah dibanding total setoran */
  gain: number;
  gainPct: number;
  /** tambahan dari hasil investasi selama tahun ini (bukan dari setoran), versi tengah */
  earnedThisYear: number;
  /** porsi 0–1 */
  probLoss: number;
  probGoal: number | null;
  /** versi tengah dalam daya beli hari ini */
  realTengah: number;
  /** pertumbuhan per tahun versi tengah, sudah memperhitungkan kapan tiap setoran masuk */
  growth: number;
}

export type MilestoneKind =
  | "rugi-separuh"
  | "rugi-mengecil"
  | "apes-pun-untung"
  | "bunga-berbunga"
  | "dua-kali"
  | "target-mungkin"
  | "target-yakin"
  | "sejarah-selalu-untung";

export interface Milestone {
  year: number;
  kind: MilestoneKind;
  /** kalimat pendek ELI5 */
  text: string;
}

export interface YearlyAnalysis {
  rows: YearRow[];
  milestones: Milestone[];
}

interface Options {
  amount: number;
  stepUp: number;
  inflation: number;
  goal: number | null;
  /** ambang konsistensi sejarah (tahun), lihat Projection.consistentFrom */
  consistentFrom?: number | null;
}

export function analyzeYears(input: YearInput[], o: Options): YearlyAnalysis {
  const rows: YearRow[] = [];
  let prev: YearRow | null = null;
  for (const y of input) {
    const k = o.amount;
    const deposited = y.contributed * k;
    const q = (p: number) => y.quantiles[p] * k;
    const tengah = q(50);
    const depositThisYear = deposited - (prev?.deposited ?? 0);
    // Setoran tiap bulan sampai bulan ini (naik tiap 12 bulan), untuk pertumbuhan per tahun.
    const flows = Array.from({ length: y.month }, (_, m) => k * Math.pow(1 + o.stepUp, Math.floor(m / 12)));
    const row: YearRow = {
      year: Math.ceil(y.month / 12),
      month: y.month,
      depositThisYear,
      deposited,
      apes: q(5),
      bawah: q(25),
      tengah,
      atas: q(75),
      hoki: q(95),
      gain: tengah - deposited,
      gainPct: deposited > 0 ? tengah / deposited - 1 : 0,
      earnedThisYear: tengah - (prev?.tengah ?? 0) - depositThisYear,
      probLoss: y.probLoss,
      probGoal: o.goal ? 1 - quantileAt(y.quantiles, o.goal / k) : null,
      realTengah: tengah / Math.pow(1 + o.inflation, y.month / 12),
      growth: xirrMonthly(flows, tengah),
    };
    rows.push(row);
    prev = row;
  }
  const milestones = findMilestones(rows);
  const c = o.consistentFrom;
  if (c && rows.some((r) => r.year === c)) {
    milestones.push({
      year: c,
      kind: "sejarah-selalu-untung",
      text: `Di masa lalu, nabung ${c} tahun atau lebih di sini selalu berakhir untung, mulai bulan apa pun. Ke depan belum tentu sama.`,
    });
    milestones.sort((a, b) => a.year - b.year);
  }
  return { rows, milestones };
}

/** Momen penting, masing-masing hanya disebut sekali (tahun pertama terjadinya). */
function findMilestones(rows: YearRow[]): Milestone[] {
  const out: Milestone[] = [];
  const first = (pred: (r: YearRow, i: number) => boolean) => rows.find(pred);

  // Hanya bermakna kalau di awal peluang ruginya memang besar.
  if (rows.length && rows[0].probLoss >= 0.1) {
    const start = Math.round(rows[0].probLoss * 100);
    const half = first((x) => x.probLoss <= rows[0].probLoss / 2 && x.probLoss >= 0.1);
    if (half) out.push({ year: half.year, kind: "rugi-separuh", text: `Peluang rugi tinggal ${Math.round(half.probLoss * 100)} dari 100, separuh dari tahun pertama (${start}).` });
    const r = first((x) => x.probLoss < 0.1);
    if (r) out.push({ year: r.year, kind: "rugi-mengecil", text: "Peluang rugi turun di bawah 10 dari 100. Makin lama nabung, makin kecil risikonya." });
  }
  const apes = first((x) => x.apes >= x.deposited);
  if (apes && apes.year > 1) out.push({ year: apes.year, kind: "apes-pun-untung", text: "Bahkan versi lagi apes sudah tidak rugi." });
  const bunga = first((x, i) => i > 0 && x.earnedThisYear > x.depositThisYear);
  if (bunga) out.push({ year: bunga.year, kind: "bunga-berbunga", text: "Hasil investasi setahun mulai lebih gede dari setoranmu setahun. Bunga berbunga mulai kerasa." });
  const dua = first((x) => x.tengah >= 2 * x.deposited);
  if (dua) out.push({ year: dua.year, kind: "dua-kali", text: "Versi tengah sudah 2× lipat uang yang kamu setor." });
  if (rows.some((r) => r.probGoal !== null)) {
    const mungkin = first((x) => (x.probGoal ?? 0) >= 0.5);
    if (mungkin) out.push({ year: mungkin.year, kind: "target-mungkin", text: "Target mulai lebih mungkin tercapai daripada tidak (50 dari 100)." });
    const yakin = first((x) => (x.probGoal ?? 0) >= 0.8);
    if (yakin && yakin.year !== mungkin?.year) out.push({ year: yakin.year, kind: "target-yakin", text: "Target tercapai di 8 dari 10 kemungkinan." });
  }
  return out.sort((a, b) => a.year - b.year);
}
