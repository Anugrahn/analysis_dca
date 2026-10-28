# Cobain

Simulator DCA "lempar dadu": Monte Carlo (block bootstrap + asumsi pasar ke depan) untuk saham, kripto, emas, reksa dana. Peta semua dokumen (riset, produk, operasional) ada di `docs/README.md`.

## Aturan proyek

- **Bahasa produk:** Indonesia santai, pendek, ELI5 ("kalau lagi apes / lagi hoki", "12 dari 100"), berbentuk frekuensi, bukan persen teknis. Istilah teknis (XIRR, drawdown, persentil) hanya di kode dan dokumen riset.
- **Desain:** ala Monzo tapi orisinal. Hero koral, kartu biru malam, Bricolage Grotesque untuk judul, Atkinson Hyperlegible untuk isi, ikon 3D buatan sendiri (skill `cobain-ikon`). Setiap UI harus lolos WCAG 2.2 AA (cek dengan axe-core) dan tetap enak di lebar 390 px.
- **Model:** angka harus bisa dipertanggungjawabkan. Perubahan yang menggeser hasil proyeksi lewat skill `cobain-model` (uji kalibrasi dulu).
- **Rilis:** skill `cobain-rilis`. Author commit `Uga <anugrahnrhmd@gmail.com>`; deploy production hanya atas permintaan pengguna.
- **Kredit:** footer "Rio ft Uga". Rio Nur Arifin adalah pembuat seandainya.vercel.app, inspirasi Cobain.

Next.js di sini versi 16: baca `node_modules/next/dist/docs/` sebelum memakai API Next yang belum pernah dipakai di repo ini.
