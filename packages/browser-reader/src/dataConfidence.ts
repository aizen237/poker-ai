import type { PokerGameState } from "./gameState.js";

export type DataConfidence = "high" | "medium" | "low";

export interface ConfidenceContext {
  /** Amount hero must put in to continue (0 if nothing to call). */
  amountToCall: number;
  /**
   * True when the big blind could not be read from the table this cycle
   * (extraction fell back to a default) -- when true, every BB-based
   * sizing (stackBB, potBB, amountBB) downstream is unreliable.
   */
  bigBlindWasDefaulted: boolean;
  /**
   * True once hero's real table position (BTN/CO/etc.) is computed from
   * the dealer button rather than the documented placeholder. Always
   * false today -- see the position placeholder note in contentScript.ts.
   */
  isPositionKnown: boolean;
}

export interface ConfidenceResult {
  level: DataConfidence;
  /** Reasons contributing to the level, most severe first. For logging/debugging, not shown to end users. */
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
 *   uncertain (e.g. hero's real position isn't known yet).
 * - "high": everything decision-critical is present and consistent, and
 *   nothing non-critical is flagged either.
 */
export function computeDataConfidence(state: PokerGameState, context: ConfidenceContext): ConfidenceResult {
  const criticalReasons: string[] = [];
  const uncertainReasons: string[] = [];

  const hero = state.seats.find((s) => s.isYou);

  if (!hero) {
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
  if (state.board.length !== expectedBoardCount) {
    criticalReasons.push(
      `board card count (${state.board.length}) does not match street "${state.street}" (expected ${expectedBoardCount})`,
    );
  }

  if (!Number.isFinite(state.potMainValue) || state.potMainValue < 0) {
    criticalReasons.push("pot value missing or invalid");
  }

  if (!Number.isFinite(context.amountToCall) || context.amountToCall < 0) {
    criticalReasons.push("amount-to-call is missing or invalid");
  }

  const activeOpponents = state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded);
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
    uncertainReasons.push("hero's real table position is not yet known (placeholder in use)");
  }

  if (criticalReasons.length > 0) {
    return { level: "low", reasons: criticalReasons };
  }
  if (uncertainReasons.length > 0) {
    return { level: "medium", reasons: uncertainReasons };
  }
  return { level: "high", reasons: [] };
}