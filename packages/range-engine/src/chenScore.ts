import type { HandType } from "./handNotation.js";

/**
 * The Chen Formula: a well-known, published heuristic for scoring
 * preflop hand strength (Bill Chen, widely taught in poker literature).
 * This is NOT a solved/exact ranking -- it's a fast, deterministic
 * approximation good enough for ordering hands within a range, not for
 * claiming precise win-rate differences between similarly-scored hands.
 *
 * Scores roughly range from 20 (AA) down to -1 or so for the weakest
 * offsuit hands like 72o.
 */
export function chenScore(hand: HandType): number {
  const { highRank, lowRank, suited } = hand;

  // Step 1: score the high card.
  let score: number;
  if (highRank === 14) score = 10; // Ace
  else if (highRank === 13) score = 8; // King
  else if (highRank === 12) score = 7; // Queen
  else if (highRank === 11) score = 6; // Jack
  else if (highRank === 10) score = 5; // Ten
  else score = highRank / 2; // 2-9 score at half rank

  // Step 2: pocket pair -- double the score, minimum 5.
  if (highRank === lowRank) {
    score = Math.max(score * 2, 5);
    // Pairs skip gap/straight bonus entirely -- there's no "gap" concept
    // for a single rank, and the standard formula stops here for pairs.
    return score;
  }

  // Step 3: suited bonus.
  if (suited) score += 2;

  // Step 4: gap penalty. Gap = how many ranks separate the two cards
  // minus 1 (so connectors like 98 have a gap of 0).
  const gap = highRank - lowRank - 1;
  if (gap === 1) score -= 1;
  else if (gap === 2) score -= 2;
  else if (gap === 3) score -= 4;
  else if (gap >= 4) score -= 5;
  // gap === 0 (connectors): no penalty.

  // Step 5: straight bonus. +1 if there's a 0 or 1 gap AND both cards
  // are lower than a Queen (extra straight-making potential, e.g. JT
  // over AK, since AK can only make the one Broadway straight).
  if ((gap === 0 || gap === 1) && highRank < 12) {
    score += 1;
  }

  // Step 6: round UP to the next whole number (standard Chen rounding
  // rule -- e.g. 7.5 rounds up to 8, not to the nearest half-point).
  return Math.ceil(score);
}