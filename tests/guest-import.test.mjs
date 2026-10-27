import test from 'node:test';
import assert from 'node:assert/strict';
import {importRows, saveImportedGuests} from '../frontend/guest-import.js';

test('Excel guest rows support reordered columns, optional WhatsApp and blank rows', () => {
  assert.deepEqual(importRows([
    [], [' WhatsApp ', 'NAMA'], ['081234567890', ' Sari '],
    [], [null, 'Budi'], [628123456789, 'Dewi'],
  ]), [
    {name:'Sari',phone:'081234567890'}, {name:'Budi',phone:''},
    {name:'Dewi',phone:'628123456789'},
  ]);
  assert.deepEqual(importRows([['Nama'], ['Sari']]), [{name:'Sari',phone:''}]);
});

test('Excel validation rejects empty files, missing names and invalid numbers before saving', () => {
  for (const rows of [[], [['Name']], [['Nama']], [['Nama','WhatsApp'], ['', '081234567890']],
    [['Nama'], ['x'.repeat(121)]], [['Nama','WhatsApp'], ['Sari','abc']],
    [['Nama','WhatsApp'], ['Sari','123']], [['Nama','WhatsApp'], ['Sari',new Date()]],
    [['Nama'], ...Array.from({length:1001}, () => ['Sari'])]]) {
    assert.throws(() => importRows(rows));
  }
});

test('partial import stops on failure and leaves only unsaved rows for continuation', async () => {
  const guests = [{name:'Sari',phone:''},{name:'Budi',phone:''},{name:'Dewi',phone:''}];
  const calls = [], progress = [], failure = new Error('Unavailable');
  const result = await saveImportedGuests(guests, async guest => {
    calls.push(guest.name);
    if (guest.name === 'Budi') throw failure;
  }, value => progress.push(value));
  assert.deepEqual(result, {saved:1,error:failure});
  assert.deepEqual(calls, ['Sari','Budi']);
  assert.deepEqual(progress, [1]);
  const remaining = guests.slice(result.saved);
  assert.deepEqual(await saveImportedGuests(remaining, async () => {}, () => {}), {saved:2,error:null});
});

test('reads an actual Excel workbook including text, numeric and blank WhatsApp cells', async () => {
  const {readSheet} = await import('../frontend/node_modules/read-excel-file/node/index.js');
  const rows = await readSheet(new URL('./fixtures/guest-import.xlsx', import.meta.url).pathname);
  assert.deepEqual(importRows(rows), [
    {name:'Sari',phone:'081234567890'}, {name:'Budi',phone:''},
    {name:'Dewi',phone:'628123456789'},
  ]);
});

test('downloadable template has matching headers and no sample guests to import accidentally', async () => {
  const {readSheet} = await import('../frontend/node_modules/read-excel-file/node/index.js');
  const rows = await readSheet('frontend/static/assets/template-tamu.xlsx');
  assert.deepEqual(rows, [['Nama', 'WhatsApp']]);
  const {readFile} = await import('node:fs/promises');
  assert.deepEqual(await readFile('frontend/dist/assets/template-tamu.xlsx'), await readFile('frontend/static/assets/template-tamu.xlsx'));
});
