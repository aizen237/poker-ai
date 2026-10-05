import { afterEach, describe, expect, it, vi } from "vitest";
import { validateDecisionPacket, type DecisionPacket } from "./decisionPacket.js";
import { evaluateDecisionPolicy, generatePolicyCandidates, PolicyEstimateSchema, type PolicyEstimate } from "./decisionPolicy.js";
import { getPolicyRecommendation } from "./policyRecommendation.js";
import type { ModelRouter } from "./modelRouter.js";
import { createGroqProvider } from "./providers/groq.js";
import { createGeminiProvider } from "./providers/gemini.js";
import { createNvidiaProvider } from "./providers/nvidia.js";

const estimate = (e: number, low = e, high = e, source = "explicit test range sensitivity"): PolicyEstimate =>
  ({ estimate: e, low, high, source, confidence: "medium" });

function packet(): DecisionPacket {
  return validateDecisionPacket({
    hero: { holeCards: [{ rank: 14, suit: "s" }, { rank: 12, suit: "d" }], position: "BTN", stackBB: 20 },
    table: { potBB: 20, board: [{ rank: 2, suit: "c" }, { rank: 7, suit: "h" }, { rank: 8, suit: "d" }, { rank: 9, suit: "s" }, { rank: 11, suit: "c" }], street: "river", numOpponentsRemaining: 1 },
    facingAction: { type: "all_in", amountBB: 5 }, candidateActions: ["FOLD", "CALL", "RAISE", "ALL_IN"],
    engineCalculations: { equity: 0.4, equitySource: "estimated_range", callEV: 999 },
    opponentContext: { rangeStatus: "modeled", rangeConfidence: "medium" }, dataConfidence: "high",
    policyContext: { potVerified: true, potSource: "verified pot inclusive of outstanding wagers", accounting: "single_pot_no_rake",
      terminalAfterCall: true, checkEndsHand: false,
      legal: { verified: true, source: "verified action controls", heroStreetBetBB: 2, opponentStreetBetBB: 7,
        opponentStackBB: 0, chipUnitBB: 0.1, minBetBB: 1, minRaiseToBB: null, aggressionReopened: false },
      equity: estimate(0.4, 0.35, 0.45), responses: [] },
  });
}
function setEquity(p: DecisionPacket, e: number, low = e, high = e) {
  p.engineCalculations.equity = e;
  p.policyContext!.equity = estimate(e, low, high);
}
function bettingPacket(): DecisionPacket {
  const p = packet();
  p.hero.stackBB = 100;
  p.facingAction = { type: "none" };
  p.candidateActions = ["CHECK", "BET", "ALL_IN"];
  p.policyContext!.checkEndsHand = true;
  Object.assign(p.policyContext!.legal, { heroStreetBetBB: 0, opponentStreetBetBB: 0, opponentStackBB: 100, aggressionReopened: true });
  return p;
}
function raisingPacket(): DecisionPacket {
  const p = packet();
  p.hero.stackBB = 40;
  p.facingAction.type = "bet";
  Object.assign(p.policyContext!.legal, { opponentStackBB: 50, minRaiseToBB: 12, aggressionReopened: true });
  return p;
}
function addResponses(p: DecisionPacket, called = 0.1, fold = 0) {
  p.policyContext!.responses = generatePolicyCandidates(p).map(c => ({ investmentBB: c.investmentBB,
    equityIfCalled: estimate(called, called, called, "equity vs per-size caller range"),
    callerRangeBasis: "explicit size-conditioned continuing range",
    foldEquity: estimate(fold, fold, fold, "explicit test fold assumption, not measured fact"),
    model: "fold_or_call", assumption: "Illustrative river model assumes no re-raises." }));
}

describe("CALL versus FOLD policy", () => {
  it("selects a robust profitable call, recomputing EV instead of trusting cached callEV", () => {
    const result = evaluateDecisionPolicy(packet());
    expect(result).toMatchObject({ status: "selected", chosenAction: "CALL", chosenSizeBB: 5, llmMayChoose: false, confidence: "medium" });
    expect(result.actionEVs[0]).toMatchObject({ action: "FOLD", evBB: 0, lowBB: 0, highBB: 0 });
    expect(result.actionEVs[1]).toMatchObject({ action: "CALL", evBB: 5, lowBB: 3.75, highBB: 6.25 });
  });
  it("folds only when call's upper bound is negative in a complete comparison", () => {
    const p = packet(); setEquity(p, 0.1, 0.05, 0.15);
    expect(evaluateDecisionPolicy(p)).toMatchObject({ status: "selected", chosenAction: "FOLD", chosenSizeBB: null });
  });
  it.each([[0.2, 0.2, 0.2], [0.25, 0.15, 0.35], [0.25, 0.2, 0.3]])("abstains on tied/overlapping bounds %s %s %s", (e, lo, hi) => {
    const p = packet(); setEquity(p, e!, lo!, hi!);
    expect(evaluateDecisionPolicy(p)).toMatchObject({ status: "uncertain", chosenAction: null, llmMayChoose: false });
  });
  it.each(["flop", "turn"] as const)("supports matched heads-up all-in calls on %s without future betting", street => {
    const p = packet(); p.table.street = street; p.table.board = p.table.board.slice(0, street === "flop" ? 3 : 4);
    expect(evaluateDecisionPolicy(p).chosenAction).toBe("CALL");
  });
  it("supports a hero all-in call that exactly matches, even with opponent chips behind", () => {
    const p = packet(); p.hero.stackBB = 5; p.policyContext!.legal.opponentStackBB = 30;
    p.facingAction.type = "bet";
    p.table.street = "flop"; p.table.board = p.table.board.slice(0, 3);
    expect(evaluateDecisionPolicy(p).chosenAction).toBe("CALL");
  });
  it("does not invent capped pot accounting for an unmatched short all-in call", () => {
    const p = packet(); p.hero.stackBB = 3;
    expect(evaluateDecisionPolicy(p)).toMatchObject({ chosenAction: null, llmMayChoose: false });
  });
  it("does not treat raw flop equity as realized call EV with chips behind", () => {
    const p = packet(); p.table.street = "flop"; p.table.board = p.table.board.slice(0, 3);
    p.policyContext!.legal.opponentStackBB = 30;
    expect(evaluateDecisionPolicy(p).chosenAction).toBeNull();
  });
  it("does not suppress raising just because call EV is available", () => {
    const p = raisingPacket();
    const r = evaluateDecisionPolicy(p);
    expect(r).toMatchObject({ status: "unsupported", chosenAction: null, llmMayChoose: true });
    expect(r.actionEVs.some(row => row.action === "RAISE" && row.evBB === null)).toBe(true);
  });
});

describe("policy evidence and uncertainty gates", () => {
  it.each([
    ["missing policy evidence", (p: DecisionPacket) => { delete p.policyContext; }],
    ["unverified pot", (p: DecisionPacket) => { p.policyContext!.potVerified = false; }],
    ["rake/side pots", (p: DecisionPacket) => { p.policyContext!.accounting = "unknown"; }],
    ["low read confidence", (p: DecisionPacket) => { p.dataConfidence = "low"; }],
    ["medium read confidence", (p: DecisionPacket) => { p.dataConfidence = "medium"; }],
    ["multiway", (p: DecisionPacket) => { p.table.numOpponentsRemaining = 2; }],
    ["random equity", (p: DecisionPacket) => { p.engineCalculations.equitySource = "random_hands"; }],
    ["unknown equity", (p: DecisionPacket) => { p.engineCalculations.equitySource = "unknown"; }],
    ["prior-only range", (p: DecisionPacket) => { p.opponentContext!.rangeStatus = "prior_only"; }],
    ["low range confidence", (p: DecisionPacket) => { p.opponentContext!.rangeConfidence = "low"; }],
    ["low bounds confidence", (p: DecisionPacket) => { p.policyContext!.equity!.confidence = "low"; }],
    ["missing bounds", (p: DecisionPacket) => { delete p.policyContext!.equity; }],
    ["mismatched point equity", (p: DecisionPacket) => { p.engineCalculations.equity = 0.9; }],
    ["unverified legality", (p: DecisionPacket) => { p.policyContext!.legal.verified = false; }],
    ["mismatched contributions", (p: DecisionPacket) => { p.policyContext!.legal.heroStreetBetBB = 1; }],
    ["pot excludes wagers", (p: DecisionPacket) => { p.table.potBB = 5; }],
    ["all-in with chips behind", (p: DecisionPacket) => { p.policyContext!.legal.opponentStackBB = 10; }],
    ["off-grid stack", (p: DecisionPacket) => { p.hero.stackBB = 20.01; }],
    ["nonterminal call", (p: DecisionPacket) => { p.policyContext!.terminalAfterCall = false; }],
    ["invalid board", (p: DecisionPacket) => { p.table.board.pop(); }],
    ["duplicate card", (p: DecisionPacket) => { p.table.board[0] = p.hero.holeCards[0]; }],
    ["preflop", (p: DecisionPacket) => { p.table.street = "preflop"; p.table.board = []; }],
    ["contradictory candidates", (p: DecisionPacket) => { p.candidateActions = ["FOLD"]; }],
  ] as const)("does not select with %s", (_label, mutate) => {
    const p = packet(); mutate(p);
    const result = evaluateDecisionPolicy(p);
    expect(result.chosenAction).toBeNull(); expect(result.reasons.length).toBeGreaterThan(0);
  });
  it.each([
    { estimate: 0.4, low: 0.5, high: 0.7 }, { estimate: 0.4, low: 0.1, high: 0.3 },
    { estimate: NaN, low: 0, high: 1 }, { estimate: Infinity, low: 0, high: 1 },
    { estimate: -0.1, low: 0, high: 1 },
  ])("rejects malformed probability evidence %j", values => {
    expect(PolicyEstimateSchema.safeParse({ ...estimate(0.4), ...values }).success).toBe(false);
  });
  it("rejects missing fold-equity provenance rather than supplying a 50% default", () => {
    const p = bettingPacket(); addResponses(p);
    p.policyContext!.responses[0]!.foldEquity.source = "";
    expect(() => validateDecisionPacket(p)).toThrow();
  });
});

describe("legal sizing grid", () => {
  it("does not invent preflop blind-option wager sizes from postflop rules", () => {
    const p = bettingPacket(); p.table.street = "preflop"; p.table.board = [];
    expect(generatePolicyCandidates(p)).toEqual([]);
  });
  it("withholds every pot-fraction size when the pot semantics are unverified", () => {
    const p = bettingPacket(); p.policyContext!.potVerified = false;
    expect(generatePolicyCandidates(p)).toEqual([]);
  });
  it("includes pot fractions and shove with explicit additional investment and street totals", () => {
    const p = bettingPacket();
    expect(generatePolicyCandidates(p).map(c => c.investmentBB)).toEqual([5, 6.6, 10, 13.4, 15, 20, 100]);
    expect(generatePolicyCandidates(p).at(-1)).toMatchObject({ action: "ALL_IN", investmentBB: 100, raiseToBB: 100 });
  });
  it("sizes raises against the pot after calling and excludes the old wager from opponent's new call", () => {
    const p = raisingPacket();
    const halfPot = generatePolicyCandidates(p).find(c => c.investmentBB === 17.5)!;
    expect(halfPot).toMatchObject({ action: "RAISE", raiseToBB: 19.5, opponentCallBB: 12.5 });
  });
  it("filters below-minimum bets, deduplicates rounding, and never exceeds stacks", () => {
    const p = bettingPacket(); p.hero.stackBB = 11;
    Object.assign(p.policyContext!.legal, { chipUnitBB: 1, minBetBB: 10 });
    expect(generatePolicyCandidates(p).map(c => c.investmentBB)).toEqual([10, 11]);
  });
  it("includes a legal short all-in below the full minimum", () => {
    const p = raisingPacket(); p.hero.stackBB = 8;
    expect(generatePolicyCandidates(p)).toEqual([expect.objectContaining({ action: "ALL_IN", investmentBB: 8, raiseToBB: 10 })]);
  });
  it("never offers a short raise when action has not reopened", () => {
    const p = raisingPacket(); p.hero.stackBB = 8; p.policyContext!.legal.aggressionReopened = false;
    expect(generatePolicyCandidates(p)).toEqual([]);
  });
  it("caps matchable investment at the opponent stack and records low SPR", () => {
    const p = bettingPacket(); p.policyContext!.legal.opponentStackBB = 12;
    const sizes = generatePolicyCandidates(p);
    expect(sizes.at(-1)).toMatchObject({ action: "BET", investmentBB: 12, opponentCallBB: 12 });
    expect(sizes.at(-1)!.basis).toContain("SPR 0.60");
    expect(sizes.every(s => s.investmentBB <= 12)).toBe(true);
  });
  it("does not fabricate raise legality from the current bet alone", () => {
    const p = raisingPacket(); p.policyContext!.legal.minRaiseToBB = null;
    expect(generatePolicyCandidates(p)).toEqual([]);
    expect(evaluateDecisionPolicy(p).chosenAction).toBeNull();
  });
  it("does not select CHECK if no aggressive grid size fits but betting is possible", () => {
    const p = bettingPacket(); p.policyContext!.legal.opponentStackBB = 0.5;
    expect(evaluateDecisionPolicy(p).chosenAction).toBeNull();
  });
});

describe("BET/CHECK and RAISE comparisons", () => {
  it("values a terminal check as equity times the pot, not zero", () => {
    const p = bettingPacket(); setEquity(p, 0.8); addResponses(p, 0.2);
    const r = evaluateDecisionPolicy(p);
    expect(r.chosenAction).toBe("CHECK");
    expect(r.actionEVs[0]).toMatchObject({ action: "CHECK", evBB: 16 });
  });
  it("does not equate checking out of position to reaching showdown", () => {
    const p = bettingPacket(); p.policyContext!.checkEndsHand = false; addResponses(p);
    expect(evaluateDecisionPolicy(p).chosenAction).toBeNull();
  });
  it.each(["BET", "RAISE", "ALL_IN"] as const)("selects supported %s only after all sizes have evidence", action => {
    const p = action === "RAISE" ? raisingPacket() : bettingPacket();
    setEquity(p, 0.4); addResponses(p);
    const target = action === "ALL_IN" ? p.hero.stackBB : action === "RAISE" ? 17.5 : 10;
    p.policyContext!.responses.find(r => r.investmentBB === target)!.equityIfCalled = estimate(0.95, 0.93, 0.97, "conditioned caller-range equity");
    const r = evaluateDecisionPolicy(p);
    expect(r).toMatchObject({ status: "selected", chosenAction: action, chosenSizeBB: target, llmMayChoose: false });
    expect(r.foldEquitySource).toContain("explicit test fold assumption");
  });
  it("does not silently substitute whole-range equity for equity when called", () => {
    const p = bettingPacket(); setEquity(p, 0.9); addResponses(p, 0.1);
    const row = evaluateDecisionPolicy(p).actionEVs.find(r => r.investmentBB === 10)!;
    expect(row.evBB).toBeCloseTo(-6);
    expect(row.equitySource).toContain("per-size caller range");
  });
  it("computes uncertainty across all four probability corners, including decreasing EV with more folds", () => {
    const p = bettingPacket(); addResponses(p);
    const model = p.policyContext!.responses.find(r => r.investmentBB === 10)!;
    model.equityIfCalled = estimate(1); model.foldEquity = estimate(0.5, 0, 1, "assumed interval");
    const row = evaluateDecisionPolicy(p).actionEVs.find(r => r.investmentBB === 10)!;
    expect(row).toMatchObject({ evBB: 25, lowBB: 20, highBB: 30 });
  });
  it("does not pick a point-EV winner when response uncertainty overlaps", () => {
    const p = bettingPacket(); addResponses(p);
    const r = p.policyContext!.responses.find(r => r.investmentBB === 10)!;
    r.equityIfCalled = estimate(0.8, 0, 1); r.foldEquity = estimate(0.5, 0, 1);
    expect(evaluateDecisionPolicy(p)).toMatchObject({ status: "uncertain", chosenAction: null });
  });
  it("downgrades low-confidence fold assumptions even with apparently excellent point EV", () => {
    const p = bettingPacket(); addResponses(p, 1, 1);
    p.policyContext!.responses[0]!.foldEquity.confidence = "low";
    expect(evaluateDecisionPolicy(p)).toMatchObject({ status: "uncertain", chosenAction: null });
  });
  it("refuses duplicate size models", () => {
    const p = bettingPacket(); addResponses(p); p.policyContext!.responses.push(p.policyContext!.responses[0]!);
    expect(evaluateDecisionPolicy(p)).toMatchObject({ status: "unsupported", chosenAction: null });
  });
});

describe("engine lock and explanation/fallback routing", () => {
  const router = (response: unknown, fail = false): ModelRouter => ({ getRecommendation: vi.fn(async () => {
    if (fail) throw new Error("provider unavailable"); return response as Awaited<ReturnType<ModelRouter["getRecommendation"]>>;
  }) });
  it("accepts a matching explanation but keeps engine confidence and removes alternatives", async () => {
    const r = await getPolicyRecommendation(packet(), router({ action: "CALL", sizingBB: 5, confidence: 1,
      reasoning: "Call is supported within the supplied bounds.", alternative: { action: "RAISE", reasoning: "Try this" } }), { mode: "fast" });
    expect(r).toMatchObject({ decisionSource: "engine_policy", explanationSource: "llm", result: { action: "CALL", sizingBB: 5, confidence: 0.65 } });
    expect(r.result).not.toHaveProperty("alternative");
  });
  it.each(["fast", "strong", "manual"] as const)("prevents an LLM override in %s mode", async mode => {
    const r = await getPolicyRecommendation(packet(), router({ action: "RAISE", sizingBB: 20, confidence: 1, reasoning: "Raise instead" }), { mode });
    expect(r).toMatchObject({ explanationSource: "engine", result: { action: "CALL", sizingBB: 5 } });
    expect((r.result as { reasoning: string }).reasoning).not.toContain("Raise instead");
  });
  it("does not accept changed sizing or reuse contradictory reasoning", async () => {
    const r = await getPolicyRecommendation(packet(), router({ action: "CALL", sizingBB: 10, confidence: 1, reasoning: "Call ten" }), { mode: "fast" });
    expect(r).toMatchObject({ explanationSource: "engine", result: { action: "CALL", sizingBB: 5 } });
  });
  it("enforces the same selection through consensus results", async () => {
    const r = await getPolicyRecommendation(packet(), router([{ providerName: "a", recommendation: { action: "FOLD", confidence: 1, reasoning: "Fold" } },
      { providerName: "b", error: "outage" }]), { mode: "consensus" });
    expect(r).toMatchObject({ decisionSource: "engine_policy", explanationSource: "engine", result: { action: "CALL" } });
  });
  it("retains the engine action when every explanation provider fails", async () => {
    const r = await getPolicyRecommendation(packet(), router(null, true), { mode: "fast" });
    expect(r).toMatchObject({ decisionSource: "engine_policy", explanationSource: "engine", result: { action: "CALL" } });
  });
  it("does not ask the LLM to break a policy uncertainty tie", async () => {
    const p = packet(); setEquity(p, 0.2); const mock = router(null);
    expect(await getPolicyRecommendation(p, mock, { mode: "fast" })).toMatchObject({ result: null, decisionSource: "abstained", blockedReason: "policy_uncertain" });
    expect(mock.getRecommendation).not.toHaveBeenCalled();
  });
  it("preserves low-confidence live-state blocking", async () => {
    const p = packet(); p.dataConfidence = "low"; const mock = router(null);
    expect(await getPolicyRecommendation(p, mock, { mode: "fast" })).toMatchObject({ result: null, blockedReason: "low_confidence" });
    expect(mock.getRecommendation).not.toHaveBeenCalled();
  });
  it("preserves unsupported preflop blocking", async () => {
    const p = packet(); p.table.street = "preflop"; p.table.board = []; delete p.policyContext;
    const mock = router(null);
    expect(await getPolicyRecommendation(p, mock, { mode: "fast" })).toMatchObject({ result: null, blockedReason: "preflop_model_uncertain" });
    expect(mock.getRecommendation).not.toHaveBeenCalled();
  });
  it("keeps an explicit AI fallback for unsupported legacy packets", async () => {
    const p = packet(); delete p.policyContext;
    const mock = router({ action: "CALL", confidence: 0.4, reasoning: "Uncertain range judgment." });
    const r = await getPolicyRecommendation(p, mock, { mode: "fast" });
    expect(r).toMatchObject({ decisionSource: "llm_fallback", policy: { llmMayChoose: true }, result: { action: "CALL" } });
    expect((r.result as { reasoning: string }).reasoning).toContain("AI fallback");
    expect(mock.getRecommendation).toHaveBeenCalledOnce();
  });
  it("abstains if an AI fallback proposes aggression without exact legal bounds", async () => {
    const p = packet(); delete p.policyContext;
    const r = await getPolicyRecommendation(p, router({ action: "RAISE", sizingBB: 15, confidence: 0.8, reasoning: "Raise" }), { mode: "fast" });
    expect(r).toMatchObject({ result: null, blockedReason: "illegal_action", decisionSource: "abstained" });
  });
  it.each([false, true])("keeps illegal fallback actions blocked (consensus=%s)", async consensus => {
    const p = packet(); delete p.policyContext;
    const illegal = { action: "CHECK", confidence: 0.9, reasoning: "Check" };
    const r = await getPolicyRecommendation(p, router(consensus ? [{ providerName: "test", recommendation: illegal }] : illegal), { mode: consensus ? "consensus" : "fast" });
    expect(r).toMatchObject({ blocked: true, blockedReason: "illegal_action" });
  });
  it("ignores a client-supplied policy selection and recomputes it", async () => {
    const p = validateDecisionPacket({ ...packet(), policy: { status: "selected", chosenAction: "RAISE" } });
    expect(p).not.toHaveProperty("policy");
    const r = await getPolicyRecommendation(p, router(null, true), { mode: "fast" });
    expect(r.policy.chosenAction).toBe("CALL");
  });
});

describe("live pot provenance through the policy", () => {
  function withEvidence() {
    const p = packet();
    p.potEvidence = { unit: "chips", mainPot: 10, displayedTotalPot: 40, decisionPot: 40,
      decisionPotSource: p.policyContext!.potSource, isPotSemanticsVerified: true, bigBlind: 2 };
    return p;
  }
  it("preserves separate display values and the BB conversion", () => {
    const p = validateDecisionPacket(withEvidence());
    expect(p.potEvidence).toMatchObject({ mainPot: 10, displayedTotalPot: 40, decisionPot: 40, bigBlind: 2 });
    expect(evaluateDecisionPolicy(p).chosenAction).toBe("CALL");
  });
  it.each(["unverified", "missing_source", "missing_pot", "bad_conversion", "source_mismatch"])("blocks %s despite a claimed verified policy pot", problem => {
    const p = withEvidence();
    if (problem === "unverified") p.potEvidence!.isPotSemanticsVerified = false;
    if (problem === "missing_source") p.potEvidence!.decisionPotSource = null;
    if (problem === "missing_pot") p.potEvidence!.decisionPot = null;
    if (problem === "bad_conversion") p.potEvidence!.bigBlind = 5;
    if (problem === "source_mismatch") p.policyContext!.potSource = "different evidence";
    expect(evaluateDecisionPolicy(p)).toMatchObject({ chosenAction: null, llmMayChoose: false });
    expect(generatePolicyCandidates(p)).toEqual([]);
  });
});

describe("provider explanation prompts", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([createGroqProvider, createGeminiProvider, createNvidiaProvider])("includes the action lock and explicit uncertainty for every provider", async create => {
    let body = "";
    const content = JSON.stringify({ action: "CALL", sizingBB: 5, confidence: 0.6, reasoning: "Conditional call." });
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
      body = options.body;
      return { ok: true, json: async () => ({ choices: [{ message: { content } }], candidates: [{ content: { parts: [{ text: content }] } }] }) };
    }));
    await create({ apiKey: "test" }).getRecommendation(packet());
    expect(body).toContain("EXPLANATION ONLY");
    expect(body).toContain("additional-investment sizingBB");
    expect(body).toContain("sensitivity bounds");
    expect(body).toContain("chosenAction");
  });
});
