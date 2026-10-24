# Alternatif CMS — Buku Persiapan

Mode: **Operate**. Batas tulis: folder studi ini dan tiga dokumen `docs/weddinvita-{brand-identity,cms-design-spec,cms-design-tokens}.md`. Tidak ada perubahan aplikasi/invitation, atau penggunaan keluaran Stitch. Product record berasal dari brief eksplisit dan sumber yang dibaca, bukan wawancara tambahan.

## Eksplorasi arah

Tujuh sumber yang dekat dengan persiapan pernikahan: (1) daftar keluarga pada lembar rencana, krem/hijau dan sans rapat, menenangkan tetapi dekat incumbent; (2) korespondensi keluarga, plum/ivory dan serif, personal tetapi lambat pada tabel; (3) buku persiapan editorial kontemporer, putih hangat/biru tinta dan sans, hierarki bersatuan dan aturan baris yang mudah dibandingkan; (4) bungkus hadiah, terracotta/krem dan bentuk besar, hangat tetapi ekspresi bisa mendominasi kerja; (5) papan penunjuk lokasi acara, hitam/putih dan sans besar, sangat jelas tetapi terlalu sedikit skala untuk CMS; (6) album foto keluarga, putih hangat/abu dan grid foto, cocok media tetapi tidak boleh mengubah daftar menjadi kartu; (7) panduan area taman, teal/ivory dan label spasial, ramah tetapi metafora peta tidak sesuai tugas utama.

Roll Impeccable menunjuk kandidat ketiga. Ini adalah keputusan rekomendasi agen sesuai brief yang meminta memilih satu arah, **belum merupakan approval implementasi pengguna**. Tidak ada putaran pilihan/approval tambahan karena pengguna meminta bekerja dari konteks yang tersedia dan hanya bertanya jika terhalang. Tidak ada telemetry pilihan pengguna yang dikirim.

Challenger dinilai pada identifikasi audiens dan kejelasan tugas, dengan mode Operate membatasi pinjaman pada type/palette/density/satu signature:

| Challenger | Putusan | Dasar terhadap Buku Persiapan | Disiplin yang dipertahankan |
| --- | --- | --- | --- |
| Split-flap concourse | declined | Tipografi fixed-cell dan kontras malam kurang sesuai persiapan personal; update flips memperlambat baca status | Kolom stabil dan status perubahan yang persisten, tanpa flips |
| Convention circle catalog | declined | Dense thumbnail tidak menjelaskan RSVP dan memaksa pembacaan gambar | Setiap area punya label tepat; galeri memakai seluruh slot nyata |
| Boarding pass/gate board | declined | Kode boarding mengganggu, ranking waktu tidak relevan tamu | Satuan dan label eksplisit; tidak menggeser baris setelah aksi tanpa sebab |
| Emigre bitmap | declined | Pixel display menurunkan keterbacaan tabel dan asosiasi pernikahan | Type scale konsisten, tampilan data tidak mengejar dekorasi |
| Lexicon shoulder/plate | competitive pada kejelasan teks, tidak dipilih | Copy dan cross-reference disiplin, tetapi serif padat dan shoulder guide memberi terlalu banyak aparatus pada CMS | Dokumentasi dan penamaan bidang presisi; kontrol tetap standar |
| Zoo/gardens map | declined | Lobes/overshoot mengaburkan grid dan tidak membantu pengelolaan tamu | Pembagian area visual jelas dan fallback reduced motion, tanpa bentuk organik |

Tidak ada challenger yang mengalahkan arah final di kedua sumbu. Tidak ada gambar QUALITY BAR challenger yang dipakai sebagai acuan komposisi; katalog ditinjau sebagai deskripsi sistem dan batas, bukan sumber aset. Dua arah yang paling relevan untuk keputusan produk dibandingkan secara ringkas pada dokumen brand.

## Kontrak arah

THESIS: CMS membantu pasangan melihat siapa yang diundang, siapa yang menjawab, dan berapa orang akan datang, dengan dampak perubahan yang jelas.

OWN-WORLD: putih hangat #F8F7F3, tinta biru #2949A0, sidebar #E9EDF7, Inter lokal, garis pemisah halus. Kepadatan operasional dan angka bersatuan; tanpa simulasi material buku, tanpa ilustrasi atau efek kertas.

STORY: navigasi empat halaman standar → Tamu Undangan sebagai pekerjaan utama → ringkasan yang memisahkan undangan dan orang → cari/filter → bandingkan baris → bagikan atau ubah akses dengan konfirmasi. Login menjadi pintu tenang, media dan form memakai grammar yang sama.

FIRST VIEWPORT: sidebar berlabel208 px, header konteks80 px, heading dan Tambah tamu, ringkasan5 kelompok, toolbar dan awal tabel nyata. Di mobile header/Menu, heading/primary, ringkasan bersatuan lalu toolbar; tabel berada dalam region scroll. Signature: jumlah orang mendapat baris tersendiri berbidang biru pucat di mobile, sehingga tidak tersalah baca sebagai jumlah undangan.

FORM: code-led app screen; HTML/CSS/JS lokal, data fiktif, state di memori; seed:0903cca35435964f. Tidak ada comp generatif sebagai acuan. Nilai, komposisi dan microcopy ditentukan langsung untuk tugas CMS.

## Bar mutu lokal

Semua halaman harus terasa sebagai satu produk: Inter satu keluarga, satu tombol primer per scope simpan, tidak ada clipping halaman di1440/390/320, semua aksi penting tersedia lewat scroll tabel mobile, default/empty/error/busy/dirty dijelaskan dan sampel utama dapat dicoba. Artwork bukan syarat: placeholder media harus jujur. Tidak ada klaim lolos uji pengguna/audit AA hanya karena render berhasil.
