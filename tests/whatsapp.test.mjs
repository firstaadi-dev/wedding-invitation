import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWhatsappTemplate, invitationMessage, whatsappUrl} from '../public/whatsapp.js';

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
