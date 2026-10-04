import type { Card } from "@poker-ai/shared";

export interface ShoveOptions {
  /** Explicit hypothetical assumption, never a measured probability. */
  foldEquity?: number;
  iterations?: number;
  rng?: () => number;
}
export interface ShoveEvaluation {
  status: "unavailable";
  authoritative: false;
  ev: null;
  equityIfCalled: null;
  foldEquityUsed: number | null;
  isProfitable: null;
  reason: string;
}
/** V1 has no caller-range/commitment model. Do not calculate actionable EV
 * against random hands or silently assume 50% fold equity. */
export function evaluateShove(heroCards: readonly Card[], effectiveStackBB: number, potBB: number, options: ShoveOptions = {}): ShoveEvaluation {
  if (heroCards.length !== 2) throw new Error("Exactly two hero cards required");
  if (!Number.isFinite(effectiveStackBB) || effectiveStackBB <= 0) throw new Error("effectiveStackBB must be positive and finite");
  if (!Number.isFinite(potBB) || potBB <= 0) throw new Error("potBB must be positive and finite");
  const assumption = options.foldEquity;
  if (assumption !== undefined && (!Number.isFinite(assumption) || assumption < 0 || assumption > 1)) throw new Error("foldEquity must be between 0 and 1");
  return { status: "unavailable", authoritative: false, ev: null, equityIfCalled: null,
    foldEquityUsed: assumption ?? null, isProfitable: null,
    reason: "Caller range and commitment-aware shove model unavailable. Any supplied fold equity is only an assumption; no live shove recommendation is supported." };
}
