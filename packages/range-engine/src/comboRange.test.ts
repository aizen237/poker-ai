import { fullDeck, parseCards, type Card } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { allHandTypes, formatHandType } from "./handNotation.js";
import { expandRange, rangeFromList } from "./range.js";
import { comboKey, comboProbability, comboRangeFromRange, comboRangeMass, createComboRange,
  normalizeComboRange, removeKnownCards, type ComboWeight } from "./comboRange.js";

const entry = (cards: string, weight = 1): ComboWeight => ({ cards: parseCards(cards) as [Card, Card], weight });

describe("combination range foundation", () => {
  it("matches all 1326 unordered deck pairs independently of hand-class expansion", () => {
    const deck = fullDeck(), expected: string[] = [];
    for (let i = 0; i < 52; i++) for (let j = i + 1; j < 52; j++) {
      expected.push([`${deck[i]!.rank}${deck[i]!.suit}`, `${deck[j]!.rank}${deck[j]!.suit}`].sort().join("/"));
    }
    const range = comboRangeFromRange(rangeFromList(allHandTypes().map(formatHandType)));
    const actual = range.combos.map(c => c.cards.map(card => `${card.rank}${card.suit}`).sort().join("/"));
    expect(actual.sort()).toEqual(expected.sort());
    expect(comboRangeMass(range)).toBe(1326);
    expect(range.combos.filter(c => c.cards[0].rank === c.cards[1].rank)).toHaveLength(78);
    expect(range.combos.filter(c => c.cards[0].suit === c.cards[1].suit)).toHaveLength(312);
    expect(normalizeComboRange(range).range.combos.every(c => c.weight === 1 / 1326)).toBe(true);
  });

  it("preserves class inclusion weights and iteration order, not equal class probabilities", () => {
    const legacy = new Map([["AA", 0.5], ["AKs", 0.25], ["AKo", 1], ["22", 0]]);
    const range = comboRangeFromRange(legacy);
    expect(range.combos).toEqual(expandRange(legacy));
    expect(comboRangeMass(range)).toBe(6 * 0.5 + 4 * 0.25 + 12);
    expect(comboProbability(range, parseCards("Ah As"))).toBe(0.5 / 16);
    expect(comboProbability(range, parseCards("As Ks"))).toBe(0.25 / 16);
    expect(comboProbability(range, parseCards("As Kh"))).toBe(1 / 16);
    expect(legacy.get("22")).toBe(0);
  });

  it("removes physical hero and board blockers without removing whole classes", () => {
    const legacy = rangeFromList(["AA", "AKs", "AKo"]);
    const known = parseCards("As Kd 2c 7h 9s");
    const legal = removeKnownCards(comboRangeFromRange(legacy), known);
    // AA: C(3,2)=3; AK: 3*3=9, two suited (hearts/clubs), seven offsuit.
    expect(legal.combos).toHaveLength(12);
    expect(legal.combos.filter(c => c.cards[0].rank === c.cards[1].rank)).toHaveLength(3);
    expect(legal.combos.filter(c => c.cards[0].suit === c.cards[1].suit)).toHaveLength(2);
    expect(legal).toEqual(comboRangeFromRange(legacy, known));
    const all = comboRangeFromRange(rangeFromList(allHandTypes().map(formatHandType)), known);
    expect(all.combos).toHaveLength(47 * 46 / 2);
    expect(removeKnownCards(legal, known)).toEqual(legal);
  });

  it("normalizes unequal suit weights after removal and distinguishes zero from undefined", () => {
    const range = createComboRange([entry("As Ks", 0.8), entry("Ah Kh", 0.2), entry("Ad Kd", 0.5), entry("Ac Kc", 0)]);
    const known = parseCards("Ad 2c 7s");
    const normalized = normalizeComboRange(range, known);
    expect(normalized.status).toBe("normalized");
    expect(normalized.totalWeight).toBe(1);
    expect(comboProbability(range, parseCards("Ks As"), known)).toBe(0.8);
    expect(comboProbability(range, parseCards("Ad Kd"), known)).toBe(0);
    expect(comboProbability(range, parseCards("Ac Kc"), known)).toBe(0);
    expect(comboRangeMass(normalized.range)).toBeCloseTo(1, 14);
    expect(normalizeComboRange(normalized.range).range).toEqual(normalized.range);
    expect(comboRangeMass(range)).toBe(1.5);
    for (const empty of [createComboRange([]), createComboRange([entry("As Ks", 0)]), removeKnownCards(range, parseCards("As Ah Ad"))]) {
      expect(normalizeComboRange(empty)).toEqual({ status: "empty", range: createComboRange([]), totalWeight: 0 });
      expect(comboProbability(empty, parseCards("2h 3h"))).toBeNull();
    }
  });

  it("normalizes tiny positive mass without treating it as empty and is scale invariant", () => {
    const tiny = createComboRange([entry("As Ks", Number.MIN_VALUE), entry("Ah Kh", Number.MIN_VALUE)]);
    expect(normalizeComboRange(tiny).range.combos.map(c => c.weight)).toEqual([0.5, 0.5]);
    const a = createComboRange([entry("As Ks", 0.6), entry("Ah Kh", 0.2)]);
    const b = createComboRange([entry("As Ks", 0.3), entry("Ah Kh", 0.1)]);
    expect(normalizeComboRange(a).range).toEqual(normalizeComboRange(b).range);
  });

  it("rejects duplicate physical cards/combinations, even reversed or zero weight", () => {
    expect(() => createComboRange([entry("As As")])).toThrow("Duplicate");
    expect(() => createComboRange([entry("As Ks"), entry("Ks As", 0)])).toThrow("Duplicate combination");
    expect(() => createComboRange([entry("As")])).toThrow("exactly two");
    expect(() => createComboRange([entry("As Ks Qs")])).toThrow("exactly two");
    expect(comboKey(parseCards("As Ks"))).toBe(comboKey(parseCards("Ks As")));
    const range = createComboRange([entry("As Ks")]);
    expect(() => removeKnownCards(range, parseCards("2c 2c"))).toThrow("Duplicate");
    expect(() => comboRangeFromRange(rangeFromList(["AA"]), parseCards("2c 2c"))).toThrow("Duplicate");
    expect(() => comboRangeFromRange(new Map([["AKs", 1], ["kas", 1]]))).toThrow("Duplicate combination");
  });

  it.each([NaN, Infinity, -Infinity, -0.1, 1.1])("rejects weight %s", weight => {
    expect(() => createComboRange([entry("As Ks", weight)])).toThrow("weight");
    expect(() => comboRangeFromRange(new Map([["AA", weight]]))).toThrow("weight");
  });

  it("validates even blocked/zero-weight entries and structurally supplied ranges", () => {
    const malformed = { cards: [{ rank: 15, suit: "s" }, { rank: 13, suit: "x" }], weight: 0 } as unknown as ComboWeight;
    expect(() => createComboRange([malformed])).toThrow("Invalid card");
    expect(() => normalizeComboRange({ kind: "combination", combos: [entry("As Ks", NaN)] }, parseCards("As"))).toThrow("weight");
    expect(() => removeKnownCards(createComboRange([]), malformed.cards)).toThrow("Invalid card");
  });

  it("owns immutable card/weight snapshots without freezing caller inputs", () => {
    const source = { cards: parseCards("As Ks") as [Card, Card], weight: 0.5 };
    const range = createComboRange([source]);
    source.weight = 1;
    source.cards[0] = parseCards("Ah")[0]!;
    expect(range.combos[0]).toEqual(entry("As Ks", 0.5));
    expect(Object.isFrozen(range)).toBe(true);
    expect(Object.isFrozen(range.combos)).toBe(true);
    expect(Object.isFrozen(range.combos[0]!.cards[0])).toBe(true);
  });
});
