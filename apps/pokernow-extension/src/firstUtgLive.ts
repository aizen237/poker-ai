import { isSourceNonActionMetadata, type LiveStateAssessment } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";

/** Independent source boundary + synchronous DOM cross-check. Never upgrades
 * the global hand timeline or certifies any later preflop decision. */
export function currentFirstUtg(read: LiveTableRead | undefined, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null | undefined) {
  const source = timeline?.sourceStatus, proof = source?.firstUtgProof, w = proof?.witness;
  const id = source?.identity, chain = proof?.continuity;
  const state = assessment.state;
  if (!read || !timeline || !w || !source?.connected || !id || !state ||
      id.tableId !== w.tableId || id.handId !== w.handId || id.handNumber !== w.handNumber || id.heroPlayerId !== w.heroId || id.frameCursor !== w.cursor ||
      timeline.current.handId !== `${w.tableId}:hand:${w.handId}` || timeline.current.handNumber !== w.handNumber ||
      proof?.scope !== "first_utg_boundary" || proof.version !== 1 || proof.historyComplete !== false ||
      chain?.generation !== w.generation || chain.status !== "validated_prefix" || chain.tableId !== w.tableId ||
      chain.handId !== w.handId || chain.cursor !== w.cursor || chain.throughSequence <= chain.baselineSequence || id.chainGap ||
      timeline.current.coverage.issues.some(i => i.code === "metadata_gap" || i.code === "identity_conflict") ||
      timeline.current.seatMapping.status === "invalid" || read.context.readErrors.length ||
      state.street !== "preflop" || state.board.length || assessment.smallBlind !== w.smallBlind || assessment.bigBlind !== w.bigBlind ||
      read.context.dealerSeatNumber !== w.players.find(p => p.position === "BTN")?.seat) return null;
  // Conflicting log evidence can invalidate this empty voluntary window, even
  // though missing log rows cannot invalidate its independent first-turn proof.
  if (timeline.current.events.some(e => e.source === "pokernow_log_v3" &&
      !isSourceNonActionMetadata(e) &&
      !["hand_start", "player_stacks", "post"].includes(e.action))) return null;
  if (timeline.current.seatMapping.entries.some(e => !w.players.some(p => p.playerId === e.playerId && p.seat === e.seat))) return null;
  const seats = state.seats.filter(s => s.isOccupied);
  if (seats.length !== 6 || new Set(seats.map(s => s.seatNumber)).size !== 6 ||
      seats.filter(s => s.isYou).length !== 1 || seats.filter(s => s.isCurrentToAct).length !== 1) return null;
  for (const p of w.players) {
    const s = seats.find(s => s.seatNumber === p.seat);
    if (!s || s.isFolded || s.isAllIn || s.isOffline || s.isSettling || s.betReadError || s.stack === null ||
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
