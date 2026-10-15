import { assessDecisionProofs, assessPacketDecisionProofs, decisionProofBinding, PROOF_SCOPES,
  unopenedChartAction, type DecisionPacket, type PreflopContext, type ScopedProof, type ProofScope, type DecisionProofs } from "@poker-ai/ai-core";
import type { LiveStateAssessment } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import { inspectLiveUnopenedEvidence } from "./unopenedEvidence.js";
import { currentFirstUtg } from "./firstUtgLive.js";

/** Translate existing evidence only; socket chronology and observed log rows are never certified as a complete window. */
export function buildLiveDecisionProofs(read: LiveTableRead, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null, preflop: PreflopContext | null, epoch: string, packet: DecisionPacket | null = null) {
  const proofs: ScopedProof[] = PROOF_SCOPES.map(scope => ({ scope, status: "insufficient", confidence: "low",
    provenance: [], reasons: [`${scope}: independent evidence is unavailable for this decision.`] }));
  const set = (scope: ProofScope, status: ScopedProof["status"], source: string, reasons: string[] = []) => {
    proofs[PROOF_SCOPES.indexOf(scope)] = { scope, status, confidence: status === "proven" ? "high" : "low", provenance: [source], reasons };
  };
  const state = assessment.state;
  const seats = state?.seats.filter(s => s.isOccupied) ?? [];
  const active = seats.filter(s => !s.isFolded);
  const hero = active.find(s => s.isYou);
  const settling = seats.some(s => s.isSettling);
  const allIn = seats.some(s => s.isAllIn);
  const cards = [...(state?.board ?? []), ...(hero?.holeCards ?? [])];
  const duplicates = new Set(cards.map(c => `${c.rank}${c.suit}`)).size !== cards.length;
  const ambiguousActors = seats.filter(s => s.isYou).length > 1 || seats.filter(s => s.isCurrentToAct).length > 1;
  const stateReasons = [...read.context.readErrors, ...(!state ? ["Table cannot be parsed."] : []),
    ...(!hero?.isCurrentToAct ? ["Waiting for an active hero turn."] : []),
    ...(hero?.holeCards.length !== 2 ? ["Hero cards are incomplete."] : []),
    ...(active.some(s => s.isOffline) ? ["An active seat is offline; participation is uncertain."] : []),
    ...(settling ? ["Settlement display: wait for stable ordinary stacks; prize is not spendable stack."] : []),
    ...(duplicates || ambiguousActors ? ["Contradictory visible cards or decision actors."] : [])];
  set("decisionState", settling || duplicates || ambiguousActors ? "contradicted" : stateReasons.length ? "insufficient" : "proven", "Current synchronous DOM read", stateReasons);
  const stacksKnown = !!hero && active.length >= 2 && active.every(s => s.stack !== null && Number.isFinite(s.stack) && s.stack > 0 && !s.isAllIn && !s.isSettling);
  set("stack", settling ? "contradicted" : stacksKnown ? "proven" : "insufficient", "Current ordinary numeric stack nodes",
    stacksKnown && !settling ? [] : ["Usable numeric remaining stacks/capacity are missing, all-in or settling."]);
  const blindsKnown = assessment.smallBlind !== null && assessment.bigBlind !== null && assessment.smallBlind > 0 && assessment.smallBlind <= assessment.bigBlind;
  set("blinds", blindsKnown ? "proven" : "insufficient", "Explicit parsed PokerNow blind nodes", blindsKnown ? [] : ["Blinds are missing or inconsistent; no fallback BB."]);
  const gap = assessment.verification.monetary.callGap;
  set("callCost", gap.status === "proven" && hero?.stack != null && gap.value !== null && gap.value <= hero.stack ? "proven" : "insufficient", gap.source,
    gap.status === "proven" && hero?.stack != null && gap.value !== null && gap.value <= hero.stack ? [] : [...gap.reasons, "Exact payable call cost is not proven within remaining capacity."]);
  const pot = assessment.pot;
  const reconciled = assessment.verification.monetary.potDisplay;
  set("pot", reconciled.matches === false ? "contradicted" : pot.isPotSemanticsVerified && pot.decisionPot !== null && pot.decisionPotSource ? "proven" : "insufficient",
    pot.decisionPotSource ?? "Existing contestable-pot proof",
    reconciled.matches === false ? ["Pot displays contradict collected pot plus current contributions."] : pot.isPotSemanticsVerified && pot.decisionPot !== null && pot.decisionPotSource ? [] : ["Reconciled display arithmetic does not prove hero contestability, returns or rake/drop."]);
  set("position", "insufficient", "Existing dealer/ascending-seat position map", ["Position labels are derived; clockwise/dealt-in roster evidence is not independently certified for this decision."]);
  set("roster", "insufficient", "Occupied DOM seats", ["Occupied/non-folded does not prove the dealt-in roster; away/sit-out remains unresolved."]);
  set("eligibility", "insufficient", "Current seats and existing pot proof", [allIn ? "All-in/side-pot eligibility remains outside the supported simple-pot subset." : "Eligibility of all remaining players and absence of hidden side pots are unproven."]);
  if (timeline?.current.seatMapping.status === "invalid") set("eligibility", "contradicted",
    timeline.current.seatMapping.source, timeline.current.seatMapping.reasons);
  const returns = timeline?.current.events.filter(e => e.action === "uncalled_return") ?? [];
  set("accounting", "insufficient", "Existing return/award accounting; unchanged", [returns.length
    ? `Observed uncalled return(s) ${returns.map(e => e.id).join(", ")}; their net effect on this decision pot is not independently resolved.`
    : "No decision-local evidence excludes/resolves returns and rake/drop; no return row is not proof of absence."]);
  const source = timeline?.sourceStatus;
  const chain = source?.sourceMetadata.socketContinuity;
  const connectionGap = source?.identity?.chainGap || chain?.chainGap || timeline?.current.coverage.issues.some(i => i.code === "metadata_gap" || i.code === "identity_conflict");
  set("connection", connectionGap ? "contradicted" : source?.connected && source.identity && chain?.status === "observed_continuous" ? "proven" : "insufficient",
    "Current source identity + connection-generation continuity (not log completeness)", connectionGap
      ? ["Unresolved connection/metadata gap may affect the decision window; a later linked segment does not prove recovery."]
      : source?.connected && source.identity && chain?.status === "observed_continuous" ? [] : ["Waiting for a source identity and observed continuous connection segment; reconnect resets evidence."]);
  const betting = assessment.verification.betting;
  const windowProven = betting.lastFullRaiseAmount.status === "proven";
  set("actionWindow", windowProven ? "proven" : "insufficient", betting.lastFullRaiseAmount.source,
    windowProven ? [] : ["No independently complete ordered current-street action window. Polling, log timestamps and cursor links cannot supply it."]);
  set("reopening", betting.actionReopened.status === "proven" ? "proven" : "insufficient", betting.actionReopened.source, betting.actionReopened.reasons);
  set("raiseLegality", "insufficient", "Existing bounds and current raise form", ["Selected raise-to/submit visibility is not a minimum or reopened-action certificate; exact chip unit and legal sizing remain required."]);
  set("legalActions", "insufficient", "Existing action-control reader", ["The captured Raise submit proves its own visibility/enabled state only; exact current CHECK/CALL/BET action set is not certified."]);
  set("rangeInput", "insufficient", "Existing range estimator", ["Live snapshot-inferred range inputs are partial; independently supported range/uncertainty inputs are unavailable."]);
  set("equity", "insufficient", "Existing equity engine", ["A valid range-based point estimate plus independently supplied sensitivity bounds is required."]);
  set("terminal", "insufficient", "Existing terminal postflop policy", [state?.street === "river"
    ? "A complete decision-local window must establish that call/check ends betting."
    : "Future betting/equity realization is not modeled; raw flop/turn equity is not realized action EV."]);
  const unopened = state?.street === "preflop" ? inspectLiveUnopenedEvidence(read, assessment, timeline) : null;
  if (unopened) {
    for (const p of unopened.proofs) proofs[PROOF_SCOPES.indexOf(p.scope)] = p;
    set("raiseLegality", "insufficient", "Current raise control; no independent sizing contract", [unopened.raiseControl.reason]);
    const deepEnough = stacksKnown && assessment.bigBlind !== null && active.every(s => s.currentBet !== null &&
      s.stack! + s.currentBet >= 100 * assessment.bigBlind!);
    set("stack", settling ? "contradicted" : deepEnough ? "proven" : "insufficient", "Numeric remaining stacks + explicit current street contributions; 100BB+ RFI scope",
      deepEnough && !settling ? [] : ["Hero and every active opponent must have proven 100BB+ hand-start effective capacity."]);
    const first = currentFirstUtg(read, assessment, timeline);
    if (first) {
      const continuity = source!.firstUtgProof!.continuity;
      set("connection", "proven", `Validated first-UTG source prefix: generation ${continuity.generation}, registration ${continuity.baselineSequence} through ${continuity.throughSequence}, cursor ${continuity.cursor}. ${first.provenance} Not whole-hand/log coverage.`);
      set("stack", "proven", `${first.provenance} Numeric remaining DOM stacks independently >=100BB for all six players.`);
      set("callCost", "proven", `${first.provenance} Normal SB=1/BB=2 source totals; UTG contribution zero at first turn. Call gap=2 chips.`);
    }
  }
  const envelope: DecisionProofs = { version: 1, decisionEpoch: epoch,
    binding: "diagnostic-only: no packet",
    handId: source?.identity ? timeline!.current.handId : null, connectionGeneration: source?.firstUtgProof?.continuity.generation ?? chain?.generation ?? null, proofs };
  if (packet) envelope.binding = decisionProofBinding({ ...packet, decisionProofs: envelope }, epoch);
  // Inspect chart membership before packet construction so an out-of-chart FOLD
  // is not accidentally held behind an irrelevant Raise-panel prerequisite.
  const chartAction = packet ? unopenedChartAction(packet) : state?.street === "preflop" && hero?.holeCards.length === 2 && preflop
    ? unopenedChartAction({ table: { street: "preflop" }, hero: { holeCards: hero.holeCards as DecisionPacket["hero"]["holeCards"] }, preflop }) : null;
  const activation = packet ? assessPacketDecisionProofs({ ...packet, decisionProofs: envelope }, true)!
    : assessDecisionProofs({ street: state?.street ?? null, opponents: assessment.activeOpponents, amountToCall: assessment.amountToCall,
      preflopSituation: preflop?.situation ?? null, preflopRfiCandidate: unopened?.candidate ?? false,
      preflopAction: chartAction, aggressionPossible: assessment.legality.aggressionReopened }, proofs);
  return { evidence: envelope, activation, unopened };
}

/** Proof refreshes must invalidate pending recommendations even if DOM values did not change. */
export function liveProofRevision(timeline: LiveTimelineDiagnostic): string {
  const s = timeline.sourceStatus;
  return JSON.stringify({ connected: s.connected, identity: s.identity, handId: timeline.current.handId,
    firstUtg: s.firstUtgProof ?? null,
    generation: s.sourceMetadata.socketContinuity.generation, continuity: s.sourceMetadata.socketContinuity.status,
    gap: s.sourceMetadata.socketContinuity.chainGap, lastCursor: s.sourceMetadata.socket.at(-1)?.metadata.frame,
    events: timeline.current.events.map(e => [e.id, e.order, e.actor?.seat]), coverage: timeline.current.coverage.status,
    rejected: timeline.current.coverage.rejectedBatchCount, mapping: timeline.current.seatMapping });
}

export function activationLabel(state: "proof_ready" | "waiting_for_proof" | "unsupported" | "unsafe"): string {
  return { proof_ready: "Inputs proven; evaluating supported policy", waiting_for_proof: "Waiting for decision proof",
    unsupported: "Unsupported situation", unsafe: "Contradictory / unsafe state" }[state];
}
