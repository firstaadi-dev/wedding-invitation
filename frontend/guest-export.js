import {invitationMessage, whatsappUrl} from './whatsapp.js';

export async function guestExport(guests, template, event) {
  const {default: ExcelJS} = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Tamu Undangan', {views: [{state: 'frozen', ySplit: 1}]});
  sheet.columns = [
    {header: 'Nama', width: 28},
    {header: 'Nomor Whatsapp', width: 22},
    {header: 'Link WA api untuk kirim undangan', width: 48},
    {header: 'Text ucapan formatted untuk kirim manual', width: 72},
    {header: 'Status kirim', width: 18},
  ];
  sheet.getColumn(2).numFmt = '0';
  for (const guest of guests) {
    const message = guest.link ? invitationMessage(template, guest, event) : '';
    const url = guest.link ? whatsappUrl(template, guest, event) : '';
    const row = sheet.addRow([
      guest.name,
      guest.phone ? Number(guest.phone) : null,
      url ? {text: url, hyperlink: url} : '',
      message,
      'false',
    ]);
    row.alignment = {vertical: 'top', wrapText: true};
    row.height = Math.min(300, Math.max(45, (message.split('\n').length + 2) * 15));
    row.getCell(3).font = {color: {argb: 'FF0563C1'}, underline: true};
    row.getCell(5).dataValidation = {
      type: 'list', allowBlank: false, formulae: ['"true,false"'],
      showErrorMessage: true, errorStyle: 'stop',
      errorTitle: 'Status kirim tidak valid', error: 'Pilih true atau false.',
    };
  }
  const header = sheet.getRow(1);
  header.height = 32;
  header.font = {bold: true, color: {argb: 'FFFFFFFF'}};
  header.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF304D43'}};
  header.alignment = {vertical: 'middle', wrapText: true};
  sheet.autoFilter = {from: 'A1', to: `E${sheet.rowCount}`};
  return workbook.xlsx.writeBuffer();
}
