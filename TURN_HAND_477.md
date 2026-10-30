# Hand477 paid turn transition expiry

Baseline: `9a7a0489896875337769f7fd4492c0234a53e1dc` on `origin/main`.

## Confirmed failure

The entire original private capture (46 frames, registration present, zero
recorder rejections) was replayed through production MAIN source and the shipped
MAIN bundle, transport, source recognition and timeline. All 46 frames project.
Frames 1–41 retain continuity; frame40 produces the flop observation. Frame41
is classified as `call`. **Frame42 is the first rejection**, classified correctly
as `turn_board_carried_actor`, with diagnostic:

> Paid turn lacks a matching independently established flop actor.

Frame43 then reports `Discontinuous river source` because frame42 reset the
observer. There is no earlier classification, collection or identity failure.
An isolation experiment changed only frame40's local receipt by +242 ms; on the
unchanged baseline, that reached the numerical turn illustration through
synthetic matching DOM and decision proofs. This experiment isolates the expiry
guard; it is not the positive regression's input.

| Event | Local receipt (ms) | Relative to flop activation |
| --- | ---: | ---: |
| Frame40 explicit hero activation | 1793343943499 | 0 |
| Frame41 actual hero CALL 4 | 1793343952916 | +9417 |
| Original decision deadline | 1793343953499 | +10000 |
| Frame42 paid turn deal | 1793343953740 | +10241 |

The CALL was 583 ms before expiry. The deal was 241 ms after expiry and only
824 ms after CALL (822 ms between the source cursors). Source timestamps and
local receipt timestamps have different clock offsets; only within-clock
differences are compared.

## Timing and evidence rules

Before: the omitted-actor turn deal required a linked flop CALL and
`now() < actorSource.expiresAt`, where that deadline was the original explicit
activation receipt plus 10,000 ms. Thus a timely CALL could lose its continuity
evidence while its collection/deal was in flight.

After: the original decision deadline is unchanged. A bridge is recorded only
when the actual CALL is received **and processed strictly before** that deadline,
and its source cursor is less than 10,000 ms after the activation cursor. The
CALL must be the immediately linked event after the explicit original hero
activation in the same hand/flop, matching the opponent's outstanding wager and
the two active responders. No late CALL obtains a bridge.

The bridge can be consumed only by the **immediately next** paid, omitted-actor
turn deal. Its receipt and processing must both be strictly less than 2,000 ms
after CALL receipt, and its source cursor must be strictly less than 2,000 ms
after the CALL cursor. Exactly 2,000 ms fails. This is a conservative local
support bound, not a claimed PokerNow protocol guarantee. Arbitrarily delayed
deals remain unsupported.

Every intervening frame consumes the bridge, including otherwise valid unrelated
events. The existing reducer enforces increasing cursors and exact predecessors;
sequence and connection generation must also be contiguous. Hand ID/number,
original actor, carried actor, pending actor, seats, roster, statuses, private
hero cards, board prefix and equal paid wagers must agree. Pot collection and
each stack debit must reconcile; uninvolved player records cannot change.
Disconnect/reset/registration cannot reuse the bridge. The source projection
still omits `cPI`; no actor is inserted into the wire evidence.

The bridge never produces a decision observation or renews the flop deadline.
The flop display is invalidated by CALL. A new turn observation requires the
later turn CHECK → opponent activation → BET → explicit hero activation, with
its own unchanged 10-second decision lifetime. All existing DOM binding,
accounting, range, freshness and action authorization gates remain in force.

Only `riverObservation.ts` changes production logic. The content bundle is
rebuilt; the MAIN bundle remains byte-identical. No strategy, range model,
preflop behavior, verified recommendation or automatic action is added.

## Replay and limitations

The positive regression retains all original timestamps and all 46 frames.
`pokernow-turn-477.json` substitutes identity/profile strings only; field
presence, event ordering, cards and amounts are unchanged. A structural audit
compares it against the private capture. Raw evidence remains ignored.

The resulting source observation is Hand477, hero `2s Ah`, board `Qd Th 6d Tc`,
collected pot 21 plus current bet 4 = 25 before CALL; payable CALL 4. With
explicitly synthetic matching DOM, the production reader, decision proofs and
overlay produce illustrative turn equity and CALL EV for both existing range
assumptions. Required equity is `4 / 29 = 13.79%`; each CALL EV is
`equity * 29 - 4`; FOLD EV is 0. `chosenAction` remains null,
`llmMayChoose` and `activation.allowed` remain false. The panel retains
`ILLUSTRATIVE ONLY` and `WAITING FOR PROOF`; no proof scope is promoted.

The capture contains source frames only. **Synthetic replay is not live-browser
validation**, and the original browser DOM/overlay state cannot be recovered from
it. Model abstention remains possible on other boards, including Hand471.

To replay the private capture without copying its contents into Git, run from
`packages/browser-reader` in PowerShell:

```powershell
$env:HAND477_RAW_CAPTURE = 'C:/Users/HP/projects/poker-ai/evidence/turn-live-failure-hand477.json'
node ../../node_modules/vitest/vitest.mjs run src/turn477.test.ts --maxWorkers=1
```

Regression coverage includes the original 241-ms overrun, immutable decision
expiry, CALL at 9999/10000/10001 ms, turn at 1999/2000/2001 ms, processing delay,
source-clock contradictions, missing/wrong actors, malformed CALLs, cursor and
envelope gaps, hand/table/roster mismatches, collection/debit contradictions,
unrelated events, final observation invalidation and downstream DOM/safety gates.

## Validation results

- Baseline private replay: both MAIN paths reproduce frame42 rejection; the
  +242-ms receipt-only control reaches numerical decision output (3 checks).
- 307 passing integration regressions across nine focused suites: Hand477 (52),
  Hand465 (68), Hand471, Hand435/459, Hand406, postflop pipeline/source boundaries,
  first-UTG continuity and original freshness behavior.
- All 52 Hand477 checks also pass against the unmodified private 46-frame capture.
- 81 turn/flop/river calculation and range tests pass, including Hand471 model
  abstention and its diagnostic behavior.
- `npm run build` and `npm run typecheck` pass, including every workspace
  typecheck and the extension build.
- Both shipped bundles match fresh esbuild output byte for byte; only the
  content bundle changes from baseline.
- Structural sanitization verifies every frame/key/value against the original,
  allowing only identity/profile substitutions (128 substituted values).
  All five staged files pass private-identifier/profile and raw-evidence checks.
- `git diff --cached --check` passes. The unrelated untracked `.agents/` directory
  is left untouched; private raw evidence and investigation scripts stay ignored.
