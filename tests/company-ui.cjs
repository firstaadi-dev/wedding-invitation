// Run with Playwright available through NODE_PATH; no backend or guest data required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
const url = process.env.COMPANY_URL || 'http://127.0.0.1:5180/company';
(async () => {
  const browser = await chromium.launch({headless:true,channel:'chrome'});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  fs.mkdirSync('.impeccable/review', {recursive:true});
  try {
    for (const width of [1440, 768, 692, 390, 320]) {
      await page.setViewportSize({width,height:900});
      const response = await page.goto(url);
      assert.equal(response.status(),200);
      await page.evaluate(() => document.fonts.ready);
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.locator('h1').count(),1);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'horizontal overflow');
      assert.equal(await page.locator('.invitation-preview, #open-invitation').count(),0);
      assert(await page.locator('#access-title').isVisible());
      assert.equal(await page.locator('.access-path li').count(),2);
      assert(await page.locator('.access-allowed').innerText().then(text => text.includes('Tetap bisa dibuka')));
      assert(await page.locator('.access-blocked').innerText().then(text => text.includes('Akses ditolak')));
      for (const outcome of await page.locator('.access-outcomes > div').all()) {
        assert(await outcome.evaluate(el => {
          const column = el.getBoundingClientRect();
          const icon = el.querySelector('svg').getBoundingClientRect();
          const connector = parseFloat(getComputedStyle(el, '::before').left);
          return Math.abs(icon.x + icon.width / 2 - column.x - connector) < 1;
        }), 'branch connector and outcome icon must share a center');
      }
      await page.locator('#try-lock').click();
      assert(await page.locator('#lock-result').isVisible());
      assert(await page.locator('#reset-lock').evaluate(el => el === document.activeElement));
      await page.locator('#reset-lock').press('Enter');
      assert(await page.locator('#lock-result').isHidden());
      assert(await page.locator('#try-lock').evaluate(el => el === document.activeElement));
      const question = page.getByText('Bagaimana jika tamu mengganti browser?',{exact:true});
      await question.click();
      assert(await question.locator('..').evaluate(el => el.open));
      await question.click();
      for (const link of await page.locator('a[href^="#"]').all()) {
        const id = (await link.getAttribute('href')).slice(1);
        assert.equal(await page.locator(`[id="${id}"]`).count(),1,`missing target ${id}`);
      }
      await page.evaluate(() => {document.activeElement.blur();window.scrollTo(0,0);});
      if (width === 1440 || width === 390) await page.screenshot({path:`.impeccable/review/${width === 1440 ? 'desktop' : 'mobile'}.png`,fullPage:true});
      if (width === 692) await page.locator('.access-graphic').screenshot({path:'.impeccable/review/user-692.png'});
      console.log(`PASS ${width}px: layout, access infographic, lock/reset, FAQ and section links`);
    }
    assert.equal((await page.request.get(new URL('/company/dashboard',url).href)).status(),200);
    assert.deepEqual(errors,[]);
    console.log('PASS dashboard route and browser errors');
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exit(1);});
