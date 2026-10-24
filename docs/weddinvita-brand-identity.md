# weddinvita — identitas brand CMS

Keputusan desain, 24 Oktober 2026. Cakupan: login dan CMS saja, mode kerja **Operate**. Ini acuan implementasi berikutnya, bukan laporan perubahan aplikasi. Alternatif ini dirancang langsung dengan Impeccable dan HTML/CSS lokal, tanpa menggunakan hasil generasi Stitch. Dibaca bersama [spesifikasi CMS](weddinvita-cms-design-spec.md), [token final](weddinvita-cms-design-tokens.md), dan [studi visual terpisah](../design/cms-alternate/README.md).

## Dasar keputusan

Audiens utama adalah pasangan yang menyiapkan pernikahan dan pengelola acara yang sudah memiliki akun. Mereka perlu memeriksa tamu, membagikan tautan pribadi, membaca konfirmasi, dan memperbarui informasi tanpa mengingat detail teknis. Kebutuhan praktis: daftar yang dapat dibandingkan, perubahan yang jelas statusnya, dan akses tindakan penting dari ponsel. Kebutuhan emosional: merasa siap, tahu apa yang telah tersimpan, dan yakin tidak mencabut akses tamu tanpa sengaja. Ini hipotesis kebutuhan dari tugas dan produk, belum hasil wawancara.

**Positioning:** weddinvita adalah ruang pengelolaan undangan pernikahan digital yang membantu pasangan dan pengelola acara menyiapkan informasi, membagikan tautan, dan memantau konfirmasi dengan tenang.

**Janji yang dapat dibuktikan:** kelola tamu, pesan WhatsApp, media, detail acara, serta konfirmasi dalam satu CMS. Pembuktiannya adalah empat halaman dan fitur aktual yang dipetakan di spesifikasi. Jangan menjanjikan pengiriman otomatis, peningkatan jumlah hadir, tanpa batas, atau keamanan mutlak. Tombol WhatsApp membuka pesan terisi; pengguna mengirimnya sendiri.

Nama selalu **weddinvita**, termasuk awal kalimat dan judul. “Portal Undangan” boleh menjadi deskriptor, bukan nama tambahan. **Rimba Jawa** hanya nama tema invitation. Brand CMS tidak mengatur tema invitation.

## Evaluasi identitas saat ini

Sumber: `frontend/admin.css`, `frontend/admin.html`, komponen Brand/Login/Navigation di `frontend/src/main.tsx`, dan kelima snapshot HTML pada manifest `design/cms/manifest.json`.

Yang sudah bekerja: hijau gelap memberi jangkar tindakan; Inter mendukung tabel; sidebar konsisten; label status dan konfirmasi terpisah; login memiliki suasana lebih hangat. Struktur empat halaman cocok dengan tugas nyata dan tidak memerlukan overview.

Yang perlu disatukan: sidebar navy gelap dan latar kebiruan berbeda dari login hijau/krem; wordmark login memakai titik dan gaya editorial, sedangkan sidebar memakai simbol hati dan caption; beberapa keluarga font di-load sekaligus. Referensi snapshot memuat teks 11–13 px, kontrol kecil, dan rail sempit yang kurang mendukung label panjang. Kesimpulan ini adalah tinjauan sumber, bukan hasil pengujian keterbacaan pengguna.

## Dua arah yang dipertimbangkan

| Arah | Bahasa visual | Kelebihan untuk CMS | Trade-off |
| --- | --- | --- | --- |
| **Buku Persiapan — dipilih** | Sidebar biru pucat, latar putih hangat, tinta biru dan teks gelap; Inter; ringkasan bersatuan dan baris tabel beraturan | Terpisah jelas dari tema invitation; login dan dashboard satu keluarga; data mudah dibandingkan; warna tidak bersaing dengan media | Perlu disiplin label agar biru tidak terasa seperti layanan keuangan; kehangatan dibawa copy dan ruang, bukan ornamen |
| **Ruang Persiapan** | Ivory, hijau botani, sidebar terang, sans operasional | Akrab dengan identitas CMS saat ini; kontinuitas hijau memudahkan transisi | Masih dekat dengan arah lama dan tema alam invitation; lebih sulit terasa sebagai alternatif yang mandiri |

Rekomendasi final: **Buku Persiapan**. Ini menggantikan draft Ruang Persiapan yang ditulis sebelum pengguna meminta alternatif tanpa Stitch. Gunakan sistem visual baru biru dengan navigasi standar, bukan meniru buku secara harfiah: tidak ada kertas bergaris, tab buku palsu, animasi membalik halaman, atau ornamen cetak. Signature-nya adalah ringkasan yang secara eksplisit memisahkan undangan dari orang hadir, diikuti tabel yang mudah dibandingkan. Hilangkan rail navy sempit, simbol hati dan wordmark bertitik dari CMS. Tidak ada tekstur, hutan, amplop, atau grafik dekoratif.

## Kepribadian yang diterapkan

| Atribut | Penerapan UI | Hindari |
| --- | --- | --- |
| Hangat | Putih hangat dan biru pucat; sapaan singkat; nama tamu dipakai pada konfirmasi | Rayuan romantis di pesan error, emoji perayaan berulang |
| Jelas | “Buka WhatsApp”, “Undangan konfirmasi hadir”, “Orang akan hadir” | “Kirim” yang mengesankan pengiriman otomatis; angka “Hadir” tanpa satuan |
| Tenang | Satu primary per konteks; status simpan persisten; motion singkat | Toast hilang sebelum dibaca; animasi angka; warna merah untuk status belum konfirmasi |
| Teliti | Batas karakter, satuan MiB, dampak tindakan dan konteks akun terlihat | Menghapus jawaban tanpa penjelasan; menyembunyikan data panjang hanya di tooltip |
| Membantu | Error menjelaskan langkah berikut; retry memakai pilihan berkas yang sama | Menyalahkan pengguna; kode teknis mentah; memaksa pilih ulang setelah gagal |

## Tone of voice dan kamus

Bahasa Indonesia, sapaan “Anda” secukupnya. Kalimat aktif, satu instruksi per kalimat. “Tamu” adalah entri penerima; “undangan” adalah satu tautan/entri; “orang” adalah jumlah kehadiran. Gunakan “browser” untuk slot akses; kata “perangkat” hanya sebagai penjelasan konteks karena satu perangkat fisik bisa memakai beberapa browser. Status aktif berbeda dari konfirmasi hadir. Konsisten memakai “tautan”, “pratinjau”, “kata sandi”, “unggah”, “simpan”. Label navigasi final “Pesan & Preview” mengikuti nama halaman pada brief; judul panel memakai “Pratinjau”.

| Situasi | Copy final |
| --- | --- |
| Login | “Selamat datang” / “Masuk untuk mengelola undangan pernikahan Anda.” / “Masuk ke akun” |
| Login diproses | “Memeriksa…”; jangan mengumumkan ulang tiap frame |
| Login gagal | “Email atau kata sandi belum sesuai. Periksa kembali lalu coba lagi.” Gunakan pesan pembatasan/server bila berbeda; jangan mengungkap keberadaan akun |
| Empty tamu | “Belum ada tamu. Tambahkan tamu untuk membuat tautan undangan pribadi.” / “Tambah tamu” |
| No results | “Tidak ada tamu yang cocok. Ubah pencarian atau reset filter.” / “Reset filter” |
| Sukses simpan | “Detail acara disimpan.” / “Pesan dan pratinjau disimpan.” |
| Gagal unggah | “Berkas belum berhasil diunggah. Periksa jaringan lalu coba lagi. Pilihan berkas tetap tersedia.” Hanya gunakan sebab jaringan bila memang diketahui; selain itu tampilkan alasan validasi/server |
| Ganti tautan | “Ganti tautan Nara Putri? Tautan lama tidak berlaku lagi. Semua sesi dan browser tercatat direset. Kirim tautan pengganti kepada tamu.” / “Batal” / “Ganti tautan” |
| Hapus tamu | “Hapus Nara Putri? Tautan, akses, konfirmasi, dan ucapannya akan dihapus. Data tidak dapat dipulihkan.” / “Batal” / “Hapus tamu” |
| Sesi habis | “Sesi Anda berakhir. Masuk kembali untuk melanjutkan.” Jangan menjanjikan pemulihan draft |

Nama pada contoh sepenuhnya fiktif. Jangan menyalin nama, rekening, kontak, atau tautan pribadi dari data produksi ke desain.

## Wordmark, tipografi, ikon

Wordmark berupa teks **weddinvita** dalam Inter 600, tracking −0,02em, tanpa titik, ligatur kustom, simbol hati, monogram W, atau huruf kapital. Wordmark dibaca sebagai nama produk, bukan gambar tanpa label. Warna utama `cms-color-primary`; pada bidang gelap yang dibutuhkan gunakan putih. Area aman minimal 12 px di semua sisi; jangan meregangkan atau memiringkan. Lebar mengikuti teks, tidak dipaksa melebar.

- Sidebar: 24/32 px pada sidebar 208 px, inset horizontal 28 px untuk wordmark; deskriptor 12/18 px “Ruang untuk hari istimewa.” di bawah, jarak 8 px. Wordmark menuju halaman Tamu Undangan tanpa mengganti tenant.
- Login: 24/32 px pada area brand. Judul pengantar Inter 500, 48/56 px desktop dan 32/40 px mobile, maksimum tiga baris; seluruh field dan copy tetap Inter.
- Header mobile: 20/32 px, tanpa caption agar Menu mendapat target 44 × 44 px. Pada 320 px, wordmark tetap utuh, bukan monogram.

Font UI final `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Satu keluarga juga dipakai pada login; tidak ada serif atau monospace tambahan. Angka tabel memakai Inter dengan `tabular-nums`; tidak perlu font monospace tambahan. Font loading tidak boleh menunda akses form. Studi memakai font Inter lokal beserta lisensi; keputusan pemuatan font pada aplikasi produksi tetap menjadi pekerjaan implementasi.

Ikon menggunakan SVG outline 24 × 24 dengan stroke 1,75 px, currentColor, sudut konsisten. Gunakan kembali NavIcon/ActionIcon yang ada; tambahkan hanya ikon tindakan yang dibutuhkan. Ukuran tampilan 20 px pada navigasi, 18 px pada aksi. Ikon dekoratif `aria-hidden`; aksi ikon wajib nama aksesibel yang menyebut tamu. Salin tautan dan Buka WhatsApp tetap berlabel teks. Ikon danger tidak menjadi satu-satunya petunjuk risiko.

## Aturan visual final

Seluruh nilai final ada di [token](weddinvita-cms-design-tokens.md), termasuk background, surface, teks, border, primary/hover/focus dan success/warning/danger. Biru aksi bukan bukti status berhasil: sukses tetap diberi teks/ikon. Warning bukan “belum konfirmasi”; warning dipakai untuk batas browser tercapai atau perubahan belum tersimpan. Tidak hadir memakai label netral, bukan merah kesalahan.

Ukuran UI: body 16/24, tabel/label 14/20, helper 12/18, h1 28/36 desktop dan 24/32 mobile, weight 600. Spacing berbasis 4 px; kelompok rapat 8–12, antar-field 16, panel 24, antarbagian 32. Radius kontrol 8, panel 12, dialog 16 px. Panel memakai border; shadow hanya dialog/drawer. Tombol utama dan field tinggi minimal 44/48 px. Pill status tidak interaktif; switch hadiah punya area 72 × 44, memperbaiki ukuran visual lama 72 × 34.

Motion hanya untuk orientasi: perubahan warna 120 ms, drawer masuk 180 ms, ease-out. Tidak ada animasi angka, parallax, scroll snap, atau entrance yang menyembunyikan isi. Reduced motion: transisi 0 ms dan scroll instan, semua konten langsung terlihat. Loading tetap memiliki teks. Detail motion CMS tidak mengubah motion invitation.

## Keputusan, asumsi, batas

Keputusan final: nama, arah Buku Persiapan, sistem token, empat tujuan navigasi, dan pemisahan visual CMS dari invitation. Asumsi: aktivitas utama adalah pengelolaan tamu; pengguna sering bekerja di kondisi terang dan ponsel. Perlu divalidasi melalui penggunaan nyata, bukan penghalang spesifikasi. Tidak ada pertanyaan terbuka yang menghalangi keputusan ini.

Checklist hasil desain:

- [x] Fondasi dan dua arah dievaluasi; satu rekomendasi dikembangkan.
- [x] Brand dan copy konsisten pada lima halaman.
- [x] Desktop/mobile, state dan aksesibilitas dirujuk ke spesifikasi.
- [x] Fitur aktual dipetakan; tidak ada klaim pemasaran baru.
- [x] Invitation dan kode produksi tidak diubah.

Belum diuji kepada pengguna atau dinyatakan lolos WCAG. Perhitungan kontras token pada dokumen token adalah bukti pasangan warna saja, bukan audit aksesibilitas menyeluruh.
