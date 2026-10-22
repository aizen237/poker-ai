# Phase 4D: empirical HJ CALL permission from hand 238

## Outcome

**Narrow CALL legality is certified; no response recommendation is enabled.**
The paired hand-238 evidence supports a versioned empirical rule for HJ calling
exactly five chips from zero against the supported UTG open-to-five. The rule
is deliberately restricted to the observed six-position starting stack vector.
A fresh permission also requires the existing Phase 4A window and Phase 4C
source/capacity/control cross-checks. It is not a general CALL rule, server
preflight, strategy reference, complete legal-action set or execution authority.

## Evidence review

The local files are `evidence/hj-call-238.json` and
`evidence/hj-call-238.png.png` (the actual saved screenshot has a double suffix).
They are excluded from the commit. The committed fixture anonymizes table,
hand and player IDs/names while preserving all 16 envelopes, every source field,
original seats, cards, values, receipt times, cursors and generation.

- Frame 1 registers the actual HJ observer while hand 237 is still running.
  Frames 2-11 retain the prior hand's ordered continuation and settlement;
  frame 12 starts hand 238 with a different hand ID. No synthetic registration
  or replacement of hero's private cards is needed for this replay.
- The six dealt-in IDs match the six occupied seats. Dealer seat 3 gives the
  ascending-seat cycle BTN 3, SB 5, BB 9, UTG 10, HJ 1, CO 2. The source's
  private cards at seat 1 are `7h,Kd`. The screenshot matches these cards,
  hero stack 253, table URL, dealer, blinds and visible `CALL 5` label.
- Frame 12 starts with SB 1 / BB 2 and UTG current. Frame 13 changes only
  UTG's contribution from 0 to 5, sets `cHB=5`, and clears `pITT`.
- Frame 14 separately sets `cPI=pITT=HJ`; HJ's contribution remains zero.
- Frame 15 changes only HJ's contribution to 5, clears `pITT`, leaves UTG's
  total and highest wager unchanged at 5, and has no fold/all-in status change.
  Frame 16 separately activates CO. **This is CALL, not RAISE:** the new HJ
  total equals the existing highest total. `cRPI=[UTG,HJ]` does not identify
  both players as raisers and is not decoded into an action type.
- Frames 12-16 share generation 1 and consecutive local sequences. Each
  `pre` equals its predecessor's `now`: 1792581134966 -> 1792581137163 ->
  1792581151172 -> 1792581151977 -> 1792581166774 -> 1792581167582.
  Source cursor magnitudes are not used as local clocks.
- Local HJ activation is 1792581149857; its original deadline is
  1792581159857. Acceptance arrives at 1792581164663, **14,806 ms** after
  activation and 4,806 ms after expiry. The historical action is evidence of
  acceptance, never a renewed certificate for that opportunity.

Contribution arithmetic is 5 - 0 = 5 invested, with 253 available before the
call. The implied remaining spendable stack is 248. Frames 15-16 do **not**
contain a separate post-call `players.stack` update or screenshot; 248 is
arithmetic, not a claimed observed stack decrement. No ledger entry, pot
contestability, settlement result or complete history is fabricated.

The screenshot corroborates UI correspondence and the user's pairing, but
provides neither outerHTML/disabled attributes nor a precise local observation
time. Tests reconstruct native button markup and a DOM reader-result snapshot;
those are explicitly simulations. Actual readiness must still come from the
production CALL reader inside each future source window.

## Exact dependent evidence contract

`callLegalityEvidence` remains the single dependent producer. It invokes
`currentFacingOpen`; no source reducer, continuity validator, historical CALL
recognizer or competing timer is introduced. Hand 238's accepted CALL is a
reviewed static empirical basis, not a new event that mints live proof.

Rule: `pokernow-0.1.72-th-4fun-1-2-hj-call5-hand238-v1`.

All pre-existing source/profile checks still apply: PokerNow 0.1.72 normal
play-money Hold'em, six dealt-in players, no ante, 1/2 blinds, fresh explicit
UTG boundary, closed accepted UTG open-to-five, separate HJ activation,
registered HJ hero, matching private cards/positions/DOM, continuous source,
no intervening mutations, ordinary numeric stacks and zero HJ contribution.

Additional empirical coverage is exact source starting capacity by position:

| UTG | HJ | CO | BTN | SB | BB |
|---|---|---|---|---|---|
| 265 | 253 | 240 | 244 | 254 | 246 |

The existing deep-stack checks remain in force. Changed stacks, even another
sufficient deep stack, leave the new empirical rule unproven. There is no
short-call, all-in, other-position, other-price or other-profile permission.

The result separates these facts:

- `costProof`: existing source-backed cost/capacity arithmetic, even when the
  new empirical contract does not apply.
- `serverLegality`: the covered empirical rule, explicitly labeled
  `scoped_empirical_acceptance`; it is not a live server acknowledgment.
- `ui`: the existing observational result. A unique enabled supported native
  CALL label must show exactly 5 with a valid timestamp inside the source
  window. Hidden, missing, disabled, ambiguous or incorrect controls cannot
  produce ready permission.
- `permission`: non-null only when that empirical coverage and readiness both
  hold. It certifies **CALL only**, prior total 0, cost 5, resulting total 5,
  current remaining stack and arithmetic remaining-after-call. It carries
  rule/provenance, current actor and street, the source roster/capacities,
  continuity receipt, control snapshot, and table/hand/number/hero/seat/cards,
  generation/cursor/activation sequence/decision epoch/receipt/expiry binding.
- `legalActionsProof`: still insufficient for the complete action set, or
  contradicted by a concrete control conflict. A CALL permission cannot certify
  CHECK, FOLD, RAISE, reopening rights, min/max/grid or the full action menu.
- `authorized=false`, `recommendationAuthorized=false` and
  `historyComplete=false` remain explicit.

The Phase 4B diagnostic consumes `permission` to report current CALL legality
and remove only its `current_call_authorization` blocker. The reviewed-strategy
blocker and all response activation gates remain. Unsupported CALL/3-BET is
never replaced with FOLD; no provider request or game action is sent.

Expiry remains activation + 10,000 ms, with exact-boundary expiry and clock
regression rejection. A later source update, changed hand/actor, contradiction,
disconnect or reconnect invalidates the existing window and dependent result.
Each producer call binds the caller's current decision epoch. No permission is
cached for use across epochs or accepted as external authority. Future strategy
activation must freshly derive/recheck it in the actual request/response epoch
path; this diagnostic object is not an executable packet credential.

Generic `proveBettingLegality` still requires its independently established
rules/grid and complete ordered street. Pot reconstruction and full-hand
accounting requirements are untouched. No `historyComplete=true` is introduced.
All five unopened policies and BB abstention are unchanged.

## Assumptions and limitations

This review assumes the user's screenshot/source pairing and manual CALL
report are accurate, and that the same observed server profile preserves this
CALL behavior for the exact scoped situation in a future fresh hand. It is
empirical evidence from one acceptance, not a universal server specification.
Player IDs, table IDs and private cards are bound anew for each opportunity;
legality is assumed independent of identity and card strength. The test's
within-window matching control is simulated, not retrospectively attributed
to the historical screenshot. Other stack vectors require a separate explicit
coverage review; this pass deliberately does not extrapolate.

## Exact next task

Obtain and review an inspectable **six-max HJ-versus-UTG 2.5BB response node**
for this no-ante play-money profile with explicit cEV/rake assumptions, UTG
range, six-position stack vector (132.5/126.5/120/122/127/123 BB in
UTG/HJ/CO/BTN/SB/BB order), full permitted action tree including cold CALL,
covered hand frequencies and each 3-bet total. Any depth/model adaptation must
be explicitly bounded and reviewed. Preserve mixed frequencies and incomplete
hand coverage; do not infer strategy from this manually called K7o.

Install that reviewed artifact through Phase 4B's reference infrastructure and
implement dependent response activation using Phase 4A plus this freshly
rechecked CALL permission. Add request/response epoch/control invalidation tests
and retain all accounting/model prerequisites; do not relabel a partial action
set or history as complete. Mixed entries need a reviewed execution design.
3-BET still needs independent rights, minimum/maximum, chip grid and reviewed
sizing. No additional manual poker action is requested for strategy research.

## Validation

- Targeted production betting-window and CALL-control suites: **140 passed**,
  including **37 new hand-238 cases**.
- Full `npm test -- -- --maxWorkers=1`: **2,661 tests across 95 files passed**.
  Workspace totals: ai-core 491; browser-reader 1,872; opponent-db 41;
  poker-engine 101; range-engine 147; shared 9.
- `npm run typecheck`: passed.
- `npm run build`, `npm run build:extension` and `git diff --check`: passed.
  Both extension bundles were rebuilt; only the content-script bundle changed.

The initial targeted run encountered the existing five-second cold-import
timeout in the first production replay and a subsequent observer assertion
failure. The explicit one-worker rerun passed with unchanged timeout limits;
the complete suite then passed. No source or test gate was relaxed.

The tests exercise the MAIN observer, projector, single source authority,
live cross-check, actual CALL reader, dependent proof adapter and overlay.
They cover exact binding/cost/capacity, full historical acceptance/next-actor
replay, expiry and clock regression, wrong amounts/actors/profile/hand/cards,
missing/predecessor/unknown-field source updates, reconnect/disconnect,
short/changed/settling stacks, absent/disabled/ambiguous controls and changed
epoch bindings. No positive recommendation, provider request or outbound game
send is expected. Raw evidence and the pre-existing untracked `.agents/`
directory are excluded from this change.
