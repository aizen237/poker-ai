import { z } from "zod";
import { formatHandType, getPreflopOpeningReference } from "@poker-ai/range-engine";
import type { DecisionPacket } from "./decisionPacket.js";
import { buildPreflopContext } from "./preflopContext.js";

/** Observations bound into the packet, never a certificate of history or minimum legality. */
export const PreflopExecutionSchema = z.object({
  heroIsCurrentToAct: z.boolean(),
  sourceWindowKey: z.string().min(1).max(100_000),
  /** Independent sizing evidence; selected input alone cannot populate this. */
  raiseBounds: z.object({ source: z.string().min(1), verified: z.boolean(),
    chipUnitBB: z.number().finite().positive(), minRaiseToBB: z.number().finite().positive(),
  }).optional(),
  /** Empirical exact-size rule, NOT a general minimum/grid or live server ack. */
  exactOpeningSize: z.object({
    rule: z.literal("pokernow-0.1.72-th-4fun-1-2-exact5-v1"),
    provenance: z.string().min(1).max(2000),
    tableId: z.string().min(1), handId: z.string().min(1), heroId: z.string().min(1),
    heroSeat: z.number().int().positive(), generation: z.number().int().positive(),
    sourceCursor: z.number().int().nonnegative(), decisionEpoch: z.string().min(1),
    receivedAt: z.number().finite(), expiresAt: z.number().finite(),
    units: z.literal("chips"), bigBlindChips: z.literal(2), contributionChips: z.literal(0),
    raiseToChips: z.literal(5), investmentChips: z.literal(5),
    remainingStackChips: z.number().finite().min(200),
    controls: z.enum(["panel_closed_unchecked", "selected_amount_matches", "selected_amount_differs"]),
  }).optional(),
  controls: z.object({
    source: z.string().min(1), formVisible: z.boolean(),
    raiseSubmitVisible: z.boolean(), raiseSubmitEnabled: z.boolean().nullable(),
    selectedRaiseToBB: z.number().finite().nonnegative().nullable(),
    issues: z.array(z.string()).max(32),
  }),
});

export const RFI_STRATEGY_SOURCE = "openingRanges.ts: six-max 100BB+ RFI reference; raise-or-fold, fixed 2.5BB opening convention";
const order = ["UTG", "HJ", "CO", "BTN", "SB", "BB"] as const;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-8;

/** Chart membership only; never an activation certificate or a response-to-open model. */
export function unopenedChartAction(packet: {
  table: Pick<DecisionPacket["table"], "street">;
  hero: Pick<DecisionPacket["hero"], "holeCards">;
  preflop?: DecisionPacket["preflop"];
}): "FOLD" | "RAISE" | null {
  if (packet.table.street !== "preflop" || !packet.preflop) return null;
  let context;
  try { context = buildPreflopContext(packet.preflop); } catch { return null; }
  const depths = context.effectiveStacks.map(p => p.effectiveStackBB);
  const reference = getPreflopOpeningReference({ position: context.heroPosition,
    effectiveStackBB: depths.length && depths.every(n => n !== null) ? Math.min(...depths as number[]) : null,
    playersDealtIn: context.playersDealtIn ?? 0, unopened: context.situation === "unopened" });
  if (!reference) return null;
  const [a, b] = packet.hero.holeCards;
  const weight = reference.get(formatHandType({ highRank: a.rank >= b.rank ? a.rank : b.rank,
    lowRank: a.rank >= b.rank ? b.rank : a.rank, suited: a.suit === b.suit })) ?? 0;
  return weight === 0 ? "FOLD" : weight === 1 ? "RAISE" : null;
}

/** Model/legality cross-check only. Caller MUST enforce the unopened-specific scoped proofs. */
export function evaluatePreflopReference(packet: DecisionPacket): {
  action: "FOLD" | "RAISE" | null; raiseToBB: number | null; investmentBB: number | null;
  reasons: string[]; strategySource: string; explanation: string;
} {
  const fail = (reason: string) => ({ action: null, raiseToBB: null, investmentBB: null,
    reasons: [reason], strategySource: RFI_STRATEGY_SOURCE, explanation: "" });
  if (!packet.preflop) return fail("Structured preflop window is missing.");
  let context;
  try { context = buildPreflopContext(packet.preflop); }
  catch { return fail("Preflop context cannot be validated."); }
  if (context.situation !== "unopened") return fail("No deterministic response table for facing an open, limps, re-raises or an unclassified window.");
  if (context.heroPosition === "BB") return fail("BB option is outside the raise-first-in chart; checking is not a voluntary open.");
  const execution = packet.preflopExecution;
  if (!execution?.heroIsCurrentToAct) return fail("Hero is not proven current to act.");
  if (!execution.sourceWindowKey) return fail("Current source/action window is unbound.");
  if (packet.table.street !== "preflop" || packet.table.board.length ||
      new Set(packet.hero.holeCards.map(c => `${c.rank}${c.suit}`)).size !== 2) return fail("Invalid preflop cards/street.");
  if (context.historyCoverage !== "complete" || context.contributionMeaning !== "street_total" || context.historyNotes.length) return fail("Ordered preflop window has unresolved evidence.");
  if (context.playersDealtIn !== 6 || context.players.length !== 6 ||
      order.some(position => context.players.filter(p => p.position === position).length !== 1)) return fail("Six dealt-in players with six distinct proven positions are required.");
  const hero = context.players.find(p => p.seat === context.heroSeat)!;
  if (hero.folded || context.players.some(p => p.allIn) || context.tournamentContext !== "chip_ev_only") return fail("All-ins, inactive hero or unknown tournament/ante context are unsupported.");
  if (context.heroPosition !== packet.hero.position || context.heroStackBB !== packet.hero.stackBB ||
      context.activeOpponents !== packet.table.numOpponentsRemaining ||
      context.amountToCallBB === null || context.amountToCallBB !== packet.facingAction.amountBB) return fail("Preflop facts contradict packet stack, call, position, roster or pot.");
  const events = [...context.actions].sort((a, b) => a.observation - b.observation);
  if (new Set(events.map(a => a.observation)).size !== events.length) return fail("Blind/action ordering is ambiguous.");
  const posts = events.filter(a => a.action === "post_blind");
  const firstUtg = context.openingEvidence === "first_utg_hand_start";
  const firstHj = context.openingEvidence === "hj_after_utg_fold";
  if (firstUtg && (context.heroPosition !== "UTG" || events.length !== 0)) return fail("First UTG boundary evidence cannot certify a later turn or prior voluntary action.");
  if (firstHj && (context.heroPosition !== "HJ" || events.length !== 1 || posts.length)) return fail("HJ fold-prefix evidence supports exactly one prior UTG fold and boundary blind totals.");
  // At the first UTG boundary, source blind totals are known simultaneously;
  // do not invent an ordering/timestamps for forced posts or require turns that
  // cannot legally precede UTG. HJ's one-fold source window uses that same
  // boundary baseline; other positions retain the ordered-log path.
  if (!firstUtg && !firstHj && (posts.length !== 2 || posts.some(a => {
    const position = context.players.find(p => p.seat === a.seat)?.position;
    return a.totalContributionBB !== (position === "SB" ? 0.5 : position === "BB" ? 1 : -1);
  }) || new Set(posts.map(a => a.seat)).size !== 2 || events.slice(0, 2).some(a => a.action !== "post_blind"))) return fail("Exactly two ordered normal blind posts are required; no antes, straddles or extra posts.");
  const heroIndex = order.indexOf(packet.hero.position);
  const voluntary = events.filter(a => a.action !== "post_blind");
  if (voluntary.length !== heroIndex || voluntary.some((a, i) => a.action !== "fold" ||
      context.players.find(p => p.seat === a.seat)?.position !== order[i] || a.totalContributionBB !== 0)) return fail("Hero must be first voluntary bettor after exactly the preceding positions folded in order.");
  if (context.players.some(p => p.folded !== (order.indexOf(p.position!) < heroIndex) ||
      p.contributionBB !== (p.position === "SB" ? 0.5 : p.position === "BB" ? 1 : 0))) return fail("Roster/folds/contributions contradict the unopened action window.");
  const depths = context.effectiveStacks.map(p => p.effectiveStackBB);
  const reference = getPreflopOpeningReference({ position: context.heroPosition,
    effectiveStackBB: depths.length && depths.every(n => n !== null) ? Math.min(...depths as number[]) : null,
    playersDealtIn: context.playersDealtIn, unopened: true });
  if (!reference) return fail("Reference requires 100BB+ effective stacks against every active opponent; no short-stack or response chart exists.");
  if (!near(1 - hero.contributionBB!, context.amountToCallBB) ||
      context.amountToCallBB <= 0 || packet.facingAction.type === "none" || packet.facingAction.type === "all_in") return fail("Current action legality and blind call cost must be independently proven.");
  const [a, b] = packet.hero.holeCards;
  const hand = formatHandType({ highRank: a.rank >= b.rank ? a.rank : b.rank,
    lowRank: a.rank >= b.rank ? b.rank : a.rank, suited: a.suit === b.suit });
  const weight = reference.get(hand) ?? 0;
  if (weight !== 0 && weight !== 1) return fail("Mixed-frequency chart entries are unsupported by this deterministic reference policy.");
  const action = weight === 1 ? "RAISE" : "FOLD";
  if (!packet.candidateActions.includes(action)) return fail("Reference action is absent from the proven legal action set.");
  if (action === "FOLD") return { action, raiseToBB: null, investmentBB: null, reasons: [], strategySource: RFI_STRATEGY_SOURCE,
    explanation: `${hand} is outside the ${packet.hero.position} six-max 100BB+ RFI reference. Fold; no limp strategy is modeled.` };
  if (firstHj) return fail("HJ RAISE is not certified by the HJ FOLD-only source contract; no substitution with FOLD.");
  const raiseToBB = 2.5, investmentBB = raiseToBB - hero.contributionBB!;
  const controls = execution.controls;
  const legal = execution.raiseBounds;
  const exact = execution.exactOpeningSize;
  if (exact) {
    // This branch cannot be used for other sizes, positions or response models.
    // Source provenance is issued by the local reader; the relay does not act
    // as a second PokerNow observer. Packet binding covers all these facts.
    const now = Date.now();
    if (exact.rule !== "pokernow-0.1.72-th-4fun-1-2-exact5-v1" || !firstUtg ||
        hero.contributionBB !== 0 || context.heroSeat !== exact.heroSeat ||
        exact.units !== "chips" || exact.bigBlindChips !== 2 || exact.contributionChips !== 0 ||
        exact.raiseToChips !== 5 || exact.investmentChips !== 5 ||
        exact.remainingStackChips !== packet.hero.stackBB * 2 || investmentBB >= packet.hero.stackBB ||
        packet.potEvidence?.bigBlind !== 2 ||
        packet.decisionProofs?.handId !== `${exact.tableId}:hand:${exact.handId}` ||
        packet.decisionProofs?.connectionGeneration !== exact.generation ||
        packet.decisionProofs?.decisionEpoch !== exact.decisionEpoch ||
        exact.expiresAt !== exact.receivedAt + 10_000 || now < exact.receivedAt || now >= exact.expiresAt)
      return fail("Exact five-chip opening rule is outside its bound profile, decision, capacity or original freshness window.");
    if (controls.issues.length || (exact.controls === "panel_closed_unchecked"
      ? controls.formVisible || controls.raiseSubmitVisible || controls.selectedRaiseToBB !== null
      : !controls.formVisible || !controls.raiseSubmitVisible || controls.raiseSubmitEnabled !== true ||
        controls.selectedRaiseToBB === null || controls.selectedRaiseToBB > packet.hero.stackBB ||
        (exact.controls === "selected_amount_matches" ? controls.selectedRaiseToBB !== 2.5 : controls.selectedRaiseToBB === 2.5)))
      return fail("Current Raise controls contradict the independently certified exact size.");
  } else {
    if (!legal?.verified || legal.minRaiseToBB <= 1 ||
      raiseToBB < legal.minRaiseToBB || investmentBB >= packet.hero.stackBB ||
      !Number.isFinite(legal.chipUnitBB) || legal.chipUnitBB <= 0 ||
      !near(investmentBB / legal.chipUnitBB, Math.round(investmentBB / legal.chipUnitBB)) ||
      !near(raiseToBB / legal.chipUnitBB, Math.round(raiseToBB / legal.chipUnitBB))) return fail("2.5BB opening size is outside independently proven minimum, reopening, chip-unit or capacity bounds.");
    if (!controls.formVisible || !controls.raiseSubmitVisible || controls.raiseSubmitEnabled !== true ||
      controls.issues.length || controls.selectedRaiseToBB === null || !near(controls.selectedRaiseToBB, raiseToBB)) return fail("Visible enabled PokerNow Raise control must independently match the 2.5BB total; selected amount never proves the minimum.");
  }
  return { action, raiseToBB, investmentBB, reasons: [], strategySource: RFI_STRATEGY_SOURCE,
    explanation: `${hand} is inside the ${packet.hero.position} six-max 100BB+ RFI reference. Raise to 2.5BB (${investmentBB}BB additional). Fixed sizing convention, not a solved optimum or EV estimate.${exact ? " Exact 5-chip profile rule supported by historical server acceptance; no live server preflight. Manual action only." : ""}` };
}
