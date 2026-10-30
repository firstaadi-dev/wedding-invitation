import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
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
test('sitemap and structured data describe the public company page',async()=>{
 const html=await readFile('frontend/dist/company.html','utf8');
 const sitemap=await readFile('frontend/dist/sitemap.xml','utf8');
 const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
 assert.deepEqual(urls,['https://weddinvita.id/company']);
 assert.ok(html.includes('<link rel="canonical" href="https://weddinvita.id/company">'));
 const structured=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
 assert.equal(structured['@type'],'Organization');
 assert.equal(structured.url,urls[0]);
 assert.deepEqual(structured.logo,{'@type':'ImageObject',url:'https://weddinvita.id/assets/weddinvita-logo.png',width:512,height:512});
});
test('brand icons survive the build at crawlable stable URLs on every entry',async()=>{
 for(const file of ['company','index','access','admin']){
  const html=await readFile(`frontend/dist/${file}.html`,'utf8');
  for(const [rel,path] of [['icon','favicon.png'],['icon','weddinvita-logo.svg'],['apple-touch-icon','apple-touch-icon.png']]){
   assert.match(html,new RegExp(`<link[^>]+rel="${rel}"[^>]+href="/assets/${path.replaceAll('.','\\.')}"`));
  }
 }
 for(const [file,size] of [['favicon.png',96],['apple-touch-icon.png',180],['weddinvita-logo.png',512]]){
  const {width,height,format}=await sharp(`frontend/dist/assets/${file}`).metadata();
  assert.equal(format,'png');assert.equal(width,size);assert.equal(height,size);
 }
 const robots=await readFile('frontend/dist/robots.txt','utf8');
 assert.ok(robots.includes('Allow: /assets/'));
});
