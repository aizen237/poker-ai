// Synthetic rule coverage only. These are not PokerNow captures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startRound, act, decision } from './rules.mjs';

test('SYNTHETIC full stack bet requires and records all-in status', () => {
  const s=startRound({street:'preflop',order:['A','B'],stacks:{A:20,B:100},bigBlind:2});
  const next=act(s,{type:'BET',actor:'A',to:20,allIn:true});
  assert.deepEqual(next.allIn,['A']);
  assert.deepEqual(next.active,['B']);
  assert.equal(next.currentBet,20);
});

test('SYNTHETIC short call is allowed only as a stack-capped all-in', () => {
  let s=startRound({street:'preflop',order:['A','B','C'],stacks:{A:100,B:12,C:100},bigBlind:2});
  s=act(s,{type:'BET',actor:'A',to:20});
  s=act(s,{type:'CALL',actor:'B',to:12,allIn:true});
  s=act(s,{type:'FOLD',actor:'C'});
  assert.equal(s.closed,true);
  assert.deepEqual(s.allIn,['B']);
  assert.deepEqual(s.contenders,['A','B']);
  assert.equal(s.contributions.B,12);
});

test('SYNTHETIC trimmed bet does not mark the bettor all-in', () => {
  let s=startRound({street:'preflop',order:['A','B'],stacks:{A:100,B:80},bigBlind:2});
  s=act(s,{type:'BET',actor:'A',to:30,allIn:false});
  s=act(s,{type:'CALL',actor:'B',to:30});
  assert.equal(s.closed,true);
  assert.deepEqual(s.allIn,[]);
  assert.equal(s.contributions.A,30);
});

test('SYNTHETIC source deadline is 15 seconds and polling does not renew it', () => {
  const state={actor:'A',activation:{receivedAt:1000,expiresAt:16000},liveAuthorized:false};
  assert.ok(decision(state,15999));
  assert.equal(decision(state,16000),null);
  assert.equal(state.activation.expiresAt,16000);
});
