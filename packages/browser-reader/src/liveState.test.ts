import { describe, expect, it } from "vitest";
import { assessLiveState, type LiveReadContext } from "./liveState.js";
import { assembleGameState, calculateAmountToCall, type RawTableInput } from "./gameState.js";
import { computeDataConfidence } from "./dataConfidence.js";

// Raw-value fixtures use the already captured class/text encodings. They do
// not claim to reproduce PokerNow's live element hierarchy or pot semantics.
function rawTable(): RawTableInput {
  return {
    potMainValueText: "0", potTotalValueText: "7", boardCards: [],
    seats: [
      { seatNumber: 1, isOccupied: true, isYou: true, playerNameText: "Hero", stackText: "100", statusClasses: ["decision-current"], holeCardClassLists: [["flipped", "card-h", "card-s-Q"], ["flipped", "card-s", "card-s-T"]], betValueText: "0" },
      { seatNumber: 3, isOccupied: true, isYou: false, playerNameText: "Opponent", stackText: "100", statusClasses: [], holeCardClassLists: [["card-container"]], betValueText: "0" },
      { seatNumber: 6, isOccupied: true, isYou: false, playerNameText: "Other", stackText: "100", statusClasses: [], holeCardClassLists: [], betValueText: "0" },
    ],
  };
}

const context: LiveReadContext = { blindTexts: ["1", "2"], dealerSeatNumber: 1, readErrors: [] };

describe("live read assessment", () => {
  it("keeps captured main=0/add-on=7 separate and withholds a decision pot", () => {
    const result = assessLiveState(rawTable(), context);
    expect(result.state?.potMainValue).toBe(0);
    expect(result.state?.potTotalValue).toBe(7);
    expect(result.decisionPot).toBeNull();
    expect(result.pot).toMatchObject({ mainPot: 0, displayedTotalPot: 7, decisionPot: null, decisionPotSource: null, isPotSemanticsVerified: false });
    expect(result.legality).toMatchObject({ verified: false, minBet: null, minRaiseTo: null, chipUnit: null, aggressionReopened: null });
    expect(result.confidence.level).toBe("low");
    expect(result.confidence.reasons.join(" ")).toContain("hero-contestable pot");
    expect(result.activeOpponents).toBe(2);
    expect([...result.positions]).toEqual([[1, "BTN"], [3, "SB"], [6, "BB"]]);
  });

  it.each([null, "", "All In", "Infinity", "NaN", "-1", "0"])("never defaults an unreadable big blind (%s) to 1", (text) => {
    const result = assessLiveState(rawTable(), { ...context, blindTexts: ["1", text] });
    expect(result.bigBlind).toBeNull();
    expect(result.confidence.level).toBe("low");
    expect(result.confidence.reasons.join(" ")).toContain("big blind could not be read");
  });

  it("parses comma-formatted blinds without losing scale", () => {
    const result = assessLiveState(rawTable(), { ...context, blindTexts: ["1,000", "2,000"] });
    expect(result.smallBlind).toBe(1000);
    expect(result.bigBlind).toBe(2000);
  });

  it("reports a missing small blind and reversed blind order", () => {
    expect(assessLiveState(rawTable(), { ...context, blindTexts: [null, "2"] }).confidence.reasons).toContain("small blind could not be read");
    expect(assessLiveState(rawTable(), { ...context, blindTexts: ["4", "2"] }).confidence.reasons.join(" ")).toContain("small blind exceeds big blind");
  });

  it.each([null, 9])("never assigns a fallback hero position when dealer=%s", (dealerSeatNumber) => {
    const result = assessLiveState(rawTable(), { ...context, dealerSeatNumber });
    expect(result.positions.size).toBe(0);
    expect(result.confidence.reasons.join(" ")).toContain("position is not yet known");
  });

  it("retains folded/offline/all-in seats in the position map but excludes folded opponents from the active count", () => {
    const raw = rawTable();
    raw.seats[1]!.statusClasses = ["fold", "offline"];
    raw.seats[2]!.stackText = "All In";
    raw.seats[2]!.statusClasses = ["offline"];
    raw.seats[2]!.betValueText = "30";
    const result = assessLiveState(raw, context);
    expect(result.positions.get(3)).toBe("SB");
    expect(result.positions.get(6)).toBe("BB");
    expect(result.activeOpponents).toBe(1);
    expect(result.state?.seats[2]).toMatchObject({ isAllIn: true, stack: null, isOffline: true });
    expect(result.amountToCall).toBe(30);
  });

  it("preserves a named occupied seat with an unreadable stack", () => {
    const raw = rawTable();
    raw.seats[1]!.stackText = null;
    const result = assessLiveState(raw, context);
    expect(result.state?.seats[1]).toMatchObject({ playerName: "Opponent", isOccupied: true, stack: null });
    expect(result.activeOpponents).toBe(2);
    expect(result.positions.get(3)).toBe("SB");
    expect(result.confidence.reasons).toContain("active opponent stack missing or invalid");
  });

  it.each([null, "not a stack", "All In"])("never turns hero's unreadable stack %s into zero", (text) => {
    const raw = rawTable();
    raw.seats[0]!.stackText = text;
    const result = assessLiveState(raw, context);
    expect(result.state?.seats[0]!.stack).toBeNull();
    expect(result.confidence.reasons).toContain("hero stack missing or invalid");
  });

  it("fails a missing pot read instead of manufacturing a zero pot", () => {
    const raw = rawTable();
    raw.potMainValueText = null;
    const result = assessLiveState(raw, context);
    expect(result.state).toBeNull();
    expect(result.pot.displayedTotalPot).toBe(7);
    expect(result.confidence).toEqual({ level: "low", reasons: ["Main pot element is missing"] });
  });

  it("does not drop an incomplete board card and manufacture a preflop state", () => {
    const raw = rawTable();
    raw.boardCards = [{ valueText: "Q", suitText: "" }];
    const result = assessLiveState(raw, context);
    expect(result.state).toBeNull();
    expect(result.confidence.level).toBe("low");
    expect(result.confidence.reasons.join(" ")).toContain("board card suit");
  });

  it("surfaces selector failures alongside parsed data", () => {
    const result = assessLiveState(rawTable(), { ...context, readErrors: ["board container: expected one match, found 0"] });
    expect(result.state).not.toBeNull();
    expect(result.confidence.level).toBe("low");
    expect(result.confidence.reasons[0]).toContain("board container");
  });
});

describe("amount-to-call current-street contribution scenarios", () => {
  it("satisfies the nonnegative opposing-maximum gap invariant for numeric contributions", () => {
    for (const hero of [0, 2, 10, 25]) for (const opponent of [0, 4, 16]) for (const other of [0, 8, 20]) {
      const raw = rawTable();
      [hero, opponent, other].forEach((bet, i) => { raw.seats[i]!.betValueText = String(bet); });
      const result = calculateAmountToCall(assembleGameState(raw));
      expect(result).toBe(Math.max(0, Math.max(opponent, other) - hero));
    }
  });
  it("keeps the wager gap distinct from hero's payable all-in cost", () => {
    const raw = rawTable(); raw.seats[0]!.stackText = "3"; raw.seats[0]!.betValueText = "2";
    raw.seats[1]!.betValueText = "20";
    expect(calculateAmountToCall(assembleGameState(raw))).toBe(18);
  });
  it.each([
    { label: "nobody has bet", hero: null, opponent: null, other: null, expected: 0 },
    { label: "opponent bets", hero: null, opponent: "10", other: null, expected: 10 },
    { label: "hero contributed part", hero: "4", opponent: "10", other: null, expected: 6 },
    { label: "raise over another bet", hero: "4", opponent: "10", other: "25", expected: 21 },
    { label: "multiple different bets", hero: "3", opponent: "12", other: "8", expected: 9 },
    { label: "hero matched", hero: "12", opponent: "12", other: "8", expected: 0 },
    { label: "checked around", hero: "check", opponent: "CHECK", other: null, expected: 0 },
    { label: "decimal and comma amounts", hero: "1,000.5", opponent: "1,200.5", other: "700", expected: 200 },
  ])("$label", ({ hero, opponent, other, expected }) => {
    const raw = rawTable();
    [hero, opponent, other].forEach((text, index) => { raw.seats[index]!.betValueText = text; });
    expect(calculateAmountToCall(assembleGameState(raw))).toBe(expected);
  });

  it("uses an all-in opponent's numeric bet without converting their unknown stack to zero", () => {
    const raw = rawTable();
    raw.seats[0]!.betValueText = "4";
    raw.seats[1]!.stackText = "All In";
    raw.seats[1]!.betValueText = "30";
    expect(calculateAmountToCall(assembleGameState(raw))).toBe(26);
  });

  it.each(["99", "All In", "call"])("ignores a folded opponent's old bet %s", (text) => {
    const raw = rawTable();
    raw.seats[1]!.statusClasses = ["fold"];
    raw.seats[1]!.betValueText = text;
    raw.seats[2]!.betValueText = "5";
    expect(calculateAmountToCall(assembleGameState(raw))).toBe(5);
  });

  it.each(["call", "raise", "All In", "", "-2", "Infinity", "NaN", "1,2"])("returns unknown for unreadable active contribution %s", (text) => {
    for (const seatIndex of [0, 1]) {
      const raw = rawTable();
      raw.seats[seatIndex]!.betValueText = text;
      const result = assessLiveState(raw, context);
      expect(result.amountToCall).toBeNull();
      expect(result.confidence.reasons).toContain("amount-to-call is missing or invalid");
    }
  });
});

describe("decision-critical confidence checks independent of the pot investigation", () => {
  const knownContext = { amountToCall: 0, bigBlindWasDefaulted: false, isPositionKnown: true, potSemanticsVerified: true };
  it("keeps confidence low if pot semantics are known but wager-total semantics are not", () => {
    const result = computeDataConfidence(assembleGameState(rawTable()), { ...knownContext, contributionSemanticsVerified: false });
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toContain("call gap unverified");
  });
  it("does not offer decisions to a hero with zero remaining chips", () => {
    const raw = rawTable(); raw.seats[0]!.stackText = "0";
    expect(computeDataConfidence(assembleGameState(raw), knownContext)).toMatchObject({ level: "low", reasons: expect.arrayContaining(["hero has no remaining chips to act with"]) });
  });
  it("allows an explicit all-in opponent with an unknown stack but known contribution", () => {
    const raw = rawTable(); raw.seats[1]!.stackText = "All In"; raw.seats[1]!.betValueText = "10";
    expect(computeDataConfidence(assembleGameState(raw), { ...knownContext, amountToCall: 10 }).level).toBe("high");
  });
  it("rejects duplicate visible cards", () => {
    const raw = rawTable(); raw.boardCards = [{ valueText: "Q", suitText: "h" }, { valueText: "2", suitText: "c" }, { valueText: "3", suitText: "d" }];
    expect(computeDataConfidence(assembleGameState(raw), knownContext).reasons.join(" ")).toContain("duplicate visible cards");
  });
  it("rejects multiple hero seats", () => {
    const raw = rawTable(); raw.seats[1]!.isYou = true;
    expect(computeDataConfidence(assembleGameState(raw), knownContext).reasons).toContain("multiple hero seats found");
  });
  it("rejects multiple current players", () => {
    const raw = rawTable(); raw.seats[1]!.statusClasses = ["decision-current"];
    expect(computeDataConfidence(assembleGameState(raw), knownContext).reasons).toContain("current player to act is missing or ambiguous");
  });
  it("rejects an unreadable hero card instead of filling one in", () => {
    const raw = rawTable(); raw.seats[0]!.holeCardClassLists[0] = ["flipped", "card-h"];
    expect(computeDataConfidence(assembleGameState(raw), knownContext).reasons.join(" ")).toContain("hole cards incomplete");
  });
});
