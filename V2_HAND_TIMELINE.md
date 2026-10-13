# V2 Portion 1 — hand/event source

Latest scoped exception: [hand-53 first UTG](SOCKET_STATE_AUDIT.md) supplies a
separate, short-lived source-bound witness for six-max 100BB+ unopened FOLD.
The MAIN bridge now also forwards a bounded projection of the relevant roster,
hero's own visible cards, source stacks/configuration and hand-start fields.
Opponent card values, names, credentials and arbitrary event contents are not
forwarded. This does not convert the log/snapshot timeline into complete history
or change its accounting. `historyComplete=false` remains invariant. The
historical metadata-only limitations below still apply to general action windows;
the separate `sourceStatus.firstUtg` is the explicitly scoped exception.

## Architecture and evidence

The reader has a separate diagnostic hand timeline. Its connection/gap and source
revision information now feeds the [scoped decision gates](SCOPED_DECISION_PROOFS.md)
and request invalidation. Timeline events are not upgraded into certified betting
windows, ranges or accounting. All current pot/legality and Portion 9 model gates
remain conservative, and `historyComplete` remains false.

The subsequent [source metadata audit](SOURCE_METADATA_AUDIT.md) traces raw
socket/log fields and metadata discarded before parsing. Its bounded
`sourceStatus.sourceMetadata` inventory is observational only. No existing
field combination proves ordered-prefix coverage. The requested passive capture
has now been completed: eight reported socket cursors form an exact increasing
pre/now chain within one connection, and four log timestamps equal socket now
times 100. See the audit's follow-up for the evidence and remaining proof gap.
No repeat capture, normal-hand, return or settlement test is requested.

Inspection on 2026-10-08 found a stronger source than DOM deltas. The public
[PokerNow start-game page](https://www.pokernow.com/start-game) referenced
[this client bundle](https://cdn.pokernow.com/game.bundle-9f91bdafa0b201469fb7.js).
Its Session Log component requests `GET /api/games/{gameID}/log_v3` with a
`hand_number` query; responses are consumed as rows with `createdAt` and `msg`.
The same client receives `registered.gameState`, `rup` full frames and `gC`
patches, using `hI` and `gN` for hand identity/number and `now`/`pre` for frame
continuity. This was static public-code inspection, not access to the user's
running Chrome table. No table was created and no poker action was sent.

The source URL, digest and discovered fields are saved in
`packages/browser-reader/src/fixtures/pokernow-source-contract-2026-10-08.json`.
No upstream bundle was copied into the repository. Subsequent live validation
confirmed capture of source-reported hand IDs/numbers and supplied the sanitized
four-row `packages/browser-reader/src/fixtures/pokernow-log-v3-live.json` response.
The initial validator incorrectly required numeric `createdAt`; the live API
returned decimal strings, so every batch was rejected before accepting events.
The fixture also exposed the capitalized `Flop:` marker. Other payload tests
remain synthetic contract scenarios, not additional live evidence.
Further live validation supplied the exact `Player stacks:` row saved in
`packages/browser-reader/src/fixtures/pokernow-player-stacks-live.txt`. Its explicit
player IDs/seats matched simultaneous DOM seat/name observations, and the IDs
also matched the preceding hand. This verifies the observed mapping syntax;
it does not certify history completeness or move evidence between hands.
An exact uncalled-return message is now saved in
`packages/browser-reader/src/fixtures/pokernow-uncalled-return-live.txt`. Its
timestamp and surrounding complete hand were not supplied; test timestamps,
other amounts and settlement sequences are synthetic scaffolds.

1. **Passive metadata observer:** `eventSource.ts` runs in Chrome's MAIN world
   at `document_start`, using the manifest's supported
   [content-script execution settings](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts).
   A transparent WebSocket constructor wrapper adds incoming-message/close
   listeners only to same-host Socket.IO connections for the current `gameID`.
   It preserves constructor arguments, native instances, send behavior and
   unrelated connections. It never calls `send`, opens a socket or issues a
   PokerNow action. Only sanitized hand metadata and the current player's ID
   cross into the isolated reader; private cards, credentials and full frames
   are not forwarded. The idle reader requests the last cached metadata so it
   can attach after the initial page connection.
2. **Read-only server-log acquisition:** `liveTimeline.ts` uses the user's normal
   same-origin session to GET the current hand log, at most one in-flight request
   and no more than one every three seconds. Full-hand refreshes deliberately
   avoid the client's `after_at` optimization: equal timestamps/late rows must
   not be skipped. Requests have a 10-second timeout, bounded payload/row sizes
   and exponential failure backoff up to 60 seconds. Closing the source or
   changing the table route stops new requests. No keys/cookies are read or
   exported and there is no new relay endpoint or external upload.
3. **Timeline normalization:** `handTimeline.ts` retains source player IDs,
   original row text, raw timestamps, observation time and stable row identities.
   Overlapping refreshes deduplicate; late rows insert in timestamp order.
   Presentation sequence is explicitly not a server sequence. Equal timestamps,
   including repeated identical messages, remain separate ambiguous events.
   Unknown messages remain `unparsed`; they are not discarded or turned into
   guessed actions. Recognized check/bet/call/raise/fold/post/all-in, street,
   start/end, showdown and collection text is source-reported candidate evidence.
   Templates beyond the supplied sample still need live validation. Amounts retain reported
   values; only explicit `raises to` is labeled a total. Call/bet/post amount
   meaning and log units remain unverified. All-in retains its underlying wager.
4. **Separate DOM fallback:** existing `updateActionHistory` is reused with
   opt-in hero tracking and strict numeric/explicit-check contributions. Default
   behavior for V1 consumers is unchanged. The fallback preserves hero/opponent
   observations, folds/all-ins and seat departures/arrivals. Initial preflop
   chips are not fabricated into proven blinds: ambiguous changes are
   `wager_observed`. Prior actions are retained when a player leaves.
   Fold-flag transitions for the same identified occupant are retained even while
   the wager helper waits for a betting baseline. A fold spanning a street
   transition has `street: null`; snapshot ordering stays `observation_batch`.
   An already-folded baseline is `fold_observed` with unknown confidence/street,
   not an invented fold action at that moment. Replacement/departure and failed
   reads do not establish a fold transition. V1 action-history consumers are
   unchanged by this diagnostic-only correction.

## Completeness audit (2026-10-09)

**The available source cannot prove complete history through the current decision.**
The saved real `log_v3` response has only `createdAt` and `msg`; it has no source
event ID, contiguous sequence, complete-prefix certificate or caught-up watermark.
The inspected `after_at` parameter is a timestamp filter, not a proof of coverage.
Socket `now/pre` linkage is now supported for one captured connection, and four
`createdAt = now * 100` correlations were reported. These do not establish full log
row coverage. Hand IDs/numbers establish which hand was requested, not that the
response contains every event. Unique-looking timestamps or a start/end pair
do not establish that omitted actions never existed.

`sourceStatus.sourceMetadata.socketContinuity` exposes the connection-local
observational check, sticky mismatch/incomplete reasons and duplicate candidates.
It resets to unknown at a new generation; a new linked segment cannot certify
reconnect backfill. Response diagnostics include raw timestamp-link candidates,
the socket head observed at response headers and `headTimestampObserved`. This
last field is presence of a numerical correlation, not catch-up proof; log rows
may be absent for non-poker updates, and a matching head may omit earlier events.
Equal timestamps and repeated frames remain ambiguous. ETag stability/change
indicates response content behavior only. All diagnostics are separate from
existing identity/coverage logic, accounting and policy gates. `historyComplete`
and `provesCurrentDecisionCatchUp` remain false.

`handTimeline.current.coverage` and `handTimeline.sourceStatus.historyCoverage`
now expose structured diagnostics (also preserved on archived hands):

| Status | Meaning |
| --- | --- |
| `source_completeness_unproven` | No detected acquisition discontinuity, but no coverage/catch-up certificate. Includes a full synthetic start-to-end hand. |
| `partial_missing_hand_start` | Rows exist, but no start row has been observed. Mid-hand attachment, lag and omission cannot be distinguished. |
| `incomplete_gap_detected` | Observed response omission, rejected batch, acquisition/metadata failure, identity conflict or local retention loss. It does not assert a known number of missing poker actions. |
| `snapshot_only` | DOM fallback; polling cannot establish complete action coverage or source order. |

`ingestionStartedMidHand` stays `unknown`: the available metadata cannot prove
when attachment occurred relative to hand actions. A late start can change
missing-start coverage to source-unproven while preserving
`initialNonemptyBatchHadStart=false`. Observed discontinuities stay recorded
even after later successful refreshes; no validated recovery certificate exists.
There is intentionally no reachable `complete` status. `historyComplete` is
still the literal false, and no policy/strategy/pot/legality consumer is changed.

The coverage record includes first/last accepted times, the earliest candidate
event in the initial nonempty batch, greatest observed timestamp, retained
boundaries, ever-observed start/end flags, response order, overlap counts, late
earlier rows, same-batch identical occurrences, unparsed rows, tied timestamp
groups, unresolved actor seats, rejected batches and explicit issue reasons.
Boundary references within a timestamp tie are only representative rows, never
proof of first/last poker action. Original timestamp representation and source
text remain intact. Numeric ordering is candidate chronology without unit
conversion; equal keys retain ambiguous order/street attribution. Reversing or
reordering a response does not invent a new action sequence or a gap.

Refresh overlap is deduplicated using the existing hand/timestamp/text/occurrence
identity. Identical repeated rows in one batch remain separate ambiguous events.
Without authoritative IDs, identical actions arriving in different responses
cannot always be distinguished from retransmissions. Counters describe response
observations against retained identities, not unique lifetime action counts;
evicted rows can be recounted, with retention loss exposed. Coverage metadata
does not remove the existing 500-event limit or claim evicted events are present.

An omitted previously retained row is a detectable inconsistency, even though
the merge retains it. Empty/regressed non-overlapping responses flag a possible
reset or stale response, never an asserted reset or automatic history wipe.
Actions never received cannot be detected from numerical timestamp gaps. Unknown
messages remain `unparsed` with their original text and prevent complete action
interpretation. Actor seats still require the source ID mapping; DOM names are
not used to repair missing identities.

Schema rejection leaves accepted events/mapping/accounting unchanged, but now
records the reason, row index, batch size and a bounded sample of the rejected
row's `createdAt`/`msg`. Up to eight rejection records are retained; truncation
and discarded rejection-detail counts are explicit. No arbitrary extra payload
fields are copied. HTTP/JSON/network failures are separate acquisition failures,
not invented log rows. Both explicit start and end markers with a conflicting
hand number reject the batch. A delayed response only updates its requested
hand's coverage; it cannot populate the new hand's diagnostic state. Legacy
`reasons` remain historical notes; `coverage` gives the structured current view.

Reusing a retained old hand ID with a different hand number now rejects the
metadata instead of reviving and merging the archived timeline. An ID change
without a number advance keeps separate timelines and flags unproven
reset/replacement semantics. These checks affect diagnostic ingestion only.

### Exact missing proof and next evidence

A future source needs a validated per-hand sequence/unique event identity or an
equivalent authoritative complete-prefix guarantee, a deterministic tie-break,
and a watermark tied to the current decision proving every action through that
point is available. Pagination, revisions/resets and reconnect/backfill coverage
must also be defined. A complete-looking row array, stable repeated GETs, matching
Session Log or successful return/award arithmetic cannot supply these guarantees.

The repository evidence is sufficient to conclude that the current contract
does not provide this proof. **No additional live hand test is requested in
this pass.** The next useful evidence is an authoritative source contract or
previously unavailable sequencing/watermark metadata, not another ordinary hand
capture. Player-ID seat mapping, uncalled-return and winner-settlement validation
are closed; do not repeat those tests. The source timeline remains a diagnostic
alternative to inferred history, not a certified replacement for live policy.

## Identity, order and completeness

`createdAt` accepts canonical nonnegative decimal strings within JavaScript's
safe-integer range, plus the original safe-integer number form. Signs,
whitespace, exponents, fractions, leading zeroes (except `"0"`), overflow and
coercible objects are rejected. Existing message, row, response and retention
bounds remain. The entire batch validates before it mutates a timeline.

Each event preserves the original JSON timestamp as `sourceTimestampRaw`.
`sourceTimestamp` is its exact integer candidate ordering key. Neither field is
converted to a Date, scaled, or assigned milliseconds/microseconds/etc. The live
sample is newest-first; events are presented by ascending numeric key while ties
remain explicitly ambiguous. Stable presentation order within a tie is not
asserted as poker action order. Repeated identical rows in one response retain
occurrence identities; overlapping refreshes deduplicate and preserve first-seen
provenance. Unknown messages remain `unparsed`.

Server hand identity is `tableId:hand:hI`, with the reported hand number. A new
ID starts a separate timeline even if the visible cards are identical. A hand
number jump records missed hands rather than inventing their events. Old async
responses remain attached to their original hand, never the current one. An
explicit contradictory hand number in a start row rejects the batch.

Without metadata, identity is a session-local observation segment. Existing
board/dealer/card reset detection conservatively creates new segments. Temporary
missing hero cards alone do not reset them; failed reads break continuity. A
complete invisible same-card hand between identical polls cannot be detected.
Segments are not advertised as PokerNow hand IDs. Snapshot segments have no
verified association with server hands and are shown separately, not merged
with server rows or counted twice.

**`historyComplete` is always false in this portion.** The stronger source can
recover actions between polls, including multiple hero actions, but the inspected
client code does not provide a validated completeness contract or contiguous
action IDs/watermark. Timestamps can tie; responses may lag, omit rows or be
truncated; the end/collection text does not certify all awards/returns. Source
frame predecessor checks are metadata diagnostics, not a complete action stream.
Page-world messages are untrusted diagnostic input, not an authority to unlock
policy. No setting or message can switch completeness or legality to true.

Log player IDs are preserved even when the player departs. Hero is identified
only by a match with `registered.currentPlayer.id`; duplicate display names do
not establish identity. `playerSeatMapping.ts` parses explicit
`#seat "name @ playerId" (stack)` entries in `Player stacks:` rows, bounded to the
existing reader's 1..10 seats. Malformed entries, duplicate seats and duplicate
player IDs reject the whole row. Stack text remains evidence only; this parser
does not replace live stack parsing or any monetary calculation.

Each hand exposes `seatMapping` with `unknown`, `source_reported` or `invalid`
status, ID/seat entries, source text/raw timestamps/event IDs, and failure reasons.
Recognized rows become `player_stacks` events. A subsequent actor receives a seat
only by exact player-ID match and a strictly later numeric timestamp, with
`actorSeatMappingEventId` linking the proof. Earlier or tied actors stay unmapped;
a late-arriving earlier matching row can supply earlier evidence. Names never
identify a player or assign a server seat. The existing DOM diagnostics provide
a manual cross-check only, not an automatic source or identity override.

Omitted, folded and departed players retain their mappings for that hand. A
contradictory ID/seat assignment or malformed mapping row permanently invalidates
that hand's mapping and clears all assigned server actor seats. Historical
entries and evidence remain for audit and must not be used when invalid. A new
hand starts unknown and requires its own source row. Mapping evidence survives
timeline event eviction, with a separate 32-row bound; reaching that bound with
additional evidence also invalidates the mapping explicitly. Identical response
refreshes do not consume additional evidence slots.

`sourceStatus.actorSeatMapping` now exposes the structured mapping/status instead
of a blanket unknown warning. It does not change `logContractVerified` or any
policy gate. DOM arrival/departure means an occupancy change, not proof of
joining/exiting the current hand. Snapshot order remains observation-batch order.

Retention is bounded to 500 events per timeline, current plus three archived
server hands, and three archived fallback segments. Truncation remains explicit;
the log dropped-event count is a lower bound. On hand change the old hand is
queued for one final log refresh, but delayed settlement and several hands
completed during disconnection can still be missed. There is no disk persistence
or guaranteed backfill in this portion. Refreshing loses locally retained rows;
the current hand can be reacquired if the server returns them.

## Diagnostics and required live capture before Portion 2

### Explicit uncalled returns and separate accounting

The parser recognizes only the whole-message grammar
`Uncalled bet of X returned to "name @ playerId"`, with a bounded positive
decimal amount. Unsupported wording, malformed/unsafe amounts and extra text
stay `unparsed`. Recognized rows become `uncalled_return`, with
`amountMeaning: return_reported` and no wager action or raise-to. Original text
and raw timestamps remain intact. Player ID supplies identity; the existing
per-hand mapping supplies the seat. Unknown/conflicting mappings retain the
return event but withhold an accounting effect.

`handTimeline.current.accounting` (also on archived hands) reports retained
return/award observations and their provenance. A mapped, unambiguous return has
`effectIfIndependentlyComplete` of gross delta 0, returned delta +X, net delta -X,
award delta 0. A collection has award delta +X and does not reduce commitments.
These are conditional effects, not applied live mutations. Live `status` remains
`incomplete` and `totals` remains null: an observed return does not establish
gross commitments, all returns, award eligibility or final settlement. Timestamp
ties are unresolved, and truncation/unparsed rows remain explicit limitations.

`reconcileCompleteHandAccounting()` is a separate pure arithmetic function for
an **independently supplied complete ledger**, never called by the live adapter.
It requires gross commitments before returns, an explicit gross basis, complete
adjustments, player-ID/seat provenance, verified chip units/no-rake evidence, and
reconciliation with independently supplied main/total displays. It computes:

- Gross committed: total chips committed before explicit returns.
- Returned uncalled: distinct explicit return amounts by player ID.
- Net committed: gross minus returned, exactly once.
- Pot awards: separate collection amounts, not returns or negative wagers.
- Folded dead money: folded players' net commitments; still part of net pot
  money, not another addition or subtraction and not eligibility to win.
- Outstanding pot: net commitments minus awards already distributed.

The calculation rebuilds from immutable gross inputs, deduplicates event IDs,
rejects conflicting duplicates/cross-hand or unresolved entries, and uses integer
chip units. Already-net contribution inputs are not an accepted basis. Supplied
`netStreetContribution` is explicitly already net and is never reduced again.
Before any awards, a successful result can provide the existing
`ContributionLedger` with net `committed` values; the existing contestable-pot
proof and all its gates are unchanged. Once awards start, no decision-pot ledger
is emitted. Historical net commitments and folded dead money stay distinct from
the remaining pot. Neither a complete arithmetic fixture nor an end-of-hand row
upgrades live `historyComplete`, settlement completeness or Portion 9 activation.

### Historical source-validation checklist

This checklist records earlier investigation steps, not a request to repeat
the closed tests. The completeness audit above defines the remaining blocker.

1. Run `npm run build:extension`, reload the extension in `chrome://extensions`,
   then **refresh the PokerNow tab**. Reloading just the extension cannot observe
   an existing socket. Both generated JS files must be present.
2. Use `localStorage.setItem("poker-ai:diagnostics", "once")` in the table console
   (or `"1"` for changed snapshots). Inspect `handTimeline.current`,
   `snapshotFallback`, `archivedHands` and `sourceStatus`. Diagnostics remain
   opt-in; collection does not depend on enabling console logging.
3. Verify the reported hand number/ID across two hands, including a preflop-only
   hand. Compare hero's source ID and each log actor with the table. Save a
   sanitized initial `registered` metadata sample and the actual GET response
   including its raw `createdAt`/`msg` rows. Do not share authentication tokens,
   cookies or unrevealed private-card payloads.
4. Capture forced posts, hero and opponent checks/bets/calls/raises/folds,
   rapid consecutive actions, an all-in, every street boundary and showdown/
   collection. Compare PokerNow's own visible Session Log against the complete
   fetched row array, not just the latest DOM contributions. Preserve exact
   unknown message wording and verify amounts as chips/additional/raise-to.
5. Capture disconnect/reconnect or a missed observation window. Establish whether
   a full-hand GET really contains every prior action, whether any pagination or
   truncation applies, how equal timestamps are ordered, and what confirms that
   a response has caught up to the current decision. Compare end-of-hand rows
   before/after all awards and returns; an ending row alone is insufficient.
6. Compare `Player stacks:` ID/seat evidence with simultaneous DOM seats and
   subsequent actor seats. Inspect retained mappings after folds/departures;
   unsupported/missing mappings correctly leave server seats null. Confirm
   unknown/failed sources remain incomplete and the overlay remains BLOCKED.

If sourceStatus stays waiting, capture the real socket event names and sanitized
metadata fields; the observed public bundle may differ from the table version.
If GET returns 401/403/429 or a different schema, save status and sanitized shape;
the adapter backs off rather than bypassing access controls or inventing rows.

Portion 2 still needs live source-contract validation, complete catch-up evidence,
and accounting/legality integration. The observed seat-mapping source is supported;
unsupported or contradictory mappings still fail closed. This portion is a stronger
read-only capture layer, not a claim that complete hand history is solved.

## Targeted rerun after the live schema/fold correction

Reload the rebuilt extension and refresh the game tab. Enable diagnostics with
`localStorage.setItem("poker-ai:diagnostics", "1")`; remove that key afterward.

1. **Log acquisition:** wait for a successful refresh. Confirm
   `sourceStatus.lastSuccess` becomes non-null, `current.events` fills, and the
   schema rejection no longer recurs. Compare API `createdAt` strings with
   `sourceTimestampRaw`, chronological numeric keys, and `Flop:` street events.
   Events preceding a missing street/start marker may correctly have null street.
2. **Test 3 — hero fold:** capture before/after snapshots including a street
   transition or pending betting baseline if that was present. Confirm the server
   log contains hero's fold (identity matched by source player ID) and the DOM
   fallback retains a visible false-to-true fold once. A baseline already showing
   folded is `fold_observed`; a fold crossing streets has unknown street. If the
   fold occurred entirely between reads, no complete DOM sequence is claimed.
3. **Test 5 — rapid actions/opponent fold:** compare the complete received log
   batch with the visible Session Log. The fallback must retain observed folds
   and earlier events when the player leaves, while unresolved wager changes
   remain observations rather than invented bets/calls/raises.
4. **Overlap and hand change:** allow several refreshes of one hand, then start
   the next. Confirm rows do not multiply, old rows remain with their original
   hand, and hand identity still advances. If real timestamp ties occur, capture
   them and confirm `order: ambiguous`; do not infer a tie-break from array order.

For all reruns, `historyComplete`, `logContractVerified` and Portion 9 activation
must remain false/blocked. This correction does not change decisionPot, strategy
or legality activation. The missing full Test 3/5 DOM snapshots mean the fixed
code paths are reproducible causes, not proof of the exact original live path.

## Closed live Player stacks validation

The user confirmed source-reported `Player stacks:` mapping by player ID as
live-verified before this completeness audit. Seats/names matched the simultaneous
DOM cross-check, and the IDs also matched the preceding hand. Mapping remains
hand-local and source-ID based. This validates the observed mapping behavior,
not complete ordered history. No repeat mapping test is requested.

## Passed live uncalled-return validation (2026-10-08)

The controlled live test PASSED: aizen23 bet 4, aizen and aizemmmm folded,
PokerNow returned 4 to aizen23, then aizen23 collected 6 from the pot. The timeline
identified the return by player ID `OoArqYL22g`, mapped seat 3, and preserved
original source text/timestamp. Its conditional `returnedUncalledDelta` was +4
and `netCommittedDelta` was -4. Collection remained a distinct `pot_award` with
`potAwardsDelta: 6`. These observed parsing, identity and conditional accounting
behaviors are live verified. **Do not repeat this completed test.**

The human-reported sequence is saved in
`packages/browser-reader/src/fixtures/pokernow-return-settlement-verified.json`.
Its test reconstruction uses synthetic timestamps and mapping scaffolding, not
a fabricated complete live response. This does not certify a complete gross/net
ledger, side pots, rake/drop, eligibility or all settlement rows. Live accounting
totals remain null, `historyComplete=false`, and no Portion 9 gate is relaxed.

### Winner stack display correction

The supplied exact stack DOM is saved in `pokernow-winner-stacks-live.json`.
PokerNow renders the displayed base 47 in the direct `.chips-value` child and
the temporary +6 inside `.table-player-stack-prize`. A broad `.normal-value`
lookup incorrectly treated them as duplicate stack values. The reader now
validates the separate structure and records the base/prize independently in
`evidence.seatEvidence[].stackDisplay`; raw `stackText` is 47. Arbitrary multiple
values, extra wrappers/text, duplicate nodes/containers or unsupported prize
syntax still fail closed. Ordinary single numeric values, zero and explicit
`All In` retain their existing meanings.

The public client rendering confirms the base is displayed before the award is
applied to that component (source/hash in the fixture README). Neither the base
alone nor a locally synthesized base-plus-prize is trusted as a final remaining
stack. A prize marker or winner class sets `isSettling`; derived `stack` remains
null and confidence is low until a stable ordinary display returns. This also
guards stale turn markers at settlement. No DOM prize becomes a ledger event:
only source-log collections feed the existing conditional award observations.

### Passed live winner-settlement validation (2026-10-08)

The follow-up live check PASSED. During settlement, aizen23 displayed base 45
and prize +24. Diagnostics reported `settlement_display`, `isSettling=true`,
and usable `stack=null`. After the next hand started, the ordinary stack read
69, `isSettling=false`, with no prize element. No duplicate-stack error or
prize double-counting was observed.

This confirms the observed display separation and recovery to an ordinary
numeric stack; 69 was read from the next-hand display, not synthesized by
adding the prize in the parser. The user-reported evidence is saved in
`packages/browser-reader/src/fixtures/pokernow-winner-settlement-verified.json`.
No new raw DOM, timestamps or complete hand ledger accompanied this result.

Both the winner-settlement and uncalled-return checks are complete; **no repeat
of either test is needed**. This scoped result does not certify whole-hand
accounting, side pots, rake/drop or complete history. `historyComplete=false`
and existing Portion 9 activation requirements remain unchanged.
## Socket-state follow-up

The roster/turn/`eventsData` investigation is recorded in
[SOCKET_STATE_AUDIT.md](SOCKET_STATE_AUDIT.md). Existing socket metadata retains
candidate field names/types, not their nested values. No state/event semantics
or completeness is inferred from abbreviations or cursor linkage. One raw
state sequence (not another metadata-only export) is needed to inspect them.
Strategy and all activation/safety gates remain unchanged in that investigation.
