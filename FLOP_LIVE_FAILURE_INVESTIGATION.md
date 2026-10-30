# First reported live flop advisory failure

Investigated against `62d34c99d67ee937f9f4cd941a99499e0dc2c200`.

## Finding

The reported diagnostic establishes that the illustrative calculation did not
return a current binding. It does **not** establish that the source recognizer
never produced an activation. The same diagnostic is emitted when the source
observation is absent or expired, or when the downstream source/DOM/control
checks or calculation freshness checks fail.

No implementation defect causing this live failure has been reproduced. The
reported HJ `2s 2c`, BTN opponent, `Jh 8d 8c`, CHECK/BET4/CALL4 situation produces
numerical equity and conditional EV through the production reader, source
projector/runtime, decision proofs and overlay when supplied the supported
synthetic sequence. Removing source continuity while retaining the identical
DOM reproduces the reported missing-binding message and removes the numbers.
This establishes that the visible situation alone does not distinguish success
from failure; it does not establish what happened in the live hand.

Classification remains **undetermined: missing/invalidated evidence versus an
unsupported live source shape versus an implementation rejection**. There is no
evidence-based reason to rank an unsupported shape, expiry, or missing frame as
the most likely individual cause. No production code or safety gate was changed.

## Evidence available

The user supplied the visible facts and one diagnostic sentence, but no image
attachment, hand number, raw frames, or full diagnostic JSON for this hand.
The comparison here is to that description, not a visual inspection of the
failed screenshot. Existing top-level local JSON/text captures were inspected;
none contains the reported three-card board. Existing screenshot files concern
earlier hands and cannot supply the missing source sequence for this one.

| Existing evidence | What it establishes | Limit for this failure |
| --- | --- | --- |
| `pokernow-flop-synthetic.json` and combined pipeline tests | Supported collection/deal, hero check, opponent turn, bet, hero turn; numerical display with simulated fresh DOM | Synthetic identities, action times, pots and stacks; not the reported hand |
| Recorded flop hands 239, 243, 248 | Earlier closed multiway contribution/deal and activation shapes; separate historical CALL2 observations | Different cards, opponents and action windows; not this heads-up CHECK/BET4 sequence |
| Recorded river hand406 | Continuous 49-frame source replay, explicit check, opponent activation/bet and hero activation | Five-card river, CALL12; saved CALL receipt is 244 ms after the original deadline; fresh reads in tests are simulated |

The new regression changes the synthetic fixture's cards and seat assignments
to the report and uses BET4. Pot12 and ordinary source stacks248/247 are test
scaffolding, **not observed values from the failure**. Its required equity20%
must not be presented as the live hand's pot odds, whose pot was not supplied.

## Required path and ordering

The active illustrative path is `eventSource.ts` -> `projectRiverObservation`
and `createRiverObservation` in `riverObservation.ts` -> `liveTimeline.ts` ->
`riverIllustration.ts` -> `decisionProofs.ts` -> `contentScript.ts`.
Despite their river names, these components handle all three postflop streets.
The older `flopWindow.ts`/`flopCallEvidence.ts` profiles are separate, bounded
historical diagnostics. Their hand243 cards/stack restrictions are not required
for this heads-up illustration and should not be generalized to fix this report.

For the intended hero-first flop, the required sequence is:

1. A valid registered source baseline binds table, hand, hero ID, seats and
   private hero cards. Subsequent patches preserve generation, consecutive local
   sequence, monotonic receipt times, and the raw `pre` -> previous `now` link.
2. An exact supported preflop-to-flop collection/deal clears contributions,
   establishes three unique board cards and exactly two active players, publishes
   the collected pot/stacks, and activates hero (`cPI = pITT = hero ID`). Any
   prior paid contributions must reconcile with pot and stack collection.
3. The explicit hero check has `tB[hero] = "check"`, `sNA = "NSAA"`,
   `pITT = null`, and `cRPI = [hero]` in the supported closed shape. It is not
   inferred from a blank wager label or a screenshot.
4. A separate supported turn patch activates the opponent ID.
5. The supported opponent bet publishes `tB[opponent] = 4`, `cHB = 4`, the
   required responder/status fields and turn release. The prior actor must be
   that opponent; both ordinary source stacks must exceed the bet.
6. A separate supported turn patch activates hero. Only here is the observation
   created, with `expiresAt = receivedAt + 10_000`. The clock starts at this
   original activation, not at the check, screenshot, poll or calculation.

Unknown raw fields, different closed action shapes, extra/reordered/missing
updates, reconnects or unsupported intervening actions can invalidate the
window. Every subsequent source observation clears an existing numerical
observation; it cannot be silently reused for a later decision. The current
report does not reveal whether any of these events occurred.

## Checks after source activation

- **Actor and identity:** source table/hand/hero/generation must agree with the
  current timeline. DOM must show exactly one acting player, hero, with matching
  cards, board, seat identities, folded roster, contributions and remaining
  stacks. HJ/BTN and pocket deuces are not hardcoded exclusion conditions.
- **CALL freshness:** one visible supported native `BUTTON type=button` must
  provide enabled `Call 4` with no conflicting accessibility label. Its receipt
  must be at or after source activation, no later than now, and under ten seconds
  old. A screenshot establishes neither that receipt nor the underlying control
  structure. UI readiness never supplies server authorization.
- **Money:** source collected pot plus the opponent's outstanding bet must agree
  with both DOM pot displays. No unknown amount becomes zero; unresolved observed
  returns/settlement adjustments and contradictory evidence withhold numbers.
- **Fingerprint:** baseline `liveDecisionFingerprint` already includes flop CALL
  state/freshness and source revision. Polling and asynchronous response delivery
  use the same helper. Identical fresh control reads keep a stable fingerprint;
  changed controls/source invalidate it. The illustration is synchronous and
  sends no relay request, so response delivery is not required for its display.
- **Original deadline:** source freshness is checked before and after calculation.
  Calculation time, fresh CALL reads and polling cannot extend the deadline.
  One isolated Node calculation for the reported cards with synthetic pot/stacks
  completed in 3.132 seconds. This is neither live-browser timing evidence nor
  proof that calculation finished within the failed hand's remaining window.
- **Display status:** `WAITING FOR PROOF` also appears with a successful separate
  numerical panel because verified action authorization remains blocked. The
  meaningful symptom is missing numbers/binding, not the status alone.

`decisionProofs.ts` appends the quoted missing-activation sentence whenever
`riverIllustration(...).binding` is null. The lower-level
`handTimeline.sourceStatus.riverObservationDiagnostic` and the complete
`decision.scopedProofs.flopCallFold.reasons` are needed to distinguish those
branches. A source observation can exist while its illustrative binding fails.

## Changes and validation

Added one focused regression in `postflopPipeline.test.ts`, using the existing
fixture and production pipeline. It verifies the reported cards, HJ/BTN seats,
heads-up roster, 1/2 blinds and CALL4; numerical display; original ten-second
deadline; and withholding with the same DOM after source continuity is lost.
It also verifies `activation.allowed = false`, `llmMayChoose = false`, no chosen
action, the illustrative label, and no relay request. No new strategy, source
grammar, authorization, monetary assumption or automatic action was introduced.

Validation passed:

- `npm.cmd run build:ts`.
- Reader and extension typechecks.
- 327 tests across `postflopPipeline`, `turnAdvisory` (flop and turn cases),
  `river406`, `staleResponse`, `flop248`, `postflopSourceBoundary` and
  `callControlDom`, run with one worker. These include the new case and existing
  source ordering/gap, actor, CALL-only recovery, contradiction, expiry,
  fingerprint and recorded-source regressions.
- `git diff --check`.

```powershell
npm.cmd run build:ts
npm.cmd run test --workspace=@poker-ai/browser-reader -- src/postflopPipeline.test.ts src/turnAdvisory.test.ts src/river406.test.ts src/staleResponse.test.ts src/flop248.test.ts src/postflopSourceBoundary.test.ts src/callControlDom.test.ts --maxWorkers=1
npm.cmd run typecheck --workspace=@poker-ai/browser-reader --workspace=@poker-ai/pokernow-extension
git diff --check
```

## Smallest missing evidence

Start with **one existing full diagnostic JSON from the failed decision**, if
available, rather than requesting another screenshot or a whole new session.
The essential fields are:

- `capturedAt`, `handTimeline.sourceStatus.riverObservation`,
  `riverObservationDiagnostic`, identity/connection/generation and source head;
- `decision.scopedProofs.flopCallFold` including all reasons;
- `legality.callControl` including `observedAt`, plus `raw` and `context` for
  cards, actors, pots, wagers, stacks and dealer.

These may identify expiry or a specific DOM/control contradiction immediately.
If the source diagnostic reports a missing/unsupported sequence, the smallest
replayable addition is the original registration plus all intervening incoming
state envelopes through the flop deal, check, opponent activation, bet, hero
activation and any update before the failed read. Preserve original field
presence, IDs consistently, `pre`/`now`, receipt times, local sequence and
connection generation. A shorter suffix is sufficient only with an independently
validated carried baseline. Do not reconstruct missing frames from the screenshot.

The existing opt-in diagnostic and raw recorder can collect these if no export
was retained. A new capture would test a recurrence; it cannot prove the cause
of this historical failure. No new capture mechanism is needed.

No commit or push was performed.

## Subsequent evidence and finalization (2026-10-29)

The findings above remain the historical investigation of the initially
reported HJ 22 hand; they are not the diagnosis of Hand435 or Hand459.
[FLOP_HAND_435.md](FLOP_HAND_435.md) records the later reproduced 62-frame
Hand435 failure, the narrow missing-bigBlindCheck flop fix, and Hand459's
successful real-browser numerical display as reported by the user.

Hand459's saved raw source independently replays to the fixed flop observation
for Ts 5d / 9s 3h 8s / hero CHECK / BTN BET4 / hero facing CALL4. Its export has
zero checkpoints: the reported screenshot confirms visual display, while the
raw capture confirms the source sequence. No screenshot was available for
independent inspection in this finalization session, and no accepted paired
checkpoint or verified action recommendation is claimed. The numbers remain
illustrative only. The earlier synthetic regression and investigation are
preserved; one source-only Hand459 regression covers continuity across the
preceding hands. See the Hand435 report for final validation and limitations.
