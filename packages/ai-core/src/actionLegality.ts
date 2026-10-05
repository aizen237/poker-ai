import type { Recommendation } from "./recommendation.js";
import type { DecisionPacket } from "./decisionPacket.js";
import { policyContextProblems, policyWagerProblems, potEvidenceProblems } from "./decisionPolicy.js";

export interface LegalityResult {
  isLegal: boolean;
  reason?: string;
  /** Null when there is insufficient evidence even for a safe passive fallback. */
  effectiveRecommendation: Recommendation | null;
}

/** Legality only, never strategy. Sizing is additional investment in BB.
 * No raise minimum is inferred from a one-second snapshot or the coarse action list.
 */
export function validateActionLegality(recommendation: Recommendation, packet: DecisionPacket): LegalityResult {
  const amount = packet.facingAction.amountBB ?? 0;
  const facing = packet.facingAction.type !== "none";
  const stack = packet.hero.stackBB;
  const consistent = Number.isFinite(amount) && amount >= 0 && facing === (amount > 0);
  const reject = (reason: string, passiveFallback = true): LegalityResult => {
    const action = passiveFallback && consistent && Number.isFinite(stack) && stack > 0 ? (amount > 0 ? "FOLD" : "CHECK") : null;
    return { isLegal: false, reason, effectiveRecommendation: action === null ? null : {
      action, confidence: 0, reasoning: "Recommendation rejected: " + reason + " Passive fallback: " + action + ".",
    } };
  };
  const potProblems = potEvidenceProblems(packet);
  if (potProblems.length) return reject(potProblems.join(" "), false);
  if (!consistent) return reject("Facing action and numeric amount to call are missing or contradictory.", false);
  if (!Number.isFinite(stack) || stack <= 0) return reject(recommendation.action + " is not legal: hero has no readable positive remaining stack.", false);
  if (packet.policyContext) {
    const problems = policyContextProblems(packet, packet.policyContext);
    if (problems.length) return reject(problems.join(" "), false);
  }
  const action = recommendation.action;
  const size = recommendation.sizingBB;
  if (size !== undefined && (!Number.isFinite(size) || size <= 0 || size > stack + 1e-8)) {
    return reject("Sizing is invalid or exceeds hero's stack.");
  }
  if ((action === "CHECK" || action === "FOLD") && size !== undefined) return reject(action + " cannot have an investment size.");
  if (action === "CHECK" && amount > 0) return reject("CHECK is not legal: a positive amount must be called.");
  if (action === "FOLD" && amount === 0) return reject("FOLD is not offered when checking is available.");
  if (action === "CALL") {
    if (amount === 0) return reject("CALL is not legal: there is nothing to call.");
    if (size !== undefined && Math.abs(size - Math.min(amount, stack)) > 1e-8) return reject("CALL size must equal the payable call cost.");
  }
  if (action === "BET" && amount > 0) return reject("BET is not legal facing a wager; an increase would be a RAISE.");
  if (action === "RAISE" && amount === 0) return reject("RAISE is not legal without an outstanding wager in this supported postflop model.");
  if (action === "ALL_IN" && size !== undefined && Math.abs(size - stack) > 1e-8) return reject("ALL_IN size must equal hero's entire remaining stack.");
  const aggressive = action === "BET" || action === "RAISE" || action === "ALL_IN" && stack > amount;
  if (aggressive) {
    if (action !== "ALL_IN" && size === undefined) return reject("BET/RAISE requires an explicit additional-investment size.", false);
    const problems = policyWagerProblems(packet, action === "ALL_IN" ? stack : size!);
    if (problems.length) return reject(problems.join(" "), false);
  }
  return { isLegal: true, effectiveRecommendation: action === "ALL_IN" ? { ...recommendation, sizingBB: stack } : recommendation };
}
