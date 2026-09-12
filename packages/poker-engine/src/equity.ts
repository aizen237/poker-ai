import { Deck, type Card } from "@poker-ai/shared";
import { evaluateBest } from "./evaluator.js";

export interface EquityResult {
  /** Fraction of the pot hero wins on average, across all simulations (0-1). */
  equity: number;
  /** Number of simulations where hero won outright (no tie). */
  wins: number;
  /** Number of simulations where hero tied for the best hand. */
  ties: number;
  /** Number of simulations where hero lost outright. */
  losses: number;
  iterations: number;
}

export interface EquityOptions {
  iterations?: number;
  rng?: () => number;
}

const DEFAULT_ITERATIONS = 10_000;

/**
 * Monte Carlo equity: hero's cards vs `numOpponents` random hands, given
 * a (possibly partial) board. Correctly handles multi-way ties by
 * splitting win share among however many players share the best hand,
 * rather than assuming a tie is always a 50/50 split.
 */
export function calculateEquity(
  heroCards: readonly Card[],
  board: readonly Card[],
  numOpponents: number,
  options: EquityOptions = {},
): EquityResult {
  if (heroCards.length !== 2) {
    throw new Error(`calculateEquity requires exactly 2 hero cards, got ${heroCards.length}`);
  }
  if (board.length > 5) {
    throw new Error(`Board cannot have more than 5 cards, got ${board.length}`);
  }
  if (numOpponents < 1) {
    throw new Error(`calculateEquity requires at least 1 opponent, got ${numOpponents}`);
  }

  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const rng = options.rng ?? Math.random;
  const cardsToComplete = 5 - board.length;

  let winShareSum = 0;
  let wins = 0;
  let ties = 0;
  let losses = 0;

  const knownCards = [...heroCards, ...board];

  for (let i = 0; i < iterations; i++) {
    const deck = new Deck(rng, knownCards);

    const opponentHoleCards: Card[][] = [];
    for (let o = 0; o < numOpponents; o++) {
      opponentHoleCards.push(deck.drawMany(2));
    }

    const runoutBoard = [...board, ...deck.drawMany(cardsToComplete)];

    const heroValue = evaluateBest([...heroCards, ...runoutBoard]).value;
    const opponentValues = opponentHoleCards.map(
      (hole) => evaluateBest([...hole, ...runoutBoard]).value,
    );

    const maxValue = Math.max(heroValue, ...opponentValues);

    if (heroValue < maxValue) {
      losses++;
    } else {
      const winnersCount = 1 + opponentValues.filter((v) => v === maxValue).length;
      winShareSum += 1 / winnersCount;
      if (winnersCount === 1) {
        wins++;
      } else {
        ties++;
      }
    }
  }

  return {
    equity: winShareSum / iterations,
    wins,
    ties,
    losses,
    iterations,
  };
}