import { parseCards } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { classifyBoardTexture } from "./boardTexture.js";

describe("classifyBoardTexture — suit texture", () => {
  it("classifies all-same-suit as monotone", () => {
    const result = classifyBoardTexture(parseCards("As Ks 7s"));
    expect(result.suitTexture).toBe("monotone");
  });

  it("classifies two of one suit as two_tone", () => {
    const result = classifyBoardTexture(parseCards("As Ks 7h"));
    expect(result.suitTexture).toBe("two_tone");
  });

  it("classifies three different suits as rainbow", () => {
    const result = classifyBoardTexture(parseCards("As Kh 7d"));
    expect(result.suitTexture).toBe("rainbow");
  });
});

describe("classifyBoardTexture — pair texture", () => {
  it("classifies a board with no repeated rank as unpaired", () => {
    const result = classifyBoardTexture(parseCards("As Kh 7d"));
    expect(result.pairTexture).toBe("unpaired");
  });

  it("classifies a board with exactly one repeated rank as paired", () => {
    const result = classifyBoardTexture(parseCards("As Ah 7d"));
    expect(result.pairTexture).toBe("paired");
  });

  it("classifies a board with three of a rank as trips_plus", () => {
    const result = classifyBoardTexture(parseCards("As Ah Ad"));
    expect(result.pairTexture).toBe("trips_plus");
  });
});

describe("classifyBoardTexture — connectivity", () => {
  it("classifies widely spread ranks as disconnected", () => {
    // 2, 8, K -- no two ranks within 4 of each other
    const result = classifyBoardTexture(parseCards("2h 8d Ks"));
    expect(result.connectivity).toBe("disconnected");
  });

  it("classifies tightly consecutive ranks as highly_connected", () => {
    // 7, 8, 9 -- every pair is within 4
    const result = classifyBoardTexture(parseCards("7h 8d 9s"));
    expect(result.connectivity).toBe("highly_connected");
  });
});

describe("classifyBoardTexture — overall wetness, classic examples", () => {
  it("a monotone, connected board is clearly wet (e.g. 7-8-9 all spades)", () => {
    const result = classifyBoardTexture(parseCards("7s 8s 9s"));
    expect(result.overall).toBe("wet");
  });

  it("a rainbow, disconnected, unpaired board is clearly dry (e.g. K-7-2 rainbow)", () => {
    const result = classifyBoardTexture(parseCards("Kh 7d 2c"));
    expect(result.overall).toBe("dry");
  });

  it("a paired rainbow disconnected board is dry, not wet", () => {
    // pairing further reduces wetness in our model
    const result = classifyBoardTexture(parseCards("Kh Kd 2c"));
    expect(result.overall).toBe("dry");
  });
});

describe("classifyBoardTexture — input validation", () => {
  it("throws on a 2-card board (preflop, no board yet)", () => {
    expect(() => classifyBoardTexture(parseCards("As Kh"))).toThrow();
  });

  it("throws on more than 5 cards", () => {
    expect(() => classifyBoardTexture(parseCards("As Kh 7d 2c 9s 3h"))).toThrow();
  });

  it("accepts a 4-card (turn) and 5-card (river) board without throwing", () => {
    expect(() => classifyBoardTexture(parseCards("As Kh 7d 2c"))).not.toThrow();
    expect(() => classifyBoardTexture(parseCards("As Kh 7d 2c 9s"))).not.toThrow();
  });
});