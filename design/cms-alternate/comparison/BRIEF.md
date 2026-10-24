# Putaran perbandingan modern

Permintaan: lebih modern, tidak terasa template CMS, tetap fungsional. Mode Operate; product truth diwarisi dari ../PRODUCT.md dan spesifikasi utama. Batas tulis studi comparison serta docs/weddinvita-cms-design-comparison.md. Baseline dan keputusan brand sebelumnya tetap sebagai pembanding; tidak ada penerapan produksi.

Impeccable direction reroll bolder, round1, seed:0903cca35435964f. Ini eksplorasi dua alternatif, bukan perekaman pilihan pengguna atau approval produksi. Katalog memberi bahasa visual, bukan susunan kontrol. Rujukan bernama: ikeda-datamatics (high-contrast field), wayfinding-cartography-signage-terminal-yellow-wayfinding (yellow wayfinding), vertical-video-feed-surface, labanotation. Wayfinding diterjemahkan menjadi Studio; data-field menjadi Fokus. Tidak mengklaim mengikuti literal komposisi katalog atau memakai gambar acuan/comp.

Penilaian dua sumbu: identifikasi audiens dan kejelasan produk. Studio lebih kuat pada identifikasi dengan pasangan dan tetap jelas saat membandingkan tabel; dipilih sebagai rekomendasi awal. Fokus lebih kuat pada pemeriksaan per tamu, dengan trade-off lebar tabel. Video-feed ditolak karena satu item memenuhi viewport menghalangi perbandingan; disiplin yang diambil adalah tindakan dekat item. Labanotation ditolak karena notasi baru tidak dikenal pengguna; disiplin yang diambil adalah sejajarkan label dan nilai. Barcode, strobe, monospace seluruh UI, glyph rail, score symbols, animasi sign band, dan layout artifact tidak diterapkan karena tidak membantu tugas dan mengganggu keterbacaan/reduced motion.

## Studio

THESIS: pengelolaan undangan yang personal tetap dimulai dari daftar yang mudah dibandingkan.
OWN-WORLD: Manrope, warm white #FAFAF7, ink #252B20, citrus #E5F078. Garis tabel, ruang kerja terbuka, tanpa panel chrome besar atau material palsu.
STORY: navigasi atas → temukan tamu → baca konfirmasi → salin/buka WhatsApp; form dan media tetap familiar.
FIRST VIEWPORT: wordmark/nav/header konteks, judul44px, Tambah tamu sitrus, summary bersatuan, search/filters dan tabel full-width. Pada mobile summary dipadatkan dan filter berdampingan; tidak ada sidebar.
FORM: code-led lima halaman studi yang memakai data/perilaku baseline; layout dan tipe baru. seed:0903cca35435964f.
RISK: ucapan masih perlu dialog; aksen sitrus harus dibatasi pada keputusan penting agar tidak menjadi dekorasi.

## Fokus

THESIS: pemeriksaan dan tindakan satu tamu berada dekat daftar, tanpa perpindahan halaman.
OWN-WORLD: Inter lokal, ink #171717, white #FFF, ground #F5F5F3, netral #EEEEEB, tipografi operasional rapat. Warning/status tetap berlabel, danger merah sebagai pengecualian semantik untuk keselamatan.
STORY: cari → pilih nama → periksa ucapan/jumlah/browser → buka WhatsApp/edit/akses di inspector. Checkbox massal terpisah.
FIRST VIEWPORT: topbar monokrom, heading32px, summary inline, tabel kiri + inspector304px kanan di desktop. Pada≤1199 klik nama membuka modal detail; seluruh kolom tabel masih dapat digulir.
FORM: code-led, inspector memakai field Guest yang sudah tersedia, tidak ada field/API baru. seed:0903cca35435964f.
RISK: tabel lebih sempit; indikator detail terpilih tidak boleh disamakan dengan checkbox massal.

## Bar mutu

Dua konsep harus berbeda secara topologi dan pekerjaan, bukan hanya tema warna. Semua lima halaman tersedia. Teks terbaca, primary44px minimum, inputs48px, kontrol native, tabel tetap semantik dan scroll terkandung, fokus terlihat termasuk pada header gelap, reduced motion, data fiktif, tidak ada jaringan API/WhatsApp. Papan perbandingan dapat mengganti viewport dan halaman kedua konsep secara serentak. Tidak mengklaim hasil usability/AA atau validasi server dari studi.

## Pembaruan yang dipin pengguna — Studio V2 dan Detail Acara

Pengguna menyukai Studio, meminta pembanding dengan hijau#183D32 dari swatch, dan meminta preview redesign Detail Acara yang benar-benar bisa dicoba. Ini extension arah Studio yang sudah ada, tanpa direction roll baru: warna dipin pengguna, geometri Studio/V2 identik. Seed warisan seed:0903cca35435964f dikorroborasi dari output CLI sumber api, --reroll1 --register bolder, yang dilihat orchestrator pada putaran sebelumnya. Tidak ada comp/quality-card baru karena ini refinement/extension code-led, bukan penggantian dunia visual.

Studio V2 mengganti aksen sitrus dengan#183D32, hover#102F26, pressed#0B241D, soft#E7F0EB, teks primer putih dan teks bantu#D3E7DC. Login mengikuti warna aksen pada layout Studio yang sama. Danger/warning tetap semantik. Semua lima halaman dan task tetap sama untuk perbandingan warna yang adil.

Detail Acara Studio/V2 sekarang memakai lima bagian: Pasangan & keluarga; Acara & waktu; Lokasi; Hadiah; Akses. Desktop nav192px/formfleksibel/overview272px. Mobile memakai select berlabel dan native details tertutup awal. Semua field tetap satu form; nilai tetap di DOM saat pindah bagian, validasi membuka bagian field invalid dan memindahkan fokus. Satu scope simpan seluruh bagian. Bar simpan inline awal, menjadi sticky setelah perubahan dan tetap tersedia sesudah simulasi save; fokus field dijaga dari bar. Saat aria-busy kontrol form dan navigasi dinonaktifkan; tidak mengklaim reentrant-submit guard terpisah atau jaminan server.

Papan terbaru studio-compare.html membandingkan Studio/StudioV2; index.html tetap menyimpan perbandingan Studio/Fokus. Ringkasan adalah draft, bukan status sudah tersimpan. Kode produksi, invitation, login nyata dan data asli tidak diubah. Bukti aktual dan batas ada di EVENT-REDESIGN.md, event-verification.txt, event-v2-verification.txt, studio-v2-verification.txt. Bar mutu sebelumnya tetap berlaku; real device, screen reader dan server tidak diklaim telah diuji.

## Pembaruan aktif — Pesan & Preview dan Foto & Lagu

User meminta redesign nyata pada kedua halaman, diterapkan pada Studio dan StudioV2. Batas tetap mockup, tidak produksi; Detail Acara yang user sukai dipertahankan. Ini extension pola Studio, bukan directionroll baru.

Pesan dibagi dua workspace tab: Pesan WhatsApp / Pratinjau tautan. Editor dan preview saling sesuai; metadata dan thumbnail berdekatan, tetapi unggah gambar tetap di luar form simpan teks. Mobile Edit/Pratinjau, draft tetap mounted, invalid hidden field membuka konteks yang benar. Satu scope save seluruh3fieldteks, status dan fokus jelas.

Media memakai pasangan ringkas/disclosure, gallery9thumbnail + satu MediaCard editor desktop,2kolom mobile dengan native dialog yang memindahkan node yang sama, dan lagu ringkas/nativeplayer. Pilih file/unggah/retry tetap terpisah; File tidak hilang saat berpindah slot/dialog, count berasal media terpasang, hapus konfirmasi/disabled selama upload. Tidak ada crop/reorder/bulkfitur baru.

Geometri/perilaku kedua versi sama; warna tetapStudio sitrus vsV2#183D32. Kualitas mengikuti bar sebelumnya: kontrol44px, label, keyboard/focus return, reducedmotion, counterjanganpalsu, nooverflow1440/390/320. Bukti lokal content-verification.txt dan CONTENT-REDESIGN.md; tidak mengklaim auditAA atau uji pengguna/produksi.

## Koreksi pengguna — submenu seragam dan preview final utuh

Arahan terbaru menggantikan komposisi tab/scroll sebelumnya: seluruh submenu Pesan/Media/Detail memakai komponen sectionNavigation yang sama, desktop menu kiri/mobile select. Media hanya merender area bagian aktif (node bagian lain tetap mounted agar File tidak hilang). Pesan memiliki bagian template/link untuk editor, tetapi preview selalu satu balon WhatsApp final utuh: thumbnail, metadata, domain, lalu teks lengkap. Gambar referensi hanya acuan susunan; data tetap fiktif. Studio dan V2 identik strukturnya, warna tetap.

Kode produksi Studio V2 sekarang telah diminta pengguna secara eksplisit setelah perbaikan preview selesai. Folder studi tetap referensi terpisah; pekerjaan produksi dan buktinya dicatat terpisah, tanpa mengimpor JS simulasi ke aplikasi atau mengubah invitation.
