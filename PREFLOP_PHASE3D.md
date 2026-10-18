# Phase 3D: source-verified unopened BTN FOLD and RAISE

BTN now uses the unchanged six-max opening chart after exactly three explicit
folds and the intervening source turn activations. UTG, HJ and CO retain their
existing contracts. This is assisted advice only; nothing clicks or submits.

## Captured source evidence

| Local capture | Hand | Boundary | UTG fold / HJ turn | HJ fold / CO turn | CO fold / BTN turn | Original cards |
| --- | --- | --- | --- | --- | --- | --- |
| raise-sizing-paired.json | 148 | 74 | 75 / 76 | 77 / 78 | 79 / 80 | Qd Jd |
| raise-5-accepted.json | 166 | 32 | 33 / 34 | 35 / 36 | 37 / 38 | Kc 8d |

Both captures have dealer/hero seat1, SB seat2, BB seat3, UTG seat5, HJ seat9
and CO seat10. The original six dealt-in IDs, cards and positions are frozen
at the validated boundary. Folding never compresses/reassigns positions.
All six following payloads match the already supported closed raw fold/turn
grammar. Each explicit pGS=fold belongs to the preceding actor. Each following
cPI/pITT names the next actor. No wager, stack, roster, profile or card mutation
occurs. eventsData is empty and does not supply action coverage.

The existing bounded reducer remains the sole source/continuity authority.
The CO fold-prefix recognizer now shares its transition implementation with
BTN: four transitions for CO, six for BTN. Each stage checks the next local
sequence, source predecessor, exact raw/projected fields and frozen actor.
No second state reducer or connection validator was added.

`sourceStatus.btnProof` has scope `btn_after_utg_hj_co_folds`, the original
anchor, three fold records, intermediate HJ/CO activations, final BTN activation
and existing validated-prefix continuity receipt. It preserves raw patch
provenance. Missing, replayed, reordered, combined, unknown or contradictory
updates discard the pending window. Reconnect/gaps reset it. Every subsequent
source update invalidates issued advice; there is no same-decision renewal.

BTN's original deadline is its activation receive time +10 seconds. In hand148
that activation is 10.268 seconds after the boundary; the old anchor is retained
as structural evidence, not reused as an actionable expired decision. DOM polls,
Raise-panel edits and provider explanations cannot move the BTN deadline.

Live cross-checks require all six original seats/positions, exactly UTG/HJ/CO
folded, hero as sole actor, matching cards/dealer/blinds and ordinary numeric
stacks. Existing conservative source >=202 chips and current >=200 chips for
all six, consistent with source stacks/contributions, remain unchanged.
Offline/all-in/settlement/ambiguous reads are rejected. Log contradictions,
duplicate folds, reversed/tied multi-row fold order and extra posts block advice.
Log rows and DOM fold flags can contradict the source proof, never create it.

The packet retains six dealt-in players, two active opponents, three ordered
zero-contribution folds and the original blind totals. Its decision-local
historyCoverage=complete covers only this closed opening window. Global
historyComplete remains false; no side-pot/accounting/reopening proof is made.

## Exact-five legality authority and limits

| Required fact | Authority | Limit |
| --- | --- | --- |
| First BTN raising opportunity | Fresh six-player boundary and three explicit folds/turns | Hero has not acted; no voluntary wager or reopening question |
| Unchanged opening wagers | SB1/BB2 source baseline; exact patches prohibit changes | No limp, extra post, aggression or all-in |
| Opening minimum state | Existing live Min Raise=4 observation under this profile; zero-contribution folds do not change the wager increment | No inherited mR interpretation or generic min-raise API |
| Exactly five representable | Historical hand169 accepted five-chip raise in the same profile | Empirical rule evidence, not live per-decision server authorization |
| Sufficient capacity | Independent source/current deep-stack checks; zero hero contribution | Exactly five additional chips; no generic maximum/grid inferred |
| Fresh sizing | Existing ONE dependent sizing producer consumes btnProof | Same actor/table/hand/generation/cursor/epoch and original expiry |

The three zero-contribution folds change remaining players, not the unopened
no-limit wager state, denomination or hero's initial raise right. This is the
same bounded equivalence as HJ/CO, extended only to a separately proven BTN
window. There is no new live BTN server-acceptance claim.

The exact-five profile remains version/fV0.1.72, th/4fun, SB/BB1/2, ante=null,
deadButton=false, aD/aS/cM/cR=false, nR=[1], mTB=null, rIT=no, sPM=false.
Abbreviations remain opaque observed discriminators. mR, mAVTB, sliders,
HTML validity and enabled buttons do not independently authorize sizing.
An undocumented server change under identical profile values remains an
empirical-contract limitation, as it does for UTG/HJ/CO.

One validated result supplies both engine exactOpeningSize and raiseLegality.
BTN requires an explicit matching decision-window scope, zero contribution,
chip units, stack capacity, actor/hand/table/generation/cursor, epoch and original
deadline. Raise-to=5 chips/2.5BB; additional investment=5 chips/2.5BB. SB/BB and
other sizes cannot borrow this contract. Missing sizing abstains, never FOLD.

## Display and validation

Original QJs and K8o both produce RAISE under the unchanged BTN chart. Tests
also use an explicitly synthetic 72o source/DOM card variation for FOLD.
FOLD requires neither sizing/control evidence nor pot EV. RAISE renders with
the panel closed before an optional explanation. Consistent different controls
are not ready for the recommendation; contradictory/disabled/ambiguous open
controls block RAISE. Provider output cannot override or resurrect engine advice.
The countdown uses the original BTN certificate expiry; expired advice is removed.

Sanitized fixtures retain original numbers, timestamps, order and cards. Earlier
frames reuse existing tracked bounded prefixes; all six final payloads retain
every original raw field with identity substitution only. DOM cross-checks are
simulated from the existing reader shape. Positive tests traverse the real MAIN
bridge, source reducer, live adapters, sizing, engine and overlay; final proof
objects or decisions are never mocked. Raw captures stay local/ignored.

Validation: 166 new BTN tests (127 source-to-overlay and 39 source tests).
Targeted validation passed 529 reader/source/display tests and 82 policy/context
tests. The full suite passed 2,186 tests in 88 files: ai-core433, browser-reader1456,
opponent-db41, poker-engine101, range-engine146 and shared9. Workspace typecheck
passed, as did the full build, explicit extension rebuild and diff checks.
Both extension entry points were rebuilt; only contentScript.js has changed
output. Existing UTG/HJ/CO regression tests and all opening charts are unchanged.

## Unsupported states and one optional live check

SB/BB, limps, facing opens/re-raises, short stacks, different profiles, unsupported
extra/coalesced source updates, postflop and proof renewal remain gated. These
replays do not constitute a new live BTN verification.

Reload the rebuilt extension and refresh PokerNow before a new hand; restart
the relay with `npm run dev:relay`. Observe one matching deep six-player 1/2
no-ante hand with hero BTN. If UTG/HJ/CO all fold normally, confirm the chart
action appears before its explanation, with a countdown from BTN activation.
RAISE should show `RAISE TO 5 CHIPS (2.5 BB)` even with the panel closed.
Optionally open the panel and manually select five; this must not reset expiry.
At ten seconds actionable advice must disappear. Save a fresh diagnostic showing
btnProof and its three fold actors. No submitted wager is needed for this check.
