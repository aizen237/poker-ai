# Preflop live usability check

Baseline: `751837382a78bb15236fcb36fb0071e2a87cd92c`. Checked 2026-10-28.

## Already usable

The existing path is captured socket envelopes -> MAIN event bridge -> bounded
source window -> current DOM cross-check -> preflop context and independent
proofs -> engine policy / separate source illustration -> extension overlay.
The engine can paint its permitted action before a relay explanation arrives.

- UTG, HJ, CO, BTN and SB opening decisions use the existing six-player,
  deep-stack RFI reference after the exact supported preceding-fold sequence.
  Out-of-chart FOLD and exact five-chip (2.5BB) RAISE remain subject to their
  existing independent proofs. SB's total includes its one-chip post. BB,
  limped pots and other unsupported windows are not added.
- HJ's first response to UTG's exact five-chip open displays all 169 existing
  source classifications: 144 pure FOLD, 15 pure THREE_BET, 10 mixes, no positive
  CALL allocations. Current cards, exact frequencies, source total 7.5BB sizing,
  native 100BB settings and applicability caveats reach the production overlay.
- Only the original 21-hand conservative HJ FOLD subset can produce live advice.
  The other 148 categories remain illustrative. A source FOLD, THREE_BET or mix
  never becomes an authorized action through display or matching controls.

The HJ display still requires the bounded six-player 1/2-chip normal play-money
profile, 100-150BB starting capacities and the existing source/DOM checks,
including at least 100BB remaining. The native source is 100BB; the display
interval does not establish strategy applicability at other depths.

## Confirmed defects fixed

1. **Clipped, unreachable information.** The height-limited panel had scrolling
   CSS but `pointer-events: none`. Chrome measurements of the production replay
   markup at a 1366x600 viewport put the live FOLD at y=588-610, below the panel's
   y=572 bottom; mouse-wheel input left scrollTop at zero. Source-only panels
   also clipped caveats/diagnostics. The panel now accepts scrolling and text
   selection, shows the live action before the reference and moves opponent
   diagnostics below strategy information. The same FOLD is at y=180-202 and
   wheel scrolling reaches the remainder. The source reference identifies the
   actual bound cards. A changed decision resets scroll to the top; unchanged
   refreshes preserve the reader's scroll.
2. **Missed preflop CALL-control updates.** The illustration consumed the current
   CALL contradiction check, but preflop change detection omitted that control.
   A replay starting with contradictory CALL6 remained blank after correction
   to CALL5 despite a fresh, otherwise supported source window. The regression
   failed before the fix and passes after including the stable CALL observation
   in preflop change detection. Observation timestamps do not cause poll churn;
   the original source deadline still governs all display and action eligibility.

Production edits are confined to `contentScript.ts` and its rebuilt bundle.
No strategy data, source recognizer, action legality or proof requirements changed.
There are no poker action controls or automatic actions in the panel.

## Lifecycle and verification

Existing deterministic replays execute the production MAIN bridge, source
runtime, context/proofs and content script. Their DOM read scaffolds and varied
private cards are simulations, explicitly distinct from live observations.
The all-169 overlay test now checks displayed cards and numeric frequencies
against the installed source snapshot as well as separate live authorization.

Checks cover acting/folding, changed actor/cards/hand, expiry, clock regression,
contradictory pot/CALL data, read failure, disconnect and stale explanations.
A new-generation/new-hand replay replaces a live FOLD with the current mixed
reference, resets scroll and rejects the previous decision's late explanation.
Corrected CALL data can restore the reference only before the original deadline.
Source-only hands do not request relay advice or send poker actions.

Chrome layout checks used production replay markup for pure FOLD, pure THREE_BET
and mixed displays at viewport heights 600 and 768. They measured clipping,
hit testing and actual wheel scrolling; these are local browser checks, not a
new PokerNow session. Local artifacts are under `evidence/preflop-usability/`.

Prior focused validation reported **310 tests passed across eight files**:

- `bettingWindow.test.ts`: 223 selected HJ display, authorization and lifecycle
  cases, including all 169 categories and the captured hand261 path.
- `exactFiveLive`, `hjLive`, `coLive`, `btnLive`, `sbLive` and `riverOverlay`:
  62 selected opening/display/lifecycle regressions.
- `preflopResponsePolicy.test.ts`: 25 selected cases for the source counts,
  refusal to promote source-only strategies despite synthetic legality, and
  the original 21-hand policy across suit and card-order combinations.

The targeted TypeScript project build (`tsc -b packages/ai-core
packages/browser-reader`), extension typecheck (`tsc --noEmit -p
apps/pokernow-extension`), extension esbuild bundles and `git diff --check`
passed. The rebuilt `eventSource.js` is unchanged.

Finalization on 2026-10-28 reran the relevant describe groups across those eight
files: **1,100 tests passed, 282 skipped**. This broader selection includes the
reported 310-case coverage, all source allocations, policy contradiction and
deadline checks. A complementary flop/turn overlay selection passed **13 tests,
7 skipped**. The targeted TypeScript build, extension typecheck, both extension
bundles and `git diff --check` passed again. Existing Chrome before/after JSON
measurements and the layout script were reviewed; the layout run was not repeated.
These measurements confirm hit testing, visible live advice and wheel access to
overflowing content in all six recorded layout cases.

Review confirmed that CALL changes only trigger reevaluation: source deadlines
remain bound to the original source receipt, and source, identity, legality and
contradiction checks remain intact. Strategy data and postflop proof logic are
unchanged. No full test suite, new chart/research or new live capture was performed.
Only this document, the content script, its rebuilt bundle and the regression
test are included in the commit. Private captures, local browser artifacts,
credentials and the pre-existing untracked `.agents/` directory are excluded.

## Remaining verification boundary

Broader response advice remains blocked by strategy applicability to the actual
rake/tree/stacks and independent action legality. The all-zero source CALL node
does not establish cold-call permission or a positive CALL strategy. Source
three-bet sizing does not establish raise rights, bounds or chip grid. Existing
scoped CALL evidence alone cannot supply the missing strategy. Unsupported
decisions continue to abstain.

No new live PokerNow visual verification was performed. Deterministic production
replays and local Chrome layout verification establish the checks described
above; actual live PokerNow appearance remains unverified by this work. This is
a documented verification limitation, not a blocker to committing these scoped
usability fixes. No additional live evidence was requested or collected.
