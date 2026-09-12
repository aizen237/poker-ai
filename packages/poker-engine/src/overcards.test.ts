import { parseCards } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { detectOvercards } from "./overcards.js";

describe("detectOvercards", () => {
  it("detects two overcards when both hole cards beat the board", () => {
    // As Ks vs 9-7-2 board: both A and K are higher than the 9.
    const hole = parseCards("As Ks");
    const board = parseCards("9h 7d 2c");
    const result = detectOvercards(hole, board);
    expect(result.overcardCount).toBe(2);
    expect(result.outs.length).toBe(6); // 3 remaining Aces + 3 remaining Kings
  });

  it("detects exactly one overcard when only one hole card beats the board", () => {
    // As 8s vs 9-7-2 board: A beats the 9, but 8 does not.
    const hole = parseCards("As 8s");
    const board = parseCards("9h 7d 2c");
    const result = detectOvercards(hole, board);
    expect(result.overcardCount).toBe(1);
    expect(result.overcards).toEqual([{ rank: 14, suit: "s" }]);
    expect(result.outs.length).toBe(3); // 3 remaining Aces only
  });

  it("detects zero overcards when the board is higher than both hole cards", () => {
    const hole = parseCards("8s 7h");
    const board = parseCards("Ah Kd 2c");
    const result = detectOvercards(hole, board);
    expect(result.overcardCount).toBe(0);
    expect(result.outs.length).toBe(0);
  });

  it("a pocket pair correctly compares against the board, not against itself", () => {
    // Pocket Jacks (JJ) vs a 9-7-2 board: both Jacks individually rank
    // higher than the board's highest card (9), so this is 2 overcards
    // to the board -- notably, pairing "an overcard" here doesn't apply
    // the same way since hero already has a pair, but the function's job
    // is just to compare ranks against the board, not to judge whether
    // hero already has a made hand.
    const hole = parseCards("Jh Jd");
    const board = parseCards("9h 7d 2c");
    const result = detectOvercards(hole, board);
    expect(result.overcardCount).toBe(2);
  });

  it("a pocket pair lower than the board's top card has zero overcards", () => {
    const hole = parseCards("6h 6d");
    const board = parseCards("9h 7d 2c");
    const result = detectOvercards(hole, board);
    expect(result.overcardCount).toBe(0);
  });

  it("throws if hole cards is not exactly 2", () => {
    expect(() => detectOvercards(parseCards("As"), parseCards("9h 7d 2c"))).toThrow();
  });

  it("throws if board has fewer than 3 cards", () => {
    expect(() => detectOvercards(parseCards("As Ks"), parseCards("9h"))).toThrow();
  });
});