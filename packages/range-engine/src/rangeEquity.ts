import { Deck, type Card } from "@poker-ai/shared";
import { evaluateBest } from "@poker-ai/poker-engine";
import { expandRange, type Range, type WeightedCombo } from "./range.js";

export interface RangeEquityResult {
  equity: number;
  iterations: number;
}

export interface RangeEquityOptions {
  iterations?: number;
  rng?: () => number;
}

const DEFAULT_ITERATIONS = 10_000;

/** Picks one combo from a weighted list, proportional to weight. */
function weightedSample(combos: readonly WeightedCombo[], rng: () => number): WeightedCombo {
  const totalWeight = combos.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Cannot sample from a range with zero total weight (empty or all-excluded range)");
  }
  let roll = rng() * totalWeight;
  for (const combo of combos) {
    roll -= combo.weight;
    if (roll <= 0) return combo;
  }
  return combos[combos.length - 1]!; // floating-point safety net
}

/**
 * Hero's fixed hand vs. an opponent's weighted range, given a (possibly
 * partial) board. Each iteration samples one combo from the opponent's
 * range (weighted, and excluding any combo overlapping hero's cards or
 * the board), then deals the remaining board and compares.
 */
export function calculateEquityVsRange(
  heroCards: readonly Card[],
  opponentRange: Range,
  board: readonly Card[],
  options: RangeEquityOptions = {},
): RangeEquityResult {
  if (heroCards.length !== 2) {
    throw new Error(`calculateEquityVsRange requires exactly 2 hero cards, got ${heroCards.length}`);
  }
  if (board.length > 5) {
    throw new Error(`Board cannot have more than 5 cards, got ${board.length}`);
  }

  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const rng = options.rng ?? Math.random;
  const cardsToComplete = 5 - board.length;
  const knownCards = [...heroCards, ...board];

  const opponentCombos = expandRange(opponentRange, knownCards);
  if (opponentCombos.length === 0) {
    throw new Error("Opponent range has no valid combos remaining after excluding known cards");
  }

  let winShareSum = 0;

  for (let i = 0; i < iterations; i++) {
    const opponentCombo = weightedSample(opponentCombos, rng);
    const excludeThisIteration = [...knownCards, ...opponentCombo.cards];
    const deck = new Deck(rng, excludeThisIteration);
    const runoutBoard = [...board, ...deck.drawMany(cardsToComplete)];

    const heroValue = evaluateBest([...heroCards, ...runoutBoard]).value;
    const opponentValue = evaluateBest([...opponentCombo.cards, ...runoutBoard]).value;

    if (heroValue > opponentValue) winShareSum += 1;
    else if (heroValue === opponentValue) winShareSum += 0.5;
    // hero loses: += 0
  }

  return { equity: winShareSum / iterations, iterations };
}

/**
 * Range-vs-range equity: both hero and opponent sample from their
 * respective ranges each iteration. Returns hero's average equity.
 */
export function calculateRangeVsRangeEquity(
  heroRange: Range,
  opponentRange: Range,
  board: readonly Card[],
  options: RangeEquityOptions = {},
): RangeEquityResult {
  if (board.length > 5) {
    throw new Error(`Board cannot have more than 5 cards, got ${board.length}`);
  }

  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const rng = options.rng ?? Math.random;
  const cardsToComplete = 5 - board.length;

  const heroCombosBase = expandRange(heroRange, board);
  if (heroCombosBase.length === 0) {
    throw new Error("Hero range has no valid combos remaining after excluding the board");
  }

  let winShareSum = 0;

  for (let i = 0; i < iterations; i++) {
    const heroCombo = weightedSample(heroCombosBase, rng);
    const opponentCombos = expandRange(opponentRange, [...board, ...heroCombo.cards]);
    if (opponentCombos.length === 0) continue; // no valid opponent combo this draw; skip iteration

    const opponentCombo = weightedSample(opponentCombos, rng);
    const excludeThisIteration = [...board, ...heroCombo.cards, ...opponentCombo.cards];
    const deck = new Deck(rng, excludeThisIteration);
    const runoutBoard = [...board, ...deck.drawMany(cardsToComplete)];

    const heroValue = evaluateBest([...heroCombo.cards, ...runoutBoard]).value;
    const opponentValue = evaluateBest([...opponentCombo.cards, ...runoutBoard]).value;

    if (heroValue > opponentValue) winShareSum += 1;
    else if (heroValue === opponentValue) winShareSum += 0.5;
  }

  return { equity: winShareSum / iterations, iterations };
}