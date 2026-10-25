# Phase 6H: hand248 bounded flop opportunity certification

Implemented from HEAD `4ed5834` on 2026-10-25 after reviewing Phase6B–6G,
the saved Phase6G export, source projector/reducer, dependent flop observer,
contribution accounting, decision proofs, capture/epoch infrastructure and
production MAIN-to-overlay tests. `git fetch origin` found HEAD 29 commits
ahead and zero behind `origin/main`.

**This new recorded CO profile supports a source-certified flop transition,
fresh hero activation, bounded gross contribution accounting, and historical
matching CALL2 followed by BTN activation.** The real diagnostic pair corroborates
local source/UI timing and an enabled CALL2 observation. It supplies no live
permission, general CALL contract, complete betting history, contestable pot or
strategy authority. Live postflop recommendations remain blocked.

## Evidence integrity and original identities

Local evidence: `evidence/postflop-observation-paired-2.json`, SHA-256
`31a6acde747a4e288fdad20af430828e4688e9669b69fc6c71b1cd02689cafcd`.
The earlier file without `-2` is hand246's failed size-bound capture, not this
hand. Neither raw file is committed or modified.

Independent parsing found no duplicate keys or unsafe integer tokens. All 32
envelopes are retained: registration followed by 31 `gC` updates, sequences1–32,
generation1, strictly increasing source cursors and raw local receipt times.
Every patch's `pre` equals its predecessor's `now`. The exported recorder reports
registration captured, zero rejected frames, 11,975 retained JSON characters /
13,198 source characters, manual/export stop and no limit hit (500 frames /
4,194,304 characters). Final recorder receipt/cursor agree with frame32.
The outer capture reports one checkpoint, zero refusals, 19,960 retained bytes,
and export at1792933826881. These are recorded original counters, not sizes of
the sanitized fixtures. They establish neither exhaustive delivery nor log coverage.

Registration is **mid-hand247 on the turn**, not a settled hand or the new
hand's opening. Frames2–8 observe prior-hand BB/UTG/HJ/CO folds with intervening activations;
frame9 settles that prior hand and patches hero's ordinary stack from284 to308.
No hand247 pot entitlement or complete history is certified. The existing state
authority carries the explicitly observed stack into frame10, where hand ID and
number both advance to248, the board is explicitly empty, private cards are
replaced, and the six-player no-ante 1/2 `0.1.72`/`th`/`4fun` boundary validates.
No state from hands239,243 or246 is spliced into this recording.

IDs and names are substituted bijectively using original seat aliases in both
fixtures, including embedded diagnostic strings. Reversing the substitutions
reproduces the parsed source export and full checkpoint exactly. Arrays, numeric
values, omissions, nulls, deletion tokens, receipts and generations are unchanged.

| Alias / seat | Frozen position | Ordinary stack at hand248 boundary | Forced contribution | Explicit flop collection stack |
| --- | --- | ---: | ---: | ---: |
| PLAYER_2 / 2 | BTN/dealer | 230 | 0 | 228 |
| PLAYER_3 / 3 | SB | 230 | 1 | 228 |
| PLAYER_5 / 5 | BB | 243 | 2 | 241 |
| PLAYER_9 / 9 | UTG | 236 | 0 | 234 |
| PLAYER_10 / 10 | HJ | 255 | 0 | 253 |
| PLAYER_1 / 1, registered hero | CO | 308 | 0 | 306 |

All six remain in game through frame32. Hero's source card order is `2s 7s`;
opponent cards stay masked by the existing production projector.

## Source sequence and original raw receipts

These receipt times come from the raw recorder; source `now/pre/pASA/sN` remain
linkage/profile values, never replacement decision clocks.

| Frame | Raw local receipt | Source `now` | Observed update |
| ---: | ---: | ---: | --- |
| 1 | 1792933742223 | 1792933737652 | Mid-hand247 registration, turn street |
| 2 | 1792933755708 | 1792933756110 | Prior-hand BB (seat3) fold, turn released |
| 3 | 1792933756530 | 1792933756939 | Prior-hand UTG (seat5) activation |
| 4 | 1792933757019 | 1792933757421 | Prior-hand UTG fold |
| 5 | 1792933757848 | 1792933758258 | Prior-hand HJ (seat9) activation |
| 6 | 1792933760642 | 1792933761046 | Prior-hand HJ fold |
| 7 | 1792933761439 | 1792933761852 | Prior-hand CO (seat10) activation |
| 8 | 1792933763121 | 1792933763527 | Prior-hand CO fold |
| 9 | 1792933763947 | 1792933764349 | Prior-hand settlement; hero stack308 |
| 10 | 1792933771816 | 1792933772201 | Fresh hand248, SB1/BB2, UTG activation |
| 11 | 1792933781378 | 1792933781781 | UTG total0→2, turn released |
| 12 | 1792933782176 | 1792933782590 | HJ activation |
| 13 | 1792933782548 | 1792933782954 | HJ total0→2 |
| 14 | 1792933783344 | 1792933783761 | CO hero preflop activation |
| 15 | 1792933784424 | 1792933784830 | CO total0→2 |
| 16 | 1792933785261 | 1792933785676 | BTN activation, explicit `mAVTB=230` |
| 17 | 1792933785584 | 1792933785988 | BTN total0→2 |
| 18 | 1792933786459 | 1792933786876 | SB activation; `mAVTB` absent |
| 19 | 1792933789823 | 1792933790229 | SB total1→2 |
| 20 | 1792933790665 | 1792933791080 | BB activation |
| 21 | 1792933793494 | 1792933793895 | Explicit BB check, unchanged BB2, turn released |
| 22 | 1792933794299 | 1792933794703 | Flop3s/7d/2d, reset/collection and SB activation |
| 23 | 1792933796739 | 1792933797141 | SB total0→2; `cHB=2,mR=4` |
| 24 | 1792933797551 | 1792933797968 | BB activation |
| 25 | 1792933798924 | 1792933799326 | BB total0→2 |
| 26 | 1792933799766 | 1792933800180 | UTG activation |
| 27 | 1792933812473 | 1792933812879 | UTG total0→2 |
| 28 | 1792933813271 | 1792933813688 | HJ activation |
| 29 | 1792933813477 | 1792933813880 | HJ total0→2 |
| 30 | 1792933814275 | 1792933814692 | CO hero flop activation, `mAVTB=306` |
| 31 | 1792933825203 | 1792933825612 | CO total0→2, highest remains2, turn released |
| 32 | 1792933826019 | 1792933826437 | BTN activation, unchanged contributions |

Frame18 explicitly supplies `cPI=pITT=SB`, `pASA=now`, `sNA=sNAA=null`.
Its omitted capacity is not filled from frame16's other actor. The new closed
shape is accepted only at this profile's preflop SB step, with the same roster,
stack, prior actor release and contribution checks. Present contradictory/null
capacity or an omission at another step fails. `hjPatchKind` and existing
preflop permission recognizers are unchanged.

Frame22 is one coalesced deal/reset/SB-activation message. It changes
`gT=[1,0]→[1,1]`, supplies the ordered three-card board disjoint from hero,
explicitly deletes all six previous totals2, and patches every ordinary stack
down by2. It resets `cHB=0,mR=2,cRPI=[],bigBlindCheck=false`, observes `pot=12`,
and carries descriptions without card members. The already supported projector
shape preserves dealt cards; no new card merge or reducer is introduced.

## Full paired checkpoint and its limits

The outer record has `observationPaired=true,reasons=[]`; both raw-recorder
brackets are identical, active, registered, zero-rejection snapshots at frame30.
Frames31/32 were recorded later and are not part of the paired source head.

| Recorded event | Local time |
| --- | ---: |
| Raw frame30 receipt | 1792933814275 |
| Source metadata/overlay receipt retained in both source brackets | 1792933814283 |
| Outer checkpoint request | 1792933815900 |
| Isolated observation begins | 1792933815901 |
| Native CALL observation | 1792933815904 |
| Isolated observation completes | 1792933815907 |
| Outer reply completes | 1792933815913 |

The request is1,625ms after the raw receipt; the outer operation takes13ms.
The source bracket receipt is8ms later than the raw recorder's receipt. Existing
`eventSource` code observes raw traffic before it constructs the source-metadata
message and takes that separate `Date.now()` reading. These clocks are preserved
as distinct observations, not silently made equal. No per-frame offset is
invented for the other envelopes.

Both source brackets match exactly: hand248, registered seat1 hero, actor hero,
flop, ordered board, cursor1792933814692, sequence30, generation1, continuous
metadata with29 linked updates and no coverage issues. Both epoch brackets are
`decisionEpoch="30",stateAvailable=true,matchesRead=true`, with
`epochStatus="observed_matching"`. The original internal `stateJson` was
deliberately not exported by the Phase6G payload repair; its exact original
string cannot be recovered. Replay recomputes a test fingerprint using current
production code and does not claim to recover that old string or create a live epoch.

The full synchronous read preserves all ten seat slots, seat/stack evidence,
hero cards, dealer seat2, blinds1/2, board, main12/total20 display, Raise reader,
and CALL reader. Occupied UI stacks are CO306/BTN228/SB226/BB239/UTG232/HJ251;
four explicit bets are2 each. Hero and BTN bet values are **null**, not observed
zeros. They agree with zero only after the independent source reset/prefix is
validated. The original pair correctly retains limitations saying contribution
comparison is unavailable at seats1/2 and that no certified profile/deadline
existed at capture time. Its `profile="unsupported_or_uncertified"` and
`sourceVerifiedFacts=null` are left unchanged in the saved fixture.

CALL is a single visible enabled `BUTTON`, `type="button"`, exact text
`Call 2`, amount2, no issues/contradictions, and
`serverAuthorization="unproven"`. Raise form/submit are not visible and their
amount/enabled fields are unavailable. This is not an exhaustive native legal
action set or a captured click/response acknowledgment. The same-page bridge
remains unauthenticated diagnostic transport. No independent server permission
follows from matching UI, epoch and source observations.

## Newly certified production facts and deadlines

The authority is still
`eventSource → projectFirstUtgSource → createFirstUtgSource → advanceUtgState`.
The existing `advanceFlopWindow` gains a separately bounded hand248 profile;
there is no second reducer, bootstrap, timer, action-history importer or
permission adapter. The new profile requires original CO hero, source card
order `2s 7s`, ordered board `3s 7d 2d`, the exact stack vector above, normal
six-player profile and the entire supported sequence. IDs, hand numbers and
cursors are relational rather than literal allowlisted IDs. Other cards,
boards, stack vectors, positions and action paths are not generalized.

All new certificates require the closed raw frame10 boundary, including its
explicit `mR=4,cHB=2`, activation discriminators and nested card shapes. Unknown
boundary/dependent mutations cannot disappear through projection and produce
the new profile. Existing hand239/243 scope remains intact.

| Production result | Independently justified scope |
| --- | --- |
| `flop_transition`, frame22 | Ordered board/street, explicit six-player contribution reset, collected ordinary stacks, SB activation |
| `flop_hero_activation`, frame30 | Registered CO hero's fresh explicit activation, frozen identities/positions, four preceding flop contributions, hero0/BTN0 from the validated reset |
| `hand248_contribution_prefix` accounting, frames22/30/31/32 | Preflop12; flop0/8/10/10; cumulative gross investments12/20/22/22; original pot12 observation with its actual frame22 receipt |
| `historical_flop_call2`, frame31; contract `hand248_co_flop_call2_v1` | Hero0→2, investment2 matching unchanged highest2, no observed raise increment, sufficient independently observed capacity, turn release |
| Same historical proof, frame32 | Explicit next BTN activation with no contribution change |

Historical CALL2 is certified by the source prefix and matching investment,
independently of the checkpoint. It identifies a past accepted source action,
not an outgoing request, particular button press or prospective CALL permission.
The implementation reuses the existing historical proof and accounting fields.

Raw-clock replay gives frame22 an exclusive expiry1792933804299 and frame30
the original exclusive hero expiry **1792933824275** (receipt+10,000ms).
The checkpoint finishes before both the raw-based hero deadline and the
corresponding metadata-receipt-based deadline1792933824283. Production continues
to use its existing source metadata receipt clock; the raw replay does not
replace it. The old saved capture had no flop certificate, so it is not relabeled
as an originally issued certificate or assigned a fabricated old deadline.

Frame31 arrives10,928ms after raw activation,928ms after that replay deadline.
Historical recognition may continue after elapsed time, but supplies no new
`expiresAt`, live opportunity or timer renewal. Polls, UI reads, exports, log
refresh and source samples cannot extend the original window. Every unsupported
update, missing/invalid projection, gap, replay, actor/identity contradiction,
receipt regression, disconnect/reset or generation change retains existing
invalidation. Reads remain cursor/hand/generation bound and defensively copied.

Ordinary source stacks remain as collected at frame22: hero306 even after its
later investment. Arithmetic remaining capacity becomes304 after that2; it is
not a newly observed ordinary stack decrement. Source pot12 plus current street
chips gives20 before hero and22 afterward, explicitly addition only. The actual
UI total20 remains diagnostic evidence; no post-action total22 UI read exists.

## Unsupported facts and preserved blockers

All enclosing proofs still carry `historyComplete=false`,
`liveRecommendationsAllowed=false`, and null legal actions, payable-CALL and
contestable-pot facts. Net commitments, returns, rake/drop, displayed-total
source accounting and pot ledger remain null. Gross investments are not a net
ledger, hero entitlement or evidence that unobserved adjustments are zero.

Phase6E's `flopCallEvidence` stays restricted to hand243: hand248's
`postflopCall`, CALL permission and preflop response permission remain null.
No general payable-CALL or current legality certificate is added. The stricter
Phase6F `postflop_call` checkpoint still rejects hand248; Phase6G observations
can report the new source facts only in a new/replayed valid source window.
Neither saved checkpoint nor raw export is ingested by production proof code.

Still unsupported: complete ordered betting history; other action paths,
repeated hero opportunities, later streets, all-ins/runouts/multiple boards;
complete legal actions, bet/raise bounds and reopening; independently resolved
returns/rake/side-pot eligibility/contestable pot; and postflop strategy,
range/equity/future-betting authority. The recording ends at BTN activation
and establishes no subsequent BTN action or whole-hand settlement.

No poker action, click, wager, outgoing socket message, provider request,
live capture or speculative strategy was automated during this work.

## Replay and validation

`pokernow-flop-248.json` retains all 32 sanitized real source envelopes.
`pokernow-flop-248-checkpoint.json` retains the complete sanitized paired record,
including raw field samples, counters, UI evidence, limitations and old null
certificates. Original evidence, local audit/validation outputs and pre-existing
`.agents/` content are excluded from the commit.

Focused tests cover the real prefix and historic tail, missing original and
synthetically relinked steps, unknown raw/nested mutations, identity/actor/
board/amount/capacity/reset/pot contradictions, every reset marker, the scoped
capacity omission, continuity/generation/receipt errors, raw-gate loss,
invalidation, defensive reads, exact expiry and unavailable/contradictory UI
or epochs. Removing frame32 leaves valid frame31 history with no next activation;
it does not erase an already observed historical action.

The production MAIN API → isolated responder → content-script epoch callback →
collector/export replay uses hand248 source and its saved real table read.
Bridge scheduling, new control reads and fingerprints in this test are explicitly
simulated. It verifies original expiry, null CALL-cost/permission adapters,
unchanged recommendation blockers, no action-history promotion, no display of
advice, no recommendation/provider requests, no clicks and no socket sends.

| Check | Result |
| --- | --- |
| Eight targeted source/capture/freshness/production-path suites | 628 passed |
| `npm.cmd test -- -- --maxWorkers=1` | **3,527 passed across 108 files** |
| Python PHH replay suite in `.data/phase5d-venv` | 14 passed |
| `npm.cmd run typecheck --workspaces --if-present` | All workspaces/apps passed |
| `npm.cmd run lint` | Passed; no workspace lint scripts configured |
| `npm.cmd run build` | Passed |
| `npm.cmd run build:extension` | Passed; both tracked bundles rebuilt |
| Working/staged `git diff --check` | Passed |
| Original evidence hash, duplicate-key/safe-integer audit and reverse fixture substitution | Passed; original unchanged |

Full-suite totals: AI-core 491, browser-reader 2,568, opponent-db 41,
poker-engine 101, range-engine 317, shared 9. This adds 137 focused cases. The
final targeted and full suites used unchanged production/test code and exited
zero; no deadline, invalidation rule, capture size bound or test timeout was
increased. An intermediate negative test incorrectly expected removal of the
final BTN activation to erase valid earlier hero-action history; corrected
expectations preserve frame31 history independently, as the existing contract
requires.

PowerShell labels redirected esbuild/Python progress `NativeCommandError`;
the commands themselves exited zero with successful bundles and Python tests.
Raw evidence, local audit/validation logs and pre-existing `.agents/` files
are not included in the commit.
