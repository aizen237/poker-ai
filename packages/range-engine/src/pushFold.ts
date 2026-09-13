import { calculateBetEV, calculateEquity } from "@poker-ai/poker-engine";
import type { Card } from "@poker-ai/shared";

export interface ShoveEvaluation {
  /** Expected value of shoving, in big blinds. */
  ev: number;
  /** Hero's equity if called, currently approximated vs. a random hand. */
  equityIfCalled: number;
  /** The fold-equity assumption actually used for this calculation. */
  foldEquityUsed: number;
  isProfitable: boolean;
}

export interface ShoveOptions {
  /** Assumed probability opponents fold to the shove. Real fold equity
   *  depends on opponent tendencies (stack depth, position, image) --
   *  this is a documented default, meant to be overridden once the
   *  opponent database (a later phase) can supply a real estimate. */
  foldEquity?: number;
  iterations?: number;
  rng?: () => number;
}

const DEFAULT_FOLD_EQUITY = 0.5;

/**
 * Evaluates whether shoving all-in is profitable, given hero's hand,
 * effective stack, and the current pot -- all in big-blind units.
 *
 * IMPORTANT DOCUMENTED SIMPLIFICATION: `equityIfCalled` is computed vs. a
 * RANDOM hand, not a realistic "range of hands that would actually call a
 * shove." A real opponent only calls with a subset of hands strong enough
 * to justify it -- so this overstates hero's true equity-if-called
 * somewhat, since calling ranges are stronger than random. This is a
 * known limitation, not a hidden one: a proper fix requires either a
 * manually-specified calling range (reusing calculateEquityVsRange
 * instead of calculateEquity) or realistic ranges from the opponent
 * database (a later phase). Unlike the standard opening ranges, this
 * push/fold model is OUR OWN derivation from first-principles EV math
 * (reusing calculateBetEV), not a cross-checked published chart like
 * Sklansky-Chubukov -- treat its exact numbers accordingly.
 */
export function evaluateShove(
  heroCards: readonly Card[],
  effectiveStackBB: number,
  potBB: number,
  options: ShoveOptions = {},
): ShoveEvaluation {
  if (effectiveStackBB <= 0) {
    throw new Error(`effectiveStackBB must be positive, got ${effectiveStackBB}`);
  }
  if (potBB <= 0) {
    throw new Error(`potBB must be positive, got ${potBB}`);
  }
  const foldEquity = options.foldEquity ?? DEFAULT_FOLD_EQUITY;
  if (foldEquity < 0 || foldEquity > 1) {
    throw new Error(`foldEquity must be between 0 and 1, got ${foldEquity}`);
  }
const equityResult = calculateEquity(heroCards, [], 1, {
  ...(options.iterations !== undefined
    ? { iterations: options.iterations }
    : {}),
  ...(options.rng !== undefined ? { rng: options.rng } : {}),
});

  const { ev } = calculateBetEV(equityResult.equity, foldEquity, potBB, effectiveStackBB);

  return {
    ev,
    equityIfCalled: equityResult.equity,
    foldEquityUsed: foldEquity,
    isProfitable: ev > 0,
  };
}