# Deploy otomatis ke VPS dari GitHub private

Alur: pull request menjalankan Docker build dan tes. Push/merge ke `main` juga menerbitkan image ke GHCR dengan tag commit. Deploy VPS hanya berjalan setelah repository variable `VPS_DEPLOY_ENABLED` diisi `true`. Build berjalan di GitHub, bukan VPS.

Workflow: `.github/workflows/deploy.yml`. Gunakan VPS Ubuntu 24.04 **amd64/x86_64**, Docker Engine dari repository resmi Docker, Docker Compose versi 2.30+ (mendukung `env_file.format: raw`), dan Caddy yang berjalan langsung di host. Database tetap di Neon. Tidak ada perubahan kontrak API.

## 1. Persiapan VPS sekali saja

Ikuti [instalasi Docker Ubuntu](https://docs.docker.com/engine/install/ubuntu/) dan [instalasi Caddy](https://caddyserver.com/docs/install#debian-ubuntu-raspbian). Jalankan sebagai akun administrator VPS:

```sh
sudo adduser --disabled-password --gecos '' deploy
sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
sudo install -d -o deploy -g deploy -m 700 /opt/wedding-invitation
```

Akses grup Docker setara dengan akses root; gunakan akun dan SSH key khusus deployment. Jika user `deploy` sudah ada, gunakan user itu tanpa membuat ulang.

Di komputer sendiri, buat key khusus GitHub Actions:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/wedding-deploy -C github-actions-wedding -N ''
```

Pasang **isi file `.pub`** ke `/home/deploy/.ssh/authorized_keys` di VPS. Gunakan pemilik `deploy:deploy` dan permission `600`. Private key `~/.ssh/wedding-deploy` nanti masuk GitHub Secret, bukan repository.

## 2. Kredensial GHCR di VPS

Di GitHub, buat **personal access token (classic)** dengan scope `read:packages`, dari akun yang boleh membaca package aplikasi. Untuk organisasi dengan SSO, otorisasi token sesuai aturan organisasi. Jalankan sebagai user `deploy` melalui SSH:

```sh
read -r -s -p 'GHCR read token: ' GHCR_READ_TOKEN
printf '\n'
printf '%s' "$GHCR_READ_TOKEN" | docker login ghcr.io -u USERNAME_GITHUB --password-stdin
unset GHCR_READ_TOKEN
```

Ganti `USERNAME_GITHUB`. Token hanya untuk menarik image private; GitHub Actions memakai `GITHUB_TOKEN` bawaan untuk menerbitkan image. Setelah publikasi pertama, cek package di GitHub Packages tetap **Private** dan repository ini punya akses Actions ke package tersebut.

## 3. Environment aplikasi di VPS

Sebagai user `deploy`, buat file dengan editor:

```sh
touch /opt/wedding-invitation/app.env
chmod 600 /opt/wedding-invitation/app.env
nano /opt/wedding-invitation/app.env
```

Isi nilainya mengikuti `.env.example`:

```dotenv
PUBLIC_ORIGIN=https://undangan.domainkamu.com
DATABASE_URL=KONEKSI_NEON_POOLED
DATABASE_URL_UNPOOLED=KONEKSI_NEON_DIRECT
ADMIN_PASSWORD_HASH=HASH_SCRYPT_ADMIN
FINGERPRINT_PUBLIC_KEY=PUBLIC_KEY
FINGERPRINT_SECRET_KEY=SECRET_KEY
FINGERPRINT_REGION=ap
FINGERPRINT_ENDPOINT=https://SUBDOMAIN_FINGERPRINT_YANG_SUDAH_ACTIVE
```

Nilai ditulis mentah, tanpa tanda kutip. Hapus baris `FINGERPRINT_ENDPOINT` jika belum memakai custom endpoint. Jangan simpan file ini di GitHub. Compose mengatur `NODE_ENV`, `PORT` dan `TRUST_PROXY`; jangan membawa variabel `RENDER` dari hosting lama. Perbarui domain/origin di Fingerprint jika domain aplikasi berubah.

## 4. Domain dan HTTPS

Arahkan A record `undangan.domainkamu.com` ke IP VPS. Untuk konfigurasi awal ini, gunakan DNS langsung (tanpa proxy Cloudflare). Tambahkan ke `/etc/caddy/Caddyfile`:

```caddyfile
undangan.domainkamu.com {
    reverse_proxy 127.0.0.1:5174 {
        header_up X-Forwarded-For {remote_host}
    }
}
```

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Buka TCP 80/443 di firewall VPS/provider, serta SSH port 22 untuk deployment. Port aplikasi 5174 **hanya** dipublikasikan ke `127.0.0.1` oleh Compose. Caddy mengganti header IP dari pengunjung agar `TRUST_PROXY=1` aman dan rate limit tidak menggabungkan seluruh tamu. Jangan membuka port 5174 ke internet atau menambahkan proxy lain tanpa meninjau ulang header IP.

## 5. Secrets dan variable GitHub

Di repository, buka **Settings → Secrets and variables → Actions → Secrets**, lalu tambahkan **repository secrets**. Konfigurasi ini tidak membutuhkan fitur Environments berbayar untuk repo private:

| Secret | Isi |
| --- | --- |
| `VPS_HOST` | IP publik atau hostname VPS, tanpa `https://` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Seluruh isi private key `~/.ssh/wedding-deploy` |
| `VPS_KNOWN_HOSTS` | Baris host key OpenSSH untuk VPS |

Untuk menyiapkan `VPS_KNOWN_HOSTS`, dari komputer sendiri:

```sh
ssh-keyscan -t ed25519 IP_VPS > /tmp/wedding-known-hosts
ssh-keygen -lf /tmp/wedding-known-hosts
```

Bandingkan fingerprint itu dengan hasil perintah berikut dari console provider VPS yang dipercaya:

```sh
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Hanya jika cocok, masukkan isi `/tmp/wedding-known-hosts` sebagai secret. `ssh-keyscan` saja tidak memverifikasi identitas server.

Di **Settings → Secrets and variables → Actions → Variables**, tambahkan **repository variable**:

```text
VPS_DEPLOY_ENABLED = true
```

Aktifkan setelah semua persiapan VPS selesai. Tanpa variable ini, CI tetap build/tes dan menerbitkan image dari `main`, tetapi tidak menyentuh VPS. Pastikan GitHub Actions diperbolehkan oleh kebijakan repository/organisasi.

Batasi akses tulis repository dan perubahan workflow ke orang yang dipercaya; orang yang boleh mengubah workflow juga dapat memakai repository secrets.

## 6. Deploy dan pemeriksaan

Commit file konfigurasi, push ke branch kerja, lalu merge pull request ke `main`. Buka tab **Actions → Build and deploy VPS**. Untuk menjalankan ulang versi `main` tanpa commit baru, pilih **Run workflow** dengan branch `main`.

Build menjalankan `npm run build` dan `npm test` dari Dockerfile. Jika gagal, image tidak diterbitkan dan deploy tidak berjalan. Jika berhasil, VPS menarik image, menjalankan migrasi yang sudah ada di Dockerfile, mengganti container, dan menunggu health check `/healthz` yang memeriksa koneksi database. Job deploy gagal jika container tidak sehat dalam batas waktu.

Setelah deploy, periksa HTTPS dari browser, login admin, serta akses tautan tamu. Health check internal tidak membuktikan DNS, sertifikat atau integrasi Fingerprint berhasil. Render tidak diubah oleh workflow ini; setelah siap pindah, nonaktifkan auto-deploy Render secara terpisah jika tidak ingin kedua hosting ter-update.

Tidak ada tes integrasi database di CI ini karena tes tersebut memerlukan branch Neon terisolasi dan menghapus data pengujian. Jangan memasukkan URL database produksi sebagai kredensial tes.

## 7. Rollback manual dan batasan

Catat tag image commit terakhir yang sehat dari log Actions. Untuk kembali ke image tersebut, sebagai user `deploy`:

```sh
cd /opt/wedding-invitation
export IMAGE=ghcr.io/OWNER_LOWERCASE/REPO_LOWERCASE:COMMIT_SHA_SEBELUMNYA
docker compose pull
docker compose up -d --wait --wait-timeout 150
```

Gunakan full SHA commit, bukan nama branch. Rollback aplikasi tidak mengembalikan schema/data database. Backup sebelum migrasi yang merusak, dan pastikan perubahan schema tetap kompatibel dengan versi sebelumnya. Rollback otomatis tidak disediakan.

Satu container akan berhenti sebentar ketika diganti. Deploy gagal tidak otomatis mengembalikan container sebelumnya. Pantau ruang disk karena image lama tetap disimpan; hapus versi lama secara sengaja setelah masa rollback selesai. GitHub Actions dan penyimpanan image mengikuti kuota akun.

Referensi: [workflow image GitHub](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [akses GHCR private](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [Compose up dan wait](https://docs.docker.com/reference/cli/docker/compose/up/).
