Buat SATU studi desain baru khusus komponen hadiah digital pada proyek undangan Rimba Jawa ini, tanpa mengubah layar lama. Judul: "Kirim Hadiah — dua rekening dalam satu kartu ringkas".

Konteks referensi: pengguna mengirim screenshot implementasi saat ini ukuran 1326×882. MCP ini tidak mendukung lampiran gambar, maka berikut deskripsi visual yang saya amati langsung, BUKAN gambar terlampir: latar hutan gelap hijau; tombol burgundy "▼ Kirim Hadiah" di tengah atas; di bawahnya SATU kartu ivory lebar dengan rounded corners, border luar dan border inset tipis coklat. Dua rekening tersusun vertikal dipisahkan garis horizontal. Tiap baris punya logo bank di kiri, lalu nomor besar tebal, nama pemilik, dan tombol solid burgundy "Salin nomor" yang terlalu dominan di bawah nama. Logo blu tampak besar secara optik dibanding logo Mandiri. Layout menyisakan ruang kanan berlebih; baris terlalu tinggi dan terasa kurang rapi; bingkai inset terlalu dekat area tombol. Tolong perbaiki desain berdasarkan masalah nyata ini.

KEHARUSAN PENGGUNA:
- Pemicu HARUS berlabel persis "Kirim Hadiah".
- Default tertutup: seluruh detail bank, nomor dan nama tersembunyi sampai tombol ditekan. Sediakan representasi visual state tertutup dan terbuka, namun tampilan produk hanya SATU komponen dengan SATU kartu yang memuat DUA rekening. Jangan jadikan dua rekening sebagai dua card besar.
- Gunakan dua rekening asli ini, jangan mengubah satu digit pun, jangan menghilangkan nol depan:
  1) blu by BCA Digital: 0033 1600 0000 — a.n. Firsta Adi Pradana
  2) Mandiri: 1350018340537 — a.n. TALITHA SYAHDA ARUND
- Satu tombol salin untuk masing-masing rekening. Tetap sediakan label aksesibel, touch target minimum 44px, feedback "Nomor rekening disalin.", fallback salin manual. Nomor harus terbaca lengkap, selectable dan tidak terpotong pada viewport 320px.
- Desain tetap kecil, elegan dan sesuai undangan. Target kartu 360–420px di desktop, fluid pada mobile 320/390px dengan gutter wajar. Hindari ruang kosong dan padding besar.
- Pertahankan warna asli kedua logo bank; jangan mewarnai ulang atau mengganti dengan logo rekaan. Jika aset logo tidak tersedia, pakai nama bank sebagai teks sederhana, jangan buat logo palsu.

ARAH PERBAIKAN:
1. Rapikan alignment dengan dua baris kompak di dalam satu permukaan ivory, divider tipis saja.
2. Samakan bobot optik logo; logo tidak menjadi fokus utama. Atur label bank, nomor sebagai informasi utama (sekitar 17–20px), nama pemilik sebagai sekunder (sekitar 12–14px). Pilih ukuran yang tetap terbaca.
3. Jadikan "Salin nomor" aksi sekunder yang ringan (outline/ghost, ikon copy plus teks). Tempatkan agar tidak menghasilkan tinggi baris berlebihan atau memotong nomor pada mobile.
4. Tombol "Kirim Hadiah" proporsional dengan kartu; gunakan ikon hadiah/chevron rapi, bukan marker segitiga browser yang besar. Tetap jelas bahwa dapat membuka dan menutup.
5. Gunakan satu border halus; jika bingkai inset dipertahankan pastikan tidak bersinggungan dengan isi. Shadow lembut.
6. Palet #183D32/#0B211B untuk latar hutan, #FAF7F2 untuk paper, #6E2435 untuk CTA, #30271F untuk teks, #765640 untuk detail. Plus Jakarta Sans untuk informasi rekening; nuansa Jawa/Solo yang tenang, tanpa ornament berlebih.
7. Jangan tambah QR code, nominal, pembayaran online, pilihan bank berbentuk tab, alamat kado, rekening ketiga, navbar atau section lain.

Keluaran: rancangan komponen ringkas yang bisa direview, dengan alasan desain singkat dan spesifikasi ukuran/spacing yang praktis untuk HTML/CSS responsive. Ini permintaan desain saja; tidak mengimplementasikan situs produksi.
