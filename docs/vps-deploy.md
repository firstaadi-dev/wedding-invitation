# Frontend–backend di satu VPS

`frontend/` berisi CMS React/TypeScript dan undangan HTML/CSS/JavaScript, dibangun Vite. `backend/` berisi Go, Chi, pgx, govips/libvips, serta SQL eksplisit. Tidak ada runtime Node dalam image backend. Database dan media tetap di Neon, dengan schema dan catatan migrasi yang sama.

Caddy **di host** mengelola HTTPS dua subdomain. `dashboard.domain.id/` melayani CMS React; API admin, preview `/preview`, API pembaca preview, dan media pada host ini masuk Go. `invitation.domain.id/u/{code}` melayani halaman verifikasi undangan Go dengan kode acak tanpa nama; canonical URL acara tetap `/{publicId}`; `/assets/*` masuk frontend. API admin dan `/preview` ditolak pada host invitation. Cookie login tetap host-only dan mutasi memeriksa Origin masing-masing, tanpa CORS. Go membaca dua template HTML hasil Vite dan mengisi metadata Open Graph per tenant. Image frontend tidak berisi kredensial tamu; browser membersihkan kode dari URL sebelum memuat Fingerprint. Ikuti [rollout dan cutover kode tamu](guest-code-links.md) untuk penyensoran log Caddy serta penggantian link seluruh akun.

## Persiapan VPS

Gunakan Ubuntu 24.04 amd64, Docker Engine, Compose 2.30+ (untuk `env_file.format: raw`), Python 3, dan Caddy host. Build image berjalan di GitHub Actions.

```sh
sudo adduser --disabled-password --gecos '' deploy
sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy -m 700 /home/deploy/.ssh /opt/wedding-invitation
```

Grup Docker setara akses root. Pakai akun/key deployment khusus. Jika user sudah ada, jangan buat ulang. Buat key di komputer sendiri dan pasang public key ke `/home/deploy/.ssh/authorized_keys` dengan mode 600:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/wedding-deploy -C github-actions-wedding -N ''
```

Sebagai user `deploy` di VPS, login GHCR dengan token classic `read:packages` dari akun yang boleh membaca kedua package private:

```sh
read -r -s -p 'GHCR read token: ' taskGhcrToken
printf '%s' "$taskGhcrToken" | docker login ghcr.io -u USERNAME_GITHUB --password-stdin
unset taskGhcrToken
```

Siapkan `/opt/wedding-invitation/app.env`, mode 600, mengikuti `.env.example`:

```dotenv
PUBLIC_ORIGIN=https://invitation.domain.id
CMS_ORIGIN=https://dashboard.domain.id
DATABASE_URL=KONEKSI_NEON_POOLED
DATABASE_URL_UNPOOLED=KONEKSI_NEON_DIRECT
ADMIN_PASSWORD_HASH=HASH_LAMA_UNTUK_BOOTSTRAP
FINGERPRINT_PUBLIC_KEY=PUBLIC_KEY
FINGERPRINT_SECRET_KEY=SECRET_KEY
FINGERPRINT_REGION=ap
FINGERPRINT_ENDPOINT=https://SUBDOMAIN_FINGERPRINT_ACTIVE
```

Nilai mentah tanpa tanda kutip. Hash bootstrap hanya diperlukan jika migration versi 1 belum tercatat; jangan mengganti hash akun existing. Isi juga environment hash provisioning akun baru jika diperlukan. Jangan isi `FINGERPRINT_API_ORIGIN` di produksi: variabel itu mengarahkan HTTP client ke simulation lokal saat tes. Jangan membawa `RENDER` atau koneksi tes ke VPS.

## Domain, routing dan cutover

Arahkan DNS `dashboard.domain.id` dan `invitation.domain.id` langsung ke VPS, buka TCP 80/443 dan port SSH. Gunakan [Caddyfile](../deploy/Caddyfile): ganti `{$CMS_DOMAIN}` dan `{$INVITATION_DOMAIN}` dengan kedua hostname sebenarnya saat memasangnya di `/etc/caddy/Caddyfile`, atau berikan kedua environment tersebut melalui service Caddy. Origin backend wajib mencantumkan skema HTTPS dan cocok dengan domain routing. Izinkan origin invitation baru pada konfigurasi Fingerprint. Periksa dan reload:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy menimpa `X-Forwarded-For` dan `X-Real-IP`, serta menghapus `Forwarded`. Compose hanya mempublikasikan port 5173 dan 5174 ke `127.0.0.1`. Jangan membuka port tersebut ke internet. Menambahkan proxy/CDN lain memerlukan pengaturan IP terpercaya tersendiri.

Pada perpindahan dari monolit, simpan salinan Compose lama dan tag image sehat. Deploy pertama membangun kedua image. Setelah migrasi berhasil, `up --remove-orphans` menghentikan/menghapus service `app` lama dalam project Compose `wedding-invitation` agar port backend dapat dipakai. Atur Caddy host untuk routing baru pada cutover ini. Ada jeda singkat; routing baru dan service baru harus siap bersama. Tidak ada data Neon yang dipindah. Migrasi versi 2 menambahkan ID publik acak tanpa mengubah link/hash/sesi lama. Jika domain lama telah dibagikan, pertahankan DNS/HTTPS dan redirect host lama ke `https://invitation.domain.id{uri}` agar path dan fragment lama tetap bisa digunakan. Alihkan `/admin` lama ke `https://dashboard.domain.id/` secara terpisah. Jangan mematikan domain lama sebelum masa kompatibilitas selesai.

Jika berpindah dari Render, ubah DNS saat kedua service VPS sudah sehat dan konfigurasi domain Fingerprint benar. Menonaktifkan Render dilakukan terpisah; workflow ini hanya mengelola VPS.

## GitHub Actions

Repository secrets:

| Secret | Isi |
| --- | --- |
| `VPS_HOST` | IP/hostname VPS |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private key khusus deployment |
| `VPS_KNOWN_HOSTS` | Host key OpenSSH yang telah diverifikasi |

Ambil host key dengan `ssh-keyscan`, lalu bandingkan fingerprint menggunakan console provider yang dipercaya dan `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. Jangan menganggap hasil `ssh-keyscan` sendiri sebagai verifikasi.

Set repository variable `VPS_DEPLOY_ENABLED=true` setelah VPS siap. Tanpa variable itu, image dari `main` tetap diterbitkan, tetapi VPS tidak disentuh. Pastikan kedua package `REPO-frontend` dan `REPO-backend` tetap private dan mengizinkan Actions repository ini. `GITHUB_TOKEN` menerbitkan image; token VPS hanya menariknya. Batasi akses tulis repository/workflow karena workflow memakai secrets.

Pull request menjalankan build kedua image, tes Go, helper undangan, tes deployment, dan integrasi/Postman pada PostgreSQL disposable di CI. Image PR tidak dipublikasikan. Publikasi serta deployment mendukung `main` dan `staging`, dengan gate serta direktori terpisah. Lihat [panduan staging](staging-deploy.md) untuk persiapan staging pada VPS yang sama.

## Pemilihan deployment

[scripts/changes.py](../scripts/changes.py) membandingkan commit target dengan `commit` dalam `/opt/wedding-invitation/state.json`, yaitu deployment terakhir yang **seluruh service terdampaknya sehat**.

| Perubahan | Image |
| --- | --- |
| CMS, JS browser, CSS, aset, frontend Caddy/Dockerfile | Frontend |
| Go, dependency Go, SQL, provisioning | Backend |
| `frontend/index.html`, `frontend/access.html` | Keduanya |
| Dependency/build frontend yang menentukan template | Keduanya |
| Konfigurasi deployment/workflow/build bersama | Keduanya |
| Dokumentasi saja | Tidak ada |
| Belum ada state atau commit baseline tidak tersedia | Keduanya |

Vite memakai nama entry/aset stabil dan menonaktifkan module preload di HTML, agar template dalam backend lama tetap menemukan aset setelah frontend saja dideploy. Jangan mengubah aturan output Vite tanpa membangun ulang kedua image. Respons aset memakai revalidasi cache. Perubahan source template harus dimasukkan ke classifier jika menambah entry/template baru.

Setiap image memakai full commit SHA masing-masing: `ghcr.io/OWNER/REPO-frontend:SHA` dan `ghcr.io/OWNER/REPO-backend:SHA`. State mencatat pasangan image dan commit baseline, tanpa file VERSION manual. Service yang tidak dipilih tetap memakai image dan container sebelumnya.

[deploy.py](../deploy/deploy.py) mengunci deployment di host, menarik service terpilih, menjalankan `backend migrate` **sekali** sebelum pergantian backend, lalu `up --no-deps --wait` hanya untuk service terpilih. Deployment frontend saja tidak menjalankan migrasi. State ditulis atomik setelah health check lolos; migration/health gagal mempertahankan state sebelumnya, sehingga perubahan gagal ikut diperiksa lagi pada percobaan berikutnya. GitHub Actions juga menserialkan seluruh workflow produksi, termasuk pembacaan baseline.

Di **Actions → Build and deploy VPS → Run workflow**, pilih branch `main` dan `frontend`, `backend`, `both`, atau `auto`. Pilihan manual menambahkan service yang dipaksa deploy pada perubahan tertunda, agar pemulihan tidak melewatkan perubahan dari deployment gagal.

## Pemeriksaan dan pemulihan

```sh
cd /opt/wedding-invitation
cat state.json
```

Periksa `/healthz`, login pada root dashboard, preview pada dashboard, tautan tamu UUID pada invitation, upload, serta metadata WhatsApp melalui HTTPS. Pastikan `/api/admin/session` dan `/preview` pada invitation menghasilkan 404. Health backend memeriksa database; health frontend memeriksa web server. Keduanya tidak membuktikan DNS, sertifikat, atau Fingerprint produksi.

Simpan pasangan tag sehat sebelum upgrade. Untuk rollback satu service yang kompatibel, gunakan `deploy.py` dengan pasangan/tag yang dipilih. Contoh (ganti SHA dan nama package):

```sh
python3 deploy.py --commit COMMIT_SEBELUMNYA --backend ghcr.io/owner/repo-backend:COMMIT_SEBELUMNYA
```

`--commit` adalah baseline source yang terkait deployment itu. Service yang tidak diberikan tetap menggunakan state saat ini. Jika template atau kontrak antarservice berubah, rollback pasangan keduanya. Jangan mengedit state agar seolah deployment yang gagal telah berhasil.

Tidak ada rollback otomatis container atau database. Deployment yang gagal bisa meninggalkan satu container pada image baru, tetapi state tetap pasangan terakhir yang lolos. Retry mencakup perubahan tersebut lagi. Migration harus kompatibel dengan backend lama selama cutover; migration yang merusak memerlukan backup dan prosedur khusus. Pantau disk image dan hapus versi lama setelah masa rollback.

### UUIDv7 cutover

Migration 3 memerlukan PostgreSQL 18+ dan maintenance singkat: backend sebelum perubahan ini tidak bisa membaca ID internal bertipe `uuid` dengan benar. Jangan menerapkannya lewat rollout normal yang masih melayani traffic dengan backend lama.

1. Uji image baru dan migrasi pada branch/salinan produksi yang terisolasi. Simpan backup/restore point sebelum cutover beserta pasangan image sehat.
2. Nonaktifkan sementara `VPS_DEPLOY_ENABLED` sebelum push ke `main`. Selesaikan build/publikasi image melalui workflow, lalu pull image baru di VPS selagi backend lama masih berjalan. Catat nilai variable sebelumnya untuk dipulihkan setelah cutover.
3. Setelah image tersedia lokal di VPS, hentikan backend lama pada project Compose undangan (`docker compose --project-directory /opt/wedding-invitation -f /opt/wedding-invitation/compose.yaml stop backend`), termasuk instance lain bila ada. Langsung jalankan `deploy.py` dengan tag image baru; helper menjalankan migration 3 lalu menghidupkan backend baru. Migrasi memetakan semua ID dan foreign key dalam satu transaksi, menunggu lock maksimal 5 detik per akuisisi, dan rollback penuh bila gagal. Retry migrasi tidak mengganti UUID yang sudah tercatat pada versi 3. Pulihkan `VPS_DEPLOY_ENABLED` setelah backend sehat.
4. Periksa login dan pemulihan sesi admin, sesi tamu lama, metadata/link publik, media, dan isolasi tenant. `accounts.id`, `tenants.id`, `owner_id`, dan kolom referensinya kini `uuid`; `schema_migrations` mencatat versi 3. Gunakan email/slug untuk mencari ID baru.

Koneksi pooled Neon dapat menyimpan prepared statement dengan tipe parameter lama setelah kolom berubah dari `text` ke `uuid`. Pada cutover ini query metadata melalui pooled connection gagal dengan `operator does not exist: uuid = text`, sementara query yang sama melalui direct connection berhasil. Restart compute Neon pada branch produksi, lalu restart backend untuk membuka koneksi baru, menyelesaikan masalah tanpa mengubah data. Sertakan reset koneksi tersebut dalam maintenance bila gejala ini muncul; health endpoint saja tidak mendeteksinya.

Cutover produksi 21 Oktober 2026 selesai pada image commit `a938f1406e9ded9f7167fa2a0f9d6415d864b44d`. Perbandingan digest sebelum/sesudah memastikan isi dan relasi sembilan tabel tetap sama selain ID yang dipetakan. Delapan tamu, 12 media, 11 perangkat, dan 29 sesi asli dipertahankan; sesi admin tambahan untuk verifikasi berhasil dipulihkan setelah migrasi lalu di-logout. Preview, media privat, canonical UUID, redirect slug, tautan kode tamu dan isolasi host diperiksa melalui HTTPS; Postman produksi lulus satu request dan empat assertion. Health publik sempat tidak tersedia sekitar 4,4 detik saat pergantian image; preview sempat gagal setelahnya sampai reset koneksi selesai.

Backup Neon `backup-pre-uuidv7-20261021` (`br-holy-salad-az7ta1ah`) tersedia sampai 28 Oktober 2026 pukul 00:00 UTC. Pasangan image sehat sebelumnya tersimpan di VPS pada `/opt/wedding-invitation/backups/pre-uuidv7-20261021-state.json`. Branch uji `test-uuidv7-20261021` juga kedaluwarsa pada waktu yang sama. Verifikasi Fingerprint pada perangkat nyata tidak dilakukan dalam cutover ini.

Bila migrasi gagal sebelum commit, database tetap pada skema lama dan backend lama dapat dihidupkan kembali. Setelah commit, rollback image lama saja tidak aman: pulihkan database dari restore point sebelum migrasi beserta image lama, atau perbaiki backend baru. Restore menghilangkan penulisan yang terjadi setelah restore point; pertahankan maintenance hingga hasil verifikasi diterima.

## Verifikasi lokal

```sh
npm ci
npm ci --prefix frontend
npm run build
npm test
npm run test:integration
# Setelah kedua image dibangun:
npm run test:deploy
```

Tes integrasi hanya memakai database disposable (lihat `.env.test.example`). Fingerprint Server API dipanggil melalui HTTP ke fixture Postman simulation lokal, tanpa kredensial produksi. Fixture mengikuti bentuk event dari verifier lama; pencarian mock milik provider di workspace cloud tidak dilakukan. CLI Postman 1.73 mempunyai race saat membuat tabel state pada request pertama yang bersamaan; helper tes menginisialisasinya sebelum pengujian paralel. Log simulation diperiksa untuk memastikan Go benar-benar memanggil `/v4/events/`.

Tes Docker nyata memakai PostgreSQL disposable dan Caddy dengan kedua host: root CMS, login/cookie host-only, API terpisah, link kode tanpa nama, canonical UUID, redirect lama, metadata, penyensoran log, dan preview diperiksa. Tes juga memeriksa ID container/image service lain tetap sama pada deployment tunggal dan jumlah eksekusi migrasi. Registry pull dilewati dalam smoke test karena image sudah dibangun lokal; autentikasi GHCR/SSH serta cutover VPS perlu diverifikasi saat deployment pertama.
