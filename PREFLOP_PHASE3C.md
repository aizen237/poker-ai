# Phase 3C: source-verified unopened CO FOLD and exact-five RAISE

Later scope update: [Phase 3D](PREFLOP_PHASE3D.md) adds the separately proven
three-fold BTN window. BTN-blocked statements below record Phase 3C scope.

## Existing captured evidence

| Local capture | Hand | Boundary | UTG fold | HJ turn | HJ fold | CO turn | Original cards | Boundary to CO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| raise-sizing-paired.json | 143 | 15 | 16 | 17 | 18 | 19 | Jh 5h | 14.933s |
| raise-sizing-paired.json | 149 | 85 | 86 | 87 | 88 | 89 | Ks Ac | 10.106s |
| raise-5-accepted.json | 167 | 43 | 44 | 45 | 46 | 47 | Qh Jc | 8.692s |

Numbers are local receive sequences, not server event indexes. Each source pre
also matches the preceding now. The frozen six-player mapping places hero seat1
CO, seat9 UTG, seat10 HJ, seat2 BTN, seat3 SB and seat5 BB. Actor IDs, not names
or DOM fold classes, establish the sequence.

Each fold explicitly sets that player's pGS to fold and pITT to null. Each turn
explicitly sets BOTH cPI and pITT to the expected next actor. All four complete
raw patches match the existing 0.1.72 fold/turn grammar and opaque discriminators.
They contain no wager, membership, stack, card or profile mutation.

This composes the observed fold/turn contract twice. It does not infer coverage
from cursor continuity alone. Missing/replayed links, coalesced shapes, extra
updates (even benign ones), wagers/posts/all-ins, changed actors/rosters and
reconnects fail closed. Unknown extra raw fields cannot disappear during bounded
projection and still certify the window. No arbitrary fold sequence is accepted.

## One authority and a fresh CO window

The existing reducer remains the only state/continuity authority. The extracted
validatedOpeningPatch helper checks the same raw shapes/projection agreement for
HJ and CO. coWindow is a four-transition recognizer after reducer validation,
not another state reducer or independent connectivity validator.

sourceStatus.coProof is version1, scope co_after_utg_hj_folds. It binds the actual
registered CO hero, original anchor/roster/positions/cards/blinds/stacks/profile,
both fold actors/seats/raw patches/sequences, intermediate HJ activation, final
CO activation and the existing validated registration-prefix receipt.

No CO advice is issued at the anchor, UTG fold, HJ turn or HJ fold. Only final
source-backed CO activation starts its original ten-second deadline. The older
anchor is structural evidence, not an expired certificate reused for advice.
DOM polling, control edits and LLM responses cannot renew it. Every subsequent
source update invalidates the current certificate; gaps/reconnects clear pending
and issued evidence. Expired advice is removed by the existing display lifecycle.

Shared live checks require all six original seats/positions, exactly UTG/HJ
folded, hero as sole actor, matching source/DOM cards, normal blinds and ordinary
stacks (existing conservative source >=202 chips and DOM >=200, consistent
with source stacks). Offline/all-in/settlement/read ambiguity is rejected.
Known log rows may corroborate but cannot create proof; contradictory, duplicate
or reversed folds block CO. Missing nonblind amounts use only source-bound zero.

The packet retains six dealt-in players, three active opponents, two
source-ordered folds and unchanged blind totals. Its decision-local
historyCoverage=complete describes only this bounded opening window.
Global historyComplete stays false. No general action, pot, side-pot, rake,
return or betting-reopening proof is fabricated.

## Independent exact-five legality

| Fact | Authority | Limit |
| --- | --- | --- |
| First CO raise opportunity | Fresh boundary, explicit UTG fold/HJ turn/HJ fold/CO turn | Hero has never acted; no prior voluntary wager or reopening question |
| Unchanged opening wagers | Normal SB1/BB2, others zero; accepted patches cannot change wagers | No limp, extra post, raise or all-in |
| Minimum opening state | Existing reported Min Raise=4 in normal 1/2 opening; zero-contribution folds do not change the wager increment | No generic minimum API or inherited mR interpretation |
| Exactly five representable | Historical hand169 acceptance under the same verified profile | Empirical rule evidence, not live per-decision server authorization |
| Capacity | Independent deep source/current stack checks | Exactly five invested; no generic maximum/grid inferred |
| Fresh binding | coProof, live cross-check, epoch/packet binding | Original CO receive time +10s |

The two zero-contribution folds change who remains, not the no-limit opening
wager state, denomination or hero's initial raise right. This is the same bounded
equivalence used for HJ, with the additional explicit HJ fold/CO turn proven.
There is no new live CO server-acceptance claim.

The profile remains version/fV0.1.72, th/4fun, SB/BB1/2, ante=null,
deadButton=false, aD/aS/cM/cR=false, nR=[1], mTB=null, rIT=no, sPM=false.
Abbreviations remain opaque observed discriminators. mR, mAVTB, slider values,
HTML validity and enabled buttons do not independently authorize sizes.
Undocumented server changes under identical values remain an empirical-contract
limitation, as with UTG/HJ.

The ONE existing openingSizeEvidence producer supplies both exactOpeningSize
and raiseLegality. CO requires explicit scope co_after_utg_hj_folds, bound
table/hand/actor/seat, generation/cursor, zero contribution, chip units, capacity,
epoch and original expiry. Raise-to is exactly5 chips/2.5BB; additional
investment is separately represented as5 chips/2.5BB. Other positions/sizes
cannot borrow this scope. Missing sizing abstains, never substitutes FOLD.

## Strategy, display and regression coverage

The CO chart is unchanged. Original J5s is FOLD; original AKo/QJo are RAISE.
FOLD needs no sizing/control proof. RAISE renders immediately with the panel
closed, before an optional explanation. Five selected manually establishes
matching controls only. A different consistent selection is not ready;
missing/duplicate/disabled/read-only or contradictory open controls block RAISE.
No poker actions are automated.

Sanitized fixtures preserve original cards/numbers/order/timestamps and all
four complete transition payloads, with identities substituted. Earlier frames
reuse the existing tracked bounded prefix. Raw evidence stays ignored.
Positive tests use the real MAIN bridge, reducer, coProof, live adapters, sizing
producer, engine and overlay. DOM cross-checks are explicitly simulated from
the existing reader shape; no policy decisions or authorization are mocked.
Tests cover each broken transition, source/DOM/profile/capacity contradictions,
expiry, late explanations, scope leakage and existing UTG/HJ regressions.

Validation: 132 new tests (102 live integration and 30 source tests). The
targeted runs passed 363 reader/source/display tests plus 82 policy/context
tests. The final full suite passed 2,020 tests in 86 files. An initial full
run and first isolated retry hit the existing 15-second relay-start timeout;
a direct startup probe, subsequent isolated test and full rerun passed without
changing relay code or the timeout.
Workspace typecheck, full build, explicit extension rebuild and diff checks
passed. Both extension entry points were rebuilt; only contentScript.js has
changed generated content. Existing UTG/HJ tests and strategy charts are unchanged.

## Unsupported states and one optional live check

BTN/SB/BB, limped/facing-action pots, short stacks, different profiles,
extra/coalesced updates, postflop and proof renewal remain unsupported.
Automated replay is not a new live CO verification.

Reload the extension, refresh PokerNow before a new hand and restart the relay
with npm run dev:relay. Observe one matching deep six-player 1/2 no-ante hand
with hero CO, letting UTG/HJ act normally. If both fold in the supported sequence,
verify the CO chart action appears before its explanation and the countdown
uses CO activation. For RAISE the panel may be closed; manually selecting five
must not reset the deadline. At ten seconds actionable advice must expire.
Save one fresh diagnostic showing coProof and the two source fold actors.
No submitted wager is required for this display/proof check.
