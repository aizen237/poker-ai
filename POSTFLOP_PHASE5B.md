# Phase 5B: offline board-aware opponent action conditioning

Implemented from HEAD `82d363fa96f4dc0b996ea9d328d67e445cf0460f` on
2026-10-22. Reviewed POSTFLOP_PHASE5A.md, ComboRange, BoardRangeUpdater,
poker-engine evaluation/draw/texture/outs helpers, all three range-equity APIs,
estimateOpponentRange, estimated-equity selection, existing tests, and live
decision-proof activation. No raw observations or captures are included.

## Completed capabilities and reuse

`describeBoardCombo` and `describeBoardRange` expose immutable physical features
for legal flop, turn and river combinations. They reuse `evaluateBest`,
`evaluate5`, `combinations`, `detectFlushDraw`, `detectStraightDraw`, shared card
validation/deck identities and Phase 5A blocker removal. Features include:

- Made category, tiebreakers, best-hand value, minimum/maximum hole-card use
  among tied best hands, and river board-only hands.
- Exact board rank/suit counts, pocket pairs, overpairs, matching board ranks,
  overcards, held suit/rank blockers and highest suited rank absent from board.
- Actual straight/flush completion cards with known/dead cards removed and a
  deduplicated union. Board-only straight completion ranks and flush hole-card
  counts distinguish shared patterns from private contributions.
- Flop runner-runner flush suits and straight rank-pair requirements. Turn has
  no runner-runner features; river has no draws.

The legacy straight detector calls all multiple-completion-rank draws
`open_ended`, including double gutshots. The new feature API exposes exact ranks
instead of propagating that ambiguous label. Completion cards are structural
completions, not clean winning outs, equity realization, or action frequencies.
Backdoor patterns are requirements, not probability estimates. Made-hand values
are evaluator ordering values, not strength percentiles. Board texture heuristic
labels and Chen preflop ordering are not used to generate likelihoods.

`createBoardRangeUpdater(model, options)` implements Phase 5A's existing
`BoardRangeUpdater` signature. `bindOfflineRangeState` adds a copied/frozen
offline anchor and observation ledger to an existing `OpponentRangeState`.
Old input fields remain compatible; missing offline identity, position or
authority prevents an update. No changes to ComboRange, evaluators, equity
samplers, preflop estimation, live estimate selection, or strategy are needed.

## Probability contract

For every positive legal prior combination c, an explicitly supplied table gives
`L(c) = P(observed action | c, exact context, previously conditioned events)`.
The posterior is:

```
u(c) = w(c) * L(c)
P(c | action, context) = u(c) / sum(u)
```

There is no hand-strength-to-action mapping and no default likelihood table.
Each likelihood is finite and in [0,1]. Every positive legal prior combination
must have exactly one row. Rows outside the surviving prior are permitted, so a
table can survive known-card removal, but their cards/probabilities are still
validated. Duplicate unordered rows, including zero rows, are rejected. Missing
coverage is unsupported; it is not interpreted as zero likelihood. This is a
single observed-action likelihood table: its probabilities do not sum to one
across combinations. It is not a complete policy over all available actions.

Products are computed in log space and rescaled by the largest log product
before using Phase 5A normalization. This preserves ratios even when direct
multiplication underflows. All-zero mass is unavailable, never uniform. If a
positive normalized term cannot be represented in a JavaScript number, the
posterior is unavailable instead of silently deleting support. Ordinary rounding
remains subject to IEEE-754 precision; no arbitrary epsilon threshold is used.

Result meanings:

| Status | Meaning |
| --- | --- |
| updated | Supported offline conditioning, normalized legal ComboRange |
| unchanged | Unsupported update; legal prior weights retained, reason recorded, confidence marked unknown. An identical replay preserves prior uncertainty unchanged. |
| unavailable | Invalid known-card/prior identity, no legal prior mass, zero posterior mass, or unrepresentable posterior; state is null |

`unchanged` can remove newly known blocked combinations. It is not a claim of
fresh evidence, completed conditioning, or permission to use an expired prior
for decisions. Original anchor and observation expiries remain attached.

## Likelihood models and evidence requirements

`ActionLikelihoodModel` requires ID/version, validation status, provenance basis
and source references, assumptions, limitations, exact scope, likelihood rows,
and ordered IDs of previously conditioned events. Exact scope includes the
ordered board, street, action and wager interpretation, prior raise count,
facing context/position, opponent position, pot, facing amount, action size,
effective depth, and opponents remaining. There is no interpolation or transfer
between suits, board textures, sizes, seats, or stack depths. Unknown required
context is unsupported. Positions currently use the existing six-position enum.
Sizes and depths are BB units; actionToBB is a wager's street total, with zero
as the check/fold sentinel. Effective stack depth is not the actor's full stack.

Every assumption must be explicitly accepted by the caller. Unreviewed models
are rejected. Offline-analysis mode requires supplied review references matched
to the model ID/version AND the exact archived model artifact, including its
table. Merely changing an enum to `reviewed` is insufficient. The mathematical
test mode permits explicitly labeled synthetic fixtures with no review claim.
Synthetic-conditioned ledger states cannot subsequently enter offline-analysis
mode. All numeric likelihood fixtures are confined to test files.

**No genuinely reviewed likelihood model is available in this repository.**
The reviewed-artifact acceptance test exercises a contract using synthetic
metadata; it does not establish a reviewed poker model, GTO solution, empirical
calibration, or live certification. Caller review records are assertions and
artifact identity checks, not authenticated credentials. The compact inherited
RangeProvenance model-validation field remains `unvalidated`; full supplied
validation/review metadata is preserved in the offline ledger.

Initial binding requires hand/source/opponent identities, hero cards, an ordered
board prefix (possibly empty), an observation cutoff/time, original expiry, and
evidence references covered by prior provenance. Binding cannot reset an
existing ledger. Each update requires a separately supplied expected offline
observation snapshot. The input must match that snapshot exactly, including
event/decision/source/opponent/hand IDs, cards, context, provenance and original
expiry. The input must declare complete offline coverage, a strict observation
ordinal, and a nonregressing timestamp. Identical timestamps are allowed only
when the explicit ordinal establishes order.

Ledger checks reject reversed board progression, regressing raise counts,
conflicting repeated events/decisions/ordinals and actions after that opponent
folds or goes all-in. A repeated identical observation is unchanged: the same
likelihood is never multiplied twice. A subsequent model must declare the exact
ordered event IDs already conditioned on. Changing a model/scenario requires
replaying from the original prior. No independence between successive actions
is inferred. Ordinals may skip other actors' events; this module does not rebuild
the entire betting history or certify history completeness.

The explicit evaluation time must precede the earliest original expiry across
the anchor and all applied/current evidence. New evidence cannot extend old
deadlines. The clock is supplied for deterministic archive replay; setting an
archive time does not make old evidence fresh for live use. Authority snapshots,
prior bindings and reviewed artifacts must come from an independently reliable
offline producer. The module validates consistency, not source authenticity or
arbitrarily forged caller state. No network/source capture is introduced.

Action/facing/amount contradictions are rejected, but full payable call cost,
raise reopening, min/max totals, chip grid, side-pot eligibility and actor-stack
legality still require independent proofs. Opponent modeling is separate from
legality, contestable pot accounting and actual strategy selection.

## Uncertainty and equity

`conditionLikelihoodScenarios` requires unique nonempty labels and returns one
independent result per supplied model. Unsupported and zero-mass scenarios stay
visible. It supplies no average, default choice, scenario weights, confidence
interval or probability that a scenario is true. Continue each scenario using
its own returned state. Unlabeled Phase 5A alternatives are rejected for updates;
callers must branch them explicitly. Prior confidence is never increased by a
successful update; assumptions/limitations and original provenance are retained.

Posteriors are ordinary immutable ComboRange values. Heads-up, range-vs-range
and multiway equity continue to use the existing weighted sampling algorithms.
Joint draws remain proportional to the product of weights conditioned on
disjoint cards. Individually normalized ranges do not imply independent hands
after collisions, and equity remains showdown share, not side-pot or action EV.
Per-opponent marginals also do not recover strategic correlations between
opponents; multiway equity still assumes the explicitly supplied product model
before card conditioning.

## Independent mathematical validation

- Hand-calculated three-combination fixture: prior (.6,.3,.1) and likelihood
  (.2,.8,.4) yield masses (.12,.24,.04), hence posterior (.3,.6,.1).
- Sequential, history-bound likelihoods (.5,.25,1) then produce masses
  (.15,.15,.1), hence (3/8,3/8,1/4). Replays do not apply another factor.
- Removing a blocked third combination leaves .12/.24, hence 1/3 and 2/3.
  Missing a legal row retains weights .6/.3 without inventing coverage.
- Two equal Number.MIN_VALUE priors times (.25,.75) produce (.25,.75), even
  though naive multiplication loses mass. Common Number.MIN_VALUE likelihoods
  preserve the .6/.3/.1 prior. Extreme unrepresentable ratios abstain.
- A .75/.25 prior times .25/.75 yields .5/.5. On 2s 7s 9s 3d 4c, KK loses
  to AsQs and beats AhQh, giving heads-up equity 1/2. Adding equally weighted
  AsJs/QQ produces three equal legal joint deals, one KK win: multiway 1/3 in
  both seat orders. Hero KK/AsJs versus the posterior wins two of three legal
  pairs: range-vs-range 2/3. Seeded sampling agrees within declared tolerances.
- All nine made-hand categories, wheel/made straights, double gutshot completion
  ranks, board-only hands/draws, kicker contributions, exact blockers, dead-card
  removal, draw union overlap, backdoors, river suppression and immutability.
- Invalid probabilities/cards, all-zero likelihoods, empty/blocked priors,
  partial coverage, exact-scope mismatches, unsupported assumptions, source and
  model identity mismatches, altered reviewed artifacts, original expiry,
  repeated/contradictory/terminal actions, chronological board progression,
  missing authority, immutable snapshots and independent sensitivity results.

Final validation on Node 22.16.0:

| Check | Result |
| --- | --- |
| Targeted new feature/conditioning tests | 65 passed across 2 files |
| Initial targeted range-engine + poker-engine suites | 337 passed before the final five defensive fixtures were added |
| Final full `npm test` | 2,844 passed across 99 files |
| AI-core | 491 passed |
| Browser-reader, including source/decision regressions | 1,961 passed |
| Opponent DB | 41 passed |
| Poker-engine | 101 passed |
| Range-engine | 241 passed, including all 65 new tests |
| Shared | 9 passed |
| `npm run typecheck` | Passed, all workspaces/apps |
| `npm run build` | Passed, including extension bundle |
| `npm run build:extension` | Passed, explicit final rebuild |
| `git diff --check` and staged diff check | Passed |

Final checks ran after the last behavior changes. Both generated extension
bundles have no content diff from HEAD. Only the range-engine offline API,
features, tests and this report changed. No raw evidence is staged.

## Next independent milestone and live blockers

Recommended Phase 5C: **independent likelihood-model provenance and calibration
benchmark**. Obtain a genuinely reviewed external likelihood artifact with clear
game/population/position/board/action/sizing/depth/history scope and supported
priors. Build a separate offline ingestion/replay benchmark with held-out
calibration and sensitivity analysis, artifact/source identity checks and
documented uncertainty. Review board abstraction and cross-context transfer
before accepting anything beyond exact scope. This milestone remains offline.

Live postflop recommendations remain disabled. Still required separately:

- Decision-local source/window coverage, ordered multi-street actions,
  reconnect/gap invalidation and original deadline proofs.
- Reviewed priors and likelihoods plus a separately validated strategy for the
  actual decision, including future betting/equity realization where relevant.
- Independent action availability, call cost, raise rights, exact sizing and
  terminal action proofs.
- Contestable pot/eligibility/returns/rake accounting and side-pot EV where
  applicable; tournament/ICM scope when required.

Preflop policy, source-proof rules/deadlines, BB abstention and global
`historyComplete=false` are unchanged. The offline `historyCoverage` assertion
cannot change the live history flag. No poker actions, inference-provider calls,
live captures, automatic betting, or speculative strategy are part of this work.
The pre-existing untracked `.agents/` directory is excluded from the commit.
