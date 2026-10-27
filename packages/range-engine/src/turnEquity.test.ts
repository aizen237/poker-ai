import { describe, expect, it } from "vitest";
import { cardId, parseCards, type Card } from "@poker-ai/shared";
import { createComboRange } from "./comboRange.js";
import { calculateExactTurnEquity } from "./rangeEquity.js";
import { turnBettingAssumptions } from "./riverBettingRange.js";

const combo = (cards: string, weight = 1) => ({ cards: parseCards(cards) as [Card, Card], weight });
describe("exact turn checkdown equity", () => {
  it("counts nine flush rivers out of 44; opponent removal changes the outs", () => {
    const hero = parseCards("Kh 9h"), board = parseCards("2h 7h Qs 4c");
    expect(calculateExactTurnEquity(hero, createComboRange([combo("Ac Ad")]), board))
      .toEqual({ equity: 9 / 44, iterations: 44 });
    expect(calculateExactTurnEquity(hero, createComboRange([combo("Ah Ad")]), board))
      .toEqual({ equity: 8 / 44, iterations: 44 });
  });
  it("counts eight straight outs against a set on a rainbow board", () => {
    expect(calculateExactTurnEquity(parseCards("8h 9h"), createComboRange([combo("Qc Qd")]), parseCards("6s 7d Qh 2c")))
      .toEqual({ equity: 8 / 44, iterations: 44 });
  });
  it("weights win/tie outcomes and removes impossible opponent hands", () => {
    const hero = parseCards("Ks Qd"), board = parseCards("Ah Ac Ad As");
    // Both king kickers chop every river. Against QJ, hero wins 41 rivers
    // and chops on the three remaining kings.
    const result = calculateExactTurnEquity(hero,
      createComboRange([combo("Kh Kc", .75), combo("Qh Jc", .25), combo("As 2c", 1)]), board);
    expect(result.equity).toBeCloseTo((3 * .5 + 42.5 / 44) / 4, 12);
    expect(result.iterations).toBe(88);
  });
  it("preserves explicit mixture weights, removal, and draws on paired and unpaired turns", () => {
    for (const board of [parseCards("2s 7h 9d Jc"), parseCards("2s 2h 9d Jc")]) {
      const hero = parseCards("Ah Ad"), known = new Set([...hero, ...board].map(cardId));
      for (const a of turnBettingAssumptions(hero, board)) {
        expect(a.range.combos.every(c => c.cards.every(v => !known.has(cardId(v))))).toBe(true);
        expect(a.range.combos.slice(0, a.valueCombos).reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1 - a.bluffShare, 12);
        expect(a.range.combos.slice(a.valueCombos).reduce((s, c) => s + c.weight, 0)).toBeCloseTo(a.bluffShare, 12);
        expect(a.bluffAssumption).toContain("draws/semi-bluffs");
      }
    }
  });
  it("rejects wrong board counts, duplicate/invalid cards, empty and fully blocked ranges", () => {
    const hero = parseCards("Ah Ad"), board = parseCards("2s 7h 9d Jc"), range = createComboRange([combo("Kh Kd")]);
    for (const b of [board.slice(0, 3), [...board, hero[0]!], [...board.slice(0, 3), hero[0]!],
      [...board.slice(0, 3), { rank: 15, suit: "s" } as Card]])
      expect(() => calculateExactTurnEquity(hero, range, b)).toThrow();
    for (const r of [createComboRange([]), createComboRange([combo("Ah Kd")])])
      expect(() => calculateExactTurnEquity(hero, r, board)).toThrow(/mass/);
    expect(() => turnBettingAssumptions(hero, parseCards("2s 2h 2d 2c"))).toThrow(/no legal/);
  });
});
