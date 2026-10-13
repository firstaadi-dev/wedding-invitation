export async function fingerprintEvent(eventId, config) {
  const host = {us: 'api.fpjs.io', eu: 'eu.api.fpjs.io', ap: 'ap.api.fpjs.io'}[config.region];
  if (!host || !config.secretKey || !config.publicKey) {
    throw Object.assign(new Error('Verifikasi undangan belum tersedia. Silakan coba kembali nanti.'), {status: 503, code: 'verification_unavailable'});
  }
  let response;
  try {
    response = await fetch(`https://${host}/v4/events/${encodeURIComponent(eventId)}`, {
      headers: {Authorization: `Bearer ${config.secretKey}`, Accept: 'application/json'},
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw Object.assign(new Error('Koneksi verifikasi sedang terganggu. Silakan coba kembali.'), {status: 503, code: 'verification_unavailable'});
  }
  if (!response.ok) {
    throw Object.assign(new Error('Verifikasi belum berhasil. Silakan coba kembali.'), {
      status: response.status === 404 ? 403 : 503, code: 'verification_failed',
    });
  }
  return response.json();
}

export function verifiedVisitor(event, eventId, challenge, origin, now = Date.now()) {
  let eventOrigin;
  try {eventOrigin = new URL(event.url).origin;} catch {}
  const age = now - event.timestamp;
  if (event.event_id !== eventId || event.linked_id !== challenge || eventOrigin !== origin ||
      !Number.isFinite(age) || age < -10000 || age > 300000 ||
      typeof event.identification?.visitor_id !== 'string' || !event.identification.visitor_id ||
      event.identification.visitor_id.length > 200 || event.tampering === true ||
      event.replayed === true || event.bot === 'detected' || event.rule_action === 'deny') {
    throw Object.assign(new Error('Perangkat belum dapat diverifikasi. Silakan coba kembali.'), {status: 403, code: 'invalid_fingerprint'});
  }
  return event.identification.visitor_id;
}
