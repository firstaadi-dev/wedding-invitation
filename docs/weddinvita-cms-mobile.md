# CMS weddinvita — versi mobile

Implementasi aktif dan hasil pengujiannya kini tersedia di [catatan implementasi CMS](weddinvita-cms-implementation.md). Catatan di bawah merekam tahap mockup sebelum implementasi.

Pengguna meminta versi mobile dari redesign desktop weddinvita. Lima layar diminta melalui MCP Stitch dalam proyek yang sama: tamu undangan, pesan & preview, foto & lagu, detail acara, serta login.

## Arahan desain

- Canvas mobile 390px dengan layout aman pada 320px, bukan tabel desktop yang diperkecil.
- Wordmark **weddinvita**, krem/hijau/burgundy dan tipografi mengikuti redesign desktop.
- Header ringkas dan navigasi drawer untuk halaman setelah login; halaman login tidak menampilkan menu atau status sesi aktif.
- Daftar tamu berupa kartu dengan nama/WhatsApp, status, kuota perangkat, kehadiran, ucapan serta aksi salin/kirim/menu lainnya. Rekap empat metrik memakai grid 2×2.
- Formulir memakai satu kolom, input berukuran teks 16px dan target sentuh minimal 44px. CTA sticky harus menyisakan ruang aman di bawah konten.
- Galeri sembilan slot tetap memakai grid dua kolom pada 390px dan satu kolom pada 320px. Pemilihan file dan unggah merupakan aksi terpisah; nama berkas membungkus.
- Pesan WhatsApp dan metadata memakai satu aksi simpan; contoh pesan dapat dilipat. Thumbnail tetap unggahan tersendiri.
- Detail acara tetap enam field yang tersedia. Login tetap satu password, kosong sebelum diisi.

Semua contoh adalah data demo. Kategori tamu, billing/paket, analytics, pengingat massal, kuota storage, versi/status server, autosave draft, preset pesan dan klaim enkripsi tidak ditambahkan. Desain tidak terhubung ke database atau autentikasi CMS aktif.

## Hasil dan review

Lima layar selesai dibuat. [Lihat review mobile 390×844](http://127.0.0.1:5177/weddinvita-cms-mobile-review.html), [manifest](../design/weddinvita-cms-mobile-manifest.json) dan [prompt lengkap](../design/weddinvita-cms-mobile-prompts.json).

| Layar | HTML review | ID Stitch |
| --- | --- | --- |
| Tamu undangan (Mobile 390px) | [Mockup](../design/weddinvita-cms-mobile-guests.html) | 586e36c7b2c34387b52788b677b71689 |
| Pesan & preview (Mobile 390px) | [Mockup](../design/weddinvita-cms-mobile-messages.html) | a17cbbf759a64e74ab252252cb01402f |
| Foto & lagu (Mobile 390px) | [Mockup](../design/weddinvita-cms-mobile-media.html) | 21a51156af404cd88894de32f128f752 |
| Detail acara (Mobile 390px) | [Mockup](../design/weddinvita-cms-mobile-event.html) | e917224e3d5f4fb09a353931811d590f |
| Masuk CMS (Mobile 390px) | [Mockup](../design/weddinvita-cms-mobile-login.html) | bc1edae6dda54da4b81db93d64637156 |

Beberapa ekspor Stitch memakai metadata/canvas DESKTOP meskipun prompt dan HTML ditujukan untuk mobile. Review lokal memakai iframe berlebar 390px agar tampilan ponsel bisa diperiksa langsung. PNG ekspor awal disimpan sebagai referensi, bukan bukti runtime.

Kartu tamu diperiksa di Chrome pada 390px dan 320px: tidak ada overflow horizontal, tiga kartu muncul dan tombol Menu memiliki tinggi44px. Metadata viewport pada semua ekspor HTML diperbaiki agar pinch zoom tetap diizinkan; paginasi demo 29 halaman pada layar tamu dihapus karena CMS aktif hanya memiliki daftar yang dapat dicari. Rancangan selain tamu ditinjau dari ekspor gambar/HTML; ponsel fisik, keyboard virtual dan seluruh state interaktif belum diuji. Semua ini masih mockup dan tidak mengubah file public/admin atau API/database.

## Saran tambahan Stitch

Saran ini opsional untuk review berikutnya, belum merupakan fitur CMS aktif:

- Pratinjau tampilan drawer navigasi terbuka pada mobile
- Buat versi mobile 390px untuk layar Pesan & preview
- Buat versi mobile 390px untuk layar Foto & lagu
- Buka drawer menu navigasi untuk melihat tampilan menu mobile lainnya
- Tampilkan variasi state ketika variabel {link} terhapus (error validation)
- Sesuaikan panjang teks template WhatsApp untuk opsi yang lebih ringkas
- Buat varian state drawer menu terbuka pada tampilan mobile 390px
- Buat versi mobile 390px untuk layar CMS Detail acara
- Buat versi mobile 390px untuk layar Pesan & preview WhatsApp
- Pratinjau drawer navigasi terbuka secara interaktif
- Buka sesi pengujian respon validasi formulir saat data disimpan
- Lihat detail state validasi error pada layar mobile ini
- Buat layar mobile untuk kelola Tamu undangan (390px) dengan drawer menu
- Sesuaikan palet warna tombol atau aksen kartu Masuk dasbor
