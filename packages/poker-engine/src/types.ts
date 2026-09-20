import type { Card } from "@poker-ai/shared";

/**
 * The 9 standard poker hand categories, ordered worst to best.
 * The numeric value IS the ranking — straight flush (8) always beats
 * quads (7), which always beats a full house (6), etc. Using the enum's
 * own numeric value as the primary sort key means we don't need a
 * separate lookup table to know category order.
 */
export enum HandCategory {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
}

/**
 * Display names indexed by HandCategory's numeric value -- the single
 * canonical source, since both AI providers' prompts and the reasoning
 * consistency checker all need the exact same mapping.
 */
export const HAND_CATEGORY_NAMES = [
  "High Card",
  "Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
] as const;
/**
 * A fully evaluated 5-card hand, ready to compare against another.
 *
 * `value` packs category + up to 5 tiebreaker ranks into a single number,
 * so comparing two hands is just `a.value > b.value` — no custom
 * comparator needed anywhere else in the codebase.
 *
 * `tiebreakers` holds the same information unpacked and human-readable,
 * for building recommendation explanations later (e.g. "two pair, Kings
 * and Sevens, Ace kicker") without having to un-pack `value` by hand.
 */
export interface EvaluatedHand {
  category: HandCategory;
  /** Ranks that matter for tiebreaking, ordered most→least significant. */
  tiebreakers: number[];
  /** Single comparable number: higher always wins. */
  value: number;
  /** The best 5 cards making up this hand. */
  cards: Card[];
}