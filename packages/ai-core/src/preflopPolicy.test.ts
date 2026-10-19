import { describe, expect, it, vi } from "vitest";
import { buildPreflopContext } from "./preflopContext.js";
import { decisionProofBinding, PROOF_SCOPES } from "./decisionProofs.js";
import { validateDecisionPacket, type DecisionPacket } from "./decisionPacket.js";
import { evaluateDecisionPolicy } from "./decisionPolicy.js";
import { evaluatePreflopReference, unopenedChartAction } from "./preflopPolicy.js";
import { getPolicyRecommendation } from "./policyRecommendation.js";
import type { ModelRouter } from "./modelRouter.js";
import { calculateRaiseEV } from "@poker-ai/poker-engine";

const positions = ["UTG", "HJ", "CO", "BTN", "SB", "BB"] as const;
// Synthetic independent certificates, NOT a captured live decision or complete source producer.
function bind(p: DecisionPacket) {
  p.decisionProofs ??= { version: 1, decisionEpoch: "decision-1", handId: "hand-1", connectionGeneration: 1,
    binding: "pending", proofs: PROOF_SCOPES.map(scope => ({ scope, status: "proven", confidence: "high", provenance: ["independent test certificate"], reasons: [] })) };
  p.decisionProofs.binding = decisionProofBinding(p, p.decisionProofs.decisionEpoch);
  return p;
}
function packet(position: typeof positions[number] = "BTN"): DecisionPacket {
  const index = positions.indexOf(position), heroContribution = position === "SB" ? 0.5 : position === "BB" ? 1 : 0;
  const preflop = buildPreflopContext({ heroSeat: index + 1, playersDealtIn: 6, potBB: 1.5,
    amountToCallBB: 1 - heroContribution, contributionMeaning: "street_total", historyCoverage: "complete", historyNotes: [], tournamentContext: "chip_ev_only",
    players: positions.map((position, i) => ({ seat: i + 1, position, remainingStackBB: 100,
      contributionBB: position === "SB" ? 0.5 : position === "BB" ? 1 : 0, folded: i < index, allIn: false })),
    actions: [
      { seat: 5, action: "post_blind", totalContributionBB: 0.5, observation: 0, wagerAction: null },
      { seat: 6, action: "post_blind", totalContributionBB: 1, observation: 1, wagerAction: null },
      ...positions.slice(0, index).map((_, i) => ({ seat: i + 1, action: "fold" as const, totalContributionBB: i === 4 ? 0.5 : 0, observation: i + 2, wagerAction: null })),
    ] });
  // BB option needs a live opponent, so represent a limp instead of everyone folding.
  if (position === "BB") {
    preflop.players[4]!.folded = false; preflop.players[4]!.contributionBB = 1;
    preflop.actions[6] = { seat: 5, action: "call", totalContributionBB: 1, observation: 6, wagerAction: "call" };
    preflop.potBB = 2;
  }
  const context = buildPreflopContext(preflop);
  return bind(validateDecisionPacket({ hero: { holeCards: [{ rank: 13, suit: "d" }, { rank: 12, suit: "h" }], position, stackBB: 100 },
    table: { street: "preflop", board: [], potBB: context.potBB!, numOpponentsRemaining: context.activeOpponents },
    facingAction: { type: heroContribution === 1 ? "none" : "raise", amountBB: 1 - heroContribution },
    candidateActions: heroContribution === 1 ? ["CHECK", "RAISE"] : ["FOLD", "CALL", "RAISE"], engineCalculations: {}, dataConfidence: "high", preflop: context,
    preflopExecution: { heroIsCurrentToAct: true, sourceWindowKey: "independently-covered-window:decision-1",
      raiseBounds: { source: "independent sizing fixture", verified: true, minRaiseToBB: 2, chipUnitBB: 0.5 },
      controls: { source: "independent current control fixture", formVisible: true, raiseSubmitVisible: true, raiseSubmitEnabled: true, selectedRaiseToBB: 2.5, issues: [] } },
    potEvidence: { unit: "chips", bigBlind: 2, mainPot: 0, displayedTotalPot: context.potBB! * 2, decisionPot: context.potBB! * 2,
      decisionPotSource: "independent pot certificate", isPotSemanticsVerified: true },
    policyContext: { potVerified: true, potSource: "independent pot certificate", accounting: "single_pot_no_rake", terminalAfterCall: false, checkEndsHand: false,
      legal: { verified: true, source: "independent legality certificate", heroStreetBetBB: heroContribution, opponentStreetBetBB: 1,
        opponentStackBB: 100, chipUnitBB: 0.5, minBetBB: 1, minRaiseToBB: 2, aggressionReopened: true }, responses: [] },
  }));
}
function blocked(p: DecisionPacket) {
  const result = evaluateDecisionPolicy(p);
  expect(result.chosenAction).toBeNull(); expect(result.llmMayChoose).toBe(false);
  expect(result.activation?.allowed).toBe(false);
  return result;
}

describe("scoped six-max deep-stack raise-first-in reference", () => {
  it.each(["UTG", "HJ", "CO", "BTN", "SB"] as const)("selects in-chart KQo from %s with independent proofs", position => {
    const p = packet(position), result = evaluateDecisionPolicy(p);
    expect(result).toMatchObject({ status: "selected", chosenAction: "RAISE", raiseToBB: 2.5,
      chosenSizeBB: position === "SB" ? 2 : 2.5, activation: { allowed: true, supportedDecisionType: "preflop_unopened" },
      equitySource: "not used by the RFI reference", foldEquitySource: "not assumed", llmMayChoose: false });
    expect(result.actionEVs).toEqual([]);
    expect(result.strategySource).toContain("100BB+");
    expect(p).not.toHaveProperty("historyComplete");
  });
  it("folds outside-chart 72o without inventing a limp or demanding the raise panel", () => {
    const p = packet(); p.hero.holeCards = [{ rank: 7, suit: "d" }, { rank: 2, suit: "h" }];
    p.preflopExecution!.controls.formVisible = false;
    expect(evaluateDecisionPolicy(bind(p))).toMatchObject({ chosenAction: "FOLD", chosenSizeBB: null, raiseToBB: null, activation: { allowed: true } });
  });
  it("does not treat the BB option as an RFI", () => { blocked(packet("BB")); });
  it.each(["AA", "72o", "KQo"])("BB versus SB limp has no strategy for %s even with synthetic legal CHECK/RAISE permissions", hand => {
    const p = packet("BB");
    if (hand === "AA") p.hero.holeCards = [{ rank: 14, suit: "s" }, { rank: 14, suit: "h" }];
    if (hand === "72o") p.hero.holeCards = [{ rank: 7, suit: "s" }, { rank: 2, suit: "h" }];
    expect(p.preflop!.situation).toBe("limped_pot");
    expect(p.facingAction.amountBB).toBe(0);
    expect(p.candidateActions).toEqual(["CHECK", "RAISE"]);
    expect(unopenedChartAction(p)).toBeNull();
    expect(evaluatePreflopReference(p)).toMatchObject({ action: null, raiseToBB: null });
    expect(evaluatePreflopReference(p).reasons.join(" ")).toContain("No deterministic response table");
    blocked(bind(p));
  });
  it.each([0, 0.5, 1])("equity %s and a legal free check do not supply a BB strategy or terminal model", equity => {
    const p = packet("BB");
    p.policyContext!.equity = { estimate: equity, low: equity, high: equity,
      source: "Synthetic showdown equity, not action EV", confidence: "medium" };
    p.policyContext!.checkEndsHand = true; // Deliberately false claim: preflop check only closes this round.
    p.policyContext!.responses = [{ investmentBB: 2, equityIfCalled: p.policyContext!.equity,
      foldEquity: { estimate: 0.5, low: 0.5, high: 0.5, source: "Synthetic assumption", confidence: "medium" },
      callerRangeBasis: "Uncalibrated SB continuation assumption", model: "fold_or_call", assumption: "No later betting or limp-reraise" }];
    expect(blocked(bind(p)).actionEVs).toEqual([]);
  });
  it("the existing simplified raise EV cannot identify CHECK vs RAISE without response/future-betting evidence", () => {
    // Counterexamples, NOT calibrated ranges, a legal sizing certificate, or a
    // poker policy. Even the optimistic no-more-betting simplification changes
    // its ranking when unmeasured inputs change. Real deep-stack CHECK is not 0.
    const checkShowdownOnly = 0.5 * 2;
    const unfavorable = calculateRaiseEV(0.25, 0, 2, 2, 2).ev;
    const favorable = calculateRaiseEV(0.75, 0.5, 2, 2, 2).ev;
    expect(unfavorable).toBeLessThan(checkShowdownOnly);
    expect(favorable).toBeGreaterThan(checkShowdownOnly);
    blocked(packet("BB"));
  });
  it.each([
    ["hero not to act", (p: DecisionPacket) => { p.preflopExecution!.heroIsCurrentToAct = false; }],
    ["missing execution", (p: DecisionPacket) => { delete p.preflopExecution; }],
    ["missing call", (p: DecisionPacket) => { p.preflop!.amountToCallBB = null; }],
    ["unknown effective stack", (p: DecisionPacket) => { p.preflop!.players[5]!.remainingStackBB = null; }],
    ["20BB hero", (p: DecisionPacket) => { p.hero.stackBB = 20; p.preflop!.players[3]!.remainingStackBB = 20; }],
    ["99BB opponent", (p: DecisionPacket) => { p.preflop!.players[5]!.remainingStackBB = 98; }],
    ["unknown dealt-in roster", (p: DecisionPacket) => { p.preflop!.playersDealtIn = null; }],
    ["five-handed chart misuse", (p: DecisionPacket) => { p.preflop!.playersDealtIn = 5; }],
    ["duplicate position", (p: DecisionPacket) => { p.preflop!.players[0]!.position = "BTN"; }],
    ["partial window", (p: DecisionPacket) => { p.preflop!.historyCoverage = "partial"; }],
    ["unresolved event", (p: DecisionPacket) => { p.preflop!.historyNotes.push("unparsed source event"); }],
    ["no blind evidence", (p: DecisionPacket) => { p.preflop!.actions = p.preflop!.actions.filter(a => a.action !== "post_blind"); }],
    ["tied posts", (p: DecisionPacket) => { p.preflop!.actions[1]!.observation = 0; }],
    ["earlier hero action", (p: DecisionPacket) => { p.preflop!.actions.push({ seat: 4, action: "check", totalContributionBB: 0, observation: 9, wagerAction: null }); }],
    ["all-in", (p: DecisionPacket) => { p.preflop!.players[5]!.allIn = true; }],
    ["unknown tournament", (p: DecisionPacket) => { p.preflop!.tournamentContext = "unknown"; }],
    ["missing minimum", (p: DecisionPacket) => { delete p.preflopExecution!.raiseBounds; }],
    ["minimum exceeds size", (p: DecisionPacket) => { p.preflopExecution!.raiseBounds!.minRaiseToBB = 3; }],
    ["illegal chip unit", (p: DecisionPacket) => { p.preflopExecution!.raiseBounds!.chipUnitBB = 1; }],
    ["legal bounds unverified", (p: DecisionPacket) => { p.preflopExecution!.raiseBounds!.verified = false; }],
    ["selected input differs", (p: DecisionPacket) => { p.preflopExecution!.controls.selectedRaiseToBB = 3; }],
    ["submit disabled", (p: DecisionPacket) => { p.preflopExecution!.controls.raiseSubmitEnabled = false; }],
    ["ambiguous control", (p: DecisionPacket) => { p.preflopExecution!.controls.issues = ["duplicate forms"]; }],
  ] as const)("abstains: %s", (_, mutate) => { const p = packet(); mutate(p); blocked(bind(p)); });
  it.each(["limp", "one open", "intervening raise", "ambiguous opener"])("keeps %s blocked", kind => {
    const p = packet(), c = p.preflop!;
    c.players[0]!.folded = false; c.players[0]!.contributionBB = kind === "limp" ? 1 : 3;
    c.actions[2] = { seat: kind === "ambiguous opener" ? 10 : 1, action: kind === "limp" ? "call" : "raise",
      totalContributionBB: c.players[0]!.contributionBB, observation: 2, wagerAction: kind === "limp" ? "call" : "raise" };
    if (kind === "intervening raise") {
      c.players[1]!.folded = false; c.players[1]!.contributionBB = 9;
      c.actions[3] = { seat: 2, action: "raise", totalContributionBB: 9, observation: 3, wagerAction: "raise" };
    }
    c.amountToCallBB = kind === "intervening raise" ? 9 : c.players[0]!.contributionBB;
    c.potBB = c.players.reduce((sum, p) => sum + (p.contributionBB ?? 0), 0);
    p.preflop = buildPreflopContext(c); p.table.potBB = c.potBB;
    p.table.numOpponentsRemaining = p.preflop.activeOpponents; p.facingAction.amountBB = c.amountToCallBB!;
    p.potEvidence!.decisionPot = c.potBB * 2;
    if (kind === "one open") expect(p.preflop.situation).toBe("facing_open");
    blocked(bind(p));
  });
  it.each(["chain gap", "reconnect"])("rejects %s despite clean chart facts", reason => {
    const p = packet(), proof = p.decisionProofs!.proofs.find(p => p.scope === "connection")!;
    proof.status = reason === "chain gap" ? "contradicted" : "insufficient"; proof.reasons = [reason];
    blocked(p);
  });
  it.each(["cards", "action", "window", "hand", "generation", "control"])("invalidates stale %s before display", change => {
    const p = packet();
    if (change === "cards") p.hero.holeCards[0] = { rank: 14, suit: "s" };
    if (change === "action") p.preflop!.actions.push({ seat: 5, action: "call", totalContributionBB: 1, observation: 8, wagerAction: "call" });
    if (change === "window") p.preflopExecution!.sourceWindowKey += ":new-source-action";
    if (change === "hand") p.decisionProofs!.handId = "hand-2";
    if (change === "generation") p.decisionProofs!.connectionGeneration = 2;
    if (change === "control") p.preflopExecution!.controls.raiseSubmitEnabled = false;
    expect(blocked(p).activation).toMatchObject({ state: "unsafe", failedProofs: expect.arrayContaining(["decisionState"]) });
  });
  it("does not allow legacy packets to bypass scoped proofs", () => {
    const p = packet(); delete p.decisionProofs; delete p.potEvidence;
    expect(evaluateDecisionPolicy(p)).toMatchObject({ chosenAction: null, llmMayChoose: false });
  });
  it("does not require pot, EV, side-pot/return/rake or generic action-set proofs for the chart", async () => {
    const p = packet(); p.table.potBB = null; p.preflop!.potBB = null;
    p.potEvidence!.decisionPot = null; p.potEvidence!.isPotSemanticsVerified = false;
    p.dataConfidence = "low"; // Aggregate confidence includes the unknown EV pot.
    delete p.policyContext;
    p.opponentContext = { opponents: [{ seat: 6, position: "BB", statsStorage: "unavailable",
      rangeStatus: "unavailable", rangeConfidence: "low", rangeBasis: "unused by the RFI chart" }] };
    for (const proof of p.decisionProofs!.proofs) if (["pot", "accounting", "eligibility", "equity", "rangeInput", "terminal", "legalActions", "reopening"].includes(proof.scope)) {
      proof.status = "insufficient"; proof.reasons = ["Not supplied, not relevant to RFI chart"];
    }
    p.preflop = buildPreflopContext(p.preflop!);
    const normalized = validateDecisionPacket(bind(p));
    const router: ModelRouter = { getRecommendation: vi.fn(async () => { throw new Error("offline"); }) };
    expect(await getPolicyRecommendation(normalized, router, { mode: "fast" }, true)).toMatchObject({
      decisionSource: "engine_policy", result: { action: "RAISE", sizingBB: 2.5 }, activation: { allowed: true } });
    const required = evaluateDecisionPolicy(normalized).activation!.requiredProofs;
    for (const scope of ["pot", "accounting", "eligibility", "equity", "rangeInput", "terminal", "legalActions", "reopening"]) expect(required).not.toContain(scope);
  });
  it("fold does not require a Raise panel or bounds, but still requires decision-local proofs", () => {
    const p = packet(); p.hero.holeCards = [{ rank: 7, suit: "d" }, { rank: 2, suit: "h" }];
    delete p.policyContext; delete p.preflopExecution!.raiseBounds;
    p.preflopExecution!.controls.raiseSubmitEnabled = null;
    const proof = p.decisionProofs!.proofs.find(p => p.scope === "raiseLegality")!;
    proof.status = "insufficient"; proof.reasons = ["No raise evidence"];
    const result = evaluateDecisionPolicy(bind(p));
    expect(result.chosenAction).toBe("FOLD"); expect(result.activation!.requiredProofs).not.toContain("raiseLegality");
    p.decisionProofs!.proofs.find(p => p.scope === "position")!.status = "insufficient";
    blocked(p);
  });
  it.each(["offline", "wrong action", "wrong size", "matching explanation"])("keeps the engine action locked with provider %s", async scenario => {
    const router: ModelRouter = { getRecommendation: vi.fn(async () => {
      if (scenario === "offline") throw new Error("provider outage");
      return { action: scenario === "wrong action" ? "CALL" as const : "RAISE" as const,
        sizingBB: scenario === "wrong size" ? 10 : 2.5, confidence: 0.99, reasoning: "Opening from the button." };
    }) };
    const result = await getPolicyRecommendation(validateDecisionPacket(packet()), router, { mode: "fast" }, true);
    expect(result).toMatchObject({ result: { action: "RAISE", sizingBB: 2.5, confidence: 0.65 }, decisionSource: "engine_policy", activation: { allowed: true } });
    expect(result.explanationSource).toBe(scenario === "matching explanation" ? "llm" : "engine");
    expect(result.result).not.toHaveProperty("evBB");
  });
});
