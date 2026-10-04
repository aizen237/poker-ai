import type { Card } from "@poker-ai/shared";
import { calculateEquity } from "@poker-ai/poker-engine";
import type { OpponentRangeEstimate } from "./actionNarrowing.js";
import { calculateEquityVsRange } from "./rangeEquity.js";
import { calculateEquityVsRanges, type MultiwayEquityOptions } from "./multiwayEquity.js";

export interface EstimatedEquityResult {
  equity: number | undefined;
  source: "estimated_range" | "estimated_multiway_ranges" | "random_hands" | undefined;
  reason: string | null;
}
/** Shared live selection policy: no mixed modeled/random simulation masquerades
 * as range equity. Sampling failure of constructed ranges returns unavailable. */
export function calculateEquityForEstimates(hero: readonly Card[], estimates: readonly OpponentRangeEstimate[], board: readonly Card[], options: MultiwayEquityOptions = {}): EstimatedEquityResult {
  if (estimates.length === 0) throw new Error("At least one opponent estimate required");
  const missing = estimates.map((e, i) => e.status !== "modeled" ? "opponent " + (i + 1) + " (" + e.status + ")" : null).filter(Boolean);
  if (missing.length > 0) {
    const reason = "Ranges cannot be constructed for " + missing.join(", ");
    if (estimates.length === 1) return { equity: undefined, source: undefined, reason };
    return { equity: calculateEquity(hero, board, estimates.length, options).equity, source: "random_hands", reason: reason + "; all opponents sampled as random hands, not estimated ranges." };
  }
  try {
    const equity = estimates.length === 1
      ? calculateEquityVsRange(hero, estimates[0]!.range, board, options).equity
      : calculateEquityVsRanges(hero, estimates.map(e => e.range), board, options).equity;
    return { equity, source: estimates.length === 1 ? "estimated_range" : "estimated_multiway_ranges", reason: null };
  } catch (error) {
    return { equity: undefined, source: undefined, reason: "Range equity unavailable: " + (error instanceof Error ? error.message : String(error)) };
  }
}
