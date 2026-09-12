import { parseCards } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { detectComboDraw } from "./comboDraws.js";

describe("detectComboDraw", () => {
  it("detects a combo draw and correctly deduplicates overlapping outs", () => {
    const hole = parseCards("8s 9s");
    const board = parseCards("Ts Js 2h");
    const result = detectComboDraw(hole, board);

    expect(result.isComboDraw).toBe(true);
    expect(result.hasFlushDraw).toBe(true);
    expect(result.hasStraightDraw).toBe(true);
    // 9 flush outs + 8 straight outs - 2 overlapping (7s, Qs) = 15
    expect(result.count).toBe(15);
  });

  it("the overlapping cards (7s and Qs) each appear exactly once in outs", () => {
    const hole = parseCards("8s 9s");
    const board = parseCards("Ts Js 2h");
    const result = detectComboDraw(hole, board);

    const sevenOfSpades = result.outs.filter((c) => c.rank === 7 && c.suit === "s");
    const queenOfSpades = result.outs.filter((c) => c.rank === 12 && c.suit === "s");
    expect(sevenOfSpades.length).toBe(1);
    expect(queenOfSpades.length).toBe(1);
  });

  it("is not a combo draw with only a flush draw and no straight draw", () => {
    const hole = parseCards("As Ks");
    const board = parseCards("7s 4s 2h");
    const result = detectComboDraw(hole, board);
    expect(result.isComboDraw).toBe(false);
    expect(result.hasFlushDraw).toBe(true);
    expect(result.hasStraightDraw).toBe(false);
    expect(result.count).toBe(0);
  });

  it("is not a combo draw with only a straight draw and no flush draw", () => {
    const hole = parseCards("6h 7d");
    const board = parseCards("8s 9c 2h");
    const result = detectComboDraw(hole, board);
    expect(result.isComboDraw).toBe(false);
    expect(result.hasFlushDraw).toBe(false);
    expect(result.hasStraightDraw).toBe(true);
    expect(result.count).toBe(0);
  });

  it("is not a combo draw with neither draw present", () => {
    const hole = parseCards("Ah 2d");
    const board = parseCards("9s Kc 5h");
    const result = detectComboDraw(hole, board);
    expect(result.isComboDraw).toBe(false);
    expect(result.count).toBe(0);
  });
});