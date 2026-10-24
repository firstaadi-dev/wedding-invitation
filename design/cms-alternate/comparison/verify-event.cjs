const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const variant=process.argv[2]||'studio';
 const captureDir=variant==='studio'?'event-screenshots':'event-v2-screenshots';
 const url='file://'+path.join(__dirname,variant+'.html')+'#acara';
 const report=[];
 fs.mkdirSync(path.join(__dirname,captureDir),{recursive:true});
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:width===1440?1000:844});await page.goto(url);await page.reload();await page.evaluate(()=>document.fonts.ready);
  for(const section of ['pasangan','waktu','lokasi','hadiah','akses']){
   if(width>=900)await page.locator(`[data-section=${section}]`).click();else await page.locator('#event-section-select').selectOption(section);
   assert.equal(await page.locator('.event-part:visible').count(),1);
   assert(await page.locator(`#event-part-${section}`).isVisible());
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}/${section} overflow`);
   await page.evaluate(()=>document.activeElement?.blur());await page.evaluate(()=>window.scrollTo(0,0));
   if(width!==320){
    await page.screenshot({path:path.join(__dirname,`${captureDir}/${section}-${width}.png`),fullPage:true});
    if(section==='pasangan')await page.screenshot({path:path.join(__dirname,`screenshots/${variant}-acara-${width}.png`),fullPage:true});
   }
   report.push(`${width}/${section}: visible, one section, no page overflow`);
  }
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(url);await page.reload();
 const input=page.locator('[name=partnerOneName]');await input.fill('Nara Kirana Putri (contoh)');
 await page.locator('[data-section=waktu]').click();await page.locator('[name=ceremonyTime]').fill('10.00 WIB');
 await page.locator('[data-section=pasangan]').click();assert.equal(await input.inputValue(),'Nara Kirana Putri (contoh)');
 assert((await page.locator('#event-couple-summary').innerText()).includes('Putri'));
 assert((await page.locator('#event-schedule-summary').innerText()).includes('10.00 WIB'));
 assert.equal(await page.locator('#event-state').innerText(),'Perubahan belum disimpan');
 await page.locator('[data-section=hadiah]').click();const bank=page.locator('.gift-content input').first();const bankValue=await bank.inputValue();
 await page.locator('#gift-toggle').click();assert(await bank.isDisabled());assert.equal(await bank.inputValue(),bankValue);
 assert((await page.locator('#event-gift-summary').innerText()).includes('Disembunyikan'));
 await page.locator('#gift-toggle').click();assert(await bank.isEnabled());
 await bank.fill('');await page.locator('[data-section=pasangan]').click();
 await page.getByRole('button',{name:'Simpan detail acara',exact:true}).click();
 assert(await page.locator('#event-part-hadiah').isVisible());assert(await bank.evaluate(el=>el===document.activeElement));
 await bank.fill(bankValue);
 await page.locator('[data-section=akses]').click();await page.locator('[name=deviceLimit]').fill('0');
 await page.locator('[data-section=lokasi]').click();await page.getByRole('button',{name:'Simpan detail acara',exact:true}).click();
 assert(await page.locator('#event-part-akses').isVisible());await page.locator('[name=deviceLimit]').fill('3');
 await page.locator('[data-section=lokasi]').click();const map=page.locator('[name=mapEmbedUrl]');await map.fill('https://example.com/maps');
 await page.locator('[data-section=pasangan]').click();await page.getByRole('button',{name:'Simpan detail acara',exact:true}).click();
 assert(await page.locator('#event-part-lokasi').isVisible());assert(await map.evaluate(el=>el===document.activeElement));
 await map.fill('');await page.getByRole('button',{name:'Simpan detail acara',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#event-form').getAttribute('aria-busy')==='true');
 assert(await page.locator('[data-section=hadiah]').isDisabled());
 await page.waitForFunction(()=>document.querySelector('#event-state').textContent==='Pengaturan tersimpan');
 assert(await page.locator('[data-section=hadiah]').isEnabled());
 await page.locator('[data-section=pasangan]').click();assert(await page.locator('#event-previous').isDisabled());
 await page.locator('#event-next').click();assert(await page.locator('#event-part-waktu').isVisible());
 assert(await page.locator('#event-part-title-waktu').evaluate(el=>el===document.activeElement));
 await page.setViewportSize({width:390,height:844});await page.goto(url);await page.reload();
 await page.locator('#event-section-select').selectOption('waktu');assert(await page.locator('#event-part-title-waktu').evaluate(el=>el===document.activeElement));
 const overview=page.locator('.event-overview');assert.equal(await overview.getAttribute('open'),null);await overview.locator('summary').click();assert.notEqual(await overview.getAttribute('open'),null);
 await page.locator('#open-nav').click();await page.locator('#nav-dialog a[href="#tamu"]').click();await page.locator('#page-tamu').waitFor({state:'visible'});
 await page.locator('#open-nav').click();await page.locator('#nav-dialog a[href="#acara"]').click();await page.locator('#page-acara').waitFor({state:'visible'});assert(await page.locator('#event-part-waktu').isVisible());
 assert.deepEqual(errors,[]);
 report.push('PASS: drafts preserved across sections/routes; live summary; gift OFF retains data; hidden invalid gift/browser/map reveals correct section and focuses field; save all/busy; pager and heading focus; mobile selector/summary; no JS errors.');
 fs.writeFileSync(path.join(__dirname,variant==='studio'?'event-verification.txt':'event-v2-verification.txt'),report.join('\n')+'\n');console.log(report.join('\n'));await browser.close();
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;});
