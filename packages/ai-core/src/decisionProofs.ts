import { z } from "zod";
import type { DecisionPacket } from "./decisionPacket.js";
import { unopenedChartAction } from "./preflopPolicy.js";
import { liveHjFoldReview } from "./preflopResponsePolicy.js";

export const PROOF_SCOPES = ["decisionState", "connection", "actionWindow", "position", "roster", "blinds",
  "stack", "callCost", "pot", "eligibility", "accounting", "legalActions", "raiseLegality", "reopening",
  "rangeInput", "equity", "terminal"] as const;
export type ProofScope = typeof PROOF_SCOPES[number];
export const ScopedProofSchema = z.object({
  scope: z.enum(PROOF_SCOPES), status: z.enum(["proven", "insufficient", "contradicted"]),
  confidence: z.enum(["high", "medium", "low"]),
  provenance: z.array(z.string().trim().min(1).max(2000)).max(32),
  reasons: z.array(z.string().trim().min(1).max(2000)).max(32),
});
export type ScopedProof = z.infer<typeof ScopedProofSchema>;
export const DecisionProofsSchema = z.object({
  version: z.literal(1),
  /** Bound to this packet's facts, model inputs and local decision epoch; not a source certificate. */
  binding: z.string().min(1).max(250_000),
  decisionEpoch: z.string().min(1).max(256),
  handId: z.string().min(1).max(256).nullable(),
  connectionGeneration: z.number().int().positive().nullable(),
  proofs: z.array(ScopedProofSchema).max(PROOF_SCOPES.length),
});
export type DecisionProofs = z.infer<typeof DecisionProofsSchema>;
export type DecisionClass = "preflop_unopened" | "preflop_facing_open" | "preflop_unclassified" |
  "heads_up_call_fold" | "heads_up_bet_check" | "multiway_postflop" | "unclassified";
export interface DecisionScopeInput {
  street: "preflop" | "flop" | "turn" | "river" | null;
  opponents: number | null;
  amountToCall: number | null;
  preflopSituation?: string | null;
  /** Candidate classification still requires an independently proven window before activation. */
  preflopRfiCandidate?: boolean;
  preflopAction?: "FOLD" | "RAISE" | null;
  reviewedHjFold?: boolean;
  /** True or unknown means aggression cannot silently be omitted from the comparison. */
  aggressionPossible: boolean | null;
}
export interface DecisionActivation {
  allowed: boolean;
  state: "proof_ready" | "waiting_for_proof" | "unsupported" | "unsafe";
  supportedDecisionType: DecisionClass;
  requiredProofs: ProofScope[];
  failedProofs: ProofScope[];
  reasons: string[];
  proofs: Array<ScopedProof & { permits: DecisionClass[] }>;
}

/** Independent requirements: deliberately contains no global historyComplete condition. */
export function assessDecisionProofs(input: DecisionScopeInput, evidence: readonly ScopedProof[]): DecisionActivation {
  const type: DecisionClass = input.street === null ? "unclassified" : input.street === "preflop"
    ? input.preflopSituation === "unopened" || input.preflopRfiCandidate ? "preflop_unopened" : input.preflopSituation === "facing_open" ? "preflop_facing_open" : "preflop_unclassified"
    : input.opponents === null ? "unclassified" : input.opponents !== 1 ? "multiway_postflop"
    : input.amountToCall === null ? "unclassified" : input.amountToCall > 0 ? "heads_up_call_fold" : "heads_up_bet_check";
  const responseFold = type === "preflop_facing_open" && input.reviewedHjFold === true;
  const required: ProofScope[] = type === "preflop_unopened" || responseFold
    ? ["decisionState", "connection", "actionWindow", "position", "roster", "blinds", "stack", "callCost"]
    : ["decisionState", "connection", "actionWindow", "blinds", "stack", "callCost", "pot", "eligibility", "accounting", "legalActions"];
  if (type === "preflop_unopened") {
    if (input.preflopAction !== "FOLD") required.push("raiseLegality");
  } else if (input.street === "preflop") {
    if (!responseFold) required.push("position", "roster", "raiseLegality", "reopening");
  } else {
    required.push("rangeInput", "equity", "terminal", "reopening");
    if (input.amountToCall === 0 || input.aggressionPossible !== false) required.push("raiseLegality");
  }
  const proofs = PROOF_SCOPES.map(scope => {
    const matches = evidence.filter(p => p.scope === scope);
    let proof: ScopedProof = matches[0] ?? { scope, status: "insufficient", confidence: "low", provenance: [], reasons: [`${scope}: no independent evidence supplied.`] };
    if (matches.length > 1) proof = { scope, status: "contradicted", confidence: "low", provenance: [], reasons: [`${scope}: duplicate proof entries are ambiguous.`] };
    if (proof.status === "proven" && (proof.confidence !== "high" || !proof.provenance.some(s => s.trim()) || proof.reasons.length)) {
      proof = { ...proof, status: "insufficient", reasons: [...proof.reasons, `${scope}: a proven fact needs high evidence confidence, provenance and no unresolved reasons.`] };
    }
    return { ...proof, permits: proof.status === "proven" && required.includes(scope) ? [type] : [] };
  });
  const failed = proofs.filter(p => (required.includes(p.scope) && p.status !== "proven") ||
    (responseFold && p.status === "contradicted"));
  const contradicted = failed.some(p => p.status === "contradicted");
  const unsupported = type === "multiway_postflop";
  return { allowed: !failed.length && !unsupported && type !== "unclassified" && type !== "preflop_unclassified",
    state: contradicted ? "unsafe" : unsupported ? "unsupported" : failed.length || type === "unclassified" || type === "preflop_unclassified" ? "waiting_for_proof" : "proof_ready",
    supportedDecisionType: type, requiredProofs: required, failedProofs: failed.map(p => p.scope), proofs,
    reasons: [...(unsupported ? ["Multiway postflop decisions, including side-pot EV, are unsupported."] : []),
      ...(type === "preflop_unclassified" ? ["Preflop action level is unproven or outside the unopened/single-open scope; bet size does not establish it."] : []),
      ...failed.flatMap(p => p.reasons.length ? p.reasons : [`${p.scope}: ${p.status}.`])] };
}

/** Canonical projection: proof labels are excluded so they cannot change what they attest. */
export function decisionProofBinding(packet: DecisionPacket, epoch: string): string {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;
  return JSON.stringify(canonical({ epoch, handId: packet.decisionProofs?.handId ?? null,
    connectionGeneration: packet.decisionProofs?.connectionGeneration ?? null,
    hero: packet.hero, table: packet.table, facingAction: packet.facingAction,
    candidateActions: packet.candidateActions, preflop: packet.preflop ?? null, potEvidence: packet.potEvidence ?? null,
    preflopExecution: packet.preflopExecution ?? null,
    policyContext: packet.policyContext ?? null, engineCalculations: packet.engineCalculations,
    opponentContext: packet.opponentContext ?? null, dataConfidence: packet.dataConfidence }));
}

/** Live packets must supply independent evidence; legacy offline callers retain their old path. */
export function assessPacketDecisionProofs(packet: DecisionPacket, requireProofs = false): DecisionActivation | null {
  if (!requireProofs && !packet.potEvidence && !packet.decisionProofs) return null;
  const envelope = packet.decisionProofs;
  const evidence: ScopedProof[] = envelope ? envelope.proofs.map(p => ({ ...p })) : [];
  const replace = (scope: ProofScope, status: ScopedProof["status"], reason: string) => {
    if (status !== "contradicted" && evidence.some(p => p.scope === scope && p.status === "contradicted")) return;
    for (let i = evidence.length - 1; i >= 0; i--) if (evidence[i]!.scope === scope) evidence.splice(i, 1);
    evidence.push({ scope, status, confidence: "low", provenance: ["DecisionPacket cross-check"], reasons: [reason] });
  };
  if (envelope && envelope.binding !== decisionProofBinding(packet, envelope.decisionEpoch)) replace("decisionState", "contradicted", "Scoped proofs belong to different decision facts/model inputs; refresh evidence.");
  if (envelope && (!envelope.handId || envelope.connectionGeneration === null)) replace("connection", "insufficient", "Hand identity/connection generation is missing from the scoped evidence.");
  const rfiCandidate = packet.table.street === "preflop" && (packet.preflop?.situation === "unopened" ||
    !!packet.preflopExecution && packet.preflop?.situation === "unknown");
  const responseFold = liveHjFoldReview(packet) !== null;
  // Aggregate confidence includes pot/EV uncertainty. The chart uses its own
  // independently proven decisionState/stack/blind/etc. scopes instead.
  if (!rfiCandidate && !responseFold && packet.dataConfidence !== "high") replace("decisionState", "insufficient", "Existing table-read confidence gate is not high.");
  if (!packet.potEvidence?.isPotSemanticsVerified || packet.potEvidence.decisionPot === null || !packet.potEvidence.decisionPotSource) {
    replace("pot", "insufficient", "No independently verified contestable decision pot.");
  }
  if (packet.policyContext?.accounting !== "single_pot_no_rake") replace("accounting", "insufficient", "Returns, side-pot eligibility and rake/drop are not independently excluded/resolved for this decision.");
  const call = packet.facingAction.amountBB ?? 0;
  if ((packet.facingAction.type !== "none") !== (call > 0) || call > packet.hero.stackBB) replace("callCost", "contradicted", "Call amount contradicts facing action or exceeds remaining capacity.");
  const preflop = packet.preflop;
  if (packet.table.street === "preflop" && (!preflop || preflop.historyCoverage !== "complete" || preflop.contributionMeaning !== "street_total" || preflop.situation === "facing_raise_unknown_level")) {
    replace("actionWindow", "insufficient", "Preflop classification needs a complete ordered preflop window, not complete whole-hand history or wager size alone.");
  }
  const ctx = packet.policyContext;
  if (packet.table.street !== "preflop") {
    if (!ctx?.legal.verified) replace("legalActions", "insufficient", "Exact current legal action set is unproven.");
    if (!ctx?.equity || packet.engineCalculations.equitySource !== "estimated_range" || packet.opponentContext?.rangeStatus !== "modeled" || packet.opponentContext.rangeConfidence !== "medium") replace("rangeInput", "insufficient", "A modeled heads-up range and explicit equity sensitivity bounds are required.");
    if (packet.table.street !== "river" || (call > 0 ? !ctx?.terminalAfterCall : !ctx?.checkEndsHand)) replace("terminal", "insufficient", "Existing strategy does not model future betting/equity realization for this simple non-all-in decision.");
    if (ctx && (ctx.legal.opponentStackBB === 0 || call === packet.hero.stackBB || packet.facingAction.type === "all_in")) replace("eligibility", "insufficient", "All-in/short-call eligibility is outside the scoped simple-pot live subset.");
  }
  const activation = assessDecisionProofs({ street: packet.table.street, opponents: packet.table.numOpponentsRemaining, amountToCall: call,
    preflopSituation: preflop?.situation ?? null, preflopRfiCandidate: rfiCandidate,
    preflopAction: unopenedChartAction(packet), reviewedHjFold: responseFold, aggressionPossible: ctx?.legal.aggressionReopened ?? null }, evidence);
  if (packet.table.street === "preflop" && activation.state !== "unsafe") {
    if (!rfiCandidate && !responseFold) {
      activation.allowed = false; activation.state = "unsupported";
      activation.reasons.push("No deterministic preflop response model for this situation: the reviewed HJ pure-FOLD subset does not match this packet/window. Other responses remain unsupported.");
    }
  } else if (packet.table.street !== "river" && activation.state !== "unsafe") {
    activation.allowed = false; activation.state = "unsupported";
    activation.reasons.push("Simple flop/turn bet/check and call/fold require an equity-realization/future-betting model that is not implemented.");
  }
  return activation;
}
