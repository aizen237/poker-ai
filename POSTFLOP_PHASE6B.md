# Phase 6B: recorded hand239 flop transition and hero activation

Audited and implemented from `78854de` on 2026-10-24. `git fetch origin`
confirmed that the local `main` HEAD already contains the remote history.

**The existing source authority, with the narrow extensions below, certifies
this recorded preflop-to-flop transition and a separate fresh source hero
activation. It does not certify an actionable live postflop decision.** Live
postflop recommendations remain disabled. No provider call, live capture,
outgoing poker action or speculative strategy was used.

## Evidence and identity audit

Read `POSTFLOP_PHASE6A.md`, the existing projector/reducer, dependent betting
windows, timeline, decision-proof adapters and replay/display tests. Inspected
the original JSON and both screenshots locally. The actual screenshot filenames
have a second `.png` extension; neither was renamed or modified.

| Local evidence (not committed) | SHA-256 |
| --- | --- |
| `evidence/flop-hand-239-raw.json` | `591a389fa180f6e8891834d82f323c57952d1a797181889854da0d231b2be5eb` |
| `evidence/flop-hand-239-board.png.png` | `bfc182201f8b2a7dea3719a0e086be4064d1da1dc7f355fcfec53df7863e6425` |
| `evidence/flop-hand-239-hero.png.png` | `2d8085ea9c237c892dbd701b2c57fbe2004bc246c15954a24c8ffdcef72dc504` |

The file has exactly 20 frames: registration followed by 19 `gC` patches,
local sequences 1 through 20, all connection generation 1. Every patch's `pre`
equals the preceding state's `now`; each `now` and each local receipt increases.
There are no duplicate JSON keys or integers outside the exact safe-integer
range. Recorder status reports registration captured, zero rejected frames,
10,539 retained source characters, 9,424 retained JSON characters, and an
export/manual stop, below the 500-frame / 4,194,304-character limits. Its final
receipt agrees with frame20. These recorder flags do not establish log coverage
or delivery beyond the recorded prefix.

Registration supplies the table ID, registered hero at seat1, normal no-ante
1/2 play-money Hold'em profile (`0.1.72`, `th`, `4fun`), seats, players and
settled hand238. Frames2-3 patch seat2's `disconnectedSince`, ending with its
explicit deletion. That player's transient status is distinct from the
observer's socket generation: there is no observer reconnect in this recording.
At frame4, both the hand ID and number advance to a fresh hand239; the original
roster, dealer/blinds, two private hero cards and forced posts are validated
using the existing first-UTG boundary. No other hand238 recording is spliced in.

The sanitized fixture uses seat-based player aliases. Original source IDs are
matched consistently in every dictionary, array, actor, dealer/blind field and
registration. The following mapping is frozen at frame4; BTN's later fold does
not relabel anyone:

| Alias / original seat | Original position | Ordinary source stack at boundary | Forced contribution |
| --- | --- | ---: | ---: |
| `PLAYER_1` / 1 (registered hero) | UTG | 261 | 0 |
| `PLAYER_2` / 2 | HJ | 240 | 0 |
| `PLAYER_3` / 3 | CO | 244 | 0 |
| `PLAYER_5` / 5 | BTN / dealer | 253 | 0 |
| `PLAYER_9` / 9 | SB | 244 | 1 |
| `PLAYER_10` / 10 | BB | 260 | 2 |

Hero's new cards are `3s Js`; registration's old hand238 cards are replaced.
Opponent card values remain masked in the production projection. New-hand
`iHPI` and `pC` contain the same six original players.

## Complete frame audit

Source cursors below are linkage tokens, not decision wall clocks. Local
receipt times remain exactly as captured in the fixture; none was synthesized.
Contribution descriptions refer to observed `tB` totals, not CALL legality.

| Frame | `now` | Observed update |
| ---: | ---: | --- |
| 1 | 1792829620435 | Registration in settled hand238, `gT=[1,5]`, no active actor; old five-card board only |
| 2 | 1792829727709 | Seat2 disconnected timestamp update; no hand/action inference |
| 3 | 1792829740843 | Seat2 disconnected timestamp explicitly removed |
| 4 | 1792829745898 | Fresh hand239, `gT=[1,0]`, empty board, SB1/BB2, explicit UTG hero activation |
| 5 | 1792829753671 | UTG contribution 0 -> 2; `pITT=null` |
| 6 | 1792829754494 | Explicit HJ activation |
| 7 | 1792829758647 | HJ contribution 0 -> 2; `pITT=null` |
| 8 | 1792829759462 | Explicit CO activation |
| 9 | 1792829764357 | CO contribution 0 -> 2; `pITT=null` |
| 10 | 1792829765240 | Explicit BTN activation |
| 11 | 1792829766772 | BTN explicitly folds; `pITT=null` |
| 12 | 1792829767641 | Explicit SB activation |
| 13 | 1792829775424 | SB contribution 1 -> 2; `pITT=null` |
| 14 | 1792829776245 | Explicit BB activation |
| 15 | 1792829781425 | `bigBlindCheck=true`, unchanged BB2, `wBACPI=[]`, `pITT=null` |
| 16 | 1792829782249 | Flop transition/reset and explicit SB activation, described below |
| 17 | 1792829801650 | SB contribution 0 -> 2; `cHB=2`, `mR=4`, `cRPI=[SB]`, `pITT=null` |
| 18 | 1792829802462 | Explicit BB activation; SB2 remains |
| 19 | 1792829807205 | BB contribution 0 -> 2; `cRPI=[SB,BB]`, `pITT=null` |
| 20 | 1792829808066 | Explicit registered UTG hero activation; SB2/BB2 remain, hero0 |

Frame16 is a single coalesced deal/reset/SB-activation message, not an assumed
separate deal followed by an invented activation. It has:

- `gT: [1,0] -> [1,1]`, `oTC["1"]: [] -> [8d,Jh,Ts]` in that exact order.
  Three distinct cards are disjoint from hero's cards; one board only.
- Five explicit `tB` deletion markers for SB, BB, UTG, HJ and CO. Their previous
  totals are all 2; BTN has no contribution entry. The carried map becomes empty.
- `cHB: 2 -> 0`, `mR: 4 -> 2`, `cRPI: [...] -> []`,
  `bigBlindCheck: true -> false`. The abbreviated fields are observed
  discriminators; they establish no general minimum-raise or reopening rule.
- Explicit ordinary source stacks UTG259/HJ238/CO242/SB242/BB258, each two less
  than its boundary value; folded BTN remains253. Source `pot=10` is an observed
  display/accounting field, not a contestable-pot certificate.
- `cPI=pITT=SB`, `pASA=now`, `mAVTB=242`, `sNA=sNAA=null`.
- `pC` descriptions with **no `cards` members**. They neither replace nor remove
  the previously dealt private cards. This is the specific projector gap fixed
  here; unrestricted partial-card merging is not added.

Frames17-20 leave this ordered board, original roster, hand and street unchanged.
The two observed flop contributions are separately linked to their previously
activated actors. Frame20 explicitly has `cPI=pITT=registered hero`, `pASA=now`,
`mAVTB=259`, `sNA=sNAA=null`. No later source envelope, hero response, turn or
river is present.

## Screenshot comparison and time limits

Both images show `8d Jh Ts`, hero `3s Js`, dealer at the folded BTN, and the same
table URL/player arrangement. The board image shows main pot10, hero259,
HJ238/CO242/BTN253 and visible SB242/BB258, consistent with the post-collection
source state. Hero's active controls are not established there. The hero image
shows the same board/cards, hero highlight and visible `CALL 2`, main pot10 plus
total14, hero259 and visible SB240/BB256. Those last two displays are consistent
with two outstanding contributions of2; raw ordinary stack fields still carry
242/258 because frames17 and19 have no stack patches. This agreement is not a
general stack-deduction or pot-accounting contract.

The overlay obscures parts of both images and still says it is waiting for hero.
Visible buttons/highlights do not supply DOM visibility/enabled attributes,
complete controls or a legal action set. Console log timestamps and the desktop
clock are not screenshot observation receipts. Neither image has a captured
before/after `Date.now()` / recorder-status pair. They cannot be assigned an
authoritative frame or prove that the UI was read within ten seconds of frame20.
No screenshot timestamp is manufactured from source tokens, file dates, console
text or visual similarity.

The **source** opportunities use only their existing local receipt clock:

| Opportunity | Receipt | Exclusive expiry (receipt + 10,000 ms) |
| --- | ---: | ---: |
| Frame16 flop/SB activation | 1792829779949 | 1792829789949 |
| Frame20 hero activation | 1792829805759 | 1792829815759 |

Frame17 arrives 19,402 ms after frame16. Historical observations can continue
after an earlier opportunity expires; they do not renew it. Only the separately
observed frame20 activation starts the hero's window. A current replay of this
old file is not a live opportunity: tests explicitly replay its receipt clock.

## Production scope and remaining exclusions

`eventSource -> projectFirstUtgSource -> createFirstUtgSource -> advanceUtgState`
remains the sole identity/state/continuity authority. No new reducer, source
bootstrap, timer, action-history ingestion or decision adapter is added.

The projector permits description-only `pC` exclusively inside the closed
recorded flop-deal shape. It emits an empty card patch so the existing reducer
retains the dealt cards. Nonhero descriptions must be null. Existing full-card
projection and opponent filtering remain intact. The raw closed shape is
retained separately and must agree with every projected member.

`advanceFlopWindow` follows the existing dependent-window design. It anchors to
the validated first-UTG six-player no-ante 1/2 profile and recognizes only this
ordered contribution/fold/check/deal/contribution/activation pattern. Existing
fold/activation shape recognition is reused. The raw boundary's `mR=4` and
`cHB=2` must also be retained and match; the new observer cannot certify a reset
from contradictory or missing starting discriminators. Arrays remain ordered, dictionary
member order is immaterial, unknown mutations cannot disappear through
projection, and all original players/cards/stacks are checked against the
carried state. It emits `flop_transition` at frame16 and
`flop_hero_activation` at frame20. The latter includes the transition and both
observed flop contributions. Its witness retains the original roster and
boundary stacks; current observed totals/stacks are separate fields.

`sourceStatus.flopObservationProof` exposes these observations. Every proof
has `historyComplete=false`, `liveRecommendationsAllowed=false`, and null legal
actions, payable-call and contestable-pot facts. The live decision adapters do
not consume it. The existing DOM arithmetic can still calculate a numeric gap;
this change supplies no CALL legality certificate from that gap or `CALL 2`.

Subsequent source updates (including empty/unknown updates), invalid/missing
projections, stale/replayed/local sequence/predecessor errors, identity/actor
contradictions, disconnect/reset/reconnect and receipt regression retain their
invalidation behavior. Pending recognition cannot cross unsupported messages.
Proof reads bind the latest cursor, hand and generation, reject times before
activation, and expire at the original ten-second boundary. Polling, log
refresh and model results cannot renew them. Existing preflop expiry and
invalidation logic is unchanged.

Still unproven: authoritative screenshot/UI timing, a live source/DOM binding,
the hero's subsequent response, generic postflop action grammar or other
positions/opportunities, turn/river growth, repeated hero opportunities,
all-ins/runouts/multiple boards, bet/raise bounds or rights, payable CALL,
returns/rake/side pots/eligibility/contestable pot, exhaustive logs or complete
history, and an independently supported postflop strategy/model. The recording
ends at frame20, so post-activation invalidation tests necessarily use labeled
synthetic tails. It proves no next actual update or accepted hero action.

## Fixture and validation

`pokernow-flop-239.json` is a sanitized fixture of all 20 envelopes. Only table,
hand, player IDs and player names were substituted bijectively. Reversing those
substitutions reproduced the parsed original exactly; values, ordering, absent
members, nulls, deletion markers, cards, times and generation were preserved.
Original JSON/screenshot evidence and `.agents/` are excluded from the commit.

Focused tests cover the positive boundary, flop/reset, all intervening steps,
fresh hero activation and exact expiry. Negative replays omit every individual
frame, inject unknown fields at every dependent step, mutate identities,
actors/contributions/reset/stacks/boards/profile/continuity, introduce projection
contradictions and test reset/expiry/no-renewal. MAIN-to-overlay replay uses
explicitly simulated DOM controls and verifies no recommendation, provider
request, outgoing poker action, history promotion or CALL legality. This
simulation does not upgrade screenshot evidence.

| Check | Result |
| --- | --- |
| Five targeted source/window/bridge/expiry suites | 361 passed, including 102 new Phase 6B cases |
| Final `npm.cmd test -- -- --maxWorkers=1` | **3,043 passed across 104 files** |
| Optional Python PHH replay suite in existing `.data/phase5d-venv` | 14 passed |
| `npm.cmd run typecheck` | Passed across all workspaces/apps |
| `npm.cmd run build` | Passed |
| `npm.cmd run build:extension` | Passed; both tracked generated bundles updated |
| Working/staged `git diff --check` | Passed |
| Fixture reverse-substitution and raw evidence hash recheck | Passed; originals unchanged |

Full-suite totals: AI-core 491, browser-reader 2,084, opponent-db 41,
poker-engine 101, range-engine 317, shared 9. The final run used unchanged
production/test code and exited zero; every workspace received `--maxWorkers=1`.

The first integration assertion incorrectly treated the existing DOM numeric
call-gap scope as CALL legality; the test now checks the actual legality gate
and the new source certificate's null facts. An early full run overlapped the
last boundary-discriminator edit and loaded an older transform with two newer
negative tests; it is excluded from final validation and superseded by the
unchanged-code run above. No timeout or invalidation rules were weakened. The
system Python lacked the optional `pokerkit` dependency; the existing project
virtual environment ran all 14 optional tests successfully, without installing
anything. PowerShell labels normal esbuild stderr progress `NativeCommandError`
in redirected logs; both builds exited zero with successful bundles.
