# Redesign CMS weddinvita

> Arsip brief awal. Desain dan cakupan terbaru tersedia di [hasil desain CMS](weddinvita-cms-results.md) dan [catatan implementasi](weddinvita-cms-implementation.md).

Brand produk CMS dipilih pengguna: **weddinvita** (lowercase). Rimba Jawa tetap nama tema undangan, bukan nama CMS. Desain diminta melalui MCP Stitch; implementasi CMS aktif belum diubah pada tahap ini.

## Arah visual

CMS modern dan tenang dengan sidebar desktop, wordmark sans-serif, warna ivory `#FAF7F2`, krem `#F3EDE4`, hijau `#183D32`, burgundy `#6E2435` dan teks umber `#30271F`. Radius 12–16px dan border tipis. Prioritaskan tabel dan formulir yang mudah dipakai, tanpa latar hutan, parallax, atau ornamen besar. Bahasa Indonesia, target sentuh 44px, fokus keyboard terlihat. Mobile memakai drawer navigasi dan layout yang tidak melebar.

## Fitur yang harus tercakup

- **Tamu:** nama wajib, nomor WhatsApp opsional, cari nama/nomor, status aktif, slot perangkat 0/3–3/3, konfirmasi kehadiran, jumlah orang, ucapan, salin tautan, kirim WhatsApp, edit, aktif/nonaktif, tautan baru, reset seluruh perangkat dan hapus. Ringkasan membedakan jumlah undangan dan orang hadir dari tamu aktif.
- **Pesan & preview:** template global dengan `{nama}` dan `{link}`, contoh pesan, thumbnail publik 1200×630, judul dan deskripsi preview tautan. Kirim membuka WhatsApp dengan pesan terisi; admin tetap mengirim sendiri.
- **Foto & lagu:** dua foto pasangan, sembilan slot galeri, satu lagu MP3, upload/ganti/hapus dan preview. Foto JPG/PNG/WebP maksimal 12 MB; MP3 maksimal 25 MB. Tidak ada pengaturan urutan atau alt text baru yang belum didukung CMS aktif.
- **Detail acara:** dua nama acara, dua waktu acara, jam countdown WIB, URL embed peta. Nama pasangan/tanggal/venue ditampilkan sebagai konteks tetap, bukan form edit baru.
- **Login:** satu password admin, feedback kesalahan/loading, tombol keluar setelah login. Tanpa email, SSO atau pendaftaran.

## Batas desain

Semua nama tamu dan angka pada mockup adalah data demo. Jangan menampilkan tautan rahasia, fingerprint atau kredensial. Dialog konfirmasi menjelaskan dampak menonaktifkan tamu, mengganti tautan, mereset seluruh perangkat dan menghapus tamu. Fitur billing, paket, multi-event, tim, impor/ekspor dan bulk action tidak ditambahkan.
