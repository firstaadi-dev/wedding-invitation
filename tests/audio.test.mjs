import test from 'node:test';
import assert from 'node:assert/strict';
import {playAudio} from '../frontend/audio.js';

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
