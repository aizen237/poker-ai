# poker-ai — V1 assisted PokerNow reader

An npm-workspaces TypeScript project for reading PokerNow, calculating poker
facts, estimating uncertain opponent ranges, and displaying assisted advice.
It does not click actions or play automatically.

**Current status:** parsing, simulation and conservative policy components are
implemented and tested. Live recommendations remain gated because complete
action history, contestable-pot accounting and exact legality are not proven.
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

- [V1 architecture](V1_ARCHITECTURE.md)
- [Reliability audit and current limitations](V1_RELIABILITY_AUDIT.md)
- [Live DOM/state verification](LIVE_STATE_CHECK.md)
- [Legality proofs and evidence still missing](LIVE_LEGALITY_PROOFS.md)
- [Deterministic policy scope](DECISION_POLICY.md)

Only actual supplied board/raise HTML is labeled as captured DOM. Other test
scaffolds are synthetic. Unit tests do not certify unobserved PokerNow behavior.
