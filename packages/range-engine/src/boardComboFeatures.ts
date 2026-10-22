import { cardId, fullDeck, validateSimulationInput, type Card, type Rank, type Suit } from "@poker-ai/shared";
import { combinations, detectFlushDraw, detectStraightDraw, evaluate5, evaluateBest } from "@poker-ai/poker-engine";
import { comboKey, removeKnownCards, type ComboRange } from "./comboRange.js";

/** Copy before freezing: callers keep ownership of their input. JSON-like data only. */
export function immutableCopy<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(v => immutableCopy(v))) as T;
  if (value !== null && typeof value === "object") {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, immutableCopy(v)]))) as T;
  }
  return value;
}

/** Physical descriptions, not strength percentiles, clean outs, or action frequencies. */
export function describeBoardCombo(cards: readonly [Card, Card], board: readonly Card[], dead: readonly Card[] = []) {
  comboKey(cards);
  if (![3, 4, 5].includes(board.length)) throw new Error("Postflop board requires 3, 4, or 5 cards");
  validateSimulationInput([...cards, ...board, ...dead], board.length, 1);
  const all = [...cards, ...board];
  const made = evaluateBest(all);
  const holeIds = new Set(cards.map(cardId));
  const uses = combinations(all, 5).filter(c => evaluate5(c).value === made.value)
    .map(c => c.filter(v => holeIds.has(cardId(v))).length);
  const suits: Suit[] = ["s", "h", "d", "c"];
  const rankCounts = [...new Set(board.map(c => c.rank))].sort((a, b) => b - a)
    .map(rank => ({ rank, count: board.filter(c => c.rank === rank).length }));
  const suitCounts = suits.map(suit => ({ suit, count: board.filter(c => c.suit === suit).length }));
  const flush = detectFlushDraw(cards, board);
  const straight = detectStraightDraw(cards, board);
  const boardStraight = detectStraightDraw([], board);
  const future = board.length < 5;
  const known = new Set([...all, ...dead].map(cardId));
  const remaining = fullDeck().filter(c => !known.has(cardId(c)));
  const flushCards = future && flush.hasFlushDraw ? remaining.filter(c => c.suit === flush.suit) : [];
  const straightRanks = future ? straight.completingRanks : [];
  const straightCards = remaining.filter(c => straightRanks.includes(c.rank));
  // Explicit windows describe runner-runner rank requirements only. They do not
  // estimate runout probabilities, action likelihoods or winning outs.
  const windows: Rank[][] = [[14, 2, 3, 4, 5], ...Array.from({ length: 9 }, (_, i) =>
    Array.from({ length: 5 }, (_, j) => i + j + 2) as Rank[])];
  const have = new Set(all.map(c => c.rank));
  const backdoorPairs = board.length === 3 && straight.kind === "none" &&
    !windows.some(w => w.every(r => have.has(r)))
    ? windows.map(w => w.filter(r => !have.has(r))).filter(m => m.length === 2 &&
      m.every(r => remaining.some(c => c.rank === r))) : [];
  return immutableCopy({
    comboKey: comboKey(cards),
    made: { category: made.category, value: made.value, tiebreakers: made.tiebreakers,
      minHoleCardsUsed: Math.min(...uses), maxHoleCardsUsed: Math.max(...uses),
      playsBoard: board.length === 5 && evaluate5(board).value === made.value },
    board: { rankCounts, suitCounts },
    interaction: {
      pocketPair: cards[0].rank === cards[1].rank,
      overpair: cards[0].rank === cards[1].rank && cards[0].rank > Math.max(...board.map(c => c.rank)),
      matchedBoardRanks: [...new Set(cards.filter(c => board.some(b => b.rank === c.rank)).map(c => c.rank))],
      overcards: cards.filter(c => c.rank > Math.max(...board.map(b => b.rank))).length,
    },
    // Held cards are exact removal blockers. No "nut blocker => bluff" claim.
    blockers: suits.map(suit => ({ suit, boardCount: board.filter(c => c.suit === suit).length,
      heldRanks: cards.filter(c => c.suit === suit).map(c => c.rank).sort((a, b) => b - a),
      highestRankNotOnBoard: Math.max(...fullDeck().filter(c => c.suit === suit &&
        !board.some(b => cardId(b) === cardId(c))).map(c => c.rank)) })),
    draws: {
      flush: { suit: future && flush.hasFlushDraw ? flush.suit : null, completionCards: flushCards,
        holeCardsOfSuit: future && flush.hasFlushDraw ? cards.filter(c => c.suit === flush.suit).length : 0 },
      // Rank cardinality is precise even for double gutshots; don't reuse the
      // legacy detector's broad "open_ended" name for every two-rank draw.
      straight: { completingRanks: straightRanks, completionCards: straightCards,
        boardOnlyCompletingRanks: future ? boardStraight.completingRanks : [] },
      completionUnion: remaining.filter(c => flushCards.some(f => cardId(f) === cardId(c)) || straightRanks.includes(c.rank)),
      backdoorFlushSuits: board.length === 3 ? suits.filter(s => all.filter(c => c.suit === s).length === 3 &&
        remaining.filter(c => c.suit === s).length >= 2) : [],
      backdoorStraightRankPairs: [...new Map(backdoorPairs.map(p => [p.slice().sort((a, b) => a - b).join(":"), p])).values()],
    },
  });
}

export type BoardComboFeatures = ReturnType<typeof describeBoardCombo>;

/** Uses Phase 5A blocker validation before evaluating legal alternatives. */
export function describeBoardRange(range: ComboRange, hero: readonly [Card, Card], board: readonly Card[]) {
  comboKey(hero);
  if (![3, 4, 5].includes(board.length)) throw new Error("Postflop board requires 3, 4, or 5 cards");
  return Object.freeze(removeKnownCards(range, [...hero, ...board]).combos
    .map(c => describeBoardCombo(c.cards, board, hero)));
}
