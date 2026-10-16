# Preflop RAISE: Phase 1 evidence and interaction design

Historical audit. The later hand169 acceptance and implemented narrow exact-size
contract are documented in [PREFLOP_RAISE_PHASE2.md](PREFLOP_RAISE_PHASE2.md).
The findings below describe evidence available before that capture.

Audited 2026-10-16. Phase 2 has not started. No strategy, production proof,
display, source projection or expiry behavior is changed by this document.

The diagnostics-only collector proposed below is now implemented. See
[RAISE_EVIDENCE_CAPTURE.md](RAISE_EVIDENCE_CAPTURE.md) for the bounded manual
checkpoint/export procedure. This does not implement the proposed sizing
certificate or change recommendation/control readiness behavior.

## Conclusion

Neither available legality route is currently proven for a live first-UTG
raise to 5 chips. The chart, total/additional sizing arithmetic and renderer
exist. The missing dependency is an independently supported PokerNow sizing
contract, followed by its scoped adapter. Do not enable RAISE from these findings.

## Inspected evidence and implementation

- `firstUtgSource.ts` / `firstUtgState.ts`: bounded projection/reducer, source
  profile, first-UTG certificate, generation/predecessor rejection and expiry.
- `firstUtgLive.ts`, `preflop.ts`, `unopenedEvidence.ts`, extension
  `decisionProofs.ts`: live cross-checks and chart-specific activation.
- `preflopPolicy.ts`, ai-core `decisionProofs.ts`, `legalityProof.ts`,
  `liveLegalityEvidence.ts`: conditional sizing and generic replay requirements.
- `raiseControlRead.ts`, `pokernow-raise-live.html`, `raiseControlDom.test.ts`:
  selected total and form observations, explicitly not verified legal bounds.
- `contentScript.ts`, `liveTimeline.ts`, `eventSource.ts`, `rawSocketCapture.ts`:
  receive/validation/poll/display timing and existing development diagnostics.
- Raw hands 49, 53 and 68; saved diagnostics through hand 133; archived source
  rows in hand-56's diagnostic; source, policy, control and lifecycle regressions.

The first-UTG profile recognizes 1/2, ante=null, deadButton=false, gM="th",
mode="4fun", aD/aS/cM/cR=false. Those abbreviated flags are exact profile
constraints, not decoded rule definitions. Source hand-start logs explicitly
label the game No Limit Texas Hold'em. That supports the variant label, but
does not supply a chip denomination or validate the abbreviated sizing fields.
The current implementation also requires every source stack >=202 and each
current remaining DOM stack >=200; this is narrower than all 100BB+ tables.

## Captured field behavior

| Field | Observed values and behavior | Contract conclusion |
| --- | --- | --- |
| mR | Hand49 registration 2, new-hand frame 4. Hand53/68 registrations 4; their next-hand patches omit it. | Candidate minimum-related value only. No paired first-UTG Min Raise result, unit contract or proof that its omission preserves a legal bound. |
| mAVTB | Hand49 119 -> 87 -> 119 as actor changes; hand53 boundary 250; hand68 boundary 241. Values correlate with recorded actor stacks. | Candidate capacity bound. Does not distinguish total from additional chips, especially where contribution is nonzero, or establish a server maximum. |
| nR | [1] in all inspected raw registrations/hand starts that contain it, including heads-up and six-player play. | Constant array with unknown semantics. Not proof of one-chip denomination. |
| cHB / tB | cHB 0 -> 2 in hand49; normal blind totals in tB. | Useful contextual correlations. Later socket wager assignment and full legality are not established by these names. |
| cPI / pITT / cRPI | Hero named by both current-player fields and cRPI=[] at supported first-UTG boundaries. | Existing first-actor proof can be reused; an empty array is not independently decoded as raising permission. |
| mTB / rIT / sPM / other flags | mTB=null, rIT="no", sPM=false in inspected registrations. | No variation or validation evidence establishes size limits/increments. |
| version / fV | "0.1.72" in inspected raw captures. | Useful evidence-profile discriminator, not a legality certificate. |

The production allowlist drops mR/mAVTB/nR. The raw recorder preserves them.
Do not add them to production state as trusted bounds until their contract is
established, including sparse patches, resets, types and actor binding.

The archived hand53 log in `hand-56-failed-smoke-diagnostic.txt` reports hero
raising to 4 at source timestamp text `179187677083600`, on the **turn** after
a bet of 2. This is not a preflop raise-to-5 acceptance example. No explicit
raise-to-5 acceptance was found in the inspected saved event text. Log history
remains incomplete; no absence-of-events completeness claim follows.

## Legality evidence matrix

Tests listed as required below are acceptance criteria, not claimed passing
live-contract tests. Existing synthetic tests prove conditional arithmetic only.

| Required fact | Proposed authority | Currently verified? | Test/evidence that establishes it | Missing |
| --- | --- | --- | --- | --- |
| Six dealt-in players, UTG first actor, no prior voluntary turn | Existing firstUtgProof plus current live cross-checks | Yes, only its supported fresh boundary | Existing source-to-overlay replays and reconnect/roster/actor negatives | Nothing additional for this context |
| Initial right to raise | Above context plus a verified scoped rule/action contract | First-action opportunity proven; PokerNow raising permission not independently certified | Matched rule/action source or accepted initial raise for the same profile; exclude nonstandard restrictions | Explicit raising rule/permission semantics |
| Minimum raise-to | Verified no-limit opening rule for this profile, or authoritative source bound with decoded units | No target-specific certificate | Paired labeled Min Raise operation/source/control evidence, with rule or authoritative validation backing; reject a selected value alone | A proven 4-chip lower bound; current 2->4/3->6 observations are postflop |
| Maximum permitted total | Proven rules plus remaining stack + current contribution, cross-checked against any authoritative cap | Numeric capacity yes; full legal maximum no | Distinguish total from additional, bind actor, verify rule/cap; synthetic stack checks alone insufficient | Stack cap/rule semantics; mAVTB interpretation |
| Chip denomination/increment | Explicit settings/validation contract or scoped acceptance evidence | No | Verify legal-grid behavior independently of slider, input pattern and sampled integer stacks | Denomination or exact-size representability proof |
| Exactly 5 chips is legal | Verified bound/grid route OR authoritative validation of this exact proposed total | No | Positive actor/hand-bound validation for 5; conflicting control/amount/actor negatives | No pre-action validation response or accepted target-size example in captures |
| Target means total, not additional | Existing input reader and packet sizing convention, paired source/action evidence | Selected input treated as raise-to; arithmetic distinction implemented | Target=5, UTG contribution=0 -> investment=5; future nonzero contribution test must differ | Target-size live cross-check; equality at UTG alone cannot distinguish conventions globally |
| Current control matches recommendation | Current form DOM and live input.value, independent of legality source | Reader verified; target live pair absent | Exact 5 plus displayed 2.5BB, one visible enabled Raise submit, no ambiguity | All saved decision diagnostics have closed Raise form |
| Freshness and identity | firstUtgProof and existing request/DOM/source binding | Implemented for FOLD | Original deadline, actor/action/hand/generation changes and late response regressions | Extend those same tests to a real size-proof adapter |

Route A: after independently validating the ordinary no-limit opening rule,
the expected minimum is 2BB=4 chips. With an independently verified one-chip
grid and sufficient capacity, 5 would satisfy it. This is conditional reasoning,
not a new live certificate. A complete whole-hand ledger is unnecessary here.

Route B: an explicit pre-action validation response could certify exactly 5
without proving every other grid point. None is captured or implemented. A
post-action server row/update can document actual acceptance, but cannot keep
the pre-action recommendation alive after the action changes the decision.
One acceptance is not a general minimum/grid/maximum proof. Do not manufacture
`chipUnitBB=0.5` from an exact-size acceptance; use a distinct contract branch.

The captured form uses `novalidate` and a text input with numeric pattern/input
mode. Browser validity, enabled submit and slider step=1 are not server validation.

## Proposed interaction separation (not implemented)

1. Chart candidate: internal RAISE/2.5BB membership is not actionable advice.
   Missing independent size legality continues to show waiting for proof.
2. Certified recommendation: only a fresh firstUtgProof AND scoped sizing
   proof may authorize `RAISE TO 5 CHIPS (2.5BB)`. The Raise panel need not
   already contain 5 if independent legality is established. A closed panel
   has a separate `control unchecked` status, not invented control readiness.
3. Execution readiness: current unique visible controls, live value 5, matching
   BB display and enabled Raise indicate `control matches`. Wrong amount must
   explicitly say it differs from the recommended total; disabled/ambiguous or
   contradictory controls block readiness and require revalidation.
4. Every control edit still invalidates the old decision epoch/response. A fresh
   evaluation may reuse only the still-valid original source certificate. No
   input change, panel opening, LLM response or poll extends its deadline.
5. On expired/invalid source evidence, clear actionable recommendation and
   readiness. Do not retain a ready-to-submit state. Manual actions only.

For a closed panel this design permits a certified recommendation only through
independent pre-action legality, never through the absence of control evidence.
It does not loosen disabled/contradictory-control handling. FOLD is unchanged.
The current engine deliberately couples selection with controls already showing
2.5BB; changing that coupling is future Phase 2 work after evidence is established.

## One dependent sizing contract

Reuse firstUtgProof as the only source-continuity/actor/hand authority. A proposed
scoped sizing proof references its version/scope, table/hand/generation/cursor,
hero, cards/decision binding and original expiry. It contains raw-chip target,
total/additional semantics, rule provenance and either validated bounds/grid or
an exact-size validation contract. Unknown/contradicted fields cannot mint it.

`effectiveExpiry = min(firstUtgProof.expiresAt, all required dynamic evidence expiries)`.
Any invalid dependency revokes it before that deadline. Static verified rule
knowledge is version/profile-scoped; it is not a fresh observation of the actor.
Current control readiness is a separate cross-check on the same binding.
One producer must supply both engine sizing facts and raiseLegality status;
no parallel metadata-based validator, raw certificate accepted from a page
message, invented historyComplete, or generic legality. The packet binding must
cover the new fields. Store raw chips first and convert once using proven BB=2.

## Timing findings

- MAIN observes a frame, projects it, and publishes local observedAt. The
  isolated consumer validates synchronously when its message handler runs.
  Cross-world queue delay still consumes the original evidence lifetime.
- Decisions run on the 1000ms poll, not on certificate issuance. In a normally
  scheduled foreground tab this adds up to roughly one poll interval; browser
  throttling/blocked main thread can make it longer. No actual paint trace is saved.
- The poll calls `void handTimeline.tick()` and opponent stats ticking without
  awaiting network acquisition. Chart selection does not wait for log refresh.
- Engine selection and overlay DOM update are synchronous before the relay
  fetch. Provider latency cannot improve freshness or delay the initial action.
- Diagnostic snapshot cloning/serialization and repeated evaluation may cost
  CPU; no measured duration supports a numerical latency claim or rewrite.
- Requiring manual panel selection before recommendation is an avoidable UX
  dependency only AFTER independent legality is available. Requiring both within
  the original deadline is currently intentional fail-closed behavior.
- Existing display uses an exact expiry timer plus 250ms safety refresh. A
  future coalesced evaluation on source issuance/DOM readiness could reduce
  initial poll delay, but must preserve polling cross-checks and original TTL.
  Do not issue on source receipt before synchronous DOM cross-check succeeds.
- Any subsequent gC/rup invalidates the current boundary witness. Whether
  opening/adjusting the form generates such an update is not captured. Do not
  bypass that invalidation to make the interaction fit the ten-second window.

## Smallest evidence collection proposal

Proposed only; no production instrumentation is added. Reuse existing
`poker-ai:raw-socket-capture` / `window.pokerAIRawCapture` (500 frames /
4,194,304 source characters,
incoming registered/gC/rup only). Start before one relevant fresh boundary and
stop after its brief control inspection, not after a whole hand. Source export
retains original JSON values. Keep local captures out of new commits.

Add a development-only manual checkpoint helper alongside that recorder, not
in the proof reducer. Three labeled checkpoints suffice: panel opened, after
the user clicks Min Raise, after the user types 5. The helper only reads; it
must never click, fill, submit, send a socket message or trigger poker actions.

Each checkpoint should record:
- local timestamp/monotonic performance time and latest raw capture frame count;
- raw recorder active/drop/limit status, explicitly not authoritative sequence;
- all matching form count/outerHTML and visibility/disabled ancestor evidence;
- input live value AND value attribute, BB text, submit state, native validity
  and min/max/step/pattern as uninterpreted observations; preserve missing/null;
- nearest available live diagnostic firstUtgProof binding/deadline and exact
  missing-proof reason (never synthesize it in MAIN from raw fields);
- optional non-authoritative timing marks for receipt, validation, next poll and
  DOM render if live latency measurement is needed; none can renew proof.

Bound checkpoint storage to 8 entries / 128KiB; refuse further entries with an
explicit reason rather than silently dropping them. Export once with original
raw socket JSON and checkpoint JSON. Do not merge or infer source/control state
from temporal proximity. Local frame counts are not bridge sequence numbers.
First compare the captured min operation with mR, selected 5 with any validation
result, and any actor/source change. Post-expiry checkpoints can inform semantics
but cannot be replayed as fresh recommendation evidence.

This inspection requires no submitted wager. It may still fail to establish a
contract. There is no demonstrated preflight validation API in the repository.
If the only remaining way to observe server acceptance is a real submission,
request separate explicit user authorization for one manually submitted raise
to 5 in the controlled play-money first-UTG setup. Record resulting server
raise-to row/state and actor/hand association. Never execute it automatically,
submit invalid probes, or generalize that single acceptance to arbitrary sizes.

## Next task and subsequent change set

Immediate next task: implement/test the bounded manual paired-checkpoint helper
described above, or collect its equivalent using existing DevTools diagnostics,
then inspect one paired source/control capture. Phase 2 remains blocked until
the matrix has a defensible bounds/grid or exact-size validation route.

After evidence is established, the minimal Phase 2 changes are:
1. Retain only newly validated source/settings fields if necessary; test their
   update/reset semantics in the existing reducer, without a second reducer.
2. Add the dependent sizing certificate and wire its facts into preflopExecution
   and both pre-packet/packet raiseLegality checks from the same result.
3. Separate independent recommendation eligibility from control readiness in
   the existing preflop policy/overlay; retain source and epoch guards.
4. Bind all new evidence in request identity and packet validation. Reuse the
   existing synchronous engine render and locked relay explanation path.
5. Optionally reduce poll scheduling delay only after measuring it; no expiry
   changes and no FOLD rewrite are required for initial RAISE support.

## Required tests

For diagnostic instrumentation: nested raw preservation, absent/null/property
vs attribute, multiple/hidden/disabled forms, bounded storage, one export,
manual labels are observational, no send/click/submit, stale/disconnected
checkpoint labeling, and no effect when disabled.

After evidence: run real MAIN -> projection -> reducer -> firstUtgProof -> size
proof -> packet -> engine -> overlay integration. Use sanitized tracked fixtures;
local ignored evidence must not be the sole clean-checkout test dependency.
Do not mock a selected policy or inject synthetic proof objects into the final
activation test. Synthetic variations are appropriate for negative tests.

Positive cases: chart-included UTG cards, independent valid size proof with panel
closed (recommendation certified/readiness unchecked), panel=5/enabled (ready),
5 chips -> total 2.5BB and additional 2.5BB, FOLD unchanged without size proof,
provider pending/failure cannot hide a fresh engine decision.

Negative cases: enabled submit/slider/selected 5 alone; unknown/contradictory
minimum/grid/cap/profile; min above 5; invalid representability; 4/6 selected;
BB display mismatch; duplicate/disabled/hidden controls; wrong total/additional
semantics; changed actor/cards/hand/generation; join/departure/all-in/settlement;
missing link/replayed frame; extra forced or voluntary wager; old control
checkpoint; expiry at the original deadline; control edits cannot extend TTL;
late/wrong-sized LLM response cannot change or resurrect the result. Exact-size
acceptance cannot certify 4, 6, another actor, another window or a full grid.

No test can turn an observational fixture into an authoritative rule contract.
