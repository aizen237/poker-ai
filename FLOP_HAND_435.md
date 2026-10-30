# Hand435: recorded flop source recognition failure

Baseline: `62d34c99d67ee937f9f4cd941a99499e0dc2c200`, preserving the
uncommitted investigation test and `FLOP_LIVE_FAILURE_INVESTIGATION.md`.
That earlier report concerns a different, initially described HJ 22 hand;
the findings below use the newly available hand435 evidence.

## Confirmed cause

The full 62-frame capture is in the ignored local file
`evidence/flop-live-evidence.json`, including its paired postflop checkpoint.
The separately supplied diagnostic was captured at `2026-10-28T18:10:09.475Z`.

Before the fix, the actual sequence reproduced the failure through
`projectRiverObservation`, `createTimelineRuntime`, the bounded state reducer,
`createRiverObservation`, and `buildLiveDecisionProofs`:

| Frame | Actual projection before fix | Consequence |
| --- | --- | --- |
| 1–57 | Non-null source projections | Registration and linked updates survive |
| 58 | `other` | Flop state is reduced, but no pending postflop window starts |
| 59 | `check` | No pending window to advance |
| 60 | `turn` (BTN activation) | No pending window to advance |
| 61 | `bet`, amount 4 | No pending window to advance |
| 62 | `turn` (hero activation) | Observation remains null; illustration/binding absent |

Frame58 has exactly the expected paid-deal top-level fields except
`bigBlindCheck`, which is absent. There are no additional top-level mismatches.
Its other values satisfy the existing recognizer: `gT=[1,1]`, `cHB=0`, `mR=2`,
`mAVTB=234`, empty responders/events, matching hero activation and `pASA=now`,
stack-only player updates, and deletion markers for all four preflop wagers.
The description-only `pC` patch is supported by the existing postflop
normalization; no cards are fabricated from descriptions.

The preceding state has wagers 5 + 5 + 1 + 2. The deal explicitly publishes
pot 13 and debits the corresponding stacks to 234, 251, 275 and 204. The linked
state has exactly two active players and the board changes from empty to
`2s 4d 9c`, with hero `Qh Ac`. After check/bet/activation, hero contributes zero,
BTN contributes 4 with remaining stack 247, gross pot before CALL is 17, and
payable CALL is 4. No additional source or DOM mismatch was found at the paired
checkpoint.

The separate `projectFirstUtgSource` returns null at frame58: its historical
flop profile does not match this deal and cannot consume description-only
cards through that profile. That explains its discarded carried state and
`existingFlopProof=null`. It is not the authority for the illustrative path.
The postflop projector already normalizes descriptions/checks independently.
Neither the old profile nor its preflop grammar was changed.

## Bounded fix and justification

Only `apps/pokernow-extension/src/riverObservation.ts` changes in production
source; the tracked `eventSource.js` bundle is rebuilt from it.
The paid-deal recognizer accepts either its existing exact field set with
explicit `bigBlindCheck=false`, or the exact same set minus that field on a
flop (`gT=[1,1]`). Omission support does not extend to turn or river.

Absence is not interpreted as false: no value is synthesized, carried or used
as a rule/permission fact. The observed alternate shape merely allows the
existing reducer/adapter to inspect the explicit collection and transition.
Those independent checks establish the bounded illustrative inputs. The flag
does not establish pot eligibility, no-rake accounting, history completeness,
raise legality, or permission to act. Explicit true, null, numeric/string
substitutes, missing required fields and extra known/unknown fields still fail
recognition. Existing actor order, supported actions, boundary, collection,
stack, card, roster, generation, predecessor and receipt checks remain intact.

## Production overlay result and timing

The regression also feeds every frame through the production MAIN-world
`eventSource.ts` socket observer and bridge, then the runtime/reducer/adapter.
Markup reconstructed from the recorded checkpoint values is read by
`readLiveTable`; its raw read, context and CALL control exactly equal the saved
checkpoint. The actual `contentScript.ts` proof/display path renders:

- Estimated flop equity and conditional CALL EV under the existing range assumptions.
- Required equity **19.05%**: `4 / (17 + 4)`; each conditional CALL EV is
  `equity * 21 - 4`, and FOLD EV is 0.
- `ILLUSTRATIVE ONLY` and `WAITING FOR PROOF`; no recommendation or action
  authorization, no chosen action, `llmMayChoose=false`, no relay request and
  no socket send.

The old `existingFlopProof`/`flopObservationProof` remains null, as expected.
The checkpoint's `unsupported_or_uncertified` historical profile is not a
requirement for the separate illustrative panel. None of the pot, eligibility,
accounting, legal-action, range-input or equity proof scopes becomes proven.

| Timing evidence | Recorded milliseconds |
| --- | ---: |
| Frame62 raw receipt / source adapter receipt | 1793210999261 |
| Original expiry (receipt + 10,000) | 1793211009261 |
| Paired native CALL read | 1793211002197 |
| Remaining time at that read | 7064 |
| Later diagnostic native CALL read | 1793211009461 |
| Later read beyond expiry | 200 |

The diagnostic metadata receipt is five milliseconds later than the source
adapter receipt, giving 195 ms beyond expiry if using that metadata clock.
The source deadline uses the adapter receipt. The later diagnostic must still
withhold numbers after this fix. Tests preserve both recorded reads and all
raw receipt times; there is no refreshed activation or extended deadline.
The overlay removes numbers at the original deadline even with fresh polling.

## Regression artifacts and validation

`packages/browser-reader/src/fixtures/pokernow-flop-435.json` retains all 62
frames, the paired read and a minimal later diagnostic. Table/hand/player IDs
and player names are replaced consistently. Event order, field presence,
cards, amounts, source cursors, local sequence, generation and receipt times
are preserved. It contains no reconstructed raw frames. Test HTML is explicitly
reconstructed from the recorded read, not presented as captured HTML.

`flop435.test.ts` contains 51 focused cases covering the actual replay, existing
explicit-false variant, rejected flag values, later-street omission rejection,
malformed/contradictory boundaries, pot/stack collection, retained wagers,
unknown nested and top-level fields, missing/reordered frames, generation and
receipt discontinuities, unsupported checks/bettors/all-ins, subsequent-update
invalidation, DOM/control contradictions, unresolved returns, disconnect and
expiry. The first two tests were run before the production edit and failed on
`other` instead of `flop_board` and null illustration, respectively; both pass
after the edit.

Validation passed:

- 576 tests across 12 focused files, including the 51 new cases and the
  existing uncommitted investigation test. No full-suite run.
- `npm.cmd run build`: project TypeScript build, extension typecheck and both
  extension bundles. The generated diff is confined to `eventSource.js`.
- Browser-reader typecheck.
- `git diff --check`, whitespace checks on new files, and a sanitization audit
  confirming all 62 frames retain their sequence, generation, receipt times
  and top-level field sets, with original private IDs/names absent.

```powershell
npm.cmd run build
npm.cmd run typecheck --workspace=@poker-ai/browser-reader
npm.cmd run test --workspace=@poker-ai/browser-reader -- src/flop435.test.ts src/postflopPipeline.test.ts src/turnAdvisory.test.ts src/river406.test.ts src/staleResponse.test.ts src/flop248.test.ts src/postflopSourceBoundary.test.ts src/callControlDom.test.ts src/firstUtgBridge.test.ts src/hjSource.test.ts src/flopAccounting.test.ts src/flopWindow.test.ts --maxWorkers=1
git diff --check
```

## Historical replay confirmation limit

Numerical advisory reaches the production overlay in replay at the captured
paired checkpoint. No further software gate blocks that replay. A replay with
a controlled clock does not establish actual browser calculation/render time
or prove a later live session loaded the rebuilt extension. At that stage, live behavior of
the rebuilt bundle remained unconfirmed; the late diagnostic is independently
expired and cannot serve as a successful numerical checkpoint. No new capture
was requested, no deadlines or strategy features changed, and no commit/push
was performed.

## Hand459 real-browser follow-up (2026-10-29)

The user reports a successful numerical flop illustration in the actual
PokerNow browser for Hand459: hero `Ts 5d`, flop `9s 3h 8s`, hero CHECK,
BTN BET 4, hero facing CALL 4. This is the reported screenshot/visual
confirmation of display, separate from the raw-source verification below.
No Hand459 screenshot is attached to this finalization session or saved in the
local evidence directory, so the image was not independently inspected here.
The displayed numbers are illustrative equity and conditional EV under existing
assumptions, **not verified live action recommendations**.

The private `evidence/flop-live-success-hand459.json` was inspected. It contains
77 raw frames, registration, zero rejected frames and **zero checkpoints**.
There is no accepted paired checkpoint, saved native CALL read, or exported
numerical binding in this capture. Raw frames cannot prove browser rendering,
calculation completion time, control freshness, or the loaded bundle version.

| Frame | Independently recorded source evidence |
| --- | --- |
| 61 | Hand459 starts; hero cards Ts 5d; dealer identity matches the later bettor |
| 73 | Flop 9s 3h 8s, pot 13, collected wagers cleared and stacks debited; hero activation; bigBlindCheck absent |
| 74 | Explicit hero check |
| 75 | BTN activation |
| 76 | BTN bet 4 |
| 77 | Hero activation, receipt 1793321840958 |

Replaying all 77 frames through the production projector, timeline and reducer
produces a flop source observation with the recorded cards, heroChecked=true,
collected pot 13, gross pot before CALL 17, and payable CALL 4. The original
expiry is 1793321850958 (receipt + 10,000 ms). Frame73 exercises exactly the
missing-flag path fixed for Hand435; this independently confirms the fixed
source path, but does not turn the user's visual observation into a paired
checkpoint. No DOM or screenshot was reconstructed for Hand459.

One additional source-only regression in `flop435.test.ts` replays the sanitized
`pokernow-flop-459.json`. It adds coverage for the registered mid-hand baseline
and multiple intervening hand transitions before Hand459, checks the final
source observation and expiry, and retains historyComplete=false and
liveAuthorized=false. This complements the existing 51 Hand435 cases without
duplicating their DOM/overlay reconstruction. Private table/hand/player IDs and
names are replaced consistently; original frame order, fields and times remain.

Finalization validation: 577 tests in the same 12 focused files, project
TypeScript build, reader and extension typechecks, both extension bundles,
source-to-bundle comparison, sanitization and staged diff checks. No full-suite
run, new capture, automatic action, or strategy expansion. Only eventSource.js
changes among generated bundles; contentScript.js matches its rebuilt source.

Ready for manual live turn and river testing of the existing supported paths.
Their regression coverage passes, but Hand459 validates a flop only; it does
not establish live turn/river success. Missing-flag support remains flop-only,
and all existing continuity, legality, authorization and expiry gates remain.
