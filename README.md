# poker-ai — V1 assisted PokerNow reader

An npm-workspaces TypeScript project for reading PokerNow, calculating poker
facts, estimating uncertain opponent ranges, and displaying assisted advice.
It does not click actions or play automatically.

**Current status:** scoped six-player 1/2-chip deep-stack opening advice supports
first UTG, HJ after an explicit UTG fold, and CO after explicit UTG/HJ folds.
The existing charts select FOLD or an independently certified exact-five RAISE.
Each requires a fresh source-backed decision window and live cross-checks;
see [Phase 3C](PREFLOP_PHASE3C.md) for exact limits and verification status.
Global `historyComplete` remains false. Other positions, facing-action pots
and generic postflop/EV activation remain unsupported.
This is not a completed solver or an unrestricted live recommendation system.

## Local setup

Use a supported Node version (22.12+ on Node 22, Node 24, or Node 26+) and run
from this directory in PowerShell:

```powershell
npm install
npm run build
npm run typecheck
npm test
```

Set `GROQ_API_KEY` in the private root `.env`; optionally set `GEMINI_API_KEY`
and `NVIDIA_API_KEY`. Then run `npm run dev:relay`. It rebuilds before starting
the relay, which binds only to `127.0.0.1:8787`. Check `/health` without invoking
an AI provider. See [DEVELOPMENT.md](DEVELOPMENT.md) for exact runtime paths,
rebuild/restart steps and extension installation.

Chrome loads `apps/pokernow-extension/contentScript.js`. After
`npm run build:extension`, reload the extension at `chrome://extensions` and
refresh the PokerNow tab. Source changes alone are not enough.

## Documentation

- [Scoped decision proofs, exact blockers and readiness](SCOPED_DECISION_PROOFS.md)
- [Current CO opening scope, evidence and live check](PREFLOP_PHASE3C.md)
- [V2 hand/event timeline and required live capture](V2_HAND_TIMELINE.md)
- [V1 architecture](V1_ARCHITECTURE.md)
- [Reliability audit and current limitations](V1_RELIABILITY_AUDIT.md)
- [Live DOM/state verification](LIVE_STATE_CHECK.md)
- [Legality proofs and evidence still missing](LIVE_LEGALITY_PROOFS.md)
- [Deterministic policy scope](DECISION_POLICY.md)

Only actual supplied board/raise HTML is labeled as captured DOM. Other test
scaffolds are synthetic. Unit tests do not certify unobserved PokerNow behavior.
