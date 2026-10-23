import type { NextRequest } from "next/server";
import { parsePlan } from "@/lib/app/params";
import { project } from "@/lib/app/projection";
import { CACHE_HEADERS, errorResponse } from "@/lib/app/respond";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const p = parsePlan(req.nextUrl.searchParams);
  if ("error" in p) return Response.json(p, { status: 400 });
  try {
    return Response.json(await project(p.symbol, p.years, p.mode, p.stepUp), { headers: CACHE_HEADERS });
  } catch (e) {
    return errorResponse(e);
  }
}
