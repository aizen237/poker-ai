# Phase 3B: source-verified unopened HJ RAISE

Later scope update: [Phase 3C](PREFLOP_PHASE3C.md) uses the same producer for
the separately proven two-fold first-CO window. CO-blocked statements below
record the original Phase 3B scope.

This extends the existing exact-five-chip producer to the already supported
first HJ decision after an explicit UTG fold. The user reports UTG FOLD/RAISE
and Phase 3A HJ FOLD as live verified. HJ RAISE is implemented and replay-tested;
this change does not claim a new live HJ raise acceptance.

## Why the sizing rule applies

The comparison is between two proven unopened states, not just two positions.
The validated boundary has normal SB=1/BB=2, no ante, no other contributions,
six frozen dealt-in identities and sufficient deep stacks. The recognized
next two complete source patches explicitly fold the zero-contribution UTG
and activate hero HJ. They cannot alter wagers, profile, cards or stacks.
Hero has not previously acted. This is an initial raise opportunity, not
reopening after an under-raise.

| Required fact | Basis | Limit |
| --- | --- | --- |
| Same opening wager state | Boundary blind totals plus exact UTG-fold/HJ-turn source grammar | Additional, combined or unknown patches fail closed |
| Initial raise right | Verified ordinary no-limit profile, fresh first HJ opportunity, no prior hero action or voluntary wager | No response-to-open or reopening permission |
| Minimum opening total | Existing live Min Raise=4 observation in normal 1/2 opening state; folding commits zero and changes no wager increment | No general minimum API; inherited mR is not authority |
| Five representable and accepted | Historical hand169 exact-five acceptance under the same profile | Empirical rule inference, not live per-decision authorization or a generic denomination grid |
| Capacity | Independent source and current stack checks, zero hero contribution | Existing conservative source >=202 and current >=200 chips; exactly five additional chips |
| Profile unchanged | Same existing version/settings discriminator, preserved only through the accepted fold/turn transitions | Unknown or different settings cannot issue sizing |
| Fresh decision | Existing hjProof at HJ activation, live cross-check and decision epoch | Original activation receive time +10 seconds; no DOM/control/provider renewal |

The profile remains version/fV 0.1.72, th/4fun, SB/BB=1/2, ante=null,
deadButton=false, aD/aS/cM/cR=false, nR=[1], mTB=null, rIT=no, sPM=false.
Abbreviated fields remain opaque observed discriminators. Neither mR, mAVTB,
slider values nor HTML validity establish legal bounds.

The authority is the same profile-scoped empirical rule used for UTG, combined
with the independently proven equivalent unopened HJ state. There is no new
server preflight acknowledgment. An undocumented server change under identical
profile values remains a limitation of this model.

## One dependent sizing contract

The existing source boundary validator now retains its optional exact-five
profile discriminator for the HJ anchor as well as UTG. No source recognizer,
continuity validator or history reconstruction was added.

The existing openingSizeEvidence producer consumes currentFirstUtg or currentHj,
and supplies BOTH engine exactOpeningSize and raiseLegality from one result.
It binds decision-window scope, table, hand, actor/seat, generation/cursor,
zero contribution, BB/chip units, capacity, provenance, epoch and original
deadline. For HJ the scope must explicitly be hj_after_utg_fold. Missing/UTG
scope cannot authorize HJ, and no later position can inherit this permission.
Legacy absence of the scope is accepted only for the existing UTG contract.

HJ's historical anchor can be older than ten seconds: the existing independent
HJ turn transition starts its own decision window. The sizing producer uses
that original HJ deadline, never a renewed anchor. Every later source update,
disconnect, gap, actor/hand change or contradiction retains existing invalidation.
Global historyComplete remains false.

The engine uses the unchanged HJ chart. Original hand168 QQ selects RAISE,
raise-to=5 chips/2.5BB and additional investment=5 chips/2.5BB. Original hand150
86o remains FOLD. Missing sizing for a chart RAISE abstains; it never substitutes
FOLD. FOLD remains independent of sizing/control evidence.

The unchanged overlay immediately renders RAISE TO 5 CHIPS (2.5 BB) with a
closed panel. Controls are then explicitly unchecked. A consistent selection
other than five is not ready and retains the manual-setting instruction.
Five/2.5BB establishes matching controls only. Missing, duplicate, disabled,
read-only or contradictory open controls block RAISE. Editing controls changes
the epoch, not expiry. LLM explanations cannot choose, delay, override or
resurrect the action. No game actions are automated.

## Regression scope

The existing sanitized hands150/168 envelopes run through the real MAIN bridge,
bounded reducer, hjProof, live adapter, sizing producer, engine and overlay.
The DOM cross-check is simulated using the existing reader shape; policy and
final authorization are not mocked. Captured QQ is unchanged for the positive
RAISE test. Explicit negative variants cover missing/wrong fold, wagers/posts,
gaps/replays/reconnect, changed actors/roster/hand/cards, profile/capacity,
controls, expired/misbound sizing, later positions and stale explanations.
The original UTG tests remain unchanged.

Validation passed: 280 targeted tests (231 reader/source/display and 49 policy),
and 1,888 full-suite tests in 84 files, including relay startup. This adds 64
tests over Phase 3A. Workspace typecheck, full build, explicit extension rebuild
and git diff --check passed. Both extension entry points were rebuilt; only
contentScript.js has changed generated content.

## Remaining limits and optional live verification

Only the exact Phase 3A boundary -> UTG fold -> immediate HJ activation grammar
is supported. CO/BTN/SB/BB, limped/facing-action pots, all-ins, different profiles,
short stacks, general legal sizes, postflop and same-decision renewal remain
unsupported. This change adds no pot/side-pot/rake/accounting permission.

Optional single check: reload the extension, refresh the table tab and restart
the relay with npm run dev:relay. In a naturally occurring matching deep six-player
1/2 no-ante hand, hero HJ must hold an existing chart RAISE hand and the source
must observe UTG's fold followed immediately by hero's turn. With panel closed,
look for RAISE TO 5 CHIPS (2.5 BB) before the explanation. If time permits,
manually open the panel and select five: readiness should match without resetting
the countdown. At the original ten-second deadline advice must expire.
No submitted raise is required for this display/readiness check.
