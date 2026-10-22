import { isSourceNonActionMetadata, type LiveStateAssessment } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";

/** Independent first-UTG boundary + synchronous DOM cross-check. */
export function currentFirstUtg(read: LiveTableRead | undefined, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null | undefined) {
  return currentOpeningWindow(read, assessment, timeline, "UTG");
}

export function currentHj(read: LiveTableRead | undefined, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null | undefined) {
  return currentOpeningWindow(read, assessment, timeline, "HJ");
}

export function currentCo(read: LiveTableRead | undefined, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null | undefined) {
  return currentOpeningWindow(read, assessment, timeline, "CO");
}

export function currentBtn(read: LiveTableRead | undefined, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null | undefined) {
  return currentOpeningWindow(read, assessment, timeline, "BTN");
}

export function currentSb(read: LiveTableRead | undefined, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null | undefined) {
  return currentOpeningWindow(read, assessment, timeline, "SB");
}

/** Context-only response window. Does not grant a response action or size. */
export function currentFacingOpen(read: LiveTableRead | undefined, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null | undefined) {
  return currentOpeningWindow(read, assessment, timeline, "HJ_OPEN");
}

/** CO context after the closed UTG raise / HJ call prefix; no response permission. */
export function currentCoFacingOpen(read: LiveTableRead | undefined, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null | undefined) {
  return currentOpeningWindow(read, assessment, timeline, "CO_OPEN_CALL");
}

/** Shared live cross-checks; HJ/CO/BTN/SB prefixes are produced by the same reducer.
 * DOM folds can contradict a source witness, never create one. */
function currentOpeningWindow(read: LiveTableRead | undefined, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null | undefined, role: "UTG" | "HJ" | "CO" | "BTN" | "SB" | "HJ_OPEN" | "CO_OPEN_CALL") {
  const coFacing = role === "CO_OPEN_CALL", facing = role === "HJ_OPEN" || coFacing;
  const source = timeline?.sourceStatus, proof = coFacing ? source?.coFacingOpenProof : facing ? source?.facingOpenProof : role === "UTG" ? source?.firstUtgProof : role === "HJ" ? source?.hjProof : role === "CO" ? source?.coProof : role === "BTN" ? source?.btnProof : source?.sbProof, w = proof?.witness;
  const id = source?.identity, chain = proof?.continuity;
  const foldedPositions = role === "SB" ? ["UTG", "HJ", "CO", "BTN"] : role === "BTN" ? ["UTG", "HJ", "CO"] : role === "CO" ? ["UTG", "HJ"] : role === "HJ" ? ["UTG"] : [];
  const foldedIds = foldedPositions.map(position => w?.players.find(p => p.position === position)?.playerId);
  const state = assessment.state;
  if (!read || !timeline || !w || !source?.connected || !id || !state ||
      id.tableId !== w.tableId || id.handId !== w.handId || id.handNumber !== w.handNumber || id.heroPlayerId !== w.heroId ||
      (role === "UTG" ? id.frameCursor !== w.cursor : id.frameCursor !== (proof && "anchor" in proof ? proof.anchor.cursor : null)) ||
      timeline.current.handId !== `${w.tableId}:hand:${w.handId}` || timeline.current.handNumber !== w.handNumber ||
      proof?.scope !== (coFacing ? "co_facing_utg_open5_hj_call5" : facing ? "hj_facing_utg_open5" : role === "UTG" ? "first_utg_boundary" : role === "HJ" ? "hj_after_utg_fold" : role === "CO" ? "co_after_utg_hj_folds" : role === "BTN" ? "btn_after_utg_hj_co_folds" : "sb_after_utg_hj_co_btn_folds") || proof.version !== 1 || proof.historyComplete !== false ||
      (role !== "UTG" && (Date.now() < w.receivedAt || Date.now() >= proof.expiresAt ||
        w.players.find(p => p.playerId === w.heroId)?.position !== (coFacing ? "CO" : facing ? "HJ" : role))) ||
      chain?.generation !== w.generation || chain.status !== "validated_prefix" || chain.tableId !== w.tableId ||
      chain.handId !== w.handId || chain.cursor !== w.cursor || chain.throughSequence <= chain.baselineSequence || id.chainGap ||
      timeline.current.coverage.issues.some(i => i.code === "metadata_gap" || i.code === "identity_conflict") ||
      timeline.current.seatMapping.status === "invalid" || read.context.readErrors.length ||
      state.street !== "preflop" || state.board.length || assessment.smallBlind !== w.smallBlind || assessment.bigBlind !== w.bigBlind ||
      read.context.dealerSeatNumber !== w.players.find(p => p.position === "BTN")?.seat) return null;
  if (facing && (coFacing ? source.coFacingOpenProof : source.facingOpenProof)?.actor.playerId !== w.heroId) return null;
  // Conflicting log evidence can invalidate this scoped voluntary window, even
  // though missing log rows cannot invalidate its independent first-turn proof.
  if (timeline.current.events.some(e => e.source === "pokernow_log_v3" &&
      !isSourceNonActionMetadata(e) &&
      !["hand_start", "player_stacks", "post"].includes(e.action) &&
      !(facing && e.action === "raise" && e.actor?.playerId === w.players.find(p => p.position === "UTG")?.playerId &&
        e.street === "preflop" && e.amountMeaning === "street_total" && e.amount === 5 && e.order !== "ambiguous") &&
      !(coFacing && e.action === "call" && e.actor?.playerId === w.players.find(p => p.position === "HJ")?.playerId &&
        // From source-proven zero, reported CALL5 matches both total and delta;
        // this does not change the generic log parser's unspecified semantics.
        e.street === "preflop" && e.amountMeaning === "reported_unspecified" && e.amount === 5 && e.order !== "ambiguous") &&
      !(role !== "UTG" && e.action === "fold" && !!e.actor?.playerId && foldedIds.includes(e.actor.playerId) && e.street === "preflop"))) return null;
  if (facing && timeline.current.events.filter(e => e.source === "pokernow_log_v3" && e.action === "raise").length > 1) return null;
  if (coFacing) {
    const calls = timeline.current.events.filter(e => e.source === "pokernow_log_v3" && e.action === "call");
    const raise = timeline.current.events.find(e => e.source === "pokernow_log_v3" && e.action === "raise");
    if (calls.length > 1 || raise && calls[0] &&
        (raise.sourceTimestamp === null || calls[0].sourceTimestamp === null || raise.sourceTimestamp >= calls[0].sourceTimestamp)) return null;
  }
  const logFolds = timeline.current.events.filter(e => e.source === "pokernow_log_v3" && e.action === "fold");
  if (role !== "UTG" && (logFolds.length > foldedIds.length ||
      new Set(logFolds.map(e => e.actor?.playerId)).size !== logFolds.length)) return null;
  if ((role === "CO" || role === "BTN" || role === "SB") && logFolds.length > 1 &&
      (logFolds.some(e => e.order === "ambiguous") || logFolds.some((e, i) => i > 0 &&
        foldedIds.indexOf(e.actor?.playerId ?? undefined) <= foldedIds.indexOf(logFolds[i - 1]!.actor?.playerId ?? undefined)))) return null;
  if (role !== "UTG") {
    const posts = timeline.current.events.filter(e => e.source === "pokernow_log_v3" && e.action === "post");
    if (posts.length > 2 || new Set(posts.map(e => e.actor?.playerId)).size !== posts.length || posts.some(e => {
      const player = w.players.find(p => p.playerId === e.actor?.playerId);
      const blind = player?.position === "SB" ? "small" : player?.position === "BB" ? "big" : null;
      return !blind || e.street !== "preflop" || e.amount !== player!.contribution ||
        !new RegExp(` posts a ${blind} blind of ${player!.contribution}$`).test(e.evidence);
    })) return null;
  }
  if (timeline.current.seatMapping.entries.some(e => !w.players.some(p => p.playerId === e.playerId && p.seat === e.seat))) return null;
  const seats = state.seats.filter(s => s.isOccupied);
  if (seats.length !== 6 || new Set(seats.map(s => s.seatNumber)).size !== 6 ||
      seats.filter(s => s.isYou).length !== 1 || seats.filter(s => s.isCurrentToAct).length !== 1) return null;
  for (const p of w.players) {
    const s = seats.find(s => s.seatNumber === p.seat);
    if (!s || s.isFolded !== foldedPositions.includes(p.position) || s.isAllIn || s.isOffline || s.isSettling || s.betReadError || s.stack === null ||
        s.stack < 100 * w.bigBlind || (s.stack !== p.sourceStack && s.stack !== p.sourceStack - p.contribution) ||
        (facing && (p.position === "UTG" || coFacing && p.position === "HJ") && s.stack !== p.sourceStack - p.contribution) ||
        assessment.positions.get(p.seat) !== p.position ||
        (s.currentBet === null ? p.contribution !== 0 : s.currentBet !== p.contribution) ||
        s.isYou !== (p.playerId === w.heroId) || s.isCurrentToAct !== (p.playerId === w.heroId)) return null;
  }
  const hero = seats.find(s => s.isYou)!;
  const ranks = "23456789TJQKA";
  const cards = hero.holeCards.map(c => `${ranks[c.rank - 2]}${c.suit}`).sort();
  if (cards.length !== 2 || JSON.stringify(cards) !== JSON.stringify([...w.heroCards].sort()) ||
      assessment.amountToCall !== null && assessment.amountToCall !== (facing ? 5 : w.bigBlind - w.players.find(p => p.playerId === w.heroId)!.contribution)) return null;
  return w;
}
