# DCA Lab — Riset & Desain Model (Draft v0.1, 23 Okt 2026)

> Draft. Desain/UI dibahas nanti. Dokumen ini berisi: bedah web referensi, pilihan model proyeksi
> beserta buktinya, asumsi per kelas aset, kerangka rekomendasi, dan rencana platform.
> Bukan nasihat investasi berlisensi (OJK). Ini alat bantu berpikir dan merencanakan.

---

## 0. Ringkasan

- **seandainya.vercel.app** (karya Rio Nur Arifin) adalah *backtest*: "kalau dulu saya DCA, sekarang
  jadi berapa?" Dikerjakan dengan sangat baik dan jujur, tapi **hanya melihat ke belakang**.
- Yang kamu minta adalah **proyeksi ke depan**. Model yang dipilih untuk itu adalah
  **stationary block bootstrap yang di-recenter ke asumsi pasar ke depan (CMA)**:
  - *bentuk* risiko (volatilitas, crash, ekor tebal, korelasi antar-aset, pergerakan kurs)
    diambil dari sejarah asli;
  - *titik tengah* return diambil dari asumsi ke depan yang konservatif, **bukan** dari rata-rata
    sejarah.
- **Bukti**: uji kalibrasi walk-forward (§3.3). Dengan rata-rata sejarah, proyeksi saham tunggal
  terlalu optimis (BBCA: PIT rata-rata 0,13, artinya hasil nyata hampir selalu di bawah median
  proyeksi). Dengan target dari
  prior netral, hasil nyata jatuh di pita p5–p95 sebanyak **81–97%** kali di semua instrumen yang
  diuji, dekat dengan 90% yang ideal.
- "Akurat" di sini artinya **terkalibrasi**: kalau aplikasi bilang "80% kemungkinan tercapai",
  memang kira-kira 8 dari 10 kali tercapai. Tidak ada model yang bisa menebak angka pasti.
- Mesin simulasi sudah jalan (TypeScript murni, 15 tes lulus, data asli Yahoo/FRED). Tinggal
  dipasang ke Next.js di Vercel, dengan stack yang sama seperti House of N&N.

---

## 1. Bedah seandainya.vercel.app

| Aspek | Yang dilakukan |
|---|---|
| Pertanyaan | "Kalau DCA Rp X/bln selama N thn mulai bulan M, hasilnya berapa?" |
| Metode | Backtest *rolling start*: DCA yang sama diulang dari banyak bulan mulai (default 10, bisa "semua bulan") |
| Instrumen | 19: BBCA, BBRI, BMRI, TLKM, IHSG, LQ45, IDX30, S&P 500, Nasdaq-100, MSCI World, Global REIT, BTC, ETH, emas, RDPU, RDPT, SBN Ritel, deposito, USD cash |
| Metrik | XIRR, median/terbaik/terburuk, % start untung, % kalahkan inflasi, volatilitas, max drawdown, waktu pulih, underwater, Sharpe, Sortino, VaR/CVaR 95%, korelasi |
| Skor stabilitas | 35% sering untung + 25% kalahkan inflasi + 20% rentang hasil rapat + 20% tahan penurunan |
| Biaya | beli domestik 0,2%, jual 0,3%, global 0,2/0,2%, kripto 0,4% PP, spread 0,1%, pajak dividen asing 15% |
| Data | Yahoo Finance (harga, adj. close, dividen, kurs), FRED (CPI & deposito ID), World Bank, BI Rate |
| Instrumen model | RDPU = bunga deposito − 0,6%; deposito = setelah pajak 20% |

**Kekuatan**: jujur soal *timing risk* (contoh BTC Apr 2016 sengaja tidak dijadikan kesimpulan), metrik
risiko lengkap, sumber data dibuka.

**Celah yang bisa kita isi:**
1. Tidak ada **proyeksi ke depan**: semua angka adalah sejarah, padahal sejarah 10–20 tahun hanya
   berisi 2–4 periode 5 tahun yang benar-benar independen.
2. **Bias survivorship**: BBCA dan BBRI ada di daftar *karena* hari ini mereka pemenang.
   Backtest saham-saham ini otomatis terlihat bagus.
3. Tidak ada **portofolio** (campuran aset + rebalancing), **target** ("butuh Rp500 jt untuk DP
   rumah tahun 2031"), atau **setoran yang naik** mengikuti gaji.
4. Tidak ada **rekomendasi** sesuai profil, dan tidak tersambung ke kondisi keuangan nyata (dana
   darurat, arus kas), yang sebenarnya sudah tercatat di House of N&N.

---

## 2. Pertanyaan inti: model proyeksi mana yang paling akurat?

### 2.1 Pilihan pendekatan

| Pendekatan | Cara kerja | Masalah | Dipakai? |
|---|---|---|---|
| Kalkulator CAGR tetap | nilai = setoran × (1+r)^t | Satu angka, seolah pasti; tanpa risiko | ✗ (hanya pembanding) |
| Backtest rolling | ulang sejarah dari tiap bulan mulai | Bukan proyeksi; sampel kecil; survivorship | ✓ sebagai tab "Sejarah" |
| Monte Carlo normal (GBM) | return acak berdistribusi normal | Meremehkan crash (ekor tipis); butuh rata-rata yang tidak diketahui | ✗ |
| Bootstrap iid | ambil acak bulan-bulan sejarah | Ekor tebal terjaga, tapi crash berurutan (2008, 1998) terpecah | ✗ |
| **Stationary block bootstrap** (Politis & Romano 1994) | ambil *blok* bulan berurutan dengan panjang acak (rata-rata 12 bln), bulan yang sama untuk semua aset | Masih terikat sejarah yang ada | **✓ bentuk distribusi** |
| GARCH / regime-switching | model volatilitas berubah-ubah | Lebih kompleks, banyak parameter; untuk DCA bulanan manfaatnya kecil | nanti, jika perlu |
| Rata-rata return dari sejarah | mean 10–20 thn terakhir | **Sumber error terbesar** (§3.3): rata-rata sampel sangat bising dan mengikuti era | ✗ untuk mode utama |
| **Capital market assumptions (CMA)** | return ke depan dari *building blocks*: yield + pertumbuhan + perubahan valuasi | Butuh penilaian; diperbarui 1–2×/tahun | **✓ titik tengah** |

### 2.2 Model terpilih

```
log-return bulanan historis (Rupiah dipecah: return lokal + kurs USD/IDR)
        │
        ├─ geser rata-rata tiap komponen → target CMA (mode dasar / konservatif)
        │  (volatilitas, skew, crash, autokorelasi, korelasi: TIDAK diubah)
        ▼
stationary block bootstrap, 5.000 jalur × N bulan
        ▼
mekanika DCA yang sama dengan backtest: setor awal bulan → biaya beli → return →
pajak dividen asing → rebalance tahunan (opsional) → di akhir: biaya jual + pajak final
        ▼
distribusi: nilai akhir (nominal & riil), XIRR, max drawdown, rugi-vs-setoran,
P(rugi), P(kalahkan deposito), P(capai target), setoran yang dibutuhkan untuk keyakinan 80/90%
```

Detail penting:
- **Kurs dipisah.** S&P 500 dalam Rupiah = return USD + pelemahan Rupiah. Masing-masing di-recenter
  sendiri (CMA saham AS ≠ asumsi kurs), dan korelasinya (Rupiah melemah saat krisis) tetap terjaga.
- **Aset bersejarah pendek di-backfill.** Jendela bootstrap ditentukan aset yang sejarahnya ≥15 thn.
  Bulan sebelum BTC/ETH ada diisi potongan sejarah kripto itu sendiri secara berurutan. Tanpa ini,
  menambah 5% BTC memotong krisis 1998/2008 dari saham. Efeknya terukur: median max drawdown
  portofolio agresif berubah dari -26% menjadi **-37%**.
- **Setoran yang dibutuhkan dihitung pasti, bukan ditebak.** Semua biaya proporsional, jadi nilai
  akhir linear terhadap setoran: `setoran_perlu = target / persentil_(1-q)(nilai akhir per Rp1)`.
  Sudah dites: setoran hasil hitungan untuk keyakinan 80% memang memberi 80,0% ± 1%.
- **Catatan "median XIRR > target" untuk aset sangat volatil.** Untuk BTC (vol ~75%), median XIRR
  DCA 10 thn ≈ 16–19% walau target CAGR-nya 12%+kurs. Ini sifat matematis DCA pada distribusi
  yang sangat miring, bukan bug (sudah diverifikasi dengan data sintetis). Yang perlu ditonjolkan
  di UI untuk aset seperti ini adalah p5 dan P(rugi), bukan median.

### 2.3 Tiga mode asumsi

| Mode | Titik tengah return | Kegunaan |
|---|---|---|
| Historis | rata-rata sejarah apa adanya | "Kalau masa depan mengulang masa lalu." Perbandingan dengan seandainya |
| **Dasar** (default) | CMA (§4) | Proyeksi utama untuk perencanaan |
| Konservatif | CMA dipangkas | Uji ketahanan: "kalau pasar mengecewakan, target masih tercapai?" |

---

## 3. Seberapa akurat? (bukti)

### 3.1 Definisi akurat

Proyeksi 10 tahun tidak bisa tepat ke rupiah. Ukuran yang benar adalah **kalibrasi**: hasil
nyata harus jatuh di pita p5–p95 ~90% kali dan di pita p25–p75 ~50% kali. Kalau tidak, pita yang
ditampilkan menyesatkan: terlalu sempit berarti percaya diri palsu, terlalu bergeser berarti
optimis atau pesimis secara sistematis.

### 3.2 Metode uji (`npm run calibrate`)

Walk-forward: untuk tiap bulan mulai *s* (setiap 3 bln), model **hanya melihat data sebelum s**
(min. 10 thn sejarah), memproyeksikan DCA 5 thn, lalu dibandingkan dengan hasil nyata s..s+59.
PIT = posisi hasil nyata dalam distribusi proyeksi (ideal rata-rata 0,50).

### 3.3 Hasil

| Instrumen (titik uji) | Varian | di p5–p95 (ideal 90%) | di p25–p75 (ideal 50%) | PIT (ideal 0,50) |
|---|---|---|---|---|
| IHSG (86) | rata-rata sejarah, bootstrap iid | 85% | 60% | 0,57 |
| | rata-rata sejarah, block bootstrap | 85% | 65% | 0,57 |
| | **prior netral (≈ mode dasar)** | **94%** | 67% | 0,56 |
| S&P 500 → IDR (42) | rata-rata sejarah, block | 100% | 50% | 0,69 |
| | **prior netral** | **95%** | 36% | 0,78 |
| BBCA (30) | rata-rata sejarah, block | **73%** | 7% | **0,13** ← terlalu optimis |
| | **prior netral** | **93%** | 63% | 0,58 |
| TLKM (29) | rata-rata sejarah, block | 79% | 14% | 0,16 ← terlalu optimis |
| | **prior netral** | **97%** | 48% | 0,28 |
| Emas → IDR (42) | rata-rata sejarah, iid | 90% | 62% | 0,47 |
| | **prior netral** | 81% | 55% | 0,72 |

**Kesimpulan:**
1. Bentuk distribusi dari bootstrap sudah cukup baik (cakupan 73–100% meski meannya salah).
   **Error terbesar ada di rata-rata return**, bukan di model volatilitasnya.
2. Memproyeksikan saham tunggal dengan rata-rata sejarahnya sendiri **berbahaya**: BBCA 2004–2014
   tumbuh luar biasa, model mengira itu berlanjut, kenyataannya melambat. Mode dasar memberi saham
   tunggal ekspektasi = pasar (risiko spesifik perusahaan tidak "dibayar"), dan kalibrasinya
   membaik drastis (PIT 0,13 → 0,58).
3. S&P 500 2011–2021 lebih bagus dari semua varian (PIT 0,69–0,78): dekade luar biasa saham AS.
   Model konsisten "pesimis" di sana, dan itu lebih aman daripada sebaliknya.
4. Keterbatasan: jendela uji saling tumpang tindih, jadi pengamatan independen hanya belasan. Angka
   ini indikatif. Uji akan diulang setiap data diperbarui.

---

## 4. Asumsi per kelas aset

Angka = return majemuk tahunan nominal, **mata uang lokal**. Kurs: Rupiah melemah 2%/thn (dasar),
1%/thn (konservatif). Sejarah 2001–2026 ≈ 1,8%/thn. Inflasi: 3% (dasar), 3,5% (konservatif); target BI 2,5±1%.

| Kelas | Instrumen (data) | Dasar | Konservatif | Basis asumsi | Biaya & pajak di model |
|---|---|---|---|---|---|
| Saham Indonesia | IHSG `^JKSE` (+2,5% proxy dividen), BBCA/BBRI/BMRI/TLKM `.JK` | 9% | 7% | dividend yield ~3% + pertumbuhan laba nominal ~6%; saham tunggal = pasar | beli 0,15%; jual 0,25% (termasuk PPh final 0,1%); dividen bebas PPh jika diinvestasikan ulang ≥3 thn (UU HPP) |
| Saham AS | S&P 500 `SPY`, Nasdaq-100 `QQQ` (adj. close) | 5,5% | 4% / 3,5% | Vanguard VCMM Jan 2026: saham AS 3,9–5,9%/thn (10 thn); J.P. Morgan LTCMA 2026: 60/40 USD 6,4% | beli/jual 0,3% (komisi + spread kurs); dividen dipotong 15% (treaty AS–RI, W-8BEN) |
| Emas | `GC=F` → IDR | 4% | 2,5% | ≈ inflasi USD + ~1,5% | spread ~3% pulang-pergi |
| Kripto | `BTC-USD`, `ETH-USD` | 12% | 3% / 0% | **tidak ada jangkar valuasi**: ini asumsi skenario, bukan estimasi | fee 0,2%/sisi + PPh final 0,21% saat jual (exchange domestik, PMK 50/2025; 1% di exchange luar negeri; PPN dihapus) |
| Pasar uang | RD Pasar Uang (model) | 4,75% | 4% | yield RDPU bersih biaya MI | tidak ada; imbal hasil RD bukan objek PPh bagi investor |
| Obligasi negara | SBN Ritel ORI/SR (model) | 5,4% | 5% | kupon ~6% − PPh final 10% | dipegang sampai jatuh tempo |
| Pembanding | Deposito (model) | 3% | 2,5% | bunga ~3,75% − PPh final 20% | – |

Catatan per kelas:
- **Saham Indonesia**: `^JKSE` adalah indeks *harga*, jadi dividen ditambahkan sebagai proxy. Untuk
  produksi lebih baik pakai indeks total return (IDX menerbitkan versi TR) atau NAB reksa dana indeks.
- **Saham AS**: risiko kurs tidak di-hedge, dan justru menguntungkan investor Rupiah dalam jangka panjang.
  Belum dimodelkan: biaya kustodian/platform tertentu, pajak estate AS untuk holding besar.
- **Kripto**: volatilitas BTC sudah turun dari ~80–100% (2014–2018) ke ~45–55% (2022–2026), tapi
  bootstrap masih memakai seluruh sejarah, sehingga ekor atas (p95) terlalu lebar. **Rencana**:
  skala volatilitas ke rezim terakhir. Rekomendasi tetap membatasi kripto ≤10%.
- **RDPU/SBN/deposito** belum punya seri historis di backtest (memakai tingkat 2026 yang konstan),
  sehingga statistik "kalahkan inflasi" mereka di backtest belum bisa dipakai. **Rencana**: ambil
  BI Rate / JIBOR / yield SBN historis.
- **Angka CMA perlu ditinjau 1×/tahun** (Vanguard & JPM rilis tiap Q4/Q1). Semuanya ada di satu
  file: `src/lib/sim/assumptions.ts`.

---

## 5. Kerangka "manajer investasi"

Yang bisa diprediksi dengan cukup andal: **alokasi aset, biaya, disiplin, dan horizon**. Yang
tidak bisa: saham/koin mana yang naik bulan depan. Jadi rekomendasi aplikasi ini berbentuk
*komposisi dan rencana*, bukan sinyal beli.

**Alur:**
1. **Dana darurat dulu.** Kalau < 6× pengeluaran bulanan, 100% setoran masuk RDPU sampai terpenuhi.
   Datanya bisa diambil langsung dari House of N&N.
2. **Profil**: horizon pemakaian dana + toleransi rugi + stabilitas pendapatan → level risiko
   (diambil yang paling ketat).
3. **Portofolio model** (draft, untuk didiskusikan):

| Level | RDPU | SBN | IHSG | S&P 500 | Nasdaq | Emas | BTC | ETH | Median max DD (proyeksi) |
|---|---|---|---|---|---|---|---|---|---|
| Konservatif | 40 | 30 | 15 | 15 | | | | | -7% |
| Moderat | 15 | 20 | 25 | 30 | | 10 | | | -17% |
| Bertumbuh | 5 | 10 | 30 | 40 | | 10 | 5 | | -28% |
| Agresif | | | 35 | 35 | 10 | 10 | 7 | 3 | -37% |

4. **Core–satellite untuk yang ingin pilih saham**: inti = indeks (≥80%); satelit saham pilihan
   ≤20% total, ≤10% per emiten. Di proyeksi, saham pilihan diberi ekspektasi = pasar tapi
   volatilitasnya sendiri, sehingga pengguna melihat bahwa ia menanggung risiko lebih tanpa
   jaminan return lebih.
5. **Proyeksi + target**: "Untuk Rp500 jt di 2031 dengan keyakinan 80%, setor Rp X/bln."
6. **Rebalancing tahunan** & **review**: bandingkan realisasi dengan pita proyeksi. Kalau keluar
   pita, beri tahu alasannya, jangan langsung menyuruh ganti strategi.

Untuk DCA vs lump sum: riset Vanguard menunjukkan lump sum mengalahkan DCA ~2/3 waktu karena pasar
lebih sering naik. Tapi bagi yang investasinya dari gaji bulanan, DCA bukan pilihan timing,
melainkan satu-satunya cara. Aplikasi sebaiknya menjelaskan ini ketika user punya dana besar
sekaligus.

---

## 6. Hasil awal (data s.d. Sep 2026)

DCA Rp1 jt/bln × 10 thn (setor Rp120 jt), mode **dasar**, 5.000 jalur:

| | Nilai akhir p5 | p50 | p95 | Riil p50 | XIRR p50 | P(rugi) | Median max DD | Setoran utk Rp200 jt @80% |
|---|---|---|---|---|---|---|---|---|
| RD Pasar Uang | 152 jt | 153 jt | 154 jt | 114 jt | 4,8% | 0% | 0% | Rp1,31 jt |
| IHSG | 84 jt | 202 jt | 510 jt | 150 jt | 10,0% | 16% | -51% | Rp1,55 jt |
| BBCA | 103 jt | 194 jt | 391 jt | 144 jt | 9,2% | 11% | -40% | Rp1,44 jt |
| S&P 500 | 101 jt | 182 jt | 301 jt | 135 jt | 8,1% | 12% | -33% | Rp1,48 jt |
| Emas | 104 jt | 161 jt | 269 jt | 120 jt | 5,7% | 14% | -31% | Rp1,56 jt |
| Bitcoin | 38 jt | 332 jt | 7,8 M | 247 jt | 19,3% | 26% | -88% | Rp2,11 jt |
| **Port. moderat** | 134 jt | 179 jt | 247 jt | 133 jt | 7,8% | 1% | -17% | Rp1,30 jt |
| **Port. bertumbuh** | 133 jt | 209 jt | 572 jt | 156 jt | 10,7% | 2% | -28% | Rp1,21 jt |

Pelajaran dari angka ini:
- Portofolio campuran memberi **p5 jauh lebih tinggi** dari aset tunggal mana pun selain RDPU.
  Dengan setoran yang dibutuhkan hampir sama, risiko rugi turun dari ~15% ke ~1–2%.
- Bitcoin: setoran yang dibutuhkan untuk keyakinan 80% justru **paling besar** (Rp2,11 jt), karena
  sebarannya sangat lebar. Median tinggi tidak berarti rencana yang andal.
- Bandingkan dengan **backtest** (cara seandainya): BBCA median XIRR 19,5%, BTC 76,7%. Angka sejarah
  ini yang membuat orang terlalu optimis.

---

## 7. Platform (Vercel)

| Lapisan | Pilihan | Alasan |
|---|---|---|
| App | Next.js 16 + React 19 + Tailwind 4 (sama seperti House of N&N) | satu stack, bisa berbagi komponen & auth |
| Mesin simulasi | `src/lib/sim/*` TypeScript murni, jalan di **browser (Web Worker)** | 5.000 jalur ~0,5 dtk/skenario; gratis, tanpa beban server |
| Data harga | `data/prices.json` (~100 KB) diperbarui **bulanan via Vercel Cron** → Vercel Blob | sumber gratis (Yahoo + FRED); tanpa database |
| Asumsi CMA | file versi-terkontrol `assumptions.ts`, ditinjau tahunan | transparan & bisa diaudit |
| Skenario user | localStorage dulu (seperti seandainya); nanti sinkron ke Sheet/House of N&N | sederhana |
| Integrasi | baca saldo dana darurat & pengeluaran rata-rata dari House of N&N | rekomendasi berbasis kondisi nyata |

Halaman (konsep, desain menyusul): **Rencana** (target + profil → portofolio + setoran) ·
**Proyeksi** (fan chart p5–p95, peluang target, 3 mode) · **Sejarah** (backtest rolling seperti
seandainya) · **Bedah instrumen** · **Bongkar asumsi** (semua angka & sumber dibuka, mengikuti
semangat seandainya).

---

## 8. Keterbatasan & langkah berikut

**Belum ditangani:**
- seri historis suku bunga (RDPU/SBN/deposito) untuk backtest;
- skala volatilitas kripto ke rezim terkini;
- indeks total return IHSG (sekarang memakai proxy +2,5%);
- krisis 1997–98 dalam Rupiah untuk aset USD (data kurs baru mulai 2001; bisa diisi dari FRED);
- pajak/biaya platform spesifik (Bibit, Ajaib, Gotrade, Indodax, Pintu, …);
- fungsi deaccumulation (penarikan rutin setelah target tercapai).

**Perlu keputusanmu** (bisa dibahas bareng sesi desain):
1. Nama & positioning: "mesin waktu ke depan" sebagai pasangan seandainya, atau fitur di House of N&N?
2. Portofolio model & batas kripto di §5: sudah sesuai pandanganmu?
3. Daftar instrumen awal: perlu LQ45/IDX30, MSCI World, RDPT, USD cash seperti seandainya?
4. Publik (bisa dipakai siapa saja) atau privat keluarga (login seperti House of N&N)?

---

## Sumber

- seandainya.vercel.app: halaman simulasi, "Bongkar hitungan", "Bedah instrumen" (diakses 23 Okt 2026)
- Politis, D. & Romano, J. (1994). *The Stationary Bootstrap*. JASA 89(428)
- [Vanguard — Setting realistic expectations (VCMM return forecasts)](https://corporate.vanguard.com/content/corporatesite/us/en/corp/vemo/vemo-return-forecasts.html)
- [J.P. Morgan — 2026 Long-Term Capital Market Assumptions](https://am.jpmorgan.com/us/en/asset-management/per/about-us/media/press-releases/jp-morgan-releases-2026-long-term-capital-market-assumptions/)
- [Pajakku — Tarif pajak kripto PMK 50/2025](https://pajakku.com/artikel/tarif-pajak-jual-beli-kripto-terbaru-menurut-pmk-502025) · [Selular.id — Pajak kripto 0,21% berlaku 1 Agustus 2025](https://selular.id/2025/08/pajak-kripto-021-berlaku-1-agustus-2025-ini-aturan-lengkapnya/) · [Investortrust — DJP soal tarif kripto](https://investortrust.id/market/74324/tarif-pajak-transaksi-kripto-lebih-besar-dari-saham-djp-akan-dicermati-dan-evaluasi)
- [DJP — Dividen bisa tidak kena pajak (UU HPP)](https://www.pajak.go.id/id/artikel/hore-sekarang-dividen-bisa-tidak-kena-pajak-catat-ketentuannya) · [Bisnis — Lapor SPT saham AS](https://ekonomi.bisnis.com/read/20260425/259/1969276/cara-lapor-spt-jika-punya-saham-di-as)
- Data: Yahoo Finance chart API (harian → akhir bulan), FRED `IDNCPIALLMINMEI` (CPI Indonesia), FRED `CCUSMA02IDM618N` (USD/IDR OECD, untuk menambal data kurs Yahoo yang rusak)
- Perlu diverifikasi ulang sebelum produksi: tarif treaty dividen AS–RI 15%, PPh final 0,1% penjualan saham IDX, fee broker aktual, yield RDPU/SBN terkini
