export interface PotOddsResult {
  /** Breakeven equity fraction (0-1) needed for calling to be profitable. */
  breakevenEquity: number;
  /** Same number as a human-readable percentage, e.g. 20 for 20%. */
  breakevenEquityPercent: number;
}

/**
 * Pot odds: the equity you need for a call to break even long-run.
 * Does not account for implied odds (future betting) — that's a separate,
 * model that this deterministic calculation does not supply.
 */
export function calculatePotOdds(currentPot: number, amountToCall: number): PotOddsResult {
  if (currentPot < 0) throw new Error(`currentPot cannot be negative, got ${currentPot}`);
  if (amountToCall <= 0) {
    throw new Error(`amountToCall must be positive, got ${amountToCall} (use 0 only for a check, which has no pot odds concept)`);
  }
  const breakevenEquity = amountToCall / (currentPot + amountToCall);
  return {
    breakevenEquity,
    breakevenEquityPercent: breakevenEquity * 100,
  };
}

export interface EVResult {
  /** Expected value in the same unit as the inputs (e.g. BB or chips). */
  ev: number;
}

/**
 * EV of calling a bet, given hero's equity to win the resulting pot.
 * `currentPot` should be the pot BEFORE hero's call is added (i.e. it
 * already includes the opponent's bet hero is facing).
 */
export function calculateCallEV(equity: number, currentPot: number, amountToCall: number): EVResult {
  if (equity < 0 || equity > 1) throw new Error(`equity must be between 0 and 1, got ${equity}`);
  if (amountToCall <= 0) throw new Error(`amountToCall must be positive, got ${amountToCall}`);

  // Net profit if hero wins is `currentPot` — it already includes the
  // opponent's bet. Hero's own call returning to them is not itself a
  // "winning," so it must never be added to the win side. Net loss if
  // hero loses is exactly `amountToCall`.
  const ev = equity * currentPot - (1 - equity) * amountToCall;
  return { ev };
}


/** EV of folding is always exactly 0 — no further chips risked or won. */
export function calculateFoldEV(): EVResult {
  return { ev: 0 };
}

/**
 * EV of betting/raising a given size, given hero's equity and a simplifying
 * assumption: opponent either folds (fold-equity) or calls with the
 * remaining range. This is intentionally a simplified model — full raise
 * EV depends on opponent's exact continuing range and future streets,
 * which needs an explicit response model beyond this formula. The policy
 * layer must retain those assumptions and uncertainty when comparing actions.
 */
export function calculateBetEV(
  equityIfCalled: number,
  foldEquity: number,
  currentPot: number,
  betSize: number,
): EVResult {
  if (equityIfCalled < 0 || equityIfCalled > 1) {
    throw new Error(`equityIfCalled must be between 0 and 1, got ${equityIfCalled}`);
  }
  if (foldEquity < 0 || foldEquity > 1) {
    throw new Error(`foldEquity must be between 0 and 1, got ${foldEquity}`);
  }

  // If opponent folds: hero wins the current pot outright, risks nothing further.
  const evIfFold = currentPot;

  // If opponent calls: hero's net profit if hero wins is (currentPot + betSize)
  // — the pot plus the opponent's matching call. Hero's own bet returning to
  // them is not profit. Net loss if hero loses is exactly betSize.
  const evIfCall = equityIfCalled * (currentPot + betSize) - (1 - equityIfCalled) * betSize;

  const ev = foldEquity * evIfFold + (1 - foldEquity) * evIfCall;
  return { ev };
}

/**
 * Heads-up fold-or-call model, measured from the current decision.
 * The pot already includes existing street contributions. Investment is NEW
 * hero chips; opponentCall is only the opponent's NEW matching contribution.
 * Unlike a fresh bet, these amounts differ for a raise. No future betting,
 * re-raises, rake, side pots, or uncalled chips are included.
 */
export function calculateRaiseEV(
  equityIfCalled: number,
  foldEquity: number,
  currentPot: number,
  investment: number,
  opponentCall: number,
): EVResult {
  if (![equityIfCalled, foldEquity].every(p => Number.isFinite(p) && p >= 0 && p <= 1)) {
    throw new Error("Equity and fold equity must be finite probabilities");
  }
  if (!Number.isFinite(currentPot) || currentPot < 0 ||
      !Number.isFinite(investment) || investment <= 0 ||
      !Number.isFinite(opponentCall) || opponentCall <= 0 || opponentCall > investment) {
    throw new Error("Invalid pot, investment, or additional opponent call");
  }
  return { ev: foldEquity * currentPot + (1 - foldEquity) *
    (equityIfCalled * (currentPot + opponentCall) - (1 - equityIfCalled) * investment) };
}
export function calculateSPR(effectiveStack: number, currentPot: number): number {
  if (currentPot <= 0) throw new Error(`currentPot must be positive to compute SPR, got ${currentPot}`);
  return effectiveStack / currentPot;
}
