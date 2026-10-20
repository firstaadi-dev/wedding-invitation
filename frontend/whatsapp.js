export const defaultWhatsappTemplate = `Yth. {nama},

Dengan bahagia kami mengundang Bapak/Ibu/Sdr/Sdri untuk hadir di pernikahan kami pada 22 November 2026 di Arjuna Ballroom Alam Indah Resto.

Undangan lengkap:
{link}

Terima kasih atas doa dan kehadirannya.`;

export function invitationMessage(template, guest) {
  return template.replace(/\{(nama|link)\}/g, (_, key) => key === 'nama' ? guest.name : guest.link);
}

export function whatsappUrl(template, guest) {
  return `https://wa.me/${guest.phone}?text=${encodeURIComponent(invitationMessage(template, guest))}`;
}
