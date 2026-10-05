import type { ActionHistory } from "./actionHistory.js";
import type { RawTableInput } from "./gameState.js";
import type { LiveStateAssessment } from "./liveState.js";
import { unknownBettingProof, unknownContestablePot } from "./legalityProof.js";

/** Human observations establish these cases, not a blanket certificate for future hands. */
export const LIVE_LEGALITY_OBSERVATIONS = {
  source: "User live PokerNow evidence, 2026-10-05",
  scope: "Observed situations only; no automatic matching by chip amounts",
  normalRaise: { street: "flop", openingBet: 3, minRaiseButtonResult: 6, displayedBB: "3BB" },
  stackCappedRaise: { heroContribution: 2, heroRemaining: 23, opposingTotal: 20, allowedRaiseTo: 25 },
  potDisplay: { collected: 4, streetContributions: 3, displayedTotal: 7 },
  callGap: { heroContribution: 2, opposingTotal: 8, displayedCall: 6 },
  unverified: ["Last-full-raise event coverage", "PokerNow reopening after short/cumulative all-ins",
    "Whole-hand eligibility and side pots", "Uncalled returns and rake/drop"],
} as const;

/** Never certifies snapshot reconstruction as complete, even with no read errors. */
export function assessLiveLegalityEvidence(raw: RawTableInput, assessment: LiveStateAssessment, history: ActionHistory) {
  const state = assessment.state;
  const seats = state?.seats.filter(s => s.isOccupied) ?? [];
  const hero = seats.find(s => s.isYou);
  // Explicit check-as-zero is supported by the supplied capture. An absent label
  // is still unknown for this accounting proof (including folded players).
  const contributionsKnown = state !== null && seats.length > 0 && seats.every(s =>
    !s.betReadError && (s.currentBet !== null || s.isChecking));
  const subtotal = contributionsKnown ? seats.reduce((sum, s) => sum + (s.currentBet ?? 0), 0) : null;
  const { mainPot, displayedTotalPot } = assessment.pot;
  const ledgerReason = "Current street snapshots do not contain complete whole-hand contributions, all eligible/folded/departed players, returns or rake evidence.";
  return {
    observations: LIVE_LEGALITY_OBSERVATIONS,
    historyCoverage: { kind: "snapshot_inferred" as const, complete: false,
      observedEvents: [...history.records.values()].reduce((n, records) => n + records.length, 0),
      reasons: ["Polling can omit intermediate actions; opponent history omits hero actions.", ...history.notes] },
    betting: unknownBettingProof("Complete ordered street events including hero and a verified reopening rule profile are unavailable."),
    contestablePot: unknownContestablePot(ledgerReason),
    displayReconciliation: {
      confidence: "observation_only" as const,
      source: "Current DOM values; arithmetic comparison only, not pot eligibility proof",
      collectedMainPot: mainPot, displayedTotalPot, currentStreetSubtotal: subtotal,
      matches: subtotal === null || mainPot === null || displayedTotalPot === null ? null
        : Math.abs(mainPot + subtotal - displayedTotalPot) < 1e-8,
      rawMainPotText: raw.potMainValueText, rawDisplayedTotalPotText: raw.potTotalValueText,
    },
    heroMaximumRaiseTo: {
      value: hero?.stack != null && !hero.betReadError && (hero.currentBet !== null || hero.isChecking)
        ? hero.stack + (hero.currentBet ?? 0) : null,
      source: "Read remaining stack plus explicit street contribution; capacity only, not legal permission",
      confidence: "observation_only" as const,
    },
    activation: { allowed: false, reasons: [ledgerReason,
      "Full raise and reopening cannot be proven from this history; selected raise-to/slider values do not supply missing proof.",
      "Existing pot, chip-unit, action-control and policy gates remain in force."] },
  };
}
