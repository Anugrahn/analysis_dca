# Peta dokumentasi Cobain

Semua yang perlu diketahui tentang Cobain, dikelompokkan menurut kegunaannya. Kode adalah sumber kebenaran untuk *apa* yang dilakukan aplikasi; dokumen di sini menjelaskan *kenapa*.

## Riset (`riset/`)

Kenapa modelnya seperti ini, dan buktinya.

| Dokumen | Isi |
|---|---|
| [01 · Riset awal & desain model](riset/01-riset-awal-dan-desain-model.md) | Bedah seandainya v1, pilihan model (block bootstrap + CMA), uji kalibrasi pertama, asumsi per kelas aset |
| [02 · Riset model & pandangan investasi](riset/02-riset-model-dan-pandangan-investasi.md) | Literatur (Fama-French, Anarkulova dkk., Goyal-Welch), uji "tuas" keputusan investasi, konteks MSCI 2026 |
| [03 · Benchmark seandainya](riset/03-benchmark-seandainya.md) | Cara kerja mesin seandainya (rumus, biaya, skor stabilitas), tabelnya, dan celah yang diisi Cobain |
| [04 · UI/UX tabel proyeksi keuangan](riset/04-uiux-tabel-proyeksi.md) | Standar tabel data, pola mobile, komunikasi ketidakpastian, aturan regulator (FCA, PRIIPs, FINRA) |

## Produk (`produk/`)

Keputusan desain dan pengalaman pengguna.

| Dokumen | Isi |
|---|---|
| [UX & aksesibilitas](produk/ux-dan-aksesibilitas.md) | Alur, UX laws, WCAG 2.2, token desain, riwayat versi (Prakira → Coba-coba → Cobain) |

## Operasional (`operasional/`)

Menjalankan dan merawat aplikasi live.

| Dokumen | Isi |
|---|---|
| [Deploy & infrastruktur](operasional/deploy-dan-infra.md) | Vercel, domain, firewall/rate limit, cache, sumber data, keamanan |

## Skill agen (`../.claude/skills/`)

Alur kerja berulang, ditulis supaya agen AI (atau manusia) menjalankannya dengan cara yang sama setiap kali.

| Skill | Kapan |
|---|---|
| [`cobain-rilis`](../.claude/skills/cobain-rilis/SKILL.md) | Deploy ke production dan verifikasi live |
| [`cobain-model`](../.claude/skills/cobain-model/SKILL.md) | Mengubah asumsi atau mesin simulasi (wajib uji kalibrasi) |
| [`cobain-ikon`](../.claude/skills/cobain-ikon/SKILL.md) | Menambah atau mengubah ikon 3D |

## Di tempat lain

- **Untuk pengguna:** halaman [`/metodologi`](https://cobain-dca.vercel.app/metodologi) (cara hitung, uji ketepatan, asumsi, batasan).
- **Aturan proyek untuk agen:** [`../CLAUDE.md`](../CLAUDE.md).
- **Perintah & struktur kode:** [`../README.md`](../README.md).
