export function importRows(rows) {
  const header = rows.findIndex(row => row.some(value => value !== null && String(value).trim() !== ''));
  const columns = (rows[header] || []).map(value => String(value ?? '').trim().toLowerCase());
  const nameColumn = columns.indexOf('nama'), phoneColumn = columns.indexOf('whatsapp');
  if (nameColumn < 0) throw new Error('Baris pertama harus memiliki judul kolom Nama. Kolom WhatsApp opsional.');
  const guests = [];
  for (let i = header + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(value => value === null || String(value).trim() === '')) continue;
    const name = String(row[nameColumn] ?? '').trim();
    const rawPhone = row[phoneColumn];
    if (rawPhone != null && typeof rawPhone !== 'string' && typeof rawPhone !== 'number')
      throw new Error(`Baris ${i + 1}: WhatsApp harus berupa teks atau angka.`);
    const phone = String(rawPhone ?? '').trim();
    if (!name || [...name].length > 120 || /[\x00-\x1f]/.test(name))
      throw new Error(`Baris ${i + 1}: nama wajib diisi, maksimal 120 karakter.`);
    const digits = phone.replace(/[\s()-]/g, '').replace(/^\+/, '').replace(/^0/, '62');
    if ([...phone].length > 40 || !/^\+?[0-9\s()-]*$/.test(phone) || (phone && !/^[1-9][0-9]{7,14}$/.test(digits)))
      throw new Error(`Baris ${i + 1}: WhatsApp tidak valid. Gunakan 08…, 62…, atau +kode negara; boleh kosong.`);
    guests.push({name, phone});
  }
  if (!guests.length) throw new Error('File belum berisi tamu.');
  if (guests.length > 1000) throw new Error('Maksimal 1.000 tamu per import.');
  return guests;
}

export async function saveImportedGuests(guests, create, progress) {
  let saved = 0;
  for (const guest of guests) {
    try {
      await create(guest);
    } catch (error) {
      return {saved, error};
    }
    progress(++saved);
  }
  return {saved, error: null};
}
