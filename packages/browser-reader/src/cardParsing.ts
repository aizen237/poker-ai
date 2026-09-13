import type { Card, Rank, Suit } from "@poker-ai/shared";

const CLASS_SUIT_MAP: Record<string, Suit> = {
  "card-s": "s",
  "card-h": "h",
  "card-d": "d",
  "card-c": "c",
};

const CLASS_RANK_MAP: Record<string, Rank> = {
  "card-s-2": 2, "card-s-3": 3, "card-s-4": 4, "card-s-5": 5,
  "card-s-6": 6, "card-s-7": 7, "card-s-8": 8, "card-s-9": 9,
  "card-s-T": 10, "card-s-J": 11, "card-s-Q": 12, "card-s-K": 13, "card-s-A": 14,
};

/**
 * Parses a hole card from a PokerNow "card-container" element's class
 * list, e.g. "card-container card-s   card-s-5 flipped card-p1  med
 * sub-suit ". Verified against real PokerNow DOM (Sept 2026): suit comes
 * from one of card-s/card-h/card-d/card-c, rank from card-s-<RANK> where
 * <RANK> uses standard poker notation (2-9, T, J, Q, K, A) regardless of
 * the actual suit -- "card-s-" is a fixed prefix here, not related to
 * spades specifically; this was confirmed by observing a heart card
 * also using a "card-s-4" style rank class.
 *
 * Returns null (rather than throwing) if the card isn't currently
 * "flipped" (face-up) or if the expected classes aren't found -- an
 * unrevealed opponent card looks like this, and that's an expected,
 * normal state, not an error.
 */
export function parseHoleCardFromClassList(classList: readonly string[]): Card | null {
  if (!classList.includes("flipped")) {
    return null;
  }

  let suit: Suit | undefined;
  let rank: Rank | undefined;

  for (const cls of classList) {
    if (cls in CLASS_SUIT_MAP) {
      suit = CLASS_SUIT_MAP[cls];
    }
    if (cls in CLASS_RANK_MAP) {
      rank = CLASS_RANK_MAP[cls];
    }
  }

  if (suit === undefined || rank === undefined) {
    return null;
  }

  return { rank, suit };
}

const TEXT_SUIT_MAP: Record<string, Suit> = {
  h: "h",
  s: "s",
  d: "d",
  c: "c",
};

const TEXT_RANK_MAP: Record<string, Rank> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

/**
 * Parses a board (community) card from its plain-text value/suit spans,
 * e.g. <span class="value">10</span> <span class="suit">h</span>.
 * Verified against real PokerNow DOM: board cards use readable text
 * content, a different (and simpler) encoding than hole cards' class-
 * name-based approach.
 */
export function parseBoardCardFromText(valueText: string, suitText: string): Card {
  const rank = TEXT_RANK_MAP[valueText.trim()];
  const suit = TEXT_SUIT_MAP[suitText.trim().toLowerCase()];

  if (rank === undefined) {
    throw new Error(`Unrecognized board card value text: "${valueText}"`);
  }
  if (suit === undefined) {
    throw new Error(`Unrecognized board card suit text: "${suitText}"`);
  }

  return { rank, suit };
}