import { MarketError } from "../market/yahoo.ts";

export function errorResponse(e: unknown) {
  if (e instanceof MarketError) {
    const status = e.status >= 400 && e.status < 600 ? e.status : 502;
    return Response.json({ error: e.message }, { status: status === 404 || status === 422 ? status : 502 });
  }
  console.error(e);
  return Response.json({ error: "Lagi gagal ngitung nih. Coba lagi sebentar ya." }, { status: 500 });
}

/** Hasil sama untuk semua orang & berubah paling cepat harian: boleh di-cache CDN. */
export const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" };
/** Untuk hasil yang tidak lengkap karena sumber data gagal: jangan disimpan di mana pun. */
export const NO_STORE = { "Cache-Control": "no-store" };
