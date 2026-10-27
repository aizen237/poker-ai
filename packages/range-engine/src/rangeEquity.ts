import { Deck, validateSimulationInput, type Card } from "@poker-ai/shared";
import { evaluateBest } from "@poker-ai/poker-engine";
import type { WeightedCombo } from "./range.js";
import { expandEquityRange, type EquityRange } from "./comboRange.js";

export interface RangeEquityResult {
  equity: number;
  iterations: number;
}

export interface RangeEquityOptions {
  iterations?: number;
  rng?: () => number;
}

const DEFAULT_ITERATIONS = 10_000;

/** Complete-board heads-up equity: enumerate every legal weighted combo, including
 * half of ties. Opt-in so existing Monte Carlo/preflop behavior is unchanged. */
export function calculateExactRiverEquity(
  heroCards: readonly Card[], opponentRange: EquityRange, board: readonly Card[],
): RangeEquityResult {
  if (heroCards.length !== 2 || board.length !== 5) throw new Error("Exact river equity requires two hero cards and five board cards");
  validateSimulationInput([...heroCards, ...board], 5, 1);
  const combos = expandEquityRange(opponentRange, [...heroCards, ...board]);
  const mass = combos.reduce((sum, c) => sum + c.weight, 0);
  if (!(mass > 0) || !Number.isFinite(mass)) throw new Error("Opponent range has no valid positive mass");
  const hero = evaluateBest([...heroCards, ...board]).value;
  const share = combos.reduce((sum, c) => {
    const opponent = evaluateBest([...c.cards, ...board]).value;
    return sum + c.weight * (hero > opponent ? 1 : hero === opponent ? 0.5 : 0);
  }, 0);
  return { equity: share / mass, iterations: combos.length };
}

function checkedRng(random: () => number): () => number {
  return () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("RNG must return a finite value in [0, 1)");
    return value;
  };
}

/** Picks one combo from a weighted list, proportional to weight. */
function weightedSample(combos: readonly WeightedCombo[], rng: () => number): WeightedCombo {
  const totalWeight = combos.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Cannot sample from a range with zero total weight (empty or all-excluded range)");
  }
  let roll = rng() * totalWeight;
  for (const combo of combos) {
    if (roll < combo.weight) return combo;
    roll -= combo.weight;
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
  opponentRange: EquityRange,
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
  const rng = checkedRng(options.rng ?? Math.random);
  const cardsToComplete = 5 - board.length;
  const knownCards = [...heroCards, ...board];
  validateSimulationInput(knownCards, board.length, iterations);

  const opponentCombos = expandEquityRange(opponentRange, knownCards);
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
  heroRange: EquityRange,
  opponentRange: EquityRange,
  board: readonly Card[],
  options: RangeEquityOptions = {},
): RangeEquityResult {
  if (board.length > 5) {
    throw new Error(`Board cannot have more than 5 cards, got ${board.length}`);
  }

  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const rng = checkedRng(options.rng ?? Math.random);
  const cardsToComplete = 5 - board.length;

  validateSimulationInput(board, board.length, iterations);
  const heroCombosBase = expandEquityRange(heroRange, board);
  if (heroCombosBase.length === 0) {
    throw new Error("Hero range has no valid combos remaining after excluding the board");
  }

  const opponentCombos = expandEquityRange(opponentRange, board);
  if (opponentCombos.length === 0) throw new Error("Opponent range has no valid combos");
  let winShareSum = 0;
  let accepted = 0;
  const maxAttempts = Math.max(1000, iterations * 100);
  // Independent weighted draws conditioned on disjoint cards. Reject the whole
  // pair, not just opponent cards; failed draws must not count as hero losses.
  for (let attempt = 0; accepted < iterations && attempt < maxAttempts; attempt++) {
    const heroCombo = weightedSample(heroCombosBase, rng);
    const opponentCombo = weightedSample(opponentCombos, rng);
    if (heroCombo.cards.some(a => opponentCombo.cards.some(b => a.rank === b.rank && a.suit === b.suit))) continue;
    accepted++;
    const excludeThisIteration = [...board, ...heroCombo.cards, ...opponentCombo.cards];
    const deck = new Deck(rng, excludeThisIteration);
    const runoutBoard = [...board, ...deck.drawMany(cardsToComplete)];

    const heroValue = evaluateBest([...heroCombo.cards, ...runoutBoard]).value;
    const opponentValue = evaluateBest([...opponentCombo.cards, ...runoutBoard]).value;

    if (heroValue > opponentValue) winShareSum += 1;
    else if (heroValue === opponentValue) winShareSum += 0.5;
  }

  if (accepted !== iterations) throw new Error("Unable to sample enough disjoint range pairs");
  return { equity: winShareSum / accepted, iterations: accepted };
}
