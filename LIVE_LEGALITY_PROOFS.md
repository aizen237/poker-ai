# Legality and contestable-pot evidence

The [October 8 simple-pot audit](SIMPLE_POT_AUDIT.md) evaluates whether reconciled
non-all-in snapshots can supply a decision pot. They cannot yet prove eligibility,
return status or no-rake accounting; the document lists the missing evidence and
the independent Portion 9 activation requirements.

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

## Controlled live observations supplied on 2026-10-07

Numeric wagers are total street contributions. Explicit `check` is zero in
supported reads; **an absent label is still unknown**. The live assessment now
verifies the uncapped call gap when hero and all active opponents have explicit
readable contributions. Folded wagers are excluded from that maximum, but their
chips are retained when reconciling the displayed pot.

The observed displayed totals were `6 + 2 = 8`, `6 + 4 + 6 + 8 = 24`, and
`6 + 36 + 18 + 36 = 96`. A current snapshot receives a display proof only if
both pot displays and every occupied seat's explicit contribution reconcile.
This proves **display arithmetic**, including the observed multiway case, not
main/side-pot eligibility, awards, returns or a usable EV pot. Remaining stacks
are never added. The observed call gaps `8 - 2 = 6` and `8 - 4 = 4` are covered.

`scopedLiveVerification.ts` reuses the arithmetic proof below but releases only
the observed flop/BB=2 raise patterns: opening 2, opening 3, 3 then 6, and
3 then 6 then all-in 8. It requires independent complete ordered evidence,
including hero actions, attached to the exact current snapshot; replayed stacks,
contributions, roster and all-in states must match. Selected raise amounts,
slider attributes and approximate polling records never supply that evidence.
The extension currently has **no complete ordered event source**, so automatic
live raise proofs remain unknown even when a snapshot has matching numbers.

For the short all-in sequence, the last full increment is 3. The full minimum
**before** the all-in to 8 was 9. The arithmetic full minimum **after** it is 11;
that is not a captured UI selection or permission to raise. Non-reopening is
certified only for the prior raiser at 6, still facing 2 with chips behind, as in
the disabled-Raise observation. Other actors, full all-in reopening, cumulative
short raises and other sequences remain unknown. Historical classification as
a short raise does not certify permission for a new stack-capped under-raise.

The supplied fold/check/all-in behavior, 0/3/4/5 board progression, observed
new-hand reset and unequal heads-up all-in display are regression-covered.
This does not establish reliable away/sit-out detection or a stable hand ID.
The saved JSON fixture contains human-reported values, not invented DOM.

Diagnostics expose these facts with `value`, `status`, `confidence`, `source`
and explicit unknown `reasons`:

| Diagnostic field | Meaning |
| --- | --- |
| `monetary.contributionSemantics` | Explicit active-seat street totals/check labels |
| `monetary.callGap` | Uncapped opposing maximum minus hero contribution |
| `monetary.potDisplayReconciliation` | Collected + all explicit contributions = displayed total |
| `legality.proof.betting.lastFullRaiseAmount` | Ordered full-raise increment, never guessed from a snapshot |
| `legality.proof.betting.fullMinimumRaiseTo` | Arithmetic bound, separate from permission |
| `legality.proof.betting.minimumBeforeLastAggression` | Bound before the observed raise/short shove |
| `legality.proof.betting.shortUnderRaise` | Historical classification; unknown without ordered evidence |
| `legality.proof.betting.actionReopened` | Scoped prior actor's non-reopening; otherwise unknown |

`isPotSemanticsVerified` retains its stricter EV meaning. It stays false alongside
null `decisionPot`, `legality.verified=false`, low overall confidence and blocked
live recommendations, even when individual display/call facts are proven.

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
- The October 5 stack-cap capture does not prove reopening. The October 7
  short-all-in sequence proves only the prior actor's denied raise right above.
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
   against displayed total. `displayReconciliation.matches` is arithmetic only;
   a proven display is not a proven hero-contestable pot.
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
