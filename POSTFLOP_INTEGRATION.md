# Combined postflop integration

Baseline: `afeb6338e74d6eb5b9ec7cd5f55f18dea7ec95de`.

The existing reader, bounded source reducer, range/equity engines, proof
adapters and overlay now handle the supported FLOP -> TURN -> RIVER windows
in one continuous runtime. No strategy, opponent model or preflop scope was
added. Illustrations remain separate from verified action recommendations.

## Integration fixes

- Include native CALL changes and freshness in flop polling, as on turn/river.
- Use the same fingerprint for polling and delayed-response checks; otherwise
  an unchanged decision could be incorrectly rejected at response delivery.
- Reuse the existing collection/deal shape on paid turn/river boundaries.
  Previously only their check/check deal shape was recognized. Clearing paid
  wagers now requires an explicit collected pot and corresponding stack debits;
  a known prior pot must reconcile exactly. Missing prior pot is never zero by
  default. Unknown/contradictory collection cannot carry stale amounts forward.
- Apply the existing source-established hero zero to opponent-first turn
  windows. An absent DOM wager alone still cannot establish zero, and the
  native CALL must independently match. No hero check is invented.
- Render existing hand/draw information on the turn and the final hand on
  the river, alongside the existing ranges, equity, required equity,
  conditional CALL/FOLD EV, assumptions and ILLUSTRATIVE status.

## Deterministic coverage

`packages/browser-reader/src/postflopPipeline.test.ts` uses the actual DOM
reader, source projection/runtime, proof adapters, calculators and production
overlay. Its synthetic hand starts with a preflop registration and follows:

| Street | Board cards | Collected pot | Opponent bet / CALL | Pot before CALL | Required equity |
| --- | ---: | ---: | ---: | ---: | ---: |
| Flop | 3 | 12 | 4 | 16 | 20% |
| Turn | 4 | 20 | 8 | 28 | 22.22% |
| River | 5 | 36 | 12 | 48 | 20% |

Hero calls between streets; the test checks current stacks/contributions,
opponent count, card count, exact hand/draw labels, displayed conditional EV
arithmetic and the next-hand reset. Its 56 cases also cover CALL-only readiness
recovery on all streets, an opponent-first turn, nine unsupported paid-boundary
variants on both turn and river, and clearing after hero/opponent actions,
player/connection disconnects, disabled controls, source gaps, unknown source
fields, new hands, expiry and conflicting DOM or opponent-count evidence.
No relay/action request occurs. Separate response-boundary tests accept an
unchanged decision and reject changed or expired CALL evidence before delivery.

Existing real captures remain separate evidence: hand406 exercises all 49
saved river frames, hand248 exercises its saved flop boundary, and captured
board/CALL elements exercise the reader. The combined hand and later paid
collection variants are explicitly synthetic, not new live evidence.

## Validation commands

Validated on 2026-10-27: 758 distinct tests across 18 selected files passed
(486 reader/integration, 253 AI-core, 19 range-engine), including the 56
combined-pipeline cases and existing preflop policy/live-overlay regressions.
All eight workspace typechecks, the production build, the extension build and
whitespace checks passed. Both shipped JavaScript bundles were byte-identical
after rebuilding all TypeScript dependencies and rebundling. Review confirmed
the five integration fixes above; no additional production fix was necessary.

Run the focused groups separately with one worker to avoid CPU contention
during equity enumeration. On Windows PowerShell, use `npm.cmd`: the `npm`
PowerShell wrapper dropped the `--` separator and consumed runner flags in
this session. No test timeout was increased, no failing case was skipped,
and no full suite or manual PokerNow capture was used.

```powershell
npm.cmd run test --workspace=@poker-ai/range-engine -- src/flopEquity.test.ts src/turnEquity.test.ts src/riverBettingRange.test.ts --maxWorkers=1
npm.cmd run test --workspace=@poker-ai/ai-core -- src/turnCallFold.test.ts src/riverCallFold.test.ts src/preflopPolicy.test.ts src/preflopResponsePolicy.test.ts --maxWorkers=1
npm.cmd run test --workspace=@poker-ai/browser-reader -- src/turnAdvisory.test.ts src/river406.test.ts src/boardDom.test.ts src/callControlDom.test.ts src/flop248.test.ts src/postflopSourceBoundary.test.ts src/decisionProofRuntime.test.ts --maxWorkers=1
npm.cmd run test --workspace=@poker-ai/browser-reader -- src/postflopPipeline.test.ts src/riverOverlay.test.ts --maxWorkers=1
npm.cmd run test --workspace=@poker-ai/browser-reader -- src/staleResponse.test.ts src/hjLive.test.ts --maxWorkers=1
npm.cmd run typecheck
npm.cmd run build
npm.cmd run build:extension
git diff --check
```

## Timeout investigation

The earlier integration run reported a complete-hand timeout under parallel
CPU load. It was not silently waived: the original 57 pipeline/overlay cases
passed again in 129.19 seconds; the expanded 76 cases passed in 121.43 seconds
with default file parallelism. Three isolated, one-worker complete-hand runs
took 13.48, 13.81 and 12.06 seconds, below the unchanged 30-second timeout.

A bounded four-worker comparison on this two-core/four-logical-processor
machine passed all 14 selected CPU-heavy cases. The complete hand slowed to
23.09 seconds. This demonstrates load sensitivity and supports test-runner
contention as the likely explanation; the original timeout itself was not
reproduced, so its exact cause is not independently established. No functional
regression was reproduced. Live browser latency is not established by these
tests, whose source freshness clocks are controlled independently of CPU time.

```powershell
# Isolated control; run three times for the recorded stability check.
npm.cmd run test --workspace=@poker-ai/browser-reader -- src/postflopPipeline.test.ts -t "reads and renders one continuous hand" --maxWorkers=1 --reporter=verbose
# Bounded load comparison; all other tests are intentionally filtered out.
node node_modules/vitest/vitest.mjs run packages/browser-reader/src/postflopPipeline.test.ts packages/browser-reader/src/turnAdvisory.test.ts packages/ai-core/src/turnCallFold.test.ts packages/range-engine/src/flopEquity.test.ts --maxWorkers=4 -t "reads and renders one continuous hand|reuses the river adapter|reports .* checkdown EV|matches an exhaustive"
```

## Exact supported illustrative scope

All windows require standard Hold'em, source version `0.1.72`, one board, two
valid hero cards, exactly one active opponent, positive remaining stacks and a positive fully payable
non-all-in CALL. A continuous registered source chain, supported deal/action
shapes, hero activation, matching current DOM cards/roster/stacks/pots and an
enabled matching native CALL control are required. Evidence expires at the
original activation deadline after 10 seconds; calculation and polling do not
renew it.

| Street | Supported action window | Calculation |
| --- | --- | --- |
| Flop, three board cards | Collection/deal, then opponent-first bet or hero check/opponent bet, then hero activation | 10,000 seeded Monte Carlo turn/river runouts per range; current hand, direct draw and board texture labels; conditional checkdown EV |
| Turn, four board cards | Check/check deal or the exact synthetic paid collection/deal shape, then opponent-first bet or hero check/opponent bet, then hero activation | Exact legal river enumeration per weighted opponent combination; current hand, direct draw and board texture labels; conditional checkdown EV |
| River, five board cards | Check/check deal or the exact synthetic paid collection/deal shape, then hero check/opponent bet and hero activation | Exact weighted showdown equity; final hand label; conditional pairwise CALL/FOLD comparison |

Paid collections require explicit pot and stack reconciliation. The reused
turn/river collection shape is synthetic test coverage, not independently
observed support for every PokerNow paid-street transport variant. Other
shapes abstain; opponent-first river windows are also outside this scope.

Both range hypotheses remain illustrative: strong value with 10% weak hands
and thin value with 30% weak hands, not observed opponent frequencies. Draw
labels describe structure, not guaranteed winning outs. Flop sampling has
sampling error, and the range spread is not a confidence interval.

With `P` equal to collected pot plus the outstanding opponent bet (included
once), and `C` the prospective hero call, required equity is `C / (P + C)`;
CALL EV is `equity * (P + C) - C`; FOLD EV is zero with prior contributions
sunk. Flop/turn EV assumes no further betting through showdown. Future bets,
folds, additional costs and equity realization can change realized EV.

Missing, stale, disconnected or contradictory source/DOM/control evidence,
unknown transport fields/shapes, unsupported action sequences, multiway,
all-ins/short calls, invalid cards, side pots and observed unresolved returns
withhold illustrations. No missing amount is supplied by a zero default or
carried from an earlier hand. Display invalidation is checked at the existing
250 ms freshness refresh, on visibility/focus changes and at the expiry timer;
ordinary decision polling runs every second. Browser scheduling can delay
callbacks, so automation does not establish zero-latency live clearing.

Real PokerNow numerical display and timing are **not independently verified**.
Net pot contestability, returns, rake/drop, side pots and action permissions
remain unresolved. Matching gross displays do not establish those facts.
**Verified live postflop recommendations are not implemented.** The automatic
pipeline is an illustrative diagnostic MVP only; it sends no postflop relay
action request and performs no automatic poker actions.

The scoped automated illustrative postflop MVP is complete. No new strategy,
preflop expansion or architecture phase is included. Release contents are
limited to these integration sources, generated bundles, regression tests and
this document; private captures, credentials and unrelated `.agents` files
are excluded.
