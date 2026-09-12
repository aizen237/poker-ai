import { describe, expect, it } from "vitest";
import {
  calculateBetEV,
  calculateCallEV,
  calculateFoldEV,
  calculatePotOdds,
  calculateSPR,
} from "./ev.js";

describe("calculatePotOdds", () => {
  it("matches the classic textbook example: pot 20, call 5 = 20%", () => {
    const result = calculatePotOdds(20, 5);
    expect(result.breakevenEquityPercent).toBeCloseTo(20, 5);
  });

  it("a bigger relative bet requires higher equity to call", () => {
    const smallBet = calculatePotOdds(20, 5);
    const bigBet = calculatePotOdds(20, 20);
    expect(bigBet.breakevenEquity).toBeGreaterThan(smallBet.breakevenEquity);
  });

  it("throws on a non-positive call amount", () => {
    expect(() => calculatePotOdds(20, 0)).toThrow();
    expect(() => calculatePotOdds(20, -5)).toThrow();
  });

  it("throws on a negative pot", () => {
    expect(() => calculatePotOdds(-10, 5)).toThrow();
  });
});

describe("calculateCallEV", () => {
  it("is positive when equity exceeds pot-odds breakeven", () => {
    // pot 20, call 5 -> breakeven ~20%. Equity 40% should be clearly +EV.
    const result = calculateCallEV(0.4, 20, 5);
    expect(result.ev).toBeGreaterThan(0);
  });

  it("is negative when equity is below pot-odds breakeven", () => {
    const result = calculateCallEV(0.05, 20, 5);
    expect(result.ev).toBeLessThan(0);
  });

  it("cross-check: equity exactly at pot-odds breakeven gives ~0 EV", () => {
    const pot = 37;
    const call = 13;
    const { breakevenEquity } = calculatePotOdds(pot, call);
    const { ev } = calculateCallEV(breakevenEquity, pot, call);
    expect(ev).toBeCloseTo(0, 6);
  });

  it("throws on equity outside 0-1", () => {
    expect(() => calculateCallEV(-0.1, 20, 5)).toThrow();
    expect(() => calculateCallEV(1.1, 20, 5)).toThrow();
  });

  it("throws on a non-positive call amount", () => {
    expect(() => calculateCallEV(0.5, 20, 0)).toThrow();
  });
});

describe("calculateFoldEV", () => {
  it("is always exactly 0", () => {
    expect(calculateFoldEV().ev).toBe(0);
  });
});

describe("calculateBetEV", () => {
  it("equals the current pot when fold equity is 100%", () => {
    const result = calculateBetEV(0.3, 1.0, 20, 10);
    expect(result.ev).toBeCloseTo(20, 6);
  });

  it("with 0% fold equity, reduces to a call-style EV calculation from the bettor's side", () => {
    const result = calculateBetEV(0.6, 0, 20, 10);
    // opponent always calls: hero risks 10 to win (pot 20 + opponent's call 10) = 30
    // EV = 0.6 * 30 - 0.4 * 10 = 18 - 4 = 14
    expect(result.ev).toBeCloseTo(14, 6);
  });

  it("higher fold equity increases bet EV when equity-if-called is mediocre", () => {
    const lowFoldEquity = calculateBetEV(0.3, 0.1, 20, 10);
    const highFoldEquity = calculateBetEV(0.3, 0.7, 20, 10);
    expect(highFoldEquity.ev).toBeGreaterThan(lowFoldEquity.ev);
  });

  it("throws on equityIfCalled or foldEquity outside 0-1", () => {
    expect(() => calculateBetEV(-0.1, 0.5, 20, 10)).toThrow();
    expect(() => calculateBetEV(0.5, 1.5, 20, 10)).toThrow();
  });
});

describe("calculateSPR", () => {
  it("computes stack-to-pot ratio correctly", () => {
    expect(calculateSPR(100, 20)).toBeCloseTo(5, 6);
  });

  it("a low SPR (~1) indicates near pot-committed", () => {
    expect(calculateSPR(15, 14)).toBeLessThan(1.1);
  });

  it("throws when pot is non-positive", () => {
    expect(() => calculateSPR(100, 0)).toThrow();
    expect(() => calculateSPR(100, -5)).toThrow();
  });
});