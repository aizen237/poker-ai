import { parseCards, type Card } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { createComboRange } from "./comboRange.js";
import { benchmarkLikelihoodModels, type BenchmarkOptions, type EvaluationDataset, type EvaluationRow } from "./likelihoodBenchmark.js";
import { createLikelihoodRegistry, modelIdentity, phase5BScope, type BenchmarkScope, type DevelopmentManifest,
  type LikelihoodCase, type LikelihoodModelRecord, type LikelihoodReview } from "./likelihoodRegistry.js";
import { bindOfflineRangeState, createBoardRangeUpdater, type OfflineObservation } from "./offlineConditioning.js";

// ALL examples in this file are synthetic arithmetic/contract fixtures. Tests of
// real-source/review metadata do not constitute real data or independent review.
const pair = (s: string) => parseCards(s) as [Card, Card];
const source = () => ({ kind: "synthetic_fixture" as const, provider: "fixture-provider", sourceRefs: ["fixture:math"], createdOn: "2026-10-22" });
const development = (): DevelopmentManifest => ({ identityNamespace: "fixture-global", coverage: "complete", fitting: "none",
  sourceRefs: ["fixture:no-fitting"], observations: [] });
const scope = (): BenchmarkScope => ({ profile: { variant: "holdem", betting: "no_limit", format: "cash", seatsDealtIn: 6, anteBB: 0, straddle: false, objective: "chip_ev" },
  board: parseCards("2s 7s 9s 3d 4c"), street: "river", priorRaises: 0, facing: "none", facingPosition: null,
  context: { position: "BTN", potBB: 10, facingAmountBB: 0, effectiveStackBB: 100, opponentsRemaining: 1 },
  actionCoverage: "exhaustive_discrete", actionCoverageRef: "fixture:finite-action-space-only",
  outcomes: [{ id: "check", action: "check", wagerAction: null, actionToBB: 0 }, { id: "bet5", action: "bet", wagerAction: null, actionToBB: 5 }],
  conditionedOnEventIds: [] });
function model(id = "candidate", checks = [.8, .2]): LikelihoodModelRecord {
  const s = scope();
  return { schemaVersion: 1, id, version: "1", author: "fixture-author", source: source(), validation: "synthetic_fixture", reviewRefs: [],
    assumptions: ["fixture discrete action space"], limitations: ["Mathematical test only; no behavioral meaning"], development: development(),
    cases: [{ scopeId: "river-1", scope: s, actions: s.outcomes.map((o, index) => ({ outcomeId: o.id,
      likelihood: { id, version: "1", validation: { status: "synthetic_fixture", reviewRefs: [] },
        provenance: { basis: "Hand-calculated probability fixture", sourceRefs: source().sourceRefs },
        assumptions: ["fixture discrete action space"], limitations: ["Mathematical test only; no behavioral meaning"],
        scope: phase5BScope(s, o), conditionedOnEventIds: s.conditionedOnEventIds,
        likelihoods: ["As Qs", "Ah Qh"].map((cards, i) => ({ cards: pair(cards), probability: index === 0 ? checks[i]! : 1 - checks[i]! })) } })) }] };
}
function row(index: number, label: string | null = index === 1 ? "check" : "bet5"): EvaluationRow {
  const playerIds = Array.from({ length: 6 }, (_, i) => `p${index}-${i}`);
  return { identity: { eventId: `event${index}`, handId: `hand${index}`, sessionId: `session${index}`, playerIds },
    scopeId: "river-1", scope: scope(), heroCards: pair("Kh Kd"), observation: 1, contextThroughObservation: 0, history: [],
    evidence: { handId: `hand${index}`, eventId: `event${index}`, decisionId: `decision${index}`, opponentId: playerIds[0]!, sourceId: "fixture-source",
      observedAt: 200, originalExpiresAt: 900, historyCoverage: "complete",
      provenance: [{ basis: "Synthetic observation", evidenceRefs: ["fixture:observation"], model: null }] },
    actionLabel: label, holeCards: { status: "unknown" }, prior: { range: createComboRange([
      { cards: pair("As Qs"), weight: .75 }, { cards: pair("Ah Qh"), weight: .25 }]),
      throughObservation: 0, conditionedOnEventIds: [], sourceRefs: ["fixture:prior"], development: development() } };
}
const dataset = (rows = [row(1), row(2)]): EvaluationDataset => ({ schemaVersion: 1, id: "fixture-eval", version: "1", source: source(),
  identityNamespace: "fixture-global", declaredSamples: rows.length, population: "Synthetic sample only", selection: "all_decisions",
  selectionNotes: ["Synthetic inclusion, not a real sampling design"], splitProvenanceRefs: ["fixture:split"], rows });
const options = (): BenchmarkOptions => ({ purpose: "mathematical_test", holdout: "player", labelMode: "action_marginal",
  calibrationBinEdges: [0, .5, 1], baseline: { id: "baseline", version: "1" } });
const registry = (records = [model(), model("baseline", [.5, .5])], reviews: LikelihoodReview[] = []) =>
  createLikelihoodRegistry(records, reviews, ["fixture discrete action space"]);
const evaluate = (d = dataset(), records = [model(), model("baseline", [.5, .5])], o = options()) => benchmarkLikelihoodModels(d, registry(records), o);
const candidate = (r: ReturnType<typeof evaluate>) => r.models.find(m => m.identity === modelIdentity(model()))!;

describe("versioned likelihood-model registration", () => {
  it("registers immutable provider-neutral artifacts without promoting Phase 5B permission", () => {
    const m = model(), reg = registry([m]);
    expect(reg.records[0]!.validation).toBe("synthetic_fixture");
    expect(Object.isFrozen(reg.records[0]!.cases[0]!.actions[0]!.likelihood.likelihoods)).toBe(true);
    Object.assign(m, { author: "changed" }); expect(reg.records[0]!.author).toBe("fixture-author");
  });
  it.each(["source", "date", "author", "version", "assumptions", "lineage", "profile", "position", "coverage", "empty"])("rejects missing/incompatible %s", field => {
    const m = structuredClone(model());
    switch (field) {
      case "source": Object.assign(m.source, { sourceRefs: [] }); break;
      case "date": Object.assign(m.source, { createdOn: "2026-02-30" }); break;
      case "author": Object.assign(m, { author: "" }); break;
      case "version": Object.assign(m, { schemaVersion: 2 }); break;
      case "assumptions": Object.assign(m, { assumptions: ["unsupported"] }); break;
      case "lineage": Object.assign(m.development, { coverage: "unknown" }); break;
      case "profile": Object.assign(m.cases[0]!.scope.profile, { format: "tournament" }); break;
      case "position": Object.assign(m.cases[0]!.scope.context, { position: "UTG+3" }); break;
      case "coverage": Object.assign(m.cases[0]!.scope, { actionCoverage: "partial" }); break;
      case "empty": Object.assign(m, { cases: [] }); break;
    }
    expect(() => registry([m])).toThrow();
  });
  it.each([NaN, Infinity, -1, 1.1])("rejects invalid likelihood %s", value => {
    const m = structuredClone(model()); Object.assign(m.cases[0]!.actions[0]!.likelihood.likelihoods[0]!, { probability: value });
    expect(() => registry([m])).toThrow();
  });
  it("rejects incomplete action/combination coverage, duplicate identities and nonnormalized action rows", () => {
    const a = structuredClone(model()); Object.assign(a.cases[0]!, { actions: a.cases[0]!.actions.slice(0, 1) });
    const b = structuredClone(model()); Object.assign(b.cases[0]!.actions[0]!.likelihood, { likelihoods: b.cases[0]!.actions[0]!.likelihood.likelihoods.slice(0, 1) });
    const c = structuredClone(model()); Object.assign(c.cases[0]!.actions[0]!.likelihood.likelihoods[0]!, { probability: .5 });
    const d = structuredClone(model()); Object.assign(d.cases[0]!.actions[0]!.likelihood, { id: "different" });
    for (const bad of [a, b, c, d]) expect(() => registry([bad])).toThrow();
    expect(() => registry([model(), model()])).toThrow("identities");
    const duplicate = structuredClone(model());
    Object.assign(duplicate.cases[0]!.actions[0]!.likelihood, { likelihoods: [...duplicate.cases[0]!.actions[0]!.likelihood.likelihoods,
      { cards: pair("Qs As"), probability: 0 }] });
    expect(() => registry([duplicate])).toThrow("Duplicate");
  });
  it("keeps unvalidated models scoreable without changing the Phase 5B review gate", () => {
    const m = structuredClone(model()); Object.assign(m, { validation: "unvalidated" }); Object.assign(m.source, { kind: "real_observations" });
    for (const a of m.cases[0]!.actions) Object.assign(a.likelihood.validation, { status: "unreviewed" });
    expect(registry([m]).records[0]!.validation).toBe("unvalidated");
    const r = row(1), s = phase5BScope(r.scope, r.scope.outcomes[0]!);
    const o: OfflineObservation = { heroCards: r.heroCards, board: s.board, action: { ...s.action, observation: 1 }, context: s.context, evidence: r.evidence };
    const updater = createBoardRangeUpdater(m.cases[0]!.actions[0]!.likelihood, { purpose: "offline_analysis", authoritativeObservation: o,
      evaluatedAt: 200, supportedAssumptions: m.assumptions, reviews: [] });
    const prior = bindOfflineRangeState({ range: r.prior!.range,
      provenance: [{ basis: "fixture", evidenceRefs: ["fixture:prior"], model: null }],
      uncertainty: { confidence: "unknown", assumptions: [], limitations: [], alternatives: [] } },
    { handId: r.identity.handId, sourceId: r.evidence.sourceId!, opponentId: r.evidence.opponentId!, heroCards: r.heroCards,
      board: [], throughObservation: 0, observedAt: 100, originalExpiresAt: 900, evidenceRefs: ["fixture:prior"] });
    const out = updater({ ...o, prior });
    expect(out.status).toBe("unchanged");
    expect(out.reasons[0]).toContain("no matching supplied review");
    expect(m.cases[0]!.actions[0]!.likelihood.validation.status).toBe("unreviewed");
  });
  it("requires independent, dated, complete evidence bound to the exact reviewed artifact", () => {
    const m = structuredClone(model()); Object.assign(m, { validation: "independently_reviewed", reviewRefs: ["fixture:review"] });
    Object.assign(m.source, { kind: "real_observations" });
    for (const a of m.cases[0]!.actions) Object.assign(a.likelihood.validation, { status: "reviewed", reviewRefs: ["fixture:review"] });
    const review: LikelihoodReview = { reference: "fixture:review", reviewer: "fixture-independent-reviewer", independentOfProvider: true,
      reviewedOn: "2026-10-22", sourceAuditRefs: ["fixture:audit"], heldOutEvaluationRefs: ["fixture:holdout"], calibrationRefs: ["fixture:calibration"],
      selectionBiasAssessmentRefs: ["fixture:selection"], limitations: ["Contract fixture only"], artifact: m };
    expect(() => registry([m])).toThrow("review");
    expect(registry([m], [review]).records[0]!.validation).toBe("independently_reviewed");
    expect(() => registry([m], [{ ...review, reviewer: m.author }])).toThrow("independently");
    expect(() => registry([m], [{ ...review, calibrationRefs: [] }])).toThrow("review");
    const changed = structuredClone(m); Object.assign(changed, { limitations: ["Changed after review"] });
    expect(() => registry([changed], [review])).toThrow("exact-artifact");
  });
  it("rejects semantically duplicate outcomes and impossible six-seat counts", () => {
    const m = structuredClone(model()), s = m.cases[0]!.scope;
    Object.assign(s, { outcomes: [...s.outcomes, { id: "duplicate-bet", action: "bet", wagerAction: "bet", actionToBB: 5 }] });
    expect(() => registry([m])).toThrow("Duplicate physical");
    const invalid = structuredClone(model()); Object.assign(invalid.cases[0]!.scope.context, { opponentsRemaining: 6 });
    expect(() => registry([invalid])).toThrow("gameplay profile");
  });
});

describe("offline likelihood calibration benchmark", () => {
  it("marginalizes unknown cards before scoring, never scores a guessed hand", () => {
    const r = evaluate(); expect(r.status).toBe("unvalidated"); expect(r.empiricalCalibration).toBe("unavailable");
    const summary = candidate(r).scopes[0]!.summary!;
    // .75*.8 + .25*.2 = .65, complementary bet probability .35.
    expect(summary.nll).toBeCloseTo(-(Math.log(.65) + Math.log(.35)) / 2, 14);
    expect(summary.brier).toBeCloseTo(.545, 14);
    expect(summary.calibration[0]!.bins[1]!.meanPrediction).toBeCloseTo(.65, 14);
    expect(summary.calibration[0]!.bins[1]!.observedFrequency).toBe(.5);
    // E[-log L] would be different: scoring must occur AFTER marginalization.
    expect(summary.nll).not.toBeCloseTo(-.5 * (Math.log(.8) + Math.log(.2)), 3);
  });
  it("scores true revealed-card labels separately and exposes selection bias", () => {
    const revealed = [row(1), row(2)].map((r, i) => ({ ...r, holeCards: { status: "revealed" as const,
      cards: pair(i === 0 ? "As Qs" : "Ah Qh"), mechanism: "showdown" as const, sourceRefs: ["fixture:reveal"] } }));
    const d = { ...dataset(revealed), selection: "showdown_only" as const };
    const r = evaluate(d, undefined, { ...options(), labelMode: "revealed_combo" });
    expect(candidate(r).scopes[0]!.summary!.nll).toBeCloseTo(-Math.log(.8), 14);
    expect(candidate(r).scopes[0]!.summary!.brier).toBeCloseTo(.08, 14);
    expect(r.populationClaim).toContain("Selected observations only");
    expect(candidate(evaluate(d)).scopes[0]!.summary!.brier).toBeCloseTo(.545, 14);
    const unknown = evaluate(dataset(), undefined, { ...options(), labelMode: "revealed_combo" });
    expect(unknown.status).toBe("unavailable"); expect(candidate(unknown).failures[0]!.reason).toContain("Unknown opponent cards");
  });
  it("requires a legal pre-action prior without learning from the observed action or reveal", () => {
    for (const prior of [null, { ...row(1).prior!, throughObservation: 1 }, { ...row(1).prior!, conditionedOnEventIds: ["event1"] },
      { ...row(1).prior!, range: createComboRange([]) }, { ...row(1).prior!, range: createComboRange([{ cards: pair("Kh Qh"), weight: 1 }]) }]) {
      const r = evaluate(dataset([{ ...row(1), prior }])); expect(candidate(r).scored).toBe(0); expect(r.status).toBe("unavailable");
    }
    const futureContext = evaluate(dataset([{ ...row(1), contextThroughObservation: 1 }]));
    expect(candidate(futureContext).failures[0]!.reason).toContain("current/future");
  });
  it("removes blockers, reports missing coverage, and never substitutes a uniform prior", () => {
    const prior = { ...row(1).prior!, range: createComboRange([{ cards: pair("As Qs"), weight: .75 },
      { cards: pair("Ah Qh"), weight: .25 }, { cards: pair("Kh Qd"), weight: 1 }, { cards: pair("2s Qd"), weight: 1 }]) };
    expect(candidate(evaluate(dataset([{ ...row(1), prior }]))).scopes[0]!.summary!.nll).toBeCloseTo(-Math.log(.65), 14);
    const uncovered = { ...prior, range: createComboRange([{ cards: pair("Ac Qc"), weight: 1 }]) };
    const result = evaluate(dataset([{ ...row(1), prior: uncovered }]));
    expect(result.status).toBe("unavailable"); expect(candidate(result).failures[0]!.reason).toContain("coverage");
  });
  it("reports missing labels and empty datasets without fake confidence", () => {
    const partial = evaluate(dataset([row(1), row(2, null)]));
    expect(candidate(partial)).toMatchObject({ attempted: 2, scored: 1 });
    expect(candidate(partial).failures[0]!.reason).toContain("label");
    expect(candidate(partial).scopes[0]!.summary!.uncertainty.confidenceInterval).toBeNull();
    const empty = evaluate(dataset([])); expect(empty.status).toBe("unavailable"); expect(empty.empiricalCalibration).toBe("unavailable");
    expect(candidate(empty).scopes).toEqual([]);
  });
  it("reports incompatible contexts, partial evidence and absent history as unsupported", () => {
    for (const changes of [{ scope: { ...scope(), context: { ...scope().context, effectiveStackBB: 99 } } },
      { evidence: { ...row(1).evidence, historyCoverage: "partial" as const } },
      { scope: { ...scope(), conditionedOnEventIds: ["missing"] } }, { scope: { ...scope(), actionCoverage: "partial" as const } }]) {
      const r = evaluate(dataset([{ ...row(1), ...changes }])); expect(candidate(r).scored).toBe(0);
    }
  });
  it("validates ordered historical evidence and original expiry across repeated actor decisions", () => {
    const first = row(1), s = phase5BScope(first.scope, first.scope.outcomes[0]!);
    const previous: OfflineObservation = { heroCards: first.heroCards, board: s.board, action: { ...s.action, observation: 1 },
      context: s.context, evidence: first.evidence };
    const second: EvaluationRow = { ...row(2), identity: { ...first.identity, eventId: "event2" }, observation: 2, contextThroughObservation: 1,
      evidence: { ...first.evidence, eventId: "event2", decisionId: "decision2", observedAt: 201 },
      scopeId: "river-2", scope: { ...scope(), conditionedOnEventIds: ["event1"] }, history: [previous],
      prior: { ...first.prior!, throughObservation: 1, conditionedOnEventIds: ["event1"] } };
    const records = [model(), model("baseline")].map(m => ({ ...m, cases: [...m.cases, {
      ...m.cases[0]!, scopeId: second.scopeId, scope: second.scope,
      actions: m.cases[0]!.actions.map(a => ({ ...a, likelihood: { ...a.likelihood,
        conditionedOnEventIds: ["event1"] } })) }] }));
    expect(candidate(evaluate(dataset([first, second]), records)).scored).toBe(2);
    for (const bad of [ { ...previous, action: { ...previous.action, observation: 2 } },
      { ...previous, evidence: { ...previous.evidence, originalExpiresAt: 201 } },
      { ...previous, evidence: { ...previous.evidence, sourceId: "different" } },
      { ...previous, board: parseCards("2s 7s 9s 3d 5c") } ]) {
      const result = evaluate(dataset([first, { ...second, history: [bad] }]), records);
      expect(result.status).toBe("unavailable"); expect(result.reasons[0]).toContain("history contradicts");
      const standalone = evaluate(dataset([{ ...second, history: [bad] }]), records);
      expect(candidate(standalone).scored).toBe(0); expect(candidate(standalone).failures[0]!.reason).toMatch(/history/i);
    }
    const conflicting = { ...previous, action: { ...previous.action, action: "bet" as const }, context: { ...previous.context, actionToBB: 5 } };
    expect(evaluate(dataset([first, { ...second, history: [conflicting] }]), records).reasons[0]).toContain("history contradicts");
    const staleContext = evaluate(dataset([{ ...second, contextThroughObservation: 0 }]), records);
    expect(candidate(staleContext).failures[0]!.reason).toContain("Context predates");
    const duplicateOrder = { ...second, observation: 1 };
    expect(evaluate(dataset([first, duplicateOrder]), records).reasons[0]).toContain("Inconsistent");
  });
  it("rejects revealed-card collisions and unavailable reveal provenance", () => {
    for (const cards of ["Kh Qh", "2s Qh", "As As"]) {
      const r = { ...row(1), holeCards: { status: "revealed" as const, cards: pair(cards), mechanism: "showdown" as const, sourceRefs: ["fixture:reveal"] } };
      expect(candidate(evaluate(dataset([r]), undefined, { ...options(), labelMode: "revealed_combo" })).scored).toBe(0);
    }
    const r = { ...row(1), holeCards: { status: "revealed" as const, cards: pair("As Qs"), mechanism: "showdown" as const, sourceRefs: [] } };
    expect(candidate(evaluate(dataset([r]), undefined, { ...options(), labelMode: "revealed_combo" })).scored).toBe(0);
  });
  it("preserves tiny representable priors and rejects numerically lost support", () => {
    const tiny = { ...row(1).prior!, range: createComboRange([{ cards: pair("As Qs"), weight: Number.MIN_VALUE },
      { cards: pair("Ah Qh"), weight: Number.MIN_VALUE }]) };
    expect(candidate(evaluate(dataset([{ ...row(1), prior: tiny }]))).scopes[0]!.summary!.nll).toBeCloseTo(Math.log(2), 14);
    const lost = { ...tiny, range: createComboRange([{ cards: pair("As Qs"), weight: Number.MIN_VALUE },
      { cards: pair("Ah Qh"), weight: 1 }, { cards: pair("Ac Qc"), weight: 1 }]) };
    expect(candidate(evaluate(dataset([{ ...row(1), prior: lost }]))).failures[0]!.reason).toContain("numerically");
  });
  it("detects duplicate events, inconsistent identities and scope aliases before scoring", () => {
    const d = dataset();
    expect(evaluate({ ...d, declaredSamples: 3 }).status).toBe("unavailable");
    expect(evaluate(dataset([row(1), row(1)])).reasons[0]).toContain("Duplicate");
    expect(evaluate(dataset([{ ...row(1), identity: { ...row(1).identity, handId: "wrong" } }])).reasons[0]).toContain("identity");
    const wrongScope = { ...row(2), scope: { ...scope(), context: { ...scope().context, potBB: 20 } } };
    expect(evaluate(dataset([row(1), wrongScope])).reasons[0]).toContain("Scope ID");
  });
  it.each(["hand", "session", "player"] as const)("detects development leakage at %s boundary", holdout => {
    const m = model();
    const identity = { ...row(1).identity, eventId: "training-event", handId: holdout === "hand" ? "hand1" : "training-hand",
      sessionId: holdout === "player" ? "training-session" : "session1" };
    const trained = { ...m, development: { ...development(), fitting: "data" as const, observations: [identity] } };
    const r = evaluate(dataset(), [trained, model("baseline", [.5, .5])], { ...options(), holdout });
    expect(candidate(r).scored).toBe(0); expect(candidate(r).lineageFailure).toContain("leakage");
    expect(r.comparisons[0]!.pairedSamples).toBe(0);
  });
  it("includes other participants in player leakage checks and applies the same audit to learned priors", () => {
    const identity = { eventId: "train", handId: "train-hand", sessionId: "train-session",
      playerIds: [row(1).identity.playerIds[5]!, "t1", "t2", "t3", "t4", "t5"] };
    const dev: DevelopmentManifest = { ...development(), fitting: "data", observations: [identity] };
    const r = evaluate(dataset([{ ...row(1), prior: { ...row(1).prior!, development: dev } }]));
    expect(candidate(r).failures[0]!.reason).toContain("participant leakage");
    const mismatch = { ...model(), development: { ...development(), identityNamespace: "unlinked" } };
    expect(candidate(evaluate(dataset(), [mismatch, model("baseline")])).lineageFailure).toContain("namespaces");
  });
  it("permits explicitly scoped hand holdout while reporting repeated players/sessions as such", () => {
    const dev: DevelopmentManifest = { ...development(), fitting: "data", observations: [{ ...row(1).identity,
      eventId: "train", handId: "train-hand" }] };
    const r = evaluate(dataset(), [{ ...model(), development: dev }, model("baseline")], { ...options(), holdout: "hand" });
    expect(candidate(r).scored).toBe(2); expect(r.options!.holdout).toBe("hand");
  });
  it("compares against an explicit baseline on identical observations with scope-level uncertainty", () => {
    const r = evaluate(), comparison = r.comparisons[0]!;
    expect(comparison.pairedSamples).toBe(2); expect(comparison.excludedFromPairing).toBe(0);
    expect(comparison.scopes[0]!.difference!.brier).toBeCloseTo(.045, 14);
    expect(comparison.scopes[0]!.baseline!.nll).toBeCloseTo(Math.log(2), 14);
    expect(comparison.scopes[0]!.candidate!.uncertainty.leaveOneSessionOut).not.toBeNull();
    const sensitivity = comparison.scopes[0]!.difference!.uncertainty!;
    expect(sensitivity.brierDifferenceRange[0]).toBeCloseTo(-.255, 14);
    expect(sensitivity.brierDifferenceRange[1]).toBeCloseTo(.345, 14);
    expect(sensitivity.confidenceInterval).toBeNull();
    expect(evaluate(dataset(), undefined, { ...options(), baseline: { id: "missing", version: "1" } }).status).toBe("unavailable");
  });
  it("never compares different coverage subsets as if they were paired", () => {
    const second = { ...row(2), scopeId: "river-2" };
    const b = model("baseline", [.5, .5]);
    const baseline = { ...b, cases: [...b.cases, { ...b.cases[0]!, scopeId: "river-2" }] };
    const r = evaluate(dataset([row(1), second]), [model(), baseline]);
    expect(candidate(r)).toMatchObject({ scored: 1, attempted: 2 });
    expect(r.comparisons[0]).toMatchObject({ pairedSamples: 1, excludedFromPairing: 1 });
    expect(r.comparisons[0]!.scopes[1]!.difference).toBeNull();
  });
  it("handles impossible observed actions without clipping and undefined infinity differences", () => {
    const r = evaluate(dataset([row(1), row(2, "check")]), [model("candidate", [0, 0]), model("baseline", [0, 0])]);
    expect(candidate(r).scopes[0]!.summary!.nll).toBe("infinite");
    expect(r.comparisons[0]!.scopes[0]!.difference!.nll).toEqual({ value: null, status: "undefined_both_infinite" });
    expect(JSON.stringify(r)).toContain('"nll":"infinite"');
  });
  it("is deterministic under row/model permutation and never mutates input or promotes review", () => {
    const d = dataset(), records = [model(), model("baseline", [.5, .5])], before = JSON.stringify([d, records]);
    const a = evaluate(d, records), b = evaluate({ ...d, rows: [...d.rows].reverse() }, [...records].reverse());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b)); expect(JSON.stringify([d, records])).toBe(before);
    expect(Object.isFrozen(candidate(a).scopes[0]!.summary!.calibration)).toBe(true);
    expect(candidate(a).provenance.validation).toBe("synthetic_fixture");
  });
  it("never admits synthetic data/models as empirical calibration", () => {
    expect(evaluate(dataset(), undefined, { ...options(), purpose: "empirical_evaluation" }).status).toBe("unavailable");
    const realMetadata = { ...dataset(), source: { ...source(), kind: "real_observations" as const } };
    expect(evaluate(realMetadata, undefined, { ...options(), purpose: "empirical_evaluation" }).reasons[0]).toContain("Synthetic models");
    const simulated = { ...dataset(), source: { ...source(), kind: "simulation" as const } };
    expect(evaluate(simulated).empiricalCalibration).toBe("unavailable");
  });
  it("labels real-metadata scores descriptive only, retaining selection limits (contract fixture)", () => {
    const d = { ...dataset(), source: { ...source(), kind: "real_observations" as const }, selection: "showdown_only" as const };
    const records = [model(), model("baseline")].map(m => ({ ...m, source: { ...m.source, kind: "real_observations" as const }, validation: "unvalidated" as const,
      cases: m.cases.map(c => ({ ...c, actions: c.actions.map(a => ({ ...a, likelihood: { ...a.likelihood,
        validation: { status: "unreviewed" as const, reviewRefs: [] } } })) })) }));
    const r = evaluate(d, records, { ...options(), purpose: "empirical_evaluation" });
    expect(r.empiricalCalibration).toBe("descriptive_only"); expect(r.status).toBe("unvalidated");
    expect(r.populationClaim).toContain("Selected observations only");
  });
});
