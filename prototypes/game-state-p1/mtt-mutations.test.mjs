// Negative mutations of the six local MTT-like captures. No source frames are copied.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capture, framesOf } from './captures.mjs';
import { replay } from './replay.mjs';

const mutated=(file,change)=>{
  const original=capture(file);
  if(!original)return null;
  const copy=structuredClone(original);change(framesOf(copy));return copy;
};
const rejects=(copy,hand,pattern)=>{
  assert.ok(copy,'Private recording is unavailable');
  const result=replay(copy,{targetHand:hand});
  assert.ok(result.failure,'Mutation must fail closed');
  if(pattern)assert.match(result.failure.error,pattern);
  assert.equal(result.state,null);
};

test('CAPTURE MUTATION rejects ante mismatch',t=>{
  const copy=mutated('mtt-capture4.json',frames=>{frames[0].payload.gameState.ante++;});
  if(!copy)return t.skip('Private recording unavailable');
  rejects(copy,532,/ante/i);
});

test('CAPTURE MUTATION rejects a blind-level change inside a hand',t=>{
  const copy=mutated('mtt-capture4.json',frames=>{frames[1].payload.smallBlind=61;});
  if(!copy)return t.skip('Private recording unavailable');
  rejects(copy,532,/Blind level changed inside hand/);
});

test('CAPTURE MUTATION rejects a wrong returned amount',t=>{
  const copy=mutated('mtt-capture4.json',frames=>{
    const result=Object.values(frames.at(-1).payload.gameResult)[0];result.gained++;
  });
  if(!copy)return t.skip('Private recording unavailable');
  rejects(copy,532,/Returned amount/);
});

test('CAPTURE MUTATION rejects a missing source frame',t=>{
  const copy=mutated('mtt-capture4.json',frames=>{frames.splice(2,1);});
  if(!copy)return t.skip('Private recording unavailable');
  rejects(copy,532,/Missing or reordered source frame/);
});

test('CAPTURE MUTATION rejects a wrong actor',t=>{
  const copy=mutated('mtt-capture4.json',frames=>{
    const payload=frames[2].payload,actor=payload.cPI;
    const other=Object.keys(frames[0].payload.gameState.players).find(id=>id!==actor);
    payload.cPI=other;
  });
  if(!copy)return t.skip('Private recording unavailable');
  rejects(copy,532,/activation|actor/i);
});

test('CAPTURE MUTATION rejects an action after its 15 second deadline',t=>{
  const copy=mutated('mtt-capture4.json',frames=>{
    const activationAt=frames[0].localReceivedAt;
    const delta=Math.max(0,activationAt+15_000-frames[1].localReceivedAt);
    for(let i=1;i<frames.length;i++)frames[i].localReceivedAt+=delta;
  });
  if(!copy)return t.skip('Private recording unavailable');
  rejects(copy,532,/deadline/);
});
