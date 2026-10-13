# PokerNow source metadata audit — 2026-10-09

For the subsequent roster/turn/`eventsData` investigation, see
[SOCKET_STATE_AUDIT.md](SOCKET_STATE_AUDIT.md). State-field names were reported,
but their raw contents were not retained by this metadata-only collector.
`socketStateEvidence` now makes that evidence boundary explicit; it grants no
activation certificate.

## Result and evidence boundary

**No available field or combination proves a complete ordered prefix through the
current decision. `historyComplete` remains false.** This audit does not change
strategy, policy activation, legality, pot semantics, accounting or settlement.

The repository contains one actual sanitized four-row `log_v3` JSON response:
`packages/browser-reader/src/fixtures/pokernow-log-v3-live.json`. Its only row
keys are `createdAt` and `msg`, in descending numeric timestamp order. There is
no enclosing metadata object, row ID, secondary index or watermark in that
capture. One response cannot establish monotonicity across responses, uniqueness,
pagination, tie order, revisions or current-decision catch-up.

`pokernow-source-contract-2026-10-08.json` records public-client inspection, not
raw wire frames. The socket frames in `timelineRuntime.test.ts` are synthetic.
The user verified source hand IDs/numbers and player-ID seat mapping live, but
no full raw consecutive socket envelopes or HTTP response headers were saved. The
closed return/settlement fixtures verify those specific formats/behaviors, not
source sequencing. They must not be rerun for this investigation.

**Follow-up passive capture completed (2026-10-09).** The user supplied eight
exact cursor values, reported exact predecessor equality throughout that one
connection, four exact log/socket timestamp matches, and HTTP/ETag observations.
These are saved as reported evidence in `packages/browser-reader/src/fixtures/pokernow-source-links-verified.json`.
It is not a fabricated raw envelope/response fixture. The former capture request
below is closed; no repeat is requested.

“Server-provided” below describes the field's wire origin where observed or
identified by source inspection. It does **not** mean server-authoritative proof
of log completeness. Page-world bridge data also remains untrusted input.

## Candidate inventory: origin, scope and authority

| Candidate | Origin and existing trace | Scope and authority |
| --- | --- | --- |
| Socket `hI` | `registered.gameState.hI`, `rup.hI`, `gC.hI`; absent delta values inherit prior identity locally. Live identity capture was reported working. | Source-reported hand identity within a table; not an event sequence. |
| Socket `gN` / log `#hand` text | Frame hand number becomes the local GET `hand_number` parameter; explicit start/end text is cross-checked against the requested number. | Source-reported table hand number. Request parameter is a local copy, not response coverage evidence. |
| Frame `id`, URL `gameID` / table path | Frame table ID is checked when present. Socket URL/table path selects the room; local timeline ID joins table + hand. | Table/game association; URL values and locally concatenated keys are not independent server certificates. |
| Frame `now` | Copied to the locally named `identity.frameCursor`; eight exact live values now reported. | Increasing within the observed connection; not a validated log-row cursor or timestamp unit. |
| Frame `pre` | Existing code compares it strictly with the previous frame's `now`; previously only derived `chainGap` survived. | Candidate predecessor reference for game updates. The comparison is local; no proof every action/log row corresponds to a frame. |
| Frame `r` / `registered`, `rup`, `gC` | Existing identity parser treats registered/rup or `gC.r === true` as full frames, otherwise a patch. | Snapshot/patch discriminator in current client contract; a state snapshot is not an event-history certificate. |
| Socket `42` framing, event name, wrapper length | Current decoder accepts the regular `42[event,payload]` event form for the three known events. | Transport/message classification. Repeated discriminator/length is not a source sequence. Other framing is unsupported, not silently interpreted. |
| Log `createdAt` | Actual live numeric strings are retained exactly as `sourceTimestampRaw`; the safe integer becomes candidate sort key. | Per-row timestamp within the requested response; global uniqueness, units and causal total order are unproven. |
| Log `msg`, embedded player ID and `#seat` | Actual log text; explicit player IDs map actors through `Player stacks:`. | Action/identity evidence. Player IDs/seats identify actors, not individual events. Amounts and text digits are not counters. |
| Log array index/length | Array order comes from the JSON response; numeric `responseIndex` is assigned by local enumeration. | Response-relative position/size, not a server absolute event index or total-hand count. |
| Client `after_at` | Source-inspection fixture identifies the client's timestamp filter. This reader deliberately requests full-hand refreshes without it. | Locally supplied request parameter; no captured response acknowledgment or coverage guarantee. |
| HTTP `Content-Length`, ETag | Size bound; user reports stable ETags on repeated responses until content changed. Exact header sets/ETag values were not supplied. | Response metadata/content validator, not log action count, ordered revision or catch-up acknowledgment. |
| Other HTTP headers / extra row, frame, envelope fields | Previously discarded or unrecorded. No actual ETag, revision, sequence, message/batch ID, offset, watermark or secondary-order field appears in the saved live fixture. | Unknown until captured. Test fields with these names are synthetic hypotheses, not discoveries. |
| Bridge `sequence`, socket `generation` | `eventSource.ts` increments these locally; ready messages can republish cached observations. New metadata messages have their own local sequence. | Local connection/bridge observations, never server action sequence. |
| Timeline `sequence`, event `id`, occurrence suffix, counters, timestamps | Generated during normalization, sorting/deduplication or DOM observation; `observedAt`/`receivedAt` use the local clock. | Presentation/observation bookkeeping. None is independent source metadata. `chainGap` is also locally derived. |

## Candidate behavior: monotonicity, gaps, duplicates, order and catch-up

| Candidate group | Monotonicity and meaningful gaps | Duplicates possible? | Can order equal-timestamp log rows? | Can certify catch-up? |
| --- | --- | --- | --- | --- |
| `hI`, table/player IDs, seats | Identity tokens have no demonstrated numeric ordering. | Yes: shared by many actions/frames. | No | No |
| `gN`, `#hand` | Reader rejects regressions and notices skipped numbers; this is a guard, not proof of upstream contiguity/reset semantics. A skipped hand number says nothing about missing rows in the current hand. | Yes within a hand. | No | No |
| `now/pre` | Live capture has seven exact increasing links after registration in one connection. Gaps/replay/regression fail the observational check; resets/reconnect recovery remain unproven. | Not ruled out; synthetic tests cover equality/regression. | No proven unique row key; four numeric correlations reported. | No complete-log/snapshot guarantee. |
| `r`, event/wrapper discriminator | Flags/categories are not monotonic counters. | Yes. | No | No |
| `createdAt` | The saved batch is newest-first numerically. Numerical gaps cannot identify missing actions. Later responses may backfill earlier rows; no uniqueness contract. | Yes on refresh; timestamp collisions remain possible/ambiguous. | No secondary field exists in the capture. | No |
| Array position/length | Relative to each response; reordering, insertions and omissions can change positions. | Positions recur across responses. | No established tie-order contract. | No |
| `after_at` | A query boundary, not evidence that earlier/same-key events were completely received. | Overlap/replay semantics unproven. | No | No |
| HTTP headers / undiscovered extra fields | ETag stability until content changes reported; no ordered revision/coverage contract. Other field semantics unavailable. | Stable ETags/repeated responses observed. | Unproven | Unproven |
| Local counters/IDs/clocks | Some counters increase locally; presentation sequence can change after insertion. Local gaps only describe this reader. | Cache replay/reset/re-enumeration possible. | No | No |

No proposed combination currently closes the gap. In particular,
`hI + gN + now/pre + createdAt + hand_start/end` identifies an associated hand
and candidate chronology but supplies no statement that all actions before a
particular current decision have been logged or delivered.

An adequate future proof would need a source-defined hand/epoch H, authoritative
event sequence or equivalent complete-prefix certificate through W, deterministic
ordering for ties, and an explicit relationship between W and the decision's
snapshot/version V. It must define pagination/exhaustion, revision/reset and
reconnect behavior. Then an H-scoped, gap-free prefix through W tied to V could
be checked. None of the saved evidence establishes those guarantees or that
these hypothetical fields exist.

## Metadata losses found and observational changes

- `identityFromSocketPacket` consumes `pre/r` but returns only cursor/derived
  identity fields; other wrapper/frame fields are ignored. The passive observer
  now inventories those boundaries independently before identity parsing.
- Cursor-only same-hand updates previously did not cross the page bridge. A
  separate `source_metadata` message now preserves sanitized observations on
  those updates without publishing extra identity changes. Initial/latest
  metadata are cached for the idle reader; replay retains local sequence IDs.
- `parseLogRows` deliberately returns only `{createdAt,msg}`. The adapter now
  inventories the original JSON before that normalization, including unknown
  top-level envelope fields even when the action parser rejects the envelope.
  No envelope is unwrapped or newly accepted as a hand log.
- HTTP header names and selected metadata values are now inventoried before
  body ingestion. Errors/unparsed bodies retain headers with
  `payloadKind: not_inspected`; no source rows are manufactured.

Find the output at
`handTimeline.sourceStatus.sourceMetadata` in the existing diagnostic snapshot.
It explicitly says `authority: observational_only`, `provesCompletePrefix: false`.
No field here updates source identity, coverage proof, accounting or requests.
`historyComplete`, `logContractVerified` and settlement completeness stay false.

The inventory records key/type information at known envelope, frame and row
boundaries. Bounded scalar values are allowed for known fields and explicit
metadata search terms (e.g. `sequence`, `revision`, `eventId`, `watermark`). This
is discovery by name, **not inference of field meaning**. Only the `meta`,
`metadata`, `pagination` and `coverage` containers are traversed, to two levels.
Unknown object interiors/values, player/card/token data, message contents and
cookie/auth header values are not copied. Other candidate header names appear
without their values pending evidence. Absence from this filtered inventory
does not prove absence in raw upstream data.

Retention is bounded: first received socket sample plus the latest 32 samples,
four HTTP responses, 32 sampled rows per response, 64 fields per inventory,
160 characters per scalar string, and two extra wrapper objects. Truncation,
row/response/sample counts and dropped samples are explicit. Array indexes,
connection generation and observation sequence are labeled as local. Numeric
comparisons neither convert timestamp units nor certify monotonic source order.
The original action parser, tie handling, deduplication and safety gates remain
unchanged. Synthetic tests verify the diagnostic boundaries, not server behavior.

## One narrowly targeted source-level capture

**Completed.** The instructions below are historical, not a repeat request.

The repository is sufficient to rule out a proof from the **currently captured
fields**, but insufficient to inspect raw live socket/header/extra-field
metadata. One passive metadata capture is warranted; no poker-hand test or
controlled betting/settlement sequence is requested.

Reload the rebuilt extension and refresh the PokerNow tab so the passive socket
observer attaches. Enable existing diagnostics with
`localStorage.setItem("poker-ai:diagnostics", "1")`. Let the existing reader
receive the initial metadata, a few naturally arriving `gC/rup` frames and two
automatic `log_v3` responses. Export **one**
`handTimeline.sourceStatus.sourceMetadata` object from the latest copyable
diagnostic snapshot, including `firstSocket`, `socket` and `logs`. Then remove
the diagnostic key. No action automation, extra endpoint or provider request is
added by this capture.

This provides actual wire-boundary field values/shapes for the next investigation.
It is not itself a complete-prefix certificate, and does not reopen the completed
uncalled-return, winner-settlement or player-seat mapping checks.

## Follow-up: connection continuity and timestamp correlation

The reported `now` chain is:

```
1791550069807 -> 1791550246565 -> 1791550293788 -> 1791550294653
-> 1791550298347 -> 1791550299157 -> 1791550302458 -> 1791550303264
```

Every observed gC `pre` exactly matched the preceding `now`. This supports a
**connection-local observed chain check**, not a completeness certificate.
`sourceMetadata.socketContinuity` now checks registration baseline, generation,
exact raw predecessor equality, increasing integer cursor and local observation
continuity. A mismatch/regression sets diagnostic `chainGap=true` and incomplete:
it could be a missed update, replay or out-of-order delivery, not necessarily a
missing poker action. A later full frame does not erase the issue. A repeated
pre/now pair is a duplicate *candidate*; without full-payload/event-ID evidence
it remains ambiguous/incomplete rather than counted as another linked update.
Cached bridge replays with the same local sequence are ignored.

Reconnect starts a new unknown generation and requires a new registration plus
subsequent links. A continuous new segment cannot bridge the old connection or
certify backfill. Mid-connection attachment, omitted metadata and unknown cursor
formats stay incomplete. All these new fields are diagnostics only; the existing
identity `chainGap`, timeline coverage and recommendation consumers are unchanged.

The four reported numeric matches are:

| socket now | log createdAt (original string) | Reported message description |
| --- | --- | --- |
| 1791550293788 | `179155029378800` | aizen calls 2 |
| 1791550298347 | `179155029834700` | aizemmmm calls 2 and goes all in |
| 1791550302458 | `179155030245800` | aizen23 checks |
| 1791550303264 | `179155030326400` | Flop [...] |

Log metadata now includes `timestampLinks`, with exact integer
`createdAt === now * 100` candidates, raw values, local observation references,
and same-key row counts. This uses integer arithmetic, not assumed time units.
Ties/repeated frames stay multiple candidates. The equality supports a source-link
hypothesis, not a unique causal identification: timestamp uniqueness, message
fan-out and shared clock/key semantics have not been established.

`socketHeadAtResponse` records the retained head when HTTP headers arrive.
`headTimestampObserved` says only whether a sampled row matches that head in the
same generation, considering only retained observations at/before that head.
It is a bounded presence/correlation check, **not a bounded completeness check**.
Its head is not the server's response watermark or the current decision version;
later updates do not retroactively change that reference. Non-matches can be
non-log updates, lag, retention loss or missing evidence. Matching the latest
cursor can still coexist with omitted earlier actions. No requirement is made
that every socket update produce a log row. Sample limits remain explicit;
hand association is not proven by numerical equality. `provesCurrentDecisionCatchUp`
is always false. Stable ETags are not a monotonic action sequence or a statement
that logging has caught up with game state.

This reduces uncertainty about observed connection-local linkage and discovers
a useful numerical correlation. It does not close the remaining proof gap:
source-defined complete action-to-log coverage (including non-log updates and
multi-row updates), unambiguous tie order, response exhaustion/revision/backfill
semantics, and an authoritative prefix boundary linked to the decision snapshot
are still missing. Neither another ordinary hand nor a repeat of this passive
capture alone can establish that contract. No additional live test is requested.
