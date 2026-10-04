import { describe, expect, it } from "vitest";
import { parseCards } from "@poker-ai/shared";
import { emptyActionHistory, updateActionHistory, type ActionHistoryContext } from "./actionHistory.js";
import { assembleGameState, type PokerGameState, type SeatState } from "./gameState.js";

function seat(seatNumber: number, overrides: Partial<SeatState> = {}): SeatState {
  return {
    seatNumber, isOccupied: true, isYou: seatNumber === 1,
    playerName: seatNumber === 1 ? "hero" : `player${seatNumber}`, stack: 100,
    isFolded: false, isCurrentToAct: false, isOffline: false, isChecking: false,
    isAllIn: false, betReadError: false,
    holeCards: seatNumber === 1 ? parseCards("As Kh") : [], currentBet: null,
    ...overrides,
  };
}

function state(hero: Partial<SeatState> = {}, opponent: Partial<SeatState> = {}, overrides: Partial<PokerGameState> = {}): PokerGameState {
  return { seats: [seat(1, hero), seat(2, opponent)], board: parseCards("7h 4d 2c"), street: "flop", potMainValue: 3, potTotalValue: 3, ...overrides };
}
function preflop(hero: Partial<SeatState> = {}, opponent: Partial<SeatState> = {}): PokerGameState {
  return state(hero, opponent, { board: [], street: "preflop" });
}
const context: ActionHistoryContext = { bigBlind: 2, dealerSeatNumber: 1 };
function track(...states: PokerGameState[]) {
  let history = emptyActionHistory();
  let previous: PokerGameState | null = null;
  for (const current of states) {
    history = updateActionHistory(history, previous, current, context);
    previous = current;
  }
  return history;
}
function actions(history: ReturnType<typeof track>, seatNumber = 2) {
  return (history.records.get(seatNumber) ?? []).map((record) => record.action);
}

// These are snapshot fixtures, not claims about uncaptured PokerNow markup.
describe("single-observation actions", () => {
  it.each([
    { action: "check", previous: state(), current: state({}, { isChecking: true }), amount: null },
    { action: "bet", previous: state(), current: state({}, { currentBet: 6 }), amount: 6 },
    { action: "call", previous: state({ currentBet: 6 }), current: state({ currentBet: 6 }, { currentBet: 6 }), amount: 6 },
    { action: "raise", previous: state({ currentBet: 6 }), current: state({ currentBet: 6 }, { currentBet: 18 }), amount: 18 },
    { action: "fold", previous: state(), current: state({}, { isFolded: true }), amount: null },
  ])("records $action with explicit metadata", ({ action, previous, current, amount }) => {
    expect(track(previous, current).records.get(2)).toEqual([
      { action, street: "flop", seat: 2, amount, observation: 2, wagerAction: null },
    ]);
  });

  it("records observed street total rather than pretending it is the action increment", () => {
    expect(track(state({ currentBet: 10 }, { currentBet: 4 }), state({ currentBet: 10 }, { currentBet: 10 })).records.get(2)?.[0]).toMatchObject({ action: "call", amount: 10 });
  });
  it("never records a decrease or refund as a call", () => {
    expect(actions(track(state({}, { currentBet: 10 }), state({}, { currentBet: 4 })))).toEqual([]);
  });
  it("does not assume a partial contribution is a completed call", () => {
    const result = track(state({ currentBet: 10 }), state({ currentBet: 10 }, { currentBet: 4 }));
    expect(actions(result)).toEqual([]);
    expect(result.notes.join(" ")).toContain("partial contribution");
  });
  it("tracks only opponents while retaining hero's wager as classification context", () => {
    const start = state(); const heroBets = state({ currentBet: 6 }); const calls = state({ currentBet: 6 }, { currentBet: 6 });
    const result = track(start, heroBets, calls);
    expect(result.records.has(1)).toBe(false);
    expect(actions(result)).toEqual(["call"]);
  });
  it("does not infer actions already present on the first read", () => {
    expect(track(state({}, { isChecking: true, isAllIn: true, currentBet: 30 })).records.size).toBe(0);
  });
  it("does not mutate prior maps, records, or snapshots", () => {
    const start = state(); const bet = state({}, { currentBet: 6 });
    const history = track(start, bet); const original = structuredClone(history); const snapshot = structuredClone(bet);
    updateActionHistory(history, bet, state({ currentBet: 20 }, { currentBet: 6 }), context);
    expect(history).toEqual(original); expect(bet).toEqual(snapshot);
  });
});

describe("repeated actions and transient labels", () => {
  it("does not repeat a persistent check or bet", () => {
    const check = state({}, { isChecking: true }); const bet = state({}, { currentBet: 6 });
    expect(actions(track(state(), check, check))).toEqual(["check"]);
    expect(actions(track(state(), bet, bet))).toEqual(["bet"]);
  });
  it("does not duplicate a check after its text disappears and returns", () => {
    const check = state({}, { isChecking: true });
    expect(actions(track(state(), check, state(), check))).toEqual(["check"]);
  });
  it("does not duplicate a wager after a numeric label disappears and returns", () => {
    const bet = state({}, { currentBet: 6 });
    expect(actions(track(state(), bet, state(), bet))).toEqual(["bet"]);
  });
  it("allows distinct bets/raises by one player within a street", () => {
    const start = state(); const bet = state({}, { currentBet: 6 });
    const heroRaises = state({ currentBet: 18 }, { currentBet: 6 });
    const reraise = state({ currentBet: 18 }, { currentBet: 40 });
    expect(actions(track(start, bet, heroRaises, reraise))).toEqual(["bet", "raise"]);
  });
  it("allows a check followed by a later call", () => {
    expect(actions(track(state(), state({}, { isChecking: true }), state({ currentBet: 6 }, { isChecking: true }), state({ currentBet: 6 }, { currentBet: 6 })))).toEqual(["check", "call"]);
  });
});

describe("preflop posting protection", () => {
  it.each([1, 2])("does not turn an initial post of %s into voluntary action", (amount) => {
    const result = track(preflop(), preflop({}, { currentBet: amount }));
    expect(actions(result)).toEqual([]);
    expect(result.notes.join(" ")).toContain("posting");
  });
  it("omits an increase without an observed prior turn even if it might be a voluntary raise", () => {
    expect(actions(track(preflop({ currentBet: 2 }), preflop({ currentBet: 2 }, { currentBet: 10 })))).toEqual([]);
  });
  it("suppresses an initial BB-sized posting even with an apparent turn marker", () => {
    expect(actions(track(preflop({ currentBet: 1 }, { isCurrentToAct: true }), preflop({ currentBet: 1 }, { currentBet: 2 })))).toEqual([]);
  });
  it.each([{ to: 2, action: "call" }, { to: 6, action: "raise" }])("recognizes an observed voluntary $action after blinds are posted", ({ to, action }) => {
    expect(actions(track(preflop({ currentBet: 2 }, { currentBet: 1, isCurrentToAct: true }), preflop({ currentBet: 2 }, { currentBet: to })))).toEqual([action]);
  });
  it("recognizes a big blind check when the blind is already matched", () => {
    expect(actions(track(preflop({ currentBet: 2 }, { currentBet: 2, isCurrentToAct: true }), preflop({ currentBet: 2 }, { isChecking: true })))).toEqual(["check"]);
  });
  it("does not record a forced all-in blind as a voluntary shove", () => {
    expect(actions(track(preflop(), preflop({}, { currentBet: 1, isAllIn: true, stack: null })))).toEqual([]);
  });
});

describe("street boundaries", () => {
  const turnBoard = parseCards("7h 4d 2c Js");
  it("does not classify cleared prior-street bets as new-street calls", () => {
    const bet = state({}, { currentBet: 6 });
    const turn = state({}, {}, { street: "turn", board: turnBoard });
    const result = track(state(), bet, turn);
    expect(actions(result)).toEqual(["bet"]);
    expect(result.records.get(2)?.[0]?.street).toBe("flop");
  });
  it("records an action after a clean new-street baseline", () => {
    const turn = state({}, {}, { street: "turn", board: turnBoard });
    const bet = state({}, { currentBet: 4 }, { street: "turn", board: turnBoard });
    expect(track(state(), turn, bet).records.get(2)).toEqual([{ action: "bet", street: "turn", seat: 2, amount: 4, observation: 3, wagerAction: null }]);
  });
  it.each([{ currentBet: 10 }, { isChecking: true }, { isFolded: true }, { isAllIn: true }])("does not attribute a boundary change %j to either street", (opponent) => {
    expect(actions(track(state(), state({}, opponent, { street: "turn", board: turnBoard })))).toEqual([]);
  });
  it("waits for carried numeric/check labels to clear before reconstructing new-street actions", () => {
    const oldBet = state({}, { currentBet: 10 });
    const carried = state({}, { currentBet: 10 }, { street: "turn", board: turnBoard });
    const clear = state({}, {}, { street: "turn", board: turnBoard });
    const bet = state({}, { currentBet: 4 }, { street: "turn", board: turnBoard });
    const result = track(state(), oldBet, carried, clear, bet);
    expect(actions(result)).toEqual(["bet", "bet"]);
    expect(result.records.get(2)?.map((r) => r.amount)).toEqual([10, 4]);
  });
  it("does not invent actions if a clean baseline is never observed after a street change", () => {
    const result = track(state(), state({}, { currentBet: 10 }, { street: "turn", board: turnBoard }), state({}, { currentBet: 20 }, { street: "turn", board: turnBoard }));
    expect(actions(result)).toEqual([]); expect(result.awaitingStreetBaseline).toBe(true);
  });
});

describe("hand boundaries and missing hero cards", () => {
  const start = state(); const bet = state({}, { currentBet: 6 });
  it("resets on a different complete hero hand", () => {
    expect(track(start, bet, state({ holeCards: parseCards("2s 3d") })).records.size).toBe(0);
  });
  it.each([[], parseCards("As")])("preserves actions when hero cards temporarily become incomplete: %j", (holeCards) => {
    expect(actions(track(start, bet, state({ holeCards }, { currentBet: 6 }), bet))).toEqual(["bet"]);
  });
  it("recognizes changed cards after an intervening missing-card read", () => {
    expect(track(start, bet, state({ holeCards: [] }, { currentBet: 6 }), state({ holeCards: parseCards("2s 3d") })).records.size).toBe(0);
  });
  it("does not treat the same cards in a different DOM order as a new hand", () => {
    expect(actions(track(start, bet, state({ holeCards: parseCards("Kh As") }, { currentBet: 6 })))).toEqual(["bet"]);
  });
  it("resets on a board/street reset even when hero has exactly the same cards", () => {
    expect(track(start, bet, preflop()).records.size).toBe(0);
  });
  it("uses board transitions when hero is sitting out and has no cards", () => {
    const empty = { holeCards: [] };
    expect(track(state(empty), state(empty, { currentBet: 6 }), preflop(empty)).records.size).toBe(0);
  });
  it("preserves the last complete hand while hero's seat temporarily disappears", () => {
    const missing = state({ isOccupied: false, holeCards: [], playerName: null }, { currentBet: 6 });
    expect(actions(track(start, bet, missing, bet))).toEqual(["bet"]);
  });
  it("resets a preflop-only hand with identical cards when the dealer changes", () => {
    const before = preflop({ currentBet: 2 }, { isCurrentToAct: true });
    const raised = preflop({ currentBet: 2 }, { currentBet: 6 });
    const history = track(before, raised);
    expect(updateActionHistory(history, raised, before, { ...context, dealerSeatNumber: 2 }).records.size).toBe(0);
  });
  it("retains dealer memory across a temporarily unreadable dealer marker", () => {
    const before = preflop({ currentBet: 2 }, { isCurrentToAct: true }); const raised = preflop({ currentBet: 2 }, { currentBet: 6 });
    const history = track(before, raised);
    const gap = updateActionHistory(history, raised, raised, { bigBlind: 2, dealerSeatNumber: null });
    expect(actions(gap)).toEqual(["raise"]);
    expect(updateActionHistory(gap, raised, before, { dealerSeatNumber: 2 }).records.size).toBe(0);
  });
  it("resets when a folded occupant becomes active again", () => {
    const folded = state({}, { isFolded: true });
    expect(track(start, folded, start).records.size).toBe(0);
  });
  it("does not claim an invisible identical preflop hand boundary can be detected", () => {
    const before = preflop({ currentBet: 2 }, { isCurrentToAct: true }); const raised = preflop({ currentBet: 2 }, { currentBet: 6 });
    expect(actions(track(before, raised, raised))).toEqual(["raise"]);
  });
});

describe("seat identity and ambiguous observations", () => {
  it.each([{ isOccupied: false, playerName: null }, { playerName: "replacement" }, { playerName: null }])("does not transfer history on seat departure/replacement %j", (changes) => {
    const result = track(state(), state({}, { currentBet: 6 }), state({}, { currentBet: 6, ...changes }));
    expect(result.records.has(2)).toBe(false);
  });
  it("does not infer an action when a player first joins", () => {
    expect(actions(track(state({}, { isOccupied: false }), state({}, { currentBet: 6 })))).toEqual([]);
  });
  it("does not treat offline as folded or as a new hand", () => {
    expect(actions(track(state(), state({}, { currentBet: 6 }), state({}, { currentBet: 6, isOffline: true })))).toEqual(["bet"]);
  });
  it("omits two changed numeric wagers rather than guessing bet/call order", () => {
    const before = state({}, {}, { seats: [seat(1), seat(2), seat(3)] });
    const after = state({}, {}, { seats: [seat(1), seat(2, { currentBet: 6 }), seat(3, { currentBet: 6 })] });
    const result = track(before, after);
    expect(result.records.size).toBe(0); expect(result.notes.join(" ")).toContain("Multiple wagers");
  });
  it("counts hero's changed wager when judging ambiguity", () => {
    expect(track(state(), state({ currentBet: 10 }, { currentBet: 10 })).records.size).toBe(0);
  });
  it("assigns a shared observation number, not an invented cross-seat sequence", () => {
    const before = state({}, {}, { seats: [seat(1), seat(2), seat(3)] });
    const after = state({}, {}, { seats: [seat(1), seat(2, { isChecking: true }), seat(3, { isFolded: true })] });
    const result = track(before, after);
    expect(result.records.get(2)?.[0]?.observation).toBe(2);
    expect(result.records.get(3)?.[0]?.observation).toBe(2);
  });
  it("does not classify wagers around a newly arrived player's posted chips", () => {
    const before = state();
    const after = state({}, {}, { seats: [seat(1), seat(2, { currentBet: 6 }), seat(3, { currentBet: 12 })] });
    expect(track(before, after).records.size).toBe(0);
  });
  it.each([NaN, Infinity, -2])("does not infer from invalid numeric contribution %s", (currentBet) => {
    expect(actions(track(state(), state({}, { currentBet })))).toEqual([]);
  });
  it("does not infer from an unreadable prior contribution", () => {
    expect(actions(track(state({}, { betReadError: true }), state({}, { currentBet: 6 })))).toEqual([]);
  });
});

describe("all-in observations", () => {
  it.each([
    { heroBet: null, amount: 20, underlying: "bet" },
    { heroBet: 10, amount: 20, underlying: "raise" },
    { heroBet: 20, amount: 20, underlying: "call" },
    { heroBet: 30, amount: 20, underlying: "call" },
  ])("distinguishes all-in $underlying at observed total $amount", ({ heroBet, amount, underlying }) => {
    const record = track(state({ currentBet: heroBet }), state({ currentBet: heroBet }, { currentBet: amount, isAllIn: true, stack: null })).records.get(2)?.[0];
    expect(record).toMatchObject({ action: "all-in", wagerAction: underlying, amount });
  });
  it("records a literal all-in label with unknown amount without inventing aggression", () => {
    expect(track(state(), state({}, { isAllIn: true, stack: null, betReadError: true })).records.get(2)?.[0]).toMatchObject({ action: "all-in", amount: null, wagerAction: null });
  });
  it("does not infer all-in from numeric zero stack alone", () => {
    expect(actions(track(state(), state({}, { stack: 0 })))).toEqual([]);
  });
  it("does not duplicate a persistent or flickering all-in label", () => {
    const allIn = state({}, { isAllIn: true, currentBet: 20 });
    expect(actions(track(state(), allIn, allIn, state({}, { currentBet: 20 }), allIn))).toEqual(["all-in"]);
  });
  it("does not apply a delayed all-in label as a second aggressive wager", () => {
    const bet = state({}, { currentBet: 20 });
    const result = track(state(), bet, state({}, { currentBet: 20, isAllIn: true }));
    expect(actions(result)).toEqual(["bet", "all-in"]);
    expect(result.records.get(2)?.[1]?.wagerAction).toBeNull();
  });
  it("does not duplicate actions on later numeric changes for an already all-in seat", () => {
    expect(actions(track(state(), state({}, { isAllIn: true, currentBet: 20 }), state({}, { isAllIn: true, currentBet: 21 })))).toEqual(["all-in"]);
  });
  it("uses the real parser's textual check and All In flags", () => {
    const raw = { boardCards: [{ valueText: "7", suitText: "h" }, { valueText: "4", suitText: "d" }, { valueText: "2", suitText: "c" }], potMainValueText: "3", potTotalValueText: null, seats: [{ seatNumber: 2, isOccupied: true, isYou: false, playerNameText: "player2", stackText: "100", statusClasses: [], holeCardClassLists: [], betValueText: null as string | null }] };
    const before = assembleGameState(raw);
    raw.seats[0]!.betValueText = "check";
    expect(actions(track(before, assembleGameState(raw)))).toEqual(["check"]);
    raw.seats[0]!.betValueText = "20"; raw.seats[0]!.stackText = "All In";
    expect(actions(track(before, assembleGameState(raw)))).toEqual(["all-in"]);
  });
});
