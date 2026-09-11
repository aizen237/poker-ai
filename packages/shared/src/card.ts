/**
 * Core card representation shared across every package.
 *
 * Rank is numeric (2-14, Ace high) so arithmetic comparisons and straight
 * detection don't need string parsing in hot paths (equity simulation runs
 * this millions of times).
 */

export const SUITS = ["s", "h", "d", "c"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
}

const RANK_CHAR_TO_RANK: Record<string, Rank> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  t: 10,
  J: 11,
  j: 11,
  Q: 12,
  q: 12,
  K: 13,
  k: 13,
  A: 14,
  a: 14,
};

const RANK_TO_CHAR: Record<Rank, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "T",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

/**
 * Parses a card from its two-character string form, e.g. "As", "Td", "2h".
 * Throws on malformed input rather than returning null — callers at the
 * boundary (game-state readers, AI response parsers) should validate before
 * this point; internal code should never see malformed card strings.
 */
export function parseCard(input: string): Card {
  const trimmed = input.trim();
  if (trimmed.length !== 2) {
    throw new Error(`Invalid card string "${input}": expected 2 characters`);
  }
  const rankChar = trimmed[0]!;
  const suitChar = trimmed[1]!.toLowerCase();

  const rank = RANK_CHAR_TO_RANK[rankChar];
  if (rank === undefined) {
    throw new Error(`Invalid card string "${input}": unknown rank "${rankChar}"`);
  }
  if (!SUITS.includes(suitChar as Suit)) {
    throw new Error(`Invalid card string "${input}": unknown suit "${suitChar}"`);
  }
  return { rank, suit: suitChar as Suit };
}

export function parseCards(input: string): Card[] {
  return input
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0)
    .map(parseCard);
}

export function formatCard(card: Card): string {
  return `${RANK_TO_CHAR[card.rank]}${card.suit}`;
}

export function formatCards(cards: readonly Card[]): string {
  return cards.map(formatCard).join(" ");
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

/** Unique integer id 0-51 for a card. Useful as an array/set index. */
export function cardId(card: Card): number {
  return (card.rank - 2) * 4 + SUITS.indexOf(card.suit);
}

export function cardFromId(id: number): Card {
  if (id < 0 || id > 51) throw new Error(`Invalid card id ${id}`);
  const rank = (Math.floor(id / 4) + 2) as Rank;
  const suit = SUITS[id % 4]!;
  return { rank, suit };
}