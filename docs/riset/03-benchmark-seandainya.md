# Benchmark: seandainya.vercel.app (28 Okt 2026)

[seandainya.vercel.app](https://seandainya.vercel.app) dibuat oleh Rio Nur Arifin (GitHub [`arifinrio95`](https://github.com/arifinrio95)). Situs ini adalah backtest DCA, dan menjadi inspirasi Cobain.

**Status kode:** tidak ada repo publik (`arifinrio95/seandainya` → 404) dan tidak ada lisensi. Kita hanya mengambil **ide dan rumus**, bukan kode atau teksnya. Semua temuan di bawah dibaca dari bundel JavaScript situs live dan `/data/market-data.json` (data per 29 Agu 2026).

## Cara kerja mesinnya

- **Jendela DCA:** butuh N bulan data berurutan. Setiap bulan unit bertambah sebesar setoran × (1 − biaya beli − ½ spread) / harga, dan di akhir nilainya dikali (1 − biaya jual − ½ spread). Dividen bisa diputar lagi (harga *adjusted*) atau disimpan tunai (0% bunga).
- **Biaya sebenarnya:** domestik 0,15%/0,25%, global 0,15%/0,15%, kripto 0,4% pulang-pergi, spread 0,1%. Modalnya menampilkan "0,2%/0,3%" karena dibulatkan. Halaman "Bedah instrumen" memakai biaya yang sedikit berbeda (0,2%/0,3%; kripto 0,5%). Indeks harga (IHSG, LQ45) dan instrumen model tidak kena biaya.
- **XIRR:** bisection bulanan, lalu dijadikan tahunan. **Riil** = (1 + XIRR) / (1 + inflasi) − 1, dengan inflasi CPI selama jendela.
- **Metrik risiko dihitung dari harga aset, bukan dari perjalanan uang penabung:** volatilitas, Sharpe/Sortino (risk-free tetap 6%), max drawdown, pemulihan, waktu di bawah puncak, VaR/CVaR 95% bulanan.
- **Skor stabilitas** = 100 × [0,35 · %untung + 0,25 · %kalahkan inflasi + 0,20 · (1 − IQR XIRR / 30 poin) + 0,20 · (1 − |median drawdown| / 60%)], dengan setiap komponen dibatasi 0–1. Kalau data inflasinya tidak ada, komponen itu dihitung 0.
- **Instrumen model:** RDPU = deposito − 0,6%; RDPT = deposito + 1% dengan durasi 2,5 tahun; SBN = deposito + 0,75%, pajak kupon 10%, durasi 4 tahun.

## Tabel yang relevan untuk Cobain

1. **Peta hasil per tanggal mulai:** heatmap bulan mulai × instrumen, isinya nilai akhir dan XIRR, plus label otomatis ("PALING STABIL", "PERNAH BONCOS").
2. **Ringkasan per instrumen:** 18 kolom, diurutkan menurut skor stabilitas. Tabungan bank selalu ditampilkan sebagai pembanding dan tidak ikut diperingkat.
3. **Bedah instrumen, tabel per durasi:** semua durasi dari 1 bulan sampai Y tahun, dari semua bulan mulai. Kolomnya: durasi, jumlah titik mulai, total setoran, median nilai akhir, **rentang 80% (P10–P90)**, terendah/tertinggi, % untung, median XIRR, % kalahkan inflasi. Ditambah **"ambang konsistensi"**: durasi terpendek yang dari semua titik mulai (dan semua durasi lebih panjang) selalu berakhir di atas setoran.

## Pola UX yang layak ditiru

- **Hero yang "dibantah sendiri":** dibuka dengan contoh terbaik Bitcoin, lalu langsung bilang itu bukan kesimpulan.
- **Form berbentuk kalimat** ("Aku ingin menyisihkan Rp __ …"), dengan pilihan yang ditulis dalam bahasa awam.
- **"Bukan satu pemenang":** enam vonis bernomor yang dihitung ulang mengikuti isian.
- **"Tiga rasa sakit":** seberapa dalam jatuhnya, berapa lama pulihnya, dan apakah sempat di bawah setoran.
- **Panel transparansi** ("Bongkar mesin hitung") dan label jujur untuk data proxy/model.

## Celah yang diisi Cobain

| Celah di seandainya | Jawaban Cobain |
|---|---|
| Hanya melihat ke belakang | Proyeksi 4.000 masa depan, peluang rugi, dan peluang capai target |
| Jendela yang tumpang tindih diperlakukan independen, sejarah pendek (BTC 143 bulan) | Block bootstrap + uji kalibrasi walk-forward + label keandalan |
| Rata-rata sejarah = harapan | Asumsi pasar ke depan (CMA). Sejarah hanya untuk bentuk naik-turunnya |
| Setoran tetap, tanpa target/portofolio | Setoran naik per tahun, target, setoran yang dibutuhkan, dan campuran yang diseimbangkan ulang |
| Risiko dari harga aset | Drawdown dan "di bawah setoran" dihitung dari perjalanan uang penabung |
| CPI berhenti Apr 2025, tanpa peringatan | Inflasi berupa asumsi yang tertulis jelas (3%) |
| Pajak dividen asing tidak memotong nilai | Pajak dividen AS 15% memotong return setiap bulan |
| Biaya berbeda antarhalaman | Satu sumber biaya per instrumen (`src/lib/market/classify.ts`) |

**Ide yang diadopsi ke tabel "tahun demi tahun" Cobain:** rentang 80% bergaya P10–P90, % untung per durasi, dan perbandingan langsung **sejarah vs proyeksi** per tahun. "Ambang konsistensi" dari sejarah diterjemahkan jadi momen penting di proyeksi (misalnya "peluang rugi turun di bawah 10 dari 100").
