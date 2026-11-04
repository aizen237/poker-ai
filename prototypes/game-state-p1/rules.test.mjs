// Synthetic rules: these establish poker logic only, never live protocol coverage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startRound, act, decision } from './rules.mjs';
const setup = () => startRound({ street:'flop', order:['A','B','C'], stacks:{A:100,B:100,C:100}, bigBlind:2 });
for (const amount of [2,4,7,17]) for (const order of [['A','B','C'],['C','A','B']]) test(`SYNTHETIC bet/call order ${order} amount ${amount}`, () => {
  let s = startRound({street:'flop',order,stacks:{A:100,B:100,C:100},bigBlind:2});
  s=act(s,{type:'BET',actor:order[0],to:amount});
  s=act(s,{type:'CALL',actor:order[1],to:amount});
  s=act(s,{type:'CALL',actor:order[2],to:amount});
  assert.equal(s.closed,true);
  assert.equal(Object.values(s.contributions).reduce((a,b)=>a+b,0),3*amount);
});
test('SYNTHETIC check, bet, raise, fold, call reopens obligations', () => {
  let s=setup();
  for(const e of [{type:'CHECK',actor:'A'},{type:'BET',actor:'B',to:3},{type:'RAISE',actor:'C',to:7},{type:'FOLD',actor:'A'},{type:'CALL',actor:'B',to:7}]) s=act(s,e);
  assert.equal(s.closed,true); assert.equal(s.lastRaise,4);
});
for(const [name,events] of [
  ['wrong actor',[{type:'CHECK',actor:'B'}]],
  ['free call',[{type:'CALL',actor:'A',to:0}]],
  ['underbet',[{type:'BET',actor:'A',to:1}]],
  ['overstack',[{type:'BET',actor:'A',to:101}]],
  ['unsupported all-in',[{type:'BET',actor:'A',to:100}]],
  ['check facing bet',[{type:'BET',actor:'A',to:4},{type:'CHECK',actor:'B'}]],
  ['short call',[{type:'BET',actor:'A',to:4},{type:'CALL',actor:'B',to:3}]],
  ['small raise',[{type:'BET',actor:'A',to:4},{type:'RAISE',actor:'B',to:7}]],
]) test(`SYNTHETIC rejects ${name} atomically`,()=>{
  let s=setup(); const original=structuredClone(s);
  assert.throws(()=>{for(const e of events)s=act(s,e);});
  assert.deepEqual(original,setup());
});
test('SYNTHETIC deadlines never renew when polled',()=>{
  const s={actor:'A',activation:{receivedAt:1000,expiresAt:11000},liveAuthorized:false};
  assert.ok(decision(s,10999)); assert.equal(decision(s,11000),null);
  assert.equal(decision(s,999),null); assert.equal(s.activation.expiresAt,11000);
});
