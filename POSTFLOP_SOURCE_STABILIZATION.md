# Postflop source stabilization

Baseline: `e5dc120e64d89d9f4ae785feb7643b443ff47712`.

This change concerns observational source recognition for the existing heads-up
postflop CALL/FOLD illustrations. It grants no poker decision or action authority.
Private originals, baseline/probe traces, timing reports and test logs remain in
ignored `evidence/`. The Hand499 fixture contains identity/profile substitutions,
the original 81 frame structures, and the actual recorded UI read; no source-derived
DOM is substituted for that read.

## Architectural finding

The old boundary mixed two different questions: whether a raw field was safe to
project, and whether the entire message exactly matched an action template.
`projectRiverObservation` passed a normalized frame through the pre-existing
`projectFirstUtgSource` sanitizer, discarded its unrelated preflop recognizers,
and fed the sanitized frame into the bounded reducer. Action recognition still
examined raw whole-message key sets. Thus a harmless extra description/profile
field could prevent recognition even if the resulting gameplay state was identical.
Conversely, a top-level allowlist was not a type contract for discarded fields.

The layers have different responsibilities:

1. MAIN `eventSource`: observes incoming messages, assigns local sequence and
   generation, projects without names/opponent cards, and publishes metadata.
2. Raw postflop validation: checks envelope/version, allowed fields, metadata
   types, and supported action/street shapes before information is discarded.
3. `createRiverObservation` and the existing bounded reducer: require linked
   predecessors, monotonically increasing receipt time, matching generation,
   valid identity/rosters, and supported hand transitions. Rejection invalidates
   the carried baseline; a later ordinary patch cannot repair that history.
4. Street/action windows: independently reconcile collection and stack debits,
   board prefix, two active players, actors, check/bet/activation order, and the
   immediate paid-CALL bridge. Recognition alone is not a valid window.
5. Illustration binding: independently reconciles actual DOM identity, cards,
   roster, stacks, contributions, pot displays and native CALL control; checks
   source/control expiry again after computation. Model abstention is distinct
   from missing source and contradictory DOM.

Prior fixes made the saved messages pass their specific key sets, without
factoring out orthogonal metadata. New ordinary variants therefore repeatedly
failed ahead of otherwise supported gameplay. Clearing continuity was correct;
classifying every new metadata combination as an unknown gameplay message was
the architectural problem. Broadly skipping rejected messages would conceal real
gaps and is not a remedy.

## Confirmed Hand499 failure

The baseline **shipped** MAIN and content bundle functions were replayed with all
81 original frames and their original local receipt times. Frame 1 registers;
frame 2 is a standalone nonhero player update deleting `sUNH` and `hideAway`.
The old projector allows these fields only inside its standing-player/new-hand
contract. It therefore returns null. The receiver reports `Invalid receipt`,
retains last-accepted sequence 1, and rejects frames 3–81 for lost continuity.
There is no second raw projection failure in those later frames.

An explicitly diagnostic copy removed only the two flags at frame 2. All 81
frames then advanced through the shipped reducer. The independent downstream
gates passed: paid flop at 71, flop activation at 75, hero CALL at 76, carried-actor
paid turn at 77, and turn check/activation/bet/hero activation at 78–81.
The actual recorded turn UI bound to collected pot 21, current bet 4, gross pot
25 and CALL 4. No subsequent independent blocker was found in this capture.
This probe was evidence for the design, never a modified release fixture.

The final implementation processes the unchanged frames. The original turn
receipt is `1793370468119`, expiry `1793370478119`, and UI completion
`1793370473923`: **4,196 ms** remained for computation at the saved read.

## Field and transition contract

| Class | Fields / transitions | Treatment and evidence limits |
|---|---|---|
| Identity and membership | `id`, `hI`, `gN`, `seats`, `iHPI`, player `id`, dealer/blind IDs | Retained and validated by the existing reducer. New-hand membership replaces dealt cards; no inferred player/seat mapping. |
| Eligibility | player `status`, `disconnectedSince`, `pGS`, runout/all-in state | Gameplay relevant; never stripped as cosmetic metadata. Standing-player departure keeps its original closed shape and linked roster/card/stack invariants. |
| Betting and actor | `tB`, `cHB`, `mR`, `cPI`, `pITT`, `cRPI`, `sNA`, `sNAA`, `pASA`, `mAVTB`, `wBACPI` | Supported action fields and presence constraints remain mandatory. Numeric fields are checked before projection. Capacity/minimum fields are not promoted into generic raise legality. |
| Money | player `stack`, `pot`, wagers, blind/ante settings | Retained or independently reconciled. Paid deals require cleared wagers, explicit collection and matching debits. Unknown rake/return mutations fail closed. Gross arithmetic is not net contestability. |
| Cards | `pC.*.cards`, `oTC` | Private cards/board continuity remain gameplay relevant; descriptions never synthesize cards. Opponent card values remain removed from the cross-world projection. |
| Presentation/history metadata | `name`, `avatarID`, `winCount`, `quitCount`, card description fields | Validated independently of gameplay message keys. Names are bounded strings, counters nonnegative safe integers, avatar only the observed null form. Unknown nested keys/types reject. |
| Opaque registration flags | `dAC`, `isNetworkPlayer` | Only captured registration forms are accepted; patch mutations are not assumed cosmetic. `dAC=true` remains unknown. |
| Future-participation flags | `sUNH`, `hideAway` | Only deletion markers are normalized, for known folded nonhero players in a settled hand's standalone metadata update, or the existing verified standing boundary. Setting these flags, hero updates, deleting them during active play, mixing deletion with money/status changes, and missing standing-boundary evidence remain unsupported. The meanings of all possible flag values are not claimed. |
| Transport | `now`, `pre`, `sN`, generation, receipt time, empty `eventsData`, version `0.1.72` | Preserved continuity/order gates; empty event data is not evidence of complete betting history. Unknown events/backfill/version variants remain unsupported. |

The broader historical top-level field inventory is still not a complete protocol
schema. Opaque settings/settlement fields may permit carrying a bounded state
outside a supported action window, but cannot qualify a new action shape. This
refactor does not infer their undocumented meanings or generalize settlement,
rebuy, side-pot, return, all-in, multiway or run-it-twice semantics.

## Redesigned and unchanged

`postflopSourceFields.ts` separates a typed ancillary-field contract from the
gameplay view. Player/card dictionaries are bounded and reject unsafe keys.
Metadata references must resolve to existing bounded players. Action recognition
uses required gameplay keys plus explicitly typed optional fields; validated
metadata dictionaries no longer create a new action template for every combination.
The paid flop's captured optional `bigBlindCheck=false` is expressed once; the
missing-capacity and carried-actor cases keep their narrower presence constraints.
This is not a Cartesian generalization of all observed optional fields.

An ancillary-only event advances source continuity only after asserting that
the bounded gameplay state is unchanged apart from transport cursors. It advances
no betting step. It may preserve an unfinished action window, but clears any
displayed observation and consumes the paid-turn bridge, just like other incoming
frames. It cannot renew the original decision deadline.

Diagnostics now retain attempted frame, last accepted frame, gate and first
failure. Projection reasons survive MAIN-to-consumer transport. Downstream
continuity failures cannot erase the originating error. Binding diagnostics
distinguish source-window, expiry, DOM-read, CALL-control, cards, actor, seats,
player money/status, pot, identity, accounting and computation-deadline failures.
Errors contain no raw messages or profile values.

Unchanged: strategy/ranges/equity math, preflop grammar and permissions, UI flows,
the existing bounded reducer, 10-second decision expiry, the single-use 2-second
CALL bridge, pot/stack reconciliation, model abstentions and fail-closed action
authorization. No live capture or network poker action was performed.

## Offline release gate

The reusable `scripts/replay-postflop.cjs` discovers local capture/fixture JSON
containing postflop frames. It runs the shipped WebSocket observer and bundled
runtime/proof functions, records every frame, and uses saved UI reads where they
exist. It intercepts send/fetch. It does not run the real browser's overlay boot
or assert live scheduling performance. Existing DOM/overlay integration tests
cover that separate layer.

The runner distinguishes deterministic binding at the recorded read time from a
cold computation using elapsed wall time. Frozen-clock successes cannot satisfy
the deadline gate. Baseline comparison preserves every positive source window
and deterministic DOM illustration, rather than requiring formerly rejected
frames to remain rejected.

```powershell
npm.cmd run build
npm.cmd test
node scripts/replay-postflop.cjs --baseline=e5dc120e64d89d9f4ae785feb7643b443ff47712 --out=evidence/postflop-baseline-matrix.json
node scripts/replay-postflop.cjs --compare=evidence/postflop-baseline-matrix.json --gate --out=evidence/postflop-release-matrix.json
$env:HAND499_RAW_CAPTURE = (Resolve-Path evidence/turn-live-failure-hand499-paired.json).Path
node node_modules/vitest/vitest.mjs run src/postflopStabilization.test.ts --root packages/browser-reader --maxWorkers=1
Remove-Item Env:HAND499_RAW_CAPTURE
```

Run timing checks serially after the test suite on an otherwise idle host.

### Observed results

- **13 private captures, 669 frames**, plus **13 sanitized/synthetic fixtures,
  574 frames**: every frame advances the final bounded source reader. This is
  source acceptance, not strategy or full-hand coverage. The final comparison
  preserves every previously accepted frame, all positive windows and all
  deterministic recorded-DOM illustrations. There are 15 windows in each set;
  many fixtures are sanitized duplicates of the private captures.
- Hand499: all 81 unchanged frames accepted through MAIN and source/bundled
  consumers; real turn UI binds. Original receive/read times and expiry retained.
- Actual recorded reads: Hand435 flop, Hand493 turn and Hand499 turn bind.
  The Hand406 river diagnostic remains expired (CALL receipt 244 ms beyond
  source expiry, snapshot 258 ms beyond); no artificial earlier receipt is used
  in the matrix. The paired multiway capture still withholds. Hand459 and
  Hands465/471/477/482 have no saved matching DOM read; their source windows do
  not establish real-DOM success. Existing tests label their matching UI synthetic.
- Legacy Hands239/243/248 and the paired captures without a matching supported
  window do not gain broader postflop strategy coverage. Hand471's no-legal-bluff
  model abstention remains covered separately by the existing regression tests.
- Final release-gate run (2026-10-31): **4,739 passed / 0 failed**, across
  **124 test files**, using the complete `npm.cmd test` command. Hashes of all
  394 tracked/reviewable files were unchanged throughout the run. The earlier
  run's relay startup timeout and two settlement-guard failures did not recur;
  this clean complete run supersedes the earlier isolated-rerun evidence.
- Workspace totals: 825 AI-core, 3,424 browser-reader, 41 opponent-db,
  101 poker-engine, 339 range-engine and 9 shared tests. A subsequent serial
  run against the original private Hand493/Hand499 captures passed **69/69**,
  including source/bundle paths, captured DOM, cold deadlines and mutations.
- Rebuild and all eight workspace typechecks passed. Fresh esbuild output equals
  both shipped bundles byte for byte, and their hashes match the bundles used
  by the complete suite. `git diff --check` passed. Independent fixture comparison
  verifies all 81 frames and the actual read modulo identity/profile string
  substitutions, preserving amounts, cards, times, array order and field presence.
  The 13 changed/new deliverables contain none of Hand499's substituted original
  identity/profile strings. Private originals/reports remain ignored; unrelated
  `.agents/` files were left untouched.

Final cold **bundled** calculation times, using elapsed wall time at each saved
read (private / sanitized fixture):

| Case | Computation | Original remaining time | Result |
|---|---:|---:|---|
| Hand435 flop | 4,913.0 / 4,505.9 ms | 7,059 / 7,049 ms | Conditional illustration within expiry |
| Hand493 turn | 760.3 / 778.1 ms | 2,518 ms | Conditional illustration within expiry |
| Hand499 turn | 767.2 / 768.1 ms | 4,196 ms | Conditional illustration within expiry |

The final `--compare ... --gate` run exits successfully. Baseline and release
replays ran serially after build/typechecks with no competing test workloads.
Reports are in ignored `evidence/final-gate-baseline-matrix.json` and
`evidence/final-gate-release-matrix.json`; suite/build/typecheck/private-test logs
also use the `final-gate-` prefix. These are host measurements, not a latency
guarantee or evidence of a faster equity algorithm. Earlier runs missed
Hand435's deadline, including a prior baseline (8,373 / 7,362 ms) and an earlier
working build. Competing work also
caused a Hand493 miss. They withheld safely. This refactor changes no numerical
computation, and no performance improvement is attributed to it. Deadline checks
must pass on the intended live-test machine; cache hits do not renew bindings.

### Safety and remaining limits

New tests vary names, counters, avatar/description presence, field order and
individual deletion-marker presence independently of gameplay. They test metadata
between actions and after activation; malformed types, unknown players/keys,
unsafe dictionary keys, hero/non-settled/non-folded participation transitions,
opaque network mutations, mixed money/flags, missing capacity, reordered,
duplicated and missing frames, wrong pot/debits/board, and the exact bridge limit.
Existing suites retain stale/future CALL, changed generation/identity, disconnect,
all-in/multiway, unresolved returns, post-computation expiry, 10-second decision
expiry and 2-second transition-bridge checks. No send/fetch occurs in the capture
replayer. Numerical outputs remain illustrative, `chosenAction=null`,
`llmMayChoose=false`, and `liveAuthorized=false`; unproven accounting/eligibility
is never promoted.

Unsupported semantics include setting participation flags, deletion during active
play, unknown profile/financial fields, undocumented settings transitions,
nonempty events, other protocol versions, unsupported refresh/backfill,
side pots, returns/rake accounting, all-ins/short calls, multiway comparisons,
raises and future-street strategy. The existing standing boundary remains narrow;
this change does not establish arbitrary player-status/roster transitions.
No universal PokerNow support is claimed.

If the intended machine fails a cold deadline gate, the next scoped stage is to
profile the existing equity path on that same saved read, propose a separate
semantics-preserving performance change, verify numerical equivalence against an
independent oracle, and rerun this matrix plus forced-expiry tests. Do not fix
that failure by changing ranges, using unverified approximations, extending expiry
or authorizing actions. Unknown future source transitions require a separate
field/transition audit; they are not automatically added to an ignore list.

### Repository status

All final offline gates passed against the scoped implementation and generated
bundles. The release includes only the 13 stabilization deliverables; private
captures/reports and unrelated `.agents/` files are excluded. No strategy or
implementation changes were needed during this final validation. The verified
bundles are ready for one controlled live TURN observation/illustration test
under the criteria below; this gate itself performed no live poker action.

## Criteria for resuming live tests

1. Final source typecheck/build and regression tests pass; freshly built bundles
   match source byte for byte; private evidence/identifiers are absent from the
   deliverables.
2. The replay comparison preserves every previously passing source and real-DOM
   case. Hand499 accepts all 81 original frames and binds its real turn read.
3. Mutation tests reject malformed/unknown gameplay changes, discontinuities,
   financial contradictions and stale controls. Original 10-second expiry and
   2-second bridge boundaries remain enforced; no test grants action authority.
4. Cold supported calculations complete within the actual remaining time, on the
   intended test machine as well as this offline host. A deadline failure blocks
   that illustration's live test; do not extend expiry to make it pass.
5. Load the verified bundles and limit testing to the documented existing
   observation/illustration scope. Stop on a new unsupported source gate and
   investigate its field/transition semantics against saved evidence before
   changing support. No automatic action or verified poker recommendation is
   enabled by satisfying this checklist.
