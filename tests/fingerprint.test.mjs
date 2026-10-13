import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedVisitor} from '../server/fingerprint.mjs';
const now = Date.now();
const event = {event_id:'event',linked_id:'challenge',url:'https://invitation.example/',timestamp:now,identification:{visitor_id:'visitor'}};
test('Fingerprint verification rejects forged, stale, tampered and cross-origin events',() => {
  const verify = value => verifiedVisitor(value,'event','challenge','https://invitation.example',now);
  assert.equal(verify(event),'visitor');
  for (const override of [
    {event_id:'forged'}, {linked_id:'other-challenge'}, {url:'https://attacker.example/'},
    {timestamp:now-300001}, {timestamp:now+10001}, {timestamp:undefined},
    {identification:{}}, {tampering:true}, {replayed:true}, {bot:'detected'}, {rule_action:'deny'},
  ]) assert.throws(() => verify({...event,...override}),error => error.status === 403);
});
