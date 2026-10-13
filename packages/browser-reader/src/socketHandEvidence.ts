/** Offline audit of reported socket observations. Not exported from the package
 * entrypoint or consumed by live proofs, policy, action history or accounting.
 * pCPlayerIds is an explicit audit projection, not an invented PokerNow field.
 */
export interface ReportedSocketRoster {
  hI: string;
  gN: number;
  seats: [number, string][];
  iHPI: string[];
  pCPlayerIds: string[];
  dealerID: string;
  dealerSeat: number;
  sBPI: string;
  bBPI: string;
}
interface AuditBinding {
  generation: number;
  hI: string;
  gN: number;
  chainStatus: "unknown" | "observed_continuous" | "incomplete";
  chainGap: boolean;
}
const sameMembers = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && new Set(a).size === a.length && new Set(b).size === b.length && a.every(id => b.includes(id));

/** Freeze a reported hand-start observation, never a later mutable roster.
 * Caller supplies the first boundary observation; a mid-hand first sighting is
 * NOT a hand-start proof. Returned evidence is observational even when consistent.
 */
export function freezeReportedSocketRoster(input: ReportedSocketRoster, generation: number) {
  const roster = structuredClone(input);
  const reasons: string[] = [];
  const seats = roster.seats;
  const ids = seats.map(s => s[1]);
  const validIds = ids.every(id => typeof id === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(id));
  if (!validIds || seats.length < 2 || seats.length > 6 || new Set(seats.map(s => s[0])).size !== seats.length ||
      seats.some(s => !Number.isInteger(s[0]) || s[0] < 1 || s[0] > 10) ||
      !sameMembers(ids, roster.iHPI) || !sameMembers(ids, roster.pCPlayerIds)) {
    reasons.push("Seats, iHPI and reported pC keys do not provide one unambiguous matching roster.");
  }
  if (!roster.hI || !Number.isSafeInteger(roster.gN) || roster.gN < 1 || !Number.isSafeInteger(generation) || generation < 1) {
    reasons.push("Invalid hand/generation binding.");
  }
  if (!seats.some(([seat, id]) => seat === roster.dealerSeat && id === roster.dealerID) ||
      !ids.includes(roster.sBPI) || !ids.includes(roster.bBPI) || roster.sBPI === roster.bBPI) {
    reasons.push("Dealer/seat/blind identities contradict the reported roster.");
  }
  if (seats.length === 2 && roster.dealerID !== roster.sBPI || seats.length > 2 &&
      [roster.sBPI, roster.bBPI].includes(roster.dealerID)) reasons.push("Dealer/blind relationship does not match ordinary table structure.");
  // HU needs no clockwise assumption. For 3+ players, this capture does not
  // establish traversal order or a generalized position certificate.
  const positions = !reasons.length && seats.length === 2 ? seats.map(([seat, playerId]) => ({
    seat, playerId, position: playerId === roster.dealerID ? "BTN/SB" as const : "BB" as const,
  })) : null;
  const initialReasons = [...reasons];
  const invalidate = (reason: string) => { if (!reasons.includes(reason)) reasons.push(reason); };
  return {
    inspect(binding: AuditBinding, currentSeats?: readonly [number, string][]) {
      if (binding.generation !== generation || binding.hI !== roster.hI || binding.gN !== roster.gN)
        invalidate("Hand/generation changed; old observation is historical only, not a current certificate.");
      if (binding.chainGap || binding.chainStatus === "incomplete") invalidate("Socket chain gap/incomplete window invalidates current use.");
      // Omission cannot erase historical dealt-in candidates. A conflicting
      // assignment or arrival does prevent certifying the current window.
      if (currentSeats && (new Set(currentSeats.map(s => s[0])).size !== currentSeats.length ||
          new Set(currentSeats.map(s => s[1])).size !== currentSeats.length ||
          currentSeats.some(([seat, id]) => !seats.some(([s, p]) => s === seat && p === id))))
        invalidate("New or contradictory seat assignment; do not merge it into the frozen hand roster.");
      const issues = [...new Set(reasons)];
      if (binding.chainStatus === "unknown") issues.push("No continuous socket window established.");
      return {
        authority: "reported_source_observation" as const,
        roster: structuredClone(roster), generation,
        status: issues.length ? "insufficient_or_invalid" as const : "consistent_scoped_candidate" as const,
        reasons: issues,
        observedPositions: initialReasons.length ? null : structuredClone(positions),
        historyComplete: false as const, provesDealtInRoster: false as const,
        provesActionWindow: false as const, provesRaiseLegality: false as const,
      };
    },
  };
}

/** Conditional interpretation only. DOM wager semantics have NOT verified tB.
 * Reported empty eventsData cannot establish absence/order of actions.
 */
export function inspectReportedBlindCompletion(start: ReportedSocketRoster & { tB: Record<string, number> },
  transition: { playerId: string; from: number; to: number }, turn: { cPI: string; pITT: string }) {
  const small = start.tB[start.sBPI], big = start.tB[start.bBPI];
  const consistent = start.seats.length === 2 && sameMembers(start.seats.map(s => s[1]), start.iHPI) &&
    sameMembers(start.iHPI, start.pCPlayerIds) && start.dealerID === start.sBPI &&
    start.seats.some(([seat, id]) => seat === start.dealerSeat && id === start.dealerID) &&
    typeof small === "number" && Number.isFinite(small) && small > 0 &&
    typeof big === "number" && Number.isFinite(big) && big > small &&
    transition.playerId === start.sBPI && transition.from === small && transition.to === big &&
    turn.cPI === start.bBPI && turn.pITT === start.bBPI;
  return {
    interpretation: consistent ? "possible_small_blind_completion" as const : "unknown" as const,
    additionalChipsIfStreetTotals: consistent ? big! - small! : null,
    totalContributionIfStreetTotals: consistent ? big! : null,
    verifiedAction: null,
    provesUnopened: false as const,
    reasons: ["tB current-street total semantics need independent socket-to-log/DOM evidence; existing DOM validation is not validation of tB.",
      "Projected values alone do not validate delta assignment/merge semantics or a complete action-bearing update contract, even when raw frame placement is known.",
      "Matching cPI/pITT supports a current-player candidate, not a complete action prefix or catch-up acknowledgment."],
  };
}
