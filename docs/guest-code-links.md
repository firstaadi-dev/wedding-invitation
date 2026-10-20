# Tautan tamu dengan satu kode

Tautan baru berbentuk `https://invitation.domain.id/u/<kode>`. Kode sepanjang 27 karakter berasal dari 20 byte acak kriptografis (160 bit); setiap tamu memiliki kode sendiri. Kode adalah kredensial: siapa pun yang menerima tautan bisa mencoba membukanya. Batas tiga perangkat, challenge dan verifikasi Fingerprint tetap berlaku.

`GET`/`HEAD /u/<kode>` hanya menampilkan halaman verifikasi dan metadata acara publik. Tidak ada nama tamu, sesi baru, atau slot perangkat yang dialokasikan. Sesi tamu lain yang sudah ada tidak melewati verifikasi kode ini. Metadata Open Graph tetap memakai `/<publicId>` UUID acara, tanpa kode. Browser mengganti path menjadi UUID acara dengan penanda nonrahasia `?access=1` sebelum memuat Fingerprint; penanda memaksa halaman verifikasi pada reload meski ada sesi lain, lalu dihapus setelah berhasil; kode sementara disimpan di sessionStorage agar verifikasi dapat dicoba ulang, lalu dihapus setelah berhasil. Jangan menambahkan analytics atau script pihak ketiga sebelum langkah pembersihan tersebut.

Respons memakai `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, dan `X-Robots-Tag: noindex, nofollow`. Caddy melewati access log `/u/*` dan menyensor kode pada log error proxy. Backend tidak mencatat URL permintaan. Jika memakai CDN, load balancer, WAF, atau analytics tambahan, terapkan penyensoran yang sama di sana: kode dalam path mencapai proxy, berbeda dari fragment format lama.

Hash kode tetap dipakai untuk verifikasi. Link lengkap tetap disimpan pada data tamu agar admin dapat menyalin dan mengirim ulang. Tidak ada tabel alias atau perubahan schema baru. UUID acara tetap stabil untuk metadata dan scope API.

## Urutan rollout dan cutover seluruh akun

1. Pasang [Caddyfile](../deploy/Caddyfile) baru di host, dengan domain sebenarnya. Blok global `{ ... }` yang berisi `log default` harus berada paling atas, sebelum snippet `(backend)` maupun blok domain. Jika konfigurasi host sudah memiliki blok global, gabungkan `log default` ke dalam blok tersebut; jangan membuat blok global kedua. Validasi dan reload Caddy sesuai [panduan VPS](vps-deploy.md#domain-routing-dan-cutover). Workflow image tidak otomatis menyalin konfigurasi Caddy host. Lakukan ini **sebelum** backend baru mulai menghasilkan kode dalam path.
2. Deploy kedua image frontend dan backend, lalu pastikan keduanya sehat. Versi ini menerima kode baru maupun fragment lama; startup dan `migrate` tidak mengganti kredensial tamu. Simpan backup database yang terlindungi sesuai prosedur operasional sebelum cutover.
3. Dari direktori deployment VPS, jalankan dry-run di container backend baru. `FRONTEND_IMAGE` dan `BACKEND_IMAGE` harus menunjuk image sehat yang tercatat di `state.json`, sebagaimana saat menjalankan Compose untuk deployment biasa:

   ```sh
   docker compose exec -T backend invitation rotate-links
   ```

   Contoh keluaran hanya memuat jumlah per ID tenant internal, tanpa kode/link:

   ```json
   {"applied":false,"tenants":[{"tenant":"firsta-talitha","count":250}]}
   ```

4. Setelah hasil dry-run sesuai, jalankan cutover eksplisit:

   ```sh
   docker compose exec -T backend invitation rotate-links --apply
   ```

   Perintah memakai `DATABASE_URL_UNPOOLED` dan `PUBLIC_ORIGIN` dari environment backend. Scope selalu **seluruh akun**, termasuk tamu nonaktif dan link tersimpan yang hilang/rusak. Tidak ada parameter tenant.

5. Salin/kirim ulang link baru melalui CMS. Pengiriman tidak otomatis. Link lama berhenti berlaku dan sesi tamu lama dicabut pada commit transaksi. Admin tetap login.

## Jaminan dan batas operasi

- Satu transaksi mengganti hash/link, menaikkan versi tamu, menghapus challenge/sesi tamu, dan mengosongkan seluruh slot perangkat untuk setiap baris yang dirotasi. Jika satu pembaruan gagal, seluruh perubahan dibatalkan.
- Link `/u/<kode>` yang sudah valid **dan cocok dengan hash tersimpan** dilewati. Menjalankan ulang setelah sukses menghasilkan `tenants: []`; sesi/perangkat untuk kode yang dilewati tetap utuh. Link baru yang sudah dibuat selama rollout tidak perlu dikirim ulang.
- ID, nama, nomor WhatsApp, status aktif, RSVP/ucapan, pengaturan acara, media, dan sesi admin dipertahankan. Tamu nonaktif tetap nonaktif.
- Operasi menahan lock tabel tamu selama transaksi; tambah/edit/verifikasi tamu dapat menunggu. Pilih waktu sepi. Dry-run adalah perkiraan saat itu; perubahan daftar sebelum apply dapat mengubah jumlahnya.
- Tidak ada rollback kredensial otomatis. Sesudah link baru dibagikan, pertahankan backend dan frontend yang mendukung `/u/`; rollback ke aplikasi lama akan memutus link baru. Jangan memulihkan hash lama tanpa rencana pengiriman ulang.

Implementasi diuji pada PostgreSQL disposable lokal dan Fingerprint Server API melalui simulation Postman. Cutover produksi adalah langkah operasional terpisah setelah deployment sehat.
