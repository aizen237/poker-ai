import { describe, expect, it } from "vitest";
import type { RawTableInput } from "./gameState.js";
import { assessLiveState, type LiveReadContext, type LiveStateAssessment } from "./liveState.js";
import { proveContestablePot, type ContributionLedger } from "./legalityProof.js";
import { assessLiveLegalityEvidence } from "./liveLegalityEvidence.js";
import { emptyActionHistory } from "./actionHistory.js";

// Synthetic accounting scenarios, NOT new PokerNow captures. Independently
// supplied ledgers demonstrate what the same snapshot does not establish.
const context: LiveReadContext = { blindTexts: ["1", "2"], dealerSeatNumber: 2, readErrors: [] };
function fixture(contributions: number[], collected: number[], heroStack = 50) {
  const main = collected.reduce((sum, n) => sum + n, 0);
  const total = main + contributions.reduce((sum, n) => sum + n, 0);
  const raw: RawTableInput = {
    potMainValueText: String(main), potTotalValueText: String(total),
    boardCards: [{ valueText: "2", suitText: "s" }, { valueText: "8", suitText: "s" }, { valueText: "8", suitText: "d" }],
    seats: contributions.map((amount, i) => ({
      seatNumber: i + 1, isOccupied: true, isYou: i === 0, playerNameText: i === 0 ? "Hero" : `Opponent ${i}`,
      stackText: String(i === 0 ? heroStack : 50), betValueText: String(amount),
      statusClasses: i === 0 ? ["decision-current"] : [],
      holeCardClassLists: i === 0 ? [["flipped", "card-h", "card-s-A"], ["flipped", "card-d", "card-s-K"]] : [],
    })),
  };
  const ledger: ContributionLedger = {
    source: "Synthetic independent complete ledger; no returns or rake assumed for this arithmetic test only",
    coverage: "complete_hand", noRakeOrDropVerified: true, chipUnit: 1,
    heroSeat: 1, heroRemainingStack: heroStack, collectedMainPot: main, displayedTotalPot: total,
    players: contributions.map((amount, i) => ({ seat: i + 1, committed: amount + collected[i]!, streetContribution: amount, folded: false })),
  };
  return { raw, ledger };
}
function expectLiveBlocked(raw: RawTableInput, result: LiveStateAssessment) {
  expect(result.decisionPot).toBeNull();
  expect(result.pot).toMatchObject({ decisionPot: null, decisionPotSource: null, isPotSemanticsVerified: false });
  expect(result.confidence.level).toBe("low");
  expect(result.legality.verified).toBe(false);
  const proof = assessLiveLegalityEvidence(raw, result, emptyActionHistory());
  expect(proof.contestablePot.contestablePotBeforeCall.status).toBe("unknown");
  expect(proof.activation.allowed).toBe(false);
}

describe("simple-pot audit: display evidence versus independently established eligibility", () => {
  it.each([
    { label: "ordinary heads-up", contributions: [2, 8], collected: [3, 3], total: 16 },
    { label: "normal multiway without all-ins", contributions: [2, 8, 8], collected: [3, 3, 3], total: 27 },
  ])("reconciles $label but requires independent eligibility/accounting evidence", ({ contributions, collected, total }) => {
    const f = fixture(contributions, collected);
    const result = assessLiveState(f.raw, context);
    expect(result.state!.seats.every(s => !s.isAllIn && s.stack! > 0)).toBe(true);
    expect(result.state!.seats[0]).toMatchObject({ isCurrentToAct: true, isFolded: false });
    expect(result.verification.monetary.callGap).toMatchObject({ value: 6, status: "proven" });
    expect(result.verification.monetary.potDisplay).toMatchObject({ matches: true, displayedTotalPot: total });
    // With the additional complete ledger/no-rake facts, the total IS correct.
    // The current DOM reader does not provide those independent facts.
    expect(proveContestablePot(f.ledger).contestablePotBeforeCall).toMatchObject({ value: total, status: "proven" });
    expectLiveBlocked(f.raw, result);
  });

  it("keeps previously collected folded dead money contestable without subtracting it", () => {
    const f = fixture([2, 8, 0], [3, 3, 4]);
    f.raw.seats[2]!.statusClasses = ["fold"];
    f.ledger.players[2]!.folded = true;
    const result = assessLiveState(f.raw, context);
    expect(result.activeOpponents).toBe(1);
    expect(result.verification.monetary.potDisplay).toMatchObject({ matches: true, collectedMainPot: 10, currentStreetSubtotal: 10, displayedTotalPot: 20 });
    const proof = proveContestablePot(f.ledger);
    expect(proof.contestablePotBeforeCall.value).toBe(20);
    expect(proof.pots.every(p => p.heroEligible && !p.eligibleSeats.includes(3))).toBe(true);
    // Blocking is due to absent live accounting evidence, not the presence of a fold.
    expectLiveBlocked(f.raw, result);
  });

  it("does not mistake an explicit check and matching display for proof of simple-pot eligibility", () => {
    const f = fixture([0, 2], [3, 3]); f.raw.seats[0]!.betValueText = "check";
    const result = assessLiveState(f.raw, context);
    expect(result.verification.monetary).toMatchObject({ callGap: { value: 2, status: "proven" }, potDisplay: { matches: true } });
    expectLiveBlocked(f.raw, result);
  });

  it("blocks an all-in even when all contributions and displays reconcile", () => {
    const f = fixture([2, 8], [3, 3]);
    f.raw.seats[1]!.stackText = null; f.raw.seats[1]!.stackContainerText = "All In";
    const result = assessLiveState(f.raw, context);
    expect(result.state!.seats[1]).toMatchObject({ isAllIn: true, stack: null, currentBet: 8 });
    expect(result.verification.monetary.potDisplay.matches).toBe(true);
    expectLiveBlocked(f.raw, result);
  });

  it("keeps a multiway all-in/side-pot scenario blocked despite exact display arithmetic", () => {
    const f = fixture([0, 8, 4], [2, 2, 2]);
    f.raw.seats[2]!.stackText = null; f.raw.seats[2]!.stackContainerText = "All In";
    // Two non-all-in players have chips to continue; a total alone does not
    // identify eligibility layers or permit the simple-pot shortcut.
    const result = assessLiveState(f.raw, context);
    expect(result.activeOpponents).toBe(2);
    expect(result.verification.monetary.potDisplay.matches).toBe(true);
    expect(proveContestablePot(f.ledger).pots).toEqual([
      { amount: 18, eligibleSeats: [1, 2, 3], heroEligible: true },
      { amount: 8, eligibleSeats: [1, 2], heroEligible: true },
    ]);
    expectLiveBlocked(f.raw, result);
  });

  it.each([null, "call"])("blocks an ambiguous contribution %s", value => {
    const f = fixture([2, 8], [3, 3]); f.raw.seats[1]!.betValueText = value;
    const result = assessLiveState(f.raw, context);
    expect(result.amountToCall).toBeNull();
    expect(result.verification.monetary.potDisplay.matches).toBeNull();
    expectLiveBlocked(f.raw, result);
  });

  it("blocks a reconciliation mismatch", () => {
    const f = fixture([2, 8], [3, 3]); f.raw.potTotalValueText = "17";
    const result = assessLiveState(f.raw, context);
    expect(result.verification.monetary.potDisplay.matches).toBe(false);
    expectLiveBlocked(f.raw, result);
  });

  it("cannot infer a complete hand roster when a seat disappears", () => {
    const f = fixture([2, 8, 0], [3, 3, 4]);
    f.raw.seats.pop(); // Hypothetical incomplete snapshot; not a claim about PokerNow departure behavior.
    const result = assessLiveState(f.raw, context);
    expect(result.verification.monetary.potDisplay.matches).toBe(true);
    expect(result.state!.seats.every(s => !s.isAllIn)).toBe(true);
    expectLiveBlocked(f.raw, result);
  });

  it("shows why no current all-ins does not make an uncovered call a simple-pot EV input", () => {
    const f = fixture([2, 18], [3, 3], 3);
    const result = assessLiveState(f.raw, context);
    expect(result.state!.seats.every(s => !s.isAllIn && s.stack! > 0)).toBe(true);
    expect(result.verification.monetary.callGap).toMatchObject({ value: 16, status: "proven" });
    expect(result.verification.monetary.potDisplay).toMatchObject({ matches: true, displayedTotalPot: 26 });
    // Hero can invest only 3. Under the independently supplied test ledger,
    // 13 opposing chips are unmatched: 26 is not the hero-contestable EV pot.
    const proof = proveContestablePot(f.ledger);
    expect(proof.callCost.value).toBe(3);
    expect(proof.contestablePotBeforeCall.value).toBe(13);
    expect(proof.contestablePotAfterCall.value).toBe(16);
    expect(proof.uncalledReturns).toEqual([{ seat: 2, amount: 13 }]);
    expectLiveBlocked(f.raw, result);
  });

  it("cannot establish no-rake accounting from a reconciled gross display", () => {
    const f = fixture([2, 8], [3, 3]); f.ledger.noRakeOrDropVerified = false;
    expect(proveContestablePot(f.ledger).contestablePotBeforeCall.status).toBe("unknown");
    expect(assessLiveState(f.raw, context).verification.monetary.potDisplay.matches).toBe(true);
    expectLiveBlocked(f.raw, assessLiveState(f.raw, context));
  });
});
