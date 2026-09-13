import {
  CONFIDENCE_THRESHOLDS,
  getConfidenceLevel,
  type OpponentStats,
  type PlayerHandActions,
} from "./types.js";

/** Safely computes a percentage, returning null instead of NaN/Infinity when the denominator is 0. */
function safePercent(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return (numerator / denominator) * 100;
}

/**
 * Aggregates a player's actions across many hands into overall stats.
 * All hands passed in must belong to the same player -- this function
 * does not filter by playerName itself, since the caller (typically
 * backed by the database layer) is expected to have already queried
 * for one specific player's hand history.
 */
export function computeOpponentStats(playerName: string, hands: readonly PlayerHandActions[]): OpponentStats {
  const handsObserved = hands.length;

  if (handsObserved === 0) {
    // No data at all -- every rate stat is null (never a misleading 0%),
    // confidence is trivially "low".
    return {
      playerName,
      handsObserved: 0,
      confidence: "low",
      vpipPercent: 0,
      pfrPercent: 0,
      threeBetPercent: 0,
      foldToThreeBetPercent: null,
      cBetPercent: null,
      foldToCBetPercent: null,
      wtsdPercent: 0,
      wsdPercent: null,
      aggressionFactor: null,
    };
  }

  const vpipCount = hands.filter((h) => h.vpip).length;
  const pfrCount = hands.filter((h) => h.pfr).length;
  const threeBetCount = hands.filter((h) => h.threeBet).length;

  const facedThreeBetCount = hands.filter((h) => h.facedThreeBet).length;
  const foldedToThreeBetCount = hands.filter((h) => h.facedThreeBet && h.foldedToThreeBet).length;

  const cBetOpportunityCount = hands.filter((h) => h.hadCBetOpportunity).length;
  const cBetCount = hands.filter((h) => h.hadCBetOpportunity && h.cBet).length;

  const facedCBetCount = hands.filter((h) => h.facedCBet).length;
  const foldedToCBetCount = hands.filter((h) => h.facedCBet && h.foldedToCBet).length;

  const showdownCount = hands.filter((h) => h.wentToShowdown).length;
  const wonAtShowdownCount = hands.filter((h) => h.wentToShowdown && h.wonAtShowdown).length;

  const totalBetsAndRaises = hands.reduce((sum, h) => sum + h.betsAndRaises, 0);
  const totalCalls = hands.reduce((sum, h) => sum + h.calls, 0);

  return {
    playerName,
    handsObserved,
    confidence: getConfidenceLevel(handsObserved),
    vpipPercent: safePercent(vpipCount, handsObserved) ?? 0,
    pfrPercent: safePercent(pfrCount, handsObserved) ?? 0,
    threeBetPercent: safePercent(threeBetCount, handsObserved) ?? 0,
    foldToThreeBetPercent: safePercent(foldedToThreeBetCount, facedThreeBetCount),
    cBetPercent: safePercent(cBetCount, cBetOpportunityCount),
    foldToCBetPercent: safePercent(foldedToCBetCount, facedCBetCount),
    wtsdPercent: safePercent(showdownCount, handsObserved) ?? 0,
    wsdPercent: safePercent(wonAtShowdownCount, showdownCount),
    aggressionFactor: totalCalls === 0 ? null : totalBetsAndRaises / totalCalls,
  };
}

export { CONFIDENCE_THRESHOLDS, getConfidenceLevel };