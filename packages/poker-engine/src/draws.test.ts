import { parseCards } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { detectFlushDraw, detectStraightDraw } from "./draws.js";

describe("detectFlushDraw", () => {
  it("detects a flush draw with exactly 4 of a suit", () => {
    const hole = parseCards("As Ks");
    const board = parseCards("7s 4s 2h");
    const result = detectFlushDraw(hole, board);
    expect(result.hasFlushDraw).toBe(true);
    expect(result.suit).toBe("s");
    expect(result.outs).toBe(9);
  });

  it("does not report a flush draw with only 3 of a suit", () => {
    const hole = parseCards("As Ks");
    const board = parseCards("7s 4h 2h");
    const result = detectFlushDraw(hole, board);
    expect(result.hasFlushDraw).toBe(false);
  });

  it("does not report a flush draw when the flush is already made (5 of a suit)", () => {
    const hole = parseCards("As Ks");
    const board = parseCards("7s 4s 2s");
    const result = detectFlushDraw(hole, board);
    expect(result.hasFlushDraw).toBe(false);
  });
});

describe("detectStraightDraw — open-ended", () => {
  it("detects a classic OESD: 6-7-8-9 needs a 5 or a 10", () => {
    const hole = parseCards("6h 7d");
    const board = parseCards("8s 9c 2h");
    const result = detectStraightDraw(hole, board);
    expect(result.kind).toBe("open_ended");
    expect(result.outs).toBe(8);
    expect(result.completingRanks.sort((a, b) => a - b)).toEqual([5, 10]);
  });

  it("a wheel-adjacent draw 2-3-4-5 is NOT open-ended (no rank below 2 exists, only the Ace completes it high side... actually only a 6 or an Ace completes it)", () => {
    // 2-3-4-5 needs a 6 (high side) OR an Ace (low side, forming the wheel A-2-3-4-5).
    // Both exist on a real deck, so this genuinely IS a two-sided/open-ended-style draw.
    const hole = parseCards("2h 3d");
    const board = parseCards("4s 5c 9h");
    const result = detectStraightDraw(hole, board);
    expect(result.kind).toBe("open_ended");
    expect(result.completingRanks.sort((a, b) => a - b)).toEqual([6, 14]);
  });

  it("a true dead-end near broadway (J-Q-K-A) is a gutshot, not open-ended (no rank above Ace)", () => {
    const hole = parseCards("Jh Qd");
    const board = parseCards("Ks Ac 2h");
    const result = detectStraightDraw(hole, board);
    expect(result.kind).toBe("gutshot");
    expect(result.outs).toBe(4);
    expect(result.completingRanks).toEqual([10]);
  });
});

describe("detectStraightDraw — gutshot", () => {
  it("detects a classic gutshot: 6-7-9-10 needs only an 8", () => {
    const hole = parseCards("6h 7d");
    const board = parseCards("9s Tc 2h");
    const result = detectStraightDraw(hole, board);
    expect(result.kind).toBe("gutshot");
    expect(result.outs).toBe(4);
    expect(result.completingRanks).toEqual([8]);
  });
});

describe("detectStraightDraw — no draw / already made", () => {
  it("reports none when there is no straight draw at all", () => {
    const hole = parseCards("Ah 2d");
    const board = parseCards("9s Kc 5h");
    const result = detectStraightDraw(hole, board);
    expect(result.kind).toBe("none");
    expect(result.outs).toBe(0);
  });

  it("reports none when hero already has a made straight (not a draw)", () => {
    const hole = parseCards("6h 7d");
    const board = parseCards("8s 9c Ts");
    const result = detectStraightDraw(hole, board);
    expect(result.kind).toBe("none");
  });

  it("reports none for a made wheel straight (A-2-3-4-5)", () => {
    const hole = parseCards("Ah 2d");
    const board = parseCards("3s 4c 5h");
    const result = detectStraightDraw(hole, board);
    expect(result.kind).toBe("none");
  });
});