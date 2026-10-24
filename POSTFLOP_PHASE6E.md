# Phase 6E: narrow hand243 flop CALL cost and legality assessment

Implemented from HEAD `787b8b40ad89bf9e2baff005a223d41638965c6d` on
2026-10-24. `git fetch origin` confirmed HEAD contains the remote history
(24 local commits ahead, zero behind). Reviewed Phase6B/6C/6D, the original
hand243 JSON and screenshot, the source projector/reducer and dependent flop
observer, contribution accounting, CALL control reader, preflop CALL legality
adapter, decision proofs and MAIN-to-overlay tests.

**The frame20 prefix independently supports an exact two-chip payable cost
if CALL is authorized, with sufficient hero capacity. Historical acceptance is
already certified separately. The supplied capture does not certify a timed,
enabled UI control or a live CALL permission within the original window.**
No live permission, complete legal-action set or recommendation is added.

## Evidence and independent source facts

Raw files were read only and excluded from the commit. The existing sanitized
fixture is unchanged. Duplicate-key and exact-safe-integer checks pass, and
substituting only table/hand/player IDs and player names reproduces the fixture
exactly, including capture metadata. All 22 envelopes have generation1,
sequences1-22, strictly increasing receipts/cursors and matching predecessors.

| Local evidence | SHA-256 |
| --- | --- |
| `evidence/flop-hand-243-raw.json` | `d6079e294273287ec04f088653c8b32434b608ecce3098105918c4d1d96e5270` |
| `evidence/flop-hand-243-before.png.png` | `e9c8ce8dd0c80c7297c2b34b55993a665a6e2d267344550e9b62e4f41e6592be` |

The source authority remains
`eventSource -> projectFirstUtgSource -> createFirstUtgSource -> advanceUtgState`,
with the existing closed hand243 observer and accounting gate. No new reducer,
bootstrap, source grammar, timer or poker action is introduced.

| Fact at frame20 | Independent evidence |
| --- | --- |
| Registered hero is seat1, original HJ, `PLAYER_1` | Registration plus hand243's frozen boundary roster; no hand239 state |
| Current actor is hero | Explicit frame20 `cPI=pITT=hero`, `pASA=now`, `sNA=sNAA=null` |
| Flop `6h Qh 3s`, hero `9d Qc` | Validated frame14 transition and unchanged closed prefix through frame20 |
| Outstanding highest contribution is2 | Frame15 SB bet sets `cHB=2`; subsequent closed patches preserve it; SB/BB/UTG totals each2 |
| Hero prior flop contribution is0 | All six totals explicitly deleted at frame14; no subsequent hero contribution before frame20 |
| Ordinary hero stack254, remaining capacity254 | Frame14 explicitly collects preflop2 from boundary256; no later stack mutation or hero flop investment; frame20 `mAVTB=254` |
| Exact payable cost if authorized is2 | Highest2 minus prior0; capacity254 covers the entire gap |
| Result if called: total2, arithmetic capacity252 | Addition/subtraction only; no claim of a new ordinary-stack observation |

Cost is derived before frame21 is ingested. It needs neither pot semantics,
the screenshot, a CALL label nor the later accepted action. It does not clamp
a shortage into a supposed all-in CALL. Changed stack vectors, other hands'
profiles, positions/cards/boards, repeated opportunities and later streets
remain outside this closed contract.

## Three distinct evidence levels and time

1. **Source-backed cost:** the new `postflopCall` diagnostic exposes
   `payableIfCallAuthorizedChips={status:"proven",value:2}` and explicit
   highest/prior/capacity facts, bound to the original source activation.
2. **UI readiness:** the existing native CALL reader and shared readiness
   assessment report unobserved, unusable, contradicted or observed matching.
   Matching requires a within-window receipt, unique enabled supported CALL2
   control and synchronous DOM agreement on hero/actor, roster/positions,
   board/cards, blinds, contributions and numeric capacities. A DOM/control
   contradiction cannot change the independent source cost into permission.
   Missing zero DOM totals are accepted only against the source's explicit
   zero baseline, never as independent zero evidence.
3. **Historical server acceptance:** Phase6C's separate
   `historicalFlopAcceptance` certifies frame21 hero0->2, unchanged highest2,
   turn release, then frame22 CO activation. No click or request-correlated
   acknowledgment is inferred. This is evidence of the accepted past action,
   not a fresh permission or an extension of the observer's deadline.

| Event | Local receipt / deadline |
| --- | ---: |
| Hero activation, frame20 | 1792832960591 |
| Original exclusive expiry | 1792832970591 |
| Accepted CALL, frame21 | 1792832973609 |
| CO activation, frame22 | 1792832974441 |

Acceptance arrived **13,018ms after activation**, **3,018ms after expiry**.
The diagnostic is unavailable at expiry, after acceptance and after CO
activation. Source updates, gaps, reconnect/disconnect and invalid projections
retain existing invalidation. Reads, fresh controls, log refresh and historical
acceptance cannot renew the deadline. Cached snapshots are also checked against
the original deadline. Replaying these old receipts in tests does not create
a current live opportunity.

The screenshot visibly agrees on board/cards, CALL2, hero254 and main12/total18.
It has no paired local before/after timestamps, recorder cursor/sequence status,
or captured DOM visibility/enabled attributes. Parts of the controls/table are
obscured. Desktop/console time, file dates and visual similarity cannot place it
at frame20 or inside the ten-second window. Every timed DOM/control read in
tests is explicitly simulated, not reconstructed screenshot evidence.

## Production boundary and exact missing capture

`flopCallEvidence` consumes the existing fresh observation and Phase6D accounting
through `buildLiveDecisionProofs`. It uses the existing `ProvenFact` representation
and extracts the existing preflop readiness logic into a shared helper without
changing its conditions or messages. The source facts remain available even if
controls are missing/disabled or DOM values disagree; UI readiness is separate.
Wrong source identity/actor, inconsistent bindings/amounts/capacity, missing
accounting or stale evidence produce no new diagnostic.

Neither `proveBettingLegality` nor `proveContestablePot` is invoked: the prefix
does not meet their complete-history/net-accounting input requirements. The
existing legality fact representation is reused without supplying invented
coverage or rules flags.

The diagnostic always has `permission=null`, unknown current `serverLegality`,
`fullActionSetCertified=false`, `historyComplete=false` and
`liveRecommendationsAllowed=false`. It does not replace any general decision
proof scope. Existing observation/acceptance `facts` remain null for payable
CALL, legal actions and contestable pot; the new explicitly conditional cost
has its own diagnostic field. Existing preflop permissions and all postflop
recommendation blockers are preserved.

The missing capture for live readiness is a **single paired observation** of
the complete unobscured table and controls, with:

- Local `Date.now()` before and after the synchronous table/control read,
  both at or after activation and strictly before its original expiry.
- Recorder/source status immediately before and after: table/hand/hero,
  connection generation, latest sequence/cursor and activation receipt, with
  no intervening action, reset, reconnect or unsupported update.
- Native CALL control shape/text/amount, uniqueness, visibility and enabled
  state, including disabled/aria-disabled/inert ancestry, alongside current
  hero/actor, cards/board, contributions and stacks.

The current files cannot supply this observation retroactively. A future
manual capture needs its own reviewed source prefix and deadline; hand243's
late acceptance must not be assigned a fabricated earlier receipt. Such a
capture would establish readiness/binding only to its reviewed extent; it
does not automatically install permission or strategy for another profile.

Other blockers remain: complete ordered betting-history authority; full action
set and bet/raise/reopening rights; independently resolved returns/rake and
hero-contestable pot/side-pot eligibility; later streets, all-ins and repeated
opportunities; independently supported postflop strategy/range/equity and
future-betting model. No automated poker actions, provider requests or
speculative strategy were used.

## Validation

Focused tests cover source-only cost before acceptance, matching simulated
controls, absent/hidden/disabled/inert/ambiguous controls, stale/pre-activation/
future observations, exact expiry and attempted renewal, wrong hero/actor/
street, stack shortages, contradictory source/DOM/control amounts, missing
prefix frames, source binding mismatches, defensive result independence and
real late acceptance. MAIN-to-overlay replay asserts no recommendation,
provider request, outgoing action or promotion of existing blocker scopes.

| Check | Result |
| --- | --- |
| Final nine targeted source/control/legality/freshness suites | 665 passed |
| `npm.cmd test -- -- --maxWorkers=1` | **3,300 passed across 107 files** |
| Optional Python PHH replay suite in existing `.data/phase5d-venv` | 14 passed |
| `npm.cmd run typecheck` | Passed across all workspaces/apps |
| `npm.cmd run build` | Passed |
| `npm.cmd run build:extension` | Passed |
| Working/staged `git diff --check` | Passed |
| Exact fixture substitution and original evidence hash recheck | Passed; originals unchanged |

Full-suite totals: AI-core491, browser-reader2,341, opponent-db41,
poker-engine101, range-engine317, shared9. This adds 79 focused tests and
extends the existing MAIN-to-overlay cases. The final targeted/full runs used
unchanged production/test code and exited zero. The generated content bundle
is updated; rebuilding the event-source bundle produced no content change.

An intermediate test incorrectly expected matching UI readiness when missing
pot fields prevented the existing reader from building a usable table state.
The tests now separately verify source-cost independence and unavailable UI
readiness. No reader requirement or source deadline was weakened.

PowerShell labels redirected esbuild progress `NativeCommandError`; both build
processes exited zero and emitted successful bundles. Raw evidence, local logs
and the pre-existing `.agents/` directory are excluded from the commit.
