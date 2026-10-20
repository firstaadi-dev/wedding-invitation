# Multi-Tenant Foundation

Tahap pertama mempertahankan frontend `public/`, backend `server/`, driver `pg`, dan PostgreSQL. Pendaftaran publik tidak memiliki halaman atau endpoint. Akun dibuat melalui [migration akun](../db/accounts/README.md).

## Kepemilikan Dan Isolasi

`accounts → tenants → guests / settings / media`. Saat ini satu akun memiliki satu tenant undangan. RSVP, perangkat, challenge, dan sesi tamu mengikuti tamu melalui foreign key. Sesi admin menyimpan pasangan akun dan tenant dengan foreign key gabungan. Menonaktifkan akun membatalkan akses efektif seluruh sesi tenant tersebut.

Tenant admin ditentukan dari sesi yang diverifikasi server; tenant tamu ditentukan dari token undangan dan sesi tamu. Payload tidak menerima `tenant_id`. Daftar dan perubahan tamu, media privat, pengaturan, dan ucapan dibatasi ke tenant terkait. ID tamu atau media tenant lain menghasilkan 404. Thumbnail preview sengaja publik untuk crawler WhatsApp. Isolasi query diterapkan di aplikasi, bukan PostgreSQL RLS; endpoint baru wajib menerapkan scope dan menjalankan tes lintas tenant.

Link baru berbentuk `/i/{slug}#{secret}`. Fragment dihapus sebelum Fingerprint berjalan. Slug memilih landing page dan metadata publik; slug tidak memberikan akses API. Link lama `/#secret` dan sesi tamu lama tetap valid.

## Migration Data Lama

`db/001-multi-tenant.sql` mengaitkan data lama ke tenant `firsta-talitha`, milik `firstaadip16@gmail.com`. `ADMIN_PASSWORD_HASH` hanya dipakai saat bootstrap untuk menyalin hash lama, sehingga password tetap sama. Tidak ada plaintext password di migration. Migration dicatat dan dikunci dalam transaksi; pengulangan tidak mengubah password atau memindahkan data. Sesi admin lama dihapus karena belum memiliki identitas akun; admin masuk kembali dengan email dan password yang sama.

**Deploy kode dan migration sebagai satu cutover.** Schema baru tidak kompatibel dengan query global versi lama. Hentikan instance lama terlebih dahulu, lalu jalankan image baru; startup Docker menjalankan migration sebelum server mulai. Pastikan `ADMIN_PASSWORD_HASH` lama masih tersedia pada deployment pertama. Jangan jalankan migration produksi sambil instance lama masih melayani request. Siapkan branch/restore point sebelum cutover. Rollback memerlukan kode dan database yang cocok, bukan mengembalikan kode lama saja.

Pengujian awal pada salinan produksi mempertahankan 6 tamu, 12 media dan 11 catatan perangkat, serta memastikan hash password pemilik tidak berubah. Branch pengujian `dev-multitenant-20261020` kedaluwarsa 27 Oktober 2026.

## Arah Stack Berikutnya

Pilihan backend pengguna: **Go**. Pemindahan framework ditunda sampai fondasi tenant stabil.

- Frontend CMS: rekomendasi React + TypeScript dengan Vite untuk build; formulir, dialog, navigasi dan state UI dapat dikelola sebagai komponen. Lihat [integrasi React bertahap](https://react.dev/learn/add-react-to-an-existing-project).
- Backend: Go, mulai dengan `net/http` dan query PostgreSQL yang eksplisit. Router standar mendukung method dan parameter path; kebutuhan route saat ini belum memerlukan framework besar. Lihat [dokumentasi ServeMux](https://pkg.go.dev/net/http#ServeMux). Pertahankan schema, kontrak OpenAPI, perilaku cookie/CSRF, dan hash scrypt selama transisi agar akun lama tetap dapat masuk.
- Tetap satu repo dan origin; `/api` diteruskan ke backend. Deployment terpisah dilakukan saat kebutuhan operasional memerlukannya. Template undangan publik dapat tetap HTML/CSS saat CMS dipindahkan bertahap.

Ini arah arsitektur, belum implementasi Go atau React. ORM, microservices, billing, paket langganan, dan custom domain tidak termasuk tahap ini.

## Batas Sebelum Dijual

Fondasi data multi-tenant belum membuat template menjadi produk siap jual. Nama lengkap pasangan dan orang tua, tanggal, venue, rekening hadiah, countdown, dan template WhatsApp bawaan masih khusus Firsta & Talitha. Identitas acara dan template harus dibuat per tenant sebelum mengaktifkan undangan pelanggan lain. Media masih berada di PostgreSQL; pindahkan ke object storage saat kebutuhan pelanggan memerlukannya.

## Verifikasi

`npm test`, `npm run build`, dan `npm run test:integration`. Tes integrasi memakai `.env.test.local` dengan `TEST_DATABASE_URL` dan `TEST_DATABASE_URL_UNPOOLED` menuju branch disposable. Tes menghapus data branch tersebut; jangan memakai koneksi produksi.

Tes mencakup migration schema lama, keutuhan link/sesi tamu/media/RSVP, password bootstrap dan pengulangan, login email, cookie/CSRF/logout, provisioning akun idempotent, dua tenant, seluruh mutasi tamu lintas tenant, pengaturan, media privat, metadata publik, ucapan, status akun, serta ketiadaan pendaftaran publik. Postman dijalankan terhadap backend lokal dan database branch nyata. Fingerprint menggunakan event fixture terverifikasi, bukan request ke Fingerprint produksi.
