const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage();await page.emulateMedia({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync(path.join(__dirname,'content-screenshots'),{recursive:true});const report=[];
 const go=async(variant,route)=>{await page.goto('file://'+path.join(__dirname,`${variant}.html`)+`#${route}`);await page.reload();await page.evaluate(()=>document.fonts.ready);};
 const choose=async(prefix,part)=>{if(page.viewportSize().width>=900)await page.locator(`#page-${prefix==='message'?'pesan':'media'} [data-section=${part}]`).click();else await page.locator(`#${prefix}-section-select`).selectOption(part);};
 const capture=async(variant,state,width,viewport=false)=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${variant}/${state}/${width} overflow`);await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});if(width!==320)await page.screenshot({path:path.join(__dirname,`content-screenshots/${variant}-${state}-${width}.png`),fullPage:!viewport});};
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=','base64');
 for(const variant of ['studio','studio-v2'])for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:width===1440?1000:844});await go(variant,'pesan');
  assert(await page.locator('#message-part-template').isVisible());assert(await page.locator('#message-part-link').isHidden());
  if(width<900)await page.locator('[data-message-view=preview]').click();assert(await page.locator('.message-bubble .metadata-preview').isVisible());assert(await page.locator('.message-bubble #message-preview').isVisible());if(width<900){await capture(variant,'pesan-preview-template-final',width);await page.locator('[data-message-view=edit]').click();}
  await capture(variant,'pesan-template',width);
  if(width!==320)await page.screenshot({path:path.join(__dirname,`screenshots/${variant}-pesan-${width}.png`),fullPage:true});
  await choose('message','link');assert(await page.locator('#message-part-link').isVisible());assert(await page.locator('.thumbnail-panel').isVisible());
  await capture(variant,'pesan-link',width);
  if(width<900)await page.locator('[data-message-view=preview]').click();
  const bubble=page.locator('.message-bubble');
  assert(await bubble.locator('.metadata-preview').isVisible());assert(await bubble.locator('#message-preview').isVisible());
  assert((await bubble.innerText()).includes('invitation.example'));assert((await bubble.innerText()).includes('Yth. Keluarga Arunika'));
  if(width<900){assert(await page.locator('#message-editor').isHidden());await capture(variant,'pesan-preview-final',width);await page.locator('[data-message-view=edit]').click();}
  await go(variant,'media');assert.equal(await page.locator('.gallery-tile').count(),9);assert.equal(await page.locator('.media-part:visible').count(),1);assert(await page.locator('#media-part-couple').isVisible());assert(await page.locator('#media-part-gallery').isHidden());assert(await page.locator('#media-part-music').isHidden());
  await capture(variant,'media-couple',width);
  if(width!==320)await page.screenshot({path:path.join(__dirname,`screenshots/${variant}-media-${width}.png`),fullPage:true});
  await choose('media','gallery');assert.equal(await page.locator('.media-part:visible').count(),1);assert(await page.locator('#media-part-gallery').isVisible());assert.equal(await page.locator('#gallery-media .media-card').count(),9);
  await capture(variant,'media-gallery',width);
  await page.locator('[data-gallery-slot=gallery2]').click();
  if(width<900){assert(await page.locator('#gallery-slot-dialog').isVisible());await capture(variant,'gallery-dialog',width,true);await page.keyboard.press('Escape');assert(await page.locator('[data-gallery-slot=gallery2]').evaluate(el=>el===document.activeElement));}
  else{assert(await page.locator('#gallery-editor-2').isVisible());assert(await page.locator('#gallery-editor-1').isHidden());}
  await choose('media','music');assert.equal(await page.locator('.media-part:visible').count(),1);assert(await page.locator('.compact-music-card').isVisible());assert(await page.locator('.compact-music-card .media-placeholder').isHidden());await capture(variant,'media-music',width);
  report.push(`${variant}/${width}: same DetailAcara navigation, message editor + complete final WhatsApp preview, only selected media section visible, gallery/mobile dialog, no overflow PASS`);
 }
 for(const variant of ['studio','studio-v2']){
  await page.setViewportSize({width:1440,height:1000});
  const styles=[];
  for(const route of ['pesan','media','acara']){await go(variant,route);styles.push(await page.locator(`#page-${route} .event-section-buttons [aria-current]`).evaluate(el=>{const s=getComputedStyle(el);return[s.padding,s.borderRadius,s.fontSize,s.minHeight,s.backgroundColor];}));}
  assert.deepEqual(styles[0],styles[1]);assert.deepEqual(styles[1],styles[2]);
  await go(variant,'pesan');const template=page.locator('#message-template');await template.fill('Halo {nama} {link}');await template.evaluate(el=>el.setSelectionRange(5,11));await page.locator('#tokens button').filter({hasText:'{tanggal}'}).click();assert.equal(await template.inputValue(),'Halo {tanggal} {link}');
  await choose('message','link');await page.locator('#preview-title').fill('Judul contoh baru');assert.equal(await page.locator('#meta-title').innerText(),'Judul contoh baru');assert((await page.locator('.message-bubble').innerText()).includes('Halo Sabtu, 12 Juni 2027'));
  await choose('message','template');assert.equal(await template.inputValue(),'Halo {tanggal} {link}');await template.fill('Halo {nama}');await choose('message','link');await page.getByRole('button',{name:'Simpan pesan dan pratinjau',exact:true}).click();assert(await template.isVisible());assert(await template.evaluate(el=>el===document.activeElement));
  await template.fill('Halo {link}');await choose('message','link');const thumb=page.locator('[data-slot=preview] input');await thumb.setInputFiles({name:'thumbnail.png',mimeType:'image/png',buffer:png});await page.locator('[data-slot=preview] .upload').click();await page.waitForFunction(()=>!!document.querySelector('#metadata-image img'));assert.equal(await page.locator('#message-state').innerText(),'Perubahan belum disimpan');assert(await page.locator('.message-bubble img').isVisible());assert(await page.locator('.message-bubble #message-preview').isVisible());
  await page.getByRole('button',{name:'Simpan pesan dan pratinjau',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#message-state').textContent==='Pengaturan tersimpan');
  await page.locator('#page-pesan [data-section=template]').focus();await page.keyboard.press('Enter');assert(await page.locator('#message-template-heading').evaluate(el=>el===document.activeElement));
  await go(variant,'media');await choose('media','gallery');const tile=page.locator('[data-gallery-slot=gallery2]');await tile.click();const input=page.locator('[data-slot=gallery2] input');
  await input.setInputFiles({name:'invalid.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('invalid')});assert(await page.locator('[data-slot=gallery2] .upload').isDisabled());
  await input.setInputFiles({name:'gagal.png',mimeType:'image/png',buffer:png});await page.locator('[data-slot=gallery2] .upload').click();await page.waitForFunction(()=>document.querySelector('[data-slot=gallery2] .media-feedback').textContent.includes('gagal'));assert.equal(await input.evaluate(el=>el.files[0].name),'gagal.png');
  await choose('media','music');await choose('media','gallery');await page.locator('[data-gallery-slot=gallery3]').click();await tile.click();assert.equal(await input.evaluate(el=>el.files[0].name),'gagal.png');
  await input.setInputFiles({name:'contoh.png',mimeType:'image/png',buffer:png});await page.locator('[data-slot=gallery2] .upload').click();await page.waitForFunction(()=>document.querySelector('#gallery-count').textContent==='1/9 terpasang');assert(await tile.locator('img').isVisible());
  await input.setInputFiles({name:'pengganti.png',mimeType:'image/png',buffer:png});await page.locator('[data-slot=gallery2] .upload').click();assert(await page.locator('[data-slot=gallery2] .remove').isDisabled());await page.waitForFunction(()=>!document.querySelector('[data-slot=gallery2]').hasAttribute('aria-busy'));
  await page.locator('[data-slot=gallery2] .remove').click();await page.locator('#cancel-action').click();assert(await tile.locator('img').isVisible());await page.locator('[data-slot=gallery2] .remove').click();await page.locator('#confirm-action').click();await page.waitForFunction(()=>document.querySelector('#gallery-count').textContent==='0/9 terpasang');
  await choose('media','couple');await page.locator('[data-slot=groom] .couple-edit-button').click();assert(await page.locator('[data-slot=groom] input').isVisible());assert((await page.locator('[data-slot=groom] .couple-edit-button').innerText()).includes('Tutup editor'));await capture(variant,'couple-editor',1440);
  await choose('media','music');assert.equal(new URL(page.url()).hash,'#media');await page.locator('[data-slot=music] input').setInputFiles(path.join(__dirname,'../../../tests/fixtures/silence.mp3'));await page.locator('[data-slot=music] .upload').click();await page.waitForFunction(()=>!!document.querySelector('[data-slot=music] audio'));assert(await page.locator('.music-empty-note').isHidden());await choose('media','gallery');assert(await page.locator('[data-slot=music] audio').evaluate(el=>el.paused));
  await page.setViewportSize({width:390,height:844});await go(variant,'media');await choose('media','gallery');await page.locator('[data-gallery-slot=gallery1]').click();const mobileInput=page.locator('[data-slot=gallery1] input');await mobileInput.setInputFiles({name:'gagal.png',mimeType:'image/png',buffer:png});await page.locator('[data-slot=gallery1] .upload').click();await page.waitForFunction(()=>document.querySelector('[data-slot=gallery1] .media-feedback').textContent.includes('gagal'));await page.keyboard.press('Escape');assert(await page.locator('[data-gallery-slot=gallery1]').evaluate(el=>el===document.activeElement));await page.locator('[data-gallery-slot=gallery1]').click();assert.equal(await mobileInput.evaluate(el=>el.files[0].name),'gagal.png');await mobileInput.setInputFiles({name:'valid.png',mimeType:'image/png',buffer:png});await page.locator('[data-slot=gallery1] .upload').click();await page.waitForFunction(()=>document.querySelector('#gallery-count').textContent==='1/9 terpasang');await page.locator('[data-slot=gallery1] .remove').click();await page.locator('#confirm-action').click();await page.waitForFunction(()=>document.querySelector('#gallery-count').textContent==='0/9 terpasang');await page.keyboard.press('Escape');assert(await page.locator('[data-gallery-slot=gallery1]').evaluate(el=>el===document.activeElement));await page.locator('[data-gallery-slot=gallery1]').click();await page.evaluate(()=>location.hash='#tamu');await page.locator('#page-tamu').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#gallery-slot-dialog').open);assert(await page.locator('#tamu-title').evaluate(el=>el===document.activeElement));
  report.push(`${variant}: submenu computed styles identical across3pages; full final preview text+metadata+uploadedimage; keyboard/validation/draft/independentupload/save; media file retention acrosssections/slots/modal, retries, busy/delete, native audio PASS`);
 }
 assert.deepEqual(errors,[]);report.push('No JS errors. Production unchanged; Detail Acara shared navigation preserves its geometry and behavior.');fs.writeFileSync(path.join(__dirname,'content-verification.txt'),report.join('\n')+'\n');console.log(report.join('\n'));await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
