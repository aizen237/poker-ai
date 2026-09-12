import { parseCards } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import {
  emptyRange,
  expandRange,
  getHandWeight,
  rangeComboCount,
  rangeFromList,
  rangePercentile,
  setHandWeight,
} from "./range.js";

describe("setHandWeight / getHandWeight", () => {
  it("sets and retrieves a hand's weight", () => {
    let range = emptyRange();
    range = setHandWeight(range, "AKs", 1);
    expect(getHandWeight(range, "AKs")).toBe(1);
  });

  it("supports fractional (mixed strategy) weights", () => {
    let range = emptyRange();
    range = setHandWeight(range, "JJ", 0.5);
    expect(getHandWeight(range, "JJ")).toBe(0.5);
  });

  it("removes a hand when weight is set to 0", () => {
    let range = emptyRange();
    range = setHandWeight(range, "AKs", 1);
    range = setHandWeight(range, "AKs", 0);
    expect(getHandWeight(range, "AKs")).toBe(0);
    expect(range.has("AKs")).toBe(false);
  });

  it("throws on an out-of-bounds weight", () => {
    expect(() => setHandWeight(emptyRange(), "AKs", 1.5)).toThrow();
    expect(() => setHandWeight(emptyRange(), "AKs", -0.1)).toThrow();
  });

  it("does not mutate the original range (returns a new one)", () => {
    const original = emptyRange();
    const updated = setHandWeight(original, "AKs", 1);
    expect(original.size).toBe(0);
    expect(updated.size).toBe(1);
  });
});

describe("rangeFromList / rangeComboCount", () => {
  it("a simple two-hand range has the exact expected weighted combo count", () => {
    // AA = 6 combos, AKs = 4 combos -> 10 total
    const range = rangeFromList(["AA", "AKs"]);
    expect(rangeComboCount(range)).toBe(10);
  });

  it("a fractional weight scales the combo count proportionally", () => {
    let range = rangeFromList(["JJ"]); // 6 combos at weight 1
    range = setHandWeight(range, "JJ", 0.5);
    expect(rangeComboCount(range)).toBe(3);
  });
});

describe("expandRange", () => {
  it("expands a range into actual card combos with correct weights", () => {
    const range = rangeFromList(["AA"]);
    const expanded = expandRange(range);
    expect(expanded.length).toBe(6);
    for (const combo of expanded) {
      expect(combo.weight).toBe(1);
      expect(combo.cards[0].rank).toBe(14);
      expect(combo.cards[1].rank).toBe(14);
    }
  });

  it("excludes combos overlapping known cards (hero's hand or the board)", () => {
    const range = rangeFromList(["AA"]);
    // Hero holds one of the 4 Aces -- 3 of the 6 AA combos use that
    // specific ace and must be excluded; 3 combos remain (using the
    // other 3 aces pairwise).
    const heroCards = parseCards("As Kd");
    const expanded = expandRange(range, heroCards);
    expect(expanded.length).toBe(3);
  });
});

describe("rangePercentile", () => {
  it("reports the fraction of all 169 hand types included", () => {
    const range = rangeFromList(["AA", "KK", "AKs"]);
    // 3 of 169 hand types included, regardless of combo weighting
    expect(rangePercentile(range)).toBeCloseTo((3 / 169) * 100, 5);
  });
});