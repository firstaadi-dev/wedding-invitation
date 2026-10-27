import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWhatsappTemplate, invitationMessage, whatsappUrl, whatsappTokens} from '../frontend/whatsapp.js';

test('message editor offers only the six supported insertion choices', () => {
  assert.deepEqual(whatsappTokens, [
    ['nama', 'Nama Tamu'], ['link', 'Tautan Undangan'],
    ['tanggal', 'Tanggal Acara Utama'], ['tempat', 'Tempat Utama'],
    ['jam_acara_1', 'Jam Acara Pertama'], ['jam_acara_2', 'Jam Acara Kedua'],
  ]);
  const event = {date:'Sabtu, 9 Januari 2027',venue:'Tempat Utama',ceremonyTime:'09.00 WIB',receptionTime:'11.00 WIB'};
  assert.equal(invitationMessage(whatsappTokens.map(([key]) => `{${key}}`).join('\n'), {name:'Tamu',link:'https://invitation.example/u/code'}, event),
    'Tamu\nhttps://invitation.example/u/code\nSabtu, 9 Januari 2027\nTempat Utama\n09.00 WIB\n11.00 WIB');
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
