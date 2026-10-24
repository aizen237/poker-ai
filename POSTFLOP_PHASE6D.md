# Phase 6D: hand243 source contribution accounting

Implemented from HEAD `cea82a5` on 2026-10-24. `git fetch origin`
confirmed that local HEAD contains the remote history. Reviewed Phase6B/6C,
the source projector/reducer and dependent observers, preflop source accounting,
`handAccounting.ts`, `legalityProof.ts`, `potSemantics.ts`, the raw hand243
capture and its screenshot.

**The recording certifies a bounded contribution prefix: 12 preflop chips,
an explicit flop reset, then 6 flop chips before hero and 8 after hero CALL2.
Cumulative observed investments are 18 before hero and 20 after hero. No
independently proven contestable-pot amount follows.** Whole-hand history,
net commitments, returns/rake and live postflop advice remain unverified.

## Evidence audit

Originals were only read and are excluded from the commit. The screenshot's
actual filename has two `.png` suffixes.

| Evidence | SHA-256 |
| --- | --- |
| `evidence/flop-hand-243-raw.json` | `d6079e294273287ec04f088653c8b32434b608ecce3098105918c4d1d96e5270` |
| `evidence/flop-hand-243-before.png.png` | `e9c8ce8dd0c80c7297c2b34b55993a665a6e2d267344550e9b62e4f41e6592be` |

Repeated the duplicate-key and exact-safe-integer audit. There are 22 frames,
all generation1, sequences1-22, strictly increasing local receipts/cursors,
and every predecessor matches the previous cursor. Substituting only table,
hand and player IDs and player names reproduces the existing sanitized fixture
exactly, including capture metadata. The fixture needed no changes.

Recorder metadata still reports registration captured, zero rejected frames,
11,091 source / 9,958 JSON retained characters, and manual stop/export under
the 500-frame / 4,194,304-character caps. This verifies the retained prefix,
not complete delivery or whole-hand/log coverage.

Registration is settled hand242. Hand243 begins at frame2 with its own frozen
six-player roster, HJ hero, SB1/BB2 and no ante. No hand239 values are spliced
in. Ordinary boundary stacks are BTN240/SB255/BB248/UTG268/HJ256/CO235.

## Independently reconstructed contributions

All amounts below are chips. Cumulative investment means the sum of observed
forced posts and positive contribution increases since this hand boundary;
it is not a net outstanding commitment after returns or a pot entitlement.

| Position / alias | Forced preflop | Additional preflop | Preflop total | Flop before hero / after hero | Cumulative after hero |
| --- | ---: | ---: | ---: | ---: | ---: |
| BTN / PLAYER_3 | 0 | 2 | 2 | 0 / 0 | 2 |
| SB / PLAYER_5 | 1 | 1 | 2 | 2 / 2 | 4 |
| BB / PLAYER_9 | 2 | 0 | 2 | 2 / 2 | 4 |
| UTG / PLAYER_10 | 0 | 2 | 2 | 2 / 2 | 4 |
| HJ hero / PLAYER_1 | 0 | 2 | 2 | 0 / 2 | 4 |
| CO / PLAYER_2 | 0 | 2 | 2 | 0 / 0 | 2 |
| Sum | 3 | 9 | 12 | 6 / 8 | 20 |

- Frame2 supplies the two forced totals, not two additional voluntary actions.
  Frames3/5/7/9 observe UTG/HJ/CO/BTN increasing 0 to2. Frame11 observes SB
  increasing 1 to2, so its additional investment is1, not2. Frame13 is the
  explicit BB check; it adds zero to the existing BB2.
- Frame14 deletes all six totals2, resets the street discriminators, deals
  `6h Qh 3s` and activates SB. All six ordinary stacks explicitly fall by2:
  BTN238/SB253/BB246/UTG266/HJ254/CO233. Source `pot=12` agrees with the sum
  of the cleared contributions. The empty carried `tB` establishes a zero
  flop baseline only inside this validated reset. Preflop investments survive
  in the accounting; deletion is neither a refund nor a second investment.
- Frames15/17/19 add2 each for SB/BB/UTG. Frame20 activates hero with zero
  flop contribution: flop total6, cumulative investments18. Frame21's already
  certified historical CALL2 adds2 for hero: flop total8, cumulative20.
- Frame22 explicitly activates CO and changes no contribution. Accounting
  values stay identical to frame21. There is no frame23 and no actual CO
  response, second flop collection, later stack settlement or later street.

The five preflop increases are retained with their original sequence, actor,
prior/new total and local receipt; the existing flop observations retain the
four later increases. Arithmetic sums these observations and the original
forced posts, then cross-checks the result against the cleared preflop map,
the observed collection stacks and the current reducer's flop totals.

Ordinary source stacks remain unchanged after frame14. For example, hero's
ordinary source stack remains254 after CALL2; 252 is only the arithmetic
remaining capacity (254 minus the outstanding flop2). Similarly SB253,
BB246 and UTG266 remain source observations while 251/244/264 are arithmetic
capacities. The implementation exposes both meanings separately and never
deducts preflop2 again from an already collected stack.

## Display values and unproven pot accounting

`sourcePot` retains value12 and its actual frame14 cursor/receipt. Subsequent
closed patches contain no pot update. `sourcePotPlusStreetChips` explicitly
labels addition only: 12 at transition, 18 at hero activation, 20 after CALL2
and at CO activation. It is not an independently read displayed-total field.

The screenshot visually shows main12 / total18 and CALL2 before hero responds.
It lacks an authoritative local observation receipt paired with recorder
status, enabled/visibility DOM attributes, and an after-action image. Its
display agrees with the pre-call source arithmetic but cannot be attached to
a specific source frame or decision window. No displayed total20 is invented.
`displayedTotalPotChips` remains null in the source-only accounting.

`contestablePotChips`, `netCommittedChips`, `returnedUncalledChips`,
`rakeOrDropChips` and `potLedger` all remain null. No return row is not proof
of zero returns; equal contributions and a matching display do not prove
eligibility or the absence of other accounting adjustments. No numeric
contestable amount, including12, is certified by this phase.

## Implementation and rejection boundaries

The sole state and continuity authority remains
`eventSource -> projectFirstUtgSource -> createFirstUtgSource -> advanceUtgState`.
`advanceFlopWindow` uses its existing hand243 contract, original roster,
ordered-step/raw-shape checks and carried state. There is no new reducer,
bootstrap, action-history importer, timer or decision adapter.

`FlopContributionAccounting` reuses `CoFacingOpenProof["accounting"]` for each
street, including forced/voluntary/street totals and explicitly arithmetic
remaining capacity. It follows the existing accounting distinction between
gross contributions and independently complete net adjustments. It cannot
satisfy `GrossHandLedger`/`ContributionLedger` complete-hand/no-rake contracts;
neither `reconcileCompleteHandAccounting` nor `proveContestablePot` is invoked.

An additional closed raw hand243 boundary gate rejects unknown fields before
projection can discard them, including injected returns/pots or nested card
adjustments. It checks the observed activation/capacity discriminators too.
Failure omits the new accounting only; existing preflop and Phase6C contracts
are unchanged. Dependent steps retain the existing closed raw shapes. Missing
actions, changed amounts, incomplete resets, incompatible collection stacks,
pot contradictions, all-ins, side-pot fields, unknown returns, extra boards,
reconnects, receipt regressions and unsupported updates cannot produce or
resume accounting. Blind and preflop facts are checked by the original anchor
and the entire supported prefix, never inferred from a later pot snapshot.

The optional `accounting` member is attached to the existing proofs at
frames14/20/21/22 and appears through the same timeline diagnostic fields.
There is no independently cached accounting certificate. Reads use the
existing defensive copies and cursor/hand/generation bindings. The original
hero expiry remains **1792832970591**, exactly 10,000ms after frame20 receipt.
Frame21 arrives 3,018ms after that deadline; historical accounting does not
revive the opportunity. Frame22 creates no decision proof. Reset/disconnect
and any unsupported next message clear the enclosing proof and its accounting.

All enclosing proofs retain `historyComplete=false`,
`liveRecommendationsAllowed=false`, and null legal actions, payable-CALL and
contestable-pot facts. The original source-backed historical CALL2 acceptance
remains a separate Phase6C semantic contract. Contribution arithmetic is not
a new general CALL classifier or permission. Live recommendation blockers,
provider behavior and assisted-only operation are unchanged.

## Exact missing evidence for broader certification

1. The capture stops at CO activation. Continuous source envelopes for CO/BTN
   responses and all subsequent actions, collections, returns and settlement
   are missing; they cannot be reconstructed from frame22 or the screenshot.
2. There is no independently verified complete net adjustment ledger for this
   hand/decision, including uncalled returns and rake/drop (or evidence
   excluding them). A zero-return/zero-rake assumption cannot fill that gap.
3. There is no supported source contract for side-pot amounts, layer eligibility,
   all-ins or entitlement/settlement. Observed equal investments do not supply
   those contracts or authorize constructing a hero-contestable pot.
4. Live use still lacks authoritative UI/source receipt binding and complete
   enabled controls, general postflop legal-action/sizing/reopening evidence,
   complete ordered betting-history authority and a supported strategy/model.

## Validation

| Check | Result |
| --- | --- |
| Nine targeted accounting/source/window/bridge/freshness/legality suites | 624 passed |
| `npm.cmd test -- -- --maxWorkers=1` | **3,221 passed across 106 files** |
| Optional Python PHH replay suite in existing `.data/phase5d-venv` | 14 passed |
| `npm.cmd run typecheck` | Passed across all workspaces/apps |
| `npm.cmd run build` | Passed |
| `npm.cmd run build:extension` | Passed; both tracked generated bundles updated |
| Working/staged `git diff --check` | Passed |
| Fixture substitution and original evidence hash recheck | Passed; originals unchanged |

Full-suite totals: AI-core491, browser-reader2,262, opponent-db41,
poker-engine101, range-engine317, shared9. The final targeted/full runs used
unchanged production/test code and exited zero. This adds 66 focused source
accounting cases and one MAIN-to-overlay rejection case; existing integration
cases now also verify the separate contribution facts and null pot authority.

Positive replays cover the reset, hero activation, accepted CALL2 and unchanged
CO activation. Negatives include every missing prefix frame with synthetically
repaired cursor/sequence links, blind/amount/stack/pot contradictions, each
missing reset marker, unknown boundary/nested mutations, unknown returns,
side pots, all-ins, multiple boards, replay/reconnect/receipt regression,
inserted linked unsupported updates and invalidating tails. Deadline and
defensive-copy tests cover the new accounting through the existing proof reads.
MAIN-to-overlay replays retain the history, legality, accounting and pot
blockers, and verify no recommendation request or outgoing poker action.

No production deadline, existing preflop permission or postflop recommendation
gate was changed. No raw evidence or pre-existing `.agents/` files are staged.
PowerShell labels redirected esbuild stderr progress `NativeCommandError`;
both build processes exited zero and produced successful bundles.
