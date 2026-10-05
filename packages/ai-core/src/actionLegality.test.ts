import { describe, expect, it } from "vitest";
import { validateActionLegality } from "./actionLegality.js";
import { deriveCandidateActions, type DecisionPacket } from "./decisionPacket.js";
import type { Recommendation } from "./recommendation.js";

function packet(call = 4, stack = 45): DecisionPacket {
  return {
    hero: { holeCards: [{ rank: 14, suit: "s" }, { rank: 13, suit: "s" }], position: "BTN", stackBB: stack },
    table: { potBB: 20, board: [{ rank: 7, suit: "h" }, { rank: 4, suit: "d" }, { rank: 2, suit: "c" }], street: "flop", numOpponentsRemaining: 1 },
    facingAction: call ? { type: "bet", amountBB: call } : { type: "none" }, candidateActions: deriveCandidateActions(call ? "bet" : "none"),
    engineCalculations: {}, dataConfidence: "high",
    policyContext: { potVerified: true, potSource: "unit fixture", accounting: "single_pot_no_rake", terminalAfterCall: false, checkEndsHand: false,
      legal: { verified: true, source: "explicit fixture controls", heroStreetBetBB: 0, opponentStreetBetBB: call, opponentStackBB: 100,
        chipUnitBB: 1, minBetBB: 2, minRaiseToBB: call ? call * 2 : null, aggressionReopened: true }, responses: [] },
  };
}
const rec = (action: Recommendation["action"], size?: number): Recommendation => ({ action, confidence: 0.6, reasoning: "Test recommendation.", ...(size === undefined ? {} : { sizingBB: size }) });

describe("monetary action legality", () => {
  it("leaves a supported CALL unchanged", () => {
    expect(validateActionLegality(rec("CALL"), packet())).toEqual({ isLegal: true, effectiveRecommendation: rec("CALL") });
  });
  it("allows checking exactly when nothing is owed", () => {
    expect(validateActionLegality(rec("CHECK"), packet(0)).isLegal).toBe(true);
    expect(validateActionLegality(rec("CHECK"), packet(4))).toMatchObject({ isLegal: false, effectiveRecommendation: { action: "FOLD" } });
  });
  it("does not offer FOLD when CHECK is available, including rejected-action fallbacks", () => {
    expect(deriveCandidateActions("none")).not.toContain("FOLD");
    expect(validateActionLegality(rec("FOLD"), packet(0))).toMatchObject({ isLegal: false, effectiveRecommendation: { action: "CHECK" } });
    expect(validateActionLegality(rec("CALL"), packet(0))).toMatchObject({ isLegal: false, effectiveRecommendation: { action: "CHECK" } });
  });
  it.each([0, -1, NaN, Infinity])("does not CALL with invalid remaining stack %s", stack => {
    expect(validateActionLegality(rec("CALL"), packet(4, stack))).toMatchObject({ isLegal: false, effectiveRecommendation: null });
  });
  it.each([undefined, 0, -1, NaN])("does not CALL a missing/invalid wager amount %s", amount => {
    const p = packet(); p.facingAction = amount === undefined ? { type: "bet" } : { type: "bet", amountBB: amount };
    expect(validateActionLegality(rec("CALL"), p)).toMatchObject({ isLegal: false, effectiveRecommendation: null });
  });
  it("rejects a no-bet label with a positive call cost", () => {
    const p = packet(); p.facingAction.type = "none";
    expect(validateActionLegality(rec("CHECK"), p)).toMatchObject({ isLegal: false, effectiveRecommendation: null });
  });
  it("uses payable call cost for a short-stack call, without claiming side-pot EV", () => {
    const p = packet(10, 3); delete p.policyContext;
    expect(validateActionLegality(rec("CALL", 3), p).isLegal).toBe(true);
    expect(validateActionLegality(rec("CALL", 2), p).isLegal).toBe(false);
  });
  it("does not conflate BET and RAISE", () => {
    expect(validateActionLegality(rec("BET", 10), packet()).isLegal).toBe(false);
    expect(validateActionLegality(rec("RAISE", 10), packet(0)).isLegal).toBe(false);
  });
  it.each(["BET", "RAISE"] as const)("rejects %s with missing sizing", action => {
    expect(validateActionLegality(rec(action), packet(action === "BET" ? 0 : 4)).isLegal).toBe(false);
  });
  it.each(["BET", "RAISE", "ALL_IN"] as const)("rejects %s beyond available chips", action => {
    expect(validateActionLegality(rec(action, 46), packet(action === "BET" ? 0 : 4)).isLegal).toBe(false);
  });
  it("checks bet minimums and exact raise-to minimums", () => {
    expect(validateActionLegality(rec("BET", 1), packet(0)).isLegal).toBe(false);
    expect(validateActionLegality(rec("BET", 2), packet(0)).isLegal).toBe(true);
    const p = packet(); p.policyContext!.legal.heroStreetBetBB = 2; p.policyContext!.legal.opponentStreetBetBB = 6;
    p.policyContext!.legal.minRaiseToBB = 10;
    expect(validateActionLegality(rec("RAISE", 7), p).isLegal).toBe(false);
    expect(validateActionLegality(rec("RAISE", 8), p).isLegal).toBe(true);
  });
  it("does not infer a minimum raise or reopening rights when evidence is missing", () => {
    const p = packet(); p.policyContext!.legal.minRaiseToBB = null;
    expect(validateActionLegality(rec("RAISE", 20), p)).toMatchObject({ isLegal: false, effectiveRecommendation: null });
    delete p.policyContext;
    expect(validateActionLegality(rec("ALL_IN"), p)).toMatchObject({ isLegal: false, effectiveRecommendation: null });
  });
  it("represents an all-in as exactly the remaining stack", () => {
    expect(validateActionLegality(rec("ALL_IN"), packet(4, 12))).toMatchObject({ isLegal: true, effectiveRecommendation: { action: "ALL_IN", sizingBB: 12 } });
    expect(validateActionLegality(rec("ALL_IN", 8), packet(4, 12)).isLegal).toBe(false);
  });
  it("allows a short all-in below the full minimum only when aggression is reopened", () => {
    const p = packet(4, 6);
    expect(validateActionLegality(rec("ALL_IN", 6), p).isLegal).toBe(true);
    p.policyContext!.legal.aggressionReopened = false;
    expect(validateActionLegality(rec("ALL_IN", 6), p).isLegal).toBe(false);
  });
  it("allows an all-in call without inventing raise legality", () => {
    const p = packet(10, 10); delete p.policyContext;
    expect(validateActionLegality(rec("ALL_IN"), p)).toMatchObject({ isLegal: true, effectiveRecommendation: { sizingBB: 10 } });
  });
  it("rejects off-grid wagers and sized passive actions", () => {
    expect(validateActionLegality(rec("RAISE", 10.5), packet()).isLegal).toBe(false);
    expect(validateActionLegality(rec("CHECK", 1), packet(0)).isLegal).toBe(false);
    expect(validateActionLegality(rec("FOLD", 1), packet()).isLegal).toBe(false);
  });
});
