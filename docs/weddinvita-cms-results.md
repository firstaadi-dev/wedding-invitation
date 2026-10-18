# Desain CMS weddinvita — 14 Oktober 2026

Implementasi aktif dan hasil pengujiannya kini tersedia di [catatan implementasi CMS](weddinvita-cms-implementation.md). Catatan di bawah merekam tahap mockup sebelum implementasi.

MCP Stitch membuat lima layar baru dengan wordmark **weddinvita**: login, tamu undangan, pesan & preview, foto & lagu, serta detail acara. Palet krem/hijau/burgundy, heading editorial dan kontrol sans-serif, sidebar desktop dan informasi ringkas dipakai sebagai arah visual.

- [Proyek Stitch](https://stitch.withgoogle.com/projects/3122156932953261093)
- [Review mockup lokal](http://127.0.0.1:5177/weddinvita-cms-review.html)
- [Brief](weddinvita-cms-prompt.md)
- [Versi mobile 390px](weddinvita-cms-mobile.md)
- [Manifest layar dan sumber ekspor](../design/weddinvita-cms-manifest.json)

| Layar | HTML untuk review | ID Stitch |
| --- | --- | --- |
| Tamu undangan | [Mockup](../design/weddinvita-cms-guests.html) | f4215ad24fd04545907af65645e3878b |
| Foto & lagu | [Mockup](../design/weddinvita-cms-media.html) | b76bd9f385784d35a8fbee7ddc4b8e2a |
| Pesan & preview | [Mockup](../design/weddinvita-cms-messages.html) | 557c83051f2b4a83a3dadaf84b8f35da |
| Detail acara | [Mockup](../design/weddinvita-cms-event.html) | 596f1b3c61a44811806830b8ad2b4196 |
| Login | [Mockup](../design/weddinvita-cms-login.html) | de2c03e9e1f04a25b822767407610177 |

Revisi menghapus tambahan yang tidak didukung CMS aktif: kategori tamu, sinkronisasi manual, pengingat massal, versi/kuota/status server rekaan dan klaim enkripsi pada login. Tabel tamu direvisi agar kolom Aksi tidak terpotong; Kirim dinonaktifkan pada contoh tamu nonaktif/tanpa nomor. Login tetap memakai satu password. Angka, nama, nomor, berkas dan URL pada mockup adalah contoh; belum ada domain baru yang dipilih atau dikonfigurasi.

Stitch memberikan revisi terakhir sebagai DOM operations. Karena URL ekspor HTML/gambar masih mengembalikan versi sebelum revisi, operasi tersebut disimpan di [refinements](../design/weddinvita-cms-refinements.json) dan diterapkan pada HTML lokal. Untuk penggantian isi elemen digunakan target pertama sesuai operasi DOM; atribut clipboard diterapkan pada tombol yang cocok. Field deskripsi preview dan branding di lima file diperiksa setelah penggantian. PNG tanpa akhiran `-review` adalah ekspor awal Stitch; screenshot `-review` merekam HTML lokal yang sudah dikoreksi.

Layar tamu dan media diperiksa secara visual di Chrome pada preview lokal. Layout mobile, semua state interaktif, dan alur CMS sebenarnya belum diuji. Mockup memakai sumber gambar/font/style eksternal dan fungsi demo, tanpa koneksi ke API/database aktif. File `public/admin.html`, `public/admin.css`, dan `public/admin.js` belum diubah; implementasi desain merupakan tahap terpisah.

## Saran lanjutan dari Stitch

Saran ini merupakan opsi review, belum menjadi fitur atau perluasan scope yang diterapkan:

- Tampilkan state Drawer Tambah / Edit Tamu secara terbuka di kanvas
- Tampilkan dialog konfirmasi pencabutan tautan dan reset kuota perangkat 3-slot
- Buat pratinjau tampilan mobile 390px untuk daftar tamu ini
- Buat modal konfirmasi hapus foto/lagu untuk layar ini
- Buat versi responsive mobile (390px) untuk Foto & lagu
- Lanjut ke perancangan layar "Detail acara" weddinvita
- Periksa keselarasan tombol Kirim WA di layar Tamu Undangan dengan draf ini
- Simulasikan state interaktif upload thumbnail saat file sedang diunggah
- Tambahkan variasi preset teks salam formal dan kasual untuk template pesan
- Coba kosongkan kolom jam untuk melihat fallback 'Waktu akan diinformasikan'
- Buat varian status validasi error jika URL iframe Google Maps tidak valid
- Lanjutkan ke layar Pesan & preview untuk kelengkapan CMS weddinvita
- Hubungkan alur login ini ke layar Tamu Undangan atau Pengaturan Acara
- Sesuaikan teks panduan password atau durasi sesi demo
- Lihat pratinjau tampilan responsif versi ponsel (390px)
- Buka pratinjau interaktif drawer Tambah Tamu (slide-over kanan)
- Lihat modal dialog konfirmasi Reset Kuota Perangkat & Hapus Tamu
- Sesuaikan tampilan layar CMS Pengaturan Acara atau Foto & Lagu
- Apakah ada penyesuaian teks atau warna pada modal preview tamu?
- Ingin meninjau alur form tambah tamu di layar Tamu Undangan?
- Sudah puas dengan konsistensi seluruh layar CMS weddinvita?
- Buka pratinjau interaktif layar Masuk CMS
- Periksa keselarasan kontras & accessibility kartu tamu undangan
- Lanjutkan ke pengujian alur drawer tambah tamu baru
