import { z } from "zod";
import { allHandTypes, formatHandType } from "@poker-ai/range-engine";
import type { Card } from "@poker-ai/shared";
import type { DecisionPacket } from "./decisionPacket.js";
import { buildPreflopContext, PreflopInputSchema } from "./preflopContext.js";

export const HJ_RESPONSE_POLICY_VERSION = "hj-vs-utg-2.5bb-reference-v1";
export const HJ_RESPONSE_PROFILE = "pokernow-0.1.72-th-4fun-1-2-exact5-v1";
const positions = ["UTG", "HJ", "CO", "BTN", "SB", "BB"] as const;
const handTypes = new Set(allHandTypes().map(formatHandType));
const text = z.string().trim().min(1).max(2000);
const weight = z.number().finite().min(0).max(1);
const depth = z.number().finite().min(100);
const allocation = z.discriminatedUnion("action", [
  z.object({ action: z.literal("FOLD"), frequency: weight }).strict(),
  z.object({ action: z.literal("CALL"), frequency: weight }).strict(),
  z.object({ action: z.literal("THREE_BET"), frequency: weight,
    raiseToBB: z.number().finite().gt(2.5) }).strict(),
]);

/** Reference IMPORT/REVIEW contract, not a source or legality certificate.
 * Missing hands are uncovered, never implicitly folded. Frequencies and sizes
 * are retained; no normalization, rounding to pure actions, or RNG is applied. */
export const HjResponseReferenceSchema = z.object({
  schemaVersion: z.literal(1), id: text, version: text,
  provenance: z.object({
    kind: z.enum(["verified_reference", "adaptation", "heuristic", "test_fixture"]),
    url: z.string().url(), node: text,
    review: z.enum(["pending", "reviewed"]), reviewNotes: text,
    assumptions: z.array(text).min(1).max(32),
  }).strict(),
  referenceSettings: z.object({
    players: z.literal(6), hero: z.literal("HJ"), opener: z.literal("UTG"),
    openToBB: z.literal(2.5), anteBB: z.literal(0),
    startingCapacitiesBB: z.object({ UTG: depth, HJ: depth, CO: depth, BTN: depth, SB: depth, BB: depth }).strict(),
    // null preserves an unknown source tree; pure FOLD needs no CALL permission.
    rakeDescription: text, coldCallsAllowed: z.boolean().nullable(),
    threeBetSizesBB: z.array(z.number().finite().gt(2.5)).max(8),
  }).strict(),
  application: z.object({
    profile: z.literal(HJ_RESPONSE_PROFILE),
    minCapacityBB: z.number().finite().min(100), maxCapacityBB: z.number().finite().min(100),
    /** Required even for an exact reference: why its rake/tree/depth fits. */
    rationale: text,
  }).strict(),
  entries: z.array(z.object({
    hand: z.string().refine(h => handTypes.has(h), "Expected canonical hand type"),
    allocations: z.array(allocation).min(1).max(10),
  }).strict()).min(1).max(169),
}).strict().superRefine((r, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  const { minCapacityBB: min, maxCapacityBB: max } = r.application;
  if (max < min) issue("Reversed depth coverage.");
  const nativeDepths = Object.values(r.referenceSettings.startingCapacitiesBB);
  if (r.provenance.kind === "verified_reference" &&
      (min !== Math.min(...nativeDepths) || max !== Math.max(...nativeDepths)))
    issue("Depth coverage different from the native stack vector must be explicitly labeled an adaptation.");
  if (new Set(r.entries.map(e => e.hand)).size !== r.entries.length) issue("Duplicate hand entries.");
  if (new Set(r.referenceSettings.threeBetSizesBB).size !== r.referenceSettings.threeBetSizesBB.length)
    issue("Duplicate reference sizes.");
  for (const e of r.entries) {
    if (Math.abs(e.allocations.reduce((sum, a) => sum + a.frequency, 0) - 1) > 1e-9)
      issue(`Frequencies for ${e.hand} must sum to one; do not invent a residual fold frequency.`);
    const keys = e.allocations.map(a => a.action === "THREE_BET" ? `${a.action}:${a.raiseToBB}` : a.action);
    if (new Set(keys).size !== keys.length) issue(`Duplicate action/size for ${e.hand}.`);
    if (e.allocations.some(a => a.action === "CALL" && a.frequency > 0) && !r.referenceSettings.coldCallsAllowed)
      issue("CALL frequencies contradict the reference tree.");
    if (e.allocations.some(a => a.action === "THREE_BET" && !r.referenceSettings.threeBetSizesBB.includes(a.raiseToBB)))
      issue("3-bet entry lacks a documented reference size.");
  }
});
export type HjResponseReference = z.infer<typeof HjResponseReferenceSchema>;
export type HjResponseActionClass = "FOLD" | "CALL" | "THREE_BET";
export interface HjResponseReview {
  policyVersion: typeof HJ_RESPONSE_POLICY_VERSION;
  status: "invalid_context" | "reference_missing" | "invalid_reference" | "out_of_scope" | "uncovered" | "pure" | "mixed";
  hand: string | null;
  strategyClass: HjResponseActionClass | null;
  raiseToBB: number | null;
  allocations: HjResponseReference["entries"][number]["allocations"] | null;
  reference: Pick<HjResponseReference, "id" | "version" | "provenance" | "referenceSettings" | "application"> | null;
  /** A classification is never a selected or legally authorized live action. */
  chosenAction: null; liveAuthorized: false;
  reasons: string[];
}

/** Offline review facility. Supplying a reference here cannot enable live advice.
 * Live uses only the installed reference below, after independent source checks. */
export function reviewHjResponseReference(input: { preflop: unknown; holeCards: unknown }, reference: unknown): HjResponseReview {
  const result: HjResponseReview = { policyVersion: HJ_RESPONSE_POLICY_VERSION, status: "invalid_context",
    hand: null, strategyClass: null, raiseToBB: null, allocations: null, reference: null,
    chosenAction: null, liveAuthorized: false, reasons: [] };
  const fail = (status: HjResponseReview["status"], reason: string) => ({ ...result, status, reasons: [reason] });
  const parsed = PreflopInputSchema.safeParse(input.preflop);
  const cards = z.array(z.object({ rank: z.number().int().min(2).max(14), suit: z.enum(["s", "h", "d", "c"]) }).strict()).length(2).safeParse(input.holeCards);
  if (!parsed.success || !cards.success || new Set(cards.data.map(c => `${c.rank}${c.suit}`)).size !== 2)
    return fail("invalid_context", "Invalid response context/cards.");
  let context;
  try { context = buildPreflopContext(parsed.data); }
  catch { return fail("invalid_context", "Response seats or context are contradictory."); }
  const [a, b] = cards.data as [Card, Card];
  result.hand = formatHandType({ highRank: a.rank >= b.rank ? a.rank : b.rank,
    lowRank: a.rank >= b.rank ? b.rank : a.rank, suited: a.suit === b.suit });
  const utg = context.players.find(p => p.position === "UTG"), action = context.actions[0];
  if (context.actionWindowEvidence !== "hj_facing_utg_open5" || context.openingEvidence !== undefined ||
      context.situation !== "facing_open" || context.heroPosition !== "HJ" || context.playersDealtIn !== 6 ||
      context.players.length !== 6 || positions.some(pos => context.players.filter(p => p.position === pos).length !== 1) ||
      context.historyCoverage !== "complete" || context.contributionMeaning !== "street_total" ||
      context.tournamentContext !== "chip_ev_only" || context.amountToCallBB !== 2.5 ||
      context.actions.length !== 1 || action?.action !== "raise" || action.wagerAction !== "raise" ||
      action.seat !== utg?.seat || action.totalContributionBB !== 2.5 ||
      context.players.some(p => p.folded || p.allIn || p.remainingStackBB === null || p.contributionBB !==
        (p.position === "UTG" ? 2.5 : p.position === "SB" ? 0.5 : p.position === "BB" ? 1 : 0)))
    return fail("invalid_context", "Only the certified six-player HJ first response to UTG 2.5BB is covered.");
  const capacities = context.players.map(p => p.remainingStackBB! + p.contributionBB!);
  if (capacities.some(n => n < 100)) return fail("invalid_context", "Every starting capacity must be known and at least 100BB.");
  if (reference === null) return fail("reference_missing",
    "No reviewed HJ-versus-UTG 2.5BB response reference is installed. Frequencies, cold-call tree, rake/profile applicability and bounded stack coverage are required; no fallback FOLD.");
  const checked = HjResponseReferenceSchema.safeParse(reference);
  if (!checked.success) return fail("invalid_reference", "Response reference metadata, coverage or frequencies are invalid.");
  const r = checked.data;
  result.reference = { id: r.id, version: r.version, provenance: r.provenance, referenceSettings: r.referenceSettings, application: r.application };
  if (r.provenance.kind === "verified_reference" && context.players.some(p =>
      p.remainingStackBB! + p.contributionBB! !== r.referenceSettings.startingCapacitiesBB[p.position!]))
    return fail("out_of_scope", "Exact reference requires its full position-specific starting stack vector; an interval is not extrapolation permission.");
  if (capacities.some(n => n < r.application.minCapacityBB || n > r.application.maxCapacityBB))
    return fail("out_of_scope", "Stack capacities lie outside the explicitly reviewed reference/adaptation interval.");
  const entry = r.entries.find(e => e.hand === result.hand);
  if (!entry) return fail("uncovered", "Hand is not explicitly covered; absence is not FOLD.");
  result.allocations = entry.allocations;
  const positive = entry.allocations.filter(a => a.frequency > 0);
  // Even a tiny nonzero secondary frequency is a mix; two different 3-bet sizes
  // are also mixed. Approximate sums never make 0.999999999 a pure action.
  if (positive.length !== 1 || positive[0]!.frequency !== 1)
    return { ...result, status: "mixed", reasons: ["Mixed frequencies/sizes retained; no pure action or random sample selected."] };
  const pure = positive[0]!;
  return { ...result, status: "pure", strategyClass: pure.action,
    raiseToBB: pure.action === "THREE_BET" ? pure.raiseToBB : null,
    reasons: ["Reference classification only. Review status and source/action legality must be independently enforced before any live activation."] };
}

/** Reviewed 2026-10-25: only this explicit hand is installed. See HJ_RESPONSE_FOLD.md.
 * The dataset's name is not a claim of solver provenance or unraked accuracy. */
const liveReference: HjResponseReference = {
  schemaVersion: 1, id: "hj-utg-72o-conservative-fold", version: "1",
  provenance: {
    kind: "heuristic", review: "reviewed",
    url: "https://github.com/jensbaagaard/poker-practice/blob/590b8f65a9728a99ab8fb5d7a4ec9dc40a65225e/data/openSourcePokerData/Cash_100_GTO.json",
    node: "3BetHJvsLJ[72o]=0; CallHJvsLJ[72o]=0; both 169-hand nodes present. Six-max LJ maps to UTG.",
    reviewNotes: "Reviewed explicit zeros, not missing-hand defaults. Corroborated by GTO MAX 2026-10-16 HJ vs first-seat 3bet-or-fold chart. Conservative 72o-only adaptation; not exact GTO or solver-certified.",
    assumptions: [
      "Source: 100BB, six-max, no ante, 2.5BB open. Poker Trainer extraction is documented; original solver, rake rate/cap and solve accuracy are unverified.",
      "The HJ-vs-LJ CALL node is all-zero; whether cold calls were available in the original solve is unknown. A named CALL node does not prove that tree permission.",
      "Corroboration: https://gtomax.ai/free-poker-rta-charts/charts.json; raked 100BB, restricted 3bet-or-fold tree. This does not certify an unraked strategy.",
      "Application: unraked normal play-money Hold'em, no ante/straddle, six dealt-in players, all starting capacities 100-150BB; existing source checks also require at least 100BB remaining.",
      "Only 72o: unpaired, offsuit, disconnected, no ace/king blocker; conservatively decline cold entry against an early open with four players behind. No assumption that every raked fold transfers to no rake.",
      "Population baseline only; no exploit against an unusually wide opener or opponents overfolding to reraises. No claimed EV margin or depth-invariance proof.",
    ],
  },
  referenceSettings: { players: 6, hero: "HJ", opener: "UTG", openToBB: 2.5, anteBB: 0,
    startingCapacitiesBB: { UTG: 100, HJ: 100, CO: 100, BTN: 100, SB: 100, BB: 100 },
    rakeDescription: "Unspecified by the extracted dataset; not verified as unraked.",
    coldCallsAllowed: null, threeBetSizesBB: [7.5] },
  application: { profile: HJ_RESPONSE_PROFILE, minCapacityBB: 100, maxCapacityBB: 150,
    rationale: "Explicit conservative heuristic for 72o only across a bounded ordinary deep-stack interval and no rake. Weak disconnected offsuit cold entry is declined; additional depth/rake changes are not claimed solved. Other hands and capacities abstain." },
  entries: [{ hand: "72o", allocations: [{ action: "FOLD", frequency: 1 }] }],
};

export function isReviewedHjFold(review: HjResponseReview): boolean {
  return review.status === "pure" && review.strategyClass === "FOLD" &&
    review.reference?.provenance.review === "reviewed" && review.reference.provenance.kind !== "test_fixture";
}

/** Private installed catalog only; caller-supplied references remain offline. */
export function inspectLiveHjResponseStrategy(input: { preflop: unknown; holeCards: unknown }): HjResponseReview {
  return reviewHjResponseReference(input, liveReference);
}

/** Dependent packet cross-check; independent source/DOM scoped proofs are still mandatory. */
export function liveHjFoldReview(packet: DecisionPacket): HjResponseReview | null {
  const r = inspectLiveHjResponseStrategy({ preflop: packet.preflop, holeCards: packet.hero.holeCards });
  const p = packet.preflop, e = packet.preflopExecution, w = e?.hjResponseWindow, now = Date.now();
  if (!isReviewedHjFold(r) || !p || !w || !e?.heroIsCurrentToAct || !e.sourceWindowKey ||
      packet.table.street !== "preflop" || packet.table.board.length || packet.hero.position !== "HJ" ||
      p.heroPosition !== packet.hero.position || p.heroStackBB !== packet.hero.stackBB ||
      packet.table.numOpponentsRemaining !== 5 || packet.facingAction.type !== "raise" ||
      packet.facingAction.amountBB !== 2.5 || !packet.candidateActions.includes("FOLD") ||
      w.profile !== HJ_RESPONSE_PROFILE || w.heroSeat !== p.heroSeat ||
      w.heroCards.join(",") !== packet.hero.holeCards.map(c => `${"23456789TJQKA"[c.rank - 2]}${c.suit}`).sort().join(",") ||
      packet.potEvidence?.bigBlind !== 2 ||
      packet.decisionProofs?.handId !== `${w.tableId}:hand:${w.handId}` ||
      packet.decisionProofs.connectionGeneration !== w.generation || packet.decisionProofs.decisionEpoch !== w.decisionEpoch ||
      w.expiresAt !== w.receivedAt + 10_000 || now < w.receivedAt || now >= w.expiresAt) return null;
  return r;
}
