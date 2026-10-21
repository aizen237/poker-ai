# Phase 4C: dependent HJ CALL cost, capacity and readiness evidence

## Outcome

**CALL recommendations remain blocked.** The existing evidence proves the
five-chip cost and sufficient capacity in the Phase 4A window. It does not
independently establish server CALL authorization. This change makes that
distinction explicit and reusable; it does not claim a complete CALL legality
certificate or install a response strategy.

The five existing opening policies, BB abstention, strategy charts, provider
behavior, ten-second source deadline and `historyComplete=false` are unchanged.
No poker action is automated. No new parser, reducer or connectivity authority
is introduced.

## Evidence inspected

- `evidence/raise-5-accepted.json`: sequence 65 begins the six-player hand;
  sequence 66 reports UTG total 5 / `cHB=5`; sequence 67 independently reports
  HJ as `cPI=pITT`. Sequence 68 is a later cursor update, not a CALL acceptance.
  The existing sanitized hand-169 fixtures retain these public envelopes.
- The capture is from UTG's browser. It does **not** contain HJ private cards,
  HJ's visible CALL control or HJ submitting/receiving acceptance for CALL.
- Saved diagnostics for hands 62, 68, 80, 103, 115, 121, 127 and 133 contain an
  unclassified native `BUTTON`, `type=button`, enabled, with text `Call 2`.
  This supports a conservative label observer, not a specific PokerNow CALL
  selector/hierarchy, a live HJ `Call 5` observation or server permission.
  A sanitized control-only fixture records exactly these facts without IDs.
- `mAVTB`, `mR`, `sNA`, empty `eventsData` and an active-player ID are not
  decoded as CALL permission. UTG's historical opening authorization does not
  authorize a response call or 3-bet.
- Existing betting legality requires independently supported rule/grid and
  ordered-street inputs. The narrow response window is not promoted to a
  generic complete-history input. Hand accounting is unchanged; no wager is
  added merely because a conditional CALL amount was calculated.

## Established versus unverified

| Fact | Status and authority |
|---|---|
| Profile, original six-player roster, HJ position | Existing Phase 4A anchor and source/DOM cross-check: PokerNow 0.1.72, normal 1/2, no ante, play-money Hold'em, deep stacks |
| UTG accepted total | Exactly 5 chips, observed source acceptance |
| HJ contribution | Exactly zero from the certified boundary and unchanged source totals, not inferred from absent DOM text |
| HJ actor | Separate source-backed activation, matching registered hero/cards/DOM turn |
| Contribution gap | Highest opposing source total 5 minus HJ total 0 = 5 |
| Full CALL capacity | Numeric source/DOM HJ remaining stack covers 5; actual hand-169 HJ capacity is 249 chips |
| Payable amount **if authorized** | `min(gap, remainingStack)=5`; resulting total would be 5. This is conditional arithmetic, not an accepted action |
| UI readiness | One supported visible enabled native `Call 5` label can corroborate the source amount; production reader now observes it, but only synthetic HJ variants are available for regression tests |
| Server CALL legality | **Unproven**: no reviewed server CALL rule/permission contract or applicable accepted HJ CALL transition in available evidence |
| Tournament CALL strategy | **Missing**: Phase 4B has no approved response artifact. This chip/profile evidence supplies no tournament-stage, payout, ICM or broader blind/depth strategy |
| 3-bet | Unchanged/unproven rights, bounds, denomination and reviewed size; no new permission |

## Implementation

`callLegalityEvidence.ts` is a dependent producer alongside
`openingSizeEvidence.ts`. It calls **the existing `currentFacingOpen`** authority,
then derives chip arithmetic from its certified totals and current capacity.
It never accepts a caller-supplied connectivity certificate or repairs history.

The result binds profile, table, hand/number, hero ID/seat/cards, generation,
source cursor, activation sequence, decision epoch and the original source
receipt/expiry. It supplies the existing `callCost` scoped proof. It separates:

- Source-proven `facts` and `costProof`.
- `ui`: unobserved, unusable, contradicted or observed_matching.
- `serverLegality`: unproven, low confidence, explicit missing authority.
- `legalActionsProof`: insufficient, or contradicted for a concrete UI conflict.
- `authorized=false` and `historyComplete=false`.

No amount/size is put into an actionable packet. Phase 4B diagnostic call-cost
fields now consume this producer rather than repeating hard-coded five-chip
facts. Matching buttons cannot create a recommendation. Contradictory amounts
or ambiguous controls mark the HJ diagnostic unsafe; unsupported/unreadable
control formats remain unusable rather than asserting a different legal cost.

`callControlRead.ts` observes native controls by label, reusing existing
visibility checks. It preserves raw text, local observation time, type, count,
amount and disabled state. Unknown formats, duplicate controls, hidden controls,
BB-only labels and conflicting accessibility text cannot establish readiness.
No invented PokerNow class selector, click, typing, submission or socket send is
used. Other source/profile/actor safeguards remain independent of that reader.

The current table reader and diagnostics expose the observation. Older saved
reader fixtures with no such field remain explicitly unobserved. The local
observation time is retained in exports but excluded from change-only log
deduplication: an identical poll does not spam logs or renew proof.

## Freshness and activation limits

The producer returns null after source invalidation or at the original HJ
activation plus 10,000ms. A clock regression, pre-activation/future control
timestamp, missing epoch, wrong identity/profile, changed contribution,
short/unknown/settling stack or contradictory source fails closed. All later
source updates retain Phase 4A's conservative invalidation behavior.

New control observations never change the source receipt/expiry. A usable
observation must be within that original window; the effective deadline is
therefore still the source deadline. LLM responses cannot mint this evidence.

This result is **diagnostic/dependent infrastructure, not execution authority**.
Future CALL activation must install an independently supported server-legality
contract and reviewed tournament policy, and bind/recheck relevant CALL-control
facts in the actual request/response epoch path. This pass does not alter the
working opening decision fingerprints or pretend that a diagnostic export is
an executable certificate. Unsupported CALL/3-bet never becomes FOLD.

## Regression coverage

The existing hand-169 replay runs through MAIN socket observation, projection,
the single source reducer, live context/proof adapter and overlay. HJ observer
identity/private cards and CALL-control DOM are **explicitly synthetic test
variations**; accepted UTG action and HJ activation envelopes remain recorded.

Tests cover matching five-chip controls without authorization, absent/hidden/
disabled/duplicate controls, wrong/zero/unreadable amounts, stale observations,
original deadline/expiry, actor and identity changes, source updates/reconnects,
short stacks, settlement, inconsistent contributions and no provider/game sends.
Existing missing-frame, predecessor, roster, profile and source/DOM regressions
now also assert the absence of dependent CALL evidence. No source or strategy
gate was relaxed to make a positive action test pass.

## Smallest remaining evidence and next task

One **paired HJ-browser capture** in this exact fresh response window can resolve
the UI contract: retain the existing source prefix through HJ activation and the
visible `Call 5` control's outerHTML/disabled state, paired with the diagnostic
hand/actor/amount. No repeated UTG acceptance test or broad full-hand capture is
needed. A UI-only capture still does not prove server authorization.

To establish an empirical server CALL contract, additionally retain the response
to a **user-chosen, manually submitted** HJ CALL in that same scenario (HJ total
0 -> 5, corresponding stack change, unchanged opposing total and next actor).
Do not submit a CALL merely because this diagnostic says the gap is 5. This task
does not choose or automate that action. Historical acceptance would support a
scoped future rule review, never renew the old ten-second witness.

Alternatively, a genuinely authoritative reviewed source CALL permission/rule
contract could establish legality without an empirical submission. None was
found in the inspected repository. A matching button or suggestive field name
is not that contract. After legality evidence is reviewed, an independently
reviewed tournament response policy is still required before any CALL advice.

## Validation

- Targeted CALL DOM, hand-169 production replay and diagnostic suites: **120
  tests passed**. The initial targeted run encountered a cold-import timeout;
  the passing rerun used one worker without changing timeout limits.
- Full `npm test`: **2,624 tests across 95 files passed**, including **44 new
  tests**. ai-core 491; browser-reader 1,835; opponent-db 41; poker-engine 101;
  range-engine 147; shared 9.
- `npm run typecheck`, `npm run build`, `npm run build:extension` and
  `git diff --check`: passed. The checked-in content-script bundle is rebuilt.
- No raw evidence, strategy changes, automated actions or live CALL activation
  are included in the commit.
