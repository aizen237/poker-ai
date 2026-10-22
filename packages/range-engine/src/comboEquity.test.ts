import { fullDeck, mulberry32, parseCards, type Card } from "@poker-ai/shared";
import { evaluateBest } from "@poker-ai/poker-engine";
import { describe, expect, it } from "vitest";
import { comboRangeFromRange, createComboRange, normalizeComboRange, type ComboRange } from "./comboRange.js";
import { rangeFromList } from "./range.js";
import { calculateEquityVsRange, calculateRangeVsRangeEquity } from "./rangeEquity.js";
import { calculateEquityVsRanges } from "./multiwayEquity.js";

const range = (...entries: [string, number][]): ComboRange => createComboRange(entries.map(([cards, weight]) => ({ cards: parseCards(cards) as [Card, Card], weight })));
const options = (seed = 17, iterations = 3000) => ({ rng: mulberry32(seed), iterations });
const hero = parseCards("Kh Kd"), river = parseCards("2s 7s 9s 3d 4c");
const suited = range(["As Qs", 0.75], ["Ah Qh", 0.25]);

// Exhaustive runouts for a fixed physical opponent; no production range expansion,
// probability helper or sampler. Hand ranking is the separately tested evaluator.
function exhaustiveShare(hero: Card[], opponent: Card[], board: Card[]): number {
  const known = [...hero, ...opponent, ...board].map(c => `${c.rank}${c.suit}`);
  const deck = fullDeck().filter(c => !known.includes(`${c.rank}${c.suit}`));
  let total = 0, share = 0;
  const score = (runout: Card[]) => {
    const a = evaluateBest([...hero, ...board, ...runout]).value;
    const b = evaluateBest([...opponent, ...board, ...runout]).value;
    total++; share += a > b ? 1 : a === b ? 0.5 : 0;
  };
  if (board.length === 5) score([]);
  else for (let i = 0; i < deck.length; i++) {
    if (board.length === 4) score([deck[i]!]);
    else for (let j = i + 1; j < deck.length; j++) score([deck[i]!, deck[j]!]);
  }
  return share / total;
}

describe("combination equity integration", () => {
  it("weights actual suits on a flush board: manually known river equity 1/4", () => {
    expect(calculateEquityVsRange(hero, suited, river, options()).equity).toBeCloseTo(0.25, 1);
    expect(calculateEquityVsRange(hero, range(["As Qs", 0.25], ["Ah Qh", 0.75]), river, options()).equity).toBeCloseTo(0.75, 1);
    const multi = calculateEquityVsRanges(hero, [suited], river, options());
    expect(calculateEquityVsRange(hero, suited, river, options())).toEqual({ equity: multi.equity, iterations: multi.iterations });
  });

  it("uses half-open cumulative bins at RNG zero and exact weight boundaries", () => {
    expect(calculateEquityVsRange(hero, suited, river, { iterations: 1, rng: () => 0 }).equity).toBe(0);
    expect(calculateEquityVsRange(hero, suited, river, { iterations: 1, rng: () => 0.75 }).equity).toBe(1);
  });

  it.each(["2s 7s 9s", "2s 7s 9s 3d"])("matches exhaustive weighted runouts on %s", cards => {
    const board = parseCards(cards);
    const expected = 0.75 * exhaustiveShare(hero, parseCards("As Qs"), board)
      + 0.25 * exhaustiveShare(hero, parseCards("Ah Qh"), board);
    // Against AhQh only the three remaining aces beat KK; a queen is not an out.
    // Against AsQs the made flush wins every river. Thus .25 * (44-3)/44.
    if (board.length === 4) expect(expected).toBeCloseTo(0.25 * 41 / 44, 14);
    expect(Math.abs(calculateEquityVsRange(hero, suited, board, options()).equity - expected)).toBeLessThan(0.04);
  }, 20000);

  it("matches hand-calculated joint mass under asymmetric collisions in both seat orders", () => {
    const second = range(["As Js", 0.5], ["Qc Qd", 0.5]);
    // Legal masses: flush/QQ=.375 (lose), hearts/flush=.125 (lose),
    // hearts/QQ=.125 (win). Product distribution: .125/.625 = .2.
    for (const opponents of [[suited, second], [second, suited]]) {
      const actual = calculateEquityVsRanges(hero, opponents, river, options(22, 4000));
      expect(Math.abs(actual.equity - 0.2)).toBeLessThan(0.03);
      expect(actual.rejectedSamples).toBeGreaterThan(0);
    }
    // Hero KK / AsJs equally weighted: only three legal pairs versus suited.
    // Winning mass .125+.125, total .375+.125+.125 => .4.
    const pair = calculateRangeVsRangeEquity(range(["Kh Kd", 0.5], ["As Js", 0.5]), suited, river, options(44, 4000));
    expect(Math.abs(pair.equity - 0.4)).toBeLessThan(0.03);
  }, 20000);

  it.each(["", "2s 7s 9s", "2s 7s 9s 3d", "2s 7s 9s 3d 4c"])("preserves legacy seeded results on every street: %s", cards => {
    const a = new Map([["AA", 0.3], ["AKs", 0.7], ["QQ", 1]]), b = rangeFromList(["JJ", "AQo"]);
    const ca = comboRangeFromRange(a), cb = comboRangeFromRange(b), board = parseCards(cards);
    expect(calculateEquityVsRange(hero, a, board, options(7, 80))).toEqual(calculateEquityVsRange(hero, ca, board, options(7, 80)));
    expect(calculateRangeVsRangeEquity(a, b, board, options(8, 80))).toEqual(calculateRangeVsRangeEquity(ca, cb, board, options(8, 80)));
    expect(calculateEquityVsRanges(hero, [a, b], board, options(9, 80))).toEqual(calculateEquityVsRanges(hero, [ca, cb], board, options(9, 80)));
    expect(calculateEquityVsRanges(hero, [a, cb], board, options(9, 80))).toEqual(calculateEquityVsRanges(hero, [ca, b], board, options(9, 80)));
  });

  it("preserves normalized equity and removes both hero and board blockers before sampling", () => {
    const blocked = range(["Kh Qh", 1], ["2s As", 1], ["Ah Qh", 0.25]);
    expect(calculateEquityVsRange(hero, blocked, river, options(1, 30)).equity).toBe(1);
    expect(calculateEquityVsRanges(hero, [blocked], river, options(1, 30)).equity).toBe(1);
    const scaled = range(["As Qs", 0.3], ["Ah Qh", 0.1]);
    expect(calculateEquityVsRange(hero, scaled, river, options())).toEqual(calculateEquityVsRange(hero, normalizeComboRange(scaled).range, river, options()));
  });

  it("splits ties and rejects impossible ranges without turning rejections into losses", () => {
    const board = parseCards("Ts Js Qs Ks As"), smallHero = parseCards("2c 3d");
    expect(calculateEquityVsRange(smallHero, range(["4c 5c", 1]), board, options(1, 30)).equity).toBe(0.5);
    expect(calculateEquityVsRanges(smallHero, [range(["4c 5c", 1]), range(["6h 7h", 1])], board, options(1, 30)).equity).toBeCloseTo(1 / 3, 14);
    for (const empty of [range(), range(["As Qs", 0]), range(["Kh Qh", 1])]) {
      expect(() => calculateEquityVsRange(hero, empty, river, options(1, 1))).toThrow("no valid combos");
      expect(() => calculateEquityVsRanges(hero, [empty], river, options(1, 1))).toThrow("no legal combos");
    }
    const one = range(["Ah Qh", 1]);
    expect(() => calculateEquityVsRanges(hero, [one, one], river, { ...options(1, 1), maxSamplingAttempts: 5 })).toThrow("sampling limit");
    expect(() => calculateRangeVsRangeEquity(one, one, river, options(1, 1))).toThrow("disjoint");
  });

  it.each([NaN, Infinity, -0.1, 1])("rejects invalid RNG %s in both heads-up paths", value => {
    expect(() => calculateEquityVsRange(hero, suited, river, { iterations: 1, rng: () => value })).toThrow("RNG");
    expect(() => calculateRangeVsRangeEquity(range(["Kh Kd", 1]), suited, river, { iterations: 1, rng: () => value })).toThrow("RNG");
  });

  it("rejects duplicate known cards and malformed structural combo input at equity boundaries", () => {
    expect(() => calculateEquityVsRange(hero, suited, parseCards("Kh 2s 3d"), options(1, 1))).toThrow("Duplicate");
    const duplicate: ComboRange = { kind: "combination", combos: [...suited.combos, ...suited.combos] };
    expect(() => calculateEquityVsRange(hero, duplicate, river, options(1, 1))).toThrow("Duplicate combination");
    expect(() => calculateEquityVsRanges(hero, [duplicate], river, options(1, 1))).toThrow("Duplicate combination");
    expect(() => calculateRangeVsRangeEquity(duplicate, suited, river, options(1, 1))).toThrow("Duplicate combination");
  });
});
