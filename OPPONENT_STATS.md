# Live opponent evidence and persistence

The existing opponent-db SQLite backend now stores live observation windows in
a new live_observations table. The older player_hand_actions table and raw API
remain intact. Legacy boolean rows lack reliable opportunity/coverage metadata
and are not automatically treated as eligible live evidence.

The relay owns SQLite, at .data/opponents.sqlite by default (ignored by Git).
OPPONENT_DB_PATH can override the path; :memory: is useful for tests. Restarting
the relay retains the file-backed observations. The extension imports only the
browser-safe opponent-db entry; native SQLite is never bundled into Chrome.

The extension collects summaries before the recommendation/pot-confidence gate,
upserts observations about every ten seconds, and reads profiles in the
background. A local UUID identifies an observation window, not a claimed
PokerNow hand ID. Repeated uploads of the same identity/window update one row.
Boundary signals from action history start another window. Reloads, transient
read failures, and approximate new-hand detection can split a real hand into
multiple windows; handsObserved therefore explicitly means recorded windows.
The overlay shows windows and eligible hands separately.

## Identity

No verified stable PokerNow player identifier exists in the current reader or
available fixtures. V1 keys by exact display name plus table origin/path.
Different tables are isolated. Duplicate simultaneous display names are skipped.
Name reuse can collide and renames split history; this is not a global identity.
The schema supports a verified player_id for a future reader with actual DOM
or log evidence. Table identity stays local to the extension/relay and is omitted
from model prompt text.

## Missing evidence and eligible denominators

Current polling can omit hero/opponent actions and their order. Live summaries
are always partial: they preserve observed actions and notes but keep rate flags
and aggression denominators null. A visible raise in a partial hand does not
enter a success-only VPIP/PFR sample. No observation is fabricated as a false.
Consequently polling alone currently grows observed windows, not eligible rate
samples. Profiles remain prior-driven until reliable complete hand evidence is
available. No log/DOM behavior is invented to claim otherwise.

summarizeHand also accepts explicitly verified complete, finished histories
including every player's ordered actions and known dealt-in status. It derives:

- VPIP/PFR per eligible dealt hand, excluding blind posts.
- 3-bet rate per actual response opportunity to one raise, not per total hand.
- Fold-to-3bet from the initial raiser's response to a single re-raise.
- C-bet when the preflop aggressor can check or bet the flop before any donk bet.
- Fold-to-cbet when responding to that c-bet before an intervening raise.
- WTSD per known flop-seen hand; WSD per confirmed showdown with a known result.
- Postflop aggression as bets/raises versus calls, excluding checks/folds.

Unknown outcomes remain null. Tied/reversed action observations, unknown dealt
status, or all-in sequences without validated full-raise sizing cannot qualify
as complete rate evidence in V1. Seeing exposed cards is not proof of winning.

## Shrinkage and cautious use

Every rate uses (successes + priorMean * 40) / (eligible opportunities + 40).
The player weight is n / (n + 40). Each stat carries its own successes, sample
count, prior, weight and confidence: under 100 opportunities is low, 100-999
moderate, and 1000+ strong. A thousand hands with one c-bet response still means
one fold-to-cbet sample. The profile confidence uses eligible VPIP/PFR samples.

The explicit prior means are VPIP .25, PFR .18, 3bet .07, fold-to-3bet .50,
cbet .55, fold-to-cbet .45, WTSD .28, WSD .50, aggression frequency .60. These
are placeholder modeling assumptions, not measured PokerNow population rates.
Aggression factor is derived from the smoothed aggression frequency p/(1-p),
so a few bets with zero calls do not create infinite aggression.

DecisionPacket includes per-seat profiles and storage status. All providers see
shrunk estimates and opportunity counts. VPIP modestly changes an applicable
preflop calling subset; PFR changes an applicable opening/aggressive prior.
Adjustments receive a second reliability discount and a +/-15% target width cap.
Zero samples leave the baseline unchanged. Stats cannot override missing
preflop context, short-stack chart scope, or table confidence. No player-skill
labels are inferred. Fold-to-3bet stays advisory conditional evidence; it is
not converted into factual shove fold equity without a caller/commitment model.

## Failure behavior and limitations

SQLite loading/open/read/write errors return priors and unavailable storage
status. The service retries after 30 seconds. Browser requests time out after
five seconds and retry in the background; none blocks recommendation collection.
The unsent queue is bounded to 200 identity/windows and is in-memory, so long
outages or closing the tab can lose unsent observations. Concurrent tabs/reloads
can produce duplicate partial windows; they do not inflate eligible rates.

The local endpoints are POST /opponents/observations and POST /opponents/profiles.
Payloads are validated; partial rows cannot contain rate evidence. The relay
refreshes any supplied profiles from its own database before provider calls.
Zero-history and database-unavailable operation remain usable with explicit priors.

Tests cover 0/5/100/1000 hands, tiny-sample extremes, per-opportunity confidence,
partial windows, blind/c-bet/3-bet summaries, database reopen/idempotency/identity
isolation, database failures/recovery, browser upload/failure/duplicate-name
behavior, bounded range adjustments, and profile wording in every provider.

Run npm test, npm run typecheck and npm run build. Restart the relay, reload the
extension, and refresh PokerNow. Verify the overlay's observed/eligible counts;
expect eligible counts to remain zero with current partial polling evidence.
