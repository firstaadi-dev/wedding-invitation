import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('frontend/identification.js','utf8').replace('await import(source)','await loadAgent(source)').replace('export async function identify','async function identify').concat('\nglobalThis.identifyForTest=identify;');
async function harness(config,{failConfig=false,failImport=false}={}) {
  let fetches=0,imports=[];const starts=[];let firstFailConfig=failConfig,firstFailImport=failImport;
  const context=vm.createContext({
    fetch:async()=>{fetches++;const ok=!firstFailConfig;firstFailConfig=false;return {ok,json:async()=>config};},
    loadAgent:async url=>{imports.push(url);if(firstFailImport){firstFailImport=false;throw Error('network');}return {start:options=>{starts.push(options);return {get:async options=>({event_id:'e',linked_id:options.linkedId})};}};},
    location:{hostname:'example.test'},console,setTimeout:fn=>fn(),
  });
  new vm.Script(source).runInContext(context);
  return {identify:context.identifyForTest,counts:()=>({fetches,imports,starts})};
}
test('uses server key and selected region for custom endpoint',async()=>{
 const h=await harness({endpoint:'https://fp.example',publicKey:'public-key',region:'eu'});
 assert.deepEqual(JSON.parse(JSON.stringify(await h.identify('challenge'))),{event_id:'e',linked_id:'challenge'});
 assert.deepEqual(JSON.parse(JSON.stringify(h.counts())),{fetches:1,imports:['https://fp.example/web/v4/public-key'],starts:[{region:'eu',endpoints:['https://fp.example']} ]});
});
test('uses configured key, region, and CDN when no custom endpoint exists',async()=>{
 const h=await harness({endpoint:'',publicKey:'abc /',region:'us'});await h.identify();
 assert.equal(h.counts().imports[0],'https://fpjscdn.net/v4/abc%20%2F');assert.deepEqual(JSON.parse(JSON.stringify(h.counts().starts)),[{region:'us'}]);
});

test('configuration and import failures can recover without a page reload',async()=>{
 for (const failure of [{failConfig:true},{failImport:true}]) {
  const h=await harness({endpoint:'',publicKey:'abc',region:'ap'},failure);
  await assert.rejects(h.identify('first'));
  assert.deepEqual(JSON.parse(JSON.stringify(await h.identify('retry'))),{event_id:'e',linked_id:'retry'});
  assert.equal(h.counts().fetches, failure.failImport ? 2 : 2);
 }
});
test('concurrent first calls share configuration and agent initialization',async()=>{
 const h=await harness({endpoint:'',publicKey:'abc',region:'ap'});
 const results=await Promise.all([h.identify('one'),h.identify('two')]);
 assert.deepEqual(JSON.parse(JSON.stringify(results)),[{event_id:'e',linked_id:'one'},{event_id:'e',linked_id:'two'}]);
 assert.equal(h.counts().fetches,1);assert.equal(h.counts().imports.length,1);assert.equal(h.counts().starts.length,1);
});
