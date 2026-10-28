# J5o / T8o / KTo recognition investigation

Baseline and inspected HEAD: `b5287e2978c509f8fc68b0452f3f2a04775fa689`.
Investigation finalized 2026-10-28. Scope: documentation and regression tests only.
No production changes or strategy expansion.

**The original T8o failure remains unresolved due to insufficient historical
evidence; it is not a confirmed implementation bug.** The reported result is
consistent with an unavailable or rejected current HJ-facing-UTG source window,
but the original source history is unavailable to establish why. T8o is present
in the illustrative catalog. An unsupported source shape, missing boundary/action, broken continuity,
expiry, or a source/DOM/log contradiction cannot be distinguished from the
screenshots. No particular one of these hypotheses is established.

| Hand | Reported live result | Expected result with the supported fresh source window |
| --- | --- | --- |
| J5o | Live FOLD 65%, illustrative FOLD 100%, then expired | Same: original 21-hand live subset |
| T8o | UNSAFE / preflop_unclassified, no reference | UNSUPPORTED, illustrative FOLD 100%, no live action |
| KTo | UNSUPPORTED, illustrative FOLD 100%, no live action | Same: illustrative only |

T8o, like KTo, is outside the original 21-hand authorization subset. J5o's 65%
is the locked engine recommendation confidence (`policyRecommendation.ts`);
100% is the source's FOLD allocation. They measure different things. None of
these three outcomes justifies authorizing another live action.

Evidence reviewed: the supplied screenshots/report, source reducers and proof
adapters, tracked hand169/238/261 fixtures, related rejection/lifecycle tests,
and the local evidence inventory. No raw capture or diagnostic JSON for these
three new live hands was available in the workspace. The existing hand261
capture is an older T5o stack-reset case, not a recording of the reported T8o
failure. The new tests explicitly simulate private cards and DOM cross-checks;
they do not reconstruct the missing live histories.

The recognition requirements remain intact:

1. `firstUtgSource.ts` requires a validated registration and consecutive source
   updates in the same connection generation. Only the equivalent immediate
   bootstrap `rup` is accepted; arbitrary refresh/backfill is unsupported.
   Rejected continuity cannot silently recover within that generation.
2. The fresh hand must link the prior completed-hand state to the next hand,
   with matching hand number/identity, predecessor, empty board, normal 1/2
   profile and forced blinds. Both the ordinary empty player patch and the
   already supported complete six-player stack-only reset are covered.
3. Six unique seats, player identities/statuses, dealt-in IDs and two-card
   membership must agree, including dealer/SB/BB traversal and first UTG actor.
   Six visible occupants or a Player stacks log row cannot replace that proof.
4. `bettingWindow.ts` requires the exact supported UTG acceptance from zero to
   five, immediately followed by separate HJ activation. Both supported HJ turn
   shapes are covered. Missing, coalesced, intervening, unknown or differently
   linked updates do not become proof merely because the UI still says CALL 5.
5. `firstUtgLive.ts` cross-checks the certificate against current hand/hero/cards,
   actor, seats, dealer, blinds, stacks, contributions, connection and log facts.
   HJ evidence expires at its original activation time plus ten seconds; polls
   cannot renew it. The display and live authorization remain separate.

Successful scoped context uses `historyCoverage: complete` only for this closed
decision prefix. Global `historyComplete` remains false. A complete general
action log is not newly required. Conversely, a visible raise log and numeric
CALL amount alone cannot certify the missing prefix.

The screenshot's warnings come from `unopenedEvidence.ts` when no usable
response window is available. The observed raise contradicts an unopened
fallback window, which yields UNSAFE / preflop_unclassified. This does not
prove malformed betting, three independently missing messages, or an actual
seat change. The new tests reproduce those same history/roster/seating messages
both with an unsupported raw open shape and with an otherwise valid source
certificate rejected by a DOM stack mismatch. This demonstrates that the
messages are not a unique root-cause diagnosis.

No independently reproducible production defect was found. Withholding advice
and the reference when the scoped evidence fails is correct under the existing
requirements. Whether a valid live T8o sequence was incorrectly rejected cannot
be settled without its diagnostic/source evidence. No recognizer, safety gate,
strategy, bundle, opening logic or postflop logic was changed.

Added 17 focused regression cases to `bettingWindow.test.ts`: all three cards on
both supported source grammars, nine CALL5-preserving rejection cases, and two
ways of reaching the reported generic UNSAFE diagnostics. Positives assert
classification, independent authorization, no automatic poker actions and expiry;
negatives assert no reference, live action or relay recommendation request.

Finalization validation (2026-10-28):

- `bettingWindow.test.ts`: **507 passed**, including all 17 new cases, all 169
  source allocations, source/DOM/continuity rejections and lifecycle checks.
  Command: `node ../../node_modules/vitest/vitest.mjs run src/bettingWindow.test.ts --maxWorkers=1`
  from `packages/browser-reader`.
- `preflopResponsePolicy.test.ts`: **309 passed**, including all 21 authorized
  hands across suit/order variants, rejection of the other 148 live categories
  and source classification counts.
- `postflopPipeline.test.ts` and `riverOverlay.test.ts`: **76 passed**, including
  continuous flop/turn/river/next-hand replay, illustrative-only output and
  invalidation checks. Run with the same direct Vitest command and one worker.
- `npm run build`: **passed** (forced TypeScript build, extension typecheck and
  bundle). The generated tracked bundles have no diff from the baseline.
- `git diff --check`: **passed**. The commit scope is this document and additions
  to `bettingWindow.test.ts` only; no production functionality, safety checks,
  authorization rules or postflop implementation changed.

The broader `npm test` attempt was not green: ai-core completed with 823 passes
and one `relayRuntime.test.ts` startup timeout. A focused rerun reproduced that
timeout while all 309 response-policy cases passed. Browser-reader reported six
failures in the existing recorded-flop cases in `flopWindow.test.ts` (hand239,
hand243 twice, hand244, hand246 and hand248), plus a visibility/deadline failure
in `hand115Lifecycle.test.ts`. A separate browser run also reported the six flop
failures. The broad browser runs were stopped after prolonged execution in favor
of focused validation; no full-suite pass is claimed. These tests and their
production dependencies are unchanged. Their root causes were not investigated
or fixed within this documentation/regression-only scope.

The investigation is closed at this evidence limit. No additional capture,
investigation expansion or feature work is requested. Synthetic regressions
validate supported behavior and rejection paths; they cannot establish the exact
history or root cause of the original unrecorded T8o hand.
