# Catatan keluaran Google Stitch

[Proyek Stitch](https://stitch.withgoogle.com/projects/3122156932953261093). Narasi di bawah adalah keluaran otomatis Stitch, bukan hasil pengujian backend. Desain CMS masih mockup. Draft lama masih tersimpan di canvas; arah terbaru adalah one page tanpa navigasi. Ekspor one page ternyata belum mempunyai parallax runtime dan pepohonan yang memadai, sehingga frontend di `public/` mengimplementasikan arahan tersebut dengan aset berlapis tersendiri. Klaim “implementasi”, “real-time”, “aman”, dan “terverifikasi” dalam narasi generator tidak boleh dianggap bukti fungsi yang sudah diterapkan.

## coverEdit

Sampul undangan pernikahan digital bernuansa **Rimba Jawa Solo** telah diperbarui sesuai dengan seluruh permintaan:

### Rangkuman Perubahan:
1. **Penyelarasan Lokasi Venue**:
   - Seluruh penyebutan venue telah diperbarui menjadi **"Arjuna Ballroom Alam Indah Resto"** tanpa tambahan kata kota, menegaskan Solo sebagai identitas adat pernikahan Jawa Solo.
2. **Penyesuaian Musik & Audio Placeholder**:
   - Menghapus kalimat klaim ketersediaan musik di bawah kartu/tombol.
   - Tombol kontrol audio di bar atas dialihkan ke status nonaktif (*disabled*), dilengkapi indikator bahwa lagu/musik belum ditambahkan.
3. **Pembersihan Navigasi Bawah**:
   - Seluruh bilah navigasi bawah (*Sampul, Mempelai, Acara, Reservasi*) telah dihapus dari layar sampul sehingga fokus utama tamu tertuju pada kartu undangan dan tombol buka.
4. **Pengayaan Visual Rimba Jawa & Ornamen Solo**:
   - Menambahkan ornamen dedaunan pakis (*tropical fern*) di sudut dan sisi layar, efek pendaran kanopi sinar hutan (*canopy light rays*), serta siluet motif Batik Kawung khas Surakarta yang anggun dan bertekstur.
5. **Tipografi & Konten Verbatim**:
   - Mempertahankan nama lengkap **Firsta Adi Pradana & Talitha Syahda Arundatie** (tampil rapi tanpa terpotong), tanggal **Minggu, 22 November 2026**, kartu tamu demo **Bapak Budi & Ibu Sari**, serta tombol utama burgundy **"Buka Undangan"**.
   - Ukuran font teks isi dijaga minimal 16px dengan tata letak ramah layar ponsel (390px *safe area*).

Saran otomatis Stitch (opsional; tidak menambah scope):

- Lanjutkan ke perancangan layar Mempelai (Profil Pengantin Jawa Solo)
- Rancang layar Detail Acara (Akad & Resepsi di Arjuna Ballroom Alam Indah Resto)
- Sesuaikan intensitas efek dedaunan pakis dan kanopi cahaya

## guests

Layar **CMS Admin - Kelola Tamu Undangan (Desktop 1440px)** telah berhasil dibuat sesuai spesifikasi sistem dan konsep **Rimba Jawa — Solo**:

### Sorotan Desain & Arsitektur Fitur:
1. **Sidebar Navigasi Khusus (Hijau Hutan #183D32)**:
   - Monogram & identitas adat **Rimba Jawa Solo — Firsta & Talitha**.
   - Menu lengkap: *Ringkasan*, **Tamu Undangan (Aktif)**, *Foto*, *Lagu*, dan *Pengaturan Acara*, serta tombol *Keluar* dan *Pusat Bantuan* di bagian bawah.
2. **Top Header & Status Lingkungan**:
   - Breadcrumb rapi disertai badge **Data demo** dan aksi cepat **"Pratinjau Undangan"** untuk memeriksa tampilan mobile tamu.
3. **Ringkasan Metrik & Toolbar Keamanan**:
   - 3 kartu ringkasan berbasis data riil/demo (*Total Tamu Terdaftar*, *Sudah Membuka Undangan*, *Tautan Aktif & Terverifikasi*) tanpa grafik palsu.
   - Banner edukasi kuota keamanan: penegasan aturan **maksimal 3 perangkat per tautan** dan sesi terverifikasi.
   - Filter status tautan, pencarian nama tamu, dan tombol burgundy **"+ Tambah Tamu"**.
4. **Tabel Tamu Undangan (Data Masking & Kuota 0/3 – 3/3)**:
   - Menampilkan status tautan (*Aktif / Dicabut*), indikator kapasitas perangkat (*3/3 Penuh*, *2/3*, *1/3*, *0/3*), waktu buka terakhir, dan tautan undangan yang **disamarkan secara aman** (tidak mencetak token/fingerprint mentah).
   - Baris terpilih untuk **Bapak Budi & Ibu Sari**.
5. **Side Drawer Inspeksi Sesi (Bapak Budi & Ibu Sari)**:
   - Formulir pengeditan nama tamu langsung dengan catatan tampilan kartu fisik.
   - Panel slot perangkat aktif (iPhone, macOS, iPad Air) dilengkapi tanggal akses dan IP kota.
   - Aksi **"Cabut"** pada setiap perangkat untuk membatalkan sesi dan melepas kuota slot jika tamu berganti gawai, serta aksi **"Cabut Tautan Undangan"** untuk penanganan darurat kebocoran tautan.
   - Penegasan identitas Solo sebagai pakem adat serta nama venue *Arjuna Ballroom Alam Indah Resto*.

Saran otomatis Stitch (opsional; tidak menambah scope):

- Buka modal konfirmasi 'Cabut Perangkat' untuk salah satu gawai Bapak Budi & Ibu Sari
- Rancang halaman CMS 'Pengaturan Satu Lagu' dengan player preview play/pause
- Rancang halaman CMS 'Pengaturan Foto' untuk cover arch dan galeri kenangan

## media

Layar CMS Admin Desktop 1440px **"Pengaturan Foto & Lagu"** untuk pernikahan digital adat Jawa Solo (*Firsta & Talitha*) telah berhasil dibuat dengan tata letak editorial dua kolom yang rapi dan terstruktur:

### Rangkuman Fitur & Desain:
1. **Navigasi & Sidebar Konsisten (1440px Desktop)**:
   - Sidebar kiri mempertahankan identitas visual *Rimba Jawa Solo* dengan monogram F&T, menu navigasi (*Ringkasan*, *Tamu Undangan*, *Foto*, *Lagu*, dan *Pengaturan Acara*), serta indikator versi CMS.
   - Top navigation bar menampilkan penanda **Data Demo**, breadcrumb, serta tombol cepat **Pratinjau Undangan**.

2. **Kolom Kiri — Pengaturan Foto Sampul & Galeri**:
   - **Foto Sampul (Hero Cover)**: Menggunakan placeholder beraksen lengkungan *arch* joglo berlatar hijau/putih hangat dengan ikon dedaunan pakis dan label tegas *"Belum ada foto • Siluet dedaunan Rimba Adat Solo"*. Tombol unggah burgundy dan status siap menerima berkas.
   - **Galeri Foto**: Dilengkapi daftar slot foto berlabel deskripsi, tombol kontrol urutan (*Naik*, *Turun*, *Hapus* dengan konfirmasi), dropzone multi-unggah gambar, serta simulasi penanganan kesalahan (*"Unggahan gagal. Coba lagi"*).
   - Seluruh placeholder foto murni berupa siluet dedaunan/alam tanpa menampilkan wajah atau sosok manusia.

3. **Kolom Kanan — Pengaturan Lagu Latar & Pratinjau Mobile**:
   - **Lagu Pengiring Suasana**: Dropzone unggah berkas audio tunggal (contoh format MP3/M4A), input keterangan judul lagu, serta audio player pratinjau dengan kontrol *play disabled* dan pesan edukatif *"Tambahkan lagu untuk mendengarkan pratinjau"*.
   - **Interaksi Browser Ramah Tamu**: Opsi *toggle/checkbox* *"Aktifkan musik setelah tamu membuka undangan"* yang menjelaskan kebijakan browser modern di mana audio baru diputar setelah interaksi tombol buka.
   - **Pratinjau Mobile Terintegrasi (390px)**: Menampilkan simulasi tampilan layar tamu secara real-time—termasuk monogram F&T, nama mempelai, venue *"Arjuna Ballroom Alam Indah Resto"*, nama tamu demo *"Bapak Budi & Ibu Sari"*, serta tombol *"Buka Undangan"*.

4. **Sticky Footer Konfirmasi Perubahan**:
   - Bar konfirmasi di sisi bawah layar dengan indikator peringatan *"Ada perubahan yang belum disimpan"*, tombol sekunder *"Batalkan"*, dan tombol utama Burgundy *"Simpan Perubahan"*.

Saran otomatis Stitch (opsional; tidak menambah scope):

- Lanjut ke layar CMS 'Pengaturan Acara' (Waktu, Lokasi, Google Maps, Teks Sambutan)
- Buat tampilan modal konfirmasi hapus foto galeri dan notifikasi sukses simpan perubahan
- Rancang layar tamu saat batas kuota perangkat tercapai (3/3) dan status memverifikasi token

## access

Layar status akses undangan seluler bertema **Rimba Jawa — Solo** untuk pasangan **Firsta & Talitha** telah selesai dirancang dengan memenuhi seluruh persyaratan keamanan, etika privasi, dan estetika budaya:

### Fitur & Detail Desain:
1. **State Utama: Batas Perangkat Tercapai (State B)**
   - **Tampilan & Visual**: Latar putih hangat bertekstur dengan ornamen halus motif batik Kawung khas Solo, siluet dedaunan rimba pakis di sudut, serta kartu berbingkai anggun.
   - **Elemen Identitas**: Header minimalis bertuliskan monogram dan brand *Firsta & Talitha*, dengan tipografi editorial serif.
   - **Ikonografi & Status**: Ikon perangkat seluler netral dengan chip status *“3 dari 3 perangkat terdaftar”*.
   - **Salinan Santun (Verbatim)**:
     > *“Undangan ini sudah dibuka melalui 3 perangkat. Silakan gunakan salah satu perangkat yang pernah digunakan, atau hubungi pengundang untuk bantuan.”*
   - **Aksi & Navigasi**: Tombol utama warna Burgundy (#6E2435) dengan target sentuh responsif *“Coba Lagi”*, diikuti tautan *“Kembali”*.
   - **Bantuan Jujur**: Menampilkan catatan informatif *“Kontak pengundang belum ditambahkan”* tanpa mengarang nomor fiktif atau memasang tautan palsu.
   - **Kepatuhan Privasi & Keamanan Ketat**: Bebas dari data privat, tanpa bocoran nama tamu, tanpa daftar perangkat, IP, fingerprint, token, atau saran bypass browser.

2. **Penyertaan 4 State Akses Lengkap (Interaktif)**
   Melalui bilah pengalih di bagian bawah, desainer dan pengembang dapat meninjau ke-4 state akses undangan:
   - **Batas Kuota**: Batas maksimal 3 perangkat telah tercapai.
   - **Memeriksa**: Animasi lembut *“Memeriksa tautan undangan…”* saat token divalidasi.
   - **Tak Sah / Dicabut**: Pesan netral *“Tautan undangan tidak tersedia”* (menangani token salah maupun yang telah dinonaktifkan oleh admin).
   - **Layanan**: State *“Undangan belum dapat dimuat. Silakan coba lagi.”* untuk kegagalan koneksi atau server.

Saran otomatis Stitch (opsional; tidak menambah scope):

- Tinjau interaksi transisi antar state pada perangkat mobile
- Lanjutkan integrasi alur pencabutan sesi di CMS Admin tamu

## immersive

Revisi besar undangan pernikahan digital **Rimba Jawa Solo** telah selesai disusun menjadi **satu halaman panjang seamless (single vertical page)** seutuhnya, menyatukan pengalaman dari gerbang Joglo awal hingga penutup tanpa menu navigasi apa pun.

### Sorotan Desain & Implementasi:
1. **Konsep Satu Dokumen Seamless (Tanpa Navigasi)**:
   - Seluruh bar navigasi (TopAppBar, BottomNavBar, tab, anchor link, hamburger) telah dihilangkan secara total.
   - Disematkan kontrol audio mengambang (*floating pill*) ringkas berstatus nonaktif (*disabled*) dengan label **"Lagu belum ditambahkan"**.
2. **Cover Gerbang Joglo Jawa & Rimba Hutan Tropis**:
   - Membingkai halaman pembuka dengan arsitektur atap Joglo Solo dan sepasang tiang kayu jati coklat berperspektif.
   - Layer *cutout* dedaunan pakis dan tajuk pohon di sisi kiri dan kanan dengan efek kedalaman bayangan (*depth shadow*), kabut lembut, serta aksen ornamen Kawung Solo yang elegan.
   - Menampilkan nama **Firsta & Talitha** (*Firsta Adi Pradana & Talitha Syahda Arundatie*), tanggal **Minggu, 22 November 2026**, kartu tamu demo hangat untuk **Bapak Budi & Ibu Sari**, serta tombol CTA burgundy **"Buka Undangan ↓"** yang mengalirkan pembaca masuk ke dalam interior pendopo secara mulus.
3. **Transisi Kontinuitas & Kedalaman Antar-Seksi**:
   - Transisi dari gerbang luar ke ruang dalam Joglo tersambung secara organik melalui kabut dan tekstur kayu tanpa garis patahan kaku atau tumpukan kartu putih polos.
   - Seluruh ornamen pohon dan dekorasi diberi atribut `pointer-events: none` dan `aria-hidden="true"`, memastikan scroll native tetap ringan, teks tetap terbaca bersih, dan ramah aksesibilitas (*prefers-reduced-motion*).
4. **Profil Pasangan Bebas Foto Orang**:
   - Dua bingkai lengkung (*arch frame*) kosong bernuansa kayu jati dan daun netral bertuliskan *"Foto akan ditambahkan"*, tanpa foto atau ilustrasi wajah manusia sesuai arahan.
   - Tanpa mencantumkan nama orang tua rekaan, dilengkapi doa berbahasa Jawa krama yang sarat makna.
5. **Rangkaian Acara**:
   - Berupa lembaran tradisi melayang di atas latar Joglo dengan bayangan lembut, memuat **Prosesi Pernikahan** dan **Resepsi** berlabel waktu placeholder *"Waktu akan diinformasikan"*.
   - Lokasi presisi: **Arjuna Ballroom Alam Indah Resto** (tanpa kota fiktif).
6. **Lokasi & Placeholder Peta Bersih**:
   - Menghilangkan peta rekaan dan menggantinya dengan bingkai kosong berlabel **"Peta lokasi akan ditampilkan"**.
   - Tombol burgundy terhubung langsung ke tautan resmi Google Maps (`https://maps.app.goo.gl/dpHfUEkyYunb17L58`).
7. **Galeri Multi-Layer & Penutup**:
   - Tiga bingkai foto berkedalaman bertingkat (*Foto akan ditambahkan*) diapit pakis rimba.
   - Ditutup dengan siluet Joglo berkabut, salam terima kasih tulus, dan penutup **Firsta & Talitha**.

Saran otomatis Stitch (opsional; tidak menambah scope):

- Pertegas ornamen ukiran jati pada tiang gerbang Joglo cover
- Sesuaikan kontras warna teks kutipan doa Jawa
- Pratinjau tampilan pada layar mobile lainnya
