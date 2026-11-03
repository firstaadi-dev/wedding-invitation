import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fadeInSections,complexFadeInAnimations,playFadeIn} from '../frontend/fade-in.js';
import {entranceProgress,sectionProgress} from '../frontend/invitation.js';

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

const invitationSource = readFileSync(new URL('../frontend/invitation.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
function revealHarness(mode = 'once', supported = true, reducedMotion = false, sections = {}) {
  const cards = Array.from({length:3},() => {
    const classes = new Set();return {classes,dataset:{},style:{setProperty(name,value){this[name]=value;}},classList:{
      add:name => classes.add(name),
      toggle:(name,enabled) => enabled ? classes.add(name) : classes.delete(name),
    }};
  });
  let observer;
  const context = {
    fadeInSections,complexFadeInAnimations,playFadeIn,
    document:{querySelector:() => ({addEventListener(){}}),querySelectorAll:selector => selector === '.portrait-paper' ? cards.slice(0,2) : selector === '.gift-paper' ? cards.slice(2) : []},
    window:{matchMedia:() => ({matches:reducedMotion,addEventListener(){}}),addEventListener(){},requestAnimationFrame(){return 1;}},
  };
  if (supported) context.IntersectionObserver = class {
    constructor(callback) {this.callback=callback;this.observed=new Set();observer=this;}
    observe(card) {this.observed.add(card);}
    unobserve(card) {this.observed.delete(card);}
  };
  runInNewContext(`${invitationSource}\nconfigureFadeIn(${JSON.stringify(mode)},${JSON.stringify(sections)});`,context);return {cards,observer};
}
const {cards,observer} = revealHarness();
assert.equal(observer.observed.size,3);
assert.equal(cards[0].classes.has('reveal-right'),false);
assert.equal(cards[1].classes.has('reveal-right'),true);
assert.equal(cards[2].classes.has('reveal-right'),false);
observer.callback([{target:cards[0],isIntersecting:false},{target:cards[1],isIntersecting:true}]);
assert.equal(cards[0].classes.has('is-revealed'),false);
assert.equal(cards[1].classes.has('is-revealed'),true);
assert.equal(observer.observed.has(cards[1]),false,'Revealed cards stop being observed');
observer.callback([{target:cards[1],isIntersecting:false}]);
assert.equal(cards[1].classes.has('is-revealed'),true,'Leaving the viewport keeps the card visible');
observer.callback([{target:cards[1],isIntersecting:true}]);
assert.equal(cards[1].classes.has('is-revealed'),true,'Scrolling back up does not reset the reveal');
observer.callback([{target:cards[1],isIntersecting:false},{target:cards[0],isIntersecting:true}]);
assert.equal(cards[1].classes.has('is-revealed'),true);
assert.equal(cards[0].classes.has('is-revealed'),true);
assert.equal(observer.observed.has(cards[0]),false);
assert.equal(observer.observed.has(cards[2]),true,'Unseen cards still wait for their first reveal');
const repeated = revealHarness('repeat');
for (const isIntersecting of [true,false,true,false,true]) {
  repeated.observer.callback([{target:repeated.cards[0],isIntersecting}]);
  assert.equal(repeated.cards[0].classes.has('is-revealed'),isIntersecting,'Repeat mode follows viewport entry and exit from either direction');
  assert.equal(repeated.observer.observed.has(repeated.cards[0]),true);
}
for (const harness of [revealHarness('disabled'),revealHarness('once',false),revealHarness('repeat',true,true)]) {
  assert.equal(harness.observer?.observed.size || 0,0);
  assert.ok(harness.cards.every(card => card.classes.size === 0),'Disabled, reduced-motion and unsupported browsers keep every card visible');
}

const custom = revealHarness('disabled',true,false,{
  mempelai:{mode:'repeat',animation:'zoom',duration:0.5},sumbangan:{mode:'once',animation:'up',duration:10},
});
assert.equal(custom.observer.observed.size,3,'Sections can override a disabled global mode');
assert.equal(custom.cards[0].dataset.revealAnimation,'zoom');
assert.equal(custom.cards[0].style['--reveal-duration'],'0.5s');
assert.equal(custom.cards[2].dataset.revealAnimation,'up');
assert.equal(custom.cards[2].style['--reveal-duration'],'10s');
custom.observer.callback([{target:custom.cards[0],isIntersecting:true},{target:custom.cards[2],isIntersecting:true}]);
custom.observer.callback([{target:custom.cards[0],isIntersecting:false},{target:custom.cards[2],isIntersecting:false}]);
assert.equal(custom.cards[0].classes.has('is-revealed'),false);
assert.equal(custom.cards[2].classes.has('is-revealed'),true);
const disabledSection = revealHarness('once',true,false,{mempelai:{mode:'disabled'}});
assert.equal(disabledSection.observer.observed.size,1);
assert.equal(disabledSection.cards[0].classes.size,0);
assert.equal(cards[0].style['--reveal-duration'],'2s','Legacy duration remains 2 seconds');

const page = readFileSync(new URL('../frontend/index.html', import.meta.url), 'utf8');
assert.doesNotMatch(page, /<nav\b|hamburger|bottom-nav/i);
assert.equal((page.match(/class="trees trees-left"/g) || []).length, 8);
assert.equal((page.match(/class="trees trees-right"/g) || []).length, 8);
assert.match(page, /Mempelai Pertama/);
assert.match(page, /Mempelai Kedua/);
assert.doesNotMatch(page, /Firsta|Talitha|Nugroho|Arieta|Sudaryatno|Wuri/);
assert.match(page, /Tanggal akan diinformasikan/);
assert.match(page, /Lokasi akan diinformasikan/);
assert.doesNotMatch(page, /22 November 2026|Arjuna Ballroom/);
assert.doesNotMatch(page, /Buka Google Maps|maps\.app\.goo\.gl/);
assert.doesNotMatch(page, /Beserta keluarga besar|class="farewell-date"/);


assert.match(page, /Buka undangan/);
assert.doesNotMatch(page, /Undangan Pernikahan · Adat Solo|class="full-names"/);
assert.match(page, /lang="ar" dir="rtl"/);
assert.match(page, /quran.com\/id\/ar-rum\/21/);

const gifts = page.match(/<details class="gift-details">([\s\S]*?)<\/details>/)[1];
assert.match(gifts, /<summary class="guest-button">[\s\S]*?<span>Berbagi tanda kasih<\/span>[\s\S]*?<\/summary>/);
assert.equal((gifts.match(/class="guest-paper gift-paper"/g) || []).length,1);
assert.match(gifts, /id="gift-accounts"/);
const content = readFileSync(new URL('../frontend/content.js', import.meta.url), 'utf8');
assert.doesNotMatch(content, /Firsta|Talitha|Nugroho|Arieta|Sudaryatno|Wuri|0033 1600 0000|1350018340537/);

console.log('Lolos: parallax, transisi section 3D, fade-in nonaktif/sekali/bolak-balik, reduced motion, fallback tanpa observer, dan konten undangan.');
