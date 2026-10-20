# Kartu hadiah — 17 Oktober 2026

Acuan: [proyek Stitch Rimba Jawa](https://stitch.withgoogle.com/projects/3122156932953261093), layar `55eb0c4c324f4248baca8b1e1db924b4`. Brief ada di [stitch-gift-prompt.md](stitch-gift-prompt.md).

Diterapkan pada undangan aktif: pemicu “Kirim Hadiah” dengan ikon hadiah dan chevron, satu kartu ivory maksimal 380px, dua baris rekening berdivider, logo bank asli dengan bobot optik seimbang, angka tabular, dan tombol salin outline. Warna, font Plus Jakarta Sans, radius 16px, dan border tetap mengikuti patokan kartu undangan. Bingkai inset dilepas khusus kartu hadiah agar lebih ringan. Pada layar sampai 380px, tombol salin hanya menampilkan ikon dengan label aksesibilitas lengkap dan target minimum 44px.

Interaksi buka/tutup memakai elemen native `details`/`summary`, default tertutup. Penyalinan tetap memakai handler yang sudah ada, termasuk mempertahankan nol awal dan fallback salin manual. Nomor dan pemilik rekening tidak berubah. Panel spesifikasi mockup, badge cabang bank rekaan, pengantar berulang, dan klaim transfer otomatis tidak diterapkan.

Verifikasi: `npm test`, `npm run build`, dan `git diff --check` lulus. Preview lokal diperiksa di Helium pada desktop serta emulasi 320px dan 390px: dua nomor terbaca lengkap dan kedua tombol salin menampilkan feedback sukses. Ponsel fisik dan deployment produksi belum diperiksa.
