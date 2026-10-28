# UI/UX tabel proyeksi keuangan (28 Okt 2026)

Riset untuk tabel **"Tahun demi tahun"** Cobain: cara menyajikan proyeksi bertahun-tahun ke investor awam, terutama di layar ponsel. Bagian "Diterapkan di Cobain" menunjukkan keputusan yang diambil; sumber bernomor ada di bawah.

## 1. Kolom & format angka

| Temuan | Diterapkan di Cobain |
|---|---|
| Kolom terpenting di depan, kolom yang berkaitan berdampingan, kolom pertama berupa penanda baris yang terbaca [6]. Investor pemula butuh angka sederhana dulu, rinciannya satu ketukan lagi [7]. | **4 kolom default:** Tahun, Total setoran, Perkiraan nilai (+ rentang separuh kemungkinan), Peluang (target kalau ada, kalau tidak peluang rugi). Ditambah kolom Sebaran. **"Lihat rincian"** membuka apes/bawah/tengah/atas/hoki, daya beli, hasil investasi tahun ini, tumbuh per tahun, dan kata sejarah. |
| Angka rata kanan, header-nya juga [1][2][3]; digit sejajar dengan `tabular-nums` [4]. | Kolom angka rata kanan, dengan `font-variant-numeric: tabular-nums`. |
| Hindari presisi palsu; FCA membulatkan proyeksi ke ±3 angka penting [16]. | `rupiahWords` maksimal 3 angka penting, dalam kata ("Rp1,21 miliar"), tanpa singkatan yang ambigu. |

## 2. Pola mobile: tetap tabel, bukan kartu

- Kolom pertama dan header dikunci, tabel digeser di dalam wadahnya sendiri, dan kolom yang terpotong di tepi menandakan masih ada isi di kanan [5][6]. Kartu bertumpuk cocok untuk direktori, tidak untuk angka yang dibandingkan antar-baris [2]. Aplikasi Vanguard memakai tabel yang digeser [7].
- Kolom rincian dibuka bertahap (*progressive disclosure*) [8].
- Untuk horizon panjang: tampilkan tahun penting dulu (1, separuh periode, akhir), mengikuti titik waktu PRIIPs [18].

**Diterapkan:** kolom Tahun `sticky`; wadah `role="region"` yang bisa difokus dan digeser keyboard. Lebih dari 10 tahun → tahun 1, 3, 5, 10, separuh, akhir, plus tahun momen penting, dengan tombol "Semua N tahun".

## 3. Ketidakpastian di dalam tabel

- Fan chart paling baik menyampaikan perkiraan tengah sekaligus ketidakpastiannya, dan publik cenderung meremehkan ketidakpastian [14]. Jangan pernah menampilkan median sendirian.
- **Skenario terbaik/standar/terburuk wajib** di simulasi pemasaran produk keuangan (SEOJK 12/SEOJK.07/2014) [19]. PRIIPs dulu memakai persentil 10/50/90 [18]. Label persentil harus jelas, karena "buruk" berbeda-beda antarpenyedia (Schwab/Fidelity P10, J.P. Morgan P5) [22].
- Sebutkan kedua sisi peluang dengan penyebut yang sama ("8 dari 100 rugi, 92 tidak") [13].

**Diterapkan:**
- Bar sebaran di setiap baris, dengan sumbu bersama supaya terlihat melebar:
  - pita P5–P95 dan P25–P75
  - titik tengah
  - garis total setoran
  - garis target
  - tanda › bila hoki keluar skala

  Setiap bar punya teks pengganti untuk pembaca layar.
- Pilihan versi **Apes (P5) / Tengah (P50) / Hoki (P95)**, dengan penjelasan "5 dari 100 masa depan lebih jelek dari ini".
- Peluang ditulis "62 dari 100" + "38 belum nyampe".

## 4. Disclaimer & label regulator

| Sumber | Inti | Teks di Cobain |
|---|---|---|
| FINRA 2214 [15] | Proyeksi bersifat hipotetis, tidak mencerminkan hasil nyata, bukan jaminan; jelaskan metode, batasan, asumsi; hasil bisa berubah | "Hanya simulasi, bukan jaminan hasil. Angka-angka ini hipotetis, bukan hasil investasi nyata… Hasilnya bisa berubah kalau datanya diperbarui." |
| PRIIPs [18] | Hasil bergantung pada pasar ke depan yang tidak bisa diprediksi; tampilkan nominal dan imbal hasil per tahun setelah biaya | Kolom nilai sudah dipotong biaya & pajak, plus kolom "Tumbuh per tahun" |
| FCA COBS 13 [16][17] | Tampilkan dalam nilai riil, peringatan inflasi, "bisa dapat kembali lebih sedikit". Sebutkan jendela data di balik asumsi (pelajaran dari PRIIPs yang menyesatkan setelah tahun-tahun bagus) | Kolom "Daya beli hari ini", wawasan inflasi, periode data ditulis di disclaimer |
| OJK: POJK 22/2023 [21], POJK 6/2026 [20] | Jelas, akurat, jujur, tidak menyesatkan; simulasi imbal hasil menunjukkan rumus dan disebut simulasi, tanpa janji untung pasti | Link "Lihat rumus & cara ngitungnya" ke `/metodologi` di setiap tabel |

## 5. Aksesibilitas (checklist)

- `<table>` + `<caption>` [1][9]
- `th scope="col"` untuk kolom dan `th scope="row"` untuk tahun [9]
- Wadah geser `role="region" tabindex="0" aria-labelledby` [10][2]
- Tabel data dikecualikan dari reflow 1.4.10, tapi kontrol di sekitarnya tidak [11]
- Kolom menempel tidak boleh menutupi sel yang difokus; pakai `scroll-padding` (C43) [12]
- Bar punya teks pengganti; warna bukan satu-satunya penanda (baris momen penting diberi ikon bintang + teks)
- Tombol `aria-expanded`, target sentuh ≥ 44 px, `lang="id"`

**Hasil uji 28 Okt 2026:** axe-core bersih (desktop, 390 px, mode gelap); panah kanan menggeser tabel dan kolom tahun tetap di tempat; slider setoran memperbarui tabel seketika.

## 6. Baris wawasan

Ide [13][14][16], diterapkan sebagai **momen penting** yang dideteksi otomatis (`src/lib/app/yearly.ts`), ditambah wawasan di atas tabel:
- Hasil investasi setahun melewati setoran setahun ("bunga berbunga mulai kerasa")
- Peluang rugi tinggal separuh, lalu turun di bawah 10 dari 100
- Bahkan versi apes sudah tidak rugi
- Versi tengah 2× lipat setoran
- Peluang target ≥ 50 dari 100, lalu ≥ 80 dari 100
- Nilai akhir dalam uang hari ini (selisih inflasi)
- Sejarah vs proyeksi ("di masa lalu 100 dari 100 untung; ke depan kita hitung 88")
- "Jarak apes ke hoki melebar tiap tahun; itu normal"

## Sumber

1. GOV.UK Design System, Table: https://design-system.service.gov.uk/components/table/
2. U.S. Web Design System, Table: https://designsystem.digital.gov/components/table/
3. Alberta Design System, angka di tabel: https://design.alberta.ca/examples/display-numbers-in-a-table-so-they-can-be-scanned-easily
4. MDN, `font-variant-numeric`: https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric
5. NN/g, Mobile Tables: https://www.nngroup.com/articles/mobile-tables/
6. NN/g, Data Tables: https://www.nngroup.com/articles/data-tables/
7. NN/g, Vanguard mobile app: https://www.nngroup.com/articles/vanguard-mobile-app/
8. IBM Carbon, Data table usage: https://carbondesignsystem.com/components/data-table/usage/
9. W3C WAI, Tables Tutorial: https://www.w3.org/WAI/tutorials/tables/
10. Adrian Roselli, Under-Engineered Responsive Tables: https://adrianroselli.com/2020/11/under-engineered-responsive-tables.html
11. WCAG 2.2, Understanding Reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
12. WCAG 2.2, Focus Not Obscured: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
13. Spiegelhalter, Pearson & Short (2011), *Visualizing uncertainty about the future*, Science: https://www.stat.berkeley.edu/users/aldous/157/Papers/spiegelhalter_visualizing.pdf
14. Bank of England working paper (2026), *Anchors aweigh*: https://www.bankofengland.co.uk/working-paper/2026/anchors-aweigh-the-effect-of-communicating-forecast-uncertainty
15. FINRA Rule 2214: https://www.finra.org/rules-guidance/rulebooks/finra-rules/2214
16. FCA Handbook COBS 13 Annex 2: https://handbook.fca.org.uk/handbook/COBS/13/Annex2.html
17. FCA CP21/23 (PRIIPs): https://www.fca.org.uk/publications/consultation-papers/cp21-23-priips-proposed-scope-rules-amendments-regulatory-technical-standards
18. Ringkasan metodologi skenario PRIIPs (Deloitte): https://www.deloitte.com/lu/en/Industries/investment-management/blogs/priips-rts-calculation-methodology-for-performance-scenarios.html. Teks EUR-Lex tidak bisa diakses langsung saat riset.
19. SEOJK 12/SEOJK.07/2014, bagian VI.h: https://www.ojk.go.id/id/regulasi/Documents/Pages/SEOJK-tentang-Penyampaian-Informasi-dalam-Rangka-Pemasaran-Produk-dan-atau-Layanan-Jasa-Keuangan/SEOJK%2012.%20Penyampaian%20Informasi%20Dalam%20Rangka%20Pemasaran%20Produk.pdf. Statusnya di bawah kerangka POJK 22/2023 perlu dicek ulang.
20. POJK 6/2026 (Katadata; detail pasal simulasi dari sumber sekunder): https://katadata.co.id/finansial/keuangan/6a3b96900cb74/ojk-perketat-influencer-keuangan-ini-poin-poin-aturan-pojk-6-tahun-2026
21. OJK, Pedoman Iklan Jasa Keuangan / POJK 22/2023: https://ojk.go.id/id/berita-dan-kegiatan/info-terkini/Pages/OJK-Menerbitkan-Pedoman-Iklan-Jasa-Keuangan.aspx
22. Definisi skenario buruk: Schwab Goal Tracker, Fidelity, J.P. Morgan MAPS (dari kutipan pencarian; halaman tidak bisa diambil langsung)
