import type { Card, Suit } from "@poker-ai/shared";

export type SuitTexture = "monotone" | "two_tone" | "rainbow";
export type PairTexture = "paired" | "trips_plus" | "unpaired";
export type ConnectivityTexture = "disconnected" | "somewhat_connected" | "highly_connected";
export type OverallWetness = "dry" | "semi_wet" | "wet";

export interface BoardTextureResult {
  suitTexture: SuitTexture;
  pairTexture: PairTexture;
  connectivity: ConnectivityTexture;
  overall: OverallWetness;
}

function classifySuitTexture(board: readonly Card[]): SuitTexture {
  const suitCounts = new Map<Suit, number>();
  for (const c of board) {
    suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1);
  }
  const counts = [...suitCounts.values()].sort((a, b) => b - a);
  if (counts[0]! >= board.length) return "monotone"; // all cards share one suit
  if (counts[0]! >= 2) return "two_tone"; // some suit repeats, but not all cards
  return "rainbow"; // every card a different suit
}

function classifyPairTexture(board: readonly Card[]): PairTexture {
  const rankCounts = new Map<number, number>();
  for (const c of board) {
    rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
  }
  const maxCount = Math.max(...rankCounts.values());
  if (maxCount >= 3) return "trips_plus";
  if (maxCount === 2) return "paired";
  return "unpaired";
}

/**
 * Connectivity is judged by how many pairs of board ranks are within 4 of
 * each other (i.e. could plausibly both be part of the same straight
 * draw window). This is a documented convention, not a universal
 * standard — poker resources vary in exactly where they draw this line.
 * Thresholds are intentionally visible here so they can be tuned later
 * rather than buried as unexplained magic numbers.
 */
function classifyConnectivity(board: readonly Card[]): ConnectivityTexture {
  const ranks = [...new Set(board.map((c) => c.rank))].sort((a, b) => a - b);
  let closePairs = 0;
  for (let i = 0; i < ranks.length; i++) {
    for (let j = i + 1; j < ranks.length; j++) {
      if (ranks[j]! - ranks[i]! <= 4) closePairs++;
    }
  }
  // Thresholds tuned for a 3-5 card board; revisit if they feel off in practice.
  if (closePairs === 0) return "disconnected";
  if (closePairs <= 2) return "somewhat_connected";
  return "highly_connected";
}

function classifyOverall(
  suitTexture: SuitTexture,
  pairTexture: PairTexture,
  connectivity: ConnectivityTexture,
): OverallWetness {
  let wetnessScore = 0;
  if (suitTexture === "monotone") wetnessScore += 2;
  else if (suitTexture === "two_tone") wetnessScore += 1;

  if (connectivity === "highly_connected") wetnessScore += 2;
  else if (connectivity === "somewhat_connected") wetnessScore += 1;

  // A paired board reduces straight/flush relevance (fewer distinct ranks
  // in play) — treated as a mild dryness factor, not wetness.
  if (pairTexture !== "unpaired") wetnessScore -= 1;

  if (wetnessScore >= 3) return "wet";
  if (wetnessScore >= 1) return "semi_wet";
  return "dry";
}

export function classifyBoardTexture(board: readonly Card[]): BoardTextureResult {
  if (board.length < 3 || board.length > 5) {
    throw new Error(`classifyBoardTexture requires a 3-5 card board, got ${board.length}`);
  }

  const suitTexture = classifySuitTexture(board);
  const pairTexture = classifyPairTexture(board);
  const connectivity = classifyConnectivity(board);
  const overall = classifyOverall(suitTexture, pairTexture, connectivity);

  return { suitTexture, pairTexture, connectivity, overall };
}