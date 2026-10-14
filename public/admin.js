import {defaultWhatsappTemplate, invitationMessage, whatsappUrl} from './whatsapp.js';

let csrf = ''; let guests = []; let content;
const status = document.querySelector('#status');
const login = document.querySelector('#login');
const dashboard = document.querySelector('#dashboard');
const logout = document.querySelector('#logout');
function notice(message,error = false) {status.textContent = message;status.hidden = false;status.classList.toggle('error',error);}
async function api(path,method = 'GET',value) {
  const headers = {};
  const options = {method,headers};
  if (method !== 'GET') headers['X-CSRF-Token'] = csrf;
  if (value instanceof File) {headers['Content-Type'] = value.type;options.body = value;}
  else if (value !== undefined) {headers['Content-Type'] = 'application/json';options.body = JSON.stringify(value);}
  const response = await fetch(path,options);const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/admin/login') showLogin();
    throw new Error(result.error || 'Perubahan belum berhasil.');
  }
  return result;
}
function showLogin() {csrf = '';login.hidden = false;dashboard.hidden = true;logout.hidden = true;}
async function refresh() {
  [guests,content] = await Promise.all([api('/api/admin/guests'),api('/api/admin/content')]);
  document.querySelector('#new-link').hidden = true;
  login.hidden = true;dashboard.hidden = false;logout.hidden = false;
  renderGuests();renderMedia();
  const form = document.querySelector('#whatsapp-settings');
  form.elements.whatsappTemplate.value = content.settings.whatsappTemplate ?? defaultWhatsappTemplate;
  form.elements.linkPreviewTitle.value = content.settings.linkPreviewTitle || '';
  form.elements.linkPreviewDescription.value = content.settings.linkPreviewDescription || '';
  renderMessagePreview();
  for (const key of ['ceremonyTitle','receptionTitle','ceremonyTime','receptionTime','countdownTime','mapEmbedUrl']) document.querySelector('#settings').elements[key].value = content.settings[key] || '';
}
function element(tag,text,className) {const node = document.createElement(tag);if(text!==undefined) node.textContent = text;if(className) node.className = className;return node;}
async function confirm(message,title) {
  const dialog = document.querySelector('#confirm');
  document.querySelector('#confirm-message').textContent = message;
  document.querySelector('#confirm-title').textContent = title;
  dialog.returnValue = 'cancel';dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close',() => resolve(dialog.returnValue === 'confirm'),{once:true}));
}
function action(text,callback,danger = false) {
  const button = element('button',text,danger ? 'danger' : '');button.type = 'button';
  button.addEventListener('click',async () => {
    button.disabled = true;
    try {await callback();} catch(error) {notice(error.message,true);} finally {button.disabled = false;}
  });return button;
}
function showLink(link) {document.querySelector('#new-link').hidden = false;document.querySelector('#link-value').value = link;document.querySelector('#new-link').scrollIntoView({behavior:'smooth',block:'center'});}
async function copyLink(input) {
  try {await navigator.clipboard.writeText(input.value);notice('Tautan disalin.');}
  catch {input.focus();input.select();notice('Salin tautan yang sudah dipilih.');}
}
function renderMessagePreview() {
  const guest = guests.find(g => g.link) || {name:'Bapak/Ibu Tamu Undangan',link:`${location.origin}/#contoh-tautan`};
  document.querySelector('#message-preview').textContent = invitationMessage(document.querySelector('#whatsapp-settings').elements.whatsappTemplate.value,guest);
}
function renderGuests() {
  const rows = document.querySelector('#guests');rows.replaceChildren();
  const query = document.querySelector('#search').value.trim().toLocaleLowerCase('id');
  const filtered = guests.filter(g => `${g.name} ${g.phone}`.toLocaleLowerCase('id').includes(query));
  document.querySelector('#guest-count').textContent = `${guests.length} tamu`;
  const active = guests.filter(g => g.active);
  const attending = active.filter(g => g.response?.attendance === 'attending');
  document.querySelector('#attendance-summary').textContent = `${attending.length} undangan hadir · ${attending.reduce((total,g) => total+g.response.guestCount,0)} orang · ${active.filter(g => g.response?.attendance === 'not_attending').length} tidak hadir · ${active.filter(g => g.response?.attendance === 'unsure').length} belum pasti · ${active.filter(g => !g.response).length} belum konfirmasi (tamu aktif)`;
  document.querySelector('#empty-guests').hidden = filtered.length > 0;
  document.querySelector('#empty-guests').textContent = guests.length ? 'Tidak ada tamu yang cocok.' : 'Belum ada tamu. Tambahkan tamu untuk membuat tautan pertama.';
  for (const guest of filtered) {
    const row = element('tr');row.append(element('td',guest.name),element('td',guest.phone || 'Belum diisi'),element('td',guest.active ? 'Aktif' : 'Nonaktif'),element('td',`${guest.deviceCount} / 3`));
    const attendance = guest.response ? {attending:`Hadir · ${guest.response.guestCount} orang`,not_attending:'Tidak hadir',unsure:'Belum pasti'}[guest.response.attendance] : 'Belum konfirmasi';
    row.append(element('td',attendance),element('td',guest.response?.message || '—','guest-wish'));
    const linkCell = element('td');
    if (guest.link) {
      const input = element('input');input.value = guest.link;input.readOnly = true;input.className = 'guest-link';input.setAttribute('aria-label',`Tautan undangan ${guest.name}`);
      linkCell.append(input,action('Salin',() => copyLink(input)));
    } else linkCell.append(element('p','Link lama belum tersimpan. Gunakan Tautan baru jika link asli sudah hilang.','legacy-link'));
    row.append(linkCell);
    const cell = element('td');const actions = element('div',undefined,'row-actions');
    if (guest.phone && guest.link && guest.active) {
      const send = element('a','Kirim','primary');send.href = whatsappUrl(content.settings.whatsappTemplate,guest);send.target = '_blank';send.rel = 'noopener noreferrer';send.setAttribute('aria-label',`Kirim undangan ${guest.name} melalui WhatsApp`);actions.append(send);
    } else {
      const send = element('button','Kirim');send.type = 'button';send.disabled = true;send.title = 'Isi nomor telepon, gunakan tautan tersimpan, dan aktifkan tamu untuk mengirim.';actions.append(send);
    }
    actions.append(action('Edit',async () => {
      const dialog = document.querySelector('#edit-guest');const form = dialog.querySelector('form');
      form.elements.name.value = guest.name;form.elements.phone.value = guest.phone;
      dialog.returnValue = 'cancel';dialog.showModal();
      const saved = await new Promise(resolve => dialog.addEventListener('close',() => resolve(dialog.returnValue === 'save'),{once:true}));
      if (!saved) return;
      await api(`/api/admin/guests/${guest.id}`,'PATCH',{name:form.elements.name.value,phone:form.elements.phone.value});await refresh();notice('Data tamu disimpan.');
    }));
    actions.append(action(guest.active ? 'Nonaktifkan' : 'Aktifkan',async () => {
      if (guest.active && !await confirm('Tautan tamu ini tidak bisa dibuka dan seluruh sesi akan dicabut.','Nonaktifkan undangan?')) return;
      await api(`/api/admin/guests/${guest.id}`,'PATCH',{active:!guest.active});await refresh();notice('Status tamu disimpan.');
    }));
    actions.append(action('Tautan baru',async () => {
      if (!await confirm('Tautan lama, sesi, dan slot perangkat akan dicabut. Simpan dan kirim tautan pengganti.','Ganti tautan undangan?')) return;
      const result = await api(`/api/admin/guests/${guest.id}/link`,'POST',{});await refresh();showLink(result.link);notice('Tautan pengganti dibuat.');
    }));
    actions.append(action('Reset perangkat',async () => {
      if (!await confirm('Seluruh sesi tamu ini akan dicabut. Tautan yang sama dapat dipakai untuk mendaftarkan perangkat kembali.','Reset slot perangkat?')) return;
      await api(`/api/admin/guests/${guest.id}/devices`,'DELETE');await refresh();notice('Slot perangkat direset.');
    }));
    actions.append(action('Hapus',async () => {
      if (!await confirm(`Hapus ${guest.name} beserta tautan, seluruh akses, konfirmasi, dan ucapannya?`,'Hapus tamu?')) return;
      await api(`/api/admin/guests/${guest.id}`,'DELETE');await refresh();notice('Tamu dihapus.');
    },true));
    cell.append(actions);row.append(cell);rows.append(row);
  }
}
function renderMedia() {
  const grid = document.querySelector('#media-grid');grid.replaceChildren();
  const previewGrid = document.querySelector('#preview-media');previewGrid.replaceChildren();
  for (const [slot,title] of Object.entries({preview:'Thumbnail preview WhatsApp',groom:'Foto Firsta',bride:'Foto Talitha',gallery1:'Galeri · Kenangan kami',gallery2:'Galeri · Bersama',gallery3:'Galeri · Perjalanan',...Object.fromEntries(Array.from({length:6},(_,i)=>[`gallery${i+4}`,`Galeri · Foto ${i+4}`])),music:'Lagu undangan'})) {
    const card = element('article',undefined,'media-card');card.append(element('h3',title));
    if (content.media[slot]) {
      const preview = element(slot === 'music' ? 'audio' : 'img');preview.src = content.media[slot];
      if (slot === 'music') {preview.controls = true;preview.preload = 'none';} else {preview.alt = title;preview.loading = 'lazy';}
      card.append(preview);
    } else card.append(element('div',slot === 'music' ? '♫' : '❦','placeholder'));
    const label = element('label',slot === 'music' ? 'Pilih MP3' : 'Pilih foto');
    const input = element('input');input.type = 'file';input.accept = slot === 'music' ? 'audio/mpeg,.mp3' : 'image/jpeg,image/png,image/webp';label.append(input);card.append(label);
    card.append(action('Unggah',async () => {
      if (!input.files[0]) throw new Error('Pilih file terlebih dahulu.');
      notice('Mengunggah…');content = await api(`/api/admin/media/${slot}`,'PUT',input.files[0]);renderMedia();notice(`${title} disimpan.`);
    }));
    if (content.media[slot]) card.append(action('Hapus',async () => {
      if (!await confirm(slot === 'preview' ? 'Thumbnail akan dihapus dari preview tautan undangan.' : 'Media akan dihapus dan bingkai undangan kembali menjadi placeholder.','Hapus media?')) return;
      content = await api(`/api/admin/media/${slot}`,'DELETE');renderMedia();notice('Media dihapus.');
    },true));
    (slot === 'preview' ? previewGrid : grid).append(card);
  }
}
login.addEventListener('submit',async event => {
  event.preventDefault();const button = login.querySelector('button');button.disabled = true;
  try {const result = await api('/api/admin/login','POST',{password:login.elements.password.value});csrf = result.csrf;login.reset();status.hidden = true;await refresh();}
  catch(error) {notice(error.message,true);} finally {button.disabled = false;}
});
logout.addEventListener('click',async () => {try {await api('/api/admin/logout','POST',{});showLogin();notice('Anda sudah keluar.');} catch(error) {notice(error.message,true);}});
document.querySelector('#search').addEventListener('input',renderGuests);
document.querySelector('#copy-link').addEventListener('click',async () => {
  await copyLink(document.querySelector('#link-value'));
});
document.querySelector('#add-guest').addEventListener('submit',async event => {
  event.preventDefault();const form = event.currentTarget;const button = form.querySelector('button');button.disabled = true;
  try {const result = await api('/api/admin/guests','POST',{name:form.elements.name.value,phone:form.elements.phone.value});form.reset();await refresh();showLink(result.link);notice('Tamu ditambahkan.');}
  catch(error) {notice(error.message,true);} finally {button.disabled = false;}
});
document.querySelector('#settings').addEventListener('submit',async event => {
  event.preventDefault();const form = event.currentTarget;const button = form.querySelector('button');button.disabled = true;
  try {content = await api('/api/admin/content','PUT',Object.fromEntries(new FormData(form)));notice('Detail acara disimpan.');}
  catch(error) {notice(error.message,true);} finally {button.disabled = false;}
});
document.querySelector('#whatsapp-settings').addEventListener('input',renderMessagePreview);
document.querySelector('#whatsapp-settings').addEventListener('submit',async event => {
  event.preventDefault();const form = event.currentTarget;const button = form.querySelector('button');button.disabled = true;
  try {content = await api('/api/admin/content','PUT',Object.fromEntries(new FormData(form)));renderGuests();notice('Template WhatsApp dan preview tautan disimpan.');}
  catch(error) {notice(error.message,true);} finally {button.disabled = false;}
});
api('/api/admin/session').then(result => {csrf = result.csrf;return refresh();}).catch(error => {showLogin();if(error.message!=='Silakan masuk kembali.') notice(error.message,true);});
