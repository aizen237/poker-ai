# Legality and contestable-pot evidence

## Live observations supplied on 2026-10-05

- Flop `2s 8s 8d`: BB hero had 18 remaining and checked; BTN bet 3 and
  had 25 remaining. Collected pot 4 plus street bets 3 equaled displayed total 7.
  Clicking **Min Raise** selected 6 / `3BB`, with Raise enabled.
- Preflop 1/2: hero had contributed 2 with 23 remaining; opponent total was 20.
  PokerNow allowed the stack-capped total of 25 / `12.5BB`.
  This capture alone does not establish the prior raise sequence or full minimum.
- Hero contribution 2 versus opposing 8 produced a live CALL 6 control.
- Selected amount comes from the live value of `.raise-bet-value input.value`.
  The slider and a selected value do not certify the minimum or reopening rights.

These observations establish those situations only. Matching the same numbers
in a different hand is not proof of its history, eligibility, or action rights.
The diagnostic adapter preserves this scope in `observations`.

## Implemented proofs

`packages/browser-reader/src/legalityProof.ts` accepts explicit, independently
verified evidence. Each fact has a value, status, confidence, source, and reasons.
High confidence means exact arithmetic **conditional on the supplied evidence**,
not a strategic guarantee or a certificate for PokerNow's unobserved behavior.

Betting input requires a complete ordered street from its ordinary blind/zero
postflop baseline, all hero and opponent actions, known starting stacks, a chip
unit, and an independently verified no-limit rule profile. It tracks the last
full increment; a short all-in does not replace it. Reopening compares the new
total against what that player faced at their last action and the full increment
then applicable. A legal stack cap is reported separately, only when hero can
raise and another player has chips to respond. A full minimum may be known even
when hero lacks permission or chips to make that raise.

The standard no-limit rules used in controlled tests are described in
[Poker TDA rules, Raises and Re-Opening the Bet](https://www.pokertda.com/view-poker-tda-rules/).
They include cumulative short all-ins reaching a full raise since a player's
last action. This reference is **not** evidence that PokerNow's cash-game/table
configuration has been verified to implement every such case.

Pot input requires the complete hand's net contributions from every participant,
including folded/departed players, known returns, no-rake/drop confirmation, and
reconciliation with both displayed total and collected pot. After adding only
hero's capped call, the proof constructs contribution layers, each with its own
eligible winners. Uncalled excess is a return, not a pot. Folded money remains
in the layers but folded players cannot win. Hero's EV pot is the sum of layers
hero can win **minus the contemplated call cost**; that cost is exposed separately.
The displayed collected pot is not assumed to equal the eligibility-based main pot.

These are current contributions after hero's hypothetical call, not a prediction
that other players call. Different eligible opponent sets require separate equity
calculations per pot; this change does not feed multi-pot sums into scalar equity EV.

## What stays gated

No additional live deterministic action is unlocked by this change. The live
adapter does not fabricate inputs to either proof:

- Polling is an incomplete snapshot history and currently omits hero actions.
  Distinct observation numbers and no read errors do not prove complete order.
- Whole-hand contributions, departed/folded money, uncalled returns, rake and
  side-pot eligibility have no complete live ledger.
- The supplied under-raise capture establishes stack capping, not reopening.
- Exact chip-unit, action-control, pot, equity and existing policy gates remain.

Incomplete input produces unknown facts, never a guessed minimum/contestable pot.
Short all-in opening bets, short blind baselines and straddles are outside the
initial replay subset. The existing approximate opponent history remains usable
for its original purposes but is not promoted into authoritative legality data.

## Next live verification

Reload the extension, refresh PokerNow and capture diagnostics with
`localStorage.setItem("poker-ai:diagnostics", "once")`.
Inspect `legality.proof` alongside `legality.raiseControl`:

1. Compare collected + all explicit street contributions (including folded money)
   against displayed total. `displayReconciliation.matches` is arithmetic only.
   Missing labels remain unknown; explicit check-as-zero matches the supplied case.
2. Capture the entire ordered street, including hero actions and the last full
   raise, before testing short all-ins. Record whether the previously acting
   player can raise after a short all-in and after a full raise. Record cumulative
   short-all-in cases separately; never infer reopening from selected amount.
3. For heads-up unmatched shoves, record both players' whole-hand commitments,
   capped call, returned excess and pot after the return.
4. For multiway all-ins, record all starting stacks, whole-hand commitments,
   folded contributions, each main/side pot, eligible players and any rake/drop.

The narrowly scoped missing capability is a complete ordered hand event source
(or independently captured complete ledger), including hero actions and returns.
Changing the polling mechanism alone would not prove completeness.
