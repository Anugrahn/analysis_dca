import type { Mode } from "../sim/assumptions.ts";
import type { DividendMode } from "../sim/dca.ts";

const SYMBOL = /^[A-Za-z0-9^][A-Za-z0-9.^=\-]{0,23}$/;
const ALLOWED = new Set(["symbol", "years", "mode", "stepUp", "dividen"]);
const MODES: Mode[] = ["dasar", "konservatif", "historis"];
const DIVIDENDS: DividendMode[] = ["putar", "tunai"];

export interface PlanParams {
  symbol: string;
  years: number;
  mode: Mode;
  stepUp: number;
  dividends: DividendMode;
}

/** Validasi query string; mengembalikan pesan yang bisa ditampilkan ke pengguna bila salah. */
export function parsePlan(sp: URLSearchParams): PlanParams | { error: string } {
  // Hanya parameter yang dikenal: parameter acak tidak boleh dipakai untuk menghindari cache CDN.
  for (const k of sp.keys()) if (!ALLOWED.has(k)) return { error: `Parameter "${k}" nggak dikenal.` };
  const symbol = sp.get("symbol") ?? "";
  if (!SYMBOL.test(symbol)) return { error: "Kode instrumennya nggak dikenal." };
  const years = Number(sp.get("years") ?? 10);
  if (!Number.isInteger(years) || years < 1 || years > 30) return { error: "Durasinya 1 sampai 30 tahun ya." };
  const mode = (sp.get("mode") ?? "dasar") as Mode;
  if (!MODES.includes(mode)) return { error: "Versi hitungannya nggak dikenal." };
  const stepUp = Number(sp.get("stepUp") ?? 0);
  if (!(stepUp >= 0 && stepUp <= 0.2)) return { error: "Kenaikan setoran maksimal 20% setahun." };
  // Kelipatan 0,1% saja (sama dengan yang bisa diisi di form), supaya variasi URL terbatas.
  if (Math.abs(stepUp * 1000 - Math.round(stepUp * 1000)) > 1e-9) return { error: "Kenaikan setoran pakai kelipatan 0,1% ya." };
  const dividends = (sp.get("dividen") ?? "putar") as DividendMode;
  if (!DIVIDENDS.includes(dividends)) return { error: "Pilihan dividennya nggak dikenal." };
  return { symbol, years, mode, stepUp, dividends };
}
