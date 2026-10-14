import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {entranceProgress,sectionProgress} from '../public/invitation.js';

assert.equal(entranceProgress(100, 1800, 1000), 0);
assert.equal(entranceProgress(0, 1800, 1000), 0);
assert.equal(entranceProgress(-400, 1800, 1000), .5);
assert.equal(entranceProgress(-800, 1800, 1000), 1);
assert.equal(entranceProgress(-2400, 1800, 1000), 1);
assert.equal(entranceProgress(-20, 700, 1000), 1);

assert.equal(sectionProgress(1200, 1000), 0);
assert.equal(sectionProgress(1000, 1000), 0);
assert.equal(sectionProgress(500, 1000), .5);
assert.equal(sectionProgress(0, 1000), 1);
assert.equal(sectionProgress(-2000, 1000), 1);
assert.equal(sectionProgress(0, 0), 1);

const invitationSource = readFileSync(new URL('../public/invitation.js',import.meta.url),'utf8').replace(/^export /gm,'');
function revealHarness(supported = true) {
  const cards = Array.from({length:3},() => {
    const classes = new Set();return {classes,classList:{add:name => classes.add(name)}};
  });
  let observer;
  const context = {
    document:{querySelector:() => ({addEventListener(){}}),querySelectorAll:selector => selector.includes('.portrait-paper') ? cards : []},
    window:{matchMedia:() => ({matches:false,addEventListener(){}}),addEventListener(){},requestAnimationFrame(){return 1;}},
  };
  if (supported) context.IntersectionObserver = class {
    constructor(callback) {this.callback=callback;this.observed=new Set();observer=this;}
    observe(card) {this.observed.add(card);}
    unobserve(card) {this.observed.delete(card);}
  };
  runInNewContext(invitationSource,context);return {cards,observer};
}
const {cards,observer} = revealHarness();
assert.equal(observer.observed.size,3);
assert.equal(cards[0].classes.has('reveal-right'),false);
assert.equal(cards[1].classes.has('reveal-right'),true);
assert.equal(cards[2].classes.has('reveal-right'),false);
observer.callback([{target:cards[0],isIntersecting:false},{target:cards[1],isIntersecting:true}]);
assert.equal(cards[0].classes.has('is-revealed'),false);
assert.equal(cards[1].classes.has('is-revealed'),true);
assert.equal(observer.observed.has(cards[1]),false);
assert.ok(revealHarness(false).cards.every(card => card.classes.size === 0),'Cards remain visible without IntersectionObserver');

const page = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
assert.doesNotMatch(page, /<nav\b|hamburger|bottom-nav/i);
assert.equal((page.match(/class="trees trees-left"/g) || []).length, 8);
assert.equal((page.match(/class="trees trees-right"/g) || []).length, 8);
assert.match(page, /Firsta Adi Pradana/);
assert.match(page, /Talitha Syahda Arundatie/);
assert.match(page, /22 November 2026/);
assert.doesNotMatch(page, /Buka Google Maps|maps\.app\.goo\.gl/);
assert.doesNotMatch(page, /Beserta keluarga besar|class="farewell-date"/);


for (const name of ['Nugroho Andang Hapsoro', 'Arieta Rahmasari', 'Sudaryatno', 'Wuri Wahyuningsih']) assert.match(page, new RegExp(name));
assert.match(page, /Tekan di sini/);
assert.doesNotMatch(page, /Undangan Pernikahan · Adat Solo|class="full-names"/);
assert.match(page, /lang="ar" dir="rtl"/);
assert.match(page, /quran.com\/id\/ar-rum\/21/);

console.log('Lolos: parallax, transisi section 3D, kartu masuk kiri/kanan saat terlihat, fallback tanpa observer, dan konten undangan.');
