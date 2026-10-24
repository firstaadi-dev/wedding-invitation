const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const report=[];
 for(const width of [1440,390,320])for(const route of ['tamu','login','pesan','media','acara']){
  await page.setViewportSize({width,height:width===1440?1000:844});await page.goto('file://'+path.join(__dirname,'studio-v2.html')+'#'+route);await page.reload();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}/${route} overflow`);
  assert(await page.locator(route==='login'?'#login-form':`#page-${route}`).isVisible());
  const primary=page.locator(route==='login'?'#login-form .primary':route==='tamu'?'#add-guest':route==='pesan'?'button[form=message-form]':route==='acara'?'button[form=event-form]':'#gift-toggle');
  if(route!=='media'){assert.equal(await primary.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(24, 61, 50)');assert.equal(await primary.evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');}
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
  if(width!==320){await page.screenshot({path:path.join(__dirname,`screenshots/studio-v2-${route}-${width}.png`),fullPage:true});if(route==='tamu')await page.screenshot({path:path.join(__dirname,`screenshots/studio-v2-tamu-cover-${width}.png`)});}
  report.push(`Studio V2 ${width}/${route}: visible, no overflow, reference primary #183D32`);
 }
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:width===1440?1100:844});await page.goto('file://'+path.join(__dirname,'studio-compare.html'));await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`compare/${width} overflow`);
  for(const route of ['tamu','login','pesan','media','acara']){
   await page.locator('#review-page').selectOption(route);
   await page.getByRole('button',{name:'Mobile',exact:true}).click();await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
   assert.equal(await page.locator('[data-concept=studio-v2] .open').getAttribute('href'),`studio-v2.html#${route}`);
   await page.getByRole('button',{name:'Desktop',exact:true}).click();await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  }
  await page.locator('#review-page').selectOption('acara');await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  if(width!==320)await page.screenshot({path:path.join(__dirname,`screenshots/studio-compare-${width}.png`),fullPage:true});
  report.push(`Comparison ${width}: all5routes, desktop/mobile images and Coba links PASS`);
 }
 await page.goto('file://'+path.join(__dirname,'index.html'));await page.getByRole('button',{name:'Mobile',exact:true}).click();await page.locator('#review-page').selectOption('acara');await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 assert.equal(await page.locator('[data-concept=studio] .open').getAttribute('href'),'studio.html#acara');
 assert.deepEqual(errors,[]);report.push('Preview index redirects to Studio/Studio V2 board and switches route/device. No JS errors; local synthetic study only.');
 fs.writeFileSync(path.join(__dirname,'studio-v2-verification.txt'),report.join('\n')+'\n');console.log(report.join('\n'));await browser.close();
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;});
