# Catatan pemeriksaan perbandingan

24 Oktober 2026. Studi ini ditinjau oleh agent Impeccable terpisah dalam konteks baru, tanpa mengubah source aplikasi. Reviewer membuka22 capture yang diwajibkan: lima halaman×dua konsep×desktop/mobile, ditambah papan perbandingan desktop/mobile. Semua capture valid. TYPE, MATERIAL, GROUND, struktur daftar, inspector dan papan perbandingan sesuai brief.

Disposition awal **fix**: (1) Fokus mobile merender ulang baris sebelum dialog mencatat pemicu, sehingga fokus kembali ke body; (2) dua ikon panah papan masih glyph; (3) seed perlu dikorroborasi terhadap output roll yang dilihat parent.

Perbaikan: nama mendapat data-inspect-id; setelah render ulang tombol pengganti difokuskan sebelum openModal. Test memastikan Escape mengembalikan fokus ke tombol nama yang masih terhubung ke DOM. Kedua glyph diganti SVG18px stroke1,75. Seed dikorroborasi dari output CLI round1bolder: seed:0903cca35435964f. Seluruh screenshot diperbarui dan tes diulang setelah perbaikan.

Verdict pass **ship** mencakup ketiga poin tersebut sebagai resolved, tanpa temuan tersisa pada daftar fix. Reviewer meninjau source/hasil tes, tidak menjalankan browser atau mengulang seluruh state secara independen. Ini bukan audit WCAG penuh atau studi pengguna.

## Pemeriksaan otomatis

[verification.txt](verification.txt):30 kombinasi layar/konsep/lebar dan3 ukuran papan lolos pemeriksaan overflow halaman. Tugas summary, cari/no-results, ucapan, inspector desktop/mobile, edit, selection/bulk confirmation, pagination, nav mobile, token/validasi dan reduced motion lulus. Fokus return setelah dialog diuji khusus. Tidak ada error JavaScript.

[contrast.cjs](contrast.cjs):11 pasangan solid memenuhi target teks/komponen. Tidak membuktikan semua komposit dan seluruh state. Screenshots penuh pada1440/390;320 diperiksa DOM tanpa capture yang diklaim. Cover pada papan hanya capture viewport, bukan seluruh halaman.

## Hasil detektor awal

[detector-initial.json](detector-initial.json) menggunakan DESIGN.md baseline yang diwarisi: Manrope/palet baru/radius pill ditandai di luar sistem lama. Itu perubahan desain yang disengaja dan dicatat sebagai dua alternatif dalam rekaman studi baru, bukan drift ke produksi. Inter dipertahankan untuk Fokus dalam mode Operate. Table-wrap ditandai cramped karena tanpa padding luar; konten sel memiliki padding sendiri dan wrapper memang region scroll tabel. Inset tidak ditambah agar header/row tetap sejajar.

Peringatan kontras pada teks sidebar/konteks yang disembunyikan di varian Fokus ditangani dengan teks putih di header/sidebar gelap. Fokus outline putih juga ditetapkan pada bidang gelap. Tidak ada scan kedua yang diklaim. Semua capture diperbarui setelah perubahan.

Tidak ada tes server, fingerprint, isolasi tenant, decoder/crop/conversion, upload nyata, pengiriman WhatsApp, screen reader nyata atau perangkat fisik. Semua mutasi tetap di memori studi. Perilaku server dipertahankan sebagai batas spesifikasi, bukan disimpulkan dari mockup.
