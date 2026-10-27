import { describe, expect, it } from "vitest";
import { cardId, fullDeck, mulberry32, parseCards, type Card } from "@poker-ai/shared";
import { combinations, evaluateBest } from "@poker-ai/poker-engine";
import { createComboRange } from "./comboRange.js";
import { calculateEquityVsRange } from "./rangeEquity.js";
import { flopBettingAssumptions } from "./riverBettingRange.js";

const combo = (text: string, weight = 1) => ({ cards: parseCards(text) as [Card, Card], weight });
const options = () => ({ iterations: 10_000, rng: mulberry32(0xF10F) });

describe("flop checkdown sampling using the existing range engine", () => {
  it.each([
    { hero: "Kh 9h", villain: "Ac Ad", board: "2h 7h Qs", kind: "flush draw" },
    { hero: "Kh 9h", villain: "Ah Ad", board: "2h 7h Qs", kind: "blocked flush draw" },
    { hero: "8h 9h", villain: "Qc Qd", board: "6s 7d Qh", kind: "straight draw vs set" },
    { hero: "As Ks", villain: "Qc Qd", board: "Qs Js Ts", kind: "made straight flush" },
    { hero: "3h 4d", villain: "Ac Ad", board: "9s Jh Qd", kind: "no direct draw" },
  ])("matches an exhaustive 990-runout oracle for $kind, including missed draws", ({ hero, villain, board, kind }) => {
    const h = parseCards(hero), v = parseCards(villain), b = parseCards(board);
    const known = new Set([...h, ...v, ...b].map(cardId));
    let share = 0, misses = 0;
    const runouts = combinations(fullDeck().filter(c => !known.has(cardId(c))), 2);
    expect(runouts).toHaveLength(990);
    for (const runout of runouts) {
      const hv = evaluateBest([...h, ...b, ...runout]).value, vv = evaluateBest([...v, ...b, ...runout]).value;
      share += hv > vv ? 1 : hv === vv ? .5 : 0;
      if (hv < vv) misses++;
    }
    const result = calculateEquityVsRange(h, createComboRange([combo(villain)]), b, options());
    expect(Math.abs(result.equity - share / 990)).toBeLessThan(.015);
    expect(result.iterations).toBe(10_000);
    if (kind.includes("draw")) expect(misses).toBeGreaterThan(0);
    else expect(result.equity).toBe(1);
  }, 20000);

  it("splits ties, removes blocked combinations and is reproducible", () => {
    // Neither suit can make a flush with two cards to come: every runout chops.
    const h = parseCards("As Kd"), b = parseCards("Qh Jc Ts");
    const r = createComboRange([combo("Ah Kc", .25), combo("As 2c", .75)]);
    expect(calculateEquityVsRange(h, r, b, options())).toEqual({ equity: .5, iterations: 10_000 });
    expect(calculateEquityVsRange(h, r, b, options())).toEqual(calculateEquityVsRange(h, r, b, options()));
    expect(() => calculateEquityVsRange(h, createComboRange([combo("As 2c")]), b, options())).toThrow(/no valid combos/);
    expect(() => calculateEquityVsRange(h, createComboRange([]), b, options())).toThrow(/no valid combos/);
  }, 20000);

  it.each(["2s 7h 9d", "2s 2h 9d", "2h 7h 9h"])("keeps explicit mixture mass and removal on %s", board => {
    const hero = parseCards("Ah Ad"), b = parseCards(board), known = new Set([...hero, ...b].map(cardId));
    for (const a of flopBettingAssumptions(hero, b)) {
      expect(a.range.combos.every(c => c.cards.every(card => !known.has(cardId(card))))).toBe(true);
      expect(a.range.combos.slice(0, a.valueCombos).reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1 - a.bluffShare, 12);
      expect(a.range.combos.slice(a.valueCombos).reduce((s, c) => s + c.weight, 0)).toBeCloseTo(a.bluffShare, 12);
      expect(a.bluffAssumption).toContain("frozen flop range");
    }
  });

  it("rejects invalid cards and board counts rather than inventing a range", () => {
    expect(() => flopBettingAssumptions(parseCards("Ah Ad"), parseCards("2s 7h"))).toThrow(/three board/);
    expect(() => flopBettingAssumptions(parseCards("Ah Ad"), parseCards("2s 7h Ah"))).toThrow();
  });
});
