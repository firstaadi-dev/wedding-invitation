import {createServer} from 'node:http';
import {randomBytes, randomUUID, createHash, scrypt, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import sharp from 'sharp';
import {fingerprintEvent, verifiedVisitor} from './fingerprint.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
const fail = (status, code, message) => {throw Object.assign(new Error(message), {status, code});};
const publicDirectory = new URL('../public/', import.meta.url);

export function createApp(pool, config, getEvent = fingerprintEvent) {
  const origin = new URL(config.origin).origin;
  const production = config.production === true;
  let endpoint = '';
  if (config.endpoint) {
    const parsed = new URL(config.endpoint);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('Fingerprint endpoint must be an HTTPS origin.');
    endpoint = parsed.origin;
  }
  if (production && (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.passwordHash || '') || !origin.startsWith('https://'))) {
    throw new Error('Production needs HTTPS PUBLIC_ORIGIN and a valid ADMIN_PASSWORD_HASH.');
  }

  const server = createServer(async (req, res) => {
    const headers = {
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' https://fpjscdn.net; worker-src 'self' blob:; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self'; connect-src 'self' https://*.fpjs.io https://*.fingerprint.com https://fpjscdn.net; frame-src https://www.google.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    };
    if (production) headers['Strict-Transport-Security'] = 'max-age=31536000';
    if (endpoint) headers['Content-Security-Policy'] = headers['Content-Security-Policy']
      .replace("script-src 'self'",`script-src 'self' ${endpoint}`)
      .replace("connect-src 'self'",`connect-src 'self' ${endpoint}`);
    for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);

    function json(status, data) {
      res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify(data));
    }
    const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(part => {
      const index = part.indexOf('=');
      return [part.slice(0,index).trim(), part.slice(index+1)];
    }));
    function cookie(name, value, seconds) {
      res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${production ? '; Secure' : ''}`);
    }
    async function body(limit = 8192, binary = false) {
      if (!binary && req.headers['content-type']?.split(';')[0] !== 'application/json') fail(415,'content_type','Gunakan Content-Type application/json.');
      if (Number(req.headers['content-length']) > limit) fail(413,'body_too_large','File terlalu besar.');
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > limit) fail(413,'body_too_large','File terlalu besar.');
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      if (binary) return buffer;
      let value;
      try {value = JSON.parse(buffer.toString());} catch {fail(400,'invalid_json','Data tidak valid.');}
      if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400,'invalid_json','Data tidak valid.');
      return value;
    }
    function only(value, keys) {
      if (Object.keys(value).some(key => !keys.includes(key))) fail(400,'invalid_field','Kolom tidak dikenal.');
    }
    function sameOrigin() {
      if (req.headers.origin !== origin) fail(403,'origin','Permintaan harus berasal dari situs undangan.');
    }
    async function session(admin = false) {
      const token = cookies[admin ? 'wedding_admin' : 'wedding_guest'];
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      const {rows} = await pool.query(`SELECT s.*, g.name FROM wedding.sessions s LEFT JOIN wedding.guests g ON g.id=s.guest_id
        WHERE s.token_hash=$1 AND s.expires_at>now() AND
        (($2 AND s.guest_id IS NULL) OR (NOT $2 AND g.active=1 AND g.version=s.version))`, [hash(token),admin]);
      return rows[0] || null;
    }
    async function authorized(admin = false, mutation = false) {
      const current = await session(admin);
      if (!current) fail(401,'unauthorized','Silakan masuk kembali.');
      if (mutation && req.headers['x-csrf-token'] !== current.csrf) fail(403,'csrf','Sesi berubah. Muat ulang halaman.');
      return current;
    }
    async function limited(action, maximum, seconds = 60) {
      // Render appends the verified client IP; direct local requests use the socket address.
      const ip = production && process.env.RENDER ? req.headers['x-forwarded-for']?.split(',').at(-1)?.trim() : req.socket.remoteAddress;
      const key = hash(`${action}:${ip || 'unknown'}`);
      const {rows} = await pool.query(`INSERT INTO wedding.rate_limits(key,hits,expires_at) VALUES($1,1,now()+$2*interval '1 second')
        ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.hits+1 END,
        expires_at=CASE WHEN rate_limits.expires_at<now() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END RETURNING hits`, [key,seconds]);
      if (rows[0].hits > maximum) {res.setHeader('Retry-After',String(seconds)); fail(429,'rate_limit','Terlalu banyak percobaan. Silakan tunggu sebentar.');}
    }
    async function transaction(fn) {
      const client = await pool.connect();
      try {await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result;}
      catch (error) {await client.query('ROLLBACK'); throw error;}
      finally {client.release();}
    }
    async function content(client = pool) {
      const settings = (await client.query('SELECT value FROM wedding.settings WHERE id=1')).rows[0].value;
      const media = Object.fromEntries((await client.query('SELECT slot,id FROM wedding.media')).rows.map(row => [row.slot,`/media/${row.id}`]));
      return {settings,media};
    }
    const guestSelect = `SELECT g.id,g.name,g.active,(EXTRACT(EPOCH FROM g.created_at)*1000)::float8 AS "createdAt",
      (SELECT count(*)::integer FROM wedding.devices d WHERE d.guest_id=g.id) AS "deviceCount" FROM wedding.guests g`;
    async function guest(id, client = pool) {
      return (await client.query(`${guestSelect} WHERE g.id=$1`,[id])).rows[0];
    }
    async function revoke(client,id,clearDevices = false) {
      await client.query('UPDATE wedding.guests SET version=version+1 WHERE id=$1',[id]);
      await client.query('DELETE FROM wedding.sessions WHERE guest_id=$1',[id]);
      await client.query('DELETE FROM wedding.challenges WHERE guest_id=$1',[id]);
      if (clearDevices) await client.query('DELETE FROM wedding.devices WHERE guest_id=$1',[id]);
    }

    try {
      const url = new URL(req.url, origin);
      const path = decodeURIComponent(url.pathname);
      const method = req.method;
      if (!['GET','HEAD','POST','PUT','PATCH','DELETE'].includes(method)) fail(405,'method','Metode tidak didukung.');
      if (path.startsWith('/api/') && !['GET','HEAD'].includes(method)) sameOrigin();
      if (production && process.env.RENDER && ['/', '/index.html', '/admin', '/preview'].includes(path) && req.headers.host !== new URL(origin).host) {
        res.writeHead(302,{Location:`${origin}${url.pathname}${url.search}`});return res.end();
      }

      if (path === '/api/identification/config' && method === 'GET') return json(200,{endpoint,region:'ap'});

      if (path === '/healthz' && method === 'GET') {
        await pool.query('SELECT 1'); return json(200,{ok:true});
      }
      if (path === '/api/admin/login' && method === 'POST') {
        await limited('login',8,900);
        const value = await body(); only(value,['password']);
        if (typeof value.password !== 'string' || value.password.length > 1024) fail(400,'password','Password tidak valid.');
        if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.passwordHash || '')) fail(503,'admin_unconfigured','Password admin belum dikonfigurasi.');
        const [salt, expected] = config.passwordHash.split(':');
        const actual = await promisify(scrypt)(value.password,salt,64);
        if (!timingSafeEqual(actual,Buffer.from(expected,'hex'))) fail(401,'invalid_login','Password tidak sesuai.');
        const token = secret(); const csrf = secret();
        await pool.query(`INSERT INTO wedding.sessions(token_hash,csrf,expires_at) VALUES($1,$2,now()+interval '8 hours')`,[hash(token),csrf]);
        cookie('wedding_admin',token,28800); return json(200,{csrf});
      }
      if (path.startsWith('/api/admin/')) {
        const current = await authorized(true,!['GET','HEAD'].includes(method));
        await limited('admin',120);
        if (path === '/api/admin/session' && method === 'GET') return json(200,{csrf:current.csrf});
        if (path === '/api/admin/logout' && method === 'POST') {
          await pool.query('DELETE FROM wedding.sessions WHERE token_hash=$1',[current.token_hash]);
          cookie('wedding_admin','',0); return json(200,{ok:true});
        }
        if (path === '/api/admin/guests') {
          if (method === 'GET') return json(200,(await pool.query(`${guestSelect} ORDER BY g.created_at DESC`)).rows);
          if (method === 'POST') {
            const value = await body(); only(value,['name']);
            const name = validName(value.name); const id = randomUUID(); const token = secret();
            await pool.query('INSERT INTO wedding.guests(id,name,token_hash) VALUES($1,$2,$3)',[id,name,hash(token)]);
            return json(201,{guest:await guest(id),link:`${origin}/#${token}`});
          }
        }
        const match = path.match(/^\/api\/admin\/guests\/([a-f0-9-]{36})(?:\/(link|devices))?$/);
        if (match) {
          const [,id,action] = match;
          const result = await transaction(async client => {
            if (!(await client.query('SELECT id FROM wedding.guests WHERE id=$1 FOR UPDATE',[id])).rowCount) fail(404,'guest_not_found','Tamu tidak ditemukan.');
            if (!action && method === 'PATCH') {
              const value = await body(); only(value,['name','active']);
              if (!Object.keys(value).length) fail(400,'invalid_field','Isi nama atau status.');
              if (value.name !== undefined) await client.query('UPDATE wedding.guests SET name=$2 WHERE id=$1',[id,validName(value.name)]);
              if (value.active !== undefined) {
                if (typeof value.active !== 'boolean') fail(400,'active','Status tidak valid.');
                await client.query('UPDATE wedding.guests SET active=$2 WHERE id=$1',[id,Number(value.active)]);
                if (!value.active) await revoke(client,id);
              }
              return guest(id,client);
            }
            if (!action && method === 'DELETE') {await client.query('DELETE FROM wedding.guests WHERE id=$1',[id]);return {ok:true};}
            if (action === 'devices' && method === 'DELETE') {await revoke(client,id,true);return {ok:true};}
            if (action === 'link' && method === 'POST') {
              const token = secret(); await revoke(client,id,true);
              await client.query('UPDATE wedding.guests SET token_hash=$2 WHERE id=$1',[id,hash(token)]);
              return {guest:await guest(id,client),link:`${origin}/#${token}`};
            }
            fail(404,'not_found','Halaman tidak ditemukan.');
          });
          return json(200,result);
        }
        if (path === '/api/admin/content') {
          if (method === 'GET') return json(200,await content());
          if (method === 'PUT') {
            const value = await body(); only(value,['ceremonyTitle','receptionTitle','ceremonyTime','receptionTime','countdownTime','mapEmbedUrl']);
            for (const key of ['ceremonyTime','receptionTime']) if (value[key] !== undefined && (typeof value[key] !== 'string' || value[key].length > 80)) fail(400,'time','Waktu tidak valid.');
            for (const key of ['ceremonyTitle','receptionTitle']) {
              if (value[key] === undefined) continue;
              if (typeof value[key] !== 'string' || value[key].length > 80) fail(400,'event_title','Nama acara maksimal 80 karakter.');
              value[key] = value[key].trim();
            }
            if (value.countdownTime !== undefined && (typeof value.countdownTime !== 'string' || !/^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$/.test(value.countdownTime))) fail(400,'countdown_time','Jam countdown tidak valid. Gunakan HH:mm dalam WIB.');
            if (value.mapEmbedUrl !== undefined && !validMap(value.mapEmbedUrl)) fail(400,'map_url','Gunakan URL embed resmi Google Maps.');
            await pool.query('UPDATE wedding.settings SET value=value || $1::jsonb WHERE id=1',[JSON.stringify(value)]);
            return json(200,await content());
          }
        }
        const mediaMatch = path.match(/^\/api\/admin\/media\/(groom|bride|gallery[1-9]|music)$/);
        if (mediaMatch && ['PUT','DELETE'].includes(method)) {
          const slot = mediaMatch[1];
          if (method === 'DELETE') await pool.query('DELETE FROM wedding.media WHERE slot=$1',[slot]);
          else {
            let data = await body((slot === 'music' ? 25 : 12)*1024*1024,true);
            let mime;
            if (slot === 'music') {
              if (req.headers['content-type'] !== 'audio/mpeg' || !validMp3(data)) fail(415,'media_type','Unggah lagu dalam format MP3.');
              mime = 'audio/mpeg';
            } else {
              if (!['image/jpeg','image/png','image/webp'].includes(req.headers['content-type'])) fail(415,'media_type','Gunakan JPG, PNG atau WebP.');
              try {
                const image = sharp(data,{limitInputPixels:40000000});
                const metadata = await image.metadata();
                if (!['jpeg','png','webp'].includes(metadata.format) || (metadata.pages || 1)>1) throw new Error();
                data = await image.rotate().resize(1800,1800,{fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
              } catch {fail(415,'invalid_image','Foto tidak dapat dibaca. Gunakan JPG, PNG atau WebP yang valid.');}
              mime = 'image/webp';
            }
            // shortcut: small media slots live in Postgres; move blobs to object storage for a large gallery.
            await pool.query(`INSERT INTO wedding.media(slot,id,mime,data) VALUES($1,$2,$3,$4)
              ON CONFLICT(slot) DO UPDATE SET id=EXCLUDED.id,mime=EXCLUDED.mime,data=EXCLUDED.data`,[slot,randomUUID(),mime,data]);
          }
          return json(200,await content());
        }
        fail(404,'not_found','Halaman tidak ditemukan.');
      }
      if (path === '/api/access/challenge' && method === 'POST') {
        await limited('challenge',30);
        if (!config.publicKey || !config.secretKey) fail(503,'verification_unavailable','Undangan belum tersedia. Silakan coba kembali nanti.');
        const value = await body(); only(value,['token']);
        if (typeof value.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value.token)) fail(404,'invalid_link','Tautan undangan tidak ditemukan atau sudah dinonaktifkan.');
        const id = secret(); const token = secret();
        await transaction(async client => {
          const g = (await client.query('SELECT * FROM wedding.guests WHERE token_hash=$1 AND active=1 FOR UPDATE',[hash(value.token)])).rows[0];
          if (!g) fail(404,'invalid_link','Tautan undangan tidak ditemukan atau sudah dinonaktifkan.');
          await client.query(`INSERT INTO wedding.challenges(id,cookie_hash,guest_id,version,expires_at) VALUES($1,$2,$3,$4,now()+interval '5 minutes')`,[id,hash(token),g.id,g.version]);
        });
        cookie('wedding_challenge',token,300);
        return json(200,{challenge:id,publicKey:config.publicKey,region:config.region});
      }
      if (path === '/api/access/verify' && method === 'POST') {
        await limited('verify',30);
        const value = await body(); only(value,['challenge','eventId']);
        if (typeof value.challenge !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value.challenge) || typeof value.eventId !== 'string' || !/^[a-zA-Z0-9._-]{1,100}$/.test(value.eventId)) fail(400,'verification','Data verifikasi tidak valid.');
        const challenge = (await pool.query('SELECT * FROM wedding.challenges WHERE id=$1 AND expires_at>now()',[value.challenge])).rows[0];
        if (!challenge || !cookies.wedding_challenge || challenge.cookie_hash !== hash(cookies.wedding_challenge)) fail(409,'challenge_expired','Verifikasi kedaluwarsa. Muat ulang tautan undangan.');
        const visitor = verifiedVisitor(await getEvent(value.eventId,config),value.eventId,value.challenge,origin);
        const token = secret();
        await transaction(async client => {
          const g = (await client.query('SELECT * FROM wedding.guests WHERE id=$1 FOR UPDATE',[challenge.guest_id])).rows[0];
          const c = (await client.query('SELECT * FROM wedding.challenges WHERE id=$1 AND expires_at>now() FOR UPDATE',[value.challenge])).rows[0];
          if (!g || !g.active || g.version !== challenge.version) fail(404,'revoked','Tautan sudah dinonaktifkan.');
          if (!c) fail(409,'challenge_expired','Verifikasi sudah digunakan. Muat ulang tautan undangan.');
          const used = await client.query('INSERT INTO wedding.used_events(event_hash) VALUES($1) ON CONFLICT DO NOTHING',[hash(value.eventId)]);
          if (!used.rowCount) fail(409,'replayed','Verifikasi sudah digunakan.');
          const vh = hash(visitor);
          const known = (await client.query('SELECT 1 FROM wedding.devices WHERE guest_id=$1 AND visitor_hash=$2',[g.id,vh])).rowCount;
          if (!known) {
            const count = Number((await client.query('SELECT count(*) FROM wedding.devices WHERE guest_id=$1',[g.id])).rows[0].count);
            if (count >= 3) fail(403,'device_limit','Undangan ini sudah dibuka pada tiga perangkat. Silakan hubungi pengundang untuk bantuan.');
            await client.query('INSERT INTO wedding.devices(guest_id,visitor_hash) VALUES($1,$2)',[g.id,vh]);
          }
          await client.query('DELETE FROM wedding.challenges WHERE id=$1',[value.challenge]);
          await client.query(`INSERT INTO wedding.sessions(token_hash,guest_id,version,expires_at) VALUES($1,$2,$3,now()+interval '30 days')`,[hash(token),g.id,g.version]);
        });
        cookie('wedding_guest',token,2592000); return json(200,{ok:true});
      }
      if (path === '/api/invitation' && method === 'GET') {
        const g = await session(); const a = !g && await session(true);
        if (!g && !a && production) fail(401,'unauthorized','Buka tautan undangan yang Bapak/Ibu/Sdr/Sdri terima.');
        return json(200,{guestName:g?.name || 'Tamu Undangan',...await content()});
      }
      if (path.startsWith('/media/') && ['GET','HEAD'].includes(method)) {
        if (!await session() && !await session(true)) fail(401,'unauthorized','Silakan buka undangan dahulu.');
        const id = path.slice(7);
        if (!/^[a-f0-9-]{36}$/.test(id)) fail(404,'media_not_found','Media tidak ditemukan.');
        const media = (await pool.query('SELECT mime,data FROM wedding.media WHERE id=$1',[id])).rows[0];
        if (!media) fail(404,'media_not_found','Media tidak ditemukan.');
        const size = media.data.length; let start = 0; let end = size-1; let status = 200;
        if (req.headers.range) {
          const range = req.headers.range.match(/^bytes=(\d*)-(\d*)$/);
          if (!range || (!range[1] && !range[2])) fail(416,'range','Rentang tidak valid.');
          start = range[1] ? Number(range[1]) : Math.max(0,size-Number(range[2]));
          end = range[1] && range[2] ? Math.min(size-1,Number(range[2])) : size-1;
          if (start > end || start >= size) {res.setHeader('Content-Range',`bytes */${size}`);fail(416,'range','Rentang tidak valid.');}
          res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);status = 206;
        }
        res.writeHead(status,{'Content-Type':media.mime,'Accept-Ranges':'bytes','Content-Length':end-start+1});
        return res.end(method === 'HEAD' ? undefined : media.data.subarray(start,end+1));
      }
      if (['GET','HEAD'].includes(method)) {
        let filename;
        if (path === '/' || path === '/index.html') filename = !url.searchParams.has('access') && (await session() || await session(true)) ? 'index.html' : 'access.html';
        else if (path === '/preview' && (!production || await session(true))) filename = 'index.html';
        else if (path === '/admin') filename = 'admin.html';
        else if (/^\/(?:assets\/[a-zA-Z0-9_-]+\.webp|(?:styles|admin|access)\.css|(?:invitation|content|countdown|admin|access|identification)\.js)$/.test(path)) filename = path.slice(1);
        if (filename) {
          const file = await readFile(new URL(filename,publicDirectory));
          const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp'}[extname(filename)];
          if (filename.startsWith('assets/')) res.setHeader('Cache-Control','public, max-age=86400');
          res.writeHead(200,{'Content-Type':mime,'Content-Length':file.length});return res.end(method === 'HEAD' ? undefined : file);
        }
      }
      fail(404,'not_found','Halaman tidak ditemukan.');
    } catch (error) {
      if (error.code === 'ENOENT') return json(404,{error:'Halaman tidak ditemukan.',code:'not_found'});
      if (!error.status) console.error('Request failed:',error.code || error.name);
      if (!res.headersSent) json(error.status || 500,{error:error.status ? error.message : 'Ada gangguan sementara. Silakan coba kembali.',code:error.status ? error.code : 'server_error'});
      else res.end();
    }
  });
  server.requestTimeout = 30000;
  return server;
}

function validName(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120 || /[\x00-\x1f]/.test(value)) fail(400,'name','Nama tamu harus berisi 1–120 karakter.');
  return value.trim();
}
function validMap(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || value.length > 4096) return false;
  try {const url = new URL(value);return url.origin === 'https://www.google.com' && url.pathname.startsWith('/maps/embed') && !url.username && !url.password;} catch {return false;}
}
function validMp3(data) {
  let offset = 0;
  if (data.subarray(0,3).toString() === 'ID3') {
    if (data.length < 10 || [...data.subarray(6,10)].some(value => value>127)) return false;
    offset = 10 + ((data[6]<<21)|(data[7]<<14)|(data[8]<<7)|data[9]);
  }
  for (let i=offset;i<Math.min(data.length-4,offset+4096);i++) {
    if (data[i] === 255 && (data[i+1]&224) === 224 && (data[i+1]&6) !== 0 &&
        (data[i+1]&24) !== 8 && (data[i+2]&240) !== 0 && (data[i+2]&240) !== 240 && (data[i+2]&12) !== 12) return true;
  }
  return false;
}
