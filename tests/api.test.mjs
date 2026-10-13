import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,scryptSync} from 'node:crypto';
import {once} from 'node:events';
import {existsSync} from 'node:fs';
import sharp from 'sharp';
import {database,migrate} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local');
if (!process.env.TEST_DATABASE_URL || !process.env.TEST_DATABASE_URL_UNPOOLED) throw new Error('Set TEST_DATABASE_URL and TEST_DATABASE_URL_UNPOOLED for an isolated test branch. Never use production.');

test('Neon-backed CMS and guest access end to end',async t => {
  await migrate(process.env.TEST_DATABASE_URL_UNPOOLED);
  const pool = database(process.env.TEST_DATABASE_URL);
  // Only disposable isolated-branch test data is cleared; production URLs are never used.
  await pool.query('TRUNCATE wedding.guests,wedding.devices,wedding.sessions,wedding.challenges,wedding.used_events,wedding.media,wedding.rate_limits CASCADE');
  await pool.query("UPDATE wedding.settings SET value='{}' WHERE id=1");
  const password = 'integration-test-password';const salt = randomBytes(16).toString('hex');
  const events = new Map();const origin = 'https://invitation.example';
  const endpoint = 'https://validator.firsta.my.id';
  const server = createApp(pool,{origin,production:true,passwordHash:`${salt}:${scryptSync(password,salt,64).toString('hex')}`,publicKey:'test',secretKey:'test',region:'ap',endpoint},async id => events.get(id));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const admin = {};
  let csrf;let guest;let token;let guestBrowser;
  async function request(path,{method='GET',data,jar={},headers={}} = {}) {
    const response = await fetch(base+path,{method,headers:{Origin:origin,...(Object.keys(jar).length ? {Cookie:Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; ')} : {}),...(data ? {'Content-Type':'application/json'} : {}),...headers},body:data ? JSON.stringify(data) : undefined});
    for (const cookie of response.headers.getSetCookie()) {const [key,value] = cookie.split(';')[0].split('=');jar[key]=value;}
    const type = response.headers.get('content-type');
    const value = type?.includes('json') ? await response.json() : await response.text();
    return {response,value,jar};
  }
  const adminRequest = (path,options={}) => request(path,{...options,jar:admin,headers:{'X-CSRF-Token':csrf,...options.headers}});
  async function challenge(linkToken = token) {
    const jar = {};const result = await request('/api/access/challenge',{method:'POST',data:{token:linkToken},jar});
    assert.equal(result.response.status,200);return {...result.value,jar};
  }
  async function verify(c,visitor,id=randomBytes(12).toString('hex')) {
    events.set(id,{event_id:id,linked_id:c.challenge,url:origin+'/',timestamp:Date.now(),identification:{visitor_id:visitor}});
    return request('/api/access/verify',{method:'POST',data:{challenge:c.challenge,eventId:id},jar:c.jar});
  }
  try {
    await t.test('database health, admin auth, private content and CSRF',async () => {
      assert.equal((await request('/healthz')).response.status,200);
      const config = await request('/api/identification/config');
      assert.deepEqual(config.value,{endpoint,region:'ap'});
      assert.match(config.response.headers.get('content-security-policy'),/script-src 'self' https:\/\/validator\.firsta\.my\.id/);
      assert.match(config.response.headers.get('content-security-policy'),/connect-src 'self' https:\/\/validator\.firsta\.my\.id/);
      assert.equal((await request('/api/admin/guests')).response.status,401);
      assert.equal((await request('/api/invitation')).response.status,401);
      assert.equal((await request('/')).value.includes('access-message'),true);
      const login = await request('/api/admin/login',{method:'POST',data:{password},jar:admin});
      assert.equal(login.response.status,200);csrf = login.value.csrf;
      assert.match(login.response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict.*Secure/);
      assert.equal((await request('/api/admin/guests',{method:'POST',data:{name:'Wrong'},jar:admin})).response.status,403);
      assert.equal((await adminRequest('/api/admin/guests',{method:'POST',data:{name:'Wrong'},headers:{Origin:'https://attacker.example'}})).response.status,403);
      assert.equal((await adminRequest('/api/admin/guests',{method:'POST',data:{name:' '}})).response.status,400);
    });
    await t.test('create guest secret link, persist and rename',async () => {
      const created = await adminRequest('/api/admin/guests',{method:'POST',data:{name:'Keluarga Uji <script>'}});
      assert.equal(created.response.status,201);guest=created.value.guest;token=created.value.link.split('#')[1];
      assert.equal(token.length,43);
      const stored = (await pool.query('SELECT token_hash FROM wedding.guests WHERE id=$1',[guest.id])).rows[0];
      assert.notEqual(stored.token_hash,token);assert.equal(stored.token_hash.length,64);
      const listed = await adminRequest('/api/admin/guests');assert.equal(listed.value.length,1);
      assert.equal(JSON.stringify(listed.value).includes(token),false);
      const renamed = await adminRequest(`/api/admin/guests/${guest.id}`,{method:'PATCH',data:{name:'Keluarga Uji'}});
      assert.equal(renamed.value.name,'Keluarga Uji');
    });
    await t.test('atomic max-three limit, repeat visitor and replay rejection',async () => {
      const challenges = [];
      for (let i=0;i<6;i++) challenges.push(await challenge());
      const results = await Promise.all(challenges.map((c,i)=>verify(c,`visitor-${i}`)));
      assert.equal(results.filter(r=>r.response.status===200).length,3);
      assert.equal(results.filter(r=>r.value.code==='device_limit').length,3);
      const index = results.findIndex(r=>r.response.status===200);guestBrowser = results[index].jar;
      assert.equal(Number((await pool.query('SELECT count(*) FROM wedding.devices WHERE guest_id=$1',[guest.id])).rows[0].count),3);
      const repeat = await verify(await challenge(),`visitor-${index}`);assert.equal(repeat.response.status,200);
      const reuse = challenges[index];assert.equal((await verify(reuse,`visitor-${index}`)).response.status,409);
      const invitation = await request('/api/invitation',{jar:guestBrowser});assert.equal(invitation.value.guestName,'Keluarga Uji');
      assert.equal((await request('/',{jar:guestBrowser})).value.includes('envelope-card'),true);
    });
    await t.test('content, real photo decoding, authenticated media and range response',async () => {
      const saved = await adminRequest('/api/admin/content',{method:'PUT',data:{ceremonyTime:'09.00 WIB',mapEmbedUrl:'https://www.google.com/maps/embed?pb=test'}});
      assert.equal(saved.value.settings.ceremonyTime,'09.00 WIB');
      assert.equal((await adminRequest('/api/admin/content',{method:'PUT',data:{mapEmbedUrl:'https://attacker.example/embed'}})).response.status,400);
      const photo = await sharp({create:{width:20,height:30,channels:3,background:'#183d32'}}).png().toBuffer();
      const response = await fetch(base+'/api/admin/media/groom',{method:'PUT',headers:{Origin:origin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'image/png'},body:photo});
      assert.equal(response.status,200);const value = await response.json();const path = value.media.groom;
      assert.equal((await request(path)).response.status,401);
      const media = await fetch(base+path,{headers:{Cookie:`wedding_guest=${guestBrowser.wedding_guest}`}});
      assert.equal(media.status,200);assert.equal(media.headers.get('content-type'),'image/webp');
      const decoded = await sharp(Buffer.from(await media.arrayBuffer())).metadata();assert.equal(decoded.width,20);assert.equal(decoded.height,30);
      const partial = await fetch(base+path,{headers:{Cookie:`wedding_guest=${guestBrowser.wedding_guest}`,Range:'bytes=0-9'}});
      assert.equal(partial.status,206);assert.equal((await partial.arrayBuffer()).byteLength,10);
      const invalid = await fetch(base+'/api/admin/media/bride',{method:'PUT',headers:{Origin:origin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'image/png'},body:'<svg onload="evil()"></svg>'});
      assert.equal(invalid.status,415);
    });
    await t.test('reset, deactivate and link rotation revoke sessions immediately',async () => {
      assert.equal((await adminRequest(`/api/admin/guests/${guest.id}/devices`,{method:'DELETE'})).response.status,200);
      assert.equal((await request('/api/invitation',{jar:guestBrowser})).response.status,401);
      assert.equal((await adminRequest(`/api/admin/guests/${guest.id}`,{method:'PATCH',data:{active:false}})).value.active,0);
      assert.equal((await request('/api/access/challenge',{method:'POST',data:{token}})).response.status,404);
      await adminRequest(`/api/admin/guests/${guest.id}`,{method:'PATCH',data:{active:true}});
      const changed = await adminRequest(`/api/admin/guests/${guest.id}/link`,{method:'POST',data:{}});
      assert.equal(changed.response.status,200);assert.notEqual(changed.value.link.split('#')[1],token);
      assert.equal((await request('/api/access/challenge',{method:'POST',data:{token}})).response.status,404);
      const c = await challenge(changed.value.link.split('#')[1]);const result=await verify(c,'visitor-new');assert.equal(result.response.status,200);
      await adminRequest(`/api/admin/guests/${guest.id}`,{method:'DELETE'});
      assert.equal((await request('/api/invitation',{jar:result.jar})).response.status,401);
      assert.equal((await pool.query('SELECT count(*) FROM wedding.devices')).rows[0].count,'0');
    });
    await t.test('logout invalidates server-side session',async () => {
      assert.equal((await adminRequest('/api/admin/logout',{method:'POST',data:{}})).response.status,200);
      assert.equal((await adminRequest('/api/admin/session')).response.status,401);
    });
  } finally {
    server.close();await once(server,'close');
    await pool.query('TRUNCATE wedding.guests,wedding.sessions,wedding.media,wedding.challenges,wedding.used_events,wedding.rate_limits CASCADE');
    await pool.query("UPDATE wedding.settings SET value='{}' WHERE id=1");
    await pool.end();
  }
});
