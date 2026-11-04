# Game-state reducer P1

Run the private-capture replay and the independent synthetic rules tests from
the repository root with Node 22:

```powershell
node --experimental-strip-types prototypes/game-state-p1/run.mjs
node --experimental-strip-types --test prototypes/game-state-p1/*.test.mjs
node --experimental-strip-types prototypes/game-state-p1/report.mjs
```

The first two commands read the original JSON from ignored `evidence/` (or from
`P1_EVIDENCE_DIR`). The generated coverage report contains field names, shapes,
counts and replay outcomes only. Captured names, IDs, cards, raw messages, DOM
texts and screenshots remain local evidence. Node's TypeScript stripping flag
lets the isolated adapter reuse the production bounded dictionary merge and
typed profile validator without adding a dependency or changing production.

## Contracts

`source.mjs` accepts only registered and linked `gC` messages with a continuous
receipt sequence, stable connection generation, `pre === previous.now`, known
top-level fields, bounded nested dictionaries, known PokerNow version and empty
`eventsData`. It delegates scalar/array replacement, player-keyed merge and
`<D>` deletion handling to the existing bounded state reducer. The prototype
then checks player references, game/runout shape, chip units, stacks and
supported eligibility. It preserves the observed capture time, cursor and
identity alongside the bounded snapshot. An unknown field, broken predecessor,
bad generation or contradictory patch stops the replay; later patches cannot
repair it.

The normalized event contract is `HAND_START`, `ACTIVATE`, `FOLD`, `CHECK`,
`BET`, `RAISE`, `CALL`, `DEAL` and `SETTLEMENT`. Each accepted event carries the
source cursor and observed input facts. Events do not include raw socket data or
opponent cards. Actor evidence is either a direct activation, or for the
captured paid street boundary only, a single-use adjacent CALL bridge. The
bridge requires the same hero/hand/generation, exactly the next source sequence,
matching amounts, matching stack debits, and both receipt and source clocks
under 2 seconds. It supplies actor continuity only; it never renews the
10-second observation deadline or authorizes a live action.

`rules.mjs` consumes the same normalized amounts and actor order without knowing
about PokerNow messages or hand numbers. It enforces checks, folds, full bets,
full raises and calls, current actor, outstanding action, minimum raise,
chip stacks, and round closure. Its round order, current wager and contribution
ledger are separate from the captured wire state. `DEAL` requires a complete
closed prior round, board prefix, cleared contributions, conserved chip total,
pot increase equal to collected wagers, and matching stack debits.

The projected state separates source cursor, actor, board, pot, wager and stack
facts under `observedFacts`; current bet, payable call, gross displayed pot and
active player IDs appear under `derived`; unsupported completeness appears
under `unresolved`. It records target-hand actions from the
observed new-hand boundary, while marking earlier hands unresolved. It does
not fill missing action frames or treat a linked action prefix as a complete
match log. `actionPrefixComplete` means every target-hand action through this
captured checkpoint is accounted for; `historyComplete` deliberately remains
false because empty `eventsData` does not prove whole-hand completeness.
Observed stacks are remaining stacks after current-street wagers;
the source's pre-wager player balances and displayed wagers remain distinct.

## Evidence and coverage

`coverage-matrix.json` is a concise observed-field and shape census generated
from nine local recordings: 549 frames, 71 top-level gameplay/metadata fields
(player/card dictionaries summarized separately by the source validator), and
21 distinct envelope key shapes. It records JSON types and field names, not
values. Saved frames include description fields, nulls, deletion markers,
explicit and carried actors, and differing amounts/pot fields. The captures
come from one observed protocol version; this is not universal protocol
coverage.

| Hand | Captured target replay | Previous source window | Prototype result |
|---:|---|---|---|
| 435 | 62 frames, target starts at frame 46 | flop | flop, pot 13, call 4 |
| 459 | 77 frames, target starts at frame 61 | flop | flop, pot 13, call 4 |
| 465 | 78 frames, target starts at frame 56 | turn | turn, pot 21, call 4 |
| 471 | 78 frames, target starts at frame 56 | turn | turn, pot 21, call 4 |
| 477 | 46 frames, target starts at frame 24 | turn | turn, pot 21, call 4 |
| 482 | 67 frames, target starts at frame 43 | turn | turn, pot 21, call 4 |
| 493 | 28 frames, target starts at frame 6 | turn | turn, pot 21, call 4 |
| 499 | 81 frames, target starts at frame 59 | turn | turn, pot 21, call 4 |
| 511 | 32 frames, target starts at frame 2 | turn only; no river window | river, pot 29, call 4 |

The measurable capture change is Hand511: the existing bounded source reader
produces its turn window at frame 26 and does not produce a river window after
the frame 27 paid CALL, because frame 28 has no explicit `cPI`. This reducer
reconstructs the same actor from the immediate paid-call bridge and validates
the RIVER deal at frame 28. Its target sequence contains 14 observed actions:
4 folds, 1 raise, 3 calls, 3 checks and 3 bets. No action is fabricated for the
RIVER decision; frame 32 only establishes the actor and price.

The independent synthetic suite varies four bet amounts over two action orders
(eight passing combinations), plus raises, folds, checks, wrong actors,
under-minimum raises, short calls, all-in rejection, collection errors and
expiry. Those tests establish poker-rule behavior only; they are not counted as
wire coverage.

Hand511's paired export contains an actual saved DOM read. The prototype
cross-checks its CALL 4 and each active player's displayed remaining stack
against the source reconstruction. The repository's four-row sanitized `/log_v3`
fixture is from another hand and different time window, so it is not used as an
oracle here. No corresponding complete PokerNow hand log exists in the
available #511 evidence. Hands435/493/499 also have saved real DOM reads in the
existing replay infrastructure; the other captures do not. DOM agreement
checks display consistency, not authoritative history completeness.

## Acceptance and limits

The real-capture test file and synthetic rules test file remain separate. The
capture suite covers #511's paid TURN CALL to RIVER edge; all eight prior hands;
different captured action amounts/order; wrong actor, missing frame, changed
generation, changed hand/board, unrecognized financial field, wrong pot, wrong
stack, and expired bridge receipts/source clocks. Every rejection invalidates
the carried reducer state and rejects all subsequent patches. Source-output
states carry `liveAuthorized: false`.

Directly observed semantics are limited to the captured `0.1.72` chip games:
two through six seats, preflop blinds already present at the new-hand boundary,
fold/check/bet/full-raise/call, three community-card boundaries, collection,
the narrow paid-call bridge, and simple captured winner settlements. There is
not enough evidence here to claim general antes, changing blind structures,
side pots, rake, returned bets, all-in/short-call play, run-it-twice, rebuy,
multiway street strategy, or full PokerNow log completeness. These remain
unresolved and fail closed.

Existing project regressions were run with `npm.cmd test`; see the final report
for totals. No production source, strategy policy, ranges, live action gate,
extension bundle or package dependency was edited. No live browser connection,
network request or poker action was made.

**Recommendation: GO for the isolated offline reducer experiment.** It adds one
captured target-street transition (Hand511 RIVER) using shared amount/order
rules, while rejecting the tested contradictions. Keep the production reader
and recommendation authorization unchanged. Do not generalize the unsupported
protocol cases above without matching source and hand-log evidence.
