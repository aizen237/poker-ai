import { calculateCallEV, calculateFoldEV, calculatePotOdds } from "@poker-ai/poker-engine";
import { calculateExactTurnEquity, turnBettingAssumptions } from "@poker-ai/range-engine";
import type { RiverCallFoldInput } from "./riverCallFold.js";

export const TURN_CHECKDOWN_WARNING = "Future river betting is unmodeled. Unconditional CALL/FOLD recommendation withheld. RAISE not evaluated.";
export type TurnCallFoldInput = RiverCallFoldInput;

/** Numerical diagnostic only. A payable turn call does NOT end betting. */
export function compareTurnCallFold(input: TurnCallFoldInput) {
  const base = { liveAuthorized: false as const, llmMayChoose: false as const, chosenAction: null,
    assumption: "checkdown" as const, warning: TURN_CHECKDOWN_WARNING, foldEV: calculateFoldEV().ev };
  const abstain = (reason: string) => ({ ...base, status: "abstained" as const, reason,
    requiredEquity: null, equityBounds: null, callEVBounds: null, assumptions: [] });
  if (input.street !== "turn" || input.board.length !== 4) return abstain("Exactly four turn board cards are required.");
  if (input.activeOpponents !== 1) return abstain("Exactly one active opponent is required.");
  if (input.accounting !== "single_pot_no_rake") return abstain("Single contestable pot, resolved returns and no rake/side pots are required.");
  const { potBeforeCall: pot, amountToCall: call, heroStack, opponentStack } = input;
  if (pot === null || call === null || heroStack === null || opponentStack === null ||
      ![pot, call, heroStack, opponentStack, pot + call].every(Number.isFinite))
    return abstain("Pot, CALL amount and both remaining stacks must be finite and known.");
  if (pot <= 0 || call <= 0 || call > pot || call >= heroStack || opponentStack <= 0)
    return abstain("A positive fully payable non-all-in CALL and consistent positive pot are required.");
  try {
    const assumptions = turnBettingAssumptions(input.heroCards, input.board).map(({ range, ...profile }) => {
      const equity = calculateExactTurnEquity(input.heroCards, range, input.board).equity;
      return { ...profile, equity, callEV: calculateCallEV(equity, pot, call).ev };
    });
    return { ...base, status: "conditional" as const,
      reason: "Conditional CALL versus FOLD only: assumes no further betting and showdown on the river.",
      requiredEquity: calculatePotOdds(pot, call).breakevenEquity,
      equityBounds: { low: Math.min(...assumptions.map(a => a.equity)), high: Math.max(...assumptions.map(a => a.equity)) },
      callEVBounds: { low: Math.min(...assumptions.map(a => a.callEV)), high: Math.max(...assumptions.map(a => a.callEV)) }, assumptions };
  } catch (error) {
    return abstain(error instanceof Error ? error.message : "Turn range calculation failed.");
  }
}

export function turnCallFoldDisplay(result: ReturnType<typeof compareTurnCallFold>): string[] {
  if (result.status === "abstained") return [`Turn checkdown calculation withheld: ${result.reason}`, result.warning];
  return [result.reason,
    `Required equity: ${(100 * result.requiredEquity!).toFixed(2)}% = CALL / (pot before hero call + CALL).`,
    `Estimated turn equity under supplied ranges: ${(100 * result.equityBounds!.low).toFixed(2)}%–${(100 * result.equityBounds!.high).toFixed(2)}%.`,
    `Checkdown-only CALL EV ${result.callEVBounds!.low.toFixed(3)} to ${result.callEVBounds!.high.toFixed(3)}; FOLD EV 0 (input units; prior contributions sunk).`,
    ...result.assumptions.map(a => `${a.label}: checkdown equity ${(100 * a.equity).toFixed(2)}%; conditional CALL EV ${a.callEV.toFixed(3)}. ${a.valueAssumption} ${a.bluffAssumption} ${a.valueCombos} value / ${a.bluffCombos} bluff combos.`),
    "All legal river cards evaluated, with card removal and half of ties. Range sensitivity is not a confidence interval. Possible river bets, folds and additional costs can change realized EV.",
    "Conditional heuristic assumptions; no observed tendencies, solver accuracy or statistical confidence. No live action authorization.", result.warning];
}
