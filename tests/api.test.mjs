import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,scryptSync} from 'node:crypto';
import {once} from 'node:events';
import {existsSync,readFileSync} from 'node:fs';
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
      const created = await adminRequest('/api/admin/guests',{method:'POST',data:{name:'Keluarga Uji <script>',phone:'0812-3456 7890'}});
      assert.equal(created.response.status,201);guest=created.value.guest;token=created.value.link.split('#')[1];
      assert.equal(token.length,43);
      const stored = (await pool.query('SELECT token_hash,invitation_link,phone FROM wedding.guests WHERE id=$1',[guest.id])).rows[0];
      assert.notEqual(stored.token_hash,token);assert.equal(stored.token_hash.length,64);
      assert.equal(stored.invitation_link,created.value.link);assert.equal(stored.phone,'6281234567890');
      const listed = await adminRequest('/api/admin/guests');assert.equal(listed.value.length,1);
      assert.equal(listed.value[0].link,created.value.link);assert.equal(listed.value[0].phone,stored.phone);
      assert.equal((await adminRequest('/api/admin/session')).response.status,200);
      assert.equal((await adminRequest('/api/admin/guests')).value[0].link,created.value.link);
      const renamed = await adminRequest(`/api/admin/guests/${guest.id}`,{method:'PATCH',data:{name:'Keluarga Uji'}});
      assert.equal(renamed.value.name,'Keluarga Uji');
      assert.equal(renamed.value.link,created.value.link);
      for (const phone of ['+62 (812) 3456-7890','6281234567890','081234567890']) {
        const edited = await adminRequest(`/api/admin/guests/${guest.id}`,{method:'PATCH',data:{phone}});
        assert.equal(edited.response.status,200);assert.equal(edited.value.phone,'6281234567890');assert.equal(edited.value.link,created.value.link);
      }
      assert.equal((await adminRequest(`/api/admin/guests/${guest.id}`,{method:'PATCH',data:{phone:''}})).value.phone,'');
      for (const phone of ['abc','123','+','()','+62&text=bad','1'.repeat(16),123,null]) {
        assert.equal((await adminRequest('/api/admin/guests',{method:'POST',data:{name:'Invalid phone',phone}})).response.status,400);
        assert.equal((await adminRequest(`/api/admin/guests/${guest.id}`,{method:'PATCH',data:{name:'Must roll back',phone}})).response.status,400);
      }
      assert.equal((await adminRequest('/api/admin/guests')).value[0].name,'Keluarga Uji');
      // Legacy rows keep their original hash and valid access; migration cannot recover the URL.
      await pool.query('UPDATE wedding.guests SET invitation_link=NULL WHERE id=$1',[guest.id]);
      await migrate(process.env.TEST_DATABASE_URL_UNPOOLED);
      assert.equal((await adminRequest('/api/admin/guests')).value[0].link,null);
      assert.equal((await pool.query('SELECT token_hash FROM wedding.guests WHERE id=$1',[guest.id])).rows[0].token_hash,stored.token_hash);
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
    await t.test('content, photo and MP3 uploads, authenticated media and range response',async () => {
      const saved = await adminRequest('/api/admin/content',{method:'PUT',data:{ceremonyTitle:' Akad ',receptionTitle:'Syukuran',countdownTime:'09:00',ceremonyTime:'09.00 WIB',mapEmbedUrl:'https://www.google.com/maps/embed?pb=test'}});
      assert.equal(saved.response.status,200);
      assert.equal(saved.value.settings.ceremonyTime,'09.00 WIB');
      assert.equal(saved.value.settings.ceremonyTitle,'Akad');
      assert.equal(saved.value.settings.receptionTitle,'Syukuran');
      assert.equal(saved.value.settings.countdownTime,'09:00');
      const {whatsappTemplate, ...publicSettings} = saved.value.settings;
      assert.ok(whatsappTemplate.includes('{link}'));
      assert.deepEqual((await request('/api/invitation',{jar:guestBrowser})).value.settings,publicSettings);
      for (const data of [{ceremonyTitle:'a'.repeat(81)},{receptionTitle:9},{countdownTime:'24:00'},{countdownTime:'09:60'},{countdownTime:900},{unknown:'Akad'}]) {
        assert.equal((await adminRequest('/api/admin/content',{method:'PUT',data})).response.status,400);
      }
      const partialSettings = await adminRequest('/api/admin/content',{method:'PUT',data:{receptionTime:'11.00–13.00 WIB'}});
      assert.equal(partialSettings.value.settings.ceremonyTitle,'Akad');
      assert.equal(partialSettings.value.settings.countdownTime,'09:00');
      const cleared = await adminRequest('/api/admin/content',{method:'PUT',data:{ceremonyTitle:'',countdownTime:''}});
      assert.equal(cleared.value.settings.ceremonyTitle,'');
      assert.equal(cleared.value.settings.countdownTime,'');
      assert.equal((await adminRequest('/api/admin/content',{method:'PUT',data:{mapEmbedUrl:'https://attacker.example/embed'}})).response.status,400);
      const photo = await sharp({create:{width:20,height:30,channels:3,background:'#183d32'}}).png().toBuffer();
      const response = await fetch(base+'/api/admin/media/groom',{method:'PUT',headers:{Origin:origin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'image/png'},body:photo});
      for (const slot of ['gallery1','gallery4','gallery9']) {
        const uploaded = await fetch(base+`/api/admin/media/${slot}`,{method:'PUT',headers:{Origin:origin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'image/png'},body:photo});
        assert.equal(uploaded.status,200);
        const path = (await uploaded.json()).media[slot];
        assert.equal((await request('/api/invitation',{jar:guestBrowser})).value.media[slot],path);
      }
      assert.equal((await adminRequest('/api/admin/media/gallery10',{method:'DELETE'})).response.status,404);
      assert.equal((await adminRequest('/api/admin/media/gallery4',{method:'DELETE'})).response.status,200);
      assert.equal((await request('/api/invitation',{jar:guestBrowser})).value.media.gallery4,undefined);
      assert.equal(response.status,200);const value = await response.json();const path = value.media.groom;
      assert.equal((await request(path)).response.status,401);
      const media = await fetch(base+path,{headers:{Cookie:`wedding_guest=${guestBrowser.wedding_guest}`}});
      assert.equal(media.status,200);assert.equal(media.headers.get('content-type'),'image/webp');
      const decoded = await sharp(Buffer.from(await media.arrayBuffer())).metadata();assert.equal(decoded.width,20);assert.equal(decoded.height,30);
      const partial = await fetch(base+path,{headers:{Cookie:`wedding_guest=${guestBrowser.wedding_guest}`,Range:'bytes=0-9'}});
      assert.equal(partial.status,206);assert.equal((await partial.arrayBuffer()).byteLength,10);
      const invalid = await fetch(base+'/api/admin/media/bride',{method:'PUT',headers:{Origin:origin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'image/png'},body:'<svg onload="evil()"></svg>'});
      assert.equal(invalid.status,415);
      const music = readFileSync(new URL('./fixtures/silence.mp3',import.meta.url));
      const musicHeaders = {Origin:origin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'audio/mpeg'};
      const uploaded = await fetch(base+'/api/admin/media/music',{method:'PUT',headers:musicHeaders,body:music});
      assert.equal(uploaded.status,200);const musicPath = (await uploaded.json()).media.music;
      assert.equal((await request(musicPath)).response.status,401);
      const downloaded = await fetch(base+musicPath,{headers:{Cookie:`wedding_guest=${guestBrowser.wedding_guest}`}});
      assert.equal(downloaded.headers.get('content-type'),'audio/mpeg');
      assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),music);
      assert.equal((await request('/api/invitation',{jar:guestBrowser})).value.media.music,musicPath);
      const invalidMusic = await fetch(base+'/api/admin/media/music',{method:'PUT',headers:musicHeaders,body:'not an MP3'});
      assert.equal(invalidMusic.status,415);
      assert.equal((await adminRequest('/api/admin/media/music',{method:'DELETE'})).response.status,200);
      assert.equal((await request('/api/invitation',{jar:guestBrowser})).value.media.music,undefined);
    });
    await t.test('global WhatsApp settings persist, stay private, and preview metadata is public and escaped',async () => {
      const template = 'Yth. {nama},\nUndangan Firsta & Talitha:\n{link}';
      const title = 'Firsta & Talitha <3 "Undangan"';
      const description = '22 November 2026 & keluarga';
      const saved = await adminRequest('/api/admin/content',{method:'PUT',data:{whatsappTemplate:template,linkPreviewTitle:title,linkPreviewDescription:description}});
      assert.equal(saved.response.status,200);assert.equal(saved.value.settings.whatsappTemplate,template);
      assert.equal((await adminRequest('/api/admin/content')).value.settings.whatsappTemplate,template);
      const invitation = await request('/api/invitation',{jar:guestBrowser});
      assert.equal(invitation.value.settings.whatsappTemplate,undefined);
      assert.equal(invitation.value.phone,undefined);assert.equal(invitation.value.link,undefined);
      for (const options of [{},{jar:guestBrowser}]) {
        const page = (await request('/',options)).value;
        assert.ok(page.includes('property="og:title" content="Firsta &amp; Talitha &lt;3 &quot;Undangan&quot;"'));
        assert.ok(page.includes('property="og:description" content="22 November 2026 &amp; keluarga"'));
        assert.equal(page.includes(template),false);assert.equal(page.includes(token),false);
      }
      for (const data of [{whatsappTemplate:''},{whatsappTemplate:123},{whatsappTemplate:'No link'},{whatsappTemplate:'{link} {unknown}'},{whatsappTemplate:'x'.repeat(4000)+'{link}'},{linkPreviewTitle:'x'.repeat(121)},{linkPreviewTitle:null},{linkPreviewDescription:'x'.repeat(301)}]) {
        assert.equal((await adminRequest('/api/admin/content',{method:'PUT',data})).response.status,400);
      }
      const partial = await adminRequest('/api/admin/content',{method:'PUT',data:{receptionTitle:'Resepsi'}});
      assert.equal(partial.value.settings.whatsappTemplate,template);
      const cleared = await adminRequest('/api/admin/content',{method:'PUT',data:{linkPreviewTitle:'',linkPreviewDescription:''}});
      assert.equal(cleared.response.status,200);
      assert.ok((await request('/')).value.includes('property="og:title" content="Firsta &amp; Talitha — Undangan"'));
    });
    await t.test('preview thumbnails are public JPEGs, replace safely, and cannot expose private media',async () => {
      const photo = await sharp({create:{width:60,height:90,channels:4,background:'#183d32'}}).png().toBuffer();
      const upload = data => fetch(base+'/api/admin/media/preview',{method:'PUT',headers:{Origin:origin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'image/png'},body:data});
      assert.equal((await fetch(base+'/api/admin/media/preview',{method:'PUT',headers:{Origin:origin,'Content-Type':'image/png'},body:photo})).status,401);
      const response = await upload(photo);assert.equal(response.status,200);
      const path = (await response.json()).media.preview;assert.match(path,/^\/preview-image\/[a-f0-9-]{36}$/);
      const image = await fetch(base+path);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/jpeg');
      const data = Buffer.from(await image.arrayBuffer());const metadata = await sharp(data).metadata();
      assert.equal(metadata.width,1200);assert.equal(metadata.height,630);assert.equal(metadata.format,'jpeg');
      const head = await fetch(base+path,{method:'HEAD'});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),data.length);assert.equal((await head.arrayBuffer()).byteLength,0);
      const range = await fetch(base+path,{headers:{Range:'bytes=0-9'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,10);
      for (const options of [{},{jar:guestBrowser}]) {
        const page = (await request('/',options)).value;
        assert.ok(page.includes(`property="og:image" content="${origin}${path}"`));
        assert.ok(page.includes('property="og:image:width" content="1200"'));
        assert.ok(page.includes('property="og:image:height" content="630"'));
      }
      const privatePath = (await adminRequest('/api/admin/content')).value.media.groom;
      assert.equal((await fetch(base+privatePath)).status,401);
      assert.equal((await fetch(base+privatePath.replace('/media/','/preview-image/'))).status,404);
      assert.equal((await upload('<svg onload="evil()"></svg>')).status,415);
      assert.equal((await adminRequest('/api/admin/content')).value.media.preview,path);
      await migrate(process.env.TEST_DATABASE_URL_UNPOOLED);
      assert.equal((await adminRequest('/api/admin/content')).value.media.groom,privatePath);
      assert.equal((await adminRequest('/api/admin/content')).value.media.preview,path);
      const replaced = await upload(photo);assert.equal(replaced.status,200);
      const newPath = (await replaced.json()).media.preview;assert.notEqual(newPath,path);
      assert.equal((await fetch(base+path)).status,404);assert.equal((await fetch(base+newPath)).status,200);
      assert.equal((await adminRequest('/api/admin/media/preview',{method:'DELETE'})).response.status,200);
      assert.equal((await fetch(base+newPath)).status,404);
      assert.equal((await request('/')).value.includes('property="og:image"'),false);
      assert.equal((await fetch(base+privatePath)).status,401);
    });
    await t.test('reset, deactivate and link rotation revoke sessions immediately',async () => {
      assert.equal((await adminRequest(`/api/admin/guests/${guest.id}/devices`,{method:'DELETE'})).response.status,200);
      assert.equal((await request('/api/invitation',{jar:guestBrowser})).response.status,401);
      assert.equal((await adminRequest(`/api/admin/guests/${guest.id}`,{method:'PATCH',data:{active:false}})).value.active,0);
      assert.equal((await request('/api/access/challenge',{method:'POST',data:{token}})).response.status,404);
      await adminRequest(`/api/admin/guests/${guest.id}`,{method:'PATCH',data:{active:true}});
      const changed = await adminRequest(`/api/admin/guests/${guest.id}/link`,{method:'POST',data:{}});
      assert.equal(changed.response.status,200);assert.notEqual(changed.value.link.split('#')[1],token);
      assert.equal(changed.value.guest.link,changed.value.link);
      assert.equal((await adminRequest('/api/admin/guests')).value[0].link,changed.value.link);
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
