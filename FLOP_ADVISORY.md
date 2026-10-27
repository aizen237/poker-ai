# Illustrative heads-up flop advisory

Extends baseline `52ba7dbc80fdc81c8f5f92e87d67a2eb5b97b938` using the existing
turn/river source adapter, range engine, evaluator and overlay. Deterministic
fixtures exercise the production overlay; actual live display has not been
independently confirmed. No manual capture or automatic action is required.

The supported window has three board cards, two hero cards, one remaining
opponent, positive remaining stacks and a positive fully payable non-all-in
CALL. A continuous preflop-to-flop collection/deal is followed by either an
opponent-first bet or hero check/opponent bet, then hero activation. Source
identity, actor, roster, stacks, board, pot displays and native CALL must agree.
For an opponent-first flop, the source's cleared wagers and subsequent sole
opponent bet can establish hero's zero contribution even without a wager label.
A blank DOM label alone never supplies zero. Other missing or contradictory
inputs withhold numbers with an abstention reason.

The shared range model supplies strong value plus 10% weak hands and thin
value plus 30% weak hands, uniform within each bucket. Weak hands may contain
draws, semi-bluffs and air; these are explicit hypotheses, not inferred betting
frequencies. The existing sampler evaluates 10,000 seeded turn/river runouts
per range, removes hero/board/opponent cards, weights opponent combinations
and splits ties. Results are estimates with sampling error; the range spread
is not a confidence interval. The evaluator and draw/texture detectors supply
current hand, direct flush/straight draw and board labels. Backdoors participate
in runouts but are not separately labeled; draw labels are not guaranteed outs.

The existing panel displays **ILLUSTRATIVE ONLY**, each range's estimated
equity and these conditional quantities:

- Required equity = CALL / (pot before CALL + CALL).
- Checkdown CALL EV = equity × (pot before CALL + CALL) − CALL.
- FOLD EV = 0, treating previous contributions as sunk.

The observed pot arithmetic includes the outstanding bet once. EV additionally
assumes all chips are contestable in one pot, resolved returns and zero rake;
these accounting assumptions remain unproven and explicitly labeled. Both
remaining streets must check down. Future turn/river betting and equity
realization are not modeled. `chosenAction` stays null, `liveAuthorized` and
`llmMayChoose` stay false, and no recommendation/relay request is made.

Multiway, all-ins/short calls, side pots, unresolved returns, betting/raising
strategy and unsupported transport/action sequences remain outside scope.
Original activation deadlines are never renewed by calculation or polling.
Expiry, disconnect, identity/source changes, read failures and contradictory
DOM evidence clear numerical results. Existing preflop/turn/river behavior
and the bounded diagnostic bridge are covered by regression tests.

## Finalization validation

Validated against baseline `52ba7dbc` on 2026-10-27: 675 tests passed across
14 selected files (19 range-engine, 253 AI-core and 403 browser-reader tests).
The production extension build and relevant typechecks passed. Rebuilding
produced byte-identical contentScript.js and eventSource.js bundles, confirming
that the shipped bundles were already synchronized with their TypeScript sources.

```powershell
npm run build:extension
npm run typecheck --workspace=@poker-ai/range-engine --workspace=@poker-ai/ai-core --workspace=@poker-ai/browser-reader
npm run test --workspace=@poker-ai/range-engine -- src/flopEquity.test.ts src/turnEquity.test.ts src/riverBettingRange.test.ts
npm run test --workspace=@poker-ai/ai-core -- src/turnCallFold.test.ts src/riverCallFold.test.ts src/preflopPolicy.test.ts src/preflopResponsePolicy.test.ts
npm run test --workspace=@poker-ai/browser-reader -- src/turnAdvisory.test.ts src/river406.test.ts src/riverOverlay.test.ts src/staleResponse.test.ts src/decisionProofRuntime.test.ts src/hjLive.test.ts src/flopCallEvidence.test.ts
git diff --cached --check
```

Review found no blocking implementation issues. Existing preflop, turn and
river behavior remains preserved within the reviewed scope and selected
regressions. No additional functionality, live captures or full-suite run was
needed. The added fixture uses synthetic identities; private evidence,
credentials and unrelated local files are excluded from the commit.
