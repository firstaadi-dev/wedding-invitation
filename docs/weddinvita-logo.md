# Logo weddinvita

Logo **Dua Lipatan** mempertemukan dua bidang lipatan undangan dengan ruang negatif di tengah. Simbol mengikuti identitas produksi Studio: hijau hutan `#183d32`, putih hangat `#fafaf7`, hijau pucat `#d3e7dc`, serta wordmark huruf kecil dalam Manrope Bold. Dokumen ini menambahkan aset logo; tidak mengubah sistem warna atau tema undangan.

## Aset

| Berkas | Penggunaan |
| --- | --- |
| `frontend/static/assets/weddinvita-logo.svg` | Sumber vektor; simbol pada website dan favicon SVG |
| `frontend/static/assets/favicon.png` | Favicon 96 × 96 px untuk browser dan hasil pencarian |
| `frontend/static/assets/apple-touch-icon.png` | Ikon 180 × 180 px untuk perangkat Apple |
| `frontend/static/assets/weddinvita-logo.png` | Logo 512 × 512 px untuk metadata Organization |
| `design/brand/weddinvita-wordmark.png` | Ekspor horizontal dengan latar transparan |
| `design/brand/weddinvita-preview.png` | Pratinjau wordmark dan simbol pada 16, 24, 32, 48, 96 px |

PNG simbol diraster dari SVG menggunakan dependency `sharp` yang sudah tersedia. Ekspor wordmark menggunakan `frontend/assets/fonts/manrope-bold.ttf` dengan lisensi pada direktori yang sama. Tidak ada font atau gambar eksternal baru.

## Penerapan

Halaman perusahaan, kebijakan, login, verifikasi, aktivasi, dan navigasi CMS memakai simbol berdampingan dengan teks asli “weddinvita”. Simbol dekoratif memakai `alt=""`; nama produk tetap terbaca oleh pembaca layar. Semua tujuh entry HTML memiliki tautan favicon yang sama. Logo Organization memakai URL produksi tetap `https://weddinvita.id/assets/weddinvita-logo.png`; aset berada pada `/assets/`, jalur publik yang sudah dilayani konfigurasi deployment dan diizinkan robots.txt.

Pertahankan rasio 1:1, warna, dan celah di tengah simbol. Pada UI, simbol berukuran 30–36 px (32 px pada CMS), dengan jarak 10 px dari wordmark. Ukuran kecil 16–24 px dipakai untuk favicon. Wordmark mengikuti tipografi halaman: 24 px pada CMS, 29 px pada header perusahaan, 25 px pada header perusahaan di ponsel, dan 24 px pada footer.

## Verifikasi dan batas

Build frontend dan empat tes `tests/build.test.mjs` lulus, termasuk ukuran PNG, tautan favicon pada setiap entry, dan metadata logo setelah build. Pratinjau raster diperiksa pada ukuran pemakaian kecil. Layout website melalui browser belum diverifikasi karena lingkungan membatasi server lokal dan browser. Belum ada deployment atau permintaan indexing.

Implementasi mengikuti [panduan favicon Google](https://developers.google.com/search/docs/appearance/favicon-in-search/) dan [logo Organization](https://developers.google.com/search/docs/appearance/structured-data/organization). Sesudah deployment, Google perlu merayapi ulang situs; pemunculan ikon atau logo di hasil pencarian tetap ditentukan Google. Pengaturan noindex staging tetap berlaku.
