import test from 'node:test';
import assert from 'node:assert/strict';
import {cropRectangle, cropPhoto, photoFrame} from '../frontend/image-crop.js';

test('crop frames follow the current invitation theme and message dimensions', () => {
  for (const slot of ['groom','bride']) {
    assert.deepEqual(photoFrame(slot), {kind:'portrait',ratio:246/250});
    assert.deepEqual(photoFrame(slot,true), {kind:'portrait',ratio:225/280});
  }
  for (let i=1;i<=9;i++) assert.deepEqual(photoFrame(`gallery${i}`), {kind:'gallery',ratio:4/5});
  assert.deepEqual(photoFrame('preview'), {kind:'message',ratio:1200/630});
});

test('original ratio preserves the whole image without zoom', async () => {
  const rectangle = cropRectangle(1200, 800, 0, 1, 50, 50);
  assert.deepEqual(rectangle, {x:0, y:0, width:1200, height:800});
  const file = {};
  assert.equal(await cropPhoto({naturalWidth:1200, naturalHeight:800}, rectangle, file), file);
});

test('portrait and landscape crops stay inside the source at every position and zoom', () => {
  for (const [width,height] of [[1200,800],[800,1200],[1,1]]) {
    for (const ratio of [0,4/5,1,3/2,1200/630]) {
      for (const zoom of [1,1.5,3]) {
        for (const x of [0,50,100]) for (const y of [0,50,100]) {
          const crop = cropRectangle(width,height,ratio,zoom,x,y);
          assert(crop.x >= 0 && crop.y >= 0);
          assert(crop.x + crop.width <= width + 1e-9);
          assert(crop.y + crop.height <= height + 1e-9);
          assert(Math.abs(crop.width / crop.height - (ratio || width/height)) < 1e-9);
        }
      }
    }
  }
});

test('position selects the requested source area and zoom reduces the crop', () => {
  assert.deepEqual(cropRectangle(1200,800,1,1,100,0), {x:400,y:0,width:800,height:800});
  assert.deepEqual(cropRectangle(1200,800,1,2,50,100), {x:400,y:400,width:400,height:400});
  const preview = cropRectangle(1200,1200,1200/630,1,50,100);
  assert.equal(preview.width,1200);
  assert.equal(preview.height,630);
  assert.equal(preview.y,570);
});
