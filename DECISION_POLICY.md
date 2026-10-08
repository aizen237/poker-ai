# Deterministic decision policy V1

The relay now evaluates a pure engine policy before calling the existing LLM
router. The response contains `policy` and `decisionSource`, in addition to the
existing recommendation. A selected engine action and size are enforced in code;
the LLM supplies an explanation. Unsupported spots can still use the router,
explicitly labeled `llm_fallback`. An uncertain, fully scored comparison abstains
instead of asking the LLM to break a numerical tie.

This is a conditional chip-EV model, not a poker solver or tournament-utility model.

## Supported comparisons

1. **CALL versus FOLD:** heads-up, one contestable pot, no unmodeled rake, and no
   future betting after the call. This includes river calls and exactly matched
   all-in calls on the flop/turn. An all-in call that is smaller than the outstanding
   wager needs different pot accounting and is deliberately unsupported.
2. **BET versus CHECK:** river only, with evidence that checking ends the hand.
   Each bet size needs a separate calling-range equity and fold-equity estimate.
3. **RAISE versus CALL/FOLD:** river only, with verified raise rights/minimums and
   a separate response model for every candidate size. Having positive call EV
   does not suppress an unmodeled raise alternative.

Bet/raise comparisons explicitly assume the opponent folds or calls. Re-raises
are not modeled. Results are conditional on that stated assumption. They are
never labeled high confidence, even when the arithmetic is deterministic.

Multiway action EV, side pots, rake, out-of-position checks that invite further
action, nonterminal flop/turn play, and tournament risk premiums remain outside
this policy. Existing preflop context/uncertainty gates remain in place.

## Accounting

All policy values are in BB and measured from the current decision. `P` includes
all current street wagers before hero adds chips; previous contributions are sunk.
Equity is expected showdown pot share, including ties.

- `EV(FOLD) = 0`
- `EV(CALL) = e * P - (1-e) * C`, where `C` is the additional call cost.
- A terminal `EV(CHECK) = e * P`, **not zero**.
- `EV(BET/RAISE) = f * P + (1-f) * [e_called * (P+O) - (1-e_called) * I]`.

`I` is hero's additional investment; `O` is the opponent's additional matching
call. They are equal for a fresh bet. For a raise, `O = I-C`. Treating `O` as `I`
would double-count the outstanding wager. No uncalled excess is included.

The extension's existing `engineCalculations.callEV` was also corrected to BB;
it previously passed chip amounts into a field described to providers as BB.
The policy recomputes EV rather than trusting this cached field.

## Evidence contract

`DecisionPacket.policyContext` is optional for compatibility. To select an action,
the policy requires high table-read confidence and explicit evidence for:

- Verified pot semantics/source and `single_pot_no_rake` accounting.
- Whether calling/checking terminates betting/the hand.
- Verified street contributions, opponent remaining stack, chip unit, minimum
  bet, minimum total raise-to, and whether aggression rights remain open.
- Modeled heads-up range equity, with a matching point estimate, lower/upper
  sensitivity bounds, source, and confidence. Random-hand equity is ineligible.
- For every generated aggressive size: equity versus its **calling** range,
  caller-range basis, fold-equity estimate/bounds/source, and the explicit
  `fold_or_call` model assumption. There is no 50% fold-equity default.

Probabilities use `{ estimate, low, high, source, confidence }`. Bounds must be
finite, within [0,1], and enclose the point estimate. They are supplied sensitivity
bounds covering model uncertainty, not automatically calibrated Monte Carlo
confidence intervals. Merely increasing sample iterations cannot establish
confidence in an uncertain opponent range.

For example, a verified heads-up river call of 5BB into a current 20BB pot with
range equity 40% and bounds 35%-45% gives call EV 5BB (3.75-6.25BB), versus fold
EV 0. If no raise is available, CALL is selected. If raising is possible but
response evidence is missing, the comparison is incomplete and no engine action
is selected. Bounds overlapping the 20% call breakeven point also prevent selection.

No client-supplied selected action is trusted. The relay recomputes the policy.
Evidence flags are an input contract, not independent verification of a DOM read.

## Sizing and selection

The grid includes 25%, 33%, 50%, 67%, 75%, and 100% pot, plus the matchable stack
cap. Raising fractions apply to the pot **after calling**, in addition to the
call cost. Candidates are rounded down to the verified chip unit, deduplicated,
and filtered against minimums, reopened action and both remaining stacks. Short
all-ins below the full minimum are permitted only when aggression rights exist.
Low SPR limits which fractions fit and brings the effective-stack/shove candidate
into the comparison. Uncalled overbets are excluded, not treated as profitable
extra investment. This is a finite grid, not every legal size.

Every action has point/lower/upper EV, sources and assumptions. Bet/raise bounds
evaluate all four equity/fold-equity corners; more folds can reduce value-bet EV.
A selection requires its lower bound to exceed every competitor's upper bound,
and all contributing model confidence must be at least medium. Missing candidate
evidence yields `unsupported`; overlapping bounds or low-confidence models yield
`uncertain`. Neither result contains a chosen action.

`chosenSizeBB` and engine `Recommendation.sizingBB` mean **additional investment**.
`raiseToBB` separately records the total street contribution. The overlay shows
both. `policy.confidence` is categorical; the legacy numeric recommendation
confidence (0.65 for a selection) is a compatibility score, not win probability
or a calibrated statistical confidence.

## Explanation and fallback

All three providers receive the policy and explanation-only instruction for a
selection. The relay ignores provider changes to the selected action, size,
confidence or alternatives, including in manual/consensus mode. A mismatched
response or provider failure uses a deterministic explanation. Existing factual
reasoning checks remain separate from action selection. Unsupported fallback
recommendations still pass legality/consistency checks and identify AI judgment.
Low-confidence and unsupported-preflop blocks return no recommendation.

## Current live limitation

The current workspace still has **unverified hero-contestable pot accounting** and does
not verify exact raise controls/chip units or supply size-conditioned response
models and range uncertainty bounds. Live polling also yields partial range
evidence. The extension therefore does not fabricate `policyContext`, and the
existing live read gate remains closed. Implementing the policy does not make
those facts known or automatically enable engine-selected live advice.

The controlled October 7 evidence now verifies explicit street contributions,
supported call gaps and reconciled pot displays. Scoped raise/non-reopening
proofs require complete ordered evidence, which live polling does not provide.
Display verification does not certify returns, rake/drop or side-pot eligibility.
See [LIVE_LEGALITY_PROOFS.md](LIVE_LEGALITY_PROOFS.md) for the exact boundaries.

Next integration step: verify the existing live diagnostics, then populate the
evidence contract first for closing heads-up CALL/FOLD spots. Only later supply
defensible per-size caller/fold models for betting and raising. This version does
not alter position assumptions, infer fold equity from tiny opponent samples,
or replace the remaining strategy pipeline wholesale.

Run `npm test`, `npm run typecheck`, and `npm run build` from the root. The build
regenerates the tracked extension bundle. Restart the relay and reload the Chrome
extension/game tab after changes, as described in [DEVELOPMENT.md](DEVELOPMENT.md).
