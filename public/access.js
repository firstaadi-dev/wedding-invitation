import {identify} from './identification.js';
const message = document.querySelector('#access-message');
const retry = document.querySelector('#retry');
// Remove the secret fragment before the third-party agent can collect the page URL.
let token = location.hash.slice(1);
if (token) {
  history.replaceState(null,'',location.pathname);
  try {sessionStorage.setItem('invitation-token',token);} catch {}
} else {
  try {token = sessionStorage.getItem('invitation-token') || '';} catch {}
}
async function request(path,data) {
  const response = await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}
async function open() {
  retry.hidden = true;
  if (!token) {
    message.textContent = 'Silakan buka tautan undangan yang Bapak/Ibu/Sdr/Sdri terima.';
    if (['localhost','127.0.0.1'].includes(location.hostname)) {
      document.querySelector('.preview-link').hidden = false;
      try {await identify();} catch (error) {console.warn('Fingerprint local test failed:',error.code || error.message);}
    }
    return;
  }
  message.textContent = 'Menyiapkan undangan Bapak/Ibu/Sdr/Sdri…';
  try {
    const challenge = await request('/api/access/challenge',{token});
    const result = await identify(challenge.challenge);
    await request('/api/access/verify',{challenge:challenge.challenge,eventId:result.event_id});
    try {sessionStorage.removeItem('invitation-token');} catch {}
    location.replace('/');
  } catch (error) {
    message.textContent = error.message || 'Undangan belum dapat dibuka. Silakan coba kembali.';
    retry.hidden = false;
  }
}
retry.addEventListener('click',open);
open();
