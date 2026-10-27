import { compareRiverCallFold, riverCallFoldDisplay, type DecisionProofs } from "@poker-ai/ai-core";
import type { LiveStateAssessment } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import { assessCallControlReadiness } from "./callControlRead.js";

let cached: { key: string; result: ReturnType<typeof compareRiverCallFold> } | null = null;

/** Keep illustrative accounting assumptions separate from live proof scopes.
 * Nothing here can set a pot/eligibility/accounting/permission scope to proven. */
export function riverIllustration(read: LiveTableRead, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null, envelope: DecisionProofs) {
  const w = timeline?.sourceStatus.riverObservation;
  const empty = (reasons: string[] = [], unsafe = false) => ({ binding: null, calculation: null, lines: [] as string[], reasons, unsafe });
  if (!w || !timeline || Date.now() < w.receivedAt || Date.now() >= w.expiresAt) return empty();
  const source = timeline.sourceStatus, identity = source.identity, state = assessment.state;
  const card = (c: { rank: number; suit: string }) => `${"23456789TJQKA"[c.rank - 2]}${c.suit}`;
  const seats = state?.seats.filter(s => s.isOccupied) ?? [], hero = seats.find(s => s.isYou);
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const ui = assessCallControlReadiness(read.callControl ?? null, w.payableCall, w.receivedAt, Date.now());
  if (!source.connected || identity?.chainGap || identity?.tableId !== w.tableId || identity?.handId !== w.handId ||
      identity?.handNumber !== w.handNumber || identity?.heroPlayerId !== w.heroId ||
      timeline.current.handId !== `${w.tableId}:hand:${w.handId}` ||
      source.sourceMetadata.socketContinuity.generation !== w.generation) return empty(["River source identity or connection contradicts the activation."], true);
  if (!state || read.context.readErrors.length || ui.status !== "observed_matching") return empty(ui.reasons, ui.status === "contradicted");
  if (state.street !== "river" || assessment.activeOpponents !== 1 || !hero?.isCurrentToAct ||
      !same(state.board.map(card), w.board) || !same(hero.holeCards.map(card).sort(), [...w.heroCards].sort()) ||
      assessment.amountToCall !== w.payableCall || seats.length !== w.players.length ||
      new Set(seats.map(s => s.seatNumber)).size !== seats.length ||
      seats.filter(s => s.isYou).length !== 1 || seats.filter(s => s.isCurrentToAct).length !== 1 ||
      timeline.current.seatMapping.status === "invalid" || timeline.current.seatMapping.entries.some(e => !w.players.some(p => p.seat === e.seat && p.playerId === e.playerId)) ||
      !w.players.every(p => {
        const s = seats.find(s => s.seatNumber === p.seat);
        return !!s && s.isYou === (p.playerId === w.heroId) && s.isFolded === p.folded && !s.isAllIn && !s.isSettling &&
          (p.folded || !s.isOffline) && !s.betReadError && s.stack === p.remainingStack &&
          (s.currentBet !== null ? s.currentBet === p.contribution : p.contribution === 0 && (s.isChecking || p.folded));
      })) return empty(["River DOM identity, board, opponent roster, contributions or remaining capacity contradicts the source window."], true);
  if (assessment.pot.mainPot !== w.collectedPot || assessment.pot.displayedTotalPot !== w.grossPotBeforeCall ||
      w.grossPotBeforeCall !== w.collectedPot + w.streetSubtotal) return empty(["River pot displays contradict collected pot plus current street contributions."], true);
  if (timeline.current.events.some(e => e.action === "uncalled_return") || timeline.current.accounting.adjustments.length)
    return empty(["Observed returns/settlement adjustments are unresolved; illustrative pot calculation withheld."], true);
  // Preserve existing contradiction handling; unknown RAISE legality is irrelevant.
  const contradictions = envelope.proofs.filter(p => p.status === "contradicted").flatMap(p => p.reasons);
  if (contradictions.length) return empty(contradictions, true);
  const needed = ["decisionState", "connection", "stack", "callCost"];
  const missing = envelope.proofs.filter(p => needed.includes(p.scope) && p.status !== "proven");
  if (missing.length) return empty(missing.flatMap(p => p.reasons));
  const opponent = seats.find(s => !s.isYou && !s.isFolded)!;
  const input = { street: "river", heroCards: hero.holeCards, board: state.board, activeOpponents: 1,
    potBeforeCall: w.grossPotBeforeCall, amountToCall: w.payableCall, heroStack: hero.stack,
    opponentStack: opponent.stack, accounting: "single_pot_no_rake" as const };
  const key = JSON.stringify(input);
  if (cached?.key !== key) cached = { key, result: compareRiverCallFold(input) };
  const calculation = cached.result;
  if (calculation.status === "abstained") return empty([calculation.reason]);
  return { binding: { tableId: w.tableId, handId: w.handId, heroId: w.heroId, generation: w.generation,
    cursor: w.cursor, sequence: w.sequence, receivedAt: w.receivedAt, expiresAt: w.expiresAt, decisionEpoch: envelope.decisionEpoch },
    calculation, reasons: [], unsafe: false,
    lines: ["ILLUSTRATIVE ONLY — not verified; no action authorization.",
      `Assumes all ${w.grossPotBeforeCall} chips are hero-contestable in one pot, no unresolved returns and zero rake/drop. These assumptions are unproven.`,
      `Collected ${w.collectedPot} + current bet ${w.streetSubtotal} = ${w.grossPotBeforeCall} chips before CALL; payable CALL ${w.payableCall}. The bet is included once.`,
      ...riverCallFoldDisplay(calculation)] };
}
