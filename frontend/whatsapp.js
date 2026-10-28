import {eventSchedule, eventDateLabels} from './event.js';

export const whatsappTokens = [
  ['nama', 'Nama Tamu'], ['link', 'Tautan Undangan'],
  ['tanggal', 'Tanggal Acara Utama'], ['tempat', 'Tempat Utama'],
  ['jam_acara_1', 'Jam Acara Pertama'], ['jam_acara_2', 'Jam Acara Kedua'],
];

export function whatsappEvent(settings = {}) {
  const schedule = eventSchedule(settings);
  return {
    ...settings,
    date: eventDateLabels(schedule.date).full, venue: schedule.venue,
    ceremonyDate: eventDateLabels(schedule.ceremonyDate).full,
    receptionDate: eventDateLabels(schedule.receptionDate).full,
    ceremonyVenue: schedule.ceremonyVenue, receptionVenue: schedule.receptionVenue,
  };
}

export const defaultWhatsappTemplate = `Yth. {nama},

Kami mengundang Bapak/Ibu/Saudara/i untuk hadir dalam pernikahan kami.

{tanggal}
{tempat}

Informasi acara dan konfirmasi kehadiran tersedia melalui undangan berikut:
{link}

Terima kasih atas doa restunya.`;

export function invitationMessage(template, guest, event = {}) {
  const values = {
    nama:guest.name, link:guest.link, tanggal:event.date || 'Minggu, 22 November 2026', tempat:event.venue || 'Arjuna Ballroom, Alam Indah Resto',
    nama_mempelai_1:event.partnerOneName || '', nama_mempelai_2:event.partnerTwoName || '',
    ayah_mempelai_1:event.partnerOneFather || '', ibu_mempelai_1:event.partnerOneMother || '',
    ayah_mempelai_2:event.partnerTwoFather || '', ibu_mempelai_2:event.partnerTwoMother || '',
    tanggal_acara_1:event.ceremonyDate || event.date || 'Minggu, 22 November 2026',
    tanggal_acara_2:event.receptionDate || event.date || 'Minggu, 22 November 2026',
    jam_acara_1:event.ceremonyTime || 'Waktu akan diinformasikan', jam_acara_2:event.receptionTime || 'Waktu akan diinformasikan',
    tempat_acara_1:event.ceremonyVenue || event.venue || 'Arjuna Ballroom, Alam Indah Resto',
    tempat_acara_2:event.receptionVenue || event.venue || 'Arjuna Ballroom, Alam Indah Resto',
  };
  return template.replace(/\{([^{}]+)\}/g, (token, key) => Object.hasOwn(values, key) ? values[key] : token);
}

export function whatsappUrl(template, guest, event) {
  return `https://wa.me/${guest.phone}?text=${encodeURIComponent(invitationMessage(template, guest, event))}`;
}
