# Phase 4A: source-verified UTG open to five, then HJ

The multi-action continuation through HJ's accepted CALL and CO activation is
documented in [PREFLOP_PHASE4E.md](PREFLOP_PHASE4E.md). The text below records
the original Phase 4A scope and validation.

This implementation supplies **decision context only**. It does not enable
CALL, FOLD, 3-BET, ALL-IN, or LLM fallback against the raise. The existing
UTG/HJ/CO/BTN/SB unopened policies and BB abstention are unchanged.

## Evidence and limits

The local hand 169 capture contains:

- Sequence 65: a supported six-player hand boundary, UTG active, SB 1 / BB 2.
- Sequence 66: `tB[UTG]=5`, `cHB=5`, `cRPI=[UTG]`, `pITT=null`, no status
  changes, and the observed acceptance patch.
- Sequence 67: separate `cPI=pITT=HJ` activation, linked to 66.
- Sequence 68: a later update, which cannot renew the decision certificate.

The local receipt times are 1792133357379, 1792133424717 and
1792133425514 for 65/66/67. Historical acceptance happened after the original
UTG advice expired. This is still an observed poker action, not authorization
to revive UTG advice. HJ's **new** context deadline is its own activation plus
10,000ms: 1792133435514. Source cursor magnitudes are not treated as local
wall-clock timestamps or assigned undocumented units.

The capture was recorded by UTG. HJ's private cards were not captured.
The unchanged observer replay certifies the public transition only. The
source-to-overlay HJ tests explicitly simulate registration as HJ and HJ private
cards, using the real public action/turn envelopes and existing DOM reader-result
scaffolding. This is not a claim of a new HJ-browser live observation.

The sanitized two-frame fixture retains **all** acceptance/turn fields, including
those omitted from the earlier bounded acceptance fixture. Unknown extra fields
must fail the closed recognizer; they cannot disappear during projection.

## Reusable contract and one continuity authority

`bettingWindow.ts` defines `VerifiedBettingTransition`: table, hand/number,
generation, original six-player roster, actor ID/seat/position, street, action,
prior/new total contribution, additional investment, source predecessor/cursor,
local sequence/receipt time, and original raw source patch with contract provenance.
Only the observed `raise` transition is implemented. This type does not imply
generic CALL, CHECK, ALL-IN, re-raise or street-change support.

`projectFirstUtgSource` retains that bounded raw patch only if the entire
hand-169 shape matches. `createFirstUtgSource` remains the sole registration,
state-reduction, sequence, generation and predecessor authority. It invokes the
new recognizer only after its existing reducer accepts the update.

The recognizer requires:

1. The existing supported six-player, deep-stack, normal no-ante 1/2 profile
   anchor, observed with UTG or HJ as the registered observer.
2. Immediately consecutive UTG acceptance, with UTG previously current,
   contribution 0 becoming 5, other contributions still only SB 1 / BB 2.
3. Immediately consecutive separate HJ activation, with no intervening mutation.

It produces `sourceStatus.facingOpenProof` with scope `hj_facing_utg_open5`,
the original anchor, transition, HJ actor, continuity receipt and original
activation deadline. Every later update invalidates it; unchanged DOM polls,
controls and explanations never renew it. Reset/reconnect clears pending and
issued evidence. Global `historyComplete` remains false.

The public event can be observed by UTG; only a registered HJ hero with matching
cards, hand, dealer/position, source IDs, current turn, numeric stacks and
contributions can consume the HJ context. The raiser's DOM remaining stack must
match its original capacity minus 5. Existing live cross-checks are reused.
Contradictory logs, unknown actions, extra posts, folds, offline/settlement/all-in
states, and ambiguous/missing participants remain disqualifying.

## Context, legality and accounting

`buildLivePreflopContext` emits:

- `situation=facing_open`, hero HJ, original six players and five opponents.
- UTG's raise-to 2.5BB, investment 2.5BB, HJ contribution 0, call gap 2.5BB.
- `actionWindowEvidence=hj_facing_utg_open5`; no `openingEvidence` RFI permission.
- Ordered voluntary action from the source sequence.
- `historyCoverage=complete` **only for this closed preflop decision window**,
  not server-log coverage, whole-hand history or settlement completeness.

The live proof adapter exposes connection, action-window, roster, position,
capacity and call-gap facts. It explicitly reports the response class unsupported.
The production overlay shows the facing-open context without an actionable
recommendation or provider request. No packet bypass or new strategy is added.

Proven facts are the accepted historical total of 5, five chips additional from
zero, increase of 3 over the forced BB of 2, and HJ's current five-chip gap. `mR=8` is
retained only as an opaque observed discriminator. It does **not** certify HJ's
minimum re-raise, denomination, reopening rights, or a currently enabled CALL.
Those facts, contestable pot, and response strategy remain unknown/unsupported.

The transition does not update a monetary ledger. Gross/net hand commitments,
returns, awards and side-pot accounting retain their existing safety gates.
This avoids applying the accepted wager twice or confusing a current street
total with additional chips on a later action.

## Regression coverage

Tests replay the original hand-169 prefix and full raw acceptance/turn patches
through the existing projector and source authority. Production-path tests use
the MAIN observer, runtime, live cross-check, preflop context, scoped proof adapter
and actual overlay, without injecting selected decisions or fabricated proofs.

Coverage includes original UTG observer versus simulated HJ observer, the frozen
roster, contribution/investment arithmetic, original activation deadline,
expiry/clock regression, missing/replayed/skipped/coalesced updates, wrong
actors, unsupported wagers/all-ins, malformed registration, generation recovery,
source/DOM contradictions, unknown log rows, and no outbound game sends.
Full validation also includes all five existing opening positions and BB
abstention.

## Validation

- Targeted betting-window, HJ-source, BB-abstention and exact-five integration
  suites: **129 tests passed**, including **53 new Phase 4A tests**.
- `npm test -- -- --maxWorkers=1`: **2,522 tests passed across 93 files**.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run build:extension`: passed; both checked-in extension bundles rebuilt.
- `git diff --check`: passed.

The first full run and an isolated retry hit the existing relay startup timeout.
Direct local startup succeeded, followed by a passing isolated runtime test and
a passing complete rerun. No relay behavior or timeout was changed.
Raw local evidence is excluded from this change; the new committed fixture is
the explicitly sanitized public transition described above.

## Next slice

Phase 4B's reference review and implementation outcome are recorded in
[PREFLOP_PHASE4B.md](PREFLOP_PHASE4B.md). It adds reference-contract infrastructure
and live blocker diagnostics; no response action has been enabled.

Review a bounded HJ-versus-UTG 2.5BB response strategy for the matching profile
and effective depths, including how its CALL/FOLD/3-BET alternatives are treated.
Establish any required CALL-control and re-raise bounds/grid/rights independently.
The new action/context proof is reusable input; it is not sufficient authority
to activate those actions. Do not turn an unsupported response into FOLD.

No repeat of the historical accepted UTG raise is required. A future HJ-browser
smoke check can confirm context display only, within ten seconds of explicit HJ
activation, without asking HJ to submit any poker action.
