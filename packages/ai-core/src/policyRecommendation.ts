import type { DecisionPacket } from "./decisionPacket.js";
import { evaluateDecisionPolicy, type DecisionPolicyResult } from "./decisionPolicy.js";
import type { ModelRouter, RouterOptions, ConsensusResult } from "./modelRouter.js";
import type { Recommendation } from "./recommendation.js";
import { preflopUncertainty } from "./preflopContext.js";
import { validateActionLegality } from "./actionLegality.js";
import { validateReasoningConsistency } from "./consistencyCheck.js";

export interface PolicyRecommendationResult {
  result: Recommendation | ConsensusResult[] | null;
  policy: DecisionPolicyResult;
  decisionSource: "engine_policy" | "llm_fallback" | "abstained";
  explanationSource?: "llm" | "engine";
  blocked?: boolean;
  blockedReason?: string;
  originalReason?: string;
  uncertainty?: string[];
  consistencyWarnings?: string[];
}

function engineExplanation(policy: DecisionPolicyResult): Recommendation {
  const best = policy.actionEVs.find(row => row.action === policy.chosenAction &&
    (policy.chosenSizeBB === null ? row.investmentBB === 0 : row.investmentBB === policy.chosenSizeBB))!;
  return {
    action: policy.chosenAction!,
    ...(policy.chosenSizeBB === null ? {} : { sizingBB: policy.chosenSizeBB }),
    // Compatibility with the old UI's numeric confidence; not a calibrated win probability.
    confidence: 0.65,
    reasoning: `${best.action}${best.investmentBB ? `: invest ${best.investmentBB}BB${best.raiseToBB === undefined ? "" : ` (street total ${best.raiseToBB}BB)`}` : ""}. ` +
      `Estimated EV ${best.evBB!.toFixed(2)}BB, sensitivity bounds ${best.lowBB!.toFixed(2)} to ${best.highBB!.toFixed(2)}BB. ` +
      `Preferred within the supported comparison, conditional on: ${policy.assumptions.join(" ")} ` +
      `Equity: ${policy.equitySource}. Fold equity: ${policy.foldEquitySource}.`,
  };
}

/** The action lock is enforced in code, including manual/consensus/failover paths. */
export async function getPolicyRecommendation(
  packet: DecisionPacket,
  router: ModelRouter,
  options: RouterOptions,
): Promise<PolicyRecommendationResult> {
  const policy = evaluateDecisionPolicy(packet);
  const preflop = preflopUncertainty(packet);
  if (packet.opponentContext?.opponents?.some(opponent => opponent.statsStorage === "unavailable")) {
    return { result: null, policy, decisionSource: "abstained", blocked: true,
      blockedReason: "opponent_storage_unavailable",
      uncertainty: ["Opponent storage failed; retained population priors are not a verified player model. Recommendation withheld."] };
  }
  if (preflop || packet.dataConfidence === "low" || !policy.llmMayChoose && policy.status !== "selected") {
    return { result: null, policy, decisionSource: "abstained", blocked: true,
      blockedReason: preflop ? "preflop_model_uncertain" : packet.dataConfidence === "low" ? "low_confidence" : "policy_uncertain",
      uncertainty: preflop ?? policy.reasons };
  }

  if (policy.status === "selected") {
    const fixed = engineExplanation(policy);
    let explanationSource: "llm" | "engine" = "engine";
    let reasoning = fixed.reasoning;
    try {
      const raw = await router.getRecommendation(packet, options);
      const recommendations = Array.isArray(raw) ? raw.flatMap(row => row.recommendation ? [row.recommendation] : []) : [raw];
      const matching = recommendations.find(rec => rec.action === fixed.action && rec.sizingBB === fixed.sizingBB &&
        validateReasoningConsistency(rec, packet).isConsistent);
      if (matching) { reasoning = matching.reasoning; explanationSource = "llm"; }
    } catch {
      // An explanation outage must not erase or change a supported engine selection.
    }
    // Provider confidence, alternatives, action and size are never copied over the lock.
    return { result: { ...fixed, reasoning }, policy, decisionSource: "engine_policy", explanationSource };
  }

  const raw = await router.getRecommendation(packet, options);
  if (Array.isArray(raw) && !raw.some(row => row.recommendation)) {
    return { result: null, policy, decisionSource: "abstained", blocked: true,
      blockedReason: "all_providers_failed", uncertainty: raw.map(row => `${row.providerName}: ${row.error ?? "No recommendation"}`) };
  }
  const warnings: string[] = [];
  const illegalReasons: string[] = [];
  const validateFallback = (rec: Recommendation): Recommendation | null => {
    const legality = validateActionLegality(rec, packet);
    if (!legality.isLegal) illegalReasons.push(legality.reason!);
    const effective = legality.effectiveRecommendation;
    if (effective === null) return null;
    warnings.push(...validateReasoningConsistency(effective, packet).warnings);
    return { ...effective, reasoning: "AI fallback; no engine-supported selection. " + effective.reasoning };
  };
  const result = Array.isArray(raw)
    ? raw.map(row => {
      if (!row.recommendation) return row;
      const recommendation = validateFallback(row.recommendation);
      return recommendation ? { ...row, recommendation } : { providerName: row.providerName, error: "Recommendation withheld: legality is unverified." };
    })
    : validateFallback(raw);
  return { result, policy, decisionSource: result === null ? "abstained" : "llm_fallback",
    ...(illegalReasons.length ? { blocked: true, blockedReason: "illegal_action", originalReason: illegalReasons.join(" ") } : {}),
    ...(warnings.length ? { consistencyWarnings: warnings } : {}) };
}
