import type { TimelineEvent } from "./handTimeline.js";
import type { ContributionLedger } from "./legalityProof.js";

export interface AccountingObservation {
  eventId: string;
  handId: string;
  kind: "uncalled_return" | "pot_award";
  playerId: string | null;
  seat: number | null;
  amount: number | null;
  status: "mapped_observation" | "unresolved";
  reasons: string[];
  provenance: {
    source: TimelineEvent["source"];
    text: string;
    sourceTimestamp: number | null;
    sourceTimestampRaw: number | string | null;
    seatMappingEventId: string | null;
  };
  /** Conditional arithmetic only. No live contribution/pot is changed by this observation. */
  effectIfIndependentlyComplete: { grossCommittedDelta: 0; returnedUncalledDelta: number; netCommittedDelta: number; potAwardsDelta: number } | null;
}
export interface AccountingTotals {
  grossCommitted: number;
  returnedUncalled: number;
  netCommitted: number;
  potAwards: number;
  foldedDeadMoney: number;
  outstandingPot: number;
}
export interface ObservedHandAccounting {
  status: "incomplete";
  totals: null;
  adjustments: AccountingObservation[];
  reasons: string[];
}

/** Pure rebuild from deduplicated retained events; never maintains additive live totals. */
export function observedHandAccounting(handId: string, events: readonly TimelineEvent[], droppedEvents = 0): ObservedHandAccounting {
  const adjustments: AccountingObservation[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    if ((e.action !== "uncalled_return" && e.action !== "settlement") || seen.has(e.id)) continue;
    seen.add(e.id);
    const reasons: string[] = [];
    if (e.source !== "pokernow_log_v3") reasons.push("Not a source-reported log adjustment.");
    if (!e.actor?.playerId || e.actor.seat === null || !e.actorSeatMappingEventId) reasons.push("Player ID has no valid preceding per-hand seat mapping.");
    if (e.order !== "timestamp_candidate") reasons.push("Timestamp order is ambiguous; duplicate/tied adjustments need independent resolution.");
    if (e.amount === null || !Number.isFinite(e.amount) || e.amount <= 0 || e.amount > Number.MAX_SAFE_INTEGER) reasons.push("Adjustment amount is invalid.");
    const returned = e.action === "uncalled_return";
    adjustments.push({ eventId: e.id, handId, kind: returned ? "uncalled_return" : "pot_award",
      playerId: e.actor?.playerId ?? null, seat: e.actor?.seat ?? null, amount: e.amount,
      status: reasons.length ? "unresolved" : "mapped_observation", reasons,
      provenance: { source: e.source, text: e.evidence, sourceTimestamp: e.sourceTimestamp,
        sourceTimestampRaw: e.sourceTimestampRaw, seatMappingEventId: e.actorSeatMappingEventId },
      effectIfIndependentlyComplete: reasons.length ? null : { grossCommittedDelta: 0,
        returnedUncalledDelta: returned ? e.amount! : 0, netCommittedDelta: returned ? -e.amount! : 0,
        potAwardsDelta: returned ? 0 : e.amount! } });
  }
  return { status: "incomplete", totals: null, adjustments, reasons: [
    "Live timeline is incomplete; gross/net commitments, total returns, awards and folded dead money cannot be certified.",
    "Log wager amount semantics/chip units are not a complete contribution ledger. Adjustment effects are conditional, not applied to live pots.",
    ...(droppedEvents ? ["Timeline truncation: adjustment observations may also be missing."] : []),
    ...(events.some(e => e.action === "unparsed") ? ["Unparsed source rows may contain additional accounting events."] : []),
  ] };
}

export interface GrossHandLedger extends Omit<ContributionLedger, "players"> {
  handId: string;
  /** Mandatory: callers must not supply contributions already reduced by returns. */
  contributionBasis: "gross_before_returns";
  players: Array<{ playerId: string; seat: number; grossCommitted: number; netStreetContribution: number; folded: boolean }>;
  /** Independently certified complete adjustments for the same hand, not just the live subset. */
  adjustments: AccountingObservation[];
}
export interface HandAccountingResult {
  status: "proven" | "unknown";
  source: string;
  reasons: string[];
  players: Array<{ playerId: string; seat: number; grossCommitted: number; returnedUncalled: number;
    netCommitted: number; netStreetContribution: number; potAwards: number; foldedDeadMoney: number; folded: boolean }>;
  totals: AccountingTotals | null;
  adjustmentEventIds: string[];
  /** Only before awards. Existing contestable-pot proof consumes these NET rows unchanged. */
  potLedger: ContributionLedger | null;
}

/** Offline/independent evidence arithmetic; the live adapter never calls this function. */
export function reconcileCompleteHandAccounting(input: GrossHandLedger): HandAccountingResult {
  const fail = (reason: string): HandAccountingResult => ({ status: "unknown", source: input.source,
    reasons: [reason], players: [], totals: null, adjustmentEventIds: [], potLedger: null });
  if (input.coverage !== "complete_hand" || !input.source.trim() || !input.handId.trim() || !input.noRakeOrDropVerified) return fail("Complete hand adjustments, gross contributions and no-rake evidence must be independently supplied.");
  if (input.contributionBasis !== "gross_before_returns") return fail("Contribution basis must explicitly be gross_before_returns; already-net values must not be reduced again.");
  const unit = input.chipUnit;
  const onGrid = (n: number) => Number.isFinite(n) && n >= 0 && Number.isSafeInteger(Math.round(n / unit)) && Math.abs(n / unit - Math.round(n / unit)) < 1e-8;
  if (!Number.isFinite(unit) || unit <= 0 || ![input.heroRemainingStack, input.collectedMainPot, input.displayedTotalPot].every(onGrid)) return fail("Invalid independently verified chip unit or displayed amounts.");
  if (!input.players.length || input.players.length > 10 || input.adjustments.length > 2000 ||
      new Set(input.players.map(p => p.playerId)).size !== input.players.length || new Set(input.players.map(p => p.seat)).size !== input.players.length ||
      input.players.some(p => !/^[A-Za-z0-9_-]{1,160}$/.test(p.playerId) || !Number.isInteger(p.seat) || p.seat < 1 || p.seat > 10 || typeof p.folded !== "boolean" || !onGrid(p.grossCommitted) || !onGrid(p.netStreetContribution))) return fail("Invalid/ambiguous complete roster or gross contributions.");
  const units = (n: number) => Math.round(n / unit);
  const players = input.players.map(p => ({ ...p, grossCommitted: units(p.grossCommitted), netStreetContribution: units(p.netStreetContribution), returnedUncalled: 0, potAwards: 0 }));
  const seen = new Map<string, string>();
  for (const adjustment of input.adjustments) {
    const signature = JSON.stringify(adjustment);
    if (seen.has(adjustment.eventId)) {
      if (seen.get(adjustment.eventId) !== signature) return fail("Conflicting duplicate accounting event ID.");
      continue;
    }
    seen.set(adjustment.eventId, signature);
    const player = players.find(p => p.playerId === adjustment.playerId);
    if (!adjustment.eventId || adjustment.handId !== input.handId || adjustment.status !== "mapped_observation" || adjustment.reasons.length ||
        adjustment.provenance.source !== "pokernow_log_v3" || !adjustment.provenance.text || !adjustment.provenance.seatMappingEventId ||
        !player || player.seat !== adjustment.seat || adjustment.amount === null || !onGrid(adjustment.amount) || adjustment.amount <= 0) return fail("Unresolved, cross-hand or invalid accounting adjustment; player ID and seat evidence are required.");
    if (adjustment.kind === "uncalled_return") player.returnedUncalled += units(adjustment.amount);
    else if (adjustment.kind === "pot_award") player.potAwards += units(adjustment.amount);
    else return fail("Unsupported accounting adjustment.");
  }
  if (players.some(p => !Number.isSafeInteger(p.returnedUncalled) || !Number.isSafeInteger(p.potAwards) || p.returnedUncalled > p.grossCommitted || p.netStreetContribution > p.grossCommitted - p.returnedUncalled || (p.folded && p.potAwards > 0))) return fail("Returns, net street contributions or awards contradict the complete ledger.");
  const sum = (select: (p: typeof players[number]) => number) => players.reduce((n, p) => n + select(p), 0);
  const gross = sum(p => p.grossCommitted), returned = sum(p => p.returnedUncalled), awards = sum(p => p.potAwards);
  const net = gross - returned, street = sum(p => p.netStreetContribution), outstanding = net - awards;
  if (![gross, returned, awards, net, street, outstanding].every(n => Number.isSafeInteger(n) && n >= 0) ||
      outstanding !== units(input.displayedTotalPot) || outstanding - street !== units(input.collectedMainPot)) return fail("Net commitments minus awards do not reconcile with independently supplied pot displays.");
  const outputPlayers = players.map(p => ({ playerId: p.playerId, seat: p.seat, grossCommitted: p.grossCommitted * unit,
    returnedUncalled: p.returnedUncalled * unit, netCommitted: (p.grossCommitted - p.returnedUncalled) * unit,
    netStreetContribution: p.netStreetContribution * unit, potAwards: p.potAwards * unit,
    foldedDeadMoney: p.folded ? (p.grossCommitted - p.returnedUncalled) * unit : 0, folded: p.folded }));
  return { status: "proven", source: input.source,
    reasons: awards ? ["Awards have started; accounting is historical and no decision-pot ledger is emitted."] : [],
    players: outputPlayers, adjustmentEventIds: [...seen.keys()],
    totals: { grossCommitted: gross * unit, returnedUncalled: returned * unit, netCommitted: net * unit, potAwards: awards * unit,
      foldedDeadMoney: sum(p => p.folded ? p.grossCommitted - p.returnedUncalled : 0) * unit, outstandingPot: outstanding * unit },
    potLedger: awards ? null : { source: `${input.source}; gross minus distinct explicit returns once`, coverage: input.coverage,
      noRakeOrDropVerified: input.noRakeOrDropVerified, chipUnit: unit, heroSeat: input.heroSeat,
      heroRemainingStack: input.heroRemainingStack, collectedMainPot: input.collectedMainPot, displayedTotalPot: input.displayedTotalPot,
      players: outputPlayers.map(p => ({ seat: p.seat, committed: p.netCommitted, streetContribution: p.netStreetContribution, folded: p.folded })) },
  };
}
