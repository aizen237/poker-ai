import { z } from "zod";
import { getPreflopOpeningReference } from "@poker-ai/range-engine";
import type { DecisionPacket } from "./decisionPacket.js";

const position = z.enum(["UTG", "HJ", "CO", "BTN", "SB", "BB"]);
const chips = z.number().finite().nonnegative();
const wager = z.enum(["bet", "raise", "call"]);
const player = z.object({
  seat: z.number().int().positive(), position: position.nullable(),
  remainingStackBB: chips.nullable(), contributionBB: chips.nullable(),
  folded: z.boolean(), allIn: z.boolean(),
});
const action = z.object({
  seat: z.number().int().positive(),
  action: z.enum(["post_blind", "check", "call", "bet", "raise", "fold", "all-in"]),
  totalContributionBB: chips.nullable(), observation: z.number().int().nonnegative(),
  wagerAction: wager.nullable(),
});

export const PreflopInputSchema = z.object({
  heroSeat: z.number().int().positive(), players: z.array(player).min(2),
  /** Seats dealt into this hand, not just opponents still active. Null if unverified. */
  playersDealtIn: z.number().int().min(2).max(10).nullable(),
  potBB: chips.nullable(), amountToCallBB: chips.nullable(),
  contributionMeaning: z.enum(["street_total", "increment", "unknown"]),
  historyCoverage: z.enum(["complete", "partial"]),
  actions: z.array(action), historyNotes: z.array(z.string()),
  tournamentContext: z.enum(["chip_ev_only", "unknown"]),
});
export type PreflopInput = z.infer<typeof PreflopInputSchema>;

const situation = z.enum(["unopened", "limped_pot", "facing_open", "facing_open_and_callers", "facing_3bet", "facing_4bet_or_more", "facing_raise_unknown_level", "unknown"]);
export const PreflopContextSchema = PreflopInputSchema.extend({
  situation,
  heroPosition: position.nullable(), heroStackBB: chips.nullable(),
  activeOpponents: z.number().int().nonnegative(),
  blindDefending: z.boolean().nullable(),
  raiseToBB: chips.nullable(), lastAggressorSeat: z.number().int().positive().nullable(),
  effectiveStackBB: chips.nullable(),
  effectiveStacks: z.array(z.object({ seat: z.number().int().positive(), effectiveStackBB: chips.nullable() })),
  shortStack: z.boolean().nullable(),
  pushFold: z.enum(["not_applicable", "not_established", "requires_calling_model"]),
  openingReference: z.object({ applicable: z.boolean(), hands: z.array(z.string()) }),
  decisionSupport: z.enum(["ai_judgment", "uncertain"]),
  reasons: z.array(z.string()),
});
export type PreflopContext = z.infer<typeof PreflopContextSchema>;

/** Organizes facts and model coverage; it never chooses CALL based on hand strength. */
export function buildPreflopContext(value: PreflopInput): PreflopContext {
  const input = PreflopInputSchema.parse(value);
  const heroes = input.players.filter((p) => p.seat === input.heroSeat);
  if (heroes.length !== 1 || new Set(input.players.map((p) => p.seat)).size !== input.players.length) throw new Error("Preflop seats must be unique and include hero");
  const hero = heroes[0]!;
  const opponents = input.players.filter((p) => !p.folded && p.seat !== input.heroSeat);
  const reasons = [...input.historyNotes];
  const totalsKnown = input.contributionMeaning === "street_total" && input.players.filter((p) => !p.folded).every((p) => p.contributionBB !== null);
  if (!totalsKnown) reasons.push("Wager values are not verified street totals; a displayed 15BB cannot be assumed to mean raise-to 15BB.");
  if (input.historyCoverage === "partial") reasons.push("History is partial (including potentially missing hero actions); do not infer open/3-bet level from size alone.");
  const events = [...input.actions].sort((a, b) => a.observation - b.observation);
  const voluntary = events.filter((a) => a.action !== "post_blind");
  const orderKnown = new Set(voluntary.map((a) => a.observation)).size === voluntary.length;
  if (!orderKnown) reasons.push("Several actions share an observation; their order is unknown.");
  const eventSeatsKnown = events.every((a) => input.players.some((p) => p.seat === a.seat));
  if (!eventSeatsKnown) reasons.push("History includes an unidentified seat.");
  const unknownAllIn = events.some((a) => a.action === "all-in" && a.wagerAction === null);
  if (unknownAllIn) reasons.push("An all-in label has no known underlying wager action.");
  const raised = events.filter((a) => a.action === "raise" || a.action === "bet" || (a.action === "all-in" && (a.wagerAction === "raise" || a.wagerAction === "bet")));
  const lastRaise = raised.at(-1);
  const highest = totalsKnown ? Math.max(1, ...input.players.filter((p) => !p.folded).map((p) => p.contributionBB!)) : null;
  const raiseToBB = highest !== null && highest > 1 ? highest : null;
  const expectedCall = totalsKnown ? Math.max(0, Math.max(0, ...opponents.map((p) => p.contributionBB!)) - hero.contributionBB!) : null;
  const callConsistent = input.amountToCallBB !== null && expectedCall !== null && Math.abs(expectedCall - input.amountToCallBB) < 1e-8;
  if (!callConsistent) reasons.push("Call amount is unknown or disagrees with observed street totals.");
  const historyConsistent = raised.every((a, index) => a.totalContributionBB !== null && a.totalContributionBB > (index === 0 ? 1 : raised[index - 1]!.totalContributionBB ?? Infinity)) &&
    (raised.length === 0 ? highest === 1 : lastRaise?.totalContributionBB === highest);
  if (!historyConsistent) reasons.push("Observed wager totals do not establish a consistent full raise sequence.");
  let previousTotal = 1;
  let minimumRaise = 1;
  const fullRaises = raised.every(a => {
    if (a.totalContributionBB === null) return false;
    const increment = a.totalContributionBB - previousTotal;
    previousTotal = a.totalContributionBB;
    if (increment < minimumRaise) return false;
    minimumRaise = increment;
    return true;
  });
  if (!fullRaises) reasons.push("A short/incomplete raise may not reopen betting; full raise level is unresolved.");
  const complete = fullRaises && input.historyCoverage === "complete" && orderKnown && eventSeatsKnown && !unknownAllIn && totalsKnown && callConsistent && historyConsistent;
  let classified: PreflopContext["situation"] = raiseToBB !== null && (input.amountToCallBB ?? 0) > 0 ? "facing_raise_unknown_level" : "unknown";
  if (complete) {
    if (raised.length === 0) {
      classified = voluntary.some((a) => a.action === "call" || a.wagerAction === "call") ? "limped_pot" : "unopened";
    } else if (lastRaise?.seat !== input.heroSeat && (input.amountToCallBB ?? 0) > 0) {
      if (raised.length === 1) {
        classified = voluntary.some((a) => a.observation > lastRaise!.observation && (a.action === "call" || a.wagerAction === "call")) ? "facing_open_and_callers" : "facing_open";
      } else classified = raised.length === 2 ? "facing_3bet" : "facing_4bet_or_more";
    }
  }
  // Remaining chips plus known current-street commitments, excluding unknown antes.
  // No single minimum over multiple opponents pretends to solve side-pot exposure.
  const heroTotal = totalsKnown && hero.remainingStackBB !== null ? hero.remainingStackBB + hero.contributionBB! : null;
  const effectiveStacks = opponents.map((opponent) => ({
    seat: opponent.seat,
    effectiveStackBB: heroTotal !== null && opponent.remainingStackBB !== null && opponent.contributionBB !== null
      ? Math.min(heroTotal, opponent.remainingStackBB + opponent.contributionBB) : null,
  }));
  const effectiveStackBB = opponents.length === 1 ? effectiveStacks[0]!.effectiveStackBB : null;
  const allStacksKnown = effectiveStacks.length > 0 && effectiveStacks.every((p) => p.effectiveStackBB !== null);
  if (!allStacksKnown) reasons.push("Effective stack is unknown for at least one opponent; All In text is not numeric zero.");
  if (opponents.length > 1) reasons.push("Effective stacks are pairwise; multiway calling/side-pot strategy is not modeled.");
  if (hero.position === null || opponents.some((p) => p.position === null)) reasons.push("One or more active positions are unknown.");
  if (input.potBB === null) reasons.push("Decision pot is unverified.");
  if (input.tournamentContext === "unknown") reasons.push("Antes, payouts, ICM, bounties, and tournament risk adjustments are unknown.");
  const minimumEffective = allStacksKnown ? Math.min(...effectiveStacks.map((p) => p.effectiveStackBB!)) : null;
  const reference = getPreflopOpeningReference({ position: hero.position, effectiveStackBB: minimumEffective, playersDealtIn: input.playersDealtIn ?? 0, unopened: classified === "unopened" });
  const shortStack = heroTotal === null ? null : heroTotal <= 20;
  // <=10BB is only a conservative candidate screen, not a push/fold chart.
  const pushFold: PreflopContext["pushFold"] = !complete || heroTotal === null ? "not_established"
    : classified === "unopened" && opponents.length === 1 && hero.position === "SB" && opponents[0]?.position === "BB" && effectiveStackBB !== null && effectiveStackBB <= 10
      ? "requires_calling_model" : "not_applicable";
  if (pushFold === "requires_calling_model") reasons.push("Possible short-stack blind-vs-blind shove study only; a caller range, explicit fold-equity assumption, and correct commitment model are still required.");
  if (reference === null) reasons.push("No applicable strategic response model: 100BB+ six-max RFI charts are not defending, calling, 3-bet, 4-bet, or tournament short-stack charts.");
  const decisionSupport = reference !== null && complete && input.potBB !== null && !hero.folded && !hero.allIn && hero.remainingStackBB !== null && hero.remainingStackBB > 0 &&
    opponents.every((p) => p.position !== null && !p.allIn) && input.tournamentContext === "chip_ev_only" ? "ai_judgment" : "uncertain";
  return PreflopContextSchema.parse({
    ...input, situation: classified, heroPosition: hero.position, heroStackBB: hero.remainingStackBB,
    activeOpponents: opponents.length,
    blindDefending: classified === "unopened" || classified === "limped_pot" ? false : raiseToBB === null || input.amountToCallBB === null || hero.position === null ? null : (hero.position === "SB" || hero.position === "BB") && input.amountToCallBB > 0,
    raiseToBB, lastAggressorSeat: complete ? lastRaise?.seat ?? null : null,
    effectiveStackBB, effectiveStacks, shortStack, pushFold,
    openingReference: { applicable: reference !== null, hands: reference ? [...reference.keys()] : [] }, decisionSupport, reasons,
  });
}

/** Missing/unsupported context returns uncertainty, never a fabricated poker action. */
export function preflopUncertainty(packet: DecisionPacket): string[] | null {
  if (packet.table.street !== "preflop") return null;
  if (!packet.preflop) return ["Structured preflop context is missing."];
  if (packet.dataConfidence === "low") return ["Decision-critical table data is unreliable.", ...packet.preflop.reasons];
  return packet.preflop.decisionSupport === "uncertain" ? ["Insufficient strategic model / uncertain.", ...packet.preflop.reasons] : null;
}

export function preflopPromptLines(packet: DecisionPacket): string[] {
  if (packet.table.street !== "preflop") return [];
  return [
    `Structured preflop context: ${JSON.stringify(packet.preflop ?? null)}`,
    "Hand strength alone never establishes a call: use raiser/hero positions, raise-to versus incremental amounts, prior action, effective stacks, and player count.",
    "Opening references are 100BB+ six-max raise-first-in only. They are not BB defense, calling, or short-stack tournament ranges. No shove/fold rule follows from <=20BB.",
    "Random-hand equity is not equity against a caller range. No fold-equity probability is supplied as a fact. Respect every uncertainty; do not invent missing ranges or ICM data.",
  ];
}
