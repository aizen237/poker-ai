# Socket state and unopened-preflop evidence audit

## Phase 3A: first HJ after explicit UTG fold

The existing reducer now also issues a dependent `sourceStatus.hjProof` for the
closed boundary -> explicit UTG fold -> first HJ activation sequence observed
in hands 150 and 168. See [PREFLOP_PHASE3A.md](PREFLOP_PHASE3A.md) for the exact
raw-patch contract, empirical limits, frozen roster and new HJ activation
deadline. Only out-of-chart HJ FOLD is enabled; original hand168 QQ stays
blocked from RAISE. UTG FOLD/RAISE, generic history/legality, accounting and
strategy are unchanged. This is not same-decision renewal or global coverage.

## Exact five-chip opening rule (2026-10-16, current)

See [PREFLOP_RAISE_PHASE2.md](PREFLOP_RAISE_PHASE2.md) for the accepted hand169
transition, evidence matrix and exact limits. A fresh supported six-player UTG
chart RAISE can now use the matching 0.1.72/1-2/no-ante/play-money profile's
empirical five-chip rule. Historical acceptance is not a fresh server preflight.
Source expiry, strategy, global incomplete history and all other gates remain.
The original Phase 1 conclusion below describes the evidence before this capture.

## RAISE Phase 1: evidence and interaction design (2026-10-16)

See [PREFLOP_RAISE_PHASE1.md](PREFLOP_RAISE_PHASE1.md) for the field-by-field
evidence matrix, timing audit, proposed dependent sizing proof, control-readiness
separation and minimal paired-capture plan. At that audit, neither bounds/denomination nor
exact-size acceptance was proven for the five-chip UTG opening.
The archived raise-to-4 in hand53 is on the turn, not a preflop sizing test.
The Phase 2 update above supersedes that sizing blocker only for its exact profile/size.

The opt-in [manual RAISE evidence collector](RAISE_EVIDENCE_CAPTURE.md) now pairs
existing raw socket capture with bounded DOM checkpoints and copies of the
existing timeline diagnostics. Its separate diagnostics channel never feeds
the source reducer or policy. It cannot certify legality or renew firstUtgProof.

## Hand 133: live diagnostic / current-runtime mismatch

Replayed `evidence/hand-133-early.json` and `evidence/hand-133-late.json` for
`ofkizelmirpi` / 133, QhTs UTG. The retained generation-5 boundary is local
sequence 241, received at `1792073133093`; the original deadline is
`1792073143093`. Early capture is at age 8.858s; late capture is at 18.857s.
The captures retain the same source projections through that boundary.

Both saved sourceStatus objects **omit the firstUtgProof property entirely**.
The current runtime always serializes that property (contract or null), alongside
the compatibility firstUtg witness. Thus these files are not the diagnostic
shape emitted by the current unmodified runtime. They retain the old divergent
state: a valid firstUtg witness but incomplete observational continuity. The
pre-contract adapter checked that observational continuity and rejected the
witness before policy/overlay selection. The current scoped-contract fix above
already removes that competing authority, without removing the connection gate.
This is evidence of a legacy runtime/diagnostic producer, not evidence of a
new current overlay rendering failure. The captures do not identify which
extension directory/build was loaded or whether its tab had been refreshed;
they contain no browser paint trace or historical poll/relay timings.

Regression replay feeds the retained projections through the real MAIN bridge,
source reducer, contract consumer, packet/policy, epoch and content-script DOM
renderer. The saved table read is the DOM cross-check; no certificate is injected.
At the early export time, current code synchronously renders **FOLD**, with 1.142s
remaining (countdown rounded to 1.1s), before any HTTP result. A simulated 1-second
poll schedule holds the saved DOM constant and retains FOLD until the original
10-second deadline. Saved log rows changing the epoch, pending/failed relay work
and a superseded explanation do not hide a fresh selection. At the late capture
time no actionable recommendation is produced. Expired responses cannot restore
it. These are simulated schedules, not claims about unavailable live poll timing.

No further production strategy, proof or display change was justified by this
replay. Added six regressions in `scopedContinuityDisplay.test.ts`; rebuilt the
extension. To load this existing fix, reload the unpacked extension from this
workspace and refresh the PokerNow tab so both MAIN and content scripts restart.
Rebuilding alone cannot replace scripts already running in a tab. A current
diagnostic must include sourceStatus.firstUtgProof even when it is null.
Global history remains incomplete and evidence expiry remains ten seconds.

Validation: 47 targeted tests; full suite 1,701 tests across 80 files;
workspace typecheck; `build:extension` (includes root full build); diff check.

## Hand 127: one scoped continuity authority

The retained diagnostic contains a valid generation-3 first-UTG witness for
hand `zyrbaxapvjfp` / 127 (8s5d), received at `1792071363868`. The actual export
is 9.026 seconds later, inside the original deadline `1792071373868`.
Sequences 89/90/91 are an untrusted pre-registration gC, full registration and
equivalent rup. Registration 90 anchors the valid prefix through boundary 161.

The architectural defect was competing validation authority: `firstUtgSource`
validated full retained values, while `sourceMetadata.socket` revalidated its
internal bootstrap receipt against a lossy 64-field inventory (`id/hI/gN/now/pre`).
An omitted scalar could reject that receipt and permanently retain the
pre-registration incomplete status. `currentFirstUtg` and `decisionProofs`
then consumed that audit status, vetoing the valid reducer witness. The saved
diagnostic proves the divergent results. Bootstrap inventories 89–91 have been
evicted from its 32-frame audit, so the exact omitted field cannot be recovered;
tests label missing pre/now and field-limit padding as synthetic reproductions,
not additional captured frames. No extra live capture is needed for this fix.

### Authority and consumption

| Stage | Responsibility |
| --- | --- |
| `eventSource` / `pokerNowTransport` | Passive incoming message projection, generation/local sequence and separate hand identity; no poker actions |
| `firstUtgState` / `firstUtgSource` | Full bounded bootstrap, equivalent refresh, consecutive sequence/predecessor checks, roster reconciliation and fresh boundary validation |
| `sourceStatus.firstUtgProof` | Single versioned `first_utg_boundary` contract: registration anchor, through-sequence, table/hand/generation/cursor, witness and original expiry; never global history |
| `liveTimeline` | Publishes that internal contract only while connected; legacy `firstUtg` is a view of its witness, not another proof |
| `firstUtgLive` | Contract binding plus independent identity, current DOM, cards/stacks/positions, log contradictions and existing safety cross-checks |
| `preflop` / `unopenedEvidence` / `decisionProofs` | Consume the same scoped validation for unopened context, roster, position, action window and connection; other decision classes retain their existing gates |
| `ai-core` / relay | Packet binding and decision-class requirements; deterministic policy selection and locked explanation behavior unchanged |
| `liveProofRevision` / content script | Contract revision participates in request epoch/stale-response checks; UI uses the contract's expiry directly and removes advice at its deadline |
| Metadata audit / log timeline | Observational inventory/chain and incomplete log coverage remain separate; neither can manufacture this contract |

The audit now accepts the internal bootstrap receipt without rechecking it
against truncated scalar inventory. It can still report an observational gap
where metadata is missing. That diagnostic is not the first-UTG continuity
authority: a validated scoped prefix can coexist with incomplete observational
inventory, while even a continuous inventory cannot rescue rejected source state.
This is not a global connection override: proven first-UTG connection requires
the full contract and all existing live cross-checks. Invalid registration,
mismatched refresh, skipped/replayed update, reconnect or stale binding removes
the contract. No contract arrives directly from a page message.

End-to-end MAIN bridge -> source runtime -> live adapter -> policy -> overlay
replays cover hands 103, 115, 121 and 127. Hand 127 reaches **proof_ready / FOLD**
at its actual export age, then expires normally. Negative tests cover malformed
bootstrap, gaps, replacement errors, generation changes and late responses.
Whole-hand history remains incomplete; no same-window renewal, authoritative
side-pot accounting, broader position/action window or 2.5BB legality is added.
The relay still trusts bound evidence supplied by the local reader; it does not
independently observe PokerNow or renew source freshness.

## Hand 121: explicit occupant replacement and stale card membership

The retained [hand-121 diagnostic](evidence/hand-121-diagnostic.json) first
failed at local sequence **6**, not at hand 121's boundary (sequence 78).
Registration had seat 5 / dealer `nQ-ZBcAfge`. Sequence 6 explicitly deletes
that ID from `players` and `pGS`, supplies new ID `L6CP6v3_ST` with its own
identity/stack/status, replaces seats/iHPI/dealerID, and supplies all six `pC`
records without the old ID. The reducer incorrectly merged that complete card
map into the previous one, retaining **`pC.nQ-ZBcAfge`** after deleting its
player record. Its reference validator then rejected the generation; later
boundaries could not silently recover it.

The bounded reducer now accepts this scoped deletion/reconciliation form only
with explicit player and status deletions plus agreeing complete seats, dealt-in
IDs and card membership. Those card records replace the prior map; no stack,
identity or cards are transferred by seat. Remaining stale wagers, actors,
blind/role references, missing player identity/stack/status, partial snapshots
and contradictory mappings still fail closed. Errors identify the specific
dictionary/player reference. The replacement itself is not a fresh-hand proof.

Replaying all 78 retained projections through the production projection and
timeline adapter now preserves continuity through hand 120 -> 121, certifies
six players including the replacement, and selects **FOLD for 9h6d UTG** within
the original ten-second window. Saved log rows are reparsed independently.
The export at `2026-10-15T11:26:13.891Z` is **18.227 seconds** after boundary
receive time `1792063555664`; it correctly remains expired/non-actionable.
This fixes ingestion of complete replacement evidence, not recovery across a
missing/invalid update. Reconnect, chain/local sequence checks, expiry, strategy,
legality gates and `historyComplete=false` are unchanged.

## Same-decision freshness renewal investigation

**Outcome: unsupported with the currently verified source contract.** The
ten-second lifetime applies to the original evidence receive time. Receiving
an old state again, advancing a local clock, polling the DOM, or completing an
LLM explanation does not establish a fresh decision.

This pass inspected the production bridge, identity parser, bounded reducer,
proof consumers, log acquisition and all retained socket exports/projections
in `evidence/`. Among these files, hand 103 contains the only `rup` observation:
an exact repeat of the immediately preceding registration state/cursor, not a
new decision acknowledgment. No captured `gC.r=true` refresh exists. Hand 115
contains no source update before expiry, then player connection changes. The
recorded static-client contract names full-state and patch messages but does
not specify a state-refresh request, freshness acknowledgment or turn-version
contract. Re-fetching its recorded public bundle URL returned HTTP 403; no
newer client or server semantics are claimed from that failed inspection.

| Candidate | What it establishes | Why it cannot renew this window |
| --- | --- | --- |
| `registered.gameState` | New connection baseline, hand/hero identity and retained state | Registration may be mid-hand; no independent proof of hero's first voluntary window or generation continuity across reconnect |
| Immediate equivalent `rup` | Same bounded baseline at the same cursor | Repeated state does not prove fresh evaluation; no nonce or request/response freshness binding |
| Later `rup` / `gC.r=true` | Full-state discriminator in the inspected client contract | No verified live response/current-decision contract; advanced/stale cursors cannot be interpreted as a renewal acknowledgment |
| Linked `gC` `pre/now` | Observed update-chain continuity | Does not itself prove current turn/action rights or that omitted proof fields were freshly evaluated |
| Explicit `cPI/pITT` | Observed actor IDs | Actor identity alone cannot distinguish first action from a later turn or identify a complete decision window |
| Inherited `seats/iHPI/pC/tB/pGS` | Bounded carried state | Cached fields are not independently fresh evidence; no complete authoritative action-window guarantee |
| Empty `eventsData` / transport liveness | No reported nested event / connection alive | No assertion that no poker action occurred or that server state is current |
| `log_v3`, ETag or timestamp link | Reported historical rows/content or numeric correlation | No current-state watermark, completeness acknowledgment, tie ordering or catch-up guarantee |

The missing proof is a server-authoritative, freshly evaluated snapshot or
acknowledgment bound to the table, hand, generation and hero, containing the
necessary roster/dealer/blind/card/stack/status/current-actor conditions **and**
an authoritative identity/coverage guarantee for this same first-action window.
It must distinguish later turns, changed state and replay, and establish that
the response is fresh (for example, a verified request/nonce response contract
plus a server decision revision). Field names, a newer cursor or a later local
receive time alone are insufficient. A verified transport/action completeness
contract could be an alternative proof model, but is not currently established.
No guessed endpoint, forced reconnect, periodic refresh request or poker action
is added. This is a missing protocol contract, not a request for another normal
hand or repeat settlement test.

### Changes and practical alternative

`sourceStatus.firstUtgEvidence.freshness` now reports the latest issued
certificate's hand/generation, issuing sequence, original receive/deadline,
age/remaining lifetime, first invalidation and `sameDecisionRenewalSupported=false`.
It preserves whether expiry preceded later invalidation, avoiding hand 115's
misleading latest-update-only explanation. This is bounded diagnostic history,
not a proof source; exported objects cannot mutate the active certificate and
no request revision or activation consumes these diagnostic fields.

Candidate-renewal regressions deliberately remain blocked. There is no honest
successful **same-window renewal** fixture to add. The positive regression
instead verifies independent issuance for a later real captured hand after
expiry/reconnect; it is explicitly not labeled renewal. Existing UI lifecycle
tests continue to cover stable fresh display, expiry, actor/hand changes and
late-response rejection. Strategy, global history completeness and activation
requirements are unchanged.

The recommendation freshness UI is now implemented for the live first-UTG
certificate: the visible countdown uses `receivedAt + 10_000`, never the
render/request/explanation time. A deadline timer removes the action, confidence
and explanation at that timestamp and displays **EVIDENCE EXPIRED** with neutral
styling. A 250ms display refresh updates the countdown and checks for changed
source/DOM bindings; visibility/focus checks handle returning to a throttled tab.
All callbacks recheck the actual clock, rather than decrementing a counter.
The proof validator itself is unchanged (the UI withholds at the deadline).

No historical action is retained. The expiry label persists only for the
otherwise unchanged decision and is cleared on changed hand, source, cards,
actor or unreadable state. Late explanations cannot restore expired advice.
Browser scheduling can delay timer execution in a suspended/background page;
the next callback or visibility/focus check removes expired content without
extending its proof. Continuous actionable advice still requires the missing
source freshness/window contract; refreshing the tab mid-hand is not a substitute.

## Hand 115: recommendation lifetime, not an early socket invalidation

The original [hand-115 diagnostic](evidence/hand-115-diagnostic.json) retains
71 production projections in continuous generation 1. The user confirmed live
FOLD for A♥3♣ UTG, with an explanation. Its relative local receive times are:

| Observation | Age from hand-start receive | Source evidence |
| --- | ---: | --- |
| 67 | 0 ms | Hand 115 `oacpsi6ju66i`, first UTG/current actor, forced blinds |
| Proof deadline | 10,000 ms | Existing local freshness limit, not a source timestamp |
| 68 | 24,025 ms | BB `TTXBlZfl8G` gets `disconnectedSince` |
| 69 | 24,589 ms | SB `mNU27Fo1qX` gets `disconnectedSince` |
| 70 | 35,738 ms | BB disconnect marker explicitly removed |
| 71 | 37,026 ms | SB disconnect marker explicitly removed |
| Export | 68,400 ms | Already outside the proof lifetime |

The real content-script replay selects FOLD synchronously from the original
projections and saved DOM cross-check. Unchanged polls preserve it through age
10,000 ms. At age 10,001 ms, `firstUtgSource.snapshot()` returns null;
`liveProofRevision` changes; the poll increments the request epoch, clears the
old action and fails the now-missing scoped proofs. The overlay shows WAITING
FOR PROOF. No subsequent socket frame or LLM response is necessary to reproduce
this removal. Actual one-second polling phase determines the first check after
the deadline; a response arriving between polls also rechecks freshness.

Later updates do clear the internal witness, overwriting its diagnostic reason
with “not a supported first-UTG boundary.” That late reason does not establish
what removed the action initially. The retained sequence-68 receive time rules
out that update causing removal within the first 2–3 seconds after the boundary.

The saved diagnostic contains no initial overlay-paint or LLM completion times.
Simulated first display or explanation at age 8,000 ms followed by expiry at
10,001 ms reproduces roughly two seconds of remaining display time, but this is
an illustration, not a claim about the historical relay timing. Tests separately
cover pending/late responses, actor/card/hand changes, connection loss, gaps,
same-hand updates and rejection of an old-epoch explanation.
The saved current-hand log rows also pass through real ingestion: their arrival
can change the request epoch, but a still-fresh certificate immediately selects
FOLD again. An explanation from the superseded epoch is rejected.

There is no independently verified renewal in this capture: no update before
the deadline, followed by meaningful opponent connection changes. Empty
`eventsData`, unchanged DOM and inherited turn fields do not establish a fresh
first-turn certificate. Reconnection markers do not revive an expired action.
No production lifecycle, strategy, expiry or activation gate is changed for
this finding. The original certificate remains bounded to ten seconds and
global `historyComplete` remains false. Renewing it would require additional
source semantics, not a timer extension or a newer LLM response.

## Hand 103: reconnect/bootstrap recovery

The unchanged [hand-103 diagnostic](evidence/hand-103-reconnect-diagnostic.json)
retains observations 116–211. Generation 2 starts with untrusted `gC` 140;
registration 141 supplies the full retained hand-97 state. Immediate `rup` 142
has exactly the same projected fields, values, hand/table/player identity and
`pre/now` as registration. Subsequent `gC` updates 143–211 link consecutively,
ending at hand 103 `m8r13zb012ch`. The earlier generation's missing prefix is
not reconstructed.

The old reducer latched rejection on 140 and accepted registration only as the
first event of a generation. The metadata audit independently marked both 141
and 142 as unsupported mid-generation full frames, permanently blocking later
decisions despite the linked updates.

Recovery now discards all pre-registration patches and accepts the first
validated registration of a generation as a new baseline, without carrying any
old-generation state. It never certifies the already-running registration hand.
Only an immediately consecutive `rup` with a fully validated, equivalent bounded
projection is accepted as a bootstrap duplicate. Object key order is irrelevant;
array order, missing/null values, identities, cards, stacks, profile and cursor
must match. No sparse merge, advanced-cursor refresh, generic `r=true`, repeated
refresh or backfill is accepted. A malformed registration or post-baseline gap
still invalidates the generation; another mid-generation registration cannot
repair it silently.

The metadata audit starts a new segment only on an internal validation receipt
from the source reducer, cross-checked against the same observation's source
identity/cursors. It exposes `baselineSequence=141`; 142 adds no linked action
or update count. Updates 143–211 provide 69 observed links. This does not erase
old timeline coverage issues or prove any reconnect/backfill/log completeness.
`historyComplete=false` remains unchanged.

The regression replays the retained values through both the production timeline
adapter and MAIN-world socket bridge, without inventing discarded raw fields.
At fresh-boundary replay time, saved DOM inputs cross-check six dealt-in players,
hero seat 1 UTG/current actor and sufficient stacks. The unchanged chart selects
T♠2♦ FOLD with `proof_ready`, without raise-legality proof. The five saved log
rows also reparse successfully. The diagnostic export itself is 14,678 ms after
the last update and remains expired under the unchanged ten-second limit.
This establishes fresh-decision eligibility, not a claim that the old extension
actually displayed FOLD or that a late export is still actionable.

Negative regressions cover absent/malformed registration, conflicting refresh
state/identity, missing fields, changed array order, replay/duplicate deliveries,
skipped updates, predecessor mismatch, generation changes, stale old sockets and
invalid final roster/dealer/turn. Existing strategy, UI, pot, raise-legality and
stale-response gates are unchanged.

## Hand 80: carried bounded source state

The original [hand-80 diagnostic](evidence/hand-80-diagnostic.json) retains all
70 production projections, from registration during hand 74 through hand 80
`ifuhzlpn8ejr`. These are retained source values, not field-inventory guesses.
The consecutive generation-1 updates provide sparse player stack assignments,
explicit `<D>` dictionary/connection-marker removals, folded-state resets, and
paired hand-ID/number transitions. The final hand-79 update has `gT=[1,5]`;
the next update explicitly supplies the new hand, six dealt-card memberships,
normal blinds and hero's first UTG turn.

The bounded reducer now carries validated state across this observed `gC`
profile. Scalars/arrays replace supplied values; player-keyed maps apply
explicit assignments/removals, and omitted values persist. New-hand `pC` and
`tB` replace previous-hand membership/contributions. Player stack values are
absolute source assignments: the reducer never applies pot awards or invents
chip movements. Retained state is limited to the proof projection (40,000
characters, at most ten players); diagnostic observations retain their existing
96-observation / 300,000-character limits. No unrelated raw payload is retained.

Malformed updates, conflicting identities, unsupported mutations, skipped or
replayed local sequences, predecessor mismatch and generation changes discard
the carried state and current witness. Invalid state cannot silently recover
within the same generation. A valid registration in a new generation is needed
to restart; reconnect coverage is not inferred. This pass left `rup` and `r=true`
refreshes unsupported; the hand-103 section documents the later, strictly
equivalent immediate-bootstrap `rup` exception. Other refreshes remain gated.

The integration replay feeds all original projections through the production
timeline and live decision adapters. With the saved DOM as a cross-check at
fresh-boundary replay time, it establishes six players, hero seat 1 UTG, normal
blinds, sufficient source/current stacks and JTo -> FOLD / `proof_ready`.
Reparsing the original five log rows preserves this result. No raise-legality,
pot or equity proof is consumed by FOLD. The actual diagnostic was exported
98,538 ms after the last source receive time: replay at that timestamp remains
blocked by the unchanged ten-second witness expiry. This is an automated fresh
boundary replay, not a claim that the late saved export was live activated.

The existing direct registration -> next-hand path remains covered. The
certificate still expires on any subsequent update and only supports the
first-UTG class. No strategy, UI, raise sizing, accounting, generic history or
other activation gates changed; `historyComplete` remains false.

## Hand 68: selected engine FOLD and overlay delivery

The original [raw hand-68 capture](evidence/hand-68-raw-socket.json) and
[selected-FOLD diagnostic](evidence/hand-68-selected-fold-diagnostic.json)
show the supported direct hand-67 -> hand-68 boundary (`vvmeaiftbzht`), six
players, hero UTG with Q6o, activation allowed, policy selected FOLD and
`llmMayChoose=false`. This verifies live selection, not successful live display:
the user observed no visible FOLD in the overlay.

The extension previously set its display to waiting after local selection and
only populated the action on relay completion. The relay awaits an optional
provider explanation, and the extension cleared the result on request failure.
The content script now renders the authorized locked engine action synchronously
before fetch, reusing the engine's existing explanation/confidence. Responses
can change only reasoning, with matching action/size and consistency checks.
Provider/relay failure leaves a still-current engine action visible with an
explanation warning. Existing hand/epoch/DOM/source checks remain; failures also
recheck freshness before retaining an action. Expired or changed decisions clear.

The automated regression sends the original envelopes through the production
MAIN-world bridge and runtime, uses the saved reader inputs, and executes the
actual content-script polling, policy evaluation and overlay DOM rendering.
It asserts FOLD while the relay is pending, after matching explanation and after
failure, and rejects stale or mismatched results. A separately labeled synthetic
selected-RAISE display test checks total-size formatting; it does not certify
live raise legality. No strategy, source proof or freshness gate changed.

## Hand 62: production bridge audit and exact diagnostic replay

The saved [hand-62 diagnostic](evidence/hand-62-failed-smoke-diagnostic.txt)
identifies `nc9cxdfnkkkx`, six Player stacks entries at seats 1,2,3,5,9,10,
hero QcTd at DOM UTG, and only two normal blind posts. The original live audit
reported continuous generation 1. Registration was in hand 56, not immediately
before hand 62; hand 62 arrived at local observation 69.

The production MAIN-world bridge already forwards `utgSource`, independently
of the name/type inventory whose `rawValueRetained` flags are false. At that audit,
the certificate supported only a direct registration/end-hand -> next-hand first-UTG
boundary. It did not maintain a certified state across arbitrary intervening
player/seat/stack patches. The hand-62 inventory cannot establish the nested
values or patch semantics needed to add that capability safely.

`sourceStatus.firstUtgEvidence` now retains the existing minimal projections,
original local receive time, sequence and generation, plus a rejection reason.
Retention is bounded to 96 observations / 300,000 serialized characters with
explicit loss counters. At this stage it provided observational evidence, not a
state reducer or coverage certificate (the hand-80 section describes the later
scoped reducer). Full result/settlement objects and opponent card values
are excluded. `socketStateEvidence` now explicitly distinguishes its inventory
from this separate production evidence path. No unrelated raw payloads are added.

The exact saved replay uses retained log text/timestamps, original reader inputs,
first registration inventory and observations 38..69. Observations 2..37 and all
nested proof projections are absent; no updates are invented to reconstruct the
original continuous-chain result. It remains blocked. The diagnostic's local
capture time is also 94,658 ms after the last source receive time, outside the
existing 10-second first-turn freshness bound. This comparison uses local times,
not guessed PokerNow timestamp units.

QTo is outside the unchanged UTG chart: with a supported fresh boundary it yields
FOLD without raise-legality, pot or equity proofs. Real MAIN-world bridge tests
use hand 53's full envelopes; a separate explicitly synthetic QcTd card variant
checks chart activation. Neither is represented as hand-62 source evidence.
The remaining missing certificate for hand 62 is a fresh source-bound first-UTG
state: actual dealt-card roster, dealer/blind/turn values and current source
seat/stack state through the intervening updates. Six Player stacks entries and
DOM UTG cannot substitute for it. No strategy or activation gate was relaxed;
whole-hand `historyComplete` remains false. RAISE still requires independent
2.5BB legality.

## Hand 56: exact failed smoke diagnostic replay

The saved [hand-56 diagnostic](evidence/hand-56-failed-smoke-diagnostic.txt)
contains 11 retained source rows and 22 socket metadata observations. It is a
diagnostic export, not a full raw socket capture. Replaying its exact row text
and timestamp representations through current HTTP ingestion converts four
previously unparsed missing/missed blind rows into forced posts. Together with
normal SB/BB this yields six posts: seat 9=1, seat 10=2, hero seat 1=1 and 2,
opponent seat 2=1 and 2. No call, raise or voluntary action is invented.

The hand remains unclassified/blocked rather than certified unopened. Its
Player stacks row lists seats 1,2,3,9,10; the DOM also includes folded seat 4.
The DOM-derived hero label HJ is therefore not certified six-max position
evidence. Hero already displays contribution 2; the supported first-UTG source
witness is absent. Two player-join rows and the hero-card announcement now parse
as non-action metadata, preserving source text/timestamps and explicit join IDs.
They supply no dealt-in membership, current cards or coverage proof; unknown
formats still fail closed. Socket generation 2 begins with gC before
registration and also contains rup; continuity remains incomplete despite later
linked updates. Missing DOM contributions leave call cost and depth proof
unresolved. Thus this is not a one-parser-fix-away supported hand.

The regression reconstructs the retained HTTP response order from its indexed
metadata and unique timestamp matches, replays the metadata through the source
runtime, and uses the exact raw DOM inputs with the production preflop/proof
adapters. It never supplies the saved proof statuses as new certificates or
creates missing raw socket interiors. Whole-hand completeness and every
activation gate remain unchanged. Repeating this same hand class is not a
justified activation smoke test; the supported class still requires a fresh,
normal six-player first-UTG boundary with consistent source and DOM evidence.

## Hand 53: scoped first-UTG activation

The full [hand-53 export](evidence/hand-53-sixmax-utg-raw-socket.json)
supersedes the earlier request below for another six-player capture. It has two
frames, no reported rejected/dropped frames, in one generation: registration in
hand 52 (`hwdhoynyho3g`, now `1791876582763`), then the directly linked hand 53
(`x9h6owk0kbw5`, now `1791876608697`, pre `1791876582763`). The registration
already has six seats; the new hand supplies all six two-card pC entries and the
same six iHPI IDs. Hero has 8h5h. New dealer is seat 4, SB 9, BB 10; increasing
seat traversal gives UTG 1, HJ 2, CO 3. Both cPI/pITT name hero at seat 1.
New tB contains only SB=1 and BB=2. eventsData is empty, not a poker action log.

`firstUtgSource.ts` now validates this exact source **shape**, not these fixed
hand/player IDs: direct end-hand registration -> next-hand first-UTG update,
normal observed 1/2 no-ante play-money Hold'em profile, six unique seated IDs,
six explicit dealt-card entries, matching iHPI, dealer/blind order, normal blind
totals and first hero turn. Empty players is accepted only in this direct linked
transition, where registration provides the six stacks. This is not a universal
patch reducer, multi-hand tracker or a decoder of later tB action changes.
Any membership/player patch, unknown profile, missing field or inconsistent
mapping rejects the witness. No arrival/departure is reconstructed by name.

`firstUtgLive.ts` independently requires the current connected hand/generation,
continuous socket segment, matching cards, six current occupied seats/positions,
DOM dealer, numeric remaining stacks >=100BB, no folded/all-in/offline/settling
seat, explicit normal blind values, hero turn and no read errors. Remaining
stacks must also match the registration stack or that stack minus its forced
blind; this supports a lower bound without guessing the general socket stack
accounting convention. Contradictory log actions or seat mappings reject it.

For this first UTG turn **there is no preceding legal voluntary turn to replay**.
The scoped context marks only this empty voluntary decision window complete;
it does not fabricate ordered blind events. Source forced-blind contributions
establish a 2-chip call gap even if nonblind DOM markers are absent. The generic
DOM monetary assessment, decisionPot, whole-hand historyComplete=false and
postflop/EV gates remain unchanged. No postflop/side-pot/accounting proof is
needed by the existing non-EV RFI chart.

The witness expires after any subsequent state update (including duplicates or
malformed intended frames), reconnect, reader gap, or ten seconds from its
original local receive time. Cached delivery cannot refresh its age. This TTL
is a local safety bound, not source time semantics. Its expiry is part of request
identity, so delayed provider responses cannot resurrect an expired decision.
Only the direct registration/new-hand class is supported; observing later hands
without a fresh compatible registration does not create another certificate.

The real adapter regression reads the original two envelopes, passes them through
the production projection/identity/metadata/runtime, cross-checks reader-shaped
DOM inputs, serializes the resulting packet and evaluates the relay policy.
8h5h UTG selects FOLD without a Raise panel or contestable pot. RAISE still lacks
independent minimum/chip-increment/2.5BB acceptance proof; mR/mAVTB and slider
attributes are not promoted. BTN/CO action windows, limps, responses to raises,
short stacks, BB strategy and all postflop expansion remain gated.

One real **FOLD-only** smoke test is now justified for this exact class. Rebuild,
reload the extension and PokerNow before the next hand so registration precedes
the boundary; restart the relay to load rebuilt ai-core. No additional raw
six-player or heads-up capture is required for this class. No auto-click occurs.

## Historical hand-49 investigation

## Source inspected

The original [hand-49 raw export](evidence/hand-49-raw-socket.json) is now the
source of truth. SHA-256 at inspection:
`19491462035031a345ef041d6e8118386880e041ec441d0df55a1d8162ffdc39`.
It contains five retained frames in local connection generation 1: one
`registered`, then four `gC`; no `rup`. Capture ended by explicit export, with
zero rejected frames and no reported retention limit. Local receive sequence,
timestamps and generation are diagnostics, not server completeness guarantees.

This supersedes the earlier summary-only findings. The old report fixture is
kept as historical evidence; new tests read the original export directly, with
no invented missing frames. Registration is already in hand 48, so the capture
does not include the beginning or complete history of hand 48.

Only audit documentation, historical-fixture provenance, an offline audit
explanation and regression tests changed in this pass. No live decoder, proof gate, strategy, recommendation,
accounting, settlement or `historyComplete` behavior changed.

## Exact frame sequence

| Local frame | Source cursor (`now`) | Source state / changes |
| --- | --- | --- |
| 1: registered | 1791681923076 | `gameState.gN=48`, `hI=sult10pqpx2q`; hero `currentPlayer.id=v7UmNXTwjJ`; three players/seats; board `[9s,Kh,Js,5h,3d]`; `gT=[1,5]`; `tB={}`; `cPI=null`, `pITT=null`; settlement result present |
| 2: gC | 1791681980133 | `players.TTXBlZfl8G.disconnectedSince` updated; `uP="<D>"`; no hand change |
| 3: gC | 1791681982561 | `gN=49`, `hI=0kunwn5db0aj`; `gT=[1,0]`, board `oTC[1]=[]`; new cards; two-player roster; seat 2 removed; `gameResult="<D>"`; SB/BB and dealer change; `tB={OoArqYL22g:1,v7UmNXTwjJ:2}`; `cPI=pITT=OoArqYL22g` |
| 4: gC | 1791682081744 | `tB={OoArqYL22g:2}` only; `pITT=null`; `cPI` absent; `cRPI=[OoArqYL22g]`, `pGS={}`, `sNA="NSAA"`; no hand/street/board replacement supplied |
| 5: gC | 1791682082616 | `cPI=pITT=v7UmNXTwjJ`; `sNA=null`; `tB` absent; no hand/street/board replacement supplied |

Each gC `pre` exactly equals the previous frame's `now`, including the link
from registration to frame 2. The existing checker reports four linked updates,
not the three links available in the previous summary. All five `eventsData`
arrays are empty. Empty eventsData therefore cannot be a complete action log or
evidence of an unopened pot. No timestamps are converted into assumed units.

## Hand start, roster and freezing

Frame 3 is now an observed hand boundary, not a presumed mid-hand first sighting:
both source hand identifiers change together, the board clears, new card entries
arrive, blinds and dealer rotate, and the prior result is removed. Freeze the
hand-49 baseline at this frame, not at registration (which belongs to hand 48).
This does not establish reconnect/backfill handling for a missed hand boundary.

The full `pC` is a player-ID-keyed object. At frame 3 it contains exactly:

- `OoArqYL22g`: two card entries, both `{value:null, showing:false}`.
- `v7UmNXTwjJ`: `{value:"Kh", showing:false}`, `{value:"Th", showing:false}`.

These are actual two-card slots, not just ambiguous object keys. Hidden null
opponent values do not mean no cards were dealt. Hero's prior cards in frame 1
were `9d,6h`. Frame-3 pC IDs agree exactly with `iHPI` and seats
`[[1,"v7UmNXTwjJ"],[3,"OoArqYL22g"]]`.

**The source-reported dealt-card roster at the start of this observed hand is
now established:** two participants, with hero at seat 1. This is a fact about
hand 49, not validation of every iHPI/pC lifecycle or a new live activation
certificate. The registration has three in-game player objects; it must not be
reused as hand-49 membership.

The prior third player is now known, not synthetic: `TTXBlZfl8G` at seat 2.
Frame 2 reports disconnection, while frame 3 carries `"<D>"` for that player's
`players`, `pGS` and `pTB` entries and excludes them from seats/iHPI/pC. This
corroborates a specific removal at the boundary. It does not define every
away/sit-out or deletion-marker case. Frame 3's `players` object contains only
the removal: treating it as a complete player dictionary would be incorrect.
Conversely, blindly deep-merging pC would retain the prior third player's cards.
No universal nested-patch reducer is inferred from these different shapes.

Freeze the new roster independently from hand 48, retain it through later
omissions/folds/departures, and never reinterpret an omitted field as an empty
roster. Flag conflicting assignments instead of rewriting history. The capture
does not contain a later hand-49 fold/departure; those existing tests remain
explicitly synthetic. Reconnect/gap invalidates current proof use even if the
historical baseline remains available for audit.

## Positions and turn progression

At frame 3 `dealerID=OoArqYL22g`, `dealerSeat=3`, `sBPI=OoArqYL22g` and
`bBPI=v7UmNXTwjJ`. This establishes consistent heads-up roles for this hand:
seat 3 BTN/SB, seat 1 BB. No clockwise assumption is necessary for two players.
The prior hand also shows dealer seat 1, SB seat 2, BB seat 3, which supports
the observed three-seat ordering but does not validate six-seat traversal,
vacancies or six-max UTG/HJ/CO assignment generally.

The actual turn-field sequence is SB/SB -> omitted/null -> hero/hero for
`cPI/pITT`. Frame 4 is transitional: explicit null pITT must not be replaced
with a guessed active actor or treated as hero's decision. Frame 5 is the first
captured update with both IDs equal to hero. These are established source field
transitions; interpreting either field as a universal turn-ready acknowledgment
still requires the source contract. No live turn gate is changed.

## tB and the completion conclusion

What is proven from the JSON: frame 3 explicitly supplies SB=1 and BB=2;
registration explicitly supplies blinds 1/2; frame 4 supplies a new SB value of
2 and does not supply a BB value; frame 5 supplies the hero turn fields. There
is no intervening *reported* hand/street/board change. `cHB` is 2 at frame 3 and
is not replaced in frames 4/5. These facts strongly support a blind completion.

What remains an interpretation: tB entries represent assigned total wagers
rather than increments, omitted nested entries retain their prior totals,
and every action affecting that interpretation is represented by these updates.
This single preflop example also cannot distinguish street totals from whole-hand
totals, since both coincide before the flop. Existing monetary verification
applies to DOM wager values, not an independently decoded socket tB contract.
There is no matching explicit call row or DOM wager/action-button capture in
this file. Empty eventsData supplies no action label.

**Do not promote this to a verified poker-action event yet.** It is now a
frame-anchored, strongly supported SB completion candidate: if tB uses assignment
of street totals, the SB calls **1 additional chip to total 2**, not a raise and
not an unopened RFI pot. The old reasons about missing frame placement and pC
contents are resolved; semantic/action-coverage reasons remain. No additional
chips, action record or accounting entry are created from this audit.

## Legality candidates and unchanged blockers

The full file does contain new candidates that the summary omitted:
`mR` changes 2 -> 4 at the hand boundary; `mAVTB` is 119 in registration,
87 at the SB turn, and 119 at the hero turn. The latter values equal the named
players' registration stacks. Their relationship to min raise-to, investment,
remaining chips and step/denomination is not proven by names or correlations.
There is no independently verified chip increment or control acceptance here.
Thus 2.5BB legality remains blocked; selected amounts and slider bounds are
still not proof. FOLD still does not require a raise-size certificate.

The observed connection is continuous; complete poker-action coverage, current
decision catch-up, reconnect recovery, universal deletion/merge rules, all-in,
side-pot/rake accounting and six-max semantics remain unproven. Global
`historyComplete=false` and every existing activation gate remain unchanged.

## Next capture

No repeat of hand 49 or any heads-up test is needed. The next **six-player
passive capture is still required**: registration, the natural new-hand boundary,
and every gC/rup through hero's first preflop decision, before acting, with six
actually dealt-in players. This is the smallest next sample for six-player
membership, ordering and action-window evidence. Use the existing raw recorder;
no special poker action is required. Any min/max/increment metadata present is
retained, but capture alone does not guarantee legality or completeness proof.
