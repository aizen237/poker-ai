import { Deck, type Card } from "@poker-ai/shared";
import { evaluateBest } from "@poker-ai/poker-engine";
import { expandRange, type Range, type WeightedCombo } from "./range.js";
import type { RangeEquityOptions, RangeEquityResult } from "./rangeEquity.js";

export interface MultiwayEquityOptions extends RangeEquityOptions {
  /** Bound whole-deal attempts, including rejected collisions; must be >= iterations. */
  maxSamplingAttempts?: number;
}
export interface MultiwayEquityResult extends RangeEquityResult {
  attempts: number;
  rejectedSamples: number;
}
interface MaskedCombo extends WeightedCombo { low: number; high: number }
const suits = ["s", "h", "d", "c"];
function cardId(card: Card): number {
  if (!Number.isInteger(card.rank) || card.rank < 2 || card.rank > 14 || !suits.includes(card.suit)) throw new Error("Invalid card");
  return suits.indexOf(card.suit) * 13 + card.rank - 2;
}
function masked(combo: WeightedCombo): MaskedCombo {
  let low = 0, high = 0;
  for (const card of combo.cards) {
    const id = cardId(card);
    if (id < 32) low |= 1 << id;
    else high |= 1 << (id - 32);
  }
  return { ...combo, low, high };
}
function pick(combos: readonly MaskedCombo[], total: number, rng: () => number): MaskedCombo {
  let roll = rng() * total;
  for (const combo of combos) {
    if (roll < combo.weight) return combo;
    roll -= combo.weight;
  }
  return combos[combos.length - 1]!;
}

/** Hero's showdown pot share against distinct, weighted opponent ranges.
 * Samples the PRODUCT of combo weights conditioned on all cards being disjoint.
 * Sequential removal alone biases earlier seats: accepting each step with
 * remainingMass/baseMass cancels its conditional normalization. Rejection
 * restarts the WHOLE deal, never counts as a loss, and cannot loop forever.
 * This is equal-pot showdown equity, not side-pot EV or future-action modeling. */
export function calculateEquityVsRanges(
  heroCards: readonly Card[], opponentRanges: readonly Range[], board: readonly Card[],
  options: MultiwayEquityOptions = {},
): MultiwayEquityResult {
  if (heroCards.length !== 2) throw new Error("Exactly two hero cards required");
  if (![0, 3, 4, 5].includes(board.length)) throw new Error("Board must contain 0, 3, 4, or 5 cards");
  if (opponentRanges.length < 1 || opponentRanges.length > 9) throw new Error("Requires 1 to 9 opponent ranges");
  const known = [...heroCards, ...board];
  if (new Set(known.map(cardId)).size !== known.length) throw new Error("Duplicate known cards");
  const iterations = options.iterations ?? 10_000;
  const maxAttempts = options.maxSamplingAttempts ?? Math.max(1000, iterations * 100);
  if (!Number.isSafeInteger(iterations) || iterations <= 0) throw new Error("iterations must be a positive safe integer");
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < iterations) throw new Error("maxSamplingAttempts must be an integer >= iterations");
  const random = options.rng ?? Math.random;
  const rng = () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("RNG must return a finite value in [0, 1)");
    return value;
  };
  const ranges = opponentRanges.map((range, i) => {
    const combos = expandRange(range, known).map(masked);
    const mass = combos.reduce((sum, combo) => sum + combo.weight, 0);
    if (combos.length === 0 || mass <= 0) throw new Error("Opponent " + (i + 1) + " range has no legal combos after known-card removal");
    return { combos, mass };
  });
  let completed = 0, attempts = 0, share = 0;
  attemptsLoop: while (completed < iterations && attempts < maxAttempts) {
    attempts++;
    const hands: MaskedCombo[] = [];
    let usedLow = 0, usedHigh = 0;
    for (const range of ranges) {
      const legal = hands.length === 0 ? range.combos : range.combos.filter(combo => (combo.low & usedLow) === 0 && (combo.high & usedHigh) === 0);
      const mass = hands.length === 0 ? range.mass : legal.reduce((sum, combo) => sum + combo.weight, 0);
      if (mass <= 0) continue attemptsLoop;
      // Retain the independent weighted joint distribution, regardless of seat order.
      if (mass < range.mass && rng() >= mass / range.mass) continue attemptsLoop;
      const combo = pick(legal, mass, rng);
      hands.push(combo);
      usedLow |= combo.low;
      usedHigh |= combo.high;
    }
    const deck = new Deck(rng, [...known, ...hands.flatMap(hand => hand.cards)]);
    const runout = [...board, ...deck.drawMany(5 - board.length)];
    const heroValue = evaluateBest([...heroCards, ...runout]).value;
    const values = hands.map(hand => evaluateBest([...hand.cards, ...runout]).value);
    const best = Math.max(heroValue, ...values);
    if (heroValue === best) share += 1 / (1 + values.filter(value => value === best).length);
    completed++;
  }
  if (completed !== iterations) throw new Error("Range sampling limit reached: " + completed + "/" + iterations + " valid deals in " + attempts + " attempts; ranges may be mutually incompatible or too collision-heavy");
  return { equity: share / completed, iterations: completed, attempts, rejectedSamples: attempts - completed };
}
