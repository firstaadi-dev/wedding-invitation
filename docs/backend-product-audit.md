# Audit Backend dan Produk

Tanggal audit: 24 Oktober 2026. Audit mencakup implementasi pada commit `956b43aca5eb9a449ad914635a596169bf3d2ea6`; bukan klaim bahwa perubahan lokal sudah ada di produksi.

## Ringkasan keputusan

Produk sudah memiliki alur inti yang cukup lengkap: admin mengelola tamu, tautan pribadi dan konten acara; tamu memverifikasi akses, membaca undangan, mengirim RSVP/ucapan, melihat lokasi, hadiah dan galeri. Backend menerapkan sesi server, pemeriksaan Origin/CSRF, scope tenant pada query, batas akses browser yang terkunci per tamu, serta transaksi untuk RSVP dan pergantian link.

Ada satu bug terkonfirmasi yang dapat membuat halaman undangan mengembalikan 500 jika nama kedua mempelai dan judul preview sama-sama kosong. Tidak ditemukan bukti bug kritis pada area yang dapat diuji lokal; integrasi database dan perilaku produksi tidak diverifikasi. Ringkasan admin juga menyembunyikan jumlah orang yang menyatakan hadir, sedangkan data itu sudah tersedia. Kegagalan pemuatan musik membuat kontrol putar tidak dapat dicoba ulang tanpa memuat ulang halaman.

Tindakan paling bernilai:

1. Amankan fallback judul metadata untuk nama kosong dan tambahkan regresi end-to-end melalui HTML undangan.
2. Tampilkan jumlah orang hadir di samping jumlah undangan yang hadir.
3. Biarkan tamu mencoba kembali pemutaran musik setelah error jaringan atau decode.
4. Validasi apakah undangan ini akan dipakai ulang untuk acara dengan tanggal/tempat berbeda; tanggal dan teks tempat saat ini masih tetap.

## Peta fitur dan alur

| Fitur/alur | Status aktual | Lokasi implementasi | Catatan penting |
|---|---|---|---|
| Login admin dan sesi | Tersedia | `backend/internal/app/app.go:224-250,485-` dan `frontend/src/main.tsx:200-296` | Cookie HttpOnly/SameSite, sesi dicabut di server; Origin diperiksa untuk mutasi API dan mutasi admin memerlukan CSRF. Password memakai scrypt. |
| Pengaturan acara dan preview | Tersedia sebagian | `backend/internal/app/admin.go:133-185,365-375`; `frontend/src/main.tsx:1404-1525`; `backend/internal/app/html.go:15-131` | Nama, jam, peta, hadiah, metadata dan limit bisa diatur. Tanggal dan sebagian teks tempat/default WhatsApp masih tertanam di frontend/backend. Nama mempelai boleh dikosongkan melalui UI/API; ini memicu BUG-001. |
| Tamu, kontak, limit browser dan tautan | Tersedia | `backend/internal/app/admin.go:275-363`; `backend/internal/app/guest.go:15-121`; `frontend/src/main.tsx:415-685,688-1027` | Ada tambah/edit/nonaktif/hapus, link baru, reset perangkat, pengecualian tanpa limit, filter, paginasi lokal, salin, dan buka WhatsApp. Ganti link mencabut sesi/perangkat; hapus tamu juga menghapus RSVP melalui FK. |
| Verifikasi akses tamu | Tersedia | `backend/internal/app/guest.go:15-121`; `frontend/access.js:1-44`; `frontend/identification.js:1-24` | Kode dibersihkan dari URL sebelum agent pihak ketiga dimuat; challenge berumur lima menit dan dipakai sekali; event diverifikasi server-side. Perilaku Fingerprint produksi tidak diuji pada audit ini. |
| Baca undangan, RSVP dan ucapan | Tersedia | `backend/internal/app/app.go:421-448`; `backend/internal/app/guest.go:123-` ; `frontend/content.js:10-42,155-204` | RSVP hanya untuk sesi tamu, terikat ke sesi yang merender formulir, satu jawaban per undangan; ucapan publik tidak mengungkap kehadiran/jumlah. Ucapan memakai offset pagination, dan kode menandai bahwa halaman dapat bergeser saat data berubah. |
| Media foto, audio dan thumbnail | Tersedia | `backend/internal/app/admin.go:378-407`; `backend/internal/app/media.go`; `backend/internal/app/audio.go`; `backend/internal/app/mp3.go` | Foto didekode/diubah ukuran; audio dibatasi dan dikonversi; upload baru mengganti data hanya setelah pemrosesan berhasil. Media privat mensyaratkan sesi tenant; thumbnail preview memang publik. Error audio di halaman tamu tidak menyediakan pemulihan tanpa reload (IMP-002). |
| Musik, hadiah, peta, galeri | Tersedia | `frontend/content.js:49-94,111-149,151-206`; `frontend/index.html` | Tombol salin punya fallback manual, galeri punya dialog dan navigasi, peta memakai iframe Google Maps. Label judul iframe masih nama venue bawaan meski URL peta dapat diganti. |
| Ringkasan dashboard | Tersedia sebagian | `frontend/admin-data.js:1-21`; `frontend/src/main.tsx:930-942` | Fungsi menghitung undangan hadir dan jumlah orang hadir (`people`), tetapi kartu dashboard hanya menampilkan jumlah undangan, pending, total dan nonaktif (IMP-001). |
| Migrasi, provisioning, deployment | Tersedia | `backend/internal/app/db.go`; `backend/db/001-multi-tenant.sql`–`004-device-limits.sql`; `deploy/deploy.py`; `scripts/changes.py`; `.github/workflows/deploy.yml` | Migrasi memakai lock/transaksi; deployment hanya memigrasi saat backend berubah dan menulis state setelah health check. Uji Docker/VPS tidak dijalankan saat audit. |
| Tanggal dan nama tempat acara | Sebagian | `frontend/content.js:42-48,101-110`; `backend/internal/app/admin.go:19-31,133-185`; `backend/internal/app/html.go:103-105` | Jam, judul sesi dan URL peta dapat diubah, tetapi tanggal countdown serta teks tempat pada pesan/default metadata masih konstanta. Apakah undangan ini perlu dipakai ulang untuk acara lain perlu dikonfirmasi (FEAT-001). |

## Temuan bug

### BUG-001 — Halaman undangan panic jika nama mempelai dan judul preview kosong

- **Klasifikasi/keyakinan:** Bug terkonfirmasi melalui analisis statis deterministik; keyakinan tinggi. Belum direproduksi terhadap server/database hidup.
- **Severity:** Sedang.
- **Pengguna terdampak:** Pengundang yang mengosongkan nama mempelai saat mengedit; seluruh admin/tamu yang membuka halaman HTML tenant terkait setelahnya.
- **Bukti dan pemicu:** Field nama tidak diwajibkan pada [main.tsx](/Users/firsta/Documents/Work/wedding-invitation/frontend/src/main.tsx:1427) dan input teks generik tidak memberi atribut `required` pada baris 1512–1520. Backend menerima string kosong setelah trim pada [admin.go](/Users/firsta/Documents/Work/wedding-invitation/backend/internal/app/admin.go:178). Judul preview juga boleh kosong dan dinormalisasi menjadi string kosong pada baris 152–159. Saat `linkPreviewTitle` kosong, [html.go](/Users/firsta/Documents/Work/wedding-invitation/backend/internal/app/html.go:92) memanggil `strings.Fields(first)[0]` dan `[1]` pada baris 101; string kosong/whitespace menghasilkan slice kosong dan panic.
- **Langkah penelusuran statis:** Admin mengirim `PUT /api/admin/content` dengan `partnerOneName: " "`, `partnerTwoName: ""`, dan `linkPreviewTitle: ""`. `validateSettings` memangkas lalu menyimpan nama kosong. Permintaan HTML ke `/u/{kode}`, UUID publik, `/preview`, atau root dengan sesi memilih tenant lalu memproses metadata di `html`; indexing slice panic. Recovery di [app.go](/Users/firsta/Documents/Work/wedding-invitation/backend/internal/app/app.go:378) mengembalikan JSON 500.
- **Aktual vs harapan:** HTML undangan/preview gagal dengan 500; diharapkan HTML tetap tersedia dengan judul fallback yang valid atau nama ditolak sebelum tersimpan.
- **Akar masalah:** Fallback mengasumsikan nama memiliki setidaknya satu kata, sementara batas validasi dan UI mengizinkan nilai kosong.
- **Perbaikan minimum:** Jadikan pembentukan judul fallback aman untuk nama kosong/whitespace dan gunakan nama default sebelum mengambil kata pertama. Menolak nama kosong di UI/backend juga mencegah input baru, tetapi fallback tetap perlu tahan terhadap data lama.
- **Tes regresi:** Dengan tenant disposable, simpan kedua nama kosong/whitespace dan judul preview kosong lewat endpoint admin; pastikan GET `/u/{kode}` dan halaman tenant menghasilkan 200 serta metadata judul, bukan 500. Tambahkan variasi satu nama kosong dan satu nama normal. Tes unit validasi saja tidak membuktikan renderer aman.

Tidak ada temuan kritis yang terkonfirmasi pada bukti yang diperoleh. Batasnya: tes integrasi Postgres, Docker smoke test, browser/perangkat nyata, dan runtime produksi tidak dijalankan.

## Perbaikan fitur existing

### IMP-001 — Tampilkan jumlah orang hadir, bukan hanya jumlah undangan hadir

- **Masalah pengguna:** Pengundang yang memakai satu undangan untuk keluarga hingga sepuluh orang perlu memperkirakan jumlah kursi/konsumsi, tetapi dashboard hanya menyebut banyaknya undangan yang memilih hadir.
- **Bukti alur saat ini:** `guestSummary` sudah menjumlahkan `guestCount` untuk undangan aktif yang hadir di [admin-data.js](/Users/firsta/Documents/Work/wedding-invitation/frontend/admin-data.js:1), tetapi kartu [main.tsx](/Users/firsta/Documents/Work/wedding-invitation/frontend/src/main.tsx:930) merender `summary.attending` dan tidak `summary.people`. Daftar baris sendiri menampilkan jumlah hadir per undangan.
- **Usulan:** Tambahkan label terpisah “Perkiraan jumlah orang hadir” memakai `summary.people`; pertahankan kartu “Konfirmasi hadir” sebagai hitungan undangan.
- **Acceptance criteria:** Total orang hanya menjumlah RSVP `attending` dari undangan aktif; undangan tidak aktif dan status tidak hadir/belum pasti tidak menambah total; keadaan kosong menampilkan nol; label membedakan orang dari undangan.
- **Effort:** Kecil, keyakinan tinggi; data sudah dihitung di klien.
- **Risiko/dependensi:** Tidak perlu API/schema baru. Risiko utama hanya label yang membingungkan jika satu kartu menggantikan hitungan undangan.

### IMP-002 — Pulihkan kontrol musik setelah error pemutaran

- **Masalah pengguna:** Tamu ponsel dengan jaringan sementara putus atau media gagal didekode tidak dapat mencoba tombol musik lagi setelah error.
- **Bukti alur saat ini:** [content.js](/Users/firsta/Documents/Work/wedding-invitation/frontend/content.js:88) membuat satu `Audio`; handler `error` pada baris 93 menonaktifkan tombol secara permanen. Klik tombol pada baris 205 hanya bekerja jika audio masih tersedia dan tombol tidak disabled. Tidak ada retry atau pembuatan ulang audio.
- **Usulan:** Pertahankan tombol aktif dan sediakan retry audio, dengan feedback singkat saat gagal; jangan mengubah preferensi autoplay browser.
- **Acceptance criteria:** Simulasikan event error, pastikan tombol tetap dapat difokuskan/diaktifkan; aksi berikutnya mencoba ulang sumber media; status aksesibel menjelaskan error dan berubah saat audio mulai/jeda; error berulang tidak membuat loop otomatis.
- **Effort:** Kecil, keyakinan sedang; pengujian event media tidak membuktikan semua perilaku jaringan browser.
- **Risiko/dependensi:** Tidak perlu perubahan API/data. Perlu tes browser untuk memastikan elemen audio dapat pulih lintas Safari/Chrome.

### IMP-003 — Jadikan label aksesibel peta sesuai dengan peta yang dipilih

- **Masalah pengguna:** Pengguna screen reader bisa mendengar nama venue lama ketika pengundang mengganti URL embed ke lokasi lain.
- **Bukti alur saat ini:** CMS menerima `mapEmbedUrl` pada [admin.go](/Users/firsta/Documents/Work/wedding-invitation/backend/internal/app/admin.go:133), sedangkan [content.js](/Users/firsta/Documents/Work/wedding-invitation/frontend/content.js:82) selalu memberi iframe judul “Lokasi Arjuna Ballroom Alam Indah Resto”. Pengaturan venue berbentuk URL saja; tidak ada nama tempat tersimpan yang dapat dipakai untuk label.
- **Usulan:** Untuk perubahan kecil, gunakan judul generik “Peta lokasi acara”. Jika nama tempat menjadi field CMS, gunakan nilai itu sebagai judul iframe.
- **Acceptance criteria:** Perubahan URL peta tidak menyebut venue lama di aksesibilitas; judul iframe tetap menjelaskan fungsinya; bila field nama tempat ditambahkan, nama baru muncul pada label.
- **Effort:** Kecil untuk label generik, sedang jika bergantung pada field tempat FEAT-001; keyakinan tinggi bahwa judul saat ini konstan.
- **Risiko/dependensi:** Tidak ada risiko data/API untuk label generik. Field tempat harus konsisten dengan metadata, undangan dan template pesan.

## Usulan fitur baru

### FEAT-001 — Atur tanggal dan nama tempat per acara (hipotesis produk)

- **Persona/kebutuhan:** Pengundang yang ingin menggunakan CMS untuk undangan dengan tanggal dan venue berbeda dari konfigurasi acara sekarang.
- **Bukti atau asumsi:** CMS dapat mengubah judul/jam acara dan URL peta, tetapi tanggal countdown masih konstan di [content.js](/Users/firsta/Documents/Work/wedding-invitation/frontend/content.js:101), dan tanggal/tempat juga tertanam dalam template WhatsApp di [admin.go](/Users/firsta/Documents/Work/wedding-invitation/backend/internal/app/admin.go:19) serta fallback metadata di [html.go](/Users/firsta/Documents/Work/wedding-invitation/backend/internal/app/html.go:103). Dokumen multi-tenant juga menjelaskan bahwa tanggal dan venue belum per tenant. Reuse untuk acara lain belum dikonfirmasi, sehingga ini hipotesis.
- **Nilai pengguna:** Pengundang dapat menyiapkan undangan acara sesuai tanggal/tempat sebenarnya tanpa mengedit source atau mengirim informasi yang tidak cocok.
- **MVP terkecil:** Field tanggal acara dan nama tempat di CMS; pakai tanggal untuk countdown dan tanggal pesan WhatsApp, serta nama tempat pada teks pesan dan fallback metadata. URL peta yang sudah ada tetap menentukan peta. Tidak mencakup banyak acara berulang, kalender, atau template tema.
- **Acceptance criteria:** Admin bisa menyimpan/mengubah tanggal dan nama tempat; keduanya konsisten pada undangan, countdown, WhatsApp default, dan metadata fallback; hitungan countdown memakai WIB; data tenant lama tanpa field baru tetap mendapat nilai fallback yang sama seperti saat ini.
- **Dampak teknis:** Tambah key pada JSON settings dan allowlist API, form/tipe CMS, render undangan, template WhatsApp dan metadata. Tidak perlu tabel baru; field tanggal perlu format stabil (tanggal lokal, bukan timestamp ambigu) dan fallback kompatibel.
- **Effort:** Sedang, keyakinan sedang untuk biaya teknis dan rendah untuk prioritas produk sebelum reuse dikonfirmasi; beberapa permukaan harus tetap selaras.
- **Validasi manfaat:** Tanyakan apakah CMS ini akan dipakai untuk acara selain acara yang sekarang, siapa pengelolanya, dan apakah mereka membutuhkan ganti tanggal/tempat tanpa bantuan teknis. Validasi seluruh titik tampilan dengan satu acara kedua hipotetis sebelum menentukan implementasi; jangan mengasumsikan peningkatan conversion.

## Backlog gabungan

### Sekarang

| Prioritas | ID | Tindakan | Alasan | Effort | Dependensi | Penanggung jawab |
|---|---|---|---|---|---|---|
| 1 | BUG-001 | Amankan fallback judul dan tambah tes renderer | Jalur deterministik ke 500 pada landing utama; perbaiki sebelum fitur kenyamanan | Kecil | Tes renderer dengan database disposable | Backend Engineer |
| 2 | IMP-001 | Tampilkan total orang hadir | Menggunakan data yang sudah dihitung; membantu perencanaan acara tanpa perubahan API | Kecil | Tidak ada | Product + Frontend |

### Berikutnya

| Prioritas | ID | Tindakan | Alasan | Effort | Dependensi | Penanggung jawab |
|---|---|---|---|---|---|---|
| 3 | IMP-002 | Tambahkan pemulihan pemutaran musik | Error jaringan/decode saat ini mengunci satu-satunya kontrol sampai reload | Kecil | Verifikasi browser Safari/Chrome | Frontend Engineer + QA |
| 4 | IMP-003 | Ganti judul iframe dengan label dinamis/generik | Screen reader dapat menyebut venue lama setelah URL peta diganti | Kecil | Bisa menunggu field nama tempat FEAT-001 | Frontend Engineer |

### Nanti/perlu validasi

| Prioritas | ID | Tindakan | Alasan | Effort | Dependensi | Penanggung jawab |
|---|---|---|---|---|---|---|
| 5 | FEAT-001 | Validasi kebutuhan tanggal/tempat yang dapat diubah | CMS belum dapat dipakai ulang untuk acara dengan tanggal/tempat lain tanpa perubahan source | Sedang | Konfirmasi rencana reuse; selaraskan form, template, metadata dan countdown | Product Owner, lalu Backend + Frontend |

## Verifikasi dan keterbatasan

- **Commit dan working tree:** commit `956b43aca5eb9a449ad914635a596169bf3d2ea6`. Sebelum laporan dibuat, working tree berisi dua file untracked: file audio dan `docs/backend-product-audit-prompt.md`; keduanya dibiarkan. Build menghasilkan berkas hanya di `frontend/dist/` yang diabaikan Git. Source aplikasi/config/database tidak diubah.
- **Area diperiksa:** panduan `AGENTS.md`, README, panduan API lokal, backend Go, pemanggil UI admin/tamu, schema dan migrasi, OpenAPI/struktur koleksi Postman, tes yang ada, Caddy, Docker/workflow, dan helper deployment. Dua reviewer independen melakukan pass backend dan produk; temuan digabung dan disilang-periksa.
- **`npm test`:** lulus (exit 0). Menjalankan tes JavaScript yang terdaftar, `go test ./...`, dan enam tes Python. Ini mencakup helper frontend, validasi/unit backend dan pemilihan/deploy helper; tidak menjalankan `tests/api.test.mjs` atau menguji database aplikasi.
- **`npm run build`:** lulus (exit 0); TypeScript dan Vite membangun frontend.
- **`git diff --check`:** lulus; tidak ada perubahan source sebelum laporan.
- **Tes integrasi/Postman tidak dijalankan:** `.env.test.local` ada, tetapi flag `TEST_DATABASE_DISPOSABLE=1` tidak aktif dan kedua URL tes menunjuk endpoint non-lokal yang berbeda. Tes integrasi menjalankan migrasi serta menghapus data; karena target disposable tidak dapat dibuktikan dari konfigurasi, menjalankannya tidak aman. Tidak ada kredensial atau nilai URL yang dicetak.
- **Belum diverifikasi:** reproduksi runtime BUG-001 di PostgreSQL; isolasi lintas tenant melalui tes integrasi saat ini; request ke Fingerprint nyata; browser/perangkat mobile dan jaringan seluler; performa/load media; Docker image, Caddy routing dan deploy VPS; kondisi produksi setelah commit yang diaudit.
- **Batas kontrak dan bukti:** OpenAPI dan koleksi ditelusuri statis, tidak dijalankan. Catatan verifikasi di README/docs berasal dari pemeriksaan sebelumnya dan tidak dianggap bukti runtime pada commit audit ini.
- **Ringkasan reviewer:** reviewer backend menemukan BUG-001; reviewer produk menemukan IMP-001, IMP-002 dan hipotesis tanggal/tempat FEAT-001. Audit utama menambahkan IMP-003 dari ketidaksesuaian URL peta dan judul iframe. Tidak ada perbedaan temuan backend yang substantif. Reviewer produk sempat menganggap kegagalan musik sebagai bug berdampak rendah; laporan mengelompokkannya sebagai perbaikan fitur existing karena alur utama musik tetap tersedia setelah reload dan kontrak saat ini tidak menjanjikan pemulihan otomatis. Risiko dan jalur pemulihannya tetap dicatat.
- **Asumsi untuk dikonfirmasi:** apakah jumlah orang hadir perlu menjadi metrik utama; apakah undangan akan dipakai ulang untuk tanggal/tempat acara lain; serta perilaku pemutaran ulang audio yang diharapkan pada browser tamu.
