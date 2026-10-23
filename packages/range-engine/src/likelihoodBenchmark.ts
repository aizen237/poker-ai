import { cardId, validateSimulationInput, type Card } from "@poker-ai/shared";
import { immutableCopy } from "./boardComboFeatures.js";
import { comboKey, createComboRange, normalizeComboRange, type ComboRange } from "./comboRange.js";
import { validateOfflineObservation, type OfflineObservation } from "./offlineConditioning.js";
import { createLikelihoodRegistry, demand, modelIdentity, phase5BScope, stableKey, stringList, textId,
  validateBenchmarkScope, validateDevelopment, validateSampleIdentity, validateSource,
  type BenchmarkScope, type DevelopmentManifest, type LikelihoodModelRecord, type LikelihoodRegistry,
  type SampleIdentity, type SourceProvenance } from "./likelihoodRegistry.js";
import { scoreProbabilities, summarizePredictions, validateCalibrationBins, type ScoredPrediction } from "./probabilityMetrics.js";

export interface EvaluationPrior {
  readonly range: ComboRange;
  readonly throughObservation: number;
  readonly conditionedOnEventIds: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly development: DevelopmentManifest;
}
export interface EvaluationRow {
  readonly identity: SampleIdentity;
  readonly scopeId: string;
  readonly scope: BenchmarkScope;
  readonly heroCards: readonly [Card, Card];
  readonly evidence: OfflineObservation["evidence"];
  readonly observation: number;
  /** Context/action availability must be established before the labeled action. */
  readonly contextThroughObservation: number;
  /** Previously conditioned events for this opponent, not fabricated full history. */
  readonly history: readonly OfflineObservation[];
  readonly actionLabel: string | null;
  readonly holeCards: { readonly status: "unknown" } | {
    readonly status: "revealed";
    readonly cards: readonly [Card, Card];
    readonly mechanism: "showdown" | "independent_reveal";
    readonly sourceRefs: readonly string[];
  };
  readonly prior: EvaluationPrior | null;
}
export interface EvaluationDataset {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly source: SourceProvenance;
  readonly identityNamespace: string;
  readonly declaredSamples: number;
  readonly population: string;
  readonly selection: "all_decisions" | "showdown_only" | "convenience" | "unknown";
  readonly selectionNotes: readonly string[];
  readonly splitProvenanceRefs: readonly string[];
  readonly rows: readonly EvaluationRow[];
}
export interface BenchmarkOptions {
  readonly purpose: "empirical_evaluation" | "simulation_evaluation" | "mathematical_test";
  readonly holdout: "hand" | "session" | "player";
  readonly labelMode: "action_marginal" | "revealed_combo";
  readonly calibrationBinEdges: readonly number[];
  readonly baseline: Pick<LikelihoodModelRecord, "id" | "version">;
}

function prefix(a: readonly Card[], b: readonly Card[]): boolean {
  return a.length <= b.length && a.every((c, i) => cardId(c) === cardId(b[i]!));
}
function observationFor(row: EvaluationRow, outcomeId: string): OfflineObservation {
  const outcome = row.scope.outcomes.find(o => o.id === outcomeId);
  demand(outcome, "Missing action outcome");
  const scope = phase5BScope(row.scope, outcome);
  return { heroCards: row.heroCards, board: scope.board, action: { ...scope.action, observation: row.observation },
    context: scope.context, evidence: row.evidence };
}

/** Dataset manifest checks are global: duplicate or inconsistent identities cannot
 * be hidden by a model omitting coverage for those observations. */
function validateDataset(d: EvaluationDataset): void {
  demand(d.schemaVersion === 1 && [d.id, d.version, d.identityNamespace, d.population].every(textId), "Invalid dataset identity/provenance");
  validateSource(d.source);
  demand(Number.isSafeInteger(d.declaredSamples) && d.declaredSamples === d.rows.length, "Dataset sample-count mismatch");
  demand(["all_decisions", "showdown_only", "convenience", "unknown"].includes(d.selection), "Invalid selection mechanism");
  stringList(d.selectionNotes, "selection limitations", true); stringList(d.splitProvenanceRefs, "split provenance", true);
  const events = new Set<string>(), decisions = new Set<string>();
  const hands = new Map<string, EvaluationRow[]>();
  for (const r of d.rows) {
    validateSampleIdentity(r.identity);
    demand(r.identity.eventId === r.evidence.eventId && r.identity.handId === r.evidence.handId &&
      textId(r.evidence.opponentId) && r.identity.playerIds.includes(r.evidence.opponentId) &&
      textId(r.evidence.sourceId) && textId(r.evidence.decisionId), "Dataset/evidence identity mismatch");
    demand(!events.has(r.identity.eventId) && !decisions.has(stableKey([r.evidence.sourceId, r.evidence.decisionId])), "Duplicate evaluation event/decision");
    events.add(r.identity.eventId); decisions.add(stableKey([r.evidence.sourceId, r.evidence.decisionId]));
    const group = hands.get(r.identity.handId) ?? []; group.push(r); hands.set(r.identity.handId, group);
  }
  const byEvent = new Map(d.rows.map(r => [r.identity.eventId, r]));
  for (const r of d.rows) for (const h of r.history) {
    const recorded = byEvent.get(h.evidence.eventId!);
    if (recorded?.actionLabel != null) demand(stableKey(h) === stableKey(observationFor(recorded, recorded.actionLabel)),
      "Conditioned history contradicts recorded evaluation event");
  }
  for (const rows of hands.values()) {
    rows.sort((a, b) => a.observation - b.observation);
    let previous: EvaluationRow | null = null;
    const terminal = new Set<string>();
    for (const r of rows) {
      demand(Number.isSafeInteger(r.observation) && r.observation >= 0, "Invalid evaluation ordering");
      if (previous) demand(r.observation > previous.observation && r.evidence.observedAt >= previous.evidence.observedAt &&
        r.identity.sessionId === previous.identity.sessionId && r.evidence.sourceId === previous.evidence.sourceId &&
        stableKey([...r.identity.playerIds].sort()) === stableKey([...previous.identity.playerIds].sort()) &&
        comboKey(r.heroCards) === comboKey(previous.heroCards) && prefix(previous.scope.board, r.scope.board), "Inconsistent hand/session/history");
      demand(!terminal.has(r.evidence.opponentId!), "Observation follows terminal actor action");
      const verb = r.scope.outcomes.find(o => o.id === r.actionLabel)?.action;
      if (verb === "fold" || verb === "all-in") terminal.add(r.evidence.opponentId!);
      previous = r;
    }
  }
}

function validateRow(row: EvaluationRow): void {
  demand(textId(row.scopeId), "Missing scope identity"); validateBenchmarkScope(row.scope);
  demand(Number.isSafeInteger(row.contextThroughObservation) && row.contextThroughObservation >= 0 &&
    row.contextThroughObservation < row.observation, "Context includes current/future action");
  comboKey(row.heroCards);
  validateSimulationInput([...row.heroCards, ...row.scope.board], row.scope.board.length, 1);
  for (const outcome of row.scope.outcomes) validateOfflineObservation(observationFor(row, outcome.id));
  demand(stableKey(row.scope.conditionedOnEventIds) === stableKey(row.history.map(h => h.evidence.eventId)), "Missing/inconsistent conditioned history");
  demand(row.contextThroughObservation >= (row.history.at(-1)?.action.observation ?? 0), "Context predates conditioned history");
  let previous: OfflineObservation | null = null;
  for (const h of row.history) {
    validateOfflineObservation(h);
    demand(h.evidence.handId === row.evidence.handId && h.evidence.opponentId === row.evidence.opponentId &&
      h.evidence.sourceId === row.evidence.sourceId && comboKey(h.heroCards) === comboKey(row.heroCards) &&
      h.action.observation! < row.observation && h.evidence.observedAt <= row.evidence.observedAt &&
      prefix(h.board, row.scope.board) && h.evidence.originalExpiresAt! > row.evidence.observedAt &&
      h.action.action !== "fold" && h.action.action !== "all-in", "Inconsistent/expired prior history");
    if (previous) demand(h.action.observation! > previous.action.observation! && h.evidence.observedAt >= previous.evidence.observedAt &&
      prefix(previous.board, h.board), "History order regressed");
    if (h.action.street === row.scope.street) demand(h.action.priorRaises! <= row.scope.priorRaises, "History raise count regressed");
    previous = h;
  }
  demand(row.actionLabel !== null && row.scope.outcomes.some(o => o.id === row.actionLabel), "Missing/out-of-scope observed action label");
}

function checkHoldout(manifest: DevelopmentManifest, dataset: EvaluationDataset, holdout: BenchmarkOptions["holdout"]): void {
  validateDevelopment(manifest);
  demand(manifest.identityNamespace === dataset.identityNamespace, "Cannot verify leakage across identity namespaces");
  const trainEvents = new Set(manifest.observations.map(i => i.eventId));
  const trainHands = new Set(manifest.observations.map(i => i.handId));
  const trainSessions = new Set(manifest.observations.map(i => i.sessionId));
  const trainPlayers = new Set(manifest.observations.flatMap(i => [...i.playerIds]));
  for (const r of dataset.rows) {
    demand(!trainEvents.has(r.identity.eventId) && !trainHands.has(r.identity.handId), "Development/evaluation hand or event leakage");
    if (holdout !== "hand") demand(!trainSessions.has(r.identity.sessionId), "Development/evaluation session leakage");
    if (holdout === "player") demand(!r.identity.playerIds.some(p => trainPlayers.has(p)), "Development/evaluation participant leakage");
  }
}

function prediction(row: EvaluationRow, model: LikelihoodModelRecord, dataset: EvaluationDataset, options: BenchmarkOptions): ScoredPrediction {
  validateRow(row);
  const c = model.cases.find(c => c.scopeId === row.scopeId);
  demand(c && stableKey(c.scope) === stableKey(row.scope), "Model unavailable for exact evaluation scope");
  let range: ComboRange;
  if (options.labelMode === "revealed_combo") {
    demand(row.holeCards.status === "revealed", "Unknown opponent cards are not conditional labels");
    stringList(row.holeCards.sourceRefs, "reveal provenance", true);
    demand(["showdown", "independent_reveal"].includes(row.holeCards.mechanism), "Unknown reveal selection mechanism");
    validateSimulationInput([...row.holeCards.cards, ...row.heroCards, ...row.scope.board], row.scope.board.length, 1);
    range = createComboRange([{ cards: row.holeCards.cards, weight: 1 }]);
  } else {
    demand(row.prior, "Hidden-card predictive probability requires explicit pre-action prior");
    const p = row.prior;
    stringList(p.sourceRefs, "prior provenance", true);
    demand(Number.isSafeInteger(p.throughObservation) && p.throughObservation >= 0 && p.throughObservation < row.observation &&
      p.throughObservation >= (row.history.at(-1)?.action.observation ?? 0) &&
      stableKey(p.conditionedOnEventIds) === stableKey(row.scope.conditionedOnEventIds), "Prior uses current/future or inconsistent history");
    checkHoldout(p.development, dataset, options.holdout);
    const normalized = normalizeComboRange(p.range, [...row.heroCards, ...row.scope.board]);
    demand(normalized.status === "normalized", "No legal prior mass");
    demand(normalized.range.combos.length === createComboRange(p.range.combos).combos.filter(c =>
      !c.cards.some(card => [...row.heroCards, ...row.scope.board].some(k => cardId(k) === cardId(card)))).length,
    "Prior positive support lost numerically");
    range = normalized.range;
  }
  const probabilities = row.scope.outcomes.map(outcome => {
    const table = new Map(c.actions.find(a => a.outcomeId === outcome.id)!.likelihood.likelihoods.map(r => [comboKey(r.cards), r.probability]));
    let sum = 0;
    for (const combo of range.combos) {
      const likelihood = table.get(comboKey(combo.cards));
      demand(likelihood !== undefined, "Missing model coverage for legal prior/known combination");
      const term = combo.weight * likelihood;
      demand(likelihood === 0 || term > 0, "Predictive term exceeds numeric representation");
      sum += term;
    }
    return sum;
  });
  const observedIndex = row.scope.outcomes.findIndex(o => o.id === row.actionLabel);
  scoreProbabilities(probabilities, observedIndex);
  return { ...row.identity, probabilities, observedIndex };
}

interface RowScore extends ScoredPrediction { readonly scopeId: string }
interface Failure { readonly eventId: string; readonly reason: string }
function failure(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function summaries(rows: readonly RowScore[], dataset: EvaluationDataset, edges: readonly number[]) {
  return [...new Set(dataset.rows.map(r => r.scopeId))].sort().map(scopeId => {
    const source = dataset.rows.filter(r => r.scopeId === scopeId);
    const scored = rows.filter(r => r.scopeId === scopeId);
    return { scopeId, scope: source[0]!.scope,
      attempted: source.length, scored: scored.length, missing: source.length - scored.length,
      summary: summarizePredictions(scored, source[0]!.scope.outcomes.map(o => o.id), edges) };
  });
}
function lossDifference(candidate: number | "infinite", baseline: number | "infinite") {
  if (candidate === "infinite" && baseline === "infinite") return { value: null, status: "undefined_both_infinite" };
  if (candidate === "infinite") return { value: "+infinite", status: "defined" };
  if (baseline === "infinite") return { value: "-infinite", status: "defined" };
  return { value: candidate - baseline, status: "defined" };
}
function pairedSensitivity(candidate: readonly RowScore[], baseline: readonly RowScore[]) {
  const sessions = [...new Set(candidate.map(r => r.sessionId))].sort();
  if (sessions.length < 2) return null;
  const mean = (rows: readonly RowScore[]) => {
    const scores = rows.map(r => scoreProbabilities(r.probabilities, r.observedIndex));
    return { nll: scores.some(s => s.nll === "infinite") ? "infinite" as const :
      scores.reduce((sum, s) => sum + (s.nll as number), 0) / scores.length,
      brier: scores.reduce((sum, s) => sum + s.brier, 0) / scores.length };
  };
  const differences = sessions.map(session => {
    const c = mean(candidate.filter(r => r.sessionId !== session)), b = mean(baseline.filter(r => r.sessionId !== session));
    return { nll: lossDifference(c.nll, b.nll), brier: c.brier - b.brier };
  });
  const finiteNll = differences.every(d => typeof d.nll.value === "number");
  return { method: "leave_one_session_out", sessions: sessions.length,
    brierDifferenceRange: [Math.min(...differences.map(d => d.brier)), Math.max(...differences.map(d => d.brier))],
    nllDifferenceRange: finiteNll ? [Math.min(...differences.map(d => d.nll.value as number)), Math.max(...differences.map(d => d.nll.value as number))] : null,
    nllUnavailableReason: finiteNll ? null : "Infinite or undefined paired log-loss differences",
    confidenceInterval: null, interpretation: "Paired session sensitivity, not a confidence interval or superiority test" };
}

/** Pure deterministic offline benchmark over externally supplied exact tables.
 * Labels never enter a predictor/provider call; there is no provider callback.
 * Scope-specific comparison uses the SAME intersection of scored observations. */
export function benchmarkLikelihoodModels(dataset: EvaluationDataset, registry: LikelihoodRegistry, options: BenchmarkOptions) {
  try {
    validateDataset(dataset); validateCalibrationBins(options.calibrationBinEdges);
    demand(["hand", "session", "player"].includes(options.holdout), "Unsupported holdout boundary");
    demand(["action_marginal", "revealed_combo"].includes(options.labelMode), "Unsupported label mode");
    demand(["empirical_evaluation", "simulation_evaluation", "mathematical_test"].includes(options.purpose), "Invalid benchmark purpose");
    const validated = createLikelihoodRegistry(registry.records, registry.reviews, registry.supportedAssumptions);
    const baselineKey = modelIdentity(options.baseline);
    demand(validated.records.some(r => modelIdentity(r) === baselineKey), "Explicit baseline unavailable");
    if (options.purpose === "empirical_evaluation") demand(dataset.source.kind === "real_observations", "Non-real dataset cannot support empirical evaluation");
    if (options.purpose === "simulation_evaluation") demand(dataset.source.kind !== "synthetic_fixture", "Synthetic fixtures require mathematical_test mode");
    if (options.purpose !== "mathematical_test") demand(validated.records.every(m => m.source.kind !== "synthetic_fixture"), "Synthetic models cannot support empirical/simulation evaluation");
    // Scope IDs describe a fixed action space/context for all rows and models.
    const scopeKeys = new Map<string, string>();
    for (const r of dataset.rows) {
      demand(!scopeKeys.has(r.scopeId) || scopeKeys.get(r.scopeId) === stableKey(r.scope), "Scope ID aliases incompatible contexts");
      scopeKeys.set(r.scopeId, stableKey(r.scope));
    }
    const rows = [...dataset.rows].sort((a, b) => a.identity.eventId < b.identity.eventId ? -1 : 1);
    const evaluations = validated.records.map(model => {
      const scores: RowScore[] = [], failures: Failure[] = [];
      let lineageFailure: string | null = null;
      try { checkHoldout(model.development, dataset, options.holdout); } catch (error) { lineageFailure = failure(error); }
      for (const row of rows) {
        try {
          demand(!lineageFailure, lineageFailure ?? "Invalid lineage");
          scores.push({ ...prediction(row, model, dataset, options), scopeId: row.scopeId });
        } catch (error) { failures.push({ eventId: row.identity.eventId, reason: failure(error) }); }
      }
      return { model, scores, failures, lineageFailure };
    });
    const baseline = evaluations.find(e => modelIdentity(e.model) === baselineKey)!;
    const comparisons = evaluations.filter(e => e !== baseline).map(candidate => {
      const candidateEvents = new Set(candidate.scores.map(r => r.eventId));
      const baselineEvents = new Set(baseline.scores.map(r => r.eventId));
      const pairedCandidate = candidate.scores.filter(r => baselineEvents.has(r.eventId));
      const pairedBaseline = baseline.scores.filter(r => candidateEvents.has(r.eventId));
      const cScopes = summaries(pairedCandidate, dataset, options.calibrationBinEdges);
      const bScopes = summaries(pairedBaseline, dataset, options.calibrationBinEdges);
      return { candidate: modelIdentity(candidate.model), baseline: baselineKey, pairedSamples: pairedCandidate.length,
        excludedFromPairing: dataset.rows.length - pairedCandidate.length,
        scopes: cScopes.map((c, i) => ({ scopeId: c.scopeId, candidate: c.summary, baseline: bScopes[i]!.summary,
          difference: c.summary && bScopes[i]!.summary ? {
            nll: lossDifference(c.summary.nll, bScopes[i]!.summary!.nll),
            brier: c.summary.brier - bScopes[i]!.summary!.brier,
            uncertainty: pairedSensitivity(pairedCandidate.filter(r => r.scopeId === c.scopeId), pairedBaseline.filter(r => r.scopeId === c.scopeId)),
            interpretation: "Paired descriptive difference (candidate minus baseline); no superiority claim" } : null })) };
    });
    const anyScores = evaluations.some(e => e.scores.length > 0);
    const empirical = options.purpose === "empirical_evaluation" && dataset.source.kind === "real_observations" && anyScores;
    return immutableCopy({ status: anyScores ? "unvalidated" as const : "unavailable" as const,
      schemaVersion: 1, dataset: { id: dataset.id, version: dataset.version, source: dataset.source,
        identityNamespace: dataset.identityNamespace, population: dataset.population, selection: dataset.selection,
        selectionNotes: dataset.selectionNotes, splitProvenanceRefs: dataset.splitProvenanceRefs, declaredSamples: dataset.declaredSamples,
        observedActionLabels: rows.filter(r => r.actionLabel !== null).length,
        unknownHoleCards: rows.filter(r => r.holeCards.status === "unknown").length,
        showdownReveals: rows.filter(r => r.holeCards.status === "revealed" && r.holeCards.mechanism === "showdown").length,
        independentReveals: rows.filter(r => r.holeCards.status === "revealed" && r.holeCards.mechanism === "independent_reveal").length },
      options, empiricalCalibration: empirical ? "descriptive_only" : "unavailable",
      populationClaim: options.labelMode === "revealed_combo" || dataset.selection !== "all_decisions" ?
        "Selected observations only; no all-decision population claim or automatic selection correction" :
        "Declared sampling frame only; coverage and prior correctness require independent review",
      reasons: ["Benchmark never promotes validation status or grants live permission",
        ...(anyScores ? [] : ["No scorable evaluation observations"]),
        ...(options.labelMode === "action_marginal" ? ["Scores evaluate the supplied prior-model mixture, not hidden-card conditional calibration"] :
          ["Revealed-card scores are conditional on the reveal/selection mechanism"]),
        ...(empirical ? [] : ["No empirical calibration claim from mathematical fixtures, simulations or absent scores"])],
      models: evaluations.map(e => ({ identity: modelIdentity(e.model), provenance: {
        id: e.model.id, version: e.model.version, source: e.model.source, author: e.model.author, validation: e.model.validation,
        reviewRefs: e.model.reviewRefs, developmentSamples: e.model.development.observations.length,
        developmentRefs: e.model.development.sourceRefs, assumptions: e.model.assumptions, limitations: e.model.limitations },
        status: e.scores.length ? "unvalidated" : "unavailable", attempted: rows.length, scored: e.scores.length,
        failures: e.failures, lineageFailure: e.lineageFailure, scopes: summaries(e.scores, dataset, options.calibrationBinEdges) })), comparisons });
  } catch (error) {
    return immutableCopy({ status: "unavailable" as const, schemaVersion: 1, empiricalCalibration: "unavailable",
      datasetId: textId(dataset?.id) ? dataset.id : null,
      declaredSamples: Number.isSafeInteger(dataset?.declaredSamples) ? dataset.declaredSamples : null,
      observedRows: Array.isArray(dataset?.rows) ? dataset.rows.length : null,
      reasons: [failure(error)], models: [], comparisons: [] });
  }
}
