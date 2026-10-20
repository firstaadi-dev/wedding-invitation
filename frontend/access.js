const message = document.querySelector('#access-message');
const retry = document.querySelector('#retry');
const code = /^\/u\/([A-Za-z0-9_-]{27})$/.exec(location.pathname)?.[1];
const destination = code ? document.querySelector('meta[name="invitation-path"]')?.content || '/' : location.pathname;
let token = code || location.hash.slice(1);
// Strip credentials before importing the third-party agent, including on retries/reloads.
if (token) history.replaceState(null,'',destination+'?access=1');
const tokenKey = location.pathname === '/' ? 'invitation-token' : `invitation-token:${location.pathname}`;
if (token) {
  try {sessionStorage.setItem(tokenKey,token);} catch {}
} else {
  try {token = sessionStorage.getItem(tokenKey) || '';} catch {}
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
      try {await (await import('./identification.js')).identify();} catch (error) {console.warn('Fingerprint local test failed:',error.code || error.message);}
    }
    return;
  }
  message.textContent = 'Menyiapkan undangan Bapak/Ibu/Sdr/Sdri…';
  try {
    const challenge = await request('/api/access/challenge',{token});
    const {identify} = await import('./identification.js');
    const result = await identify(challenge.challenge);
    await request('/api/access/verify',{challenge:challenge.challenge,eventId:result.event_id});
    try {sessionStorage.removeItem(tokenKey);} catch {}
    location.replace(location.pathname);
  } catch (error) {
    message.textContent = error.message || 'Undangan belum dapat dibuka. Silakan coba kembali.';
    retry.hidden = false;
  }
}
retry.addEventListener('click',open);
open();
