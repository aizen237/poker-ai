import { cardId, validateSimulationInput, type Card } from "@poker-ai/shared";
import { expandRange, type Range, type WeightedCombo } from "./range.js";

export interface ComboWeight {
  readonly cards: readonly [Card, Card];
  /** Relative inclusion weight in [0, 1], NOT a probability until normalized. */
  readonly weight: number;
}

/** One entry per unordered physical hand. Different suits may have different weights. */
export interface ComboRange {
  readonly kind: "combination";
  readonly combos: readonly ComboWeight[];
}

export type EquityRange = Range | ComboRange;

/** Validated unordered identity; card order never creates another combination. */
export function comboKey(cards: readonly Card[]): string {
  if (cards.length !== 2) throw new Error("A combination requires exactly two cards");
  validateSimulationInput(cards, 0, 1);
  const [a, b] = cards.map(cardId) as [number, number];
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** Copies/freezes input and rejects duplicates, including reversed and zero-weight entries.
 * Zero weights are omitted only AFTER validation. Insertion/card order is retained
 * so conversion from existing canonical 169-hand ranges preserves seeded samples. */
export function createComboRange(entries: readonly ComboWeight[]): ComboRange {
  const seen = new Set<string>();
  const combos: ComboWeight[] = [];
  for (const entry of entries) {
    const key = comboKey(entry.cards);
    if (seen.has(key)) throw new Error(`Duplicate combination: ${key}`);
    seen.add(key);
    if (!Number.isFinite(entry.weight) || entry.weight < 0 || entry.weight > 1) {
      throw new Error("Combination weight must be finite and between 0 and 1");
    }
    if (entry.weight === 0) continue;
    const cards: [Card, Card] = [Object.freeze({ ...entry.cards[0] }), Object.freeze({ ...entry.cards[1] })];
    combos.push(Object.freeze({ cards: Object.freeze(cards), weight: entry.weight }));
  }
  return Object.freeze({ kind: "combination", combos: Object.freeze(combos) });
}

/** Each physical combo inherits its class weight: AA .5 means six weights .5,
 * not total mass .5. No renormalization or hand-strength ordering is introduced. */
export function comboRangeFromRange(range: Range, knownCards: readonly Card[] = []): ComboRange {
  validateSimulationInput(knownCards, 0, 1);
  return createComboRange(expandRange(range, knownCards));
}

/** Conditioning on known hero/board/dead cards removes only overlapping combos.
 * No probabilities are invented when the remaining mass is zero. */
export function removeKnownCards(range: ComboRange, knownCards: readonly Card[]): ComboRange {
  validateSimulationInput(knownCards, 0, 1);
  const validated = createComboRange(range.combos);
  const blocked = new Set(knownCards.map(cardId));
  return createComboRange(validated.combos.filter(combo => !combo.cards.some(card => blocked.has(cardId(card)))));
}

export function comboRangeMass(range: ComboRange): number {
  return createComboRange(range.combos).combos.reduce((sum, combo) => sum + combo.weight, 0);
}

export type NormalizedComboRange =
  | { status: "normalized"; range: ComboRange; totalWeight: number }
  | { status: "empty"; range: ComboRange; totalWeight: 0 };

/** P(c | known) = w(c) / sum(legal weights). Empty is explicit, never uniform.
 * totalWeight reports the surviving unnormalized mass, not a model confidence. */
export function normalizeComboRange(range: ComboRange, knownCards: readonly Card[] = []): NormalizedComboRange {
  const legal = removeKnownCards(range, knownCards);
  const totalWeight = legal.combos.reduce((sum, combo) => sum + combo.weight, 0);
  if (totalWeight === 0) return { status: "empty", range: legal, totalWeight: 0 };
  return { status: "normalized", totalWeight,
    range: createComboRange(legal.combos.map(combo => ({ cards: combo.cards, weight: combo.weight / totalWeight }))) };
}

/** Returns null for an undefined distribution; a missing/blocked combo in a
 * nonempty distribution has probability zero. Card order is immaterial. */
export function comboProbability(range: ComboRange, cards: readonly Card[], knownCards: readonly Card[] = []): number | null {
  const key = comboKey(cards);
  const normalized = normalizeComboRange(range, knownCards);
  if (normalized.status === "empty") return null;
  return normalized.range.combos.find(combo => comboKey(combo.cards) === key)?.weight ?? 0;
}

/** Single adapter shared by the existing samplers; legacy expansion stays intact. */
export function expandEquityRange(range: EquityRange, knownCards: readonly Card[]): WeightedCombo[] {
  if (range instanceof Map) return expandRange(range, knownCards);
  return removeKnownCards(range, knownCards).combos.map(combo => ({
    cards: [combo.cards[0], combo.cards[1]], weight: combo.weight,
  }));
}
