# Phase 6F: source-bound postflop UI readiness capture

Implemented from HEAD `b0e87db58dc19eadef6885b5ffc34f905390297a` on
2026-10-24. `git fetch origin` confirmed local HEAD contains remote history
(25 commits ahead, zero behind). Reviewed Phase6E, the CALL/table readers,
diagnostic logger, raw recorder, existing Raise evidence collector/responder,
source proof expiry, request epoch/fingerprint and MAIN-to-overlay tests.

**Most required capture infrastructure already existed. The missing capability
was a fresh postflop read bracketed by source snapshots and the actual existing
decision epoch. One manual checkpoint mode now adds that pairing to the existing
development-only collector. It creates no action permission or deadline.**

## Capability audit and minimal extension

| Existing capability | What it supplies / missing part |
| --- | --- |
| `readLiveTable` / `readCallControl` | Current table and native CALL text, exact chips, local observation time, visible count, enabled state and contradictions; no source/epoch brackets |
| Opt-in `logLiveDiagnostics` | Source diagnostics and Phase6E cost/readiness; logged snapshot is not a before/after capture, and a packetless snapshot uses the placeholder epoch `diagnostic` |
| `pokerAIRawCapture` | Bounded registration/patch recording with original JSON tokens, receipt times, generation and recorder status; no DOM read |
| `pokerAIRaiseCapture` | Existing manual API, opt-in flags, local request/reply bridge, 750ms timeout, bounded checkpoint storage, raw export and disarm; existing modes read Raise DOM in MAIN and request one preflop source snapshot later |
| Source observation / Phase6E / content-script epoch | Original hero activation and exclusive ten-second expiry, narrow CALL cost and readiness, actual `requestSequence` and last polled state fingerprint; already sufficient to check a new read without changing authority |

The added label is `postflop_call`, on the existing `pokerAIRaiseCapture` API.
The legacy name/flags are deliberately reused. Existing Raise labels retain
their behavior. There is no new recorder, console API, polling loop, socket,
renewal timer, source grammar or decision scope.

The isolated-world responder invokes `capturePostflopReadiness` only for this
opt-in manual request. It copies a source snapshot and the current epoch,
performs `readLiveTable`, assesses it with the existing Phase6E helper, then
copies the source and epoch again. The read must match the fingerprint already
established by ordinary polling; capture never increments `requestSequence`,
calls timeline observation/ingestion, fetches history or requests advice.

The package records:

- Outer request/receipt timestamps and raw-recorder status before and after.
- Inner read start/end, CALL reader `observedAt`, exact `rawText`/`amountChips`,
  supported tag/type, visible count, enabled/disabled status, issues and
  accessibility contradictions. Disabled/inert/aria-disabled ancestry is
  interpreted by the existing reader; no inferred server readiness is added.
- Full existing table read (`raw`, `context`, `evidence`, CALL and Raise reader
  observations), source identity and carried actor/street/cursor/generation,
  existing flop proof, actual epoch/fingerprint before and after, and Phase6E
  cost/readiness with its original binding/deadline.

Raw-recorder status now also reports the exact last payload's safe-integer
`sourceCursor`, or null when missing/unsafe. It is read from that frame only,
never carried forward. Raw JSON tokens and local receipt sequences are unchanged.
The collector matches cursor and connection generation, not raw and bridge
sequence numbers: those counters are independent. This also rejects an older
isolated source snapshot when the raw recorder has already received a newer
frame before the checkpoint began.

## Matching and rejection rules

A successful checkpoint requires all of the following:

1. A fresh Phase6E source opportunity with matching hero/actor, flop, roster,
   cards/board, contributions, capacity and a unique enabled CALL2 control.
2. The same source snapshots and existing epoch before/after the synchronous
   read, with the observed table fingerprint matching the last ordinary poll.
   A poll that has not caught up is a rejection, not a reason to create an epoch.
3. Local start <= CALL observation <= local end. The entire outer request and
   reply interval must be at/after activation and strictly before the original
   `receivedAt + 10,000` exclusive deadline. Clock regression, future or cached
   observations, and replies arriving at expiry are rejected.
4. Active raw capture with registration, zero rejected frames, unchanged recorder
   status across the request, the same latest cursor/generation as the source,
   and a stable page URL whose table ID matches the source binding. A raw update
   during the bridge interval rejects the pairing even if the inner synchronous
   read was matching.

`accepted:true` for this new label means a matching local diagnostic pair was
retained. It is not permission to CALL. Disabled, hidden, duplicate, missing,
contradictory, stale, mismatched or expired observations return `accepted:false`.
When `retained:true`, their values and rejection reasons are retained explicitly
for diagnosis, with outer `readinessMatched:false`; they are not usable pairs.
An inner `postflop.readinessMatched:true` alone cannot override an outer recorder,
time or bridge rejection. Oversized records are rejected whole.

Limits are reused unchanged: eight requests/checkpoints, 128KiB of checkpoint
JSON, 32KiB source payload, 34KiB reply envelope, 750ms response timeout, and
500 raw frames / 4,194,304 source characters. Missing/late responders never fall
back to a cached diagnostic. Export/stop disarms both existing session flags.

Successful captures stay observations after the deadline; exporting one later
does not make it current. Hand243's original activation1792832960591 and
expiry1792832970591 are unchanged. Its accepted CALL at activation+13,018ms
cannot produce a fresh capture or renew that window. Tests replay those receipt
times explicitly; the old recording cannot be captured as a current decision.

## Exact manual procedure for one paired capture

This procedure requires a **new opportunity already recognized by Phase6E's
existing narrow hand243 contract**: the supported six-player no-ante 1/2 prefix,
HJ hero, recorded stack vector, `9d Qc` and flop `6h Qh 3s`, with the required
source sequence and accounting. It does not certify arbitrary future flops,
hand239, turn/river or different stack/card/position profiles. Do not try to
manufacture these conditions, replay old data into the page, change timestamps,
or relax the source contract to obtain a successful result. If a fresh supported
opportunity is unavailable, the current tooling can record a rejected attempt
and raw evidence for later review; it cannot promise a valid pair for that hand.

1. Build with `npm.cmd run build:extension`, then manually reload the unpacked
   `apps/pokernow-extension` extension in Chrome's Extensions page. In the PokerNow tab's DevTools Console,
   select the **top page / MAIN** context. Before registration and the relevant
   hand boundary, run:

   ```js
   sessionStorage.setItem("poker-ai:raw-socket-capture", "1");
   sessionStorage.setItem("poker-ai:raise-evidence-capture", "1");
   location.reload();
   ```

2. After reload, check the existing collector:

   ```js
   window.pokerAIRaiseCapture.status()
   ```

   Both `active` and `rawRecorder.active` must be true. Registration must have
   been captured, `rejectedFrames` must be0, and limits must not have been hit.
   Keep the source recording continuous through the hand boundary and hero
   activation. This does not require a relay restart.

3. During a supported fresh hero flop opportunity, after the ordinary extension
   poll has observed it and while its original ten-second window is still open,
   run exactly one manual checkpoint:

   ```js
   await window.pokerAIRaiseCapture.checkpoint("postflop_call")
   ```

   Leave the native controls/table visible. No Raise panel operation, button
   press, input change or poker action is required. The command only reads.
   A valid result has `accepted:true`, `retained:true`, `readinessMatched:true`
   and `reasons:[]`. The checkpoint itself verifies the clock bounds, epoch,
   control and source pairing; visible hero highlighting alone is insufficient.
   Do not loop, retry automatically, or treat a rejection as a renewed window.
   A later manual attempt can only succeed while that same original deadline
   still permits it, or under a separately validated new opportunity.

4. Export the package once:

   ```js
   copy(window.pokerAIRaiseCapture.exportJSON())
   ```

   `copy` is Chrome DevTools' clipboard helper. Save the JSON locally as, for
   example, `evidence/postflop-call-paired.json`. It contains checkpoints and the
   original raw prefix; do not export the raw recorder separately first. Export
   stops capture and removes both flags. In the saved package, check the outer
   checkpoint's `readinessMatched:true`, empty reasons, matching source/epoch,
   exact CALL observation, unchanged recorder status and original expiry.
   A screenshot may accompany it for context, but receives no authoritative
   timestamp or frame assignment from this DOM capture.

To stop early, run `window.pokerAIRaiseCapture.stop()`; retained records can still
be exported once. If the API is unavailable, remove both session-storage keys
before a future reload. Keep raw exports out of commits; `evidence/` is ignored.

## Authority and remaining blockers

This extends development instrumentation only. No capture/export is consumed
by the reducer, permission adapters or recommendation pipeline. The same-page
diagnostic bridge is not an authenticated server channel. Reported local pairing
is review evidence, not general CALL legality, complete history, an exhaustive
legal-action set, or contestable-pot/returns/rake/side-pot proof.

Preflop behavior and live postflop recommendation blockers remain unchanged.
Phase6E still returns `permission=null` and unknown current server legality.
A matching enabled CALL2 and sufficient stack do not install strategy authority.
No real new paired capture was obtained during this task: positive tests use
the sanitized recorded source prefix with explicitly simulated DOM/clock reads.
No game action, click, wager, fold, provider request or live capture was automated.

## Validation

Focused regressions cover source/epoch/actor/street/cost/stack/cursor/generation
mismatches, disabled/inert/hidden/missing/duplicate controls, clock brackets,
stale/future observations and replies, expiry during capture and at reply,
source advancement, missing registration, recorder loss/stop, wrong URLs,
missing/oversized/throwing responders, opt-in defaults and independent counters.
MAIN-to-overlay tests exercise the actual installed API/responder/epoch callback,
original expiry, unchanged recommendation blockers, raw export/disarm, no button
clicks and no outgoing poker actions. Existing Raise/raw and preflop CALL suites
remain included.

| Check | Result |
| --- | --- |
| Final eight targeted capture/source/control/expiry/preflop/CLI suites | 551 passed |
| `npm.cmd test -- -- --maxWorkers=1` | **3,343 passed across 107 files** |
| Optional Python PHH replay suite in existing `.data/phase5d-venv` | 14 passed |
| `npm.cmd run typecheck` | Passed across all workspaces/apps |
| `npm.cmd run build` | Passed |
| `npm.cmd run build:extension` | Passed |
| Working/staged `git diff --check` | Passed |

Full-suite totals: AI-core491, browser-reader2,384, opponent-db41,
poker-engine101, range-engine317, shared9. This adds 43 focused cases and
extends the existing MAIN-to-overlay cases. Both tracked bundles were rebuilt.
The final targeted and full validation pass used unchanged production/test code
and exited zero. No raw evidence, local validation logs or pre-existing
`.agents/` files are included in the commit.

An intermediate bridge test needed the missing `removeEventListener` method in
its simulated Window. A preliminary full-suite attempt hit the existing BB audit
CLI test's five-second timeout; the final targeted and full runs passed it with
that timeout unchanged. Review also added the explicit stable-URL table-ID
check before final validation. No source deadline or test timeout was increased.
PowerShell labels redirected esbuild progress `NativeCommandError`; both build
processes exited zero with successful bundles.
