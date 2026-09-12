import { mulberry32, parseCards } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { calculateEquityVsRange, calculateRangeVsRangeEquity } from "./rangeEquity.js";
import { rangeFromList } from "./range.js";

const ITERATIONS = 8000;
const TIMEOUT_MS = 20000;

describe("calculateEquityVsRange", () => {
  it(
    "a trash hand vs. a tight AA-only range lands near the complement of AA-vs-random (~15%)",
    () => {
      const heroCards = parseCards("7c 2d");
      const opponentRange = rangeFromList(["AA"]);
      const result = calculateEquityVsRange(heroCards, opponentRange, [], {
        iterations: ITERATIONS,
        rng: mulberry32(1),
      });
      expect(result.equity).toBeGreaterThan(0.08);
      expect(result.equity).toBeLessThan(0.22);
    },
    TIMEOUT_MS,
  );

  it(
    "KK vs. a tight AA-only range lands near the known ~18-19% benchmark",
    () => {
      const heroCards = parseCards("Ks Kd");
      const opponentRange = rangeFromList(["AA"]);
      const result = calculateEquityVsRange(heroCards, opponentRange, [], {
        iterations: ITERATIONS,
        rng: mulberry32(2),
      });
      expect(result.equity).toBeGreaterThan(0.12);
      expect(result.equity).toBeLessThan(0.26);
    },
    TIMEOUT_MS,
  );

  it("throws if the opponent range has no valid combos left (all 4 aces already accounted for)", () => {
    // Hero holds 2 aces, the board shows the other 2 -- zero aces remain,
    // so a pure "AA" range has no valid combos left to sample from.
    const heroCards = parseCards("As Ad");
    const board = parseCards("Ah Ac 2h");
    const opponentRange = rangeFromList(["AA"]);
    expect(() => calculateEquityVsRange(heroCards, opponentRange, board)).toThrow();
  });

  it("throws if hero doesn't have exactly 2 cards", () => {
    expect(() => calculateEquityVsRange(parseCards("As"), rangeFromList(["AA"]), [])).toThrow();
  });
});

describe("calculateRangeVsRangeEquity", () => {
  it(
    "a pure AA range vs. a pure KK range strongly favors AA (roughly 80%+)",
    () => {
      const heroRange = rangeFromList(["AA"]);
      const opponentRange = rangeFromList(["KK"]);
      const result = calculateRangeVsRangeEquity(heroRange, opponentRange, [], {
        iterations: ITERATIONS,
        rng: mulberry32(3),
      });
      expect(result.equity).toBeGreaterThan(0.75);
    },
    TIMEOUT_MS,
  );

  it(
    "identical ranges against each other land close to 50%",
    () => {
      const range = rangeFromList(["AKs", "AKo", "QQ", "JJ"]);
      const result = calculateRangeVsRangeEquity(range, range, [], {
        iterations: ITERATIONS,
        rng: mulberry32(4),
      });
      expect(result.equity).toBeGreaterThan(0.45);
      expect(result.equity).toBeLessThan(0.55);
    },
    TIMEOUT_MS,
  );

  it("throws if hero's range has no valid combos", () => {
    expect(() => calculateRangeVsRangeEquity(rangeFromList([]), rangeFromList(["AA"]), [])).toThrow();
  });
});