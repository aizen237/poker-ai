import { describe, expect, it } from "vitest";
import { assembleGameState, type RawTableInput } from "./gameState.js";

function realisticRawInput(): RawTableInput {
  return {
    potMainValueText: "45",
    potTotalValueText: "45",
    boardCards: [
      { valueText: "10", suitText: "h" },
      { valueText: "5", suitText: "h" },
      { valueText: "10", suitText: "s" },
    ],
    seats: [
      {
        seatNumber: 1,
        isOccupied: true,
        isYou: true,
        playerNameText: "aizen29",
        stackText: "197",
        statusClasses: ["decision-current"],
        holeCardClassLists: [
          ["card-container", "card-s", "card-s-5", "flipped", "card-p1"],
          ["card-container", "card-h", "card-s-4", "flipped", "card-p2"],
        ],
      },
      {
        seatNumber: 2,
        isOccupied: true,
        isYou: false,
        playerNameText: "Talion",
        stackText: "198",
        statusClasses: ["fold"],
        // Opponent's hole cards, not flipped -- hidden, no rank/suit classes.
        holeCardClassLists: [
          ["card-container", "card-p1", "med"],
          ["card-container", "card-p2", "med"],
        ],
      },
      {
        seatNumber: 3,
        isOccupied: true,
        isYou: false,
        playerNameText: "fc6666",
        stackText: "585",
        statusClasses: ["offline"],
        holeCardClassLists: [
          ["card-container", "card-p1", "med"],
          ["card-container", "card-p2", "med"],
        ],
      },
      {
        seatNumber: 4,
        isOccupied: false,
        isYou: false,
        playerNameText: null,
        stackText: null,
        statusClasses: [],
        holeCardClassLists: [],
      },
    ],
  };
}

describe("assembleGameState — realistic end-to-end scenario", () => {
  it("correctly derives the street from board card count (3 cards = flop)", () => {
    const result = assembleGameState(realisticRawInput());
    expect(result.street).toBe("flop");
    expect(result.board).toHaveLength(3);
  });

  it("parses the board cards correctly", () => {
    const result = assembleGameState(realisticRawInput());
    expect(result.board).toEqual([
      { rank: 10, suit: "h" },
      { rank: 5, suit: "h" },
      { rank: 10, suit: "s" },
    ]);
  });

  it("parses pot values correctly", () => {
    const result = assembleGameState(realisticRawInput());
    expect(result.potMainValue).toBe(45);
    expect(result.potTotalValue).toBe(45);
  });

  it("identifies hero's seat and reveals hero's hole cards", () => {
    const result = assembleGameState(realisticRawInput());
    const hero = result.seats.find((s) => s.isYou);
    expect(hero).toBeDefined();
    expect(hero!.seatNumber).toBe(1);
    expect(hero!.holeCards).toEqual([
      { rank: 5, suit: "s" },
      { rank: 4, suit: "h" },
    ]);
    expect(hero!.isCurrentToAct).toBe(true);
  });

  it("does NOT reveal opponent hole cards that are not flipped (per Rule 5, no guessing hidden cards)", () => {
    const result = assembleGameState(realisticRawInput());
    const talion = result.seats.find((s) => s.playerName === "Talion");
    const fc6666 = result.seats.find((s) => s.playerName === "fc6666");
    expect(talion!.holeCards).toEqual([]);
    expect(fc6666!.holeCards).toEqual([]);
  });

  it("correctly identifies folded and offline seats", () => {
    const result = assembleGameState(realisticRawInput());
    const talion = result.seats.find((s) => s.playerName === "Talion");
    const fc6666 = result.seats.find((s) => s.playerName === "fc6666");
    expect(talion!.isFolded).toBe(true);
    expect(fc6666!.isOffline).toBe(true);
  });

  it("correctly represents an empty seat", () => {
    const result = assembleGameState(realisticRawInput());
    const emptySeat = result.seats.find((s) => s.seatNumber === 4);
    expect(emptySeat!.isOccupied).toBe(false);
    expect(emptySeat!.playerName).toBeNull();
    expect(emptySeat!.stack).toBeNull();
    expect(emptySeat!.holeCards).toEqual([]);
  });

  it("preserves seat count and order", () => {
    const result = assembleGameState(realisticRawInput());
    expect(result.seats).toHaveLength(4);
    expect(result.seats.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4]);
  });
});

describe("assembleGameState — street derivation edge cases", () => {
  it("derives preflop with zero board cards", () => {
    const raw = realisticRawInput();
    raw.boardCards = [];
    expect(assembleGameState(raw).street).toBe("preflop");
  });

  it("derives turn with 4 board cards", () => {
    const raw = realisticRawInput();
    raw.boardCards.push({ valueText: "K", suitText: "d" });
    expect(assembleGameState(raw).street).toBe("turn");
  });

  it("derives river with 5 board cards", () => {
    const raw = realisticRawInput();
    raw.boardCards.push({ valueText: "K", suitText: "d" }, { valueText: "2", suitText: "c" });
    expect(assembleGameState(raw).street).toBe("river");
  });

  it("throws on an impossible board card count (e.g. 2 cards)", () => {
    const raw = realisticRawInput();
    raw.boardCards = raw.boardCards.slice(0, 2);
    expect(() => assembleGameState(raw)).toThrow();
  });
});