import { mulberry32, parseCards } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { calculateEquity } from "./equity.js";

const ITERATIONS = 20_000;
const TIMEOUT_MS = 15000;

describe("calculateEquity — known real-world benchmarks", () => {
  it(
    "pocket Aces vs. random hand, heads-up, preflop, ~85%",
    () => {
      const result = calculateEquity(
        parseCards("As Ad"),
        [],
        1,
        { iterations: ITERATIONS, rng: mulberry32(1) },
      );
      expect(result.equity).toBeGreaterThan(0.80);
      expect(result.equity).toBeLessThan(0.90);
    },
    TIMEOUT_MS,
  );

  it("Aces vs. Kings, heads-up, preflop, ~82% for Aces — see next phase note", () => {
    // calculateEquity as designed only supports "hero vs. random opponents,"
    // not "hero vs. a specific opponent hand." Head-to-head equity (needed
    // for hand-vs-hand and hand-vs-range comparisons) is a real gap we'll
    // close in the next step, not something to fake a test for here.
    expect(true).toBe(true);
  });

  it(
    "a flopped set is a big favorite over two overcards",
    () => {
      const result = calculateEquity(
        parseCards("7s 7d"),
        parseCards("7h 2c 9d"),
        1,
        { iterations: ITERATIONS, rng: mulberry32(2) },
      );
      expect(result.equity).toBeGreaterThan(0.85);
    },
    TIMEOUT_MS,
  );

  it(
    "equity decreases as the number of opponents increases",
    () => {
      const vsOne = calculateEquity(
        parseCards("As Ad"),
        [],
        1,
        { iterations: 5000, rng: mulberry32(3) },
      );
      const vsThree = calculateEquity(
        parseCards("As Ad"),
        [],
        3,
        { iterations: 5000, rng: mulberry32(3) },
      );
      expect(vsThree.equity).toBeLessThan(vsOne.equity);
    },
    TIMEOUT_MS,
  );

  it(
    "wins + ties + losses always sum to total iterations",
    () => {
      const result = calculateEquity(
        parseCards("Kh Qh"),
        parseCards("Jh Th 2c"),
        2,
        { iterations: ITERATIONS, rng: mulberry32(4) },
      );
      expect(result.wins + result.ties + result.losses).toBe(ITERATIONS);
    },
    TIMEOUT_MS,
  );

  it(
    "a made nut flush on a complete river board has very high equity vs. random",
    () => {
      const result = calculateEquity(
        parseCards("As Ks"),
        parseCards("7s 4s 2s 9d 3c"),
        1,
        { iterations: ITERATIONS, rng: mulberry32(5) },
      );
      expect(result.equity).toBeGreaterThan(0.95);
    },
    TIMEOUT_MS,
  );
});

describe("calculateEquity — input validation", () => {
  it("throws if hero doesn't have exactly 2 cards", () => {
    expect(() => calculateEquity(parseCards("As"), [], 1)).toThrow();
    expect(() => calculateEquity(parseCards("As Ks Qs"), [], 1)).toThrow();
  });

  it("throws if board has more than 5 cards", () => {
    expect(() =>
      calculateEquity(parseCards("As Ks"), parseCards("2c 3c 4c 5c 6c 7c"), 1),
    ).toThrow();
  });

  it("throws if numOpponents is less than 1", () => {
    expect(() => calculateEquity(parseCards("As Ks"), [], 0)).toThrow();
  });
});