# Verifikasi pemisahan stack — 20 Oktober 2026

Implementasi mengikuti [arsitektur dan deployment](vps-deploy.md). Semua pemeriksaan berikut dijalankan lokal, tanpa memodifikasi Neon atau VPS produksi.

| Pemeriksaan | Hasil |
| --- | --- |
| Build TypeScript/Vite dan binary Go | Lulus |
| Helper undangan, CMS, WhatsApp, countdown dan referensi aset hasil build | Lulus (6 tes Node + assert entrance) |
| Unit Go, validasi input, scrypt kompatibel Node, Fingerprint, proxy trust | Lulus |
| Integrasi Go dengan PostgreSQL 17 disposable | 19 tes lulus, 0 gagal |
| Koleksi Postman RSVP | 3 request, 7 assertion, 0 gagal |
| Koleksi Postman autentikasi dan isolasi tenant | 6 request, 14 assertion, 0 gagal |
| Postman simulation Fingerprint | Go memanggil `/v4/events/` melalui HTTP; event valid, tidak ditemukan dan 503 diperiksa |
| Pemilihan deployment dan state atomik | 6 tes Python lulus: frontend/backend/template/docs/pertama/manual/retry/kegagalan |
| Docker smoke dengan container nyata | Lulus: deployment tunggal mempertahankan ID container dan image service lain; migrasi tidak dijalankan pada frontend saja |
| Dua image Docker | Berhasil dibangun pada Linux arm64 Docker Desktop |
| Caddy host dan frontend | Konfigurasi valid; root dashboard, isolasi host API, preview, cookie host-only, redirect lama dan metadata UUID diuji lewat Caddy nyata |
| Workflow GitHub Actions | `actionlint` lulus |
| OpenAPI | Postman lint: `No issues found.`; governance enterprise tidak tersedia pada paket CLI |
| Go vet dan `git diff --check` | Lulus |

Tes upgrade versi 1 ke 2 memeriksa UUID publik stabil saat migrasi diulang serta hash/link/kepemilikan tetap sama. Tes origin terpisah menolak mutasi admin dari host invitation dan mutasi tamu dari host dashboard. Link lama yang tersimpan dikembalikan CMS sebagai URL acak tanpa merotasi secret.

Tes migrasi membuat schema legacy berisi tamu, link, sesi tamu, media, pengaturan, perangkat, RSVP, dan hash scrypt lama. Migrasi Go mempertahankan semuanya dan tidak mengganti password ketika diulang. Tes runtime juga membuka link root lama dan menggunakan sesi tamu yang telah ada.

Tes API meliputi cookie/Origin/CSRF, input tidak dikenal, transaksi batas tiga perangkat pada enam request bersamaan, replay, RSVP idempoten, ucapan/paginasi, media privat, MP3 dan Range/HEAD, thumbnail publik 1200×630, penggantian/penghapusan media, metadata escaped, semua mutasi lintas tenant, akun nonaktif, pencabutan link/sesi/perangkat, logout, dan pendaftaran publik yang tetap tidak tersedia.

Perbandingan byte dengan commit sebelumnya memastikan `schema.sql`, `001-multi-tenant.sql`, CSS undangan, kode identifikasi browser, dan stylesheet CMS tidak berubah saat dipindah. HTML/JavaScript undangan disesuaikan untuk template Go dan scope UUID publik. CMS memakai komponen React dengan desain/CSS dan ikon SVG yang sama.

Pemeriksaan Chrome desktop mencakup login, tambah tamu, normalisasi WhatsApp, tautan baru, dan halaman pesan. Emulasi 400×844 mencakup drawer navigasi, halaman acara, penyimpanan pengaturan, serta slot foto/galeri/lagu. Console hanya berisi 401 sesi awal dan favicon 404; tidak ditemukan error JavaScript aplikasi. Ini bukan tes pada ponsel fisik.

Belum diverifikasi: eksekusi Actions pada runner amd64, login/pull GHCR private, SSH dan penggantian service di VPS nyata, DNS/HTTPS produksi, atau event Fingerprint produksi. Tidak ada deployment produksi atau migrasi data. Rollback aplikasi/database otomatis tidak disediakan; lihat panduan operasi sebelum cutover pertama.
