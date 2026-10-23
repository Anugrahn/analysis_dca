// Pemanggil API dari browser. Penolakan rate limit Vercel Firewall (429; 403 di konfigurasi lama)
// berupa teks biasa, bukan JSON — jadi diubah jadi pesan yang ramah, bukan error teknis.

export const BUSY_MESSAGE = "Wah, kamu lagi semangat banget. Udah kebanyakan coba dalam semenit, tunggu sebentar terus lempar lagi ya.";
const FAILED_MESSAGE = "Lagi gagal ngitung nih. Coba lagi sebentar ya.";

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (res.status === 429 || res.status === 403) throw new Error(BUSY_MESSAGE);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error(FAILED_MESSAGE);
  }
  if (!res.ok) throw new Error((body as { error?: string }).error ?? FAILED_MESSAGE);
  return body as T;
}
