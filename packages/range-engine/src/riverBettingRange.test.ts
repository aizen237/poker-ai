import { describe, expect, it } from "vitest";
import { cardId, fullDeck, parseCards, type Card } from "@poker-ai/shared";
import { combinations, evaluateBest, HandCategory } from "@poker-ai/poker-engine";
import { createComboRange } from "./comboRange.js";
import { calculateExactRiverEquity } from "./rangeEquity.js";
import { riverBettingAssumptions, turnBettingAssumptions } from "./riverBettingRange.js";

it("Hand471: every legal opponent holding exceeds the bluff bucket's one-pair ceiling", () => {
  const hero = parseCards("Td 2h"), board = parseCards("4h 4s Th Ts");
  const known = new Set([...hero, ...board].map(cardId));
  const holdings = [...combinations(fullDeck().filter(c => !known.has(cardId(c))), 2)];
  expect(holdings).toHaveLength(1035); // C(46, 2), independently of range construction.
  const categories = holdings.map(cards => evaluateBest([...cards, ...board]).category);
  expect(categories.every(category => category >= HandCategory.TwoPair)).toBe(true);
  expect(categories.filter(category => category === HandCategory.TwoPair)).toHaveLength(903);
  expect(categories.filter(category => category === HandCategory.FullHouse)).toHaveLength(131);
  expect(categories.filter(category => category === HandCategory.FourOfAKind)).toHaveLength(1);
  // Value exists; the empty bluff bucket must not become fabricated combos or
  // a silent value-only range with changed mixture weights.
  expect(() => turnBettingAssumptions(hero, board)).toThrow(
    "Strong value / 10% bluffs: no legal bluff combinations; assumption cannot be evaluated");
});

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
