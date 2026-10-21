// This public browser key is safe to publish; the server key stays in environment only.
const fpPromise = fetch('/api/identification/config').then(async response => {
  if (!response.ok) throw new Error('Undangan belum dapat dibuka. Silakan coba lagi nanti.');
  const {endpoint} = await response.json();
  const source = endpoint ? `${endpoint}/web/v4/k3IGGzMGUOYb5FnccL4s` : 'https://fpjscdn.net/v4/k3IGGzMGUOYb5FnccL4s';
  const Fingerprint = await import(source);
  const agent = Fingerprint.start({region: 'ap', ...(endpoint ? {endpoints: [endpoint]} : {})});
  return new Promise(resolve => setTimeout(() => resolve(agent), 1000));
});

export async function identify(linkedId) {
  const agent = await fpPromise;
  const result = await agent.get(linkedId ? {linkedId} : {});
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
    console.info('Fingerprint identification:', result.event_id, result.visitor_id);
  }
  return result;
}
