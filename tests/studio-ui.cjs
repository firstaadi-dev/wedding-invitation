// Component-level CMS checks with synthetic props and callbacks; no server or real data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const esbuild=require('../frontend/node_modules/esbuild');
const root=path.resolve(__dirname,'..');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'studio-ui-'));
const shots=path.join(root,'design/cms-alternate/comparison/production-screenshots');
fs.mkdirSync(shots,{recursive:true});
const fixture=`
const fixtureAccount:Account={email:"studio@example.invalid",invitationOrigin:"https://invitation.example",tenant:{id:"demo",slug:"demo",publicId:"demo",name:"Nara & Dimas"}};
const fixtureContent:Content={settings:{partnerOneName:"Nara Pramesti",partnerTwoName:"Dimas Aditya",partnerOneFather:"Ayah Nara",partnerOneMother:"Ibu Nara",partnerTwoFather:"Ayah Dimas",partnerTwoMother:"Ibu Dimas",eventDate:"2026-12-12",venueName:"Taman Arunika",ceremonyTitle:"Akad Nikah",ceremonyTime:"09.00 WIB",receptionTitle:"Resepsi",receptionTime:"11.00–13.00 WIB",countdownTime:"09:00",giftAccounts:[],giftEnabled:"false",deviceLimit:"3",deviceLimitEnabled:"true",whatsappTemplate:"Yth. {nama},\\n\\nDengan bahagia kami mengundang Anda pada {tanggal} di {tempat}.\\n\\nUndangan lengkap:\\n{link}\\n\\nTerima kasih atas doa dan kehadirannya.",linkPreviewTitle:"Undangan Pernikahan — Nara & Dimas",linkPreviewDescription:"12 Desember 2026 · Taman Arunika"},media:{}};
const fixtureGuests:Guest[]=Array.from({length:12},(_,i)=>({id:String(i),name:"Keluarga Arunika "+(i+1),phone:"",link:"https://invitation.example/u/demo"+i,active:1 as const,createdAt:i,deviceCount:i%4,deviceLimit:3,unlimited:false,response:i%2?null:{attendance:"attending" as const,guestCount:2,message:"Selamat merayakan hari bahagia.",updatedAt:"2026-10-24"}}));
function StudioFixture(){
 const [content,setContent]=useState(fixtureContent);const [page,setPage]=useState<Page>(currentPage);
 useEffect(()=>{const listener=()=>setPage(currentPage());addEventListener("hashchange",listener);return()=>removeEventListener("hashchange",listener);},[]);
 const api:API=async<T,>(url:string,method?:string,value?:unknown)=>{
  (window as any).__calls.push({url,method,value:value instanceof File?value.name:value});
  if((window as any).__fail){(window as any).__fail=false;throw new Error("Unggah belum berhasil. Coba lagi.");}
  await new Promise(resolve=>setTimeout(resolve,60));
  const next=url.includes("/media/")?{...content,media:{...content.media,[url.split("/").at(-1)!]:method==="DELETE"?"":URL.createObjectURL(value as File)}}:{...content,settings:{...content.settings,...value as object}};
  return next as T;
 };
 const confirm:Confirm=async()=>window.confirm("Hapus media?");
 const notice=()=>{};
 if(location.hash==="#login") return <Login api={api} onLogin={async()=>{}}/>;
 return <div className="dashboard"><aside className="sidebar"><Brand/><Navigation page={page}/><div className="sidebar-footer"><a className="preview-link" href="#">Lihat undangan</a><button type="button">Keluar</button></div></aside><div className="workspace"><header className="mobile-header"><Brand/><button type="button">Menu</button></header><div className="account-context"><span>Undangan pernikahan</span><span>Nara &amp; Dimas</span></div><main>
 <div hidden={page!=="tamu"}><GuestsPage guests={fixtureGuests} event={{date:"12 Desember 2026",venue:"Taman Arunika"}} template={defaultWhatsappTemplate} api={api} refresh={async()=>{}} confirm={confirm} copy={async()=>{}} showLink={()=>{}} newLink="" dismissLink={()=>{}} edit={()=>{}} add={()=>{}} notice={notice}/></div>
 <section id="page-pesan" className="page" hidden={page!=="pesan"}><SettingsForm kind="messages" content={content} api={api} onContent={setContent} notice={notice} account={fixtureAccount} confirm={confirm} previewMedia={<MediaCard slot="preview" title="Gambar pratinjau WhatsApp" src={content.media.preview} api={api} onContent={setContent} confirm={confirm} notice={notice}/>}/></section>
 <section id="page-media" className="page" hidden={page!=="media"}><MediaPage content={content} api={api} onContent={setContent} confirm={confirm} notice={notice} active={page==="media"}/></section>
 <section id="page-acara" className="page" hidden={page!=="acara"}><header className="page-heading"><div><h1>Detail Acara</h1><p>Atur informasinya per bagian. Simpan semua perubahan sekaligus.</p></div></header><SettingsForm kind="event" content={content} api={api} onContent={setContent} notice={notice} account={fixtureAccount} confirm={confirm}/></section>
 </main></div></div>;
}
(window as any).__calls=[];
createRoot(document.getElementById("root")!).render(<StudioFixture/>);
`;
(async()=>{
 const source=fs.readFileSync(path.join(root,'frontend/src/main.tsx'),'utf8').replace('createRoot(document.getElementById("root")!).render(<App />);',fixture);
 await esbuild.build({stdin:{contents:source,resolveDir:path.join(root,'frontend/src'),loader:'tsx',sourcefile:'studio-fixture.tsx'},bundle:true,outfile:path.join(out,'fixture.js'),loader:{'.ttf':'file'},jsx:'automatic'});
 fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script></html>');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  const url=pathToFileURL(path.join(out,'index.html')).href;
  async function load(route,width=1440){await page.setViewportSize({width,height:width>=900?1000:844});await page.goto(url+'#'+route);await page.reload();await page.locator('h1').filter({visible:true}).first().waitFor();await page.evaluate(()=>document.fonts.ready);}
  async function choose(prefix,id){if(page.viewportSize().width<900)await page.locator(`#${prefix}-section-select`).selectOption(id);else await page.locator(`#page-${prefix==='message'?'pesan':prefix==='event'?'acara':'media'} [data-section="${id}"]`).click();}
  async function capture(name){await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)});await page.screenshot({path:path.join(shots,name+'.png'),fullPage:true});}
  async function overflow(){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow');}
  for(const width of [1440,390,320]){
   for(const route of ['tamu','pesan','media','acara','login']){
    await load(route,width);await overflow();
    if(width!==320)await capture(`${route}-${width}`);
   }
   await load('pesan',width);
   for(const part of ['template','link']){
    await choose('message',part);
    if(width<900)await page.getByRole('button',{name:'Pratinjau final',exact:true}).click();
    const bubble=page.locator('.wa-bubble');await bubble.waitFor({state:'visible'});
    assert(await bubble.locator('.link-image').isVisible());assert(await bubble.locator('.link-description').isVisible());
    assert((await bubble.innerText()).includes('Terima kasih atas doa dan kehadirannya.'));assert((await bubble.innerText()).includes('invitation.example/u/'));
    await overflow();if(width!==320)await capture(`pesan-final-${part}-${width}`);
    if(width<900)await page.getByRole('button',{name:'Edit',exact:true}).click();
   }
   await load('media',width);await choose('media','gallery');assert(await page.locator('.gallery-tile').count()===9);
   assert(!(await page.locator('#media-part-couple').isVisible()));assert(!(await page.locator('#media-part-music').isVisible()));
   await page.locator('[data-gallery-slot="gallery2"]').click();
   await page.locator('[data-slot="gallery2"] input[type=file]').setInputFiles({name:'demo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4l8AAAAASUVORK5CYII=','base64')});
   if(width!==320)await capture(`gallery-editor-${width}`);
   if(width<900){await page.getByRole('button',{name:'Tutup editor foto'}).click();assert(await page.locator('[data-gallery-slot="gallery2"]').evaluate(el=>el===document.activeElement));}
   await page.locator('[data-gallery-slot="gallery3"]').click();
   if(width<900)await page.keyboard.press('Escape');
   await page.locator('[data-gallery-slot="gallery2"]').click();assert.equal(await page.locator('[data-slot="gallery2"] input').evaluate(el=>el.files[0].name),'demo.png');
   await page.evaluate(()=>window.__fail=true);
   await page.locator('[data-slot="gallery2"] button.primary').click();await page.getByText('Unggah belum berhasil. Coba lagi.',{exact:true}).waitFor();
   assert.equal(await page.locator('[data-slot="gallery2"] input').evaluate(el=>el.files[0].name),'demo.png');
   await page.locator('[data-slot="gallery2"] button.primary').click();await page.locator('[data-slot="gallery2"] .media-state').getByText('Terpasang',{exact:true}).waitFor();
   if(width<900)await page.getByRole('button',{name:'Tutup editor foto'}).click();
   await choose('media','music');assert(!(await page.locator('#media-part-gallery').isVisible()));await overflow();if(width!==320)await capture(`media-music-${width}`);
   console.log(`Studio V2 ${width}: full WA bubble in both sections, selected-only media, gallery File retention/retry/focus, all routes overflow PASS`);
  }
  await load('pesan',390);
  await page.locator('[name=whatsappTemplate]').fill('Pesan tanpa link');
  await choose('message','link');await page.getByRole('button',{name:'Pratinjau final',exact:true}).click();
  await page.getByRole('button',{name:'Simpan pesan dan pratinjau',exact:true}).click();
  assert(await page.locator('[name=whatsappTemplate]').isVisible());await page.waitForFunction(()=>document.activeElement?.getAttribute('name')==='whatsappTemplate');assert.equal((await page.evaluate(()=>window.__calls)).length,0);
  await page.locator('[name=whatsappTemplate]').fill('Halo {nama} {link}');
  await choose('message','link');await page.locator('[name=linkPreviewTitle]').fill('Judul baru');await page.getByRole('button',{name:'Simpan pesan dan pratinjau',exact:true}).click();await page.getByText('Pengaturan tersimpan',{exact:true}).filter({visible:true}).waitFor();
  const payload=await page.evaluate(()=>window.__calls.at(-1).value);assert.equal(payload.whatsappTemplate,'Halo {nama} {link}');assert.equal(payload.linkPreviewTitle,'Judul baru');assert.equal(Object.keys(payload).length,3);
  await load('acara',1440);await choose('event','akses');await page.locator('[name=deviceLimit]').fill('0');await choose('event','pasangan');await page.getByRole('button',{name:'Simpan detail acara',exact:true}).click();assert(await page.locator('#event-part-akses').isVisible());await page.locator('[name=deviceLimit]').fill('4');await choose('event','pasangan');await page.locator('[name=partnerOneName]').fill('Nara Baru');await page.getByRole('button',{name:'Simpan detail acara',exact:true}).click();await page.getByText('Pengaturan tersimpan',{exact:true}).filter({visible:true}).waitFor();
  const eventPayload=await page.evaluate(()=>window.__calls.at(-1).value);assert.equal(eventPayload.deviceLimit,'4');assert.equal(eventPayload.partnerOneName,'Nara Baru');assert.deepEqual(eventPayload.giftAccounts,[]);assert.equal(eventPayload.giftEnabled,'false');assert.equal(eventPayload.eventDate,'2026-12-12');
  // The preview image upload is independent from the text save, and is visible with the full body.
  await load('pesan',390);await page.locator('[name=whatsappTemplate]').fill('Draft {link}');await choose('message','link');
  const exampleImage=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;const ctx=canvas.getContext('2d');ctx.fillStyle='#D3E7DC';ctx.fillRect(0,0,1200,630);ctx.fillStyle='#183D32';ctx.textAlign='center';ctx.font='600 64px Manrope';ctx.fillText('Nara & Dimas',600,300);ctx.font='32px Manrope';ctx.fillText('Gambar contoh · 12 Desember 2026',600,370);return canvas.toDataURL('image/png').split(',')[1];});
  await page.locator('[data-slot=preview] input').setInputFiles({name:'preview.png',mimeType:'image/png',buffer:Buffer.from(exampleImage,'base64')});
  await page.locator('[data-slot=preview] button.primary').click();await page.locator('[data-slot=preview] .media-state').getByText('Terpasang',{exact:true}).waitFor();
  assert.equal((await page.evaluate(()=>window.__calls)).length,1);await page.getByText('Perubahan belum disimpan',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Pratinjau final',exact:true}).click();await page.locator('.wa-bubble .link-image img').waitFor();assert((await page.locator('.wa-bubble').innerText()).includes('Draft https://invitation.example/u/'));
  await capture('pesan-final-with-image-390');
  await load('media',390);await choose('media','music');await page.locator('[data-slot=music] input').setInputFiles(path.join(root,'tests/fixtures/silence.mp3'));await page.locator('[data-slot=music] button.primary').click();await page.locator('[data-slot=music] audio').waitFor();
  await page.locator('[data-slot=music] audio').evaluate(async audio=>{audio.load();await audio.play();});
  await choose('media','couple');assert(await page.locator('[data-slot=music] audio').evaluate(audio=>audio.paused));
  await choose('media','music');await page.locator('[data-slot=music] audio').evaluate(audio=>audio.play());await page.evaluate(()=>location.hash='tamu');await page.waitForFunction(()=>document.querySelector('[data-slot=music] audio').paused);
  console.log('Thumbnail upload preserves text dirty state; complete bubble includes uploaded image; music pauses on section/route leave PASS');
  assert.deepEqual(errors,[]);
  console.log('Hidden-field validation opens correct section/Edit; message/event payloads preserve mounted fields; no JS errors PASS');
 }finally{await browser.close();fs.rmSync(out,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
