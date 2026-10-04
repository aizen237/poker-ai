import type { PokerGameState, SeatState } from "./gameState.js";

export type TrackedAction = "check" | "call" | "bet" | "raise" | "fold" | "all-in";
type WagerAction = "call" | "bet" | "raise";

export interface ActionRecord {
  street: PokerGameState["street"];
  action: TrackedAction;
  seat: number;
  /** Observed total contribution this street, NOT an individual action's size. */
  amount: number | null;
  /** Local snapshot sequence. Equal values mean cross-seat order is unknown. */
  observation: number;
  /** Underlying wager when an explicit all-in can also be classified. */
  wagerAction: WagerAction | null;
}

/** Observed actions plus minimal memory across transient missing labels/cards. */
export interface ActionHistory {
  /** Explicit reset signal; consumers must not infer resets by comparing note strings. */
  handBoundary?: boolean;
  records: Map<number, ActionRecord[]>;
  observation: number;
  lastHeroCards: string | null;
  lastHeroIdentity: string | null;
  dealerSeatNumber: number | null;
  streetContributions: Map<number, number>;
  awaitingStreetBaseline: boolean;
  notes: string[];
}

export interface ActionHistoryContext {
  dealerSeatNumber?: number | null;
  bigBlind?: number | null;
}

export function emptyActionHistory(): ActionHistory {
  return {
    records: new Map(), observation: 0, lastHeroCards: null, lastHeroIdentity: null,
    dealerSeatNumber: null, streetContributions: new Map(), awaitingStreetBaseline: false, notes: [],
  };
}

function identity(seat: SeatState | undefined): string | null {
  return seat?.isOccupied && seat.playerName ? `${seat.seatNumber}:${seat.playerName}` : null;
}

function heroCards(state: PokerGameState): string | null {
  const cards = state.seats.find((s) => s.isYou && s.isOccupied)?.holeCards;
  return cards?.length === 2 ? cards.map((c) => `${c.rank}${c.suit}`).sort().join(",") : null;
}

function contribution(seat: SeatState): number | null {
  if (seat.betReadError) return null;
  // Retains the reader's absent/check -> zero interpretation, pending live verification.
  if (seat.currentBet === null) return 0;
  return Number.isFinite(seat.currentBet) && seat.currentBet >= 0 ? seat.currentBet : null;
}

function boundaryReason(history: ActionHistory, previous: PokerGameState, current: PokerGameState, context: ActionHistoryContext): string | null {
  const streets = ["preflop", "flop", "turn", "river"];
  if (streets.indexOf(current.street) < streets.indexOf(previous.street)) return "Board/street regressed; started a fresh history baseline.";
  if (previous.board.some((card, i) => current.board[i]?.rank !== card.rank || current.board[i]?.suit !== card.suit)) {
    return "Board was cleared or replaced; started a fresh history baseline.";
  }
  const currentIdentity = identity(current.seats.find((s) => s.isYou));
  const priorIdentity = history.lastHeroIdentity ?? identity(previous.seats.find((s) => s.isYou));
  const knownCards = history.lastHeroCards ?? heroCards(previous);
  const cards = heroCards(current);
  if (currentIdentity !== null && currentIdentity === priorIdentity && knownCards !== null && cards !== null && cards !== knownCards) {
    return "A different complete hero hand was observed; started a fresh history baseline.";
  }
  if (current.street === "preflop" && context.dealerSeatNumber != null && history.dealerSeatNumber !== null && context.dealerSeatNumber !== history.dealerSeatNumber) {
    return "Dealer changed preflop; started a fresh history baseline.";
  }
  if (current.seats.some((seat) => {
    const before = previous.seats.find((s) => s.seatNumber === seat.seatNumber);
    return identity(seat) !== null && identity(seat) === identity(before) && before?.isFolded && !seat.isFolded;
  })) return "A folded player became active again; hand continuity is uncertain, so history was reset.";
  return null;
}

/**
 * Snapshot reconstruction, not an event log. Street changes establish a new
 * baseline. Multiple wagers in one interval are not given an invented order.
 * Explicit check/fold/all-in transitions can still be observed in that batch.
 */
export function updateActionHistory(
  history: ActionHistory,
  previous: PokerGameState | null,
  current: PokerGameState,
  context: ActionHistoryContext = {},
): ActionHistory {
  const boundary = previous ? boundaryReason(history, previous, current, context) : "No preceding read; actions before this baseline are unknown.";
  const reset = boundary !== null;
  const next: ActionHistory = reset ? emptyActionHistory() : {
    ...history, records: new Map(history.records), streetContributions: new Map(history.streetContributions), notes: [...history.notes],
  };
  next.handBoundary = reset;
  next.observation = history.observation + 1;
  const note = (message: string) => { if (!next.notes.includes(message)) next.notes.push(message); };
  if (boundary) note(boundary);
  const heroIdentity = identity(current.seats.find((s) => s.isYou));
  if (heroIdentity !== null && heroIdentity !== next.lastHeroIdentity) {
    next.lastHeroIdentity = heroIdentity;
    next.lastHeroCards = null;
  }
  next.lastHeroCards = heroCards(current) ?? next.lastHeroCards ?? (previous && !reset ? heroCards(previous) : null);
  next.dealerSeatNumber = context.dealerSeatNumber ?? next.dealerSeatNumber;

  // Do not transfer actions to a new occupant or turn a departure into a fold.
  for (const seatNumber of next.records.keys()) {
    const before = previous?.seats.find((s) => s.seatNumber === seatNumber);
    const now = current.seats.find((s) => s.seatNumber === seatNumber);
    if (identity(now) === null || identity(now) !== identity(before)) {
      next.records.delete(seatNumber);
      next.streetContributions.delete(seatNumber);
      note("A seat disappeared or changed identity; its previous actions were discarded.");
    }
  }
  const sameStreet = previous !== null && previous.street === current.street;
  const cleanStreet = current.seats.filter((s) => s.isOccupied && !s.isFolded)
    .every((s) => contribution(s) === 0 && !s.isChecking);
  if (!reset && (!sameStreet || history.awaitingStreetBaseline)) {
    next.awaitingStreetBaseline = !cleanStreet;
    next.streetContributions.clear();
    if (next.awaitingStreetBaseline) note("Street boundary has non-cleared action labels; waiting for a clean betting baseline.");
  }
  if (!sameStreet) next.streetContributions.clear();
  const baselineTotals = new Map(next.streetContributions);
  if (!reset && sameStreet && !history.awaitingStreetBaseline && previous) {
    for (const seat of previous.seats) {
      const total = contribution(seat);
      if (seat.isOccupied && total !== null) baselineTotals.set(seat.seatNumber, Math.max(baselineTotals.get(seat.seatNumber) ?? 0, total));
    }
  }
  for (const seat of current.seats) {
    const before = previous?.seats.find((s) => s.seatNumber === seat.seatNumber);
    if (identity(seat) === null || identity(seat) !== identity(before)) {
      baselineTotals.delete(seat.seatNumber);
      next.streetContributions.delete(seat.seatNumber);
    }
    const total = contribution(seat);
    if (seat.isOccupied && total !== null) next.streetContributions.set(seat.seatNumber, Math.max(baselineTotals.get(seat.seatNumber) ?? 0, total));
  }
  if (reset || !previous) return next;
  if (!sameStreet) {
    note("Street changed; actions spanning the transition were not reconstructed.");
    return next;
  }
  if (history.awaitingStreetBaseline) return next;

  const pairs = current.seats.flatMap((seat) => {
    const before = previous.seats.find((s) => s.seatNumber === seat.seatNumber);
    return before && identity(seat) !== null && identity(seat) === identity(before) ? [{ seat, before }] : [];
  });
  const increased = pairs.filter(({ seat, before }) => !seat.isFolded && !before.isFolded &&
    contribution(seat) !== null && contribution(seat)! > (baselineTotals.get(seat.seatNumber) ?? 0));
  const activeBefore = previous.seats.filter((s) => s.isOccupied && !s.isFolded);
  const unknownWager = activeBefore.some((s) => contribution(s) === null) || current.seats.some((s) => s.isOccupied && !s.isFolded && contribution(s) === null);
  const rosterChanged = previous.seats.some((s) => identity(s) !== identity(current.seats.find((now) => now.seatNumber === s.seatNumber))) ||
    current.seats.some((s) => identity(s) !== identity(previous.seats.find((before) => before.seatNumber === s.seatNumber)));
  const previousHighest = Math.max(0, ...activeBefore.map((s) => baselineTotals.get(s.seatNumber) ?? contribution(s) ?? 0));
  if (increased.length > 1) note("Multiple wagers changed in one observation; bet/call/raise order is unknown and was omitted.");
  if (unknownWager) note("An active contribution was unreadable; numeric action classification was omitted.");
  if (rosterChanged) note("Seat identities changed during the observation; numeric action classification was omitted.");

  for (const { seat, before } of pairs) {
    if (seat.isYou || before.isFolded) continue;
    const records = next.records.get(seat.seatNumber) ?? [];
    const total = contribution(seat);
    const priorTotal = baselineTotals.get(seat.seatNumber) ?? 0;
    let action: TrackedAction | null = null;
    let wagerAction: WagerAction | null = null;
    const grew = total !== null && total > priorTotal;
    // Without seeing this seat's turn, a preflop increase could be a post.
    const possiblePosting = current.street === "preflop" && (!before.isCurrentToAct || previousHighest === 0 ||
      (priorTotal === 0 && context.bigBlind != null && total !== null && total <= context.bigBlind));
    if (possiblePosting && (grew || (!before.isAllIn && seat.isAllIn))) {
      note("Preflop posting or unobserved turn: wager/all-in was not treated as a voluntary action.");
    }
    if (grew && !unknownWager && !rosterChanged && increased.length === 1 && !possiblePosting) {
      if (previousHighest === 0) wagerAction = "bet";
      else if (total > previousHighest) wagerAction = "raise";
      else if (total === previousHighest || seat.isAllIn) wagerAction = "call";
      else note("A partial contribution without an all-in label was omitted.");
    }
    if (!before.isFolded && seat.isFolded) action = "fold";
    else if (!before.isAllIn && seat.isAllIn && !possiblePosting && !records.some((r) => r.action === "all-in")) action = "all-in";
    else if (seat.isChecking && !before.isChecking && !seat.isAllIn && !before.isAllIn && !unknownWager && previousHighest <= priorTotal &&
      !records.some((r) => r.street === current.street && r.action === "check")) action = "check";
    else if (!seat.isAllIn && !before.isAllIn) action = wagerAction;

    if (action) {
      next.records.set(seat.seatNumber, [...records, {
        street: current.street, action, seat: seat.seatNumber, observation: next.observation,
        amount: action === "check" || action === "fold" || seat.currentBet === null ? null : total,
        wagerAction: action === "all-in" ? wagerAction : null,
      }]);
    }
  }
  return next;
}
