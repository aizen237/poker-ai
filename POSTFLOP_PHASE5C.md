# Phase 5C: independent likelihood provenance and offline calibration benchmark

Implemented from `2064b79bd4e1880bcaa3c9ea29dc7a523eb4ae3e` on 2026-10-22.
Reviewed Phase 5A/5B documentation and code, combination probabilities/blockers,
the updater/review/scenario contracts, opponent-db persistence and estimates,
reader evidence documentation, tests, estimated-equity selection and live proof
activation. No live inference, provider calls, capture or poker actions were run.

## Evidence audit: observations are not calibration datasets

The local SQLite database was opened read-only with query-only access. Only
aggregate counts/schema metadata were printed; raw records were not exported.
At audit time:

| Local evidence | Finding | Calibration eligibility |
| --- | --- | --- |
| `.data/opponents.sqlite`, legacy table | 0 rows | None |
| `live_observations` | 1,709 rows, all partial; 83 scoped identities, 352 distinct hand-ID fields | These IDs are recorded windows, not independently established distinct poker hands or globally stable players |
| Stored action summaries | 1,619 actions: 1,041 preflop, 320 flop, 166 turn, 92 river | Postflop action sightings exist, but opportunity/context coverage is missing |
| Observation labels/context | No board, hole-card or session fields; all metric labels null | Cannot establish exact pre-action scope, hidden-card priors, labels, exhaustive legal sizes or session/player holdout |
| Ignored diagnostic JSON | Eight inspected diagnostic snapshots, all preflop; no complete-history declaration found | Source/lifecycle regression material, not a postflop decision cohort |
| Local socket/raise captures | Capture envelopes and paired sizing exports exist, including two pre-existing tracked envelopes | Narrow source/action/sizing evidence; no reviewed postflop likelihood artifact or complete evaluation manifest found |
| Checked-in reader fixtures | Sanitized real captures, reported observations and explicitly synthetic test variants | Scope-specific reader/source/legality tests; not representative behavior samples |
| Phase 5B likelihoods and new benchmark examples | Synthetic mathematical fixtures in test files | Arithmetic/contract validation only; no empirical calibration claim |
| Opponent-db `STAT_PRIORS` | Documented placeholder rates, with legacy confidence thresholds | Not measured PokerNow frequencies and not board/combo-specific action likelihoods |

OPPONENT_STATS.md documents that live hand IDs identify observation windows,
polling can miss events, names can collide or change, and complete opportunity
denominators remain unavailable. The 578 recorded postflop actions therefore
must not be relabeled as 578 independent, complete evaluation decisions. No
attempt was made to reconstruct missing boards, cards, actions or identities.

The reader fixture README distinguishes real sanitized source envelopes from
simulated DOM scaffolds, mutated cards, lifecycle timing and negative cases.
Preflop strategy/sizing/source acceptance references do not review a postflop
action-likelihood model. **No genuinely independently reviewed postflop model or
sufficient real evaluation dataset was discovered. Empirical calibration remains
unavailable today.** The audit is limited to this repository/workspace; it makes
no claim about external datasets that have not been supplied.

No `.data/` or `evidence/` files are added or changed by this phase. Ignored local
evidence and the pre-existing untracked `.agents/` directory remain excluded
from this commit. This report contains aggregate audit findings, not private raw
evidence, player names, actual cards or source envelopes.

## Versioned registry and strict action distributions

`createLikelihoodRegistry` accepts external `LikelihoodModelRecord` artifacts.
Schema v1 records model ID/version, author, provider, source kind/references,
creation date, validation status, review references, assumptions, limitations,
development-data lineage and exact supported scopes. Scope includes poker
profile, street, position/facing position, board, pot, stack depth, opponent count,
facing amount, action names/wager interpretation and exact bet-to sizes.

V1 deliberately supports only the explicit six-seat, no-ante, no-straddle,
no-limit hold'em cash/chip-EV profile. Other positions/profiles are rejected.
There is no board abstraction, size interpolation or transfer across profiles.
Each scope declares an independently evidenced, **exhaustive discrete action
space**. Its alternatives must be mutually exclusive, including exact sizes.
An observed subset of actions/sizes is not exhaustive. Continuous densities,
size buckets, an omitted “other size” mass and strategic action legality are not
implemented. The two-action test examples are mathematical finite-action
fixtures, not claims that real NLHE permits only check or one bet size.

Each alternative contains a Phase 5B `ActionLikelihoodModel`, with matching
ID/version, provenance, assumptions, limitations, scope and prior conditioned
event IDs. For each combination, probabilities across ALL alternatives must
sum to one. Coverage must match across action tables, including zero rows.
Duplicates, invalid cards/probabilities, board collisions, missing actions or
combos, conflicting metadata and unsupported assumptions are rejected. The
1e-12 sum tolerance addresses floating-point addition only; it is not a sample
reliability threshold. Invalid distributions are not silently normalized.

Phase 5B's observation, scope and likelihood-structure validators are now
reused public functions. Its separate review/purpose gate remains intact.
Unvalidated artifacts can be registered and benchmarked without being allowed
to condition a range in offline-analysis mode. Registry records are copied and
frozen. Review claims require an independent named reviewer, date, source audit,
held-out evaluation, calibration, selection-bias assessment and limitations,
bound to the exact artifact. Altering that artifact invalidates the match.
Supplied review records require external authentication; structural matching is
not itself genuine scientific review or source certification.

There are no built-in behavior models, trained parameters or default baselines.
All numerical likelihood examples remain in test files. Source categories are
`real_observations`, `simulation` and `synthetic_fixture`; provenance cannot be
changed into a review status merely by a successful benchmark.

## Deterministic external-dataset harness

`benchmarkLikelihoodModels(dataset, registry, options)` is a pure, synchronous
offline API. It consumes provider-neutral exported tables and datasets; there
is no provider callback that could receive evaluation labels. It revalidates
the registry and reports failures as unavailable. Registration itself throws
on malformed artifacts. No file I/O, storage mutation, network calls, automatic
training or production adapter is added.

An external dataset must supply schema/ID/version, source metadata, population,
selection mechanism and limitations, a global pseudonymous identity namespace,
split references and a declared sample count matching its rows. Each row needs
hand/session/event/decision/source/opponent identities, all six participants,
hero cards, exact pre-action scope and action availability, explicit ordering,
original observation expiry and evidence provenance. Context must predate the
current action. Source coverage must be declared complete; this declaration is
validated for consistency, not authenticated from a live source.

Previously conditioned observations must match ordered event IDs, hand/source/
opponent/hero identity, board prefixes and times. Regressing or terminal actions,
duplicate events/decisions, incompatible identities, reused scope IDs with
different contexts and expired preceding evidence are rejected. Historical
records must agree with matching events present in the evaluation dataset;
pre-action context cannot predate its declared conditioned history. Historical
evaluation uses archived observation times and preserves original deadlines;
it does not make old source evidence fresh for live decisions. The harness does
not certify a full betting history or independently infer action legality.

Two explicitly separate scoring modes are available:

- `action_marginal`: for each action a, compute
  `P(a) = sum_c P_prior(c | known cards) * P_model(a | c, context)`.
  The supplied prior is blocker-filtered and normalized using Phase 5A. Its
  provenance, development lineage and cutoff must predate the action and match
  the declared conditioned history. Missing/empty/unsupported priors abstain.
  Revealed cards do not enter this prediction. This evaluates the prior-model
  mixture, not identifiable hidden-card conditional calibration in isolation.
- `revealed_combo`: score the supplied observed hole-card combination directly.
  Unknown cards are unavailable labels, never guessed or replaced by a range's
  strongest hand. Reveals need provenance and an explicit showdown/independent
  reveal mechanism; card collisions are rejected. Results are conditional on
  that reveal/selection process.

Showdown-only, convenience and unknown selection datasets are always labeled
as selected samples. Revealed-combo scores have that limit even if the parent
dataset was collected from all decisions. There is no automatic inverse-
propensity weighting or population correction without a justified selection
model. Action-marginal scores do not eliminate selection bias in the dataset.
Alternative prior scenarios must be evaluated in separate, identified dataset
versions/reports. They are not averaged into a single posterior or score.

## Leakage boundaries and comparisons

Every model and learned prior supplies a complete development manifest covering
training, tuning, selection and previous calibration observations. Explicit
unfitted baselines may declare no development data, with provenance. Unknown
lineage or mismatched identity namespaces prevents evaluation.

All modes require disjoint development/evaluation events and hands. Session
holdout additionally forbids session overlap; player holdout additionally forbids
overlap with **any** participant, including other seats. All evaluation rows are
audited, including rows for which a model later lacks coverage. Hand holdout can
evaluate new hands from familiar sessions/players but is explicitly not an
unseen-player claim. Assertions about stable identities, aliases and complete
development lineage still require independent verification.

An identified external baseline ID/version is mandatory. There is no built-in
uniform, hand-strength or supposedly GTO baseline. Scores and missing counts
are grouped by exact scope. Comparisons recompute both summaries on the same
intersection of scored events, report the paired/excluded counts and retain
coverage failures. A model cannot gain an apparent paired advantage by scoring
a different subset. Different scopes are not pooled into a winner or ranking.

Reports retain dataset/model provenance, source kinds, validation status, sample
counts, missing labels/coverage reasons, development counts, reveal counts and
the actual scope. Sorting by model/event/scope identity makes output deterministic
under input row/model permutations. There is no random sampling or wall-clock
timestamp in a report. Caller inputs remain unchanged; registry and report
outputs are immutable snapshots.

## Scores and uncertainty

For observed action y and a full probability vector p:

```
negative log-likelihood = -ln(p[y])           // natural-log units: nats
multiclass Brier score = sum_a (p[a] - 1[a=y])^2
```

Lower scores indicate lower loss on the stated sample, not proven superiority.
The Brier score is unhalved (range 0..2). Scoring occurs AFTER hidden-card
marginalization, not by averaging conditional log losses. Exactly zero assigned
probability has infinite NLL, serialized explicitly as `"infinite"`; it is not
clipped or mistaken for a missing label. Both-infinite comparison differences
are undefined. Unlike posterior conditioning, an impossible observed action has
a well-defined infinite scoring loss; Phase 5B still returns unavailable for a
zero-mass posterior. Numerically lost positive support/terms cause unavailability.

Caller-supplied calibration edges partition [0,1]. Per-action bins report counts,
mean predicted probability and observed action frequency. Bins are half-open,
with 1 included in the last bin; empty bins have null statistics. These are
descriptive reliability summaries, not automatic calibration certificates.

Every scoped summary reports sample, hand, session and participant counts.
Leave-one-session-out ranges expose sensitivity of losses and of paired model
differences when at least two sessions permit that calculation. These ranges
are not confidence intervals, and sessions are not assumed independent. With
one session the sensitivity is unavailable. No minimum reliable sample count,
effective sample size, confidence band, superiority test or model-accuracy claim
is invented. Reports remain `unvalidated` when scores are computable and
`unavailable` when no observations can be scored. Real-data evaluation can expose
`descriptive_only` empirical summaries; synthetic fixtures/simulations cannot.

## Independent tests and validation

- Three-class [.2,.3,.5], observed class 1: NLL 1.2039728043259361,
  Brier .04+.49+.25=.78; zero assigned mass gives infinite NLL and Brier 2.
- Prior [.75,.25], check likelihood [.8,.2] yields prediction [.65,.35].
  One check and one bet give mean NLL `-(ln(.65)+ln(.35))/2` and Brier .545.
  The explicit .5/.5 mathematical baseline gives ln(2) and .5. Paired Brier
  difference .045 has leave-one-session-out range [-.255,.345].
- Revealed AsQs/check and AhQh/bet each receive .8 probability: mean NLL
  -ln(.8), Brier .08. Scoring the same rows marginally still gives .545,
  proving revealed cards are not used as hidden-card predictors.
- Exact bin edges/empty bins, tiny and zero probabilities, blocker removal,
  numeric support loss, invalid distributions, complete action/combo coverage,
  impossible profiles, missing provenance/labels/priors, empty datasets,
  duplicate identities, contradictory histories/expiry, all three leakage
  boundaries, learned-prior leakage, altered reviews, paired subset comparison,
  deterministic reporting, immutability and synthetic/empirical separation.
- Existing Phase 5B updater tests still verify its review gate and safeguards;
  registry acceptance of an unvalidated model does not bypass that gate.

Validation completed on 2026-10-23:

| Check | Result |
| --- | --- |
| Targeted metrics, benchmark and Phase 5B conditioning tests | 108 passed across 3 files |
| Complete range-engine suite | 301 passed across 16 files |
| `npm test` | 2,904 passed across 101 files |
| `npm run typecheck` | Passed across all workspaces |
| `npm run build` | Passed |
| `npm run build:extension` | Passed; generated extension bundles unchanged |
| `git diff --check` and staged diff check | Passed |

One initial range-engine run hit the existing river-equity test's five-second
timeout. That unchanged test passed on rerun and in the complete repository
suite; no timeout or test expectation was relaxed. The final targeted run also
includes the cross-record history consistency checks. This phase adds 60 tests;
all likelihood values and review-metadata examples in them are mathematical or
contract fixtures, not empirical model evidence.

## Graduation evidence and next milestone

Graduation from unvalidated to genuinely independently reviewed requires a real
review outside this program, including:

1. Authenticated model/source authorship and immutable versioned artifacts;
   reproducible provider export with complete action probabilities and scope.
2. Independently verified decision contexts, action availability, identity links,
   chronological source coverage and lawful access to the supplied evidence.
3. A documented target population and inclusion/missingness/reveal process,
   with selection-bias assessment; no generalization from showdown-only samples
   without an independently justified design or correction.
4. Complete development and held-out lineage at the claimed generalization
   boundaries, including learned priors and model-selection/calibration data.
5. Reproducible held-out scoring against identified baselines, coverage failures,
   scope/sample/cluster counts, calibration summaries and uncertainty analysis
   appropriate to the actual sampling design. No benchmark pass substitutes for
   a justified assessment of precision, misspecification or scope transfer.
6. An independent reviewer, dated artifact-bound report and explicit limitations.
   Registry metadata checks that these references were supplied; it does not
   verify their contents, authenticity or scientific adequacy.

Recommended next milestone: **Phase 5D, audited offline evaluation-cohort and
external model ingestion**. Obtain a genuinely reviewed, provider-exported model
and complete decision observations with stable pseudonymous identities, exact
pre-action contexts, exhaustive discrete action coverage, sampling/reveal
metadata and independent holdouts. Build and independently audit a deterministic
ingestion manifest, then run this benchmark. Do not fill missing source facts or
frequencies using current partial polling records or mathematical fixtures.

Live postflop advice remains blocked independently by source/window completeness,
stable identity and reconnect/gap handling, original deadlines, reviewed priors
and likelihoods, action availability/call cost/raise legality, contestable-pot/
eligibility/returns/rake accounting, future betting/equity realization, and a
separately validated actual strategy. Tournament/ICM scope is not introduced.
Preflop behavior, BB abstention, source continuity rules, legal-action and pot
safeguards and global `historyComplete=false` remain unchanged. No benchmark
score, review enum or fixture can unlock a live recommendation.
