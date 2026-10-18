# Scoped decision proofs — V2

## Implemented boundary and remaining work

Current scope update: [Phase 3D](PREFLOP_PHASE3D.md) documents the supported
UTG/HJ/CO/BTN opening windows and shared exact-five sizing contract. The original
hand-53/FOLD-only statements below describe the earlier implementation.
Later positions, facing actions, postflop EV and whole-hand completeness remain
unproven; no generic gates were relaxed.

`historyComplete` remains false and remains available to whole-hand accounting
and source diagnostics. It is not a requirement of the new decision proof
evaluator. Inspection found no existing direct global `historyComplete` gate to
remove: the live reader instead leaves `decisionPot=null`, exact legality and
model inputs unproven. Postflop/EV gates remain intact. The non-EV unopened chart
now has its own requirements and does not require a contestable pot.

The new layer represents decision-specific prerequisites, checks their binding
to the current input/model, prevents provider fallback on failure, and reports
scoped blockers. A conditional preflop RFI reference policy is now implemented;
it does not manufacture missing input evidence or a future-betting strategy.
**The hand-53 direct registration -> first UTG boundary can now produce an
assisted FOLD for an out-of-chart hand.** See the exact source/DOM conditions and
expiry in [SOCKET_STATE_AUDIT.md](SOCKET_STATE_AUDIT.md). This does not unlock
RAISE, later-position RFI windows or any generic EV policy.

## Representation and authority

`DecisionPacket.decisionProofs` contains a local decision epoch, source hand ID,
connection generation, canonical input binding and one record per proof scope.
Each scope has `proven | insufficient | contradicted`, evidence confidence,
provenance and reasons. A proven prerequisite requires high evidence confidence,
nonempty provenance and no unresolved reason. This confidence is about the
input evidence, not certainty of a range, EV or strategy.

The pure evaluator produces `allowed`, `state`, `supportedDecisionType`,
`requiredProofs`, `failedProofs`, reasons and each proof's permitted decision
classes. `allowed` from the **proof evaluator** means inputs are eligible for
policy evaluation; it is not itself a recommendation. The policy/relay's final
activation also requires an actual engine selection. Insufficient model coverage
or overlapping EV bounds cannot be resolved by an LLM.

The canonical binding includes cards, street, facing action, pot, stacks,
candidates, preflop context, current raise controls and source-window key,
range/equity/model inputs, confidence, local epoch,
source hand and connection generation. It survives JSON key order/schema
normalization and rejects stale evidence after any of those facts change.
It is a consistency check, not cryptographic authentication or a source
completeness certificate. The live adapter must still independently obtain every
claimed fact; a label supplied by an arbitrary client is not upstream evidence.

## Required decision scopes

The unopened reference requires current decision state/cards/hero turn, connection
continuity, the relevant ordered source action window, positions, exact dealt-in
roster, blinds, 100BB+ effective stacks and blind call cost. A RAISE additionally
requires independently proven sizing bounds and matching enabled controls.
FOLD does not require raising rights or a Raise panel. The proven first-action
window excludes previous hero betting, so a generic reopening certificate is
not an additional chart prerequisite.

Other classes keep current decision state, connection continuity, ordered action
window, blinds, stacks, call cost, contestable pot, eligibility, resolved
accounting and legal action-set requirements. No generic EV gate was removed.

| Class | Additional requirements | Existing strategy availability |
| --- | --- | --- |
| Preflop unopened | Proven position/dealt-in roster and unopened sequence; independent size legality only for RAISE | Conditional six-max 100BB+ reference policy; pot/EV/accounting proofs are irrelevant |
| Preflop facing one open | Proven position/roster, exactly one raise in ordered preflop evidence, relevant stacks, sizing/reopening | No deterministic response policy implemented |
| Heads-up call/fold | Supported range inputs and equity bounds, terminal call, reopening; raise legality if aggression is possible/unknown | Existing terminal river model; if raises are available every compared size still needs a response model |
| Heads-up bet/check | Range/equity bounds, terminal check, exact legal sizes and reopening | Existing river fold-or-call response model with per-size assumptions; not flop/turn |

For a proven closed-aggression river call/fold decision, unrelated minimum-raise
proof is not required. Call/fold is **not** substituted for a larger unresolved
action set. The existing engine still refuses to choose when legal aggressive
candidates lack models. Existing EV formulas, range uncertainty thresholds and
action/size locking are unchanged.

The preflop input's `historyCoverage=complete` means a separately established
preflop action window, not global whole-hand completeness. It is never populated
from polling, timestamp magnitude or a matching socket head. Open/3-bet/4-bet
level is never inferred from wager size. Clean classification alone is not
enough to activate the action policy.

## Conditional preflop reference policy

`preflopPolicy.ts` recomputes the context and looks up the existing
`openingRanges.ts` reference. Supported positions are UTG/HJ/CO/BTN/SB, exactly
six proven dealt-in positions, at least 100BB effective against every active
opponent, chip-EV context, no antes/straddles/extra posts. The complete relevant
window must contain the two normal 0.5/1BB blind posts and exactly the preceding
positions folding in order. The scoped first-UTG hand-start exception instead
proves simultaneous forced blind totals and an empty voluntary window, without
inventing post order. Hero has not previously acted and is now to act.
The two normal blind posts and absence of extra/voluntary posts are established
from the window, not a displayed pot. No contestable-pot amount, side-pot/return/
rake accounting, postflop eligibility or equity input is used by the chart.
`table.potBB` may be null for preflop; postflop packet validation still rejects it.
Aggregate data confidence can be low because the EV pot is unknown; activation
instead requires high independent confidence on every chart-critical proof.

Full-weight chart membership chooses RAISE; outside the chart chooses FOLD.
There is no limp, BB-option, response-to-open, 3-bet or short-stack model.
Sizing is an explicitly declared **fixed 2.5BB opening convention**, not sizing
data supplied by the reference charts and not a solver optimum. The current
visible, enabled Raise control must already select that total, with no read
ambiguities. Independent minimum, chip-unit and capacity evidence
must also establish legality. Selecting 2.5BB cannot create those proofs. SB
invests 2BB more; other supported positions invest 2.5BB. Nothing clicks or
submits the form.

The policy returns its chosen action, additional investment, total raise-to,
activation/proofs, `strategySource`, and `ruleExplanation`. `actionEVs` is empty:
neither equity nor fold equity is invented for this chart rule. An LLM can only
supply an explanation matching the fixed action and size; provider failure
retains the engine explanation. The overlay displays `RAISE TO 2.5 BB` or
`FOLD`. Model confidence remains medium, distinct from proof confidence.

`preflopExecution` carries the current-to-act observation, source-window key,
observed raise controls and optional independent `raiseBounds` in the packet
binding. Diagnostics expose this even
when no packet can safely be constructed. It is observational, not an action
window certificate. Outside the direct first-UTG boundary, the live preflop
builder marks its history partial and dealt-in count unknown; no synthetic proof
from the tests enters production.

## What is currently proven live

The adapter reuses existing scoped numeric contribution/call-gap evidence,
ordinary remaining-stack reads, explicit blind reads and current card/turn
checks. The observed continuous socket segment can satisfy the connection
prerequisite only; it cannot satisfy the action-window prerequisite. Existing
metadata gaps and identity conflicts block the connection prerequisite, and
reconnect starts with insufficient evidence. `historyComplete` is never read
as an activation condition or changed by this adapter.

Outside the scoped first-UTG source boundary, remaining unopened failures are recorded by
`inspectLiveUnopenedEvidence`, using actual ingested source events:

- A source `Player stacks:` row plus `registered.currentPlayer.id` establishes
  hero's mapped seat, cross-checked against the DOM. The row is not evidence that
  every listed player was dealt in; it contains no dealer or clockwise-order
  contract. Six listed entries are not upgraded to six dealt-in players. A union
  of multiple rows is not used as an initial roster. Membership changes or
  contradictory mappings fail closed.
- Source hand-start/posts/folds are inspected without borrowing DOM-inferred
  betting history. Prior calls/raises/unknown events reject the window. Even
  clean rows cannot establish absence of a delayed/omitted action through the
  current hero turn: no current-decision complete-prefix/catch-up contract exists.
  In six-max BTN/CO cases, earlier folds must also be known; forced blinds alone
  cannot prove that action legitimately reached those positions.
- The captured form is `novalidate`, with a text amount input and an enabled
  submit. No independently validated minimum/chip step or positive validation
  acknowledgment is exposed by the captured controls. The adapter deliberately
  leaves `raiseBounds` absent; slider values and an enabled selected 2.5BB amount
  cannot populate it.

These are multiple unresolved facts for the general path. The integration tests use production socket/log
ingestion, monetary parsing, the real Raise DOM reader, the live proof adapter and
relay policy wrapper. General log-only cases assert abstention; the separate
hand-53 real-envelope test establishes successful first-UTG FOLD activation.

For postflop/EV paths, additional failures remain:

- `readPotProvenance` still returns no hero-contestable decision pot. Reconciled
  display arithmetic does not resolve eligibility, returns or rake/drop.
- No current live producer supplies an independently complete ordered decision
  window. The existing scoped betting replay accepts independent evidence when
  attached to the exact state; polling/log timestamps cannot create it.
- Occupancy does not certify dealt-in/sitting-out state; the current clockwise
  position mapping remains an assumption.
- Captured Raise controls establish the selected amount/submit visibility only.
  They do not prove the complete legal action set, minimum or reopening rights.
- Live range estimates remain based on partial observations and do not supply
  the independent medium-confidence sensitivity/response models required by the
  policy.
- The live preflop producer supports only the documented first-UTG FOLD class.
  RAISE still lacks independent sizing legality. Responses to opens and
  nonterminal flop/turn action strategy remain unimplemented.

All-in/short-call eligibility, unresolved side pots, returns/rake, cumulative
short raises and unsupported multiway postflop remain blocked. Folded dead money
is not rejected merely for being folded; it still needs a contestable-pot proof.
Return/award accounting and settlement stack parsing are unchanged.

## Live integration and freshness

Diagnostics expose `decision.scopedProofs`, including proofs before a packet can
be built. The overlay distinguishes waiting for proof, unsupported situations,
contradictory/unsafe states, and an available recommendation. Missing proof is
not reported as a provider/network error.

Request identity now includes source hand/generation, cursor observation,
continuity and log/mapping/coverage revisions as well as the DOM. A changed
source invalidates an outstanding response even between polls. Identical log
refreshes do not change the revision merely because their local receive time
changed. The raw DOM history updater remains tied to DOM changes.

The relay explicitly requires scoped proofs for every live recommendation,
including requests omitting the live pot marker. Failed evidence causes no LLM
request in any mode. Legacy offline callers keep their existing API behavior.
When a permitted engine action exists, provider outages cannot change it, and
providers still only supply matching explanations.

## Verification and readiness

Tests cover conditional chart selections and their exact model limits, missing
order, socket gaps/reconnects, heads-up river selection, unsupported flop models,
unknown calls, side-pot/return/rake/reopening failures, multiway, settlement,
proof recovery/invalidation, stale packet binding and HTTP proof omission.
Synthetic certificates demonstrate the conditional path without changing any
global completeness flag; they are not live PokerNow evidence.

The hand-53 first-UTG producer now supplies the narrow exception described at
the top of this document. Its real-envelope regression exercises successful
FOLD activation and preserves historyComplete=false. One FOLD smoke test for
that class is justified; the broader blockers above remain relevant
outside this class. No repeat return/settlement or heads-up capture is needed.
