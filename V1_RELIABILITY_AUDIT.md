# V1 reliability audit — 2026-10-05

## 1. Verified working in code/tests

| Area | Evidence and boundary |
| --- | --- |
| DOM/cards | Exact supplied board fixtures retain both suit spans; primary suit selector, class fallback, conflicts, preflop and postflop regressions pass. |
| Occupancy/stacks/all-in | Named seats survive missing numeric stacks; explicit container All In is status with null stack; contributions remain separate. Duplicate selectors and malformed stacks lower confidence. |
| Blinds/pots/call gap | No default BB=1. Distinct displays, provisional contribution-gap arithmetic and folded-player exclusion are tested. Complete proof inputs handle returns and eligibility layers; live data does not supply those inputs. |
| Dealer/positions/actor | Ambiguous dealer/actor reads block. Folded occupants retain positions. Ascending seats clockwise remains a live assumption; positions above six-handed are compressed. |
| History/reset/streets | Checks, bets, calls, raises, folds, all-ins, transition baselines, changed cards/dealer/identity and transient missing cards are tested. Snapshot coverage remains explicitly partial. |
| Equity/ranges | Heads-up and multiway weighted simulation, removal/collisions, ties, seeded RNG and safe unavailable paths are tested. Range estimation is heuristic and retains priors when evidence is insufficient. |
| Preflop/policy | Structured context, short-stack restrictions, unsupported large raises and uncertainty gates are tested. No new strategy was added in this audit. |
| Packet/confidence | Invalid cards/board-street combinations are rejected; absent confidence is low. Unknown live pot/legality keeps recommendations blocked. |
| AI/fallback | Adapter failures (HTTP, malformed output, timeout) exercise Groq-to-Gemini fallback with mocked transport. Illegal actions and engine locks have tests. Two-pair/category overlap warnings have existing regressions. |
| UI/requests | Fingerprints cover actual cards, seats/stacks/status, table, read errors and raise controls. Epochs distinguish A→B→A. Poll failure clears the overlay; old response guards remain. |
| Build/relay/DB | Guarded workspace builds, actual relay startup/health and origin/Host rejection are tested. Database initialization/read/write failures preserve unavailable/prior behavior; persistence tests exist. |

## 2. Fixed during this audit

- Relay listened on all interfaces with permissive CORS: now bound to loopback,
  with explicit browser-origin and Host checks before route handlers.
- Live consensus could return an array to a single-result overlay: explicitly
  disabled on the relay. Per-result library legality checking already existed;
  all-provider consensus failure now returns a blocked abstention.
- Provider requests could hang indefinitely: each has a 20-second abort deadline;
  the extension bounds the complete relay request at 70 seconds.
- Missing DecisionPacket confidence silently became high; it now becomes low.
  Duplicate visible cards and mismatched board/street now fail validation.
- Polling exceptions could leave old output and in-flight requests active:
  exceptions invalidate the request epoch, reset history and clear derived UI.
- Request identity omitted table/control context: added both. Existing full
  snapshot and epoch identity was retained; the old short-key assumption no
  longer described the implementation inspected for this audit.
  Responses also re-read the DOM before display to detect changes between polls.
- Relay output was trusted by the overlay: single-result recommendations are
  now schema-validated; arrays and malformed successful responses are rejected.
- Synchronously throwing database initialization could escape observation
  recording: both sync and async open failures now use unavailable fallback.
  Packets explicitly reporting unavailable storage abstain rather than turning
  replacement priors into confident recommendations. Empty history in an
  available database remains separate from an outage.
- Hole-card class lookup accepted inherited object properties: own keys only.
- Legacy equity APIs accepted malformed inputs/zero iterations. They now reject
  invalid cards, duplicates, board counts and iteration counts before simulation.
- Range-vs-range sampling skipped impossible pairings as losses and biased the
  joint distribution. Independent weighted draws now reject whole collisions,
  count only accepted samples, and fail within a bounded attempt budget.

## 3. Remaining known limitations

- **Live advice remains gated.** Captured pot/call/min-raise examples do not
  certify every later hand. No new live deterministic spot was unlocked.
- One-second polling can miss complete actions, decision windows, same-card
  new hands and transitions. Keys distinguish observed states, not invisible
  events between polls. A stable hand identifier/complete event source is absent.
- Opponent history omits hero actions; no authoritative last-full-raise or
  reopening proof can be inferred from it. Selected raise-to is not a minimum.
- Whole-hand contributions, side-pot eligibility, returns and rake are not read
  completely. Multi-pot EV needs per-pot eligible-opponent equity.
- Offline is not folded; sitting-out/seat changes and clockwise mapping still
  need representative live verification. Mid-hand roster changes can affect
  current position assignment. Six position labels compress larger tables.
- Range widths and Chen ordering are approximate. Postflop continuation modeling
  is limited; random equity is labeled random. Preflop classification is not a
  solved strategy and uncertain spots abstain.
- Opponent identity is table-scoped display name with collision/rename risk.
  Partial observation windows cannot establish reliable rate denominators, so
  live profiles may remain close to priors. Outage queues are bounded.
  Relay profile refresh does not recompute client-side ranges/equity; profile
  updates and those estimates can reflect different cache snapshots.
- Providers are tested with mocked responses; no paid/live model inference was
  used in this audit. Model IDs, quotas and key validity require a separate check.
  The `strong` router mode currently warns and uses fast-mode ordering; no
  quality-ranked provider tier is implemented.
- CORS does not protect against other local processes. There is no remote
  deployment/authentication flow. Chrome private-network/CSP behavior needs a
  real browser test. Failed requests do not automatically retry until state changes.
- A selected engine action may retain an engine explanation during an LLM outage;
  this relies on independently supported inputs, not the failed model.

## 4. Deferred post-V1 improvements

Complete ordered event/hand identity capture; authoritative side-pot/control
readers; per-pot EV; measured/calibrated range models; finer positions and stable
player IDs; broader provider integration monitoring. No MutationObserver rewrite,
solver database, opponent-policy redesign or new poker strategy was introduced.

## 5. Manual PokerNow tests still required

1. Rebuild, reload Chrome extension, refresh tab; restart relay. Check `/health`
   and a PokerNow-origin request in the actual browser. Confirm foreign origins
   cannot invoke routes and another machine cannot connect.
2. Capture an entire hand with one-shot diagnostics at preflop, flop, turn, river,
   fold, all-in and showdown. Compare cards, stacks, blinds, pots, contribution
   labels and CALL amount against the screen.
3. Compare dealer/seat/player/position mapping with 2, 6 and 9 players, including
   a folded, offline, sitting-out and departing occupant.
4. Repeat the saved raise-form example; verify selected input vs BB text and
   submit enabled status. Test normal full raise, full re-raise, short all-in and
   return of action; do not treat slider attributes as legality evidence.
5. Record whole-hand commitments and all pot/return/rake displays for a heads-up
   unequal all-in and a three-player side pot. Follow LIVE_LEGALITY_PROOFS.md.
6. Change tables/decision state while a request is delayed; verify no old result
   appears. Stop the relay, invalidate a provider key and temporarily make DB
   storage unavailable; verify error/blocked/prior status instead of confident output.
7. Confirm same-card later hands and transitions with temporarily missing cards
   do not reuse old advice. Log any unobservable between-poll event as a limitation.

Exact captured HTML is saved under `packages/browser-reader/src/fixtures` for
the board and raise form. All-in container tests reproduce reported text using
synthetic surrounding markup; no full live table HTML was supplied or fabricated.

## Validation record

On Node 22.16.0 / npm 10.9.2:

- `npm install`: passed; npm reported 0 vulnerabilities for the installed lockfile.
- `npm test`: 971 tests passed across 51 test files, including actual relay
  startup/health and rejection of foreign browser origins/Host values. The child
  relay used an isolated local port, fake credentials and no external inference.
- `npm run typecheck`: passed across all packages and both apps.
- `npm run build`: passed; compiles workspace dependencies, typechecks the extension
  and regenerates the tracked `contentScript.js` loaded by Chrome.
- `git diff --check`: passed. Existing unrelated/uncommitted work was preserved.

The saved board and raise HTML captures were reused in regressions. Additional
audit fixtures are deliberately synthetic and marked as such; no test result
is presented as fresh verification at an actual PokerNow table.
