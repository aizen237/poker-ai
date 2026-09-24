import { describe, expect, it } from "vitest";
import { assignPositions } from "./position.js";
import type { SeatState } from "./gameState.js";

function seat(seatNumber: number, overrides: Partial<SeatState> = {}): SeatState {
  return {
    seatNumber,
    isOccupied: true,
    isYou: false,
    playerName: `player${seatNumber}`,
    stack: 100,
    isFolded: false,
    isCurrentToAct: false,
    isOffline: false,
    holeCards: [],
    currentBet: null,
    ...overrides,
  };
}

function unoccupied(seatNumber: number): SeatState {
  return { ...seat(seatNumber), isOccupied: false, playerName: null, stack: null };
}

describe("assignPositions — edge cases", () => {
  it("returns an empty map when no seats are occupied", () => {
    const result = assignPositions([unoccupied(1), unoccupied(2)], 1);
    expect(result.size).toBe(0);
  });

  it("returns an empty map when the dealer's seat number isn't among the occupied seats", () => {
    const result = assignPositions([seat(1), seat(2), seat(3)], 7);
    expect(result.size).toBe(0);
  });

  it("only assigns positions to occupied seats, ignoring gaps", () => {
    const seats = [seat(1), unoccupied(2), seat(3), unoccupied(4), seat(5)];
    const result = assignPositions(seats, 1);
    expect(result.size).toBe(3);
    expect(result.has(2)).toBe(false);
    expect(result.has(4)).toBe(false);
  });

  it("still assigns a position to a folded seat -- position is fixed at hand start", () => {
    const seats = [seat(1), seat(2, { isFolded: true }), seat(3)];
    const result = assignPositions(seats, 1);
    expect(result.has(2)).toBe(true);
  });
});

describe("assignPositions — heads-up (2 seats)", () => {
  it("labels the button seat BTN and the other seat BB, never SB", () => {
    const result = assignPositions([seat(1), seat(4)], 1);
    expect(result.get(1)).toBe("BTN");
    expect(result.get(4)).toBe("BB");
  });
});

describe("assignPositions — 3-handed", () => {
  it("is exactly BTN/SB/BB with no CO/HJ/UTG", () => {
    const result = assignPositions([seat(1), seat(2), seat(3)], 1);
    expect(result.get(1)).toBe("BTN");
    expect(result.get(2)).toBe("SB");
    expect(result.get(3)).toBe("BB");
  });
});

describe("assignPositions — 4-handed", () => {
  it("is BTN/SB/BB/CO", () => {
    const result = assignPositions([seat(1), seat(2), seat(3), seat(4)], 1);
    expect(result.get(1)).toBe("BTN");
    expect(result.get(2)).toBe("SB");
    expect(result.get(3)).toBe("BB");
    expect(result.get(4)).toBe("CO");
  });
});

describe("assignPositions — 5-handed", () => {
  it("is BTN/SB/BB/UTG/CO -- no HJ yet (n < 6)", () => {
    const result = assignPositions([seat(1), seat(2), seat(3), seat(4), seat(5)], 1);
    expect(result.get(1)).toBe("BTN");
    expect(result.get(2)).toBe("SB");
    expect(result.get(3)).toBe("BB");
    expect(result.get(4)).toBe("UTG");
    expect(result.get(5)).toBe("CO");
  });
});

describe("assignPositions — 6-handed", () => {
  it("is BTN/SB/BB/UTG/HJ/CO", () => {
    const result = assignPositions([seat(1), seat(2), seat(3), seat(4), seat(5), seat(6)], 1);
    expect(result.get(1)).toBe("BTN");
    expect(result.get(2)).toBe("SB");
    expect(result.get(3)).toBe("BB");
    expect(result.get(4)).toBe("UTG");
    expect(result.get(5)).toBe("HJ");
    expect(result.get(6)).toBe("CO");
  });
});

describe("assignPositions — 9-handed", () => {
  it("collapses every early/middle seat into UTG, still correct at the button/blinds/HJ/CO edges", () => {
    const seats = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => seat(n));
    const result = assignPositions(seats, 1);
    expect(result.get(1)).toBe("BTN");
    expect(result.get(2)).toBe("SB");
    expect(result.get(3)).toBe("BB");
    expect(result.get(4)).toBe("UTG");
    expect(result.get(5)).toBe("UTG");
    expect(result.get(6)).toBe("UTG");
    expect(result.get(7)).toBe("UTG");
    expect(result.get(8)).toBe("HJ");
    expect(result.get(9)).toBe("CO");
  });
});

describe("assignPositions — dealer button not on the lowest-numbered seat", () => {
  it("wraps around correctly when the button is mid-table", () => {
    const seats = [seat(1), seat(2), seat(3), seat(4), seat(5), seat(6)];
    // Button on seat 4: clockwise order is 4,5,6,1,2,3
    const result = assignPositions(seats, 4);
    expect(result.get(4)).toBe("BTN");
    expect(result.get(5)).toBe("SB");
    expect(result.get(6)).toBe("BB");
    expect(result.get(1)).toBe("UTG");
    expect(result.get(2)).toBe("HJ");
    expect(result.get(3)).toBe("CO");
  });

  it("wraps around correctly with non-contiguous occupied seat numbers", () => {
    const seats = [seat(2), seat(5), seat(7), seat(9)];
    // Button on seat 7: clockwise order is 7,9,2,5
    const result = assignPositions(seats, 7);
    expect(result.get(7)).toBe("BTN");
    expect(result.get(9)).toBe("SB");
    expect(result.get(2)).toBe("BB");
    expect(result.get(5)).toBe("CO");
  });
});