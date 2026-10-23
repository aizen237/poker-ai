import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { benchmarkLikelihoodModels } from "./likelihoodBenchmark.js";
import { evaluatePhhPilot, preparePhhPilot, type PhhReplay } from "./phhPilot.js";

// observations.json is derived from authentic hash-pinned public records.
// All mutations below are SYNTHETIC negative/contract tests, not new real data.
const real: PhhReplay = JSON.parse(readFileSync(new URL("../../../scripts/fixtures/phh/observations.json", import.meta.url), "utf8"));
const clone = () => structuredClone(real);

describe("bounded real PHH pilot", () => {
  it("fits on two development decisions and scores six actual held-out observations", () => {
    const report = evaluatePhhPilot(real);
    expect(report.fitting).toEqual({ developmentObservations: 2, foldCount: 1, callCount: 1, foldProbability: 0.5 });
    for (const mode of [report.actionMarginal, report.revealedCombo]) {
      expect(mode.status).toBe("unvalidated");
      expect(mode.empiricalCalibration).toBe("descriptive_only");
      expect(mode.models[0]!.scored).toBe(6);
      expect(mode.models[0]!.failures).toEqual([]);
      expect(mode.models[0]!.provenance.source.kind).toBe("real_observations");
      for (const s of mode.models[0]!.scopes) {
        expect(s.summary!.nll).toBeCloseTo(Math.log(2), 12);
        expect(s.summary!.brier).toBeCloseTo(0.5, 12);
        expect(s.scored).toBe(1);
      }
    }
    expect(report.populations.map(p => [p.population, p.development, p.evaluation])).toEqual([["human", 1, 3], ["bot", 1, 3]]);
    expect(report.populationReports.map(p => p.report.models[0]!.scored)).toEqual([3, 3]);
  });

  it("evaluation labels and archive-only cards cannot fit the model or alter the prior", () => {
    const altered = clone();
    for (const r of altered.rows.filter(r => r.split === "evaluation")) {
      r.label = r.label === "fold" ? "call" : "fold";
      r.holeCards = null;
    }
    const original = preparePhhPilot(real), changed = preparePhhPilot(altered);
    expect(changed.registry).toEqual(original.registry);
    expect(changed.dataset.rows.map(r => r.prior)).toEqual(original.dataset.rows.map(r => r.prior));
    const report = evaluatePhhPilot(altered);
    expect(report.actionMarginal.models[0]!.scored).toBe(6);
    expect(report.revealedCombo.models[0]!.scored).toBe(0);
    expect(report.revealedCombo.models[0]!.failures.every(f => f.reason.includes("Unknown opponent cards"))).toBe(true);
  });

  it("uses pre-action payable cost and call street total separately", () => {
    const { dataset } = preparePhhPilot(real);
    const r = dataset.rows.find(r => r.identity.handId === "phh-pluribus:105:14")!;
    expect(r.scope.context.facingAmountBB).toBe(39.75);
    expect(r.scope.outcomes[1]).toMatchObject({ action: "all-in", wagerAction: "call", actionToBB: 70.25 });
    expect(r.scope.context.potBB).toBe(161.75);
    expect(r.contextThroughObservation).toBe(r.observation - 1);
    expect(r.evidence.originalExpiresAt).toBe(201); // Explicit archive ordinal boundary, never live time.
    expect(r.scope.conditionedOnEventIds).toEqual([]); // Memoryless baseline; not a fabricated history.
  });

  it.each(["split", "fingerprint", "hand", "profile", "raise", "cost", "session", "source", "count"])("rejects synthetic %s corruption", field => {
    const d = clone(), r = d.rows.find(r => r.split === "evaluation")!;
    if (field === "split") r.split = "development";
    if (field === "fingerprint") r.handFingerprint = d.rows[0]!.handFingerprint;
    if (field === "hand") r.handId = d.rows[0]!.handId;
    if (field === "profile") Object.assign(r.legalContext, { activePlayers: 3 });
    if (field === "raise") Object.assign(r.legalContext, { canRaise: true });
    if (field === "cost") r.facingAmountBB += 1;
    if (field === "session") r.sessionId = "invented-independent-session";
    if (field === "source") r.sourceRef = "unidentified-source";
    if (field === "count") d.binaryObservations += 1;
    expect(() => preparePhhPilot(d)).toThrow();
  });

  it("reuses Phase 5C session/player leakage rejection and makes only a hand-holdout claim", () => {
    const { dataset, registry } = preparePhhPilot(real);
    for (const holdout of ["session", "player"] as const) {
      const result = benchmarkLikelihoodModels(dataset, registry, { purpose: "empirical_evaluation", holdout,
        labelMode: "action_marginal", calibrationBinEdges: [0, 1], baseline: registry.records[0]! });
      expect(result.models[0]!.scored).toBe(0);
      expect(result.models[0]!.lineageFailure).toContain("leakage");
    }
  });

  it("does not clip a zero empirical training frequency into fabricated support", () => {
    const d = clone();
    d.rows.filter(r => r.split === "development").forEach(r => { r.label = "fold"; });
    const report = evaluatePhhPilot(d);
    expect(report.fitting.foldProbability).toBe(1);
    expect(report.revealedCombo.models[0]!.scopes.filter(s => s.summary!.nll === "infinite")).toHaveLength(2);
  });

  it("requires data on both sides of the fixed split", () => {
    const d = clone();
    d.rows = d.rows.filter(r => r.split === "evaluation"); d.binaryObservations = d.rows.length;
    expect(() => preparePhhPilot(d)).toThrow("Insufficient");
  });

  it("exports identical artifacts under row permutations and leaves supplied records unchanged", () => {
    const before = clone(), shuffled = clone(); shuffled.rows.reverse();
    // Phase 5C independently tests scorer determinism. Check this adapter's
    // entire exported artifact without redundantly scoring eight reports here.
    const hash = (input: PhhReplay) => createHash("sha256").update(JSON.stringify(preparePhhPilot(input))).digest("hex");
    expect(hash(shuffled)).toBe(hash(real));
    expect(real).toEqual(before);
  });
});
