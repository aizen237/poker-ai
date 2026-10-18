# Local development

For the current live state investigation, see [LIVE_STATE_CHECK.md](LIVE_STATE_CHECK.md).
For the temporary, passive raw socket capture and one-command JSON export, see
[RAW_SOCKET_CAPTURE.md](RAW_SOCKET_CAPTURE.md). It requires an extension/page
reload, but no relay restart or poker action.
Live advice uses the [scoped decision proof model](SCOPED_DECISION_PROOFS.md).
Global history completeness is not required by that evaluator; independent pot,
action-window, legality and strategic model requirements remain unsatisfied live.
Observed display relationships are documented in LIVE_LEGALITY_PROOFS.md;
V1_RELIABILITY_AUDIT.md lists remaining limitations and manual checks.

Run these commands from the repository root (`poker-ai`) in PowerShell or a
terminal in VS Code. Use Node 22.12+ on the 22.x line (verified with 22.16.0),
24.x, or 26+. The Node requirement matches the installed Vitest toolchain and
supports the relay's `--experimental-strip-types` flag. Node 18 is insufficient.

## Install and build

```powershell
npm install
npm run build
```

`npm install` links the workspaces; it does not compile them. Commit
`package-lock.json` with dependency changes; `npm ci` installs the locked versions.

`npm run build` force-compiles all six packages and the relay via the root
TypeScript project references, in dependency order, then typechecks and bundles
the extension with esbuild. `--force` avoids trusting existing incremental build
metadata. Build errors stop the command before bundling or starting the relay.
No new build tool is required.

## Start the relay

Put `GROQ_API_KEY` in the root `.env`. `GEMINI_API_KEY` and `NVIDIA_API_KEY` are
optional. Keep this file private.

```powershell
npm run dev:relay
```

This builds everything first, including the extension, then runs the relay at
`http://localhost:8787`, bound only to `127.0.0.1`. Browser origins are restricted
to the PokerNow origins in the manifest; live consensus requests are rejected.
`RELAY_PORT` can override the server port for tests, but the extension still uses
8787 unless its URL is edited. The workspace command
`npm run dev --workspace=@poker-ai/ai-relay-server` has the same rebuild guard.
In another terminal, check it without making an AI request:

```powershell
Invoke-RestMethod http://localhost:8787/health
```

There is no file watcher. After editing sources, stop the relay with Ctrl+C and
run `npm run dev:relay` again. Rebuilding files alone does not refresh modules in
an already running Node process. Port 8787 must be free.

## Rebuild and reload the Chrome extension

```powershell
npm run build:extension
```

This uses the full build so all package dependencies are current before bundling.
The workspace's `build` command also uses this safe path. Its `bundle` script is
an internal build step and does not rebuild dependencies by itself.

In `chrome://extensions`, enable Developer mode and use **Load unpacked** to
select `apps/pokernow-extension` the first time. After each rebuild, click
**Reload** on that extension, then refresh each PokerNow game tab. A tab with an
already injected content script keeps the old code until refreshed.

`apps/pokernow-extension/contentScript.js` and `eventSource.js` are generated and
tracked because the manifest loads them directly. Never edit them by hand or
delete them from the extension directory. Rebuild from `src/contentScript.ts`,
`src/eventSource.ts` and current package sources; commit both generated outputs.
The metadata observer runs in MAIN at document_start, so refresh the game tab
after reloading the extension. See [V2_HAND_TIMELINE.md](V2_HAND_TIMELINE.md).

## Tests and typechecking

```powershell
npm test
npm run typecheck
```

Both commands first force-rebuild the compiled TypeScript projects so package
imports and declarations are current, including on a fresh checkout. Tests run
the existing Vitest suites across the six packages. Typechecking covers all
packages and both apps, including the extension. Individual workspace test and
typecheck commands assume dependencies have already been built.

## What actually executes

| Component | Runtime files |
| --- | --- |
| Relay via `dev:relay` | Node runs `apps/ai-relay-server/src/server.ts` with `--experimental-strip-types`. It does not run `apps/ai-relay-server/dist/server.js`, although the build also produces that file. |
| Workspace imports | npm links `node_modules/@poker-ai/<name>` to the workspace. Each package's `main` resolves to `packages/<name>/dist/index.js`, with its relative imports loading other `.js` files in that `dist` directory. This applies to `ai-core`, `browser-reader`, `range-engine`, `poker-engine`, `shared`, and `opponent-db`. TypeScript declarations come from `dist/index.d.ts`. |
| Relay's current package use | `server.ts` imports compiled `ai-core` and `opponent-db/browser`, and dynamically loads `opponent-db` for SQLite storage. Their transitive workspace dependencies also resolve through `dist`. |
| Extension build | esbuild bundles `src/contentScript.ts` and `src/eventSource.ts`. Workspace package imports resolve through compiled `dist` entries. The MAIN observer also includes the optional manual diagnostics collector, which reuses the Raise reader. |
| Chrome | The manifest injects `eventSource.js` in MAIN at document_start, then `contentScript.js` in the isolated world at document_idle. Chrome executes those generated bundles, not `.ts` or separate workspace `dist` files. |

Stale `dist` files can therefore make Node execute old package code even while
the relay's own TypeScript source is current. They can also make esbuild embed
old package code in a new bundle. A stale `contentScript.js` makes Chrome run old
extension code even after `contentScript.ts` changes. Use the guarded commands
above, restart the relay, and reload the extension and game tabs as appropriate.

For a single local sizing investigation, see [manual RAISE evidence capture](RAISE_EVIDENCE_CAPTURE.md).
It is disabled by default and does not activate RAISE or perform poker actions.

The independent [Phase 2 exact-five-chip rule](PREFLOP_RAISE_PHASE2.md), extended
by [Phase 3B](PREFLOP_PHASE3B.md) and [Phase 3C](PREFLOP_PHASE3C.md), supports
matching first-UTG, one-fold HJ and two-fold CO chart RAISE windows. Each uses
its own original ten-second activation deadline with the panel closed or open. Rebuild,
reload the unpacked extension, refresh the table and restart the relay after
updating so the reader and compiled packet schema agree. The collector remains
optional and does not authorize advice.
