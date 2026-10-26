# HJ response FOLD: bounded conservative reference

Reviewed against HEAD `d7af479` on 2026-10-25. The only installed response is
**72o -> FOLD** (all 12 offsuit combinations). Other hands are uncovered.
This is a conservative heuristic adaptation, not an exact GTO strategy,
solver certification, measured EV advantage, or opponent exploit.

## Source review

- [GTO MAX JSON](https://gtomax.ai/free-poker-rta-charts/charts.json), updated
  2026-10-16: six-max, raked 100BB, 2.5BB open. Its
  `3bet_or_fold.shared_vs_early_opens` excludes 72o. The
  [accompanying page](https://gtomax.ai/free-poker-rta-charts/), section 4,
  explicitly maps this range to HJ versus the first seat and excludes flats.
  This corroborates a fold in that restricted chart, not in an unraked solve.
- [Pinned dataset documentation](https://github.com/jensbaagaard/poker-practice/blob/590b8f65a9728a99ab8fb5d7a4ec9dc40a65225e/data/openSourcePokerData/README.md)
  describes extraction from Poker Trainer's inline JavaScript ranges. Its
  cash-default profile is 100BB, no ante, 2.5BB open, 3x IP 3-bet. Six-max LJ
  corresponds to this project's UTG. The original solver, solve accuracy,
  rake percentage/cap and original distribution chain are **not verified**.
- [Pinned Cash_100_GTO.json](https://github.com/jensbaagaard/poker-practice/blob/590b8f65a9728a99ab8fb5d7a4ec9dc40a65225e/data/openSourcePokerData/Cash_100_GTO.json)
  (Git blob `3102a91612bda6ffe8b8185ed1ecca07d089dcce`) has 169 explicit entries
  in both `3BetHJvsLJ` and `CallHJvsLJ`. For 72o both values are exactly zero;
  the documented complement gives FOLD=1. Nothing is inferred from a missing
  hand. The raise node has 25 positive entries, including AA=1. The call node
  is entirely zero: whether the underlying solve permitted cold calls is
  unknown, represented as `coldCallsAllowed: null`, not invented permission.
  `OpenLJ` supplies the source population opening baseline; no live opponent
  range is inferred. The filename's GTO label is not independent authority.

## Explicit adaptation and limits

Application is only the existing `pokernow-0.1.72-th-4fun-1-2-exact5-v1`
profile: normal unraked play-money Hold'em, six dealt-in players, no ante or
straddle, UTG's accepted total of 5 chips, separate HJ activation, HJ total zero.
Every player's starting capacity must be 100-150BB inclusive (200-300 chips).
The existing source/DOM checks also require **at least 100BB remaining at the
decision**; they have not been widened. Thus a UTG starting at exactly 100BB
still abstains after investing 2.5BB. Asymmetric capacities within these limits
are allowed. Blind capacities come from source starting stacks minus posted
contributions, avoiding double-counting when the DOM displays pre-post stacks.

Rationale: 72o is unpaired, offsuit and disconnected, has no high-card blocker,
and must cold-enter against an early open with four players behind. Declining
this entry is a defensible population baseline across this limited ordinary
deep-stack interval. The 150BB ceiling is a deliberately bounded heuristic
coverage choice, **not a demonstrated point where optimal strategy changes**.
Removing rake and increasing depth can change marginal defenses; this review
does not transfer the full fold complement or assert that folds are universally
invariant. An unusually wide opener or opponents overfolding to reraises could
support a different exploit. No exploit model or broader range is installed.

## Existing pipeline and validation boundary

The private reference uses the existing schema and classifier. Only a reviewed,
non-test, exactly pure FOLD is eligible. Missing hands, mixed frequencies,
pending/test references, other positions and unsupported capacities abstain.
The core and extension reuse the existing scoped proofs. A bound projection of
the current facing-open witness travels in `preflopExecution`; hand, hero cards,
seat, profile, generation, epoch and original activation deadline are checked.
The adapter compares that projection against freshly derived source evidence.

Required scopes are decisionState, connection, actionWindow, position, roster,
blinds, stack and callCost (the known facing price, not CALL permission). Missing
pot EV, CALL permission, legal-action enumeration, raise size/grid and reopening
do not block this fold. A concrete contradiction in **any** scope still blocks,
including a conflicting visible CALL price or pot display. No general legality,
accounting or history-completeness assertion is manufactured. CALL, THREE_BET,
CO, postflop, the source reducer and source recognition grammar are unchanged.
The existing table parser still requires its normal main-pot element to parse
the table at all; a numeric display is not promoted to a verified EV pot.

The existing locked overlay shows FOLD synchronously. It now binds response
advice to the original ten-second HJ deadline and clears it on expiry, source
or DOM change, clock regression, or disconnect. An explanation cannot change
the action or resurrect expired advice. There is no automatic game action.

Focused tests use existing public captures with explicitly simulated 72o private
cards and matching DOM; these are tests, not new empirical hand evidence.
Actual Chrome/PokerNow display behavior has not been tested in this change.

Validation: 195 focused ai-core tests (response policy, unopened policy and
scoped proofs), plus 253 browser-reader tests (betting window and proof runtime)
passed. `npm run typecheck` (including TypeScript build), the final ai-core build,
extension bundling and `git diff --check` passed. The first replay runs exposed
the unopened-candidate and absent-zero price gates; these were fixed and rerun.
No full suite, commit or push was performed.

## Optional live smoke capture before relying on the display

No new hand-specific evidence collection is required to enable this heuristic.
A real browser smoke check is still required to claim live UI validation; it
does not validate strategy quality. Use any naturally occurring supported HJ
window, without arranging a particular hand or taking an action for the capture:

1. Reload this unpacked extension at `chrome://extensions`. In the PokerNow
   HJ tab's top-page DevTools Console, before a fresh hand, run:
   `localStorage.setItem("poker-ai:diagnostics", "1");`
   `sessionStorage.setItem("poker-ai:raw-socket-capture", "1"); location.reload();`
2. Confirm `window.pokerAIRawCapture.status()` shows `active: true` and
   `registeredCaptured: true`. Use the existing six-player normal 1/2 table
   within the stated capacity bounds. Wait for a naturally occurring UTG open
   to five and HJ activation; do not open the Raise panel or submit an action
   for testing.
3. Within ten seconds of activation, save the latest console **Copyable snapshot
   JSON** and a screenshot with cards, actor, stacks and overlay. Expect FOLD
   only if the actual cards are 72o; otherwise expect abstention. A non-72o
   capture tests the source/display boundary only; it is not a positive-FOLD test.
4. If the same decision remains visible through ten seconds, save a second
   screenshot showing removal of the recommendation. If action advances sooner,
   record that instead; it must clear the advice. Do not delay required play
   merely to manufacture an expiry observation.
5. Run `copy(window.pokerAIRawCapture.exportJSON())` once and save the exact
   exported string under ignored `evidence/`, alongside the snapshot/screenshots.
   Record whether the recorder hit a limit or rejected frames. Run
   `localStorage.removeItem("poker-ai:diagnostics")` afterward. Do not alter cards,
   stacks, source frames or timestamps. No repeated 72o capture is requested.
