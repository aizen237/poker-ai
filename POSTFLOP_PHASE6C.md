# Phase 6C: hand243 historical flop CALL2 and next-player activation

Implemented from HEAD `268035e7a5b3ffed6e279d858c02c1ac859c3c85` on
2026-10-24, after inspecting `POSTFLOP_PHASE6B.md`, the original JSON/image,
source projector/reducer, dependent flop/betting observers and legality gates.

**Yes: this recording independently certifies the narrow historical HJ hero
CALL2 at frame21, followed by explicit CO activation at frame22.** It uses
hand243's own registration, hand boundary and complete supported prefix; no
hand239 or hand238 state is spliced in. This is source-observed acceptance,
not proof of a particular button click, future permission or recommended play.
Live postflop advice remains disabled; no poker action was automated.

## Evidence integrity and identity

The actual image filename has a second `.png` suffix. Originals were only read
and are excluded from the commit.

| Local evidence | SHA-256 |
| --- | --- |
| `evidence/flop-hand-243-raw.json` | `d6079e294273287ec04f088653c8b32434b608ecce3098105918c4d1d96e5270` |
| `evidence/flop-hand-243-before.png.png` | `e9c8ce8dd0c80c7297c2b34b55993a665a6e2d267344550e9b62e4f41e6592be` |

There are 22 envelopes: registration and 21 `gC` patches, local sequences
1–22 in generation1. Every `pre` matches the preceding state's `now`; source
cursors and local receipts strictly increase. Duplicate-key and exact-safe-
integer checks pass. Recorder metadata reports registration captured, zero
rejected frames, 11,091 source / 9,958 JSON retained characters, and manual
stop/export below the 500-frame / 4,194,304-character limits. Its last receipt
matches frame22. These flags do not prove whole-hand history or log coverage.

Registration is settled hand242 with registered hero at seat1. Frame2 advances
both hand ID and number to243. The existing first-UTG boundary validator freezes
the six-player roster/positions, forced posts, profile and new private cards.
Hero is **HJ**, not UTG as in hand239. Source hero card order is `9d Qc`.

| Alias / seat | Original position | Boundary ordinary stack | Forced contribution | Flop ordinary stack |
| --- | --- | ---: | ---: | ---: |
| `PLAYER_1` / 1, registered hero | HJ | 256 | 0 | 254 |
| `PLAYER_2` / 2 | CO | 235 | 0 | 233 |
| `PLAYER_3` / 3 | BTN / dealer | 240 | 0 | 238 |
| `PLAYER_5` / 5 | SB | 255 | 1 | 253 |
| `PLAYER_9` / 9 | BB | 248 | 2 | 246 |
| `PLAYER_10` / 10 | UTG | 268 | 0 | 266 |

All six remain in game. The normal no-ante 1/2 play-money Hold'em profile is
`0.1.72`, `th`, `4fun`. Registration explicitly has `mR=4,cHB=2`; frame2
leaves both absent, so the historical anchor accepts this carry only from the
immediately preceding registration. Partial/malformed/contradictory overrides
cannot disappear as absent values. This does not decode general betting bounds.

## Recorded sequence and action semantics

| Frame | Source `now` | Observed update |
| ---: | ---: | --- |
| 1 | 1792832901686 | Settled hand242 registration, no active actor |
| 2 | 1792832930671 | Fresh hand243, empty board, SB1/BB2, explicit UTG activation |
| 3 | 1792832935373 | UTG total0→2; turn released |
| 4 | 1792832936247 | HJ hero activation |
| 5 | 1792832937663 | HJ total0→2; turn released |
| 6 | 1792832938470 | CO activation |
| 7 | 1792832939033 | CO total0→2; turn released |
| 8 | 1792832939850 | BTN activation |
| 9 | 1792832942486 | BTN total0→2; turn released |
| 10 | 1792832943337 | SB activation |
| 11 | 1792832943630 | SB total1→2; turn released |
| 12 | 1792832944488 | BB activation |
| 13 | 1792832949957 | Explicit `bigBlindCheck=true`, unchanged BB2, `wBACPI=[]`, turn released |
| 14 | 1792832950886 | Flop `6h Qh 3s`, six contribution deletions, stacks collected, SB activation |
| 15 | 1792832955080 | SB total0→2, `cHB=2,mR=4`, turn released |
| 16 | 1792832955895 | BB activation |
| 17 | 1792832957986 | BB total0→2; turn released |
| 18 | 1792832958895 | UTG activation |
| 19 | 1792832959600 | UTG total0→2; turn released |
| 20 | 1792832960494 | Registered HJ hero activation, hero contribution absent/zero |
| 21 | 1792832973510 | HJ hero total0→2 matches highest2; accepted CALL2, turn released |
| 22 | 1792832974352 | Explicit CO activation with contributions unchanged |

Frame14 coalesces deal/reset/activation in one message. It changes `gT` from
`[1,0]` to `[1,1]`, supplies exactly one three-card board disjoint from hero,
deletes all six prior totals2 using `<D>`, and patches all six ordinary stacks
down by2. It resets `cHB=0,mR=2,cRPI=[],bigBlindCheck=false`, displays `pot=12`,
and explicitly activates SB. Description-only `pC` retains private cards using
the Phase6B projector behavior; opponent card values remain masked.

The CALL classification uses the entire validated prefix, not `cRPI` alone:

- Frame20 explicitly has `cPI=pITT=registered hero`, `pASA=now`,
  `mAVTB=254`, `sNA=sNAA=null`. Hero's prior flop contribution is zero;
  SB/BB/UTG each have2. Original position remains HJ.
- Frame21's only contribution mutation is hero2. It has empty `pGS`, unchanged
  board/roster/street/ordinary stacks, no highest-wager or raise-bound mutation,
  `sNA=NSAA,pITT=null,wBACPI=[]`, and the ordered responder list SB/BB/UTG/HJ.
  The closed patches after SB's bet cannot change its `cHB=2,mR=4` values.
  Hero invests2 to match highest2, with zero raise increment and ample observed
  ordinary capacity. No fold, check, partial call, raise or all-in shape passes.
- Frame22 immediately links to frame21 and explicitly has `cPI=pITT=CO`,
  `pASA=now,mAVTB=233,sNA=sNAA=null`. Totals remain SB2/BB2/UTG2/HJ2,
  CO0/BTN0. It does not certify CO's response or any CO legal action.

The new contract is `hand243_hj_flop_call2_v1`. It requires the exact recorded
stack vector, HJ hero, source card order `9d Qc`, board order `6h Qh 3s`,
six-player all-participating prefix and closed raw mutation shapes. IDs remain
relational, not literal raw IDs. It supplies no permission across other stacks,
positions, cards, boards or situations. Existing preflop legality contracts are
unchanged and cannot be substituted for this historical postflop observation.

## Timing and UI correspondence

| Event | Local receipt | Relation to original hero deadline |
| --- | ---: | --- |
| Frame20 hero activation | 1792832960591 | Exclusive expiry = **1792832970591** |
| Frame21 acceptance | 1792832973609 | 13,018 ms after activation; 3,018 ms after expiry |
| Frame22 CO activation | 1792832974441 | 832 ms after acceptance |

The ten-second hero observation expires at its original deadline. Frame21
does not extend, revive or recreate it. Only historical pending recognition
survives elapsed time; any unsupported intervening message or continuity error
destroys it. Frame22 issues no new decision proof. Source `now/pre/pASA/sN`
are linkage/profile values, not substitute wall clocks.

The image shows ordered board `6h Qh 3s`, hero `9d Qc`, hero highlight and
visible `CALL 2`, dealer at original BTN, main pot12 / total18, hero254,
CO233, BTN238 and SB251. Visible BB244/UTG264 are partly under the overlay.
These displays agree with six preflop contributions and the three outstanding
flop contributions before hero responds. Raw ordinary stacks remain
SB253/BB246/UTG266; frames15/17/19 contain no ordinary-stack patch. The display
agreement does not establish a general stack deduction or pot contract.

The screenshot has no paired recorder-status / before-and-after local receipt,
complete unobscured controls, or captured enabled/visibility DOM attributes.
It cannot be authoritatively assigned to frame20 or to its ten-second window.
File timestamps, desktop time and console text are not invented UI receipts.
There is no after-action screenshot, captured click or request-correlated acknowledgment;
accepted action and CO activation come from the source sequence itself.

## Implementation boundaries and remaining blockers

`eventSource -> projectFirstUtgSource -> createFirstUtgSource -> advanceUtgState`
remains the sole state/identity/continuity authority. `advanceFlopWindow` reuses
its existing ordered-step, raw-shape and carried-state checks with a separate
hand243 profile. No second reducer, timer, bootstrap or decision adapter is added.

`flopProof()` exposes only the existing short-lived transition/hero observations.
`flopAcceptanceProof()` exposes the historical result at frame21, with
`nextActivation=null`, and the linked CO activation at frame22. The timeline
publishes it separately as `sourceStatus.historicalFlopAcceptance`. It retains
the original anchor witness, transition, observations, raw accepted action,
latest validated continuity and `originalHeroExpiresAt`; it has **no new
`expiresAt`**. Reads are defensive copies, reject clocks before the latest
observation and bind the latest cursor/sequence/hand/generation. Historical
results remain readable with elapsed time, but any next source update clears
them unless it is the supported frame22 continuation. Disconnect/reset,
reconnect, gaps, replay, invalid projection and receipt regression still fail
closed. Pending recognition cannot resume after an unsupported message.

Both proof types keep `historyComplete=false`, `liveRecommendationsAllowed=false`
and null payable-call, legal-action and contestable-pot facts. Historical CALL2
describes accepted investment; it is not a current payable-CALL certificate.
No action-history promotion, recommendation/provider request or outgoing poker
action is added. Log refresh, UI polling and stale CALL controls cannot renew
the original opportunity or consume the historical result as live advice.

Remaining blockers: authoritative UI/source timing and binding; complete enabled
controls; general postflop action grammar, legal action sets and sizing/reopening
rights; exact future payable calls; complete ordered history; contestable pots,
side pots, eligibility, returns/rake and settlement; other stack/position/board
profiles, repeated opportunities, turn/river, all-ins and runouts; independently
supported postflop strategy/model. The recording ends at CO activation and says
nothing about the next actual action or later delivery.

## Replay and validation

`pokernow-flop-243.json` preserves all 22 envelopes and capture metadata. Only
table/hand/player IDs and player names are substituted bijectively with stable
seat aliases. Reverse substitution exactly reproduces the parsed original;
cards, ordering, omitted fields, deletion markers, nulls, receipts and generation
are unmodified. Raw evidence and pre-existing `.agents/` are excluded.

Focused tests cover the real accepted action and next actor, exact expiry before
acceptance, no renewed opportunity, missing frames, unknown/raw/projected
contradictions, actor/amount/status/capacity/profile mutations, cRPI-only evidence,
consistently changed stack vectors, inserted cursor-linked empty updates,
disconnect/reset/reconnect, and defensive copies. MAIN-to-overlay tests reuse
explicitly simulated matching DOM/controls, including stale hero controls after
the actual source action; they certify no recovered screenshot timing.

| Check | Result |
| --- | --- |
| Seven targeted source/window/bridge/freshness/legality suites | 546 passed |
| `npm.cmd test -- -- --maxWorkers=1` | **3,154 passed across 105 files** |
| Optional Python replay suite in existing `.data/phase5d-venv` | 14 passed |
| `npm.cmd run typecheck` | Passed across all workspaces/apps |
| `npm.cmd run build` | Passed |
| `npm.cmd run build:extension` | Passed; both tracked generated bundles updated |
| Working/staged `git diff --check` | Passed |
| Fixture substitution and original evidence hash recheck | Passed; originals unchanged |

Full-suite totals: AI-core 491, browser-reader 2,195, opponent-db 41,
poker-engine 101, range-engine 317, shared 9. This adds 110 focused historical
replay cases and one hand243 MAIN-to-overlay case. The full run used final,
unchanged production/test code and exited zero.

An initial cold targeted run hit the existing five-second integration-test
timeout; subsequent targeted and full runs passed with that timeout unchanged.
An intermediate typecheck caught `Object.values` yielding `unknown` for a
maximum calculation; the final implementation reads numbers through the already
validated roster. No production deadline or invalidation rule was weakened.
PowerShell labels redirected esbuild stderr progress `NativeCommandError`;
both builds exited zero and produced successful bundles.
