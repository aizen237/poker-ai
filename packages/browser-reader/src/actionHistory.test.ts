import { describe, expect, it } from "vitest";
import { emptyActionHistory, updateActionHistory, type ActionHistory } from "./actionHistory.js";
import type { PokerGameState, SeatState } from "./gameState.js";

function heroSeat(overrides: Partial<SeatState> = {}): SeatState {
  return {
    seatNumber: 1,
    isOccupied: true,
    isYou: true,
    playerName: "hero",
    stack: 150,
    isFolded: false,
    isCurrentToAct: false,
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

function stateWith(overrides: Partial<PokerGameState> = {}): PokerGameState {
  return {
    seats: [heroSeat(), opponentSeat()],
    board: [],
    potMainValue: 3,
    potTotalValue: 3,
    street: "preflop",
    ...overrides,
  };
}

describe("updateActionHistory — new hand detection", () => {
  it("starts empty when there is no previous state", () => {
    const result = updateActionHistory(emptyActionHistory(), null, stateWith());
    expect(result.size).toBe(0);
  });

  it("resets history when hero's hole cards change (new hand)", () => {
    const previous = stateWith();
    const withHistory: ActionHistory = new Map([[2, [{ street: "preflop" as const, action: "raise" as const }]]]);
    const nextHandState = stateWith({
      seats: [
        heroSeat({
          holeCards: [
            { rank: 2, suit: "c" },
            { rank: 3, suit: "d" },
          ],
        }),
        opponentSeat(),
      ],
    });
    const result = updateActionHistory(withHistory, previous, nextHandState);
    expect(result.size).toBe(0);
  });
});

describe("updateActionHistory — detecting actions", () => {
  it("detects a fold", () => {
    const previous = stateWith({ seats: [heroSeat(), opponentSeat({ isFolded: false })] });
    const current = stateWith({ seats: [heroSeat(), opponentSeat({ isFolded: true })] });
    const result = updateActionHistory(emptyActionHistory(), previous, current);
    expect(result.get(2)).toEqual([{ street: "preflop", action: "fold" }]);
  });

  it("detects an opening raise (first bet of the street)", () => {
    const previous = stateWith({ seats: [heroSeat(), opponentSeat({ currentBet: null })] });
    const current = stateWith({ seats: [heroSeat(), opponentSeat({ currentBet: 6 })] });
    const result = updateActionHistory(emptyActionHistory(), previous, current);
    expect(result.get(2)).toEqual([{ street: "preflop", action: "raise" }]);
  });

  it("detects a call (matching the current highest bet)", () => {
    const previous = stateWith({
      seats: [heroSeat({ currentBet: 6 }), opponentSeat({ currentBet: null })],
    });
    const current = stateWith({
      seats: [heroSeat({ currentBet: 6 }), opponentSeat({ currentBet: 6 })],
    });
    const result = updateActionHistory(emptyActionHistory(), previous, current);
    expect(result.get(2)).toEqual([{ street: "preflop", action: "call" }]);
  });

  it("detects a raise (exceeding the current highest bet)", () => {
    const previous = stateWith({
      seats: [heroSeat({ currentBet: 6 }), opponentSeat({ currentBet: null })],
    });
    const current = stateWith({
      seats: [heroSeat({ currentBet: 6 }), opponentSeat({ currentBet: 18 })],
    });
    const result = updateActionHistory(emptyActionHistory(), previous, current);
    expect(result.get(2)).toEqual([{ street: "preflop", action: "raise" }]);
  });

  it("accumulates actions across multiple ticks within the same hand", () => {
    let history = emptyActionHistory();
    const tick1Prev = stateWith({ seats: [heroSeat(), opponentSeat({ currentBet: null })] });
    const tick1Curr = stateWith({ seats: [heroSeat(), opponentSeat({ currentBet: 6 })] });
    history = updateActionHistory(history, tick1Prev, tick1Curr);

    // New street: bets reset to null for everyone first (a realistic
    // intermediate tick), then hero bets, then the opponent calls --
    // each its own tick, since a single tick can only capture one
    // action per seat (documented limitation).
    const flopReset = stateWith({
      street: "flop",
      board: [
        { rank: 7, suit: "h" },
        { rank: 4, suit: "d" },
        { rank: 2, suit: "c" },
      ],
      seats: [heroSeat({ currentBet: null }), opponentSeat({ currentBet: null })],
    });
    history = updateActionHistory(history, tick1Curr, flopReset);

    const heroBets = stateWith({
      street: "flop",
      board: [
        { rank: 7, suit: "h" },
        { rank: 4, suit: "d" },
        { rank: 2, suit: "c" },
      ],
      seats: [heroSeat({ currentBet: 10 }), opponentSeat({ currentBet: null })],
    });
    history = updateActionHistory(history, flopReset, heroBets);

    const opponentCalls = stateWith({
      street: "flop",
      board: [
        { rank: 7, suit: "h" },
        { rank: 4, suit: "d" },
        { rank: 2, suit: "c" },
      ],
      seats: [heroSeat({ currentBet: 10 }), opponentSeat({ currentBet: 10 })],
    });
    history = updateActionHistory(history, heroBets, opponentCalls);

    expect(history.get(2)).toEqual([
      { street: "preflop", action: "raise" },
      { street: "flop", action: "call" },
    ]);
  });

  it("accumulates across streets even though currentBet resets to null between streets", () => {
    let history = emptyActionHistory();
    const preflopPrev = stateWith({ seats: [heroSeat(), opponentSeat({ currentBet: null })] });
    const preflopCurr = stateWith({ seats: [heroSeat(), opponentSeat({ currentBet: 6 })] });
    history = updateActionHistory(history, preflopPrev, preflopCurr);

    const flopReset = stateWith({
      street: "flop",
      board: [
        { rank: 7, suit: "h" },
        { rank: 4, suit: "d" },
        { rank: 2, suit: "c" },
      ],
      seats: [heroSeat({ currentBet: null }), opponentSeat({ currentBet: null })],
    });
    history = updateActionHistory(history, preflopCurr, flopReset);
    expect(history.get(2)).toEqual([{ street: "preflop", action: "raise" }]);

    const flopBet = stateWith({
      street: "flop",
      board: [
        { rank: 7, suit: "h" },
        { rank: 4, suit: "d" },
        { rank: 2, suit: "c" },
      ],
      seats: [heroSeat({ currentBet: null }), opponentSeat({ currentBet: 8 })],
    });
    history = updateActionHistory(history, flopReset, flopBet);
    expect(history.get(2)).toEqual([
      { street: "preflop", action: "raise" },
      { street: "flop", action: "raise" },
    ]);
  });

  it("does not track hero's own actions", () => {
    const previous = stateWith({ seats: [heroSeat({ currentBet: null }), opponentSeat()] });
    const current = stateWith({ seats: [heroSeat({ currentBet: 6 }), opponentSeat()] });
    const result = updateActionHistory(emptyActionHistory(), previous, current);
    expect(result.size).toBe(0);
  });

  it("ignores a seat that only just became occupied (no prior seat to diff against)", () => {
    const previous = stateWith({
      seats: [
        heroSeat(),
        { ...opponentSeat(), isOccupied: false, playerName: null, stack: null },
      ],
    });
    const current = stateWith({ seats: [heroSeat(), opponentSeat({ currentBet: 6 })] });
    const result = updateActionHistory(emptyActionHistory(), previous, current);
    expect(result.size).toBe(0);
  });
});