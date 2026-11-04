// Actual private recordings only. Mutations below are negative tests, not captures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cases, capture, framesOf } from './captures.mjs';
import { replay } from './replay.mjs';

for (const [hand, file, street, pot, call] of cases) test(`CAPTURE ${hand}: complete target-hand prefix`, t => {
  const c = capture(file);
  if (!c) return t.skip('Private recording unavailable; no protocol coverage claimed');
  const r = replay(c,{targetHand:hand});
  assert.equal(r.failure, null);
  const s = r.state;
  assert.equal(s.identity.handNumber, hand);
  assert.equal(s.street, street);
  assert.equal(s.collectedPot, pot);
  assert.equal(s.currentBet - (s.contributions[s.actor] ?? 0), call);
  assert.equal(s.coverage.fromHandStart, true);
  assert.equal(s.coverage.actionPrefixComplete, true);
  assert.equal(s.coverage.historyComplete, false);
  assert.equal(s.liveAuthorized, false);
  assert.ok(s.actions.some(a => a.type === 'RAISE'));
  assert.ok(s.actions.some(a => a.type === 'FOLD'));
  assert.ok(s.actions.some(a => a.type === 'CHECK'));
});

test('CAPTURE 511: paid TURN CALL -> RIVER without explicit cPI', t => {
  const c = capture(cases.at(-1)[1]); if (!c) return t.skip('Private recording unavailable');
  const f = framesOf(c);
  assert.equal(Object.hasOwn(f[27].payload, 'cPI'), false);
  const r = replay(c,{targetHand:511});
  assert.equal(r.failure, null);
  assert.deepEqual(r.state.actions.filter(a => a.street === 'turn').map(a => a.type), ['CHECK', 'BET', 'CALL']);
  assert.deepEqual(r.state.actions.filter(a => a.street === 'river').map(a => a.type), ['CHECK', 'BET']);
  const deal = r.trace[27];
  assert.equal(deal.event.type, 'DEAL');
  assert.equal(deal.event.actorEvidence, 'derived:adjacent-paid-call');
  assert.equal(deal.state.collectedPot, 29);
  assert.deepEqual(deal.state.activeSeats.filter(p=>!p.folded).map(p => p.remainingStack).sort((a,b)=>a-b), [257,373]);
  const read=c.checkpoints[0].observation.unverifiedObservations.ui;
  assert.equal(read.callControl.amountChips,4);
  const hero=read.raw.seats.find(s=>s.isYou), villain=read.raw.seats.find(s=>s.betValueText==='4');
  assert.equal(hero.stackText,String(r.state.activeSeats.find(p=>p.playerId===r.state.actor).remainingStack));
  assert.equal(villain.stackText,String(r.state.activeSeats.find(p=>p.playerId!==r.state.actor&&!p.folded).remainingStack));
  assert.equal(villain.betValueText,String(r.state.currentBet));
  assert.equal(r.state.liveAuthorized,false);
});

for (const [name, mutate] of [
  ['wrong actor', f => { const [id] = Object.keys(f[26].payload.tB); const other = Object.keys(f[24].payload.tB)[0]; f[26].payload.tB = {[other]:4}; }],
  ['missing frame', f => f.splice(26,1)],
  ['wrong pot', f => f[27].payload.pot++],
  ['wrong stack', f => Object.values(f[27].payload.players)[0].stack++],
  ['incomplete call', f => Object.values(f[26].payload.tB).forEach((_,i)=>{f[26].payload.tB[Object.keys(f[26].payload.tB)[i]]=3;})],
  ['generation change', f => f[27].connectionGeneration++],
  ['wrong hand', f => f[27].payload.hI = 'contradiction'],
  ['wrong board prefix', f => f[27].payload.oTC['1'][0] = 'Qs'],
  ['unknown financial field', f => f[27].payload.rake = 1],
  ['expired bridge receipt', f => f[27].localReceivedAt=f[26].localReceivedAt+2000],
  ['expired bridge source', f => f[27].payload.now=f[26].payload.now+2000],
]) test(`CAPTURE MUTATION 511 rejects ${name} and does not repair on later patches`, t => {
  const c = capture(cases.at(-1)[1]); if (!c) return t.skip('Private recording unavailable');
  mutate(framesOf(c)); const r = replay(c,{targetHand:511});
  assert.ok(r.failure);
  assert.equal(r.state, null);
  assert.ok(r.trace.slice(r.failure.index).every(x => !x.accepted));
});
