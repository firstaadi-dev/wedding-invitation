const music = document.querySelector('.music-status');
if (location.hash) location.replace(`/?access=1${location.hash}`);
let audio;
async function load() {
  const response = await fetch('/api/invitation');
  if (response.status === 401) {location.replace('/');return;}
  if (!response.ok) throw new Error('Konten belum dapat dimuat. Muat ulang halaman.');
  const {guestName,settings,media} = await response.json();
  document.querySelector('#guest-name').textContent = guestName;
  const times = document.querySelectorAll('.pending-time');
  times[0].textContent = settings.ceremonyTime || 'Waktu akan diinformasikan';
  times[1].textContent = settings.receptionTime || 'Waktu akan diinformasikan';
  const frames = [...document.querySelectorAll('.couple-grid .photo-placeholder'),...document.querySelectorAll('.gallery-paper .photo-placeholder')];
  ['groom','bride','gallery1','gallery2','gallery3'].forEach((slot,index) => {
    if (!media[slot]) return;
    const image = document.createElement('img');
    image.src = media[slot];image.alt = ['Firsta Adi Pradana','Talitha Syahda Arundatie','Kenangan kami','Bersama','Sebuah perjalanan'][index];
    image.loading = 'lazy';image.decoding = 'async';
    frames[index].replaceChildren(image);frames[index].classList.add('has-photo');
  });
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
