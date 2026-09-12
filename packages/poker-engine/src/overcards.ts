import { fullDeck, type Card } from "@poker-ai/shared";

export interface OvercardsResult {
  /** How many of hero's 2 hole cards rank higher than every board card. */
  overcardCount: 0 | 1 | 2;
  /** The hole card(s) that qualify as overcards. */
  overcards: Card[];
  /** Outs to pair an overcard (3 remaining copies of each qualifying rank). */
  outs: Card[];
  count: number;
}

/**
 * Detects overcards: hole cards ranked higher than every card on the
 * board. Meaningful on the flop/turn -- on a made-hand river there's
 * nothing left to draw to, though the function doesn't forbid calling it
 * there, it just won't have meaningfully different "outs" left to see.
 */
export function detectOvercards(holeCards: readonly Card[], board: readonly Card[]): OvercardsResult {
  if (holeCards.length !== 2) {
    throw new Error(`detectOvercards requires exactly 2 hole cards, got ${holeCards.length}`);
  }
  if (board.length < 3) {
    throw new Error(`detectOvercards requires a board of at least 3 cards, got ${board.length}`);
  }

  const highestBoardRank = Math.max(...board.map((c) => c.rank));
  const overcards = holeCards.filter((c) => c.rank > highestBoardRank);

  const known = [...holeCards, ...board];
  const knownIds = new Set(known.map((c) => `${c.rank}${c.suit}`));
  const overcardRanks = new Set(overcards.map((c) => c.rank));

  const outs = fullDeck().filter(
    (c) => overcardRanks.has(c.rank) && !knownIds.has(`${c.rank}${c.suit}`),
  );

  return {
    overcardCount: overcards.length as 0 | 1 | 2,
    overcards,
    outs,
    count: outs.length,
  };
}