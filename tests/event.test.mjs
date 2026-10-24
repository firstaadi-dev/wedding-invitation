import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultEventDate,defaultVenueName,eventDateLabels,mapTitle} from '../frontend/event.js';

test('event date display and map label follow tenant settings', () => {
  assert.deepEqual(eventDateLabels('2027-01-09'),{short:'09 · 01 · 2027',full:'Sabtu, 9 Januari 2027'});
  assert.deepEqual(eventDateLabels('bad'),eventDateLabels(defaultEventDate));
  assert.equal(defaultVenueName,'Arjuna Ballroom, Alam Indah Resto');
  assert.equal(mapTitle('Gedung Baru'),'Peta lokasi acara — Gedung Baru');
  assert.equal(mapTitle(''),'Peta lokasi acara');
});
