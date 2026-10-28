export const defaultEventDate = '';
export const defaultVenueName = 'Lokasi akan diinformasikan';

export function eventSchedule(settings = {}) {
  const date = settings.eventDate || defaultEventDate;
  const venue = settings.venueName?.trim() || defaultVenueName;
  return {
    date, venue,
    ceremonyDate: settings.ceremonyDate || date,
    receptionDate: settings.receptionDate || date,
    ceremonyVenue: settings.ceremonyVenue?.trim() || venue,
    receptionVenue: settings.receptionVenue?.trim() || venue,
    countdownDate: settings.countdownDate || date,
  };
}

export function eventDateLabels(value = defaultEventDate) {
  let date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return {short:'Tanggal akan diinformasikan', full:'Tanggal akan diinformasikan'};
  }
  return {
    short: value.split('-').reverse().join(' · '),
    full: new Intl.DateTimeFormat('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date),
  };
}

export const mapTitle = venue => venue ? `Peta lokasi acara — ${venue}` : 'Peta lokasi acara';
