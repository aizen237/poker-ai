import { cardId, validateSimulationInput, type Card } from "@poker-ai/shared";
import { comboKey, createComboRange, normalizeComboRange, removeKnownCards, type ComboRange, type ComboWeight } from "./comboRange.js";
import { immutableCopy } from "./boardComboFeatures.js";
import type { BoardRangeUpdateInput, BoardRangeUpdateResult, BoardRangeUpdater, OpponentRangeState } from "./boardRangeUpdate.js";

export type OfflineObservation = Omit<BoardRangeUpdateInput, "prior">;

/** Caller-supplied archive binding. This is neither authenticated nor a live proof. */
export interface OfflineRangeAnchor {
  readonly handId: string;
  readonly sourceId: string;
  readonly opponentId: string;
  readonly heroCards: readonly [Card, Card];
  /** Ordered board prefix at the prior's cutoff; [] permits a preflop prior. */
  readonly board: readonly Card[];
  readonly throughObservation: number;
  readonly observedAt: number;
  readonly originalExpiresAt: number;
  readonly evidenceRefs: readonly string[];
}

/** Narrow, exact context support: no board abstraction or sizing interpolation. */
export interface LikelihoodScope {
  readonly board: readonly Card[];
  readonly action: Omit<BoardRangeUpdateInput["action"], "observation">;
  readonly context: BoardRangeUpdateInput["context"];
}

export interface ActionLikelihoodModel {
  readonly id: string;
  readonly version: string;
  readonly validation: {
    readonly status: "unreviewed" | "reviewed" | "synthetic_fixture";
    readonly reviewRefs: readonly string[];
  };
  readonly provenance: { readonly basis: string; readonly sourceRefs: readonly string[] };
  readonly assumptions: readonly string[];
  readonly limitations: readonly string[];
  readonly scope: LikelihoodScope;
  /** P(this observed action | combo, exact context, prior history), NOT P(combo).
   * Must cover every positive legal prior combo. Other rows are validated too.
   * Tables for later observations must be conditional on the preceding history. */
  readonly likelihoods: readonly { readonly cards: readonly [Card, Card]; readonly probability: number }[];
  /** Ordered event IDs already conditioned on, binding sequential likelihoods. */
  readonly conditionedOnEventIds: readonly string[];
}

export interface OfflineRangeHistory {
  readonly anchor: OfflineRangeAnchor;
  readonly applied: readonly { readonly observation: OfflineObservation; readonly model: ActionLikelihoodModel }[];
}

export interface OfflineConditioningOptions {
  readonly purpose: "offline_analysis" | "mathematical_test";
  /** Independent expected snapshot from the caller's authoritative offline archive.
   * No snapshot => unsupported. Comparing caller data is not source authentication. */
  readonly authoritativeObservation: OfflineObservation | null;
  /** Explicit evaluation time; never Date.now(), so archive replay is deterministic. */
  readonly evaluatedAt: number;
  readonly supportedAssumptions: readonly string[];
  /** Explicit caller-reviewed artifacts, not a built-in trusted-model registry. */
  readonly reviews: readonly {
    readonly modelId: string;
    readonly version: string;
    readonly reviewRef: string;
    /** Exact archived artifact prevents reusing review labels on altered tables. */
    readonly modelArtifact: ActionLikelihoodModel;
  }[];
}

function requireThat(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(reason);
}
function nonempty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function strings(values: readonly string[], name: string, required = false): void {
  requireThat(Array.isArray(values) && (!required || values.length > 0) && values.every(nonempty) &&
    new Set(values).size === values.length, `Invalid ${name}`);
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value)
    .filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
function equal(a: unknown, b: unknown): boolean { return canonical(a) === canonical(b); }
function prefix(a: readonly Card[], b: readonly Card[]): boolean {
  return a.length <= b.length && a.every((c, i) => cardId(c) === cardId(b[i]!));
}
function validateAnchor(anchor: OfflineRangeAnchor): void {
  requireThat([anchor.handId, anchor.sourceId, anchor.opponentId].every(nonempty), "Missing prior source/hand/opponent identity");
  comboKey(anchor.heroCards);
  validateSimulationInput([...anchor.heroCards, ...anchor.board], anchor.board.length, 1);
  requireThat(Number.isSafeInteger(anchor.throughObservation) && anchor.throughObservation >= 0, "Invalid prior observation cutoff");
  requireThat(Number.isFinite(anchor.observedAt) && anchor.observedAt >= 0 &&
    Number.isFinite(anchor.originalExpiresAt) && anchor.originalExpiresAt > anchor.observedAt, "Invalid original prior expiry");
  strings(anchor.evidenceRefs, "prior evidence references", true);
}

/** Binds an unconditioned Phase 5A state to an offline cutoff. Existing bindings
 * cannot be reset via this helper to erase the observation ledger or expiry. */
export function bindOfflineRangeState(prior: OpponentRangeState, anchor: OfflineRangeAnchor): OpponentRangeState {
  requireThat(!prior.offlineHistory, "Prior already bound; replay from original prior to change scenarios");
  validateAnchor(anchor);
  requireThat(prior.provenance.length > 0 && prior.provenance.every(p => nonempty(p.basis)) &&
    anchor.evidenceRefs.every(ref => prior.provenance.some(p => p.evidenceRefs.includes(ref))), "Prior provenance does not cover anchor references");
  requireThat(prior.uncertainty.alternatives.length === 0, "Unlabeled prior alternatives require separate scenario branches");
  return immutableCopy({ ...prior, range: removeKnownCards(prior.range, [...anchor.heroCards, ...anchor.board]),
    offlineHistory: { anchor, applied: [] } });
}

function scopeOf(observation: OfflineObservation): LikelihoodScope {
  const { observation: _order, ...action } = observation.action;
  return { board: observation.board, action, context: observation.context };
}
function validateObservation(o: OfflineObservation): void {
  comboKey(o.heroCards);
  requireThat(["flop", "turn", "river"].includes(o.action.street) &&
    o.board.length === ({ flop: 3, turn: 4, river: 5 })[o.action.street], "Board/street mismatch");
  validateSimulationInput([...o.heroCards, ...o.board], o.board.length, 1);
  const e = o.evidence, a = o.action, c = o.context;
  requireThat([e.handId, e.sourceId, e.opponentId, e.decisionId, e.eventId].every(nonempty), "Missing observation identity");
  requireThat(e.historyCoverage === "complete", "Incomplete offline history coverage");
  requireThat(e.provenance.length > 0 && e.provenance.every(p => nonempty(p.basis) &&
    p.evidenceRefs.length > 0 && p.evidenceRefs.every(nonempty)), "Missing observation provenance");
  requireThat(Number.isFinite(e.observedAt) && e.observedAt >= 0 && e.originalExpiresAt !== null &&
    Number.isFinite(e.originalExpiresAt) && e.originalExpiresAt > e.observedAt, "Invalid original observation expiry");
  requireThat(Number.isSafeInteger(a.observation) && a.observation! >= 0, "Missing ordered observation");
  requireThat(a.priorRaises !== null && Number.isSafeInteger(a.priorRaises) && a.priorRaises >= 0, "Unsupported raise context");
  requireThat(["none", "bet", "raise"].includes(a.facing), "Unsupported facing context");
  requireThat(a.facingPosition == null || ["UTG", "HJ", "CO", "BTN", "SB", "BB"].includes(a.facingPosition), "Invalid facing position");
  requireThat(a.unopened === undefined, "Preflop unopened assumption unsupported postflop");
  requireThat(["check", "call", "bet", "raise", "fold", "all-in"].includes(a.action), "Unsupported action");
  requireThat(a.action === "all-in" ? ["call", "bet", "raise"].includes(a.wagerAction ?? "") :
    a.wagerAction == null || a.wagerAction === a.action, "Contradictory wager action");
  requireThat(c.position != null && ["UTG", "HJ", "CO", "BTN", "SB", "BB"].includes(c.position), "Unsupported position");
  requireThat(c.potBB !== null && Number.isFinite(c.potBB) && c.potBB > 0 &&
    c.effectiveStackBB !== null && Number.isFinite(c.effectiveStackBB) && c.effectiveStackBB > 0 &&
    c.opponentsRemaining !== null && Number.isSafeInteger(c.opponentsRemaining) && c.opponentsRemaining >= 1 && c.opponentsRemaining <= 9,
  "Unsupported pot/depth/player scope");
  requireThat(c.facingAmountBB !== null && Number.isFinite(c.facingAmountBB) && c.facingAmountBB >= 0 &&
    c.actionToBB !== null && Number.isFinite(c.actionToBB) && c.actionToBB >= 0, "Unsupported sizing context");
  requireThat((a.facing === "none") === (c.facingAmountBB === 0), "Contradictory facing amount");
  requireThat(a.facing !== "raise" || a.priorRaises > 0, "Contradictory prior raise count");
  const verb = a.action === "all-in" ? a.wagerAction : a.action;
  requireThat(verb === "fold" || ((verb === "check" || verb === "bet") ? a.facing === "none" : a.facing !== "none"),
    "Contradictory action/facing context");
  requireThat((verb === "check" || verb === "fold") ? c.actionToBB === 0 : c.actionToBB > 0, "Contradictory action sizing");
  // This detects contradictions only. Payable cost, reopening and all-in legality
  // require independent action/stack proofs; effective depth is not actor stack.
}

function validateBinding(o: OfflineObservation, anchor: OfflineRangeAnchor, previous: OfflineObservation | null): void {
  requireThat(o.evidence.handId === anchor.handId && o.evidence.sourceId === anchor.sourceId &&
    o.evidence.opponentId === anchor.opponentId && comboKey(o.heroCards) === comboKey(anchor.heroCards), "Prior identity mismatch");
  requireThat(prefix(previous?.board ?? anchor.board, o.board), "Board regressed or changed its ordered prefix");
  requireThat(o.action.observation! > (previous?.action.observation ?? anchor.throughObservation) &&
    o.evidence.observedAt >= (previous?.evidence.observedAt ?? anchor.observedAt), "Observation order regressed");
  requireThat(previous?.action.action !== "fold" && previous?.action.action !== "all-in", "Action after terminal opponent action");
  if (previous && previous.action.street === o.action.street) requireThat(o.action.priorRaises! >= previous.action.priorRaises!, "Raise count regressed");
}

function validateModel(model: ActionLikelihoodModel, o: OfflineObservation, history: OfflineRangeHistory,
  options: OfflineConditioningOptions, legal: ComboRange): Map<string, number> {
  requireThat(nonempty(model.id) && nonempty(model.version) && nonempty(model.provenance.basis), "Missing model identity/provenance");
  strings(model.provenance.sourceRefs, "model source references", true);
  strings(model.assumptions, "model assumptions");
  strings(model.limitations, "model limitations", true);
  strings(model.validation.reviewRefs, "model review references");
  strings(options.supportedAssumptions, "supported assumptions");
  requireThat(model.assumptions.every(a => options.supportedAssumptions.includes(a)), "Unsupported model assumption");
  requireThat(options.purpose === "offline_analysis" || options.purpose === "mathematical_test", "Invalid offline purpose");
  if (model.validation.status === "synthetic_fixture") {
    requireThat(options.purpose === "mathematical_test", "Synthetic likelihoods are mathematical fixtures only");
    requireThat(model.validation.reviewRefs.length === 0, "Synthetic fixture cannot claim review");
  } else {
    requireThat(model.validation.status === "reviewed" && model.validation.reviewRefs.length > 0 &&
      model.validation.reviewRefs.every(ref => options.reviews.some(r => r.modelId === model.id &&
        r.version === model.version && r.reviewRef === ref && equal(r.modelArtifact, model))), "Likelihood model has no matching supplied review artifact");
  }
  requireThat(equal(model.scope, scopeOf(o)), "Likelihood model outside exact action/street/board/position/sizing/depth scope");
  requireThat(equal(model.conditionedOnEventIds, history.applied.map(r => r.observation.evidence.eventId)), "Likelihood history scope mismatch");
  const probabilities = new Map<string, number>();
  for (const row of model.likelihoods) {
    const key = comboKey(row.cards);
    requireThat(!probabilities.has(key), "Duplicate likelihood combination");
    requireThat(Number.isFinite(row.probability) && row.probability >= 0 && row.probability <= 1, "Invalid likelihood probability");
    probabilities.set(key, row.probability);
  }
  requireThat(legal.combos.every(c => probabilities.has(comboKey(c.cards))), "Missing likelihood coverage for legal prior support");
  return probabilities;
}

/** Log-space multiplication avoids underflow of positive prior*likelihood.
 * If a NORMALIZED positive term is itself unrepresentable, abstain instead of
 * silently deleting support. No epsilon cutoff and no uniform fallback. */
function posterior(legal: ComboRange, probabilities: Map<string, number>): ComboRange | null {
  const terms = legal.combos.map(c => ({ cards: c.cards, log: Math.log(c.weight) + Math.log(probabilities.get(comboKey(c.cards))!) }))
    .filter(t => t.log !== -Infinity);
  if (terms.length === 0) return null;
  const max = Math.max(...terms.map(t => t.log));
  const entries: ComboWeight[] = terms.map(t => ({ cards: t.cards, weight: Math.exp(t.log - max) }));
  requireThat(entries.every(e => e.weight > 0), "Posterior dynamic range exceeds numeric representation");
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  requireThat(entries.every(e => e.weight / total > 0), "Normalized posterior exceeds numeric representation");
  return normalizeComboRange(createComboRange(entries)).range;
}

/** Implements Phase 5A's updater interface. Snapshots model/options at creation.
 * No production model, strategy selector, source-proof or live adapter is added. */
export function createBoardRangeUpdater(model: ActionLikelihoodModel, options: OfflineConditioningOptions): BoardRangeUpdater {
  const suppliedModel = immutableCopy(model), suppliedOptions = immutableCopy(options);
  return input => condition(input, suppliedModel, suppliedOptions);
}

function condition(input: BoardRangeUpdateInput, model: ActionLikelihoodModel, options: OfflineConditioningOptions): BoardRangeUpdateResult {
  let legal: ComboRange;
  try {
    comboKey(input.heroCards);
    requireThat(["flop", "turn", "river"].includes(input.action.street) &&
      input.board.length === ({ flop: 3, turn: 4, river: 5 })[input.action.street], "Board/street mismatch");
    legal = removeKnownCards(input.prior.range, [...input.heroCards, ...input.board]);
    requireThat(legal.combos.length > 0, "No legal prior probability mass");
    if (input.prior.offlineHistory) {
      const anchor = input.prior.offlineHistory.anchor;
      validateAnchor(anchor);
      // Missing identity makes conditioning unsupported; an explicit conflicting
      // identity makes this prior unavailable for the requested hand/source.
      requireThat((!nonempty(input.evidence.handId) || anchor.handId === input.evidence.handId) &&
        (!nonempty(input.evidence.sourceId) || anchor.sourceId === input.evidence.sourceId) &&
        (!nonempty(input.evidence.opponentId) || anchor.opponentId === input.evidence.opponentId) &&
        comboKey(anchor.heroCards) === comboKey(input.heroCards), "Prior identity mismatch");
      requireThat(prefix(anchor.board, input.board), "Prior board mismatch");
      const last = input.prior.offlineHistory.applied.at(-1)?.observation;
      requireThat(!last || prefix(last.board, input.board), "Prior board mismatch");
    }
  } catch (error) { return unavailable(message(error)); }
  const unchanged = (reason: string): BoardRangeUpdateResult => immutableCopy({ status: "unchanged", reasons: [reason],
    state: { ...input.prior, range: legal, uncertainty: { ...input.prior.uncertainty, confidence: "unknown",
      limitations: [...input.prior.uncertainty.limitations, reason] } } });
  try {
    const history = input.prior.offlineHistory;
    requireThat(history, "Prior has no offline identity/order/expiry binding");
    requireThat(input.prior.uncertainty.alternatives.length === 0, "Unlabeled alternatives require separate scenario branches");
    validateObservation(input);
    requireThat(options.authoritativeObservation, "Authoritative offline observation unavailable");
    validateObservation(options.authoritativeObservation);
    const { prior: _prior, ...observation } = input;
    requireThat(equal(observation, options.authoritativeObservation), "Observation contradicts authoritative offline snapshot");
    requireThat(Number.isFinite(options.evaluatedAt) && options.evaluatedAt >= input.evidence.observedAt, "Invalid evaluation time");
    const eventIds = new Set<string>(), decisionIds = new Set<string>();
    let previous: OfflineObservation | null = null;
    for (const record of history.applied) {
      validateObservation(record.observation);
      validateBinding(record.observation, history.anchor, previous);
      const e = record.observation.evidence;
      requireThat(!eventIds.has(e.eventId!) && !decisionIds.has(e.decisionId!), "Contradictory prior observation ledger");
      requireThat(equal(record.model.scope, scopeOf(record.observation)) &&
        equal(record.model.conditionedOnEventIds, [...eventIds]), "Contradictory prior model ledger");
      requireThat(options.purpose === "mathematical_test" || record.model.validation.status !== "synthetic_fixture",
        "Synthetic-conditioned prior is a mathematical fixture only");
      eventIds.add(e.eventId!); decisionIds.add(e.decisionId!); previous = record.observation;
    }
    requireThat(options.evaluatedAt >= (previous?.evidence.observedAt ?? history.anchor.observedAt), "Evaluation time precedes prior evidence");
    const expiry = Math.min(history.anchor.originalExpiresAt, input.evidence.originalExpiresAt!,
      ...history.applied.map(r => r.observation.evidence.originalExpiresAt!));
    requireThat(options.evaluatedAt < expiry, "Original evidence expired; update cannot renew it");
    const repeat = history.applied.find(r => r.observation.evidence.eventId === input.evidence.eventId ||
      r.observation.evidence.decisionId === input.evidence.decisionId || r.observation.action.observation === input.action.observation);
    if (repeat) {
      if (equal(repeat.observation, observation)) return immutableCopy({ status: "unchanged",
        state: { ...input.prior, range: legal }, reasons: ["Observation already applied; replay from original prior to change model"] });
      return unchanged("Contradictory repeated event/decision/observation");
    }
    validateBinding(input, history.anchor, previous);
    const probabilities = validateModel(model, input, history, options, legal);
    let range: ComboRange | null;
    try { range = posterior(legal, probabilities); }
    catch (error) { return unavailable(message(error)); }
    if (!range) return unavailable("Zero posterior probability mass; no fallback");
    return immutableCopy({ status: "updated", reasons: ["Offline Bayes conditioning only; no live certification or strategy"], state: {
      ...input.prior, range,
      provenance: [...input.prior.provenance, ...input.evidence.provenance, { basis: model.provenance.basis,
        evidenceRefs: [...model.provenance.sourceRefs, ...model.validation.reviewRefs],
        // Review assertions remain in the ledger. They do not promote a source certificate.
        model: { id: model.id, version: model.version, validation: "unvalidated" } }],
      uncertainty: { ...input.prior.uncertainty,
        assumptions: [...input.prior.uncertainty.assumptions, ...model.assumptions],
        limitations: [...input.prior.uncertainty.limitations, ...model.limitations,
          "Scenario-conditional posterior; no calibration/confidence increase or live permission implied"] },
      offlineHistory: { anchor: history.anchor, applied: [...history.applied, { observation, model }] },
    } });
  } catch (error) { return unchanged(message(error)); }
}

function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function unavailable(reason: string): BoardRangeUpdateResult {
  return Object.freeze({ status: "unavailable", state: null, reasons: Object.freeze([reason]) });
}

export interface LikelihoodScenario { readonly label: string; readonly model: ActionLikelihoodModel }
/** Independent branches, not a mixture, ranking, confidence interval or default choice.
 * Continue each branch with its own returned state to preserve scenario history. */
export function conditionLikelihoodScenarios(input: BoardRangeUpdateInput, scenarios: readonly LikelihoodScenario[], options: OfflineConditioningOptions) {
  strings(scenarios.map(s => s.label), "unique scenario labels", true);
  return immutableCopy(scenarios.map(s => ({ label: s.label, modelId: s.model.id, modelVersion: s.model.version,
    result: createBoardRangeUpdater(s.model, options)(input) })));
}
