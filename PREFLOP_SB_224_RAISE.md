# Phase 3E completion: paired hand224 SB exact-five RAISE

SB FOLD and RAISE are operational for the existing six-player, four-fold opening
window. The unchanged chart determines the action. RAISE is exactly **5 chips
total / 2.5BB**, with **1 already posted and 4 additional chips / 2BB**. The
supported profile remains PokerNow0.1.72, normal play-money Hold'em, blinds1/2,
no ante/dead button or unsupported game options, proven deep stacks and the
existing source/DOM cross-checks. This is an empirical exact-size contract, not
a solver, general legal-size interval, chip-grid decoder or live server preflight.

## Evidence and its limits

Inspected local `evidence/sb-raise-224.json` and the supplied screenshot, actually
saved as `evidence/sb-raise-224.png.png`. The twelve-frame export has registration,
one continuous generation, matching pre/now links and no reported dropped frames.
Hand224 is `hruzdk949iun`. The user identifies the screenshot as this hand.
Both artifacts match the table, hero Ah7s, six-player seats/dealer, SB1/BB2 and
visible remaining stacks (hero250, BB241). Source stacks251/243 minus posted1/2
agree. Screenshot input5 and display2.5BB are visible before submission.

The image does **not** show a hand ID, machine-bound submit receipt or exact
capture timestamp. The pairing is user-reported and corroborated by the above
facts; it is not an outgoing-input trace. No exact action time is inferred from
the screenshot or source cursor units. Its visible old sizing-blocker overlay
describes the older extension implementation, not a new legality contradiction.

| Observation | What it establishes | Limits |
| --- | --- | --- |
| Frame2 hand223 -> hand224, six dealt-in IDs/seats, normal profile, SB1/BB2 | Same supported frozen roster and blind accounting | No generic complete history |
| Frames3/4,5/6,7/8,9/10 | Explicit UTG/HJ/CO/BTN folds, separate turn activations, then hero SB | Exact closed transition grammar only |
| Paired screen input5 / 2.5BB with SB1 | UI target total5 with a nonzero posted blind in this observed context | Not a universal form/grid contract or server preflight |
| Frame11 tBhero5/cHB5/cRPIhero; frame12 BB cPI/pITT | Source accepted this SB total and advanced the turn | Historical acceptance, not future live authorization |
| Observed total5 minus posted1 | Additional investment4 | No separately observed stack-debit receipt; award/accounting behavior unchanged |
| mR changes to8 | Correlation retained in fixture | Not decoded as minimum/reset semantics; sparse inherited mR never authorizes sizing |

SB activation was received at1792394574888; its original expiry is1792394584888.
The accepted raise arrived at1792394588933: **14.045 seconds after activation**,
4.045 seconds after expiry. That action could not have been actionable engine
advice at acceptance time. This task adds a reusable historical rule while
requiring a separate, fresh source certificate for every future decision.

The paired nonzero-contribution example resolves hand212's remaining input
semantics gap. It supports exactly five under this profile, first SB turn and
unchanged forced blinds. No minimum, maximum, other denomination or raise size
is inferred. No further acceptance test is needed to establish this narrow rule.

## Implementation and binding

- The same `openingSizeEvidence` producer consumes `currentSb` / `sbProof`;
  no second reducer, continuity validator or proof-renewal mechanism was added.
- SB uses rule `pokernow-0.1.72-th-4fun-1-2-sb-exact5-v1`. The existing profile
  fingerprint remains unchanged. Both size facts and `raiseLegality` derive
  from this one validated result, with hand/table/actor/seat/generation/cursor,
  decision epoch, contribution, stack, provenance and original expiry attached.
- Packet schema and engine require SB scope, posted1, total5 and additional4
  together. Earlier positions require their original rule, posted0/additional5.
  Canonical packet binding protects the supplied decision facts. BB is excluded.
- The source window still requires eight separate fold/turn patches after a
  validated six-player boundary. Original positions remain frozen; BB must be
  active. Missing/replayed/ambiguous updates, roster/actor changes, reconnect,
  wager mutations, short/unknown stacks and source/DOM contradictions abstain.
- Existing conservative source hand-start >=202 chips and current >=200 chips
  checks remain; this change does not widen the stack boundary.
- Closed panel is allowed for immediate engine advice. An open form must be
  unambiguous, enabled/readable and internally consistent. Its selected total
  minus the posted1 must fit remaining chips. Another consistent selection is
  merely not ready for the recommended5; it never authorizes that other size.
- Engine `chosenSizeBB` is additional investment2; the overlay already renders
  exact raise-to5/2.5BB. Explanations cannot change that action or amount.
- Chart FOLD returns before sizing validation and remains independent of Raise
  readiness and pot EV. A blocked chart RAISE never becomes FOLD.

All deadlines remain SB activation+10s, including with panel edits, unchanged
DOM, provider failures or late replies. Source updates/actor changes/reconnect
invalidate the decision. Global `historyComplete=false`, accounting, settlement,
pot proofs and assisted/manual-only behavior remain unchanged.

## Regression coverage and validation

Sanitized hand224 frames traverse MAIN socket interception, bounded source
projection, existing SB proof/cross-checks, packet construction, engine and
overlay. Positive decisions are not mocked. DOM cross-checks use the established
reader shape and are explicitly simulated; the screenshot record is observational.

Coverage includes original A7o RAISE with closed/matching/different controls,
total versus investment arithmetic, source/proof binding, schema mismatches,
capacity, contradictory/hidden/duplicate controls, changed profiles, gaps,
reconnects, expiry, panel edits, historical acceptance after expiry and stale or
incorrect provider replies. Existing hand147/212 chart RAISE and hand165 FOLD
fixtures are replayed; all UTG/HJ/CO/BTN and blocked BB regressions remain.

Validation:

- Targeted SB source/live and prior-position production paths: 614 tests passed
  in six files, including 51 SB source and 183 SB live tests.
- Full `npm test -- -- --maxWorkers=2`: 2,433 tests passed in 91 files
  (ai-core436, browser-reader1700, opponent-db41, poker-engine101,
  range-engine146, shared9). Worker concurrency is bounded for local Windows
  resource use; no tests are skipped and timeouts are unchanged.
- `npm run typecheck`, `npm run build`, explicit `npm run build:extension`
  and `git diff --check` passed. The tracked contentScript bundle is rebuilt;
  the source bridge bundle has no semantic change. Raw evidence stays local.

## Scope and one short live verification

No BB decisions, limped pots, responses to aggression, short stacks, other
profiles, general betting legality or postflop activation are added. No poker
action is automated. The updated feature has production-path regression
coverage; that is distinct from observing the new overlay in a live browser.

Rebuild/reload the extension, refresh PokerNow and restart the relay so the
compiled schema matches. In one supported deep-stack SB hand with an included
hand such as A7o, watch the four explicit folds. Within ten seconds of SB
activation, with the Raise panel closed, verify **RAISE TO 5 CHIPS (2.5 BB)**
appears immediately with a countdown. If you open the panel, confirm total5 is
four more than the posted1 and that the deadline does not restart. Without
acting, confirm advice expires at the original deadline. No submission or
repeat acceptance test is required. Keep any diagnostic export local.
