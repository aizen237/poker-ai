# Temporary raw socket evidence capture

This opt-in diagnostic records incoming messages on the existing PokerNow game
socket. It opens no connection, sends no action, clicks nothing, and is never
consumed by history/proof/policy/recommendation code. Existing diagnostics remain
separate. No relay restart is needed.

## Capture once

1. After rebuilding, reload the unpacked extension at `chrome://extensions`.
2. At the PokerNow table, open DevTools Console in the **top page** context.
   Before the new hand, run:

   ```js
   sessionStorage.setItem("poker-ai:raw-socket-capture", "1");
   location.reload();
   ```

   The page reload is necessary to install the rebuilt observer before the
   socket registers. Enabling this after registration cannot recover old frames.
   The opt-in is per tab and survives that page reload; raw data is memory-only.
3. After reconnecting, optionally inspect:

   ```js
   window.pokerAIRawCapture.status()
   ```

   Expect `active: true` and `registeredCaptured: true`. Let a new hand start
   naturally. Capture ends at hero's **first visible preflop decision, before
   acting**. No special poker action or Raise-panel interaction is required.
4. At that point, run this one export/copy command:

   ```js
   copy(window.pokerAIRawCapture.exportJSON())
   ```

   This stops capture, removes the opt-in flag and copies JSON using the Chrome
   DevTools `copy` helper. Paste the JSON into a file/message. Exporting again
   returns the same retained evidence. Do not reload the page before exporting.
   To stop without exporting, use `window.pokerAIRawCapture.stop()`.

## What is retained

`frames[].event` is `registered`, `gC` or `rup`. `frames[].payload` contains the
original nested payload for `gC`/`rup`, including unknown future fields. For
`registered` it includes only `gameState` and `currentPlayer.id`; other player or
registration envelope fields are excluded. Missing fields stay missing, null
stays null, arrays retain order, and patches are neither merged nor normalized.

Raw JSON value tokens are preserved in the export, including integers larger
than JavaScript's safe-integer range. **Send/save the export string directly**;
parsing then stringifying it in JavaScript may round such values. Duplicate JSON
keys are also retained as source evidence rather than resolved by this recorder.

`localReceiveSequence`, `localReceivedAt` (local `Date.now()`), and
`connectionGeneration` are diagnostic metadata, not server order or timestamps.
Duplicates and late old-connection messages remain separate. Capture does not
prove delivery, dealt-in membership, action coverage, legal sizing or history
completeness. Binary/other Socket.IO packet formats are not decoded; this mode
captures the already observed text `42[...]` event contract only.

The buffer holds at most 500 frames and charges at most 4,194,304 source-frame
characters (roughly 8 MiB of UTF-16 text plus projections/bounded metadata).
Even excluded registration fields count toward that limit because JavaScript
substrings may retain the original backing string. It **stops**, rather than
evicting registration, when a limit would be exceeded. An oversized incoming
event also stops capture before parsing. Check `stopReason`, `rejectedFrames`
and `registeredCaptured`; a stopped/rejected/missing-registration capture must
not be treated as a complete sequence. Limits and receipt order are local only.

Raw state can contain player/card data. It is not logged, persisted, posted to
the content-script bridge, or sent to the relay. Review the export before
sharing; document any redactions and preserve identifiers consistently. This
temporary mode remains disabled on subsequent reloads after export/stop.
