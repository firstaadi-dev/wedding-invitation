export const whatsappTokens = [
  ['nama', 'Nama Tamu'], ['link', 'Tautan Undangan'],
  ['tanggal', 'Tanggal Acara Utama'], ['tempat', 'Tempat Utama'],
  ['jam_acara_1', 'Jam Acara Pertama'], ['jam_acara_2', 'Jam Acara Kedua'],
];

export const defaultWhatsappTemplate = `Yth. {nama},

Kami mengundang Bapak/Ibu/Saudara/i untuk hadir dalam pernikahan kami.

{tanggal}
{tempat}

Informasi acara dan konfirmasi kehadiran tersedia melalui undangan berikut:
{link}

Terima kasih atas doa restunya.

Firsta & Talitha`;

export function invitationMessage(template, guest, event = {}) {
  const values = {nama:guest.name,link:guest.link,tanggal:event.date || 'Minggu, 22 November 2026',tempat:event.venue || 'Arjuna Ballroom, Alam Indah Resto',
    jam_acara_1:event.ceremonyTime || 'Waktu akan diinformasikan', jam_acara_2:event.receptionTime || 'Waktu akan diinformasikan'};
  return template.replace(/\{(nama|link|tanggal|tempat|jam_acara_1|jam_acara_2)\}/g, (_, key) => values[key]);
}

export function whatsappUrl(template, guest, event) {
  return `https://wa.me/${guest.phone}?text=${encodeURIComponent(invitationMessage(template, guest, event))}`;
}
