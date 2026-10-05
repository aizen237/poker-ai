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
    if (Object.hasOwn(CLASS_SUIT_MAP, cls)) {
      if (suit !== undefined && suit !== CLASS_SUIT_MAP[cls]) return null;
      suit = CLASS_SUIT_MAP[cls];
    }
    if (Object.hasOwn(CLASS_RANK_MAP, cls)) {
      if (rank !== undefined && rank !== CLASS_RANK_MAP[cls]) return null;
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
  "\u2660": "s", "\u2665": "h", "\u2666": "d", "\u2663": "c",
};

const TEXT_RANK_MAP: Record<string, Rank> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 10, T: 10, J: 11, Q: 12, K: 13, A: 14,
};

/**
 * Parses a board (community) card from its plain-text value/suit spans,
 * e.g. <span class="value">10</span> <span class="suit">h</span>.
 * Board cards also expose rank/suit classes and repeat the suit in a decorative
 * sub-suit span; the DOM reader selects the main span before calling this parser.
 */
export function parseBoardCardFromText(valueText: string, suitText: string): Card {
  const rankKey = valueText.trim().toUpperCase();
  const suitKey = normalizeSuitText(suitText);
  const rank = Object.hasOwn(TEXT_RANK_MAP, rankKey) ? TEXT_RANK_MAP[rankKey] : undefined;
  const suit = Object.hasOwn(TEXT_SUIT_MAP, suitKey) ? TEXT_SUIT_MAP[suitKey] : undefined;

  if (rank === undefined) {
    throw new Error(`Unrecognized board card value text: "${valueText}"`);
  }
  if (suit === undefined) {
    throw new Error(`Unrecognized board card suit text: "${suitText}"`);
  }

  return { rank, suit };
}

function normalizeSuitText(text: string): string {
  return text.trim().replace(/[\uFE0E\uFE0F]/g, "").toLowerCase();
}

export interface BoardCardEvidence {
  classList: readonly string[];
  valueTexts: readonly string[];
  /** Main .suit:not(.sub-suit) texts used to resolve the card. */
  suitTexts: readonly string[];
  /** All .suit texts, including decorative duplicates, retained for diagnostics only. */
  allSuitTexts?: readonly string[];
}

/** A board card can render its suit more than once. Resolve agreeing signals,
 * not a unique element or an arbitrary first match. Empty decorative nodes do
 * not override readable text/classes; contradictory signals remain an error.
 * Class encodings reuse the existing PokerNow maps. Classes alone require the
 * already-supported face-up marker; never expose a hidden card from its classes.
 */
export function parseBoardCardFromEvidence(evidence: BoardCardEvidence): Card {
  const ranks = new Set<Rank>();
  const suits = new Set<Suit>();
  for (const text of evidence.valueTexts) {
    if (text.trim()) ranks.add(parseBoardCardFromText(text, "s").rank);
  }
  for (const text of evidence.suitTexts) {
    if (text.trim()) suits.add(parseBoardCardFromText("2", text).suit);
  }
  if (ranks.size > 0 || suits.size > 0 || evidence.classList.includes("flipped")) {
    for (const cls of evidence.classList) {
      if (Object.hasOwn(CLASS_RANK_MAP, cls)) ranks.add(CLASS_RANK_MAP[cls]!);
      if (Object.hasOwn(CLASS_SUIT_MAP, cls)) suits.add(CLASS_SUIT_MAP[cls]!);
    }
  }
  if (ranks.size !== 1 || suits.size !== 1) {
    throw new Error(`Board card needs one consistent rank and suit; found ${ranks.size} rank(s), ${suits.size} suit(s)`);
  }
  return { rank: [...ranks][0]!, suit: [...suits][0]! };
}
