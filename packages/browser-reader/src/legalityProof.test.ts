import { describe, expect, it } from "vitest";
import { proveBettingLegality, proveContestablePot, type BettingEvent, type BettingProofInput, type ContributionLedger } from "./legalityProof.js";
import { assessLiveLegalityEvidence } from "./liveLegalityEvidence.js";
import { assessLiveState } from "./liveState.js";
import { emptyActionHistory } from "./actionHistory.js";
import type { RawTableInput } from "./gameState.js";

// Complete ledgers are controlled rule fixtures, not claims that polling can
// obtain them or that PokerNow's reopening behavior has been live-verified.
const wager = (sequence: number, seat: number, raiseTo: number, allIn = false): BettingEvent => ({ sequence, seat, action: "wager", raiseTo, allIn });
const check = (sequence: number, seat: number): BettingEvent => ({ sequence, seat, action: "check", raiseTo: 0, allIn: false });
function betting(events: BettingEvent[] = []): BettingProofInput {
  return { source: "Synthetic complete street fixture", coverage: "complete_ordered", rulesVerified: true,
    rulesSource: "Standard NL full-bet rule, fixture assumption (not a PokerNow certificate)",
    street: "flop", bigBlind: 2, chipUnit: 1, heroSeat: 1,
    players: [{ seat: 1, contribution: 0, remainingStack: 100 }, { seat: 2, contribution: 0, remainingStack: 100 },
      { seat: 3, contribution: 0, remainingStack: 100 }], events };
}
describe("full raises and reopening from complete ordered evidence", () => {
  it("matches the observed normal minimum: checked BB faces a 3-chip opening bet, full raise-to 6", () => {
    const input = betting([check(1, 1), wager(2, 2, 3)]);
    input.players = [{ seat: 1, contribution: 0, remainingStack: 18 }, { seat: 2, contribution: 0, remainingStack: 28 }];
    const result = proveBettingLegality(input);
    expect(result.fullMinimumRaiseTo).toMatchObject({ value: 6, status: "proven", confidence: "high" });
    expect(result.lastFullRaiseAmount.value).toBe(3);
    expect(result.actionReopened.value).toBe(true);
  });
  it("tracks the full re-raise increment, not the total wager", () => {
    const result = proveBettingLegality(betting([wager(1, 1, 3), wager(2, 2, 9)]));
    expect(result.lastFullRaiseAmount.value).toBe(6);
    expect(result.fullMinimumRaiseTo.value).toBe(15);
    expect(result.actionReopened.value).toBe(true);
  });
  it("distinguishes stack-capped 25 from a full re-raise to 38 in a controlled preflop open", () => {
    const input = betting([wager(1, 2, 20)]);
    input.street = "preflop";
    input.players = [{ seat: 1, contribution: 2, remainingStack: 23 }, { seat: 2, contribution: 1, remainingStack: 100 }];
    const result = proveBettingLegality(input);
    expect(result.lastFullRaiseAmount.value).toBe(18);
    expect(result.fullMinimumRaiseTo.value).toBe(38);
    expect(result.stackCappedUnderRaiseTo.value).toBe(25);
    // The live 25 capture did not independently establish that 20 was a single
    // open from 2. Removing that certified history must withhold the minimum.
    expect(proveBettingLegality({ ...input, coverage: "snapshot_inferred" }).fullMinimumRaiseTo.status).toBe("unknown");
  });
  it("does not reopen a previous bettor after a short all-in", () => {
    const input = betting([wager(1, 1, 10), wager(2, 2, 15, true)]);
    input.players[1]!.remainingStack = 15;
    const result = proveBettingLegality(input);
    expect(result.actionReopened.value).toBe(false);
    expect(result.lastFullRaiseAmount.value).toBe(10);
    expect(result.fullMinimumRaiseTo.value).toBe(25);
    expect(result.stackCappedUnderRaiseTo).toMatchObject({ status: "proven", value: null });
  });
  it("reopens action after a full all-in raise", () => {
    const input = betting([wager(1, 1, 10), wager(2, 2, 20, true)]);
    input.players[1]!.remainingStack = 20;
    expect(proveBettingLegality(input).actionReopened.value).toBe(true);
  });
  it("handles cumulative short all-ins without changing the last full increment", () => {
    const input = betting([wager(1, 1, 10), wager(2, 2, 15, true), wager(3, 3, 20, true)]);
    input.players[1]!.remainingStack = 15; input.players[2]!.remainingStack = 20;
    expect(proveBettingLegality(input)).toMatchObject({ actionReopened: { value: true }, lastFullRaiseAmount: { value: 10 }, fullMinimumRaiseTo: { value: 30 } });
  });
  it("measures reopening from hero's most recent call", () => {
    const input = betting([wager(1, 2, 10), wager(2, 3, 15, true), wager(3, 1, 15), wager(4, 4, 20, true)]);
    input.players[2]!.remainingStack = 15;
    input.players.push({ seat: 4, contribution: 0, remainingStack: 20 });
    expect(proveBettingLegality(input).actionReopened.value).toBe(false);
  });
  it("lets an unacted player retain raise rights after a short all-in", () => {
    const input = betting([wager(1, 2, 10), wager(2, 3, 15, true)]);
    input.players[2]!.remainingStack = 15;
    expect(proveBettingLegality(input).actionReopened.value).toBe(true);
  });
  it("rejects an attempted raise when action has not reopened", () => {
    const input = betting([wager(1, 1, 10), wager(2, 2, 15, true), wager(3, 1, 25)]);
    input.players[1]!.remainingStack = 15;
    expect(proveBettingLegality(input).fullMinimumRaiseTo.status).toBe("unknown");
  });
  it("does not offer an under-raise against a heads-up all-in", () => {
    const input = betting([wager(1, 2, 20, true)]);
    input.players = [{ seat: 1, contribution: 0, remainingStack: 25 }, { seat: 2, contribution: 0, remainingStack: 20 }];
    expect(proveBettingLegality(input).stackCappedUnderRaiseTo).toMatchObject({ status: "proven", value: null });
  });
  it.each(["incomplete", "unverified rules", "same sequence", "illegal short raise", "short opening bet", "unknown stack", "midstreet baseline"])("abstains for %s", variation => {
    const input = betting([wager(1, 2, 10)]);
    if (variation === "incomplete") input.coverage = "snapshot_inferred";
    if (variation === "unverified rules") input.rulesVerified = false;
    if (variation === "same sequence") input.events.push(wager(1, 3, 30));
    if (variation === "illegal short raise") input.events.push(wager(2, 3, 15));
    if (variation === "short opening bet") { input.events = [wager(1, 2, 1, true)]; input.players[1]!.remainingStack = 1; }
    if (variation === "unknown stack") input.players[1]!.remainingStack = NaN;
    if (variation === "midstreet baseline") input.players[1]!.contribution = 4;
    for (const fact of Object.values(proveBettingLegality(input))) expect(fact).toMatchObject({ status: "unknown", value: null, confidence: "low" });
  });
  it("uses chip units for fractional full raise thresholds", () => {
    const input = betting([wager(1, 1, 0.3), wager(2, 2, 0.6)]);
    input.bigBlind = 0.2; input.chipUnit = 0.1;
    expect(proveBettingLegality(input).actionReopened.value).toBe(true);
    expect(proveBettingLegality(input).fullMinimumRaiseTo.value).toBeCloseTo(0.9);
  });
});

function ledger(players: ContributionLedger["players"], remaining = 0): ContributionLedger {
  return { source: "Synthetic complete hand ledger incl. folded players and returns", coverage: "complete_hand", noRakeOrDropVerified: true,
    chipUnit: 1, heroSeat: 1, heroRemainingStack: remaining, players,
    displayedTotalPot: players.reduce((n, p) => n + p.committed, 0),
    collectedMainPot: players.reduce((n, p) => n + p.committed - p.streetContribution, 0) };
}
const row = (seat: number, committed: number, streetContribution = committed, folded = false) => ({ seat, committed, streetContribution, folded });
describe("hero-contestable pot from whole-hand contributions", () => {
  it("matches collected 4 + bet 3 = total 7 without double-counting street bets", () => {
    const result = proveContestablePot(ledger([row(1, 2, 0), row(2, 5, 3)], 18));
    expect(result.callCost.value).toBe(3);
    expect(result.contestablePotBeforeCall.value).toBe(7);
    expect(result.contestablePotAfterCall.value).toBe(10);
  });
  it("matches the captured call gap 8 - 2 = 6 with complete contribution evidence", () => {
    expect(proveContestablePot(ledger([row(1, 2), row(2, 8)], 30)).callCost.value).toBe(6);
  });
  it("accounts for a matched heads-up all-in", () => {
    const result = proveContestablePot(ledger([row(1, 20), row(2, 50)], 30));
    expect(result.callCost.value).toBe(30);
    expect(result.contestablePotBeforeCall.value).toBe(70);
    expect(result.contestablePotAfterCall.value).toBe(100);
    expect(result.uncalledReturns).toEqual([]);
  });
  it("removes unmatched excess when hero cannot cover a heads-up shove", () => {
    const result = proveContestablePot(ledger([row(1, 10), row(2, 100)], 40));
    expect(result.callCost.value).toBe(40);
    expect(result.contestablePotBeforeCall.value).toBe(60);
    expect(result.contestablePotAfterCall.value).toBe(100);
    expect(result.uncalledReturns).toEqual([{ seat: 2, amount: 50 }]);
  });
  it("excludes an opponent-only side pot in a multiway all-in", () => {
    const result = proveContestablePot(ledger([row(1, 50), row(2, 100), row(3, 100)]));
    expect(result.pots).toEqual([
      { amount: 150, eligibleSeats: [1, 2, 3], heroEligible: true },
      { amount: 100, eligibleSeats: [2, 3], heroEligible: false },
    ]);
    expect(result.contestablePotBeforeCall.value).toBe(150);
  });
  it("includes folded dead money but excludes folded players from eligibility", () => {
    const result = proveContestablePot(ledger([row(1, 50), row(2, 100), row(3, 100, 100, true)]));
    expect(result.pots).toEqual([
      { amount: 150, eligibleSeats: [1, 2], heroEligible: true },
      { amount: 100, eligibleSeats: [2], heroEligible: false },
    ]);
    expect(result.contestablePotBeforeCall.value).toBe(150);
  });
  it("retains distinct opponent eligibility even when hero covers both pots", () => {
    const result = proveContestablePot(ledger([row(1, 100), row(2, 50), row(3, 100)]));
    expect(result.contestablePotBeforeCall.value).toBe(250);
    expect(result.pots.map(p => p.eligibleSeats)).toEqual([[1, 2, 3], [1, 3]]);
    // Equity must be evaluated separately per eligible set; no scalar EV is produced here.
  });
  it.each([[10, 100, 40], [20, 50, 30], [50, 100, 0]])("conserves chips across pots and returns (%s/%s, call cap %s)", (hero, opponent, remaining) => {
    const input = ledger([row(1, hero), row(2, opponent), row(3, 30, 30, true)], remaining);
    const result = proveContestablePot(input);
    expect(result.callCost.status).toBe("proven");
    expect(result.pots.reduce((n, p) => n + p.amount, 0) + result.uncalledReturns.reduce((n, p) => n + p.amount, 0))
      .toBe(input.displayedTotalPot + result.callCost.value!);
  });
  it.each(["snapshot", "rake unknown", "total mismatch", "main mismatch", "duplicate seat", "unknown contribution"])("withholds contestable amount for %s", variation => {
    const input = ledger([row(1, 20), row(2, 50)], 30);
    if (variation === "snapshot") input.coverage = "snapshot_only";
    if (variation === "rake unknown") input.noRakeOrDropVerified = false;
    if (variation === "total mismatch") input.displayedTotalPot++;
    if (variation === "main mismatch") input.collectedMainPot++;
    if (variation === "duplicate seat") input.players[1]!.seat = 1;
    if (variation === "unknown contribution") input.players[1]!.committed = NaN;
    expect(proveContestablePot(input).contestablePotBeforeCall).toMatchObject({ value: null, status: "unknown", confidence: "low" });
  });
});

describe("live proof adapter never certifies incomplete polling history", () => {
  function captured() {
    const raw: RawTableInput = { potMainValueText: "4", potTotalValueText: "7", boardCards: [{ valueText: "2", suitText: "s" }, { valueText: "8", suitText: "s" }, { valueText: "8", suitText: "d" }],
      seats: [
        { seatNumber: 1, isOccupied: true, isYou: true, playerNameText: "Hero", stackText: "18", betValueText: "check", statusClasses: ["decision-current"], holeCardClassLists: [] },
        { seatNumber: 2, isOccupied: true, isYou: false, playerNameText: "Opponent", stackText: "25", betValueText: "3", statusClasses: [], holeCardClassLists: [] },
      ] };
    return raw;
  }
  it("records the live equality while withholding contestability/minimum/reopening", () => {
    const raw = captured(); const assessment = assessLiveState(raw, { blindTexts: ["1", "2"], dealerSeatNumber: 2, readErrors: [] });
    const proof = assessLiveLegalityEvidence(raw, assessment, emptyActionHistory());
    expect(proof.displayReconciliation).toMatchObject({ matches: true, currentStreetSubtotal: 3, status: "proven", confidence: "high" });
    expect(proof.heroMaximumRaiseTo.value).toBe(18);
    expect(proof.betting.fullMinimumRaiseTo.status).toBe("unknown");
    expect(proof.contestablePot.contestablePotBeforeCall.status).toBe("unknown");
    expect(proof.activation.allowed).toBe(false);
    expect(assessment.legality.verified).toBe(false);
    expect(assessment.decisionPot).toBeNull();
  });
  it("does not treat an absent contribution label as proven zero", () => {
    const raw = captured(); raw.seats[0]!.betValueText = null;
    const proof = assessLiveLegalityEvidence(raw, assessLiveState(raw, { blindTexts: ["1", "2"], dealerSeatNumber: 2, readErrors: [] }), emptyActionHistory());
    expect(proof.displayReconciliation.matches).toBeNull();
    expect(proof.heroMaximumRaiseTo.value).toBeNull();
  });
});
