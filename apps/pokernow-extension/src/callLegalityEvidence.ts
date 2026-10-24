import type { ScopedProof } from "@poker-ai/ai-core";
import type { LiveStateAssessment } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import { currentFacingOpen } from "./firstUtgLive.js";
import { HJ_CALL_RULE as CALL_RULE, matchesHjCallContract } from "./bettingWindow.js";
import { assessCallControlReadiness } from "./callControlRead.js";

/** Empirical coverage is deliberately no wider than hand238's starting stack
 * vector. This is not a general sufficient-stack rule or a strategy reference. */
const CALL_PROVENANCE = "Empirical hand238 paired evidence: frame13 UTG total0->5; frame14 HJ actor/total0; " +
  "screenshot CALL5 and HJ 7h/Kd/253; frame15 HJ total0->5 with opposing highest unchanged at5; frame16 CO actor. " +
  "Matching the highest contribution is CALL, not RAISE; cRPI is not an action classifier. " +
  "Only the observed starting stack vector is covered. Historical acceptance at activation+14806ms cannot renew a live proof.";

/** Dependent CALL assessment, not a new source validator. Only the existing
 * Phase 4A authority supplies current identity/continuity. A matching control
 * corroborates readiness; the reviewed empirical contract supplies permission.
 * No live CALL strategy is installed. */
export function callLegalityEvidence(read: LiveTableRead, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null, epoch: string) {
  const source = currentFacingOpen(read, assessment, timeline);
  const proof = timeline?.sourceStatus.facingOpenProof;
  const now = Date.now();
  if (!source || !proof || !epoch || source.openingSizeProfile !== "pokernow-0.1.72-th-4fun-1-2-exact5-v1" ||
      proof.expiresAt !== source.receivedAt + 10_000 || now < source.receivedAt || now >= proof.expiresAt) return null;
  const hero = source.players.find(p => p.playerId === source.heroId)!;
  const utg = source.players.find(p => p.position === "UTG")!;
  const remaining = assessment.state!.seats.find(s => s.isYou)!.stack!;
  // Use certified totals, not DOM absence or the selected Raise amount.
  const gap = Math.max(...source.players.filter(p => p.playerId !== source.heroId).map(p => p.contribution)) - hero.contribution;
  if (hero.position !== "HJ" || hero.contribution !== 0 || utg.contribution !== 5 || gap !== 5 ||
      !Number.isFinite(remaining) || remaining < gap) return null;
  const provenance = `Phase 4A ${proof.scope}; accepted UTG total ${utg.contribution}, HJ total ${hero.contribution}; ` +
    `original six-player source/DOM cross-check, numeric HJ remaining ${remaining}. No server CALL authorization inferred.`;
  const costProof: ScopedProof = { scope: "callCost", status: "proven", confidence: "high",
    provenance: [provenance], reasons: [] };
  const control = read.callControl ?? null;
  const { status: readiness, reasons } = assessCallControlReadiness(control, gap, source.receivedAt, now,
    "Observed CALL amount disagrees with the certified five-chip source gap.");
  const binding = { decisionEpoch: epoch, profile: source.openingSizeProfile, tableId: source.tableId,
      handId: source.handId, handNumber: source.handNumber, heroId: source.heroId, heroSeat: source.heroSeat,
      heroCards: [...source.heroCards], generation: source.generation, cursor: source.cursor,
      activationSequence: proof.activation.sequence, receivedAt: source.receivedAt, expiresAt: proof.expiresAt };
  const covered = matchesHjCallContract(source);
  // CALL-only evidence must never stand in for the complete legal action set.
  // It is freshly derived, not accepted from a packet, control or external input.
  const permission = covered && readiness === "observed_matching" ? {
    version: 1 as const, rule: CALL_RULE, action: "CALL" as const, status: "proven" as const,
    confidence: "high" as const, authority: "scoped_empirical_acceptance" as const,
    binding, decisionWindow: proof.scope, street: "preflop" as const,
    actor: structuredClone(proof.actor), units: "chips" as const, callCostChips: 5 as const,
    priorContributionChips: 0 as const, resultingContributionChips: 5 as const,
    remainingStackChips: remaining, remainingStackAfterCallChips: remaining - gap,
    players: structuredClone(source.players), continuity: structuredClone(proof.continuity),
    control: structuredClone(control!), provenance: CALL_PROVENANCE,
    fullActionSetCertified: false as const, recommendationAuthorized: false as const,
  } : null;
  return {
    version: 1 as const, scope: "hj_facing_utg_open5_call" as const,
    binding,
    facts: { units: "chips" as const, bigBlindChips: source.bigBlind, utgContributionChips: utg.contribution,
      heroContributionChips: hero.contribution, contributionGapChips: gap,
      remainingStackChips: remaining, capacitySufficient: true, payableIfCallAuthorizedChips: Math.min(gap, remaining),
      resultingContributionIfCalledChips: hero.contribution + gap, provenance },
    costProof,
    ui: { status: readiness, observation: control, reasons },
    serverLegality: covered
      ? { status: "proven" as const, confidence: "high" as const, rule: CALL_RULE,
          authority: "scoped_empirical_acceptance" as const, provenance: CALL_PROVENANCE, reasons: [] }
      : { status: "unproven" as const, confidence: "low" as const, rule: null,
          authority: null, provenance: CALL_PROVENANCE,
          reasons: ["Starting stacks are outside the exact hand238 empirical CALL contract; sufficient capacity alone does not extend coverage."] },
    permission,
    legalActionsProof: { scope: "legalActions", status: readiness === "contradicted" ? "contradicted" : "insufficient",
      confidence: "low", provenance: [provenance], reasons: readiness === "contradicted" ? reasons :
        [permission ? "Scoped CALL legality is certified; the full action set and response strategy remain unproven."
          : "No ready scoped CALL permission; the full action set remains unproven. Matching UI/cost/capacity alone cannot authorize advice."] } satisfies ScopedProof,
    authorized: false as const, historyComplete: false as const,
  };
}
