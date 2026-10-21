import type { ScopedProof } from "@poker-ai/ai-core";
import type { LiveStateAssessment } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import { currentFacingOpen } from "./firstUtgLive.js";

/** Dependent CALL assessment, not a new source validator. Only the existing
 * Phase 4A authority can supply facts. UI observations never grant permission.
 * No live CALL strategy or independently reviewed server CALL rule is installed. */
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
  let readiness: "unobserved" | "unusable" | "contradicted" | "observed_matching" = "unobserved";
  const reasons: string[] = [];
  if (!control) reasons.push("No CALL-control observation in this read.");
  else if (!Number.isSafeInteger(control.observedAt) || control.observedAt < source.receivedAt || control.observedAt > now ||
      now - control.observedAt >= 10_000) {
    readiness = "unusable"; reasons.push("CALL observation is stale, pre-activation or from a future clock; it cannot refresh source proof.");
  } else if (control.issues.length) {
    readiness = control.contradictions.length ? "contradicted" : "unusable"; reasons.push(...control.issues);
  } else if (control.visibleCount === 0) reasons.push("No visible CALL control; absence does not prove an action is illegal.");
  else if (control.amountChips !== gap) {
    readiness = "contradicted"; reasons.push("Observed CALL amount disagrees with the certified five-chip source gap.");
  } else if (control.enabled !== true) {
    readiness = "unusable"; reasons.push("CALL control is not enabled; readiness is unavailable.");
  } else {
    readiness = "observed_matching";
    reasons.push("One enabled native CALL label agrees with the source gap; UI readiness is not server authorization.");
  }
  return {
    version: 1 as const, scope: "hj_facing_utg_open5_call" as const,
    binding: { decisionEpoch: epoch, profile: source.openingSizeProfile, tableId: source.tableId,
      handId: source.handId, handNumber: source.handNumber, heroId: source.heroId, heroSeat: source.heroSeat,
      heroCards: [...source.heroCards], generation: source.generation, cursor: source.cursor,
      activationSequence: proof.activation.sequence, receivedAt: source.receivedAt, expiresAt: proof.expiresAt },
    facts: { units: "chips" as const, bigBlindChips: source.bigBlind, utgContributionChips: utg.contribution,
      heroContributionChips: hero.contribution, contributionGapChips: gap,
      remainingStackChips: remaining, capacitySufficient: true, payableIfCallAuthorizedChips: Math.min(gap, remaining),
      resultingContributionIfCalledChips: hero.contribution + gap, provenance },
    costProof,
    ui: { status: readiness, observation: control, reasons },
    serverLegality: { status: "unproven" as const, confidence: "low" as const,
      reasons: ["Recorded hand169 establishes UTG acceptance and HJ turn, not HJ CALL acceptance or a reviewed server CALL permission contract."] },
    legalActionsProof: { scope: "legalActions", status: readiness === "contradicted" ? "contradicted" : "insufficient",
      confidence: "low", provenance: [provenance], reasons: readiness === "contradicted" ? reasons :
        ["CALL server authorization and the full action set remain unproven; matching UI/cost/capacity alone cannot authorize advice."] } satisfies ScopedProof,
    authorized: false as const, historyComplete: false as const,
  };
}
