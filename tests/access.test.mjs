import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const canonical='/d291b953-df84-463b-8319-80aff739c16a';
const source=readFileSync('frontend/access.js','utf8')
  .replaceAll("import('./identification.js')",'loadIdentification()')
  .replace(/open\(\);\s*$/,'globalThis.finished = open();');
async function access(path,storage,{fail=false,token='a'.repeat(27)}={}) {
  const location=new URL('https://invitation.example'+path);
  let redirected,loaded=0;
  const retry={hidden:true,addEventListener(){}};
  const context=vm.createContext({
    location:Object.assign(location,{replace(value){redirected=value;}}),
    history:{replaceState(_state,_title,path){location.href=new URL(path,location).href;}},
    sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    document:{querySelector:selector=>selector==='#retry'?retry:selector.startsWith('meta')?{content:canonical}:{}},
    async loadIdentification(){
      loaded++;
      assert.equal(location.pathname,canonical);assert.equal(location.hash,'');assert.equal(location.search,'?access=1');
      return {identify:async id=>{assert.equal(id,'challenge');return {event_id:'event'};}};
    },
    async fetch(path,options){
      assert.equal(location.pathname,canonical);assert.equal(location.hash,'');
      const data=JSON.parse(options.body);
      if(path.endsWith('/challenge'))assert.deepEqual(data,{token});
      else assert.deepEqual(data,{challenge:'challenge',eventId:'event'});
      return {ok:!fail,json:async()=>fail?{error:'try again'}:{challenge:'challenge'}};
    },
  });
  new vm.Script(source).runInContext(context);await context.finished;
  return {redirected,loaded,retry};
}
test('guest code is stripped before Fingerprint imports and token is removed after verification',async()=>{
  const storage=new Map();const result=await access('/u/'+'a'.repeat(27),storage);
  assert.equal(result.redirected,canonical);assert.equal(result.loaded,1);assert.equal(storage.size,0);
});
test('failed verification survives a canonical reload, and legacy fragments still work',async()=>{
  const storage=new Map();const failed=await access('/u/'+'a'.repeat(27),storage,{fail:true});
  assert.equal(failed.loaded,0);assert.equal(failed.retry.hidden,false);
  assert.equal(storage.get('invitation-token:'+canonical),'a'.repeat(27));
  assert.equal((await access(canonical+'?access=1',storage)).redirected,canonical);
  const token='b'.repeat(43);
  assert.equal((await access(canonical+'#'+token,storage,{token})).redirected,canonical);
  assert.equal(storage.size,0);
});
