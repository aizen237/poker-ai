import { describe, expect, it } from "vitest";
import { parseHandType } from "./handNotation.js";
import { ALL_POSITIONS, getOpeningRange, type Position } from "./openingRanges.js";
import { rangeComboCount } from "./range.js";

describe("getOpeningRange", () => {
  it("every position has a defined range without throwing", () => {
    for (const position of ALL_POSITIONS) {
      expect(() => getOpeningRange(position)).not.toThrow();
    }
  });

  it("every hand string in every range is valid notation (catches typos)", () => {
    for (const position of ALL_POSITIONS) {
      const range = getOpeningRange(position);
      for (const handStr of range.keys()) {
        expect(() => parseHandType(handStr)).not.toThrow();
      }
    }
  });

  it("BB has an empty opening range (BB defends, it doesn't open)", () => {
    const bbRange = getOpeningRange("BB");
    expect(bbRange.size).toBe(0);
  });

  it("every non-BB range includes pocket Aces (always play the best hand everywhere)", () => {
    for (const position of ALL_POSITIONS) {
      if (position === "BB") continue;
      const range = getOpeningRange(position);
      expect(range.has("AA")).toBe(true);
    }
  });

  it("range width increases monotonically from UTG through BTN", () => {
    const utg = rangeComboCount(getOpeningRange("UTG"));
    const hj = rangeComboCount(getOpeningRange("HJ"));
    const co = rangeComboCount(getOpeningRange("CO"));
    const btn = rangeComboCount(getOpeningRange("BTN"));

    expect(hj).toBeGreaterThan(utg);
    expect(co).toBeGreaterThan(hj);
    expect(btn).toBeGreaterThan(co);
  });

  it("SB is narrower than BTN (folded to, first to act postflop against only BB)", () => {
    const sb = rangeComboCount(getOpeningRange("SB"));
    const btn = rangeComboCount(getOpeningRange("BTN"));
    expect(sb).toBeLessThan(btn);
  });

  it("UTG range is meaningfully tight (well under half of all 169 hand types)", () => {
    const utgRange = getOpeningRange("UTG");
    expect(utgRange.size).toBeLessThan(169 * 0.2);
  });

  it("BTN range is meaningfully wide (a large fraction of hand types)", () => {
    const btnRange = getOpeningRange("BTN");
    expect(btnRange.size).toBeGreaterThan(169 * 0.4);
  });
});