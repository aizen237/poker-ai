import type { PokerGameState } from "./gameState.js";

export type DataConfidence = "high" | "medium" | "low";

export interface ConfidenceContext {
  /** Amount hero must put in to continue (0 if nothing to call). */
  amountToCall: number | null;
  /** Explicit evidence is required before either displayed pot is used in a decision. */
  potSemanticsVerified: boolean;
  /**
   * Legacy field name: true when the big blind could not be read this
   * cycle. The live reader now returns null, never a numeric fallback.
   * BB-based sizing must be withheld in this case.
   */
  bigBlindWasDefaulted: boolean;
  /**
   * True when hero's table position (BTN/CO/etc.) is computed from the
   * dealer button this cycle. False when detection fails; no fallback
   * position may be presented as a detected position.
   */
  isPositionKnown: boolean;
}

export interface ConfidenceResult {
  level: DataConfidence;
  /** Reasons for diagnostics and the overlay when a decision is withheld. */
  reasons: string[];
}

const EXPECTED_BOARD_COUNT: Record<PokerGameState["street"], number> = {
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
};

/**
 * Computes how much a DecisionPacket built from this state and context
 * should be trusted. This is NOT about whether the poker decision itself
 * is good -- only about whether the underlying data is complete,
 * consistent, and fresh enough to safely hand to an AI provider.
 *
 * - "low": something decision-critical is missing, contradictory,
 *   invalid, or unsafe to act on. The relay server refuses to call the
 *   AI at all when it sees this (see server.ts).
 * - "medium": the state is usable, but something non-critical is
 *   uncertain (e.g. an opponent is showing as offline).
 * - "high": everything decision-critical is present and consistent, and
 *   nothing non-critical is flagged either.
 */
export function computeDataConfidence(state: PokerGameState, context: ConfidenceContext): ConfidenceResult {
  const criticalReasons: string[] = [];
  const uncertainReasons: string[] = [];

  const hero = state.seats.find((s) => s.isYou);
  if (state.seats.filter((s) => s.isOccupied && s.isYou).length > 1) {
    criticalReasons.push("multiple hero seats found");
  }
  if (state.seats.filter((s) => s.isOccupied && s.isCurrentToAct).length !== 1) {
    criticalReasons.push("current player to act is missing or ambiguous");
  }
  if (new Set(state.seats.map((s) => s.seatNumber)).size !== state.seats.length) {
    criticalReasons.push("duplicate seat numbers");
  }

  if (!hero || !hero.isOccupied) {
    criticalReasons.push("hero seat not found in state");
  } else {
    if (hero.holeCards.length !== 2) {
      criticalReasons.push(`hero hole cards incomplete (${hero.holeCards.length}/2)`);
    }
    if (hero.stack === null || !Number.isFinite(hero.stack) || hero.stack < 0) {
      criticalReasons.push("hero stack missing or invalid");
    }
    if (hero.isFolded) {
      criticalReasons.push("hero has already folded -- no decision to make");
    }
    if (!hero.isCurrentToAct) {
      criticalReasons.push("it is not hero's turn -- unsafe to base a decision on this state");
    }
    if (hero.isOffline) {
      criticalReasons.push("hero is showing as offline");
    }
  }

  const expectedBoardCount = EXPECTED_BOARD_COUNT[state.street];
  const visibleCards = [...state.board, ...state.seats.filter((s) => s.isOccupied).flatMap((s) => s.holeCards)];
  if (new Set(visibleCards.map((c) => `${c.rank}${c.suit}`)).size !== visibleCards.length) {
    criticalReasons.push("duplicate visible cards -- the table read is inconsistent");
  }
  if (state.board.length !== expectedBoardCount) {
    criticalReasons.push(
      `board card count (${state.board.length}) does not match street "${state.street}" (expected ${expectedBoardCount})`,
    );
  }

  if (!Number.isFinite(state.potMainValue) || state.potMainValue < 0) {
    criticalReasons.push("pot value missing or invalid");
  }

  if (state.potTotalValue !== null && (!Number.isFinite(state.potTotalValue) || state.potTotalValue < 0)) {
    criticalReasons.push("add-on pot value is invalid");
  }
  if (!context.potSemanticsVerified) {
    criticalReasons.push("main/add-on pot meaning needs live confirmation -- pot-based recommendations withheld");
  }

  if (context.amountToCall === null || !Number.isFinite(context.amountToCall) || context.amountToCall < 0) {
    criticalReasons.push("amount-to-call is missing or invalid");
  }

  const activeOpponents = state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded);
  if (state.seats.some((s) => s.isOccupied && !s.isFolded &&
      (s.betReadError || (s.currentBet !== null && (!Number.isFinite(s.currentBet) || s.currentBet < 0))))) {
    criticalReasons.push("current street contribution is unreadable");
  }
  if (activeOpponents.some((s) => !s.isAllIn && (s.stack === null || !Number.isFinite(s.stack) || s.stack < 0))) {
    criticalReasons.push("active opponent stack missing or invalid");
  }
  if (activeOpponents.length < 1) {
    criticalReasons.push("no active opponents remain -- hand is already decided");
  }

  if (context.bigBlindWasDefaulted) {
    criticalReasons.push("big blind could not be read from the table -- BB-based sizing is unreliable");
  }

  if (activeOpponents.some((s) => s.isOffline)) {
    uncertainReasons.push("at least one active opponent is showing as offline -- their state may be stale");
  }

  if (!context.isPositionKnown) {
    criticalReasons.push("hero's real table position is not yet known -- no fallback position will be sent");
  }

  if (criticalReasons.length > 0) {
    return { level: "low", reasons: criticalReasons };
  }
  if (uncertainReasons.length > 0) {
    return { level: "medium", reasons: uncertainReasons };
  }
  return { level: "high", reasons: [] };
}
