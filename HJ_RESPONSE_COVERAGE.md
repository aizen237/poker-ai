# HJ versus UTG preflop reference coverage

Baseline: `226156bd5539a825a9500ce4d18c64dc699a6736`. Final review 2026-10-28.

The source reference now covers **169 of 169 starting-hand categories**, up from
the 21-category weak-offsuit FOLD subset available to the live pipeline.
The broader table is **illustrative only**. It does not expand live action
authorization or claim solver-certified GTO for the current game.

| Classification | Source categories | Live recommendation |
| --- | ---: | --- |
| Pure FOLD | 144 | Existing 21-category conservative heuristic only, low confidence |
| Pure CALL | 0 | None; all 169 source CALL values are explicitly zero |
| Pure THREE_BET | 15 | None; illustrative total size 7.5BB |
| Mixed FOLD / THREE_BET | 10 | Frequencies displayed; no random selection |
| Missing entries | 0 in pinned source | Explicit abstention if either action value is missing |

Source classifications are available within the existing six-player HJ first
response to UTG 2.5BB window. The display retains the existing bounded 100–150BB
starting-capacity interval; the source itself is 100BB. That display interval
does **not** certify strategic applicability to deeper stacks. Existing source
validation also requires at least 100BB remaining for all six players. Other
positions, raise sizes, histories, profiles, unknown stacks and depths outside
the window remain unsupported. Out-of-bound source reviews show ABSTAIN without
an allocation; invalid or contradictory live windows show no reference.

## Traceable source

- [Pinned Cash_100_GTO.json](https://github.com/jensbaagaard/poker-practice/blob/590b8f65a9728a99ab8fb5d7a4ec9dc40a65225e/data/openSourcePokerData/Cash_100_GTO.json),
  commit `590b8f65a9728a99ab8fb5d7a4ec9dc40a65225e`, Git blob
  `3102a91612bda6ffe8b8185ed1ecca07d089dcce`.
- [Pinned extraction/schema/sizing README](https://github.com/jensbaagaard/poker-practice/blob/590b8f65a9728a99ab8fb5d7a4ec9dc40a65225e/data/openSourcePokerData/README.md).
  It identifies Poker Trainer inline ranges, six-max LJ as the first seat,
  action frequencies, the fold complement, and the cash-default sizing profile.
- `packages/ai-core/src/data/hjResponseSource.ts` contains the two original
  169-hand nodes, `3BetHJvsLJ` and `CallHJvsLJ`. Reproduce with
  `node scripts/import-hj-response.mjs` (or use `--check` to compare without writing);
  the script verifies the complete upstream Git blob before extracting data.
  No network lookup occurs during play.

The importer uses the documented complement **FOLD = 1 − THREE_BET − CALL**
only where both original values are explicitly present. It retains every
numeric frequency, including zero CALL values, without normalization or rounding
to a pure action. Missing values are never defaulted to zero. Invalid frequencies,
negative complements, unknown hands and undocumented positive CALL permissions
fail validation. The documented IP sizing is 3 × 2.5BB = 7.5BB total, above its
7BB minimum; this is source sizing, not evidence of legal live sizing.

The source CALL node is all-zero. This does not prove whether cold calls were
available in the original tree, so `coldCallsAllowed` remains `null`. The existing
schema/classifier still supports pure CALL and mixed CALL allocations when an
explicitly documented tree allows them; synthetic tests exercise that contract.
No such production HJ CALL strategy is installed.

The extraction does not verify the original solver, accuracy, rake rate/cap or
distribution chain. The current unraked game's applicability is not established,
even if a stack vector happens to equal 100BB. The source filename is not a
solver certification. No new heuristic or hand-by-hand strategic adaptation was
introduced. The original [21-hand review](HJ_RESPONSE_FOLD.md) is retained.

## Integration and authorization

`inspectHjResponseSourceStrategy` provides the full illustrative source review.
`inspectLiveHjResponseStrategy` and `liveHjFoldReview` keep the original private
21-hand live catalog. An `illustrative` provenance label is explicitly rejected
by `isReviewedHjFold`; importing a source or changing a review label cannot
install it as a live strategy.
Caller-supplied imports remain pending review; only the installed snapshot gets
the extraction review. Neither review status establishes solver provenance.

The existing live proof adapter includes the full review under
`responseStrategy.sourceReference` and exposes a display-only
`responseIllustration`. The overlay shows the source node, source settings,
frequencies, total three-bet size, applicability caveats and an explicit
**not a verified live recommendation** label. For mixed entries it says no
action was selected. Existing low-confidence heuristic recommendations remain
separate from this reference information.
The overlay explicitly identifies membership in the original 21-hand heuristic
FOLD subset versus the other 148 illustrative-only categories. It labels pure
source classifications and mixed frequencies separately, and states that explicit
zero CALL data does not establish cold-call permission.

The display reuses the original source witness and current DOM cross-checks;
it does not create evidence or authorize an action. All decision/source scopes
must match, and any concrete scoped contradiction suppresses the illustration.
The existing source-total pot-conflict check now also covers source-only hands.
Absent pot semantics, CALL permission or raise bounds do not prevent reading
an illustrative source entry. They never become action permissions.

CALL still needs its existing scoped empirical permission and control readiness,
as well as an applicable strategy. THREE_BET still lacks independent live raise
rights, minimum/maximum totals and chip-grid evidence. Matching a selected size
or source sizing does not satisfy those requirements. FOLD retains its existing
source requirements without depending on CALL or raise-sizing permission.

The display binds hand/table/hero/cards/seat, generation, cursor, decision epoch
and the original ten-second deadline. Refreshes revalidate source continuity,
DOM and control contradictions; polling cannot renew the deadline. Expiry,
disconnect, source changes, wrong identity, changed actor/cards, clock regression
and read failures clear the illustration. Late relay explanations cannot restore
it or broaden the locked FOLD. Source-only entries never request an explanation.

RFI tables and the preflop/postflop action engines were not redesigned. There
are no automatic poker actions or new captures. Replay private
cards and DOM variations are explicitly synthetic, not new live observations.

## Focused validation

**1,773 focused test cases passed across 18 files**, accounting for the isolated
rerun described below. No full test suite was run.

| Focused run | Result |
| --- | --- |
| `ai-core`: `preflopResponsePolicy.test.ts` | 309 passed |
| `ai-core`: preflop policy/context, decision proofs/policy, action legality, river/turn call-fold | 312 passed across 7 files |
| `browser-reader`: `bettingWindow.test.ts` | 486 passed, including all 169 categories through the overlay |
| `browser-reader`: first-UTG/HJ/CO/BTN/SB live, decision-proof runtime, stale responses, postflop pipeline, river overlay | 666 cases ultimately passed across 9 files |

The combined browser regression run had 665 passes and one 30-second timeout in
the continuous flop/turn/river/next-hand replay during concurrent validation.
Running `postflopPipeline.test.ts` alone subsequently passed all 56 tests under
its unchanged timeout. No assertion failure or postflop code change was needed.

Commands (workspace-relative test file paths):

```text
npm run test --workspace=@poker-ai/ai-core -- src/preflopResponsePolicy.test.ts
npm run test --workspace=@poker-ai/ai-core -- src/preflopPolicy.test.ts src/preflopContext.test.ts src/decisionProofs.test.ts src/actionLegality.test.ts src/decisionPolicy.test.ts src/riverCallFold.test.ts src/turnCallFold.test.ts
npm run test --workspace=@poker-ai/browser-reader -- src/bettingWindow.test.ts
npm run test --workspace=@poker-ai/browser-reader -- src/firstUtgLive.test.ts src/hjLive.test.ts src/coLive.test.ts src/btnLive.test.ts src/sbLive.test.ts src/decisionProofRuntime.test.ts src/staleResponse.test.ts src/postflopPipeline.test.ts src/riverOverlay.test.ts
npm run test --workspace=@poker-ai/browser-reader -- src/postflopPipeline.test.ts
npm run typecheck
npm run build
node scripts/import-hj-response.mjs --check
git diff --check
```

Workspace typechecks, the TypeScript build, extension typecheck/bundles, pinned
source reproduction and whitespace checks passed. The generated
`apps/pokernow-extension/contentScript.js` is included; `eventSource.js` remains
content-identical to the baseline. Browser checks are automated replays, not
validation of a newly captured PokerNow session.

After the final provenance-label change, all 309 response-policy tests passed
again, along with four targeted overlay checks for AA, exact mixed frequencies,
matching source sizing and stale explanations. The final production build passed.

- All 169 categories and suit/card-order variations: original frequencies,
  canonical hand identity, source-only classification and live authorization
  boundaries. All ten mixes and fifteen pure raises have independent expected
  values; the existing 21-fold policy remains covered.
- Import/classifier: missing nodes per hand, bad frequencies, unknown CALL
  permission, suited/offsuit distinctions, wrong positions, out-of-bound depths,
  pure CALL in a valid synthetic tree and multi-size mixed strategies.
- MAIN bridge → existing source runtime → context/proofs → overlay replay for
  all 169 categories, with no automatic actions or source-only model requests.
- Source/DOM/control contradictions, expiry, identity, continuity, clock
  regression, read failures and stale explanation invalidation.
- Focused positional RFI, legality, postflop and overlay preservation regressions;
  TypeScript build/typechecks and extension bundles. No full test suite.

## Files changed

- `packages/ai-core/src/preflopResponsePolicy.ts`: illustrative source importer,
  classifier access and presentation; explicit separation from live FOLD review.
- `packages/ai-core/src/data/hjResponseSource.ts`: original paired source nodes.
- `scripts/import-hj-response.mjs`: pinned-blob extraction and reproduction check.
- `apps/pokernow-extension/src/decisionProofs.ts`: source-reference diagnostics,
  display readiness and contradiction handling using existing evidence.
- `apps/pokernow-extension/src/contentScript.ts`: labeled reference display and
  lifecycle checks; `apps/pokernow-extension/contentScript.js`: rebuilt bundle.
- `packages/ai-core/src/preflopResponsePolicy.test.ts` and
  `packages/browser-reader/src/bettingWindow.test.ts`: broad coverage and safety
  regression cases.
- `HJ_RESPONSE_COVERAGE.md` and `HJ_RESPONSE_FOLD.md`: provenance, confidence,
  unsupported scope, validation and the preserved original authorization boundary.

The pre-existing untracked `.agents/` directory was left untouched.

## Finalization review (2026-10-28)

Reviewed the ten-file change, including the generated bundle and original
source nodes. The final edits clarify existing overlay labels only: original
21-hand live-eligible heuristic subset versus the other 148 categories, pure
versus mixed source strategies, and explicit zero CALL data versus unknown
cold-call permission. No authorization, RFI or postflop policy was broadened.

Necessary final checks passed:

- Response-policy tests: **309 passed**, including all 169 categories and
  rejection of source-only recommendations even with synthetic legality proofs.
- Overlay replay group: **185 passed**, including all 169 classifications,
  the clarified labels, original expiry and contradiction/stale-response cases.
- Previously timed-out continuous postflop case: **1 passed** on an isolated
  rerun (23.92 seconds total runner duration), with its existing 30-second test
  timeout unchanged. The original concurrent timeout is retained above; its
  cause was not conclusively established. No reproducible assertion failure
  was observed, and no postflop code or timeout was modified.
- `npm run typecheck`: all workspaces passed, including the forced TypeScript
  production build. Extension bundling passed; both bundle files matched fresh
  in-memory esbuild outputs byte for byte. `eventSource.js` is unchanged.
- Pinned source reproduction and `git diff --check` passed again.

The earlier focused RFI/flop/turn/river regressions remain applicable: their
engines and the lifecycle code were unchanged by the final label edits. No full
suite, additional source import or new live capture was needed.

Remaining blockers for broader live advice are an applicable, traceable strategy
for the actual rake/tree/stack profile; documented cold-call tree permission and
a positive CALL strategy when appropriate; and independent live CALL or three-bet
legality, including raise rights, minimum/maximum totals and chip grid. The 169
source classifications alone do not resolve any of these. The reviewed commit
is limited to the ten files listed above and excludes private evidence,
credentials and unrelated local files.
