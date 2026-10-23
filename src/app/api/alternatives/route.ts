import type { NextRequest } from "next/server";
import { parsePlan } from "@/lib/app/params";
import { alternatives } from "@/lib/app/projection";
import { CACHE_HEADERS, errorResponse, NO_STORE } from "@/lib/app/respond";

// Simulasi berat: batasi durasi fungsi supaya permintaan nakal tidak menahan server lama.
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const p = parsePlan(req.nextUrl.searchParams);
  if ("error" in p) return Response.json(p, { status: 400 });
  try {
    const data = await alternatives(p.symbol, p.years, p.mode, p.stepUp);
    return Response.json(data, { headers: data.degraded ? NO_STORE : CACHE_HEADERS });
  } catch (e) {
    return errorResponse(e);
  }
}
