# Verify one live PokerNow hand

Action records and reconstruction notes now appear in the same diagnostics.
See [ACTION_HISTORY.md](ACTION_HISTORY.md) for their meaning and polling limits.
For the exact monetary data flow and code-level legality checks, see
[LIVE_MONETARY_AUDIT.md](LIVE_MONETARY_AUDIT.md).

The reader currently withholds recommendations, local push/fold output, and
pot odds because the meaning of the displayed main/add-on pot values has not
been confirmed. The overlay shows BLOCKED and explains the missing evidence.
The packet requires a pot value; neither displayed value is substituted for it.
This is a data validation gate, not a change to poker policy. No provider request
is made while the gate is closed. Turning diagnostics off does not bypass it.

## Enable the capture

1. Run `npm run build` from the repository root.
2. Reload the extension in `chrome://extensions`, then refresh the PokerNow tab.
3. Open that tab's DevTools Console. Enable **Preserve log**.
4. In the page console, run:

   ```js
   localStorage.setItem("poker-ai:diagnostics", "1")
   ```

No additional reload is needed for this toggle. Each changed read produces a
`[Poker AI State]` group containing one frozen monetary/legality snapshot, a
seat/player/position table, and a copyable JSON string. `monetary`, raw seat
fields and blinds are in chips; `decision` values/candidate sizes are explicitly
in BB. The reader polls once per second and can
miss transitions between polls; the timestamps identify when each read occurred.

For a single snapshot of the current state, use this instead (it disables itself
after the next poll):

```js
localStorage.setItem("poker-ai:diagnostics", "once")
```

The snapshot includes `monetary.mainPot`, `displayedTotalPot`, `decisionPot`,
`decisionPotSource`, and `isPotSemanticsVerified`; `decision` shows the actual
packet pot, policy calculation pot, and candidate sizes when a packet exists.
While blocked, expect null decision pots and an empty candidate-size list, not
zero or invented sizes. `legality.unclassifiedControls` contains visible native
buttons/role-buttons and number/range input attributes as raw evidence only.
There is no guessed mapping to PokerNow call/raise controls. If its controls use
different markup, this list may be incomplete; save the real element outerHTML.

To disable diagnostic output:

```js
localStorage.removeItem("poker-ai:diagnostics")
```

Logging is local to DevTools, opt-in, and not uploaded. The JSON includes the
visible player names, stack text, cards, and seat text needed for the comparison.

## Compare the screen at these moments

Capture the same hand before voluntary betting, after a bet/raise, after hero
contributes, after the betting round closes, and on each board transition.
Record the screen values beside the matching timestamp/JSON. Preserve a snapshot
before and after bets are collected so we can determine what the two pot labels
represent. Do not infer their meaning from a single static number.

| Check | What to compare |
| --- | --- |
| Hero hole cards | Exactly two visible ranks and suits against `cards` and raw hole-card classes. Hidden opponent cards must remain empty. |
| Board and street | All visible cards and their order; counts 0/3/4/5 imply preflop/flop/turn/river. Missing or incomplete markup must report an error, not silently lose a card. Street is derived from board count, not independently verified. |
| Every stack | Each named seat's displayed stack versus `stackText` and parsed `stack`. A missing stack must not remove the player from the seat table. |
| Both pot numbers | Visible main number and add-on text versus raw and parsed values. Record which changes when a bet is placed, called, raised, and collected at the street boundary. Check whether current street bets are included, excluded, or represented separately; do not add the values speculatively. |
| Every current bet | Each seat's numeric contribution or action label, including hero's previous contribution. Confirm whether numbers are total contributions this street or increments. |
| Amount to call | Compare the visible PokerNow call button against `amountToCall`: highest non-folded opponent contribution minus hero's contribution, floored at zero. This reports the uncapped wager gap; note separately when hero cannot cover it. Absent/check indicators retain the existing zero-contribution interpretation, which needs live confirmation. Other text such as `call`, `raise`, or `All In` without a number produces unknown, not zero. |
| SB and BB | Displayed blinds versus both `blindTexts` entries and parsed values. The existing selector order assumes first SB, second BB. Missing/invalid values remain null and block BB calculations. |
| Dealer and every position | Match the visible dealer button to `dealerSeatNumber`, then walk clockwise through the occupied seats and compare seat -> player -> position. Verify the existing ascending-seat-number assumption, including wraparound and empty seats. Folded players retain positions. Heads-up labels the dealer BTN (also SB) and the other player BB; tables larger than six collapse early positions to UTG. |
| Folded/current/offline flags | Compare the screen indicators with `folded`, `toAct`, `offline`, and raw status classes. Exactly one current actor is required for a decision; hero must be that actor. |
| Active opponents | Count occupied non-folded opponents, including all-in and offline players. Check any sitting-out/newly seated players against this existing rule; their hand participation cannot be inferred from these selectors alone. |

When the raise form is open, inspect `legality.raiseControl` in the diagnostic
snapshot. Compare `selectedRaiseToChips` to the editable chip amount and
`displayedBBText` to the BB display. The captured form reads `21` and `10.5BB`.
`raiseSubmitVisible` detects the visible Raise submit input in that same form;
`raiseSubmitEnabled` reports its disabled state separately. Edit the amount and
capture again to verify the live input property changes. Close the form and
confirm the selected amount becomes null. Slider attributes are never used for
the selected total or minimum. `legality.minRaiseTo` remains null and
`legality.verified` remains false until the minimum is independently verified.

`legality.proof` now reports scoped live observations, current display arithmetic,
history coverage, and explicit unknown/proven facts for the full raise increment,
minimum, stack-capped under-raise, reopening, and hero-contestable pot. See
[LIVE_LEGALITY_PROOFS.md](LIVE_LEGALITY_PROOFS.md) for evidence requirements and
the remaining gates. A matching display total alone does not prove eligibility.

If an all-in occurs, record the numeric bet and both stack text fields
(`stackText` and `evidence.seatEvidence[].stackContainerText`). Literal `All In`
is represented as `stack: null` plus `isAllIn: true`; it is never converted to
zero. If the normal-value selector is absent, literal `All In` in the stack
container still sets the status; other container text is not a numeric stack
fallback. An all-in player remains an active
opponent until folded. An unreadable hero stack blocks decisions.

If someone folds while an old bet label remains, verify that the seat still has
its position but its bet is excluded from the amount hero must call. If someone
goes offline, verify the flag without assuming they have folded. If these events
do not occur during the captured hand, mark them unverified rather than assuming
the tests establish live DOM behavior.

## Evidence still needed

The repository now includes the supplied 6h/Kd/3h/9h board-card HTML capture in
`packages/browser-reader/src/fixtures/pokernow-board-live.html`. Those cards have
both `.suit.sub-suit` and a main `.suit` span. The reader selects
`.suit:not(.sub-suit)`, with rank/suit class fallback; diagnostics retain all
texts/classes in `evidence.boardCardEvidence`. The capture does not establish
pot or action-control semantics; no live fixture for those fields exists yet.
`src/tableRead.ts` lists the existing selectors and records missing
or ambiguous matches. Its diagnostics retain selector counts, raw text, card
classes, and dealer classes. If a selector fails, save the relevant element's
real outerHTML from DevTools together with the JSON snapshot for a future fixture.
No fabricated DOM layout or replacement selector has been added.

Bring back the before/after snapshots and screen values, especially around bet
collection and a street transition. They are needed to establish the decision
pot and verify seat order. The gate must only be updated after that evidence;
there is intentionally no setting that guesses a pot source or bypasses it.

## Exact monetary/legality capture checklist

Use changed-snapshot logging and Preserve log. At each stable point below, wait
for a poll, then save the **Copyable snapshot JSON** and the same screen's values
or screenshot. Note the visible action-button labels and whether a numeric box
means **raise to** or **raise by**. Capture before and after bets are swept into
the center and across a street change. Do not combine screenshots from one point
with JSON from another. More than one hand may be needed for all seven cases.

1. **Unopened preflop:** record actual SB/BB (and any antes), who posted them,
   every displayed stack/contribution, and both center pot displays. Compare
   `rawBlindTexts`, `smallBlind`, `bigBlind`, hero and opponent bet fields. Record
   whether blinds already appear in either center number. Do not assume main=0
   or add-on=blinds; establish it by observation.
2. **Single raise + caller:** record the opener's total contribution and the
   caller's total after each separate action. Confirm whether numeric bet labels
   are street totals or increments. Compare hero's button with
   `max(opposing totals) - hero total`. For example, with verified totals of 8
   for opponents and 2 for hero, the uncapped gap should be 6 chips. Track changes
   in **both** center values, without adding them speculatively.
3. **Flop bet:** capture just before and after the first flop bet and the preceding
   preflop collection. Confirm the board/street, whether street bets reset, how
   the bettor's stack changes, and which pot display changes. Old street wagers
   must not become the new street's call target.
4. **Facing a bet:** when hero is to act, compare hero's existing contribution,
   highest active opposing contribution, and `calculatedAmountToCall` with the
   actual CALL button. If zero is owed, confirm CHECK is offered. Record disabled
   buttons too. If hero is short, distinguish the uncapped gap from the payable
   all-in amount (`allInCallCostIfGapIsCorrect`).
5. **Raise over a bet:** capture the initial bet, the raise, and the next player's
   controls. Record the last full raise increment from the visible sequence, the
   UI's minimum permitted **raise-to**, max, step, and displayed sizing mode.
   Compare those with raw `unclassifiedControls` attributes only if present.
   Check whether a short all-in reopens raising. If you cannot observe this
   evidence, mark minimum/reopening unknown; do not derive it from the highest
   current bet alone.
6. **All-in:** save both normal stack text and stack-container text, the numeric
   current contribution (if present), remaining players and any side-pot labels.
   `All In` must stay null stack + status when read literally, never fake zero.
   Note any unmatched chips returned and whether the CALL button shows the full
   gap or only hero's remaining stack. Unknown stack/side-pot accounting stays
   blocked even if a nominal total pot is visible.
7. **Multiway:** record every active player's contribution and any folded player's
   retained bet label. The call target excludes folded seats, but their invested
   money still belongs to the pot. Record all main/side/total labels and collection
   transitions. Distinguish active, folded, all-in and offline statuses. Multiway
   policy action locking remains unsupported even after pot display verification.

For every capture, check `isPotSemanticsVerified === false`, null `decisionPot`
and `decisionPotSource`, null policy pot, and no generated live sizes in this
version. Confirm the overlay stays BLOCKED. Turning diagnostics on/off must not
change these gates. Bring back the JSON, matching screen values, and real control
outerHTML for missing controls. Those artifacts are needed for a reviewed mapping;
passing unit tests alone is not permission to enable Portion 9 live activation.
