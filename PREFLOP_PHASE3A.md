# Phase 3A: source-verified unopened HJ FOLD

Status update: the user has live-verified this HJ FOLD path. The later
[Phase 3B](PREFLOP_PHASE3B.md) extends its matching exact-five profile to HJ
RAISE. The FOLD-only statements below describe the original Phase 3A scope.

This implements only an out-of-chart FOLD on hero's first HJ turn following an
explicit UTG fold, in the existing six-dealt-in, 1/2-chip, no-ante play-money
Hold'em profile. UTG FOLD/RAISE and the opening charts are unchanged. HJ RAISE,
CO/BTN/SB/BB advice, limps, responses to aggression and postflop are not enabled.

## Source contract and its limits

The Phase 3 audit identified two matching examples already saved locally:

| Capture | Boundary | UTG fold | HJ activation | Hero cards |
| --- | --- | --- | --- | --- |
| raise-sizing-paired.json, hand150 | 96 | 97 | 98 | 8d 6h |
| raise-5-accepted.json, hand168 | 54 | 55 | 56 | Qs Qd |

In each example a validated new hand identifies UTG as the original actor.
The next patch explicitly assigns that player's pGS to `fold` and sets pITT
to null. The immediately following patch explicitly names hero in BOTH cPI
and pITT. Each predecessor matches the prior cursor. No wager, street, roster,
stack or card mutation is present in either transition. The local HJ activation
arrives 7.871 seconds and 6.945 seconds after the respective hand boundaries.

The defensible inference is restricted to this closed transition grammar:
normal fresh boundary -> first UTG explicitly folds -> immediate first HJ turn.
Under the existing observed sparse-state assignment contract, those patches
change only fold/turn state. A call/raise before this HJ opportunity would
require a wager mutation; another voluntary turn would require a different
actor transition. Neither is accepted. The known first-UTG starting point and
irreversible fold exclude treating a later orbit as this first HJ opportunity.
This is stronger than observing folded DOM classes or an unchanged final pot.

`pre/now` and local sequence alone do NOT prove action coverage. The new
recognizer additionally requires the exact complete raw field sets from both
captured fold/activation patches, with their observed 0.1.72 discriminators.
Even an otherwise ignored extra field prevents recognition before projection
can discard it. Additional benign updates also block this initial slice.
Combined fold/turn patches, coalesced/unknown shapes, extra posts, wager changes,
all-ins, membership changes and reconnects are not interpreted or repaired.
Opaque sNA/sNAA/wBACPI/mAVTB/mEV/pASA fields are matched as observed shape
constraints; they are not decoded into legal bounds or timing units.

This remains an empirical, version-scoped source contract, not a server
completeness acknowledgment or a universal event stream. An unreported server
change to the meaning of an identical payload cannot be detected. There is no
permission to extrapolate to arbitrary calls, raises, check sequences or
same-decision renewal. `eventsData=[]` supplies no action coverage.
`historyComplete` stays false everywhere it was false before this change.

## One source authority, dependent HJ proof

The existing registration/bootstrap/reconnect checks and bounded reducer remain
the continuity authority. Its existing boundary validation is shared with an HJ
anchor: the real registered hero remains HJ, while the original actor must be
UTG. No temporary identity substitution or injected UTG certificate is used.
The firstUtgProof contract and its UTG sizing producer are preserved.

`hjWindow.ts` recognizes exactly the next fold and next activation after that
anchor, only after the reducer validates each update. It does not reconstruct
a general action history or maintain a second source-state reducer.

`sourceStatus.hjProof` is version 1, scope `hj_after_utg_fold`. It binds the
table, hand number/ID, generation, original six-player roster and positions,
cards, blinds, stacks, anchor sequence/cursor/time, UTG fold identity/seat and
raw patch, activation patch, current/previous cursors and receive timestamp.
Continuity references the same validated registration prefix as firstUtgProof.
Source identity's published boundary cursor is checked against the anchor;
the reducer's current cursor certifies the later HJ turn. No lossy metadata
inventory is promoted into a competing authority.

The anchor is historical structural evidence, not actionable advice. A NEW
ten-second deadline starts at HJ activation's original local receive time,
including when UTG took more than ten seconds to act. It is not a refresh of an
expired UTG certificate. Every later source update invalidates this HJ proof;
duplicates and unrelated updates cannot renew it. Disconnect, missing local
sequence, bad predecessor, malformed state or generation change fail closed.

## Adapter, engine and display

The shared live cross-check requires all six original occupied seats, the same
dealer/positions, source/DOM cards and numeric ordinary stacks. Only original
UTG may be folded; hero must be the sole current actor. Existing conservative
source stacks >=202 chips and usable DOM stacks >=200 remain required for all
six seats. No all-in, offline, settlement or read ambiguity is accepted.

Boundary contributions remain SB=1, BB=2, others=0 through both accepted
patches. They independently establish hero's two-chip call gap, cross-checked
against readable DOM contributions. Missing nonblind DOM amounts use only this
source-bound zero; generic monetary rules are unchanged. No sequential blind
events are invented. The preflop context contains exactly the source UTG fold,
six original positions and four active opponents.

Log rows cannot issue this proof. Known normal blind rows and the same UTG fold
can corroborate it; contradictory actions, unknown rows, extra posts and other
folds block the live cross-check. Missing log coverage never becomes complete.

The unchanged HJ chart chooses FOLD outside its reference. A chart-included hand
remains blocked by absent HJ sizing permission, with an additional policy guard
against substituting FOLD or borrowing generic sizing labels. Original hand168
QQ therefore does NOT activate. No pot EV, equity or raise sizing is demanded
for a legitimate chart FOLD.

The existing context -> scoped proof -> packet -> policy -> epoch -> immediate
overlay path consumes this proof. The existing countdown/expiry timer chooses
the active supported source proof's deadline. It never renews from polling,
control edits or explanations. Expiry removes actionable advice and shows
EVIDENCE EXPIRED. Source/DOM changes and late responses retain existing guards.

## Regression evidence

Two sanitized source fixtures preserve numeric values/order/timestamps and
original hero cards. Earlier frames retain the reducer's needed source fields;
the final fold/turn payloads retain their complete raw shape. Identities/table
IDs are replaced. Raw local evidence is not committed.

The integration harness feeds envelopes through MAIN, source runtime, live
cross-check, actual policy and content-script rendering. Policy decisions and
proofs are not mocked. The synchronous DOM cross-check uses the existing reader
result shape with source-consistent values; it is explicitly simulated, not a
claimed capture of hand150/168 DOM. Original hand150 86o produces FOLD; original
hand168 QQ remains blocked. Synthetic 72o variants are labeled as such.

Tests cover frozen positions, forced-boundary contributions, pending evidence,
late HJ activation, expiry, unknown mutations, missing/replayed/skipped updates,
reconnect/bootstrap failures, incorrect actors, roster/profile/dealer changes,
limps/raises/all-ins/extra posts, log contradictions, provider failures and stale
responses. Existing UTG tests run unchanged. Validation totals are recorded
after the full suite below.

Validation: 55 new regressions (39 live integration, 16 source tests). Final
focused runs passed 167 browser-reader/source/display tests and 49 preflop
policy tests. The full suite passed 1,824 tests in 84 files. Workspace
typecheck, full build, explicit extension rebuild and diff check passed.
An initial full run hit the pre-existing 15-second relay-start timeout; the
isolated relay test and subsequent full run passed without changing that test
or its timeout. No live HJ result is claimed by these automated replays.

## One live check

Reload the unpacked extension, refresh PokerNow so MAIN and content scripts
restart before the next boundary, and start the rebuilt relay with
`npm run dev:relay`. Observe one naturally occurring supported six-player deep
1/2 no-ante hand with hero HJ and an out-of-chart hand. Let UTG act normally.
If UTG folds in the supported source sequence, verify FOLD appears before any
explanation, the position remains HJ, and the countdown uses the HJ activation
time. Save one diagnostic while fresh: hjProof should identify the original
UTG fold and current HJ actor, while historyComplete remains false. If the
decision remains pending for ten seconds, actionable advice must expire. No
specific poker action or submitted wager is required for this display check.
