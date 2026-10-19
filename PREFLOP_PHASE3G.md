# Phase 3G: BB completion evidence tooling; live decisions remain blocked

This pass makes the remaining source investigation repeatable and adds strategy
boundary regressions. It does **not** activate CHECK or RAISE, issue a BB proof,
or claim a complete action history. Current UTG/HJ/CO/BTN/SB opening FOLD/RAISE,
including the hand224 SB exact-five rule, remain unchanged.

## Exact proposed scope

Six originally dealt-in players, PokerNow0.1.72 normal 1/2 no-ante play-money
Hold'em and the existing conservative deep-stack checks. A validated fresh hand
anchor is followed by explicit UTG fold/HJ turn, HJ fold/CO turn, CO fold/BTN
turn, BTN fold/SB turn. SB voluntarily adds1 to reach total2; BB retains total2.
An immediately linked source update activates hero BB with no additional call.
The original six-player positions persist. No all-in, straddle, replacement,
limp from another seat, prior aggression, unexplained patch or continuity gap.

SB fold is a walk/settlement, not a BB decision. SB total above2 is a response to
aggression and outside this task. A total2 DOM display alone proves neither an
SB completion nor the preceding four-fold sequence.

## Source evidence inventory and concrete tool

`npm run audit:bb -- evidence/local-capture.json` now provides a local, read-only
audit of an existing raw export (also accepts the paired collector's rawSocket
wrapper). It bundles the repository's audit helper in memory; it does not start
the relay, access the network, write evidence, or interact with PokerNow.
Maximum input is500 frames/4MiB. Output contains local identifiers/raw candidate
patches: keep it local. Input data is not modified.

The helper calls the existing `projectFirstUtgSource` and `createFirstUtgSource`
authority, reads its accepted carried-state diagnostics and uses `hjPatchKind`
for observed fold/turn shapes. It has no new reducer, source continuity validator
or production import. Malformed updates, skipped sequences, stale/replayed
cursors, generation changes and rejected baselines retain the existing behavior.
The tool indexes only observations: SB total-two candidate, SB increased-total
raise observation, SB fold and explicit BB turn. A link identifies adjacent
accepted candidate/turn frames; it does **not** validate a completion grammar or
mint a prefix certificate. Unknown raw fields remain in the report, never
discarded to pretend the patch is supported. Dropped/truncated export warnings
cannot be erased by a plausible final state.

Replayed all seven available raw exports, including the paired wrapper:

| Raw export | Observations relevant to this task |
| --- | --- |
| hand49 | Two-player total1->2 at4, linked BB activation5; no six-player prefix |
| hand53 / hand68 | No SB completion/BB activation pair |
| raise-5-accepted | Six-player SB folds in164-168; no completion |
| raise-sizing-paired | Six-player SB folds in142-150; no completion |
| sb-raise-5-capture (212) | Total1->5 at11; BB activation12; facing aggression |
| sb-raise-224 | Total1->5 at11; BB activation12; facing aggression |

The two longer exports each contain one pre-registration update, reported as
rejected before the valid baseline. It is not silently repaired into coverage.
Saved diagnostic/projection summaries cannot recover discarded raw patch fields.
The new sanitized hand49 regression fixture preserves the actual two-player
membership and frames2-5; it never adds four fictional folds or a six-player
registration. Existing source-to-overlay walk tests remain negative.

## Exact missing completion contract and reuse plan

Hand49 supplies a useful **candidate shape**: one tB assignment to the SB,
empty pGS, pITT=null, cRPI containing SB, wBACPI containing BB, sNA=NSAA,
then the familiar separate cPI/pITT=BB turn patch. These opaque fields are not
decoded from their names. It still needs a matching six-player observation and
independent Session Log/DOM corroboration of the voluntary one-chip completion.
Do not insert this shape into `hjPatchKind` or treat it as a certified fold.

Once captured and reviewed, extend the existing frozen anchor/fold recognizer
to BB and exactly that closed completion/turn pair. Reuse the existing reducer's
continuity receipt. Check the prior source actor is SB, both actors' identities
and eligibility, unchanged BB2, SB1->2, no additional wager/status/roster mutation
and consecutive raw/source sequence. A new `bb_vs_sb_completion` window must
remain separate from `preflop_unopened`; its original deadline starts only at
the explicit BB activation and expires ten seconds later. No DOM renewal,
source heartbeat renewal, generic historyComplete or borrowed SB size proof.

Nothing in this pass calls that future contract proven. Even a future six-player
candidate printed by the audit remains observational until that implementation
and a strategy are reviewed. Its output deliberately always says
`bbDecisionEnabled=false` and `historyComplete=false`, with no actionable expiry.

## Strategy research and why no policy was invented

| Existing asset | Reusable capability | Missing for this decision |
| --- | --- | --- |
| openingRanges / preflopPolicy | Existing five-position RFI classification | No BB-vs-limp chart; an SB RFI range is not an SB limping range |
| preflopContext | Describes a limped pot given a complete ordered input | Classification does not choose an action; no live completeness claim follows |
| actionNarrowing | Weighted ranges, blockers, position and ordered action context | SB call facing no raise remains prior_only; no calibrated limp/limp-call/limp-reraise branches |
| rangeEquity / multiwayEquity | Showdown equity vs supplied weighted ranges, deterministic RNG | Does not estimate action-conditioned future EV or equity realization |
| calculateRaiseEV | Explicit fold-or-call sensitivity calculation | Needs response probabilities/equity; excludes re-raise and future betting |
| decisionPolicy | Terminal EV comparisons and uncertainty gates | Preflop CHECK does not end the hand; check EV is neither automatically0 nor raw equity times pot |
| opponent-db | Shrunk observational statistics | No supported SB limp response tree or BB comparison inferred from VPIP/PFR |

External primary training sources were also examined (2026-10-19):

- [GTO Wizard: Playing Limped Pots as the BB in MTTs](https://blog.gtowizard.com/playing-limped-pots-as-the-bb-in-mtts/)
  discusses stack-dependent BB raising/checking and links tournament solutions.
  It is not a verified six-player no-ante play-money strategy artifact for our
  profile. Its tournament examples cannot silently become this cash-like rule.
- [GTO Wizard: Is Limping Pimping?](https://blog.gtowizard.com/is-limping-pimping/)
  examines custom limping models with specified assumed ranges, including a
  Lojack example. It does not supply the missing exact SB-completion policy.
- [Upswing: Playing Blind vs Blind](https://upswingpoker.com/blind-vs-blind-poker-strategy/)
  offers general blind strategy, not an importable matched SB-limp decision table.

Inference from the inspected assets and sources: no reviewed reference/model
currently establishes which of CHECK or RAISE is preferred in the target profile.
There is no defensible default CHECK merely because it is legal. No scraped
chart, random-hand caller range, assumed50% fold equity or RFI transplant was added.

A regression counterexample uses the existing fold-or-call formula only as an
illustration: at pot2BB and hypothetical investment/opponent call2BB, changing
unknown equity-if-called/fold-equity from(.25,0) to(.75,.5) changes raise EV
from-0.5BB to2.25BB. An illustrative fully-realized50% check would be1BB. The
ranking reverses even before accounting for future play. These are synthetic
sensitivity values, NOT empirical ranges, legal sizes or a strategy certificate.

The smallest strategy artifact needed is a reviewed, versioned BB-vs-single-SB-
completion reference for an explicit effective-depth interval, no-ante chip-EV
profile and accounting/rake assumptions. It must specify SB limp range/response
assumptions, permitted raise sizes, CHECK/RAISE frequencies or EVs and how any
mixed actions are selected. A strictly supported CHECK subset could activate
first without BB raise sizing, but only if that reference supports the choice.
A solver/model alternative needs both checking and raising future-action values,
including SB limp-reraise responses, with uncertainty and sensitivity checks.
Neither can be supplied by a new live hand alone. RAISE would additionally need
independent BB sizing legality; SB total5/posted1 authority is not BB posted2 authority.

## Tests and validation

Positive tests validate the **audit output**, not a live BB recommendation:
actual hand49 candidate/turn provenance, actual224 raise exclusion, actual164
walk exclusion, wrapper support and CLI serialization/read-only behavior.
Negative cases cover missing frames, generations, predecessor/replay/time/hand/
table mismatches, malformed/string/missing totals, extra wagers, wrong actors,
all-in/BB contribution changes, unknown fields, bounds and dropped frames.

Production-path tests confirm no BB action/provider request/outbound game send
for walk, hypothetical completion, raise, bad actor, skipped/gapped/replayed
update, changed hand, ambiguous contributions, reconnect and aged evidence.
Engine regressions reject even synthetic legal CHECK plus extreme equity or
false terminal flags; range tests establish that a known SB completion still
does not provide a modeled SB range. Existing late-explanation/expiry and all
five-position regression suites remain in the full run. No fictional positive
BB policy or pending BB LLM request was injected to make tests pass.

Validation results:

- Targeted suites passed: 29 capture-audit tests, 12 BB source-to-overlay
  abstention tests, 183 SB live regressions, 56 preflop policy tests and seven
  equity-selection tests (287 distinct tests).
- Full `npm test -- -- --maxWorkers=1`: **2,469 tests in 92 files passed**
  (ai-core440, browser-reader1731, opponent-db41, poker-engine101,
  range-engine147, shared9). All five-position regressions are included.
- The initial two-worker full run had one existing BTN log-test timeout at5s;
  all other tests passed. The complete single-worker rerun passed without
  changing assertions, test timeouts, proof lifetimes or runtime behavior.
- Root typecheck passed; the local npm audit entry point and serialized output
  were exercised against the sanitized actual hand49 fixture.
- Full build, explicit extension rebuild and `git diff --check` passed. The
  generated live bundles have no content changes: the helper is offline-only.

## One smallest live capture still needed

Use the existing recorder, with hero **BB**, before a fresh supported six-player
deep-stack hand. Retain registration, boundary, four folds and separate turns,
SB ordinary completion1->2 and explicit BB activation. Stop **before BB acts**.
Include one simultaneous diagnostic (SB2/BB2, zero call, current BB and available
CHECK) plus the same hand's Session Log SB call row with player ID/timestamp.
No Raise panel, test raise, submitted BB action or full postflop hand is needed.
If SB folds or raises, it is a different case; never edit it into a completion.

Enable before the hand in the page console:
`sessionStorage.setItem("poker-ai:raw-socket-capture", "1"); location.reload();`
At the first BB option: `copy(window.pokerAIRawCapture.exportJSON())`.
While BB is still the current actor, use
`localStorage.setItem("poker-ai:diagnostics", "once")` and save the next
**Copyable snapshot JSON**, together with the matching Session Log SB call row.
This one-shot DOM cross-check does not replace source evidence or renew proof.
Export stops/disarms the capture. Save locally, then run
`npm run audit:bb -- evidence/your-bb-completion.json`.
The output helps inspect the missing contract but cannot authorize advice.
No relay restart or new collector is required for this passive evidence capture.
