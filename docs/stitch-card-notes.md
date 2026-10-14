# Penyelarasan kartu — 14 Oktober 2026

Konsultasi MCP Stitch di [proyek Rimba Jawa](https://stitch.withgoogle.com/projects/3122156932953261093), layar `f88457fc87a24e14810bdeb3f1155d0a` (Studi Komponen Kartu Acara, Lokasi & Gift).

Stitch menyarankan permukaan warm ivory `#FAF7F2`, radius 16px, bingkai dalam coklat tipis berjarak 9px dari tepi, serta judul lokasi bertingkat dan bingkai peta dengan radius 12px. Kartu acara menjadi acuan visual pengguna.

Diterapkan pada undangan: kartu mempelai, acara, lokasi dan formulir/rekening berbagi aturan permukaan, border dan bayangan; kartu lokasi dan formulir/rekening memakai bingkai dalam seperti acara. Kolom formulir memakai krem lebih gelap, rekening tetap transparan. Lokasi memakai ornamen, judul Arjuna Ballroom dan subjudul Alam Indah Resto, kemudian peta asli dalam bingkai membulat. Fallback tanpa embed tetap berfungsi. Animasi scroll dan fungsi salin rekening tetap memakai implementasi sebelumnya.

Usulan Stitch lain: menerapkan komponen ke undangan utama, menambah tab bank kedua/alamat kado fisik, dan mengeksplorasi warna tombol. Penyelarasan diterapkan langsung pada `public/`; tab/alamat kado dan variasi tombol dilewati. Tombol Maps tambahan dalam mockup juga dilewati untuk mempertahankan penghapusan tombol duplikat sebelumnya: akses Maps tetap melalui peta embed asli.

Verifikasi: build dan tes lolos. Chrome menunjukkan warna aktual kartu acara/lokasi/rekening `rgb(250, 247, 242)` dan bingkai dalam radius 10px. Layout dan peta venue asli diperiksa pada emulasi 390×844: bingkai peta radius 12px, tidak ada overflow horizontal. Iframe venue dipasang sementara di DOM preview untuk pemeriksaan karena database preview belum memiliki embed; setelah diperiksa, halaman dimuat ulang tanpa mengubah database. Ponsel fisik dan deployment produksi belum diperiksa.
