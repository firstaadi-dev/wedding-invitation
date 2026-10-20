# Multi-Tenant Foundation

Implementasi sekarang memakai frontend `frontend/` (CMS React/TypeScript, undangan HTML/JS, Vite) dan backend `backend/` (Go + Chi + pgx + govips/libvips). PostgreSQL dan media tetap di Neon. Pendaftaran publik tidak memiliki halaman atau endpoint. Akun dibuat melalui [migration akun](../backend/db/accounts/README.md).

## Kepemilikan Dan Isolasi

`accounts → tenants → guests / settings / media`. Saat ini satu akun memiliki satu tenant undangan. RSVP, perangkat, challenge, dan sesi tamu mengikuti tamu melalui foreign key. Sesi admin menyimpan pasangan akun dan tenant dengan foreign key gabungan. Menonaktifkan akun membatalkan akses efektif seluruh sesi tenant tersebut.

Tenant admin ditentukan dari sesi yang diverifikasi server; tenant tamu ditentukan dari token undangan dan sesi tamu. Payload tidak menerima `tenant_id`. Daftar dan perubahan tamu, media privat, pengaturan, dan ucapan dibatasi ke tenant terkait. ID tamu atau media tenant lain menghasilkan 404. Thumbnail preview sengaja publik untuk crawler WhatsApp. Isolasi query diterapkan di aplikasi, bukan PostgreSQL RLS; endpoint baru wajib menerapkan scope dan menjalankan tes lintas tenant.

Link baru berbentuk `https://invitation.domain.id/u/{code}`. Kode 27 karakter acak (160 bit) mengidentifikasi kredensial tamu melalui hash; tenant ditentukan backend dari tamu tersebut. `publicId` tetap UUIDv4 acak per tenant untuk canonical URL, metadata WhatsApp, dan scope API. Halaman kode selalu menampilkan verifikasi, termasuk ketika ada sesi tamu lain. Browser menghapus kode sebelum Fingerprint dimuat. `/i/{slug}`, `/{publicId}#secret`, `/#secret`, dan sesi lama tetap didukung selama rollout; [cutover seluruh akun](guest-code-links.md) mencabutnya dengan mengganti hash dan mereset perangkat. CMS menormalisasi origin link tersimpan tanpa mengganti kode/secret. Link yang tidak pernah disimpan tidak bisa dipulihkan dari hash.

## Migration Data Lama

`backend/db/001-multi-tenant.sql` mengaitkan data lama ke tenant `firsta-talitha`, milik `firstaadip16@gmail.com`. `ADMIN_PASSWORD_HASH` hanya dipakai saat bootstrap untuk menyalin hash lama, sehingga password tetap sama. Tidak ada plaintext password di migration. Migration dicatat dan dikunci dalam transaksi; pengulangan tidak mengubah password atau memindahkan data. Sesi admin lama dihapus karena belum memiliki identitas akun; admin masuk kembali dengan email dan password yang sama.

Migrasi versi 1 adalah cutover schema multi-tenant awal. Pemisahan Go/React mempertahankan SQL versi 1. Migrasi tambahan versi 2 (`002-public-invitation-id.sql`) menambahkan `tenants.public_id` acak dan unik, tanpa mengganti ID internal, hash, sesi, atau data lama. Go mempertahankan advisory lock, transaksi, hash, serta file SQL yang sama. Migrasi dijalankan sekali oleh deployment sebelum mengganti backend; startup service tidak menjalankan migrasi. Lihat [deployment VPS](vps-deploy.md).

Pengujian awal pada salinan produksi mempertahankan 6 tamu, 12 media dan 11 catatan perangkat, serta memastikan hash password pemilik tidak berubah. Branch pengujian `dev-multitenant-20261020` kedaluwarsa 27 Oktober 2026.

## Stack dan deployment

CMS memakai komponen React, state lokal dan fetch; undangan mempertahankan HTML/CSS/JavaScript. Go melayani API dan template HTML dengan metadata per tenant. Dua image berada dalam satu repository dengan dua host: CMS pada `dashboard.domain.id` dan undangan pada `invitation.domain.id`. Set `CMS_ORIGIN` dan `PUBLIC_ORIGIN` sesuai host tersebut. Cookie tetap host-only; API CMS dan preview memakai host dashboard, API tamu memakai host invitation. Tidak perlu CORS. Deployment memilih service dari perubahan sejak deployment sehat terakhir. [Aturan, routing, dan pemulihan](vps-deploy.md).

## Batas Sebelum Dijual

Fondasi data multi-tenant belum membuat template menjadi produk siap jual. Nama lengkap pasangan dan orang tua, tanggal, venue, rekening hadiah, countdown, dan template WhatsApp bawaan masih khusus Firsta & Talitha. Identitas acara dan template harus dibuat per tenant sebelum mengaktifkan undangan pelanggan lain. Media masih berada di PostgreSQL; pindahkan ke object storage saat kebutuhan pelanggan memerlukannya.

## Verifikasi

`npm test`, `npm run build`, dan `npm run test:integration`. Tes integrasi memakai `.env.test.local` dengan `TEST_DATABASE_URL` dan `TEST_DATABASE_URL_UNPOOLED` menuju database disposable, serta `TEST_DATABASE_DISPOSABLE=1`. Tes menghapus data branch tersebut; jangan memakai koneksi produksi.

Tes mencakup migration schema lama, keutuhan link/sesi tamu/media/RSVP, password bootstrap dan pengulangan, login email, cookie/CSRF/logout, provisioning akun idempotent, dua tenant, seluruh mutasi tamu lintas tenant, pengaturan, media privat, metadata publik, ucapan, status akun, serta ketiadaan pendaftaran publik. Postman dijalankan terhadap backend lokal dan database branch nyata. Fingerprint menggunakan event fixture terverifikasi, bukan request ke Fingerprint produksi.
