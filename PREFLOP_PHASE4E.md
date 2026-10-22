# Phase 4E: source-verified UTG raise / HJ call / CO window

## Outcome

The existing source authority now certifies this closed six-player prefix:

`fresh hand -> UTG raises to 5 -> HJ activates -> HJ calls 5 -> CO activates`

It issues `coFacingOpenProof` with scope `co_facing_utg_open5_hj_call5` from
CO's own activation. This supplies context and bounded contribution facts,
not a CO recommendation or action permission. All unopened policies, BB
abstention and the Phase 4D HJ CALL authorization limits remain intact.

## Evidence and established facts

Principal evidence is hand 238, already sanitized in
`packages/browser-reader/src/fixtures/pokernow-hj-call-238.json`. All 16 fixture
envelopes were compared against the local capture: only table/hand/player IDs
and player names differ. No raw evidence is added to this commit.

The original dealer/seat cycle is BTN 3, SB 5, BB 9, UTG 10, HJ 1, CO 2.
Frame 12 establishes the new hand and ordinary SB1/BB2 contributions. The
remaining four frames are immediately consecutive in generation 1, with each
`pre` matching the prior `now`:

| Frame | Source fact | Local receipt time |
|---|---|---|
| 13 | UTG contribution 0 -> 5; highest wager 5; acting interval ends | 1792581149066 |
| 14 | Separate HJ activation, HJ contribution still 0 | 1792581149857 |
| 15 | HJ contribution 0 -> 5; other totals unchanged; acting interval ends | 1792581164663 |
| 16 | Separate CO activation; CO contribution still 0 | 1792581165464 |

The CALL matches the existing highest wager of five. It invests five without
increasing that highest wager, unlike UTG's raise from the forced highest two
to five. `cRPI=[UTG,HJ]` is retained as a closed-shape discriminator, never used
alone to infer aggression. Unknown fields, coalesced action/turn patches,
status changes, a different total or another actor are unsupported.

The screenshot/paired manual-action review from Phase 4D supplies the existing
empirical CALL semantics. This phase adds historical source recognition of
that action. It does not require or fabricate a within-deadline HJ control
observation for an action that the server actually accepted later.

## One source authority and one action representation

`projectFirstUtgSource` retains the complete closed hand-238 CALL patch in its
existing `bettingPatch` field. Raw shape is checked before projection, so an
unknown mutation cannot disappear. `advanceUtgState` and
`createFirstUtgSource` remain the only state and continuity authority.
Registration, source predecessor, local sequence, receive-time, generation,
hand and reset checks are unchanged.

`advanceFacingOpenWindow` is extended in place. Its pending prefix now retains
the original UTG transition, HJ activation and accepted HJ CALL. It only advances
after the existing reducer accepts the next consecutive update. Unsupported
updates destroy the prefix; reconnect/reset clears it. There is no new source
parser, second reducer, backfill validator or independent connection receipt.

`VerifiedBettingTransition` is the existing representation extended to a
closed discriminated union: the reviewed UTG raise and reviewed HJ call. Both
retain original roster, actor ID/seat/position, hand/table/generation, source
predecessor/cursor, local sequence/receipt, prior/new total, additional
investment and full raw patch with contract provenance. The CO proof contains
both transitions plus the separate HJ and CO activation patches.

The Phase 4D rule ID and stack coverage check are shared between historical
recognition and the dependent HJ permission producer. The exact starting tuple
remains UTG/HJ/CO/BTN/SB/BB = **265/253/240/244/254/246 chips** under PokerNow
0.1.72, six dealt-in players, normal no-ante 1/2 play-money Hold'em. Even another
sufficient deep stack does not match this CALL contract. HJ readiness, strategy
and permission are not transferred to CO.

## Bounded contribution accounting

The proof exposes per-player forced chips, accepted voluntary investment,
current street total and arithmetic remaining capacity:

| Position | Forced | Voluntary investment | Street total | Remaining capacity |
|---|---|---|---|---|
| UTG | 0 | 5 | 5 | 260 |
| HJ | 0 | 5 | 5 | 248 |
| CO | 0 | 0 | 0 | 240 |
| BTN | 0 | 0 | 0 | 244 |
| SB | 1 | 0 | 1 | 253 |
| BB | 2 | 0 | 2 | 244 |

The contribution sum is **13**, not a certified contestable pot. These facts
are a projection of the bounded prefix, not extra monetary-ledger entries;
neither wager is applied twice. Remaining capacity is starting source capacity
minus the proven street total, not a claimed observed post-call stack patch.
The live CO adapter additionally requires numeric DOM remaining stacks matching
UTG 260 and HJ 248. The captured source does not contain a separate HJ stack
decrement or a CO-browser DOM snapshot.

`contestablePotChips=null`, general accounting/pot/eligibility proofs remain
insufficient, and global `historyComplete=false`. Existing full ordered-street
rules/grid and whole-hand pot reconstruction requirements are untouched.
`historyCoverage=complete` in preflop context applies only to this exact closed
decision prefix, as in Phase 4A, and cannot satisfy generic complete history.

## CO context, freshness and activation

CO's source receipt is **1792581165464** and its deadline is
**1792581175464**. The deadline is exactly CO activation + 10,000 ms.
HJ's original deadline remains 1792581159857. Its accepted CALL occurred
14,806 ms after activation; retaining that historical fact does not renew HJ
advice. No CO certificate exists until the explicit frame-16 activation.

The CO getter checks its own clock interval, hand, generation and latest source
cursor. Every subsequent source update invalidates it, including an unchanged
actor update. Reconnect/reset, clock regression, exact expiry, source/DOM
contradictions and wrong identity/actor remove live context. DOM polls cannot
refresh it. The certificate participates in the existing proof-revision/epoch
path; the dependent CO diagnostic binds the current epoch and original expiry.
No CO provider request is issued, so a delayed provider cannot renew it.

`currentCoFacingOpen` uses the shared live cross-check, requiring a registered
CO hero, matching private cards, frozen original positions, all source totals,
ordinary numeric stacks and CO as the sole current actor. The unchanged HJ
observer capture certifies the public CO transition but cannot consume CO's
hero context. Tests simulate CO registration/private cards explicitly; this
is not a claim of a captured CO-browser session.

`buildLivePreflopContext` reuses the existing `facing_open_and_callers`
classification, with ordered raise and call entries. There is no opening/RFI
permission. The proof adapter exposes window/position/roster/capacity/call-gap
facts and an unsupported CO diagnostic, with no chosen action. Full legal
actions, 3-bet bounds/grid/rights, CALL permission and strategy remain unproven.
Matching CALL controls do not supply them. Unsupported CALL/3-BET never becomes
FOLD; no automated poker action is implemented.

Matching log rows may corroborate the two source actions. For this source-proven
zero-to-five call, a reported CALL5 agrees whether interpreted as total or
additional amount; the generic log amount semantics remain unspecified.
Wrong/duplicate/unknown actions and reversed or ambiguous order invalidate the
live context. Missing logs cannot mint or repair a source prefix.

## Remaining limitations and next useful expansion

Only this exact raise/turn/call/turn grammar is supported. Other stack tuples,
amounts, limps, folds in this response prefix, all-ins, extra callers, squeezes,
coalesced updates and further streets remain outside it. Private-card strategy
is not inferred from the manually played K7o. Historical receipt times are
kept distinct from opaque server cursor values.

For source tracking, the next useful expansion is one independently reviewed
**CO response -> BTN activation** transition appended to this same prefix,
using paired source evidence and exact amount/actor semantics. Do not infer a
CO CALL contract from HJ acceptance or expand stack coverage by capacity alone.
No manual poker action is requested or automated to obtain that evidence.

For advice, separately obtain a reviewed **CO-versus-UTG 2.5BB plus HJ caller**
response artifact with both opponent ranges, explicit stack/profile/rake/cEV
assumptions, allowed action tree, frequencies and sizes. Independently establish
any selected action's legality and model/accounting prerequisites, then bind
activation to the existing fresh CO window. HJ's missing response reference
remains a separate task; neither policy is supplied by this source work.

## Validation

- Targeted betting-window/CALL-control tests: **212 passed**, including **72 new
  source and production-overlay cases**.
- Typecheck passed after fixing a declaration export on the transition base.
- Full `npm test -- -- --maxWorkers=1`: **2,733 tests across 95 files passed**.
  Workspace totals: ai-core 491, browser-reader 1,944, opponent-db 41,
  poker-engine 101, range-engine 147, shared 9.
- `npm run build`, `npm run build:extension` and `git diff --check`: passed.
  Both checked-in extension bundles were rebuilt.
