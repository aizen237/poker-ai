import { provenFact, unknownFact, type LiveStateAssessment } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import { matchesFlopCallContract } from "./flopWindow.js";
import { assessCallControlReadiness } from "./callControlRead.js";

/** Dependent diagnostic only. The existing reducer/closed hand243 prefix owns
 * identity, actor, street, reset and capacity. Neither UI nor later acceptance
 * creates this cost fact, renews its deadline or supplies live permission. */
export function flopCallEvidence(read: LiveTableRead, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null, epoch: string) {
  const source = timeline?.sourceStatus, proof = source?.flopObservationProof;
  const w = proof?.witness, id = source?.identity, chain = proof?.continuity;
  const now = Date.now();
  if (!epoch || !timeline || !source?.connected || !proof || !w || !id || !chain ||
      proof.version !== 1 || proof.scope !== "flop_hero_activation" ||
      !matchesFlopCallContract(w) || proof.accounting?.scope !== "hand243_contribution_prefix" ||
      proof.historyComplete !== false || proof.liveRecommendationsAllowed !== false ||
      !Number.isSafeInteger(now) || now < proof.activation.receivedAt || now >= proof.expiresAt ||
      proof.expiresAt !== proof.activation.receivedAt + 10_000 ||
      w.receivedAt !== proof.activation.receivedAt || w.cursor !== proof.activation.cursor ||
      proof.activation.playerId !== w.heroId || proof.transition.to !== "flop" ||
      id.tableId !== w.tableId || id.handId !== w.handId || id.handNumber !== w.handNumber ||
      id.heroPlayerId !== w.heroId || id.frameCursor !== proof.anchor.cursor || id.chainGap ||
      timeline.current.handId !== `${w.tableId}:hand:${w.handId}` || timeline.current.handNumber !== w.handNumber ||
      chain.status !== "validated_prefix" || chain.generation !== w.generation || chain.tableId !== w.tableId ||
      chain.handId !== w.handId || chain.cursor !== w.cursor || chain.throughSequence !== proof.activation.sequence ||
      chain.throughSequence <= chain.baselineSequence ||
      timeline.current.coverage.issues.some(i => i.code === "metadata_gap" || i.code === "identity_conflict")) return null;
  const rows = proof.accounting.flop.contributions;
  const hero = rows.find(p => p.playerId === w.heroId);
  if (!hero || hero.seat !== w.heroSeat || hero.position !== "HJ" || rows.length !== 6 ||
      new Set(rows.map(p => p.playerId)).size !== 6 || rows.some(p =>
        !w.players.some(original => original.playerId === p.playerId && original.seat === p.seat && original.position === p.position) ||
        !Number.isSafeInteger(p.streetTotalChips) || p.streetTotalChips < 0 ||
        !Number.isSafeInteger(p.remainingCapacityChips) || p.remainingCapacityChips < 0 ||
        p.streetTotalChips !== proof.contributions[p.playerId] ||
        p.remainingCapacityChips !== proof.transition.observedStacks[p.playerId]! - p.streetTotalChips)) return null;
  const highest = Math.max(...rows.filter(p => p.playerId !== w.heroId).map(p => p.streetTotalChips));
  const gap = highest - hero.streetTotalChips, remaining = hero.remainingCapacityChips;
  if (highest !== 2 || hero.streetTotalChips !== 0 || gap !== 2 || remaining < gap || remaining !== 254) return null;
  const provenance = "Hand243 validated source prefix through HJ flop activation: explicit zero reset, " +
    "SB/BB/UTG totals2, HJ total0, collected ordinary HJ stack254 unchanged through activation. " +
    "Payable cost if CALL is authorized is2; no pot, UI or historical acceptance supplies this arithmetic.";
  const ui = assessCallControlReadiness(read.callControl ?? null, gap, proof.activation.receivedAt, now);
  // A synchronous DOM agreement is only a readiness cross-check. The recorded
  // screenshot has no such receipt; tests must label their DOM reads simulated.
  const state = assessment.state, seats = state?.seats.filter(s => s.isOccupied) ?? [];
  const card = (c: { rank: number; suit: string }) => `${"23456789TJQKA"[c.rank - 2]}${c.suit}`;
  const domHero = seats.find(s => s.isYou);
  const domMatches = !!state && state.street === "flop" &&
    JSON.stringify(state.board.map(card)) === JSON.stringify(proof.transition.board) &&
    JSON.stringify(domHero?.holeCards.map(card).sort()) === JSON.stringify([...w.heroCards].sort()) &&
    assessment.smallBlind === w.smallBlind && assessment.bigBlind === w.bigBlind &&
    (assessment.amountToCall === null || assessment.amountToCall === gap) &&
    read.context.dealerSeatNumber === w.players.find(p => p.position === "BTN")?.seat &&
    !read.context.readErrors.length && timeline.current.seatMapping.status !== "invalid" &&
    !timeline.current.seatMapping.entries.some(e => !w.players.some(p => p.playerId === e.playerId && p.seat === e.seat)) &&
    seats.length === 6 && new Set(seats.map(s => s.seatNumber)).size === 6 &&
    seats.filter(s => s.isYou).length === 1 && seats.filter(s => s.isCurrentToAct).length === 1 &&
    rows.every(p => {
      const s = seats.find(s => s.seatNumber === p.seat);
      return !!s && !s.isFolded && !s.isAllIn && !s.isOffline && !s.isSettling && !s.betReadError &&
        s.isYou === (p.playerId === w.heroId) && s.isCurrentToAct === (p.playerId === w.heroId) &&
        assessment.positions.get(p.seat) === p.position && s.stack === p.remainingCapacityChips &&
        (s.currentBet === null ? p.streetTotalChips === 0 : s.currentBet === p.streetTotalChips);
    });
  if (!domMatches) {
    ui.status = !state || read.context.readErrors.length ? "unusable" : "contradicted";
    ui.reasons.push("Current DOM identity/actor, street/cards, contributions or capacity is unavailable or does not match the source opportunity; no matching UI readiness.");
  }
  return {
    version: 1 as const, scope: "hand243_hj_flop_call2_cost" as const,
    binding: { decisionEpoch: epoch, tableId: w.tableId, handId: w.handId, handNumber: w.handNumber,
      heroId: w.heroId, heroSeat: w.heroSeat, heroCards: [...w.heroCards], board: [...proof.transition.board],
      street: "flop" as const, generation: w.generation, cursor: w.cursor,
      activationSequence: proof.activation.sequence, receivedAt: proof.activation.receivedAt, expiresAt: proof.expiresAt },
    actor: { playerId: w.heroId, seat: w.heroSeat, position: "HJ" as const },
    facts: { units: "chips" as const, highestContributionChips: highest, priorContributionChips: hero.streetTotalChips,
      contributionGapChips: gap, remainingCapacityChips: remaining, capacitySufficient: true,
      resultingContributionIfCalledChips: hero.streetTotalChips + gap, remainingCapacityIfCalledChips: remaining - gap },
    payableIfCallAuthorizedChips: provenFact(gap, provenance),
    ui,
    serverLegality: unknownFact<boolean>("Historical hand243 CALL2 acceptance is recorded separately, after the original deadline. No captured within-window source/DOM/control binding establishes live permission."),
    permission: null, fullActionSetCertified: false as const, historyComplete: false as const,
    liveRecommendationsAllowed: false as const,
  };
}
