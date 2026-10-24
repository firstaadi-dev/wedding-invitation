# Studio dan Studio V2

Hanya dua preview ini yang dipertahankan:

- [Studio](studio.html#tamu): aksen sitrus #E5F078.
- [Studio V2](studio-v2.html#tamu): aksen hijau #183D32, sudah diterapkan ke source CMS.
- [Papan perbandingan](studio-compare.html): lima halaman, desktop dan mobile.

Keduanya memakai layout dan fungsi yang sama: navigasi bagian seragam, preview WhatsApp final lengkap, serta Foto & Lagu yang hanya menampilkan bagian terpilih. File/draft tetap ada saat berpindah bagian. Upload thumbnail terpisah dari simpan teks. Data fiktif dan seluruh aksi preview merupakan simulasi lokal.

## Catatan desain

[Detail Acara](EVENT-REDESIGN.md), [Pesan & Preview serta Foto & Lagu](CONTENT-REDESIGN.md), dan [sistem produksi](../../../frontend/DESIGN.md). Rekaman eksplorasi lama mungkin menyebut konsep yang sudah dihapus; konsep tersebut tidak lagi memiliki halaman atau screenshot preview.

## Pemeriksaan

`verify-content.cjs`, `verify-event.cjs`, `verify-event.cjs studio-v2`, dan `verify-v2.cjs` menggunakan Playwright/Chrome pada1440/390/320. Paket Playwright harus dapat ditemukan oleh Node (misalnya melalui NODE_PATH). Bukti terpisah ada pada content/event/event-v2-screenshots serta screenshots untuk papan perbandingan.

Implementasi React diperiksa lewat `tests/studio-ui.cjs` dari root repository. [Hasil](production-verification.txt), [review](production-review.md), dan production-screenshots mencakup callback fixture, bukan akun/database nyata. Build dan tes proyek lolos. Belum ada deployment, pengujian WhatsApp crawler/cache nyata, perangkat fisik atau screen reader.
