# Heads-up opponent range estimation V1

estimateOpponentRange now accepts structured actions, opponent position, history
coverage, preflop effective depth, dealt-in count, chip-EV scope, and known cards.
Actions retain street, prior full-raise count, facing action, optional aggressor
position, and observation batch. An open requires explicitly unopened play;
zero observed raises does not rule out limpers or missing hero actions.

## What the model does

- A verified 100BB+ six-max chip-EV open conditions the current weighted prior
  on that position's RFI reference. BTN starts wider than UTG. BB has no RFI
  reference; it never becomes an empty defending range.
- A verified deep-stack preflop 3-bet retains roughly the strongest 25% of
  weighted combination mass (18% against a known UTG raiser). A later re-raise
  retains 12%. Chen scores order starting hands; equal-score boundary hands
  stay together, so the retained fraction is approximate.
- A contextual flat call keeps roughly 65% of stronger weighted mass against
  an open, or 50% against further raises. Premium weights are halved, not
  eliminated: premium traps remain possible.
- Each step operates on the previous range, preserving original weights except
  for the explicit call adjustment. None of these thresholds is calibrated,
  a published solution, or an opponent-specific frequency. Re-raises/calls
  have low model confidence; sizing and bluff construction remain unmodeled.
- Flop/turn/river bets and raises are distinct evidence. V1 retains the prior
  for both, with low confidence and an explicit missing-board-model reason.
  Starting-hand Chen ordering is not used as postflop strength. A preflop
  opening prior may carry forward from an observed open; an opening chart
  is never initialized merely because a player bets postflop.

## Missing evidence and blockers

Unknown/partial preflop action context does not establish open versus 3-bet.
Unknown all-in labels do not double-count aggression. Tied observations or
regressing streets/order do not establish a sequential narrowing step.
Unsupported depth, table size, or tournament context retains the previous prior.
Without a supported prior or conditioning event, all legal starting hands are
an explicitly unconditioned prior (prior_only), not a modeled opponent range.

Known hero/board cards are removed from expanded combinations, not whole hand
classes. Zero-weight hands generate no combinations. If a heuristic eliminates
all legal combinations, the last usable weighted prior is retained, with low
confidence and an explicit fallback reason. If the supplied prior itself has
no legal combinations, the result is unavailable. Random hands are not silently
substituted for a failed heads-up range.

## Live integration and packets

PokerNow polling records omit hero actions and may miss opponent actions.
The adapter passes street, action, underlying all-in wager, and observation,
but marks raise counts/facing context unknown and history partial. Current
postflop stacks are not passed off as original preflop effective stacks.
Consequently current live reads cannot establish a supported preflop range
from this history alone. Heads-up packets omit range equity and call EV when
only an unconditioned prior is available; other reliable packet facts remain
available to the normal AI pipeline. The existing unverified-pot safety gate
still applies and has not been relaxed.

DecisionPacket carries the readable sequence (for example Estimated from CO
open -> preflop call), range status, model confidence, assumptions, and fallback
reasons. All provider prompts and the overlay expose this uncertainty separately
from confidence in DOM parsing. Multiway range sampling is now supported as
described in MULTIWAY_EQUITY.md. Every active opponent gets an estimate. When
all are modeled, distinct ranges are sampled jointly; otherwise the multiway
random fallback remains explicitly labeled with the missing-range reasons.

Live opponent profiles are now integrated; see OPPONENT_STATS.md for eligible
evidence, shrinkage, identity limits, and bounded VPIP/PFR adjustments. These
adjustments do not relax range scope. No postflop solver, ICM, sizing-aware
response charts, or new action-log collection is implemented.

Run npm test, npm run typecheck, and npm run build. Restart the relay and reload
the extension and PokerNow tab after rebuilding generated output.
