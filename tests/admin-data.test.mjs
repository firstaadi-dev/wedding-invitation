import test from 'node:test';
import assert from 'node:assert/strict';
import {guestSummary,findGuests,mediaType,queryGuests,updateSelectedGuests} from '../frontend/admin-data.js';

test('bulk delete sends only selected IDs and reports partial failure before the next batch', async () => {
  const calls = [], progress = [], failure = new Error('Delete failed');
  const result = await updateSelectedGuests(['a','b','c','d','e'], null, async (...args) => {
    calls.push(args);
    if (args[0].endsWith('/b')) throw failure;
  }, count => progress.push(count));
  assert.deepEqual(calls, ['a','b','c','d'].map(id => [`/api/admin/guests/${id}`, 'DELETE']));
  assert.deepEqual(result, {done:3,error:failure});
  assert.deepEqual(progress, [3]);
});

test('bulk delete completes multiple batches and status actions retain PATCH payloads', async () => {
  const calls = [], progress = [];
  assert.deepEqual(await updateSelectedGuests(['a','b','c','d','e'], null,
    async (...args) => calls.push(args), count => progress.push(count)), {done:5,error:null});
  assert.equal(calls.length, 5);
  assert.deepEqual(progress, [4,5]);
  for (const active of [true,false]) {
    const updates = [];
    assert.deepEqual(await updateSelectedGuests(['a'], active, async (...args) => updates.push(args), () => {}), {done:1,error:null});
    assert.deepEqual(updates, [['/api/admin/guests/a','PATCH',{active}]]);
  }
});

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
  for (const [ext,mime] of Object.entries({m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg',oga:'audio/ogg',opus:'audio/ogg',flac:'audio/flac',webm:'audio/webm'})) {
    assert.equal(mediaType({name:`song.${ext.toUpperCase()}`,type:'',size:100},true),mime);
  }
  assert.equal(mediaType({name:'song.m4a',type:'audio/x-m4a',size:100},true),'audio/mp4');
  assert.equal(mediaType({name:'song.wav',type:'application/octet-stream',size:100},true),'audio/wav');
  for (const file of [undefined,{name:'a.png',type:'image/png',size:0},{name:'a.png',type:'image/png',size:12*1024*1024+1},{name:'a.gif',type:'image/gif',size:100},{name:'a.svg',type:'image/svg+xml',size:100}]) assert.throws(() => mediaType(file));
  for (const file of [{name:'a.mp3',type:'audio/mpeg',size:25*1024*1024+1},{name:'a.wav',type:'audio/wav',size:0},{name:'a.wav',type:'audio/wav',size:25*1024*1024+1},{name:'a.png',type:'image/png',size:100}]) assert.throws(() => mediaType(file,true));
});


test('browser filter follows effective limits and excludes unlimited invitations', () => {
  const guests = [
    {name:'At limit',deviceCount:5,deviceLimit:5},
    {name:'Above lowered limit',deviceCount:7,deviceLimit:2},
    {name:'Available',deviceCount:3,deviceLimit:5},
    {name:'Unlimited',deviceCount:9,deviceLimit:null},
    {name:'Unused',deviceCount:0,deviceLimit:3},
  ];
  assert.deepEqual(queryGuests(guests,{devices:'full'}).map(g=>g.name),['Above lowered limit','At limit']);
  assert.deepEqual(queryGuests(guests,{devices:'unused'}).map(g=>g.name),['Unused']);
});
