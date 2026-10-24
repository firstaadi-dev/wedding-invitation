// This public browser key is safe to publish; the server key stays in environment only.
let fpPromise;
function agent() {
  if (!fpPromise) fpPromise = fetch('/api/identification/config').then(async response => {
  if (!response.ok) throw new Error('Undangan belum dapat dibuka. Silakan coba lagi nanti.');
  const {endpoint,publicKey,region} = await response.json();
  if (!publicKey || !['us','eu','ap'].includes(region)) throw new Error('Undangan belum dapat dibuka. Silakan coba lagi nanti.');
  const key = encodeURIComponent(publicKey);
  const source = endpoint ? `${endpoint}/web/v4/${key}` : `https://fpjscdn.net/v4/${key}`;
  const Fingerprint = await import(source);
  const agent = Fingerprint.start({region, ...(endpoint ? {endpoints: [endpoint]} : {})});
  return new Promise(resolve => setTimeout(() => resolve(agent), 1000));
  }).catch(error => {fpPromise = undefined; throw error;});
  return fpPromise;
}

export async function identify(linkedId) {
  const fingerprint = await agent();
  const result = await fingerprint.get(linkedId ? {linkedId} : {});
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
    console.info('Fingerprint identification:', result.event_id, result.visitor_id);
  }
  return result;
}
