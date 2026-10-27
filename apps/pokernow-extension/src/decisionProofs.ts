import { assessDecisionProofs, assessPacketDecisionProofs, decisionProofBinding, PROOF_SCOPES, RIVER_PAIRWISE_WARNING, TURN_CHECKDOWN_WARNING, FLOP_CHECKDOWN_WARNING,
  unopenedChartAction, inspectLiveHjResponseStrategy, isReviewedHjFold, type DecisionPacket, type PreflopContext, type ScopedProof, type ProofScope, type DecisionProofs } from "@poker-ai/ai-core";
import type { LiveStateAssessment } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import { inspectLiveUnopenedEvidence } from "./unopenedEvidence.js";
import { currentFirstUtg, currentHj, currentCo, currentBtn, currentSb, currentFacingOpen, currentCoFacingOpen } from "./firstUtgLive.js";
import { openingSizeEvidence } from "./openingSizeEvidence.js";
import { callLegalityEvidence } from "./callLegalityEvidence.js";
import { flopCallEvidence } from "./flopCallEvidence.js";
import { assessCallControlReadiness } from "./callControlRead.js";
import { riverIllustration } from "./riverIllustration.js";

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
    const hj = currentHj(read, assessment, timeline);
    const co = currentCo(read, assessment, timeline);
    const btn = currentBtn(read, assessment, timeline);
    const sb = currentSb(read, assessment, timeline);
    const first = currentFirstUtg(read, assessment, timeline) ?? hj ?? co ?? btn ?? sb;
    if (first) {
      const continuity = (sb ? source!.sbProof! : btn ? source!.btnProof! : co ? source!.coProof! : hj ? source!.hjProof! : source!.firstUtgProof!).continuity;
      set("connection", "proven", `Validated ${sb ? "SB" : btn ? "BTN" : co ? "CO" : hj ? "HJ" : "first-UTG"} source prefix: generation ${continuity.generation}, registration ${continuity.baselineSequence} through ${continuity.throughSequence}, cursor ${continuity.cursor}. ${first.provenance} Not whole-hand/log coverage.`);
      set("stack", "proven", `${first.provenance} Numeric remaining DOM stacks independently >=100BB for all six players.`);
      set("callCost", "proven", `${first.provenance} Normal SB=1/BB=2 source totals; hero contribution ${sb ? 1 : 0}, no intervening wagers. Call gap=${sb ? 1 : 2} chips.`);
    }
  }
  const opening = openingSizeEvidence(read, assessment, timeline, epoch);
  // Both pre-packet activation and engine sizing consume this same result.
  // FOLD does not require or consume this scope.
  if (unopened?.firstUtgBoundary || unopened?.hjWindow || unopened?.coWindow || unopened?.btnWindow || unopened?.sbWindow) proofs[PROOF_SCOPES.indexOf("raiseLegality")] = opening.proof;
  if (packet?.preflopExecution?.exactOpeningSize &&
      JSON.stringify(packet.preflopExecution.exactOpeningSize) !== JSON.stringify(opening.size)) {
    set("raiseLegality", "contradicted", "Dependent sizing/packet cross-check", ["Sizing belongs to a different source, control or epoch."]);
  }
  const facing = currentFacingOpen(read, assessment, timeline);
  const coFacing = currentCoFacingOpen(read, assessment, timeline);
  const callLegality = callLegalityEvidence(read, assessment, timeline, epoch);
  // Diagnostics consume the existing authority and its ORIGINAL expiry. No
  // reference, selected control or classifier result can mint/renew a proof.
  const responseStrategy = facing ? {
    ...inspectLiveHjResponseStrategy({ preflop, holeCards: hero?.holeCards }),
    binding: { decisionEpoch: epoch, tableId: facing.tableId, handId: facing.handId,
      heroId: facing.heroId, generation: facing.generation, cursor: facing.cursor,
      receivedAt: facing.receivedAt, expiresAt: source!.facingOpenProof!.expiresAt },
    call: { contributionGapChips: callLegality?.facts.contributionGapChips ?? null,
      payableIfCallAuthorizedChips: callLegality?.facts.payableIfCallAuthorizedChips ?? null,
      authorization: callLegality?.permission ? "proven" as const : "unproven" as const,
      reason: "See dependent callLegality: scoped empirical permission, current control readiness and strategy authorization are separate." },
    threeBet: { stackCapacityChips: hero!.stack!, fullMinimumRaiseToChips: null,
      permittedMaximumRaiseToChips: null, chipUnit: null, raiseRights: "unproven" as const,
      reason: "Observed UTG acceptance and mR=8 do not authorize a future HJ 3-bet or establish its size/grid." },
    // Requirements still missing in THIS valid context; not another proof gate.
    remainingRequirements: {
      FOLD: ["reviewed_response_strategy"],
      CALL: ["reviewed_response_strategy", ...(callLegality?.permission ? [] : ["current_call_authorization"])],
      THREE_BET: ["reviewed_response_strategy_and_size", "raise_rights", "minimum_and_maximum_totals", "chip_grid"],
    },
  } : null;
  const responseFold = responseStrategy !== null && isReviewedHjFold(responseStrategy);
  if (responseFold) responseStrategy.remainingRequirements.FOLD = [];
  // Source-proven zeros permit the existing main + street-total display
  // cross-check. This detects conflict only; it never certifies a decision pot.
  if (responseFold && facing && pot.mainPot !== null && pot.displayedTotalPot !== null &&
      pot.displayedTotalPot !== pot.mainPot + facing.players.reduce((sum, p) => sum + p.contribution, 0))
    set("pot", "contradicted", "Current pot displays + source-proven street totals",
      ["Pot displays contradict collected pot plus the certified response contributions."]);
  const responseExecution: NonNullable<DecisionPacket["preflopExecution"]>["hjResponseWindow"] = facing ? {
    profile: "pokernow-0.1.72-th-4fun-1-2-exact5-v1", tableId: facing.tableId, handId: facing.handId,
    heroId: facing.heroId, heroSeat: facing.heroSeat, heroCards: [...facing.heroCards].sort(),
    generation: facing.generation, sourceCursor: facing.cursor, decisionEpoch: epoch,
    receivedAt: facing.receivedAt, expiresAt: source!.facingOpenProof!.expiresAt,
  } : undefined;
  if (packet?.preflopExecution?.hjResponseWindow &&
      JSON.stringify(packet.preflopExecution.hjResponseWindow) !== JSON.stringify(responseExecution))
    set("decisionState", "contradicted", "Facing-open source/packet cross-check", ["Response window belongs to a different source, actor, cards, or epoch."]);
  const response = facing ?? coFacing;
  const responseWindow = facing ? source!.facingOpenProof! : coFacing ? source!.coFacingOpenProof! : null;
  if (response && responseWindow) {
    const continuity = responseWindow.continuity;
    set("connection", "proven", `Same source authority: generation ${continuity.generation}, baseline ${continuity.baselineSequence}, through ${continuity.throughSequence}, cursor ${continuity.cursor}.`);
    set("actionWindow", "proven", response.provenance);
    set("position", "proven", `${response.provenance} Frozen ${coFacing ? "CO" : "HJ"} seat ${response.heroSeat}.`);
    set("roster", "proven", `${response.provenance} Original six dealt-in IDs; no departures/folds.`);
    set("stack", "proven", "Source starting capacities + current numeric DOM stacks; accepted voluntary wagers deducted from the actors' starting capacities.");
    if (coFacing) set("callCost", "proven", `${coFacing.provenance} Highest total5 minus CO total0 is five chips, covered by numeric CO capacity; no CO CALL permission.`);
    if (callLegality) {
      proofs[PROOF_SCOPES.indexOf("callCost")] = callLegality.costProof;
      proofs[PROOF_SCOPES.indexOf("legalActions")] = callLegality.legalActionsProof;
    }
  }
  const envelope: DecisionProofs = { version: 1, decisionEpoch: epoch,
    binding: "diagnostic-only: no packet",
    handId: source?.identity ? timeline!.current.handId : null, connectionGeneration: source?.firstUtgProof?.continuity.generation ?? source?.hjProof?.continuity.generation ?? source?.coProof?.continuity.generation ?? source?.btnProof?.continuity.generation ?? source?.sbProof?.continuity.generation ?? chain?.generation ?? null, proofs };
  if (packet) envelope.binding = decisionProofBinding({ ...packet, decisionProofs: envelope }, epoch);
  // Inspect chart membership before packet construction so an out-of-chart FOLD
  // is not accidentally held behind an irrelevant Raise-panel prerequisite.
  const chartAction = packet ? unopenedChartAction(packet) : state?.street === "preflop" && hero?.holeCards.length === 2 && preflop
    ? unopenedChartAction({ table: { street: "preflop" }, hero: { holeCards: hero.holeCards as DecisionPacket["hero"]["holeCards"] }, preflop }) : null;
  const activation = packet ? assessPacketDecisionProofs({ ...packet, decisionProofs: envelope }, true)!
    : assessDecisionProofs({ street: state?.street ?? null, opponents: assessment.activeOpponents, amountToCall: assessment.amountToCall,
      preflopSituation: preflop?.situation ?? null, preflopRfiCandidate: !facing && (unopened?.candidate ?? false),
      preflopAction: chartAction, reviewedHjFold: responseFold, aggressionPossible: assessment.legality.aggressionReopened }, proofs);
  if (facing && callLegality?.ui.status === "contradicted") {
    activation.allowed = false;
    activation.state = "unsafe";
    activation.reasons.push(...callLegality.ui.reasons);
  } else if (facing && !responseFold && activation.state !== "unsafe") {
    activation.allowed = false;
    activation.state = "unsupported";
    activation.reasons.push(...responseStrategy!.reasons);
    activation.reasons.push("No reviewed pure FOLD for this hand/profile; missing CALL/3-BET legality must never substitute FOLD.");
  } else if (coFacing && activation.state !== "unsafe") {
    activation.allowed = false;
    activation.state = "unsupported";
    activation.reasons.push("CO facing UTG open plus HJ caller: no reviewed response strategy or independent CO action permission. Unsupported CALL/3-BET must never substitute FOLD.");
  }
  return { evidence: envelope, activation, unopened, openingSize: opening.size,
    riverCallFold: state?.street === "river" ? riverCallFoldReadiness(read, assessment, envelope, timeline) : null,
    turnCallFold: state?.street === "turn" ? riverCallFoldReadiness(read, assessment, envelope, timeline) : null,
    flopCallFold: state?.street === "flop" ? riverCallFoldReadiness(read, assessment, envelope, timeline) : null,
    responseWindow, responseStrategy, responseExecution, callLegality,
    // Separate diagnostic; never promotes a general decision scope or permission.
    postflopCall: flopCallEvidence(read, assessment, timeline, epoch),
    coResponse: coFacing && responseWindow ? { binding: { decisionEpoch: epoch, tableId: coFacing.tableId,
      handId: coFacing.handId, heroId: coFacing.heroId, heroCards: coFacing.heroCards,
      generation: coFacing.generation, cursor: coFacing.cursor, receivedAt: coFacing.receivedAt, expiresAt: responseWindow.expiresAt },
      chosenAction: null, liveAuthorized: false, strategy: "missing", legality: "unproven",
      accounting: source!.coFacingOpenProof!.accounting } : null };
}

/** Live authorization remains blocked without net pot/accounting evidence.
 * A separately labeled illustration may consume the matching bounded river
 * observation. It cannot promote assumptions into any decision proof scope. */
function riverCallFoldReadiness(read: LiveTableRead, assessment: LiveStateAssessment, envelope: DecisionProofs, timeline: LiveTimelineDiagnostic | null) {
  const state = assessment.state;
  if (state?.street !== "river" && state?.street !== "turn" && state?.street !== "flop") return null;
  const turn = state.street === "turn", flop = state.street === "flop", street = state.street, cardCount = flop ? "three" : turn ? "four" : "five";
  const relevant: ProofScope[] = ["decisionState", "connection", "stack", "callCost", "pot", "eligibility", "accounting"];
  const reasons = envelope.proofs.filter(p => relevant.includes(p.scope) && p.status !== "proven")
    .flatMap(p => p.reasons);
  if (turn) reasons.push(TURN_CHECKDOWN_WARNING);
  if (flop) reasons.push(FLOP_CHECKDOWN_WARNING);
  const hero = state.seats.find(s => s.isYou);
  const call = assessment.amountToCall;
  if (state.board.length !== (flop ? 3 : turn ? 4 : 5)) reasons.push(`Exactly ${cardCount} ${street} board cards are required.`);
  if (assessment.activeOpponents !== 1) reasons.push("Exactly one active opponent is required; multiway is unsupported.");
  if (call === null || call <= 0) reasons.push("A positive independently verified CALL amount is required.");
  if (hero?.stack == null || call !== null && call >= hero.stack || state.seats.some(s => s.isOccupied && s.isAllIn))
    reasons.push(`All-ins and short calls are outside the ${street} comparison.`);
  // Baseline diagnostics also run without a source window. The illustration
  // separately binds this observation to the original source activation time.
  const ui = call !== null && call > 0 ? assessCallControlReadiness(read.callControl ?? null, call, 0, Date.now(),
    "Visible CALL amount contradicts the current contribution gap.") : null;
  if (ui?.status !== "observed_matching") reasons.push(...(ui?.reasons ?? ["No decision-local CALL-control cross-check is available."]));
  const illustration = riverIllustration(read, assessment, timeline, envelope);
  if (!illustration.binding) reasons.push(`No validated ${street} source activation binds the current hand, hero, ${cardCount} board cards, payable CALL and original expiry. A matching DOM label or connected socket is insufficient.`);
  reasons.push(...illustration.reasons);
  // Contradictions remain fatal even in scopes not needed to price a pairwise
  // comparison. Unknown raise rights/position/range confidence are not blockers.
  const contradictions = envelope.proofs.filter(p => p.status === "contradicted").flatMap(p => p.reasons);
  return { status: "abstained" as const, liveAuthorized: false as const,
    unsafe: contradictions.length > 0 || ui?.status === "contradicted" || illustration.unsafe,
    illustration: illustration.calculation, binding: illustration.binding, illustrationLines: illustration.lines,
    requiredProofs: relevant, reasons: [...new Set([...contradictions, ...reasons])], warning: flop ? FLOP_CHECKDOWN_WARNING : turn ? TURN_CHECKDOWN_WARNING : RIVER_PAIRWISE_WARNING };
}

/** Proof refreshes must invalidate pending recommendations even if DOM values did not change. */
export function liveProofRevision(timeline: LiveTimelineDiagnostic): string {
  const s = timeline.sourceStatus;
  return JSON.stringify({ connected: s.connected, identity: s.identity, handId: timeline.current.handId,
    firstUtg: s.firstUtgProof ?? null,
    river: s.riverObservation ?? null,
    ...(s.hjProof ? { hj: s.hjProof } : {}),
    ...(s.coProof ? { co: s.coProof } : {}),
    ...(s.btnProof ? { btn: s.btnProof } : {}),
    ...(s.sbProof ? { sb: s.sbProof } : {}),
    ...(s.facingOpenProof ? { facingOpen: s.facingOpenProof } : {}),
    ...(s.coFacingOpenProof ? { coFacingOpen: s.coFacingOpenProof } : {}),
    generation: s.sourceMetadata.socketContinuity.generation, continuity: s.sourceMetadata.socketContinuity.status,
    gap: s.sourceMetadata.socketContinuity.chainGap, lastCursor: s.sourceMetadata.socket.at(-1)?.metadata.frame,
    events: timeline.current.events.map(e => [e.id, e.order, e.actor?.seat]), coverage: timeline.current.coverage.status,
    rejected: timeline.current.coverage.rejectedBatchCount, mapping: timeline.current.seatMapping });
}

export function activationLabel(state: "proof_ready" | "waiting_for_proof" | "unsupported" | "unsafe"): string {
  return { proof_ready: "Inputs proven; evaluating supported policy", waiting_for_proof: "Waiting for decision proof",
    unsupported: "Unsupported situation", unsafe: "Contradictory / unsafe state" }[state];
}
