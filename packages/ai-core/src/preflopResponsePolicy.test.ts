import { describe, expect, it, vi } from "vitest";
import { parseCards } from "@poker-ai/shared";
import { allHandTypes, formatHandType } from "@poker-ai/range-engine";
import { buildPreflopContext, type PreflopInput } from "./preflopContext.js";
import { HjResponseReferenceSchema, HJ_RESPONSE_PROFILE, inspectLiveHjResponseStrategy,
  inspectHjResponseSourceStrategy, importHjResponseSource, hjResponseIllustrationLines,
  reviewHjResponseReference, isReviewedHjFold, type HjResponseReference } from "./preflopResponsePolicy.js";
import { hjResponseSource } from "./data/hjResponseSource.js";
import { getPolicyRecommendation } from "./policyRecommendation.js";
import { validateDecisionPacket, type DecisionPacket } from "./decisionPacket.js";
import { decisionProofBinding, PROOF_SCOPES } from "./decisionProofs.js";
import { evaluateDecisionPolicy } from "./decisionPolicy.js";
import { lockedEngineRecommendation } from "./policyRecommendation.js";
import type { ModelRouter } from "./modelRouter.js";

// Independently enumerated review boundary; never derive expectations from the catalog.
const reviewedHands = ["72o", "82o", "83o", "92o", "93o", "94o", "T2o", "T3o", "T4o", "T5o",
  "J2o", "J3o", "J4o", "J5o", "J6o", "Q2o", "Q3o", "Q4o", "Q5o", "Q6o", "Q7o"];

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
// Synthetic scoped certificates test consumption, not source acceptance.
function foldPacket(cards = "7h 2c"): DecisionPacket {
  const i = input(cards), now = Date.now();
  const packet = validateDecisionPacket({
    hero: { holeCards: i.holeCards, position: "HJ", stackBB: 125 },
    table: { street: "preflop", board: [], potBB: null, numOpponentsRemaining: 5 },
    facingAction: { type: "raise", amountBB: 2.5 }, candidateActions: ["FOLD", "CALL", "RAISE"],
    preflop: buildPreflopContext(i.preflop), engineCalculations: {}, dataConfidence: "low",
    potEvidence: { unit: "chips", bigBlind: 2, mainPot: null, displayedTotalPot: null,
      decisionPot: null, decisionPotSource: null, isPotSemanticsVerified: false },
    preflopExecution: { heroIsCurrentToAct: true, sourceWindowKey: "synthetic-window",
      hjResponseWindow: { profile: HJ_RESPONSE_PROFILE, tableId: "T", handId: "H", heroId: "hero", heroSeat: 2,
        heroCards: cards.split(" ").sort(), generation: 1, sourceCursor: 67, decisionEpoch: "E", receivedAt: now, expiresAt: now + 10000 },
      controls: { source: "No raise controls needed", formVisible: false, raiseSubmitVisible: false,
        raiseSubmitEnabled: null, selectedRaiseToBB: null, issues: [] } },
  });
  packet.decisionProofs = { version: 1, binding: "pending", decisionEpoch: "E", handId: "T:hand:H", connectionGeneration: 1,
    proofs: PROOF_SCOPES.map(scope => {
      const required = ["decisionState", "connection", "actionWindow", "position", "roster", "blinds", "stack", "callCost"].includes(scope);
      return { scope, status: required ? "proven" : "insufficient", confidence: required ? "high" : "low",
        provenance: ["Synthetic independent scoped test evidence"], reasons: required ? [] : ["Not available"] };
    }) };
  return rebind(packet);
}
function rebind(packet: DecisionPacket) {
  packet.decisionProofs!.binding = decisionProofBinding(packet, packet.decisionProofs!.decisionEpoch);
  return packet;
}

describe("complete pinned HJ source reference (illustrative only)", () => {
  const mixed: Record<string, number> = { "54s": 0.583846558, "76s": 0.333118899, "87s": 0.564632435,
    "99": 0.549897475, A5s: 0.576134585, A8s: 0.196474837, AQo: 0.538056204,
    KQo: 0.292929688, QJs: 0.529857575, T9s: 0.476562585 };
  const raises = ["65s", "A4s", "AA", "AJs", "AKo", "AKs", "AQs", "ATs", "JJ", "KJs", "KK", "KQs", "KTs", "QQ", "TT"];
  it.each(allHandTypes().map(formatHandType))("retains the original allocation for every combination of %s", hand => {
    let combinations = 0;
    for (const a of "shdc") for (const b of "shdc") {
      if (hand.endsWith("s") ? a !== b : a === b) continue;
      for (const cards of [`${hand[0]}${a} ${hand[1]}${b}`, `${hand[1]}${b} ${hand[0]}${a}`]) {
        const r = inspectHjResponseSourceStrategy(input(cards));
        const frequency = mixed[hand] ?? (raises.includes(hand) ? 1 : 0);
        expect(r).toMatchObject({ hand, status: mixed[hand] === undefined ? "pure" : "mixed",
          strategyClass: mixed[hand] !== undefined ? null : frequency === 1 ? "THREE_BET" : "FOLD",
          chosenAction: null, liveAuthorized: false, reference: { provenance: { kind: "illustrative" } },
          allocations: [{ action: "FOLD", frequency: 1 - frequency }, { action: "CALL", frequency: 0 },
            { action: "THREE_BET", frequency, raiseToBB: 7.5 }] });
        expect(isReviewedHjFold(r)).toBe(false);
        combinations++;
      }
    }
    expect(combinations).toBe(hand.endsWith("s") ? 8 : 24);
    const packet = foldPacket(`${hand[0]}h ${hand[1]}${hand.endsWith("s") ? "h" : "c"}`);
    expect(evaluateDecisionPolicy(packet).chosenAction).toBe(reviewedHands.includes(hand) ? "FOLD" : null);
  });
  it("counts 144 pure folds, 15 pure three-bets, 10 mixes and no positive CALL entries", () => {
    const r = importHjResponseSource(hjResponseSource);
    expect(r.entries).toHaveLength(169);
    expect(r.entries.filter(e => e.allocations[0]!.frequency === 1)).toHaveLength(144);
    expect(r.entries.filter(e => e.allocations[2]!.frequency === 1)).toHaveLength(15);
    expect(r.entries.filter(e => e.allocations[2]!.frequency > 0 && e.allocations[2]!.frequency < 1)).toHaveLength(10);
    expect(r.entries.every(e => e.allocations[1]!.frequency === 0)).toBe(true);
    expect(r.referenceSettings.coldCallsAllowed).toBeNull();
    expect(r.provenance.review).toBe("pending");
    expect(inspectHjResponseSourceStrategy(input()).reference?.provenance.review).toBe("reviewed");
  });
  it.each(["3BetHJvsLJ", "CallHJvsLJ"] as const)("does not invent %s values for a missing hand", node => {
    const source: any = structuredClone(hjResponseSource); delete source[node].AA;
    const reference = importHjResponseSource(source);
    expect(reference.entries).toHaveLength(168);
    const review = reviewHjResponseReference(input("Ah Ac"), reference);
    expect(review).toMatchObject({ status: "uncovered", allocations: null, chosenAction: null });
    expect(hjResponseIllustrationLines(review).join(" ")).toContain("ABSTAIN");
  });
  it.each(["negative", "over-one", "unknown-call-permission", "nan", "bad-hand"])("rejects source corruption: %s", variant => {
    const source: any = structuredClone(hjResponseSource);
    if (variant === "negative") source["3BetHJvsLJ"].AA = -0.1;
    if (variant === "over-one") source["3BetHJvsLJ"].AA = 1.1;
    if (variant === "unknown-call-permission") source.CallHJvsLJ["88"] = 1;
    if (variant === "nan") source["3BetHJvsLJ"].AA = NaN;
    if (variant === "bad-hand") source.CallHJvsLJ.AAAs = 0;
    expect(() => importHjResponseSource(source)).toThrow();
  });
  it("preserves suited/offsuit differences and all mixed digits in the display", () => {
    const suited = inspectHjResponseSourceStrategy(input("Ah Qh"));
    const offsuit = inspectHjResponseSourceStrategy(input("Ah Qc"));
    expect(suited.strategyClass).toBe("THREE_BET");
    expect(offsuit.status).toBe("mixed");
    const lines = hjResponseIllustrationLines(offsuit).join(" ");
    expect(lines).toContain("THREE_BET to 7.5BB 53.8056204%");
    expect(lines).toContain("FOLD 46.1943796%");
    expect(lines).toContain("CALL 0%");
    expect(lines).toContain("CALL 0% is explicit source data; cold-call permission remains unknown.");
    expect(hjResponseIllustrationLines(suited).join(" ")).toContain("Pure source classification: THREE_BET.");
    expect(lines).toContain("not a verified live recommendation");
    expect(lines).toContain("no action sampled");
  });
  it.each(["UTG", "CO", "BTN", "SB", "BB"])("does not apply the HJ table to %s", position => {
    const i = input("Ah Ac"); i.preflop.heroSeat = i.preflop.players.find(p => p.position === position)!.seat;
    expect(inspectHjResponseSourceStrategy(i).status).toBe("invalid_context");
  });
  it("labels unavailable depth coverage instead of extending strategy applicability", () => {
    const i = input("Ah Ac"); i.preflop.players[2]!.remainingStackBB = 151;
    const r = inspectHjResponseSourceStrategy(i);
    expect(r).toMatchObject({ status: "out_of_scope", chosenAction: null });
    expect(hjResponseIllustrationLines(r).join(" ")).toContain("ABSTAIN");
  });
  it.each(["Ah Ac", "Ah Qc", "8h 8c"])("legality and matching sizing alone cannot promote source-only %s", cards => {
    const packet = foldPacket(cards);
    packet.dataConfidence = "high";
    packet.decisionProofs!.proofs.forEach(p => { p.status = "proven"; p.confidence = "high"; p.reasons = []; });
    packet.preflopExecution!.raiseBounds = { source: "Synthetic test bounds", verified: true, chipUnitBB: 0.5, minRaiseToBB: 4 };
    packet.preflopExecution!.controls = { source: "Synthetic matching 7.5BB control", formVisible: true,
      raiseSubmitVisible: true, raiseSubmitEnabled: true, selectedRaiseToBB: 7.5, issues: [] };
    const policy = evaluateDecisionPolicy(rebind(packet));
    expect(policy.chosenAction).toBeNull();
    expect(policy.activation?.allowed).toBe(false);
    expect(lockedEngineRecommendation(policy)).toBeNull();
  });
});
describe("locked HJ fold production policy", () => {
  it.each(reviewedHands)("selects and correctly explains all 12 offsuit combinations of %s", hand => {
    for (const a of "shdc") for (const b of "shdc") {
      if (a === b) continue;
      // Reverse hole-card order as well: the displayed hand must be canonical.
      for (const cards of [`${hand[0]}${a} ${hand[1]}${b}`, `${hand[1]}${b} ${hand[0]}${a}`]) {
        const policy = evaluateDecisionPolicy(foldPacket(cards));
        expect(policy.chosenAction, cards).toBe("FOLD");
        expect(policy.ruleExplanation).toContain(`Fold ${hand} facing UTG`);
        expect(lockedEngineRecommendation(policy)?.reasoning).toContain(`Fold ${hand} facing UTG`);
      }
    }
  });
  it("withholds a relay response if its explanation finishes at the original deadline", async () => {
    const packet = foldPacket();
    const clock = vi.spyOn(Date, "now").mockReturnValue(packet.preflopExecution!.hjResponseWindow!.receivedAt);
    try {
      const router = { getRecommendation: vi.fn().mockImplementation(async () => {
        clock.mockReturnValue(packet.preflopExecution!.hjResponseWindow!.expiresAt);
        return { action: "FOLD", confidence: 1, reasoning: "Late explanation" };
      }) } as unknown as ModelRouter;
      const result = await getPolicyRecommendation(packet, router, { mode: "fast" }, true);
      expect(result).toMatchObject({ result: null, decisionSource: "abstained", activation: { allowed: false } });
      expect(lockedEngineRecommendation(result.policy)).toBeNull();
    } finally { clock.mockRestore(); }
  });
  it("selects without pot EV, CALL permission, raise sizing or aggregate confidence", async () => {
    const packet = foldPacket(), policy = evaluateDecisionPolicy(packet);
    expect(policy).toMatchObject({ status: "selected", chosenAction: "FOLD", chosenSizeBB: null,
      raiseToBB: null, llmMayChoose: false, actionEVs: [], activation: { allowed: true, supportedDecisionType: "preflop_facing_open" } });
    expect(policy.activation!.requiredProofs).not.toEqual(expect.arrayContaining(["pot"]));
    expect(lockedEngineRecommendation(policy)?.action).toBe("FOLD");
    const router = { getRecommendation: vi.fn().mockResolvedValue({ action: "CALL", confidence: 1, reasoning: "Override" }) } as unknown as ModelRouter;
    const result = await getPolicyRecommendation(validateDecisionPacket(packet), router, { mode: "fast" }, true);
    expect(result).toMatchObject({ decisionSource: "engine_policy", result: { action: "FOLD" }, explanationSource: "engine" });
    expect((result.result as any).reasoning).toContain("not exact GTO");
  });
  it.each(PROOF_SCOPES)("retains a concrete contradiction in %s, including unrelated scopes", scope => {
    const packet = foldPacket();
    const proof = packet.decisionProofs!.proofs.find(p => p.scope === scope)!;
    proof.status = "contradicted"; proof.reasons = ["Conflicting observation"];
    const policy = evaluateDecisionPolicy(rebind(packet));
    expect(policy.activation).toMatchObject({ allowed: false, state: "unsafe" });
    expect(lockedEngineRecommendation(policy)).toBeNull();
  });
  it.each(["decisionState", "connection", "actionWindow", "position", "roster", "blinds", "stack", "callCost"])(
    "requires independent %s evidence", scope => {
      const packet = foldPacket();
      packet.decisionProofs!.proofs = packet.decisionProofs!.proofs.filter(p => p.scope !== scope);
      expect(evaluateDecisionPolicy(rebind(packet)).chosenAction).toBeNull();
    });
  it.each(["expired", "clock-regression", "renewed-deadline", "hand", "generation", "epoch", "cards", "seat",
    "hero", "stack", "call", "actor", "window", "source-key", "board", "no-fold", "binding", "no-proofs"])(
    "abstains on %s", variant => {
      const packet = foldPacket(), w = packet.preflopExecution!.hjResponseWindow!;
      if (variant === "expired") { w.receivedAt -= 10000; w.expiresAt -= 10000; }
      if (variant === "clock-regression") { w.receivedAt += 10000; w.expiresAt += 10000; }
      if (variant === "renewed-deadline") w.expiresAt++;
      if (variant === "hand") w.handId = "OTHER";
      if (variant === "generation") w.generation++;
      if (variant === "epoch") w.decisionEpoch = "OTHER";
      if (variant === "cards") w.heroCards = ["2d", "7h"];
      if (variant === "seat") w.heroSeat++;
      if (variant === "hero") packet.hero.position = "CO";
      if (variant === "stack") packet.hero.stackBB++;
      if (variant === "call") packet.facingAction.amountBB = 3;
      if (variant === "actor") packet.preflopExecution!.heroIsCurrentToAct = false;
      if (variant === "window") delete packet.preflopExecution!.hjResponseWindow;
      if (variant === "source-key") packet.preflopExecution!.sourceWindowKey = "";
      if (variant === "board") packet.table.board = parseCards("Ah");
      if (variant === "no-fold") packet.candidateActions = ["CALL", "RAISE"];
      rebind(packet);
      if (variant === "binding") packet.decisionProofs!.binding = "different";
      if (variant === "no-proofs") delete packet.decisionProofs;
      const policy = evaluateDecisionPolicy(packet);
      expect(policy.chosenAction).toBeNull();
      expect(lockedEngineRecommendation(policy)).toBeNull();
    });
});

describe("HJ response reference review", () => {
  it("installs the reviewed weak-offsuit heuristic, retaining source caveats", () => {
    const r = inspectLiveHjResponseStrategy(input());
    expect(r).toMatchObject({ status: "pure", strategyClass: "FOLD", chosenAction: null, liveAuthorized: false,
      reference: { provenance: { kind: "heuristic", review: "reviewed" },
        application: { minCapacityBB: 100, maxCapacityBB: 150 } } });
    expect(isReviewedHjFold(r)).toBe(true);
    expect(r.reference!.provenance.assumptions.join(" ")).toContain("unverified");
    expect(isReviewedHjFold(reviewHjResponseReference(input(), reference()))).toBe(false);
    const pending = reference(); pending.provenance.kind = "heuristic";
    expect(isReviewedHjFold(reviewHjResponseReference(input(), pending))).toBe(false);
    pending.provenance.review = "reviewed"; pending.provenance.kind = "test_fixture";
    expect(isReviewedHjFold(reviewHjResponseReference(input(), pending))).toBe(false);
  });
  it("covers exactly the reviewed 21 categories and abstains on all other 148 categories", () => {
    const covered: string[] = [];
    for (const hand of allHandTypes().map(formatHandType)) {
      const cards = `${hand[0]}h ${hand[1]}${hand.endsWith("s") ? "h" : "c"}`;
      const r = inspectLiveHjResponseStrategy(input(cards));
      if (reviewedHands.includes(hand)) {
        expect(r).toMatchObject({ status: "pure", hand, strategyClass: "FOLD",
          allocations: [{ action: "FOLD", frequency: 1 }] });
        covered.push(hand);
      } else {
        expect(r, hand).toMatchObject({ status: "uncovered", strategyClass: null, allocations: null });
        expect(evaluateDecisionPolicy(foldPacket(cards)).chosenAction, hand).toBeNull();
      }
    }
    expect(covered.sort()).toEqual([...reviewedHands].sort());
    expect(covered.length * 12).toBe(252);
  });
  it("unknown cold-call tree is permitted for pure FOLD only, never an allocated CALL", () => {
    const r = reference(); r.referenceSettings.coldCallsAllowed = null;
    expect(HjResponseReferenceSchema.safeParse(r).success).toBe(false);
    r.entries = [r.entries[0]!];
    expect(HjResponseReferenceSchema.safeParse(r).success).toBe(true);
  });
  it.each([99.5, 150.5, 1000])("excludes an unsupported %sBB capacity for any seat", capacity => {
    for (const player of input().preflop.players) {
      const i = input();
      const p = i.preflop.players.find(p => p.seat === player.seat)!;
      p.remainingStackBB = capacity - p.contributionBB!;
      expect(isReviewedHjFold(inspectLiveHjResponseStrategy(i))).toBe(false);
    }
  });
  it.each(["8s 8h", "Ah Ac", "Ah Qh"])("never invents a live action for uncovered %s", cards => {
    expect(inspectLiveHjResponseStrategy(input(cards))).toMatchObject({ status: "uncovered",
      chosenAction: null, strategyClass: null, liveAuthorized: false, allocations: null });
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
      expect(inspectLiveHjResponseStrategy(input("Ah Ac")).status).toBe("uncovered");
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
