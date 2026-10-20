import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createApp} from '../server/app.mjs';

test('rate limiting trusts forwarded IPs only behind an explicitly trusted production proxy',async t => {
  const render = process.env.RENDER;
  delete process.env.RENDER;
  t.after(() => {if (render === undefined) delete process.env.RENDER;else process.env.RENDER = render;});
  for (const [production,trustProxy,forwarded,expected,onRender] of [
    [true,true,'198.51.100.1','198.51.100.1'],
    [true,true,'198.51.100.1, 203.0.113.2','203.0.113.2'],
    [true,true,'','127.0.0.1'],
    [true,false,'198.51.100.1','127.0.0.1'],
    [false,true,'198.51.100.1','127.0.0.1'],
    [true,false,'198.51.100.1','198.51.100.1',true],
  ]) {
    if (onRender) process.env.RENDER = 'true';else delete process.env.RENDER;
    let key;
    const server = createApp({query:async (_sql,params) => {
      key = params[0];return {rows:[{hits:9}]};
    }},{origin:'https://invitation.example',production,trustProxy});
    server.listen(0,'127.0.0.1');await once(server,'listening');
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/login`,{
        method:'POST',headers:{Origin:'https://invitation.example','X-Forwarded-For':forwarded},
      });
      assert.equal(response.status,429);
      await response.json();
      assert.equal(key,createHash('sha256').update(`login:${expected}`).digest('hex'));
    } finally {await new Promise(resolve => server.close(resolve));}
  }
});
