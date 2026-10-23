/** Offline-only bridge for scripts/phh_pilot.py; deliberately not exported by
 * index.ts or wired to opponent-db/live estimation. Source authenticity requires
 * rerunning the hash-checked direct replay, not trusting arbitrary JSON input.
 */
import { fullDeck, parseCard, type Card } from "@poker-ai/shared";
import { createComboRange } from "./comboRange.js";
import { benchmarkLikelihoodModels, type EvaluationDataset, type EvaluationRow } from "./likelihoodBenchmark.js";
import { createLikelihoodRegistry, demand, phase5BScope, stableKey, validateBenchmarkScope,
  type BenchmarkScope, type DevelopmentManifest, type LikelihoodModelRecord, type SampleIdentity } from "./likelihoodRegistry.js";

export const PHH_COMMIT = "e47fbd5816372360bade4de5d712346fe1bb70f6";
const sourceRoot = `https://github.com/uoftcprg/phh-dataset/blob/${PHH_COMMIT}/`;
const namespace = "phh-pluribus-2019-source-aliases";
const methodology = "POSTFLOP_PHASE5D.md";
export interface PhhObservation {
  handId: string; eventId: string; sessionId: string; playerIds: string[]; opponentId: string;
  actorPopulation: "human" | "bot"; sourceRef: string; sourcePath: string; handFingerprint: string;
  split: "development" | "evaluation"; observation: number; board: string[]; street: "flop" | "turn" | "river";
  position: NonNullable<BenchmarkScope["context"]["position"]>; facingPosition: BenchmarkScope["facingPosition"];
  priorRaises: number; facing: "bet" | "raise"; potBB: number; facingAmountBB: number; effectiveStackBB: number;
  callToBB: number; callIsAllIn: boolean; heroCards: string[]; holeCards: string[] | null; label: "fold" | "call";
  legalContext: { actorStack: number; actorBet: number; otherStack: number; otherBet: number; canRaise: false; activePlayers: 2 };
}
export interface PhhReplay {
  schemaVersion: 1; sourceCommit: string; parser: string; binaryObservations: number; rows: PhhObservation[];
}
const identity = (r: PhhObservation): SampleIdentity => ({ handId: r.handId, eventId: r.eventId,
  sessionId: r.sessionId, playerIds: r.playerIds });
const pair = (cards: readonly string[]): [Card, Card] => {
  demand(cards.length === 2, "Missing observed card pair");
  return [parseCard(cards[0]!), parseCard(cards[1]!)];
};

function scope(r: PhhObservation): BenchmarkScope {
  const result: BenchmarkScope = {
    profile: { variant: "holdem", betting: "no_limit", format: "cash", seatsDealtIn: 6, anteBB: 0, straddle: false, objective: "chip_ev" },
    board: r.board.map(parseCard), street: r.street, priorRaises: r.priorRaises, facing: r.facing, facingPosition: r.facingPosition,
    context: { position: r.position, potBB: r.potBB, facingAmountBB: r.facingAmountBB,
      effectiveStackBB: r.effectiveStackBB, opponentsRemaining: 1 },
    actionCoverage: "exhaustive_discrete", actionCoverageRef: `${r.sourceRef}#action-${r.observation}-direct-replay`,
    outcomes: [{ id: "fold", action: "fold", wagerAction: null, actionToBB: 0 },
      { id: "call", action: r.callIsAllIn ? "all-in" : "call", wagerAction: r.callIsAllIn ? "call" : null, actionToBB: r.callToBB }],
    // This deliberately memoryless diagnostic baseline does not condition on
    // prior actions. Those actions WERE replayed to establish the exact context.
    conditionedOnEventIds: [],
  };
  validateBenchmarkScope(result);
  return result;
}

function support(board: readonly Card[]) {
  const deck = fullDeck().filter(c => !board.some(b => stableKey(c) === stableKey(b)));
  return createComboRange(deck.flatMap((a, i) => deck.slice(i + 1).map(b => ({ cards: [a, b] as [Card, Card], weight: 1 }))));
}

/** Fit only an empirical pooled FREQUENCY BASELINE. Its two training decisions
 * do not establish combination-specific likelihoods, a population model, GTO,
 * PokerNow transfer, or any strategy. Evaluation labels never enter fitting.
 */
export function preparePhhPilot(replay: PhhReplay) {
  demand(replay.schemaVersion === 1 && replay.sourceCommit === PHH_COMMIT &&
    replay.parser === "PokerKit 0.7.7 direct parse_action", "Unpinned replay artifact");
  demand(replay.rows.length === replay.binaryObservations && replay.rows.length <= 600, "Replay count/bound mismatch");
  const hands = new Set<string>(), fingerprints = new Set<string>();
  for (const r of replay.rows) {
    const path = /^data\/pluribus\/(10[0-5])\/(\d+)\.phh$/.exec(r.sourcePath);
    demand(path && r.sourceRef === sourceRoot + r.sourcePath && r.handId === `phh-pluribus:${path[1]}:${path[2]}` &&
      r.eventId === `${r.handId}:action:${r.observation}`, "Source/hand/event identity mismatch");
    demand(r.split === (Number(path[1]) <= 102 ? "development" : "evaluation"), "Fixed source-block split changed");
    demand(r.sessionId === "phh-pluribus:2019-study", "Unauthenticated session subdivision");
    demand(!hands.has(r.handId) && !fingerprints.has(r.handFingerprint) && /^[a-f0-9]{64}$/.test(r.handFingerprint),
      "Duplicate hand/deal across development/evaluation");
    hands.add(r.handId); fingerprints.add(r.handFingerprint);
    demand(["fold", "call"].includes(r.label) && ["human", "bot"].includes(r.actorPopulation), "Unknown label/population");
    demand(Number.isSafeInteger(r.observation) && r.observation > 6 && r.observation <= 200, "Invalid action ordinal");
    const c = r.legalContext;
    demand([c.actorStack, c.actorBet, c.otherStack, c.otherBet].every(n => Number.isSafeInteger(n) && n >= 0) &&
      c.actorStack > 0 && c.otherBet > c.actorBet && c.activePlayers === 2 && c.canRaise === false &&
      r.facingAmountBB === Math.min(c.actorStack, c.otherBet - c.actorBet) / 100 &&
      r.callToBB === (c.actorBet + Math.min(c.actorStack, c.otherBet - c.actorBet)) / 100 &&
      r.effectiveStackBB === Math.min(c.actorStack, c.otherStack + c.otherBet - c.actorBet) / 100 &&
      r.callIsAllIn === (c.otherBet - c.actorBet >= c.actorStack) &&
      (c.otherStack === 0 || r.callIsAllIn), "Contradictory binary legal context");
    scope(r);
  }
  const ordered = [...replay.rows].sort((a, b) => a.eventId.localeCompare(b.eventId));
  const development = ordered.filter(r => r.split === "development");
  const heldOut = ordered.filter(r => r.split === "evaluation");
  demand(development.length > 0 && heldOut.length > 0, "Insufficient disjoint development/evaluation observations");
  const foldCount = development.filter(r => r.label === "fold").length;
  const foldProbability = foldCount / development.length; // No invented smoothing or clipping.
  const manifest: DevelopmentManifest = { identityNamespace: namespace, coverage: "complete", fitting: "data",
    sourceRefs: [...development.map(r => r.sourceRef), methodology], observations: development.map(identity) };
  const unfitted: DevelopmentManifest = { identityNamespace: namespace, coverage: "complete", fitting: "none",
    sourceRefs: [methodology + "#uniform-prior"], observations: [] };
  const source = { kind: "real_observations" as const, provider: "uoftcprg/phh-dataset, converted Brown/Sandholm 2019 matches",
    sourceRefs: manifest.sourceRefs, createdOn: "2026-10-23" };
  const assumptions = ["Pooled empirical fold/call frequency is constant across cards and contexts for this diagnostic baseline only",
    "Human and bot development observations are pooled; no claim that their policies are interchangeable"];
  const limitations = ["Tiny, selected source blocks and terminal river responses; no calibrated model or strategic interpretation",
    "Source aliases are not independently authenticated people; only hand holdout is claimed",
    "No tournament, PokerNow, GTO, rake-sensitive EV, live freshness or recommendation claim"];
  const rows: EvaluationRow[] = heldOut.map(r => {
    const s = scope(r);
    return { identity: identity(r), scopeId: r.eventId, scope: s, heroCards: pair(r.heroCards),
      observation: r.observation, contextThroughObservation: r.observation - 1, history: [], actionLabel: r.label,
      evidence: { handId: r.handId, eventId: r.eventId, decisionId: r.eventId, opponentId: r.opponentId,
        sourceId: `phh:${PHH_COMMIT}`, observedAt: r.observation, originalExpiresAt: 201, historyCoverage: "complete",
        provenance: [{ basis: "Hash-checked complete direct PHH replay; times are archive ordinal coordinates, NOT wall-clock timestamps or live deadlines",
          evidenceRefs: [r.sourceRef, methodology], model: null }] },
      holeCards: r.holeCards === null ? { status: "unknown" } : { status: "revealed", cards: pair(r.holeCards),
        mechanism: "independent_reveal", sourceRefs: [r.sourceRef, methodology + "#visibility"] },
      prior: { range: support(s.board), throughObservation: r.observation - 1, conditionedOnEventIds: [],
        sourceRefs: unfitted.sourceRefs, development: unfitted } };
  });
  const dataset: EvaluationDataset = { schemaVersion: 1, id: "phh-bounded-pilot", version: "1",
    source: { ...source, sourceRefs: [...heldOut.map(r => r.sourceRef), methodology] }, identityNamespace: namespace,
    declaredSamples: rows.length, population: "Selected Pluribus research matches: elite human aliases and one bot; 100 BB reset cash/chip-EV, no antes",
    selection: "convenience", selectionNotes: [...limitations,
      "One disclosed expansion from blocks 100–101 to fixed blocks 100–105 after insufficient binary opportunities; no further search",
      "Only heads-up no-raise fold/call opportunities; whole-hand accounting must pass; no reveal-based inclusion",
      "Uniform legal-combination prior is an unfitted diagnostic assumption ignoring prior betting, not a measured range"],
    splitProvenanceRefs: [methodology + "#holdout"], rows };
  const model: LikelihoodModelRecord = { schemaVersion: 1, id: "phh-pooled-frequency-baseline", version: "1",
    author: "poker-ai offline Phase 5D pilot", source, validation: "unvalidated", reviewRefs: [], assumptions, limitations,
    development: manifest, cases: rows.map(r => ({ scopeId: r.scopeId, scope: r.scope,
      actions: r.scope.outcomes.map(o => ({ outcomeId: o.id, likelihood: { id: "phh-pooled-frequency-baseline", version: "1",
        validation: { status: "unreviewed", reviewRefs: [] }, provenance: { basis: "Development-only raw fold count / binary-response count", sourceRefs: source.sourceRefs },
        assumptions, limitations, scope: phase5BScope(r.scope, o), conditionedOnEventIds: [],
        likelihoods: support(r.scope.board).combos.map(c => ({ cards: c.cards, probability: o.id === "fold" ? foldProbability : 1 - foldProbability })) } })) })) };
  return { dataset, registry: createLikelihoodRegistry([model], [], assumptions),
    fitting: { developmentObservations: development.length, foldCount, callCount: development.length - foldCount, foldProbability },
    populations: ["human", "bot"].map(population => ({ population,
      development: development.filter(r => r.actorPopulation === population).length,
      evaluation: heldOut.filter(r => r.actorPopulation === population).length,
      evaluationEventIds: heldOut.filter(r => r.actorPopulation === population).map(r => r.eventId) })) };
}

export interface PhhPilotReport {
  fitting: ReturnType<typeof preparePhhPilot>["fitting"];
  populations: ReturnType<typeof preparePhhPilot>["populations"];
  actionMarginal: ReturnType<typeof benchmarkLikelihoodModels>;
  revealedCombo: ReturnType<typeof benchmarkLikelihoodModels>;
  populationReports: { population: string; report: ReturnType<typeof benchmarkLikelihoodModels> }[];
}

export function evaluatePhhPilot(replay: PhhReplay): PhhPilotReport {
  const { dataset, registry, fitting, populations } = preparePhhPilot(replay);
  const options = { purpose: "empirical_evaluation" as const, holdout: "hand" as const,
    calibrationBinEdges: [0, 0.25, 0.5, 0.75, 1], baseline: registry.records[0]! };
  const evaluate = (labelMode: "action_marginal" | "revealed_combo", d = dataset) =>
    benchmarkLikelihoodModels(d, registry, { ...options, baseline: { id: options.baseline.id, version: options.baseline.version }, labelMode });
  return { fitting, populations, actionMarginal: evaluate("action_marginal"), revealedCombo: evaluate("revealed_combo"),
    populationReports: populations.map(p => ({ population: p.population, report: evaluate("action_marginal",
      { ...dataset, id: dataset.id + ":" + p.population, population: dataset.population + "; actor stratum: " + p.population,
        declaredSamples: p.evaluation, rows: dataset.rows.filter(r => p.evaluationEventIds.includes(r.identity.eventId)) }) })) };
}
