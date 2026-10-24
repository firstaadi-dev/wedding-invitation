// Kedua konsep memakai perilaku dan data fiktif studi yang sama, tanpa API.
const concept=document.documentElement.dataset.concept;
$('#status-filter option:first-child').textContent='Status undangan';
$('#attendance-filter option:first-child').textContent='Konfirmasi';
$('#tamu-title').nextElementSibling.textContent='Undang dengan personal. Siapkan dengan tenang.';
$('.workspace-footer span').textContent='Setiap tamu, bagian dari cerita Anda.';
