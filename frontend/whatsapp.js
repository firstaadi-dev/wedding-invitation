export const defaultWhatsappTemplate = `Yth. {nama},

Kami mengundang Bapak/Ibu/Saudara/i untuk hadir dalam pernikahan kami.

Minggu, 22 November 2026
Arjuna Ballroom, Alam Indah Resto

Informasi acara dan konfirmasi kehadiran tersedia melalui undangan berikut:
{link}

Terima kasih atas doa restunya.

Firsta & Talitha`;

export function invitationMessage(template, guest) {
  return template.replace(/\{(nama|link)\}/g, (_, key) => key === 'nama' ? guest.name : guest.link);
}

export function whatsappUrl(template, guest) {
  return `https://wa.me/${guest.phone}?text=${encodeURIComponent(invitationMessage(template, guest))}`;
}
