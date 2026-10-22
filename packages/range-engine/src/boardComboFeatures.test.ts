import { parseCards, type Card } from "@poker-ai/shared";
import { HandCategory } from "@poker-ai/poker-engine";
import { describe, expect, it } from "vitest";
import { describeBoardCombo, describeBoardRange } from "./boardComboFeatures.js";
import { createComboRange } from "./comboRange.js";

const pair = (s: string) => parseCards(s) as [Card, Card];
const features = (hole: string, board: string, dead = "") => describeBoardCombo(pair(hole), parseCards(board), parseCards(dead));

describe("offline physical board features (no action probabilities)", () => {
  it.each([
    ["As Qh", "2c 7d 9s", HandCategory.HighCard],
    ["As Ah", "2c 7d 9s", HandCategory.Pair],
    ["As 7h", "Ac 7d 9s", HandCategory.TwoPair],
    ["As Ah", "Ac 7d 9s", HandCategory.ThreeOfAKind],
    ["As 2h", "3c 4d 5s", HandCategory.Straight],
    ["As Qs", "2s 7s 9s", HandCategory.Flush],
    ["As Ah", "Ac 7d 7s", HandCategory.FullHouse],
    ["As Ah", "Ac Ad 9s", HandCategory.FourOfAKind],
    ["As 2s", "3s 4s 5s", HandCategory.StraightFlush],
  ])("identifies %s on %s independently", (hole, board, category) => {
    expect(features(hole as string, board as string).made.category).toBe(category);
  });

  it("distinguishes board-only hands and kicker contributions on the river", () => {
    const boardOnly = features("2c 3d", "As Ks Qs Js Ts");
    expect(boardOnly.made).toMatchObject({ category: HandCategory.StraightFlush, playsBoard: true, minHoleCardsUsed: 0, maxHoleCardsUsed: 0 });
    const kicker = features("Ac 3d", "Ks Kh Qs Qh 2s");
    expect(kicker.made).toMatchObject({ category: HandCategory.TwoPair, playsBoard: false, tiebreakers: [13, 12, 14], minHoleCardsUsed: 1 });
    expect(features("Ac 3d", "As Kh Qs Jh Tc").made).toMatchObject({ playsBoard: true, minHoleCardsUsed: 0, maxHoleCardsUsed: 1 });
  });

  it("describes pocket/board rank interactions without confusing trips and sets", () => {
    expect(features("Kh Kd", "2s 7h 9d").interaction).toMatchObject({ pocketPair: true, overpair: true, overcards: 2 });
    expect(features("Kh 2d", "Ks Kc 9d").interaction).toMatchObject({ pocketPair: false, matchedBoardRanks: [13] });
    expect(features("Kh Kd", "Ks 2c 9d").interaction).toMatchObject({ pocketPair: true, overpair: false, matchedBoardRanks: [13] });
    expect(features("Kh 2d", "Ks Kc 9d").board.rankCounts[0]).toEqual({ rank: 13, count: 2 });
  });

  it("provides exact straight completion ranks for open ends, double gutshots and wheels", () => {
    expect([...features("6h 7d", "8s 9c 2h").draws.straight.completingRanks].sort((a, b) => a - b)).toEqual([5, 10]);
    expect([...features("7h 9d", "Js 5c 8s").draws.straight.completingRanks].sort((a, b) => a - b)).toEqual([6, 10]);
    expect(features("Ah 2d", "3s 4c 9h").draws.straight.completingRanks).toEqual([5]);
    expect(features("Ah 2d", "3s 4c 5h").draws.straight.completingRanks).toEqual([]);
  });

  it("counts physical completion union once and removes authoritative dead cards", () => {
    const f = features("6s 7s", "8s 9h 2s", "Ts 5s");
    expect(f.draws.flush.completionCards).toHaveLength(7);
    expect(f.draws.straight.completionCards).toHaveLength(6);
    // 9 flush + 8 straight - 2 overlaps - 2 known overlap cards = 13.
    expect(f.draws.completionUnion).toHaveLength(13);
    expect(f.draws.flush.holeCardsOfSuit).toBe(2);
  });

  it("keeps board-only turn draws separate from hole-card contribution", () => {
    const f = features("As Kd", "5s 6h 7d 8c");
    expect(f.draws.straight.boardOnlyCompletingRanks).toEqual(f.draws.straight.completingRanks);
    const flush = features("Ah Kd", "2s 5s 8s Ts");
    expect(flush.draws.flush.completionCards).toHaveLength(9);
    expect(flush.draws.flush.holeCardsOfSuit).toBe(0);
  });

  it("exposes runner-runner requirements only on flop and no draws on river", () => {
    expect(features("Ah Kh", "Qh 7c 2s").draws.backdoorFlushSuits).toEqual(["h"]);
    expect(features("Ah Kh", "Qh 7c 2s").draws.backdoorStraightRankPairs).toContainEqual([10, 11]);
    const turn = features("Ah Kh", "Qh 7c 2s 3d");
    expect(turn.draws.backdoorFlushSuits).toEqual([]);
    expect(turn.draws.backdoorStraightRankPairs).toEqual([]);
    const river = features("As Ks", "2s 7s 9h Td Jc");
    expect(river.draws).toMatchObject({ completionUnion: [], backdoorFlushSuits: [], backdoorStraightRankPairs: [],
      flush: { suit: null, completionCards: [] }, straight: { completingRanks: [], completionCards: [] } });
  });

  it("reports precise suit removal blockers without claiming strategic effects", () => {
    const f = features("As Qh", "2s 7s 9s");
    expect(f.blockers[0]).toEqual({ suit: "s", boardCount: 3, heldRanks: [14], highestRankNotOnBoard: 14 });
    expect(features("Ks Qh", "As 7s 9s").blockers[0]!.highestRankNotOnBoard).toBe(13);
    expect(f).not.toHaveProperty("likelihood");
  });

  it("validates cards and freezes independent results while removing blocked combos", () => {
    expect(() => features("As As", "2s 7s 9s")).toThrow("Duplicate");
    expect(() => features("As Qs", "As 7s 9s")).toThrow("Duplicate");
    expect(() => features("As Qs", "2s 7s")).toThrow("board");
    expect(() => features("As Qs", "2s 7s 9s", "Qs")).toThrow("Duplicate");
    const hole = pair("As Qs"), board = parseCards("2s 7s 9s");
    const range = createComboRange([{ cards: hole, weight: 1 }, { cards: pair("Kh Qh"), weight: 1 }]);
    const result = describeBoardRange(range, pair("Kh Kd"), board);
    expect(result).toHaveLength(1);
    expect(Object.isFrozen(result[0]!.made.tiebreakers)).toBe(true);
    hole[0].rank = 2;
    expect(result[0]!.made.tiebreakers[0]).toBe(14);
  });
});
