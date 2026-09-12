import { fullDeck, type Card } from "@poker-ai/shared";
import { evaluateBest } from "./evaluator.js";

export interface OutsResult {
  /** Cards that would improve hero's hand category if they came next. */
  outs: Card[];
  count: number;
}

/**
 * Counts outs: remaining cards that, if dealt as the next board card,
 * improve hero's hand CATEGORY (e.g. pair -> trips, nothing -> straight).
 * Deliberately does not count same-category improvements (better kicker,
 * higher pair within "one pair") as outs — that matches how the term is
 * actually used at the table.
 *
 * Only meaningful with a 3-card (flop) or 4-card (turn) board — there is
 * no "next card" once the board is complete at 5 cards.
 */
export function calculateOuts(holeCards: readonly Card[], board: readonly Card[]): OutsResult {
  if (holeCards.length !== 2) {
    throw new Error(`calculateOuts requires exactly 2 hole cards, got ${holeCards.length}`);
  }
  if (board.length !== 3 && board.length !== 4) {
    throw new Error(`calculateOuts requires a 3-card (flop) or 4-card (turn) board, got ${board.length}`);
  }

  const known = [...holeCards, ...board];
  const knownIds = new Set(known.map((c) => `${c.rank}${c.suit}`));
  const unseenCards = fullDeck().filter((c) => !knownIds.has(`${c.rank}${c.suit}`));

  const currentCategory = evaluateBest(known).category;

  const outs: Card[] = [];
  for (const candidate of unseenCards) {
    const nextBoard = [...board, candidate];
    const improvedCategory = evaluateBest([...holeCards, ...nextBoard]).category;
    if (improvedCategory > currentCategory) {
      outs.push(candidate);
    }
  }

  return { outs, count: outs.length };
}