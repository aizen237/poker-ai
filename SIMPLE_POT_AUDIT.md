# Scoped simple-pot audit — 2026-10-08

The proposed snapshot conditions are insufficient in the current reader.
No `simple_live_pot` proof was introduced, and no safety gate was relaxed.
This is a review of the existing code and supplied evidence, not a new live test.

## What the snapshot does establish

`assessScopedMonetary` verifies explicit numeric/check contributions, the uncapped
call gap, and collected pot + all readable street contributions = displayed total.
The observed arithmetic applies to the reported simple and multiway displays.
It does not determine who is eligible for every chip in that total.

Folded money already in a genuine simple pot remains dead money contestable by
the remaining eligible players. A fold is not itself a reason to reject a simple
pot. Regression tests supply an independent ledger with four folded chips already
collected: main 10 + live contributions 2 + 8 = total 20, all of which is
hero-contestable before a covered call. The current snapshot alone still lacks
the evidence identifying that situation as a genuine simple pot.

## Why the proposed conditions do not prove contestability

1. **No side-pot evidence is not a verified absence of side pots.**
   `tableRead.ts` extracts the two pot numbers and logs `potContainerText`.
   Neither `RawTableInput` nor `LiveReadContext` classifies pot eligibility,
   side pots, return-in-progress states, or unsupported pot controls. Extra
   pot-container text can coexist with the same successfully reconciled numbers
   and no relevant selector errors. No absence proof can be based on this reader.
2. **Current occupancy is not an authoritative hand roster.**
   Occupancy comes from the player-name selector; all-in status comes from the
   current literal stack label. No supplied evidence establishes that every
   eligible player, including a departing/offline participant, remains represented
   through settlement. Approximate action history omits hero actions and discards
   departed/replaced seats; it cannot establish complete eligibility history.
   This is missing verification, not a claim that PokerNow actually hides players.
3. **Hero may not cover the call even though nobody is all-in yet.**
   A synthetic counterexample has main 6, hero contribution 2, opponent 18,
   displayed total 26, hero remaining stack 3 and opponent remaining stack 50.
   The verified gap is 16, and neither current seat is all-in. With independently
   known prior contributions of 3 each and no rake, hero's capped call produces
   a contestable pot of 16 after investing 3; the before-call EV input is 13,
   not 26. The other 13 are unmatched opposing chips. A future simple-pot proof
   must exclude uncovered/all-in calls and account for candidate-specific caps.
4. **Returns, settlement timing and rake/drop remain unverified.**
   Matching gross display arithmetic cannot certify whether a pending return or
   deduction is already reflected. The existing policy explicitly requires
   `single_pot_no_rake`. There is no corresponding live configuration reader.

The existing `proveContestablePot` accepts an independently supplied complete
ledger. Tests use that contract to demonstrate conditional arithmetic; those
synthetic ledgers are never attached to live reads or treated as PokerNow proof.
A full ledger is one sufficient route, not necessarily the only future design:
a verified simple-pot/eligibility state source could permit a smaller proof.

## Exact additional PokerNow evidence needed

- Capture stable ordinary heads-up and multiway decision points from hand start
  through collection/showdown, including a player folding after investing. Save
  the complete pot container/control outerHTML and matching diagnostic snapshots.
  Confirm that the displayed pot is wholly eligible for each remaining player
  in the intended simple-state subset. Retain folded chips; do not subtract them.
- Capture a true main/side-pot state and the transition into it, including all-in
  and departing/offline players if supported. Establish a reliable structured
  marker or independently complete hand record that distinguishes it from a
  simple pot. Verify whether eligible seats and all-in markers persist until
  settlement. If those cases cannot be distinguished, keep them unknown.
- Capture an uncalled return before and after adjustment, and establish how a
  stable decision point excludes pending return/award/collection states. Also
  compare an uncovered CALL with hero's available chips; no-current-all-in alone
  is not a sufficient exclusion.
- Verify table-level rake/drop settings and deductions/awards for the targeted
  configuration. The policy requires known no-rake accounting, not a guessed
  assumption based on the visible total.

No slider attribute, selected raise value, arbitrary text keyword or general
absence of read errors can substitute for these evidence sources. Tests of
unsupported pot text deliberately use synthetic diagnostic strings, not invented
PokerNow selectors or claimed captured markup.

## Portion 9 activation

No live state is newly enabled. `decisionPot` stays null, pot provenance remains
unverified for EV, and `legality.verified` remains false.

Pot accounting is also not the only remaining activation dependency:

- `contentScript.ts` deliberately omits `policyContext`; no live evidence adapter
  currently supplies that contract.
- Exact legal bounds, chip unit and actor-specific reopening remain gated.
- The policy requires modeled heads-up equity with explicit uncertainty bounds,
  terminal call/check evidence, and response estimates for every legal aggressive
  candidate. A verified pot alone cannot supply those inputs.
- Multiway deterministic action EV is unsupported even if its display or future
  simple-pot accounting can be verified. Ordinary nonterminal flop/turn calls
  also remain outside this policy.

No strategy or runtime accounting implementation changed in this audit. The new
regressions protect ordinary heads-up/multiway snapshots, collected folded money,
all-ins, side-pot/opaque controls, missing contributions, mismatch, incomplete
roster, uncovered calls and unknown rake from accidental activation.
