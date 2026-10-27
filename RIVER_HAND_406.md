# River hand406 integration

The extension can now show the existing deterministic CALL/FOLD calculation in
a separate **ILLUSTRATIVE ONLY** overlay panel for a matching, fresh heads-up
river check/bet/hero-activation window. Live recommendations remain blocked.
No decision proof, permission, history-completeness or contestable-pot flag is
promoted by this calculation. No relay/LLM action request is made.

**Actual live numerical display has not been independently confirmed.** What
works is the implemented calculation, source replay and production overlay code
under automated tests with simulated fresh DOM reads. This milestone does not
claim that the numerical panel has been observed during an actual live decision.

## Evidence and exact blockers

The supplied four files were found directly under the ignored `evidence/`
directory, not `evidence/river-hand-406/`. The raw capture, full diagnostic JSON,
README and screenshot agree on hand406, As8s, 2h9s4hQs6c, one remaining
opponent, hero stack248, opponent remaining235, collected12, total24 and CALL12.
All 49 raw frames were replayed, starting with registration in the prior hand.

The existing source observer publishes sanitized metadata and a bounded
first-UTG/flop projection. Its reducer does not accept `tB: "check"`; its
projection rejects the later description-only `pC` patches and omits `pot`.
The existing flop recognizers are tied to earlier captured profiles. Neither
connected metadata nor a visible CALL label supplies a river activation.
The river adapter consequently appended an unconditional missing-activation
reason, and the overlay only rendered abstention, never invoking the calculator.

The generic DOM pot reconciliation also lacks contributions for folded seats:
their absent labels are unknown, not independently observed zeros. The source
river reset and subsequent closed check/bet sequence now account for those
zeros **within this observation**, without changing the generic DOM parser.

The exact saved CALL-control receipt is 10,244ms after raw frame49's local
receipt. It is already outside the existing 10,000ms lifetime (244ms late).
Replaying that saved snapshot at its original timestamp still withholds the
calculation. Regression tests use explicitly simulated synchronous reads
100ms after activation for the fresh overlay case. They do not establish a
historical within-window DOM receipt or extend the original deadline.

## Changes and supported boundary

- `riverObservation.ts` projects only needed sanitized fields into the existing
  `initializeUtgState` / `advanceUtgState` reducer. It normalizes explicit checks
  to zero and preserves private cards across description-only patches. The
  preflop source grammar is unchanged. Unknown raw fields, unsupported events,
  gaps, replayed receipts and inconsistent transitions invalidate the observation.
- The existing socket metadata message and timeline runtime carry this separate
  river observation. Registration, generation, sequence and predecessor links
  must remain consistent. Frame45 supplies the river reset, 46 the hero check,
  47 opponent activation, 48 the positive bet, and 49 hero activation. The
  recognizer uses actor IDs, cards and amounts as data, not fixed hand406 values.
  The observed PokerNow 0.1.72 Hold'em shape is supported; unknown variants block.
- `riverIllustration.ts` binds source hand/hero identity, board/hole cards,
  seats, folded status, contributions, remaining stacks and the current enabled
  CALL control. Active all-ins, short calls, duplicate actors/cards, mismatches,
  unresolved observed returns/adjustments and existing contradictions block it.
- `decisionProofs.ts` exposes the illustration separately from live proof scopes.
  `contentScript.ts` displays it separately from recommendations, retaining the
  original source expiry and checking source/DOM/control changes on the existing
  freshness loop and an expiry timer. Disconnects and read failures clear it.

Source player stacks represent capacity before the current street wagers in
this captured sequence: opponent247 minus street12 equals displayed235;
hero248 minus explicit check0 equals248. CALL12 is fully covered, leaving236.
The unchanged collected source pot12 plus street subtotal12 reconciles both
DOM pot displays. **Pot before CALL = 24**, not12 and not36. After a hypothetical
CALL the gross pot is36, so required equity is12/36 = **33.33%**.

Under the existing two heuristic range assumptions and the explicitly assumed
single contestable pot, no unresolved returns and zero rake/drop, the result is
FOLD preferred to CALL: equity8.93%–26.78%, CALL EV−8.787 to−2.360 chips, FOLD EV0.
These are conditional model outputs, not verified strategy or action permission.
RAISE is not evaluated, and no raise-rights/minimum/grid proof is required.

## Genuinely missing evidence

There is no independently resolved net pot ledger establishing all eligibility,
side pots, returns and rake/drop for this decision. `mode: 4fun`, empty event
arrays, no visible return row, consistent gross arithmetic and observed cursor
continuity do not establish those facts. Server CALL authorization is also not
manufactured from an enabled control. All remain outside this illustration;
the live recommendation stays blocked. The original saved read additionally
lacks a within-expiry receipt, as described above.

## Validation

119 focused tests passed across `river406`, `riverOverlay`,
`decisionProofRuntime`, `firstUtgBridge`, `timelineRuntime`, `riverCallFold` and
`riverBettingRange`. They cover the production socket observer and overlay code
in automated tests,
coherent changed bet amounts, damaged/omitted frames, hand/hero/card/roster
mismatches, stack capacity/all-ins, unexpected returns, rake uncertainty,
original late snapshot, control readiness, expiry, disconnects and failed reads.
The anonymized fixture preserves all 49 source frame shapes and the captured
read; private IDs/names are replaced. Original evidence stays ignored.

The ai-core dependency build, extension typecheck and extension bundles were
checked. Finalization preserves the equity engine, both range assumptions,
river-only adapter and overlay behavior without adding functionality or changing
the original expiry. No full test suite or new capture was performed.

The milestone commit includes source, focused tests, the anonymized regression
fixture, documentation and extension bundles. Original raw evidence, credentials
and unrelated local files are excluded.
