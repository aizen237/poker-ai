# Hand465 turn source recognition

Baseline: `f4124cddd26771491ea1d5851e13c70d851f6d3c`.

## Reproduction and root causes

The complete, unaltered private 78-frame capture was replayed through the
production MAIN socket observer, source projector, timeline reducer, decision
proofs and overlay. Baseline replay reproduced `WAITING FOR PROOF` without a
numerical turn panel. The capture contains source frames only, so the overlay
test uses explicitly synthetic matching DOM values, not a recovered checkpoint.

The earliest rejection is **frame #2**, the Hand459 -> Hand460 transition.
Its one-player patch contains `status: standingUp`, `sUNH: <D>` and
`hideAway: <D>`. The postflop projector's nested player whitelist rejects the
two deletion markers. Projection becomes null, the observer reports `Invalid
receipt`, and subsequent updates cannot restore continuity without registration.

There is a second, independent classification failure at **frame #74**.
The paid turn deal omits **both `cPI` and `bigBlindCheck`**. Baseline classifies
it as `other`. An isolation experiment with only the two frame-2 deletion
markers removed confirms that all baseline projections then survive, but #74
still fails to open a turn window. This modified-input experiment is diagnostic
only; the positive regression replays all original field shapes unchanged.

## Bounded change

Only `riverObservation.ts` changes production logic. Its two generated bundles
are rebuilt; the preflop recognizers and shared reducer are unchanged.

- Accept the exact recorded standing-player deletion shape only at a linked,
  settled-hand -> next-hand boundary. Confirm the same seats and stack, exactly
  one excluded participant, no dealt cards for that participant, folded status,
  and no active/dealer/blind role. Unknown or altered deletion patches fail.
- Classify the exact paid-turn shape with both fields absent as a separate
  candidate. Do not populate `cPI`. Require an independently observed explicit
  hero activation in the same hand/flop, within its original ten-second limit,
  then the exact matching CALL immediately before collection. Carried `cPI`,
  new `pITT`, hand identity, roster, cards and equal paid wagers must agree.
- Keep the existing collection, stack debit, board-prefix, heads-up, action
  sequence, decision identity, DOM binding and expiry gates. An explicit-actor
  paid turn still requires `bigBlindCheck: false`; the existing flop-only flag
  omission remains flop-only. Other missing-actor messages remain unsupported.

No strategy expansion, verified CALL/FOLD recommendation, automatic action or
preflop recommendation change is introduced. The numerical panel is illustrative
only and `activation.allowed` remains false.

## Evidence and regression scope

`packages/browser-reader/src/fixtures/pokernow-turn-465.json` preserves all 78
frames, including registration during Hand459 and transitions through Hand465.
Identity/name values are pseudonymized. A structural comparison against the
private capture verifies field presence, ordering, timestamps, cards and amounts;
all differences are approved identity/profile substitutions. Raw evidence stays
ignored and is never staged.

`packages/browser-reader/src/turn465.test.ts` covers positive source and rebuilt
MAIN-bundle replays, preceding-hand continuity, missing/contradictory actors,
CALL shape, unrelated omission boundaries, flag values, collection/debits,
board/cards, identity, action sequence, expiry, disconnect and DOM mismatches.
The optional `HAND465_RAW_CAPTURE` environment variable runs the same replay
directly against the local private capture without publishing its contents.

The successful end state is Hand465, hero `Qc 6d`, board `Td Th 3c Jd`, sequence
78: collected 21 + opponent bet 4 = 25 before CALL, payable CALL 4. The panel
shows estimated turn equity, numerical CALL EV, FOLD EV 0, and required equity
`4 / 29 = 13.79%`, while retaining `ILLUSTRATIVE ONLY` / `WAITING FOR PROOF`.

Validation includes focused Hand435/459, turn/river, postflop pipeline and first
UTG continuity/freshness regressions; workspace typechecks; extension build;
byte-for-byte esbuild source-to-bundle comparison; diff and sanitization checks.

Results: **311 tests passed across eight focused suites** with one worker;
**68 Hand465 tests passed using the unaltered private capture**. All workspace
typechecks and the extension build passed, and both generated bundles exactly
match fresh esbuild output. The parallel run had one existing pipeline test
exceed its 30-second timeout; the serial rerun passed without changing that
timeout or any assertions. Staged-content and structural sanitization audits
passed for the six intended files.

**Automated replay is not live-browser confirmation.** No new live hand was
requested. The numerical panel remains unverified in an actual browser until
a subsequent live test demonstrates it.
