import type { NextRequest } from "next/server";
import { searchInstruments } from "@/lib/app/search";
import { CACHE_HEADERS, errorResponse, NO_STORE } from "@/lib/app/respond";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (!q) return Response.json({ items: [] });
  try {
    const { items, degraded } = await searchInstruments(q);
    return Response.json({ items }, { headers: degraded ? NO_STORE : CACHE_HEADERS });
  } catch (e) {
    return errorResponse(e);
  }
}
