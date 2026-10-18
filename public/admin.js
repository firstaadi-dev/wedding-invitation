import {defaultWhatsappTemplate, invitationMessage, whatsappUrl} from './whatsapp.js';
import {guestSummary, findGuests, mediaType} from './admin-data.js';

let csrf = '';let guests = [];let content;let editingGuest = null;
const $ = selector => document.querySelector(selector);
const login = $('#login');
const dashboard = $('#dashboard');
const guestDialog = $('#guest-editor');
const guestForm = $('#guest-form');
const navigation = $('#navigation');
const pages = {tamu:'Tamu undangan',pesan:'Pesan & preview',media:'Foto & lagu',acara:'Detail acara'};

function notice(message,error = false) {
  $('#status-message').textContent = message;$('#status').hidden = false;$('#status').classList.toggle('error',error);
}
async function api(path,method = 'GET',value,type) {
  const session = csrf;
  const headers = {};const options = {method,headers};
  if (method !== 'GET') headers['X-CSRF-Token'] = csrf;
  if (value instanceof File) {headers['Content-Type'] = type || value.type;options.body = value;}
  else if (value !== undefined) {headers['Content-Type'] = 'application/json';options.body = JSON.stringify(value);}
  let response;
  try {response = await fetch(path,options);} catch {throw new Error('Koneksi terputus. Periksa jaringan lalu coba lagi.');}
  if (session !== csrf) throw new Error('Sesi berubah. Silakan masuk kembali.');
  let result;
  try {result = await response.json();} catch {throw new Error('Server belum dapat merespons. Coba lagi sebentar.');}
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/admin/login') showLogin();
    throw Object.assign(new Error(result.error || 'Perubahan belum berhasil.'),{status:response.status});
  }
  return result;
}
function showLogin() {
  csrf = '';guests = [];content = undefined;editingGuest = null;
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  document.querySelectorAll('audio').forEach(audio => audio.pause());
  $('#login-screen').hidden = false;dashboard.hidden = true;$('#loading').hidden = true;$('#status').hidden = true;
  login.reset();$('#login-error').hidden = true;$('#confirm-message').textContent = '';$('#status-message').textContent = '';
  $('#guests').replaceChildren();
  for (const selector of ['#couple-media','#gallery-media','#music-media','#preview-media','#message-preview']) $(selector).replaceChildren();
  for (const selector of ['#settings','#whatsapp-settings','#guest-form']) $(selector).reset();
  $('#new-link').hidden = true;$('#link-value').value = '';$('#manual-link').value = '';$('#search').value = '';
  document.title = 'weddinvita — Masuk CMS';
}
function selectPage(focus = false) {
  const page = Object.hasOwn(pages,location.hash.slice(1)) ? location.hash.slice(1) : 'tamu';
  document.querySelectorAll('.page').forEach(section => {section.hidden = section.id !== `page-${page}`;});
  document.querySelectorAll('[data-page]').forEach(link => {
    if (link.dataset.page === page) link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
  if (!dashboard.hidden) document.title = `weddinvita — ${pages[page]}`;
  if (focus && !dashboard.hidden) {window.scrollTo(0,0);$(`#page-${page} h1`).focus({preventScroll:true});}
}
async function refresh() {
  const values = await Promise.all([api('/api/admin/guests'),api('/api/admin/content')]);
  [guests,content] = values;
  $('#loading').hidden = true;$('#login-screen').hidden = true;dashboard.hidden = false;
  renderGuests();renderMedia();
  const form = $('#whatsapp-settings');
  form.elements.whatsappTemplate.value = content.settings.whatsappTemplate ?? defaultWhatsappTemplate;
  form.elements.whatsappTemplate.setCustomValidity('');
  form.elements.linkPreviewTitle.value = content.settings.linkPreviewTitle || '';
  form.elements.linkPreviewDescription.value = content.settings.linkPreviewDescription || '';
  renderMessagePreview();
  for (const key of ['ceremonyTitle','receptionTitle','ceremonyTime','receptionTime','countdownTime','mapEmbedUrl']) $('#settings').elements[key].value = content.settings[key] || '';
  selectPage();
}
async function refreshGuests() {guests = await api('/api/admin/guests');renderGuests();renderMessagePreview();}
function element(tag,text,className) {
  const node = document.createElement(tag);if (text !== undefined) node.textContent = text;if (className) node.className = className;return node;
}
async function confirm(message,title) {
  const dialog = $('#confirm');$('#confirm-message').textContent = message;$('#confirm-title').textContent = title;
  dialog.returnValue = 'cancel';dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close',() => resolve(dialog.returnValue === 'confirm'),{once:true}));
}
function action(text,callback,className = '') {
  const button = element('button',text,className);button.type = 'button';
  button.addEventListener('click',async () => {
    button.closest('.guest-menu')?.removeAttribute('open');button.disabled = true;
    try {await callback();} catch(error) {notice(error.message,true);} finally {button.disabled = false;}
  });return button;
}
function showLink(link) {
  $('#new-link').hidden = false;$('#link-value').value = link;
  $('#new-link').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'center'});
}
async function copyLink(value) {
  try {await navigator.clipboard.writeText(value);notice('Tautan disalin.');}
  catch {$('#manual-link').value = value;$('#copy-dialog').showModal();$('#manual-link').focus();$('#manual-link').select();}
}
function renderMessagePreview() {
  // The example never exposes an actual guest's secret link.
  $('#message-preview').textContent = invitationMessage($('#whatsapp-settings').elements.whatsappTemplate.value,{name:'Bapak/Ibu Tamu Undangan',link:`${location.origin}/#contoh-tautan`});
}
function editGuest(guest = null) {
  editingGuest = guest;guestForm.reset();$('#guest-error').hidden = true;
  $('#guest-editor-title').textContent = guest ? 'Edit tamu' : 'Tambah tamu';$('#save-guest').textContent = guest ? 'Simpan perubahan' : 'Tambah tamu';
  if (guest) {guestForm.elements.name.value = guest.name;guestForm.elements.phone.value = guest.phone || '';}
  guestDialog.showModal();guestForm.elements.name.focus();
}
function renderGuests() {
  const rows = $('#guests');rows.replaceChildren();const filtered = findGuests(guests,$('#search').value);
  const summary = guestSummary(guests);
  $('#guest-count').textContent = `${summary.total} undangan`;
  for (const key of ['total','attending','people','pending']) $(`#metric-${key}`).textContent = summary[key];
  $('#metric-active').textContent = `${summary.active} aktif · ${summary.inactive} nonaktif`;
  $('#attendance-summary').textContent = `${summary.declined} undangan tidak hadir · ${summary.unsure} belum pasti · Rekap kehadiran hanya dari undangan aktif.`;
  $('#search-count').textContent = `Menampilkan ${filtered.length} dari ${guests.length}`;
  $('#empty-guests').hidden = filtered.length > 0;
  $('#empty-guests').textContent = guests.length ? 'Tidak ada tamu yang cocok. Coba nama atau nomor lain.' : 'Belum ada tamu. Tambahkan tamu untuk membuat tautan pertama.';
  for (const guest of filtered) {
    const row = element('tr');const nameCell = element('td');
    nameCell.append(element('p',guest.name,'guest-name'),element('p',guest.phone || 'Tanpa WhatsApp','guest-phone'));row.append(nameCell);
    const statusCell = element('td');statusCell.append(element('span',guest.active ? '● Aktif' : '● Nonaktif',`tag ${guest.active ? 'active' : 'inactive'}`));row.append(statusCell);
    const devices = element('td');devices.append(element('span',`${guest.deviceCount} / 3${guest.deviceCount === 3 ? ' · Penuh' : ''}`,`tag${guest.deviceCount === 3 ? ' device-full' : ''}`));row.append(devices);
    const attendanceCell = element('td');const attendance = guest.response?.attendance;
    const label = attendance ? {attending:`Hadir · ${guest.response.guestCount} orang`,not_attending:'Tidak hadir',unsure:'Belum pasti'}[attendance] : 'Belum konfirmasi';
    attendanceCell.append(element('span',label,`tag ${attendance || ''}`));row.append(attendanceCell);
    const wishCell = element('td');
    if (guest.response?.message) {
      const wish = element('details',undefined,'guest-wish');
      const summary = element('summary');summary.setAttribute('aria-label',`Baca ucapan ${guest.name}`);
      summary.append(element('span',guest.response.message,'wish-excerpt'),element('span','Baca ucapan','wish-action'));
      wish.append(summary,element('p',guest.response.message,'wish-full'));wishCell.append(wish);
    } else wishCell.append(element('p','Belum ada ucapan','guest-wish'));
    row.append(wishCell);
    const cell = element('td');const actions = element('div',undefined,'row-actions');
    const copy = action('Salin',() => copyLink(guest.link));copy.disabled = !guest.link;
    copy.setAttribute('aria-label',`Salin tautan ${guest.name}`);if (!guest.link) copy.title = 'Tautan lama belum tersimpan. Buat tautan baru jika tautan asli hilang.';actions.append(copy);
    if (guest.phone && guest.link && guest.active) {
      const send = element('a','Kirim','send-link secondary');send.href = whatsappUrl(content.settings.whatsappTemplate,guest);send.target = '_blank';send.rel = 'noopener noreferrer';send.setAttribute('aria-label',`Kirim undangan ${guest.name} melalui WhatsApp`);actions.append(send);
    } else {
      const send = element('button','Kirim');send.type = 'button';send.disabled = true;send.title = 'Isi nomor WhatsApp, gunakan tautan tersimpan, dan aktifkan tamu untuk mengirim.';actions.append(send);
    }
    const menu = element('details',undefined,'guest-menu');const toggle = element('summary','⋯');toggle.setAttribute('aria-label',`Menu tindakan ${guest.name}`);menu.append(toggle);
    menu.addEventListener('toggle',() => {if (menu.open) document.querySelectorAll('.guest-menu[open]').forEach(other => {if (other !== menu) other.open = false;});});
    const menuActions = element('div',undefined,'menu-actions');
    menuActions.append(action('Edit tamu',() => editGuest(guest)));
    menuActions.append(action(guest.active ? 'Nonaktifkan' : 'Aktifkan',async () => {
      if (guest.active && !await confirm(`Undangan ${guest.name} tidak bisa dibuka, seluruh sesi dicabut, dan ucapannya disembunyikan. Data tetap tersimpan dan tamu bisa diaktifkan kembali.`,'Nonaktifkan undangan?')) return;
      await api(`/api/admin/guests/${guest.id}`,'PATCH',{active:!guest.active});await refreshGuests();notice('Status tamu disimpan.');
    }));
    menuActions.append(action('Tautan baru',async () => {
      if (!await confirm(`Tautan lama ${guest.name}, seluruh sesi, dan slot perangkat akan dicabut. Kirim tautan pengganti kepada tamu.`,'Ganti tautan undangan?')) return;
      const result = await api(`/api/admin/guests/${guest.id}/link`,'POST',{});await refreshGuests();showLink(result.link);notice('Tautan pengganti dibuat.');
    }));
    menuActions.append(action('Reset perangkat',async () => {
      if (!await confirm(`Seluruh sesi ${guest.name} akan dicabut dan ketiga slot dikosongkan. Tautan yang sama dapat dipakai untuk mendaftarkan perangkat kembali.`,'Reset slot perangkat?')) return;
      await api(`/api/admin/guests/${guest.id}/devices`,'DELETE');await refreshGuests();notice('Slot perangkat direset.');
    }));
    menuActions.append(action('Hapus tamu',async () => {
      if (!await confirm(`Hapus ${guest.name} beserta tautan, seluruh akses, konfirmasi, dan ucapannya? Data tidak dapat dipulihkan.`,'Hapus tamu?')) return;
      await api(`/api/admin/guests/${guest.id}`,'DELETE');await refreshGuests();notice('Tamu dihapus.');
    },'danger'));
    menu.append(menuActions);actions.append(menu);cell.append(actions);
    if (!guest.link) cell.append(element('p','Tautan lama belum tersimpan. Buat tautan baru jika tautan asli hilang.','legacy-link'));
    row.append(cell);rows.append(row);
  }
}
function renderMedia(onlySlot) {
  if (!onlySlot) for (const selector of ['#preview-media','#couple-media','#gallery-media','#music-media']) {
    $(selector).querySelectorAll('audio').forEach(audio => audio.pause());$(selector).replaceChildren();
  }
  const slots = {preview:'Thumbnail WhatsApp',groom:'Firsta Adi Pradana',bride:'Talitha Syahda Arundatie',...Object.fromEntries(Array.from({length:9},(_,i) => [`gallery${i+1}`,`Galeri · Foto ${i+1}`])),music:'Lagu pilihan'};
  for (const [slot,title] of Object.entries(slots)) {
    if (onlySlot && slot !== onlySlot) continue;
    const music = slot === 'music';const hasMedia = Boolean(content.media[slot]);
    const card = element('article',undefined,`media-card${music ? ' music-card' : ''}`);card.dataset.slot = slot;
    const heading = element('h3',title);heading.append(element('span',hasMedia ? 'Terpasang' : 'Belum diunggah','media-state'));card.append(heading);
    if (hasMedia) {
      const preview = element(music ? 'audio' : 'img');preview.src = content.media[slot];
      if (music) {preview.controls = true;preview.preload = 'none';} else {preview.alt = title;preview.loading = 'lazy';preview.decoding = 'async';}
      card.append(preview);
    } else {const placeholder = element('div',music ? '♫' : '▧','placeholder');placeholder.setAttribute('aria-hidden','true');placeholder.append(element('span',music ? 'Lengkapi suasana' : 'Bingkai cerita Anda'));card.append(placeholder);}
    const label = element('label',music ? 'Pilih MP3' : 'Pilih foto');const input = element('input');input.type = 'file';input.accept = music ? 'audio/mpeg,.mp3' : 'image/jpeg,image/png,image/webp';input.setAttribute('aria-label',`Pilih berkas ${title}`);label.append(input);card.append(label);
    const filename = element('p','Belum ada berkas dipilih','file-name');card.append(filename);
    const feedback = element('p','','media-feedback');feedback.setAttribute('role','status');feedback.hidden = true;
    const mediaActions = element('div',undefined,'media-actions');
    const upload = element('button',hasMedia ? 'Ganti' : 'Unggah','primary');upload.type = 'button';upload.disabled = true;
    const remove = element('button','Hapus','danger');remove.type = 'button';
    const tell = (message,error = false) => {feedback.textContent = message;feedback.hidden = false;feedback.classList.toggle('error',error);};
    input.addEventListener('change',() => {
      const file = input.files[0];filename.textContent = file?.name || 'Belum ada berkas dipilih';feedback.hidden = true;
      try {mediaType(file,music);upload.disabled = false;} catch(error) {upload.disabled = true;if (file) tell(error.message,true);}
    });
    async function update(method) {
      if (method === 'DELETE' && !await confirm(slot === 'preview' ? 'Thumbnail publik dan URL gambar lama akan dicabut dari preview tautan.' : `${title} akan dihapus. Undangan kembali menampilkan bingkai kosong untuk media ini.`,'Hapus media?')) return;
      const file = input.files[0];
      try {
        const type = method === 'PUT' ? mediaType(file,music) : undefined;
        input.disabled = true;upload.disabled = true;remove.disabled = true;card.setAttribute('aria-busy','true');
        tell(method === 'PUT' ? 'Mengunggah berkas…' : 'Menghapus media…');
        content = await api(`/api/admin/media/${slot}`,method,method === 'PUT' ? file : undefined,type);
        renderMedia(slot);notice(method === 'PUT' ? `${title} disimpan.` : `${title} dihapus.`);
      } catch(error) {tell(error.message,true);notice(error.message,true);}
      finally {input.disabled = false;upload.disabled = !input.files[0];remove.disabled = false;card.removeAttribute('aria-busy');}
    }
    upload.addEventListener('click',() => update('PUT'));remove.addEventListener('click',() => update('DELETE'));
    mediaActions.append(upload);if (hasMedia) mediaActions.append(remove);card.append(mediaActions,feedback);
    if (onlySlot) {
      const previous = document.querySelector(`[data-slot="${slot}"]`);previous.querySelector('audio')?.pause();previous.replaceWith(card);input.focus();
    } else $(slot === 'preview' ? '#preview-media' : music ? '#music-media' : slot.startsWith('gallery') ? '#gallery-media' : '#couple-media').append(card);
  }
}
login.addEventListener('submit',async event => {
  event.preventDefault();const button = login.querySelector('button');button.disabled = true;button.textContent = 'Memeriksa…';$('#login-error').hidden = true;
  try {const result = await api('/api/admin/login','POST',{password:login.elements.password.value});csrf = result.csrf;login.reset();$('#status').hidden = true;await refresh();}
  catch(error) {$('#login-error').textContent = error.message;$('#login-error').hidden = false;}
  finally {button.disabled = false;button.textContent = 'Masuk ke dasbor →';}
});
async function logout() {
  const buttons = [$('#logout'),$('#mobile-logout')];buttons.forEach(button => {button.disabled = true;});
  if (navigation.open) navigation.close();
  try {await api('/api/admin/logout','POST',{});showLogin();notice('Anda sudah keluar.');}
  catch(error) {notice(error.message,true);} finally {buttons.forEach(button => {button.disabled = false;});}
}
$('#logout').addEventListener('click',logout);$('#mobile-logout').addEventListener('click',logout);
$('#open-navigation').addEventListener('click',() => navigation.showModal());$('#close-navigation').addEventListener('click',() => navigation.close());
window.addEventListener('hashchange',() => selectPage(true));
document.querySelectorAll('[data-page]').forEach(link => link.addEventListener('click',() => {if (navigation.open) navigation.close();if (location.hash === link.hash) selectPage(true);}));
document.addEventListener('click',event => {document.querySelectorAll('.guest-menu[open]').forEach(menu => {if (!menu.contains(event.target)) menu.open = false;});});
document.addEventListener('keydown',event => {if (event.key === 'Escape') document.querySelectorAll('.guest-menu[open]').forEach(menu => {menu.open = false;menu.querySelector('summary').focus();});});
$('#dismiss-status').addEventListener('click',() => {$('#status').hidden = true;});$('#close-link').addEventListener('click',() => {$('#new-link').hidden = true;});
$('#search').addEventListener('input',renderGuests);$('#copy-link').addEventListener('click',() => copyLink($('#link-value').value));$('#add-guest').addEventListener('click',() => editGuest());
document.querySelectorAll('[data-close-editor]').forEach(button => button.addEventListener('click',() => guestDialog.close()));
guestDialog.addEventListener('cancel',event => {if ($('#save-guest').disabled) event.preventDefault();});
guestForm.addEventListener('submit',async event => {
  event.preventDefault();const button = $('#save-guest');const guest = editingGuest;const session = csrf;
  guestForm.querySelectorAll('input,button').forEach(control => {control.disabled = true;});button.textContent = 'Menyimpan…';$('#guest-error').hidden = true;
  try {
    const result = await api(guest ? `/api/admin/guests/${guest.id}` : '/api/admin/guests',guest ? 'PATCH' : 'POST',{name:guestForm.elements.name.value,phone:guestForm.elements.phone.value});
    guestDialog.close();await refreshGuests();if (!guest) showLink(result.link);notice(guest ? 'Data tamu disimpan.' : 'Tamu ditambahkan.');
  } catch(error) {
    if (session === csrf && guestDialog.open) {$('#guest-error').textContent = error.message;$('#guest-error').hidden = false;}else notice(error.message,true);
  } finally {guestForm.querySelectorAll('input,button').forEach(control => {control.disabled = false;});button.textContent = guest ? 'Simpan perubahan' : 'Tambah tamu';}
});
for (const [selector,message] of [['#settings','Detail acara disimpan.'],['#whatsapp-settings','Pesan WhatsApp dan preview tautan disimpan.']]) {
  $(selector).addEventListener('submit',async event => {
    event.preventDefault();const form = event.currentTarget;const button = form.querySelector('button');const label = button.textContent;button.disabled = true;button.textContent = 'Menyimpan…';
    try {content = await api('/api/admin/content','PUT',Object.fromEntries(new FormData(form)));if (selector === '#whatsapp-settings') renderGuests();notice(message);}
    catch(error) {notice(error.message,true);}finally {button.disabled = false;button.textContent = label;}
  });
}
$('#whatsapp-settings').addEventListener('input',() => {
  const input = $('#whatsapp-settings').elements.whatsappTemplate;
  input.setCustomValidity(input.value.includes('{link}') ? '' : 'Sertakan {link} agar tamu menerima tautan undangannya.');renderMessagePreview();
});
api('/api/admin/session').then(result => {csrf = result.csrf;return refresh();}).catch(error => {showLogin();if (error.status !== 401) {$('#login-error').textContent = error.message;$('#login-error').hidden = false;}});
