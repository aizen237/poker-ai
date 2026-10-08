# Live monetary and legality audit

Updated with the controlled live evidence supplied on 2026-10-07. Captured
board/raise HTML and human-reported monetary observations establish only the
scopes in [LIVE_LEGALITY_PROOFS.md](LIVE_LEGALITY_PROOFS.md). Unit tests alone
cannot establish DOM behavior. Portion 9 live activation remains disabled.

## Trace from DOM to decision

| Value | Read and parsing | Decision use |
| --- | --- | --- |
| Main display | `tableRead.ts`: `.table-pot-size .main-value .normal-value` -> `potMainValueText` -> `parseChipsValueText` -> `state.potMainValue` and `assessment.pot.mainPot` (chips). | Preserved for diagnosis; never automatically selected as the EV pot. |
| Add-on display | `.table-pot-size .add-on-container .normal-value` -> `potTotalValueText` -> `state.potTotalValue` / `assessment.pot.displayedTotalPot` (chips). | Observed as collected + current-street contributions; each snapshot must reconcile. Not added to main or equated with hero's contestable pot. A missing display remains null. |
| Current bets | Each `.table-player-bet-value` -> `betValueText` -> `currentBet` (chips). | Explicit numeric values are verified street totals and explicit check is zero in supported reads. Missing labels, `call`, `raise`, `All In`, or invalid text are unknown in the live assessment. |
| Amount to call | `assessScopedMonetary`: `max(0, max(active opposing contributions) - hero contribution)`, with explicit contribution proofs. | This is the **uncapped wager gap**, not a raise-to or the amount a short hero can actually pay. Folded opponents are excluded from this maximum; their chips are not removed from the pot. The legacy exported `calculateAmountToCall` helper retains its older absent-as-zero behavior; it is not used by the live verification gate. |
| Blinds | `.blind-value .chips-value .normal-value`, currently first SB / second BB. | Parsed positive numbers, no default BB=1. Invalid/missing/ambiguous reads lower confidence and prevent BB conversion. Selector order still requires live confirmation. |
| Stacks | `.table-player-stack .normal-value` -> `stackText` -> numeric chips or null. | Hero/opponent stacks remain separate from street contributions. Literal `All In` in the numeric element or stack container sets all-in status even without a numeric value; an absent numeric element keeps stack null, never zero. Container text is not a numeric fallback. |
| Selected raise-to | Visible `form.raise-controller-form` -> `.raise-bet-value input.value` live value property -> `legality.raiseControl.selectedRaiseToChips`. | Captured selection is 21 chips with `10.5BB` displayed separately. Visible Raise submit status is scoped to the same form. This is a selected total, not additional investment or a verified legal minimum; slider min/max/value are never used to derive either amount or minimum. Existing policy gates remain unchanged. |
| Decision pot | `readPotProvenance` -> `assessment.pot.decisionPot`, also exposed as `assessment.decisionPot`. | Currently null, source null, semantics unverified. No setting silently selects main, add-on, or their sum. |

`assessLiveState` retains pot provenance even when another field prevents full
state assembly. `verification.monetary` reports per-snapshot contribution, call
gap and display facts. `verification.betting` reports only the scoped ordered
proofs. Unknown fields retain reasons and null values; a partial proof never
sets `legality.verified=true`. Missing contributions lower confidence independently
of the contestable-pot gate; explicit check does not mean absence is verified.

Before either preflop or postflop advice, the extension checks confidence,
hero/position/BB/call data and verified pot provenance. It does not construct a
live packet while these gates are closed. A future verified packet carries
`potEvidence`: the two display numbers, chosen decision pot/source, verification
flag and BB, all in chips. `table.potBB`, `hero.stackBB`, and
`facingAction.amountBB` are converted once by dividing by BB.

The relay preserves this evidence. The policy refuses unverified evidence,
chip/BB mismatches, or contradictory policy/live pot sources, even if someone
sets `dataConfidence` to high. Legacy non-live callers still need explicit
`policyContext.potVerified` for an engine selection.

## Derived values and conflations checked

- Equity sampling uses cards and opponent ranges, **not the displayed pot**.
- Pot-odds breakeven uses decision-pot chips and call-gap chips together; the
  result is dimensionless. No pot-odds output is emitted before the read gate.
- Cached `callEV` is in BB (the previous portion corrected a chips/BB mismatch).
  The policy recomputes EV from packet BB values rather than trusting this cache.
- The EV pot must include hero-contestable outstanding wagers before the new
  investment. Display arithmetic is verified for supported reads; eligibility,
  returns and rake/drop are still unverified, so neither display is an EV input.
- Effective SPR now uses the smaller known heads-up remaining stack. The old
  hero-only stack/pot ratio is no longer presented as effective SPR. Unknown
  opponent stacks and multiway spots omit this scalar rather than guess it.
- Policy sizing is **additional investment**; `raiseToBB` separately records
  total street contribution. The opponent's additional call on a raise excludes
  chips already in the pot. Candidate fractions never use an unverified pot.
- A subtotal of visible bet labels is diagnostic only. It includes folded money
  and is explicitly marked incomplete if numeric values are missing. It is not
  an alternative pot formula and may include stale labels.

## Legality changes verified in code

- CHECK requires a consistent zero call amount; CALL requires positive cost and
  a readable positive hero stack. Missing/contradictory amounts cause abstention.
- FOLD is not offered when checking is available. A rejected action can fall back
  to CHECK in that case; unknown legality can return no recommendation at all.
- BET/RAISE require explicit sizing. Wagers cannot exceed hero's remaining stack;
  ALL_IN means exactly that stack. An all-in call is distinct from aggression.
- The policy grid and fallback validator share minimum/step/reopening checks.
  Minimum raise-to is supplied only by verified evidence, never inferred from a
  snapshot's current high bet or approximate action history.
- A short all-in below the full minimum is permitted only with reopening rights.
- Policy candidates are capped to matchable effective chips, avoiding uncalled
  excess in EV. Multiway and preflop sizes are not fabricated by this postflop
  sizing model. Missing exact bounds disable aggressive advice.
- A zero-stack hero lowers live confidence. Unknown/all-in text remains distinct
  from a numeric zero; it is not silently coerced.

These tests verify formulas/contracts and blocking behavior against the supplied
scoped evidence. They do not certify unobserved PokerNow states. Further evidence
must use the timestamped
screen/JSON comparison in [LIVE_STATE_CHECK.md](LIVE_STATE_CHECK.md). Even after
pot and legality verification, Portion 9 also needs supported range uncertainty
and per-size response evidence for the branches it is asked to select.
