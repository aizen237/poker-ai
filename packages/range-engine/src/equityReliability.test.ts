import { describe, expect, it } from "vitest";
import { parseCards, mulberry32 } from "@poker-ai/shared";
import { calculateEquity } from "@poker-ai/poker-engine";
import { calculateEquityVsRange, calculateRangeVsRangeEquity } from "./rangeEquity.js";
import { rangeFromList } from "./range.js";

describe("equity reliability input boundary", () => {
  it.each([0, -1, 0.5, Infinity, NaN])("rejects invalid iterations %s in all legacy simulations", iterations => {
    expect(() => calculateEquity(parseCards("As Kh"), [], 1, { iterations })).toThrow();
    expect(() => calculateEquityVsRange(parseCards("As Kh"), rangeFromList(["QQ"]), [], { iterations })).toThrow();
    expect(() => calculateRangeVsRangeEquity(rangeFromList(["AA"]), rangeFromList(["KK"]), [], { iterations })).toThrow();
  });
  it("rejects duplicated visible cards instead of silently removing them from the deck", () => {
    expect(() => calculateEquity(parseCards("As As"), [], 1, { iterations: 1 })).toThrow("Duplicate");
    expect(() => calculateEquityVsRange(parseCards("As Kh"), rangeFromList(["QQ"]), parseCards("As 2h 3d"), { iterations: 1 })).toThrow("Duplicate");
  });
  it("does not score colliding hero combinations as losses", () => {
    // With two aces on board, hero AA leaves opponent AA impossible; only
    // hero KK can coexist with opponent AA, and loses on this river.
    const result = calculateRangeVsRangeEquity(rangeFromList(["AA", "KK"]), rangeFromList(["AA"]), parseCards("As Ah 2c 3d 4s"), { iterations: 100, rng: mulberry32(7) });
    expect(result).toEqual({ equity: 0, iterations: 100 });
    // Board-made royal flush makes every legal deal tie. Rejections are not losses.
    const tie = calculateRangeVsRangeEquity(rangeFromList(["AA", "AKs"]), rangeFromList(["AA"]), parseCards("Ts Js Qs Ks As"), { iterations: 100, rng: mulberry32(9) });
    expect(tie.equity).toBe(0.5);
  });
  it("abstains on impossible joint ranges within a bounded number of attempts", () => {
    expect(() => calculateRangeVsRangeEquity(rangeFromList(["AA"]), rangeFromList(["AA"]), parseCards("As Ah 2c 3d 4s"), { iterations: 1, rng: mulberry32(1) })).toThrow("disjoint");
  });
});
