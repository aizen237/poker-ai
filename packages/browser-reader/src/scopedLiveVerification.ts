import type { PokerGameState, SeatState } from "./gameState.js";
import type { PotProvenance } from "./potSemantics.js";
import { provenFact, unknownFact, proveBettingLegality, unknownBettingProof, type BettingProofInput, type ProvenFact } from "./legalityProof.js";

export const CONTROLLED_LIVE_SOURCE = "PokerNow controlled live evidence supplied 2026-10-07";

/** Explicit numeric totals and check labels only. Absence is not evidence of zero. */
function contribution(seat: SeatState): ProvenFact<number> {
  if (!seat.betReadError && seat.currentBet !== null && Number.isFinite(seat.currentBet) && seat.currentBet >= 0) {
    return provenFact(seat.currentBet, `${CONTROLLED_LIVE_SOURCE}; seat ${seat.seatNumber} numeric current-street total`);
  }
  if (!seat.betReadError && seat.currentBet === null && seat.isChecking) {
    return provenFact(0, `${CONTROLLED_LIVE_SOURCE}; seat ${seat.seatNumber} explicit check = zero`);
  }
  return unknownFact(`Seat ${seat.seatNumber}: contribution absent or unreadable; only numeric totals and explicit check are supported.`);
}

export function assessScopedMonetary(state: PokerGameState | null, pot: PotProvenance, readErrors: readonly string[]) {
  const seats = state?.seats.filter(s => s.isOccupied) ?? [];
  const invalid = state === null || seats.length < 2 || new Set(seats.map(s => s.seatNumber)).size !== seats.length || readErrors.length > 0;
  const invalidReason = `No unambiguous current table read${readErrors.length ? ": " + readErrors.join("; ") : ""}.`;
  const rows = seats.map(s => ({ seat: s.seatNumber, folded: s.isFolded,
    contribution: invalid ? unknownFact<number>(invalidReason) : contribution(s) }));
  const active = rows.filter(s => !s.folded);
  const missing = active.flatMap(s => s.contribution.reasons);
  const semantics = invalid || active.length < 2 || missing.length
    ? unknownFact<"total_street_contributions">(invalid ? invalidReason : missing.join(" ") || "Fewer than two active participants.")
    : provenFact<"total_street_contributions">("total_street_contributions", `${CONTROLLED_LIVE_SOURCE}; explicit active-seat contributions`);
  const heroes = seats.filter(s => s.isYou && !s.isFolded);
  const hero = heroes.length === 1 ? heroes[0] : undefined;
  const heroValue = rows.find(s => s.seat === hero?.seatNumber)?.contribution.value;
  const opponentValues = active.filter(s => s.seat !== hero?.seatNumber).map(s => s.contribution.value);
  const highest = semantics.status === "proven" && hero && opponentValues.length ? Math.max(...opponentValues as number[]) : null;
  const callGap = highest !== null && heroValue != null
    ? provenFact(Math.max(0, highest - heroValue), `${CONTROLLED_LIVE_SOURCE}; max active opposing total minus hero total, floored at zero; uncapped gap, not all-in payable cost`)
    : unknownFact<number>(!hero ? "Hero missing, folded or ambiguous." : semantics.reasons.join(" ") || "Opposing contributions are incomplete.");
  const subtotal = !invalid && rows.every(s => s.contribution.value !== null)
    ? rows.reduce((sum, s) => sum + s.contribution.value!, 0) : null;
  const matches = subtotal !== null && pot.mainPot !== null && pot.displayedTotalPot !== null
    ? Math.abs(pot.mainPot + subtotal - pot.displayedTotalPot) < 1e-8 : null;
  const display = matches === true
    ? provenFact<"collected_plus_street_contributions">("collected_plus_street_contributions", `${CONTROLLED_LIVE_SOURCE}; current display reconciled including folded contributions; no remaining stacks added`)
    : unknownFact<"collected_plus_street_contributions">(matches === false
      ? "Collected pot plus street contributions does not match displayed total; transition/return/accounting state is unsupported."
      : `Pot display reconciliation lacks readable displays or explicit contributions for all occupied seats. ${rows.flatMap(s => s.contribution.reasons).join(" ")}`);
  return {
    contributionSemantics: semantics, contributions: rows, callGap, highestOpposingContribution: highest,
    potDisplay: { ...display, collectedMainPot: pot.mainPot, displayedTotalPot: pot.displayedTotalPot,
      currentStreetSubtotal: subtotal, matches,
      scope: seats.length === 2 ? "heads_up_display_only" : "multiway_display_only",
      contestablePotVerified: false as const },
  };
}

/** Complete ordered evidence must be attached to this exact snapshot, never cached by chip amounts. */
export interface ScopedBettingEvidence extends Omit<BettingProofInput, "rulesVerified" | "rulesSource"> {
  snapshotSignature: string;
}
export const bettingSnapshotSignature = (state: PokerGameState): string => JSON.stringify(state);

/** This does not upgrade ActionHistory polling records to complete events. */
export function proveScopedLiveBetting(state: PokerGameState | null, input?: ScopedBettingEvidence, observedBigBlind?: number | null) {
  const fail = (reason: string) => ({ ...unknownBettingProof(reason),
    shortUnderRaise: unknownFact<boolean>(reason), minimumBeforeLastAggression: unknownFact<number>(reason) });
  if (!state || !input || input.coverage !== "complete_ordered") return fail("Complete ordered street evidence including hero is unavailable; polling may omit intermediate actions.");
  if (input.snapshotSignature !== bettingSnapshotSignature(state) || input.street !== state.street) return fail("Ordered evidence does not belong to the current snapshot/street.");
  if (observedBigBlind !== undefined && observedBigBlind !== input.bigBlind) return fail("Ordered evidence big blind does not match the current blind read.");
  if (input.street !== "flop" || input.bigBlind !== 2) return fail("Raise rule evidence is scoped to the observed flop cases with BB=2; this context is unsupported.");
  const hero = state.seats.find(s => s.seatNumber === input.heroSeat && s.isYou && s.isOccupied && !s.isFolded);
  if (!hero?.isCurrentToAct) return fail("Hero is not the current active decision maker.");
  // Replay the existing arithmetic validator, but release only facts supported
  // by the scoped sequence below. This is not a global PokerNow rule certificate.
  const source = `${CONTROLLED_LIVE_SOURCE}; ${input.source}; ordered sequence, arithmetic-derived bounds`;
  const proof = proveBettingLegality({ ...input, rulesVerified: true, rulesSource: source });
  if (proof.lastFullRaiseAmount.status !== "proven") return fail(proof.lastFullRaiseAmount.reasons.join(" "));
  const totals = new Map(input.players.map(p => [p.seat, { total: p.contribution, stack: p.remainingStack, folded: false, allIn: p.remainingStack === 0 }]));
  let highest = 0;
  const aggression: Array<{ total: number; allIn: boolean; seat: number }> = [];
  for (const event of input.events) {
    const p = totals.get(event.seat)!;
    if (event.action === "fold") p.folded = true;
    if (event.action === "wager") {
      p.stack -= event.raiseTo - p.total; p.total = event.raiseTo; p.allIn = event.allIn;
      if (event.raiseTo > highest) { highest = event.raiseTo; aggression.push({ total: highest, allIn: event.allIn, seat: event.seat }); }
    }
  }
  const occupied = state.seats.filter(s => s.isOccupied);
  if (occupied.length !== totals.size || occupied.some(s => {
    const end = totals.get(s.seatNumber);
    const read = contribution(s);
    return !end || read.value !== end.total || s.isFolded !== end.folded || (s.isAllIn ?? false) !== end.allIn ||
      (end.allIn ? s.stack !== null && s.stack !== 0 : s.stack !== end.stack);
  })) return fail("Ordered events do not reconcile with current contributions, stacks, all-in states or roster.");
  const pattern = aggression.map(a => `${a.total}${a.allIn ? "a" : ""}`).join(",");
  const supported = ["2", "3", "3,6", "3,6,8a"].includes(pattern);
  const allInEvents = input.events.filter(e => e.allIn);
  if (!supported || allInEvents.length !== (pattern === "3,6,8a" ? 1 : 0)) {
    return fail("Sequence outside the observed opening-bet/3→6→8 short-all-in cases. Full all-in and cumulative reopening remain unverified.");
  }
  const short = pattern === "3,6,8a";
  const nonReopening = short && aggression[1]!.seat === input.heroSeat && hero.currentBet === 6 && hero.stack != null && hero.stack > 2 && proof.actionReopened.value === false;
  return {
    ...proof,
    shortUnderRaise: provenFact(short, source),
    minimumBeforeLastAggression: pattern.startsWith("3,6") ? provenFact(short ? 9 : 6, source) : unknownFact<number>("Last aggression was an opening bet, not a raise."),
    // The capture proves a particular already-acted player's denied raise right.
    // Do not promote mathematical full-raise reopening to live verification.
    actionReopened: nonReopening ? provenFact(false, `${source}; player raised to 6, faces Call 2 after short all-in to 8; Raise disabled`)
      : unknownFact<boolean>("Reopening for this actor/sequence has not been independently observed; full all-in reopening is unverified."),
    stackCappedUnderRaiseTo: unknownFact<number | null>("No verified permission for a new stack-capped raise; historical short-under-raise classification is separate."),
  };
}
