# PokerNow live fixtures

## Exact five-chip acceptance and display

`pokernow-exact-five-accepted.json` preserves all 68 incoming frame envelopes
from the local acceptance capture in order, retaining only relevant fields.
Player/table/hand identifiers are replaced; names and unrelated fields are
omitted. Numeric values, timestamps, absent/null distinctions and array order
are preserved. It includes the actual Q8o hand169 acceptance after expiry.
`utg-reader-cross-check.json` is a sanitized existing reader-result shape used
as cross-check scaffolding, not captured hand169 DOM. `exactFiveLive.test.ts`
explicitly substitutes hand169 stacks and card variants and feeds source
envelopes through the real MAIN-to-overlay path, without injecting proofs.
Raw captures remain local under ignored `evidence/`.

## Hand 115 recommendation lifecycle

`evidence/hand-115-diagnostic.json` is the original diagnostic for `oacpsi6ju66i`.
`hand115Lifecycle.test.ts` sends its 71 retained projections through the real
MAIN-world bridge and content-script policy/display path with simulated local
time. It preserves original receive times: sequence 68 occurs 24,025 ms after
the boundary, already beyond the ten-second proof deadline. Late first display,
LLM delivery and negative mutations are explicitly simulations; the export
does not contain historical UI-paint or provider-completion timestamps. The
saved DOM is a cross-check, not a replacement source certificate.

## Hand 103 reconnect diagnostic

`evidence/hand-103-reconnect-diagnostic.json` is an unchanged copy of the attached
2026-10-14 diagnostic. It retains bounded production projections, not complete
raw envelopes. `hand103Replay.test.ts` replays observations 116–211 through the
live runtime and the MAIN-world bridge, including generation-2 pre-registration
`gC` 140, registration 141, equivalent `rup` 142 and linked updates to hand 103.
Reconstructed envelopes contain only retained source values. Saved DOM inputs
are cross-checks, never a replacement source baseline. Fresh-boundary timing
and the actual expired export time are tested separately. Mutations are negative
regression cases, not additional live evidence.

## Reported missing/missed blind wording

`pokernow-missed-blind-report.json` preserves the two action fragments reported
from the failed preflop smoke test. That original report contains no actor
identities, source timestamps, socket frames or DOM snapshot. Its synthetic
tests combine the grammar with the existing hand-53 adapter fixture.

The subsequent original diagnostic is now saved separately at
`evidence/hand-56-failed-smoke-diagnostic.txt`. `hand56SmokeReplay.test.ts` feeds
its retained socket metadata and exact current-hand log text/timestamps through
the production timeline runtime, then rebuilds the current raw DOM assessment,
preflop context and scoped proofs. Response indexes and unique timestamps
restore the recorded HTTP row order. Missing raw socket interiors, prior
responses and proof certificates are not fabricated. All six blind rows now
parse as posts; the four missing/missed rows retain mapped hero/opponent seats.
Two join messages and the hero-card announcement now parse as non-action
metadata; no roster or completeness proof is inferred. Hand 56 stays
blocked: no certified six-player first-UTG boundary, five source-listed seats
versus six occupied DOM seats, incomplete reconnect continuity and unresolved
call contributions. The old parsed actions/proofs are not trusted by the replay.

Only the explicit `posts a missing small blind of X` and `posts a missed big
blind of X` additions are recognized. Existing normal SB/BB parsing is retained;
unknown post text remains unparsed. Posts keep reported amount semantics and
do not prove live/dead-money treatment, a whole-hand ledger or raise legality.

## Board capture

`pokernow-board-live.html` contains the four exact card elements provided by the
user on 2026-10-05: 6h, Kd, 3h, 9h. Chat escaping before angle brackets was removed;
the element structure, classes, and text are preserved.

Each card contains `.suit.sub-suit` and `.suit`, both with the same suit text.
The main suit selector is `.suit:not(.sub-suit)`. Suit classes are `card-h` /
`card-d`; rank classes use the fixed `card-s-` prefix even for non-spades.

Tests wrap these real card captures in a synthetic table scaffold only to invoke
the existing DOM reader. Modified/malformed cases are explicitly test variants.
This fixture does not verify pot semantics, action controls, or the entire table.

## Raise controller capture

`pokernow-raise-live.html` preserves the raise form supplied by the user on
2026-10-05, including the selected input value `21`, BB text `10.5BB`, preset
buttons, slider, and Raise submit input. Tests read the input's current `value`
property; the HTML attribute is only its initial value. CSS/layout visibility is
simulated in DOM tests because Linkedom does not implement browser layout.

The capture establishes where to read the selected total and submit label. It
does not establish a legal minimum: slider min/max/value and the Min Raise
button must not be treated as numeric minimum-raise evidence.

## Controlled monetary/legality observations

`pokernow-controlled-2026-10-07.json` records the supplied pot sums, call gaps,
minimum selections, short-all-in/non-reopening sequence and board transitions.
It is a human-reported value fixture, not a DOM capture or a full hand ledger.
Tests supply synthetic seats, cards, zero contributions and starting stacks as
needed to exercise these values. Those scaffolds are not additional live evidence.
The fixture explicitly retains the unverified side-pot/returns/rake/reopening
and away/sit-out limitations. See the root `LIVE_LEGALITY_PROOFS.md` for scope.

## V2 source inspection

`pokernow-source-contract-2026-10-08.json` records fields/endpoints inspected in
the public client bundle, with its URL and SHA-256. It is not a captured live
response and does not certify completeness. The original timeline/network tests
use synthetic payloads for this candidate contract.

## V2 live log_v3 schema correction

`pokernow-log-v3-live.json` is the exact four-row sanitized API response supplied
after V2 Portion 1 live validation. Player names/IDs were sanitized by the user;
message text, timestamp text, and newest-first response order are preserved.
It establishes numeric-string `createdAt`, string `msg`, and the capitalized
`Flop:` marker for this sample. It does not establish timestamp units, tie order,
complete hand coverage, or a catch-up watermark. Source-reported hand IDs and
hand numbers were separately reported working in the live validation.

Tests load this capture directly. Malformed timestamps, duplicate/tied rows,
unknown text and fallback fold scenarios are explicitly synthetic variants.
There is no full DOM capture for the missing-fold reports; regression states
exercise the confirmed code paths that suppress folds during street transitions
or while waiting for a clean betting baseline. See `V2_HAND_TIMELINE.md` for
the targeted live rerun checklist.

## V2 passive source-link observations

The separate `pokernow-source-links-verified.json` records the subsequent reported
passive metadata capture: eight exact cursors in one increasing pre/now chain,
four exact `createdAt = now * 100` correlations and reported ETag stability.
This is human-reported source evidence, not raw reconstructed envelopes. Test
wrappers/messages and failure variants are synthetic. It does not establish
timestamp units, unique event links, reconnect coverage or a complete prefix.
See `SOURCE_METADATA_AUDIT.md`; the requested passive capture is completed.

## V2 player-ID-to-seat capture

`pokernow-player-stacks-live.txt` preserves the exact `Player stacks:` message
provided by the user. The simultaneous DOM read matched seats 1/2/3 to
aizen/aizemmmm/aizen23, and the user confirmed the same IDs in the preceding
hand. No timestamp accompanied this row; test timestamps and subsequent action
messages are synthetic scaffolding, not additional captured evidence.

The explicit player ID is the mapping key. DOM names are a manual cross-check
only. Mapping is hand-local even when IDs persist between hands. Reported stack
text is retained as row evidence, not used for current stack/pot calculations.

## V2 uncalled-return capture

`pokernow-uncalled-return-live.txt` preserves the exact supplied message:
`Uncalled bet of 1 returned to "aizen @ v7UmNXTwjJ"`.
No timestamp/full hand accompanied it. Test timestamps, other return amounts,
awards and complete contribution ledgers are synthetic variants. This capture
establishes only this explicit return grammar, not all return formats or a
complete return/award history. Player identity is the explicit ID; names cannot
provide a missing mapping. Return parsing does not certify live pot accounting.

## Passed return/settlement test and captured winner stacks

`pokernow-return-settlement-verified.json` records the user's passed controlled
test: aizen23 bet 4, both opponents folded, 4 was returned to ID `OoArqYL22g`
(seat 3), and a separate pot award of 6 followed. Diagnostics preserved original
text/timestamps and the conditional return/award deltas. This is human-reported
evidence, not a complete API capture. Regression tests reconstruct canonical
messages with synthetic timestamps and reuse the earlier mapping fixture as a
scaffold. No whole-hand accounting, side-pot or completeness claim follows.

`pokernow-winner-stacks-live.json` preserves the three exact stack outerHTML
strings supplied after that test: ordinary 150, ordinary 9, and settlement
`47 +6`. The base is a direct `.chips-value` child; the award has its own direct
`.table-player-stack-prize` wrapper containing another `.chips-value`. Surrounding
seat markup/winner class, BB variants and malformed cases in tests are synthetic.

The public client inspected on 2026-10-08 corroborates this structure:
`https://cdn.pokernow.com/game.bundle-a1b003417b310ca482a2.js`, SHA-256
`4417507894832e0718142a5130a37b1f808e8cba122baca5245504c7dbb58d1a`.
Its `renderStack()` displays a base with `gained` subtracted beside the separate
prize. Thus 47 is a displayed base, not proof of a final spendable remaining
stack; the reader does not synthesize 53. Settlement keeps the remaining stack
unknown and confidence low until the ordinary display returns. The prize is
diagnostic evidence only, never an accounting event or another pot award.

`pokernow-winner-settlement-verified.json` records the separate follow-up live
check reported passed on 2026-10-08: aizen23 displayed base 45 and prize +24,
with `settlement_display`, `isSettling=true`, and usable `stack=null`. At the
next hand the ordinary stack was 69, `isSettling=false`, with no prize element.
No duplicate-stack error or prize double-counting was observed. These are
user-reported values, not another raw DOM capture; the earlier `47 +6` HTML
fixture is preserved unchanged. Neither this check nor the already-passed
uncalled-return check needs repeating. Complete ledger, side-pot, rake/drop,
history-completeness and policy-activation requirements remain unverified or
gated as before.

## Hand 49 socket-state report

`pokernow-hand-49-socket-report.json` preserves the user-reported hand-start
seats/IDs, dealer/blinds, tB transition, final turn fields and four cursor values.
At that initial audit the complete raw export had not been supplied. No pC card
values, prior-hand removal frame, packet wrappers or field-to-frame placement
are invented. `pCPlayerIds` is an explicit audit projection, not a source field.
Tests label synthetic mutations, prior-hand scaffolding and cursor wrappers.
The matching two-player roster supports a HU observation, not six-max proof;
tB contribution semantics and complete action coverage remain unverified.

The original export is now saved at `evidence/hand-49-raw-socket.json` and read
directly by the socket audit tests. It contains registration in hand 48 and four
gC updates, including the exact hand-49 boundary, full two-card pC entries,
the removal of player `TTXBlZfl8G`, and separate SB wager/hero-turn updates.
The observed chain now includes registration cursor `1791681923076`, giving
four linked updates. `SOCKET_STATE_AUDIT.md` records the full-file findings.
No raw fields are fabricated or copied into a replacement fixture, and the
original file is not rewritten. Missing-frame/reconnect tests mutate copies and
are labeled synthetic. The full file strengthens roster/boundary and transition
evidence; it does not itself certify tB chip semantics, complete action coverage
or the meaning of candidate legality fields mR/mAVTB.

## Hand 121 occupant replacement

`evidence/hand-121-diagnostic.json` is the unchanged saved diagnostic with 78
retained production projections. `hand121Replay.test.ts` replays those projections
through the production projector/timeline adapter, plus the saved DOM cross-check
and reparsed log rows. Sequence 6 explicitly removes `nQ-ZBcAfge`, supplies
`L6CP6v3_ST`, and replaces complete card membership without a pC deletion marker.
Sequence 78 starts hand 121. Tests distinguish a fresh decision from the export
18.227 seconds later; synthetic negative/alternate-departure cases mutate copies
only and are not additional live evidence. See `SOCKET_STATE_AUDIT.md` for scope.

## Phase 3C CO windows

pokernow-co-143.json and pokernow-co-149.json derive from the local
raise-sizing-paired.json; pokernow-co-167.json derives from raise-5-accepted.json.
They reuse the earlier sanitized bounded prefixes and preserve ALL raw fields
of the final four fold/turn patches. Only table/player/hand identities are
substituted. Numeric values, array order, source/local timestamps and original
hero cards (J5s, AKo, QJo respectively) are unchanged. No new live capture or
DOM evidence is claimed. Tests simulate the synchronous DOM cross-check using
the existing reader result shape. The positive decisions/proofs are produced
by the real MAIN-to-overlay path; negative mutations are explicitly synthetic.
