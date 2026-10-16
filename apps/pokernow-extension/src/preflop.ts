import { buildPreflopContext, type DecisionPacket } from "@poker-ai/ai-core";
import type { LiveStateAssessment, ActionHistory } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import { currentFirstUtg } from "./firstUtgLive.js";

/** Current observations only. This neither certifies the source window nor supplies legal minima. */
export function buildLivePreflopExecution(read: LiveTableRead, assessment: LiveStateAssessment,
  sourceWindowKey: string, exactOpeningSize?: NonNullable<DecisionPacket["preflopExecution"]>["exactOpeningSize"]): DecisionPacket["preflopExecution"] {
  const hero = assessment.state?.seats.find(s => s.isYou && s.isOccupied);
  const control = read.raiseControl;
  return { heroIsCurrentToAct: hero?.isCurrentToAct === true && !hero.isFolded && !hero.isSettling,
    ...(exactOpeningSize ? { exactOpeningSize } : {}),
    sourceWindowKey, controls: { source: control.selectedRaiseToSource ?? "PokerNow raise control unavailable",
      formVisible: control.formVisible, raiseSubmitVisible: control.raiseSubmitVisible,
      raiseSubmitEnabled: control.raiseSubmitEnabled, issues: [...control.issues],
      selectedRaiseToBB: assessment.bigBlind !== null && assessment.bigBlind > 0 && control.selectedRaiseToChips !== null
        ? control.selectedRaiseToChips / assessment.bigBlind : null } };
}

/** Polling remains partial. Only the independently validated source first-UTG
 * boundary supplies a complete *decision-local* empty voluntary window. */
export function buildLivePreflopContext(assessment: LiveStateAssessment, actionHistory: ActionHistory, timeline?: LiveTimelineDiagnostic | null, read?: LiveTableRead) {
  const { state, bigBlind, positions, decisionPot, amountToCall } = assessment;
  if (bigBlind === null || !Number.isFinite(bigBlind) || bigBlind <= 0) return null;
  const hero = state?.seats.find(s => s.isYou);
  try {
    const first = currentFirstUtg(read, assessment, timeline);
    if (first) return buildPreflopContext({
      heroSeat: first.heroSeat, playersDealtIn: 6,
      players: first.players.map(p => ({ seat: p.seat, position: p.position,
        remainingStackBB: state!.seats.find(s => s.seatNumber === p.seat)!.stack! / bigBlind,
        contributionBB: p.contribution / bigBlind, folded: false, allIn: false })),
      potBB: decisionPot === null ? null : decisionPot / bigBlind, amountToCallBB: 1,
      contributionMeaning: "street_total", historyCoverage: "complete",
      openingEvidence: "first_utg_hand_start", actions: [], historyNotes: [], tournamentContext: "chip_ev_only",
    });
    const preflop = state?.street === "preflop" && hero?.isOccupied && bigBlind !== null && state.seats.filter(s => s.isOccupied).length >= 2 ? buildPreflopContext({
        heroSeat: hero.seatNumber,
        players: state.seats.filter(s => s.isOccupied).map(s => ({
          seat: s.seatNumber, position: positions.get(s.seatNumber) ?? null,
          remainingStackBB: s.stack === null ? null : s.stack / bigBlind,
          contributionBB: s.betReadError || s.currentBet === null ? null : s.currentBet / bigBlind,
          folded: s.isFolded, allIn: s.isAllIn ?? false,
        })),
        playersDealtIn: null, potBB: decisionPot === null ? null : decisionPot / bigBlind, amountToCallBB: amountToCall === null ? null : amountToCall / bigBlind,
        contributionMeaning: assessment.verification.monetary.contributionSemantics.status === "proven" ? "street_total" : "unknown",
        historyCoverage: "partial", tournamentContext: "unknown",
        historyNotes: timeline ? ["Source rows do not certify coverage/catch-up of the current decision window."] : actionHistory.notes,
        actions: timeline ? timeline.current.events.flatMap(e => {
          if (e.source !== "pokernow_log_v3" || e.street !== "preflop" || e.actor?.seat == null ||
            !["post", "check", "call", "bet", "raise", "fold", "all-in"].includes(e.action)) return [];
          return [{ seat: e.actor.seat, action: e.action === "post" ? "post_blind" as const : e.action as "check" | "call" | "bet" | "raise" | "fold" | "all-in",
            // Only raise-to is verified as a total in the server parser. No call increment conversion.
            totalContributionBB: e.amountMeaning === "street_total" && e.amount !== null ? e.amount / bigBlind : null,
            observation: e.sourceTimestamp!, wagerAction: e.wagerAction === "post" ? null : e.wagerAction }];
        }) : [...actionHistory.records.values()].flat().filter(a => a.street === "preflop").map(a => ({
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
