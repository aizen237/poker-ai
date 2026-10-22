# Phase 5A: combination-weighted opponent range foundation

Implemented from local HEAD `8c0944c` on 2026-10-22. Fetching origin confirmed
that local main already contained 16 commits beyond origin/main. No separately
named Phase 5 readiness report was present. Readiness was reconstructed from
V1_ARCHITECTURE.md, V1_RELIABILITY_AUDIT.md, RANGE_ESTIMATION.md,
MULTIWAY_EQUITY.md, LIVE_MONETARY_AUDIT.md and the current decision-proof,
source-window, range-estimation and equity code. Documentation describing older
activation boundaries was checked against current source.

## Audit: reused versus added

| Area | Existing behavior reused | Phase 5A change |
| --- | --- | --- |
| Hand classes | Canonical 169-class `Range`, 6 pair / 4 suited / 12 offsuit expansions, inclusion weights in [0,1] | Explicit immutable `ComboRange` with separate physical-hand weights |
| Blockers | Legacy expansion removes hero/board cards per combo | Reusable validated removal and unordered identity; duplicate cards/combinations rejected |
| Probability | Sampling already uses per-combo weight, not equal class probability | Public mass, normalization, and probability helpers with explicit empty status |
| Heads-up equity | Evaluator, deck, known-card validation, runouts, split ties | Accepts either range representation; validates RNG and uses half-open sampling bins |
| Range-vs-range | Whole-pair rejection conditions the product distribution on disjoint cards | Same algorithm accepts either representation for each player |
| Multiway | Bitmask collisions, remaining-mass acceptance, whole-deal restart, bounded attempts | Same sampler accepts explicit combos and mixed legacy/combo inputs |
| Action narrowing | Preflop reference/Chen heuristics, prior retention and uncertainty for unsupported postflop actions | No model changes; type-only future board/action update contract |
| Production | Preflop branch, estimate selection and independently scoped decision proofs | No adapter, strategy, source, legality or activation changes |

The poker-engine remains the hand evaluator and random-opponent simulator; it
does not need a rewrite. The existing estimate-selection adapter still consumes
169-class estimates. Its generated `combos` field was already blocker-aware,
but there was no public validated range/probability API for retaining differing
suit weights through further updates. New callers can now pass `ComboRange`
directly to all three range-equity entry points. No new posterior is wired into
live estimation.

The old poker-engine equity tests include a placeholder AA-vs-KK assertion.
It was not treated as independent evidence. Existing range-engine AA-vs-KK
simulation and the new enumerated/hand-calculated cases provide actual checks.

## Representation and mathematical contract

`createComboRange` takes physical two-card entries. It copies/freezes cards,
entries and the collection; rejects invalid cards, repeated cards, repeated
unordered combos (including reversed/zero entries), nonfinite weights and
weights outside [0,1]; and omits validated zero weights. Different hands may
share a card within a range: they are alternatives, not simultaneous holdings.
Malformed structural inputs are revalidated by public probability and equity
operations. Known-card lists must contain unique valid cards.

`comboRangeFromRange` uses existing expansion order and weights. AA at .5 yields
six entries of .5, for mass 3. AKs at .25 yields four entries of .25, for mass 1.
There is no division by class size, strength reorder or normalization during
conversion. Canonical legacy maps retain their seeded sampling order. Multiple
aliases of the same class in a manually constructed map are rejected by the new
converter as duplicate physical holdings, rather than double-counted. Existing
legacy range APIs retain their established behavior.

For legal combos C, `totalWeight = sum(w(c), c in C)` and
`P(c | known cards) = w(c) / totalWeight`. Removal leaves survivor weights intact.
Normalization returns that surviving pre-normalization mass alongside the new
probability range. Missing or blocked combos have probability zero in a nonempty
distribution. Empty/all-zero/fully blocked distributions return `status: empty`
and `comboProbability` returns null; equity throws an unavailable-range error.
There is no uniform fallback. These are floating-point calculations; tests use
appropriate tolerances for sums and Monte Carlo results. Tiny representable
positive masses are not erased by an arbitrary epsilon threshold.

For multiple ranges, the target distribution is proportional to
`product(w_i(c_i))` over jointly disjoint deals. Existing rejection algorithms
preserve this distribution. They do not assume that individually normalized
ranges remain independent after card conditioning. A sampling-budget failure is
unavailability, not proof of impossibility and not a counted hero loss.

Heads-up RNG validation now rejects values outside finite [0,1), including
values used during deck shuffling. Cumulative bins use `[lower, upper)`, matching
multiway sampling. This corrects the previous exact-boundary convention;
ordinary seeded legacy/conversion comparisons agree on every street. It does
not change preflop decision policy, which does not use these equity estimates.

## Future action-update interface

`BoardRangeUpdater` is a type-only offline extension point. It receives an
immutable prior with provenance and uncertainty, hero/board cards, a structured
postflop action, nullable sizing/pot/stack context, and evidence identities,
coverage, observation time and original expiry. Results distinguish updated,
unchanged and unavailable. Model ID/version/validation, assumptions, limitations
and optional sensitivity scenarios remain separate from source proofs.

A future supplied likelihood model would compute
`w'(c) = w(c) * P(observed action | c, board, context)` and normalize legal
survivors. This phase supplies no likelihoods, updater implementation, fold
equity, response frequencies or strategic accuracy claim. Future implementations
must validate board/street, scope, ordering, identities and original deadlines;
the type contract alone does not enforce or certify those facts. Unsupported
conditioning must retain only a legal prior with reasons; zero likelihood mass
must be unavailable. Provenance labels cannot unlock advice or renew evidence.

## Validation

- Before implementation: range-engine 147 tests and poker-engine 101 tests passed.
- Independent combinatorial oracle: all 1,326 unordered pairs from the deck,
  78 pairs, 312 suited holdings, 936 offsuit holdings; after five known cards,
  C(47,2) = 1,081. Specific AA/AK suit and rank blocker counts are checked.
- Direct probability checks: unequal suit weights, class multiplicity, surviving
  mass, scaling, idempotence, zero/fully blocked ranges, subnormal weights,
  invalid values, duplicate aliases/cards, reversed identity and immutability.
- Direct river outcomes: KK against .75 spade AQ / .25 heart AQ on a three-spade
  board has equity .25. Asymmetric joint collisions give .2 multiway equity and
  .4 range-vs-range equity by enumerating the three legal weighted deals on paper.
  Both seat orders, split ties, dead ends and bounded incompatibility are tested.
- Independent exhaustive runouts reuse only the separately tested hand evaluator,
  not production range expansion/probability/sampling: all 990 flop runouts and
  all 44 turn rivers for each fixed opponent. The turn example is .25 * 41/44;
  a draft test incorrectly counted queens as outs against KK, and enumeration
  exposed that test error. Direct losing-card inspection confirmed only three
  aces. The expectation was corrected before validation/commit.
- Same-seed equivalence covers legacy vs converted inputs on preflop/flop/turn/
  river in all three APIs, including mixed representations. RNG boundaries,
  normalization consistency and malformed input rejection have focused tests.

Final validation on Node 22.16.0:

| Check | Result |
| --- | --- |
| Targeted range-engine + poker-engine suites | 277 passed across 20 files (29 new tests) |
| Full `npm test` | 2,779 passed across 97 files |
| AI-core | 491 passed |
| Browser-reader (including extension/source/decision regressions) | 1,961 passed |
| Opponent DB | 41 passed |
| Poker-engine | 101 passed |
| Range-engine | 176 passed |
| Shared | 9 passed |
| `npm run typecheck` | Passed, all workspaces/apps |
| `npm run build` | Passed, including extension bundle |
| `npm run build:extension` | Passed, explicit rebuild |
| `git diff --check` | Passed |

The generated contentScript bundle was reviewed: its changes are limited to the
new combination adapter/validation and sampler changes (plus a generated symbol
rename). The event-source bundle has no content change. No provider inference or
PokerNow interaction was performed. The pre-existing untracked `.agents/`
directory is excluded from this commit.

## Dependencies completed and remaining

Completed: exact physical-hand identity, independent suit weights, deterministic
legacy migration, known-card conditioning, explicit probability/empty semantics,
reuse in heads-up and multiway showdown equity, and a provenance/uncertainty-aware
interface for future action conditioning. These support calculations on flop,
turn and river; they do not establish an opponent strategy.

Next complete milestone: **Phase 5B, offline board-aware action conditioning**.
Implement and independently test per-combo made-hand/draw/blocker features;
accept only explicitly supplied, reviewed action likelihoods within their stated
board/sizing/position/depth scope; validate action ordering and evidence binding;
return posterior ranges and sensitivity scenarios with unsupported/zero-evidence
abstention. Validate against independently enumerated posterior fixtures and
document model provenance and limits. Live activation stays disabled until the
separate requirements below are proven.

Still missing for live postflop advice:

- Decision-local source/window coverage and hero/opponent ordered actions across
  streets, with original evidence deadlines and reconnect/gap invalidation.
- Independently supported priors/conditioning data, uncertainty/sensitivity bounds,
  and a validated postflop strategy for the particular comparison.
- Exact action availability, payable call cost, sizing, reopening and terminal
  call/check proofs; flop/turn future betting and equity realization modeling.
- Contestable pot, eligibility, returns/rake and accounting proofs. Multiway
  showdown share does not supply side-pot EV or a multiway strategy.
- Tournament-specific strategic scope where required; no ICM model is introduced.

Preflop decisions, BB abstention, source proofs and their original deadlines,
`historyComplete=false`, and all live legality/accounting/strategy requirements
remain unchanged. No poker action automation, new live capture or strategy
activation is part of this phase. Automated tests are not fresh PokerNow evidence.
