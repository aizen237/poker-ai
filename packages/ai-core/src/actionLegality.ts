import type { Recommendation } from "./recommendation.js";
import type { DecisionPacket } from "./decisionPacket.js";

export interface LegalityResult {
  isLegal: boolean;
  reason?: string;
  /** The recommendation to actually use -- either the original (if legal) or a safe fallback. */
  effectiveRecommendation: Recommendation;
}

/**
 * Deterministic legality check on an AI recommendation against the
 * actual decision packet it was generated from. This is NOT about
 * whether the recommendation is strategically good -- only whether the
 * action is even possible in the current state. An illegal
 * recommendation never reaches the UI as-is; it's replaced with a safe,
 * clearly-labeled fallback (FOLD) plus the reason, so a person is never
 * shown an impossible action to click.
 */
export function validateActionLegality(
  recommendation: Recommendation,
  packet: DecisionPacket,
): LegalityResult {
  const facingBet = packet.facingAction.type === "bet" || packet.facingAction.type === "raise" || packet.facingAction.type === "all_in";
  const amountBB = packet.facingAction.amountBB ?? 0;

  if (recommendation.action === "CHECK" && facingBet) {
    return fallback(`CHECK is not legal: hero is facing a bet of ${amountBB}BB and must call, raise, or fold.`);
  }

  if (recommendation.action === "CALL" && !facingBet) {
    return fallback("CALL is not legal: there is no bet for hero to call.");
  }

  if (recommendation.action === "ALL_IN" && packet.hero.stackBB <= 0) {
    return fallback("ALL_IN is not legal: hero has no remaining stack.");
  }

  if ((recommendation.action === "BET" || recommendation.action === "RAISE") && recommendation.sizingBB !== undefined) {
    if (recommendation.sizingBB > packet.hero.stackBB) {
      return fallback(
        `${recommendation.action} sizing of ${recommendation.sizingBB}BB exceeds hero's stack of ${packet.hero.stackBB}BB.`,
      );
    }
  }

  return { isLegal: true, effectiveRecommendation: recommendation };
}

function fallback(reason: string): LegalityResult {
  return {
    isLegal: false,
    reason,
    effectiveRecommendation: {
      action: "FOLD",
      confidence: 0,
      reasoning: `AI recommendation rejected as illegal: ${reason} Defaulting to FOLD as the safest action.`,
    },
  };
}