# Status kebutuhan

Desain Stitch kini dihubungkan ke backend Node dan Neon Postgres. Tabel ini membedakan bukti implementasi, hasil tes, dan hal yang masih menunggu konfigurasi.

| Kebutuhan | Bukti saat ini | Status |
|---|---|---|
| Adat Solo, hutan, burgundy/hijau/putih/coklat | Referensi fisik, aset WebP, `public/styles.css`, inspeksi browser | Diterapkan pada frontend |
| Bahasa Indonesia, nama, tanggal dan lokasi | `public/index.html`; hari Minggu 22 November 2026 diperiksa | Diterapkan |
| One page tanpa menu navigasi | Satu dokumen `public/index.html`, tes dan URL browser tetap sama saat membuka | Diterapkan |
| Cover amplop, nama sekali, alamat menyatu, segel “Tekan di sini” | Kode cover, aset sesuai referensi, browser 320 × 740 | Diterapkan |
| Transisi membuka amplop dan memasuki joglo | Flap rotateY, background scale, native smooth scroll; tombol dicoba di browser | Diterapkan; kalibrasi visual lanjutan masih dapat dilakukan |
| Pepohonan foreground per section, depth seolah 3D | Cutout RGBA, layer tiap section, transform scroll di `public/invitation.js` | Diterapkan |
| Mobile friendly | CSS responsive, tampilan 320 × 740 dan 393 × 852 diperiksa | Sebagian terverifikasi; perangkat fisik/Safari/performa seluler belum diuji |
| Reduced motion dan fallback JS | CSS media query, render progres 0 untuk reduced motion, konten awal tetap terlihat | Kode tersedia; emulasi/runtime belum diperiksa langsung |
| Orang tua | Empat nama dan penempatan dikonfirmasi pengguna; HTML dan tes | Diterapkan |
| Kutipan Al-Qur'an | QS. Ar-Rum 30:21, teks Arab, parafrasa makna, source link, font Amiri, browser | Diterapkan |
| Foto/lagu placeholder dan kontrol musik kecil | Bingkai tanpa manusia; lingkaran 44px nonaktif dengan label aksesibel | Diterapkan |
| Unique link per guest | Token acak 256-bit, hash token, CMS create/reissue; tes integrasi | Diterapkan |
| Fingerprint maksimal 3 perangkat | Agent v4 region ap + verifikasi Server API; transaksi Postgres; enam request paralel hanya tiga lolos; Safari live | Diterapkan untuk visitor IDs, bukan jaminan hardware fisik |
| CMS mengatur tamu/foto/lagu | `/admin`, cookie/CSRF, validasi file, penyimpanan Neon; tes end to end | Diterapkan |
| Peta embed | CMS menerima URL embed resmi, frontend iframe; URL asli tersedia | Fitur tersedia; URL embed aktual belum diisi |
| Hosting render.com | Dockerfile, health check, delapan environment di Render; custom domain verified | Konfigurasi selesai, menunggu bukti deploy live |
| Menggunakan MCP Google Stitch dan prompt pengembangan | Proyek `3122156932953261093`, manifest ekspor, dokumen prompt terbaru | Selesai untuk tahap desain |

## Pemeriksaan dijalankan

- `npm test` untuk fungsi progress dan invariant halaman.
- HTTP lokal mengembalikan 200.
- Browser: membuka undangan melalui tombol lalu fokus berpindah ke judul isi tanpa berpindah route; revisi segel masuk ke bagian ayat.
- Inspeksi PNG/WebP: foreground memiliki alpha transparan; aset frontend dikonversi ke WebP dan sumber PNG disimpan terpisah di `design/assets/`.
- Pemeriksaan nama orang tua dan teks ayat terhadap referensi yang tersedia.

Backend/CMS telah diuji pada branch Neon terpisah; satu alur tamu dengan Fingerprint nyata juga berhasil pada Safari. Situs live masih harus diperiksa setelah push dan deploy. Fingerprint custom subdomain `validator.firsta.my.id` masih Pending saat pemeriksaan terakhir; CDN digunakan sampai Active. Helium ditolak karena sinyal anti-detect/tampering. Tidak ada klaim batas tiga unit hardware fisik.

## Backend dan Neon — 13 Oktober 2026

- `npm i -g neon@latest` berhasil; Neon CLI 8.4.2.
- `neon init -y --org-id org-shiny-mode-58726130 --project-id bitter-pond-36732751 --branch production --services postgres` berhasil.
- `neon deploy`: `No changes — branch production already matches the policy. Utilized services: Postgres. Pulled 3 Neon variables into .env.local`.
- Driver `pg`, pooled connection untuk aplikasi; direct connection untuk migrasi. Startup search_path ditolak oleh pool Neon; diperbaiki dengan schema eksplisit pada query.
- `npm run build`: `Build passed: browser/server syntax, Neon config types, and referenced visual assets.`
- `npm test` lulus. `npm run test:integration`: 7 tests, 7 pass, 0 fail pada branch `dev-invitation-verification`, kedaluwarsa 20 Oktober 2026.
- Postman: syntax OpenAPI dan collection lint lulus; health 1 request, 2 assertions, 0 failed. Governance lint membutuhkan login dan tidak dijalankan.
- Server lokal: `Invitation server ready on port 5174; Neon Postgres connected.`
- Fingerprint CDN v4 mengembalikan visitor_id/event_id; Server API Asia mengembalikan event dan visitor. Safari membuka undangan dengan nama tamu setelah verifikasi live.
- Docker daemon lokal tidak berjalan; image akan dibuktikan lewat build Render.
- Secret dan password lokal dikecualikan dari Git dan context Docker.
