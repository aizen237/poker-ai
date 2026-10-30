# Hand493 recorded turn checkpoint and calculation deadline

Baseline: `b6ffe3c26bc9debbdcf6cd03e3e21f68df30b027`.

## Result

No original frame is rejected. All 28 frames were replayed through production
MAIN `eventSource`, transport, timeline and the bounded postflop observation
reducer, using both TypeScript source and shipped `eventSource.js`. Diagnostic
sequence advances on every frame. The exact per-frame kind and
`riverObservationDiagnostic` are retained in
`packages/browser-reader/src/fixtures/pokernow-turn-493-trace.json`.

Frames 1–21 await a supported window without losing continuity. Frame22 creates
the flop observation. Frame23 is the paid CALL; frame24 is the already-supported
`turn_board_carried_actor` deal. Frames25–28 are CHECK, opponent activation, BET,
hero activation. Frame28 produces Hand493 turn `Tc 4d / 5s 5c 4c Jc`, collected
pot21 + street4 = gross25, payable CALL4. Its ORIGINAL receipt is
**1793347065281**, and its unextended expiry is **1793347075281**.

The first reproduced failing gate is **post-computation expiry**, not source
recognition or DOM binding. Baseline cold calculation on this host took
5,343.83ms (another run: 5,942.43ms). Starting with the actual completed read
leaves only 2,518ms. The numerical result is conditional, not model abstention;
the unchanged `riverIllustration` post-enumeration deadline check correctly
withholds it. Holding the clock fixed is an isolation control only: it exposes
the successful binding and numerical result but does NOT demonstrate live
success inside the deadline.

## Actual DOM and time boundaries

The regression clones `checkpoint.observation.unverifiedObservations.ui`
directly. It does not manufacture a matching DOM from the source observation.
Cards/class lists, all ten seat records (including empty seats), folded flags,
stacks, contribution labels, pot displays, native CALL observation, raise
control, reader evidence and timestamps are retained. Identity text alone is
sanitized.

Occupied seats/stacks are 1/172, 2/244, 3/337, 5/275, 9/174, 10/273. Hero's
contribution label is `check`; seat3's is `4`; folded seats have absent labels.
The pot displays are `21` and `25`; the native `BUTTON type=button` reads
`Call 4`, is enabled, and has no issues/contradictions.

| Event | Original local timestamp | Age from activation |
| --- | ---: | ---: |
| Checkpoint start | 1793347072755 | 7,474ms |
| Inner observation start | 1793347072758 | 7,477ms |
| CALL read | 1793347072761 | 7,480ms |
| Inner observation complete | 1793347072763 | 7,482ms |
| Outer checkpoint complete | 1793347072799 | 7,518ms |
| Original expiry | 1793347075281 | 10,000ms |

The inner completed timestamp is the first recorded time at which the entire
read is known to exist. Evaluating this completed read at outer checkpoint
START would incorrectly reject CALL as six milliseconds in the future. No
stored timestamps are rewritten. Using outer completion instead leaves 2,482ms
and does not change the timing conclusion.

The recorded epoch before/after matches, with `stateAvailable=true` and
`matchesRead=true`. Production decisionState, connection, stack and callCost
are proven; source identity/generation, hero turn, cards, roster, contributions,
remaining stacks, enabled CALL and pot arithmetic all bind successfully. No
proof is contradicted. General pot/eligibility/accounting/legalActions/rangeInput/
equity authority remains unproven, as intended.

`observationPaired=false` is retained. The inner validator's sole reason is
`UI does not provide one readable hero flop decision.` It is a FLOP-only
recorder check, neither TURN certification nor a numerical-illustration gate.
The separate first-UTG carried projection is not a substitute for the bounded
turn observer. Neither recorder is changed.

## Narrow fix

`rangeEquity.ts` adds a batched exact-turn calculation used by the two existing
hypotheses in `turnCallFold.ts`. It reuses:

- Unweighted win/tie counts for the same opponent combo across hypotheses.
- The existing evaluator's exact opponent value for an unordered triple of
  hole cards plus river on the fixed four-card board. Hero's score still uses
  the actual river in each iteration.
- Five-card subset work: three cached six-card pair evaluations cover all
  subsets using at most two unknown cards; the six board pairs cover subsets
  using all three unknown cards. This partitions the same 21 possible
  five-card subsets and uses the existing `evaluateBest` / `evaluate5`.

Caches exist only within one calculation. Every range is validated and blocked
cards removed before reuse. Weights and accumulation order, all 44 legal rivers
per opponent combo, half of ties, original evaluator, model assumptions and
abstention behavior remain unchanged. The single-range API delegates to the
same implementation. No sampling, strategy coverage, deadline, recognition,
proof, accounting, authorization or execution gate is changed.

The final committed-bundle comparison on this host took **6,200.76ms** for
baseline versus **786.00ms** after optimization. From the completed recorded
read, the optimized result finishes about 1,732ms before expiry. Baseline
returns no illustration; the optimized bundle returns one. The entire
numerical result is byte-for-byte equal: the two conditional equity values
remain 0.3409829888027549 and 0.45212444209536595. These are unverified checkdown
illustrations, not CALL/FOLD recommendations. Chosen action stays null and
live activation stays false.

`node scripts/benchmark-hand493.mjs` reproduces this comparison using the exact
baseline bundles from Git and current bundles, each in a fresh VM. It replays
all frames through MAIN and the bundled production timeline before evaluating
the captured read. It checks MAIN bundle equality and complete numerical
result equality, and reports elapsed time and whether an illustration survived
expiry. It accepts the same optional private-capture environment variable.

## Regression and validation

`turn493.test.ts` replays the private original when `HAND493_RAW_CAPTURE` is
set, otherwise the sanitized 28-frame fixture. The trace is identical in both
paths. It covers exact source/bundle recognition, real read binding, unchanged
numbers/authority, elapsed-wall-time cold source and bundled computation, and
forced expiry after a successful calculation. Negative cases include cards,
board, seats, stacks, contributions, pot displays, disabled/wrong/missing/stale/
future CALL, actor, read errors, offline/settlement, identity, generation,
disconnect, returns, before-receipt time, expiry, source gap, changed/missing
paid CALL, board prefix and collection mismatch.

Bundled function testing exports existing function definitions before overlay
bootstrap; it does not rewrite their bodies and is not a full browser test.
Independent exhaustive turn-equity oracles check overlapping ranges, different
weights, reversed card order, removal, wins/ties and different board textures.
Existing flop, turn and river regressions remain required.

Validation completed on the final implementation:

- Browser-reader: 8 focused files, **637 tests passed** (Hand493, Hand482,
  turn advisory, Hand471, Hand477, Hand435, Hand248 and flop CALL evidence).
- Original private capture: **32 Hand493 tests passed**, including both MAIN
  paths and cold source/content-bundle deadline checks.
- Range-engine: **38 tests passed** across turn equity, river assumptions,
  flop equity and combo equity. An existing Monte Carlo test timed out under
  concurrent validation load; its complete 16-test file passed in isolation
  without timeout/configuration changes.
- AI-core: **115 tests passed** across turn/river comparison and decision proofs.
- `npm.cmd run build` and `npm.cmd run typecheck`: passed, including all
  workspace checks, extension typecheck and both extension bundles.
- MAIN bundle equals baseline; content changes are confined to exact turn
  enumeration/batching. Baseline/current bundle results are numerically equal.
- Sanitization audit: full raw-frame and actual-read equivalence after only
  the documented substitutions, all checkpoint times/epoch records unchanged,
  and no original identity tokens in any of the nine deliverable files.
  `git diff --check` passed; the private original remains ignored.

Reproduce from repository root (build first):

```powershell
npm.cmd run build
node node_modules/vitest/vitest.mjs run src/turn493.test.ts --root packages/browser-reader --maxWorkers=1
$env:HAND493_RAW_CAPTURE = (Resolve-Path evidence/turn-live-failure-hand493-paired.json).Path
node node_modules/vitest/vitest.mjs run src/turn493.test.ts --root packages/browser-reader --maxWorkers=1
Remove-Item Env:HAND493_RAW_CAPTURE
```

Run timing checks serially on an otherwise idle host; they intentionally enforce
the actual remaining deadline instead of freezing the clock. Slow hosts still
withhold results safely. The sanitized fixture preserves raw shapes and times,
replaces table/hand/player identifiers, names and avatars, and zeros irrelevant
profile counters. Private source evidence and local investigation outputs stay
under ignored `evidence/`.

## Limits

The real checkpoint establishes DOM compatibility at that instant. It does not
include a live calculation start/finish trace, CPU profile, browser scheduling
history or a bundle hash. Consequently the exact historical browser execution
path is not provable. What is reproduced is a cold baseline calculation from
this real read missing its original deadline, with no earlier source/binding
failure. A calculation started sufficiently earlier could finish inside ten
seconds; no earlier matching DOM read is present to test that scenario. Timings
here are host measurements, not reconstructed historical browser timings.

The optimized path can still expire on slower/busy hardware or a later read;
expiry is intentionally not extended. No new live hand, automatic poker action,
verified recommendation, contestable-pot proof or TURN pairing certificate is
claimed.
