export interface PotOddsResult {
  /** Breakeven equity fraction (0-1) needed for calling to be profitable. */
  breakevenEquity: number;
  /** Same number as a human-readable percentage, e.g. 20 for 20%. */
  breakevenEquityPercent: number;
}

/**
 * Pot odds: the equity you need for a call to break even long-run.
 * Does not account for implied odds (future betting) — that's a separate,
 * harder-to-quantify concept the AI reasoning layer will handle, not this
 * deterministic calculation.
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
 * which belongs in the AI reasoning layer's judgment, not a deterministic
 * formula. This gives a first-order estimate assuming a single opponent
 * response probability.
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
export function calculateSPR(effectiveStack: number, currentPot: number): number {
  if (currentPot <= 0) throw new Error(`currentPot must be positive to compute SPR, got ${currentPot}`);
  return effectiveStack / currentPot;
}