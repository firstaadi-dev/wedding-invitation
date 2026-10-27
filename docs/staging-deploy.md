# Staging pada VPS yang sama

Branch `staging` menjalankan workflow `Build and deploy VPS` saat push. Workflow memeriksa tes, membangun image commit SHA di GHCR, lalu melakukan deployment hanya jika repository variable `STAGING_VPS_DEPLOY_ENABLED=true`. Branch `main` memakai konfigurasi production. Pull request hanya memeriksa/build, tanpa publikasi atau SSH deployment.

| Konfigurasi | Production | Staging |
| --- | --- | --- |
| Branch | `main` | `staging` |
| Direktori VPS | `/opt/wedding-invitation` | `/opt/wedding-invitation-staging` |
| Project Compose | `wedding-invitation` | `wedding-invitation-staging` |
| Frontend localhost | `5173` | `5273` |
| Backend localhost | `5174` | `5274` |
| Deployment gate | `VPS_DEPLOY_ENABLED` | `STAGING_VPS_DEPLOY_ENABLED` |

Lock, network Docker, container, dan `state.json` terpisah berdasarkan project/direktori. Keduanya memakai satu Caddy host untuk HTTPS. RAM/CPU/disk tetap berbagi di VPS. Image tidak membawa secrets dan ditandai full commit SHA.

## 1. Database dan environment

Staging dibuat pada 27 Oktober 2026 sebagai branch **schema-only** dalam project Neon yang sama dengan production. Pembuatan menggunakan Console karena tool MCP `create_branch` belum mengekspos opsi schema-only; koneksi dan verifikasi dilakukan melalui MCP.

| Resource | Nilai |
| --- | --- |
| Project bersama production | `wedding invitation` (`bitter-pond-36732751`) |
| Branch staging | `staging` (`br-lucky-bird-azjutxt0`) |
| Sumber skema | `production` (`br-soft-pond-azryu0xf`) |
| Database | `neondb` |
| Role | `neondb_owner` pada branch staging |
| PostgreSQL / region | 18 / `aws-ap-southeast-1` |
| Expiry branch | Never |

Seluruh 12 tabel disalin tanpa baris dari production. Metadata lokal `wedding.schema_migrations` kemudian diisi versi 1–4 sesuai skema yang sudah disalin agar deploy tidak menjalankan ulang migrasi bootstrap. Pada saat salinan dibuat, sebelas tabel aplikasi kosong. Selanjutnya migrasi 5 menambahkan tabel pembayaran dan kolom langganan; akun uji Sandbox dibuat melalui pendaftaran mandiri pada 27 Oktober 2026. Perbandingan skema hanya menunjukkan normalisasi tanda kurung pada constraint `tenants_slug_check` yang setara.

`.env.staging` lokal sudah berisi koneksi pooled dan direct branch ini; kredensial tidak dicatat dalam dokumentasi atau template. Database tes lokal tetap memakai konfigurasi tesnya. `ADMIN_PASSWORD_HASH` tidak diperlukan untuk branch ini karena baseline migrasi sudah tercatat. MIDTRANS_ENV staging harus `sandbox`; gunakan kredensial Fingerprint yang sama dengan production dan izinkan origin staging sebelum memeriksa alur tamu. Lihat [pembayaran Midtrans](midtrans-payments.md).

Jika membuat ulang, buat branch **schema-only** dari production pada project yang sama, pilih Auto-delete **Never**, periksa skema dan kekosongan tabel, lalu catat versi migrasi yang sudah tercakup. Jangan menjalankan perintah seed/reset tes pada staging. Branch bernama `staging` dikecualikan dari kebijakan TTL tujuh hari di `neon.ts`.

`.env.staging` disiapkan lokal dan diabaikan Git; template yang dapat di-commit ada di [`.env.staging.example`](../.env.staging.example). Isi `DATABASE_URL` pooled dan `DATABASE_URL_UNPOOLED` direct dari branch Neon staging. Template belum berisi kredensial nyata. Gunakan data uji. Mode schema-only tidak menyalin akun, sesi, media, atau data tamu; mode data-and-schema ikut menyalinnya.

Samakan `PUBLIC_ORIGIN` dan `CMS_ORIGIN` dengan domain staging pada Caddy. Gunakan nilai `FINGERPRINT_*` yang sama dengan production dan izinkan origin `https://invitation.weddinvita.cloud` di Fingerprint. `ADMIN_PASSWORD_HASH` diperlukan untuk migration 1 pada database kosong; buat dengan `npm run admin:hash`. Database salinan yang sudah melewati migration 1 tetap memakai akun dan password salinannya. `NODE_ENV` tetap `production` agar cookie HTTPS dan perilaku aplikasi sesuai deployment VPS.

Di VPS, siapkan direktori (sesuaikan pemilik bila memakai user lain):

```sh
sudo install -d -o deploy -g deploy -m 700 /opt/wedding-invitation-staging
```

Dari komputer lokal, salin file ke akun deployment:

```sh
scp .env.staging deploy@VPS_HOST:/opt/wedding-invitation-staging/app.env
ssh deploy@VPS_HOST 'chmod 600 /opt/wedding-invitation-staging/app.env'
```

Workflow tidak mengunggah `.env.staging` dan tidak menimpa `app.env`. Compose membaca `app.env` sebagai nilai mentah; jangan bungkus nilai dengan tanda kutip. Port `5174` di environment adalah port internal backend; port host staging tetap `5274`.

## 2. DNS dan Caddy

Default hostname di [Caddyfile staging](../deploy/Caddyfile.staging):

- Company: `weddinvita.cloud`
- CMS: `dashboard.weddinvita.cloud`
- Invitation: `invitation.weddinvita.cloud`

Arahkan ketiganya ke IP VPS. Jika domain berbeda, ganti hostname pada file tersebut dan origin di `.env.staging`, atau atur `STAGING_COMPANY_DOMAIN`, `STAGING_CMS_DOMAIN`, dan `STAGING_INVITATION_DOMAIN` pada service Caddy. Environment aplikasi di Compose tidak mengatur environment Caddy host.

Salin `deploy/Caddyfile.staging` ke `/etc/caddy/Caddyfile.staging`, lalu tambahkan baris ini ke `/etc/caddy/Caddyfile` utama di luar blok site/global:

```caddyfile
import /etc/caddy/Caddyfile.staging
```

Pertahankan blok global penyensoran log pada Caddyfile utama dari `deploy/Caddyfile`. Snippet staging memakai nama tersendiri sehingga bisa diimpor bersama routing production. Staging menambahkan header `X-Robots-Tag: noindex, nofollow, noarchive`; header ini tidak membatasi akses publik. Jangan membuka port 5273/5274 ke internet; keduanya terikat localhost.

Setelah domain dan service staging siap, validasi dan reload:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 3. GitHub Actions

Alur kerja: **main → feature branch → staging → main**. Feature masuk staging lewat PR; release ke main hanya menerima PR dari staging. Panduan Git dan branch protection ada di [alur pengerjaan](development-workflow.md).

Persyaratan Docker, Compose 2.30+, Python, akun deployment, dan login GHCR di VPS mengikuti [panduan VPS](vps-deploy.md). Karena memakai package GHCR yang sama dengan tag SHA berbeda, akun VPS harus dapat menarik package frontend dan backend repository ini.

Untuk VPS dan user yang sama, secrets repository `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, dan `VPS_KNOWN_HOSTS` yang sudah ada otomatis dipakai. Bila perlu akun/key/host berbeda, isi override staging:

| Secret opsional | Menggantikan |
| --- | --- |
| `STAGING_VPS_HOST` | `VPS_HOST` |
| `STAGING_VPS_USER` | `VPS_USER` |
| `STAGING_VPS_SSH_KEY` | `VPS_SSH_KEY` |
| `STAGING_VPS_KNOWN_HOSTS` | `VPS_KNOWN_HOSTS` |

Setiap override kosong memakai secret production yang bersangkutan. Nilai `VPS_KNOWN_HOSTS` harus berisi host key yang sudah diverifikasi.

Set repository variable `STAGING_VPS_DEPLOY_ENABLED=true` setelah direktori, database, `app.env`, dan akses GHCR/SSH siap. Tanpa variable ini, push staging tetap menjalankan tes dan publikasi image, tetapi melewati SSH deployment. Migrasi backend dijalankan sebelum pergantian container dan state baru dicatat setelah health check lolos.

Commit perubahan pada feature branch yang dibuat dari `main`, push feature tersebut, lalu buka PR ke `staging`. Merge PR memicu deployment staging. Untuk bootstrap satu kali, branch `staging` di origin perlu dibuat dari baseline `main` sebelum PR pertama.

Untuk deployment manual: **Actions → Build and deploy VPS → Run workflow → branch staging → both** (atau `auto`, `frontend`, `backend`). Deployment pertama selalu memerlukan kedua image. Workflow menyalin `compose.staging.yaml` sebagai `compose.yaml` di direktori staging dan menjalankan helper dengan `--directory /opt/wedding-invitation-staging`.

## 4. Pemeriksaan deployment

```sh
cd /opt/wedding-invitation-staging
cat state.json
curl --fail https://dashboard.weddinvita.cloud/healthz
```

Periksa login CMS, preview, upload, dan tautan tamu staging. `/api/admin/session` serta `/preview` pada domain invitation harus menghasilkan 404. Health check tidak membuktikan DNS, sertifikat, dan identifikasi Fingerprint berfungsi; periksa alur browser setelah deployment pertama.
