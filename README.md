# weddinvita — Undangan Firsta & Talitha

Undangan satu halaman tanpa navigasi: amplop burgundy, segel pembuka, transisi joglo, hutan berlapis, QS. Ar-Rum 30:21, dan orang tua terkonfirmasi. Tanggal 22 November 2026. Foto dan lagu tetap placeholder sampai diunggah melalui CMS.

## Jalankan

Node.js 22+, Go 1.26+, libvips (8.15+), npm, dan Neon Postgres. Backend Go + Chi + pgx; CMS React + TypeScript; undangan HTML/CSS/JavaScript dibangun Vite.

```sh
npm ci
npm ci --prefix frontend
npm run build
npm run db:migrate
# Terminal pertama, backend 5174:
npm run dev
# Terminal kedua, frontend Vite 5173:
npm run dev:frontend
```

Atur `PUBLIC_ORIGIN=http://invitation.localhost:5173` dan `CMS_ORIGIN=http://dashboard.localhost:5173` untuk development. Buka http://dashboard.localhost:5173 untuk CMS, `/preview` pada host dashboard dengan sesi admin, atau tautan tamu pada host invitation. Vite meneruskan route aplikasi ke Go; Go tetap memilih halaman akses/undangan dan metadata tenant. Pada development backend membaca source template; produksi memakai hasil build Vite. `npm start` menjalankan backend dengan template hasil build dan membutuhkan frontend/proxy terpisah.

`neon.ts` tetap memakai Postgres. Koneksi `DATABASE_URL` pooled dipakai aplikasi; `DATABASE_URL_UNPOOLED` dipakai migrasi. Query menyebut schema `wedding` secara eksplisit, tanpa ORM. PostgreSQL dan media tetap di Neon.

Isi environment mengikuti `.env.example`. Password admin minimal 12 karakter, disimpan sebagai hash scrypt. Untuk membuat hash tanpa menampilkan password di terminal (zsh):

```sh
read -s 'taskAdminPassword?Password admin: '
printf '%s' "$taskAdminPassword" | npm run --silent admin:hash
unset taskAdminPassword
```

Login memakai email akun dan password. Migration pertama mengaitkan data lama ke `firstaadip16@gmail.com` / tenant `firsta-talitha` dengan menyalin `ADMIN_PASSWORD_HASH` yang ada; password tetap sama dan admin perlu masuk kembali. Setelah bootstrap, password hash disimpan per akun di database. Mengganti environment bootstrap tidak mereset password akun. Rotasi password memakai migration khusus yang memperbarui hash akun dan menghapus sesi admin akun tersebut dalam satu transaksi. Jangan kirim password atau secret API ke GitHub.

Pendaftaran publik dinonaktifkan. Akun baru hanya dibuat melalui [migration akun](backend/db/accounts/README.md). [Desain multi-tenant, urutan deployment, arah stack Go, dan batas sebelum dikomersialkan](docs/multi-tenant.md). Pemisahan stack ini mempertahankan schema dan riwayat migrasi yang sudah ada.

## CMS dan akses tamu

CMS pada root `dashboard.domain.id` memakai branding **weddinvita** dengan halaman Tamu Undangan, Pesan & Preview, Foto & Lagu, dan Detail Acara. Sidebar desktop beralih menjadi drawer navigasi di ponsel; daftar tamu tetap tabel dan dapat digeser horizontal pada layar kecil. Formulir tambah/edit memakai drawer desktop dan sheet mobile. [Cakupan implementasi dan bukti pengujian](docs/weddinvita-cms-implementation.md).

CMS mengelola tambah/edit/hapus/aktif/nonaktif tamu, tautan pengganti, reset perangkat, foto pasangan, hingga sembilan foto galeri dengan foto utama, thumbnail dan pembesaran, lagu MP3, nama serta jam acara, jam countdown (WIB), dan URL embed resmi Google Maps. Tautan baru berbentuk `https://invitation.domain.id/u/<kode-acak>` dengan kode 27 karakter (160 bit) berbeda untuk setiap tamu, tanpa nama pasangan atau acara. ID publik UUID acara tetap dipakai untuk metadata dan scope API. [Panduan rollout dan cutover seluruh akun](docs/guest-code-links.md) menjelaskan pencabutan link lama serta reset perangkat secara eksplisit. Metadata WhatsApp tetap dapat menampilkan nama dan informasi acara. Tautan rahasia yang baru dibuat/diganti tersimpan di database bersama nomor telepon opsional dan dapat disalin kembali dari daftar tamu. Hash tetap digunakan untuk memverifikasi akses; URL asli kini juga tersimpan dan hanya diberikan kepada admin. Link tamu lama tetap berlaku, tetapi tidak dapat dipulihkan dari hash: jika link asli sudah hilang, gunakan Tautan baru dan kirim ulang. Nomor 08… otomatis diubah ke 62…; format internasional +kode negara juga diterima. Tombol Kirim membuka wa.me dengan pesan terisi; admin menekan kirim dari WhatsApp. Template global mendukung {nama} dan {link} (wajib), dapat diedit di bagian Pesan WhatsApp & preview tautan. Judul dan deskripsi preview di bagian yang sama menghasilkan metadata HTML/Open Graph pada halaman publik; nama domain tetap mengikuti PUBLIC_ORIGIN. Template dan nomor telepon tidak diberikan melalui API undangan tamu. Thumbnail preview dapat diunggah/diganti/dihapus di bagian yang sama, terpisah dari galeri. JPG/PNG/WebP maksimal 12 MiB dikonversi menjadi JPEG 1200 × 630 dengan crop tengah. Thumbnail saja tersedia tanpa login di /preview-image/{id}, sehingga crawler WhatsApp dapat membacanya; galeri, foto pasangan, dan musik tetap memakai sesi. Penggantian atau penghapusan thumbnail mencabut URL gambar lama. Mengganti tautan mencabut tautan lama dan seluruh sesi/perangkat. Menonaktifkan tamu langsung mencabut sesi.

Fingerprint agent v4 melalui custom subdomain `validator.firsta.my.id`, region `ap`. Public key memang boleh dipublikasikan. Secret key hanya di server. Origin, challenge cookie, umur event, linked ID dan event ID diverifikasi menggunakan Server API v4. Identitas dari browser tidak dipercaya. Transaksi Postgres mengunci baris tamu sehingga empat atau lebih request bersamaan tetap dibatasi tiga visitor IDs. Visitor yang sama dapat kembali tanpa memakai slot baru; fingerprint mengenali profil/browser, bukan jaminan tiga unit hardware fisik.

Ad blocker harus dinonaktifkan untuk tes CDN lokal. Helium terdeteksi sebagai anti-detect/tampering pada pengujian ini dan ditolak oleh kebijakan server yang ketat; uji juga Safari/Chrome biasa. Custom subdomain sudah Active dan environment Render `FINGERPRINT_ENDPOINT=https://validator.firsta.my.id` sudah diisi. Agent memakai `/web/v4/` dan `endpoints` pada subdomain tersebut, tetap dengan region `ap`. Alur tamu Chrome di domain produksi berhasil pada 14 Oktober 2026.

Media disimpan di tiga belas slot Postgres; foto didekode, diputar sesuai EXIF, diperkecil dan dikonversi ke WebP. Ini cukup untuk undangan kecil. Gunakan object storage jika galeri besar; transfer media memakai bandwidth database. MP3 dibatasi 25 MiB dengan validasi header frame; audio belum dipilih pengguna. Fixture tes `tests/fixtures/silence.mp3` adalah 40 frame MPEG-1 Layer III hening yang dibuat sendiri, bukan lagu produksi; decoder macOS memeriksanya. Media hanya dilayani kepada sesi admin/tamu aktif, dengan dukungan Range.

## Sumbangan, konfirmasi & ucapan

Logo bank memakai artwork dari situs resmi [blu](https://blubybcadigital.id/) dan [Mandiri](https://www.bankmandiri.co.id/en/brandguideline), disimpan lokal sebagai WebP tanpa mengubah warna atau bentuk logo.

Rekening sumbangan disembunyikan sampai tombol “Kirim Hadiah” ditekan. Satu kartu ringkas memuat dua rekening beserta logo bank, nomor rekening, nama pemilik, dan tombol salin masing-masing. Rekening blu **0033 1600 0000** milik **Firsta Adi Pradana** dan Mandiri **1350018340537** milik **TALITHA SYAHDA ARUND**; nama pemilik ditampilkan di bawah nomor rekening dan tersedia pada label aksesibilitas. Masing-masing memiliki tombol salin (digit saja, termasuk nol di depan) dan pilihan salin manual jika clipboard tidak tersedia. Tamu yang sudah terverifikasi dapat memilih Hadir/Tidak hadir/Belum pasti, mengisi jumlah hadir 1–10 orang termasuk dirinya, dan ucapan opsional maksimal 1000 karakter. Satu jawaban per undangan tersimpan di Postgres dan dapat diperbarui dari perangkat yang terdaftar. Kosongkan ucapan untuk menghapusnya dari daftar. Preview admin/desain tidak dapat mengirim jawaban.

Ucapan tamu aktif terlihat oleh tamu lain, sepuluh per halaman; status kehadiran dan jumlah tamu hanya diberikan kepada tamu pemilik undangan serta admin. Dashboard tamu memuat konfirmasi, ucapan, dan rekap jumlah hadir untuk undangan aktif. Menghapus tamu juga menghapus jawabannya; menonaktifkan tamu menyembunyikan ucapan tanpa menghapus jawaban. Migrasi menambahkan tabel `wedding.responses` tanpa mengubah data tamu lama. Deployment menjalankan migrasi sekali sebelum mengganti backend. Startup service tidak menjalankan migrasi.

API `PUT /api/response` membutuhkan sesi tamu aktif dan Origin situs yang sesuai, membatasi 20 percobaan/menit per IP, dan menolak identitas tamu dari payload. `GET /api/invitation` memuat jawaban sendiri serta `canRespond`; `GET /api/wishes?page=1` hanya memuat nama, ucapan, dan waktu pembaruan. Pengiriman identik tidak mengubah waktu pembaruan. Pagination memakai offset sehingga daftar dapat bergeser jika ucapan diperbarui saat membaca.

## Verifikasi

```sh
npm test
npm run test:integration
```

Tes integrasi memerlukan Postman CLI, `TEST_DATABASE_DISPOSABLE=1`, serta `TEST_DATABASE_URL` dan `TEST_DATABASE_URL_UNPOOLED` pada `.env.test.local` menuju database disposable. Tes menghapus data pengujian. Jangan memakai koneksi produksi. Contoh lokal:

```sh
docker run --name invitation-test-db -e POSTGRES_PASSWORD=invitation-test -e POSTGRES_DB=invitation_test -p 127.0.0.1:55439:5432 -d postgres:17-alpine
cp .env.test.example .env.test.local
npm run test:integration
# Selesai pengujian:
docker stop invitation-test-db
docker rm -v invitation-test-db
```

Tes mempertahankan fixture legacy dan menjalankan backend Go sesungguhnya. Server API Fingerprint memakai Postman simulation melalui HTTP; log diperiksa untuk membuktikan request verifier terjadi. Koleksi Postman yang sama memeriksa RSVP, sesi admin, dan isolasi tenant. Output lengkap dicetak ke terminal. Kontrak API: `postman/specs/invitation.json`; koleksi `postman/collections/Wedding Invitation API`.

Tes deployment memeriksa pemilihan service dan state saat kegagalan. Untuk membuktikan ID container service lain tetap sama dengan Docker nyata:

```sh
docker build -f frontend/Dockerfile -t wedding-split-frontend:test .
docker build -f backend/Dockerfile -t wedding-split-backend:test .
npm run test:deploy
```

## Hosting

Untuk VPS Ubuntu 24.04 dengan repo GitHub private, lihat [setup GitHub Actions dan deployment Docker](docs/vps-deploy.md). Workflow build/tes berjalan pada pull request dan `main`; deploy VPS baru aktif setelah `VPS_DEPLOY_ENABLED=true` dan repository secrets diisi.

Repository: https://github.com/firstaadi-dev/wedding-invitation

Dua image mempunyai Dockerfile masing-masing. Caddy host mengelola HTTPS dan routing; port service hanya tersedia lewat localhost. Go menyuntikkan metadata WhatsApp pada template hasil build. CI membandingkan perubahan dengan commit terakhir yang berhasil dideploy, menyimpan pasangan image di VPS setelah sehat, dan hanya mengganti service yang terpengaruh. Detail cutover hosting lama, secrets, trigger manual, dan rollback ada di [panduan VPS](docs/vps-deploy.md).

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
