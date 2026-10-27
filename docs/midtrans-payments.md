# Pembayaran dan aktivasi akun

Alur mandiri: **Buat akun → Bayar Rp199.000 → Akses 12 bulan aktif**. Halaman CMS menyediakan form daftar dan masuk. Sebelum bayar, akun hanya boleh membaca sesi/status pembayaran, melanjutkan checkout, memeriksa pembayaran, dan logout. CMS, preview, media, tautan tamu, verifikasi tamu, serta undangan membutuhkan akses yang masih berlaku.

## Pilihan integrasi

Memakai **Midtrans Snap Redirect**, dengan `enabled_payments: [gopay, other_qris]`. Midtrans mengelola halaman checkout dan QRIS, tanpa SDK pembayaran browser atau Client Key. Backend Go membuat transaksi Snap dan menyimpan URL HTTPS yang divalidasi sebagai domain Midtrans sesuai lingkungan. Server Key hanya berada di backend.

Harga selalu ditentukan backend: **IDR 199000**, satu paket untuk **12 bulan kalender** sejak pembayaran dikonfirmasi server. Tidak ada debit/langganan otomatis. Setelah akses kedaluwarsa, pemilik tetap dapat masuk ke halaman pembayaran untuk membeli akses kembali. Akun lama/provisioning pengelola mempertahankan akses lamanya melalui `billing_required=false`; akun mandiri selalu `billing_required=true` dan tidak memperoleh akses sebelum pembayaran.

Referensi resmi: [request Snap](https://docs.midtrans.com/reference/request-body-json-parameter), [QRIS di Snap](https://docs.midtrans.com/docs/snap-advanced-feature), [verifikasi webhook](https://docs.midtrans.com/docs/https-notification-webhooks), dan [Get Status](https://docs.midtrans.com/reference/get-transaction-status).

## Konfigurasi

Pada environment backend (`.env.staging` lokal atau `app.env` di VPS):

```dotenv
MIDTRANS_ENV=sandbox
MIDTRANS_SERVER_KEY=ISI_SERVER_KEY_SANDBOX
```

Untuk transaksi nyata, gunakan `MIDTRANS_ENV=production` dan Server Key production pada deployment production. Jangan menaruh Server Key pada variable `VITE_*`, bundle frontend, Git, URL, atau log. Staging tetap Sandbox. Nilai mentah `app.env` tidak dibungkus kutip.

Di Midtrans Dashboard untuk lingkungan yang sesuai:

1. Pastikan GoPay/QRIS tersedia untuk merchant.
2. Atur Payment Notification URL ke `https://DOMAIN_CMS/api/payments/midtrans/notification`.
3. Finish Redirect URL menggunakan root CMS (`https://DOMAIN_CMS/#pembayaran`); backend juga mengirim callback ini ketika membuat checkout.
4. Pasang Caddyfile terbaru. Notifikasi hanya diteruskan pada host CMS; host invitation menolak `/api/payments/*`.

Endpoint notifikasi harus bisa diakses Midtrans melalui HTTPS publik. GET/HEAD pada URL yang sama memberi respons health HTTP 200 tanpa mengubah pembayaran. POST tetap wajib memiliki signature valid; event uji/ID order lain yang autentik diakui tanpa mengaktifkan akun. Request webhook tidak memerlukan cookie, CSRF, atau Origin. Semua mutasi browser tetap memerlukan Origin CMS dan, setelah login, CSRF. Kembali ke halaman selesai saja tidak mengaktifkan akses.

`MIDTRANS_API_ORIGIN` hanya untuk simulasi lokal: endpoint HTTP loopback, Sandbox, dan `NODE_ENV` non-production. Konfigurasi production menolaknya. Jangan mengisinya di VPS.

## Migrasi dan penyimpanan

Migration **5** (`backend/db/005-billing.sql`) menambahkan `accounts.billing_required`, `accounts.paid_until`, dan tabel `payments`. Jalankan lewat mekanisme migrasi repository; deployment backend menjalankannya sebelum pergantian container. Pada Neon staging, migrasi ini sudah diterapkan untuk uji Sandbox dari aplikasi lokal pada 27 Oktober 2026.

Checkout menyimpan niat pembayaran sebelum menghubungi Midtrans, agar timeout tidak kehilangan order yang mungkin dibayar. Request ulang memakai checkout yang sama selama masih berlaku; pembuatan yang terputus dapat dicoba ulang setelah lease satu menit. Batas waktu halaman/QRIS adalah 24 jam. Akun hanya memiliki satu order yang sedang disiapkan/menunggu pada satu waktu.

Notifikasi diperiksa dengan SHA512 `order_id + status_code + gross_amount + ServerKey` dan pembandingan konstan. Backend tetap meminta status aktual ke Midtrans melalui Basic Auth. Nominal, mata uang, ID order, lingkungan, status settlement, fraud status, dan metode QRIS/GoPay harus sesuai sebelum akses diberikan. Status `capture` kartu tidak dianggap berhasil karena integrasi ini hanya menawarkan GoPay/QRIS.

Penerapan akses dan update order memakai transaksi serta lock akun/payment. `activated_at` membuat notifikasi duplikat dan pemeriksaan manual idempoten: satu order tidak bisa memperpanjang dua kali. Event pending lama tidak menurunkan settlement; refund penuh mencabut grant order terkait. Refund sebagian mempertahankan masa akses yang sudah diberikan. Order dibaca berdasarkan akun sesi; browser tidak menentukan akun, harga, atau order yang diperiksa.

## API

Kontrak: [`postman/specs/invitation.json`](../postman/specs/invitation.json). Koleksi: [`Billing API`](../postman/collections/Billing%20API).

| Endpoint | Kegunaan |
| --- | --- |
| `POST /api/admin/register` | Daftar nama pasangan, email, password minimal 12 karakter; membuat tenant, settings, dan sesi |
| `GET /api/admin/billing` | Membaca paket, masa akses, dan pembayaran terakhir milik akun |
| `POST /api/admin/billing/payments` | Membuat/memakai ulang checkout Snap; body `{}` |
| `POST /api/admin/billing/refresh` | Meminta status server Midtrans; body `{}` |
| `POST /api/payments/midtrans/notification` | Webhook bertanda tangan; status tetap diverifikasi lewat API Midtrans |

Akun yang belum bayar/kedaluwarsa mendapatkan HTTP `402 payment_required` dari CMS. Login dan baca sesi tetap diizinkan agar pembayaran dapat dilanjutkan. Login dan pemulihan sesi memeriksa order yang belum terkonfirmasi langsung ke Midtrans sebelum mengembalikan status akses; webhook yang terlambat tidak memaksa pengguna membayar lagi atau refresh manual. UI menampilkan pemeriksaan status terlebih dahulu sebelum formulir pembayaran. Jika provider sedang gagal, autentikasi tetap diizinkan dan status dapat diperiksa ulang. Pending, canceled, denied, expired, gagal, atau hasil redirect browser tidak memberikan akses.

## Verifikasi

```sh
npm run build
npm test
# Hanya database disposable; suite ini mengubah/menghapus fixture datanya:
TEST_DATABASE_DISPOSABLE=1 TEST_DATABASE_URL=KONEKSI_TES TEST_DATABASE_URL_UNPOOLED=KONEKSI_TES_DIRECT npm run test:integration
```

`tests/billing.test.mjs` memakai provider HTTP fixture lokal dan database disposable. Menguji registrasi, Origin/CSRF, isolasi akun, harga tetap, reuse order, notifikasi palsu, nominal/mata uang/fraud/metode salah, settlement bersamaan, login/pemulihan sesi saat webhook terlambat, 12 bulan kalender, expiry sesi/media/tamu, refund, kegagalan provider, dan seluruh lima request koleksi Postman. Jangan arahkan suite disposable ke database staging yang dipakai bersama.

Uji manual Sandbox dapat memakai aplikasi lokal dengan Neon staging: set database staging dan kredensial Sandbox pada environment proses backend; sesuaikan Origin CMS/public dengan frontend lokal. Tidak perlu Docker. Buat akun, lanjutkan checkout, pilih QRIS, lalu gunakan [simulator QRIS Midtrans](https://simulator.sandbox.midtrans.com/v2/qris/index). Periksa status di halaman aktivasi; browser juga memeriksa otomatis setiap 20 detik. Untuk webhook langsung ke lokal, sediakan tunnel HTTPS dan konfigurasikan URL notifikasi Sandbox ke tunnel tersebut. Tanpa tunnel, pemeriksaan status server dari halaman pembayaran tetap dapat mengaktifkan akun.

Uji Sandbox aktual 27 Oktober 2026: order `wi-f7c1dd64-d91a-4a91-b1b9-2a733822a91a`, QRIS Rp199.000, status provider `settlement`, akses akun terkonfirmasi sampai 27 Oktober 2027, dan CMS menghasilkan HTTP 200. Uji memakai branch Neon staging dan proses aplikasi lokal; webhook HTTPS pada VPS belum diuji dalam sesi ini.

Uji webhook Midtrans aktual 27 Oktober 2026: setelah Payment Notification URL Sandbox diperbarui, transaksi baru `wi-8980458f-4088-4e95-82de-a027f2c159a1` mengirim dua POST dari Midtrans (`Veritrans`) ke endpoint HTTPS lokal melalui tunnel. Notifikasi pending diterima 20:26:04 WIB dan settlement diterima 20:26:13 WIB; keduanya dibalas HTTP 200. Database staging mencatat aktivasi pada 20:26:14 WIB dan akhir akses pada 27 Oktober 2027 20:26:14 WIB, tepat 12 bulan kalender. Riwayat/retry transaksi sebelum penggantian konfigurasi masih menunjukkan URL Supabase lama; gunakan transaksi baru untuk memverifikasi perubahan endpoint. Tunnel ini bersifat sementara dan harus diganti domain CMS saat deployment VPS.
