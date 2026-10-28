import {countdownParts} from './countdown.js';
import {eventSchedule, eventDateLabels, mapTitle} from './event.js';
import {playAudio} from './audio.js';
const music = document.querySelector('.music-status');
if (location.hash) location.replace(`${location.pathname}?access=1${location.hash}`);
const scope = new URLSearchParams();
if (location.pathname === '/preview') scope.set('preview','1');
if (/^\/[a-f0-9-]{36}$/.test(location.pathname)) scope.set('tenant',location.pathname.slice(1));
else if (location.pathname.startsWith('/i/')) scope.set('tenant',location.pathname.slice(3));
let audio;
let responseToken;
async function load() {
  const response = await fetch(`/api/invitation?${scope}`);
  if (response.status === 401) {location.replace(location.pathname === '/preview' ? '/' : `${location.pathname}?access=1`);return;}
  if (!response.ok) throw new Error('Konten belum dapat dimuat. Muat ulang halaman.');
  const {tenantSlug,invitationId,guestName,settings,media,response:guestResponse,canRespond,responseToken:loadedToken} = await response.json();
  if (media.music) {
    audio = new Audio(media.music);audio.loop = true;audio.preload = 'auto';
    music.disabled = false;music.classList.add('has-music');
    music.setAttribute('aria-pressed','false');label(false);
    const onFirstScroll = () => {if (audio.paused) playMusic();};
    window.addEventListener('scroll',onFirstScroll,{once:true,passive:true});
    audio.addEventListener('play',() => {label(true);window.removeEventListener('scroll',onFirstScroll);});
    audio.addEventListener('pause',() => label(false));
    audio.addEventListener('error',() => {music.title = 'Lagu gagal dimuat. Tekan untuk mencoba lagi.';music.setAttribute('aria-label',music.title);music.setAttribute('aria-pressed','false');});
    audio.load();
    playMusic();
  }
  const schedule = eventSchedule(settings);
  const eventDate = schedule.date;
  const venueName = schedule.venue;
  const dateLabels = eventDateLabels(eventDate);
  scope.set('tenant',invitationId || tenantSlug);
  responseToken = loadedToken;
  document.querySelector('#guest-name').textContent = guestName;
  document.querySelector('#response-guest').textContent = guestName;
  const partners = [settings.partnerOneName?.trim() || 'Mempelai Pertama', settings.partnerTwoName?.trim() || 'Mempelai Kedua'];
  document.querySelector('#partner-one-name').textContent = partners[0];
  document.querySelector('#partner-two-name').textContent = partners[1];
  document.querySelector('#partner-one-short').textContent = settings.partnerOneName?.trim() ? partners[0].split(/\s+/)[0] : partners[0];
  document.querySelector('#partner-two-short').textContent = settings.partnerTwoName?.trim() ? partners[1].split(/\s+/)[0] : partners[1];
  document.querySelector('.envelope-date').textContent = dateLabels.short;
  document.querySelectorAll('.event-date').forEach((date, i) => {date.textContent = eventDateLabels(i === 0 ? schedule.ceremonyDate : schedule.receptionDate).full;});
  document.querySelectorAll('.event-venue').forEach((venue, i) => {venue.textContent = i === 0 ? schedule.ceremonyVenue : schedule.receptionVenue;});
  document.querySelector('#venue-name').textContent = venueName;
  for (const [id, key, fallback] of [
    ['partner-one-father', 'partnerOneFather', 'Bapak'],
    ['partner-one-mother', 'partnerOneMother', 'Ibu'],
    ['partner-two-father', 'partnerTwoFather', 'Bapak'],
    ['partner-two-mother', 'partnerTwoMother', 'Ibu'],
  ]) {
    document.querySelector(`#${id}`).textContent = settings[key]?.trim() ? `${fallback} ${settings[key].trim()}` : '';
  }
  document.title = `Undangan Pernikahan ${document.querySelector('#partner-one-short').textContent} & ${document.querySelector('#partner-two-short').textContent}`;
  if (guestResponse) {
    for (const key of ['attendance','message']) responseForm.elements[key].value = guestResponse[key];
    responseForm.elements.guestCount.value = guestResponse.guestCount || 1;
  }
  attendanceChanged();
  document.querySelector('#response-fields').disabled = !canRespond;
  responseStatus.textContent = canRespond ? (guestResponse ? 'Konfirmasi kehadiran sudah tersimpan dan masih dapat diperbarui melalui formulir ini.' : '') : 'Ini adalah pratinjau undangan. Untuk mengisi konfirmasi, buka tautan tamu.';
  loadWishes();
  for (const [key,fallback] of [['ceremonyTitle','Prosesi Pernikahan'],['receptionTitle','Resepsi']]) {
    document.querySelector(key === 'ceremonyTitle' ? '#ceremony-title' : '#reception-title').textContent = settings[key] || fallback;
  }
  const times = document.querySelectorAll('.pending-time');
  times[0].textContent = settings.ceremonyTime || 'Waktu akan diinformasikan';
  times[1].textContent = settings.receptionTime || 'Waktu akan diinformasikan';
  startCountdown(settings.countdownTime || '00:00', schedule.countdownDate);
  const gifts = document.querySelector('.gift-details');
  const accounts = settings.giftAccounts || [];
  gifts.hidden = settings.giftEnabled === 'false' || !accounts.length;
  const giftContainer = document.querySelector('#gift-accounts');
  giftContainer.replaceChildren(...accounts.map(account => {
    const card = document.createElement('div');card.className = 'gift-bank';
    if (account.type === 'address') {
      const title = document.createElement('h3');title.textContent = 'Alamat pengiriman';
      const recipient = document.createElement('p');recipient.textContent = `Penerima: ${account.recipient}`;
      const address = document.createElement('p');address.className = 'gift-address';address.textContent = account.address;
      card.append(title,recipient,address);
      if (account.phone) {const phone = document.createElement('p');phone.textContent = `Kontak: ${account.phone}`;card.append(phone);}
      return card;
    }
    const bank = document.createElement('h3');bank.textContent = account.bank;
    const row = document.createElement('div');row.className = 'gift-account-row';
    const input = document.createElement('input');input.className = 'gift-account';input.value = account.number;input.readOnly = true;input.setAttribute('aria-label',`Nomor rekening ${account.bank}`);
    const button = document.createElement('button');button.className = 'guest-button';button.type = 'button';button.textContent = 'Salin';
    const owner = document.createElement('p');owner.textContent = `a.n. ${account.owner}`;
    const status = document.createElement('p');status.className = 'form-status';status.setAttribute('role','status');
    button.addEventListener('click',async () => {try {await navigator.clipboard.writeText(input.value.replace(/\s/g,''));status.textContent = 'Nomor rekening disalin.';} catch {input.focus();input.select();status.textContent = 'Salin nomor rekening yang sudah dipilih.';}});
    row.append(input,button);card.append(bank,row,owner,status);return card;
  }));
  const frames = document.querySelectorAll('.couple-grid .photo-placeholder');
  ['groom','bride'].forEach((slot,index) => {
    if (!media[slot]) return;
    frames[index].replaceChildren(photo(media[slot],partners[index]));
    frames[index].classList.add('has-photo');
  });
  renderGallery(media);
  if (settings.mapEmbedUrl) {
    const placeholder = document.querySelector('.map-placeholder');
    const description = document.createElement('p');
    description.textContent = 'Memuat peta menghubungkan browser Anda ke Google Maps. Undangan tetap dapat dibaca tanpa memuat peta.';
    const button = document.createElement('button');button.type = 'button';button.className = 'button';button.textContent = 'Muat peta Google Maps';
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = settings.mapEmbedUrl;frame.title = mapTitle(venueName);frame.tabIndex = 0;
      frame.referrerPolicy = 'no-referrer';frame.allowFullscreen = true;
      placeholder.replaceWith(frame);frame.focus();
    }, {once:true});
    placeholder.replaceChildren(description, button);
  }
}
function photo(src,alt) {
  const image = document.createElement('img');
  image.src = src;image.alt = alt;image.loading = 'lazy';image.decoding = 'async';
  return image;
}
function startCountdown(time, date) {
  const target = Date.parse(`${date}T${time}:00+07:00`);
  const numbers = document.querySelectorAll('.countdown-units strong');
  const update = () => {
    countdownParts(target).forEach((value,index) => {numbers[index].textContent = String(value).padStart(2,'0');});
    document.querySelector('#countdown-label').textContent = Date.now() >= target ? 'Hari pernikahan putra-putri kami' : 'Menuju hari bahagia';
  };
  update();
  const timer = setInterval(() => {update();if (Date.now() >= target) clearInterval(timer);},1000);
}
function renderGallery(media) {
  const photos = Array.from({length:9},(_,i) => media[`gallery${i+1}`]).filter(Boolean);
  if (!photos.length) return;
  const featured = document.querySelector('#gallery-featured');
  const thumbnails = document.querySelector('#gallery-thumbnails');
  const collage = document.querySelector('#gallery-collage');
  const viewer = document.querySelector('#gallery-viewer');
  const full = document.querySelector('#gallery-full');
  let selected = 0;
  function select(index) {
    selected = (index + photos.length) % photos.length;
    const description = `Kenangan mempelai · Foto ${selected+1} dari ${photos.length}`;
    featured.replaceChildren(photo(photos[selected],description));
    featured.setAttribute('aria-label',`Perbesar ${description}`);
    [...thumbnails.children].forEach((button,i) => button.setAttribute('aria-pressed',String(i === selected)));
    full.src = photos[selected];full.alt = description;
    document.querySelector('#gallery-caption').textContent = description;
  }
  function open(index) {select(index);viewer.showModal();document.body.classList.add('gallery-open');}
  photos.forEach((src,index) => {
    for (const [container,isThumbnail] of [[thumbnails,true],[collage,false]]) {
      const button = document.createElement('button');button.type = 'button';
      button.setAttribute('aria-label',`${isThumbnail ? 'Pilih' : 'Perbesar'} foto ${index+1}`);
      button.append(photo(src,`Kenangan mempelai · Foto ${index+1}`));
      button.addEventListener('click',() => isThumbnail ? select(index) : open(index));
      container.append(button);
    }
  });
  document.querySelector('#gallery-empty').hidden = true;featured.hidden = false;select(0);
  featured.addEventListener('click',() => open(selected));
  document.querySelector('#gallery-close').addEventListener('click',() => viewer.close());
  document.querySelector('#gallery-previous').addEventListener('click',() => select(selected-1));
  document.querySelector('#gallery-next').addEventListener('click',() => select(selected+1));
  for (const id of ['gallery-previous','gallery-next']) document.querySelector(`#${id}`).disabled = photos.length === 1;
  viewer.addEventListener('keydown',event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault();select(selected+(event.key === 'ArrowLeft' ? -1 : 1));}
  });
  viewer.addEventListener('click',event => {if (event.target === viewer) viewer.close();});
  viewer.addEventListener('close',() => document.body.classList.remove('gallery-open'));
}
function label(playing) {
const text = playing ? 'Jeda musik' : 'Putar musik';
  music.title = text;music.setAttribute('aria-label',text);music.setAttribute('aria-pressed',String(playing));
}
function playMusic() {
  playAudio(audio,() => {
    music.title = 'Lagu belum dapat diputar. Tekan untuk mencoba lagi.';
    music.setAttribute('aria-label',music.title);
    music.setAttribute('aria-pressed','false');
  });
}
const responseForm = document.querySelector('#response-form');
const responseStatus = document.querySelector('#response-status');
const moreWishes = document.querySelector('#more-wishes');
let wishesPage = 0;
let wishesRequest = 0;
function attendanceChanged() {
  const attending = responseForm.elements.attendance.value === 'attending';
  document.querySelector('#guest-count-field').hidden = !attending;
  responseForm.elements.guestCount.disabled = !attending;
}
responseForm.elements.attendance.addEventListener('change',attendanceChanged);
responseForm.addEventListener('submit',async event => {
  event.preventDefault();
  const button = responseForm.querySelector('button');button.disabled = true;
  document.querySelector('#response-fields').disabled = true;
  responseStatus.classList.remove('error');responseStatus.textContent = 'Menyimpan…';
  try {
    const attendance = responseForm.elements.attendance.value;
    const response = await fetch(`/api/response?${scope}`,{method:'PUT',headers:{'Content-Type':'application/json','X-Invitation-Token':responseToken},body:JSON.stringify({attendance,guestCount:attendance === 'attending' ? Number(responseForm.elements.guestCount.value) : 0,message:responseForm.elements.message.value})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Konfirmasi belum tersimpan. Silakan coba lagi.');
    responseForm.elements.message.value = result.message;
    responseStatus.textContent = 'Terima kasih. Konfirmasi kehadiran sudah kami terima.';
    await loadWishes(true);
  } catch (error) {
    responseStatus.classList.add('error');responseStatus.textContent = error.message;
  } finally {document.querySelector('#response-fields').disabled = false;button.disabled = false;}
});
async function loadWishes(reset = false) {
  const request = ++wishesRequest;
  const list = document.querySelector('#wishes-list');const status = document.querySelector('#wishes-status');
  moreWishes.disabled = true;status.textContent = 'Memuat ucapan…';
  if (reset) {wishesPage = 0;list.replaceChildren();}
  try {
    const response = await fetch(`/api/wishes?page=${wishesPage+1}&${scope}`);
    const result = await response.json();
    if (request !== wishesRequest) return;
    if (!response.ok) throw new Error(result.error || 'Ucapan belum dapat dimuat.');
    for (const wish of result.wishes) {
      const card = document.createElement('article');card.className = 'wish-card';
      const name = document.createElement('h4');name.textContent = wish.name;
      const message = document.createElement('p');message.textContent = wish.message;
      card.append(name,message);list.append(card);
    }
    wishesPage++;moreWishes.hidden = !result.hasMore;moreWishes.textContent = 'Lihat ucapan lainnya';
    status.textContent = list.children.length ? '' : 'Belum ada ucapan. Jadilah yang pertama menitipkan doa.';
  } catch (error) {if (request === wishesRequest) {status.textContent = error.message;moreWishes.hidden = false;moreWishes.textContent = 'Coba muat ucapan lagi';}}
  finally {if (request === wishesRequest) moreWishes.disabled = false;}
}
moreWishes.addEventListener('click',() => loadWishes());
music.addEventListener('click',() => {if (audio) audio.paused ? playMusic() : audio.pause();});
document.querySelector('#open-invitation').addEventListener('click',() => {if(audio?.paused) playMusic();});
load().catch(error => {
  responseStatus.textContent = 'Formulir belum dapat dimuat. Muat ulang halaman.';
  const message = document.createElement('p');message.className = 'content-error';message.setAttribute('role','alert');
  message.textContent = error.message;document.querySelector('.cover-copy').append(message);
});

