# Known validation failures

Baseline: `35bf0a5f70b1913564d13ce0b916d8e658e0745e`.
Validation date: 2026-10-28. Environment: Windows, Node 22.16.0,
npm 10.9.2, Vitest 5.0.0. All test commands below use one worker with
file parallelism disabled; independent runs were executed sequentially.

## Root causes and changes

- **Six `flopWindow.test.ts` failures: production fingerprint mismatch.**
  All six reproduced independently (101 passed, six failed). Polling and
  response delivery included native CALL state and freshness in the decision
  fingerprint, while both postflop diagnostic capture paths still reconstructed
  the old two-element fingerprint. Consequently, an unchanged, fresh read
  could never match its existing polled epoch. The existing serialization now
  lives in `requestIdentity.ts` and is used by polling, response delivery and
  both capture paths. Capture still cannot create an epoch, renew a deadline,
  certify legality or authorize a recommendation.
- **Capture fixture compatibility.** The unit-level capture fixtures also
  constructed the legacy fingerprint. Updated their replay setup and the
  hand246 payload-size reconstruction to use the current production format.
  The nearby run exposed two such hand248 fixture failures; correcting that
  setup restored all 136 tests. No recorded source/UI data was edited and no
  assertion was relaxed. Ten new cases cover both capture paths with unchanged
  fresh controls, changed amounts, disabled controls, stale polled controls,
  and legacy fingerprints, including unchanged source deadlines and authority.
- **`hand115Lifecycle.test.ts`: cold setup timeout and test isolation.**
  Three independent baseline runs passed, but the fourth reproduced a
  5,000 ms timeout in the first visibility test, followed by two contaminated
  tests. Extension module loading/runtime setup was inside the test body;
  unfinished asynchronous setup could continue after its test timed out.
  Moved isolated runtime initialization and saved-frame replay into `beforeEach`,
  retaining each test's explicit first-poll age. Reset the table-reader mock
  during cleanup so unused one-shot implementations cannot leak. Three
  independent corrected runs passed all 20 cases. Default hook/test limits
  and the production ten-second expiry are unchanged. No visibility or
  deadline logic defect was reproduced.
- **`relayRuntime.test.ts`: original timeout not reproduced.**
  All four independent runs passed with the existing 15-second startup and
  25-second test limits. The initial run took 14.11 seconds end to end;
  subsequent test bodies took 842, 1,050 and 833 ms. This supports cold-start
  or resource sensitivity, but does not establish the precise cause of the
  historical timeout. No missing dependency or relay production defect was
  found, and no relay code/deadline was changed. The test starts a loopback
  server with test credentials and exercises rejection paths without provider
  calls or poker actions.

## Validation

Before reproducing the failures, `npm.cmd run build:ts` passed so workspace
imports used current compiled dependencies.

From `packages/browser-reader`, use
`node ../../node_modules/vitest/vitest.mjs run <files> --maxWorkers=1 --no-file-parallelism`:

| Files | Corrected result |
| --- | --- |
| `flopWindow.test.ts` | 107 passed |
| `flopCallEvidence.test.ts`, `requestIdentity.test.ts`, `staleResponse.test.ts` | 179 passed |
| `hand115Lifecycle.test.ts` | 20 passed on each of three independent runs |
| `postflopPipeline.test.ts`, `riverOverlay.test.ts`, `decisionProofRuntime.test.ts`, `raiseEvidenceCapture.test.ts`, `firstUtgFreshness.test.ts`, `hjLive.test.ts`, `bbBlockedLive.test.ts` | 263 passed |
| `flop248.test.ts` | 136 passed after updating replay fingerprint setup |

From `packages/ai-core`, the same command targeting `src/relayRuntime.test.ts`
passed once on each of four independent runs.

`npm.cmd run typecheck` passed all eight workspace typechecks, including its
forced dependency build. `npm.cmd run build` passed the forced TypeScript
build, extension typecheck and bundle. The tracked `contentScript.js` is
regenerated; `eventSource.js` has no content diff. `git diff --check` passed.

Broader validation command, from the repository root after the build:

```powershell
npm.cmd run test --workspaces --if-present -- --maxWorkers=1 --no-file-parallelism
```

Broader validation: **4,361 tests passed across 117 files**, exit code 0.
No assertion failures, skipped failures or environmental timeouts occurred.

| Workspace | Files | Tests passed |
| --- | ---: | ---: |
| ai-core | 17 | 824 |
| browser-reader | 66 | 3,050 |
| opponent-db | 5 | 41 |
| poker-engine | 8 | 101 |
| range-engine | 20 | 336 |
| shared | 1 | 9 |

This includes another successful relay startup/security test and all corrected
capture/lifecycle cases. The browser-reader portion completed in 354.85 seconds;
the relay's prior timeout was not reproduced in the broader run either.

## Modified files

- `apps/pokernow-extension/src/requestIdentity.ts`
- `apps/pokernow-extension/src/contentScript.ts`
- `apps/pokernow-extension/src/postflopReadinessCapture.ts`
- `apps/pokernow-extension/src/postflopObservationCapture.ts`
- `apps/pokernow-extension/contentScript.js` (generated bundle)
- `packages/browser-reader/src/flopWindow.test.ts`
- `packages/browser-reader/src/flopCallEvidence.test.ts`
- `packages/browser-reader/src/flop248.test.ts`
- `packages/browser-reader/src/hand115Lifecycle.test.ts`
- `VALIDATION_FAILURES.md` (this report)

## Scope and readiness

Preflop authorization restrictions and postflop illustrative-only protections
are preserved. No strategy functionality, new live PokerNow capture or automatic
poker action was added or performed. The investigation initially left the fixes
uncommitted for review; the subsequent finalization task authorizes commit and
push. The pre-existing untracked `.agents/` directory remains excluded.

**Ready for manual, illustrative-only live postflop validation.** There are no
remaining automated validation failures or known blocking defects from this
task. Actual live browser behavior and latency still require that separate
manual validation. The precise cause of the historical relay timeout remains
unproven; five successful runs here (four isolated, one broader) found no
current relay blocker.

## Finalization review

Reviewed the complete source, test and generated-bundle diff and cross-checked
the retained full-suite log against the totals above. No further production or
test changes were needed. The historical relay timeout remains an unconfirmed
cause, not a claimed production fix.

Final checks on 2026-10-28:

- `npm.cmd run typecheck --workspace=@poker-ai/pokernow-extension`: passed.
- `npm.cmd run bundle --workspace=@poker-ai/pokernow-extension`: passed; both
  generated bundles were byte-identical before and after rebuilding (SHA-256
  comparison), confirming that the reviewed artifacts match the final sources.
- The full suite was not repeated because the validated code was unchanged.
- Only the ten files listed above are included in the commit scope. Private
  evidence, credentials, local data and `.agents/` are excluded.
