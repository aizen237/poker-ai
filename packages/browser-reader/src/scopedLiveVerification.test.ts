import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assembleGameState, type RawTableInput } from "./gameState.js";
import { assessLiveState, type LiveReadContext } from "./liveState.js";
import { emptyActionHistory, updateActionHistory } from "./actionHistory.js";
import { bettingSnapshotSignature, proveScopedLiveBetting, type ScopedBettingEvidence } from "./scopedLiveVerification.js";
import type { BettingEvent } from "./legalityProof.js";
import { assessLiveLegalityEvidence } from "./liveLegalityEvidence.js";

const capture = JSON.parse(readFileSync(new URL("./fixtures/pokernow-controlled-2026-10-07.json", import.meta.url), "utf8"));
const context: LiveReadContext = { blindTexts: ["1", "2"], dealerSeatNumber: 2, readErrors: [] };
// Surrounding identity/cards/stacks are synthetic scaffolding, not a complete captured hand.
function raw(bets: Array<number | string | null>, main = 6, total?: number): RawTableInput {
  return {
    potMainValueText: String(main), potTotalValueText: String(total ?? main + bets.reduce<number>((n, b) => n + (typeof b === "number" ? b : 0), 0)),
    boardCards: [{ valueText: "2", suitText: "s" }, { valueText: "8", suitText: "s" }, { valueText: "8", suitText: "d" }],
    seats: bets.map((bet, i) => ({ seatNumber: i + 1, isOccupied: true, isYou: i === 0, playerNameText: `Player ${i + 1}`,
      stackText: "50", betValueText: bet === null ? null : String(bet), statusClasses: i === 0 ? ["decision-current"] : [],
      holeCardClassLists: i === 0 ? [["flipped", "card-h", "card-s-A"], ["flipped", "card-d", "card-s-K"]] : [] })),
  };
}
const wager = (sequence: number, seat: number, raiseTo: number, allIn = false): BettingEvent => ({ sequence, seat, raiseTo, allIn, action: "wager" });
function ordered(events: BettingEvent[], stacks = [50, 50, 8]) {
  const totals = stacks.map(() => 0);
  const folded = new Set<number>();
  for (const event of events) {
    if (event.action === "wager") totals[event.seat - 1] = event.raiseTo;
    if (event.action === "fold") folded.add(event.seat);
  }
  const table = raw(totals);
  table.seats.forEach((seat, i) => {
    seat.stackText = stacks[i]! === totals[i] ? null : String(stacks[i]! - totals[i]!);
    if (stacks[i] === totals[i]) seat.stackContainerText = "All In";
    if (folded.has(seat.seatNumber)) seat.statusClasses.push("fold");
  });
  const state = assembleGameState(table);
  const evidence: ScopedBettingEvidence = {
    source: "Independent complete ordered fixture for supplied live sequence (surrounding roster/stacks controlled)",
    coverage: "complete_ordered", snapshotSignature: bettingSnapshotSignature(state), street: "flop", bigBlind: 2, chipUnit: 1, heroSeat: 1,
    players: stacks.map((stack, i) => ({ seat: i + 1, contribution: 0, remainingStack: stack })), events,
  };
  return { table, state, evidence };
}

describe("controlled live monetary semantics", () => {
  it.each(capture.potDisplays)("reconciles main $main and contributions $contributions to total $total", (example: { main: number; contributions: number[]; total: number }) => {
    const assessment = assessLiveState(raw(example.contributions, example.main, example.total), context);
    expect(assessment.verification.monetary.contributionSemantics).toMatchObject({ status: "proven", value: "total_street_contributions" });
    expect(assessment.verification.monetary.potDisplay).toMatchObject({ status: "proven", matches: true, displayedTotalPot: example.total, contestablePotVerified: false });
    expect(assessment.decisionPot).toBeNull();
    expect(assessment.legality.verified).toBe(false);
    expect(assessment.confidence.reasons.join(" ")).not.toMatch(/meaning needs live confirmation|absent\/check markers need live confirmation/);
    expect(assessment.confidence.level).toBe("low");
  });
  it.each(capture.callGaps)("verifies the observed call gap from hero $hero", (example: { hero: number; opponents: number[]; call: number }) => {
    const assessment = assessLiveState(raw([example.hero, ...example.opponents]), context);
    expect(assessment.amountToCall).toBe(example.call);
    expect(assessment.verification.monetary.callGap).toMatchObject({ value: example.call, status: "proven", confidence: "high" });
    // A 4/6/8 snapshot does not reveal intermediate full-raise increments.
    expect(assessment.verification.betting.lastFullRaiseAmount.status).toBe("unknown");
  });
  it.each(["check", " CHECK "])("treats explicit %s as zero, without claiming absence means zero", text => {
    expect(assessLiveState(raw([text, 2], 6, 8), context).amountToCall).toBe(2);
    const missing = assessLiveState(raw([null, 2], 6, 8), context);
    expect(missing.amountToCall).toBeNull();
    expect(missing.verification.monetary.callGap.reasons.join(" ")).toContain("Seat 1");
  });
  it("excludes folded wagers from the call target but includes their chips in display arithmetic", () => {
    const input = raw([2, 8, 50]); input.seats[2]!.statusClasses = ["fold"];
    const result = assessLiveState(input, context);
    expect(result.amountToCall).toBe(6);
    expect(result.activeOpponents).toBe(1);
    expect(result.verification.monetary.potDisplay).toMatchObject({ matches: true, currentStreetSubtotal: 60 });
    input.seats[2]!.betValueText = null;
    const missingFolded = assessLiveState(input, context);
    expect(missingFolded.amountToCall).toBe(6);
    expect(missingFolded.verification.monetary.potDisplay.status).toBe("unknown");
  });
  it("never adds remaining stacks to a heads-up unequal all-in display", () => {
    const input = raw([2, 8]); input.seats[0]!.stackText = "1000";
    input.seats[1]!.stackText = null; input.seats[1]!.stackContainerText = "All In";
    const result = assessLiveState(input, context);
    expect(result.state!.seats[1]).toMatchObject({ isAllIn: true, stack: null });
    expect(result.verification.monetary.potDisplay).toMatchObject({ displayedTotalPot: 16, currentStreetSubtotal: 10, matches: true });
    expect(result.amountToCall).toBe(6);
    expect(result.decisionPot).toBeNull();
  });
  it("keeps uncapped gap distinct from the short hero's payable cost", () => {
    const input = raw([2, 8]); input.seats[0]!.stackText = "3";
    expect(assessLiveState(input, context).verification.monetary.callGap).toMatchObject({ value: 6, status: "proven" });
  });
  it.each(["mismatch", "missing total", "read error", "unknown action"])("withholds display proof for %s", problem => {
    const input = raw([0, 2]);
    if (problem === "mismatch") input.potTotalValueText = "100";
    if (problem === "missing total") input.potTotalValueText = null;
    if (problem === "unknown action") input.seats[1]!.betValueText = "raise";
    const result = assessLiveState(input, { ...context, readErrors: problem === "read error" ? ["ambiguous seat"] : [] });
    expect(result.verification.monetary.potDisplay.status).toBe("unknown");
    expect(result.verification.monetary.potDisplay.reasons.length).toBeGreaterThan(0);
  });
});

describe("scoped normal raises and single short-all-in non-reopening", () => {
  it.each(capture.openingBets)("proves opening $bet -> full minimum $minimumRaiseTo with complete evidence", (example: { bet: number; minimumRaiseTo: number }) => {
    const f = ordered([{ sequence: 1, seat: 1, action: "check", raiseTo: 0, allIn: false }, wager(2, 2, example.bet)], [50, 50]);
    const result = assessLiveState(f.table, { ...context, bettingEvidence: f.evidence });
    expect(result.verification.betting.lastFullRaiseAmount.value).toBe(example.bet);
    expect(result.legality.minRaiseTo).toBe(example.minimumRaiseTo);
    expect(result.legality.verified).toBe(false);
  });
  it("requires 9 before the short raise and retains increment 3 after the all-in to 8", () => {
    const before = ordered([wager(1, 2, 3), wager(2, 1, 6)]);
    expect(proveScopedLiveBetting(before.state, before.evidence).fullMinimumRaiseTo.value).toBe(capture.shortAllIn.minimumBeforeAllIn);
    const after = ordered([wager(1, 2, 3), wager(2, 1, 6), wager(3, 3, 8, true), wager(4, 2, 8)]);
    const result = assessLiveState(after.table, { ...context, bettingEvidence: after.evidence });
    expect(result.verification.betting).toMatchObject({ lastFullRaiseAmount: { value: 3, status: "proven" },
      minimumBeforeLastAggression: { value: 9 }, fullMinimumRaiseTo: { value: 11 }, shortUnderRaise: { value: true, status: "proven" },
      actionReopened: { value: false, status: "proven" } });
    expect(result.amountToCall).toBe(2);
    expect(result.legality).toMatchObject({ verified: false, aggressionReopened: false, minRaiseTo: 11 });
    const diagnostic = assessLiveLegalityEvidence(after.table, result, emptyActionHistory());
    expect(diagnostic.betting.actionReopened.value).toBe(false);
    expect(diagnostic.contestablePot.contestablePotBeforeCall.status).toBe("unknown");
    expect(diagnostic.activation.allowed).toBe(false);
  });
  it.each(["no events", "partial", "missing hero action", "stale snapshot", "unordered", "wrong stack", "turn instead of flop", "other opening size"])("does not extrapolate from %s", problem => {
    const f = ordered([wager(1, 2, 3), wager(2, 1, 6), wager(3, 3, 8, true), wager(4, 2, 8)]);
    if (problem === "partial") f.evidence.coverage = "snapshot_inferred";
    if (problem === "missing hero action") f.evidence.events.splice(1, 1);
    if (problem === "stale snapshot") f.evidence.snapshotSignature = "older snapshot";
    if (problem === "unordered") f.evidence.events[1]!.sequence = 1;
    if (problem === "wrong stack") f.evidence.players[0]!.remainingStack++;
    if (problem === "turn instead of flop") f.evidence.street = "turn";
    if (problem === "other opening size") f.evidence.events[0]!.raiseTo = 4;
    const proof = proveScopedLiveBetting(f.state, problem === "no events" ? undefined : f.evidence);
    expect(proof.fullMinimumRaiseTo.status).toBe("unknown");
    expect(proof.actionReopened.status).toBe("unknown");
  });
  it("does not certify full all-in reopening from the mistimed test", () => {
    const f = ordered([wager(1, 2, 3), wager(2, 1, 6), wager(3, 3, 9, true), wager(4, 2, 9)], [50, 50, 9]);
    const proof = proveScopedLiveBetting(f.state, f.evidence);
    expect(proof.actionReopened).toMatchObject({ value: null, status: "unknown" });
    expect(proof.actionReopened.reasons.join(" ")).toContain("Full all-in");
  });
  it("rejects ordered evidence whose blind does not match the current live read", () => {
    const f = ordered([wager(1, 2, 3)], [50, 50]);
    const result = assessLiveState(f.table, { ...context, blindTexts: ["2", "4"], bettingEvidence: f.evidence });
    expect(result.verification.betting.fullMinimumRaiseTo).toMatchObject({ status: "unknown", value: null });
    expect(result.verification.betting.fullMinimumRaiseTo.reasons.join(" ")).toContain("big blind does not match");
  });
  it("does not call any all-in short from its size alone", () => {
    const f = ordered([wager(1, 2, 3), wager(2, 1, 6), wager(3, 3, 8, true)]);
    expect(proveScopedLiveBetting(f.state).shortUnderRaise.status).toBe("unknown");
  });
});

it("retains the live-observed 0/3/4/5 street progression and new-hand history reset", () => {
  const input = raw([0, 0]);
  const fullBoard = [...input.boardCards, { valueText: "9", suitText: "h" }, { valueText: "J", suitText: "c" }];
  let history = emptyActionHistory();
  let previous: ReturnType<typeof assembleGameState> | null = null;
  for (const count of capture.verifiedBoardCounts as number[]) {
    input.boardCards = fullBoard.slice(0, count);
    const state = assembleGameState(input);
    expect(state.street).toBe(({ 0: "preflop", 3: "flop", 4: "turn", 5: "river" } as Record<number, string>)[count]);
    history = updateActionHistory(history, previous, state, { bigBlind: 2, dealerSeatNumber: 2 }); previous = state;
  }
  history.records.set(2, [{ street: "river", action: "check", seat: 2, amount: null, observation: history.observation, wagerAction: null }]);
  input.boardCards = [];
  const next = assembleGameState(input);
  const reset = updateActionHistory(history, previous, next, { bigBlind: 2, dealerSeatNumber: 2 });
  expect(next.street).toBe("preflop"); expect(reset.handBoundary).toBe(true); expect(reset.records.size).toBe(0);
});
