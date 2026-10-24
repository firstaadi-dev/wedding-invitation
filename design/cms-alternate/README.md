# Preview desain CMS

Preview yang dipertahankan hanya **Studio** dan **Studio V2**.

- [Perbandingan desktop/mobile](comparison/studio-compare.html)
- [Studio](comparison/studio.html)
- [Studio V2](comparison/studio-v2.html)
- [Catatan dan pemeriksaan](comparison/README.md)

Jalankan dari root repository: `python3 -m http.server 8766 --bind 127.0.0.1 --directory design/cms-alternate`, lalu buka `http://127.0.0.1:8766/`.

`styles.css`, `prototype.js`, dan `assets/` adalah dependensi bersama kedua preview. File PRODUCT/BRIEF/DESIGN lama merupakan catatan eksplorasi; sistem produksi saat ini ada di `frontend/DESIGN.md`. Data preview fiktif dan tidak terhubung ke backend. Studio V2 telah diterapkan ke source admin; deployment belum dilakukan.
