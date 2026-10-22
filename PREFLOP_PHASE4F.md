# Phase 4F: CO-to-BTN evidence boundary

## Outcome

Audited starting HEAD `2418575` and the Phase 4E implementation. **No new action
transition is certified. BTN response activation is not supported.** The saved
evidence ends before the required CO response, so this phase stops that
activation as required. The existing certified sequence remains:

`UTG RAISE to 5 -> HJ activation -> HJ CALL 5 -> CO activation`

Only regression tests and this report change. The production reducer, projector,
source authority, action union, certificates, proof adapters and strategy gates
remain unchanged. There is no new continuity validator or speculative CO action
contract. Existing unopened UTG/HJ/CO/BTN/SB behavior remains separate.

## Saved evidence inspected

Inspected all local JSON/text captures and diagnostics under `evidence/`, the
tracked source fixtures and their provenance, and the paired HJ screenshot.
Raw evidence stays ignored and is excluded from the commit.

| Evidence | Finding relevant to this extension |
|---|---|
| `hj-call-238.json` | 16 envelopes, generation 1, registration captured, zero rejected frames; export stopped immediately after CO activation. No frame 17 or later. |
| `hj-call-238.png.png` | HJ browser before its call, with K7o and CALL5 visible. No CO response or BTN activation. |
| `raise-5-accepted.json` | 68 envelopes, hands 164-169. Hand169 frames 66/67 are UTG open5/HJ turn; frame 68 is an empty non-action update. No HJ call or subsequent CO response. |
| `raise-sizing-paired.json` | 107 raw envelopes, hands 142-151. Unopened fold/turn sequences, including CO folds followed by BTN turns; no voluntary wager patch. These are not responses to an UTG raise plus HJ caller. |
| `sb-raise-5-capture.json`, `sb-raise-224.json` | 12 envelopes each, hands 212/224. Four folds, SB raise to five, BB turn. Different prefix and actors. |
| Hand49/53/68 raw captures | Respectively a three-player SB completion/BB turn, or a six-player fresh UTG boundary; no required prefix. |
| Hand56/62/68/80/103/115/121/127/133 diagnostics | No required prefix. Hand56's archived hand53 contains preflop calls of two and turn wagers; these cannot establish the requested CO response. Other inspected retained source projections have no qualifying voluntary wagers. |
| Tracked source fixtures | Existing sanitized subsets/replays of these captures, including unopened BTN hands 148/166. None extends hand238 beyond frame16. |

All 16 hand238 fixture envelopes were compared again against the local raw
capture with only table/hand/player IDs and player names substituted: exact
structural equality. No receipt, source cursor, contribution, card, generation
or action was changed in this comparison.

The actual hand238 sequence is:

| Frame | Observed source fact | `pre` | `now` | Local receipt |
|---|---|---|---|---|
| 12 | Fresh hand238, UTG active, SB1/BB2 | 1792581134966 | 1792581137163 | 1792581135072 |
| 13 | UTG total 0 -> 5; highest wager 2 -> 5; acting interval ends | 1792581137163 | 1792581151172 | 1792581149066 |
| 14 | HJ activates, total still zero | 1792581151172 | 1792581151977 | 1792581149857 |
| 15 | HJ total 0 -> 5, highest remains five; acting interval ends | 1792581151977 | 1792581166774 | 1792581164663 |
| 16 | CO activates, total still zero | 1792581166774 | 1792581167582 | 1792581165464 |

These are consecutive local sequences in the same generation with matching
source predecessors. Frame16 changes `cPI`/`pITT` to CO and contains no `tB` or
`pGS` action patch. It proves CO's turn, not a call, fold, raise or next actor.
No independent CO response semantics can be established from these files.

The original positions remain BTN3/SB5/BB9/UTG10/HJ1/CO2. Starting capacities
UTG/HJ/CO/BTN/SB/BB remain 265/253/240/244/254/246. At the final observed frame,
contributions in that order are 5/5/0/0/1/2. Their sum of 13 is arithmetic only;
`contestablePotChips=null`, general pot/accounting/eligibility proofs remain
insufficient, and `historyComplete=false`. All stack restrictions remain.

CO's original receipt/deadline remain 1792581165464/1792581175464. There is no
BTN activation receipt from which to issue an original ten-second BTN window.
CO's deadline cannot be reused or renewed to manufacture one.

## Smallest missing capture

If an original continuation of this exact recording exists, the smallest
addition is the **complete unmodified CO response update and immediately
following explicit BTN activation**, including every intervening source frame.
The first additional envelope must be local sequence 17, generation 1, linked
to source cursor `1792581167582`; preserve actual receipt times and all raw fields.
Retain enough paired source/log/UI evidence to independently identify the actual
CO action and its prior/new contribution, without inferring it from BTN's turn.
Do not relabel another action, splice another hand, repair cursors or fabricate
missing envelopes. A coalesced or otherwise ambiguous shape needs separate review.

If that original continuation was never saved, a later isolated BTN snapshot
cannot repair it. The minimum replacement is a continuous registered capture
through a fresh six-player boundary, UTG open5, HJ turn/call5, CO turn/actual
response and BTN turn, with the source identity, profile, roster, capacities,
generation, order and receipt times retained. Different stack coverage requires
its own review. A BTN-browser private-card/DOM observation would additionally be
needed to validate live consumption; the HJ recording is public-prefix evidence
only. This report does not request or automate poker actions to obtain evidence.

## Tests and remaining gates

Added 17 regression cases in `bettingWindow.test.ts` using the existing production
projector/source and MAIN bridge -> runtime -> context/proofs -> overlay path:

- Positive control: unchanged recorded hand238 public envelopes certify only
  UTG raise/HJ call/CO activation; no third action or BTN opening certificate.
- Eight explicitly synthetic negative tails: actor-only, guessed CO call,
  guessed fold, guessed raise, coalesced action/turn, reordered updates, unknown
  update and reconnect. Existing CO proof invalidates; no response or BTN
  opening certificate appears.
- The same eight tails through an explicitly simulated BTN browser, including
  simulated registration/private cards, matching original seats/contributions,
  BTN acting DOM and CALL5 control. No source window, opening fallback, response
  recommendation, provider request or socket action is produced.

Synthetic tails are adversarial inputs, not evidence that CO took an action.
There is deliberately no positive CO-response/BTN-response certificate test:
no real recording supports one. Existing Phase 4E positive/negative tests and
the unopened BTN tests remain part of the full regression suite.

Even after source evidence becomes available, BTN advice needs an independently
reviewed response strategy for the actual resulting tree, opponent ranges and
stack/profile assumptions, plus independent selected-action legality, current
controls, raise bounds/grid/rights where relevant, and required pot/accounting
proofs. HJ's empirical CALL rule is not transferred to CO or BTN. Missing CALL
or raise support cannot substitute a FOLD recommendation.

## Validation

- Targeted `bettingWindow.test.ts`: **209 passed**, including **17 new cases**.
- Full `npm test -- -- --maxWorkers=1`: **2,750 tests across 95 files passed**.
  Workspace totals: ai-core 491, browser-reader 1,961, opponent-db 41,
  poker-engine 101, range-engine 147, shared 9.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run build:extension`: passed. Both checked-in extension bundles were
  rebuilt and are unchanged, as expected for this tests/documentation change.
- `git diff --check` and staged diff whitespace check: passed.
