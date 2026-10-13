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

CMS mengelola tambah/edit/hapus/aktif/nonaktif tamu, tautan pengganti, reset perangkat, foto pasangan, tiga foto galeri, lagu MP3, jam acara, dan URL embed resmi Google Maps. Tautan rahasia tampil sekali saat dibuat/diganti; simpan sebelum meninggalkan halaman. Hash tautan, bukan token asli, tersimpan di database. Mengganti tautan mencabut tautan lama dan seluruh sesi/perangkat. Menonaktifkan tamu langsung mencabut sesi.

Fingerprint agent v4 melalui custom subdomain `validator.firsta.my.id`, region `ap`. Public key memang boleh dipublikasikan. Secret key hanya di server. Origin, challenge cookie, umur event, linked ID dan event ID diverifikasi menggunakan Server API v4. Identitas dari browser tidak dipercaya. Transaksi Postgres mengunci baris tamu sehingga empat atau lebih request bersamaan tetap dibatasi tiga visitor IDs. Visitor yang sama dapat kembali tanpa memakai slot baru; fingerprint mengenali profil/browser, bukan jaminan tiga unit hardware fisik.

Ad blocker harus dinonaktifkan untuk tes CDN lokal. Helium terdeteksi sebagai anti-detect/tampering pada pengujian ini dan ditolak oleh kebijakan server yang ketat; uji juga Safari/Chrome biasa. Custom subdomain sudah Active dan environment Render `FINGERPRINT_ENDPOINT=https://validator.firsta.my.id` sudah diisi. Agent memakai `/web/v4/` dan `endpoints` pada subdomain tersebut, tetap dengan region `ap`. Alur tamu Chrome di domain produksi berhasil pada 14 Oktober 2026.

Media disimpan di enam slot Postgres; foto didekode, diputar sesuai EXIF, diperkecil dan dikonversi ke WebP. Ini cukup untuk undangan kecil. Gunakan object storage jika galeri besar; transfer media memakai bandwidth database. MP3 dibatasi 25 MiB dengan validasi header frame; audio belum dipilih pengguna. Fixture tes `tests/fixtures/silence.mp3` adalah 40 frame MPEG-1 Layer III hening yang dibuat sendiri, bukan lagu produksi; decoder macOS memeriksanya. Media hanya dilayani kepada sesi admin/tamu aktif, dengan dukungan Range.

## Verifikasi

```sh
npm test
npm run test:integration
```

Tes integrasi memerlukan `TEST_DATABASE_URL` dan `TEST_DATABASE_URL_UNPOOLED` pada `.env.test.local`, menunjuk branch terpisah `dev-invitation-verification`. Tes menghapus data pada branch pengujian tersebut; jangan pernah memakai koneksi produksi. Branch test kedaluwarsa 20 Oktober 2026, buat ulang untuk pengujian berikutnya.

Kontrak API: `postman/specs/invitation.json`. Koleksi yang dihasilkan: `postman/collections/Wedding Invitation API`. Syntax spec dan lint koleksi lulus. Health dan konfigurasi Fingerprint produksi diuji dengan dua request, lima assertion, nol kegagalan. Governance lint Postman tidak dijalankan karena tidak ada login Postman; file lokal tetap dapat diuji.

```sh
postman collection run 'postman/collections/Wedding Invitation API' -i 'Health check' --no-report-events
```

## Hosting

Repository: https://github.com/firstaadi-dev/wedding-invitation
Render service: `srv-db7335bncjis73fbrlpg`, Docker, Singapore, paket free. `Dockerfile` menjalankan build dan tes unit saat image dibangun, kemudian migrasi dan server saat startup. Bind `0.0.0.0:$PORT`; health `/healthz` menguji database. Tidak membutuhkan persistent disk karena metadata dan media ada di Neon.

Peta venue memakai URL embed resmi dari Google Maps, disimpan melalui CMS dan diperiksa di Chrome.

Domain: https://wedding.firsta.my.id. CNAME `wedding` menuju `wedding-invitation-zuta.onrender.com`. Semua secret environment diisi lewat API Render tanpa masuk repository. File lokal `.env*` dan context Docker mengecualikan secret.

## Desain

- [Prompt amplop terbaru](docs/stitch-envelope-prompt.md)
- [Brief desain/pengembangan](docs/stitch-prompts.md)
- [Proyek Google Stitch](https://stitch.withgoogle.com/projects/3122156932953261093)
- [Aset visual](docs/asset-prompts.md)
- [Status dan bukti verifikasi](docs/stitch-results.md)

Jam acara belum diberikan; peta embed dapat diisi di CMS; tautan lokasi yang diberikan pengguna tetap berfungsi. Perangkat mobile fisik, performa jaringan seluler dan runtime reduced motion belum diuji. Safari desktop telah melewati verifikasi tamu produksi dan membuka segel. Bukti build/test/runtime serta status custom subdomain tersedia di dokumen verifikasi.
