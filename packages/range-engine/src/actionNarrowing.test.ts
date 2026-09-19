import { describe, expect, it } from "vitest";
import { estimateOpponentRange, narrowExcludingTop, narrowForCall, narrowForThreeBet } from "./actionNarrowing.js";
import { getOpeningRange } from "./openingRanges.js";
import { rangeComboCount, rangeFromList } from "./range.js";

describe("narrowForThreeBet", () => {
  it("the narrowed range is always a genuine subset of the original", () => {
    const original = getOpeningRange("BTN");
    const narrowed = narrowForThreeBet(original);
    for (const hand of narrowed.keys()) {
      expect(original.has(hand)).toBe(true);
    }
  });

  it("is meaningfully narrower than the original range", () => {
    const original = getOpeningRange("BTN");
    const narrowed = narrowForThreeBet(original);
    expect(narrowed.size).toBeLessThan(original.size);
  });

  it("AA always survives a 3-bet narrowing (it's always in the top slice)", () => {
    const original = getOpeningRange("BTN");
    const narrowed = narrowForThreeBet(original);
    expect(narrowed.has("AA")).toBe(true);
  });

  it("the weakest hands in a wide range do not survive a tight 3-bet narrowing", () => {
    const original = getOpeningRange("BTN"); // wide range, includes hands like 54s
    const narrowed = narrowForThreeBet(original, { topFraction: 0.1 }); // very tight
    expect(narrowed.has("54s")).toBe(false);
  });

  it("throws on an out-of-bounds topFraction", () => {
    expect(() => narrowForThreeBet(getOpeningRange("BTN"), { topFraction: 0 })).toThrow();
    expect(() => narrowForThreeBet(getOpeningRange("BTN"), { topFraction: 1.5 })).toThrow();
  });
});

describe("narrowForCall", () => {
  it("the narrowed range is always a genuine subset of the original", () => {
    const original = getOpeningRange("CO");
    const narrowed = narrowForCall(original);
    for (const hand of narrowed.keys()) {
      expect(original.has(hand)).toBe(true);
    }
  });

  it("excludes the very strongest hand (AA) -- it would 3-bet, not flat", () => {
    const original = getOpeningRange("CO");
    const narrowed = narrowForCall(original);
    expect(narrowed.has("AA")).toBe(false);
  });

  it("throws on an invalid band", () => {
    expect(() => narrowForCall(getOpeningRange("CO"), { band: [0.8, 0.5] })).toThrow(); // reversed
    expect(() => narrowForCall(getOpeningRange("CO"), { band: [-0.1, 0.5] })).toThrow(); // out of bounds
  });
});

describe("narrowExcludingTop", () => {
  it("removes exactly the strongest hands and keeps the rest", () => {
    const original = getOpeningRange("UTG");
    const narrowed = narrowExcludingTop(original, 0.2);
    expect(narrowed.has("AA")).toBe(false); // in the excluded top 20%
    expect(narrowed.size).toBeLessThan(original.size);
    expect(narrowed.size).toBeGreaterThan(0);
  });

  it("excluding 0% returns the range unchanged in size", () => {
    const original = getOpeningRange("UTG");
    const narrowed = narrowExcludingTop(original, 0);
    expect(narrowed.size).toBe(original.size);
  });

  it("throws on an out-of-bounds fraction", () => {
    expect(() => narrowExcludingTop(getOpeningRange("UTG"), 1)).toThrow();
    expect(() => narrowExcludingTop(getOpeningRange("UTG"), -0.1)).toThrow();
  });
});

describe("combo weights carry through narrowing correctly", () => {
  it("a narrowed range's combo count is less than or equal to the original's", () => {
    const original = getOpeningRange("BTN");
    const narrowed = narrowForThreeBet(original);
    expect(rangeComboCount(narrowed)).toBeLessThanOrEqual(rangeComboCount(original));
  });

  it("kept hands retain their original weight (no weight distortion during narrowing)", () => {
    const original = getOpeningRange("BTN");
    const narrowed = narrowForThreeBet(original);
    for (const [hand, weight] of narrowed) {
      expect(weight).toBe(original.get(hand));
    }
  });
});


describe("estimateOpponentRange", () => {
  it("returns the baseline unchanged when there are no actions", () => {
    const baseline = rangeFromList(["AA", "KK", "QQ", "AKs"]);
    const result = estimateOpponentRange([], baseline);
    expect(result).toEqual(baseline);
  });

  it("narrows to the top of the baseline on a raise", () => {
    const baseline = rangeFromList(["AA", "KK", "QQ", "AKs"]);
    const result = estimateOpponentRange(["raise"], baseline);
    expect([...result.keys()]).toEqual(["AA"]);
  });

  it("narrows progressively across multiple actions", () => {
    const baseline = getOpeningRange("BTN");
    const afterRaise = estimateOpponentRange(["raise"], baseline);
    const afterRaiseThenCall = estimateOpponentRange(["raise", "call"], baseline);
    expect(rangeComboCount(afterRaiseThenCall)).toBeLessThan(rangeComboCount(afterRaise));
  });

  it("treats fold as a no-op", () => {
    const baseline = rangeFromList(["AA", "KK", "QQ"]);
    const result = estimateOpponentRange(["fold"], baseline);
    expect(result).toEqual(baseline);
  });

  it("uses a documented BTN-opening-range default when no baseline is given", () => {
    const result = estimateOpponentRange([]);
    expect(result).toEqual(getOpeningRange("BTN"));
  });
});