# Verify one live PokerNow hand

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
`[Poker AI State]` group containing a frozen snapshot, a seat/player/position
table, a pot comparison, and a copyable JSON string. All amounts are in displayed
chip units, before any BB conversion. The reader polls once per second and can
miss transitions between polls; the timestamps identify when each read occurred.

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

If an all-in occurs, record the numeric bet and both stack text fields
(`stackText` and `evidence.seatEvidence[].stackContainerText`). Literal `All In`
is represented as `stack: null` plus `isAllIn: true`; it is never converted to
zero. If the normal-value selector is absent, the container text is evidence
only, not an unverified fallback parser. An all-in player remains an active
opponent until folded. An unreadable hero stack blocks decisions.

If someone folds while an old bet label remains, verify that the seat still has
its position but its bet is excluded from the amount hero must call. If someone
goes offline, verify the flag without assuming they have folded. If these events
do not occur during the captured hand, mark them unverified rather than assuming
the tests establish live DOM behavior.

## Evidence still needed

The repository contains captured text/class examples in unit tests, but no live
HTML fixture. `src/tableRead.ts` lists the existing selectors and records missing
or ambiguous matches. Its diagnostics retain selector counts, raw text, card
classes, and dealer classes. If a selector fails, save the relevant element's
real outerHTML from DevTools together with the JSON snapshot for a future fixture.
No fabricated DOM layout or replacement selector has been added.

Bring back the before/after snapshots and screen values, especially around bet
collection and a street transition. They are needed to establish the decision
pot and verify seat order. The gate must only be updated after that evidence;
there is intentionally no setting that guesses a pot source or bypasses it.
