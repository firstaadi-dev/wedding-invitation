import test from 'node:test';
import assert from 'node:assert/strict';
import {countdownParts} from '../public/countdown.js';

test('countdown uses the WIB target, rolls over units and stops at zero', () => {
  const target = Date.parse('2026-11-22T09:00:00+07:00');
  assert.equal(target, Date.parse('2026-11-22T02:00:00Z'));
  assert.deepEqual(countdownParts(target, target - 90061000), [1, 1, 1, 1]);
  assert.deepEqual(countdownParts(target, target - 86400000), [1, 0, 0, 0]);
  assert.deepEqual(countdownParts(target, target - 100), [0, 0, 0, 1]);
  assert.deepEqual(countdownParts(target, target), [0, 0, 0, 0]);
  assert.deepEqual(countdownParts(target, target + 1000), [0, 0, 0, 0]);
});
