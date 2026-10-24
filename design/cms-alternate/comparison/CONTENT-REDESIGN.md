# Redesign Pesan & Preview dan Foto & Lagu

24 Oktober2026. Diterapkan pada **Studio** dan **Studio V2** sebagai preview lokal. Keduanya berbagi `content-editors.js`/`content-editors.css`; geometri dan perilaku identik, aksen mengikuti sitrus Studio dan hijau#183D32 V2. Detail Acara yang disukai pengguna tetap memakai editor yang sama. Aplikasi produksi, invitation dan backend tidak berubah.

## Navigasi bagian yang seragam

Detail Acara, Pesan & Preview dan Foto & Lagu memakai fungsi `sectionNavigation` dari `section-navigation.js` serta kelas CSS yang sama. Desktop memakai menu192px di kiri; pada≤899 menu diganti select berlabel “Bagian yang diatur”. Bentuk, padding, warna aktif, label dan helper konsisten. Kontrol adalah tombol biasa dengan aria-current=step, bukan tablist. Memilih bagian memfokuskan heading area kerja. Hanya Akses undangan pada Detail Acara diberi pemisah pengaturan lanjutan.

## Pesan & Preview

Dua bagian editor:

- **Pesan WhatsApp**: template, empat token, counter dan validasi. Link wajib; batas4000karakter dan penyisipan selection/kursor tetap.
- **Pratinjau tautan**: judul120, deskripsi300 dan gambar dikelompokkan. Field kosong memakai bawaan. Thumbnail tetap unggah/ganti/hapus terpisah dari simpan teks.

**Preview selalu satu pesan WhatsApp final lengkap**, terlepas dari bagian editor yang dipilih: thumbnail → judul/deskripsi/domain → seluruh teks pesan termasuk tautan. Mengubah bagian editor tidak menyembunyikan thumbnail atau isi pesan pada preview. Ini mengikuti susunan contoh pengguna dengan data fiktif, tanpa menyalin foto, nama, nomor atau tautan pribadi dari screenshot.

Desktop≥1200: menu kiri, editor dan preview lengkap berdampingan; preview sticky. Pada900–1199, menu kiri tetap dan preview berada di bawah editor karena ruang lebih sempit. Mobile≤899: select bagian dan tombol Edit/Pratinjau final. Saat Pratinjau final dipilih, gambar, kartu tautan dan isi pesan tetap satu balon lengkap. Draft tetap mounted saat pindah bagian/route internal; reload mereset studi.

Satu cakupan simpan untuk **template+judul+deskripsi** pada kedua bagian. Bar menjelaskan gambar diunggah terpisah; status tersimpan/belumdisimpan/loading persisten. Setelah perubahan bar sticky, dengan fokus field dijaga agar tidak tertutup. Saat simpan kontrol form/menu terkait disabled. Jika template bermasalah saat editor tautan atau mobile preview aktif, bagian template/Edit dibuka dahulu lalu fokus/reportValidity pada field. Keberhasilan unggah gambar tidak menandai draft teks sudah tersimpan.

Preview gambar memakai media yang sudah diunggah. Thumbnail max12MiB, crop produksi1200×630 dan sifat publik tetap dijelaskan. Tidak menyatakan simulasi sebagai rendering pixel-identik atau cache WhatsApp nyata. Tidak ada pengiriman pesan dari CMS.

## Foto & Lagu

Tiga bagian pada menu yang sama dengan Detail Acara: **Foto pasangan / Galeri undangan / Lagu undangan**. Hanya bagian terpilih ditampilkan. Ini perpindahan area kerja, bukan tombol scroll ke halaman panjang. Node/berkas tetap ada ketika disembunyikan.

**Foto pasangan**: dua kartu ringkas dengan thumbnail120×132px dan label/status. Kelola foto membuka file picker, unggah/ganti, hapus serta feedback dalam kartu yang sama. Tutup editor hanya menyembunyikan kontrol; pilihan file tetap ada. Mobile satu kartu per baris. Tidak mengarang nama/ukuran media terpasang.

**Galeri**: sembilan tombol thumbnail bernomor selalu terlihat sebagai koleksi. Desktop≥900: grid3kolom + satu editor360px di kanan (300px pada900–1199), sticky. Memilih slot mengganti editor, bukan membuat ulang MediaCard atau File. Input, berkas terpilih, error dan retry slot sebelumnya tetap ada. Hit area thumbnail jauh di atas44px. Status tertulis: belum diunggah/berkas dipilih/memproses/terpasang/gagal; gambar baru muncul di koleksi setelah unggah berhasil. Counter hanya menghitung gambar terpasang.

Mobile≤899: memilih thumbnail membuka native dialog berlabel, berisi **MediaCard yang sama**, bukan salinannya. Pada≤599 grid2kolom. Close/Escape mengembalikan fokus ke tombol thumbnail; saat unggah berlangsung penutupan terkunci. Resize mengembalikan card ke host editor tanpa menghapus File. Dialog tetap berada di subtree galeri agar counter lama tetap benar. Tidak ada reorder, dragdrop massal, crop editor, atau kapasitas tanpa batas.

**Lagu**: satu kartu ringkas dengan status, file input dan aksi. Placeholder gambar besar dihilangkan. Setelah unggah, player native muncul, tanpa autoplay; empty note disembunyikan. Tidak membuat artwork/namaartis/durasi rekaan. Kapasitas satu audio dan format asli MP3/M4A/AAC/WAV/OGG/Opus/FLAC/WebM dipertahankan, max25MiB.

Menu memilih bagian dan memfokuskan heading tanpa mengganti hash route. Lagu dipause saat bagian musik disembunyikan atau route media ditinggalkan; file tetap tersedia. Dialog galeri ditutup saat route berubah, dengan fokus kembali ke konteks yang masih terlihat. Bantuan format tidak diulang pada sembilan kartu sekaligus. Pilih berkas tetap terpisah dari Unggah. Gagal unggah mempertahankan file dan media lama; retry memakai tombol sama. Hapus tetap konfirmasi, dan delete/disclosure dinonaktifkan saat handler upload sedang memproses agar file tidak dihapus di tengah proses.

## Cakupan dan perlindungan

Root `../prototype.js` tidak ditulis ulang: MediaCard, updateMessage, fakeSave, validasi/batas, token, placeholder dan callback asli dipakai. DOM dipindahkan dalam entry Studio/V2 saja. Fokus, baseline, Detail Acara, login, guest management, source produksi dan semua perilaku invitation dipertahankan. Data fiktif. Tidak ada koneksi API, storage, tenant nyata, private link atau WhatsApp nyata.

## Bukti pemeriksaan

`verify-content.cjs` memeriksa kedua versi pada1440×1000,390×844,320×844: submenu seragam dan preview final lengkap, tidak ada overflow halaman,9slot tetap, couple/music ringkas, dialog mobile dan focus return. Uji tugas: selection token/counter/draft, validasi template tersembunyi, unggah thumbnail tidak menyimpan teks, simpan/keyboard menu, invalidfile, gagal/retry, pilihan file lintas slot/modal, counter terpasang, konfirmasi hapus, couple disclosure, music native dari fixture audiohening, dan nested delete pada dialog. Hasil: [content-verification.txt](content-verification.txt).

Screenshot state baru ada pada content-screenshots; screenshot default kedua halaman di screenshots diperbarui untuk papan perbandingan. Capture dilakukan dengan reducedmotion agar tidak menangkap warna transisi setengah selesai.320 diperiksa DOM, tanpa PNG terpisah yang diklaim.

Regresi Detail Acara di kedua versi dijalankan dengan `verify-event.cjs` dan `verify-event.cjs studio-v2`. `verify-v2.cjs` memeriksa seluruh route dan kedua papan perbandingan. Pemeriksaan browser ini hanya mockup, bukan pengujian server/decoder/crawlerWhatsApp/screenreader/perangkatfisik atau studi pengguna.

Checklist: [x] kedua halaman benar-benar didesain ulang; [x] diterapkan pada Studio dan V2; [x] preview dan warna tetap konsisten; [x] scope simpan/unggah dan validasi dipertahankan; [x] desktop/mobile/320; [x] file dan fokus tetap aman saat berpindah; [x] Detail Acara serta produksi/invitation utuh.
