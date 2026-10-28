# Cobain — Keputusan UX, aksesibilitas & standar

Nama aplikasi: **Cobain** (sejak 23 Okt 2026; sebelumnya "Coba-coba", dan "Prakira" di v1).

## v3 (28 Okt 2026): tabel "Tahun demi tahun"

Permintaan: analisis lebih dalam untuk periode beberapa tahun ke depan, dengan UI/UX sesuai standar. Rinciannya ada di [riset 04](../riset/04-uiux-tabel-proyeksi.md) dan [benchmark seandainya](../riset/03-benchmark-seandainya.md).

- **Tabel sungguhan** dengan kolom Tahun menempel. Wadah geser bisa difokus keyboard. Isinya 4 kolom default + "Lihat rincian" (10 kolom lagi), dan horizon di atas 10 tahun menampilkan tahun penting dulu.
- **Ketidakpastian di setiap baris:** bar sebaran bersumbu sama (apes, separuh kemungkinan, tengah, setoran, target), versi Apes/Tengah/Hoki (SEOJK 12/2014), dan peluang dalam bentuk "x dari 100".
- **Momen penting otomatis** sebagai baris di dalam tabel (ikon + teks), plus wawasan inflasi dan **sejarah vs proyeksi**.
- **Disclaimer** gaya FINRA 2214 / POJK, dengan link ke rumus. Ekspor **CSV** berpemisah titik koma untuk Excel Indonesia.
- Tabel lama di bawah grafik dihapus. Tabel baru menjadi satu-satunya padanan teks grafik.

## v2 (23 Okt 2026): Coba-coba

Masukan pengguna atas v1 ("Prakira"): copy terlalu banyak dan kaku, hasil kurang interaktif, desain kaku. Perubahan:

| Masukan | Yang dikerjakan |
|---|---|
| Copy kayak ngobrol, ELI5 | Semua teks ditulis ulang santai & pendek ("Kalau lagi apes / lagi hoki", "Siap-siap turun", "Kocok kayak kartu"). Setiap angka penting punya satu kalimat ELI5 + tombol "Maksudnya?" untuk analogi (roller coaster, 100 orang yang nabung persis kayak kamu). |
| Hasil interaktif | Slider setoran di kartu hasil (instan, tanpa server). Tombol "Pakai angka ini" di kartu target. Versi Normal / Pas seret / Kayak dulu. Grafik menggambar masa depan yang dipilih. |
| Simulasi kemungkinan lebih interaktif + ELI5 | Grid 100 titik = 100 jalur simulasi sungguhan (persentil 0,5%…99,5%). Ketuk/keyboard untuk membuka **cerita**: anjlok berapa, kapan, mirip kejadian sejarah apa (krisis 2008, taper tantrum 2013, ambruknya kripto 2018, guncangan MSCI 2026), berapa lama pulih, dan pelajarannya. Tombol **Lempar dadu** memilih masa depan acak. |
| Kenaikan setoran fleksibel | Input bebas 0–20% (desimal boleh), tombol − / +, pintasan 5% & 10%. Dihitung ulang otomatis 0,5 dtk setelah berhenti mengetik. |
| Ikon menarik dari JS, nama "Coba-coba" | 13 ikon 3D three.js (`scripts/icons3d`, `npm run icons`): dadu (logo & ikon aplikasi), tiga dadu, saham, kripto, emas, keranjang, dunia, celengan, sertifikat, tunas, awan, kilat, bendera. Nama dari "Monte Carlo" = lempar dadu. |
| Desain ala Monzo, original & niche | Hero koral berani, kartu biru malam, permen 3D, Bricolage Grotesque untuk judul + Atkinson Hyperlegible untuk isi, kartu membulat 28px dengan warna lembut per makna. |

Hasil uji v2: 24 tes lulus; axe-core WCAG 2.2 AA bersih di halaman awal, hasil, metodologi (terang & gelap, desktop & 390px); tidak ada scroll horizontal; interaksi lempar dadu, grid keyboard, slider, dan "Pakai angka ini" dicek otomatis (target tepat 80 dari 100 setelah memakai setoran yang disarankan).

Token v2: halaman `#EEF1F8`, kartu `#FFFFFF`, tinta/biru malam `#121A45`, koral `#FF4436` (teks biru malam di atasnya 4,87:1), kuning mentega `#FFC83D`, mint `#2ED4A0`, lilac `#9D8AFF`, langit `#4DA3FF`. Mode gelap punya nilai sendiri, termasuk warna "terpilih" kuning mentega.

---

## v1 (arsip)

Nama "Prakira" (dari *prakiraan*) adalah nama kerja. Konsepnya: prakiraan cuaca untuk uang. Peluang
disajikan seperti "70% peluang hujan", bukan janji.

## Alur

| Alur yang diminta | Yang dibangun | Perubahan & alasan |
|---|---|---|
| 1. Cari instrumen | Combobox pencarian + 6 pilihan populer | **Ditambah pilihan populer** (Hick's law: kebanyakan orang mencari hal yang sama). Listing BEI didahulukan ("bbca" → BBCA.JK, bukan ETF Kanada). Kata lokal dikenali: "emas", "ihsg", "pasar uang", "sbn". |
| 2. Isi setoran per bulan | Nominal + **durasi** + opsi target & kenaikan setoran | **Durasi wajib ditambahkan**: proyeksi tanpa horizon tidak bermakna. Target & kenaikan setoran disembunyikan di "opsional" (*progressive disclosure*). |
| 3. Proyeksi | Kalimat hasil → 100 kemungkinan → 4 fakta → grafik → kondisi terkini → "Kenapa angkanya begini?" | Hasil dalam **frekuensi alami** ("12 dari 100"), bukan persen atau istilah teknis. Penjelasan bertingkat: ringkas di permukaan, langkah lengkap di dalam *details*, metodologi + uji ketepatan di halaman sendiri. |
| 4. Rekomendasi 3–5 instrumen | 3–6 alternatif dalam 3 kelompok (sejenis, lebih tersebar, pembanding aman) | Setiap alternatif dihitung ulang dengan **setoran & durasi yang sama**, plus kalimat perbandingan otomatis dari angka dan data terkini (1 tahun terakhir, jarak dari puncak). Satu klik membuka proyeksi alternatif itu. |

Perbaikan alur lainnya:
- **Satu halaman, form tetap terlihat** (desktop: sticky di kiri). Mengubah sesuatu tidak perlu kembali ke langkah awal. Ini juga menghindari *redundant entry* (WCAG 3.3.7).
- **Hidup setelah hasil pertama.** Mengubah nominal atau target memperbarui hasil seketika tanpa server (nilai akhir linear terhadap setoran). Mengubah durasi, skenario, atau instrumen langsung menghitung ulang; hasil lama diredupkan, bukan diganti skeleton.
- **URL = isian** (`/?s=BBCA.JK&m=1000000&y=10&target=…`): bisa dibagikan, dan muat ulang tidak menghapus pekerjaan.
- **Skenario** (Wajar / Hati-hati / Seperti masa lalu) diletakkan di atas hasil, bukan di form. Ini cara paling cepat untuk melihat seberapa sensitif hasil terhadap asumsi.

## UX laws yang diterapkan

| Hukum | Penerapan |
|---|---|
| Jakob's law | Kotak cari seperti mesin pencari; peluang seperti prakiraan cuaca; form 2 langkah bernomor. |
| Hick's law | 6 chip populer, 4 preset nominal, 4 preset durasi; opsi lanjutan disembunyikan. |
| Fitts's law | Semua target sentuh ≥ 44px; tombol utama 56px dan selebar form. |
| Miller's law / chunking | Hasil dipecah: 1 kalimat utama, 1 visual, 4 fakta, lalu detail. |
| Doherty threshold (<400 ms) | Perubahan nominal/target instan (0 panggilan server); proyeksi baru ±0,6 dtk dengan status "Menghitung…". |
| Tesler's law | Kurs, biaya, pajak, dividen, dan inflasi dihitung sistem; pengguna cukup isi 3 hal. |
| Postel's law | Nominal diterima dalam berbagai bentuk: 1000000, 1.000.000, Rp 1.000.000, 1jt, 1,5 juta, 500rb. |
| Serial position | Jawaban utama di awal; alternatif yang bisa ditindaklanjuti di akhir. |
| Von Restorff | Satu angka besar (kemungkinan tengah); risiko tinggi diberi warna rugi + teks. |
| Goal-gradient | Indikator langkah berubah jadi centang saat terisi. |
| Peak-end | Akhir halaman berisi blok target (setoran yang dibutuhkan) dan alternatif, bukan disclaimer saja. |
| Aesthetic-usability | Satu keluarga huruf, satu aksen, tanpa dekorasi; kesederhanaan visual menjaga kepercayaan. |

## Standar internasional

- **WCAG 2.2 AA.** Kontras teks ≥ 4,5:1 (dihitung untuk setiap token, terang & gelap), elemen UI ≥ 3:1, fokus selalu terlihat (2.4.7/2.4.11), target ≥ 24px (2.5.8; kami pakai 44px), label & instruksi (3.3.2), identifikasi error + saran perbaikan (3.3.1/3.3.3), label terlihat ada dalam nama aksesibel (2.5.3), tidak bergantung warna (1.4.1: bentuk berbeda untuk rugi/untung/target), reflow 320px tanpa scroll horizontal (1.4.10), *reduced motion* & *forced colors* dihormati.
- **Audit axe-core 4.10** (WCAG 2.0/2.1/2.2 A & AA + best practice): 0 pelanggaran pada halaman awal, hasil (terang & gelap), ponsel 390px, dan metodologi.
- **WAI-ARIA APG.** Pola Combobox (listbox popup, `aria-activedescendant`, panah/Enter/Escape). Grup radio untuk durasi & skenario. Live region untuk status pencarian, perhitungan, dan nilai grafik saat dinavigasi keyboard. Setiap grafik punya padanan tabel.
- **ISO 9241-110 (prinsip dialog).** Kesesuaian dengan tugas, keterjelasan diri, kesesuaian dengan harapan, toleransi kesalahan, dan kemudahan dipelajari tercermin di alur di atas.
- **ISO 24495-1:2023 (plain language).** Kalimat aktif, istilah sehari-hari ("turun di tengah jalan", bukan "max drawdown"; "tumbuh per tahun", bukan "XIRR"), dan angka dalam kata ("Rp195 juta").
- **Komunikasi risiko.** Frekuensi alami dan *icon array* (Gigerenzer & Hoffrage 1995; Galesic, Garcia-Retamero & Gigerenzer 2009). Ketidakpastian ditampilkan sebagai rentang, bukan satu angka.
- **Dataviz.** Palet hasil divalidasi untuk buta warna (all-pairs ΔE ≥ 9,6 terang); satu sumbu; garis tipis; tooltip tidak menyembunyikan data; pita yang terpotong diberi tahu.

## Desain visual

| Token | Nilai | Catatan |
|---|---|---|
| Huruf | Atkinson Hyperlegible Next | Braille Institute; huruf & angka mudah dibedakan (0/O, 1/l) |
| Tinta | `#10173A` / gelap `#EEF0F8` | 17,4:1 / 15,1:1 |
| Aksen (nila) | `#2E3FA3` / gelap `#A9B4FF` | warna tarum/nila khas Indonesia; tombol 8,9:1 |
| Halaman | `#F3F6FA` / gelap `#0D1122` | langit pagi / malam |
| Rugi / untung / target | `#D03B3B` / `#2A78D6` / `#1BAF7A` | lolos validator CVD; cincin / lingkaran / belah ketupat |

Elemen khas: **grid 100 kemungkinan**, urut dari terburuk (kiri atas) ke terbaik (kanan bawah). Sisanya sengaja tenang.

## Belum dikerjakan / untuk diskusi

- Uji dengan pengguna nyata (5 orang cukup untuk menemukan ~85% masalah usability) dan pembaca layar sungguhan (NVDA/VoiceOver).
- Bahasa Inggris, akun/simpan skenario, integrasi House of N&N (dana darurat → saran urutan).
- Nama & logo final.
