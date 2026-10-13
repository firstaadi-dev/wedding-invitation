# Arah terbaru — One page memasuki joglo

Revisi pengguna menggantikan arahan navigasi pada desain undangan awal. Dashboard CMS merupakan area admin terpisah; desain pengalaman tamu mengikuti ketentuan di bawah.

ARAH TERBARU PENGGUNA — WAJIB MENGGANTIKAN ARAH LAMA UNTUK UNDANGAN TAMU:
- Tidak ada menu navigasi, navbar, tab, anchor menu, bottom navigation, hamburger atau sticky header pada undangan tamu. Satu dokumen one page seamless dari cover, transisi joglo, profil, acara, lokasi, galeri hingga penutup. Kontrol musik kecil boleh, bukan menu navigasi.
- Cover menjadi gerbang masuk joglo Jawa Solo. Atap joglo dan dua tiang kayu jati coklat membingkai Firsta & Talitha, burgundy sebagai tombol Buka Undangan. Setelah interaksi, scroll maju membawa kamera semu melewati pintu joglo: bingkai pintu membesar dan bergeser ke luar viewport, dedaunan foreground bergerak lebih cepat, latar hutan bergerak lebih lambat, lalu isi undangan terungkap di dalam ruang joglo. Jangan berpindah route atau menampilkan halaman yang terputus.
- Hindari tampilan polos: setiap section memiliki set pohon/daun depan tersendiri, dengan batang/pakis/tajuk sebagai layer cutout di tepi layar, layer tengah ornamen joglo/kertas, dan layer belakang hutan berkabut. Parallax multi-layer menampilkan depth, bayangan halus, perspektif dan cahaya, seolah komponen 3D tanpa harus WebGL. Teks tetap berada pada bidang bersih dan berkontras, bukan tertutup pohon.
- Variasi setiap bagian: cover gerbang joglo, profil kanopi hijau dengan daun foreground, acara interior joglo kayu dengan bingkai batik, lokasi teras terbuka menuju hutan, galeri lembar foto mengambang dengan depth/bayangan, penutup siluet joglo dan pohon. Kontinuitas latar antarseksi, bukan tumpukan kartu putih polos.
- Tree layers bergerak dengan scroll progress melalui transform translate/scale/rotate ringan dan perspective; jangan menggoyang semua teks. Native vertical scroll, tidak ada scroll hijacking. Batasi transform pada dekorasi, pointer-events:none, aria-hidden, overflow-x:clip, isi dan kontrol tidak terhalang. Atur safe area. Pada mobile kurangi jumlah layer dan jarak gerak; prefers-reduced-motion mematikan parallax/zoom dan tetap menampilkan semua isi. Bila JavaScript gagal isi tetap dapat dibaca.
- Foto tetap placeholder TANPA WAJAH/MANUSIA. Kotak peta placeholder berlabel “Peta lokasi akan ditampilkan”, bukan peta rekaan. Lagu belum ada dan disabled. Tidak mengarang jam/orang tua/kota venue.

## Pembuktian saat implementasi

- Cover dan isi berada dalam satu halaman/route, tanpa menu navigasi.
- Membuka undangan menggerakkan transisi pintu joglo sebelum bagian profil.
- Tiap section punya tree foreground layer tersendiri dan kontinuitas hutan.
- Tree layers terlihat bergerak pada scroll; layer depan berbeda kecepatan dengan latar.
- 320/390px tanpa overflow horizontal atau dekorasi menutup teks/tombol.
- Reduced motion dan JS gagal tetap memberi akses ke seluruh isi.
- Foto/lagu placeholder, data pasangan/tanggal/venue utuh.

Storyboard dan screenshot Stitch menunjukkan arah visual, bukan bukti animasi runtime. Semua butir di atas perlu pengujian browser setelah aplikasi dibuat.
