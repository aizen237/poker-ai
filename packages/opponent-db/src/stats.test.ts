import { describe, expect, it } from "vitest";
import { computeOpponentStats } from "./stats.js";
import { getConfidenceLevel, CONFIDENCE_THRESHOLDS } from "./types.js";
import type { PlayerHandActions } from "./types.js";

function baseHand(overrides: Partial<PlayerHandActions> = {}): PlayerHandActions {
  return {
    playerName: "Villain",
    vpip: false,
    pfr: false,
    threeBet: false,
    facedThreeBet: false,
    foldedToThreeBet: false,
    cBet: false,
    hadCBetOpportunity: false,
    facedCBet: false,
    foldedToCBet: false,
    wentToShowdown: false,
    wonAtShowdown: false,
    betsAndRaises: 0,
    calls: 0,
    ...overrides,
  };
}

describe("computeOpponentStats — basic rate stats", () => {
  it("computes VPIP correctly: 3 of 10 hands voluntarily played", () => {
    const hands = [
      ...Array(3).fill(baseHand({ vpip: true })),
      ...Array(7).fill(baseHand({ vpip: false })),
    ];
    const stats = computeOpponentStats("Villain", hands);
    expect(stats.vpipPercent).toBeCloseTo(30, 5);
  });

  it("computes PFR correctly: 2 of 10 hands raised preflop", () => {
    const hands = [
      ...Array(2).fill(baseHand({ pfr: true })),
      ...Array(8).fill(baseHand({ pfr: false })),
    ];
    const stats = computeOpponentStats("Villain", hands);
    expect(stats.pfrPercent).toBeCloseTo(20, 5);
  });

  it("with zero hands, rate stats default to 0, not NaN", () => {
    const stats = computeOpponentStats("Villain", []);
    expect(stats.vpipPercent).toBe(0);
    expect(stats.pfrPercent).toBe(0);
    expect(Number.isNaN(stats.vpipPercent)).toBe(false);
  });
});

describe("computeOpponentStats — conditional stats correctly default to null", () => {
  it("foldToThreeBetPercent is null when the player never faced a 3-bet", () => {
    const hands = Array(20).fill(baseHand({ facedThreeBet: false }));
    const stats = computeOpponentStats("Villain", hands);
    expect(stats.foldToThreeBetPercent).toBeNull();
  });

  it("foldToThreeBetPercent computes correctly when the opportunity did arise", () => {
    const hands = [
      baseHand({ facedThreeBet: true, foldedToThreeBet: true }),
      baseHand({ facedThreeBet: true, foldedToThreeBet: true }),
      baseHand({ facedThreeBet: true, foldedToThreeBet: false }),
      baseHand({ facedThreeBet: false }), // irrelevant hand, shouldn't affect the ratio
    ];
    const stats = computeOpponentStats("Villain", hands);
    // 2 of 3 times faced a 3-bet, folded
    expect(stats.foldToThreeBetPercent).toBeCloseTo((2 / 3) * 100, 5);
  });

  it("cBetPercent is null when the player never had a c-bet opportunity", () => {
    const hands = Array(15).fill(baseHand({ hadCBetOpportunity: false }));
    const stats = computeOpponentStats("Villain", hands);
    expect(stats.cBetPercent).toBeNull();
  });

  it("wsdPercent is null when the player never reached showdown", () => {
    const hands = Array(15).fill(baseHand({ wentToShowdown: false }));
    const stats = computeOpponentStats("Villain", hands);
    expect(stats.wsdPercent).toBeNull();
  });

  it("wsdPercent computes correctly when showdowns did occur", () => {
    const hands = [
      baseHand({ wentToShowdown: true, wonAtShowdown: true }),
      baseHand({ wentToShowdown: true, wonAtShowdown: false }),
      baseHand({ wentToShowdown: false }),
    ];
    const stats = computeOpponentStats("Villain", hands);
    expect(stats.wsdPercent).toBeCloseTo(50, 5);
  });
});

describe("computeOpponentStats — aggression factor", () => {
  it("computes bets+raises / calls correctly", () => {
    const hands = [
      baseHand({ betsAndRaises: 3, calls: 1 }),
      baseHand({ betsAndRaises: 2, calls: 1 }),
    ];
    const stats = computeOpponentStats("Villain", hands);
    // total betsAndRaises = 5, total calls = 2 -> 2.5
    expect(stats.aggressionFactor).toBeCloseTo(2.5, 5);
  });

  it("is null when there are zero calls (avoids divide-by-zero)", () => {
    const hands = [baseHand({ betsAndRaises: 5, calls: 0 })];
    const stats = computeOpponentStats("Villain", hands);
    expect(stats.aggressionFactor).toBeNull();
  });
});

describe("getConfidenceLevel", () => {
  it("matches the spec's example thresholds: <100 = low, 100-999 = moderate, 1000+ = strong", () => {
    expect(getConfidenceLevel(10)).toBe("low");
    expect(getConfidenceLevel(99)).toBe("low");
    expect(getConfidenceLevel(100)).toBe("moderate");
    expect(getConfidenceLevel(999)).toBe("moderate");
    expect(getConfidenceLevel(1000)).toBe("strong");
    expect(getConfidenceLevel(5000)).toBe("strong");
  });

  it("computeOpponentStats reports the correct confidence level for its sample size", () => {
    const fewHands = Array(50).fill(baseHand());
    const manyHands = Array(1500).fill(baseHand());
    expect(computeOpponentStats("Villain", fewHands).confidence).toBe("low");
    expect(computeOpponentStats("Villain", manyHands).confidence).toBe("strong");
  });

  it("exposes the exact threshold values used", () => {
    expect(CONFIDENCE_THRESHOLDS.moderate).toBe(100);
    expect(CONFIDENCE_THRESHOLDS.strong).toBe(1000);
  });
});