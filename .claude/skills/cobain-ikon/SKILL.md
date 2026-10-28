---
name: cobain-ikon
description: Tambah atau ubah ikon 3D Cobain (three.js → public/3d/*.webp), termasuk ikon aplikasi. Use when a Cobain screen needs a new illustration or icon.
---

# Ikon 3D Cobain

Ikon dimodelkan sendiri dengan three.js, bukan diambil dari paket emoji. Gayanya permen mengilap, sudut bulat, dengan palet `C` di `scripts/icons3d/icons.js`.

1. **Modelkan** ikon baru sebagai entri di `ICONS` (`scripts/icons3d/icons.js`). Pakai helper yang sudah ada: `box`, `ball`, `lathe`, `puff`, `die`, `coin`.
2. **Render.** Jalankan `npm run icons` di background. Buka `http://localhost:4124/?only=<nama>` di browser, lalu tunggu `window.__done === true`. Hasilnya tertulis ke `public/3d/<nama>.webp`.
3. **Cek** di `http://localhost:4124/scripts/icons3d/sheet.html`, di latar terang dan gelap.
4. **Pasang.** Tambah nama ke tipe `Icon3DName` dan, kalau perlu, ke `iconFor` di `src/components/icon3d.tsx`. Ikon selalu dekoratif (`alt=""`); maknanya ada di teks di sebelahnya.

Ikon aplikasi: entri dengan `png: true` juga menghasilkan `<nama>-app.png` (512 px, latar biru malam). Salin ke `src/app/icon.png` dan `src/app/apple-icon.png`.
