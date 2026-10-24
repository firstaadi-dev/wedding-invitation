# weddinvita — spesifikasi alternatif desain CMS

24 Oktober 2026 · Acuan desain untuk implementasi berikutnya, bukan perubahan aplikasi. Arah final **Buku Persiapan**, dirancang langsung dengan Impeccable, tanpa menggunakan hasil generasi Stitch. [Identitas](weddinvita-brand-identity.md) · [Token](weddinvita-cms-design-tokens.md) · [Mockup HTML lokal](../design/cms-alternate/index.html) · [Panduan studi dan bukti pemeriksaan](../design/cms-alternate/README.md).

## Sumber kebenaran dan batas

AGENTS.md, README.md, docs/weddinvita-cms-results.md, docs/weddinvita-cms-implementation.md, docs/weddinvita-cms-mobile.md, manifest dan lima snapshot `design/cms/` telah ditinjau sebagai kondisi awal. Kemampuan produk mengikuti `frontend/src/main.tsx`, `types.ts`, `frontend/admin.css`, `admin.html`; rincian perhitungan mengikuti `admin-data.js`, pesan mengikuti `whatsapp.js`, tanggal mengikuti `event.js`. Implementasi pencabutan akses diperiksa melalui fungsi `revoke` dan aksi tamu di `backend/internal/app/admin.go` secara baca saja. Ini bukan pekerjaan desain atau perubahan API.

| Perbedaan terhadap catatan lama | Bukti aktual dan keputusan |
| --- | --- |
| Catatan implementasi menyebut delapan kolom dan tidak ada pax | GuestRow dan header sekarang memiliki **sembilan** kolom, termasuk guestCount; guestSummary sudah menghitung people. Tampilkan jumlah orang terpisah dari jumlah undangan |
| Catatan lama menyebut tanggal baru tidak tersedia | SettingsForm memiliki eventDate dan venueName editable. Keduanya masuk desain; bukan konteks read-only |
| Media disebut satu MP3 | Satu slot audio menerima MP3, M4A/AAC, WAV, OGG/Opus, FLAC, WebM; batas 25 × 1024² byte |
| Token lama menonjolkan nama/link | Empat token tersedia: nama, link, tanggal, tempat; sisipkan semuanya di posisi kursor |
| Pill hadiah 72 × 34 | Desain baru 72 × 44 px agar target sentuh cukup |
| Snapshot login dan dashboard berbeda font/palet | Alternatif menyatukan Inter, biru tinta, putih hangat, navigasi terang; snapshot lama tidak diperbarui |
| Draft awal studi ini memakai Ruang Persiapan hijau | Digantikan Buku Persiapan biru. Hasil Stitch yang sempat diminta sebelum arahan terbaru tidak dipakai atau dijadikan acuan |

**Invitation dilindungi sepenuhnya:** amplop burgundy, segel, joglo, hutan dan aset; warna, font, komposisi, kartu, spacing, layout dan responsivitas; animasi, parallax, scroll snap, audio, reduced motion; RSVP, ucapan, hadiah, galeri, peta; akses tamu dan preview. Tidak ada file aplikasi, kontrak, atau data produksi yang diubah. Mengedit konten melalui CMS kelak tetap memakai perilaku produk yang tersedia, bukan mengganti desain invitation.

Semua nama, kontak bertanda xxx, tanggal dan rekening pada studi adalah fiktif. Tautan contoh hanya memakai domain reserved `invitation.example`, tidak mengandung token asli. Jangan memuat akun/tenant asli untuk demonstrasi.

## Struktur navigasi dan kerangka

Login berdiri sendiri. Setelah masuk, halaman pertama Tamu Undangan. Navigasi tetap empat tujuan, berurutan: **Tamu Undangan → Pesan & Preview → Foto & Lagu → Detail Acara**. Pertahankan hash tamu/pesan/media/acara, deep link serta title browser. Tidak ada overview, billing, paket, tim, multi-event, theme editor, publish, impor/ekspor atau integrasi WhatsApp tambahan.

Wordmark menuju Tamu Undangan pada akun yang sama. Bagian bawah sidebar memuat Lihat undangan (tab baru, sesi admin, beri petunjuk “membuka tab baru”) dan Keluar. Preview tidak dapat mengirim jawaban tamu. Tampilkan konteks `account.tenant.name` dari sesi, bukan nama pasangan hardcoded. Email akun boleh ada di drawer konteks bila diperlukan identifikasi; tidak ada tenant switcher atau pengaturan akun rekaan. Nama tenant panjang dapat wrap dua baris; nama penuh tetap dapat dibaca di drawer, bukan hanya tooltip.

| Rentang | Aturan layout |
| --- | --- |
| 1440 px acuan | Sidebar 208 px, workspace 1232 px, header konteks 80 px. Inset konten 32 px kiri/kanan menghasilkan 1168 px. Jarak atas 36 px. Sidebar terang sticky, label penuh, bukan rail ikon |
| 1200–1599 | Sidebar 208 px; konten mengikuti lebar tersedia. Tabel boleh overflow hanya di region tabel |
| 900–1199 | Sidebar 184 px, inset 24 px, pesan dua kolom jika masing-masing ≥300 px; Detail Acara satu kolom tanpa aside |
| 600–899 | Sidebar hilang, header mobile 72 px dengan wordmark dan Menu 44 px. Drawer modal lebar min(320 px, viewport−32 px), tanpa menggeser halaman. Pesan satu kolom; kedua preview dapat bersebelahan jika cukup ruang |
| 390 px acuan | Header 72 px, inset 16 px → konten 358 px; semua field/panel satu kolom. Panel padding 20 px. Toolbar wrap vertikal, primary halaman penuh. Summary dua kolom dan satu baris khusus orang hadir |
| 320–389 | Inset tetap 16 px → konten minimum 288 px. Label dan tombol panjang wrap, bukan clip. Dua kolom form/galeri/preview menjadi satu. Pagination wrap dua–tiga baris, tabel tetap satu region scroll |
| ≥1600 | Konten maksimum 1440 px di workspace. Ruang ekstra menjadi margin, bukan membesarkan ukuran font |

Study-note berwarna gelap di mockup hanya label “Studi desain alternatif · Seluruh data fiktif”; bukan elemen CMS produksi. Tipografi fixed rem, tidak menyusut demi memuat lebih banyak kolom. Gunakan min-width:0 pada grid/flex child dan width:100% pada field. Jangan menutupi cacat overflow dengan body overflow-x:hidden. Table region mengelola overflow-nya sendiri.

Alasan: sidebar terang memudahkan perpindahan kerja, label mengurangi tebakan ikon, sedangkan area konten tetap dominan. Signature visual adalah **ringkasan bersatuan**: angka orang diberi bidang biru pucat dan label yang menjelaskan pendamping; jumlah undangan tidak terlihat sebagai angka yang sama jenisnya.

## Aturan bersama: state, keyboard, dan keselamatan

| State | Spesifikasi |
| --- | --- |
| Default | Isi tersimpan tampil; tombol berlabel; input opsional ditandai; tidak ada data asumsi yang ditampilkan sebagai hasil server |
| Memuat sesi/data | “Memuat weddinvita…” sebagai status, aria-busy pada wilayah; setelah data tersedia, tampilkan sekaligus. Jika skeleton dipakai, aria-hidden dan tanpa angka palsu. Jangan tampilkan empty sebelum load selesai |
| Gagal load | Banner persisten menjelaskan kegagalan; “Muat ulang” memakai request/refresh yang sudah ada. Jangan menampilkan data kosong sebagai sukses. Bila mutasi sudah sukses tetapi refresh gagal: “Perubahan tersimpan. Muat ulang daftar untuk melihat hasil terbaru.” |
| Sukses | Pesan spesifik role=status, tidak mengambil fokus. Status simpan persisten di form; pemberitahuan bisa ditutup dengan tombol 44 px |
| Error | Teks spesifik di dekat konteks, role=alert untuk kegagalan tindakan; jangan mengumumkan error tiap ketikan berulang. Warna danger ditambah teks. Pertahankan nilai/berkas bila alur aktual mempertahankannya |
| Disabled | Field/tombol tidak dapat dipakai saat request aktif atau prasyarat belum lengkap. Tampilkan alasan di teks bantuan yang tetap terbaca, bukan title saja; jangan memakai opacity seluruh panel |
| Belum disimpan | Pesan dan Detail Acara menunjukkan “Perubahan belum disimpan”. Tidak ada autosave. Berpindah antarhalaman internal mempertahankan form mounted seperti kode saat ini; reload, logout atau sesi habis dapat membuang draft. Tidak menjanjikan persistensi lokal/undo/autorecovery |
| 401 / sesi berubah | Hapus data sesi/tenant, CSRF, daftar, media, dialog dan tautan dari memori tampilan; kembali login. Tampilkan “Sesi Anda berakhir. Masuk kembali untuk melanjutkan.” Tidak menampilkan ulang konten akun sebelumnya. Jangan menyimpan password/draft sensitif di localStorage |

WCAG 2.2 AA adalah **target implementasi**, bukan sertifikasi. Teks biasa ≥4,5:1, teks besar ≥3:1; batas komponen/fokus penting ≥3:1. Perhitungan pasangan token terdapat dalam dokumen token. Status punya label, ikon hanya membantu. Semua tombol utama dan ikon memiliki hit area ≥44 × 44; checkbox 18 px berada dalam label 44 × 44. Tidak ada informasi yang hanya tersedia lewat hover. Reflow pada 200% zoom; pada 400% desktop perilaku setara viewport 320–360 px, tabel tetap region dua dimensi.

Urutan Tab mengikuti DOM dan urutan baca, tanpa tabindex positif. Skip link ke main; navigasi memakai aria-current. Setelah route berubah, fokus h1 tabindex=-1; jangan menggeser fokus ketika filter berubah. Region tabel berlabel dan focusable, panah menggulir saat region fokus; kontrol di sel tetap bisa ditab. Sort header adalah button dengan aria-sort pada th aktif. Nama tamu adalah row header, bukan tautan tersembunyi.

Dialog memakai native dialog/modal dan portal di luar tabel. Latar inert, fokus terperangkap, title/description terhubung. Editor: fokus nama; filter: select; ucapan: judul atau Tutup; konfirmasi: **Batal** terlebih dulu. Escape menutup sebelum request, backdrop tidak menjalankan aksi; saat mutasi berjalan jangan izinkan penutupan yang membatalkan status tanpa membatalkan request. Tutup dialog mengembalikan fokus ke pemicu; bila baris dihapus, ke heading atau baris berikutnya; bila drawer memilih halaman baru, ke heading halaman tujuan. Nested menu→konfirmasi perlu mengingat pemicu baris asli. Kesuksesan tidak membuka dialog tambahan tanpa kebutuhan.

Tidak ada fingerprint, event ID, kredensial, secret atau identitas tenant lain di UI. Hitungan browser cukup x/y atau x/∞; jangan mengklaim sebagai jumlah perangkat fisik. Pertahankan CSRF dan validasi server saat implementasi, jangan menggantinya dengan validasi desain/browser saja.

## 1. Login

**Tujuan:** masuk ke akun yang sudah tersedia. Primary Masuk ke akun; sekunder hanya navigasi brand. Tidak ada signup, SSO, lupa kata sandi, reset password, atau “ingat saya”.

Desktop: split 45/55; kiri biru pucat dengan wordmark, pengantar “Hari istimewa. Persiapan yang lebih tertata.” dan tiga baris pekerjaan produk; kanan form max400 px, padding64 px. Pada 600–899 padding40. Pada 390 dan 320: wordmark/pengantar pendek di atas, form di bawah padding24 px, dekorasi/bagian indeks dihilangkan. Jangan mengharuskan form muat satu layar pendek; scroll vertikal normal.

Urutan: h2 Selamat datang → kalimat bantuan → Email → Kata sandi → error → primary. Email type=email required max254 autocomplete=username. Kata sandi type=password required max1024 autocomplete=current-password. Jangan menerapkan minimum12 pada login; itu aturan provisioning, bukan syarat masuk tambahan. Paste dan password manager tetap bekerja.

Default form kosong. Empty/no-results tidak berlaku. Loading: tombol “Memeriksa…”, form aria-busy, cegah submit ganda, nilai tetap saat gagal; sukses menuju data akun setelah daftar dan content siap. Validasi browser dekat field: “Isi email Anda”, “Gunakan format email yang valid”, “Isi kata sandi Anda”. Gagal kredensial: “Email atau kata sandi belum sesuai. Periksa kembali lalu coba lagi.” Pembatasan percobaan/jaringan memakai pesan server yang relevan. Jangan membocorkan akun mana ada. Fokus error summary bila submit gagal, lalu field terkait dapat ditab; jangan menghapus kata sandi karena error koneksi. Tidak ada dirty/save indicator login.

Wireframe 1440: `[brand & pengantar 648 px] [form area 792 px; form400]`. Wireframe390: `[brand/pengantar lebar390] / [form342 atau viewport−48]`. Mockup: `index.html#login`.

## 2. Tamu Undangan

**Tujuan:** menemukan tamu, membagikan tautan, membandingkan konfirmasi dan memelihara akses. Primary Tambah tamu. Sekunder pencarian/filter, aksi baris dan pagination. Urutan: heading dan primary → summary → toolbar → status hasil/pilihan → tabel → pagination → catatan satuan.

Summary global, tidak berubah mengikuti filter: Total undangan (semua), Undangan konfirmasi hadir (aktif+attending), Orang akan hadir (jumlah guestCount hanya aktif+attending), Belum konfirmasi (aktif tanpa response), Nonaktif. Jangan menjumlahkan pending/unsure/not_attending sebagai orang hadir. Tampilkan nol sungguhan hanya setelah data selesai. Semua angka locale id-ID dan tabular-nums. Jumlah hadir per baris read-only; CMS tidak mengedit RSVP.

Desktop summary lima kelompok pada satu strip, tidak ada grafik. Mobile dua kolom; baris khusus “Akan hadir — N orang, termasuk pendamping” sepanjang lebar. Toolbar: cari nama/nomor, status semua/aktif/nonaktif, konfirmasi semua/hadir/belum konfirmasi/tidak hadir/belum pasti, Filter browser (semua/batas tercapai/belum digunakan), Reset. Filter browser diterapkan langsung, Selesai hanya menutup dialog. Pencarian mengikuti substring nama/nomor seperti findGuests; jangan menjanjikan pencarian format nomor yang dinormalisasi otomatis. Mengubah filter/sort/page/page size/data menghapus pilihan. Reset mengembalikan name-asc dan halaman1.

Tabel tetap **sembilan kolom**, prioritas baca dan lebar acuan:

| Kolom | Min px | Penyajian |
| --- | ---: | --- |
| Pilih | 44 | Checkbox dengan nama aksesibel, select-all hanya halaman terlihat, mixed jika sebagian |
| Nama tamu | 134 | Row header, wrap tanpa menghilangkan nama penuh; minimum row76 px, tumbuh untuk nama120 karakter |
| WhatsApp | 126 | Nomor internasional, angka tabular; pertahankan kode negara; tanda + boleh menjadi format baca tanpa mengubah nilai tersimpan; scroll sel/wrap pada batas wajar untuk nomor panjang |
| Status | 80 | Label Aktif/Nonaktif, terpisah dari konfirmasi |
| Konfirmasi | 128 | Hadir/Tidak hadir/Belum pasti/Belum konfirmasi; sort alfabet label dua arah |
| Orang | 60 | guestCount apa adanya; null “—”, tidak hadir0, bukan nilai tak diketahui0 |
| Browser | 72 | deviceCount/deviceLimit; null limit “∞” dan teks bantuan “Tanpa limit”; full punya label/bantuan |
| Ucapan | 60 | Baca bila ada, “—” bila kosong; dialog isi lengkap dengan whitespace dan wrap, tanpa render HTML |
| Aksi | 360 | Salin tautan, Buka WhatsApp selalu berlabel; Edit dan menu ⋯ berlabel aksesibel |

Min table final1164 px, termasuk ruang border/padding. Pada workspace yang lebih sempit, scroll horizontal **di table-wrap**, max-width100%, bukan seluruh halaman. Pada1440 seluruh kolom muat;390/320 scroll penuh dengan petunjuk eksplisit dan scrollbar. Jangan menyembunyikan kolom/aksi, jangan mengganti tabel menjadi kartu. Sticky header di region max-height580–600 px; pada mobile tanpa sticky kolom supaya nama/aksi tidak saling menutupi. Pada desktop besar boleh sticky nama/aksi hanya bila tidak menutup kolom lain; alternatif ini memakai tabel tanpa sticky kolom agar perilaku seragam. Hit area ikon44 px, tabel menyesuaikan bila perlu. Semua aksi dapat ditemukan dengan geser, Tab dan scroll region.

Pagination 25 default /50/100, first/prev/next/last atau tombol nomor yang sudah ada, input lompat bilangan bulat yang di-clamp1..totalPages. Halaman1 dari1 saat kosong, prev/next disabled. Label “1–25 dari N undangan”, berbeda dari total global. Batas render hanya current page; implementasi sekarang tetap memuat semua tamu sekali dan filter/sort lokal. Jangan menyebut server pagination/load test. Data banyak mungkin lambat pada pemuatan awal; perpindahan ke server adalah usulan terpisah bila ada bukti kebutuhan, bukan fitur desain wajib.

Editor tambah/edit: drawer kanan desktop max480 px; mobile sheet/dialog lebar viewport−32, max-height viewport−32, internal scroll, footer tidak menutup field terakhir. Nama required1–120 karakter trim, tanpa control character; WhatsApp opsional max40 input karakter, format08/62/+kode negara. Setelah normalisasi menerima8–15 digit internasional. Jangan mengubah rekening menjadi number yang menghilangkan nol depan. Pada **edit saja**, Batas browser: Ikuti pengaturan global/Tanpa limit; perubahan tidak menghapus riwayat. Tidak ada toggle aktif di tambah bila belum tersedia. Tambah sukses menampilkan tautan baru yang tersimpan di daftar; salin readonly input dengan fallback salin manual. Saat gagal simpan nilai editor tetap ada. Tombol simpan “Menyimpan…” dan disabled; Batal tidak menghapus data server.

Aksi baris: salin boleh saat link tersedia walau nonaktif, tetapi Buka WhatsApp hanya aktif+nomor+link. Jika link lama tidak dapat dipulihkan dari hash, Salin dan WhatsApp disabled dengan bantuan “Tautan lama belum tersimpan. Buat tautan baru dan kirim ulang.” Nomor kosong: “Isi nomor WhatsApp melalui Edit tamu.” Clipboard gagal membuka dialog input read-only, select text untuk salin manual. Tidak menampilkan link dalam toast/log. WhatsApp tab baru memakai wa.me dan pesan terisi; tidak ada bukti terkirim atau delivery status.

Aksi massal hanya **Aktifkan/Nonaktifkan**, tidak hapus/rotasi/reset massal. Tampilkan “N tamu dipilih pada halaman ini”, Batal pilihan, konfirmasi jumlah dan dampak. Pertahankan batch maksimal4 request paralel, berhenti setelah batch pertama dengan kegagalan seperti kode. “K dari N undangan diperbarui. Sebagian gagal atau belum diproses. Muat ulang daftar, periksa status, lalu pilih kembali.” Jangan mengklaim semuanya gagal, melakukan rollback semu, atau mengulang yang sudah sukses otomatis. Bila refresh juga gagal, tegaskan status daftar belum terbaru. Status proses persisten “Menyimpan K/N…”, disable toolbar/pilihan terkait; jangan menjanjikan progres orang.

State halaman: loading mengikuti aturan bersama; empty “Belum ada tamu…” +Tambah; no-results “Tidak ada tamu yang cocok…” +Reset filter; error load bukan empty; sukses notifikasi spesifik; row busy disable aksi row; bulk busy menonaktifkan tabel/toolbar terkait. Tidak ada dirty state daftar di luar editor. Ucapan panjang sampai1000 karakter dibaca utuh dalam dialog, tidak disalin menjadi label tombol.

Wireframe1440: `[sidebar208][header80 / heading / strip5 / toolbar / table1164↔ / pager]`. Wireframe390: `[brand Menu] / [title +Tambah] / [summary2+orang lebar] / [search / status / konfirmasi / Filter Reset] / [pilihan] / [tabel1164↔ dalam358] / [pager wrap]`. Mockup `#tamu`.

## Dampak aksi tamu — copy konfirmasi wajib

| Tindakan | Penjelasan sebelum konfirmasi | Hasil aktual |
| --- | --- | --- |
| Nonaktifkan | “Undangan NAMA tidak dapat dibuka. Semua sesi saat ini dicabut, ucapan disembunyikan. Data tetap tersimpan dan undangan dapat diaktifkan kembali.” | revoke clear=false: sesi dan challenge dicabut, **catatan browser tetap ada**, jawaban tidak dihapus |
| Aktifkan | Per baris dapat langsung dilakukan seperti kode; massal konfirmasi jumlah. “Undangan dapat dibuka kembali.” | Tautan tidak diganti; jangan menjanjikan slot browser kembali kosong |
| Tautan baru | “Tautan lama tidak berlaku lagi. Semua sesi dan catatan browser direset. Kirim tautan pengganti kepada tamu.” | Rotasi token, revoke clear=true; jawaban tetap tersimpan; tampilkan tautan baru |
| Reset browser | “Semua sesi dan catatan browser NAMA dihapus. Tamu dapat membuka tautan yang sama untuk mendaftarkan browser kembali. Konfirmasi dan ucapan tetap tersimpan.” | revoke clear=true; **tautan tetap sama**, tidak menonaktifkan tamu |
| Hapus | “Hapus NAMA beserta tautan, akses, konfirmasi, dan ucapan? Data tidak dapat dipulihkan.” | Hapus guest dan jawaban terkait; tanpa undo rekaan |

Menu menaruh aktif/nonaktif, tautan baru, reset terpisah dari Hapus paling bawah. Hapus memakai danger dan konfirmasi, bukan ikon trash sejajar Salin. Default fokus Batal; tombol konfirmasi menyebut tindakan, bukan OK.

## 3. Pesan & Preview

**Tujuan:** mengatur isi pesan dan metadata pembagian tanpa mengira pesan sudah dikirim. Primary Simpan pesan dan pratinjau untuk tiga field teks. Sekunder sisip token dan upload thumbnail (aksi tersendiri). Urutan desktop: heading/status/save → editor kiri60%, preview kanan40% → thumbnail. Pada390/320: editor template → metadata field → preview pesan → preview metadata → thumbnail; simpan terlihat di heading dan dapat diulang pada akhir form jika jauh, keduanya submit form yang sama, bukan dua scope simpan.

Template required max4000, `{link}` wajib, token valid hanya `{nama}`, `{link}`, `{tanggal}`, `{tempat}`. Token buttons menyisipkan pada selection/kursor, mengganti selected text; restore fokus/caret, tolak jika melewati batas. Counter terkait aria-describedby, tidak live tiap karakter. Unknown token ditolak dengan pesan daftar token. Judul max120, deskripsi max300; kosong atau whitespace memakai bawaan: nama pertama pasangan tersimpan, tanggal/tempat tersimpan. Preview pesan bereaksi pada draft teks; konteks pasangan/tanggal/tempat berasal dari **content tersimpan**, bukan draft Detail Acara. Pesan panjang wrap preserve newline, URL wrap-anywhere; jangan font kecil demi bubble muat.

Dua panel **terpisah**: Pratinjau pesan = teks pesan dengan nama/tautan contoh; Pratinjau metadata tautan = gambar1200:630, judul, deskripsi, host. Host read-only dari invitationOrigin, bukan field kustom. Placeholder thumbnail jujur; jangan gunakan foto stok sebagai foto terpasang. “Simulasi susunan konten. Tampilan dan cache WhatsApp dapat berbeda.” Tidak ada tombol kirim di preview; petunjuk Buka WhatsApp berada dekat preview.

Thumbnail menerima JPG/PNG/WebP ≤12MiB, crop tengah menjadi JPEG1200×630, akses publik crawler; foto galeri/couple/audio tetap memakai sesi. “Gambar ini dapat diakses publik untuk pratinjau.” Ganti/hapus mencabut URL gambar lama. Preview metadata memakai thumbnail tersimpan, bukan berkas baru yang belum diunggah. Upload/ganti/hapus memiliki status sendiri dan tidak menandai teks sudah tersimpan. Slot preview berada di halaman ini, bukan galeri.

State: default isi tersimpan/counter; loading form aria-busy dan tombol Menyimpan; dirty persisten; berhasil reset dirty; gagal save tetap draft dan error kontekstual; empty teks metadata memakai bawaan, template kosong invalid; no-results tidak berlaku; thumbnail empty/loading/error/success mengikuti MediaCard. Jangan tampilkan “Pengaturan tersimpan” selama draft belum tersimpan atau setelah upload berhasil sementara teks dirty. Urutan Tab editor → tokens/field → simpan sesuai DOM → preview (hanya konten, bukan puluhan tab stop) → thumbnail. Error fokus ke field pertama invalid, ringkasan status tidak menutupi tombol.

Wireframe1440: `[heading + state/save] / [template + metadata 60%][preview pesan / preview metadata 40%] / [thumbnail independen]`. Wireframe390: `[heading/save] / [template] / [metadata fields] / [preview pesan] / [preview metadata] / [thumbnail]`. Mockup `#pesan`.

## 4. Foto & Lagu

**Tujuan:** memasang/mengganti/menghapus media sesuai kapasitas nyata. Tidak ada save-all. Primary per slot Unggah/Ganti setelah pemilihan file; sekunder Pilih foto/audio, Hapus bila terpasang. Urutan bantuan format → dua foto mempelai (`groom`, `bride`) → sembilan slot `gallery1`…`gallery9` berurutan → satu `music`. Total12 slot halaman ini; thumbnail preview adalah slot13 di Pesan & Preview. Tidak ada reorder, crop editor, pencarian, unggah drag-drop massal, atau kapasitas tanpa batas.

Desktop: couple dua kolom max760 px, galeri tiga kolom (dua pada900–1199), music max760; mobile satu kolom semua slot bernomor tetap. Card padding20, image area min150 desktop/180 mobile; thumbnail tampil contain agar isi foto bisa ditinjau. Tidak menafsirkan placeholder sebagai foto yang sudah tersimpan. Audio player native controls, preload=none, tidak autoplay; pause saat penggantian/penghapusan dan unmount sesuai implementasi. Tidak menjanjikan pause otomatis setiap pindah route jika kode mempertahankan node mounted.

| Tipe | Batas dan perilaku |
| --- | --- |
| Foto | JPG/JPEG, PNG, WebP; >0 dan ≤12 ×1024² byte. Decoder server memvalidasi isi, EXIF orientasi, resize, WebP; ekstensi/MIME saja bukan bukti valid |
| Audio | MP3, M4A/AAC, WAV, OGG/OGA/Opus, FLAC, WebM audio; >0 dan ≤25 ×1024² byte. MP3 divalidasi dan disimpan; format lain dikonversi MP3 di server; jangan menjanjikan semua container berisi codec valid |

State machine: kosong/terpasang → berkas dipilih valid → Unggah/Ganti enabled → memproses (slot aria-busy, pilih/upload/hapus disabled) → sukses (media baru, pilihan dibersihkan, fokus ke file input) **atau gagal** (media lama tetap, file pilihan tetap, tombol sama untuk retry). Berkas invalid/kosong/terlalu besar: inline alasan, jangan unggah. Memilih berkas baru bukan autosave dan bukan preview media tersimpan. File picker harus bisa keyboard; nama file dipilih wrap, tidak memotong tombol. Data server tidak menyediakan nama/ukuran file lama: jangan mengarang “photo.jpg, 2MB” pada slot terpasang. Validasi batas dihitung dalam MiB walau copy lama menulis MB.

Hapus meminta konfirmasi yang tepat: foto kembali placeholder, musik hilang, thumbnail URL lama dicabut. Gagal delete mempertahankan media; sukses kembali empty. Tidak ada ucapan/no-results atau dirty global. Pilihan file belum diunggah diberi status “Berkas dipilih. Tekan Unggah untuk memasangnya.” Navigasi/reload mengikuti keterbatasan draft, tidak menjanjikan persistensi file. Screen reader menerima status selesai/gagal per slot, bukan semua slot sekaligus. Semua kontrol punya nama yang menyebut slot.

Wireframe1440: `[heading / bantuan] / [couple1][couple2] / [gallery1][2][3] / [4][5][6] / [7][8][9] / [music]`. Wireframe390: urutan sama satu slot per baris. Mockup `#media`; semua media kosong sengaja sebagai state produk valid.

## 5. Detail Acara

**Tujuan:** memperbarui informasi yang dibaca tamu dan aturan akses, tanpa theme editor. Primary Simpan detail acara, satu transaksi form; sekunder tambah/hapus hadiah dan toggle. Rekomendasi urutan baru: mempelai → keluarga → rangkaian acara → countdown → lokasi/peta → hadiah → batas akses. Memindahkan batas akses dari posisi pertama incumbent mengurangi gangguan pada pekerjaan konten. Desktop form max760 px; aside konteks max260 px bersifat read-only (bukan preview data live). Pada≤1199 aside hilang, form tetap lengkap. Mobile satu kolom, footer save/status setelah seluruh field, tanpa overlay menutup input. Satu footer save memberi cakupan perubahan jelas.

| Grup | Field yang benar-benar dapat diedit | Aturan |
| --- | --- | --- |
| Mempelai | partnerOneName, partnerTwoName | Masing-masing max120, gelar di dalam nama; kosong memakai perilaku fallback produk, bukan validasi required baru |
| Orang tua | partnerOneFather/Mother, partnerTwoFather/Mother | Empat field max120, kelompok keluarga diberi heading; tetap field teks |
| Acara | eventDate; ceremonyTitle/Time; receptionTitle/Time | Tanggal input date valid YYYY-MM-DD, kosong mengikuti default kode. Dua acara tetap, nama/waktu masing-masing max80; waktu teks rentang seperti11.00–13.00 WIB, bukan konversi otomatis zona browser. Waktu kosong “Waktu akan diinformasikan” |
| Countdown | countdownTime | time HH:mm24jam atau kosong →00.00, memakai eventDate dalam WIB; tidak memilih zona waktu baru |
| Lokasi | venueName, mapEmbedUrl | Nama tempat max160; kosong memakai fallback produk. URL max4096, kosong boleh; URL resmi HTTPS www.google.com/maps/embed…, tanpa username/password; bukan URL pendek biasa atau kode iframe. Preview iframe hanya untuk URL valid, judul aksesibel, lazy; invalid jangan dimuat |
| Hadiah | giftEnabled; giftAccounts max10 | Jenis rekening/alamat; ON/OFF accessible switch72×44; OFF menonaktifkan kontrol dan **mempertahankan array pada payload**; tidak menghapus data |
| Batas browser | deviceLimitEnabled; deviceLimit | Aktif/nonaktif; angka required integer1–2147483647, default3. Riwayat/sesi tetap disimpan ketika toggle/angka diubah. Browser lama tetap bisa masuk setelah penurunan batas, browser baru ditolak jika penuh. Pengecualian tanpa limit melalui edit tamu, bukan angka limit individual |

Rekening: bank required max80; nomor required max40 karakter digit/spasi, inputmode=numeric **tetap type=text**, nol depan dipertahankan; owner required max120. Alamat: recipient required max120, address required max1000 multiline, phone opsional max40; nomor kontak hadiah tidak otomatis dianggap nomor WhatsApp atau dinormalisasi seperti telepon tamu. Semua disimpan pada akun yang sama. Jangan menyalin default rekening/nama dari kode produksi ke studi; gunakan fiktif.

Tambah default item rekening kosong; batas10 tombol disabled dengan bantuan “Maksimal 10 informasi hadiah.” Empty array valid “Belum ada informasi hadiah.” OFF dengan data atau tanpa data bukan error. Hapus item adalah perubahan draft hingga Simpan, bukan request media/delete tamu; jangan menulis “dihapus dari undangan” sebelum save sukses. Ganti jenis item berisi data wajib konfirmasi “Isian pada informasi hadiah ini akan dikosongkan untuk jenis yang baru.” Batal mempertahankan jenis dan isi lama; item kosong boleh langsung ganti. Tindakan Hapus jauh dari field nomor, tidak adjacent toggle global. Jika penutupan editor akan menghilangkan draft, informasi scope simpan harus terlihat, tanpa menjanjikan undo baru.

Read-only: nama konteks akun/tenant, host invitation, tema Rimba Jawa, jumlah acara tetap2, kapasitas media, dan hasil preview; bukan field edit terselubung. Nama pasangan/tanggal/tempat **bukan** read-only. Tidak ada edit timezone atau publish status.

State: default konten tersimpan/fallback; dirty untuk setiap field/toggle/tambah/hapus; loading form disable termasuk hadiah, tetap nilai; gagal save pertahankan draft, state belum disimpan; berhasil status dan re-fetch daftar untuk memperbarui batas browser efektif. Jika refresh daftar gagal setelah save, tampilkan “Detail acara disimpan. Daftar tamu belum berhasil diperbarui.” Tidak mengganti sukses save menjadi gagal seluruhnya. Empty peta menampilkan instruksi, tidak gagal; no-results tidak berlaku. Browser control tetap menampilkan angka tersimpan saat pembatasan nonaktif. Label/validasi ditempatkan di field, urutan Tab mengikuti urutan grup dan tiap item; saat tambah hadiah fokus jenis item baru, saat hapus kembali ke item berikutnya atau Tambah. Switch Space/Enter mengubah aria-checked, OFF juga diumumkan via teks, bukan warna.

Wireframe1440: `[heading] / [form760: mempelai → keluarga → acara → countdown → lokasi → hadiah → akses → save][aside konteks]`. Wireframe390: semua grup satu kolom, rekening/alamat wrap, save full-width. Mockup `#acara`.

## Handoff, batas simulasi, dan verifikasi berikutnya

Gunakan kembali Brand/Navigation/Modal/GuestEditor/GuestRow/GuestsPage/MediaCard/SettingsForm serta guestSummary/queryGuests/mediaType/invitationMessage/whatsappUrl/eventDateLabels; ubah presentasi kelak di CMS saja, jangan memindahkan style ke global invitation. `frontend/admin.html` adalah entry CMS; CSS token baru di-scope CMS, bukan `frontend/style.css` atau template invitation. Kontrak dan validasi server tetap; tidak ada dependency baru yang dibutuhkan untuk menerapkan arah ini.

Mockup HTML lokal adalah studi interaktif di memori: nav, cari/filter/sort/page/pilihan, tambah/edit, dialog risiko, token/preview/save simulasi, file validation dan preview lokal, retry gagal, gift preservation. **Bukan aplikasi CMS pengganti.** Tidak login sungguhan, menghubungi API, menyalin secret, memanggil WhatsApp, mengunggah/mengonversi berkas server, memuat peta, atau menampilkan invitation. Reload mereset seluruh contoh. Sebagian perilaku produksi (rate limit,401, parsial batch, decoder, fallback URL lama) ditetapkan oleh spesifikasi, tidak dibuktikan mockup.

Pengujian implementasi berikutnya wajib: isi nama120/ucapan1000, nomor8/15digit dan invalid;4000/120/300 tepat dan lebih batas termasuk token; gambar/audio ukuran tepat dan lebih batas/decoder-invalid; file dipertahankan pada gagal; bulk campuran sukses/gagal/refresh gagal;401 dan isolasi tenant; navigasi keyboard/fokus nested dialog; screen reader VoiceOver/NVDA;zoom200/400%,320/390/1440, reduced motion. Lakukan dengan fixture/disposable sesuai aturan repo, tanpa produksi. Ini acceptance criteria, bukan klaim sudah dijalankan untuk aplikasi.

## Asumsi dan pertanyaan terbuka

Asumsi desain: tugas tamu paling sering, ponsel menjadi salah satu perangkat kerja, dan latar terang memudahkan persiapan sehari-hari. Belum ada observasi pengguna yang mengonfirmasi frekuensi/lingkungan ini. Tidak ada pertanyaan yang menghalangi keputusan visual. Perlu validasi pengguna kelak: apakah label “Browser” cukup dipahami dan scroll tabel mobile mudah ditemukan. Tidak perlu menambah fitur produk untuk memvalidasi keduanya.

Usulan di luar cakupan: server-side pagination hanya jika ada bukti initial load lambat; penanganan draft lintas reload bila terbukti dibutuhkan. Bukan bagian desain wajib atau janji implementasi saat ini.

Checklist hasil:

- [x] Seluruh fitur aktual dari lima halaman dipetakan, termasuk tanggal/tempat, orang hadir, format audio dan batas akses.
- [x] Brand, token, microcopy dan komponen memiliki satu arah final.
- [x] Desktop1440, mobile390 dan batas320 serta ukuran antara dijelaskan dan divisualisasikan.
- [x] State, keyboard, dialog, focus return, status screen reader dan target WCAG dijelaskan.
- [x] Risiko tindakan, kegagalan parsial, sesi dan konteks tenant dipertahankan.
- [x] Invitation dan kode produksi tidak berubah; data contoh fiktif dan mockup terpisah.

Checklist ini menyatakan kelengkapan **spesifikasi**. Bukti pemeriksaan mockup dicatat terpisah; tidak menyatakan produk lolos uji pengguna atau audit aksesibilitas penuh.
