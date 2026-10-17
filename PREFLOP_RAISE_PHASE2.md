# Exact five-chip UTG opening rule

Scope update: [Phase 3B](PREFLOP_PHASE3B.md) reuses this same producer for
the equivalent source-verified unopened HJ window after UTG folds. The
UTG-only statements below record the original Phase 2 implementation.

2026-10-16. Phase 2 implements one empirical, profile-scoped sizing contract.
It does not implement a generic raise-permission API or a poker rules solver.
The existing chart is unchanged. Raw evidence remains local in `evidence/`.

## Authority and limits

The controlled manual action in `raise-5-accepted.json` establishes actual
acceptance of a five-chip first-UTG opening in the observed ordinary no-limit
play-money Hold'em profile. Frame 65 begins hand 169, `oi51kdltxqe9`, at local
receive time 1792133357379. It explicitly supplies six dealt-card entries,
normal blind totals, hero as cPI/pITT and zero hero contribution. Frame 66
at 1792133424717 sets hero tB=5 and cHB=5, followed by the next actor in frame 67.
The continuous generation-2 source prefix includes registration 18 and matching
refresh 19. The controlled test report supplies the action interpretation.

This is **historical post-action acceptance**, 67.338 seconds after the boundary,
not a live preflight validation. The old witness expired at 1792133367379.
The implementation never reuses or renews it. Captured Q8o remains chart FOLD.

The reusable inference is narrowly this: the same ordinary no-limit opening
rule, with the same observed settings, permits the same representable five-chip
total for a fresh zero-contribution first actor with sufficient capacity.
This is empirical rule knowledge plus a newly validated decision, not server
authorization for that new decision. Hole cards determine chart membership,
not legal denomination. Unknown/different profiles cannot use this inference.
The reader/relay remains a local trust boundary, not a cryptographic server
attestation. An unreported server rule change cannot be detected by this model.

The profile is restricted to source version/fV `0.1.72`, gM=`th`, mode=`4fun`,
SB/BB=1/2, ante=null, deadButton=false, aD/aS/cM/cR=false, nR=[1], mTB=null,
rIT=`no`, sPM=false. The abbreviated values are **opaque observed profile
discriminators**, not decoded permission, maximum or chip-increment definitions.
The boundary must explicitly carry matching fV and nR. Other retained settings
use the existing validated sparse-state reducer. Changes invalidate the current
witness; a different profile cannot issue this sizing evidence.

`mR` remains excluded from the producer and source projection. Its recorded
4 -> 8 change corroborates the reported action but does not establish its units
or reset behavior. Inherited mR cannot veto or certify an opening size. No
`chipUnitBB=0.5`, general max-raise or arbitrary legal-size interval is invented.

## Evidence matrix

| Fact | Authority and current conclusion | Limit |
| --- | --- | --- |
| First voluntary raise opportunity | Existing fresh firstUtgProof, normal no-limit profile, observed accepted first-UTG action | Six dealt-in, UTG only; no later position/window |
| Exactly five chips representable and accepted | Controlled hand169 action plus server tB/cHB/next-actor transition | Exactly five; no general grid or pre-action acknowledgment |
| Min Raise four | User's controlled Min Raise report; saved paired file has visible 4/2BB in hand151 | Saved checkpoint is labeled panel_opened, not min_raise_selected; not a generic source-bound minimum API |
| Selected five is 2.5BB | User reports control observation; arithmetic with proven BB=2 | The saved paired file does not contain the five-chip checkpoint; no fabricated fixture of it |
| Adequate capacity | Fresh source and synchronous ordinary DOM stacks | Existing conservative source >=202 chips and DOM >=200 for every player; target investment is five |
| Full maximum / arbitrary chip step | Not proven or needed for this exact-size rule | No general cap/grid certificate; nR/mAVTB/slider are not decoded |
| Current controls | Existing live input reader, visible/enabled submit, consistent selected chips/BB display | Observations only, not server acceptance |
| Fresh binding | Original firstUtgProof + live cross-check + epoch/packet binding | Earliest dependency expiry is its original ten-second deadline; no renewal |

## Implementation contract

- `firstUtgSource` retains only six additional bounded profile fields and
  attaches a profile discriminator after its existing boundary checks. It does
  not create a second continuity validator. Missing profile evidence still
  permits the unchanged FOLD path.
- `openingSizeEvidence` is the single dependent producer. Its result supplies
  both preflopExecution.exactOpeningSize and raiseLegality. It binds table, hand,
  actor/seat, generation/cursor, zero contribution, raw chip units, BB, capacity,
  rule provenance, local epoch and original receive/expiry timestamps. Existing
  sourceWindowKey/packet binding additionally covers cards and current controls.
- The engine accepts this exact-size branch only for the existing first-UTG
  chart class. It checks the size, capacity, hand/generation/epoch and deadline
  again. The old independent bounds/grid branch is unchanged for offline uses;
  live code does not fabricate its inputs.
- The overlay immediately renders `RAISE TO 5 CHIPS (2.5 BB)`, before HTTP.
  Explanation failure cannot remove a fresh engine result or change its size.
  Stale hand/epoch/actor/source responses remain rejected. No poker actions are
  sent, clicked, typed or submitted by this feature.
- A closed panel is labeled controls-not-checked. An open usable panel with a
  different consistent amount shows a persistent instruction to manually set
  five; that selected amount is not certified. Only an exact five/2.5BB match
  is labeled matching. Missing, duplicate, disabled/read-only controls or
  contradictory chip/BB/capacity observations block RAISE. A control edit
  changes the epoch, never the source deadline. The readiness label survives
  provider explanations/failures.
- FOLD needs no sizing evidence. Whole-hand history remains false. Other
  positions, facing actions, short stacks, all-ins, postflop EV, side pots,
  return/rake accounting and proof renewal are unchanged/unsupported.

## Regression and live verification

The tracked fixture is a sanitized, selected-field copy of all 68 captured
envelopes; identities are replaced, numeric values and order retained. The
source-to-overlay tests feed these envelopes through MAIN and the production
runtime. A simulated synchronous DOM cross-check uses an existing captured
reader shape with hand169 values; it is not claimed as captured hand169 DOM.
AA/AK/QQ are explicitly synthetic chart-included variations. Q8o is replayed
unchanged as FOLD. No hand-built proof shortcut is used.

Tests cover controls closed/matching/different, unknown profiles, version drift,
capacity, actor/cards, missing/gapped/reconnected source, expiry, epoch binding,
ignored stale mR, immediate render, provider failure and late/contradictory
explanations. Unit/integration tests do not constitute a new live RAISE test.

One smoke check: reload this unpacked extension and refresh the table tab;
restart the local relay with `npm run dev:relay` so its compiled schema matches.
At the next naturally occurring supported deep six-player 1/2 no-ante first-UTG
hand **inside the existing RAISE chart**, observe that five-chip advice appears
with its countdown before any explanation, even with the panel closed. If time
permits, manually open the panel and enter five: the readiness text should
change to matching without extending the original deadline. If the deadline
passes, advice must become EVIDENCE EXPIRED. No submitted raise is required
for this display/readiness check; the hand169 acceptance test need not repeat.

Diagnostics expose the dependent contract at
`decision.scopedProofs.openingSize`, and the selected action at `decision.policy`.
The diagnostic `preflopExecution` view still describes current controls; the
actual packet carries both controls and the bound exactOpeningSize contract.

Validation: 48 new Phase 2 regressions; 93 focused tests passed. The final full
run passed 1,769 tests in 82 files, including relay startup. Workspace typecheck,
full build, extension rebuild and diff check passed. An initial full run hit the
existing 15-second relay-start timeout (isolated retry and final full run passed)
and an old RAISE-label assertion, updated for the explicit five-chip display.
