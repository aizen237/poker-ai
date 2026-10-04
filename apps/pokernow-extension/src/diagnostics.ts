import type { ActionHistory, LiveStateAssessment } from "@poker-ai/browser-reader";
import { formatCards } from "@poker-ai/shared";
import type { LiveTableRead } from "./tableRead.js";

const DIAGNOSTICS_KEY = "poker-ai:diagnostics";
let lastSnapshot: string | null = null;

/** Opt in from the PokerNow tab console; re-read the toggle on every poll. */
export function logLiveDiagnostics(read: LiveTableRead, assessment: LiveStateAssessment, history: ActionHistory): void {
  let enabled = false;
  try { enabled = localStorage.getItem(DIAGNOSTICS_KEY) === "1"; } catch { /* Storage disabled: diagnostics stay off. */ }
  if (!enabled) { lastSnapshot = null; return; }
  const seats = assessment.state?.seats ?? [];
  const snapshot = {
    raw: read.raw, evidence: read.evidence, context: read.context,
    actionHistory: { records: Object.fromEntries(history.records), observation: history.observation, notes: history.notes },
    parsed: {
      ...assessment, positions: Object.fromEntries(assessment.positions),
      boardCards: assessment.state ? formatCards(assessment.state.board) : null,
      currentToActSeats: seats.filter((seat) => seat.isCurrentToAct).map((seat) => seat.seatNumber),
    },
    assumptions: {
      pot: "UNVERIFIED: main and add-on preserved separately; decisionPot is null; no pot odds or recommendations",
      positions: "UNVERIFIED: ascending seat numbers wrap clockwise; folded occupied seats retain positions",
      bets: "Absent/check indicators count as zero; confirm against the visible call button; call gap is not stack-capped",
      street: "Derived from parsed board count; not independently read from PokerNow",
      opponents: "Occupied and non-folded; includes all-in and offline players; sitting-out semantics need live confirmation",
    },
  };
  const serialized = JSON.stringify(snapshot);
  if (serialized === lastSnapshot) return;
  lastSnapshot = serialized;
  console.groupCollapsed(`[Poker AI State] ${new Date().toISOString()} | ${assessment.state?.street ?? "unreadable"} | confidence=${assessment.confidence.level}`);
  // Serialize/parse so DevTools cannot display a later mutation of the snapshot.
  console.log("Snapshot (raw selectors -> parsed fields -> confidence)", JSON.parse(serialized));
  console.table([...history.records.values()].flat());
  console.table(read.raw.seats.map((raw) => {
    const seat = seats.find((s) => s.seatNumber === raw.seatNumber);
    return {
      seat: raw.seatNumber, player: seat?.playerName ?? raw.playerNameText,
      occupied: raw.isOccupied, hero: raw.isYou,
      position: assessment.positions.get(raw.seatNumber) ?? "unknown",
      dealer: raw.seatNumber === read.context.dealerSeatNumber,
      stackText: raw.stackText, stack: seat?.stack ?? null, allIn: seat?.isAllIn ?? false,
      betText: raw.betValueText, currentBet: seat?.currentBet ?? null, betUnreadable: seat?.betReadError ?? null,
      cards: seat ? formatCards(seat.holeCards) : "unreadable",
      folded: seat?.isFolded ?? null, toAct: seat?.isCurrentToAct ?? null, offline: seat?.isOffline ?? null,
    };
  }));
  console.log("Pot comparison", {
    mainText: read.raw.potMainValueText, main: assessment.state?.potMainValue ?? null,
    addOnText: read.raw.potTotalValueText, addOn: assessment.state?.potTotalValue ?? null,
    knownCurrentBetSubtotal: assessment.state ? seats.filter((s) => s.isOccupied).reduce((sum, s) => sum + (s.currentBet ?? 0), 0) : null,
    currentBetSumHasUnknowns: seats.some((s) => s.betReadError),
    amountToCall: assessment.amountToCall, smallBlind: assessment.smallBlind, bigBlind: assessment.bigBlind,
    activeOpponents: assessment.activeOpponents, decisionPot: assessment.decisionPot,
  });
  console.log("Copyable snapshot JSON", JSON.stringify({ capturedAt: new Date().toISOString(), ...snapshot }));
  console.groupEnd();
}
