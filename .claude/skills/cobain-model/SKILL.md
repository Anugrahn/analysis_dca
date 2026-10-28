---
name: cobain-model
description: Ubah model simulasi Cobain: asumsi return (CMA), biaya, pajak, volatilitas, bootstrap, atau aturan per instrumen. Use when editing src/lib/sim, src/lib/market/classify.ts, or src/lib/app/projection.ts in a way that changes projected numbers.
---

# Mengubah model Cobain

Janji Cobain ke pengguna: setiap angka bisa dipertanggungjawabkan. Perubahan model hanya masuk kalau **lolos kalibrasi**: hasil nyata di masa lalu jatuh di pita proyeksi sesering yang dijanjikan.

1. **Ukur dulu.** `npm run calibrate` (±1 menit; perbarui datanya dulu dengan `npm run fetch-data` kalau sudah lewat sebulan). Simpan tabelnya sebagai pembanding.
2. **Ubah**, lalu tambah tes di `tests/sim.test.ts` untuk perilaku barunya.
3. **Ukur lagi.** Untuk tiap instrumen (IHSG, S&P 500, BBCA, TLKM, Emas), bandingkan "di p5–p95" (ideal 90%), "di p25–p75" (ideal 50%), dan PIT (ideal 0,50). Kalau perlu varian baru, tambahkan ke `VARIANTS` di `scripts/calibrate.ts`.
4. **Putuskan.** Pakai perubahan hanya kalau tidak ada instrumen yang memburuk jelas. Kalau memburuk, jangan dipakai, tapi catat sebagai "diuji, ditolak" beserta angkanya. Contohnya penyesuaian volatilitas terkini untuk saham.
5. **Selaraskan cerita ke pengguna.** Perbarui tabel kalibrasi & asumsi di `src/app/metodologi/page.tsx` dan penjelasan di `src/lib/market/classify.ts`. Catat keputusannya di `docs/riset/`.

Selesai kalau `npm test` hijau, tabel kalibrasi baru tercatat, dan halaman `/metodologi` memakai angka yang sama dengan hasil kalibrasi terakhir.
