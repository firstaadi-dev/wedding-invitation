# Audit SEO Weddinvita di staging

Lingkup: halaman perusahaan dan kebijakan pada branch `feat/launch-readiness`, dengan mempertimbangkan domain staging `weddinvita.cloud`. Staging sengaja memakai `X-Robots-Tag: noindex, nofollow, noarchive`; jangan menghapusnya untuk keperluan audit. Tautan tamu dan halaman dashboard bukan sasaran SEO.

## Temuan dan perubahan

| Prioritas | Temuan | Tindakan |
| --- | --- | --- |
| Tinggi | Heading utama belum menyebut jenis produk secara utuh; paragraf awal belum menyebut nama Weddinvita. | Jelaskan undangan pernikahan digital dan Invitation Lock di awal halaman. |
| Tinggi | Harga dan masa akses tersedia, tetapi belum menjawab pertanyaan harga secara mandiri. | Tambahkan jawaban harga dan tautan ke rincian pembayaran; pertahankan penjelasan batas Invitation Lock dan pengiriman WhatsApp manual. |
| Sedang | Informasi organisasi sudah tersedia sebagai microdata, sedangkan persiapan sebelumnya menggunakan JSON-LD. | Gunakan satu markup Organization yang konsisten dengan informasi yang terlihat. |
| Sedang | Sitemap dan canonical sudah ada, tetapi belum ada pemeriksaan konsistensinya setelah build. | Uji empat halaman publik, URL canonical dan JSON-LD. Sitemap tidak mencakup tautan tamu. |

Title, description, Open Graph, tautan ke kebijakan, `robots.txt` dan sitemap sudah tersedia sebelum perubahan ini. Sitemap dan canonical menggunakan domain publik yang sudah ditetapkan dalam konfigurasi; header noindex tetap berlaku pada staging. Robots.txt mengatur akses crawler, bukan kontrol akses untuk data pribadi. Tautan tamu tetap harus dilindungi oleh mekanisme aplikasi.

## Hal yang belum dapat dibuktikan dari staging

- Posisi pencarian, trafik organik, sitasi AI dan konversi: belum ada baseline Search Console atau pengukuran AI yang diperiksa. Kandidat topik seperti “undangan pernikahan digital”, “harga undangan digital Weddinvita”, dan “undangan pernikahan dengan batas akses” adalah hipotesis, bukan klaim volume pencarian.
- Pengukuran Core Web Vitals, performa lapangan dan riset kompetitor belum dilakukan; pengukuran performa dan analytics sebelumnya ditunda.
- Validasi rich result oleh Google belum dilakukan. JSON-LD yang valid tidak menjamin rich result atau sitasi AI.
- Submit sitemap, verifikasi indeks dan pengukuran setelah publikasi menunggu tahap release; tidak perlu mengindeks staging untuk menguji halaman.

Referensi: [Google tentang SEO untuk fitur AI](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro), dan [structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data).
