import { mulberry32, parseCards } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { evaluateShove } from "./pushFold.js";

const ITERATIONS = 5000;
const TIMEOUT_MS = 15000;

describe("evaluateShove — the core push/fold property", () => {
  it(
    "a weak hand (72o) is profitable to shove short-stacked but unprofitable shoved deep-stacked",
    () => {
      const weakHand = parseCards("7c 2d");
      const potBB = 1.5; // blinds only, e.g. SB 0.5 + BB 1

      const shortStack = evaluateShove(weakHand, 3, potBB, {
        foldEquity: 0.5,
        iterations: ITERATIONS,
        rng: mulberry32(1),
      });
      const deepStack = evaluateShove(weakHand, 100, potBB, {
        foldEquity: 0.5,
        iterations: ITERATIONS,
        rng: mulberry32(1),
      });

      expect(shortStack.isProfitable).toBe(true);
      expect(deepStack.isProfitable).toBe(false);
      expect(shortStack.ev).toBeGreaterThan(deepStack.ev);
    },
    TIMEOUT_MS,
  );

  it(
    "a premium hand (AA) is profitable to shove at any reasonable stack depth, and MORE profitable when deeper",
    () => {
      const premiumHand = parseCards("As Ad");
      const potBB = 1.5;

      const shortStack = evaluateShove(premiumHand, 3, potBB, {
        foldEquity: 0.5,
        iterations: ITERATIONS,
        rng: mulberry32(2),
      });
      const deepStack = evaluateShove(premiumHand, 30, potBB, {
        foldEquity: 0.5,
        iterations: ITERATIONS,
        rng: mulberry32(2),
      });

      expect(shortStack.isProfitable).toBe(true);
      expect(deepStack.isProfitable).toBe(true);
      expect(deepStack.ev).toBeGreaterThan(shortStack.ev);
    },
    TIMEOUT_MS,
  );

  it(
    "higher fold equity increases shove EV for a hand too weak to want action, all else equal",
    () => {
      // 96o has meaningfully below 50% equity vs random -- weak enough that
      // hero genuinely prefers folds to calls here, unlike a hand like KQo
      // (~60% equity), where getting called and playing a big pot out is
      // actually MORE profitable than just winning the blinds, making more
      // fold equity actively worse, not better. Which regime you're in
      // depends on equity vs. the pot-to-stack ratio, not on "weak hand" alone.
      const marginalHand = parseCards("9h 6d");
      const potBB = 1.5;

      const lowFoldEquity = evaluateShove(marginalHand, 15, potBB, {
        foldEquity: 0.2,
        iterations: ITERATIONS,
        rng: mulberry32(3),
      });
      const highFoldEquity = evaluateShove(marginalHand, 15, potBB, {
        foldEquity: 0.8,
        iterations: ITERATIONS,
        rng: mulberry32(3),
      });

      expect(highFoldEquity.ev).toBeGreaterThan(lowFoldEquity.ev);
    },
    TIMEOUT_MS,
  );

  it("uses the documented default fold equity (0.5) when none is specified", () => {
    const result = evaluateShove(parseCards("As Ks"), 10, 1.5, {
      iterations: 1000,
      rng: mulberry32(4),
    });
    expect(result.foldEquityUsed).toBe(0.5);
  });
});

describe("evaluateShove — input validation", () => {
  it("throws on non-positive effective stack", () => {
    expect(() => evaluateShove(parseCards("As Ks"), 0, 1.5)).toThrow();
    expect(() => evaluateShove(parseCards("As Ks"), -5, 1.5)).toThrow();
  });

  it("throws on non-positive pot", () => {
    expect(() => evaluateShove(parseCards("As Ks"), 10, 0)).toThrow();
  });

  it("throws on fold equity outside 0-1", () => {
    expect(() => evaluateShove(parseCards("As Ks"), 10, 1.5, { foldEquity: 1.5 })).toThrow();
    expect(() => evaluateShove(parseCards("As Ks"), 10, 1.5, { foldEquity: -0.1 })).toThrow();
  });
});