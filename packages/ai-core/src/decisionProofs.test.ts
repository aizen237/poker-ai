import { describe, expect, it, vi } from "vitest";
import { PROOF_SCOPES, assessDecisionProofs, assessPacketDecisionProofs, decisionProofBinding,
  type ScopedProof, type DecisionScopeInput } from "./decisionProofs.js";
import { validateDecisionPacket, type DecisionPacket } from "./decisionPacket.js";
import { evaluateDecisionPolicy, generatePolicyCandidates } from "./decisionPolicy.js";
import { getPolicyRecommendation } from "./policyRecommendation.js";
import type { ModelRouter } from "./modelRouter.js";
import { buildPreflopContext } from "./preflopContext.js";

// Independently supplied synthetic decision-local certificates. Not live capture or an upgrade of polling history.
const proofs = (): ScopedProof[] => PROOF_SCOPES.map(scope => ({ scope, status: "proven", confidence: "high", provenance: [`Independent test certificate for ${scope}`], reasons: [] }));
const input: DecisionScopeInput = { street: "river", opponents: 1, amountToCall: 5, aggressionPossible: false };
function evidencePacket(call = 5): DecisionPacket {
  const p = validateDecisionPacket({ hero: { holeCards: [{ rank: 14, suit: "s" }, { rank: 12, suit: "d" }], position: "BTN", stackBB: 20 },
    table: { potBB: 20, board: [{ rank: 2, suit: "c" }, { rank: 7, suit: "h" }, { rank: 8, suit: "d" }, { rank: 9, suit: "s" }, { rank: 11, suit: "c" }], street: "river", numOpponentsRemaining: 1 },
    facingAction: call ? { type: "bet", amountBB: call } : { type: "none" },
    candidateActions: call ? ["FOLD", "CALL", "RAISE", "ALL_IN"] : ["CHECK", "BET", "ALL_IN"],
    dataConfidence: "high", engineCalculations: { equity: 0.8, equitySource: "estimated_range" },
    opponentContext: { rangeStatus: "modeled", rangeConfidence: "medium" },
    potEvidence: { unit: "chips", mainPot: 40 - call * 2, displayedTotalPot: 40, decisionPot: 40, decisionPotSource: "independent simple-pot fixture", isPotSemanticsVerified: true, bigBlind: 2 },
    policyContext: { potVerified: true, potSource: "independent simple-pot fixture", accounting: "single_pot_no_rake",
      terminalAfterCall: true, checkEndsHand: true,
      legal: { verified: true, source: "independent exact control fixture", heroStreetBetBB: 0, opponentStreetBetBB: call,
        opponentStackBB: 50, chipUnitBB: 0.1, minBetBB: 1, minRaiseToBB: call ? call * 2 : null, aggressionReopened: true },
      equity: { estimate: 0.8, low: 0.75, high: 0.85, source: "explicit range sensitivity fixture", confidence: "medium" }, responses: [] },
  });
  bind(p);
  if (call) {
    p.policyContext!.responses = generatePolicyCandidates(p).map(c => ({ investmentBB: c.investmentBB,
      equityIfCalled: { estimate: 0.1, low: 0.1, high: 0.1, source: "synthetic stronger range continuing to a raise", confidence: "medium" },
      foldEquity: { estimate: 0, low: 0, high: 0, source: "explicit synthetic response assumption", confidence: "medium" },
      callerRangeBasis: "per-size supplied model", model: "fold_or_call", assumption: "no reraise branch" }));
  }
  return bind(p);
}
function bind(p: DecisionPacket): DecisionPacket {
  p.decisionProofs = { version: 1, decisionEpoch: "decision-1", handId: "hand", connectionGeneration: 1,
    binding: "pending", proofs: p.decisionProofs?.proofs ?? proofs() };
  p.decisionProofs.binding = decisionProofBinding(p, "decision-1");
  return p;
}
const router = (): ModelRouter => ({ getRecommendation: vi.fn(async () => { throw new Error("explanation offline"); }) });

describe("independent decision scopes, not global whole-hand history", () => {
  it.each(["unopened", "facing_open"])("recognizes proven preflop %s inputs without inventing the action sequence", situation => {
    const result = assessDecisionProofs({ ...input, street: "preflop", preflopSituation: situation }, proofs());
    expect(result.allowed).toBe(true);
    expect(result.supportedDecisionType).toBe(situation === "unopened" ? "preflop_unopened" : "preflop_facing_open");
    expect(result.requiredProofs).toEqual(expect.arrayContaining(["actionWindow", "position", "roster", "stack", "blinds"]));
  });
  it("does not infer preflop open/3-bet state from bet size", () => {
    const result = assessDecisionProofs({ ...input, street: "preflop", amountToCall: 15, preflopSituation: "facing_raise_unknown_level" }, proofs());
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("bet size");
  });
  it.each([
    ["missing preflop action order", "actionWindow", "insufficient"],
    ["preflop socket gap", "connection", "contradicted"],
    ["ambiguous call amount", "callCost", "insufficient"],
    ["side pot present", "eligibility", "contradicted"],
    ["uncalled return affects pot", "accounting", "insufficient"],
    ["unresolved rake/drop", "accounting", "insufficient"],
    ["short all-in reopening ambiguity", "reopening", "insufficient"],
    ["settlement display", "decisionState", "contradicted"],
    ["reconnect/reset", "connection", "insufficient"],
  ] as const)("blocks %s", (reason, scope, status) => {
    const evidence = proofs(); Object.assign(evidence.find(p => p.scope === scope)!, { status, confidence: "low", reasons: [reason] });
    const result = assessDecisionProofs({ ...input, ...(reason.startsWith("preflop") ? { street: "preflop" as const, preflopSituation: "unopened" } : {}) }, evidence);
    expect(result).toMatchObject({ allowed: false, state: status === "contradicted" ? "unsafe" : "waiting_for_proof" });
    expect(result.failedProofs).toContain(scope);
    expect(result.reasons).toContain(reason);
  });
  it("never supports multiway postflop even with every proof supplied", () => {
    expect(assessDecisionProofs({ ...input, opponents: 2 }, proofs())).toMatchObject({ allowed: false, state: "unsupported" });
  });
  it("recovers from insufficient evidence and immediately invalidates fresh contradictions", () => {
    const evidence = proofs(), pot = evidence.find(p => p.scope === "pot")!;
    pot.status = "insufficient";
    expect(assessDecisionProofs(input, evidence).allowed).toBe(false);
    pot.status = "proven";
    expect(assessDecisionProofs(input, evidence).allowed).toBe(true);
    pot.status = "contradicted"; pot.reasons = ["fresh display mismatch"];
    expect(assessDecisionProofs(input, evidence)).toMatchObject({ allowed: false, state: "unsafe" });
  });
  it("does not require irrelevant raise minimums for a proven closed-aggression call/fold", () => {
    expect(assessDecisionProofs(input, proofs().filter(p => p.scope !== "raiseLegality")).allowed).toBe(true);
    expect(assessDecisionProofs({ ...input, aggressionPossible: null }, proofs().filter(p => p.scope !== "raiseLegality")).failedProofs).toContain("raiseLegality");
  });
  it.each(["no source", "low confidence", "duplicate proof", "unresolved reason"])("rejects nominal proven labels with %s", variant => {
    const evidence = proofs(), p = evidence[0]!;
    if (variant === "no source") p.provenance = [];
    if (variant === "low confidence") p.confidence = "low";
    if (variant === "duplicate proof") evidence.push({ ...p });
    if (variant === "unresolved reason") p.reasons = ["not actually resolved"];
    expect(assessDecisionProofs(input, evidence).allowed).toBe(false);
  });
});

describe("packet binding, engine authority and unchanged model limits", () => {
  it("selects a terminal heads-up call with independent scoped proofs, without any historyComplete=true", async () => {
    const p = evidencePacket();
    const result = await getPolicyRecommendation(p, router(), { mode: "fast" }, true);
    expect(result).toMatchObject({ decisionSource: "engine_policy", activation: { allowed: true }, result: { action: "CALL" } });
    expect(p).not.toHaveProperty("historyComplete");
  });
  it("supports the existing river bet/check model only with legal candidates and per-size responses", () => {
    const p = evidencePacket(0);
    p.policyContext!.responses = generatePolicyCandidates(p).map(c => ({ investmentBB: c.investmentBB,
      equityIfCalled: { estimate: 0.1, low: 0.1, high: 0.1, source: "size-conditioned range", confidence: "medium" },
      foldEquity: { estimate: 0, low: 0, high: 0, source: "explicit test assumption", confidence: "medium" },
      callerRangeBasis: "independent test model", model: "fold_or_call", assumption: "no reraise branch" }));
    bind(p);
    expect(evaluateDecisionPolicy(p).chosenAction).toBe("CHECK");
  });
  it.each(["call/fold", "check/bet"])("does not manufacture a flop %s strategy from clean input proofs", async kind => {
    const p = evidencePacket(kind === "call/fold" ? 5 : 0);
    p.table.street = "flop"; p.table.board = p.table.board.slice(0, 3); bind(p);
    const mock = router();
    const result = await getPolicyRecommendation(p, mock, { mode: "fast" }, true);
    expect(result).toMatchObject({ result: null, activation: { allowed: false, state: "unsupported" } });
    expect(mock.getRecommendation).not.toHaveBeenCalled();
    expect(result.uncertainty!.join(" ")).toContain("future-betting");
  });
  it.each([false, true])("withholds preflop lacking execution evidence or a response model (facing open=%s)", facingOpen => {
    const p = evidencePacket();
    const players = (["UTG", "HJ", "CO", "BTN", "SB", "BB"] as const).map((position, i) => ({ seat: i + 1, position,
      remainingStackBB: 100, contributionBB: i === 4 ? 0.5 : i === 5 ? 1 : facingOpen && i === 0 ? 3 : 0,
      folded: i < 3 && !(facingOpen && i === 0), allIn: false }));
    const preflop = buildPreflopContext({ heroSeat: 4, players, playersDealtIn: 6, potBB: facingOpen ? 4.5 : 1.5,
      amountToCallBB: facingOpen ? 3 : 1, contributionMeaning: "street_total", historyCoverage: "complete",
      historyNotes: [], tournamentContext: "chip_ev_only", actions: [
        { seat: 5, action: "post_blind", totalContributionBB: 0.5, observation: 0, wagerAction: null },
        { seat: 6, action: "post_blind", totalContributionBB: 1, observation: 1, wagerAction: null },
        { seat: 1, action: facingOpen ? "raise" : "fold", totalContributionBB: facingOpen ? 3 : 0, observation: 2, wagerAction: facingOpen ? "raise" : null },
        { seat: 2, action: "fold", totalContributionBB: 0, observation: 3, wagerAction: null },
        { seat: 3, action: "fold", totalContributionBB: 0, observation: 4, wagerAction: null },
      ] });
    expect(preflop.situation).toBe(facingOpen ? "facing_open" : "unopened");
    p.preflop = preflop; p.hero.stackBB = 100;
    p.table = { ...p.table, street: "preflop", board: [], potBB: preflop.potBB!, numOpponentsRemaining: preflop.activeOpponents };
    p.facingAction = { type: "raise", amountBB: preflop.amountToCallBB! };
    p.potEvidence!.decisionPot = preflop.potBB! * 2;
    bind(p);
    expect(assessPacketDecisionProofs(p)!.failedProofs).not.toContain("actionWindow");
    expect(evaluateDecisionPolicy(p)).toMatchObject({ chosenAction: null, llmMayChoose: false, activation: { state: "unsupported" } });
  });
  it("keeps unsupported preflop out of LLM fallback", async () => {
    const p = evidencePacket(); p.table.street = "preflop"; p.table.board = []; bind(p);
    const mock = router(), result = await getPolicyRecommendation(p, mock, { mode: "fast" }, true);
    expect(result).toMatchObject({ result: null, activation: { allowed: false, state: "unsupported" } });
    expect(result.uncertainty!.join(" ")).toContain("No deterministic preflop response model");
    expect(mock.getRecommendation).not.toHaveBeenCalled();
  });
  it.each(["pot", "call", "range", "epoch", "hand", "generation"])("rejects stale proof binding when %s changes", change => {
    const p = evidencePacket();
    if (change === "pot") p.table.potBB++;
    if (change === "call") p.facingAction.amountBB = 6;
    if (change === "range") p.engineCalculations.equity = 0.7;
    if (change === "epoch") p.decisionProofs!.decisionEpoch = "new-decision";
    if (change === "hand") p.decisionProofs!.handId = "another-hand";
    if (change === "generation") p.decisionProofs!.connectionGeneration = 2;
    expect(assessPacketDecisionProofs(p)).toMatchObject({ allowed: false, state: "unsafe", failedProofs: expect.arrayContaining(["decisionState"]) });
  });
  it("survives schema normalization/object key order without weakening the binding", () => {
    const p = evidencePacket();
    p.hero = { stackBB: p.hero.stackBB, position: p.hero.position, holeCards: p.hero.holeCards };
    expect(assessPacketDecisionProofs(validateDecisionPacket(p))!.allowed).toBe(true);
  });
  it.each(["fast", "strong", "manual", "consensus"] as const)("never calls any LLM on a failed proof in %s mode", async mode => {
    const p = evidencePacket(); p.decisionProofs!.proofs.find(p => p.scope === "callCost")!.status = "insufficient";
    const mock = router();
    expect(await getPolicyRecommendation(p, mock, { mode }, true)).toMatchObject({ result: null, blockedReason: "scoped_decision_proof" });
    expect(mock.getRecommendation).not.toHaveBeenCalled();
  });
  it("requires scoped proofs at the live relay boundary even when the live marker was omitted", async () => {
    const p = evidencePacket(); delete p.decisionProofs; delete p.potEvidence;
    const mock = router();
    expect(await getPolicyRecommendation(p, mock, { mode: "fast" }, true)).toMatchObject({ result: null, blockedReason: "scoped_decision_proof" });
    expect(mock.getRecommendation).not.toHaveBeenCalled();
  });
  it("does not unlock all-in eligibility through optimistic labels", () => {
    const p = evidencePacket(); p.facingAction.type = "all_in"; p.policyContext!.legal.opponentStackBB = 0; bind(p);
    expect(assessPacketDecisionProofs(p)!.failedProofs).toContain("eligibility");
  });
});
