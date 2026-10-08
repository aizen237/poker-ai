import { evaluateDecisionPolicy, generatePolicyCandidates, type DecisionPacket, type PreflopContext } from "@poker-ai/ai-core";
import type { ActionHistory, LiveStateAssessment } from "@poker-ai/browser-reader";
import { assessLiveLegalityEvidence } from "@poker-ai/browser-reader";
import { formatCards } from "@poker-ai/shared";
import type { LiveTableRead } from "./tableRead.js";

const DIAGNOSTICS_KEY = "poker-ai:diagnostics";
let lastSnapshot: string | null = null;

/** Pure snapshot assembly; raw-value fixtures do not claim to verify PokerNow DOM behavior. */
export function buildLiveDiagnosticSnapshot(
  read: LiveTableRead, assessment: LiveStateAssessment, history: ActionHistory,
  preflop: PreflopContext | null = null, packet: DecisionPacket | null = null,
  unclassifiedControls: unknown[] = [],
) {
  const seats = assessment.state?.seats ?? [];
  const seatRow = (seat: (typeof seats)[number]) => {
    const raw = read.raw.seats.find(row => row.seatNumber === seat.seatNumber);
    return { seat: seat.seatNumber, player: seat.playerName, position: assessment.positions.get(seat.seatNumber) ?? null,
      stack: seat.stack, currentBet: seat.currentBet, stackText: raw?.stackText ?? null, currentBetText: raw?.betValueText ?? null,
      isAllIn: seat.isAllIn ?? false, isFolded: seat.isFolded, isOffline: seat.isOffline,
      isCurrentToAct: seat.isCurrentToAct, isChecking: seat.isChecking, betReadError: seat.betReadError ?? false };
  };
  const hero = seats.find(s => s.isOccupied && s.isYou);
  const opponents = seats.filter(s => s.isOccupied && !s.isYou && !s.isFolded);
  const occupied = seats.filter(s => s.isOccupied);
  const policy = packet ? evaluateDecisionPolicy(packet) : null;
  return {
    version: 2,
    parsedStateAvailable: assessment.state !== null,
    units: { read: "chips", decisionPacket: "BB", candidateSizes: "additional BB; raiseToBB is total street BB" },
    street: assessment.state?.street ?? null,
    board: assessment.state ? formatCards(assessment.state.board) : null,
    hero: hero ? seatRow(hero) : null,
    activeOpponents: opponents.map(seatRow),
    seats: occupied.map(seatRow),
    monetary: {
      rawMainPotText: read.raw.potMainValueText,
      rawDisplayedTotalPotText: read.raw.potTotalValueText,
      potContainerText: read.evidence.potContainerText,
      ...assessment.pot,
      calculatedAmountToCall: assessment.amountToCall,
      contributionSemantics: assessment.verification.monetary.contributionSemantics,
      callGap: assessment.verification.monetary.callGap,
      potDisplayReconciliation: assessment.verification.monetary.potDisplay,
      amountToCallMeaning: "uncapped gap from explicit total street contributions/check; absent labels remain unknown; see callGap provenance",
      highestActiveOpposingContribution: assessment.verification.monetary.highestOpposingContribution,
      knownNumericBetSubtotalIncludingFolded: assessment.state ? occupied.reduce((sum, s) => sum + (s.currentBet ?? 0), 0) : null,
      betSubtotalHasUnknowns: !assessment.state || assessment.verification.monetary.contributions.some(s => s.contribution.value === null),
      // Folded money still belongs to the pot; it is excluded only from the call target.
      foldedNumericBetSubtotal: assessment.state ? occupied.filter(s => s.isFolded).reduce((sum, s) => sum + (s.currentBet ?? 0), 0) : null,
      smallBlind: assessment.smallBlind, bigBlind: assessment.bigBlind, rawBlindTexts: read.context.blindTexts,
      allInCallCostIfGapIsCorrect: hero?.stack == null || assessment.amountToCall === null ? null : Math.min(hero.stack, assessment.amountToCall),
    },
    legality: { ...assessment.legality, proof: assessLiveLegalityEvidence(read.raw, assessment, history), raiseControl: read.raiseControl, unclassifiedControls,
      controlsMeaning: "Selected raise-to is input evidence, not a legal minimum. Slider attributes and unclassified controls do not verify legality." },
    decision: {
      packetBuilt: packet !== null,
      decisionPotActuallyUsedBB: packet?.table.potBB ?? null,
      packetAmountToCallBB: packet?.facingAction.amountBB ?? null,
      policyPotActuallyUsedBB: packet?.policyContext?.potVerified && policy && policy.actionEVs.some(row => row.action !== "FOLD" && row.evBB !== null) ? packet.table.potBB : null,
      candidateActionSizes: packet ? generatePolicyCandidates(packet) : [],
      candidateSizeStatus: packet?.policyContext ? "see policy reasons and verified bounds" : "withheld: no verified policy legality/pot inputs",
      policy,
      potEvidence: packet?.potEvidence ?? null,
      engineCalculations: packet?.engineCalculations ?? null,
    },
    confidence: assessment.confidence,
    preflop,
    raw: read.raw, evidence: read.evidence, context: read.context,
    actionHistory: { records: Object.fromEntries(history.records), observation: history.observation, notes: history.notes },
    assumptions: {
      pot: "Total = collected + street contributions was observed live; hero eligibility, returns and side pots still require proof before EV use.",
      positions: "Ascending seat numbers assumed clockwise; verify against dealer and screen.",
      bets: "Numeric labels are street totals and explicit check is zero in supported reads. Absence/other action words remain unknown.",
      street: "Board counts 0/3/4/5 and an observed new-hand reset were confirmed live; this is not a stable hand identifier.",
      opponents: "Occupied and non-folded, including offline/all-in; sitting-out semantics still unverified.",
    },
  };
}

/** Inspect standard visible controls only while debugging, without inventing PokerNow selectors. */
function readUnclassifiedControls(): unknown[] {
  return [...document.querySelectorAll('button, [role="button"], input[type="number"], input[type="range"]')]
    .filter(el => { const rect = el.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden"; })
    .map(el => ({ tag: el.tagName, text: el.textContent?.trim() ?? "", ariaLabel: el.getAttribute("aria-label"),
      disabled: el.hasAttribute("disabled"), ariaDisabled: el.getAttribute("aria-disabled"),
      type: el.getAttribute("type"), value: el instanceof HTMLInputElement ? el.value : null,
      min: el.getAttribute("min"), max: el.getAttribute("max"), step: el.getAttribute("step"),
    }));
}

/** Existing opt-in toggle: 1 = changed snapshots, once = one snapshot then disable. */
export function logLiveDiagnostics(
  read: LiveTableRead, assessment: LiveStateAssessment, history: ActionHistory,
  preflop: PreflopContext | null = null, packet: DecisionPacket | null = null,
): void {
  let mode: string | null = null;
  try { mode = localStorage.getItem(DIAGNOSTICS_KEY); } catch { /* diagnostics stay off */ }
  if (mode !== "1" && mode !== "once") { lastSnapshot = null; return; }
  const snapshot = buildLiveDiagnosticSnapshot(read, assessment, history, preflop, packet, readUnclassifiedControls());
  const serialized = JSON.stringify(snapshot);
  if (mode !== "once" && serialized === lastSnapshot) return;
  lastSnapshot = serialized;
  const captured = { capturedAt: new Date().toISOString(), ...JSON.parse(serialized) };
  console.groupCollapsed("[Poker AI State] " + captured.capturedAt + " | " + snapshot.street + " | confidence=" + assessment.confidence.level);
  console.log("Monetary/legality snapshot", captured);
  console.table(snapshot.seats);
  console.log("Copyable snapshot JSON", JSON.stringify(captured));
  console.groupEnd();
  if (mode === "once") { try { localStorage.removeItem(DIAGNOSTICS_KEY); } catch { /* no effect on safety gates */ } }
}
