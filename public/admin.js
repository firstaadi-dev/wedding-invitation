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
  login.hidden = true;dashboard.hidden = false;logout.hidden = false;
  renderGuests();renderMedia();
  for (const key of ['ceremonyTime','receptionTime','mapEmbedUrl']) document.querySelector('#settings').elements[key].value = content.settings[key] || '';
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
function renderGuests() {
  const rows = document.querySelector('#guests');rows.replaceChildren();
  const query = document.querySelector('#search').value.trim().toLocaleLowerCase('id');
  const filtered = guests.filter(g => g.name.toLocaleLowerCase('id').includes(query));
  document.querySelector('#guest-count').textContent = `${guests.length} tamu`;
  document.querySelector('#empty-guests').hidden = filtered.length > 0;
  document.querySelector('#empty-guests').textContent = guests.length ? 'Tidak ada tamu yang cocok.' : 'Belum ada tamu. Tambahkan tamu untuk membuat tautan pertama.';
  for (const guest of filtered) {
    const row = element('tr');row.append(element('td',guest.name),element('td',guest.active ? 'Aktif' : 'Nonaktif'),element('td',`${guest.deviceCount} / 3`));
    const cell = element('td');const actions = element('div',undefined,'row-actions');
    actions.append(action('Edit nama',async () => {
      const name = window.prompt('Nama tamu',guest.name);if (name === null) return;
      await api(`/api/admin/guests/${guest.id}`,'PATCH',{name});await refresh();notice('Nama tamu disimpan.');
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
      if (!await confirm(`Hapus ${guest.name} beserta tautan dan seluruh aksesnya?`,'Hapus tamu?')) return;
      await api(`/api/admin/guests/${guest.id}`,'DELETE');await refresh();notice('Tamu dihapus.');
    },true));
    cell.append(actions);row.append(cell);rows.append(row);
  }
}
function renderMedia() {
  const grid = document.querySelector('#media-grid');grid.replaceChildren();
  for (const [slot,title] of Object.entries({groom:'Foto Firsta',bride:'Foto Talitha',gallery1:'Galeri · Kenangan kami',gallery2:'Galeri · Bersama',gallery3:'Galeri · Perjalanan',music:'Lagu undangan'})) {
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
      if (!await confirm('Media akan dihapus dan bingkai undangan kembali menjadi placeholder.','Hapus media?')) return;
      content = await api(`/api/admin/media/${slot}`,'DELETE');renderMedia();notice('Media dihapus.');
    },true));
    grid.append(card);
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
  try {await navigator.clipboard.writeText(document.querySelector('#link-value').value);notice('Tautan disalin.');}
  catch {document.querySelector('#link-value').select();notice('Salin tautan yang sudah dipilih.');}
});
document.querySelector('#add-guest').addEventListener('submit',async event => {
  event.preventDefault();const form = event.currentTarget;const button = form.querySelector('button');button.disabled = true;
  try {const result = await api('/api/admin/guests','POST',{name:form.elements.name.value});form.reset();await refresh();showLink(result.link);notice('Tamu ditambahkan.');}
  catch(error) {notice(error.message,true);} finally {button.disabled = false;}
});
document.querySelector('#settings').addEventListener('submit',async event => {
  event.preventDefault();const form = event.currentTarget;const button = form.querySelector('button');button.disabled = true;
  try {content = await api('/api/admin/content','PUT',Object.fromEntries(new FormData(form)));notice('Detail acara disimpan.');}
  catch(error) {notice(error.message,true);} finally {button.disabled = false;}
});
api('/api/admin/session').then(result => {csrf = result.csrf;return refresh();}).catch(error => {showLogin();if(error.message!=='Silakan masuk kembali.') notice(error.message,true);});
