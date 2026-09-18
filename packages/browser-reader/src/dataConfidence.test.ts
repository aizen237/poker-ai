import { describe, expect, it } from "vitest";
import { computeDataConfidence, type ConfidenceContext } from "./dataConfidence.js";
import type { PokerGameState, SeatState } from "./gameState.js";

function heroSeat(overrides: Partial<SeatState> = {}): SeatState {
  return {
    seatNumber: 1,
    isOccupied: true,
    isYou: true,
    playerName: "hero",
    stack: 150,
    isFolded: false,
    isCurrentToAct: true,
    isOffline: false,
    holeCards: [
      { rank: 14, suit: "s" },
      { rank: 13, suit: "s" },
    ],
    currentBet: null,
    ...overrides,
  };
}

function opponentSeat(overrides: Partial<SeatState> = {}): SeatState {
  return {
    seatNumber: 2,
    isOccupied: true,
    isYou: false,
    playerName: "villain",
    stack: 200,
    isFolded: false,
    isCurrentToAct: false,
    isOffline: false,
    holeCards: [],
    currentBet: null,
    ...overrides,
  };
}

function validState(overrides: Partial<PokerGameState> = {}): PokerGameState {
  return {
    seats: [heroSeat(), opponentSeat()],
    board: [
      { rank: 7, suit: "h" },
      { rank: 4, suit: "d" },
      { rank: 2, suit: "c" },
    ],
    potMainValue: 20,
    potTotalValue: 20,
    street: "flop",
    ...overrides,
  };
}

function validContext(overrides: Partial<ConfidenceContext> = {}): ConfidenceContext {
  return {
    amountToCall: 5,
    bigBlindWasDefaulted: false,
    isPositionKnown: true,
    ...overrides,
  };
}

describe("computeDataConfidence — high confidence", () => {
  it("returns high for a complete, consistent state with known position", () => {
    const result = computeDataConfidence(validState(), validContext());
    expect(result.level).toBe("high");
    expect(result.reasons).toEqual([]);
  });

  it("returns high on preflop with an empty board", () => {
    const state = validState({ street: "preflop", board: [] });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("high");
  });

  it("returns high on the river with a full board", () => {
    const state = validState({
      street: "river",
      board: [
        { rank: 7, suit: "h" },
        { rank: 4, suit: "d" },
        { rank: 2, suit: "c" },
        { rank: 9, suit: "s" },
        { rank: 11, suit: "h" },
      ],
    });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("high");
  });

  it("returns high when amountToCall is 0 (checked around)", () => {
    const result = computeDataConfidence(validState(), validContext({ amountToCall: 0 }));
    expect(result.level).toBe("high");
  });
});

describe("computeDataConfidence — low confidence (critical data missing/invalid)", () => {
  it("returns low when hero seat is missing", () => {
    const state = validState({ seats: [opponentSeat()] });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("hero seat not found");
  });

  it("returns low when hero has fewer than 2 hole cards", () => {
    const state = validState({
      seats: [heroSeat({ holeCards: [{ rank: 14, suit: "s" }] }), opponentSeat()],
    });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("hole cards incomplete");
  });

  it("returns low when hero stack is null", () => {
    const state = validState({ seats: [heroSeat({ stack: null }), opponentSeat()] });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("hero stack");
  });

  it("returns low when hero stack is negative", () => {
    const state = validState({ seats: [heroSeat({ stack: -5 }), opponentSeat()] });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("low");
  });

  it("returns low when hero has already folded", () => {
    const state = validState({ seats: [heroSeat({ isFolded: true }), opponentSeat()] });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("already folded");
  });

  it("returns low when it is not hero's turn", () => {
    const state = validState({ seats: [heroSeat({ isCurrentToAct: false }), opponentSeat()] });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("not hero's turn");
  });

  it("returns low when hero is offline", () => {
    const state = validState({ seats: [heroSeat({ isOffline: true }), opponentSeat()] });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("hero is showing as offline");
  });

  it("returns low when no active opponents remain", () => {
    const state = validState({ seats: [heroSeat(), opponentSeat({ isFolded: true })] });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("no active opponents");
  });

  it("returns low when the pot value is negative", () => {
    const result = computeDataConfidence(validState({ potMainValue: -1 }), validContext());
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("pot value");
  });

  it("returns low when amountToCall is negative", () => {
    const result = computeDataConfidence(validState(), validContext({ amountToCall: -5 }));
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("amount-to-call");
  });

  it("returns low when the big blind could not be read", () => {
    const result = computeDataConfidence(validState(), validContext({ bigBlindWasDefaulted: true }));
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("big blind could not be read");
  });
});

describe("computeDataConfidence — low confidence (contradictory state)", () => {
  it("returns low when board count doesn't match a preflop street", () => {
    const state = validState({ street: "preflop", board: [{ rank: 7, suit: "h" }] });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("does not match street");
  });

  it("returns low when board count doesn't match a flop street", () => {
    const state = validState({
      street: "flop",
      board: [
        { rank: 7, suit: "h" },
        { rank: 4, suit: "d" },
      ],
    });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("low");
  });

  it("returns low when board count doesn't match a river street", () => {
    const state = validState({
      street: "river",
      board: [
        { rank: 7, suit: "h" },
        { rank: 4, suit: "d" },
        { rank: 2, suit: "c" },
      ],
    });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("low");
  });
});

describe("computeDataConfidence — medium confidence (non-critical uncertainty)", () => {
  it("returns medium when hero's real position is not yet known", () => {
    const result = computeDataConfidence(validState(), validContext({ isPositionKnown: false }));
    expect(result.level).toBe("medium");
    expect(result.reasons.join(" ")).toContain("position is not yet known");
  });

  it("returns medium when an active opponent is offline", () => {
    const state = validState({ seats: [heroSeat(), opponentSeat({ isOffline: true })] });
    const result = computeDataConfidence(state, validContext());
    expect(result.level).toBe("medium");
    expect(result.reasons.join(" ")).toContain("opponent is showing as offline");
  });

  it("does not flag a folded opponent's offline status", () => {
    const state = validState({
      seats: [
        heroSeat(),
        opponentSeat({ seatNumber: 2, isFolded: true, isOffline: true }),
        opponentSeat({ seatNumber: 3 }),
      ],
    });
    const result = computeDataConfidence(state, validContext());
    // The offline opponent already folded, so they're not "active" -- with
    // position known and a live second opponent, this should be high.
    expect(result.level).toBe("high");
  });
});

describe("computeDataConfidence — critical takes priority over uncertain", () => {
  it("returns low, not medium, when both a critical and a non-critical issue are present", () => {
    const state = validState({ seats: [heroSeat({ isFolded: true }), opponentSeat()] });
    const result = computeDataConfidence(state, validContext({ isPositionKnown: false }));
    expect(result.level).toBe("low");
  });
});