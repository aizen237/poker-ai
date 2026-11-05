// Stage 1 acceptance contract for the private MTT-like Play with Friends captures.
// This file contains only hand-derived chip/state expectations; no raw frames,
// player identifiers, names, or cards are copied into the repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capture, framesOf } from './captures.mjs';
import { replay } from './replay.mjs';

const captures = {
  'mtt-capture1.json': [
    { hand: 512, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [4985, 4985, 4985, 4985, 4935, 5125], actorSeat: null, returned: 50 },
  ],
  'mtt-capture2-log.txt': [
    { hand: 514, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5045, 5095, 4955, 4955, 4905, 5045], actorSeat: null, returned: 50 },
    { hand: 515, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5030, 5030, 4840, 5180, 4890, 5030], actorSeat: null, returned: 100 },
    { hand: 516, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'turn', pot: 640, stacks: [5015, 5015, 4775, 4915, 4625, 5015], actorSeat: 4, returned: 0 },
  ],
  'mtt-capture3.json': [
    { hand: 516, ante: 15, firstPot: 640, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5015, 5015, 4775, 5555, 4625, 5015], actorSeat: null, returned: 0 },
    { hand: 517, ante: 15, firstPot: 75, participants: 5, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5000, 4760, 5490, 4735, 5000], actorSeat: null, returned: 50 },
    { hand: 518, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [4985, 5000, 4745, 5475, 4670, 5125], actorSeat: null, returned: 50 },
    { hand: 519, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5110, 4985, 4730, 5460, 4655, 5060], actorSeat: null, returned: 50 },
    { hand: 520, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5045, 5110, 4715, 5445, 4640, 5045], actorSeat: null, returned: 50 },
    { hand: 521, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5030, 5045, 4840, 5430, 4625, 5030], actorSeat: null, returned: 50 },
    { hand: 522, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5015, 5030, 4775, 5555, 4610, 5015], actorSeat: null, returned: 50 },
    { hand: 523, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5000, 5015, 4760, 5490, 4735, 5000], actorSeat: null, returned: 50 },
    { hand: 524, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [4985, 5000, 4745, 5475, 4670, 5125], actorSeat: null, returned: 50 },
    { hand: 525, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5110, 4985, 4730, 5460, 4655, 5060], actorSeat: null, returned: 50 },
    { hand: 526, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5045, 5110, 4715, 5445, 4640, 5045], actorSeat: null, returned: 50 },
    { hand: 527, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5030, 5045, 4840, 5430, 4625, 5030], actorSeat: null, returned: 50 },
    { hand: 528, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5015, 5030, 4775, 5555, 4610, 5015], actorSeat: null, returned: 50 },
    { hand: 529, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5000, 5015, 4760, 5490, 4735, 5000], actorSeat: null, returned: 50 },
    { hand: 530, ante: 15, firstPot: 90, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [4985, 5000, 4745, 5475, 4670, 5125], actorSeat: null, returned: 50 },
    { hand: 531, ante: 18, firstPot: 108, participants: 6, tableSeats: 6,
      street: 'preflop', pot: 108,
      // Source player stacks still include the posted blinds. remainingStack
      // is the source stack minus that player's current-street contribution.
      sourceStacks: [4967, 4982, 4727, 5457, 4652, 5107],
      stacks: [4847, 4982, 4727, 5457, 4652, 5047], actorSeat: 2, returned: null },
  ],
  'mtt-capture4.json': [
    { hand: 532, ante: 18, firstPot: 108, participants: 6, tableSeats: 6,
      street: 'settled', pot: 0, stacks: [5057, 4844, 4997, 5439, 4634, 5029], actorSeat: null, returned: 4589 },
  ],
  'mtt-capture5.json': [
    { hand: 533, ante: 18, firstPot: 108, participants: 6, tableSeats: 6,
      street: 'river', pot: 9520, stacks: [5039, 4766, 4859, 805, 0, 5011], actorSeat: null, returned: 423 },
  ],
  'mtt-capture6.json': [
    { hand: 534, ante: 18, firstPot: 90, participants: 5, tableSeats: 5,
      street: 'settled', pot: 0, stacks: [5021, 4748, 4781, 10457, 4993], actorSeat: null, returned: 60 },
    { hand: 535, ante: 18, firstPot: 90, participants: 5, tableSeats: 5,
      street: 'settled', pot: 0, stacks: [5003, 4730, 4763, 10379, 5125], actorSeat: null, returned: 60 },
  ],
};

const sumBets = bets => Object.values(bets ?? {}).reduce((sum, value) =>
  sum + (Number.isSafeInteger(value) && value >= 0 ? value : 0), 0);
const sumStacks = players => Object.values(players ?? {}).reduce((sum, player) =>
  sum + (Number.isSafeInteger(player?.stack) && player.stack >= 0 ? player.stack : 0), 0);

function applyPatch(previous, patch) {
  const next = structuredClone(previous);
  const newHand = patch.gN !== undefined && patch.gN !== previous.gN ||
    patch.hI !== undefined && patch.hI !== previous.hI;
  if (newHand) { next.tB = {}; next.pC = {}; }
  for (const [key, value] of Object.entries(patch)) {
    if (['players', 'tB', 'pGS', 'pC'].includes(key)) {
      next[key] ??= {};
      for (const [id, item] of Object.entries(value ?? {})) {
        if (item === '<D>') delete next[key][id];
        else next[key][id] = key === 'players'
          ? { ...next[key][id], ...structuredClone(item) }
          : structuredClone(item);
      }
    } else if (value === '<D>') delete next[key];
    else next[key] = structuredClone(value);
  }
  return next;
}

// Rebuild only the bounded fields needed for hand-level financial assertions.
// Identifiers are used internally to apply dictionary patches and never asserted
// or printed. This independently checks every raw checkpoint, including a
// capture that begins in the middle of a hand.
function financialSnapshots(recording) {
  const frames = framesOf(recording);
  const hands = new Map();
  const baselineByHand = new Map();
  let source = null;

  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index];
    const payload = frame.event === 'registered' ? frame.payload.gameState : frame.payload;
    const previous = source;
    source = previous ? applyPatch(previous, payload) : structuredClone(payload);
    const handNumber = source.gN;

    // Generic boundary rule: a standingUp player is outside the dealt-in roster,
    // posts no ante, and retains the same stack through the boundary.
    if (previous && previous.gN !== handNumber) {
      for (const [id, player] of Object.entries(source.players ?? {})) {
        if (player.status !== 'standingUp') continue;
        assert.equal(source.iHPI.includes(id), false, 'A standingUp player must not be dealt in');
        assert.equal(source.tB?.[id] ?? 0, 0, 'A standingUp player must not post a blind or wager');
        assert.equal(player.stack, previous.players?.[id]?.stack, 'A standingUp player stack must remain unchanged');
      }
    }
    const entry = hands.get(handNumber) ?? {
      first: structuredClone(source), last: null, firstIndex: index, lastIndex: index, returned: null,
    };
    const total = sumStacks(source.players) + source.pot;
    if (!baselineByHand.has(handNumber)) baselineByHand.set(handNumber, total);
    assert.equal(total, baselineByHand.get(handNumber), `Chip conservation changed in hand ${handNumber} at frame ${index}`);

    if (previous?.gN === handNumber && payload.gameResult && payload.gameResult !== '<D>') {
      const gained = Object.values(payload.gameResult).reduce((sum, result) => sum + result.gained, 0);
      entry.returned = previous.pot + sumBets(previous.tB) - gained;
    } else if (previous?.gN === handNumber && source.pot !== previous.pot && sumBets(previous.tB) > 0) {
      const returned = previous.pot + sumBets(previous.tB) - source.pot;
      if (returned >= 0) entry.returned = returned;
    }

    entry.last = structuredClone(source);
    entry.lastIndex = index;
    hands.set(handNumber, entry);
  }
  return hands;
}

for (const [file, expectations] of Object.entries(captures)) {
  test(`CAPTURE ${file}: ante and chip conservation at every source frame`, () => {
    const recording = capture(file);
    assert.ok(recording, `Private recording ${file} is unavailable`);
    const hands = financialSnapshots(recording);
    for (const expected of expectations) {
      const observed = hands.get(expected.hand);
      assert.ok(observed, `Hand ${expected.hand} is absent`);
      assert.equal(sumStacks(observed.first.players) + observed.first.pot, 30000,
        `Hand ${expected.hand} does not balance from its first captured frame`);
      assert.equal(observed.first.pot, expected.firstPot, `Hand ${expected.hand} initial captured pot`);
      assert.equal(observed.first.ante, expected.ante, `Hand ${expected.hand} ante`);
      assert.equal(observed.first.iHPI.length, expected.participants, `Hand ${expected.hand} participant count`);
      assert.equal(observed.first.seats.length, expected.tableSeats, `Hand ${expected.hand} table seat count`);
      if (observed.first.gT[1] === 0) {
        assert.equal(observed.first.pot, expected.ante * expected.participants,
          `Hand ${expected.hand} antes included at hand start`);
      }
      if (expected.returned !== null) {
        assert.equal(observed.returned, expected.returned, `Hand ${expected.hand} returned bet`);
      }
    }
  });

  for (const expected of expectations) test(`CAPTURE ${expected.hand}: replayed checkpoint matches hand-derived values`, () => {
    const recording = capture(file);
    assert.ok(recording, `Private recording ${file} is unavailable`);
    const observed = financialSnapshots(recording).get(expected.hand);
    assert.ok(observed, `Hand ${expected.hand} is absent`);

    const result = replay(recording, { targetHand: expected.hand });
    assert.equal(result.failure, null, 'The isolated replay rejected this capture');
    const checkpoint = result.trace[observed.lastIndex];
    assert.ok(checkpoint?.accepted, 'The final hand checkpoint was not accepted');
    assert.ok(checkpoint.state, 'The replay must preserve the final checkpoint, including settlement');
    const state = checkpoint.state;
    assert.equal(state.identity.handNumber, expected.hand);
    assert.equal(state.street, expected.street);
    assert.equal(state.collectedPot, expected.pot);
    if (expected.sourceStacks) {
      const sourceStacks = state.seats.map(seat => state.observedFacts.playerBalances[seat.playerId]);
      assert.deepEqual(sourceStacks, expected.sourceStacks, 'Source stacks before current-street wager deductions');
      for (const seat of state.seats) {
        const sourceStack = state.observedFacts.playerBalances[seat.playerId];
        assert.equal(seat.remainingStack, sourceStack - (state.contributions[seat.playerId] ?? 0),
          'remainingStack equals the source stack minus that seat contribution');
      }
    }
    assert.deepEqual(state.seats.map(seat => seat.remainingStack), expected.stacks,
      'Remaining stacks in source seat order');
    const actorSeat = state.actor === null ? null :
      state.seats.findIndex(seat => seat.playerId === state.actor) + 1;
    assert.equal(actorSeat, expected.actorSeat, 'Actor seat in source seat order');
    assert.equal(state.liveAuthorized, false);
  });
}
