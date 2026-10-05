import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assessLiveState } from "./liveState.js";
import { emptyActionHistory } from "./actionHistory.js";
import { readPotProvenance } from "./potSemantics.js";
import { buildLiveDiagnosticSnapshot, logLiveDiagnostics } from "../../../apps/pokernow-extension/src/diagnostics.js";
import { TABLE_SELECTORS, type LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";
import { validateDecisionPacket } from "@poker-ai/ai-core";

// These diagnostics tests use raw text/classes; real board DOM is tested separately.
function read(): LiveTableRead {
  return {
    raiseControl: { formVisible: false, submitText: null, raiseSubmitVisible: false, raiseSubmitEnabled: null,
      amountControlVisible: false, selectedRaiseToText: null, selectedRaiseToChips: null,
      selectedRaiseToSource: null, displayedBBText: null, issues: [] },
    raw: { potMainValueText: "5", potTotalValueText: "20", boardCards: [], seats: [
      { seatNumber: 1, isOccupied: true, isYou: true, playerNameText: "Hero", stackText: "10", betValueText: "2",
        statusClasses: ["decision-current"], holeCardClassLists: [["flipped", "card-h", "card-s-Q"], ["flipped", "card-s", "card-s-T"]] },
      { seatNumber: 2, isOccupied: true, isYou: false, playerNameText: "Opponent", stackText: "All In", betValueText: "20",
        statusClasses: ["offline"], holeCardClassLists: [] },
      { seatNumber: 3, isOccupied: true, isYou: false, playerNameText: "Folded", stackText: "40", betValueText: "8",
        statusClasses: ["fold"], holeCardClassLists: [] },
    ] },
    context: { blindTexts: ["1", "2"], dealerSeatNumber: 1, readErrors: [] },
    evidence: { selectors: TABLE_SELECTORS, seatEvidence: [], boardCardEvidence: [], dealerClasses: ["dealer-position-1"], boardContainerFound: true,
      boardCardElementCount: 0, mainPotFound: true, addOnPotFound: true, potContainerText: "captured display text" },
  };
}
function snapshot(input = read()) {
  return buildLiveDiagnosticSnapshot(input, assessLiveState(input.raw, input.context), emptyActionHistory());
}

describe("live monetary provenance and diagnostic snapshot", () => {
  it("exposes selected raise-to evidence without verifying a minimum", () => {
    const input = read();
    input.raiseControl = { formVisible: true, submitText: "Raise", raiseSubmitVisible: true, raiseSubmitEnabled: true,
      amountControlVisible: true, selectedRaiseToText: "60", selectedRaiseToChips: 60,
      selectedRaiseToSource: ".raise-bet-value input.value (live value property)", displayedBBText: "30 BB", issues: [] };
    const s = snapshot(input);
    expect(s.legality.raiseControl).toEqual(input.raiseControl);
    expect(s.legality).toMatchObject({ verified: false, minRaiseTo: null });
    expect(s.legality.proof.betting.fullMinimumRaiseTo).toMatchObject({ status: "unknown", value: null });
    expect(s.legality.proof.betting.actionReopened).toMatchObject({ status: "unknown", value: null });
    expect(s.legality.proof.contestablePot.contestablePotBeforeCall).toMatchObject({ status: "unknown", value: null });
    expect(s.legality.proof.activation.allowed).toBe(false);
    input.raiseControl.selectedRaiseToChips = 25;
    input.raiseControl.selectedRaiseToText = "25";
    expect(snapshot(input).legality.proof).toEqual(s.legality.proof);
    expect(s.decision.candidateActionSizes).toEqual([]);
  });
  it("keeps both displays distinct, logs all monetary inputs, and does not fabricate policy sizes", () => {
    const s = snapshot();
    expect(s.monetary).toMatchObject({ rawMainPotText: "5", rawDisplayedTotalPotText: "20", mainPot: 5, displayedTotalPot: 20,
      decisionPot: null, decisionPotSource: null, isPotSemanticsVerified: false, bigBlind: 2, calculatedAmountToCall: 18,
      allInCallCostIfGapIsCorrect: 10, knownNumericBetSubtotalIncludingFolded: 30, foldedNumericBetSubtotal: 8 });
    expect(s.hero).toMatchObject({ seat: 1, stack: 10, currentBet: 2 });
    expect(s.activeOpponents).toEqual([expect.objectContaining({ seat: 2, stack: null, currentBet: 20, isAllIn: true, isOffline: true })]);
    expect(s.decision).toMatchObject({ packetBuilt: false, policyPotActuallyUsedBB: null, decisionPotActuallyUsedBB: null, candidateActionSizes: [] });
    expect(s.legality.verified).toBe(false);
  });
  it("does not turn an unknown bet into a complete subtotal", () => {
    const input = read(); input.raw.seats[1]!.betValueText = "call";
    expect(snapshot(input).monetary).toMatchObject({ calculatedAmountToCall: null, highestActiveOpposingContribution: null,
      knownNumericBetSubtotalIncludingFolded: 10, betSubtotalHasUnknowns: true });
  });
  it("preserves independently parsed pot displays when the state cannot be assembled", () => {
    const input = read(); input.raw.potMainValueText = "bad value";
    expect(snapshot(input).monetary).toMatchObject({ mainPot: null, displayedTotalPot: 20, decisionPot: null,
      highestActiveOpposingContribution: null, knownNumericBetSubtotalIncludingFolded: null, betSubtotalHasUnknowns: true });
    expect(snapshot(input).confidence.level).toBe("low");
  });
  it.each([["0", "7"], ["20", "20"], ["20", null], [null, "20"], ["1,000", "2,000"]])("never infers pot semantics from display coincidence %s/%s", (main, total) => {
    expect(readPotProvenance({ potMainValueText: main!, potTotalValueText: total! })).toMatchObject({
      isPotSemanticsVerified: false, decisionPot: null, decisionPotSource: null,
    });
  });
  it("records the actual packet/policy BB values and generated sizes when provided", () => {
    const input = read();
    const packet = validateDecisionPacket({
      hero: { holeCards: [{ rank: 12, suit: "h" }, { rank: 10, suit: "s" }], position: "BTN", stackBB: 5 },
      table: { potBB: 20, board: [{ rank: 11, suit: "h" }, { rank: 13, suit: "s" }, { rank: 13, suit: "c" }, { rank: 12, suit: "s" }, { rank: 4, suit: "h" }], street: "river", numOpponentsRemaining: 1 },
      facingAction: { type: "none" }, candidateActions: ["CHECK", "BET", "ALL_IN"], engineCalculations: { equity: 0.5, equitySource: "estimated_range" }, dataConfidence: "high",
      opponentContext: { rangeStatus: "modeled", rangeConfidence: "medium" },
      policyContext: { potVerified: true, potSource: "synthetic unit evidence, not live verification", accounting: "single_pot_no_rake", terminalAfterCall: false, checkEndsHand: true,
        legal: { verified: true, source: "unit evidence", heroStreetBetBB: 0, opponentStreetBetBB: 0, opponentStackBB: 10,
          chipUnitBB: 1, minBetBB: 1, minRaiseToBB: null, aggressionReopened: true },
        equity: { estimate: 0.5, low: 0.4, high: 0.6, source: "unit evidence", confidence: "medium" }, responses: [] },
    });
    const s = buildLiveDiagnosticSnapshot(input, assessLiveState(input.raw, input.context), emptyActionHistory(), null, packet);
    expect(s.decision).toMatchObject({ packetBuilt: true, decisionPotActuallyUsedBB: 20, policyPotActuallyUsedBB: 20 });
    expect(s.decision.candidateActionSizes).toEqual([expect.objectContaining({ action: "ALL_IN", investmentBB: 5, raiseToBB: 5 })]);
    // Supplying a packet does not retroactively verify the raw display semantics.
    expect(s.monetary.isPotSemanticsVerified).toBe(false);
  });
});

describe("diagnostic toggle and change-only logging", () => {
  let storage: Map<string, string>;
  let readControls: ReturnType<typeof vi.fn>;
  const emit = () => { const r = read(); logLiveDiagnostics(r, assessLiveState(r.raw, r.context), emptyActionHistory()); };
  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, removeItem: (key: string) => storage.delete(key) });
    readControls = vi.fn(() => []); vi.stubGlobal("document", { querySelectorAll: readControls });
    for (const method of ["log", "table", "groupCollapsed", "groupEnd"] as const) vi.spyOn(console, method).mockImplementation(() => {});
    emit(); // Off resets deduplication from earlier tests.
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it("does not read controls or log by default", () => {
    emit(); expect(readControls).not.toHaveBeenCalled(); expect(console.log).not.toHaveBeenCalled();
  });
  it("logs one copyable stable snapshot and suppresses unchanged repeats", () => {
    storage.set("poker-ai:diagnostics", "1"); emit(); emit();
    expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
    const copy = vi.mocked(console.log).mock.calls.find(call => call[0] === "Copyable snapshot JSON")![1];
    expect(JSON.parse(copy)).toMatchObject({ version: 2, monetary: { decisionPot: null }, decision: { candidateActionSizes: [] } });
    expect(JSON.parse(copy).capturedAt).toBeTruthy();
  });
  it("supports one-shot capture and disables itself", () => {
    storage.set("poker-ai:diagnostics", "once"); emit(); emit();
    expect(console.groupCollapsed).toHaveBeenCalledTimes(1);
    expect(storage.has("poker-ai:diagnostics")).toBe(false);
  });
});
