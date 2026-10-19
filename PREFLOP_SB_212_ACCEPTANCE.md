# Hand212: accepted SB total five, UI input semantics still unverified

**Historical audit:** the later [paired hand224 evidence](PREFLOP_SB_224_RAISE.md)
resolves this missing input-to-total link and enables the scoped SB rule.
Hand212 alone did not establish that link; the assessment below is preserved.

Result: **SB RAISE remains blocked**. Source-side acceptance is verified for the
observed hand/profile; the current end-to-end feature also interprets input5 as
total5 and tells the user to manually set five. The new raw file cannot verify
that nonzero-contribution input mapping. No sizing certificate or permission
was added. SB FOLD, other positions, charts and all deadlines are unchanged.

## Exact evidence audited

Local `evidence/sb-raise-5-capture.json` contains 12 incoming frames, generation1,
registration captured, zero rejected frames, and no control/checkpoint object.
It was stopped/exported below its recorded bounds. Numbers below are recorded
local receive timestamps, not a guessed unit conversion of source cursors.

| Sequence | Evidence |
| --- | --- |
| 1 | Registration in hand211: six seats/IDs, source profile0.1.72, th/4fun, blinds1/2, ante=null; source stacks245/249/247/253/249/259 |
| 2 | Hand212 boundary; hero7c7d, original SB seat1, BB seat2, UTG3/HJ5/CO9/BTN10; tBhero1/BB2; matching dealt-in membership |
| 3/4 | Explicit UTG fold, separate HJ turn |
| 5/6 | Explicit HJ fold, separate CO turn |
| 7/8 | Explicit CO fold, separate BTN turn |
| 9/10 | Explicit BTN fold, separate hero SB turn; receivedAt1792393083516 |
| 11 | ReceivedAt1792393125288; tBhero5, cHB5, cRPI includes hero, pITT=null; mR8 observed only |
| 12 | Explicit BB cPI/pITT, linked to the accepted-action cursor |

Every pre/now link matches. The existing source reducer and exact four-fold
recognizer accept the original SB window with profile/depth intact. Its expiry
is **1792393093516**. Acceptance is **41.772 seconds after activation**, or
31.772s after expiry. The historical action cannot renew that certificate or
authorize a new decision. Hand212's77 is inside the unchanged SB RAISE chart;
blocking it must not substitute FOLD.

The contribution difference is 5-1=**4 chips** (2BB additional), while the total
is5 chips (2.5BB). This is arithmetic from source totals; frame11 does not supply
a new stack balance or the submitted form value. We do not claim an observed
four-chip stack debit, outgoing request body or particular input value.

## Authority and remaining dependency

| Fact | Conclusion |
| --- | --- |
| Supported initial SB opportunity | Existing source-verified boundary and four-fold prefix, plus live DOM cross-checks required for new decisions |
| Accepted SB opening total5 | Proven for this observed profile/state by tB/cHB and subsequent BB turn; not a pre-action acknowledgment |
| Existing contribution1 / additional4 | Proven contribution plus arithmetic; not input semantics |
| Five representable as a resulting total | Observed server outcome; no generic chip grid, min/max or mR decoder follows |
| Exact value entered in hand212 | Missing; incoming socket frames do not carry it |
| UI input5 / displayed2.5BB means total5 when SB posted1 | Not established by this file. Older UTG input/result pairs had contribution0, so total and additional coincide |
| Fresh independent SB decision | Must still use the original SB activation+10s, current actor/cards/epoch/profile/capacity and continuous source; historical acceptance never renews it |

`raiseControlRead.ts` reads the live input.value correctly but calls the result
selectedRaiseToChips by convention. That identifier/comment is not evidence of
server interpretation for a nonzero contribution. The earlier short-all-in UI
observation supports the total interpretation, but does not contain the paired
input and accepted SB source transition. Phase1 explicitly left this cross-check
open. HTML pattern, slider values, native validity and enabled submit do not
establish it either.

Server acceptance and control readiness remain separate: missing controls do
not negate the observed legal total. However, extending the current shared
producer would also authorize the existing readiness check and instruction to
enter5. Without the pairing, a system using input4 as four *additional* chips
would be consistent with the observed source result, too. We do not silently
choose between those interpretations, implement a speculative readiness branch,
or mark a panel ready using only an enabled button. The current integrated SB
RAISE feature therefore stays gated. Its diagnostic now names this narrower
gap instead of incorrectly saying all historical acceptance had zero contribution.

## Smallest missing evidence

Prefer an already saved pre-submit hand212 screenshot/checkpoint or precise
contemporaneous control observation tied to this hand: the live amount value,
displayed BB amount, SB contribution1 and the same manual submission that
produced source total5. If such evidence exists, **no repeat of the accepted
raise is needed**. The incoming raw file alone cannot reconstruct it.

If none exists, only one paired SB control/source example is needed. Use the
existing collector in the same supported profile and four-fold SB opportunity;
record the actual selected input and BB display immediately before a separately
user-authorized manual submission, then retain its linked accepted source total.
One `five_chips_entered` checkpoint is enough if that is the actual input; the
manual label alone is not proof. No new Min Raise or general-grid investigation,
whole-hand capture, or BB action is required. Use the correlated export after
acceptance, not a raw-only export. No poker action is performed by the assistant.

After the pairing resolves input semantics, the existing ONE sizing producer
can be extended with total5/contribution1/investment4 and source SB scope, with
the same dependent schema, epoch/profile/capacity checks and earliest expiry.
That future change must update engine sizing and raiseLegality together; no
parallel continuity validator, chart change or general-history permission.

## Changes and regression verification

Only the blocking diagnostic text changes in production. Sanitized hand212
fixtures preserve frame3–12 payloads, original cards, numeric values, order and
timing; baseline player data is restricted to proof fields and IDs replaced.
Raw evidence remains ignored. Simulated current DOM/control states in tests
are explicitly not captured UI evidence.

The real MAIN -> source proof -> adapter -> overlay replay checks original77
stays blocked with panel closed, selected5, selected4, contradictory BB display,
disabled and duplicate controls. Source tests establish the fresh window and
original expiry, accepted total5 minus posted1, and BB turn. Historical acceptance
cannot revive a decision; a labeled out-of-chart card variation still FOLDs,
expires and rejects its late explanation. Existing prior-position regressions
and unsupported SB-RAISE tests remain in place.

Validation passed:

- Targeted SB suites: 198 tests, including nine new hand212 regressions.
- Full suite: 2,397 tests in 91 files using `npm test -- -- --maxWorkers=2`.
  The worker limit avoids the previously observed default-concurrency timeouts;
  no assertions, test timeouts or safety gates changed.
- `npm run typecheck`, `npm run build`, `npm run build:extension` and
  `git diff --check` passed. The tracked extension bundle was regenerated.
