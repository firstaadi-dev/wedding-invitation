# Firsta & Talitha — Undangan Rimba Jawa

Undangan satu halaman tanpa navigasi: amplop burgundy, segel pembuka, transisi joglo, hutan berlapis, QS. Ar-Rum 30:21, dan orang tua terkonfirmasi. Tanggal 22 November 2026. Foto dan lagu tetap placeholder sampai diunggah melalui CMS.

## Jalankan

Node.js 22+, npm, dan Neon Postgres. Frontend Vanilla JS; backend HTTP Node tanpa framework.

```sh
npm ci
neon deploy
npm run db:migrate
npm run build
npm start
```

Neon project `bitter-pond-36732751`, organization `org-shiny-mode-58726130`, branch `production`; `.neon` dan `.env.local` tidak masuk Git. `neon.ts` hanya memakai Postgres. Aplikasi menggunakan `DATABASE_URL` pooled melalui `pg`; migrasi menggunakan `DATABASE_URL_UNPOOLED`. Query menyebut schema `wedding` secara eksplisit karena pool Neon tidak menerima startup `search_path`.

Buka http://127.0.0.1:5174/admin untuk CMS, `/preview` untuk desain lokal, atau tautan tamu yang dibuat CMS. Pada produksi `/preview` membutuhkan sesi admin. Halaman tanpa tautan/sesi meminta pengunjung membuka tautan undangan yang diterima.

Isi environment mengikuti `.env.example`. Password admin minimal 12 karakter, disimpan sebagai hash scrypt. Untuk membuat hash tanpa menampilkan password di terminal (zsh):

```sh
read -s 'taskAdminPassword?Password admin: '
printf '%s' "$taskAdminPassword" | npm run --silent admin:hash
unset taskAdminPassword
```

Saat setup ini password admin acak dan hash disimpan di `.env.local` sebagai `ADMIN_PASSWORD` dan `ADMIN_PASSWORD_HASH`. Hanya hash dikirim ke Render. Jangan kirim password atau secret API ke GitHub. Admin mengganti hash di environment jika ingin mengganti password; sesi lama harus dihapus saat rotasi.

## CMS dan akses tamu

CMS `/admin` memakai branding **weddinvita** dengan halaman Tamu undangan, Pesan & preview, Foto & lagu, dan Detail acara. Sidebar desktop beralih menjadi drawer navigasi di ponsel; daftar tamu menjadi kartu pada layar kecil. Formulir tambah/edit memakai drawer desktop dan sheet mobile. [Cakupan implementasi dan bukti pengujian](docs/weddinvita-cms-implementation.md).

CMS mengelola tambah/edit/hapus/aktif/nonaktif tamu, tautan pengganti, reset perangkat, foto pasangan, hingga sembilan foto galeri dengan foto utama, thumbnail dan pembesaran, lagu MP3, nama serta jam acara, jam countdown (WIB), dan URL embed resmi Google Maps. Tautan rahasia yang baru dibuat/diganti tersimpan di database bersama nomor telepon opsional dan dapat disalin kembali dari daftar tamu. Hash tetap digunakan untuk memverifikasi akses; URL asli kini juga tersimpan dan hanya diberikan kepada admin. Link tamu lama tetap berlaku, tetapi tidak dapat dipulihkan dari hash: jika link asli sudah hilang, gunakan Tautan baru dan kirim ulang. Nomor 08… otomatis diubah ke 62…; format internasional +kode negara juga diterima. Tombol Kirim membuka wa.me dengan pesan terisi; admin menekan kirim dari WhatsApp. Template global mendukung {nama} dan {link} (wajib), dapat diedit di bagian Pesan WhatsApp & preview tautan. Judul dan deskripsi preview di bagian yang sama menghasilkan metadata HTML/Open Graph pada halaman publik; nama domain tetap mengikuti PUBLIC_ORIGIN. Template dan nomor telepon tidak diberikan melalui API undangan tamu. Thumbnail preview dapat diunggah/diganti/dihapus di bagian yang sama, terpisah dari galeri. JPG/PNG/WebP maksimal 12 MiB dikonversi menjadi JPEG 1200 × 630 dengan crop tengah. Thumbnail saja tersedia tanpa login di /preview-image/{id}, sehingga crawler WhatsApp dapat membacanya; galeri, foto pasangan, dan musik tetap memakai sesi. Penggantian atau penghapusan thumbnail mencabut URL gambar lama. Mengganti tautan mencabut tautan lama dan seluruh sesi/perangkat. Menonaktifkan tamu langsung mencabut sesi.

Fingerprint agent v4 melalui custom subdomain `validator.firsta.my.id`, region `ap`. Public key memang boleh dipublikasikan. Secret key hanya di server. Origin, challenge cookie, umur event, linked ID dan event ID diverifikasi menggunakan Server API v4. Identitas dari browser tidak dipercaya. Transaksi Postgres mengunci baris tamu sehingga empat atau lebih request bersamaan tetap dibatasi tiga visitor IDs. Visitor yang sama dapat kembali tanpa memakai slot baru; fingerprint mengenali profil/browser, bukan jaminan tiga unit hardware fisik.

Ad blocker harus dinonaktifkan untuk tes CDN lokal. Helium terdeteksi sebagai anti-detect/tampering pada pengujian ini dan ditolak oleh kebijakan server yang ketat; uji juga Safari/Chrome biasa. Custom subdomain sudah Active dan environment Render `FINGERPRINT_ENDPOINT=https://validator.firsta.my.id` sudah diisi. Agent memakai `/web/v4/` dan `endpoints` pada subdomain tersebut, tetap dengan region `ap`. Alur tamu Chrome di domain produksi berhasil pada 14 Oktober 2026.

Media disimpan di tiga belas slot Postgres; foto didekode, diputar sesuai EXIF, diperkecil dan dikonversi ke WebP. Ini cukup untuk undangan kecil. Gunakan object storage jika galeri besar; transfer media memakai bandwidth database. MP3 dibatasi 25 MiB dengan validasi header frame; audio belum dipilih pengguna. Fixture tes `tests/fixtures/silence.mp3` adalah 40 frame MPEG-1 Layer III hening yang dibuat sendiri, bukan lagu produksi; decoder macOS memeriksanya. Media hanya dilayani kepada sesi admin/tamu aktif, dengan dukungan Range.

## Sumbangan, konfirmasi & ucapan

Logo bank memakai artwork dari situs resmi [blu](https://blubybcadigital.id/) dan [Mandiri](https://www.bankmandiri.co.id/en/brandguideline), disimpan lokal sebagai WebP tanpa mengubah warna atau bentuk logo.

Rekening sumbangan disembunyikan sampai tombol “Kirim Hadiah” ditekan. Satu kartu ringkas memuat dua rekening beserta logo bank, nomor rekening, nama pemilik, dan tombol salin masing-masing. Rekening blu **0033 1600 0000** milik **Firsta Adi Pradana** dan Mandiri **1350018340537** milik **TALITHA SYAHDA ARUND**; nama pemilik ditampilkan di bawah nomor rekening dan tersedia pada label aksesibilitas. Masing-masing memiliki tombol salin (digit saja, termasuk nol di depan) dan pilihan salin manual jika clipboard tidak tersedia. Tamu yang sudah terverifikasi dapat memilih Hadir/Tidak hadir/Belum pasti, mengisi jumlah hadir 1–10 orang termasuk dirinya, dan ucapan opsional maksimal 1000 karakter. Satu jawaban per undangan tersimpan di Postgres dan dapat diperbarui dari perangkat yang terdaftar. Kosongkan ucapan untuk menghapusnya dari daftar. Preview admin/desain tidak dapat mengirim jawaban.

Ucapan tamu aktif terlihat oleh tamu lain, sepuluh per halaman; status kehadiran dan jumlah tamu hanya diberikan kepada tamu pemilik undangan serta admin. Dashboard tamu memuat konfirmasi, ucapan, dan rekap jumlah hadir untuk undangan aktif. Menghapus tamu juga menghapus jawabannya; menonaktifkan tamu menyembunyikan ucapan tanpa menghapus jawaban. Migrasi menambahkan tabel `wedding.responses` tanpa mengubah data tamu lama. Jalankan migrasi sebelum menjalankan kode baru (Docker sudah menjalankannya saat startup).

API `PUT /api/response` membutuhkan sesi tamu aktif dan Origin situs yang sesuai, membatasi 20 percobaan/menit per IP, dan menolak identitas tamu dari payload. `GET /api/invitation` memuat jawaban sendiri serta `canRespond`; `GET /api/wishes?page=1` hanya memuat nama, ucapan, dan waktu pembaruan. Pengiriman identik tidak mengubah waktu pembaruan. Pagination memakai offset sehingga daftar dapat bergeser jika ucapan diperbarui saat membaca.

## Verifikasi

```sh
npm test
npm run test:integration
```

Tes integrasi memerlukan Postman CLI, `TEST_DATABASE_URL` dan `TEST_DATABASE_URL_UNPOOLED` pada `.env.test.local`, menunjuk branch terpisah `dev-invitation-verification`. Tes menghapus data pada branch pengujian tersebut; jangan pernah memakai koneksi produksi. Branch test kedaluwarsa 20 Oktober 2026, buat ulang untuk pengujian berikutnya. Pemeriksaan RSVP lokal menjalankan tiga request Postman dengan tujuh assertion (simpan jawaban, baca jawaban sendiri, dan daftar ucapan); hasil lengkap dicetak oleh tes integrasi. Tampilan sumbangan, tombol salin, pengiriman, pengisian ulang setelah reload, dan rekap admin diperiksa di Chrome; layout formulir serta ucapan juga diperiksa pada emulasi 400 piksel.

Kontrak API: `postman/specs/invitation.json`. Koleksi yang dihasilkan: `postman/collections/Wedding Invitation API`. Syntax spec dan lint koleksi lulus. Health dan konfigurasi Fingerprint produksi diuji dengan dua request, lima assertion, nol kegagalan. Governance lint Postman tidak dijalankan karena tidak ada login Postman; file lokal tetap dapat diuji.

```sh
postman collection run 'postman/collections/Wedding Invitation API' -i 'Health check' --no-report-events
```

## Hosting

Untuk VPS Ubuntu 24.04 dengan repo GitHub private, lihat [setup GitHub Actions dan deployment Docker](docs/vps-deploy.md). Workflow build/tes berjalan pada pull request dan `main`; deploy VPS baru aktif setelah `VPS_DEPLOY_ENABLED=true` dan repository secrets diisi.

Repository: https://github.com/firstaadi-dev/wedding-invitation
Render service: `srv-db7335bncjis73fbrlpg`, Docker, Singapore, paket free. `Dockerfile` menjalankan build dan tes unit saat image dibangun, kemudian migrasi dan server saat startup. Bind `0.0.0.0:$PORT`; health `/healthz` menguji database. Tidak membutuhkan persistent disk karena metadata dan media ada di Neon.

Peta venue memakai URL embed resmi dari Google Maps, disimpan melalui CMS dan diperiksa di Chrome.

Domain: https://wedding.firsta.my.id. CNAME `wedding` menuju `wedding-invitation-zuta.onrender.com`. Semua secret environment diisi lewat API Render tanpa masuk repository. File lokal `.env*` dan context Docker mengecualikan secret.

## Desain

Scroll berhenti di batas section dengan native scroll snap; section panjang tetap bisa digulir. Konten masuk dengan perspektif 3D ringan, parallax hutan, kartu membulat dan bayangan berlapis. Kartu muncul bergantian dari kiri/kanan dengan fade-in setiap masuk layar, termasuk saat scroll kembali dari arah sebaliknya; animasi direset setelah kartu sepenuhnya keluar layar. Kartu tetap terlihat tanpa JavaScript/IntersectionObserver, saat menerima fokus keyboard, dan saat reduced motion aktif. Reduced motion mematikan snap, parallax dan gerakan konten.

- [Prompt amplop terbaru](docs/stitch-envelope-prompt.md)
- [Brief desain/pengembangan](docs/stitch-prompts.md)
- [Penyelarasan kartu dan map bersama Stitch](docs/stitch-card-notes.md)
- [Redesign CMS dengan branding weddinvita](docs/weddinvita-cms-results.md)
- [Proyek Google Stitch](https://stitch.withgoogle.com/projects/3122156932953261093)
- [Aset visual](docs/asset-prompts.md)
- [Status dan bukti verifikasi](docs/stitch-results.md)

Nama kedua acara dan jam acara bisa diubah melalui CMS. Countdown menuju 22 November 2026, dengan jam tujuan dalam WIB yang diatur terpisah (bawaan 00.00). Migrasi memperluas slot galeri tanpa menghapus foto lama. Peta embed dapat diisi di CMS; tamu membuka Google Maps melalui tombol di embed peta. Perangkat mobile fisik, performa jaringan seluler dan runtime reduced motion belum diuji. Safari desktop telah melewati verifikasi tamu produksi dan membuka segel. Bukti build/test/runtime serta status custom subdomain tersedia di dokumen verifikasi.
