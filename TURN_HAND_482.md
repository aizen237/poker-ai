# Hand482 live turn source investigation

Baseline: `08b2794d4b9f45b7981e3c42ff09affc5810c600`.

## Confirmed failures and isolation

The entire original private capture was replayed unmodified through production
MAIN source and the shipped MAIN bundle, transport and timeline: 67 frames,
registration present, zero recorder rejections. Recorder acceptance does not
imply source recognition. Frame1 initializes the observer. **Frame2 is the first
failure**: its `riverSource` is null, so the observer reports `Invalid receipt`
and retains diagnostic sequence1. Frame3 then reports `Discontinuous river source`.

Frame2 starts Hand478 after the settled Hand477. Its one-player transition has
`status=standingUp`, `sUNH=<D>` and `hideAway=<D>`, plus a top-level numeric
`mAVTB`. That additional field prevents the old exact Hand465 boundary shape
from matching; the nested deletion flags are consequently rejected. Later hands
cannot repair the lost registration continuity.

A separate baseline isolation replay removed only frame2's `mAVTB`, putting that
frame into the already-supported Hand465 shape. This counterfactual is an
investigation control, not the positive fixture or production input. All 67
frames then maintained continuity and the final turn reached a numerical
illustration with synthetic matching DOM. This proves there is no other
independent blocker to this capture's turn illustration after frame2 is fixed.

- **Frame57:** the paid flop explicitly supplies `cPI` but omits both `mAVTB` and
  `bigBlindCheck`. Baseline classification is `other`, suppressing the flop
  observation at frame61. Collection still reconciles, and the independently
  explicit frame61 activation, frame62 CALL and frame63 deal can establish the
  later turn. Thus this is a separate flop classification gap, not a second
  necessary blocker to the turn. A regression keeps the flop deliberately
  outside the closed shape and confirms the later turn still illustrates.
- **Frames54–55:** the numeric `disconnectedSince` and its `<D>` deletion are
  already supported by the bounded reducer. Both advance continuity. The
  affected player subsequently folds at frame56; neither patch independently
  blocks the target observation. Malformed disconnect values and an active
  player left disconnected still withhold the observation.

## Exact bounded change

Only `riverObservation.ts` changes production logic:

1. Accept the previous exact standing-player boundary OR that exact boundary
   with one additional nonnegative safe-integer `mAVTB`. All other top-level
   and nested fields remain closed. The existing reducer independently checks
   settled previous street, adjacent hand number, changed hand ID, nonhero
   standing player, previous status/roster, exact roster exclusion, folded
   status, absent dealt cards, unchanged seats/stack and no retained actor,
   dealer or blind role.
2. Recognize the observed paid flop shape with both capacity and flag absent,
   explicit matching actor/pending actor, and the existing action timestamps.
   This omission is flop-only. It does not permit missing capacity in an
   activation, paid turn, river, or the flagged paid-deal variant. No field,
   capacity or action is synthesized.

All collection, pot, individual stack debit, cleared wager, identity, active
roster, board-prefix and card checks remain in the existing reducer. There are
no changes to preflop grammar, range assumptions, strategy, decision proofs or
execution. The Hand477 single-use 2-second CALL-to-paid-turn bridge and the
original 10-second decision expiry are untouched. The MAIN bundle changes;
the content bundle remains identical to baseline.

## Replay result and limits

The positive fixture preserves all original frames and timestamps. Both MAIN
paths reach a flop observation at frame61 and a turn observation at frame67:
hero `6d 3h`, board `6s 3d 8c 2h`, collected pot 21, current bet 4, gross pot
before CALL 25, payable CALL 4. Frame63 still has no `cPI` in its projection.
The existing bridge consumes the actual matching CALL, without injecting an
actor into that frame.

Explicitly **synthetic matching DOM** drives the production reader, decision
proofs and overlay. Both existing range assumptions yield finite illustrative
turn equity and CALL EV; Hand482 does **not** produce model abstention. Required
equity is `4 / 29 = 13.79%`, CALL EV is `equity * 29 - 4`, and FOLD EV is 0.
The unchanged model yields 33.6571% equity / +5.7606 chips under strong value
with 10% bluffs, and 73.5225% / +17.3215 chips under thin value with 30% bluffs.
`chosenAction` remains null, `llmMayChoose` and `activation.allowed` remain false,
and no proof scope is promoted. The overlay retains `WAITING FOR PROOF` and
`ILLUSTRATIVE ONLY` alongside the numbers. The display expires at the original
activation receipt plus 10,000 ms.

This is source replay and synthetic DOM integration, not live-browser
validation. The capture has no original DOM checkpoint. Contestability, zero
rake/drop and range assumptions remain unproven. Other boards can still cause
model abstention, including the unchanged Hand471 regression. No verified
recommendation or automatic action is introduced.

## Reproduction and validation

From `packages/browser-reader` in PowerShell, run the private evidence directly:

```powershell
$env:HAND482_RAW_CAPTURE = 'C:/Users/HP/projects/poker-ai/evidence/turn-live-failure-hand482.json'
node ../../node_modules/vitest/vitest.mjs run src/turn482.test.ts --maxWorkers=1
```

Without that variable, the same tests use the sanitized full fixture. Raw
capture and investigation scripts remain ignored under `evidence/`; neither
is committed. The pre-existing untracked `.agents/` directory is untouched.

Validation results:

- Baseline private replay and classifier isolation: 3 passing checks.
- Hand482: 118 focused checks pass on the sanitized fixture and on the original
  private capture (113 integration/negative checks plus 5 capacity-scope checks).
- All 71 browser-reader test files pass across the focused and remaining runs:
  3,355 tests, including the existing Hand435/459/465/471/477, river, preflop,
  source-authority, freshness and expiry regressions.
- 76 turn/flop/river calculation tests, 20 range/equity tests and 398 preflop
  policy/context tests pass (494 total).
- `npm run build` passes, including extension typecheck and bundle generation;
  `npm run typecheck` passes for every workspace.
- Both shipped bundles match fresh esbuild output byte for byte. Only MAIN
  changes from baseline; content is byte-identical to baseline.
- Independent structural sanitization compares every frame/key/value, allowing
  only approved identity/profile substitutions (175 changed values). All five
  staged files pass private-identifier/profile and raw-evidence checks.
- `git diff --cached --check` passes. No raw evidence is staged.
