# HJ response FOLD: bounded conservative reference

The broader [169-category source reference](HJ_RESPONSE_COVERAGE.md) is now
available as a separate illustration. The live FOLD authorization described
here remains the original 21-category conservative heuristic subset.

Reviewed against HEAD `471ce8b` on 2026-10-26. The existing reference now installs
one explicitly reviewed **21-hand weak-offsuit pure-FOLD heuristic subset**:
72o is preserved and 20 categories are added. Other hands are uncovered.
This is a conservative heuristic adaptation, not an exact GTO strategy,
solver certification, measured EV advantage, or opponent exploit.

## Source review

- [GTO MAX JSON](https://gtomax.ai/free-poker-rta-charts/charts.json), updated
  2026-10-16: six-max, raked 100BB, 2.5BB open. Its
  `3bet_or_fold.shared_vs_early_opens` excludes every hand listed below. The
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
  in both `3BetHJvsLJ` and `CallHJvsLJ`. For every hand below both values are exactly zero;
  the documented complement gives FOLD=1. Nothing is inferred from a missing
  hand. The raise node has 25 positive entries, including AA=1. The call node
  is entirely zero: whether the underlying solve permitted cold calls is
  unknown, represented as `coldCallsAllowed: null`, not invented permission.
  `OpenLJ` supplies the source population opening baseline; no live opponent
  range is inferred. The filename's GTO label is not independent authority.

## Reviewed hand list and individual justification

Additional hands: **82o, 83o, 92o, 93o, 94o, T2o, T3o, T4o, T5o,
J2o, J3o, J4o, J5o, J6o, Q2o, Q3o, Q4o, Q5o, Q6o, Q7o**.

Every listed hand is unpaired and offsuit, has neither an ace nor a king, and
has rank separation of at least five: no five-card straight can use both hole
cards. All require paying the full cold-entry price with four players behind.
The table records each hand's additional weakness. Its source columns were
checked individually on 2026-10-26; zero means an explicit entry, not absence.
The GTO MAX column means exclusion from its restricted HJ 3-bet-or-fold range.

| Hand | 3BetHJvsLJ / CallHJvsLJ | GTO MAX | Hand-specific rationale (in addition to the shared limits above) |
| --- | --- | --- | --- |
| 72o (preserved) | 0 / 0 | Fold | Seven-high with deuce kicker; neither pair makes a strong early-open defense. |
| 82o | 0 / 0 | Fold | Eight-high with deuce kicker; weak pairs and six-rank separation. |
| 83o | 0 / 0 | Fold | Eight-high with trey kicker; weak pairs and five-rank separation. |
| 92o | 0 / 0 | Fold | Nine-high with deuce kicker; weak one-pair prospects and seven-rank separation. |
| 93o | 0 / 0 | Fold | Nine-high with trey kicker; weak one-pair prospects and six-rank separation. |
| 94o | 0 / 0 | Fold | Nine-high with four kicker; weak one-pair prospects and five-rank separation. |
| T2o | 0 / 0 | Fold | A paired ten has a deuce kicker and loses to stronger tens; the deuce adds little. |
| T3o | 0 / 0 | Fold | A paired ten has a trey kicker and loses to stronger tens; the trey adds little. |
| T4o | 0 / 0 | Fold | A paired ten has a four kicker and loses to stronger tens; six-rank separation. |
| T5o | 0 / 0 | Fold | A paired ten has a five kicker and loses to stronger tens; five-rank separation. |
| J2o | 0 / 0 | Fold | Deuce kicker leaves paired jacks dominated by stronger jacks; a jack blocker alone is insufficient. |
| J3o | 0 / 0 | Fold | Trey kicker leaves paired jacks dominated by stronger jacks; a jack blocker alone is insufficient. |
| J4o | 0 / 0 | Fold | Four kicker leaves paired jacks dominated by stronger jacks; a jack blocker alone is insufficient. |
| J5o | 0 / 0 | Fold | Five kicker leaves paired jacks dominated by stronger jacks; a jack blocker alone is insufficient. |
| J6o | 0 / 0 | Fold | Six kicker leaves paired jacks dominated by stronger jacks; still no two-card straight potential. |
| Q2o | 0 / 0 | Fold | Deuce kicker leaves paired queens dominated by stronger queens; a queen blocker alone is insufficient. |
| Q3o | 0 / 0 | Fold | Trey kicker leaves paired queens dominated by stronger queens; a queen blocker alone is insufficient. |
| Q4o | 0 / 0 | Fold | Four kicker leaves paired queens dominated by stronger queens; a queen blocker alone is insufficient. |
| Q5o | 0 / 0 | Fold | Five kicker leaves paired queens dominated by stronger queens; a queen blocker alone is insufficient. |
| Q6o | 0 / 0 | Fold | Six kicker leaves paired queens dominated by stronger queens; a queen blocker alone is insufficient. |
| Q7o | 0 / 0 | Fold | Seven kicker still loses to the stronger queens in an early opening baseline; no two-card straight potential. |

Each category represents 12 combinations. The additions cover 240/1326 =
**18.10%** of random starting hands; including 72o, coverage is 252/1326 =
**19.00%** (previously 12/1326 = 0.90%). This is unconditional card coverage,
not a predicted live recommendation rate: position, UTG action, card removal
conditional on that action, profile, stacks and fresh evidence still matter.

The list is explicit, not a runtime rank/gap rule or imported fold complement.
All 148 other categories abstain, including suited versions, pairs, ace/king
holdings and closer ranks such as 62o, 73o, 84o, 95o, T6o, J7o and Q8o.
Their omission is a review boundary, not a recommendation to continue. Source
mixes such as 99, KQo and T9s also remain unsupported. The two references differ
on some other holdings; none of those differences is resolved into live advice.

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

Rationale: these explicitly listed hands have poor pair/kicker prospects and
lack suitedness, ace/king blockers and two-hole-card straight potential. Declining
their cold entry is a defensible population baseline across this limited ordinary
deep-stack interval. The 150BB ceiling is a deliberately bounded heuristic
coverage choice, **not a demonstrated point where optimal strategy changes**.
Removing rake and increasing depth can change marginal defenses; this review
does not transfer the full fold complement or assert that folds are universally
invariant. An unusually wide opener or opponents overfolding to reraises could
support a different exploit. No exploit model is installed. Relative to the
references, this heuristic transfers only the listed weak folds to unraked
100-150BB capacities, retaining the unknown source cold-call permission. It
does not transfer their other folds, calls, raises or mixed frequencies.

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
CO, postflop and the source reducer are unchanged. The bounded hand-261 source-recognition fixes are described below.
The existing table parser still requires its normal main-pot element to parse
the table at all; a numeric display is not promoted to a verified EV pot.

The existing locked overlay shows FOLD synchronously, with the canonical dealt
hand in the reason (for example, `Fold Q7o`, not a hardcoded `Fold 72o`). It binds response
advice to the original ten-second HJ deadline and clears it on expiry, source
or DOM change, clock regression, or disconnect. An explanation cannot change
the action or resurrect expired advice. There is no automatic game action.

## Hand-261 source recognition and final verification

The source recognizer accepts the observed complete six-player stack-only
hand-start reset and the separate HJ activation that omits mAVTB, immediately
after an accepted UTG open to five. Reset amounts replace previous-hand stacks;
identity, roster, profile, ordering, predecessor and freshness checks remain
required. Unknown mutations, partial resets and unrelated turn shapes abstain.
This does not extend the unopened HJ grammar or authorize CALL/THREE_BET.

- **Automated end-to-end replay: passed.** The MAIN bridge, source runtime,
  context/proofs and locked overlay replay recognizes T5o, displays FOLD,
  rejects an explanation override and clears the action at the original
  ten-second deadline. DOM input is simulated; this is not live UI validation.
- **Real PokerNow source recognition: observed.** Hand 261 supplied the
  stack-reset and separate HJ activation shapes. Its source replay produces
  the scoped HJ-facing-open witness. Private raw evidence stays local.
- **Actual live FOLD overlay: not yet verified.** No recorded matching live
  DOM/overlay establishes that the recommendation appeared in PokerNow.

The committed hand-261 regression fixture is sanitized: player/table/hand
identifiers and names are synthetic, historical counters are zeroed and clocks
are shifted together. Capture-export metadata is omitted. Source shapes,
relative timing, predecessor links, seats, cards, stack amounts and action
ordering are retained, along with all positive and rejection assertions.
The fixture is a regression artifact, not a private raw capture.

Final verification on 2026-10-26: **217 ai-core tests and 313 browser-reader
tests passed**, including the hand-261 cases after sanitization. TypeScript
build/typechecks, extension bundling and whitespace checks passed. Rebuilt
bundles match the reviewed generated files. Only the previously scoped tests
were rerun; no full suite, new research or live capture was performed:

- `npm run test --workspace=@poker-ai/ai-core -- src/preflopResponsePolicy.test.ts src/preflopPolicy.test.ts src/decisionProofs.test.ts`
- `npm run test --workspace=@poker-ai/browser-reader -- src/bettingWindow.test.ts src/decisionProofRuntime.test.ts`
- `npm run typecheck` (includes the TypeScript build)
- `npm run bundle --workspace=@poker-ai/pokernow-extension`
- `git diff --check`

Coverage includes all 252 supported combinations in both card orders, correct
hand-specific reasons and abstention for all 148 other categories. Browser
replays cover 72o, 94o, Q7o and hand-261 T5o display/expiry, source/DOM
contradictions, malformed resets and unsupported activation shapes.
Both generated extension bundles are included and checked against the sources.
