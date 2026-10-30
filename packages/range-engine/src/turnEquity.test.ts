import { describe, expect, it } from "vitest";
import { cardId, fullDeck, parseCards, type Card } from "@poker-ai/shared";
import { evaluateBest } from "@poker-ai/poker-engine";
import { createComboRange, expandEquityRange, type EquityRange } from "./comboRange.js";
import { calculateExactTurnEquity, calculateExactTurnEquities } from "./rangeEquity.js";
import { turnBettingAssumptions } from "./riverBettingRange.js";

const combo = (cards: string, weight = 1) => ({ cards: parseCards(cards) as [Card, Card], weight });
describe("exact turn checkdown equity", () => {
  it("matches independent exhaustive enumeration across overlapping, differently weighted hypotheses", () => {
    // Deliberately shares triples across hole/river permutations and ranges.
    // The oracle uses no memoization and evaluates BOTH players for every river.
    const oracle = (hero: Card[], board: Card[], range: EquityRange) => {
      const combos = expandEquityRange(range, [...hero, ...board]);
      let share = 0, mass = 0, iterations = 0;
      for (const c of combos) {
        const known = new Set([...hero, ...board, ...c.cards].map(cardId));
        let wins = 0, count = 0;
        for (const river of fullDeck().filter(c => !known.has(cardId(c)))) {
          const h = evaluateBest([...hero, ...board, river]).value;
          const v = evaluateBest([...c.cards, ...board, river]).value;
          wins += h > v ? 1 : h === v ? .5 : 0; count++;
        }
        share += c.weight * wins / count; mass += c.weight; iterations += count;
      }
      return { equity: share / mass, iterations };
    };
    for (const [h, b] of [["Tc 4d", "5s 5c 4c Jc"], ["Ks Qd", "Ah Ac Ad As"],
      ["8h 9h", "6s 7d Qh 2c"], ["Ah Kh", "Qh Jh 2h 3h"]]) {
      const hero = parseCards(h!), board = parseCards(b!);
      const ranges = [createComboRange([combo("7s 8s", .2), combo("7s 9d", .7), combo("8s 9d", .1), combo("4d 7s", .4)]),
        createComboRange([combo("8s 7s", .6), combo("8s 9d", .4)])];
      const result = calculateExactTurnEquities(hero, ranges, board);
      expect(result).toEqual(ranges.map(r => oracle(hero, board, r)));
    }
  });
  it("validates every hypothesis before sharing work and never reuses values across boards", () => {
    const hero = parseCards("Tc 4d"), range = createComboRange([combo("Ah Ad")]);
    const first = calculateExactTurnEquities(hero, [range], parseCards("5s 5c 4c Jc"));
    expect(() => calculateExactTurnEquities(hero, [range, createComboRange([])], parseCards("5s 5c 4c Jc"))).toThrow(/mass/);
    const second = calculateExactTurnEquities(hero, [range], parseCards("2s 3h 8d 9c"));
    expect(second).not.toEqual(first);
  });
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
