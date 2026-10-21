import { describe, expect, it, vi } from "vitest";
import { parseCards } from "@poker-ai/shared";
import { buildPreflopContext, type PreflopInput } from "./preflopContext.js";
import { HjResponseReferenceSchema, HJ_RESPONSE_PROFILE, inspectLiveHjResponseStrategy,
  reviewHjResponseReference, type HjResponseReference } from "./preflopResponsePolicy.js";
import { getPolicyRecommendation } from "./policyRecommendation.js";
import { validateDecisionPacket } from "./decisionPacket.js";
import type { ModelRouter } from "./modelRouter.js";

// These allocations test the importer/classifier contract ONLY. They are not a
// poker chart, reviewed strategy, solve, or evidence for activating any action.
function reference(): HjResponseReference {
  return { schemaVersion: 1, id: "synthetic-contract-test", version: "1",
    provenance: { kind: "test_fixture", url: "https://example.invalid/test-only", node: "No real solve",
      review: "pending", reviewNotes: "Synthetic allocations, not strategic recommendations.",
      assumptions: ["Test-only classifications; not poker evidence."] },
    referenceSettings: { players: 6, hero: "HJ", opener: "UTG", openToBB: 2.5, anteBB: 0,
      startingCapacitiesBB: { UTG: 100, HJ: 100, CO: 100, BTN: 100, SB: 100, BB: 100 },
      rakeDescription: "Synthetic no-rake test model", coldCallsAllowed: true,
      threeBetSizesBB: [8, 9] },
    application: { profile: HJ_RESPONSE_PROFILE, minCapacityBB: 100, maxCapacityBB: 125,
      rationale: "Synthetic interval to test bounded coverage, not an approved depth adaptation." },
    entries: [
      { hand: "72o", allocations: [{ action: "FOLD", frequency: 1 }] },
      { hand: "88", allocations: [{ action: "CALL", frequency: 1 }] },
      { hand: "AA", allocations: [{ action: "THREE_BET", frequency: 1, raiseToBB: 8 }] },
      { hand: "AQs", allocations: [{ action: "CALL", frequency: 0.4 }, { action: "THREE_BET", frequency: 0.6, raiseToBB: 8 }] },
    ] };
}
function input(cards = "7h 2c") {
  const positions = ["UTG", "HJ", "CO", "BTN", "SB", "BB"] as const;
  const preflop: PreflopInput = { heroSeat: 2, playersDealtIn: 6, potBB: null, amountToCallBB: 2.5,
    contributionMeaning: "street_total", historyCoverage: "complete", actionWindowEvidence: "hj_facing_utg_open5",
    historyNotes: ["Synthetic context for policy-contract unit tests; not live proof."], tournamentContext: "chip_ev_only",
    players: positions.map((position, i) => {
      const contributionBB = i === 0 ? 2.5 : i === 4 ? 0.5 : i === 5 ? 1 : 0;
      return { seat: i + 1, position, remainingStackBB: 125 - contributionBB, contributionBB, folded: false, allIn: false };
    }),
    actions: [{ seat: 1, action: "raise", totalContributionBB: 2.5, observation: 66, wagerAction: "raise" }] };
  return { preflop, holeCards: parseCards(cards) };
}
describe("HJ response reference review (no installed live strategy)", () => {
  it.each(["7h 2c", "8s 8h", "Ah Ac", "Ah Qh"])("never invents a live action for %s", cards => {
    expect(inspectLiveHjResponseStrategy(input(cards))).toMatchObject({ status: "reference_missing",
      chosenAction: null, strategyClass: null, liveAuthorized: false, allocations: null, reference: null });
  });
  it.each([["7h 2c", "FOLD", null], ["8s 8h", "CALL", null], ["Ah Ac", "THREE_BET", 8]] as const)(
    "classifies synthetic %s allocations without selecting live advice", (cards, strategyClass, raiseToBB) => {
      const r = reviewHjResponseReference(input(cards), reference());
      expect(r).toMatchObject({ status: "pure", strategyClass, raiseToBB, chosenAction: null, liveAuthorized: false,
        reference: { provenance: { kind: "test_fixture", review: "pending" } } });
      expect(r.allocations?.[0]?.frequency).toBe(1);
    });
  it("preserves mixed action frequencies, reference sizes and assumptions", () => {
    const r = reference(), outcome = reviewHjResponseReference(input("Ah Qh"), r);
    expect(outcome).toMatchObject({ status: "mixed", strategyClass: null, chosenAction: null, raiseToBB: null });
    expect(outcome.allocations).toEqual(r.entries[3]!.allocations);
    expect(outcome.reference?.provenance.assumptions).toEqual(r.provenance.assumptions);
  });
  it("does not turn mixed raise sizes into a pure 3-bet", () => {
    const r = reference(); r.entries[2]!.allocations = [
      { action: "THREE_BET", frequency: 0.5, raiseToBB: 8 }, { action: "THREE_BET", frequency: 0.5, raiseToBB: 9 }];
    expect(reviewHjResponseReference(input("Ah Ac"), r)).toMatchObject({ status: "mixed", strategyClass: null, raiseToBB: null });
  });
  it("preserves even tiny mixed frequencies instead of rounding to FOLD", () => {
    const r = reference(); r.entries[0]!.allocations = [
      { action: "FOLD", frequency: 1 - 1e-12 }, { action: "CALL", frequency: 1e-12 }];
    expect(reviewHjResponseReference(input(), r).status).toBe("mixed");
  });
  it("does not fill an approximate frequency sum with an invented action", () => {
    const r = reference(); r.entries[0]!.allocations[0]!.frequency = 1 - 1e-12;
    expect(reviewHjResponseReference(input(), r).strategyClass).toBeNull();
  });
  it("an absent hand is uncovered, never an implicit FOLD", () => {
    expect(reviewHjResponseReference(input("Kh Qh"), reference())).toMatchObject({ status: "uncovered", strategyClass: null });
  });
  it.each(["frequencies", "negative", "NaN", "duplicate-hand", "duplicate-action", "hand-alias", "no-size", "unknown-size",
    "no-cold-call", "unknown-profile", "unbounded-depth", "reversed-depth", "missing-provenance", "wrong-position", "wrong-open"])(
    "rejects malformed reference: %s", variant => {
      const r: any = reference();
      if (variant === "frequencies") r.entries[0].allocations[0].frequency = 0.8;
      if (variant === "negative") r.entries[0].allocations[0].frequency = -1;
      if (variant === "NaN") r.entries[0].allocations[0].frequency = NaN;
      if (variant === "duplicate-hand") r.entries.push(r.entries[0]);
      if (variant === "duplicate-action") r.entries[0].allocations = [{ action: "FOLD", frequency: 0.5 }, { action: "FOLD", frequency: 0.5 }];
      if (variant === "hand-alias") r.entries[0].hand = "27o";
      if (variant === "no-size") delete r.entries[2].allocations[0].raiseToBB;
      if (variant === "unknown-size") r.entries[2].allocations[0].raiseToBB = 10;
      if (variant === "no-cold-call") r.referenceSettings.coldCallsAllowed = false;
      if (variant === "unknown-profile") r.application.profile = "unknown";
      if (variant === "unbounded-depth") r.application.maxCapacityBB = Infinity;
      if (variant === "reversed-depth") r.application.minCapacityBB = 150;
      if (variant === "missing-provenance") delete r.provenance.url;
      if (variant === "wrong-position") r.referenceSettings.hero = "CO";
      if (variant === "wrong-open") r.referenceSettings.openToBB = 3;
      expect(reviewHjResponseReference(input(), r)).toMatchObject({ status: "invalid_reference", chosenAction: null });
    });
  it("requires an explicit adaptation label for changed depths, never silently extrapolates 100BB+", () => {
    const r = reference(); r.provenance.kind = "verified_reference";
    expect(HjResponseReferenceSchema.safeParse(r).success).toBe(false);
    r.application.minCapacityBB = r.application.maxCapacityBB = 100;
    expect(HjResponseReferenceSchema.safeParse(r).success).toBe(true);
    expect(reviewHjResponseReference(input(), r).status).toBe("out_of_scope");
    r.provenance.kind = "adaptation"; r.application.maxCapacityBB = 125;
    expect(reviewHjResponseReference(input(), r).status).toBe("pure");
  });
  it("checks every player's depth, not just the minimum effective stack", () => {
    const i = input(); i.preflop.players[5]!.remainingStackBB = 200;
    expect(reviewHjResponseReference(i, reference()).status).toBe("out_of_scope");
  });
  it("matches an exact asymmetric reference by position, not merely its min/max", () => {
    const r = reference(), i = input();
    r.provenance.kind = "verified_reference";
    r.referenceSettings.startingCapacitiesBB = { UTG: 122, HJ: 125, CO: 125, BTN: 125, SB: 125, BB: 125 };
    r.application.minCapacityBB = 122;
    i.preflop.players[0]!.remainingStackBB = 119.5;
    expect(reviewHjResponseReference(i, r).status).toBe("pure");
    i.preflop.players[0]!.remainingStackBB = 122.5;
    i.preflop.players[1]!.remainingStackBB = 122;
    expect(reviewHjResponseReference(i, r).status).toBe("out_of_scope");
  });
  it.each(["wrong-hero", "missing-player", "unknown-stack", "short-stack", "wrong-gap", "wrong-total", "prior-call", "all-in",
    "partial-history", "no-source-window", "rfi-evidence", "duplicate-card", "duplicate-position", "tournament"])(
    "rejects unsupported context: %s", variant => {
      const i = input();
      if (variant === "wrong-hero") i.preflop.heroSeat = 3;
      if (variant === "missing-player") i.preflop.players.pop();
      if (variant === "unknown-stack") i.preflop.players[0]!.remainingStackBB = null;
      if (variant === "short-stack") i.preflop.players[0]!.remainingStackBB = 50;
      if (variant === "wrong-gap") i.preflop.amountToCallBB = 2;
      if (variant === "wrong-total") i.preflop.players[0]!.contributionBB = 3;
      if (variant === "prior-call") i.preflop.actions.push({ seat: 3, action: "call", wagerAction: "call", totalContributionBB: 2.5, observation: 67 });
      if (variant === "all-in") i.preflop.players[0]!.allIn = true;
      if (variant === "partial-history") i.preflop.historyCoverage = "partial";
      if (variant === "no-source-window") delete i.preflop.actionWindowEvidence;
      if (variant === "rfi-evidence") i.preflop.openingEvidence = "first_utg_hand_start";
      if (variant === "duplicate-card") i.holeCards[1] = i.holeCards[0]!;
      if (variant === "duplicate-position") i.preflop.players[2]!.position = "HJ";
      if (variant === "tournament") i.preflop.tournamentContext = "unknown";
      expect(reviewHjResponseReference(i, reference()).status).toBe("invalid_context");
    });
  it.each(["verified_reference", "adaptation", "heuristic", "test_fixture"] as const)(
    "a %s label/review flag cannot install a live chart or grant legality", kind => {
      const r = reference(); r.provenance.kind = kind; r.provenance.review = "reviewed";
      if (kind === "verified_reference") {
        r.referenceSettings.startingCapacitiesBB = { UTG: 125, HJ: 125, CO: 125, BTN: 125, SB: 125, BB: 125 };
        r.application.minCapacityBB = 125;
      }
      expect(reviewHjResponseReference(input("Ah Ac"), r)).toMatchObject({ chosenAction: null, liveAuthorized: false });
      expect(inspectLiveHjResponseStrategy(input("Ah Ac")).status).toBe("reference_missing");
    });
  it.each(["7h 2c", "8h 8d", "Ah Ad"])("the real policy/router cannot fall back to FOLD or an LLM for %s", async cards => {
    const i = input(cards), preflop = buildPreflopContext(i.preflop);
    const packet = validateDecisionPacket({ hero: { holeCards: i.holeCards, position: "HJ", stackBB: 125 },
      table: { street: "preflop", board: [], potBB: null, numOpponentsRemaining: 5 },
      facingAction: { type: "raise", amountBB: 2.5 }, candidateActions: ["FOLD", "CALL", "RAISE"],
      engineCalculations: {}, dataConfidence: "high", preflop });
    // This provider would never finish; an unsupported response must not call it.
    const router = { getRecommendation: vi.fn(() => new Promise(() => {})) } as unknown as ModelRouter;
    const result = await getPolicyRecommendation(packet, router, { mode: "fast" }, true);
    expect(result).toMatchObject({ result: null, decisionSource: "abstained", policy: { chosenAction: null } });
    expect(router.getRecommendation).not.toHaveBeenCalled();
  });
});
