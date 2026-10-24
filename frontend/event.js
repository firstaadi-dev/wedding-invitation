export const defaultEventDate = '2026-11-22';
export const defaultVenueName = 'Arjuna Ballroom, Alam Indah Resto';

export function eventDateLabels(value = defaultEventDate) {
  let date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    date = new Date(`${defaultEventDate}T00:00:00Z`);
    value = defaultEventDate;
  }
  return {
    short: value.split('-').reverse().join(' · '),
    full: new Intl.DateTimeFormat('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date),
  };
}

export const mapTitle = venue => venue ? `Peta lokasi acara — ${venue}` : 'Peta lokasi acara';
