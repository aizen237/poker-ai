import type { Card } from "@poker-ai/shared";
import { combinations } from "./combinatorics.js";
import { type EvaluatedHand, HandCategory } from "./types.js";

/** Returns the high card of a straight among 5 distinct ranks, or null. */
function detectStraightHigh(distinctRanksDesc: number[]): number | null {
  if (distinctRanksDesc.length !== 5) return null;

  // Wheel: A-2-3-4-5, where Ace plays low. High card is 5, not 14.
  const set = new Set(distinctRanksDesc);
  if ([14, 5, 4, 3, 2].every((r) => set.has(r))) return 5;

  const [a, b, c, d, e] = distinctRanksDesc as [number, number, number, number, number];
  if (a - b === 1 && b - c === 1 && c - d === 1 && d - e === 1) return a;

  return null;
}

/** Packs category + up to 5 tiebreaker ranks into one comparable number. */
function packValue(category: HandCategory, tiebreakers: number[]): number {
  let value = category;
  for (let i = 0; i < 5; i++) {
    value = value * 16 + (tiebreakers[i] ?? 0);
  }
  return value;
}

/** Evaluates exactly 5 cards into a category + comparable value. */
export function evaluate5(cards: readonly Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error(`evaluate5 requires exactly 5 cards, got ${cards.length}`);
  }

  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  const rankCounts = new Map<number, number>();
  for (const c of cards) {
    rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
  }

  const distinctRanksDesc = [...rankCounts.keys()].sort((a, b) => b - a);
  const straightHigh = detectStraightHigh(distinctRanksDesc);

  // Groups sorted by count desc, then rank desc — e.g. full house KKK 77
  // becomes [{rank:13,count:3},{rank:7,count:2}].
  const groups = [...rankCounts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : b.rank - a.rank));

  const allRanksDesc = cards.map((c) => c.rank).sort((a, b) => b - a);

  let category: HandCategory;
  let tiebreakers: number[];

  if (isFlush && straightHigh !== null) {
    category = HandCategory.StraightFlush;
    tiebreakers = [straightHigh];
  } else if (groups[0]!.count === 4) {
    category = HandCategory.FourOfAKind;
    const kicker = allRanksDesc.find((r) => r !== groups[0]!.rank)!;
    tiebreakers = [groups[0]!.rank, kicker];
  } else if (groups[0]!.count === 3 && groups[1]?.count === 2) {
    category = HandCategory.FullHouse;
    tiebreakers = [groups[0]!.rank, groups[1]!.rank];
  } else if (isFlush) {
    category = HandCategory.Flush;
    tiebreakers = allRanksDesc;
  } else if (straightHigh !== null) {
    category = HandCategory.Straight;
    tiebreakers = [straightHigh];
  } else if (groups[0]!.count === 3) {
    category = HandCategory.ThreeOfAKind;
    const kickers = allRanksDesc.filter((r) => r !== groups[0]!.rank);
    tiebreakers = [groups[0]!.rank, ...kickers];
  } else if (groups[0]!.count === 2 && groups[1]?.count === 2) {
    category = HandCategory.TwoPair;
    const highPair = groups[0]!.rank;
    const lowPair = groups[1]!.rank;
    const kicker = allRanksDesc.find((r) => r !== highPair && r !== lowPair)!;
    tiebreakers = [highPair, lowPair, kicker];
  } else if (groups[0]!.count === 2) {
    category = HandCategory.Pair;
    const pairRank = groups[0]!.rank;
    const kickers = allRanksDesc.filter((r) => r !== pairRank);
    tiebreakers = [pairRank, ...kickers];
  } else {
    category = HandCategory.HighCard;
    tiebreakers = allRanksDesc;
  }

  return {
    category,
    tiebreakers,
    value: packValue(category, tiebreakers),
    cards: [...cards],
  };
}

/**
 * Evaluates the best possible 5-card hand out of 5, 6, or 7 cards
 * (hold'em: 2 hole cards + up to 5 board cards). Checks every 5-card
 * combination and returns the one with the highest value.
 */
export function evaluateBest(cards: readonly Card[]): EvaluatedHand {
  if (cards.length < 5) {
    throw new Error(`evaluateBest requires at least 5 cards, got ${cards.length}`);
  }
  if (cards.length === 5) {
    return evaluate5(cards);
  }

  const candidates = combinations(cards, 5);
  let best: EvaluatedHand | null = null;
  for (const combo of candidates) {
    const evaluated = evaluate5(combo);
    if (!best || evaluated.value > best.value) {
      best = evaluated;
    }
  }
  return best!;
}