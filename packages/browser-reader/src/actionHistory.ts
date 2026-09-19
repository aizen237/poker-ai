import type { PokerGameState } from "./gameState.js";

export type TrackedAction = "fold" | "call" | "raise";

export interface ActionRecord {
  street: PokerGameState["street"];
  action: TrackedAction;
}

/** Per-seat action history for the current hand only. Reset when a new hand starts. */
export type ActionHistory = Map<number, ActionRecord[]>;

export function emptyActionHistory(): ActionHistory {
  return new Map();
}

function highestActiveBet(state: PokerGameState): number {
  let highest = 0;
  for (const seat of state.seats) {
    if (seat.isOccupied && !seat.isFolded && seat.currentBet !== null && seat.currentBet > highest) {
      highest = seat.currentBet;
    }
  }
  return highest;
}

/**
 * Detects a new hand by comparing hero's hole cards between two states --
 * a fresh deal always means different cards. This is the same signal a
 * person would use to notice "we're in a new hand now."
 */
function isNewHand(previous: PokerGameState, current: PokerGameState): boolean {
  const prevHero = previous.seats.find((s) => s.isYou);
  const currHero = current.seats.find((s) => s.isYou);
  const prevCards = prevHero?.holeCards ?? [];
  const currCards = currHero?.holeCards ?? [];
  if (prevCards.length !== currCards.length) return true;
  return prevCards.some((c, i) => c.rank !== currCards[i]?.rank || c.suit !== currCards[i]?.suit);
}

/**
 * Advances action history by one polling tick. KNOWN LIMITATION,
 * documented not hidden: this is snapshot-diffing over a 1-second poll,
 * not a real event stream -- multiple actions between two polls would
 * only surface as one detected action, and posted blinds at the very
 * start of a hand may register as a "call"/"raise" for SB/BB before any
 * voluntary action happens (blind roles aren't tracked). "Check" is not
 * detected at all, since actionNarrowing.ts has no narrowing operation
 * that models a check -- only fold/call/raise ever need tracking here.
 */
export function updateActionHistory(
  history: ActionHistory,
  previous: PokerGameState | null,
  current: PokerGameState,
): ActionHistory {
  if (!previous || isNewHand(previous, current)) {
    return emptyActionHistory();
  }

  const next: ActionHistory = new Map(history);
  const previousHighestBet = highestActiveBet(previous);

  for (const seat of current.seats) {
    if (!seat.isOccupied || seat.isYou) continue;

    const prevSeat = previous.seats.find((s) => s.seatNumber === seat.seatNumber);
    if (!prevSeat || !prevSeat.isOccupied) continue;

    let action: TrackedAction | null = null;

    if (!prevSeat.isFolded && seat.isFolded) {
      action = "fold";
    } else if (seat.currentBet !== null && seat.currentBet !== prevSeat.currentBet) {
      action = seat.currentBet > previousHighestBet ? "raise" : "call";
    }

    if (action) {
      const existing = next.get(seat.seatNumber) ?? [];
      next.set(seat.seatNumber, [...existing, { street: current.street, action }]);
    }
  }

  return next;
}