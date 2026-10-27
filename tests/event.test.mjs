import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultEventDate,defaultVenueName,eventDateLabels,mapTitle,eventSchedule} from '../frontend/event.js';

test('separate event dates and countdown date stay independent with backwards compatible defaults', () => {
  const schedule = eventSchedule({eventDate:'2027-01-09',ceremonyDate:'2027-01-08',receptionDate:'2027-01-10',countdownDate:'2027-01-07',venueName:'Utama',ceremonyVenue:'Rumah',receptionVenue:'Gedung'});
  assert.deepEqual(schedule,{date:'2027-01-09',venue:'Utama',ceremonyDate:'2027-01-08',receptionDate:'2027-01-10',countdownDate:'2027-01-07',ceremonyVenue:'Rumah',receptionVenue:'Gedung'});
  const fallback = eventSchedule({eventDate:'2027-01-09',countdownDate:'',ceremonyDate:'',receptionVenue:' '});
  assert.equal(fallback.countdownDate,'2027-01-09');
  assert.equal(fallback.ceremonyDate,'2027-01-09');
  assert.equal(fallback.receptionVenue,defaultVenueName);
});

test('event date display and map label follow tenant settings', () => {
  assert.deepEqual(eventDateLabels('2027-01-09'),{short:'09 · 01 · 2027',full:'Sabtu, 9 Januari 2027'});
  assert.deepEqual(eventDateLabels('bad'),eventDateLabels(defaultEventDate));
  assert.equal(defaultVenueName,'Arjuna Ballroom, Alam Indah Resto');
  assert.equal(mapTitle('Gedung Baru'),'Peta lokasi acara — Gedung Baru');
  assert.equal(mapTitle(''),'Peta lokasi acara');
});
