import test from 'node:test';
import assert from 'node:assert/strict';
import {playAudio} from '../frontend/audio.js';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('audio error can be retried and playback failures remain recoverable', async () => {
  const calls = [];
  const audio = {
    error: new Error('network'),
    load() { calls.push('load'); this.error = null; },
    play() { calls.push('play'); return Promise.reject(new Error('blocked')); },
  };
  let failure;
  await playAudio(audio, error => { failure = error; });
  assert.deepEqual(calls, ['load', 'play']);
  assert.equal(failure.message, 'blocked');
});

test('audio without an error plays without reloading', async () => {
  const calls = [];
  await playAudio({error:null,load(){calls.push('load');},play(){calls.push('play');return Promise.resolve();}},()=>{});
  assert.deepEqual(calls, ['play']);
});

test('music tries autoplay, opening button, music button, and first scroll while respecting manual pause', async () => {
  const page = readFileSync(new URL('../frontend/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /<button\b[^>]*id="open-invitation"[^>]* disabled>/);
  const source = readFileSync(new URL('../frontend/content.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  for (const trigger of ['autoplay', 'opening', 'music', 'scroll', 'no music']) {
    const nodes = new Map();
    function node(selector) {
      if (!nodes.has(selector)) nodes.set(selector, {
        disabled: false, value: '', children: [], listeners: {},
        classList: {add(){}, remove(){}}, setAttribute(){}, replaceChildren(){}, append(){},
        addEventListener(event, callback) { this.listeners[event] = callback; },
      });
      return nodes.get(selector);
    }
    node('#response-form').elements = {attendance:node('attendance'), guestCount:node('guestCount')};
    let release;
    let plays = 0;
    const windowListeners = new Map();
    const scroll = () => {
      const listener = windowListeners.get('scroll');
      if (listener?.options.once) windowListeners.delete('scroll');
      listener?.callback();
    };
    runInNewContext(source, {
      window: {
        addEventListener(event, callback, options) {windowListeners.set(event, {callback, options});},
        removeEventListener(event) {windowListeners.delete(event);},
      },
      document: {querySelector:node, querySelectorAll:() => [node('one'), node('two')], createElement:node},
      location: {pathname:'/preview'}, URLSearchParams,
      fetch: url => url.startsWith('/api/invitation') ? new Promise(resolve => {release = resolve;}) : Promise.resolve({ok:true, json:async () => ({wishes:[]})}),
      Audio: class {
        paused = true;
        listeners = {};
        load(){} addEventListener(event, callback){this.listeners[event] = callback;}
        play(){
          plays++;
          if (trigger !== 'autoplay' && plays === 1) return Promise.reject(new Error('blocked'));
          this.paused = false;this.listeners.play();return Promise.resolve();
        }
        pause(){this.paused = true;this.listeners.pause();}
      },
      playAudio, defaultEventDate:'2026-11-22', defaultVenueName:'Venue',
      eventDateLabels:() => ({}), countdownParts:() => [], setInterval(){},
    });
    assert.equal(node('#open-invitation').disabled, false);
    assert.equal(plays, 0);
    release({ok:true, json:async () => ({media:trigger === 'no music' ? {} : {music:'/song.mp3'}, settings:{giftAccounts:[]}})});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(node('#open-invitation').disabled, false);
    assert.notEqual(node('#response-status').textContent, 'Formulir belum dapat dimuat. Muat ulang halaman.');
    if (trigger === 'no music') {
      scroll();node('#open-invitation').listeners.click();
      assert.equal(plays, 0);
      continue;
    }
    assert.equal(plays, 1, 'Music attempts playback without an opening click or scroll');
    if (trigger !== 'autoplay') {
      assert.equal(node('.music-status').title, 'Lagu belum dapat diputar. Tekan untuk mencoba lagi.');
      if (trigger === 'scroll') scroll();
      else node(trigger === 'opening' ? '#open-invitation' : '.music-status').listeners.click();
      assert.equal(plays, 2);
    }
    const started = plays;
    scroll();node('#open-invitation').listeners.click();
    assert.equal(plays, started, 'Playback is not restarted while playing');
    node('.music-status').listeners.click();
    scroll();
    assert.equal(plays, started, 'Scrolling does not undo a manual pause');
    node('.music-status').listeners.click();
    assert.equal(plays, started + 1, 'Music button resumes after manual pause');
  }
});
