// Public gallery checks with local image fixtures; no backend or guest data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const esbuild=require('../frontend/node_modules/esbuild');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'frontend/content.js'),'utf8');
const functions=source.slice(source.indexOf('function photo('),source.indexOf('function startCountdown('))+
  source.slice(source.indexOf('function renderGallery('),source.indexOf('function label('));
const html=fs.readFileSync(path.join(root,'frontend/index.html'),'utf8')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
const photos=Object.fromEntries(Array.from({length:9},(_,i)=>[`gallery${i+1}`,
  'data:image/svg+xml;base64,'+Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#${i%2?'c5d5c2':'e3cfb0'}"/><text x="200" y="250" text-anchor="middle" font-size="48" fill="#183d32">Foto ${i+1}</text></svg>`).toString('base64')]));
(async()=>{
  const css=await esbuild.build({entryPoints:[path.join(root,'frontend/styles.css')],bundle:true,write:false,loader:{'.webp':'dataurl'},plugins:[{name:'assets',setup(build){build.onResolve({filter:/^\/assets\//},args=>({path:path.join(root,'frontend/static',args.path)}));}}]});
  fs.mkdirSync(path.join(root,'outputs/gallery-layout'),{recursive:true});
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page=await browser.newPage({reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    async function load(media=photos,layout) {
      await page.setContent(html);
      await page.addStyleTag({content:css.outputFiles[0].text});
      await page.addScriptTag({content:functions});
      await page.evaluate(({media,layout})=>renderGallery(media,layout),{media,layout});
    }
    async function swipe(selector,dx,dy=0) {
      const surface=page.locator(selector);
      await surface.scrollIntoViewIfNeeded();
      const box=await surface.boundingBox();
      const x=box.x+box.width/2,y=box.y+box.height/2;
      await page.mouse.move(x,y);
      await page.mouse.down();
      await page.mouse.move(x+dx,y+dy,{steps:8});
      await page.mouse.up();
    }
    for(const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:900});
      await load();
      const buttons=page.locator('#gallery-thumbnails button');
      assert.equal(await buttons.count(),8);
      assert.equal(await page.locator('#gallery-collage button').count(),0);
      assert.equal(await page.locator('#gallery-collage').isVisible(),false);
      assert.equal(await page.locator('#gallery-position').textContent(),'1 / 8');
      const boxes=await buttons.evaluateAll(nodes=>nodes.map(el=>({top:el.offsetTop,width:el.offsetWidth,height:el.offsetHeight})));
      assert.equal(new Set(boxes.map(box=>box.top)).size,2);
      assert(boxes.every(box=>box.width>=44 && box.height>=44));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
      await buttons.nth(7).click();
      assert.equal(await page.locator('#gallery-position').textContent(),'8 / 8');
      assert.equal(await buttons.nth(7).getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('#gallery-featured img').getAttribute('src'),photos.gallery8);
      await swipe('#gallery-featured',-80);
      assert.equal(await page.locator('#gallery-position').textContent(),'1 / 8');
      assert.equal(await buttons.first().getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('dialog').count(),0,'Gallery stays inline');
      await swipe('#gallery-featured',80);
      assert.equal(await page.locator('#gallery-position').textContent(),'8 / 8');
      await swipe('#gallery-featured',10,80);
      assert.equal(await page.locator('#gallery-position').textContent(),'8 / 8','vertical gestures do not change photos');
      await swipe('#gallery-featured',20);
      assert.equal(await page.locator('#gallery-position').textContent(),'8 / 8','short gestures do not change photos');
      await page.locator('#gallery-featured').click();
      assert.equal(await page.locator('dialog').count(),0,'Clicking the photo cannot open a lightbox');
      await page.locator('#gallery-featured').press('ArrowRight');
      assert.equal(await page.locator('#gallery-position').textContent(),'1 / 8');
      await page.locator('#gallery-featured').press('ArrowLeft');
      assert.equal(await page.locator('#gallery-position').textContent(),'8 / 8');
      await page.locator('#gallery-thumbnails button').first().click();
      await page.locator('.gallery-album').screenshot({path:path.join(root,`outputs/gallery-layout/invitation-${width}.png`)});
      await load(photos,'9');
      assert.equal(await page.locator('#gallery-thumbnails button').count(),9);
      assert.equal(await page.locator('#gallery-collage button').count(),9);
      assert.equal(await page.locator('#gallery-position').isVisible(),false);
      assert.equal(await page.locator('#gallery-thumbnails').evaluate(el=>getComputedStyle(el).display),'flex');
      await swipe('#gallery-featured',-80);
      assert.equal(await page.locator('#gallery-featured img').getAttribute('src'),photos.gallery2);
      await page.locator('#gallery-collage button').nth(8).click();
      assert.equal(await page.locator('#gallery-featured img').getAttribute('src'),photos.gallery9);
      assert.equal(await page.locator('dialog').count(),0);
      console.log(`PASS ${width}px: 4 × 2 thumbnails, inline swipe, gesture thresholds, keyboard arrow wrap, no lightbox, previous 9-photo layout`);
    }
    const touch=await page.context().newCDPSession(page);
    async function touchSwipe(selector,dx,dy=0) {
      const surface=page.locator(selector);
      await surface.scrollIntoViewIfNeeded();
      const box=await surface.boundingBox();
      const x=box.x+box.width/2,y=box.y+box.height/2;
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      for(let i=1;i<=8;i++) await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }
    await load();
    await touchSwipe('#gallery-featured',-80);
    assert.equal(await page.locator('#gallery-position').textContent(),'2 / 8');
    assert.equal(await page.locator('dialog').count(),0);
    await touchSwipe('#gallery-featured',80);
    assert.equal(await page.locator('#gallery-position').textContent(),'1 / 8');
    await touchSwipe('#gallery-featured',0,-80);
    assert.equal(await page.locator('#gallery-position').textContent(),'1 / 8');
    await touch.detach();
    console.log('PASS touch swipes on inline photos and vertical scroll gesture');
    await load({});
    assert(await page.locator('#gallery-empty').isVisible());
    assert.equal(await page.locator('#gallery-featured').isVisible(),false);
    assert.equal(await page.locator('#gallery-position').isVisible(),false);
    await load({gallery9:photos.gallery9});
    assert(await page.locator('#gallery-empty').isVisible());
    assert.equal(await page.locator('#gallery-thumbnails button').count(),0);
    await load({gallery9:photos.gallery9},'9');
    assert.equal(await page.locator('#gallery-thumbnails button').count(),1);
    assert.equal(await page.locator('#gallery-featured img').getAttribute('src'),photos.gallery9);
    await page.locator('#gallery-featured').click();
    assert.equal(await page.locator('dialog').count(),0);
    assert.equal(await page.locator('#gallery-swipe-help').count(),0);
    await swipe('#gallery-featured',-80);
    assert.equal(await page.locator('#gallery-featured img').getAttribute('src'),photos.gallery9);
    assert.deepEqual(errors,[]);
    console.log('PASS empty/single-photo galleries, nonconsecutive slots and no browser errors');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
