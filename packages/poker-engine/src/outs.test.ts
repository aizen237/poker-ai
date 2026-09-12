import { parseCards } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { calculateOuts } from "./outs.js";

describe("calculateOuts", () => {
  it("pocket Kings on a dry board: 2 outs to trips + 9 outs to two pair = 11", () => {
    const hole = parseCards("Kh Kd");
    const board = parseCards("7s 4c 2h");
    const result = calculateOuts(hole, board);
    expect(result.count).toBe(11);
  });

  it("cross-checks against the flush-draw scenario: pairing outs + flush outs, no double-counting the overlap card", () => {
    const hole = parseCards("As Ks");
    const board = parseCards("7s 4s 2h");
    const result = calculateOuts(hole, board);
    expect(result.count).toBe(23);
  });

  it("returns actual Card objects, none of which are already known", () => {
    const hole = parseCards("Kh Kd");
    const board = parseCards("7s 4c 2h");
    const result = calculateOuts(hole, board);
    const known = new Set([...hole, ...board].map((c) => `${c.rank}${c.suit}`));
    for (const card of result.outs) {
      expect(known.has(`${card.rank}${card.suit}`)).toBe(false);
    }
    expect(result.outs.length).toBe(result.count);
  });

  it("throws on a river-complete (5-card) board — there is no next card to count outs for", () => {
    const hole = parseCards("Kh Kd");
    const board = parseCards("7s 4c 2h 9d 3s");
    expect(() => calculateOuts(hole, board)).toThrow();
  });

  it("throws on a preflop (0-card) board", () => {
    const hole = parseCards("Kh Kd");
    expect(() => calculateOuts(hole, [])).toThrow();
  });

  it("throws if hole cards is not exactly 2", () => {
    expect(() => calculateOuts(parseCards("Kh"), parseCards("7s 4c 2h"))).toThrow();
  });
});