# Cobain (dca-lab)

Simulator proyeksi DCA untuk saham Indonesia, saham global, kripto, emas, ETF, reksa dana, dan instrumen
pasar uang. Pengguna mencari instrumen apa pun, mengisi setoran bulanan, lalu melihat 100 kemungkinan
hasil, peluang rugi, perjalanan naik-turun, dan alternatif dengan setoran yang sama.
Ini pasangan "ke depan" dari [seandainya.vercel.app](https://seandainya.vercel.app) yang melihat ke belakang.

- Riset model & bukti kalibrasi: [docs/RESEARCH.md](docs/RESEARCH.md), [docs/MODEL-RESEARCH.md](docs/MODEL-RESEARCH.md)
- Keputusan UX, aksesibilitas, standar: [docs/UX.md](docs/UX.md)
- Metodologi untuk pengguna: halaman `/metodologi`

## Struktur

```
src/lib/sim/        mesin: data panel, DCA, Monte Carlo (block bootstrap + CMA + ketidakpastian), backtest
src/lib/market/     Yahoo Finance + FRED (harga, dividen, kurs, pencarian, emiten sejenis); aturan asumsi per instrumen
src/lib/app/        layanan proyeksi & alternatif, format angka Indonesia, validasi parameter
src/app/            halaman (/, /metodologi) dan API (/api/search, /api/projection, /api/alternatives)
src/components/     pencarian (APG combobox), lab 100 masa depan + cerita, grafik kerucut, hasil, alternatif
src/lib/app/story.ts   cerita ELI5 satu masa depan (anjlok, kejadian sejarah, pulih)
scripts/            fetch-data, demo, calibrate (uji ketepatan), icons3d (ikon 3D three.js → public/3d)
```

## Perintah

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # 24 tes: mesin, cerita, format, kalimat perbandingan
npm run icons          # render ulang ikon 3D (buka URL yang dicetak)
npm run typecheck
npm run build
npm run calibrate      # ~1 menit, uji ketepatan model
```

Deploy: Vercel (region `sin1`), tanpa variabel lingkungan dan tanpa database. Data diambil langsung dan
di-cache (fetch revalidate 6 jam + CDN `s-maxage`).
