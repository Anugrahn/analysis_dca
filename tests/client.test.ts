import assert from "node:assert/strict";
import { test } from "node:test";
import { BUSY_MESSAGE, getJson } from "../src/lib/app/client.ts";

function mockFetch(status: number, body: string, type = "application/json") {
  globalThis.fetch = (async () => new Response(body, { status, headers: { "content-type": type } })) as typeof fetch;
}

test("penolakan rate limit (teks biasa) jadi pesan ramah, bukan error teknis", async () => {
  mockFetch(429, "Too Many Requests", "text/plain");
  await assert.rejects(getJson("/api/x"), { message: BUSY_MESSAGE });
  mockFetch(403, "Forbidden", "text/plain");
  await assert.rejects(getJson("/api/x"), { message: BUSY_MESSAGE });
});

test("error dari API kita diteruskan apa adanya; sukses dikembalikan", async () => {
  mockFetch(422, JSON.stringify({ error: "Data harga baru 12 bulan." }));
  await assert.rejects(getJson("/api/x"), { message: "Data harga baru 12 bulan." });
  mockFetch(502, "<html>gateway</html>", "text/html");
  await assert.rejects(getJson("/api/x"), { message: "Lagi gagal ngitung nih. Coba lagi sebentar ya." });
  mockFetch(200, JSON.stringify({ items: [1, 2] }));
  assert.deepEqual(await getJson<{ items: number[] }>("/api/x"), { items: [1, 2] });
});
