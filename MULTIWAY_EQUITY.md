# Multiway range equity

calculateEquityVsRanges(heroCards, opponentRanges, board, options) returns
hero's expected showdown share of one common pot. It supports preflop, flop,
turn and river, one through nine opponents, and an injected RNG. Each opponent
has a distinct weighted Range. Zero-weight hands are excluded. Known hero and
board cards are removed before opponent sampling; previously selected opponent
cards are removed before selecting the next opponent. Runouts exclude all of
them. If hero ties for best, the share is 1 / number of winners, including hero.

## Sampling distribution and failure handling

The model uses the product of each opponent's combo weights, conditioned on
all cards being disjoint. Simply sampling sequentially from each remaining
range can bias the earlier seats. At each step, the sampler therefore accepts
with probability remainingWeight / originalWeight before selecting a weighted
legal combo. That cancels the changing normalization and preserves the desired
joint distribution. Rejection or a dead end restarts the whole deal.

iterations counts completed deals; rejected attempts never count as hero losses.
Results also report attempts and rejectedSamples. maxSamplingAttempts bounds
work (default max(1000, iterations * 100)); exhaustion throws without returning
a misleading partial estimate. Individually empty ranges, invalid known cards,
invalid sample counts and invalid RNG outputs are rejected. A bounded sampling
failure does not prove that ranges are impossible: they may be compatible but
very collision-heavy. The caller can inspect the reason and change the budget.

## Live selection and provenance

The extension estimates every occupied, non-folded opponent, including all-in
players, using that seat's position and observed action history. It preserves
the existing partial-history/unknown-depth safeguards.

- All opponents modeled: heads-up uses estimated_range; two or more use
  estimated_multiway_ranges with distinct ranges and cross-opponent blockers.
- Missing multiway range evidence: all opponents are sampled as random hands,
  with source random_hands and an explicit missing-range reason. A mixture of
  random and estimated ranges is never labeled fully range-based.
- Constructed ranges that fail sampling: equity and call EV are unavailable;
  there is no silent switch to random hands.
- Unsupported heads-up range evidence retains the existing unavailable behavior.

DecisionPacket includes per-seat range basis, position, status and confidence.
All three providers and the overlay distinguish random from joint range equity.
Existing preflop model and unverified-pot gates remain unchanged. Current polling
still cannot certify full preflop history; this sampling implementation does not
invent that evidence, so live random fallbacks remain possible.

Ranges are assumed independent before card conditioning. The sampler adds no
side-pot allocation, stack-specific pot eligibility, future action simulation,
or tournament/ICM model. Opponent profiles are handled separately (OPPONENT_STATS.md). Equity is not side-pot EV.

Tests cover tight and wide ranges, every street, known-card and cross-opponent
collisions, dead ends, impossible joint ranges, 2/3/4/5-way winner splits, seeded
replay, weighted river equity against exhaustive enumeration in both seat orders,
heads-up agreement, range selection, and source wording in every provider.

Run npm test, npm run typecheck, and npm run build. Reload the extension and the
PokerNow tab after rebuilding and restart the relay to load current dist files.
