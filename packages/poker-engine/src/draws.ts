import type { Card, Rank, Suit } from "@poker-ai/shared";

export interface FlushDrawResult {
  hasFlushDraw: boolean;
  suit: Suit | null;
  cardsOfSuit: number;
  outs: number;
}

/**
 * A flush draw exists when hero has exactly 4 cards of one suit combined
 * across hole + board (5+ would already be a made flush, not a draw).
 * There are 13 cards of each suit total, so outs = 13 - cardsOfSuit.
 */
export function detectFlushDraw(holeCards: readonly Card[], board: readonly Card[]): FlushDrawResult {
  const all = [...holeCards, ...board];
  const suitCounts = new Map<Suit, number>();
  for (const c of all) {
    suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1);
  }

  for (const [suit, count] of suitCounts) {
    if (count === 4) {
      return { hasFlushDraw: true, suit, cardsOfSuit: count, outs: 13 - count };
    }
  }
  return { hasFlushDraw: false, suit: null, cardsOfSuit: 0, outs: 0 };
}

export type StraightDrawKind = "open_ended" | "gutshot" | "none";

export interface StraightDrawResult {
  kind: StraightDrawKind;
  outs: number;
  /** The rank(s) that would complete the straight. */
  completingRanks: Rank[];
}

/** All 10 possible 5-consecutive-rank straight windows, wheel through broadway.
 *  Ace is always rank 14 in our system, including in the wheel window — no
 *  separate low-ace placeholder needed. */
const STRAIGHT_WINDOWS: Rank[][] = [
  [14, 2, 3, 4, 5],
  [2, 3, 4, 5, 6],
  [3, 4, 5, 6, 7],
  [4, 5, 6, 7, 8],
  [5, 6, 7, 8, 9],
  [6, 7, 8, 9, 10],
  [7, 8, 9, 10, 11],
  [8, 9, 10, 11, 12],
  [9, 10, 11, 12, 13],
  [10, 11, 12, 13, 14],
];

/**
 * Checks every possible straight window against hero's combined ranks.
 * If any window is fully satisfied, hero already has a made straight —
 * that's not a draw, so we report "none" immediately. Otherwise, collects
 * every distinct single missing rank from windows where hero has exactly
 * 4 of 5, and classifies by how many distinct completing ranks exist.
 */
export function detectStraightDraw(holeCards: readonly Card[], board: readonly Card[]): StraightDrawResult {
  const all = [...holeCards, ...board];
  const heroRanks = new Set(all.map((c) => c.rank));

  const missingRanks = new Set<Rank>();

  for (const window of STRAIGHT_WINDOWS) {
    const haveCount = window.filter((r) => heroRanks.has(r)).length;

    if (haveCount === 5) {
      return { kind: "none", outs: 0, completingRanks: [] };
    }
    if (haveCount === 4) {
      const missing = window.find((r) => !heroRanks.has(r))!;
      missingRanks.add(missing);
    }
  }

  if (missingRanks.size === 0) {
    return { kind: "none", outs: 0, completingRanks: [] };
  }

  const completingRanks = [...missingRanks];
  if (missingRanks.size === 1) {
    return { kind: "gutshot", outs: 4, completingRanks };
  }
  // 2 (or more, in unusual multi-draw cases) distinct completing ranks.
  return { kind: "open_ended", outs: 4 * completingRanks.length, completingRanks };
}