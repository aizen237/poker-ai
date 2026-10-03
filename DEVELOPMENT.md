# Local development

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
`http://localhost:8787`. The workspace command
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

`apps/pokernow-extension/contentScript.js` is generated and tracked because the
manifest loads it directly. Never edit it by hand or delete it from the extension
directory. Always rebuild it from `src/contentScript.ts` and current package
sources; include any resulting bundle changes in commits.

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
| Relay's current package use | `server.ts` directly imports `ai-core`; that package also loads compiled `poker-engine` and `shared` code. `browser-reader` is declared as a relay dependency but is not currently imported by `server.ts`; neither `range-engine` nor `opponent-db` is currently loaded by this relay's import graph. |
| Extension build | esbuild reads `apps/pokernow-extension/src/contentScript.ts` and resolves its package imports through their compiled `dist` entries. The bundle includes the used code from `browser-reader`, `poker-engine`, `ai-core`, `range-engine`, and their dependencies. |
| Chrome | The manifest injects only `apps/pokernow-extension/contentScript.js`. Chrome executes the code embedded in this bundle, not the `.ts` source or separate workspace `dist` files. |

Stale `dist` files can therefore make Node execute old package code even while
the relay's own TypeScript source is current. They can also make esbuild embed
old package code in a new bundle. A stale `contentScript.js` makes Chrome run old
extension code even after `contentScript.ts` changes. Use the guarded commands
above, restart the relay, and reload the extension and game tabs as appropriate.
