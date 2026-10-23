import { validateSimulationInput, type Card } from "@poker-ai/shared";
import { immutableCopy } from "./boardComboFeatures.js";
import { comboKey, createComboRange } from "./comboRange.js";
import { validateLikelihoodScope, validateLikelihoodStructure, type ActionLikelihoodModel,
  type LikelihoodScope, type OfflineObservation } from "./offlineConditioning.js";

export type EvidenceKind = "real_observations" | "simulation" | "synthetic_fixture";
export interface SourceProvenance {
  readonly kind: EvidenceKind;
  readonly provider: string;
  readonly sourceRefs: readonly string[];
  readonly createdOn: string;
}
/** Stable pseudonymous IDs in ONE declared namespace, including every participant.
 * Identity aliases and omitted training/tuning data cannot be detected by code. */
export interface SampleIdentity {
  readonly eventId: string;
  readonly handId: string;
  readonly sessionId: string;
  readonly playerIds: readonly string[];
}
export interface DevelopmentManifest {
  readonly identityNamespace: string;
  readonly coverage: "complete" | "unknown";
  readonly fitting: "data" | "none";
  readonly sourceRefs: readonly string[];
  /** Includes training, tuning, model selection and earlier calibration data. */
  readonly observations: readonly SampleIdentity[];
}
export interface GameplayProfile {
  readonly variant: "holdem";
  readonly betting: "no_limit";
  readonly format: "cash";
  readonly seatsDealtIn: 6;
  readonly anteBB: 0;
  readonly straddle: false;
  readonly objective: "chip_ev";
}
export interface ActionOutcome {
  readonly id: string;
  readonly action: OfflineObservation["action"]["action"];
  readonly wagerAction: "call" | "bet" | "raise" | null;
  readonly actionToBB: number;
}
export interface BenchmarkScope {
  readonly profile: GameplayProfile;
  readonly board: readonly Card[];
  readonly street: "flop" | "turn" | "river";
  readonly priorRaises: number;
  readonly facing: "none" | "bet" | "raise";
  readonly facingPosition: NonNullable<OfflineObservation["action"]["facingPosition"]> | null;
  readonly context: Omit<OfflineObservation["context"], "actionToBB">;
  /** Exact discrete actions/sizes, mutually exclusive and collectively exhaustive.
   * A selected subset of legal sizes is NOT a distribution over all actions. */
  readonly actionCoverage: "exhaustive_discrete" | "partial";
  readonly actionCoverageRef: string;
  readonly outcomes: readonly ActionOutcome[];
  readonly conditionedOnEventIds: readonly string[];
}
export interface LikelihoodCase {
  readonly scopeId: string;
  readonly scope: BenchmarkScope;
  readonly actions: readonly { readonly outcomeId: string; readonly likelihood: ActionLikelihoodModel }[];
}
export interface LikelihoodModelRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly author: string;
  readonly source: SourceProvenance;
  readonly validation: "unvalidated" | "independently_reviewed" | "synthetic_fixture";
  readonly reviewRefs: readonly string[];
  readonly assumptions: readonly string[];
  readonly limitations: readonly string[];
  readonly development: DevelopmentManifest;
  /** Scope/profile/actions/sizing are versioned parts of the provenance artifact. */
  readonly cases: readonly LikelihoodCase[];
}
export interface LikelihoodReview {
  readonly reference: string;
  readonly reviewer: string;
  readonly independentOfProvider: true;
  readonly reviewedOn: string;
  readonly sourceAuditRefs: readonly string[];
  readonly heldOutEvaluationRefs: readonly string[];
  readonly calibrationRefs: readonly string[];
  readonly selectionBiasAssessmentRefs: readonly string[];
  readonly limitations: readonly string[];
  /** Exact artifact binding; caller must independently authenticate the review. */
  readonly artifact: LikelihoodModelRecord;
}
export interface LikelihoodRegistry {
  readonly schemaVersion: 1;
  readonly records: readonly LikelihoodModelRecord[];
  readonly reviews: readonly LikelihoodReview[];
  readonly supportedAssumptions: readonly string[];
}

export function demand(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(reason);
}
export function textId(v: unknown): v is string { return typeof v === "string" && v.trim().length > 0; }
export function stringList(v: readonly string[], name: string, nonempty = false): void {
  demand(Array.isArray(v) && (!nonempty || v.length > 0) && v.every(textId) && new Set(v).size === v.length, `Invalid ${name}`);
}
export function stableKey(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableKey).join(",")}]`;
  if (v !== null && typeof v === "object") return `{${Object.keys(v).sort()
    .filter(k => (v as Record<string, unknown>)[k] !== undefined)
    .map(k => `${JSON.stringify(k)}:${stableKey((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v) ?? "undefined";
}
export function modelIdentity(m: Pick<LikelihoodModelRecord, "id" | "version">): string { return stableKey([m.id, m.version]); }
export function validDate(s: string): void {
  demand(/^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, "Invalid provenance date");
}
export function validateSource(p: SourceProvenance): void {
  demand(["real_observations", "simulation", "synthetic_fixture"].includes(p.kind) && textId(p.provider), "Missing source/provider provenance");
  validDate(p.createdOn); stringList(p.sourceRefs, "source references", true);
}
export function validateSampleIdentity(i: SampleIdentity): void {
  demand([i.eventId, i.handId, i.sessionId].every(textId), "Missing hand/session/event identity");
  stringList(i.playerIds, "participant identities", true);
  demand(i.playerIds.length === 6, "All six dealt-in participant identities required");
}
export function validateDevelopment(d: DevelopmentManifest): void {
  demand(textId(d.identityNamespace) && d.coverage === "complete", "Development-data lineage unavailable");
  stringList(d.sourceRefs, "development references", true);
  demand(d.fitting === "data" || d.fitting === "none", "Invalid fitting declaration");
  demand(d.fitting === "none" ? d.observations.length === 0 : d.observations.length > 0, "Contradictory development sample count");
  const events = new Set<string>();
  const hands = new Map<string, string>();
  for (const i of d.observations) {
    validateSampleIdentity(i); demand(!events.has(i.eventId), "Duplicate development event"); events.add(i.eventId);
    const identity = stableKey([i.sessionId, [...i.playerIds].sort()]);
    demand(!hands.has(i.handId) || hands.get(i.handId) === identity, "Inconsistent development hand identity");
    hands.set(i.handId, identity);
  }
}
export function phase5BScope(scope: BenchmarkScope, outcome: ActionOutcome): LikelihoodScope {
  return { board: scope.board, action: { street: scope.street, action: outcome.action, priorRaises: scope.priorRaises,
    facing: scope.facing, facingPosition: scope.facingPosition, wagerAction: outcome.wagerAction },
    context: { ...scope.context, actionToBB: outcome.actionToBB } };
}
export function validateBenchmarkScope(s: BenchmarkScope): void {
  demand(stableKey(s.profile) === stableKey({ variant: "holdem", betting: "no_limit", format: "cash", seatsDealtIn: 6,
    anteBB: 0, straddle: false, objective: "chip_ev" }), "Unsupported gameplay profile");
  demand(s.actionCoverage === "exhaustive_discrete" && textId(s.actionCoverageRef), "Incomplete action coverage");
  stringList(s.outcomes.map(o => o.id), "outcome IDs", true);
  stringList(s.conditionedOnEventIds, "conditioned event IDs");
  demand(s.context.opponentsRemaining !== null && s.context.opponentsRemaining <= s.profile.seatsDealtIn - 1,
    "Opponent count incompatible with gameplay profile");
  demand(new Set(s.outcomes.map(o => stableKey([o.action === "all-in" ? o.wagerAction : o.action, o.actionToBB]))).size === s.outcomes.length,
    "Duplicate physical action outcome");
  for (const o of s.outcomes) validateLikelihoodScope(phase5BScope(s, o));
}

/** Numerical summation tolerance only, not a reliability/sample-size threshold. */
export const PROBABILITY_SUM_TOLERANCE = 1e-12;
export function validateDistribution(p: readonly number[]): void {
  demand(p.length > 0 && p.every(v => Number.isFinite(v) && v >= 0 && v <= 1), "Invalid action probabilities");
  demand(Math.abs(p.reduce((sum, v) => sum + v, 0) - 1) <= PROBABILITY_SUM_TOLERANCE, "Action probabilities must sum to one");
}

export function validateLikelihoodRecord(record: LikelihoodModelRecord, reviews: readonly LikelihoodReview[], supported: readonly string[]): void {
  demand(record.schemaVersion === 1 && [record.id, record.version, record.author].every(textId), "Invalid model provenance/version");
  validateSource(record.source); validateDevelopment(record.development);
  stringList(record.assumptions, "model assumptions"); stringList(record.limitations, "model limitations", true);
  stringList(record.reviewRefs, "review references");
  demand(record.assumptions.every(a => supported.includes(a)), "Unsupported model assumption");
  demand(["unvalidated", "independently_reviewed", "synthetic_fixture"].includes(record.validation), "Invalid review status");
  demand((record.source.kind === "synthetic_fixture") === (record.validation === "synthetic_fixture"), "Synthetic provenance/status contradiction");
  if (record.validation !== "independently_reviewed") demand(record.reviewRefs.length === 0, "Unreviewed model claims review");
  else {
    stringList(record.reviewRefs, "independent review references", true);
    for (const ref of record.reviewRefs) {
      const matches = reviews.filter(r => r.reference === ref && stableKey(r.artifact) === stableKey(record));
      demand(matches.length === 1, "Missing or contradictory exact-artifact review");
      const review = matches[0]!;
      demand(textId(review.reviewer) && review.reviewer !== record.author && review.reviewer !== record.source.provider &&
        review.independentOfProvider === true, "Review is not independently attributed");
      validDate(review.reviewedOn); demand(review.reviewedOn >= record.source.createdOn, "Review predates artifact");
      for (const refs of [review.sourceAuditRefs, review.heldOutEvaluationRefs, review.calibrationRefs,
        review.selectionBiasAssessmentRefs, review.limitations]) stringList(refs, "review evidence/limitations", true);
    }
  }
  stringList(record.cases.map(c => c.scopeId), "model scope IDs", true);
  for (const c of record.cases) {
    validateBenchmarkScope(c.scope);
    stringList(c.actions.map(a => a.outcomeId), "action tables", true);
    demand(stableKey(c.actions.map(a => a.outcomeId).sort()) === stableKey(c.scope.outcomes.map(o => o.id).sort()), "Incomplete action tables");
    const first = c.actions[0]!.likelihood;
    // Unit support preserves zero-likelihood rows for coverage validation.
    const support = createComboRange(first.likelihoods.map(r => ({ cards: r.cards, weight: 1 })));
    demand(support.combos.length > 0, "Empty model combination support");
    for (const row of support.combos) validateSimulationInput([...row.cards, ...c.scope.board], c.scope.board.length, 1);
    const tables = c.scope.outcomes.map(outcome => {
      const m = c.actions.find(a => a.outcomeId === outcome.id)!.likelihood;
      demand(m.id === record.id && m.version === record.version && stableKey(m.assumptions) === stableKey(record.assumptions) &&
        stableKey(m.limitations) === stableKey(record.limitations) && stableKey(m.provenance.sourceRefs) === stableKey(record.source.sourceRefs), "Phase 5B provenance identity mismatch");
      const expected = record.validation === "independently_reviewed" ? "reviewed" : record.validation === "synthetic_fixture" ? "synthetic_fixture" : "unreviewed";
      demand(m.validation.status === expected && stableKey(m.validation.reviewRefs) === stableKey(record.reviewRefs), "Phase 5B review status mismatch");
      const table = validateLikelihoodStructure(m, phase5BScope(c.scope, outcome), c.scope.conditionedOnEventIds, support);
      demand(table.size === support.combos.length, "Inconsistent combination support across actions");
      return table;
    });
    for (const row of support.combos) validateDistribution(tables.map(t => t.get(comboKey(row.cards))!));
  }
}

/** Registration validates offline artifacts; it cannot confer live permission.
 * No built-in models, baselines, training data or empirical probability defaults. */
export function createLikelihoodRegistry(records: readonly LikelihoodModelRecord[], reviews: readonly LikelihoodReview[], supportedAssumptions: readonly string[]): LikelihoodRegistry {
  stringList(supportedAssumptions, "supported assumptions");
  stringList(records.map(modelIdentity), "model identities", true);
  stringList(reviews.map(r => r.reference), "review identities");
  for (const record of records) validateLikelihoodRecord(record, reviews, supportedAssumptions);
  return immutableCopy({ schemaVersion: 1, records: [...records].sort((a, b) => modelIdentity(a) < modelIdentity(b) ? -1 : 1),
    reviews, supportedAssumptions });
}
