import test from 'node:test';
import assert from 'node:assert/strict';
import {guestSummary,findGuests,mediaType} from '../frontend/admin-data.js';

test('CMS summary counts invitations separately from people, excluding inactive responses',() => {
  const guests = [
    {name:'Keluarga Sari',phone:'628123456789',active:1,response:{attendance:'attending',guestCount:3}},
    {name:'Budi',phone:'',active:1,response:{attendance:'attending',guestCount:1}},
    {name:'Belum',active:1,response:null},
    {name:'Tidak',active:1,response:{attendance:'not_attending',guestCount:0}},
    {name:'Ragu',active:1,response:{attendance:'unsure',guestCount:0}},
    {name:'Nonaktif hadir',active:0,response:{attendance:'attending',guestCount:10}},
    {name:'Nonaktif belum',active:0,response:null},
  ];
  assert.deepEqual(guestSummary(guests),{total:7,active:5,inactive:2,attending:2,people:4,pending:1,declined:1,unsure:1});
  assert.deepEqual(guestSummary([]),{total:0,active:0,inactive:0,attending:0,people:0,pending:0,declined:0,unsure:0});
  assert.deepEqual(findGuests(guests,'  SARI '),[guests[0]]);
  assert.deepEqual(findGuests(guests,'81234'),[guests[0]]);
  assert.deepEqual(findGuests(guests,'absent'),[]);
  assert.deepEqual(findGuests(guests,'  '),guests);
});

test('CMS media validation accepts supported types and boundary sizes before upload',() => {
  assert.equal(mediaType({name:'photo.JPG',type:'',size:12*1024*1024}),'image/jpeg');
  assert.equal(mediaType({name:'photo',type:'image/webp',size:100}),'image/webp');
  assert.equal(mediaType({name:'song.MP3',type:'',size:25*1024*1024},true),'audio/mpeg');
  for (const file of [undefined,{name:'a.png',type:'image/png',size:0},{name:'a.png',type:'image/png',size:12*1024*1024+1},{name:'a.gif',type:'image/gif',size:100},{name:'a.svg',type:'image/svg+xml',size:100}]) assert.throws(() => mediaType(file));
  for (const file of [{name:'a.mp3',type:'audio/mpeg',size:25*1024*1024+1},{name:'a.wav',type:'audio/wav',size:100},{name:'a.png',type:'image/png',size:100}]) assert.throws(() => mediaType(file,true));
});
