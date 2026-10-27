import type { Card } from "@poker-ai/shared";
import { calculateCallEV, calculateFoldEV, calculatePotOdds } from "@poker-ai/poker-engine";
import { calculateExactRiverEquity, riverBettingAssumptions } from "@poker-ai/range-engine";

export const RIVER_PAIRWISE_WARNING = "RAISE not evaluated.";

/** Pure conditional calculation. These inputs are assumptions, NOT a live
 * certificate. The existing source/proof adapter must independently establish
 * identity, freshness, payable price and contestability before any live use. */
export interface RiverCallFoldInput {
  street: string;
  heroCards: readonly Card[];
  board: readonly Card[];
  activeOpponents: number;
  /** Includes the outstanding opponent bet; excludes hero's prospective call. */
  potBeforeCall: number | null;
  amountToCall: number | null;
  heroStack: number | null;
  opponentStack: number | null;
  accounting: "single_pot_no_rake" | "unknown";
}

export function compareRiverCallFold(input: RiverCallFoldInput) {
  const base = { liveAuthorized: false as const, llmMayChoose: false as const,
    warning: RIVER_PAIRWISE_WARNING, foldEV: calculateFoldEV().ev };
  const abstain = (reason: string) => ({ ...base, status: "abstained" as const, reason,
    requiredEquity: null, equityBounds: null, callEVBounds: null, assumptions: [] });
  if (input.street !== "river" || input.board.length !== 5) return abstain("Exactly five river board cards are required.");
  if (input.activeOpponents !== 1) return abstain("Exactly one active opponent is required.");
  if (input.accounting !== "single_pot_no_rake") return abstain("Single contestable pot, resolved returns and no rake/side pots are required.");
  const { potBeforeCall: pot, amountToCall: call, heroStack, opponentStack } = input;
  if (pot === null || call === null || heroStack === null || opponentStack === null ||
      ![pot, call, heroStack, opponentStack, pot + call].every(Number.isFinite))
    return abstain("Pot, CALL amount and both remaining stacks must be finite and known.");
  if (pot <= 0 || call <= 0 || call > pot || call >= heroStack || opponentStack <= 0)
    return abstain("A positive fully payable non-all-in CALL and consistent positive pot are required.");
  try {
    const assumptions = riverBettingAssumptions(input.heroCards, input.board).map(({ range, ...profile }) => {
      const equity = calculateExactRiverEquity(input.heroCards, range, input.board).equity;
      return { ...profile, equity, callEV: calculateCallEV(equity, pot, call).ev };
    });
    const requiredEquity = calculatePotOdds(pot, call).breakevenEquity;
    const equityBounds = { low: Math.min(...assumptions.map(a => a.equity)), high: Math.max(...assumptions.map(a => a.equity)) };
    const callEVBounds = { low: Math.min(...assumptions.map(a => a.callEV)), high: Math.max(...assumptions.map(a => a.callEV)) };
    // At equality neither action is strictly preferred. Tolerance only handles
    // floating-point summation; it is not a confidence or safety margin.
    const status = equityBounds.low > requiredEquity + 1e-10 ? "call_preferred" as const
      : equityBounds.high < requiredEquity - 1e-10 ? "fold_preferred" as const : "uncertain" as const;
    return { ...base, status, requiredEquity, equityBounds, callEVBounds, assumptions,
      reason: status === "call_preferred" ? "CALL preferred to FOLD under all supplied assumptions."
        : status === "fold_preferred" ? "FOLD preferred to CALL under all supplied assumptions."
        : "Range-dependent / uncertain." };
  } catch (error) {
    return abstain(error instanceof Error ? error.message : "River range calculation failed.");
  }
}

/** Locked deterministic wording; intentionally not a Recommendation/action and
 * never sent to an LLM. All numbers retain the caller's common chip/BB unit. */
export function riverCallFoldDisplay(result: ReturnType<typeof compareRiverCallFold>): string[] {
  if (result.status === "abstained") return [`River CALL vs FOLD withheld: ${result.reason}`, result.warning];
  return [result.reason,
    `Required equity: ${(100 * result.requiredEquity!).toFixed(2)}% = CALL / (pot before hero call + CALL).`,
    `Equity sensitivity: ${(100 * result.equityBounds!.low).toFixed(2)}%–${(100 * result.equityBounds!.high).toFixed(2)}%; CALL EV ${result.callEVBounds!.low.toFixed(3)} to ${result.callEVBounds!.high.toFixed(3)}; FOLD EV 0 (input units).`,
    ...result.assumptions.map(a => `${a.label}: equity ${(100 * a.equity).toFixed(2)}%; CALL EV ${a.callEV.toFixed(3)}. ${a.valueAssumption} ${a.bluffAssumption} ${a.valueCombos} value / ${a.bluffCombos} bluff combos.`),
    "Conditional heuristic assumptions; no observed tendencies, solver accuracy or statistical confidence. No live action authorization.",
    result.warning];
}
