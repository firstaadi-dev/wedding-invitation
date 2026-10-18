# Implementasi CMS weddinvita

Implementasi aktif berada di `/admin`. Branding **weddinvita** dan empat halaman pengelolaan mengikuti [brief desktop](weddinvita-cms-prompt.md) serta [arahan mobile](weddinvita-cms-mobile.md). Rimba Jawa tetap nama tema undangan. Mockup Stitch tetap menjadi referensi desain; data contoh pada mockup tidak dimasukkan ke produksi.

## Cakupan yang diterapkan

| Area | Implementasi |
| --- | --- |
| Login | Satu password, feedback saat memeriksa, pesan kesalahan, pemulihan sesi, keluar. |
| Navigasi | Sidebar desktop, drawer modal mobile, halaman melalui `#tamu`, `#pesan`, `#media`, dan `#acara`; tautan langsung dan navigasi kembali browser didukung. |
| Tamu | Tabel desktop dan kartu mobile, cari nama/nomor, tambah/edit dalam drawer desktop atau sheet mobile, salin tautan dan fallback manual, kirim ke WhatsApp, status, perangkat, konfirmasi dan ucapan yang dapat dibuka. |
| Perubahan akses | Konfirmasi dampak nonaktifkan, ganti tautan, reset tiga slot dan hapus tamu; API serta pencabutan akses tetap memakai implementasi yang tersedia. |
| Rekap | Total undangan, aktif/nonaktif, undangan hadir, jumlah orang hadir, belum konfirmasi, tidak hadir dan belum pasti. Kehadiran hanya dihitung dari undangan aktif. |
| Pesan & preview | Template `{nama}` / `{link}`, contoh dengan tautan contoh, judul/deskripsi, satu aksi simpan; unggahan thumbnail publik tersendiri. |
| Foto & lagu | Dua foto pasangan, sembilan slot galeri, MP3 dan preview; pilih berkas lalu unggah/ganti, hapus dengan konfirmasi. Validasi format, berkas kosong dan batas ukuran sebelum unggah. |
| Detail acara | Dua nama acara, dua waktu, jam countdown WIB dan URL embed peta; pasangan/tanggal/venue tetap menjadi konteks. |

Formulir tetap terisi ketika validasi gagal. Perubahan tamu tidak mereset draft pengaturan; pembaruan satu slot media tidak menghapus pemilihan berkas di slot lain. Saat sesi berakhir atau pengguna keluar, dialog ditutup dan data tamu, tautan, media serta formulir dibersihkan dari halaman. Tidak ada endpoint, skema database, dependensi atau layanan baru. Server menambahkan modul browser `admin-data.js` pada daftar aset yang dilayani.

## Verifikasi — 18 Oktober 2026

- `npm run build`: syntax browser/server, tipe konfigurasi Neon, dan aset undangan lulus.
- `npm test`: pemeriksaan undangan serta lima tes Node lulus. Tes CMS mencakup rekap tamu aktif, pemisahan undangan/orang, pencarian nama/nomor, dan batas validasi unggahan.
- `npm run test:integration`: pengujian database Neon terpisah mencakup aset/modul CMS, autentikasi/CSRF, CRUD tamu, pencabutan akses, RSVP, metadata WhatsApp, unggah/hapus media dan Range audio. Koleksi Postman di dalam pengujian menjalankan tiga request dengan tujuh assertion, tanpa kegagalan.

Pengujian interaktif memakai Chrome Guest dan aplikasi Node yang sama pada `127.0.0.1:5178`, dengan `TEST_DATABASE_URL` dari branch pengujian. Password dan semua tamu/media yang digunakan adalah fixture pengujian. Produksi tidak diubah.

Alur yang diperiksa di browser: password salah dan benar; tambah tamu; nomor tidak valid tanpa kehilangan isian; simpan menggunakan Enter; edit; pencarian tanpa hasil; salin tautan; nonaktifkan beserta konfirmasi dan rekap; template tanpa `{link}`; simpan pesan/metadata; unggah thumbnail; validasi URL peta; simpan detail acara; unggah serta pemutaran fixture MP3; drawer navigasi, pemulihan sesi setelah reload, logout, serta sesi kedaluwarsa saat formulir tamu terbuka. Pengiriman saat sesi kedaluwarsa ditolak dan tidak membuat data tamu. Setelah logout/kedaluwarsa, pemeriksaan DOM memastikan nol baris tamu, nol preview media, nol dialog terbuka, dan tautan baru kosong. Tautan Kirim ditinjau dari URL drafnya, tanpa mengirim pesan WhatsApp.

Keempat halaman pengelolaan diperiksa melalui DOM pada lebar 1440, 390, dan 320 piksel: `overflow: false` dan tinggi kontrol terlihat minimal 44 piksel. Halaman login juga diperiksa pada 320 dan 393 piksel tanpa overflow. Galeri memiliki sembilan slot dan halaman media memiliki dua belas input berkas; kolom galeri terukur dua pada 390/393 piksel dan satu pada 320 piksel. Layout desktop ditinjau pada 1440 × 900, serta login desktop pada 1440 × 844. Input teks mobile berukuran 16 piksel; fokus keyboard terlihat dan animasi menghormati reduced motion.

Ponsel fisik, keyboard virtual, serta deployment produksi belum diuji dalam pekerjaan ini. Koleksi Postman dijalankan lokal tanpa publikasi ke cloud.
