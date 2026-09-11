import { parseCards } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { evaluateBest, evaluate5 } from "./evaluator.js";
import { HandCategory } from "./types.js";

function ev(cardStr: string) {
  return evaluate5(parseCards(cardStr));
}

describe("evaluate5 — category detection", () => {
  it("detects high card", () => {
    expect(ev("As Kd 7h 4c 2s").category).toBe(HandCategory.HighCard);
  });

  it("detects a pair", () => {
    expect(ev("As Ad 7h 4c 2s").category).toBe(HandCategory.Pair);
  });

  it("detects two pair", () => {
    expect(ev("As Ad 7h 7c 2s").category).toBe(HandCategory.TwoPair);
  });

  it("detects three of a kind", () => {
    expect(ev("As Ad Ah 4c 2s").category).toBe(HandCategory.ThreeOfAKind);
  });

  it("detects a straight", () => {
    expect(ev("9s 8d 7h 6c 5s").category).toBe(HandCategory.Straight);
  });

  it("detects the wheel (A-2-3-4-5) as a straight with high card 5", () => {
    const hand = ev("As 2d 3h 4c 5s");
    expect(hand.category).toBe(HandCategory.Straight);
    expect(hand.tiebreakers[0]).toBe(5);
  });

  it("detects a flush", () => {
    expect(ev("As Ks 7s 4s 2s").category).toBe(HandCategory.Flush);
  });

  it("detects a full house", () => {
    expect(ev("As Ad Ah 7c 7s").category).toBe(HandCategory.FullHouse);
  });

  it("detects four of a kind", () => {
    expect(ev("As Ad Ah Ac 2s").category).toBe(HandCategory.FourOfAKind);
  });

  it("detects a straight flush", () => {
    expect(ev("9s 8s 7s 6s 5s").category).toBe(HandCategory.StraightFlush);
  });

  it("detects the wheel straight flush (steel wheel)", () => {
    const hand = ev("As 2s 3s 4s 5s");
    expect(hand.category).toBe(HandCategory.StraightFlush);
    expect(hand.tiebreakers[0]).toBe(5);
  });

  it("a flush beats a straight even though 5 < 6 cards compared naively", () => {
    const flush = ev("As Ks 7s 4s 2s");
    const straight = ev("9d 8c 7h 6s 5d");
    expect(flush.value).toBeGreaterThan(straight.value);
  });

  it("does not misdetect 4 same-suit + 1 different as a flush", () => {
    expect(ev("As Ks 7s 4s 2h").category).not.toBe(HandCategory.Flush);
  });

  it("does not misdetect near-consecutive ranks with a gap as a straight", () => {
    // 9,8,7,6,4 — missing the 5, not a straight
    expect(ev("9s 8d 7h 6c 4s").category).not.toBe(HandCategory.Straight);
  });
});

describe("evaluate5 — tiebreaker ordering and comparisons", () => {
  it("ranks higher pair above lower pair", () => {
    const kings = ev("Ks Kd 7h 4c 2s");
    const twos = ev("2s 2d 7h 4c 3s");
    expect(kings.value).toBeGreaterThan(twos.value);
  });

  it("uses kickers to break ties within the same pair rank", () => {
    const acekicker = ev("Ks Kd As 4c 2s");
    const queenkicker = ev("Ks Kd Qs 4c 2s");
    expect(acekicker.value).toBeGreaterThan(queenkicker.value);
  });

  it("two pair: compares high pair first, then low pair, then kicker", () => {
    const aksHigh = ev("As Ad Ks Kd 2s"); // AA KK, kicker 2
    const aksLow = ev("As Ad Qs Qd 2s"); // AA QQ, kicker 2 — AA beats AA, KK beats QQ
    expect(aksHigh.value).toBeGreaterThan(aksLow.value);
  });

  it("full house: compares trips rank first, then pair rank", () => {
    const acesFull = ev("As Ad Ah 2s 2d"); // AAA 22
    const kingsFull = ev("Ks Kd Kh As Ad"); // KKK AA
    expect(acesFull.value).toBeGreaterThan(kingsFull.value);
  });

  it("higher straight beats lower straight", () => {
    const broadway = ev("As Kd Qh Jc Ts"); // A-high straight
    const wheel = ev("5s 4d 3h 2c As"); // 5-high straight (wheel)
    expect(broadway.value).toBeGreaterThan(wheel.value);
  });
});

describe("evaluate5 — input validation", () => {
  it("throws if not given exactly 5 cards", () => {
    expect(() => evaluate5(parseCards("As Kd"))).toThrow();
    expect(() => evaluate5(parseCards("As Kd Qh Jc Ts 9s"))).toThrow();
  });
});

describe("evaluateBest — 6 and 7 card hands (turn/river)", () => {
  it("finds the best 5-card hand among 6 cards (turn)", () => {
    // Hole: As Ks. Board: Ad Kd 7h 2c (turn) — best is two pair AAKK
    const hand = evaluateBest(parseCards("As Ks Ad Kd 7h 2c"));
    expect(hand.category).toBe(HandCategory.TwoPair);
  });

  it("finds the best 5-card hand among 7 cards (river)", () => {
    // Hole: As Ks. Board: Ad Kd Ah 7h 2c — best is full house AAA KK
    const hand = evaluateBest(parseCards("As Ks Ad Kd Ah 7h 2c"));
    expect(hand.category).toBe(HandCategory.FullHouse);
  });

  it("correctly prefers four of a kind over a full house also present in the same cards", () => {
    // All 4 Aces (quads) plus three Kings — a full house (AAA KK) is
    // technically achievable from a subset of these same 7 cards, but
    // four of a kind is stronger and must be what evaluateBest picks.
    const hand = evaluateBest(parseCards("As Ad Ac Ah Ks Kd Kh"));
    expect(hand.category).toBe(HandCategory.FourOfAKind);
  });

  it("throws if given fewer than 5 cards", () => {
    expect(() => evaluateBest(parseCards("As Kd Qh"))).toThrow();
  });
});