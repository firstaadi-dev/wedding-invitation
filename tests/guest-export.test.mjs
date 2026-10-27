import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from '../frontend/node_modules/exceljs/excel.js';
import {guestExport} from '../frontend/guest-export.js';

test('Excel export preserves messages, clickable WA links, numeric phones and false dropdown tracking', async () => {
  const guests = [
    {name:'Sari & Budi', phone:'628123456789', link:'https://invitation.example/u/secret', status:true},
    {name:'Tanpa nomor', phone:'', link:'https://invitation.example/u/other'},
    {name:'=SUM(1,2)', phone:'', link:null},
  ];
  const template = 'Yth. *{nama}*\n\n{tanggal}\n{tempat}\n{link}';
  const event = {date:'Sabtu, 9 Januari 2027',venue:'Gedung Baru'};
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await guestExport(guests,template,event));
  const sheet = workbook.worksheets[0];
  assert.deepEqual(sheet.getRow(1).values.slice(1), [
    'Nama', 'Nomor Whatsapp', 'Link WA api untuk kirim undangan',
    'Text ucapan formatted untuk kirim manual', 'Status kirim',
  ]);
  assert.equal(sheet.rowCount, 4);
  assert.equal(sheet.getCell('B2').value, 628123456789);
  assert.equal(sheet.getCell('B2').numFmt, '0');
  const expected = 'Yth. *Sari & Budi*\n\nSabtu, 9 Januari 2027\nGedung Baru\nhttps://invitation.example/u/secret';
  assert.equal(sheet.getCell('D2').value, expected);
  assert.equal(sheet.getCell('D2').alignment.wrapText, true);
  const url = new URL(sheet.getCell('C2').hyperlink);
  assert.equal(url.pathname, '/628123456789');
  assert.equal(url.searchParams.get('text'), expected);
  assert.equal(sheet.getCell('B3').value, null);
  assert.equal(new URL(sheet.getCell('C3').hyperlink).pathname, '/');
  assert.equal(sheet.getCell('A4').value, '=SUM(1,2)');
  assert.equal(sheet.getCell('A4').type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell('C4').text, '');
  assert.equal(sheet.getCell('D4').text, '');
  for (let row = 2; row <= 4; row++) {
    const cell = sheet.getCell(`E${row}`);
    assert.equal(cell.value, 'false');
    assert.equal(cell.dataValidation.type, 'list');
    assert.deepEqual(cell.dataValidation.formulae, ['"true,false"']);
    assert.equal(cell.dataValidation.showErrorMessage, true);
    assert.ok(!cell.dataValidation.allowBlank);
  }
  sheet.getCell('E2').value = 'true';
  const fresh = new ExcelJS.Workbook();
  await fresh.xlsx.load(await guestExport(guests,template,event));
  assert.equal(fresh.worksheets[0].getCell('E2').value, 'false');
});
