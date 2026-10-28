import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWhatsappTemplate, invitationMessage, whatsappUrl, whatsappEvent, whatsappTokens} from '../frontend/whatsapp.js';

test('message editor offers only the six supported insertion choices', () => {
  assert.deepEqual(whatsappTokens, [
    ['nama', 'Nama Tamu'], ['link', 'Tautan Undangan'],
    ['tanggal', 'Tanggal Acara Utama'], ['tempat', 'Tempat Utama'],
    ['jam_acara_1', 'Jam Acara Pertama'], ['jam_acara_2', 'Jam Acara Kedua'],
  ]);
  const event = whatsappEvent({eventDate:'2027-01-09',venueName:'Tempat Utama',ceremonyTime:'09.00 WIB',receptionTime:'11.00 WIB'});
  assert.equal(invitationMessage(whatsappTokens.map(([key]) => `{${key}}`).join('\n'), {name:'Tamu',link:'https://invitation.example/u/code'}, event),
    'Tamu\nhttps://invitation.example/u/code\nSabtu, 9 Januari 2027\nTempat Utama\n09.00 WIB\n11.00 WIB');
});

test('saved message templates retain couple, parents and independently configured event tokens', () => {
  const settings = {
    partnerOneName:'Mempelai {link} Satu', partnerTwoName:'Mempelai Dua',
    partnerOneFather:'Ayah Satu', partnerOneMother:'Ibu Satu', partnerTwoFather:'Ayah Dua', partnerTwoMother:'Ibu Dua',
    eventDate:'2027-01-09', venueName:'Tempat Utama', ceremonyDate:'2027-01-08', receptionDate:'2027-01-10',
    ceremonyTime:'09.00 WIB', receptionTime:'11.00–13.00 WIB', ceremonyVenue:'Rumah', receptionVenue:'Gedung',
  };
  const template = ['nama','link','tanggal','tempat','nama_mempelai_1','nama_mempelai_2',
    'ayah_mempelai_1','ibu_mempelai_1','ayah_mempelai_2','ibu_mempelai_2',
    'tanggal_acara_1','tanggal_acara_2','jam_acara_1','jam_acara_2','tempat_acara_1','tempat_acara_2']
    .map(key => `{${key}}`).join('\n');
  const guest = {name:'Tamu',phone:'628123456789',link:'https://invitation.example/u/code'};
  const event = whatsappEvent(settings);
  const result = invitationMessage(template,guest,event);
  assert.equal(result, ['Tamu',guest.link,'Sabtu, 9 Januari 2027','Tempat Utama',
    'Mempelai {link} Satu','Mempelai Dua','Ayah Satu','Ibu Satu','Ayah Dua','Ibu Dua',
    'Jumat, 8 Januari 2027','Minggu, 10 Januari 2027','09.00 WIB','11.00–13.00 WIB','Rumah','Gedung'].join('\n'));
  assert.equal(new URL(whatsappUrl(template,guest,event)).searchParams.get('text'),result);
  const fallback = whatsappEvent({eventDate:'2027-01-09',venueName:'Tempat Utama',ceremonyDate:'',receptionVenue:''});
  assert.equal(fallback.ceremonyDate,'Sabtu, 9 Januari 2027');
  assert.equal(fallback.receptionVenue,'Tempat Utama');
});

test('WhatsApp message substitutes once and preserves names, line breaks and secret fragment URLs', () => {
  const guest = {name:'Keluarga {link} & Éka',phone:'628123456789',link:'https://invitation.example/#private_token'};
  const template = 'Yth. {nama},\n{link}\n{nama}';
  const expected = `Yth. ${guest.name},\n${guest.link}\n${guest.name}`;
  assert.equal(invitationMessage(template,guest),expected);
  const url = new URL(whatsappUrl(template,guest));
  assert.equal(url.origin,'https://wa.me');
  assert.equal(url.pathname,'/628123456789');
  assert.equal(url.searchParams.get('text'),expected);
  assert.equal(url.hash,'');
  assert.ok(invitationMessage(defaultWhatsappTemplate,guest).includes(guest.link));
});

test('WhatsApp date and venue tokens follow current event settings', () => {
  const guest = {name:'Keluarga',phone:'628123456789',link:'https://invitation.example/u/secret'};
  const event = {date:'Sabtu, 9 Januari 2027',venue:'Gedung Baru'};
  assert.equal(invitationMessage('{tanggal}\n{tempat}\n{link}',guest,event),'Sabtu, 9 Januari 2027\nGedung Baru\n'+guest.link);
  assert.ok(invitationMessage(defaultWhatsappTemplate,guest,event).includes('Sabtu, 9 Januari 2027\nGedung Baru'));
});

test('empty event times have readable fallbacks', () => {
  assert.equal(invitationMessage('{jam_acara_1} / {jam_acara_2}', {name:'Tamu',link:'https://example.invalid'}),
    'Waktu akan diinformasikan / Waktu akan diinformasikan');
});

test('missing names never fall back to another couple', () => {
  const template = '{nama_mempelai_1}|{nama_mempelai_2}|{ayah_mempelai_1}|{ibu_mempelai_1}|{ayah_mempelai_2}|{ibu_mempelai_2}';
  assert.equal(invitationMessage(template, {name:'Tamu',link:'https://example.invalid'}), '|||||');
  assert.doesNotMatch(defaultWhatsappTemplate, /Firsta|Talitha/);
});
