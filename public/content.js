import {countdownParts} from './countdown.js';
const music = document.querySelector('.music-status');
if (location.hash) location.replace(`/?access=1${location.hash}`);
let audio;
async function load() {
  const response = await fetch('/api/invitation');
  if (response.status === 401) {location.replace('/');return;}
  if (!response.ok) throw new Error('Konten belum dapat dimuat. Muat ulang halaman.');
  const {guestName,settings,media} = await response.json();
  document.querySelector('#guest-name').textContent = guestName;
  for (const [key,fallback] of [['ceremonyTitle','Prosesi Pernikahan'],['receptionTitle','Resepsi']]) {
    document.querySelector(key === 'ceremonyTitle' ? '#ceremony-title' : '#reception-title').textContent = settings[key] || fallback;
  }
  const times = document.querySelectorAll('.pending-time');
  times[0].textContent = settings.ceremonyTime || 'Waktu akan diinformasikan';
  times[1].textContent = settings.receptionTime || 'Waktu akan diinformasikan';
  startCountdown(settings.countdownTime || '00:00');
  const frames = document.querySelectorAll('.couple-grid .photo-placeholder');
  ['groom','bride'].forEach((slot,index) => {
    if (!media[slot]) return;
    frames[index].replaceChildren(photo(media[slot],['Firsta Adi Pradana','Talitha Syahda Arundatie'][index]));
    frames[index].classList.add('has-photo');
  });
  renderGallery(media);
  if (settings.mapEmbedUrl) {
    const frame = document.createElement('iframe');
    frame.src = settings.mapEmbedUrl;frame.title = 'Lokasi Arjuna Ballroom Alam Indah Resto';
    frame.loading = 'lazy';frame.referrerPolicy = 'strict-origin-when-cross-origin';frame.allowFullscreen = true;
    document.querySelector('.map-placeholder').replaceWith(frame);
  }
  if (media.music) {
    audio = new Audio(media.music);audio.loop = true;audio.preload = 'none';
    music.disabled = false;music.classList.add('has-music');
    music.setAttribute('aria-pressed','false');label(false);
    audio.addEventListener('play',() => label(true));audio.addEventListener('pause',() => label(false));
    audio.addEventListener('error',() => {music.disabled = true;music.title = 'Lagu belum dapat diputar';music.setAttribute('aria-label',music.title);});
  }
}
function photo(src,alt) {
  const image = document.createElement('img');
  image.src = src;image.alt = alt;image.loading = 'lazy';image.decoding = 'async';
  return image;
}
function startCountdown(time) {
  const target = Date.parse(`2026-11-22T${time}:00+07:00`);
  const numbers = document.querySelectorAll('.countdown-units strong');
  const update = () => {
    countdownParts(target).forEach((value,index) => {numbers[index].textContent = String(value).padStart(2,'0');});
    document.querySelector('#countdown-label').textContent = Date.now() >= target ? 'Hari bahagia telah tiba' : 'Menuju hari bahagia';
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
    const description = `Kenangan kami · Foto ${selected+1} dari ${photos.length}`;
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
      button.append(photo(src,`Kenangan kami · Foto ${index+1}`));
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
music.addEventListener('click',() => {if (audio) audio.paused ? audio.play().catch(() => label(false)) : audio.pause();});
document.querySelector('#open-invitation').addEventListener('click',() => {audio?.play().catch(() => label(false));});
load().catch(error => {
  const message = document.createElement('p');message.className = 'content-error';message.setAttribute('role','alert');
  message.textContent = error.message;document.querySelector('.cover-copy').append(message);
});
