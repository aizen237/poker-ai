import { buildPreflopContext } from "@poker-ai/ai-core";
import type { LiveStateAssessment, ActionHistory } from "@poker-ai/browser-reader";

/** Live polling cannot certify complete history, dealt-in count, or wager semantics. */
export function buildLivePreflopContext(assessment: LiveStateAssessment, actionHistory: ActionHistory) {
  const { state, bigBlind, positions, decisionPot, amountToCall } = assessment;
  if (bigBlind === null || !Number.isFinite(bigBlind) || bigBlind <= 0) return null;
  const hero = state?.seats.find(s => s.isYou);
  try {
    const preflop = state?.street === "preflop" && hero?.isOccupied && bigBlind !== null && state.seats.filter(s => s.isOccupied).length >= 2 ? buildPreflopContext({
        heroSeat: hero.seatNumber,
        players: state.seats.filter(s => s.isOccupied).map(s => ({
          seat: s.seatNumber, position: positions.get(s.seatNumber) ?? null,
          remainingStackBB: s.stack === null ? null : s.stack / bigBlind,
          contributionBB: s.betReadError || s.currentBet === null ? null : s.currentBet / bigBlind,
          folded: s.isFolded, allIn: s.isAllIn ?? false,
        })),
        playersDealtIn: null, potBB: decisionPot === null ? null : decisionPot / bigBlind, amountToCallBB: amountToCall === null ? null : amountToCall / bigBlind,
        contributionMeaning: "unknown", historyCoverage: "partial", tournamentContext: "unknown",
        historyNotes: actionHistory.notes,
        actions: [...actionHistory.records.values()].flat().filter(a => a.street === "preflop").map(a => ({
          seat: a.seat, action: a.action, totalContributionBB: a.amount === null ? null : a.amount / bigBlind,
          observation: a.observation, wagerAction: a.wagerAction,
        })),
      }) : null;
    return preflop;
  } catch {
    // Invalid table reads must not interrupt the polling loop or become advice.
    return null;
  }
}
