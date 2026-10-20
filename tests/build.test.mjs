import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {defaultWhatsappTemplate} from '../frontend/whatsapp.js';
test('Go template assets have stable entry names and all local references exist',async()=>{
 for(const [file,entry] of [['index.html','invitation'],['access.html','access'],['admin.html','admin']]){
  const html=await readFile(`frontend/dist/${file}`,'utf8');
  assert.ok(html.includes(`/assets/${entry}.js`));assert.ok(html.includes(`/assets/${entry}.css`));assert.ok(!html.includes('modulepreload'));
  for(const [,path] of html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)/g))await readFile(`frontend/dist${path}`);
 }
});
test('default WhatsApp message stays identical between Go and browser',async()=>{
 const source=await readFile('backend/internal/app/admin.go','utf8');assert.ok(source.includes('`'+defaultWhatsappTemplate+'`'));
});
