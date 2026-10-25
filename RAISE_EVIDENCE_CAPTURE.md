# One short manual RAISE evidence capture

Historical Phase 1 procedure; no repeat of the completed capture is needed.
See [Phase 2](PREFLOP_RAISE_PHASE2.md) for the later exact-five-chip contract.
The collector itself remains observational and disabled by default.

The same collector now has a separate read-only `postflop_call` checkpoint.
See [Phase 6F](POSTFLOP_PHASE6F.md) for its source/epoch pairing and manual
procedure; the historical Raise-panel operations below are not needed for it.

This development-only collector is disabled by default. It does not recommend
or perform any poker action. Manual labels are your description of an operation,
not proof that PokerNow accepted an amount. Nothing is uploaded or logged
automatically. Keep the exported game data local under ignored `evidence/`.

## Enable once

After rebuilding, reload the unpacked extension from this workspace in Chrome's
Extensions page. On the PokerNow table, open DevTools Console in the **top page**
context (MAIN, not an extension execution context). Before the next relevant hand:

```js
sessionStorage.setItem("poker-ai:raw-socket-capture", "1");
sessionStorage.setItem("poker-ai:raise-evidence-capture", "1");
location.reload();
```

The tab reload is required to arm the recorder before registration. No relay
restart is required. After reloading, check:

```js
window.pokerAIRaiseCapture.status()
```

Both collector and `rawRecorder.active` should be true, and
`rawRecorder.registeredCaptured` should become true after registration. The
existing raw recorder limits remain 500 incoming frames / 4,194,304 source
characters. A limit/rejection is reported; missing frames are never invented.

## Three manual checkpoints, without submitting a wager

Use one supported six-player first-UTG decision with normal 1/2 blinds. Let the
existing source tracker observe the hand boundary. No need to capture a whole
hand or wait for a particular chart hand merely to inspect the controls.

1. Open PokerNow's Raise panel yourself, then run:

   ```js
   await window.pokerAIRaiseCapture.checkpoint("panel_opened")
   ```

2. Click PokerNow's **Min Raise** button yourself (not the Raise submit), then:

   ```js
   await window.pokerAIRaiseCapture.checkpoint("min_raise_selected")
   ```

3. Enter **5** in the amount input yourself, without submitting, then:

   ```js
   await window.pokerAIRaiseCapture.checkpoint("five_chips_entered")
   ```

Wait for each command to finish. Each returns accepted/refused status and
missing-evidence/contradiction reasons, not a poker recommendation. If the
ten-second proof expires during inspection, continue only as an observational
capture: the export records expiry and cannot renew or activate anything.
Do not submit a raise for this capture. Actual acceptance would require a
separately authorized manual test, if independent validation is still unavailable.

## Export once and stop

Immediately after the third checkpoint:

```js
copy(window.pokerAIRaiseCapture.exportJSON())
```

`copy` is the DevTools clipboard helper. Paste the JSON into a local file such
as `evidence/raise-sizing-paired.json`. The method stops both collectors and
removes both session-storage flags. Export only once; it will refuse a second
export rather than produce a differently correlated package. Do not call the
separate raw recorder export first: this package already includes its raw data.

To stop early:

```js
window.pokerAIRaiseCapture.stop()
```

Previously retained data can still be exported once after stopping. To disarm
before a future reload even if the API is unavailable:

```js
sessionStorage.removeItem("poker-ai:raise-evidence-capture");
sessionStorage.removeItem("poker-ai:raw-socket-capture");
location.reload();
```

## What the package means

- At most 8 complete checkpoints and 128KiB of UTF-8 checkpoint JSON, including
  array delimiters. An oversized checkpoint is rejected whole; no truncated
  HTML or partially preserved certificate is silently accepted. Limits stop
  capture and retain the reason and prior records.
- DOM observations include all matching forms (including hidden forms), their
  outerHTML, live input properties versus HTML attributes, BB display, submit
  state, blocking ancestors and native validity properties. The existing Raise
  reader supplies the selected chips and visibility/enabled interpretation.
- A separate request copies the **existing** isolated-world timeline identity,
  carried actor/cursor/generation fields, firstUtgProof, original expiry and
  freshness reasons. Missing properties stay absent; explicit null stays null.
  No source response within 750ms produces an explicit missing-source record.
- DOM and source have distinct local timestamps. Recorder frame references are
  local correlation aids, not authoritative poker ordering. Changes between
  reads or checkpoints are flagged; unrelated observations are not merged.
- Raw JSON source tokens are embedded directly in `rawSocket`, preserving
  nested content, array order and numeric text without parse/re-serialization.
- Both the raw recorder and this package explicitly deny history-completeness
  and legality proof. Native validity, selected 5, slider attributes and an
  enabled submit do not establish server acceptance or minimum/increment rules.

Source responses cross the same-page diagnostics bridge, not an authenticated
server channel. No exported observation is consumed by recommendation/proof code.

To certify 5 chips later, we still need independently supported minimum,
representability and capacity rules for this profile, or an authoritative
exact-size validation contract tied to the actor/hand/window. A manually accepted
raise documents that instance only; it does not establish an entire sizing grid.

## Implementation validation

20 collector regressions were added. Validation passed: 68 targeted tests,
1,721 full-suite tests across 81 files, workspace typecheck, full build,
extension rebuild and `git diff --check`. No sizing certificate, RAISE activation,
source renewal or strategy change is included.
