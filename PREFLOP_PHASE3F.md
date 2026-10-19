# Phase 3F: BB support audit — activation remains blocked

Current follow-up: [Phase 3G](PREFLOP_PHASE3G.md) adds a local capture-audit tool
and strategy-boundary regressions; BB remains blocked. SB RAISE is now enabled
by [paired hand224 evidence](PREFLOP_SB_224_RAISE.md). Earlier SB-blocked statements
below describe the historical Phase 3F implementation.

No BB action is enabled. This pass adds regression protection and documents two
independent missing contracts: six-player SB-completion source evidence and a
BB-versus-SB-limp strategic policy. A legal free CHECK does not establish that
checking is strategically preferred. No production code or charts changed.
UTG/HJ/CO/BTN FOLD/RAISE and SB FOLD retain their existing scope; SB RAISE stays
blocked. Whole-hand `historyComplete` remains false.

## Captured evidence

| Capture / hand | Exact observations | What it establishes |
| --- | --- | --- |
| raise-5-accepted.json / 164 | Registration sequence1 already in hand164; UTG fold2/HJ3, HJ fold4/CO5, CO fold6/BTN7, BTN fold8/SB9, SB fold10, settlement11 | A BB walk. No source BB activation. Registration is not a witnessed fresh boundary |
| raise-sizing-paired.json / 146 | Boundary48, folds49/51/53/59, SB activation60, SB fold61, settlement62; intervening updates55–58 | Another BB walk; not the closed uninterrupted four-fold grammar |
| hand-49-raw-socket.json / 49 | Two dealt-in players; boundary3 SB1/BB2; patch4 assigns SB2; frame5 activates hero BB; empty eventsData | Strongly supported heads-up completion candidate, not a six-player prefix or an independently verified generic call grammar |
| hands147/165 | Four explicit folds, hero SB activation, then SB fold and settlement | Existing SB authority; no completion or BB action |
| hand169 accepted5 | Hero UTG raises, subsequent actor activates | Not an SB completion or BB option; no BB strategy or sizing authority |

The complete raw exports were inspected, including registration, hand markers,
tB/pGS, actors, pre/now and settlement. Earlier diagnostic/projection reports
do not supply the missing complete six-player raw completion/BB-turn pair.
The older hand49 report fixture is explicitly a summary; it was not promoted
to invented socket envelopes. Later sparse-state reducer support strengthens
interpretation of assigned values, but does not turn hand49 into six-player
evidence or supply the missing closed completion grammar/corroboration.
Hand146 updates55–58 set and remove `disconnectedSince` for SB/BTN; they are
not missing poker actions that may be silently skipped to repair the prefix.

## Reusable production pipeline and exact missing pieces

Incoming sockets pass through `eventSource.ts` and its bounded projection to
`liveTimeline.ts` / `firstUtgSource.ts`. `firstUtgState.ts` is the existing state
and continuity authority. `hjWindow.ts` validates exact raw fold/turn shapes;
`coWindow.ts` extends that same ordered prefix through SB. It rejects wagers,
unknown fields and skipped/coalesced transitions, rather than inferring actions
from final totals. A complete incoming raw shape must be examined before
projection discards fields. No new reducer is needed or introduced.

`firstUtgLive.ts` cross-checks fresh scoped witnesses against the current DOM.
`preflop.ts` builds the context, `decisionProofs.ts` supplies scoped proofs, and
`openingSizeEvidence.ts` supplies only existing exact-five permissions.
`contentScript.ts` constructs an eligible packet and renders the engine result
immediately; providers explain it without replacing it. Existing epoch/source
guards, expiry and stale-explanation rejection remain unchanged.

| Required BB fact | Present authority | Missing / decision |
| --- | --- | --- |
| Six-player hand, frozen positions, normal blinds/profile, identities and depth | Existing validated boundary and fold-prefix architecture | Reusable; no current BB anchor/certificate producer |
| Four preceding folds, each followed by the next actor | Existing exact fold/turn grammar | Reusable if observed consecutively; DOM folded classes cannot supply it |
| SB completion from1 to2, no intervening aggression | Hand49 candidate, known assignment convention | No captured supported six-player completion patch plus explicit BB turn and independent action cross-check |
| BB sole actor and zero call gap | Would require explicit linked cPI/pITT plus unchanged BB2 and SB2 | Current DOM alone cannot prove the action window |
| SB fold instead of completion | Explicit pGS fold followed by settlement in164/146 | No BB action; never manufacture CHECK or a certificate |
| SB raise | Wager exceeds normal BB; distinct response situation | Unsupported; not a limp, unopened RFI or an exact-five permission |
| CHECK versus RAISE strategy | None in current policy | Blocking independently of source and legal controls |
| BB raise amount / investment / acceptance | Existing exact-five rule requires contribution0 | Not transferable to BB contribution2; no BB sizing authority |
| Freshness | Existing per-actor activation +10s machinery | Future BB proof must start at explicit BB activation, not renew the anchor or use DOM polling |

`openingRanges.ts` deliberately has no BB RFI reference. Its scope guard returns
null for BB; an empty raw range is not an all-hands FOLD table. `preflopContext.ts`
can describe a limped pot when given a complete ordered input; classification is
not a strategy. `evaluatePreflopReference` rejects limps and BB RFI use, and
`decisionPolicy.ts` returns through the preflop reference branch before generic
postflop EV logic. There is no BB isolation/check-back chart or validated
comparison of CHECK to RAISE. Range/equity heuristics do not fill that gap.
Neither AA nor 72o nor KQo establishes a supported BB action by itself.

## Regression scope

- Sanitized hand164 fixture: existing bounded registration plus all raw fields
  of sequences2–11, with identity substitution only; exact timestamps/order.
- Real MAIN socket bridge -> reader/adapter -> overlay walk replay: no action,
  no recommendation/provider request and no outbound game socket action.
- Same source authority issues no opening certificate for that BB walk.
- Clearly synthetic completion/raise, wrong actor, missed update, predecessor
  gap, reconnect, replay and aged-evidence variants stay blocked, even when
  parsed DOM independently shows BB current with zero call cost (three facing
  the synthetic five-chip raise). These are rejection tests, NOT captured
  completion evidence or successful BB activation tests.
- Engine negatives for AA/72o/KQo: even independently supplied synthetic legal
  CHECK/RAISE facts cannot create a missing BB strategy.
- Existing SB/BTN/CO/HJ/UTG suites continue to cover positive recommendations,
  source changes, expiry and late/wrong LLM explanations. No BB LLM request is
  created, so no fictional pending BB explanation is manufactured for a test.

Validation:

- Targeted browser-reader BB/SB suites: 199 tests passed. Targeted policy/context:
  85 passed. There are 13 new regressions (10 source/overlay and 3 engine).
- Full suite: 2,388 tests in 91 files passed with
  `npm test -- -- --maxWorkers=2`, including all prior-position regressions.
- The initial unrestricted `npm test` hit the existing 15s relay-startup timeout
  and two existing CO-log test timeouts. That failed run was stopped. The full
  lower-concurrency rerun passed without altering timeouts or test assertions.
- `npm run typecheck` and `npm run build` passed. Rebuilt bundles have no content
  changes because production code is unchanged.
- `npm run build:extension` and `git diff --check` passed.

## Smallest next step, not general blind defense

Before activation, define and justify one explicit deep-stack six-player
BB-versus-single-SB-completion strategy reference, including when CHECK is
preferred over an isolation raise. A live capture can verify source/controls;
it cannot prove strategic correctness. Do not default to CHECK while waiting.

One bounded passive source capture is necessary for the source side: use the
existing raw recorder before a fresh supported six-player hand with hero BB;
retain the boundary, four folds and separate activations, SB's ordinary
completion from1 to2, and explicit BB activation. Stop at that first BB decision,
before any BB action. Export once and include the matching Session Log call row
and a contemporaneous diagnostic showing SB2, BB2, zero call cost and current
BB/check control. Record ordinary stack capacities as well. No raise panel or
submitted BB action is required; no new collector is needed. If the natural
sequence instead contains a fold, raise, reconnect or unrelated update, it is
not the requested evidence and must not be edited into a completion.

Enable the existing recorder in the PokerNow page console before the hand:
`sessionStorage.setItem("poker-ai:raw-socket-capture", "1"); location.reload();`
At BB's first decision, use `copy(window.pokerAIRawCapture.exportJSON())` once.
That stops/disarms the capture. Keep the export local with its dropped-data
status; truncation/gaps cannot be repaired into proof. No relay restart is needed
for this passive capture; this pass changes no runtime code.

After both contracts exist, extend the shared prefix recognizer by exactly the
observed completion/activation pair, preserve the frozen six-player roles,
issue one dependent BB proof with the original activation deadline, and add an
actual positive source-to-overlay decision test. No general history permission,
multiway limps, short stacks, facing aggression or postflop follows from it.
