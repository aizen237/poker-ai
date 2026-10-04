# Preflop context V1

This layer organizes observed facts and marks model coverage. It is not a solver.
Postflop strategy is unchanged.

## Recognized situations

With verified street-total contributions, a complete ordered preflop history
(including hero), and a consistent amount to call, V1 distinguishes unopened/RFI,
limped pots, one open, an open plus callers, a 3-bet, and a 4-bet or more.
It records blind defense separately. A short/incomplete all-in raise does not
establish a full re-raise level. Missing history or tied observation batches
produce unknown raise level, never a classification based on sizing alone.

Context includes each seat and position, remaining stacks, contributions,
active opponents, pot, call gap, action observations, and pairwise effective
stacks. Effective stack here means the lesser of remaining stack plus known
preflop commitments for the two players; it is not the additional amount each
must risk now. Multiway play has no single effective-stack value. Unknown
All In stack text stays unknown. Unknown contribution semantics prevent
interpreting a displayed 15BB as a raise-to amount.

## Advice availability

Only verified unopened, 100BB+ effective, six-max chip-EV situations can use
the existing opening reference and fall through to AI judgment. The reference
is not a guaranteed action or a calling range. BB has no RFI reference: null
means unavailable, never an empty opponent defending range.

Limped, facing-open, 3-bet, 4-bet, short-stack, tournament-unknown and otherwise
unsupported spots return insufficient strategic model / uncertain. The relay
returns result: null with blockedReason: preflop_model_uncertain and reasons;
the overlay displays uncertainty rather than inventing CALL or FOLD. Legacy
preflop packets without context also return uncertainty. Derived context is
recomputed by packet validation instead of trusting client eligibility flags.
All three provider prompts include structured preflop context when applicable.

Stack <=20BB alone never activates push/fold. An unopened heads-up SB-vs-BB
spot at <=10BB effective is only a candidate for further shove modeling, not
a solved push/fold spot. That threshold is a conservative screen, not a chart.
evaluateShove now returns unavailable, null equity/EV/profitability and no
default fold equity. An explicitly supplied probability is labeled an assumption.
A caller range and commitment-aware model are prerequisites for future EV work.
The old iterations/rng options remain accepted for compatibility but do no work.

## Current live limitations

The live adapter intentionally marks history partial: polling may omit hero
and opponent actions and does not establish order within one observation.
It does not infer dealt-in count from occupied seats, tournament conditions,
or verified contribution semantics. Live preflop therefore remains uncertain.
The existing unresolved pot-semantics confidence gate is preserved and still
blocks live advice. No source now uses random equity to decide preflop calls.

Enable the existing diagnostics with localStorage.setItem("poker-ai:diagnostics",
"1") in the PokerNow console. Copyable snapshots include the full preflop context
and its reasons. Verify total-vs-increment bets, call gap, dealt-in players,
positions, remaining stacks and pot semantics against a captured hand before
relaxing these gates. Seat order, sitting-out status and missing bet labels
still need the checks described in LIVE_STATE_CHECK.md and ACTION_HISTORY.md.
No caller ranges, fold probabilities, antes/straddles, ICM, bounties, side-pot
strategy or multiway range equity are invented.

## Regression examples

K diamonds/Q hearts with 45BB remaining facing a total 15BB raise is uncertain.
Tests vary hero and raiser position, shorter opponent stacks, open plus caller,
hero's prior 3BB open (12BB to call, facing 3-bet), a 4-bet sequence, and unknown
15BB amount semantics. Tests also cover range scope, incomplete raises, missing
facts, partial ordering, all-in stacks, and packet eligibility recomputation.

Run npm test, npm run typecheck, and npm run build from the repository root.
The build regenerates workspace dist files and the Chrome contentScript.js.
Reload the extension and PokerNow tab after rebuilding; restart an older relay.
