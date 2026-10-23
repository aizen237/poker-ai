# Public PHH pilot fixtures

These are real public source records, not generated poker histories. The tests
label all mutated copies as synthetic negative/contract fixtures.

- Upstream: https://github.com/uoftcprg/phh-dataset
- Pinned commit: `e47fbd5816372360bade4de5d712346fe1bb70f6`
- Specification: https://github.com/uoftcprg/phh-std/tree/c1bd44c3d0faef9ed989be8d6675f814c0e0f62d
- Upstream declares MIT; the original notice is in [LICENSE](LICENSE).
- Attribution: Universal, Open, Free, and Transparent Computer Poker Research
  Group (PHH conversion); Juho Kim (specification and televised annotations);
  Brown and Sandholm (2019), *Superhuman AI for multiplayer poker*,
  https://doi.org/10.1126/science.aay2400 (Pluribus observations).

`pilot.json` retains the exact original UTF-8 contents, Git blob SHA-1 and byte
size for complete Pluribus blocks 100 and 101 and the 83-hand WSOP 2023/43/5
metadata audit. `pilot-expansion.json` retains complete blocks 102–105, the one
disclosed expansion. Together: 531 files / 314,705 original bytes (448 Pluribus
hands, 83 WSOP hands). JSON escaping is packaging only; decoding `content`
recovers the original bytes, including original final-newline presence.

`observations.json` is the eight-row direct-replay output used by TypeScript
integration tests. Python tests regenerate and compare it exactly against the
original sources. It is not an independent source or eight additional hands.
Its provenance and redistribution notice are inherited from the source records.

The runner is offline. To verify an upstream record separately, retrieve ONLY
`https://raw.githubusercontent.com/uoftcprg/phh-dataset/<commit>/<path>` using
the commit and path in the manifest and compare its bytes/Git blob. No repository
clone, archive download or Zenodo dataset is needed. The Git hash is computed
over `b"blob " + ascii(byte_length) + b"\0" + raw_bytes`.

The root license is the publisher's stated license for these PHH records. The
pilot does not redistribute original videos, original Science supplements,
HandHQ scraped logs, or Wikipedia prose, and does not assert independently
verified rights over those separate upstream materials. No private PokerNow
evidence is included.

See [POSTFLOP_PHASE5D.md](../../../POSTFLOP_PHASE5D.md) for selection, exclusions,
visibility, source limitations, reproduction and interpretation.
