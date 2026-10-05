import { z } from "zod";
import { calculateCallEV, calculateFoldEV, calculateRaiseEV } from "@poker-ai/poker-engine";
import type { DecisionPacket } from "./decisionPacket.js";

const chips = z.number().finite().nonnegative();
const probability = z.number().finite().min(0).max(1);

/** Live display values retain chip units and provenance through relay validation. */
export const PotEvidenceSchema = z.object({
  unit: z.literal("chips"), mainPot: chips.nullable(), displayedTotalPot: chips.nullable(),
  decisionPot: chips.nullable(), decisionPotSource: z.string().min(1).nullable(),
  isPotSemanticsVerified: z.boolean(), bigBlind: z.number().finite().positive(),
});

/** Sensitivity bounds, not a claim of a calibrated statistical confidence interval. */
export const PolicyEstimateSchema = z.object({
  estimate: probability,
  low: probability,
  high: probability,
  source: z.string().min(1),
  confidence: z.enum(["low", "medium"]),
}).refine(p => p.low <= p.estimate && p.estimate <= p.high, "Estimate must lie within its bounds");

/** No defaults: these facts cannot be inferred from the old coarse candidate list. */
export const PolicyContextSchema = z.object({
  potVerified: z.boolean(),
  potSource: z.string().min(1),
  accounting: z.enum(["single_pot_no_rake", "unknown"]),
  /** Calling ends all betting (river closing action, or a matched heads-up all-in). */
  terminalAfterCall: z.boolean(),
  /** Checking ends the hand, not merely hero's turn. */
  checkEndsHand: z.boolean(),
  legal: z.object({
    verified: z.boolean(),
    source: z.string().min(1),
    heroStreetBetBB: chips,
    opponentStreetBetBB: chips,
    opponentStackBB: chips,
    chipUnitBB: z.number().finite().positive(),
    minBetBB: z.number().finite().positive(),
    /** Total street contribution required for a full raise, not the raise increment. */
    minRaiseToBB: z.number().finite().positive().nullable(),
    aggressionReopened: z.boolean(),
  }),
  /** Against the current range for CALL, or the checking range for a terminal CHECK. */
  equity: PolicyEstimateSchema.optional(),
  responses: z.array(z.object({
    /** Additional hero investment from this decision; one model PER candidate size. */
    investmentBB: z.number().finite().positive(),
    equityIfCalled: PolicyEstimateSchema,
    callerRangeBasis: z.string().min(1),
    foldEquity: PolicyEstimateSchema,
    /** Explicit approximation; no re-raise branch is currently modeled. */
    model: z.literal("fold_or_call"),
    assumption: z.string().min(1),
  })).max(32),
});
export type PolicyContext = z.infer<typeof PolicyContextSchema>;
export type PolicyEstimate = z.infer<typeof PolicyEstimateSchema>;

export interface PolicyCandidate {
  action: "BET" | "RAISE" | "ALL_IN";
  investmentBB: number;
  raiseToBB: number;
  opponentCallBB: number;
  basis: string;
}
export interface PolicyActionEV {
  action: "FOLD" | "CALL" | "CHECK" | PolicyCandidate["action"];
  investmentBB: number;
  raiseToBB?: number;
  evBB: number | null;
  lowBB: number | null;
  highBB: number | null;
  confidence: "low" | "medium";
  equitySource: string;
  foldEquitySource: string;
  assumptions: string[];
}
export interface DecisionPolicyResult {
  version: "v1";
  status: "selected" | "uncertain" | "unsupported";
  chosenAction: PolicyActionEV["action"] | null;
  /** Additional chips now; raiseToBB separately records the total street amount. */
  chosenSizeBB: number | null;
  raiseToBB: number | null;
  actionEVs: PolicyActionEV[];
  assumptions: string[];
  reasons: string[];
  confidence: "low" | "medium";
  equitySource: string;
  foldEquitySource: string;
  llmMayChoose: boolean;
}

const EPS = 1e-8;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;

export function potEvidenceProblems(packet: DecisionPacket): string[] {
  const evidence = packet.potEvidence;
  if (!evidence) return []; // Legacy/non-live callers still require policyContext.potVerified.
  if (!evidence.isPotSemanticsVerified || evidence.decisionPot === null || !evidence.decisionPotSource) {
    return ["Live decision-pot semantics/provenance are unverified."];
  }
  if (!near(evidence.decisionPot / evidence.bigBlind, packet.table.potBB)) {
    return ["DecisionPacket potBB contradicts the verified chip pot / big blind."];
  }
  if (packet.policyContext && (!packet.policyContext.potVerified || packet.policyContext.potSource !== evidence.decisionPotSource)) {
    return ["Policy pot provenance contradicts the live evidence."];
  }
  return [];
}

export function policyContextProblems(packet: DecisionPacket, ctx: PolicyContext): string[] {
  const legal = ctx.legal;
  const call = Math.max(0, legal.opponentStreetBetBB - legal.heroStreetBetBB);
  const onGrid = (value: number) => near(value / legal.chipUnitBB, Math.round(value / legal.chipUnitBB));
  const problems: string[] = potEvidenceProblems(packet);
  if (!legal.verified) problems.push("Exact action legality has not been verified.");
  if (legal.heroStreetBetBB > legal.opponentStreetBetBB ||
      !near(call, packet.facingAction.amountBB ?? 0) || (call > 0) !== (packet.facingAction.type !== "none")) {
    problems.push("Street contributions contradict the facing action/call cost.");
  }
  if (call > packet.hero.stackBB) problems.push("An unmatched all-in/short call needs separate pot accounting.");
  if (packet.table.potBB + EPS < legal.heroStreetBetBB + legal.opponentStreetBetBB) {
    problems.push("Verified pot cannot exclude the current street contributions.");
  }
  if (packet.facingAction.type === "all_in" && legal.opponentStackBB > 0) {
    problems.push("An all-in opponent cannot also have chips behind.");
  }
  if (![legal.heroStreetBetBB, legal.opponentStreetBetBB, legal.opponentStackBB,
    packet.hero.stackBB, legal.minBetBB, ...(legal.minRaiseToBB === null ? [] : [legal.minRaiseToBB])].every(onGrid)) {
    problems.push("Chip amounts or legal bounds do not match the verified chip unit.");
  }
  if (call > 0 && legal.aggressionReopened && legal.opponentStackBB > 0 &&
      (legal.minRaiseToBB === null || legal.minRaiseToBB <= legal.opponentStreetBetBB)) {
    problems.push("Minimum raise-to is unknown or inconsistent.");
  }
  return problems;
}

/** Shared exact size check for the policy grid and LLM fallback. Additional BB,
 * not raise-to. A short all-in is the only supported below-minimum exception.
 */
export function policyWagerProblems(packet: DecisionPacket, investmentBB: number): string[] {
  if (packet.table.street === "preflop") return ["Exact preflop wager legality is outside this postflop sizing model."];
  const ctx = packet.policyContext;
  if (!ctx) return ["Exact wager legality is unknown; verified controls/minimums are required."];
  const problems = policyContextProblems(packet, ctx);
  if (problems.length) return problems;
  const legal = ctx.legal;
  const call = packet.facingAction.amountBB ?? 0;
  if (!Number.isFinite(investmentBB) || investmentBB <= call || investmentBB > packet.hero.stackBB + EPS) {
    return ["Wager must exceed the call cost and cannot exceed hero's available stack."];
  }
  if (!legal.aggressionReopened || legal.opponentStackBB === 0) return ["Aggression is not open or no opponent can match a wager."];
  if (!near(investmentBB / legal.chipUnitBB, Math.round(investmentBB / legal.chipUnitBB))) return ["Wager is not on the verified chip unit."];
  const total = legal.heroStreetBetBB + investmentBB;
  const minimum = call > 0 ? legal.minRaiseToBB! : legal.heroStreetBetBB + legal.minBetBB;
  if (total + EPS < minimum && !near(investmentBB, packet.hero.stackBB)) return ["Wager is below the verified legal minimum."];
  return [];
}

/** Finite candidate grid, not a search over every legal size or a solver. */
export function generatePolicyCandidates(packet: DecisionPacket): PolicyCandidate[] {
  const ctx = packet.policyContext;
  if (packet.table.street === "preflop" || !ctx || !ctx.potVerified || ctx.accounting !== "single_pot_no_rake" ||
      packet.table.numOpponentsRemaining !== 1 || policyContextProblems(packet, ctx).length || !ctx.legal.aggressionReopened) return [];
  const legal = ctx.legal;
  const call = packet.facingAction.amountBB ?? 0;
  if (legal.opponentStackBB === 0 || packet.hero.stackBB <= call) return [];
  // Exclude uncalled excess: investment must be matchable by this opponent.
  const cap = Math.min(packet.hero.stackBB, call + legal.opponentStackBB);
  const potAfterCall = packet.table.potBB + call;
  const spr = potAfterCall > 0 ? (cap - call) / potAfterCall : Infinity;
  const sizes = [0.25, 0.33, 0.5, 0.67, 0.75, 1].map(fraction => ({
    amount: call + fraction * potAfterCall,
    basis: `${Math.round(fraction * 100)}% of ${call ? "pot after call, plus call cost" : "pot"}`,
  }));
  sizes.push({ amount: cap, basis: `${near(cap, packet.hero.stackBB) ? "shove" : "effective stack cap"}; SPR ${Number.isFinite(spr) ? spr.toFixed(2) : "undefined"}` });
  const candidates = new Map<number, PolicyCandidate>();
  for (const size of sizes) {
    const investmentBB = Number((Math.floor((size.amount + EPS) / legal.chipUnitBB) * legal.chipUnitBB).toFixed(8));
    if (investmentBB <= call || investmentBB > cap + EPS) continue;
    const raiseToBB = legal.heroStreetBetBB + investmentBB;
    const shove = near(investmentBB, packet.hero.stackBB);
    if (policyWagerProblems(packet, investmentBB).length) continue;
    const action = shove ? "ALL_IN" : call > 0 ? "RAISE" : "BET";
    candidates.set(investmentBB, { action, investmentBB, raiseToBB,
      opponentCallBB: investmentBB - call, basis: size.basis });
  }
  return [...candidates.values()].sort((a, b) => a.investmentBB - b.investmentBB);
}

function boundedEV(estimate: PolicyEstimate, formula: (equity: number) => number) {
  return { evBB: formula(estimate.estimate), lowBB: formula(estimate.low), highBB: formula(estimate.high) };
}

/** Pure, deterministic and conditional on explicit evidence; never infers fold equity. */
export function evaluateDecisionPolicy(packet: DecisionPacket): DecisionPolicyResult {
  const result: DecisionPolicyResult = {
    version: "v1", status: "unsupported", chosenAction: null, chosenSizeBB: null, raiseToBB: null,
    actionEVs: [], assumptions: ["Chip EV only; sunk contributions are excluded from incremental cost."],
    reasons: [], confidence: "low", equitySource: packet.engineCalculations.equitySource ?? "unknown",
    foldEquitySource: "not supplied", llmMayChoose: true,
  };
  const stop = (reason: string) => { result.reasons.push(reason); return result; };
  const potProblems = potEvidenceProblems(packet);
  if (potProblems.length) { result.reasons.push(...potProblems); result.llmMayChoose = false; return result; }
  if (packet.dataConfidence !== "high") {
    result.llmMayChoose = false;
    return stop("High table-read confidence is required by this policy.");
  }
  if (packet.table.street === "preflop") return stop("Preflop remains on the existing context/fallback path.");
  if (packet.table.numOpponentsRemaining !== 1) return stop("Multiway action EV and side pots are not modeled in V1.");
  const expectedBoard = { flop: 3, turn: 4, river: 5 }[packet.table.street];
  if (packet.table.board.length !== expectedBoard || new Set([...packet.hero.holeCards, ...packet.table.board].map(c => `${c.rank}${c.suit}`)).size !== expectedBoard + 2) {
    result.llmMayChoose = false;
    return stop("Invalid board length or duplicate known cards.");
  }
  const ctx = packet.policyContext;
  if (!ctx) return stop("Policy evidence is absent: pot semantics, legality and uncertainty bounds are required.");
  if (!ctx.potVerified || ctx.accounting !== "single_pot_no_rake") {
    result.llmMayChoose = false;
    return stop("Verified contestable pot, no side pots, and no unmodeled rake are required.");
  }
  result.assumptions.push(`Pot accounting: ${ctx.potSource}.`, `Legality: ${ctx.legal.source}.`,
    "No rake or side pots. Probability bounds are supplied sensitivity bounds, not calibrated confidence intervals.");
  const problems = policyContextProblems(packet, ctx);
  if (problems.length) { result.reasons.push(...problems); result.llmMayChoose = false; return result; }
  const call = packet.facingAction.amountBB ?? 0;
  const pot = packet.table.potBB;
  const eq = ctx.equity;
  if (call > 0) result.actionEVs.push({ action: "FOLD", investmentBB: 0,
    evBB: calculateFoldEV().ev, lowBB: 0, highBB: 0, confidence: "medium",
    equitySource: "not needed", foldEquitySource: "not needed", assumptions: ["No additional chips invested."] });
  if (!eq || packet.engineCalculations.equity === undefined || !near(eq.estimate, packet.engineCalculations.equity) ||
      packet.engineCalculations.equitySource !== "estimated_range" || packet.opponentContext?.rangeStatus !== "modeled") {
    return stop("A modeled heads-up range, matching equity estimate and explicit uncertainty bounds are required; random-hand equity is not a policy input.");
  }
  result.equitySource += `: ${eq.source}`;
  if ((call > 0 && !ctx.terminalAfterCall) || (call === 0 && (!ctx.checkEndsHand || packet.table.street !== "river"))) {
    return stop("Future betting/equity realization is unmodeled; a check is not automatically worth zero.");
  }
  if (call > 0 && packet.table.street !== "river" && ctx.legal.opponentStackBB > 0 && !near(call, packet.hero.stackBB)) {
    result.llmMayChoose = false;
    return stop("Calling cannot end betting before the river with chips behind on both sides.");
  }
  result.actionEVs.push({ action: call > 0 ? "CALL" : "CHECK", investmentBB: call,
    ...boundedEV(eq, e => call > 0 ? calculateCallEV(e, pot, call).ev : e * pot),
    confidence: eq.confidence, equitySource: eq.source, foldEquitySource: "not needed",
    assumptions: [call > 0 ? "Call ends betting; showdown equity is fully realized." : "Check ends the hand; EV(check) = equity times pot."] });

  const candidates = generatePolicyCandidates(packet);
  if (ctx.legal.aggressionReopened && ctx.legal.opponentStackBB > 0 && packet.hero.stackBB > call && candidates.length === 0) {
    return stop("No supported aggressive size fits the verified bounds; do not silently exclude aggression.");
  }
  for (const candidate of candidates) {
    const matches = ctx.responses.filter(r => near(r.investmentBB, candidate.investmentBB));
    const response = matches.length === 1 ? matches[0] : undefined;
    const row: PolicyActionEV = { action: candidate.action, investmentBB: candidate.investmentBB,
      raiseToBB: candidate.raiseToBB, evBB: null, lowBB: null, highBB: null, confidence: "low",
      equitySource: "not supplied", foldEquitySource: "not supplied", assumptions: [candidate.basis] };
    result.actionEVs.push(row);
    if (!response || packet.table.street !== "river") {
      row.assumptions.push("A unique per-size calling range/fold estimate and a river response model are required.");
      continue;
    }
    const formula = (e: number, f: number) => calculateRaiseEV(e, f, pot, candidate.investmentBB, candidate.opponentCallBB).ev;
    // Bilinear EV: all four corners matter; more folds can REDUCE value-bet EV.
    const corners = [response.equityIfCalled.low, response.equityIfCalled.high].flatMap(e =>
      [response.foldEquity.low, response.foldEquity.high].map(f => formula(e, f)));
    Object.assign(row, {
      evBB: formula(response.equityIfCalled.estimate, response.foldEquity.estimate),
      lowBB: Math.min(...corners), highBB: Math.max(...corners),
      confidence: response.equityIfCalled.confidence === "medium" && response.foldEquity.confidence === "medium" ? "medium" : "low",
      equitySource: `${response.callerRangeBasis}: ${response.equityIfCalled.source}`,
      foldEquitySource: response.foldEquity.source,
    });
    row.assumptions.push(response.assumption, "Opponent folds or calls; re-raises excluded by this explicit model.");
  }
  if (candidates.length) result.assumptions.push("Conditional river fold-or-call model; only the listed legal sizing grid is compared, not all possible strategies.");
  if (result.actionEVs.some(row => row.evBB === null)) return stop("Some legal candidates lack a response model. No action is selected from an incomplete comparison.");
  result.llmMayChoose = false;
  result.status = "uncertain";
  if (eq.confidence === "low" || packet.opponentContext?.rangeConfidence !== "medium" ||
      result.actionEVs.some(row => row.confidence === "low")) return stop("Range or response estimates have low confidence; EV scores are diagnostic only.");
  const ranked = [...result.actionEVs].sort((a, b) => b.evBB! - a.evBB!);
  const best = ranked[0]!;
  if (!ranked.slice(1).every(other => best.lowBB! > other.highBB! + EPS)) {
    return stop("EV sensitivity intervals overlap or tie; no robust preference is established.");
  }
  if (!packet.candidateActions.includes(best.action)) return stop("Selected action conflicts with the supplied candidate list.");
  result.status = "selected";
  result.confidence = "medium";
  result.chosenAction = best.action;
  result.chosenSizeBB = best.investmentBB > 0 ? best.investmentBB : null;
  result.raiseToBB = best.raiseToBB ?? null;
  if (best.action !== "FOLD") result.equitySource = best.equitySource;
  result.foldEquitySource = best.foldEquitySource;
  result.assumptions.push(...best.assumptions);
  result.reasons.push("Selected action's lower EV bound exceeds every other scored action's upper bound.");
  return result;
}

/** Recomputed, never a client-supplied action lock. Shared by all provider prompts. */
export function decisionPolicyPromptLines(packet: DecisionPacket): string[] {
  const policy = evaluateDecisionPolicy(packet);
  return ["All sizingBB values mean ADDITIONAL investment now in BB, not total raise-to. ALL_IN invests the remaining stack. Never invent minimum raise sizes or reopening rights.",
    "Engine decision policy: " + JSON.stringify(policy), policy.status === "selected"
    ? "EXPLANATION ONLY: preserve the engine action and exact additional-investment sizingBB. Explain its EV, assumptions and uncertainty concisely. Do not propose an alternative or override the action. These are conditional model estimates, not solver correctness."
    : "The engine has not selected an action. Any permitted AI fallback is AI judgment, not an engine-supported recommendation. Do not invent fold equity, missing response models, or treat diagnostic EV as authoritative."];
}
