# Cobain (dca-lab)

Simulator proyeksi DCA untuk saham Indonesia, saham global, kripto, emas, ETF, reksa dana, dan instrumen
pasar uang. Pengguna mencari instrumen apa pun, mengisi setoran bulanan, lalu melihat 100 kemungkinan
hasil, peluang rugi, perjalanan naik-turun, dan alternatif dengan setoran yang sama.
Ini pasangan "ke depan" dari [seandainya.vercel.app](https://seandainya.vercel.app) yang melihat ke belakang.

Semua dokumen (riset, produk, operasional, skill agen) dipetakan di **[docs/README.md](docs/README.md)**. Untuk pengguna ada halaman `/metodologi`.

## Struktur

```
src/lib/sim/        mesin: data panel, DCA, Monte Carlo (block bootstrap + CMA + ketidakpastian), backtest
src/lib/market/     Yahoo Finance + FRED (harga, dividen, kurs, pencarian, emiten sejenis); aturan asumsi per instrumen
src/lib/app/        layanan proyeksi & alternatif, analisis per tahun, format angka Indonesia, validasi parameter
src/app/            halaman (/, /metodologi) dan API (/api/search, /api/projection, /api/alternatives)
src/components/     pencarian (APG combobox), lab 100 masa depan + cerita, grafik kerucut, hasil, alternatif
src/lib/app/story.ts   cerita ELI5 satu masa depan (anjlok, kejadian sejarah, pulih)
scripts/            fetch-data, demo, calibrate (uji ketepatan), icons3d (ikon 3D three.js → public/3d)
```

## Perintah

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # mesin, analisis per tahun, cerita, format, parameter API
npm run icons          # render ulang ikon 3D (buka URL yang dicetak)
npm run typecheck
npm run build
npm run calibrate      # ~1 menit, uji ketepatan model
```

Deploy: Vercel (region `sin1`), tanpa variabel lingkungan dan tanpa database. Data diambil langsung dan
di-cache (fetch revalidate 6 jam + CDN `s-maxage`).
