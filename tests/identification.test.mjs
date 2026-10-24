import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('frontend/identification.js','utf8').replace('await import(source)','await loadAgent(source)').replace('export async function identify','async function identify').concat('\nglobalThis.identifyForTest=identify;');
async function harness(config,{failConfig=false,failImport=false}={}) {
  let fetches=0,imports=[];const starts=[];
  const context=vm.createContext({
    fetch:async()=>{fetches++;return {ok:!failConfig,json:async()=>config};},
    loadAgent:async url=>{imports.push(url);if(failImport)throw Error('network');return {start:options=>{starts.push(options);return {get:async options=>({event_id:'e',linked_id:options.linkedId})};}};},
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
