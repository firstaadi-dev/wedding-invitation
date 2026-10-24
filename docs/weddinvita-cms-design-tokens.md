# weddinvita — token alternatif CMS

Final desain **Buku Persiapan**,24 Oktober2026. Namespace `cms-`; hanya CMS/login. Sumber implementasi studi: [styles.css](../design/cms-alternate/styles.css). [Identitas](weddinvita-brand-identity.md) dan [spesifikasi](weddinvita-cms-design-spec.md) menetapkan makna/penggunaan. Nilai di sini bukan token invitation. Belum diterapkan ke source aplikasi.

## Cakupan dan struktur

Global palette menjadi nilai mentah, semantic alias menjadi nama yang dipakai komponen. Dalam mockup alias warna diekspresikan sebagai CSS `--cms-color-*`; tipe/spacing pada tabel berikut menjadi nilai normatif handoff walau CSS studi memakai literal untuk ukuran. Jangan mengklaim seluruh token telah terimplementasi sebagai custom property. Saat implementasi, scope pada root CMS/entry admin, bukan :root bersama undangan. Jangan mengganti variabel `forest`/`paper` milik invitation atau memuat stylesheet studi dalam build produksi.

Token global referensi: `cms-palette-paper=#F8F7F3`, `white=#FFFFFF`, `blue-50=#EDF1FC`, `blue-100=#E9EDF7`, `blue-700=#2949A0`, `blue-800=#203B82`, `blue-900=#172E6C`, `ink-900=#202B3D`, `slate-600=#596477`, `slate-500=#7C879A`, `slate-200=#D8DDE6`. Nama semantic berikut adalah kontrak komponen; global hanya untuk definisinya, bukan pemilihan warna baru per halaman.

## Warna semantik

| Token | Nilai final | Penggunaan |
| --- | --- | --- |
| cms-color-background | #F8F7F3 | Workspace dan sisi form login |
| cms-color-surface | #FFFFFF | Panel, field, header, dialog |
| cms-color-sidebar | #E9EDF7 | Sidebar dan area brand login |
| cms-color-text | #202B3D | Heading, label, isi utama |
| cms-color-muted | #596477 | Helper, placeholder, secondary text pada background/surface |
| cms-color-sidebar-text | #3D4E74 | Label navigasi nonaktif dan copy pada sidebar |
| cms-color-sidebar-muted | #4A5878 | Deskriptor/sidebar helper |
| cms-color-border | #D8DDE6 | Pemisah/panel, tidak cukup untuk satu-satunya batas input |
| cms-color-input-border | #7C879A | Batas kontrol/scrollbar yang perlu dikenali |
| cms-color-primary | #2949A0 | Primary, tautan, wordmark, nav aktif |
| cms-color-primary-hover | #203B82 | Hover primary |
| cms-color-primary-active | #172E6C | Pressed primary, bukan hover |
| cms-color-on-primary | #FFFFFF | Teks/ikon primary/nav aktif |
| cms-color-primary-soft | #EDF1FC | Selection baris, tokens, bidang orang hadir mobile |
| cms-color-secondary-hover | #EDF1FC | Hover tombol sekunder/quiet |
| cms-color-secondary-active | #DDE5FA | Tombol sekunder ditekan |
| cms-color-nav-hover | #DDE4F5 | Navigasi hover di sidebar |
| cms-color-table-header | #F0F3FA | Sticky header tabel |
| cms-color-row-hover | #F7F9FE | Hover row tidak selected |
| cms-color-focus | #2949A0 | Ring fokus3 px dengan offset3 px |
| cms-color-success | #256044 | Teks Aktif/Hadir dan sukses |
| cms-color-success-soft | #EAF4ED | Bidang status sukses |
| cms-color-warning | #80551D | Teks batas browser penuh/peringatan |
| cms-color-warning-soft | #FBF0DE | Bidang warning |
| cms-color-danger | #A12B3A | Error, Hapus, primary berisiko |
| cms-color-danger-soft | #FCEDEF | Bidang error jika dibutuhkan |
| cms-color-danger-border | #E9C1C7 | Pemisah item destruktif di menu |
| cms-color-disabled-background | #EDF0F4 | Tombol disabled, tanpa opacity global |
| cms-color-disabled-text | #596477 | Teks disabled tetap terbaca |
| cms-color-disabled-field | #F0F2F6 | Field/placeholder media dan status netral |
| cms-color-scrim | #202B3D66 | Backdrop dialog40% |
| cms-color-selection-background | #D9E3FF | Text selection native |
| cms-color-selection-text | #172E6C | Teks yang dipilih |
| cms-color-notice-background | #202B3D | Pemberitahuan umum; teks putih |

Status tidak hanya warna: Aktif/Nonaktif; Hadir/Tidak hadir/Belum pasti/Belum konfirmasi; x/y browser dengan label “Batas tercapai”; error dengan pesan. Tidak hadir dan belum konfirmasi memakai netral, bukan danger. Danger hanya kegagalan/tindakan berisiko. Fokus pada tombol biru menggunakan ring di luar offset putih; jangan ring biru di atas biru tanpa celah. Bila implementasi memakai bidang gelap baru, gunakan ring putih dan uji ulang, bukan mengasumsikan pasangan sekarang berlaku.

## Kontras pasangan yang diperiksa

Rasio sRGB dihitung dari luminans relatif `(Lterang+0,05)/(Lgelap+0,05)`, tanpa pembulatan sebelum perbandingan. Hasil dan skrip dapat diulang melalui `node design/cms-alternate/contrast.cjs`. Angka di bawah diperbarui dari output skrip; ini memeriksa pasangan solid, bukan semua state/opacity/screen reader.

<!-- contrast-results:start -->
| Pasangan | Warna | Rasio | Target |
| --- | --- | --- | --- |
| Teks / surface | #202B3D / #FFFFFF | 14.24:1 | ≥4.5:1 |
| Muted / surface | #596477 / #FFFFFF | 5.98:1 | ≥4.5:1 |
| Muted / background | #596477 / #F8F7F3 | 5.57:1 | ≥4.5:1 |
| Sidebar label / sidebar | #3D4E74 / #E9EDF7 | 7.05:1 | ≥4.5:1 |
| Sidebar helper / sidebar | #4A5878 / #E9EDF7 | 6.06:1 | ≥4.5:1 |
| Putih / primary | #FFFFFF / #2949A0 | 8.22:1 | ≥4.5:1 |
| Putih / hover | #FFFFFF / #203B82 | 10.45:1 | ≥4.5:1 |
| Putih / pressed | #FFFFFF / #172E6C | 12.78:1 | ≥4.5:1 |
| Primary / soft | #2949A0 / #EDF1FC | 7.28:1 | ≥4.5:1 |
| Success / soft | #256044 / #EAF4ED | 6.58:1 | ≥4.5:1 |
| Warning / soft | #80551D / #FBF0DE | 5.76:1 | ≥4.5:1 |
| Danger / soft | #A12B3A / #FCEDEF | 6.33:1 | ≥4.5:1 |
| Putih / danger | #FFFFFF / #A12B3A | 7.19:1 | ≥4.5:1 |
| Input border / putih | #7C879A / #FFFFFF | 3.63:1 | ≥3:1 |
| Focus / background | #2949A0 / #F8F7F3 | 7.67:1 | ≥3:1 |
| Focus / sidebar | #2949A0 / #E9EDF7 | 7.01:1 | ≥3:1 |
| Disabled text / disabled | #596477 / #EDF0F4 | 5.23:1 | ≥4.5:1 |
| Selection text / selection | #172E6C / #D9E3FF | 9.97:1 | ≥4.5:1 |
<!-- contrast-results:end -->

Border panel dekoratif tidak ditargetkan3:1; input border yang menyampaikan batas kontrol memakai token berbeda dan diuji. Disabled tidak memakai opacity untuk menjaga teks. Periksa ulang kontras jika ada compositing, gambar di bawah teks, atau penambahan state baru. Target WCAG2.2 AA tetap perlu audit implementasi lengkap.

## Tipografi

Font UI `cms-font-family-ui`: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Berkas Inter400/500/600/700 disimpan lokal pada studi beserta lisensi OFL. Fallback tidak menghalangi form saat font gagal. Tidak ada font serif untuk login. Angka `font-variant-numeric:tabular-nums`, nomor rekening tetap string.

| Token | Size/line-height; weight | Pemakaian |
| --- | --- | --- |
| cms-type-login-display | 48/56 px;500;tracking−0,035em | Pengantar login desktop |
| cms-type-login-display-tablet | 36/44 px;500 | Login600–899 |
| cms-type-login-display-mobile | 32/40 px;500 | Login≤599 |
| cms-type-page | 28/36 px;600;tracking−0,025em | H1 desktop, judul form login |
| cms-type-page-mobile | 24/32 px;600 | H1≤599 |
| cms-type-section | 20/28 px;600;tracking−0,015em | H2 panel |
| cms-type-subsection | 16/24 px;600 | H3, keluarga, media |
| cms-type-body | 16/24 px;400 | Input, teks utama |
| cms-type-body-compact | 14/22 px;400 | Instruksi/panel dan pesan preview |
| cms-type-table | 14/20 px;400 | Data tabel, nama500 |
| cms-type-label | 14/20 px;500 | Label field/tombol, primary600 |
| cms-type-helper | 12/18 px;400 | Helper, count, metadata, table header500 |
| cms-type-status | 12/18 px;400 | Pill status |
| cms-type-metric | 28/36 px;500 | Angka ringkasan desktop dan orang hadir |
| cms-type-metric-mobile | 24/32 px;500 | Angka ringkasan lain mobile |
| cms-type-wordmark | 24/32 px;600;tracking−0,02em | Sidebar/login |
| cms-type-wordmark-mobile | 20/32 px;600 | Header mobile |

Ukuran didefinisikan dengan rem (basis16 px) saat implementasi. Jangan menyusutkan font pada320 px. Body prose maksimal72ch; tabel mengikuti kolom. Nama/wishes wrap, URL break-anywhere, input tetap editable penuh. Jangan memakai uppercase tracking lebar untuk seluruh label tabel.

## Spacing, bentuk, dan ukuran

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| cms-space-1 | 4 px | Jarak ikon/status kecil |
| cms-space-2 | 8 px | Label ke input, antaraksi |
| cms-space-3 | 12 px | Copy/helper, control padding |
| cms-space-4 | 16 px | Field stacks, mobile inset, gap tombol |
| cms-space-5 | 20 px | Media card/panel mobile, toolbar |
| cms-space-6 | 24 px | Panel desktop, antar-panel, gap form dua kolom |
| cms-space-7 | 28 px | Heading ke area kerja, mobile top inset |
| cms-space-8 | 32 px | Desktop inset, section gap |
| cms-space-9 | 36 px | Desktop main top |
| cms-space-10 | 40 px | Login tablet/gap brand |
| cms-space-12 | 48 px | Login brand padding vertikal desktop |
| cms-space-16 | 64 px | Login padding horizontal desktop |
| cms-radius-control | 8 px | Input/button/preview |
| cms-radius-panel | 12 px | Panel/media/notice |
| cms-radius-dialog | 16 px | Modal/drawer |
| cms-radius-status | 6 px | Label noninteraktif |
| cms-radius-circle | 50% | Avatar/switch dot saja |
| cms-border-width | 1 px | Border/pemisah |
| cms-size-touch | 44 ×44 px minimum | Seluruh aksi, checkbox wrapper dan icon button |
| cms-size-input-height | 48 px minimum | Field/select (pagination44) |
| cms-size-sidebar | 208 px | Desktop≥1200 |
| cms-size-sidebar-compact | 184 px | 900–1199 |
| cms-size-header | 80 px | Konteks akun desktop |
| cms-size-header-mobile | 72 px | Wordmark/Menu |
| cms-size-form | 760 px maksimum | Detail Acara/couple/music |
| cms-size-login-form | 400 px maksimum | Form login |
| cms-size-dialog | 520 px maksimum | Mockup dialog umum; viewport−32 |
| cms-size-editor | 480 px maksimum | Target editor/drawer produksi |
| cms-size-table | 1164 px minimum | Sembilan kolom tamu |
| cms-size-table-height | 580 px desktop /600 mobile maksimum | Region scroll |
| cms-size-row | 76 px minimum | Row tumbuh bila teks panjang |
| cms-size-gift-switch | 72 ×44 px | ON/OFF |
| cms-size-icon | 20 px nav /18 px aksi target | SVG viewBox24;stroke1,75 |

Mockup menggunakan ikon navigasi18 px, ikon baris16 px di area44 px; ukuran artwork dapat lebih kecil selama hit area dan keterbacaan lolos review. Tidak perlu mengubah SVG invitation. Nilai responsive: breakpoint599/899/1199/1599 px; tepat600/900/1200/1600 mengikuti rentang berikutnya. Tidak memakai layout fixed1440 yang menyebabkan halaman melebar.

## Elevasi dan motion

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| cms-shadow-none | none | Panel/table; batas lewat border |
| cms-shadow-dialog | 0 16px 48px #202B3D29 | Dialog/drawer/notice; tanpa border tambahan |
| cms-z-table-header | 1 | Sticky header di region |
| cms-z-notice | 50 | Notice fixed; tidak di atas native modal top layer |
| cms-z-skip | 100 | Skip link saat fokus |
| cms-duration-fast | 120 ms | Hover background |
| cms-duration-drawer | 180 ms | Target transisi drawer; mockup dialog native tanpa animasi masuk |
| cms-easing | cubic-bezier(0.16,1,0.3,1) | Ease-out perubahan konteks |
| cms-duration-reduced | 0 ms | prefers-reduced-motion, scroll instan |
| cms-focus-width | 3 px | Outline solid |
| cms-focus-offset | 3 px | Pemisah ring dari komponen |

Tidak ada animasi angka, parallax, snap, page-load reveal atau progress palsu. Loading punya teks, bukan warna/spinner saja. Native dialog top layer lebih utama daripada z-index manual; jangan letakkan menu di dalam overflow tabel.

## Pemetaan komponen

| Komponen | Token alias utama | Aturan |
| --- | --- | --- |
| Primary | primary/on-primary, hover/active, radius-control, touch | Satu per konteks, scope simpan jelas |
| Secondary | surface/text/input-border | Salin, edit, filter, file picker |
| Destructive | danger/on-primary | Konfirmasi Hapus, letak terpisah |
| Input | surface/text/muted/input-border/focus | Label nyata, bukan placeholder saja |
| Navigation | sidebar/sidebar-text/nav-hover; active primary | Label utuh dan aria-current |
| Table | surface/table-header/border/primary-soft | Selected tetap checkbox+label, bukan warna saja |
| Status | success/warning/danger + pasangan-soft | Selalu label tertulis |
| Media | surface/disabled-field/muted | Placeholder jujur, file terpilih bukan tersimpan |
| Dialog | surface/text/shadow-dialog/scrim | Batal fokus awal untuk risiko, return focus |

Checklist: [x] warna/peran/state final; [x] tipe/spacing/radius/elevasi/motion; [x] target44 px dan fokus; [x] scope CMS; [x] tidak mengubah token atau source invitation. Token bukan bukti kelulusan audit keseluruhan.
