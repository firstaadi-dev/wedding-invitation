# Preview redesign Detail Acara — Studio dan Studio V2

24 Oktober 2026. [Studio](studio.html#acara) · [Studio V2](studio-v2.html#acara) · [Perbandingan warna](studio-compare.html). Ini preview interaktif lokal, bukan perubahan aplikasi atau invitation.

## Susunan baru yang sudah dapat dicoba

Form panjang diganti editor lima bagian yang tetap berada dalam satu form dan satu cakupan simpan:

1. **Pasangan & keluarga**: nama dua mempelai, empat orang tua, keluarga dikelompokkan jelas.
2. **Acara & waktu**: tanggal, nama/waktu dua acara, dan countdown WIB berada dalam satu konteks.
3. **Lokasi acara**: nama tempat, URL embed Google Maps dan placeholder peta.
4. **Hadiah**: tampil/sembunyikan, rekening/alamat, tambah/hapus informasi dan konfirmasi ganti jenis.
5. **Akses undangan**: batas browser sebagai pengaturan lanjutan, terpisah dari jumlah orang hadir.

Desktop: indeks bagian192 px, editor fleksibel, ringkasan272 px, gap32 px. Pada900–1199 ringkasan berpindah di bawah indeks. Pada≤899 indeks menjadi select berlabel, ringkasan menjadi disclosure tertutup awal; field satu kolom pada≤599. Semua bagian dapat dipilih langsung, tidak dikunci berdasarkan urutan dan tidak diberi tanda selesai palsu.

Ringkasan menampilkan **isian saat ini**, bukan klaim data server telah tersimpan. Nama, tanggal, rangkaian, tempat, countdown, status hadiah dan batas browser diperbarui saat mengedit. Nilai tetap ada saat pindah bagian atau halaman CMS internal; reload mereset data studi. Tidak ada localStorage atau persistensi server.

Tombol Simpan detail acara menyimpan semua bagian sekaligus. Pada awal tampilan mengikuti alur form agar tidak menutup field. Setelah perubahan, bar simpan menetap di bawah viewport dan tetap tersedia setelah simulasi save. Status belum disimpan/Menyimpan/Pengaturan tersimpan tetap terlihat. Fokus field dijaga agar tidak tertutup bar. Navigasi bagian dinonaktifkan saat save; state kontrol dikembalikan setelah selesai.

Validasi memeriksa seluruh field, termasuk yang berada pada bagian tersembunyi. Bila ada rekening wajib, batas browser, atau URL peta tidak valid, bagian terkait dibuka dan fokus menuju field bermasalah. Browser tidak diminta memfokuskan input yang masih hidden. OFF hadiah tetap menonaktifkan validasi item dan mempertahankan isian. Satu tombol simpan tetap memakai handler simulasi lama.

Keyboard: nav berupa tombol biasa dengan aria-current=step, bukan tablist semu. Memilih bagian atau menekan Sebelumnya/Lanjut memindahkan fokus ke heading bagian. Mobile select memiliki label nyata. Ringkasan menggunakan native details/summary. Form dan field tetap semantik; validasi memberi pesan browser yang terkait field. Tidak ada field/API baru.

## Studio V2 — hijau referensi

User meminta Studio V2 untuk dibandingkan dengan Studio, dengan hijau **#183D32** dari gambar referensi. Struktur, Manrope, spacing, konten, fitur dan redesign Detail Acara identik. Studio memakai sitrus #E5F078; Studio V2 menggantinya dengan #183D32 untuk primary, jumlah orang hadir, navigasi bagian aktif, tautan dan fokus. Teks pada bidang hijau berubah menjadi putih. Surface lembut #E7F0EB, hover #102F26, pressed #0B241D, teks bantu pada hijau #D3E7DC.

Login V2 memakai tombol hijau yang sama, dengan komposisi dan field Studio tetap. Tidak mengubah layout login menjadi screenshot lama. Danger, warning dan sukses tetap semantik. Studio asli tidak diganti; Fokus dan baseline sebelumnya tetap tersedia.

Perhitungan pasangan V2: putih pada hijau11,98:1; teks bantu pada hijau9,26:1; teks bantu pada surface lembut5,83:1; teks disabled5,07:1. Bukti ini hanya pasangan solid, bukan audit AA menyeluruh.

## Batas implementasi studi

`event-editor.js` memindahkan node field yang sama dan mempertahankan handler hadiah/simpan; bukan rewrite atau kontrak API baru. `event-editor.css` hanya dimuat Studio/Studio V2. `studio-v2.css` hanya dimuat entry V2. Semua hasil ada di design/cms-alternate/comparison; tidak diimpor build produksi.

Field dan batas produk mengikuti spesifikasi utama. Peta tidak memuat layanan eksternal, pengiriman/penyimpanan/unggah tetap simulasi. Belum diuji pengguna, screen reader nyata, keyboard mobile fisik, atau server. Tidak mengubah seluruh desain invitation, akses tamu, preview invitation, audio, media produksi, atau data asli.

## Bukti pemeriksaan

- [Studio Detail Acara](event-verification.txt) dan [V2 Detail Acara](event-v2-verification.txt): lima bagian×1440/390/320, draft dan perpindahan route, ringkasan, OFF hadiah, invalid lintas bagian, save/loading, fokus dan disclosure.
- [V2 dan papan perbandingan](studio-v2-verification.txt): lima halaman×tiga lebar, primary tepat rgb(24,61,50), semua gambar/tautan pratinjau desktop/mobile, papan lama tetap bekerja.
- `verify-event.cjs [studio-v2]`, `verify-v2.cjs` memakai Playwright dari runtime lokal dan Chrome headless; tanpa dependency aplikasi tambahan.
- Screenshot tiap bagian pada1440/390 tersedia di event-screenshots dan event-v2-screenshots. Pada320 diperiksa DOM tanpa mengklaim PNG terpisah.

Checklist: [x] redesign susunan sudah divisualisasikan, bukan hanya usulan; [x] lima bagian lengkap; [x] nilai dan scope save jelas; [x] validasi lintas bagian; [x] desktop/mobile; [x] Studio dan V2 dapat dibandingkan; [x] hijau sesuai referensi; [x] produksi/invitation tetap utuh.
