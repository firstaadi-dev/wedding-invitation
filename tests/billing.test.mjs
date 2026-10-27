import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {database,migrate,command,binary} from './support/db.mjs';

if(process.env.TEST_DATABASE_DISPOSABLE!=='1' || !process.env.TEST_DATABASE_URL_UNPOOLED) throw new Error('Billing tests require a disposable isolated test database.');
const dbURL=process.env.TEST_DATABASE_URL_UNPOOLED;
if([process.env.DATABASE_URL,process.env.DATABASE_URL_UNPOOLED].filter(Boolean).includes(dbURL)) throw new Error('Application database must differ from test database.');
const origin='http://dashboard.localhost:5173', publicOrigin='http://invitation.localhost:5173';
const serverKey='SB-Mid-server-billing-test';
const password='billing-test-password';
async function listen(server){server.listen(0,'127.0.0.1');await once(server,'listening');return `http://127.0.0.1:${server.address().port}`;}
async function waitServer(child){let log='';await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error(log)),15000);for(const pipe of [child.stdout,child.stderr])pipe.on('data',b=>{log+=b;if(log.includes('Invitation server ready')){clearTimeout(timeout);resolve();}});child.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Backend exited ${code}: ${log}`));});});}
function signature(order,amount='199000.00',status='200'){return createHash('sha512').update(order+status+amount+serverKey).digest('hex');}

test('register -> Snap QRIS -> verified 12-month access; adversarial payment lifecycle',async t=>{
 const pool=database(dbURL), states=new Map(),snapRequests=[];
 let backend,snapFailure=false,statusFailure=false;
 const midtrans=createServer(async(req,res)=>{
  assert.equal(req.headers.authorization,'Basic '+Buffer.from(serverKey+':').toString('base64'));
  let body='';for await(const chunk of req)body+=chunk;
  res.setHeader('Content-Type','application/json');
  if(req.url==='/snap/v1/transactions' && req.method==='POST'){
   const p=JSON.parse(body);snapRequests.push(p);
   if(snapFailure){res.writeHead(503);res.end(JSON.stringify({error:'temporary'}));return;}
   const id=p.transaction_details.order_id;
   states.set(id,{order_id:id,gross_amount:'199000.00',currency:'IDR',status_code:'201',transaction_status:'pending',payment_type:'qris',transaction_id:randomUUID(),fraud_status:'accept'});
   res.writeHead(201);res.end(JSON.stringify({token:'snap-test-token',redirect_url:`https://app.sandbox.midtrans.com/snap/v4/redirection/${id}`}));return;
  }
  const id=req.url.match(/^\/v2\/(.+)\/status$/)?.[1];
  if(id && statusFailure){res.writeHead(503);res.end(JSON.stringify({error:'unavailable'}));return;}
  if(id && states.has(id)){res.end(JSON.stringify(states.get(id)));return;}
  res.writeHead(404);res.end(JSON.stringify({status_code:'404'}));
 });
 try{
  const encoded=(await command(['hash'],{},password)).trim();await migrate(dbURL,'wedding',encoded);
  await migrate(dbURL,'wedding');
  await pool.query('DELETE FROM wedding.rate_limits');
  assert.equal((await pool.query("SELECT billing_required FROM wedding.accounts WHERE email='firstaadip16@gmail.com'")).rows[0].billing_required,false);
  const upstream=await listen(midtrans);
  const socket=createServer();const base=await listen(socket);await new Promise(r=>socket.close(r));
  backend=spawn(binary,['serve'],{env:{...process.env,DATABASE_URL:dbURL,DATABASE_URL_UNPOOLED:dbURL,PORT:new URL(base).port,PUBLIC_ORIGIN:publicOrigin,CMS_ORIGIN:origin,NODE_ENV:'development',MIDTRANS_ENV:'sandbox',MIDTRANS_SERVER_KEY:serverKey,MIDTRANS_API_ORIGIN:upstream,FINGERPRINT_PUBLIC_KEY:'test',FINGERPRINT_SECRET_KEY:'test',TEMPLATE_DIR:'frontend/dist'},stdio:['ignore','pipe','pipe']});
  await waitServer(backend);
  async function runContract(names,extra={}){
   const variables={cmsBaseUrl:base,cmsOrigin:origin,billingCookie:first.cookie,billingCsrf:first.csrf,billingEmail:`contract-${randomUUID()}@example.com`,billingPassword:password,billingName:"Pasangan Uji",...extra};
   const args=['collection','run','postman/collections/Billing API',...names.flatMap(n=>['-i',n]),...Object.entries(variables).flatMap(([k,v])=>['--env-var',`${k}=${v}`]),'--no-report-events'];
   const child=spawn('postman',args,{stdio:['ignore','pipe','pipe']});let output='';for(const p of [child.stdout,child.stderr])p.on('data',b=>{output+=b;});const [code]=await once(child,'close');console.log(output);assert.equal(code,0,output);
  }
  const users=[];
  async function request(path,{method='GET',data,cookie='',csrf='',originHeader=origin}={}){
   const response=await fetch(base+path,{method,headers:{...(originHeader?{Origin:originHeader}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:data===undefined?undefined:JSON.stringify(data)});
   const type=response.headers.get('content-type')||'';return {status:response.status,headers:response.headers,value:type.includes('application/json')?await response.json():await response.text()};
  }
  async function register(){const email=`billing-${randomUUID()}@example.com`;const r=await request('/api/admin/register',{method:'POST',data:{email,password,name:'Pasangan Uji'}});assert.equal(r.status,201,JSON.stringify(r.value));const user={email,cookie:r.headers.getSetCookie()[0].split(';')[0],csrf:r.value.csrf,session:r.value};users.push(user);return user;}
  const first=await register();
  const own=(path,method='GET',data)=>request(path,{...first,method,data});
  async function notify(id,overrides={}){return request('/api/payments/midtrans/notification',{method:'POST',originHeader:'',data:{order_id:id,status_code:'200',gross_amount:'199000.00',signature_key:signature(id),transaction_status:'settlement',...overrides}});}
  await t.test('registration is validated and pending account cannot use CMS or preview',async()=>{
   assert.equal(first.session.account.subscription.active,false);
   assert.equal((await request('/api/admin/register',{method:'POST',originHeader:'https://attacker.example',data:{}})).status,403);
   assert.equal((await request('/api/admin/register',{method:'POST',data:{email:'invalid',password,name:'Test'}})).status,400);
   assert.equal((await request('/api/admin/register',{method:'POST',data:{email:first.email,password,name:'Test'}})).status,409);
   assert.equal((await own('/api/admin/guests')).status,402);
   assert.equal((await own('/preview')).status,404);
   assert.equal((await own('/'+first.session.account.tenant.publicId)).status,404);
   const login=await request('/api/admin/login',{method:'POST',data:{email:first.email,password}});assert.equal(login.status,200);assert.equal(login.value.account.subscription.active,false);
  });
  let checkout;
  await t.test('server price, CSRF, QRIS and retry reuse',async()=>{
   assert.equal((await request('/api/admin/billing/payments',{...first,csrf:'wrong',method:'POST',data:{}})).status,403);
   assert.equal((await own('/api/admin/billing/payments','POST',{amount:1})).status,400);
   const r=await own('/api/admin/billing/payments','POST',{});assert.equal(r.status,200,JSON.stringify(r.value));checkout=r.value;
   assert.equal(checkout.amount,199000);assert.equal(checkout.status,'pending');
   assert.equal(snapRequests[0].transaction_details.gross_amount,199000);assert.deepEqual(snapRequests[0].enabled_payments,['gopay','other_qris']);
   assert.equal(snapRequests[0].item_details[0].price,199000);assert.equal(snapRequests[0].callbacks.finish,origin+'/#pembayaran');
   const retries=await Promise.all([own('/api/admin/billing/payments','POST',{}),own('/api/admin/billing/payments','POST',{})]);
   assert.ok(retries.every(r=>r.value.id===checkout.id));assert.equal(snapRequests.length,1);
   await runContract(['readBilling','createCheckout']);
  });
  await t.test('forged notification, browser success, amount and currency cannot activate',async()=>{
   assert.equal((await notify(checkout.id,{signature_key:'f'.repeat(128)})).status,403);
   assert.equal((await request('/api/payments/midtrans/notification',{originHeader:''})).status,200);
   const probe='Midtrans-notification-test';
   assert.equal((await notify(probe,{signature_key:signature(probe)})).status,200,'authenticated unknown order is acknowledged without activation');
   assert.equal((await notify(probe,{signature_key:''})).status,403);
   assert.equal((await notify(checkout.id)).status,200); // authentic signature, actual Midtrans status still pending
   assert.equal((await own('/api/admin/billing')).value.subscription.active,false);
   assert.equal((await own('/api/admin/session?transaction_status=settlement&status_code=200')).value.account.subscription.active,false,'browser redirect query is not proof of payment');
   const value=states.get(checkout.id);value.transaction_status='settlement';value.status_code='200';value.gross_amount='1.00';
   assert.equal((await notify(checkout.id)).status,503);value.gross_amount='199000.00';value.currency='USD';assert.equal((await notify(checkout.id)).status,503);value.currency='IDR';
   value.fraud_status='challenge';assert.equal((await notify(checkout.id)).status,503);value.fraud_status='accept';
   value.payment_type='credit_card';assert.equal((await notify(checkout.id)).status,503);value.payment_type='qris';
   assert.equal((await own('/api/admin/guests')).status,402);
  });
  let until;
  await t.test('settlement activates exactly once for 12 calendar months',async()=>{
   // Midtrans has settled, but no notification/refresh has reached our database.
   assert.equal((await own('/api/admin/billing')).value.subscription.active,false);
   const login=await request('/api/admin/login',{method:'POST',data:{email:first.email,password}});
   assert.equal(login.status,200);assert.equal(login.value.account.subscription.active,true,'login must reconcile before returning the payment screen');
   const loginUntil=login.value.account.subscription.expiresAt;
   const all=await Promise.all([notify(checkout.id),notify(checkout.id),own('/api/admin/billing/refresh','POST',{})]);assert.ok(all.every(r=>r.status===200),JSON.stringify(all));
   const billing=(await own('/api/admin/billing')).value;assert.equal(billing.subscription.active,true);assert.equal(billing.months,12);until=billing.subscription.expiresAt;assert.equal(until,loginUntil);
   const delta=(await pool.query("SELECT abs(extract(epoch FROM (a.paid_until-(p.activated_at+interval '12 months')))) AS delta FROM wedding.payments p JOIN wedding.accounts a ON a.id=p.account_id WHERE p.id=$1",[checkout.id])).rows[0].delta;assert.ok(Number(delta)<1);
   assert.equal((await own('/api/admin/guests')).status,200);
   const content=(await own('/api/admin/content')).value;
   assert.equal(content.settings.partnerOneName,'');assert.equal(content.settings.partnerOneFather,'');
   assert.equal(content.settings.giftEnabled,'false');assert.deepEqual(content.settings.giftAccounts,[]);
   assert.ok(!content.settings.whatsappTemplate.includes('Firsta'));
   assert.equal((await own('/api/admin/billing/payments','POST',{})).status,409);
   await notify(checkout.id);assert.equal((await own('/api/admin/billing')).value.subscription.expiresAt,until);
   states.get(checkout.id).transaction_status='pending';await notify(checkout.id);assert.equal((await own('/api/admin/billing')).value.subscription.expiresAt,until);
   const other=await register();assert.equal((await request('/api/admin/billing',{...other})).value.payment,null);assert.equal((await request('/api/admin/guests',{...other})).status,402);
   const otherCheckout=await request('/api/admin/billing/payments',{...other,method:'POST',data:{}});assert.equal(otherCheckout.status,200);
   Object.assign(states.get(otherCheckout.value.id),{transaction_status:'settlement',status_code:'200'});
   const restored=await request('/api/admin/session',{...other});assert.equal(restored.status,200);assert.equal(restored.value.account.subscription.active,true,'restored session must reconcile without a manual refresh');
  });
  await t.test('Postman collection verifies the billing contract against the backend',async()=>{
   await runContract(['registerAccount']);
   await runContract(['refreshPayment','midtransNotification'],{notificationBody:JSON.stringify({order_id:checkout.id,status_code:'200',gross_amount:'199000.00',signature_key:signature(checkout.id),transaction_status:'settlement'})});
  });
  let guest;let previewId,mediaId,guestCookie;
  await t.test('expired subscription blocks existing sessions, guest links and private media',async()=>{
   guest=(await own('/api/admin/guests','POST',{name:'Tamu Uji'})).value.guest;assert.ok(guest.id);
   previewId=randomUUID();mediaId=randomUUID();const sessionToken=randomUUID();guestCookie='wedding_guest='+Buffer.from(sessionToken).toString('base64url').slice(0,43);
   const guestToken=guestCookie.split('=')[1];assert.equal(guestToken.length,43);
   await pool.query("INSERT INTO wedding.sessions(token_hash,guest_id,version,expires_at) VALUES($1,$2,1,now()+interval '1 day')",[createHash('sha256').update(guestToken).digest('hex'),guest.id]);
   await pool.query("INSERT INTO wedding.media(tenant_id,slot,id,mime,data) VALUES($1,'preview',$2,'image/jpeg',$4),($1,'groom',$3,'image/webp',$4)",[first.session.account.tenant.id,previewId,mediaId,Buffer.from('fixture')]);
   assert.equal((await request('/api/invitation',{cookie:guestCookie})).status,200);
   assert.equal((await own('/media/'+mediaId)).status,200);assert.equal((await own('/preview-image/'+previewId)).status,200);
   await pool.query("UPDATE wedding.accounts SET paid_until=now()-interval '1 second' WHERE email=$1",[first.email]);
   assert.equal((await own('/api/admin/guests')).status,402);assert.equal((await own('/preview')).status,404);
   assert.equal((await request('/api/invitation',{cookie:guestCookie})).status,401);
   assert.equal((await own('/media/'+mediaId)).status,401);assert.equal((await own('/preview-image/'+previewId)).status,404);
   assert.equal((await own('/'+first.session.account.tenant.publicId)).status,404);
   const token=new URL(guest.link).pathname.split('/').at(-1);
   assert.equal((await request('/u/'+token)).status,404);
   assert.equal((await request('/api/access/challenge',{method:'POST',originHeader:publicOrigin,data:{token}})).status,404);
   assert.equal((await own('/api/admin/session')).value.account.subscription.active,false);
  });
  await t.test('refund revokes access and stale settlement does not restore it',async()=>{
   states.get(checkout.id).transaction_status='refund';assert.equal((await notify(checkout.id)).status,200);
   assert.equal((await own('/api/admin/billing')).value.subscription.active,false);
   states.get(checkout.id).transaction_status='settlement';await notify(checkout.id);assert.equal((await own('/api/admin/billing')).value.subscription.active,false);
  });
  await t.test('provider failures keep a durable order and allow recovery',async()=>{
   snapFailure=true;assert.equal((await own('/api/admin/billing/payments','POST',{})).status,503);
   const p=(await own('/api/admin/billing')).value.payment;assert.equal(p.status,'creating');
   assert.equal((await own('/api/admin/billing/payments','POST',{})).status,409);
   statusFailure=true;const login=await request('/api/admin/login',{method:'POST',data:{email:first.email,password}});assert.equal(login.status,200);assert.equal(login.value.account.subscription.active,false);statusFailure=false;
   await pool.query("UPDATE wedding.payments SET expires_at=now()-interval '1 second' WHERE id=$1",[p.id]);
   snapFailure=false;const retry=await own('/api/admin/billing/payments','POST',{});assert.equal(retry.status,200);assert.notEqual(retry.value.id,p.id);
  });
 }finally{
  if(backend){backend.kill('SIGTERM');await once(backend,'close');}
  midtrans.closeAllConnections();await new Promise(r=>midtrans.close(r));await pool.end();
 }
});
