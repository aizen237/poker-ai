# Isolated PokerNow state replay

This prototype replays local, saved PokerNow snapshots offline. Run it from the
repository root with Node 22:

```powershell
node --experimental-strip-types --test prototypes/game-state-p1/*.test.mjs
node --experimental-strip-types prototypes/game-state-p1/run.mjs
```

The six newer recordings are from a **Play with Friends** table using `4fun`
blind levels. This does not establish real tournament behavior or tournament
coverage. The recordings remain in ignored `evidence/`; tests contain only
hand-derived values and mutations of those local inputs.

## Replay contract

`source.mjs` validates the known source envelope and uses the existing bounded
merge for snapshot patches. It accepts `nB` and `nBA` as validated opaque
next-level data. Small blind, big blind, and ante values may change only on a
new-hand boundary. The ante is already in the opening pot; the two blinds are
shown in `tB`. A `standingUp` player is excluded from `iHPI`, posts no ante, and
keeps their stack at the hand boundary. Hole-card input is shape-checked and
discarded from projected replay snapshots.

Every linked frame must preserve `sum(player stacks) + pot` inside its hand.
Hand starts validate the ante pot and blind posts. Collections and settlements
reconcile each wager against each stack delta, including the separately
returned uncalled excess. Returned amounts must match the unique excess bet.
Unexplained chip changes, broken source sequences, and invalid actor order fail
closed.

The source tuple `cPI === pITT`, `pASA === now`, and `sNAA === pASA + 15000`
anchors a 15 second local observation window. Polling does not renew that
window; another exact source timestamp/deadline tuple is required. Source flags
are retained as observations and are not used to infer action types. Folds,
checks, bets, raises, and calls are derived from the activated actor and the
observed status/contribution transition. All-in status, stack-capped short
calls, and trimmed wagers are supported. Runout deals can have no actor when
the closed betting round leaves at most two non-folded players and an all-in.

Side pots are not implemented. Any all-in runout or settlement with more than
two remaining contenders is rejected. Other unsupported protocol cases remain
fail-closed. `liveAuthorized` stays false; no action is sent.

## Tests

`mtt-captures.test.mjs` contains hand-derived checkpoints and per-frame chip
conservation assertions for the six new captures. `mtt-rules.test.mjs` contains
synthetic rule cases only. `mtt-mutations.test.mjs` mutates local capture copies
to check ante mismatch, mid-hand level change, wrong returned amount, missing
frame, wrong actor, and expired deadline. `captured.test.mjs` retains the
original nine P1 capture regressions and its prior negative cases.

The original nine P1 captures cover earlier 0.1.72 behavior and the narrow
paid-call street bridge. Empty `eventsData` means complete authoritative hand
history remains unresolved. No production source, strategy, ranges, live
authorization gate, or dependencies are changed by this prototype.
