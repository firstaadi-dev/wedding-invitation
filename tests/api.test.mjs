import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,scryptSync,createHash} from 'node:crypto';
import {once} from 'node:events';
import {existsSync,readFileSync} from 'node:fs';
import sharp from 'sharp';
import {spawn} from 'node:child_process';
import {database,migrate,provisionAccount,command} from './support/db.mjs';
import {startBackend} from './support/server.mjs';
if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local');
if (!process.env.TEST_DATABASE_URL || !process.env.TEST_DATABASE_URL_UNPOOLED) throw new Error('Set TEST_DATABASE_URL and TEST_DATABASE_URL_UNPOOLED for an isolated test branch. Never use production.');

const uuidv7=/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

if(process.env.TEST_DATABASE_DISPOSABLE!=='1')throw new Error('Set TEST_DATABASE_DISPOSABLE=1 only for a disposable isolated database. Tests delete their data.');
for(const key of ['DATABASE_URL','DATABASE_URL_UNPOOLED'])if(process.env[key]&&[process.env.TEST_DATABASE_URL,process.env.TEST_DATABASE_URL_UNPOOLED].includes(process.env[key]))throw new Error('Test and application database URLs must be separate.');

test('legacy migration preserves invitation data, guest sessions and password; repeated runs do not reset credentials',async () => {
  const schema = `migration_${randomBytes(6).toString('hex')}`;
  const pool = database(process.env.TEST_DATABASE_URL_UNPOOLED);
  const salt = randomBytes(16).toString('hex');const passwordHash = `${salt}:${scryptSync('legacy-password',salt,64).toString('hex')}`;
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA ${schema}`);await client.query(`SET search_path TO ${schema}`);
    await client.query(readFileSync(new URL('../backend/db/schema.sql',import.meta.url),'utf8'));
    await client.query("INSERT INTO guests(id,name,token_hash,invitation_link) VALUES('legacy','Legacy Guest','old-token-hash','https://invitation.example/#old-link')");
    await client.query("INSERT INTO devices(guest_id,visitor_hash) VALUES('legacy','old-device')");
    await client.query("INSERT INTO responses(guest_id,attendance,guest_count,message) VALUES('legacy','attending',2,'Legacy wish')");
    await client.query("INSERT INTO media(slot,id,mime,data) VALUES('groom','old-media','image/webp',$1)",[Buffer.from('original image bytes')]);
    await client.query('UPDATE settings SET value=$1 WHERE id=1',[{ceremonyTime:'09:00',whatsappTemplate:'Legacy {link}'}]);
    await client.query("INSERT INTO sessions(token_hash,guest_id,version,csrf,expires_at) VALUES('guest-session','legacy',1,NULL,now()+interval '1 day'),('admin-session',NULL,NULL,'old-csrf',now()+interval '1 day')");
    await migrate(process.env.TEST_DATABASE_URL_UNPOOLED,schema,passwordHash);
    const tenant=(await client.query('SELECT id,owner_id FROM tenants')).rows[0];
    assert.match(tenant.id,uuidv7);assert.match(tenant.owner_id,uuidv7);
    assert.deepEqual((await client.query('SELECT tenant_id,name,token_hash,invitation_link FROM guests')).rows,[{tenant_id:tenant.id,name:'Legacy Guest',token_hash:'old-token-hash',invitation_link:'https://invitation.example/#old-link'}]);
    assert.equal((await client.query('SELECT visitor_hash FROM devices')).rows[0].visitor_hash,'old-device');
    assert.equal((await client.query('SELECT message FROM responses')).rows[0].message,'Legacy wish');
    assert.equal((await client.query('SELECT tenant_id,data FROM media')).rows[0].data.toString(),'original image bytes');
    assert.deepEqual((await client.query('SELECT value FROM settings')).rows[0].value,{ceremonyTime:'09:00',whatsappTemplate:'Legacy {link}'});
    assert.deepEqual((await client.query('SELECT token_hash FROM sessions')).rows,[{token_hash:'guest-session'}]);
    assert.equal((await client.query('SELECT email FROM accounts')).rows[0].email,'firstaadip16@gmail.com');
    await migrate(process.env.TEST_DATABASE_URL_UNPOOLED,schema,`${'a'.repeat(32)}:${'b'.repeat(128)}`);
    assert.equal((await client.query('SELECT password_hash FROM accounts')).rows[0].password_hash,passwordHash);
  } finally {
    await client.query('SET search_path TO public');await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);client.release();await pool.end();
  }
});

test('version-one upgrade assigns stable opaque IDs without changing existing ownership or links',async()=>{
  const schema=`upgrade_${randomBytes(6).toString('hex')}`;
  const pool=database(process.env.TEST_DATABASE_URL_UNPOOLED),client=await pool.connect();
  const passwordHash=`${'a'.repeat(32)}:${'b'.repeat(128)}`;
  try{
    await client.query(`CREATE SCHEMA ${schema}`);await client.query(`SET search_path TO ${schema}`);
    await client.query(readFileSync(new URL('../backend/db/schema.sql',import.meta.url),'utf8'));
    await client.query("SELECT set_config('weddinvita.legacy_password_hash',$1,false)",[passwordHash]);
    await client.query(readFileSync(new URL('../backend/db/001-multi-tenant.sql',import.meta.url),'utf8'));
    await client.query('CREATE TABLE schema_migrations(version integer PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now()); INSERT INTO schema_migrations(version) VALUES(1)');
    await client.query("INSERT INTO guests(id,name,token_hash,invitation_link,tenant_id) VALUES('existing','Existing Guest','hash','https://old.example/i/firsta-talitha#secret','firsta-talitha')");
    await migrate(process.env.TEST_DATABASE_URL_UNPOOLED,schema);
    const tenant=(await client.query('SELECT id,owner_id,slug,name,public_id FROM tenants')).rows[0];
    assert.match(tenant.public_id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    assert.match(tenant.id,uuidv7);assert.match(tenant.owner_id,uuidv7);
    assert.equal(tenant.slug,'firsta-talitha');assert.equal(tenant.name,'Firsta & Talitha');
    assert.equal((await client.query('SELECT invitation_link FROM guests')).rows[0].invitation_link,'https://old.example/i/firsta-talitha#secret');
    assert.equal((await client.query('SELECT password_hash FROM accounts')).rows[0].password_hash,passwordHash);
    await migrate(process.env.TEST_DATABASE_URL_UNPOOLED,schema);
    assert.deepEqual((await client.query('SELECT id,owner_id,slug,name,public_id FROM tenants')).rows[0],tenant);
    assert.deepEqual((await client.query('SELECT version FROM schema_migrations ORDER BY version')).rows,[{version:1},{version:2},{version:3}]);
  }finally{await client.query('SET search_path TO public');await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);client.release();await pool.end()}
});

test('version-two UUIDv7 migration preserves every reference and rolls back on failure',async()=>{
  const schema=`uuidv7_${randomBytes(6).toString('hex')}`;
  const pool=database(process.env.TEST_DATABASE_URL_UNPOOLED),client=await pool.connect();
  const passwordHash=`${'a'.repeat(32)}:${'b'.repeat(128)}`;
  const tables=['accounts','tenants','guests','settings','media','sessions','responses','devices','challenges','schema_migrations'];
  async function snapshot(){
    const result={};
    for(const table of tables)result[table]=(await client.query(`SELECT row_to_json(t) AS value FROM ${table} t`)).rows.map(r=>r.value).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return result;
  }
  try{
    await client.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}`);
    await client.query(readFileSync(new URL('../backend/db/schema.sql',import.meta.url),'utf8'));
    await client.query("SELECT set_config('weddinvita.legacy_password_hash',$1,false)",[passwordHash]);
    for(const file of ['001-multi-tenant.sql','002-public-invitation-id.sql'])await client.query(readFileSync(new URL('../backend/db/'+file,import.meta.url),'utf8'));
    await client.query('CREATE TABLE schema_migrations(version integer PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now()); INSERT INTO schema_migrations(version) VALUES(1),(2)');
    const secondAccount=randomUUID();
    await client.query("INSERT INTO accounts(id,email,password_hash,active) VALUES($1,'second@example.com',$2,false)",[secondAccount,passwordHash]);
    await client.query("INSERT INTO tenants(id,owner_id,slug,name) VALUES('second',$1,'second','Second')",[secondAccount]);
    await client.query("INSERT INTO settings(tenant_id,value) VALUES('second','{\"partnerOneName\":\"Preserved\"}')");
    for(const tenant of ['firsta-talitha','second']){
      await client.query("INSERT INTO guests(id,name,token_hash,invitation_link,tenant_id) VALUES($1,'Preserved Guest',$1,'https://old.example/#secret',$1)",[tenant]);
      await client.query("INSERT INTO media(slot,id,mime,data,tenant_id) VALUES('groom',$1,'image/webp',$2,$1)",[tenant,Buffer.from('original bytes')]);
      await client.query("INSERT INTO sessions(token_hash,account_id,tenant_id,csrf,expires_at) SELECT 'admin-'||slug,owner_id,id,'csrf',now()+interval '1 day' FROM tenants WHERE id=$1",[tenant]);
      await client.query("INSERT INTO sessions(token_hash,guest_id,version,expires_at) VALUES($1,$1,1,now()+interval '1 day')",[tenant]);
      await client.query("INSERT INTO responses(guest_id,attendance,guest_count,message) VALUES($1,'attending',2,'Preserved wish')",[tenant]);
      await client.query("INSERT INTO devices(guest_id,visitor_hash) VALUES($1,'visitor')",[tenant]);
      await client.query("INSERT INTO challenges(id,cookie_hash,guest_id,version,expires_at) VALUES($1,'cookie',$1,1,now()+interval '1 day')",[tenant]);
    }
    const before=await snapshot();
    await client.query("CREATE FUNCTION fail_ids() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture ID migration failure'; END $$; CREATE TRIGGER fail_ids BEFORE UPDATE ON media FOR EACH ROW EXECUTE FUNCTION fail_ids()");
    await assert.rejects(migrate(process.env.TEST_DATABASE_URL_UNPOOLED,schema),/fixture ID migration failure/);
    assert.deepEqual(await snapshot(),before);
    await client.query('DROP TRIGGER fail_ids ON media; DROP FUNCTION fail_ids()');
    await migrate(process.env.TEST_DATABASE_URL_UNPOOLED,schema);
    const tenants=(await client.query('SELECT id,owner_id,slug FROM tenants')).rows;
    const tenantMap=Object.fromEntries(tenants.map(t=>[t.slug,t.id]));
    const accountMap=Object.fromEntries(tenants.map(t=>[t.slug==='second'?secondAccount:'firsta',t.owner_id]));
    for(const t of tenants){assert.match(t.id,uuidv7);assert.match(t.owner_id,uuidv7)}
    const after=await snapshot();
    for(const table of tables.filter(t=>t!=='schema_migrations')){
      const expected=before[table].map(r=>({...r}));
      for(const r of expected){
        if(table==='accounts')r.id=accountMap[r.id];
        if(table==='tenants'){r.id=tenantMap[r.id];r.owner_id=accountMap[r.owner_id]}
        if(r.tenant_id)r.tenant_id=tenantMap[r.tenant_id];
        if(r.account_id)r.account_id=accountMap[r.account_id];
      }
      assert.deepEqual(after[table],expected.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),table);
    }
    const columns=(await client.query("SELECT data_type FROM information_schema.columns WHERE table_schema=$1 AND ((table_name='accounts' AND column_name='id') OR (table_name='tenants' AND column_name IN ('id','owner_id')) OR column_name IN ('tenant_id','account_id'))",[schema])).rows;
    assert.equal(columns.length,8);assert.ok(columns.every(c=>c.data_type==='uuid'));
    await assert.rejects(client.query("INSERT INTO sessions(token_hash,account_id,tenant_id,csrf,expires_at) VALUES('wrong',$1,$2,'csrf',now()+interval '1 day')",[accountMap.firsta,tenantMap.second]),e=>e.code==='23503');
    await assert.rejects(client.query("INSERT INTO guests(id,name,token_hash,tenant_id) VALUES('orphan','Orphan','orphan',$1)",[randomUUID()]),e=>e.code==='23503');
    await migrate(process.env.TEST_DATABASE_URL_UNPOOLED,schema);
    assert.deepEqual(await snapshot(),after);
  }finally{await client.query('SET search_path TO public');await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);client.release();await pool.end()}
});

test('Neon-backed CMS and guest access end to end',async t => {
  const password = 'integration-test-password';const salt = randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${scryptSync(password,salt,64).toString('hex')}`;
  await migrate(process.env.TEST_DATABASE_URL_UNPOOLED,'wedding',passwordHash);
  const pool = database(process.env.TEST_DATABASE_URL);
  // Only disposable isolated-branch test data is cleared; production URLs are never used.
  await pool.query('TRUNCATE wedding.guests,wedding.devices,wedding.sessions,wedding.challenges,wedding.used_events,wedding.media,wedding.rate_limits CASCADE');
  const tenantId=(await pool.query("SELECT id FROM wedding.tenants WHERE slug='firsta-talitha'")).rows[0].id;
  await pool.query("UPDATE wedding.settings SET value='{}' WHERE tenant_id=$1",[tenantId]);
  await pool.query('UPDATE wedding.accounts SET password_hash=$1 WHERE email=$2',[passwordHash,'firstaadip16@gmail.com']);
  const email = 'firstaadip16@gmail.com';
  const origin = 'https://invitation.example';
  const cmsOrigin = 'https://dashboard.example';
  const endpoint = 'https://validator.firsta.my.id';
  const {server,base,events} = await startBackend({origin,cmsOrigin,endpoint});
  const admin = {};
  let csrf;let guest;let token;let guestBrowser;let guestVisitor;let invitationId;
  async function request(path,{method='GET',data,jar={},headers={}} = {}) {
    const response = await fetch(base+path,{method,headers:{Origin:path.startsWith('/api/admin/') ? cmsOrigin : origin,...(Object.keys(jar).length ? {Cookie:Object.entries(jar).map(([k,v])=>`${k}=${v}`).join('; ')} : {}),...(data ? {'Content-Type':'application/json'} : {}),...headers},body:data ? JSON.stringify(data) : undefined});
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
    await events.set(id,{event_id:id,linked_id:c.challenge,url:origin+'/',timestamp:Date.now(),identification:{visitor_id:visitor}});
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
      const login = await request('/api/admin/login',{method:'POST',data:{email,password},jar:admin});
      assert.equal(login.response.status,200);csrf = login.value.csrf;invitationId=login.value.account.tenant.publicId;
      assert.match(invitationId,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
      assert.equal(login.value.account.invitationOrigin,origin);
      assert.doesNotMatch(login.response.headers.get('set-cookie'),/Domain=/i);
      assert.equal((await request('/api/admin/login',{method:'POST',data:{email,password},headers:{Origin:origin}})).response.status,403);
      assert.equal((await request('/api/access/challenge',{method:'POST',data:{token:'x'.repeat(43)},headers:{Origin:cmsOrigin}})).response.status,403);
      assert.match(login.response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict.*Secure/);
      assert.equal((await request('/api/admin/guests',{method:'POST',data:{name:'Wrong'},jar:admin})).response.status,403);
      assert.equal((await adminRequest('/api/admin/guests',{method:'POST',data:{name:'Wrong'},headers:{Origin:'https://attacker.example'}})).response.status,403);
      assert.equal((await adminRequest('/api/admin/guests',{method:'POST',data:{name:' '}})).response.status,400);
    });
    await t.test('legacy root links and existing guest sessions remain usable',async()=>{
      const id=randomUUID(),legacyToken=randomBytes(32).toString('base64url'),sessionToken=randomBytes(32).toString('base64url');
      const hash=value=>createHash('sha256').update(value).digest('hex');
      await pool.query("INSERT INTO wedding.guests(id,name,token_hash,invitation_link,tenant_id) VALUES($1,'Legacy Guest',$2,$3,$4)",[id,hash(legacyToken),`${origin}/#${legacyToken}`,tenantId]);
      await pool.query("INSERT INTO wedding.sessions(token_hash,guest_id,version,expires_at) VALUES($1,$2,1,now()+interval '1 day')",[hash(sessionToken),id]);
      const jar={wedding_guest:sessionToken};
      assert.equal((await request('/api/invitation',{jar})).value.guestName,'Legacy Guest');
      assert.match((await request('/',{jar})).value,/id="response-form"/);
      const c=await challenge(legacyToken);assert.equal((await verify(c,'legacy-visitor')).response.status,200);
      await pool.query('DELETE FROM wedding.guests WHERE id=$1',[id]);
    });
    await t.test('stored readable links are shown canonically without revoking their secret',async()=>{
      const id=randomUUID(),legacyToken=randomBytes(32).toString('base64url');
      const legacy=`https://old-domain.example/i/firsta-talitha#${legacyToken}`;
      await pool.query("INSERT INTO wedding.guests(id,name,token_hash,invitation_link,tenant_id) VALUES($1,'Existing Guest',$2,$3,$4)",[id,createHash('sha256').update(legacyToken).digest('hex'),legacy,tenantId]);
      const listed=(await adminRequest('/api/admin/guests')).value.find(g=>g.id===id);
      assert.equal(listed.link,`${origin}/${invitationId}#${legacyToken}`);
      assert.equal((await pool.query('SELECT invitation_link FROM wedding.guests WHERE id=$1',[id])).rows[0].invitation_link,legacy);
      assert.equal((await verify(await challenge(legacyToken),'existing-guest')).response.status,200);
      await pool.query('DELETE FROM wedding.guests WHERE id=$1',[id]);
    });
    await t.test('create guest secret link, persist and rename',async () => {
      const created = await adminRequest('/api/admin/guests',{method:'POST',data:{name:'Keluarga Uji <script>',phone:'0812-3456 7890'}});
      assert.equal(created.response.status,201);guest=created.value.guest;token=new URL(created.value.link).pathname.slice(3);
      assert.equal(token.length,27);
      assert.equal(created.value.link,`${origin}/u/${token}`);
      assert.doesNotMatch(created.value.link,/firsta|talitha|\/i\//);
      const landing=await request(`/${invitationId}`);assert.equal(landing.response.status,200);assert.match(landing.value,/access-message/);
      assert.ok(landing.value.includes(`property="og:url" content="${origin}/${invitationId}"`));
      const alias=await fetch(base+'/i/firsta-talitha?access=1',{redirect:'manual'});
      assert.equal(alias.status,302);assert.equal(alias.headers.get('location'),`/${invitationId}?access=1`);
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
      await migrate(process.env.TEST_DATABASE_URL_UNPOOLED,'wedding',passwordHash);
      assert.equal((await adminRequest('/api/admin/guests')).value[0].link,null);
      assert.equal((await pool.query('SELECT token_hash FROM wedding.guests WHERE id=$1',[guest.id])).rows[0].token_hash,stored.token_hash);
    });
    await t.test('Fingerprint HTTP failures reject access without consuming device slots',async()=>{
      const c=await challenge();
      for(const [eventId,status] of [['not-found',403],['upstream-unavailable',503]]){
        const result=await request('/api/access/verify',{method:'POST',data:{challenge:c.challenge,eventId},jar:c.jar});
        assert.equal(result.response.status,status);assert.equal(result.value.code,'verification_failed');
      }
      assert.equal(Number((await pool.query('SELECT count(*) FROM wedding.devices')).rows[0].count),0);
    });
    await t.test('atomic max-three limit, repeat visitor and replay rejection',async () => {
      const challenges = [];
      for (let i=0;i<6;i++) challenges.push(await challenge());
      const results = await Promise.all(challenges.map((c,i)=>verify(c,`visitor-${i}`)));
      assert.equal(results.filter(r=>r.response.status===200).length,3);
      assert.equal(results.filter(r=>r.value.code==='device_limit').length,3);
      const index = results.findIndex(r=>r.response.status===200);guestBrowser = results[index].jar;guestVisitor = `visitor-${index}`;
      assert.equal(Number((await pool.query('SELECT count(*) FROM wedding.devices WHERE guest_id=$1',[guest.id])).rows[0].count),3);
      const repeat = await verify(await challenge(),`visitor-${index}`);assert.equal(repeat.response.status,200);
      const reuse = challenges[index];assert.equal((await verify(reuse,`visitor-${index}`)).response.status,409);
      const invitation = await request('/api/invitation',{jar:guestBrowser});assert.equal(invitation.value.guestName,'Keluarga Uji');
      assert.equal((await request('/',{jar:guestBrowser})).value.includes('envelope-card'),true);
    });
    await t.test('attendance and wishes persist per guest, validate input, and keep private fields private',async () => {
      const submit = (data,options={}) => request('/api/response',{method:'PUT',data,jar:guestBrowser,...options});
      const value = {attendance:'attending',guestCount:2,message:'  Selamat <script>alert(1)</script>\nBahagia selalu!  '};
      const invitation = await request('/api/invitation',{jar:guestBrowser});
      assert.equal(invitation.value.canRespond,true);assert.equal(invitation.value.response,null);
      assert.equal((await request('/api/invitation',{jar:admin})).value.canRespond,false);
      for (const path of ['/api/response','/api/wishes']) {
        assert.equal((await request(path,path.endsWith('response') ? {method:'PUT',data:value} : {})).response.status,401);
      }
      assert.equal((await submit(value,{jar:admin})).response.status,401);
      assert.equal((await submit(value,{headers:{Origin:'https://attacker.example'}})).response.status,403);
      assert.equal((await submit(value,{headers:{Origin:''}})).response.status,403);
      const saved = await submit(value);assert.equal(saved.response.status,200);
      assert.equal(saved.value.message,value.message.trim());assert.equal(saved.value.guestCount,2);
      const repeated = await submit(value);assert.deepEqual(repeated.value,saved.value);
      assert.equal((await pool.query('SELECT count(*) FROM wedding.responses WHERE guest_id=$1',[guest.id])).rows[0].count,'1');
      const anotherDevice = await verify(await challenge(),guestVisitor);assert.equal(anotherDevice.response.status,200);
      const refreshed = await request('/api/invitation',{jar:anotherDevice.jar});assert.deepEqual(refreshed.value.response,saved.value);
      const listed = (await request('/api/wishes',{jar:guestBrowser})).value;
      assert.equal(listed.wishes.length,1);assert.deepEqual(Object.keys(listed.wishes[0]).sort(),['message','name','updatedAt']);
      assert.equal(listed.wishes[0].message,value.message.trim());assert.equal(listed.hasMore,false);
      assert.equal((await adminRequest('/api/admin/guests')).value[0].response.message,value.message.trim());
      for (const data of [{...value,attendance:'invalid'},{...value,guestCount:0},{...value,guestCount:11},{...value,guestCount:1.5},{...value,guestCount:'2'},{...value,attendance:'not_attending'},{...value,message:'x'.repeat(1001)},{...value,message:null},{...value,message:'bad\u0000'},{...value,guestId:guest.id},{attendance:'unsure',guestCount:0}]) {
        assert.equal((await submit(data)).response.status,400);
      }
      assert.deepEqual((await request('/api/invitation',{jar:guestBrowser})).value.response,saved.value);
      const cleared = await submit({attendance:'not_attending',guestCount:0,message:'   '});assert.equal(cleared.response.status,200);
      assert.equal((await request('/api/wishes',{jar:guestBrowser})).value.wishes.length,0);
      assert.equal((await submit({attendance:'unsure',guestCount:0,message:'Doa terbaik untuk kalian.'})).response.status,200);
      await migrate(process.env.TEST_DATABASE_URL_UNPOOLED,'wedding',passwordHash);
      assert.equal((await request('/api/invitation',{jar:guestBrowser})).value.response.attendance,'unsure');
      for (const page of ['0','-1','1.5','abc','10001','']) assert.equal((await request(`/api/wishes?page=${page}`,{jar:guestBrowser})).response.status,400);
    });
    await t.test('wishes paginate, exclude inactive guests, and cannot change another invitation',async () => {
      for (let i=0;i<11;i++) {
        const id = `wish-fixture-${i}`;
        await pool.query('INSERT INTO wedding.guests(id,name,token_hash,active,tenant_id) VALUES($1,$2,$1,$3,$4)',[id,`Tamu ${i}`,i === 10 ? 0 : 1,tenantId]);
        await pool.query("INSERT INTO wedding.responses(guest_id,attendance,guest_count,message,updated_at) VALUES($1,'attending',1,$2,'2026-01-01')",[id,`Ucapan ${i}`]);
      }
      const first = (await request('/api/wishes',{jar:guestBrowser})).value;
      const second = (await request('/api/wishes?page=2',{jar:guestBrowser})).value;
      assert.equal(first.wishes.length,10);assert.equal(first.hasMore,true);assert.equal(second.wishes.length,1);assert.equal(second.hasMore,false);
      assert.equal(new Set([...first.wishes,...second.wishes].map(w => w.name)).size,11);
      assert.equal([...first.wishes,...second.wishes].some(w => w.name === 'Tamu 10'),false);
      const own = (await request('/api/invitation',{jar:guestBrowser})).value.response;
      assert.equal(own.message,'Doa terbaik untuk kalian.');
      const other = await adminRequest('/api/admin/guests',{method:'POST',data:{name:'Undangan lain'}});
      const browser = await verify(await challenge(new URL(other.value.link).pathname.slice(3)),'other-visitor');
      const data = {attendance:'not_attending',guestCount:0,message:'Ucapan tamu lain'};
      assert.equal((await request('/api/response',{method:'PUT',data:{...data,guestId:guest.id},jar:browser.jar})).response.status,400);
      assert.equal((await request('/api/response',{method:'PUT',data,jar:browser.jar})).response.status,200);
      assert.deepEqual((await request('/api/invitation',{jar:guestBrowser})).value.response,own);
      await adminRequest(`/api/admin/guests/${other.value.guest.id}`,{method:'DELETE'});
      await pool.query("DELETE FROM wedding.guests WHERE id LIKE 'wish-fixture-%'");
      assert.equal((await pool.query("SELECT count(*) FROM wedding.responses WHERE guest_id LIKE 'wish-fixture-%'")).rows[0].count,'0');
    });
    await t.test('Postman collection verifies the local Neon-backed response endpoints',async () => {
      const child = spawn('postman',['collection','run','postman/collections/Wedding Invitation API','-i','Save attendance and a congratulatory wish','-i','Read personalized invitation and media','-i','Read congratulatory wishes','-i','Read guest verification by code','--env-var',`baseUrl=${base}`,'--env-var',`origin=${origin}`,'--env-var',`guestCode=${token}`,'--env-var',`invitationId=${invitationId}`,'--env-var',`guestCookie=wedding_guest=${guestBrowser.wedding_guest}`,'--no-report-events'],{stdio:['ignore','pipe','pipe']});
      let output = '';child.stdout.on('data',chunk => {output += chunk;});child.stderr.on('data',chunk => {output += chunk;});
      const [code] = await once(child,'close');console.log(output);assert.equal(code,0,output);
    });
    await t.test('code landing stays gated with an existing session and never allocates a device',async()=>{
      const counts=async()=> (await pool.query('SELECT (SELECT count(*) FROM wedding.devices) AS devices,(SELECT count(*) FROM wedding.sessions) AS sessions,(SELECT count(*) FROM wedding.challenges) AS challenges')).rows;
      const before=await counts();
      for(const jar of [{},admin,guestBrowser]) {
        const page=await request('/u/'+token,{jar});
        assert.equal(page.response.status,200);assert.match(page.value,/access-message/);assert.doesNotMatch(page.value,/response-form|Keluarga Uji/);
        assert.equal(page.value.includes(token),false);
        assert.ok(page.value.includes(`property="og:url" content="${origin}/${invitationId}"`));
        assert.ok(page.value.includes(`name="invitation-path" content="/${invitationId}"`));
        assert.equal(page.response.headers.get('referrer-policy'),'no-referrer');
        assert.match(page.response.headers.get('cache-control'),/no-store/);
        assert.match(page.response.headers.get('x-robots-tag'),/noindex/);
        assert.equal(page.response.headers.getSetCookie().length,0);
      }
      const head=await request('/u/'+token,{method:'HEAD'});assert.equal(head.response.status,200);assert.equal(head.value,'');
      assert.match((await request(`/${invitationId}?access=1`,{jar:guestBrowser})).value,/access-message/);
      assert.deepEqual(await counts(),before);
      for(const path of ['/u/short','/u/'+'z'.repeat(27),'/u/'+token+'/extra'])assert.equal((await request(path)).response.status,404);
      const key=createHash('sha256').update('link:127.0.0.1').digest('hex');
      await pool.query("UPDATE wedding.rate_limits SET hits=120,expires_at=now()+interval '1 minute' WHERE key=$1",[key]);
      assert.equal((await request('/u/'+token)).response.status,429);
      await pool.query('DELETE FROM wedding.rate_limits WHERE key=$1',[key]);
    });
    await t.test('response submissions are rate limited',async () => {
      const key = createHash('sha256').update('response:127.0.0.1').digest('hex');
      await pool.query('UPDATE wedding.rate_limits SET hits=20,expires_at=now()+interval \'1 minute\' WHERE key=$1',[key]);
      const result = await request('/api/response',{method:'PUT',data:{attendance:'attending',guestCount:1,message:'Too many'},jar:guestBrowser});
      assert.equal(result.response.status,429);assert.equal(result.response.headers.get('retry-after'),'60');
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
      const response = await fetch(base+'/api/admin/media/groom',{method:'PUT',headers:{Origin:cmsOrigin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'image/png'},body:photo});
      for (const slot of ['gallery1','gallery4','gallery9']) {
        const uploaded = await fetch(base+`/api/admin/media/${slot}`,{method:'PUT',headers:{Origin:cmsOrigin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'image/png'},body:photo});
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
      const invalid = await fetch(base+'/api/admin/media/bride',{method:'PUT',headers:{Origin:cmsOrigin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'image/png'},body:'<svg onload="evil()"></svg>'});
      assert.equal(invalid.status,415);
      const music = readFileSync(new URL('./fixtures/silence.mp3',import.meta.url));
      const musicHeaders = {Origin:cmsOrigin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'audio/mpeg'};
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
      assert.ok((await request('/')).value.includes('property="og:title" content="Undangan Pernikahan Firsta &amp; Talitha"'));
    });
    await t.test('preview thumbnails are public JPEGs, replace safely, and cannot expose private media',async () => {
      const photo = await sharp({create:{width:60,height:90,channels:4,background:'#183d32'}}).png().toBuffer();
      const upload = data => fetch(base+'/api/admin/media/preview',{method:'PUT',headers:{Origin:cmsOrigin,Cookie:`wedding_admin=${admin.wedding_admin}`,'X-CSRF-Token':csrf,'Content-Type':'image/png'},body:data});
      assert.equal((await fetch(base+'/api/admin/media/preview',{method:'PUT',headers:{Origin:cmsOrigin,'Content-Type':'image/png'},body:photo})).status,401);
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
      await migrate(process.env.TEST_DATABASE_URL_UNPOOLED,'wedding',passwordHash);
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
    await t.test('two tenants isolate every admin action, settings, media, metadata and guest wishes',async () => {
      const secondEmail = 'tenant-two@example.com';const secondSlug = 'tenant-two';
      const client = await pool.connect();
      try {
        await client.query('BEGIN');await client.query('SET LOCAL search_path TO wedding');
        await provisionAccount(client,{email:secondEmail,slug:secondSlug,name:'Tenant Two'},passwordHash);
        await provisionAccount(client,{email:secondEmail,slug:secondSlug,name:'Tenant Two'});
        await assert.rejects(provisionAccount(client,{email:'another@example.com',slug:secondSlug,name:'Tenant Two'},passwordHash),/different migration/);
        await client.query('COMMIT');
      } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
      const second = {};const login = await request('/api/admin/login',{method:'POST',data:{email:' TENANT-TWO@example.com ',password},jar:second});
      assert.equal(login.response.status,200);assert.equal(login.value.account.email,secondEmail);assert.equal(login.value.account.tenant.slug,secondSlug);
      assert.match(login.value.account.tenant.id,uuidv7);
      const secondTenantId=login.value.account.tenant.id;
      const owner=(await pool.query('SELECT owner_id FROM wedding.tenants WHERE id=$1',[secondTenantId])).rows[0].owner_id;assert.match(owner,uuidv7);
      const secondRequest = (path,options={}) => request(path,{...options,jar:second,headers:{'X-CSRF-Token':login.value.csrf,...options.headers}});
      assert.deepEqual((await secondRequest('/api/admin/guests')).value,[]);
      for (const [suffix,method,data] of [['','PATCH',{name:'Stolen'}],['','DELETE',{}],['/link','POST',{}],['/devices','DELETE',{}]]) {
        assert.equal((await secondRequest(`/api/admin/guests/${guest.id}${suffix}`,{method,data})).response.status,404);
      }
      assert.equal((await adminRequest('/api/admin/guests')).value[0].name,'Keluarga Uji');
      assert.equal((await secondRequest('/api/admin/guests',{method:'POST',data:{name:'Bad',tenant_id:'firsta-talitha'}})).response.status,400);
      const created = await secondRequest('/api/admin/guests',{method:'POST',data:{name:'Second Tenant Guest'}});
      assert.equal(created.response.status,201);assert.match(created.value.link,/\/u\/[A-Za-z0-9_-]{27}$/);
      assert.equal((await adminRequest('/api/admin/guests')).value.length,1);
      const original = (await adminRequest('/api/admin/content')).value;
      const saved = await secondRequest('/api/admin/content',{method:'PUT',data:{ceremonyTitle:'Second Ceremony',linkPreviewTitle:'Tenant Two Preview'}});
      assert.equal(saved.value.settings.ceremonyTitle,'Second Ceremony');assert.deepEqual(saved.value.media,{});
      const coded=await request(new URL(created.value.link).pathname,{jar:guestBrowser});
      assert.equal(coded.response.status,200);assert.match(coded.value,/<title>Tenant Two Preview<\/title>/);
      assert.match(coded.value,/access-message/);assert.doesNotMatch(coded.value,/response-form|Second Tenant Guest|Keluarga Uji/);
      assert.deepEqual((await adminRequest('/api/admin/content')).value,original);
      const privatePath = original.media.groom;
      assert.equal((await request(privatePath,{jar:second})).response.status,404);
      const photo = await sharp({create:{width:10,height:10,channels:3,background:'#ffffff'}}).png().toBuffer();
      const uploaded = await fetch(base+'/api/admin/media/groom',{method:'PUT',headers:{Origin:cmsOrigin,Cookie:`wedding_admin=${second.wedding_admin}`,'X-CSRF-Token':login.value.csrf,'Content-Type':'image/png'},body:photo});
      assert.equal(uploaded.status,200);const secondPath = (await uploaded.json()).media.groom;
      assert.notEqual(secondPath,privatePath);assert.equal((await request(secondPath,{jar:admin})).response.status,404);
      assert.equal((await secondRequest('/api/admin/media/groom',{method:'DELETE'})).response.status,200);
      assert.equal((await adminRequest('/api/admin/content')).value.media.groom,privatePath);
      const secondGuest = await verify(await challenge(new URL(created.value.link).pathname.slice(3)),'tenant-two-visitor');
      assert.equal(secondGuest.response.status,200);
      assert.equal((await request(privatePath,{jar:secondGuest.jar})).response.status,404);
      assert.deepEqual((await request('/api/wishes',{jar:secondGuest.jar})).value.wishes,[]);
      assert.equal((await request('/api/invitation?tenant=firsta-talitha',{jar:secondGuest.jar})).response.status,401);
      const wrongScope=await request(`/api/response?tenant=${invitationId}`,{method:'PUT',data:{attendance:'attending',guestCount:1,message:'Wrong opaque scope'},jar:secondGuest.jar});assert.equal(wrongScope.response.status,401);
      assert.equal((await request('/api/invitation?tenant=tenant-two',{jar:guestBrowser})).response.status,401);
      assert.equal((await request('/api/invitation',{jar:secondGuest.jar})).value.tenantSlug,secondSlug);
      assert.equal((await request(`/api/invitation?tenant=${login.value.account.tenant.publicId}`,{jar:secondGuest.jar})).value.invitationId,login.value.account.tenant.publicId);
      assert.equal((await request(`/api/invitation?tenant=${login.value.account.tenant.publicId}`,{jar:guestBrowser})).response.status,401);
      const stale = await request('/api/response?tenant=firsta-talitha',{method:'PUT',jar:secondGuest.jar,data:{attendance:'attending',guestCount:1,message:'Wrong tab'}});
      assert.equal(stale.response.status,401);assert.equal((await request('/api/invitation',{jar:secondGuest.jar})).value.response,null);

      assert.equal((await request('/api/invitation',{jar:secondGuest.jar})).value.settings.ceremonyTitle,'Second Ceremony');
      const landing = await request('/i/tenant-two');assert.equal(landing.response.status,200);assert.match(landing.value,/<title>Tenant Two Preview<\/title>/);assert.match(landing.value,/access-message/);
      assert.doesNotMatch((await request('/i/firsta-talitha')).value,/<title>Tenant Two Preview/);
      assert.match((await request('/i/tenant-two',{jar:guestBrowser})).value,/access-message/);
      assert.match((await request('/i/tenant-two',{jar:secondGuest.jar})).value,/id="response-form"/);
      assert.equal((await request('/i/unknown-tenant')).response.status,404);
      assert.match((await request('/',{jar:guestBrowser})).value,/id="response-form"/);
      for (const path of ['/api/register','/api/signup','/register','/signup']) assert.equal((await request(path,{method:'POST',data:{email:secondEmail,password}})).response.status,404);
      const unknown = await request('/api/admin/login',{method:'POST',data:{email:'unknown@example.com',password}});
      const wrong = await request('/api/admin/login',{method:'POST',data:{email,password:'wrong'}});
      assert.equal(unknown.response.status,401);assert.deepEqual(unknown.value,wrong.value);
      assert.equal((await request('/api/admin/login',{method:'POST',data:{password}})).response.status,400);
      const child = spawn('postman',['collection','run','postman/collections/Wedding Invitation API','-i','Login administrator','-i','Read admin session','-i','Reject foreign tenant guest update','-i','Public registration disabled','-i','Read invitation by random public UUID','-i','Preview the signed-in admin invitation on the dashboard host','--env-var',`baseUrl=${base}`,'--env-var',`cmsBaseUrl=${base}`,'--env-var',`cmsOrigin=${cmsOrigin}`,'--env-var',`origin=${origin}`,'--env-var',`invitationId=${login.value.account.tenant.publicId}`,'--env-var',`adminEmail=${secondEmail}`,'--env-var',`adminPassword=${password}`,'--env-var',`foreignGuestId=${guest.id}`,'--no-report-events'],{stdio:['ignore','pipe','pipe']});
      let output = '';child.stdout.on('data',chunk => {output += chunk;});child.stderr.on('data',chunk => {output += chunk;});
      const [code] = await once(child,'close');console.log(output);assert.equal(code,0,output);
      await pool.query('UPDATE wedding.accounts SET active=false WHERE email=$1',[secondEmail]);
      assert.equal((await secondRequest('/api/admin/session')).response.status,401);
      assert.equal((await request('/api/invitation',{jar:secondGuest.jar})).response.status,401);
      await pool.query('DELETE FROM wedding.guests WHERE tenant_id=$1',[secondTenantId]);
      await pool.query('DELETE FROM wedding.settings WHERE tenant_id=$1',[secondTenantId]);
      await pool.query('DELETE FROM wedding.tenants WHERE id=$1',[secondTenantId]);
      await pool.query('DELETE FROM wedding.accounts WHERE email=$1',[secondEmail]);
    });
    await t.test('reset, deactivate and link rotation revoke sessions immediately',async () => {
      assert.equal((await adminRequest(`/api/admin/guests/${guest.id}/devices`,{method:'DELETE'})).response.status,200);
      assert.equal((await request('/api/invitation',{jar:guestBrowser})).response.status,401);
      assert.equal((await request('/api/response',{method:'PUT',jar:guestBrowser,data:{attendance:'attending',guestCount:1,message:'Stale'}})).response.status,401);
      assert.equal((await adminRequest(`/api/admin/guests/${guest.id}`,{method:'PATCH',data:{active:false}})).value.active,0);
      assert.equal((await request('/api/access/challenge',{method:'POST',data:{token}})).response.status,404);
      assert.equal((await request('/api/wishes',{jar:admin})).value.wishes.length,0);
      await adminRequest(`/api/admin/guests/${guest.id}`,{method:'PATCH',data:{active:true}});
      const changed = await adminRequest(`/api/admin/guests/${guest.id}/link`,{method:'POST',data:{}});
      assert.equal(changed.response.status,200);assert.notEqual(new URL(changed.value.link).pathname.slice(3),token);
      assert.equal(changed.value.guest.link,changed.value.link);
      assert.equal((await adminRequest('/api/admin/guests')).value[0].link,changed.value.link);
      assert.equal((await request('/api/access/challenge',{method:'POST',data:{token}})).response.status,404);
      const c = await challenge(new URL(changed.value.link).pathname.slice(3));const result=await verify(c,'visitor-new');assert.equal(result.response.status,200);
      await adminRequest(`/api/admin/guests/${guest.id}`,{method:'DELETE'});
      assert.equal((await request('/api/invitation',{jar:result.jar})).response.status,401);
      assert.equal((await pool.query('SELECT count(*) FROM wedding.devices')).rows[0].count,'0');
      assert.equal((await pool.query('SELECT count(*) FROM wedding.responses')).rows[0].count,'0');
    });
    await t.test('logout invalidates server-side session',async () => {
      assert.equal((await adminRequest('/api/admin/logout',{method:'POST',data:{}})).response.status,200);
      assert.equal((await adminRequest('/api/admin/session')).response.status,401);
    });
  } finally {
    await server.close();
    await pool.query('TRUNCATE wedding.guests,wedding.sessions,wedding.media,wedding.challenges,wedding.used_events,wedding.rate_limits CASCADE');
    await pool.query("UPDATE wedding.settings SET value='{}' WHERE tenant_id=$1",[tenantId]);
    await pool.query("DELETE FROM wedding.settings WHERE tenant_id=(SELECT id FROM wedding.tenants WHERE slug='tenant-two'); DELETE FROM wedding.tenants WHERE slug='tenant-two'; DELETE FROM wedding.accounts WHERE email='tenant-two@example.com'");
    await pool.end();
  }
});

test('explicit all-account cutover is atomic, preserves content, resets guest access and is idempotent',async()=>{
  const pool=database(process.env.TEST_DATABASE_URL_UNPOOLED);
  const origin='https://invitation.example';
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const secret=()=>randomBytes(32).toString('base64url');
  const env={DATABASE_URL_UNPOOLED:process.env.TEST_DATABASE_URL_UNPOOLED,PUBLIC_ORIGIN:origin};
  const oldToken=secret(),oldSession=secret(),oldChallenge=secret(),oldCookie=secret(),newCode=randomBytes(20).toString('base64url');
  let backend;
  // Snapshot every relevant table, excluding only unrelated rate-limit counters.
  async function snapshot(){
    const result={};
    for(const table of ['accounts','tenants','guests','sessions','challenges','devices','responses','settings','media'])
      result[table]=(await pool.query(`SELECT row_to_json(t) AS value FROM wedding.${table} t ORDER BY row_to_json(t)::text`)).rows;
    return result;
  }
  try {
    await provisionAccount(null,{email:'cutover@example.com',slug:'cutover-two',name:'Cutover Two'},`${'a'.repeat(32)}:${'b'.repeat(128)}`);
    const tenants=Object.fromEntries((await pool.query('SELECT slug,id FROM wedding.tenants')).rows.map(t=>[t.slug,t.id]));
    for(const [id,tenant,active,token,link] of [
      ['cut-a','firsta-talitha',1,oldToken,`${origin}/#${oldToken}`],
      ['cut-b','firsta-talitha',0,secret(),null],
      ['cut-c','cutover-two',1,secret(),'https://old.example/i/cutover-two#old'],
      ['cut-new','firsta-talitha',1,newCode,`${origin}/u/${newCode}`],
    ]) {
      await pool.query('INSERT INTO wedding.guests(id,tenant_id,name,active,token_hash,invitation_link,phone) VALUES($1,$2,$1,$3,$4,$5,$6)',[id,tenants[tenant],active,hash(token),link,'6281234567890']);
      await pool.query('INSERT INTO wedding.devices(guest_id,visitor_hash) VALUES($1,$2)',[id,hash(id)]);
      await pool.query("INSERT INTO wedding.sessions(token_hash,guest_id,version,expires_at) VALUES($1,$2,1,now()+interval '1 day')",[hash(id==='cut-a'?oldSession:secret()),id]);
      await pool.query("INSERT INTO wedding.challenges(id,cookie_hash,guest_id,version,expires_at) VALUES($1,$2,$3,1,now()+interval '5 minutes')",[id==='cut-a'?oldChallenge:secret(),hash(oldCookie),id]);
      await pool.query("INSERT INTO wedding.responses(guest_id,attendance,guest_count,message) VALUES($1,'attending',2,'Preserve my wish')",[id]);
    }
    await pool.query("INSERT INTO wedding.sessions(token_hash,account_id,tenant_id,csrf,expires_at) SELECT 'cut-admin',owner_id,id,'csrf',now()+interval '1 day' FROM wedding.tenants WHERE slug='firsta-talitha'");
    await pool.query("UPDATE wedding.settings SET value=$1 WHERE tenant_id=(SELECT id FROM wedding.tenants WHERE slug='cutover-two')",[{partnerOneName:'Keep Name',linkPreviewTitle:'Cutover Two Preview'}]);
    await pool.query("INSERT INTO wedding.media(tenant_id,slot,id,mime,data) SELECT id,'groom','cut-media','image/webp',$1 FROM wedding.tenants WHERE slug='cutover-two'",[Buffer.from('preserve media')]);
    const before=await snapshot();
    const expected=[{tenant:tenants['cutover-two'],count:1},{tenant:tenants['firsta-talitha'],count:2}].sort((a,b)=>a.tenant.localeCompare(b.tenant));
    assert.deepEqual(JSON.parse(await command(['rotate-links'],env)),{applied:false,tenants:expected});
    assert.deepEqual(await snapshot(),before);
    // Fail after another account has already changed, proving transaction rollback.
    await pool.query("CREATE FUNCTION wedding.fail_cutover() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='cut-b' THEN RAISE EXCEPTION 'fixture cutover failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_cutover BEFORE UPDATE ON wedding.guests FOR EACH ROW EXECUTE FUNCTION wedding.fail_cutover()");
    await assert.rejects(command(['rotate-links','--apply'],env),/fixture cutover failure/);
    assert.deepEqual(await snapshot(),before);
    await pool.query('DROP TRIGGER fail_cutover ON wedding.guests; DROP FUNCTION wedding.fail_cutover()');
    const output=await command(['rotate-links','--apply'],env);
    assert.deepEqual(JSON.parse(output),{applied:true,tenants:expected});
    const after=await snapshot();
    for(const table of ['accounts','tenants','responses','settings','media'])assert.deepEqual(after[table],before[table]);
    const rotated=(await pool.query("SELECT * FROM wedding.guests WHERE id LIKE 'cut-%' AND id<>'cut-new' ORDER BY id")).rows;
    const codes=rotated.map(g=>new URL(g.invitation_link).pathname.slice(3));
    assert.equal(new Set(codes).size,3);
    for(const [i,g] of rotated.entries()) {
      assert.match(codes[i],/^[A-Za-z0-9_-]{27}$/);assert.equal(g.token_hash,hash(codes[i]));assert.equal(g.version,2);
      assert.equal(g.name,g.id);assert.equal(g.phone,'6281234567890');assert.equal(g.active,g.id==='cut-b'?0:1);
      assert.equal(output.includes(codes[i]),false);
      for(const table of ['sessions','devices','challenges'])assert.equal((await pool.query(`SELECT count(*) FROM wedding.${table} WHERE guest_id=$1`,[g.id])).rows[0].count,'0');
    }
    assert.deepEqual(after.guests.filter(g=>g.value.id==='cut-new'),before.guests.filter(g=>g.value.id==='cut-new'));
    for(const table of ['sessions','devices','challenges'])assert.deepEqual(after[table],before[table].filter(g=>g.value.guest_id===null||g.value.guest_id==='cut-new'));
    assert.deepEqual(JSON.parse(await command(['rotate-links','--apply'],env)),{applied:true,tenants:[]});
    assert.deepEqual(await snapshot(),after);
    backend=await startBackend({origin,cmsOrigin:'https://dashboard.example',endpoint:'https://validator.firsta.my.id'});
    const request=(path,data,cookie)=>fetch(backend.base+path,{method:data?'POST':'GET',headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});
    assert.equal((await request('/api/access/challenge',{token:oldToken})).status,404);
    assert.equal((await request('/api/invitation',null,'wedding_guest='+oldSession)).status,401);
    assert.equal((await request('/api/access/verify',{challenge:oldChallenge,eventId:'old'},'wedding_challenge='+oldCookie)).status,409);
    assert.equal((await request('/u/'+codes[1])).status,404);
    const publicId=(await pool.query("SELECT public_id FROM wedding.tenants WHERE slug='cutover-two'")).rows[0].public_id;
    const page=await request('/u/'+codes[2]);assert.equal(page.status,200);assert.ok((await page.text()).includes(`${origin}/${publicId}`));
    const challenge=await request('/api/access/challenge',{token:codes[0]});assert.equal(challenge.status,200);
    const c=await challenge.json();
    await backend.events.set('cutover-event',{event_id:'cutover-event',linked_id:c.challenge,url:origin+'/'+publicId,timestamp:Date.now(),identification:{visitor_id:'fresh-device'}});
    assert.equal((await request('/api/access/verify',{challenge:c.challenge,eventId:'cutover-event'},challenge.headers.getSetCookie()[0].split(';')[0])).status,200);
    assert.equal((await pool.query("SELECT count(*) FROM wedding.devices WHERE guest_id='cut-a'")).rows[0].count,'1');
    await pool.query("UPDATE wedding.accounts SET active=false WHERE email='cutover@example.com'");
    assert.equal((await request('/u/'+codes[2])).status,404);
  } finally {
    if(backend)await backend.server.close();
    await pool.query('DROP TRIGGER IF EXISTS fail_cutover ON wedding.guests; DROP FUNCTION IF EXISTS wedding.fail_cutover()');
    await pool.query("DELETE FROM wedding.guests WHERE id LIKE 'cut-%'; DELETE FROM wedding.sessions WHERE token_hash='cut-admin'; DELETE FROM wedding.media WHERE tenant_id=(SELECT id FROM wedding.tenants WHERE slug='cutover-two'); DELETE FROM wedding.settings WHERE tenant_id=(SELECT id FROM wedding.tenants WHERE slug='cutover-two'); DELETE FROM wedding.tenants WHERE slug='cutover-two'; DELETE FROM wedding.accounts WHERE email='cutover@example.com'");
    await pool.end();
  }
});
