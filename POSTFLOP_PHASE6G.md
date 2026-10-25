# Phase 6G: general postflop source/UI observations

Implemented from HEAD `04879d430990e73e924e98b28a712953436576c0` on
2026-10-25. `git fetch origin` found HEAD 26 commits ahead and zero behind
`origin/main`. Reviewed Phase6F, the raw recorder/collector, bounded source
reducer, metadata continuity, Phase6E and the production epoch callback.

The existing development-only `pokerAIRaiseCapture` collector now accepts
`postflop_observation` for ordinary hero flops with different cards, board and
stacks. `postflop_call` retains Phase6F requirements. Phase6E, source recognizers,
permission adapters and strategy gates are unchanged. Live advice stays disabled.

## Evidence and boundaries

- `sourceVerifiedFacts` copies selected fields from an already existing narrow
  flop source certificate: scope, activation, original expiry, continuity, board,
  contributions and accounting scope. It is null without that certificate.
  This capture neither issues nor broadens a certificate.
- `unverifiedObservations` retains available carried source fields, the complete
  synchronous table/UI read, board, explicit UI contributions and CALL readiness.
  Carried state is not a general accounting or legality proof. Missing source
  contributions are never filled with zero.
- `profile: "unsupported_or_uncertified"` identifies captures without a current
  narrow flop certificate, including unsupported and expired profiles. Prior
  certificate diagnostics, when available, retain their old deadlines.
- `rawSourceObservations` reads the existing raw buffer. Each source hand, actor,
  street and board field has its own cursor, generation, local sequence and
  receipt time. Up to 24 contribution patches are copied separately; deletion
  tokens stay tokens and sample truncation is explicit. These parsed samples are
  unverified observations, not reconstructed current state. Fields are not
  borrowed from an earlier hand/connection. The embedded raw export preserves
  original JSON tokens for independent review.

The isolated responder copies source and the real current decision epoch before
and after one `readLiveTable`. It checks the ordinary poll fingerprint without
incrementing the epoch or ingesting source. No placeholder epoch is substituted.
Missing epochs are retained as unavailable with pairing rejected. Partial source
profiles remain reviewable via raw samples; their semantics remain unverified.
There is no new source grammar or fallback reducer.

`observationPaired:true` means local source/UI diagnostic brackets and applicable
identity/board comparisons passed. It does not mean every amount matches, CALL
is legal, strategy is supported or an action is recommended. Explicit carried
source/UI contribution discrepancies reject the pair; unavailable comparisons
are labeled. No general CALL-gap calculation is added. Exact CALL text, amount,
visibility count, enabled state, structure, issues, contradictions and local time
are preserved. Disabled/missing/unsupported controls are labeled unavailable;
contradictory controls reject pairing. A pair can have unavailable CALL readiness.

Check the outer checkpoint's `observationPaired` and `reasons`, not just the
inner result. Changed source/epoch/URL, contradictory actor/hand/street/board,
continuity gaps, disconnects, stale carried state, missing registration, rejected
raw frames, recorder changes/stops, cursor/generation mismatches and invalid
local timing reject pairing. Reconnect generations explicitly disclaim
continuity with the previous connection. Rejections are retained when within
size limits (`accepted:false`, `retained:true`).

The ten-second source-receipt age check is a diagnostic stale threshold. It
creates no activation or decision deadline. Existing certificates keep their
original expiry, including across the outer reply. Fresh DOM reads, later source
samples and exports cannot renew them. Records retain `permission:null`,
`legalityCertified:false`, `historyComplete:false` and
`liveRecommendationsAllowed:false`. No observation is consumed by proof,
permission or recommendation code.

Existing opt-in flags, API, eight-checkpoint limit, 128KiB store, 32KiB source
payload, 34KiB reply envelope, 750ms timeout, raw limits and export/disarm behavior
are reused. Oversized records are rejected whole. The same-page bridge remains
unauthenticated diagnostic transport. No actions, polling loops or timers added.

## Exact manual capture for an ordinary flop

1. Run `npm.cmd run build:extension`; reload the unpacked
   `apps/pokernow-extension` extension in Chrome's Extensions page. In the
   PokerNow tab's DevTools Console select **top / MAIN**, then run before
   registration and the relevant hand:

   ```js
   sessionStorage.setItem("poker-ai:raw-socket-capture", "1");
   sessionStorage.setItem("poker-ai:raise-evidence-capture", "1");
   location.reload();
   ```

2. Run `window.pokerAIRaiseCapture.status()`. Require `active` and
   `rawRecorder.active` true, `registeredCaptured:true`, zero `rejectedFrames`
   and no limit stop. Keep recording continuously through the hand.

3. When a hero flop decision naturally occurs, leave the table/native controls
   visible. After the ordinary extension poll, promptly run one read-only capture:

   ```js
   await window.pokerAIRaiseCapture.checkpoint("postflop_observation")
   ```

   No particular cards, board, stacks, Raise-panel operation or poker action is
   required. Do not loop or automate retries. `retained:true` means saved;
   `observationPaired:true` means local pairing only. Inspect `profile`, `reasons`
   and `limitations`; unsupported profiles are expected for general hands.
   Rejection does not renew a decision window.

4. Export once without exporting the raw recorder separately first:

   ```js
   copy(window.pokerAIRaiseCapture.exportJSON())
   ```

   Save locally as `evidence/postflop-observation-paired.json`. Inspect the outer
   pairing result, original source receipts/deadlines, identity, board/contribution
   samples, epoch and exact CALL read. Export stops capture and removes both flags.
   To stop early use `window.pokerAIRaiseCapture.stop()`. Keep raw exports local
   and out of commits; `evidence/` is ignored.

## Validation and next evidence

Focused tests cover different cards/board/stacks, unsupported profiles, partial
projections, contradictions, unavailable controls, gaps, reconnects, original
expiry, clocks, epochs, raw loss/change and bridge failures. The actual installed
MAIN API -> isolated responder -> content-script epoch callback -> collector and
export path is exercised with explicitly simulated DOM/clock reads. Tests assert
unchanged blockers, no recommendation requests, no clicks and no outgoing socket
actions. Fixtures are existing sanitized fixtures; no raw evidence was added.

| Check | Result |
| --- | --- |
| Four focused capture/source/production-path suites | 301 passed |
| `npm.cmd test -- -- --maxWorkers=1` | 3,386 passed across 107 files |
| Python PHH replay suite in `.data/phase5d-venv` | 14 passed |
| `npm.cmd run typecheck --workspaces --if-present` | All workspaces/apps passed |
| `npm.cmd run build` | Passed; both tracked bundles rebuilt |
| `npm.cmd run build:extension` | Passed |
| Working/staged `git diff --check` | Passed |

This adds 43 focused cases. Full-suite totals: AI-core 491, browser-reader 2,427,
opponent-db 41, poker-engine 101, range-engine 317, shared 9. No raw evidence,
local validation logs or pre-existing `.agents/` files are included.

An initial integration run caught extra reply-envelope bytes affecting the
existing Phase6F size bound. Its original envelope was preserved, and the new
mode copies selected certificate facts rather than duplicating full certificate
history. The final focused/full runs pass with all existing size limits intact.

Next evidence: one real, naturally occurring ordinary hero flop package from the
procedure above, containing continuous registration/source recording and the
contemporaneous UI checkpoint. Review outer pairing, gaps, profile limitations
and original timing before proposing a broader source contract. This task
obtained no live paired evidence. General source semantics, CALL legality and
postflop strategy still require independent proof; observations cannot supply it.

## Payload-size repair after d66368f

The reported hand246 capture had 29 frames, no rejected frames and a checkpoint
3,703ms after hero activation, but the isolated responder rejected its observation
at the existing 32KiB bound. The raw capture file was not available in this
workspace for this repair. Its discarded observation cannot be measured from
`observation:null`; the byte measurements below are an explicitly synthetic
reproduction, not measurements of that original hand's lost UI response.

The precise bounded object is `JSON.stringify({ observation })` in
`installRaiseEvidenceResponder`, measured in UTF-8 bytes, not the embedded raw
export or the entire checkpoint. `capturePostflopObservation` exported
`epochBefore.stateJson` and `epochAfter.stateJson`. Each is a nested JSON string
containing the complete decision fingerprint (raw UI, context, raise control)
and source proof revision. Escaping those strings repeats evidence already
carried in the observation. Both epoch objects were 7,608 bytes in the regression;
the complete bounded object was 33,161 bytes (393 bytes over the limit).

The repair retains both original `decisionEpoch` IDs and exports `stateAvailable`
and `matchesRead` on each epoch bracket instead of its internal `stateJson`.
The existing exact full-string comparisons still run locally, including the
before/after comparison; no hash, truncation, normalized comparison or substitute
epoch is used. `epochStatus` and rejection reasons keep their existing meaning.
The complete UI read (12,545 bytes in the reproduction), both source brackets,
carried values, proof facts, identity, times and original deadlines remain intact.
Other source duplication is left alone to keep this repair small. No payload
limits, transport rejection rules, source grammar, legality or advice gates changed.

The regression uses the installed MAIN API, isolated responder, real content-script
epoch callback and collector/export. It derives synthetic hand246 source frames
from the existing sanitized fixture, inserts nine continuous pre-activation
updates for 29 frames, captures at activation +3,703ms, and uses the current
`readLiveTable` on synthetic DOM with long multibyte player names. The older UI
fixture omitted production seat/stack evidence and did not expose this size
pressure. Before the repair this case produces the exact 32KiB rejection; after
it the bounded object is 18,069 bytes and the outer checkpoint is paired. Tests
also preserve exact UI values, raw frames, blockers and absence of clicks,
outgoing socket actions or recommendation requests. Three additional epoch
mutation cases cover changed IDs, changed fingerprint strings and unavailable
fingerprints. Existing oversized-response and rejection tests remain enabled.

| Repair validation | Result |
| --- | --- |
| Four focused capture/source/production-path suites | 305 passed |
| `npm.cmd test -- -- --maxWorkers=1` | 3,390 passed across 107 files |
| Python PHH replay suite in `.data/phase5d-venv` | 14 passed |
| `npm.cmd run typecheck --workspaces --if-present` | All workspaces/apps passed |
| `npm.cmd run build` | Passed; production bundles rebuilt |
| `npm.cmd run build:extension` | Passed |
| Working/staged `git diff --check` | Passed |

No raw evidence or local validation logs are included in the commit. A fresh real
capture is still needed to confirm pairing for the original live table/profile.
