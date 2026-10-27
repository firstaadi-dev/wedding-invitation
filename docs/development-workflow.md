# Alur pengerjaan dan release

Alur repository: **main → feature branch → staging → main**.

`main` berisi release production. Setiap pekerjaan dimulai dari `main` terbaru pada branch `feat/nama-fitur` (atau `fix/nama-bug`). Perubahan masuk ke `staging` lewat pull request, diuji di server staging, lalu dipromosikan ke `main` lewat pull request dari `staging`.

| Aktivitas | GitHub Actions | Deployment |
| --- | --- | --- |
| Push ke feature branch | Tidak berjalan | Tidak ada |
| PR feature → staging | Tidak berjalan | Tidak ada |
| Merge/push ke staging | Tes, build/publikasi image yang berubah | Staging, jika `STAGING_VPS_DEPLOY_ENABLED=true` |
| PR staging → main | Tidak berjalan | Tidak ada |
| Merge/push ke main | Tes, build/publikasi image yang berubah | Production, jika `VPS_DEPLOY_ENABLED=true` |
| PR feature → main | Tidak berjalan; alur ini tidak diizinkan secara proses | Tidak ada |
| Run workflow pada branch feature | Branch flow gagal | Tidak ada |

Workflow: [deploy.yml](../.github/workflows/deploy.yml). Pemeriksaan branch: [branch_policy.py](../scripts/branch_policy.py). Workflow otomatis hanya berjalan pada push ke `staging` atau `main`, termasuk hasil merge PR. Target PR mengikuti proses tim: feature ke `staging`, lalu `staging` ke `main`; workflow tidak memeriksa asal branch PR karena trigger PR dinonaktifkan. Nama feature branch tidak diwajibkan memakai prefix tertentu.

## Mulai fitur baru

Pastikan pekerjaan sebelumnya sudah di-commit agar tidak terbawa ke branch berikutnya:

```sh
git switch main
git pull --ff-only origin main
git switch -c feat/nama-fitur
```

Kerjakan fitur, lalu commit file yang memang terkait:

```sh
git add FILE_YANG_DIUBAH
git commit -m "Implement nama fitur"
git push -u origin feat/nama-fitur
```

Di GitHub, buka PR dengan **base: staging** dan **compare: feat/nama-fitur**. Review perubahan sebelum merge; tes dan build berjalan setelah merge ke `staging`.

## Uji staging

Gunakan **Create a merge commit** untuk merge PR ke `staging`. Push hasil merge memicu deployment ke direktori `/opt/wedding-invitation-staging`, project Compose `wedding-invitation-staging`, dan port localhost 5273/5274.

Periksa hasil workflow dan aplikasi di domain staging. Jika ada perbaikan, lanjutkan pada feature branch dan buat PR berikutnya ke `staging`. Semua perubahan yang berada di staging akan ikut dalam promosi berikutnya ke production; pastikan semuanya siap sebelum membuka PR release.

## Release ke production

Buka PR dengan **base: main** dan **compare: staging**. Setelah tes serta pengecekan aplikasi staging selesai, gunakan **Create a merge commit**. Jangan squash/rebase promosi staging → main, agar riwayat staging tetap tersambung dengan release production.

Push hasil merge ke `main` memicu deployment ke `/opt/wedding-invitation`, project Compose production, dan port localhost 5173/5174. Branch `staging` tetap disimpan untuk pengujian pekerjaan berikutnya; jangan aktifkan penghapusan otomatis branch itu setelah PR release.

Fitur berikutnya kembali dimulai dari `main` terbaru. Karena feature branch membawa riwayat release terakhir, merge feature berikutnya ke staging juga membawa commit production tersebut tanpa perlu direct push sinkronisasi main → staging.

## Pengaturan GitHub agar alur wajib diikuti

Agar GitHub mewajibkan review PR dan membatasi direct push, aktifkan branch protection/ruleset untuk **main** dan **staging**:

- Require a pull request before merging.
- Jangan mewajibkan **Required checks** dari workflow ini sebelum merge: trigger PR dinonaktifkan sehingga check tersebut tidak berjalan pada PR.
- Terapkan aturan juga untuk administrator/bypass bila alur perlu diwajibkan untuk seluruh pengguna.
- Nonaktifkan force push dan penghapusan kedua branch.
- Pertahankan metode merge commit; jangan mewajibkan linear history karena alur ini menggunakan merge commit.

Fitur branch protection repository private mengikuti paket GitHub akun/organisasi. Lihat [dokumentasi branch protection GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

Workflow YAML tidak mengubah pengaturan proteksi GitHub. Selama proteksi belum aktif, push langsung ke `main`/`staging` masih bisa memicu deployment; job branch flow tidak dapat membuktikan sebuah push berasal dari merge PR.

## Aktivasi awal

Branch `staging` perlu tersedia di origin sebelum PR feature pertama dibuka. Jika belum pernah dipublikasikan, buat branch remote tersebut dari baseline `main` yang sama, lalu push feature branch dan buka PR ke staging.

Aktifkan deployment staging hanya setelah VPS, DNS, Caddy, `app.env`, SSH dan GHCR siap. Daftar secret/variable serta konfigurasi satu VPS ada di [panduan staging](staging-deploy.md).
