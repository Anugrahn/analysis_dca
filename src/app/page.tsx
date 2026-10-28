import { Planner, type PlannerInitial } from "@/components/planner";
import type { Mode } from "@/lib/app/types";

const MODES: Mode[] = ["dasar", "konservatif", "historis"];

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const s = one(sp.s);
  const m = Number(one(sp.m));
  const y = Number(one(sp.y));
  const mode = one(sp.mode) as Mode;
  const naik = Number(one(sp.naik));
  const target = Number(one(sp.target));
  const dividen = one(sp.dividen);
  const initial: PlannerInitial = {
    symbol: s && /^[A-Za-z0-9.^=\-]{1,24}$/.test(s) ? s : null,
    amount: m >= 10_000 && m <= 10_000_000_000 ? m : 1_000_000,
    years: Number.isInteger(y) && y >= 1 && y <= 30 ? y : 10,
    mode: MODES.includes(mode) ? mode : "dasar",
    stepUp: naik >= 0 && naik <= 0.2 ? naik : 0,
    goal: target > 0 ? target : null,
    dividends: dividen === "tunai" ? "tunai" : "putar",
  };
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-2 sm:px-6">
      <Planner initial={initial} />
    </main>
  );
}
