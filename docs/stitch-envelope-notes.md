# Catatan Stitch — revisi amplop

Narasi otomatis ini menjelaskan desain generator; bukti fungsi frontend ada pada pratinjau lokal dan hasil pengujian. Backend/CMS fungsional belum diterapkan.

Pembaruan menyeluruh undangan digital **One-Page Seamless** bernuansa **Amplop Burgundy & Rimba Jawa Solo** telah selesai diimplementasikan berdasarkan referensi fisik undangan dan arahan resmi terbaru:

### Rangkuman Pembaruan Desain:
1. **Cover Amplop 3D Burgundy (Sesuai Undangan Fisik)**:
   - **Tekstur Kertas & Seam Belah Tengah**: Didesain sebagai amplop lipat dua pintu (*two-flap fold*) berwarna merah anggur tua (*deep burgundy*) dengan bayangan kedalaman 3D, highlight realistis di sepanjang garis pertemuan flap, serta aksen ilustrasi pohon *tone-on-tone* dan susunan bunga burgundy-putih di bagian bawah.
   - **Tipografi Menyatu di Permukaan Amplop**: Menghilangkan kartu putih yang menumpuk. Nama pasangan dicetak cukup sekali dengan tipografi serif elegan beraksen keemasan: **"Firsta & Talitha"**, tanggal **"22 November 2026"**, serta sapaan personal *"Kepada Yth. Tamu Undangan"* yang tercetak langsung pada permukaan kertas amplop.
   - **Segel Lingkaran Gunungan Jawa ("Tekan di sini")**: Menghilangkan tombol persegi panjang "Buka Undangan". Sebagai gantinya, interaksi berpusat pada segel lingkaran timbul emas berukir Gunungan Jawa bertuliskan **"Tekan di sini"** (`aria-label="Buka Undangan"`). Saat ditekan, flap amplop membuka ke samping dengan efek perspektif CSS transform, lalu scroll mengalir halus membawa tamu masuk ke gerbang joglo.

2. **Kutipan QS. Ar-Rum (30:21)**:
   - Ditempatkan tepat setelah pembukaan amplop, menampilkan teks Arab lengkap yang rapi dan proporsional (`dir="rtl"`, `lang="ar"`).
   - Dilengkapi ringkasan makna ayat yang jujur dan teduh: *"Allah menciptakan pasangan untuk memberi ketenteraman serta menumbuhkan cinta dan kasih sayang. Hal itu menjadi tanda kebesaran-Nya bagi orang yang merenung."*

3. **Data Profil Lengkap Orang Tua & Placeholder Bebas Wajah**:
   - **Firsta Adi Pradana** — Putra Bapak Nugroho Andang Hapsoro & Ibu Arieta Rahmasari.
   - **Talitha Syahda Arundatie** — Putri Bapak Sudaryatno & Ibu Wuri Wahyuningsih.
   - Masing-masing dilengkapi bingkai lengkung (*arch frame*) kosong berlabel *"Foto akan ditambahkan"* tanpa foto maupun ilustrasi manusia. Nama lengkap dicantumkan satu kali tanpa redundansi.

4. **Kontrol Audio Minimalis**:
   - Bilah *pill* panjang telah digantikan oleh satu tombol lingkaran 44×44px di sudut kanan bawah berstatus nonaktif (*disabled*) dengan label aksesibel *"Lagu belum ditambahkan"*.

5. **Rangkaian Acara, Lokasi & Galeri**:
   - Acara **Prosesi Pernikahan** dan **Resepsi** pada **Minggu, 22 November 2026** dengan waktu placeholder *"Waktu akan diinformasikan"*.
   - Lokasi presisi: **Arjuna Ballroom Alam Indah Resto** (tanpa penyebutan kota Solo sebagai nama alamat).
   - Placeholder peta jujur bertuliskan *"Peta lokasi akan ditampilkan"* yang terhubung langsung ke Google Maps resmi.
   - Galeri foto 3D bertingkat berstatus placeholder diapit oleh ornamen dedaunan pakis dan rimba nyata di tiap seksi.

6. **Tanpa Navigasi & Bersih dari Elemen yang Dilarang**:
   - Tidak ada navbar, bottom nav, anchor menu, RSVP, hadiah/amplop digital, maupun countdown timer. Halaman mengalir secara murni dalam satu *native vertical scroll*.

Saran otomatis Stitch:

- Lihat pratinjau interaksi buka amplop pada resolusi mobile 390px
- Sesuaikan intensitas warna emas pada segel Gunungan Jawa
- Integrasikan aset foto asli mempelai jika sudah tersedia
