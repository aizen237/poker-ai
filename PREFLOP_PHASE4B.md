# Phase 4B: HJ response reference review and activation blockers

## Outcome

**No HJ response action is activated.** The authorized fallback in task item 3
is implemented: reusable, versioned strategy-reference infrastructure, with
production diagnostics explaining the missing reference and separate legality
requirements. This is not a completed FOLD/CALL/3-BET poker policy.

Phase 4A's accepted UTG total of 5 chips followed by HJ activation remains the
only supported response window. All five opening-position policies, BB
abstention, ten-second deadlines, manual action mode and `historyComplete=false`
are unchanged. No reference was fabricated to make FOLD available first.

## Strategy audit (2026-10-20)

### Existing assets

| Asset | Reusable | Does not establish |
|---|---|---|
| `range-engine/openingRanges.ts` | Hand notation and existing RFI references | HJ defense against UTG; changing its interpretation would change strategy |
| `actionNarrowing.ts` | Weighted opponent ranges, contextual estimation | A hero response table; Chen ordering/percentile bands are heuristics |
| `rangeEquity.ts`, poker-engine simulations | Equity under explicitly supplied ranges | Equity realization, squeezes from four players behind HJ, or a response policy |
| `preflopContext.ts` | Original positions, commitments, pairwise capacities, single-open classification | A reviewed response chart or general history completeness |
| `decisionPolicy.ts` / `preflopPolicy.ts` | Existing engine action lock and RFI implementation | Facing-open strategy; the current preflop policy deliberately rejects it |
| `bettingWindow.ts` / `currentFacingOpen` | One source authority, public raise event, fresh HJ activation and DOM cross-check | Strategy, CALL controls, or future 3-bet rights/grid |
| `policyRecommendation.ts` / content-script lifecycle | Engine rendering, provider isolation, stale-response rejection | Permission to ask an LLM to replace missing deterministic strategy |

### External references investigated

1. **GTO Wizard's official solution catalog is a credible candidate, not an
   imported response reference.** It documents six-max preflop General/Research
   solutions with 2.5BB opens, cEV and several raked models, and separate depths
   including 100BB and 125BB. General permits cold calls; Simple removes cold
   calls from most positions. Therefore a Simple tree's lack of CALL cannot
   silently become evidence that CALL is bad in an unrestricted model.
   [Official solution settings](https://blog.gtowizard.com/simplified-solutions-and-a-new-interface/)

2. **A custom model can match the actual profile more closely.** The provider
   documents exact asymmetric stacks, rake/cEV, custom raise sizes and
   cold-call options. This establishes an available research route, not the
   strategy at our HJ node. No solve or node export was obtained in this task.
   [Official multiway preflop documentation](https://blog.gtowizard.com/introducing-multiway-preflop-solving/)

3. **PokerCoaching's public six-max chart page** advertises implementable
   opening/3-bet charts. The accessible page/download link did not expose a
   complete HJ-versus-UTG node, frequencies, tree settings or rake applicability.
   It is not sufficient to transcribe a strategy for this implementation.
   [Official chart page](https://pages.pokercoaching.com/6max-gto-charts)

The accessible GTO Wizard app page likewise supplied no inspectable node
frequencies. No account was created, subscription purchased or email sent.
Generic search-result ranges were not treated as reviewed evidence.

**Verified reference vs adaptation vs heuristic:** an exact documented node is
a reference only for its actual assumptions. Applying a 100BB symmetric solve
to hand 169's 122–131BB, unequal capacities is an adaptation needing
an explicit review and bounded coverage. Applying it to *any* 100BB+ depth is
unjustified. A Chen-ranked or guessed premium-hand response would be a
heuristic, not the requested reviewed strategy. Play-money status also does not
establish that a particular raked cash solution applies. The currently missing
item is a reviewed, inspectable response artifact, not another ordinary hand
capture.

## Implemented reference contract

`ai-core/preflopResponsePolicy.ts` adds policy version
`hj-vs-utg-2.5bb-reference-v1` and a bounded schema for:

- Reference ID/version, source URL/node, reference/adaptation/heuristic/test
  provenance, review status, assumptions and review notes.
- Six-max HJ versus UTG 2.5BB, no ante, source solve's six-position stack vector, rake description,
  cold-call availability and explicit 3-bet sizes.
- Matching PokerNow profile, finite minimum/maximum capacity coverage and
  applicability rationale. Exact references require their native per-position
  stack vector, not just matching minimum/maximum depths; extrapolation requires
  an explicit adaptation label and review.
- Explicit canonical hand entries with FOLD, CALL and sized THREE_BET
  frequencies. Missing hands remain uncovered. Duplicate/invalid entries,
  undocumented sizes and inconsistent frequency totals fail validation.

`reviewHjResponseReference` is an **offline classification/review function**.
It checks context applicability but does not validate source connectivity,
mint a decision certificate or authorize an action. It preserves pure actions,
mixed actions and mixed raise sizes without sampling or rounding. Its
`strategyClass` is separate from `chosenAction=null` and `liveAuthorized=false`.
A self-declared reviewed flag cannot enable live advice.

`inspectLiveHjResponseStrategy` has **no installed reference and no reference
argument**. Page messages, DecisionPackets and fetched data cannot inject a
chart. A future reviewed artifact needs a deliberate implementation change;
adding an offline reference does not secretly activate it.

The extension invokes this diagnostic only after the existing
`currentFacingOpen` cross-check succeeds. It exposes `responseStrategy`, bound
to table, hand, hero, generation, cursor, decision epoch and the **original**
activation/expiry timestamps. Expired or contradicted windows produce null.
No second reducer, source proof system, timer or renewal mechanism was added.

## Legality evidence matrix

| Fact/action | Established now | Still required for activation |
|---|---|---|
| HJ first response | Phase 4A boundary → UTG accepted open → HJ activation, with live cross-checks | Must remain fresh and consistent for every recommendation |
| Five-chip gap | UTG street total 5 minus HJ total 0 | This proves the contribution gap, not an available CALL control |
| Payable amount if CALL is authorized | Capacity exceeds the gap, so `min(5, remainingStack)=5` | Independent current CALL permission/control contract; do not infer it from a Raise panel |
| FOLD | No sizing or pot-EV proof is needed for a valid response chart FOLD | Reviewed response strategy plus the existing fresh response proof |
| CALL | Numeric amount/capacity are available | Reviewed CALL frequency/model and its prerequisites; current CALL authorization |
| 3-BET | Hero stack gives an arithmetic investment cap | Reviewed total size, raise rights, full minimum, permitted maximum, chip denomination/grid and contradiction checks |
| `mR=8` | Opaque field in the observed UTG acceptance patch | No verified current HJ minimum/reset contract; cannot be promoted to one |
| Historical open-to-five rule | Authorizes only its reviewed unopened profiles | Does not authorize raising to five *over* UTG's five or any other HJ 3-bet |

`tableRead.ts` currently reads the Raise form but has no certified CALL-control
reader. `actionLegality.ts` checks packet arithmetic, including a capped call,
but is not a source of live permission. `proveBettingLegality` requires an
independently supported rules/grid/ordered-street input; the narrow Phase 4A
context must not be relabeled as generic complete history to satisfy it.

The diagnostic reports remaining requirements per action: FOLD does not inherit
CALL/RAISE blockers. These are explanatory lists, not another activation gate.
The existing response activation remains unsupported. No rejected CALL or
3-BET is converted to FOLD and no provider request is made for this response.

## Tests and evidence boundaries

Unit tests exercise the reference contract using **synthetic test allocations**
for 72o, 88, AA and AQs. They are not a real poker chart and provide no strategic
authority. Tests cover pure/mixed classifications, two raise sizes, tiny mixed
frequencies, absent hands, invalid sums, source metadata, depth adaptations,
wrong contexts, missing capacity and the absence of an LLM/passive fallback.

Production tests extend the existing hand-169 MAIN → source → context → proof
adapter → overlay replay. Public action envelopes remain captured evidence;
HJ registration/private-card and DOM variations remain explicitly synthetic.
Tests verify diagnostics and abstention with several hand classes, visible or
disabled/contradictory Raise controls, insufficient stacks, actor/hand/source
mismatches, reconnects, unchanged polling and exact expiry. There is no positive
live-action test because there is no reviewed strategy to activate. Provider
delays cannot create advice: no HJ response request is issued. Existing opening
recommendation and late-provider-response regressions remain in the full suite.

## Exact next task

Obtain and review **one HJ-versus-UTG 2.5BB node artifact**: six-max no ante,
explicit rake/cEV model, UTG range and complete action tree (including whether
CALL was allowed), all covered hand frequencies, each 3-bet total, and source
depths. Prefer a matching asymmetric-stack solve or document a bounded depth
adaptation; do not silently map every 100BB+ stack to 100BB. Preserve mixed
frequencies and identify any incomplete hand coverage.

After that review, install the artifact and add a dependent response-policy
activation path using the existing Phase 4A certificate. Pure FOLD can be the
first slice without sizing or pot-EV gates. For CALL, establish its current
control/action permission separately. For THREE_BET, establish rights, bounds,
grid, reviewed size and capacity binding. Mixed entries must continue to abstain
until an explicit, reviewed mixed-policy execution design exists.

No live action test is justified by this infrastructure-only change, and no raw
evidence capture is needed to resolve the strategy-reference blocker.

## Validation

- Targeted reference-review tests: **51 passed**.
- Targeted source-to-overlay betting-window tests: **60 passed**.
- Full `npm test`: **2,580 tests across 94 files passed**, including 58 new tests.
  Workspace totals: ai-core 491, browser-reader 1,791, opponent-db 41,
  poker-engine 101, range-engine 147, shared 9.
- `npm run typecheck`, `npm run build`, `npm run build:extension`, and
  `git diff --check`: passed. The committed extension bundle is rebuilt.

An earlier full run hit the existing relay startup test's 15-second timeout.
A standalone relay startup succeeded in 1.365 seconds; the full rerun passed
with the original relay test unchanged. No timeout or relay behavior was
modified to obtain a pass. Raw game evidence is excluded from this commit.
