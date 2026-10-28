import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {defaultWhatsappTemplate} from '../frontend/whatsapp.js';
test('Go template assets have stable entry names and all local references exist',async()=>{
 for(const [file,entry] of [['index.html','invitation'],['access.html','access'],['admin.html','admin'],['company.html','company']]){
  const html=await readFile(`frontend/dist/${file}`,'utf8');
  assert.ok(html.includes(`/assets/${entry}.js`));assert.ok(html.includes(`/assets/${entry}.css`));assert.ok(!html.includes('modulepreload'));
  for(const [,path] of html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)/g))await readFile(`frontend/dist${path}`);
 }
});
test('default WhatsApp message stays identical between Go and browser',async()=>{
 const source=await readFile('backend/internal/app/admin.go','utf8');assert.ok(source.includes('`'+defaultWhatsappTemplate+'`'));
});
test('sitemap matches public canonical pages and organization data survives the build',async()=>{
 const sitemap=await readFile('frontend/dist/sitemap.xml','utf8');
 const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
 const pages=['company','terms','privacy','cookie-policy'];
 assert.deepEqual(urls,pages.map(page=>`https://weddinvita.id/${page}`));
 for(const page of pages){
  const html=await readFile(`frontend/dist/${page}.html`,'utf8');
  assert.ok(html.includes(`<link rel="canonical" href="https://weddinvita.id/${page}">`));
 }
 const company=await readFile('frontend/dist/company.html','utf8');
 const structured=JSON.parse(company.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
 assert.equal(structured['@type'],'Organization');
 assert.equal(structured.url,urls[0]);
 assert.equal(structured.email,'support@weddinvita.id');
});
