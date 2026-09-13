/**
 * A minimal per-player action record from a single hand, scoped to
 * exactly what stat computation needs. This intentionally overlaps with
 * (and could later merge into) a fuller canonical hand-history/replay
 * format per the original spec's Rule 2 -- kept narrow here since
 * opponent-db's only job is turning actions into stats, not replaying
 * full hands.
 */
export interface PlayerHandActions {
  playerName: string;
  /** Did this player voluntarily put money in preflop (call or raise)? */
  vpip: boolean;
  /** Did this player raise preflop (as the first raiser or otherwise)? */
  pfr: boolean;
  /** Did this player 3-bet at any point preflop? */
  threeBet: boolean;
  /** Did this player face a 3-bet preflop at all? (denominator for fold-to-3bet) */
  facedThreeBet: boolean;
  /** If they faced a 3-bet, did they fold to it? */
  foldedToThreeBet: boolean;
  /** Did this player make a continuation bet (bet after raising preflop, on the flop)? */
  cBet: boolean;
  /** Did this player have the opportunity to c-bet (they raised preflop and saw a flop)? */
  hadCBetOpportunity: boolean;
  /** Did this player face a continuation bet? */
  facedCBet: boolean;
  /** If they faced a c-bet, did they fold? */
  foldedToCBet: boolean;
  /** Did this player reach showdown? */
  wentToShowdown: boolean;
  /** If they reached showdown, did they win? */
  wonAtShowdown: boolean;
  /** Total number of bets/raises made, for a simple aggression count. */
  betsAndRaises: number;
  /** Total number of calls made, for a simple aggression count. */
  calls: number;
}

export type ConfidenceLevel = "low" | "moderate" | "strong";

/**
 * Sample-size thresholds for confidence banding, per the original
 * spec's example (10 hands = low, 100 = moderate, 1000+ = strong).
 * Visible constants, not hidden magic numbers -- same pattern as
 * board texture / Chen score thresholds elsewhere in this project.
 */
export const CONFIDENCE_THRESHOLDS = {
  moderate: 100,
  strong: 1000,
} as const;

export function getConfidenceLevel(handsObserved: number): ConfidenceLevel {
  if (handsObserved >= CONFIDENCE_THRESHOLDS.strong) return "strong";
  if (handsObserved >= CONFIDENCE_THRESHOLDS.moderate) return "moderate";
  return "low";
}

export interface OpponentStats {
  playerName: string;
  handsObserved: number;
  confidence: ConfidenceLevel;
  vpipPercent: number;
  pfrPercent: number;
  threeBetPercent: number;
  foldToThreeBetPercent: number | null;
  cBetPercent: number | null;
  foldToCBetPercent: number | null;
  wtsdPercent: number;
  wsdPercent: number | null;
  /** Simple aggression factor: (bets + raises) / calls. Null if no calls observed (avoids divide-by-zero). */
  aggressionFactor: number | null;
}