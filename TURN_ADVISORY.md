# Heads-up turn advisory

## Verification status

| Capability | Status |
| --- | --- |
| Automated turn advisory integration | Tested with deterministic calculations, synthetic source windows and the production overlay code. |
| Actual live numerical display | Not independently confirmed. No new manual PokerNow capture was performed. |
| Verified unconditional turn recommendation | Unsupported. Future river betting is explicitly unmodeled. |

This milestone extends the existing river diagnostic pipeline from baseline
`18b738d`. It preserves the river calculation and preflop behavior and adds no
flop functionality. Automated fixture success does not certify an actual live
decision or server action permission.

## Supported calculation and source window

The diagnostic requires exactly four community cards, two valid hero cards,
one remaining opponent, a positive fully payable non-all-in CALL, and known
remaining stacks. It reuses the existing source adapter and bounded reducer.
Supported windows begin at a continuous flop-to-turn boundary with cleared
street contributions, followed by either an opponent-first bet or a hero
check followed by an opponent bet, then hero activation. Source amounts must
match current DOM cards, roster, stacks, contributions, pot displays and the
enabled CALL control. Other source shapes and action sequences are unsupported.

The existing range infrastructure supplies two explicit heuristic mixtures:
strong value with 10% weak holdings, and thin value with 30% weak holdings.
Weak turn holdings can include draws/semi-bluffs and air; the range is frozen
before enumerating rivers. These are assumptions, not observed betting
frequencies, solver strategies or statistical confidence bounds.

For every legal weighted opponent combination, the evaluator enumerates all
44 possible river cards after removing hero, board and opponent cards. Ties
receive half credit. The overlay shows estimated equity under each range,
required equity and a conditional CALL-versus-FOLD comparison:

- Required equity = CALL / (pot before hero CALL + CALL).
- Checkdown CALL EV = equity * pot before hero CALL - (1 - equity) * CALL.
- FOLD EV = 0; prior contributions are sunk.

The pot before CALL includes the outstanding opponent bet exactly once.
Numerical EV assumes one fully hero-contestable pot, resolved returns and zero
rake/drop. Those accounting assumptions remain explicitly unproven. Missing
pot or wager evidence is not supplied by defaults or borrowed from a previous
registration/hand. Multiway, all-ins, short calls, invalid cards, unsupported
range buckets and unresolved observed returns withhold the calculation.

## Display and authorization protections

The existing overlay renders a separate **ILLUSTRATIVE ONLY** panel with
**Checkdown-only CALL EV** and the explicit warning:

> Future river betting is unmodeled. Unconditional CALL/FOLD recommendation withheld. RAISE not evaluated.

A turn CALL normally leaves another betting round. Future bets, folds and
additional costs can change realized EV. Positive or negative checkdown EV
does not select a verified action. The calculator returns `chosenAction: null`,
`liveAuthorized: false` and `llmMayChoose: false`; the diagnostic does not issue
a relay/LLM action request or promote any live decision proof.

Registration, sequence, predecessor, generation and hand/hero identity checks
remain mandatory. The original 10-second activation expiry is not renewed by
polling or cached calculations, and is checked again after enumeration. Source
changes, disconnects, contradictory DOM/control reads, invalid cards and read
failures invalidate the display. Delayed responses from a prior decision cannot
restore an old recommendation. Unsupported valid turn sequences discard only
their diagnostic window so a later supported river can still be recognized;
broken source continuity still requires recovery through the existing gates.

## Focused validation

Finalization validation passed: 440 tests across 12 selected files (9 range
engine, 224 AI core and 207 browser-reader tests), all listed typechecks, the
extension build and the staged whitespace check. No full test suite was run.

The selected tests cover draws, paired/unpaired boards, weighted ties, card
removal, value/bluff sensitivity, favorable/unfavorable conditional EV, missing
money, invalid cards, multiway, all-ins, source/DOM contradictions, expiry,
disconnects, later river support, actual overlay rendering in automation and
stale response rejection. River and preflop regression tests are included.

```powershell
npm run build:extension
npm run typecheck --workspace=@poker-ai/range-engine --workspace=@poker-ai/ai-core --workspace=@poker-ai/browser-reader
npm run test --workspace=@poker-ai/range-engine -- src/turnEquity.test.ts src/riverBettingRange.test.ts
npm run test --workspace=@poker-ai/ai-core -- src/turnCallFold.test.ts src/riverCallFold.test.ts src/preflopPolicy.test.ts src/preflopResponsePolicy.test.ts
npm run test --workspace=@poker-ai/browser-reader -- src/turnAdvisory.test.ts src/river406.test.ts src/riverOverlay.test.ts src/staleResponse.test.ts src/decisionProofRuntime.test.ts src/hjLive.test.ts
git diff --check
```

The extension build includes the TypeScript dependency build, extension
typecheck and both shipped bundles. The turn fixture is explicitly synthetic
and uses placeholder identities. Private evidence, credentials and unrelated
local files are excluded. The full test suite is not required for this milestone.
