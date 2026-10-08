import type { ActionHistory } from "./actionHistory.js";
import type { RawTableInput } from "./gameState.js";
import type { LiveStateAssessment } from "./liveState.js";
import { unknownContestablePot } from "./legalityProof.js";
import { CONTROLLED_LIVE_SOURCE } from "./scopedLiveVerification.js";

/** Human observations establish these cases, not a blanket certificate for future hands. */
export const LIVE_LEGALITY_OBSERVATIONS = {
  source: CONTROLLED_LIVE_SOURCE,
  scope: "Observed situations only; no automatic matching by chip amounts",
  normalRaise: { street: "flop", openingBet: 3, minRaiseButtonResult: 6, displayedBB: "3BB" },
  normalRaise2: { street: "flop", openingBet: 2, minRaiseButtonResult: 4, displayedBB: "2BB" },
  shortUnderRaise: { orderedAggressionTotals: [3, 6, 8], lastIsAllIn: true, minimumBeforeShortRaise: 9,
    alreadyActedTotal: 6, displayedCall: 2, raiseEnabled: false },
  stackCappedRaise: { heroContribution: 2, heroRemaining: 23, opposingTotal: 20, allowedRaiseTo: 25 },
  potDisplay: { collected: 4, streetContributions: 3, displayedTotal: 7 },
  potDisplays: [{ collected: 6, contributions: [2], total: 8 },
    { collected: 6, contributions: [4, 6, 8], total: 24 },
    { collected: 6, contributions: [36, 18, 36], total: 96 }],
  callGap: { heroContribution: 2, opposingTotal: 8, displayedCall: 6 },
  observedStateBehavior: ["Numeric wagers are total street contributions", "Explicit check is zero contribution",
    "Fold and all-in markers", "Board counts 0/3/4/5 across streets", "Observed new-hand board/history reset",
    "Heads-up unequal all-in display excludes remaining stacks"],
  unverified: ["Completeness of polling history", "Full all-in/cumulative reopening and other actors/sequences",
    "Whole-hand eligibility and side pots", "Uncalled returns and rake/drop", "Away/sit-out detection"],
} as const;

/** Never certifies snapshot reconstruction as complete, even with no read errors. */
export function assessLiveLegalityEvidence(raw: RawTableInput, assessment: LiveStateAssessment, history: ActionHistory) {
  const state = assessment.state;
  const seats = state?.seats.filter(s => s.isOccupied) ?? [];
  const hero = seats.find(s => s.isYou);
  const { monetary, betting } = assessment.verification;
  const ledgerReason = "Current street snapshots do not contain complete whole-hand contributions, all eligible/folded/departed players, returns or rake evidence.";
  return {
    observations: LIVE_LEGALITY_OBSERVATIONS,
    historyCoverage: { kind: "snapshot_inferred" as const, complete: false,
      observedEvents: [...history.records.values()].reduce((n, records) => n + records.length, 0),
      reasons: ["Polling can omit intermediate actions; opponent history omits hero actions.", ...history.notes] },
    contributionSemantics: monetary.contributionSemantics,
    callGap: monetary.callGap,
    contributions: monetary.contributions,
    betting,
    contestablePot: unknownContestablePot(ledgerReason),
    displayReconciliation: {
      ...monetary.potDisplay,
      rawMainPotText: raw.potMainValueText, rawDisplayedTotalPotText: raw.potTotalValueText,
    },
    heroMaximumRaiseTo: {
      value: hero?.stack != null && !hero.betReadError && (hero.currentBet !== null || hero.isChecking)
        ? hero.stack + (hero.currentBet ?? 0) : null,
      source: "Read remaining stack plus explicit street contribution; capacity only, not legal permission",
      confidence: "observation_only" as const,
    },
    activation: { allowed: false, reasons: [ledgerReason,
      ...betting.fullMinimumRaiseTo.reasons, ...betting.actionReopened.reasons,
      "Existing pot, chip-unit, action-control and policy gates remain in force."] },
  };
}
