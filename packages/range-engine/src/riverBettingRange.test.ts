import { describe, expect, it } from "vitest";
import { cardId, parseCards, type Card } from "@poker-ai/shared";
import { createComboRange } from "./comboRange.js";
import { calculateExactRiverEquity } from "./rangeEquity.js";
import { riverBettingAssumptions } from "./riverBettingRange.js";

describe("conditional river ranges and exact weighted equity", () => {
  const hero = parseCards("Ah Ad"), board = parseCards("2s 7h 9d Jc Qc");
  it("removes all known cards and gives each bucket its labeled total mass", () => {
    const known = new Set([...hero, ...board].map(cardId));
    for (const a of riverBettingAssumptions(hero, board)) {
      expect(a.range.combos.every(c => c.cards.every(v => !known.has(cardId(v))))).toBe(true);
      expect(a.range.combos.slice(0, a.valueCombos).reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1 - a.bluffShare, 12);
      expect(a.range.combos.slice(a.valueCombos).reduce((s, c) => s + c.weight, 0)).toBeCloseTo(a.bluffShare, 12);
      expect(a.valueCombos).toBeGreaterThan(0);
      expect(a.bluffCombos).toBeGreaterThan(0);
    }
    // AA loses to every two-pair+ value hand and beats every weak bluff.
    expect(calculateExactRiverEquity(hero, riverBettingAssumptions(hero, board)[0]!.range, board).equity).toBeCloseTo(.1, 12);
  });
  it("independently checks weighted win/loss/tie shares and blocked combos", () => {
    const range = createComboRange([
      { cards: parseCards("As Qs") as [Card, Card], weight: .5 }, // flush wins
      { cards: parseCards("Ah Qh") as [Card, Card], weight: .25 }, // loses to KK
      { cards: parseCards("Kc Ks") as [Card, Card], weight: .25 }, // ties KK
      { cards: parseCards("Kh Qc") as [Card, Card], weight: 1 }, // impossible
    ]);
    expect(calculateExactRiverEquity(parseCards("Kh Kd"), range, parseCards("2s 7s 9s 3d 4c")))
      .toEqual({ equity: .375, iterations: 3 });
  });
  it("handles a paired board without treating the board's pair as top-pair value", () => {
    const paired = parseCards("2s 2h 9d Jc Qc");
    const a = riverBettingAssumptions(hero, paired)[0]!;
    expect(a.range.combos.slice(0, a.valueCombos).some(c => c.cards[0].rank !== c.cards[1].rank &&
      c.cards.every(v => [3, 4].includes(v.rank)))).toBe(false);
    expect(a.bluffCombos).toBeGreaterThan(0);
  });
  it("rejects duplicate cards, incomplete boards and empty/unsupported assumptions", () => {
    expect(() => riverBettingAssumptions(hero, [...board.slice(0, 4), hero[0]!])).toThrow(/Duplicate/);
    expect(() => riverBettingAssumptions(hero, board.slice(0, 4))).toThrow(/five/);
    expect(() => calculateExactRiverEquity(hero, createComboRange([]), board)).toThrow(/mass/);
    expect(() => riverBettingAssumptions(hero, parseCards("Ts Js Qs Ks As"))).toThrow(/no legal/);
  });
});
