import { describe, expect, it } from "vitest";
import { chenScore } from "./chenScore.js";
import { parseHandType } from "./handNotation.js";

describe("chenScore — known published reference values", () => {
  it("AA scores 20 (highest possible)", () => {
    expect(chenScore(parseHandType("AA"))).toBe(20);
  });

  it("KK scores 16", () => {
    expect(chenScore(parseHandType("KK"))).toBe(16);
  });

  it("AKs scores 12", () => {
    expect(chenScore(parseHandType("AKs"))).toBe(12);
  });

  it("AKo scores 10", () => {
    expect(chenScore(parseHandType("AKo"))).toBe(10);
  });

  it("22 scores 5 (minimum pair score)", () => {
    expect(chenScore(parseHandType("22"))).toBe(5);
  });

  it("72o scores 0 (or below) -- the classic 'worst hand' reference", () => {
    // Ace-high half-score for 7 (3.5) minus gap penalty for a 4-gap (-5) = -1.5
    expect(chenScore(parseHandType("72o"))).toBeLessThanOrEqual(0);
  });

  it("JTs scores 9 (connector + suited + straight bonus)", () => {
    expect(chenScore(parseHandType("JTs"))).toBe(9);
  });

  it("76s scores 7 (mid connector, suited, straight bonus)", () => {
    expect(chenScore(parseHandType("76s"))).toBe(7);
  });
});

describe("chenScore — internal consistency (not tied to a specific published number)", () => {
  it("pocket pairs always score higher than the equivalent non-pair of the same top rank", () => {
    // QQ should score higher than any Q-x combo
    const qq = chenScore(parseHandType("QQ"));
    const qjs = chenScore(parseHandType("QJs"));
    expect(qq).toBeGreaterThan(qjs);
  });

  it("suited always scores at least as high as the same offsuit hand", () => {
    for (const [suitedHand, offsuitHand] of [
      ["AKs", "AKo"],
      ["JTs", "JTo"],
      ["98s", "98o"],
    ] as const) {
      expect(chenScore(parseHandType(suitedHand))).toBeGreaterThan(chenScore(parseHandType(offsuitHand)));
    }
  });

  it("a smaller gap scores at least as high as a larger gap, all else equal", () => {
    const connector = chenScore(parseHandType("T9s")); // gap 0
    const oneGap = chenScore(parseHandType("T8s")); // gap 1
    const bigGap = chenScore(parseHandType("T5s")); // gap 4
    expect(connector).toBeGreaterThanOrEqual(oneGap);
    expect(oneGap).toBeGreaterThan(bigGap);
  });

  it("AA scores higher than every other hand type", () => {
    const aaScore = chenScore(parseHandType("AA"));
    for (const handStr of ["KK", "AKs", "QQ", "72o", "JTs"]) {
      expect(aaScore).toBeGreaterThan(chenScore(parseHandType(handStr)));
    }
  });
});