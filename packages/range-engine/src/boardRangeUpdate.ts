import type { Card } from "@poker-ai/shared";
import type { RangeAction } from "./actionNarrowing.js";
import type { ComboRange } from "./comboRange.js";
import type { Position } from "./openingRanges.js";
import type { OfflineRangeHistory } from "./offlineConditioning.js";

/** Descriptive metadata, never a decision/source certificate or permission to act. */
export interface RangeProvenance {
  readonly basis: string;
  readonly evidenceRefs: readonly string[];
  readonly model: { readonly id: string; readonly version: string; readonly validation: "unvalidated" | "independently_validated" } | null;
}

export interface RangeUncertainty {
  readonly confidence: "unknown" | "low" | "medium";
  readonly assumptions: readonly string[];
  readonly limitations: readonly string[];
  /** Optional sensitivity scenarios, not a confidence interval or response frequencies. */
  readonly alternatives: readonly ComboRange[];
}

export interface OpponentRangeState {
  readonly range: ComboRange;
  readonly provenance: readonly RangeProvenance[];
  readonly uncertainty: RangeUncertainty;
  /** Offline evidence binding, never a live source proof. */
  readonly offlineHistory?: OfflineRangeHistory;
}

/** Offline model boundary. Implementations must validate street/board,
 * unique cards, action order and model scope; remove known cards; and preserve
 * evidence identities/deadlines. Unknown context must not become invented data. */
export interface BoardRangeUpdateInput {
  readonly prior: OpponentRangeState;
  readonly heroCards: readonly [Card, Card];
  readonly board: readonly Card[];
  readonly action: RangeAction & { readonly street: "flop" | "turn" | "river" };
  readonly context: {
    readonly position?: Position | null;
    readonly potBB: number | null;
    readonly facingAmountBB: number | null;
    /** Wager's street-total size; offline conditioning uses 0 for check/fold.
     * Does not independently establish payable call cost or raise legality. */
    readonly actionToBB: number | null;
    readonly effectiveStackBB: number | null;
    readonly opponentsRemaining: number | null;
  };
  readonly evidence: {
    readonly handId: string | null;
    readonly decisionId: string | null;
    readonly eventId: string | null;
    readonly sourceId?: string | null;
    readonly opponentId?: string | null;
    readonly observedAt: number;
    readonly originalExpiresAt: number | null;
    readonly historyCoverage: "complete" | "partial" | "unknown";
    readonly provenance: readonly RangeProvenance[];
  };
}

/** No default likelihoods are supplied. An unavailable
 * result has no usable posterior; unchanged retains only the legal prior and
 * records why conditioning was unsupported. Updated is not strategic validation.
 * Supplied likelihood models use w'(c) = w(c) P(observed action | c, context),
 * then normalize over legal cards; zero evidence mass must return unavailable. */
export type BoardRangeUpdateResult =
  | { status: "updated" | "unchanged"; state: OpponentRangeState; reasons: readonly string[] }
  | { status: "unavailable"; state: null; reasons: readonly string[] };

export type BoardRangeUpdater = (input: BoardRangeUpdateInput) => BoardRangeUpdateResult;
