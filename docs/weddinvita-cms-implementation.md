# Penerapan desain CMS — 21 Oktober 2026

Status: diterapkan ke kode frontend, berjalan pada http://dashboard.localhost:5173/.

Acuan: [project Stitch baru](https://stitch.withgoogle.com/projects/13790839548463083405), [manifest snapshot terbaru](../design/cms/manifest.json). Login memakai revisi split editorial terakhir; dashboard memakai rail gelap, Inter, panel putih, dan aksen hijau. HTML Stitch menjadi referensi tampilan, bukan sumber JavaScript produksi.

## Cakupan yang diterapkan

| Halaman | Implementasi dan bukti |
| --- | --- |
| Login | Split hero/form, dua field dengan autocomplete dan batas panjang; status memeriksa, error aksesibel, dan alur login/sesi yang sudah ada. Komponen tampil di desktop dan viewport390px; callback kegagalan menampilkan pesan error. CMS asli juga memuat layar login saat sesi tidak tersedia. |
| Tamu Undangan | Tabel delapan kolom pada desktop/mobile: pilihan, nama, WhatsApp, status, konfirmasi, perangkat numerik, ucapan, aksi. Nama berupa teks; Salin link/Kirim selalu ada di baris. Pencarian/filter status/kehadiran/perangkat, sort,25/50/100 baris, nomor halaman dibatasi, pilihan hanya halaman saat ini. Aksi status memakai endpoint PATCH yang ada, konfirmasi, batas empat request bersamaan, pelaporan hasil parsial, refresh. Dialog editor, ucapan, tautan, reset, hapus tetap tersedia. |
| Pesan & Preview | Tiga field dengan batas4000/120/300, token nama/link di posisi kursor, validasi link wajib, satu aksi simpan, preview teks dan metadata langsung, thumbnail memakai MediaCard yang sama. Preview bawaan mengambil nama tersimpan; metadata disimpan terpisah dari unggah gambar. |
| Foto & Lagu | Dua foto mempelai, sembilan galeri, satu MP3. Pilih berkas tetap terpisah dari Unggah/Ganti; Hapus dengan konfirmasi, status/error dan pemutar audio dipertahankan. Pemilih berkas ringkas dan dapat diakses lewat keyboard. Tidak ada nama/ukuran berkas tersimpan rekaan. |
| Detail Acara | Dua nama mempelai, empat orang tua, nama/waktu dua acara, jam countdown WIB, URL embed Google Maps, rekening/alamat, tambah/hapus maksimal10 dan pill72×34 ON/OFF. Perubahan jenis berisi data meminta konfirmasi sebelum isian dikosongkan. OFF menonaktifkan kontrol dan mempertahankan array hadiah pada payload. Gelar langsung dalam nama. |

Form/API tetap memakai endpoint, CSRF, penanganan401, validasi panjang/tipe/ukuran, konfirmasi tindakan berisiko dan pesan kegagalan yang sudah ada. Modal menggunakan portal agar dialog tidak berada di dalam struktur tabel. Nama konteks berasal dari akun tenant, bukan nama pasangan yang diulang dalam header.

Tidak ada penambahan ekspor data/pengaturan baru meskipun revisi mentah Stitch memunculkan tombol contoh tersebut. Tidak ada publish, tema, WhatsApp API, jumlah orang/pax, signup/reset password, tanggal acara baru, atau galeri tanpa batas.

## Pemeriksaan yang selesai

- `npm run build --prefix frontend`: TypeScript dan build Vite berhasil setelah perubahan terakhir.
- `git diff --check`: bersih.
- Assert query pada2.500 data:36 kombinasi status/kehadiran/perangkat, pencarian nama dan nomor, sort numerik dua arah, hasil kosong, dan sumber tidak termutasi: lulus.
- Assert media: JPG/PNG dan MP3, batas tepat12/25MB, berkas melebihi batas, berkas kosong, dan audio ditolak pada slot foto: lulus.
- Browser Chrome: semua lima halaman ditinjau; dashboard desktop1920px dan mobile390×844. Form/panel menjadi satu kolom pada mobile, toolbar filter diberi satu baris penuh agar label tidak terpotong, tabel digulir di dalam wadahnya. Sticky nama/aksi desktop dilepas sesuai ruang layar agar tidak menutupi kolom lain.
- Komponen asli dengan callback lokal dan2.500 tamu contoh: pencarian menghasilkan satu tamu, halaman berikutnya, pilihan baris, dialog ucapan, konfirmasi dan perubahan status,100 baris per halaman, serta lompat di luar batas ke halaman terakhir berjalan.
- Pesan: token disisipkan di posisi kursor, preview mengikuti input, status kembali tersimpan sesudah callback simpan.
- Hadiah: OFF mengenali switch aksesibel, field tetap bernilai tetapi disabled, ON mengaktifkan kembali; simpan OFF berhasil pada callback; tambah, ubah item kosong menjadi alamat, dan hapus bekerja.
- Media: tombol Pilih foto membuka dialog OS. Berkas MP3 ditolak untuk foto dan Unggah tetap disabled. Gambar PNG mengaktifkan Unggah; kegagalan callback mempertahankan nama/berkas untuk dicoba kembali.
- CMS asli: sesi dan data tamu berhasil dimuat; navigasi drawer mobile serta form acara dengan data server tampil. Pemeriksaan tidak menyimpan perubahan pada data undangan asli.

Fixture callback dibuat sementara dari source komponen aktual, tanpa server API tiruan atau perubahan autentikasi. Entry HTML/TSX sementara sudah dihapus sebelum build akhir dan tidak termasuk build produksi.

## Batas pemeriksaan

Penyimpanan/unggah server tidak dijalankan ulang secara menyeluruh; interaksi mutasi diperiksa lewat callback lokal untuk menghindari perubahan data asli. Tidak mengirim WhatsApp, menyalin tautan pribadi, atau mengunggah media contoh ke server. Tidak menjalankan suite backend/deploy. Pemeriksaan visual dilakukan pada ukuran yang disebutkan, bukan seluruh perangkat.

Pagination membatasi baris yang dirender. Endpoint lama tetap mengirim seluruh daftar tamu; memindahkan filter/pagination ke server diperlukan jika pemuatan awal daftar menjadi lambat. Tidak ada klaim load test backend.
