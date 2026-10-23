# Phase 6A: audited postflop source and decision-window boundary

Audited from `9d4a42d6c25de65d30bbd6200763a1b379847b0f` on 2026-10-23.
**No flop, turn or river source transition can yet be certified, and no live
postflop hero decision window is proven.** Existing partial observations are
useful, but do not establish the missing source grammar. This phase adds replay
regressions and an exact capture specification; production behavior is unchanged.

Before editing, reviewed Phase 4A–4F and 5A–5D, fixture provenance, all 18 local
JSON/text evidence files and both screenshots, source metadata/event readers,
the single source reducer, scoped certificates, live proof/activation adapters,
action-history/coverage code and tests. Opened the opponent database read-only.
No new live session, network capture, provider request or poker action occurred.

## Evidence census

| Material inspected | Actual coverage | Limitation |
| --- | --- | --- |
| Hand49 raw capture / existing sanitized `pokernow-bb-completion-candidate-49.json` | Five envelopes. Registration in settled hand48 contains one ordered five-card `oTC["1"]` array and `gT=[1,5]`; hand49 then begins preflop. | One settled board sighting, **not** a river deal/activation. No preceding flop/turn or board-growth patches. Later two-player SB completion/BB turn is preflop and remains uncertified for advice. |
| Hand53 and hand68 raw captures | Two envelopes each: settled registration and new preflop boundary. | Empty boards; no postflop continuation. Do not join different recordings by hand number alone. |
| `raise-sizing-paired.json` | 107 envelopes, hands142–151, registration at sequence2, preflop folds/turns/settlements and sizing checkpoints. | No nonempty board or postflop street patch. |
| `raise-5-accepted.json` | 68 envelopes, hands164–169, two connection generations. | Preflop only; ends after UTG open/HJ activation and an empty update. Reconnect is not a continuous same-generation hand prefix. |
| `hj-call-238.json` | 16 envelopes, hands237–238, actual HJ registration, UTG open/HJ call/CO activation. | Stops before CO response; no postflop continuation. |
| `sb-raise-5-capture.json`, `sb-raise-224.json` | 12 envelopes each, hands211–212 and223–224 respectively. | Preflop SB raise/BB activation only. |
| Ten diagnostic exports: hands56,62,68,80,103,115,121,127,133 early/late | Every current DOM snapshot is preflop. Seven exports retain 603 bounded source projections in total, with overlap; none has a postflop stage or nonempty board. Hand103/127/133 early/late explicitly dropped 115/65/145/145 earlier projections. | Projections omit raw fields; bounded/overlapping retention is not continuous capture. Repeated embedded legality examples are static reference material, not ten new flop observations. |
| Archived hand53 inside hand56 diagnostic | 33 retained log events: three street markers, five flop checks, seven turn actions, three river checks, plus preflop/show/award/end rows. One unparsed row and recorded connection gaps; `historyComplete=false`. A separate archived DOM segment starts on river. | **15 historical postflop actions**, no raw transition/actor-activation frames or decision-time controls. Source timestamp order is only a candidate. Street markers do not certify catch-up. The DOM segment is not bound to the server hand. |
| `pokernow-board-live.html` | Four exact user-supplied card elements, in order 6h/Kd/3h/9h. Existing reader parses the turn-sized board and captured rank/suit classes. | Isolated DOM fragment, no table/hand/receipt/actor/transition linkage. Surrounding table markup in tests is simulated. |
| `pokernow-log-v3-live.json` | Four sanitized actual rows: fold, raise-to4, call4, `Flop: [Kc, 8c, 4c]` in candidate timestamp order; raw response newest first. | One flop marker, no hand ID/seat mapping/initial boundary/catch-up receipt. Not a complete betting history or fresh window. |
| Controlled observations, source-link report, stack/return/settlement fixtures | Human-reported board counts 0/3/4/5 and reset; limited amount/control examples, cursor correlations and separate HTML fragments. | Reports and snippets, not missing raw envelopes. Synthetic wrappers, timestamps, seats and ledgers in tests supply no new empirical source contract. |
| HJ238 and SB224 screenshots | Both visually reviewed; empty board, preflop controls/cards/stack displays. | No postflop controls, exact capture receipt or activation-bound DOM. |
| Opponent DB | 1,709 partial observations; 1,619 action summaries: 1,041 preflop, 320 flop, 166 turn, 92 river; zero legacy rows. | The 578 postflop sightings lack board/cards/session/complete opportunities and socket continuity. They cannot certify source transitions. Not additive with overlapping diagnostic histories. |
| Phase 5A–5C tests and Phase 5D public PHH pilot | Synthetic probability contracts versus genuine external research hands are explicitly separate. | PHH actions/boards and archive ordinals cannot establish PokerNow fields, clocks, actors, legality or live windows. Offline behavioral scores are neither GTO nor PokerNow strategy. |

The eight raw exports contain **224 envelopes total**, before overlap/subset
considerations. Only the hand48 registration has a nonempty board. Every
explicit `gT` in these files is `[1,0]` or `[1,5]`; there is **no recorded
`gT` flop/turn/river transition shape**. The settled five-card array does not
justify interpreting `[1,5]` as river: the same value appears after preflop
fold-outs with an empty board. Existing sanitized source fixtures are subsets
of these captures, not independent additional hands.

For local audit reproducibility, SHA-256 of the original hand49 export is
`19491462035031a345ef041d6e8118386880e041ec441d0df55a1d8162ffdc39`;
hand56 diagnostic is
`f1e11a2e8d42ca67f97171a9b35ea4b4321fbb666e2cfe90bed16455fad7f5fb`.
No original file is added or rewritten. Existing tracked raw files predate this
phase. No raw records, database, screenshots or `.agents/` are staged.

## Confirmed fields versus unresolved semantics

| Fact | Independently observed support | What remains unproven postflop |
| --- | --- | --- |
| Street | DOM board count and textual `Flop:`, `Turn:`, `River:` markers; preflop/settlement raw shapes | Exact source transition grammar, intermediate reset ordering, whether a board update and activation are separate/coalesced, all-in/runout differences |
| Board/order | Actual four-element DOM order; one complete five-card `oTC["1"]` array at settlement; textual board markers | Chronological growth 0→3→4→5 in one source hand, replacement/append semantics, duplicate/collision rejection across source/hero, multiple runouts |
| Current actor | Preflop reviewed separate `cPI`/`pITT` activation patches, registered `currentPlayer.id`, DOM current-seat class | Postflop meanings and activation boundaries, dealing/no-actor intervals, actor agreement with timed hero controls |
| Original positions | Preflop `seats`, `iHPI`, dealer ID/seat, SB/BB IDs, `pC` membership; hand-local `Player stacks:` log mapping | A complete frozen roster reaching postflop in the same hand; handling folds/departures without relabeling original positions |
| Contributions | Narrow preflop `tB` changes and exact reviewed raise/call transitions; ordinary stacks distinguish settlement prizes | Street clearing, cumulative versus street totals across collection, bet/call/raise/check/fold grammar, all-in/return/side-pot behavior; numeric gaps alone are not payable-call authorization |
| Actions/order | Observed preflop closed action→activation grammar; historical log text with exact `createdAt` retained | Exhaustive ordered postflop actions including hero; zero-contribution check versus no-action update; timestamp ties, omissions, revision/backfill/catch-up |
| Hand/continuity | `id`, `hI`, `gN`, registration identity, `pre`→`now`, local sequence and connection generation | These prove only validated scoped prefixes, not delivery/completeness. Same number, fresh GET or equivalent-looking board cannot repair missing messages. |
| Card visibility | Hero values bound to registration; projection masks opponent `pC` values | No inference of unrevealed cards. Showdown/archive knowledge cannot be retroactively attributed to the acting player. |
| Timing | Local receipt clock and existing activation+10,000 ms contract | No recorded postflop activation receipt exists. `now`, `pre`, log timestamps and `pASA` are not independently verified local decision clocks. |

The strongest existing production path remains:
`eventSource` → `projectFirstUtgSource` → `createFirstUtgSource` /
`advanceUtgState` → existing scoped live adapters → `buildLiveDecisionProofs` →
content-script activation/display. No parallel reducer, parser, certificate
authority or timer is introduced. Source carriage of a board is not a board or
decision certificate. The legacy DOM action history still resets street baselines
and omits unobserved/multiple-wager order; it cannot fill source gaps.

All current invalidation rules remain: subsequent source mutations, actor/hand
changes, source predecessor/local sequence failures, missing projections,
contradictions, disconnect/reconnect and original expiry. A historical action
accepted after expiry never renews its earlier opportunity. Any future postflop
certificate must use its **own proven activation receipt + 10,000 ms**, expire
at that boundary, reject clock regression, and bind the existing epoch/generation
and latest cursor. Polling, log refresh, model output and cached DOM cannot renew it.

## Minimal missing capture

The first implementation milestone should be **one ordinary single-board,
non-all-in flop transition followed by the registered hero's explicit turn**,
under the currently audited six-player normal no-ante 1/2 profile. A different
tournament/ante/depth profile requires its own explicit review; existing
play-money evidence is not tournament validation. Do not prescribe poker choices
to produce the sample. Observe naturally occurring play only.

1. Use the existing opt-in recorder in [RAW_SOCKET_CAPTURE.md](RAW_SOCKET_CAPTURE.md).
   Enable `sessionStorage.setItem("poker-ai:raw-socket-capture", "1")`, then
   reload before the target hand so registration is observed. This phase's stop
   point supersedes that document's preflop-only stop point: keep recording
   through the target postflop opportunity and the next source update. Preserve
   the earlier settled baseline and fresh hand boundary, not just a mid-hand join.
2. Retain every original `registered`, `rup`, `gC` envelope, including empty and
   unknown-field updates, in order. Preserve event type, absent/null/removal
   markers, full payload, exact source tokens, local receive sequence/time and
   connection generation. Registration must bind table/hero and profile; the
   fresh boundary must supply hand ID/number, original dealt-in roster, seats,
   dealer/blinds/ante, private hero cards and ordinary starting stacks.
3. Preserve all intervening preflop actions and their activations, the last
   preflop action, any collection/reset/no-actor messages, the first board/street
   update, and explicit first postflop actor activation. For hero acting later,
   include every intervening action and actor update. Retain `gT`, `oTC`, `pC`,
   `tB`, `pGS`, `cPI`, `pITT`, stack/pot fields and all opaque flags exactly;
   this is an inventory request, not a declaration of their meanings.
4. In the **registered hero browser**, pair the actual opportunity with a
   timestamped diagnostic and screenshot/DOM: ordered board, hero cards,
   table URL/hand identity, dealer/original seats, sole current actor, each
   visible contribution, ordinary stack versus award display, and every visible
   FOLD/CHECK/CALL/BET/RAISE control. Retain outerHTML, text/value properties,
   `disabled`/`aria-disabled`, visibility, any selected size and read errors.
   Record local `Date.now()` immediately before/after this observation and
   `window.pokerAIRawCapture.status()` before and after, with its last frame
   sequence/generation. If an intervening mutation makes the source/UI pairing
   ambiguous, retain it as an exclusion; do not assign the render to a guessed cursor.
   Capture after source activation and strictly before activation+10,000 ms;
   preserve original times if it is late and label it unusable for freshness.
   Controls corroborate readiness only; slider bounds and button appearance do
   not establish legal actions, rights, minimums or amounts payable.
5. Keep the next actual source update/actor change and, if naturally chosen by
   the player, action acceptance plus next actor. Preserve corresponding
   hand-specific `log_v3` response bodies, response order, request hand number,
   local request/receipt times and headers as corroboration. No synthetic log
   timestamps or silent predecessor repairs. A later log response cannot move
   the original activation deadline.
6. Export the original string once with
   `copy(window.pokerAIRawCapture.exportJSON())`. Do not parse/restringify it:
   large integers and duplicate keys must survive. Confirm registration was
   captured, zero rejected frames, no buffer-limit stop, and no connection gap.
   Limits remain 500 frames / 4,194,304 source characters. A limit/reconnect
   creates an incomplete sample, not permission to splice files or reset clocks.
   A new continuous capture is required when the relevant prefix was lost.

For **turn certification**, additionally retain flop betting through collection,
the three-to-four-card update and explicit turn activation with the same paired
hero observations. For **river**, additionally retain turn betting, four-to-five
board update and river activation. One naturally continuous hand may supply all
three; otherwise use separate complete prefixes. A five-card terminal snapshot
cannot stand in for any of them. Include another naturally observed return to
hero only if repeated opportunities are later to be supported; it needs its own
activation, not an extension of the first deadline.

Review raw captures locally. Derive small sanitized fixtures only after proving
identity substitutions preserve every relevant value/order/time and documenting
omissions. Never commit private raw evidence or fill missing opponent cards.

## Regression scope and validation

`postflopSourceBoundary.test.ts` reuses existing real fixtures independently:
actual hand48/49 envelopes traverse MAIN → projector → source runtime; the real
four-card DOM traverses the production reader/assessment/proof adapter; the real
four-row log sample traverses production ingestion. No fixture is spliced into
another hand. Tests confirm observed order, hidden-card filtering, no invented
actions, no complete history and no source/decision certificate from sightings.

The Phase 6A cases in `bettingWindow.test.ts` start with the real HJ238 source
prefix and confirm its existing CO certificate before synthetic negative tails.
They exercise MAIN → runtime → adapters → actual overlay for missing streets,
duplicate/hero-colliding/reordered board cards, wrong/conflicting actors, missing
predecessors, replayed actions, reconnect, stale time and changed hand. Simulated
postflop DOM and matching CALL controls cannot preserve/revive the old proof,
issue recommendations, call a provider or send a game action. A DOM-only street
change also cannot consume a still-fresh public preflop certificate, and its
original expiry remains unchanged. These invented
tails are rejection tests, **not recorded postflop semantics**. Existing suites
continue testing local sequence gaps, clock regression and original deadlines.

Validation completed on 2026-10-23:

| Check | Result |
| --- | --- |
| Six targeted source/window/DOM/history/proof suites | 350 passed before the final DOM-only case was added |
| Final Phase 6A cases | All 21 passed; six sighting/log cases (three with synthetic log mutations) and 15 source-to-overlay negative cases |
| Full `npm.cmd test -- -- --maxWorkers=1` | **2,941 passed across 103 files** |
| Workspace totals | AI-core 491; browser-reader 1,982; opponent-db 41; poker-engine 101; range-engine 317; shared 9 |
| Optional offline Python PHH suite | 14 passed; no external data or source activation added |
| `npm run typecheck` | Passed across all workspaces/apps |
| `npm run build` | Passed |
| `npm run build:extension` | Passed; both tracked generated bundles unchanged |
| `git diff --check` and staged whitespace check | Passed |

The initial targeted run exposed an incorrect test expectation that tied log
timestamps implied raise-before-call. The assertion now checks membership and
explicit ambiguous order, preserving the production behavior. Two existing
cold-import cases also exceeded their five-second limit. The targeted single-
worker rerun passed without changing timeout limits. An initial full run hit
the existing relay-startup timeout and was stopped; PowerShell had consumed an
argument separator, so the intended worker option did not reach Vitest. The
final command above uses `npm.cmd`, and its log confirms `vitest run
--maxWorkers=1` in every workspace. All tests passed with unchanged limits.
PowerShell labels esbuild's normal stderr progress `NativeCommandError` in the
redirected logs; both build processes exited zero with successful bundles and
no TypeScript/esbuild diagnostic errors.

## Next implementation boundary

Acquire and audit that minimal continuous flop/hero capture, then extend the
existing source authority with only its independently supported observational
transition and activation grammar. Keep the observation certificate distinct
from complete legal-action/history proofs. Actionable advice additionally needs
independent payable-call/raise-rights/grid evidence, contestable-pot and return/
rake accounting, and an applicable independently reviewed strategy/model with
flop/turn future-betting treatment. Phase 5 calibration does not supply any of
those source facts. Preflop recommendations, BB abstention, `historyComplete=false`
and disabled live postflop recommendations remain unchanged.
