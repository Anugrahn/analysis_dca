# Deploy & infrastruktur Cobain

Hal-hal yang tidak kelihatan dari kode: di mana aplikasinya hidup, kenapa diatur begitu, dan jebakannya.

## Alamat & proyek

| | |
|---|---|
| Production | https://cobain-dca.vercel.app (juga https://coba-coba-vert.vercel.app) |
| Proyek Vercel | `coba-coba` (akun `anugrahnrhmd-3426`, region `sin1` Singapura), terhubung lewat folder `.vercel/` |
| Repo | `git@github.com:Anugrahn/analysis_dca.git`, branch `main` |
| Author commit | `Uga <anugrahnrhmd@gmail.com>`, sudah diset di `git config` lokal repo. Vercel menolak deploy kalau email author commit-nya lain. |

## Deploy

Deploy masih manual lewat CLI. Auto-deploy dari GitHub belum aktif, karena akun Vercel butuh *Login Connection* ke GitHub dulu (Vercel → Account Settings → Authentication → GitHub). Setelah itu sambungkan repo di proyek: Settings → Git.

Urutan rilis lengkap ada di skill `cobain-rilis` (`.claude/skills/cobain-rilis/SKILL.md`).

### Domain `cobain-dca.vercel.app`

Domain ini didaftarkan sebagai **domain production proyek** lewat API:
`npx vercel api "/v10/projects/<projectId>/domains?teamId=<teamId>" -X POST -f name=<nama>.vercel.app`.
ID proyek dan tim ada di `.vercel/project.json`.

Kenapa tidak pakai cara biasa:
- `vercel alias set` membuat alias yang kena **Deployment Protection**, sehingga pengunjung diarahkan (302) ke halaman login Vercel.
- `vercel domains add` menolak nama `*.vercel.app` (`invalid_domain`).
- `cobain.vercel.app` sudah dipakai orang lain.

## Firewall: rate limit API

Aturan **"Batasi API simulasi"** (paket gratis):
- **Berlaku untuk:** path yang diawali `/api/`.
- **Batasnya:** 30 permintaan per 60 detik per IP (fixed window).
- **Kalau lewat batas:** dibalas **429**.

Alasannya, satu permintaan baru ke `/api/alternatives` bisa memakan ±5 detik CPU dan ±15 panggilan ke Yahoo. Tanpa batas, satu bot bisa menghabiskan kuota dan membuat server diblokir Yahoo.

- **Lihat aturan aktif:** `npx vercel api "/v1/security/firewall/config/active?projectId=<id>&teamId=<team>"`.
- **Ubah aturan:** `PATCH /v1/security/firewall/config` dengan body `{"action":"rules.update","id":"rule_batasi_api_simulasi_BO3Efa","value":{...}}`.
- **Penolakan di sisi aplikasi:** penolakan firewall berupa teks, bukan JSON, jadi semua panggilan API dari browser lewat `src/lib/app/client.ts`, yang mengubah 429/403 menjadi pesan ramah.

## Pertahanan lain di kode

| Lapisan | Tempat | Isi |
|---|---|---|
| Parameter kanonik | `src/lib/app/params.ts` | Parameter asing ditolak, kenaikan setoran harus kelipatan 0,1%, simbol diawali huruf/angka/`^`. Gunanya supaya cache CDN tidak bisa dihindari dengan URL acak. |
| Cache CDN | `src/lib/app/respond.ts` | `s-maxage` 6 jam. Hasil yang menurun kualitasnya (sumber data gagal) dikirim dengan `no-store`. |
| Cache data | `src/lib/market/yahoo.ts`, `src/lib/app/projection.ts` | Fetch Yahoo/FRED di-cache 6–24 jam, URL Yahoo dibulatkan per jam, dan memori proses dibatasi 400 entri. |
| Batas durasi | `src/app/api/*/route.ts` | `maxDuration = 30` detik. |
| Header | `next.config.ts` | CSP, `Permissions-Policy`, `nosniff`, dan `frame-ancestors 'none'`. |

## Sumber data

| Data | Sumber | Catatan |
|---|---|---|
| Harga, dividen, kurs, pencarian, emiten sejenis | Yahoo Finance (API tidak resmi, tanpa kunci) | Tanggal bar memakai offset zona waktu bursa (`gmtoffset`). Harga GBp/ZAc/ILA dibagi 100. Lonjakan rusak dibuang. |
| USD/IDR cadangan | FRED `CCUSMA02IDM618N` (OECD) | Menambal bulan IDR=X yang bolong atau melenceng lebih dari 7%. |
| Inflasi Indonesia | FRED `IDNCPIALLMINMEI` | Hanya untuk backtest di skrip. Aplikasi memakai asumsi 3%. |

`data/prices.json` hanya dipakai skrip (`npm run demo`, `npm run calibrate`); perbarui dengan `npm run fetch-data`. Aplikasinya sendiri mengambil data langsung.

## Keamanan dependensi

Next.js dinaikkan ke 16.4.2 pada 23 Okt 2026 karena ada advisory keamanan. Cek berkala dengan `npm audit --omit=dev`.
