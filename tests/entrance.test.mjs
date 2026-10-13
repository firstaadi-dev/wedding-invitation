import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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

const page = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
assert.doesNotMatch(page, /<nav\b|hamburger|bottom-nav/i);
assert.equal((page.match(/class="trees trees-left"/g) || []).length, 6);
assert.equal((page.match(/class="trees trees-right"/g) || []).length, 6);
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

console.log('Lolos: progress parallax dan transisi section 3D, one page tanpa navigasi, foreground tiap section, cover amplop, orang tua, dan rujukan ayat.');
