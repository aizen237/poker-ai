import { chenScore } from "./chenScore.js";
import { parseHandType } from "./handNotation.js";
import { getOpeningRange } from "./openingRanges.js";
import type { Range } from "./range.js";

export interface NarrowingOptions {
  /** Fraction of the range to keep, e.g. 0.25 = top 25%. */
  topFraction?: number;
  /** Lower/upper percentile bounds for a middle-band narrowing, e.g. [0.4, 0.75]. */
  band?: [number, number];
}

/**
 * Ranks every hand in a range by Chen score (descending) and returns
 * them in order, along with their combo-weighted position -- used as
 * the shared basis for all narrowing operations below.
 *
 * IMPORTANT: these percentile cutoffs (25% for a 3-bet, 40-75% for a
 * call) are documented, tunable DEFAULTS, not a solved or published
 * standard -- real opponents vary widely in exactly how tight a 3-bet
 * range is. Treat this as a reasonable starting model per the original
 * spec ("the exact range model can start simple"), refine later with
 * opponent-specific data from the opponent database (a later phase).
 */
function rankRangeByStrength(range: Range): string[] {
  return [...range.keys()].sort((a, b) => chenScore(parseHandType(b)) - chenScore(parseHandType(a)));
}

/** Narrows a range to the top N% by Chen score -- models a 3-bet (aggression implies strength). */
export function narrowForThreeBet(range: Range, options: NarrowingOptions = {}): Range {
  const topFraction = options.topFraction ?? 0.25;
  if (topFraction <= 0 || topFraction > 1) {
    throw new Error(`topFraction must be between 0 (exclusive) and 1, got ${topFraction}`);
  }

  const ranked = rankRangeByStrength(range);
  const keepCount = Math.max(1, Math.ceil(ranked.length * topFraction));
  const kept = new Set(ranked.slice(0, keepCount));

  const narrowed: Range = new Map();
  for (const [hand, weight] of range) {
    if (kept.has(hand)) narrowed.set(hand, weight);
  }
  return narrowed;
}

/** Narrows a range to a middle percentile band -- models a flat call (excludes both raises and folds). */
export function narrowForCall(range: Range, options: NarrowingOptions = {}): Range {
  const [lowerPct, upperPct] = options.band ?? [0.4, 0.75];
  if (lowerPct < 0 || upperPct > 1 || lowerPct >= upperPct) {
    throw new Error(`Invalid band [${lowerPct}, ${upperPct}]: must satisfy 0 <= lower < upper <= 1`);
  }

  const ranked = rankRangeByStrength(range);
  const lowerIdx = Math.floor(ranked.length * lowerPct);
  const upperIdx = Math.ceil(ranked.length * upperPct);
  const kept = new Set(ranked.slice(lowerIdx, upperIdx));

  const narrowed: Range = new Map();
  for (const [hand, weight] of range) {
    if (kept.has(hand)) narrowed.set(hand, weight);
  }
  return narrowed;
}

/**
 * Narrows a range to exclude the top N% -- models folding to aggression
 * (a 3-bet or raise): the remaining continuing range excludes whatever
 * portion is assumed to have 4-bet/re-raised instead of calling.
 */
export function narrowExcludingTop(range: Range, topFractionExcluded: number): Range {
  if (topFractionExcluded < 0 || topFractionExcluded >= 1) {
    throw new Error(`topFractionExcluded must be between 0 (inclusive) and 1 (exclusive), got ${topFractionExcluded}`);
  }

  const ranked = rankRangeByStrength(range);
  const excludeCount = Math.floor(ranked.length * topFractionExcluded);
  const excluded = new Set(ranked.slice(0, excludeCount));

  const narrowed: Range = new Map();
  for (const [hand, weight] of range) {
    if (!excluded.has(hand)) narrowed.set(hand, weight);
  }
  return narrowed;
}

export type OpponentAction = "check" | "call" | "bet" | "raise" | "fold" | "all-in";

/**
 * Default baseline range to narrow from when no better prior exists.
 * Uses BTN's opening range (the widest single-position range) as a
 * deliberately wide fallback. The extension supplies a position-based
 * baseline when dealer-button detection identifies the opponent's position.
 */
function defaultBaselineRange(): Range {
  return getOpeningRange("BTN");
}

/**
 * Composes the narrowing functions above into a single range estimate
 * from an opponent's ordered action history for the hand so far. Each
 * action narrows the range produced by the PREVIOUS action (not the
 * original baseline) -- e.g. "raise, call" models "the range of hands
 * that would raise, then continue with a call facing more aggression,"
 * not two independent slices of the full baseline.
 *
 * "check", "fold", and "all-in" are accepted without narrowing. An
 * all-in label alone does not establish aggression: it may be a short
 * call or a delayed status label. No new opponent model is inferred.
 *
 * KNOWN SIMPLIFICATION: observed "bet" and "raise" actions both retain
 * the existing narrowForThreeBet treatment, the only aggression
 * narrowing tool available. A real opening-bet range is wider than a
 * genuine 3-bet range -- treat this as a reasonable starting model, not
 * a precise one, consistent with the rest of this module's documented
 * defaults.
 */
export function estimateOpponentRange(
  actions: readonly OpponentAction[],
  baseline: Range = defaultBaselineRange(),
): Range {
  let range = baseline;
  for (const action of actions) {
    if (action === "raise" || action === "bet") {
      range = narrowForThreeBet(range);
    } else if (action === "call") {
      range = narrowForCall(range);
    }
    // Check/fold/all-in labels alone intentionally have no effect.
  }
  return range;
}
