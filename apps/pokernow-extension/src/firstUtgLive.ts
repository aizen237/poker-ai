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

/** Shared live cross-checks; the HJ prefix is produced by the same reducer.
 * DOM folds can contradict a source witness, never create one. */
function currentOpeningWindow(read: LiveTableRead | undefined, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null | undefined, role: "UTG" | "HJ") {
  const source = timeline?.sourceStatus, proof = role === "UTG" ? source?.firstUtgProof : source?.hjProof, w = proof?.witness;
  const id = source?.identity, chain = proof?.continuity;
  const utg = w?.players.find(p => p.position === "UTG");
  const state = assessment.state;
  if (!read || !timeline || !w || !source?.connected || !id || !state ||
      id.tableId !== w.tableId || id.handId !== w.handId || id.handNumber !== w.handNumber || id.heroPlayerId !== w.heroId ||
      (role === "UTG" ? id.frameCursor !== w.cursor : id.frameCursor !== source?.hjProof?.anchor.cursor) ||
      timeline.current.handId !== `${w.tableId}:hand:${w.handId}` || timeline.current.handNumber !== w.handNumber ||
      proof?.scope !== (role === "UTG" ? "first_utg_boundary" : "hj_after_utg_fold") || proof.version !== 1 || proof.historyComplete !== false ||
      (role === "HJ" && (Date.now() < w.receivedAt || Date.now() >= proof.expiresAt ||
        w.players.find(p => p.playerId === w.heroId)?.position !== "HJ")) ||
      chain?.generation !== w.generation || chain.status !== "validated_prefix" || chain.tableId !== w.tableId ||
      chain.handId !== w.handId || chain.cursor !== w.cursor || chain.throughSequence <= chain.baselineSequence || id.chainGap ||
      timeline.current.coverage.issues.some(i => i.code === "metadata_gap" || i.code === "identity_conflict") ||
      timeline.current.seatMapping.status === "invalid" || read.context.readErrors.length ||
      state.street !== "preflop" || state.board.length || assessment.smallBlind !== w.smallBlind || assessment.bigBlind !== w.bigBlind ||
      read.context.dealerSeatNumber !== w.players.find(p => p.position === "BTN")?.seat) return null;
  // Conflicting log evidence can invalidate this scoped voluntary window, even
  // though missing log rows cannot invalidate its independent first-turn proof.
  if (timeline.current.events.some(e => e.source === "pokernow_log_v3" &&
      !isSourceNonActionMetadata(e) &&
      !["hand_start", "player_stacks", "post"].includes(e.action) &&
      !(role === "HJ" && e.action === "fold" && e.actor?.playerId === utg?.playerId && e.street === "preflop"))) return null;
  if (role === "HJ" && timeline.current.events.filter(e => e.source === "pokernow_log_v3" && e.action === "fold").length > 1) return null;
  if (role === "HJ") {
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
    if (!s || s.isFolded !== (role === "HJ" && p.position === "UTG") || s.isAllIn || s.isOffline || s.isSettling || s.betReadError || s.stack === null ||
        s.stack < 100 * w.bigBlind || (s.stack !== p.sourceStack && s.stack !== p.sourceStack - p.contribution) ||
        assessment.positions.get(p.seat) !== p.position ||
        (s.currentBet === null ? p.contribution !== 0 : s.currentBet !== p.contribution) ||
        s.isYou !== (p.playerId === w.heroId) || s.isCurrentToAct !== (p.playerId === w.heroId)) return null;
  }
  const hero = seats.find(s => s.isYou)!;
  const ranks = "23456789TJQKA";
  const cards = hero.holeCards.map(c => `${ranks[c.rank - 2]}${c.suit}`).sort();
  if (cards.length !== 2 || JSON.stringify(cards) !== JSON.stringify([...w.heroCards].sort()) ||
      assessment.amountToCall !== null && assessment.amountToCall !== w.bigBlind) return null;
  return w;
}
