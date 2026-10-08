/** Proofs are arithmetic under explicit evidence, never inferred from selected UI sizes. */
export interface ProvenFact<T> {
  value: T | null;
  status: "proven" | "unknown";
  confidence: "high" | "low";
  source: string;
  reasons: string[];
}
const known = <T>(value: T, source: string): ProvenFact<T> => ({ value, status: "proven", confidence: "high", source, reasons: [] });
const unknown = <T>(reason: string): ProvenFact<T> => ({ value: null, status: "unknown", confidence: "low", source: "insufficient evidence", reasons: [reason] });
export { known as provenFact, unknown as unknownFact };

export interface BettingEvent {
  sequence: number;
  seat: number;
  action: "check" | "fold" | "wager";
  /** Total street contribution, including chips already in front of this player. */
  raiseTo: number;
  allIn: boolean;
}
export interface BettingProofInput {
  source: string;
  /** Must include hero actions, forced posts, and every event from street start. */
  coverage: "complete_ordered" | "snapshot_inferred";
  /** Independently established NL full-bet reopening rules; not a UI selection. */
  rulesVerified: boolean;
  rulesSource: string;
  street: "preflop" | "flop" | "turn" | "river";
  bigBlind: number;
  chipUnit: number;
  heroSeat: number;
  players: Array<{ seat: number; contribution: number; remainingStack: number }>;
  events: BettingEvent[];
}
export interface BettingProof {
  lastFullRaiseAmount: ProvenFact<number>;
  fullMinimumRaiseTo: ProvenFact<number>;
  /** Null with proven status means no legal stack-capped under-raise exists. */
  stackCappedUnderRaiseTo: ProvenFact<number | null>;
  actionReopened: ProvenFact<boolean>;
}
export function unknownBettingProof(reason: string): BettingProof {
  return { lastFullRaiseAmount: unknown(reason), fullMinimumRaiseTo: unknown(reason),
    stackCappedUnderRaiseTo: unknown(reason), actionReopened: unknown(reason) };
}
const valid = (n: number) => Number.isFinite(n) && n >= 0;
const onGrid = (n: number, unit: number) => valid(n) && Number.isSafeInteger(Math.round(n / unit)) && Math.abs(n / unit - Math.round(n / unit)) < 1e-8;

/** Replays a certified complete street. Snapshot histories must never be upgraded to this input. */
export function proveBettingLegality(input: BettingProofInput): BettingProof {
  const fail = unknownBettingProof;
  if (input.coverage !== "complete_ordered") return fail("Ordered street history is incomplete; hero actions or intervening raises may be missing.");
  if (!input.source.trim() || !input.rulesVerified || !input.rulesSource.trim()) return fail("No independently verified no-limit rule profile/source.");
  if (!valid(input.chipUnit) || input.chipUnit === 0 || !onGrid(input.bigBlind, input.chipUnit) || input.bigBlind === 0) return fail("Blind/chip unit is unknown or invalid.");
  if (input.players.length < 2 || new Set(input.players.map(p => p.seat)).size !== input.players.length ||
    input.players.some(p => !Number.isInteger(p.seat) || p.seat < 1 || !onGrid(p.contribution, input.chipUnit) || !onGrid(p.remainingStack, input.chipUnit))) return fail("Invalid or ambiguous starting roster/contributions/stacks.");
  // Work in integer chip units to avoid floating-point thresholds in reopening rules.
  const units = (n: number) => Math.round(n / input.chipUnit);
  const bb = units(input.bigBlind);
  const players = new Map(input.players.map(p => [p.seat, { total: units(p.contribution), stack: units(p.remainingStack), folded: false }]));
  const hero = players.get(input.heroSeat);
  if (!hero) return fail("Hero is absent from the street baseline.");
  let highest = Math.max(...[...players.values()].map(p => p.total));
  if ((input.street !== "preflop" && highest !== 0) || (input.street === "preflop" && highest !== bb)) return fail("Street baseline is not verified ordinary blinds/zero postflop contributions; straddles and short blinds are unsupported.");
  let lastFull = bb;
  const acted = new Map<number, { total: number; increment: number }>();
  const reopened = (seat: number) => {
    const prior = acted.get(seat);
    return !prior || highest - prior.total >= prior.increment;
  };
  let sequence = -1;
  for (const event of input.events) {
    const player = players.get(event.seat);
    if (!Number.isInteger(event.sequence) || event.sequence <= sequence || !player || player.folded || player.stack === 0 || !onGrid(event.raiseTo, input.chipUnit)) return fail("Unordered/ambiguous event or invalid actor/amount.");
    sequence = event.sequence;
    const total = units(event.raiseTo);
    const addition = total - player.total;
    if (event.action === "fold" || event.action === "check") {
      if (addition !== 0 || event.allIn || (event.action === "check" && player.total !== highest)) return fail("Check/fold contradicts the contribution ledger.");
      if (event.action === "fold") player.folded = true;
    } else {
      if (addition <= 0 || addition > player.stack || event.allIn !== (addition === player.stack)) return fail("Wager/all-in contradicts independently known remaining chips.");
      if (total < highest && !event.allIn) return fail("Incomplete call without an all-in.");
      if (total > highest) {
        if (!reopened(event.seat)) return fail("Raise attempted without reopened action.");
        if (![...players.entries()].some(([seat, p]) => seat !== event.seat && !p.folded && p.stack > 0)) return fail("No opponent has chips to respond to aggression.");
        const increment = total - highest;
        // Short opening bets have additional completion/reopening nuances; abstain in V1.
        if (highest === 0 && increment < bb) return fail("Short all-in opening bet is outside this verified rule subset.");
        if (increment < lastFull && !event.allIn) return fail("Subminimum raise is not all-in.");
        if (increment >= lastFull) lastFull = increment;
        highest = total;
      }
      player.stack -= addition;
      player.total = total;
    }
    acted.set(event.seat, { total: highest, increment: lastFull });
  }
  const source = `${input.source}; ${input.rulesSource}; complete ordered ${input.street} replay`;
  const rights = !hero.folded && hero.stack > 0 && reopened(input.heroSeat);
  const maximum = hero.total + hero.stack;
  const canRespond = [...players.entries()].some(([seat, p]) => seat !== input.heroSeat && !p.folded && p.stack > 0);
  return {
    lastFullRaiseAmount: known(lastFull * input.chipUnit, source),
    fullMinimumRaiseTo: highest > 0 ? known((highest + lastFull) * input.chipUnit, source) : unknown("No outstanding wager: this is a bet, not a raise."),
    stackCappedUnderRaiseTo: known(rights && canRespond && highest > 0 && maximum > highest && maximum < highest + lastFull ? maximum * input.chipUnit : null, source),
    actionReopened: known(rights, source),
  };
}

export interface ContributionLedger {
  source: string;
  coverage: "complete_hand" | "snapshot_only";
  /** Net outstanding contributions, after any returns, with rake independently excluded. */
  noRakeOrDropVerified: boolean;
  chipUnit: number;
  heroSeat: number;
  heroRemainingStack: number;
  collectedMainPot: number;
  displayedTotalPot: number;
  players: Array<{ seat: number; committed: number; streetContribution: number; folded: boolean }>;
}
export interface PotLayer { amount: number; eligibleSeats: number[]; heroEligible: boolean }
export interface ContestablePotProof {
  /** EV input BEFORE hero's contemplated call, excluding opponent-only pots/uncalled excess. */
  contestablePotBeforeCall: ProvenFact<number>;
  contestablePotAfterCall: ProvenFact<number>;
  callCost: ProvenFact<number>;
  pots: PotLayer[];
  uncalledReturns: Array<{ seat: number; amount: number }>;
}
export function unknownContestablePot(reason: string): ContestablePotProof {
  return { contestablePotBeforeCall: unknown(reason), contestablePotAfterCall: unknown(reason), callCost: unknown(reason), pots: [], uncalledReturns: [] };
}

/** Builds eligibility layers after hero calls; does not assume other players will call. */
export function proveContestablePot(input: ContributionLedger): ContestablePotProof {
  const fail = unknownContestablePot;
  if (input.coverage !== "complete_hand" || !input.source.trim() || !input.noRakeOrDropVerified) return fail("Whole-hand net contributions, returns and no-rake accounting are not independently verified.");
  if (!valid(input.chipUnit) || input.chipUnit === 0 || ![input.heroRemainingStack, input.collectedMainPot, input.displayedTotalPot,
    ...input.players.flatMap(p => [p.committed, p.streetContribution])].every(n => onGrid(n, input.chipUnit)) ||
    new Set(input.players.map(p => p.seat)).size !== input.players.length || input.players.some(p => !Number.isInteger(p.seat) || p.seat < 1 || p.committed < p.streetContribution)) return fail("Invalid/ambiguous contribution ledger or chip unit.");
  const units = (n: number) => Math.round(n / input.chipUnit);
  const rows = input.players.map(p => ({ ...p, committed: units(p.committed), streetContribution: units(p.streetContribution) }));
  const hero = rows.find(p => p.seat === input.heroSeat);
  const opponents = rows.filter(p => !p.folded && p.seat !== input.heroSeat);
  if (!hero || hero.folded || opponents.length === 0) return fail("No eligible hero/opponent contest.");
  const total = rows.reduce((sum, p) => sum + p.committed, 0);
  const street = rows.reduce((sum, p) => sum + p.streetContribution, 0);
  if (total !== units(input.displayedTotalPot) || total - street !== units(input.collectedMainPot)) return fail("Whole-hand ledger does not reconcile with collected and displayed totals.");
  const cost = Math.min(units(input.heroRemainingStack), Math.max(0, Math.max(...opponents.map(p => p.streetContribution)) - hero.streetContribution));
  hero.committed += cost;
  const levels = [...new Set(rows.map(p => p.committed))].filter(n => n > 0).sort((a, b) => a - b);
  const pots: PotLayer[] = [];
  const uncalledReturns: ContestablePotProof["uncalledReturns"] = [];
  let previous = 0;
  for (const level of levels) {
    const contributors = rows.filter(p => p.committed >= level);
    const amount = (level - previous) * contributors.length * input.chipUnit;
    previous = level;
    if (contributors.length === 1) {
      if (contributors[0]!.folded) return fail("Unmatched folded contribution: ledger requires independently resolved returns.");
      uncalledReturns.push({ seat: contributors[0]!.seat, amount });
      continue;
    }
    const eligibleSeats = contributors.filter(p => !p.folded).map(p => p.seat);
    if (eligibleSeats.length === 0) return fail("Pot layer has no eligible winner; ledger is incomplete.");
    pots.push({ amount, eligibleSeats, heroEligible: eligibleSeats.includes(input.heroSeat) });
  }
  const after = pots.filter(p => p.heroEligible).reduce((sum, p) => sum + p.amount, 0);
  const callCost = cost * input.chipUnit;
  if (after < callCost || uncalledReturns.some(p => p.seat === input.heroSeat)) return fail("Hero call generated unmatched excess; contribution semantics are inconsistent.");
  const source = `${input.source}; reconciled whole-hand layers after hero call; no future opponent calls assumed`;
  return { contestablePotBeforeCall: known(after - callCost, source), contestablePotAfterCall: known(after, source),
    callCost: known(callCost, source), pots, uncalledReturns };
}
