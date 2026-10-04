# V1 snapshot action reconstruction

This is a partial history of observed opponent actions, not PokerNow's action
log. The extension still polls once per second. It processes changed reads,
including dealer/blind changes, and the existing diagnostics include action
records and reconstruction notes. No hand ID or action timestamp is fabricated.

## What a record means

- `check`: a literal check flag appeared, with no previously observed unmatched
  wager. A persistent or flickering check label is recorded only once per street.
- `bet`: one observed contribution increased on a street with no prior wager.
- `call`: one contribution increased to the previous high contribution.
- `raise`: one contribution increased above that previous high contribution.
- `fold`: the same occupied, named seat changed from non-folded to folded.
- `all-in`: the existing parser's literal All In stack flag appeared. A numeric
  zero stack alone is insufficient. `wagerAction` optionally identifies bet,
  raise, or call (including a short all-in call) when the wager is reconstructible.

`amount` is the **observed total contribution this street**, in displayed chips.
It is not an action increment or an inferred stack size. Check/fold and unknown
amounts use null. `seat` identifies the observed seat. `observation` is a local
counter of processed reads; actions in the same read share it, and their relative
order is unknown. The counter is not a PokerNow hand identifier or game time.

Hero actions are not stored, but hero contributions participate in determining
whether a wager can be classified. Multiple changed wagers in one read (including
hero's) are omitted and noted rather than guessed into bet/call/raise order.
Unreadable contributions and changing seat identities also prevent numeric
classification. Decreases/refunds are not actions; remembered high contributions
prevent disappearing/reappearing numeric labels from creating duplicates.

## Boundaries and blind posting

The first read establishes a baseline. A street transition never attributes
changes to either street. If the new-street snapshot still contains bets or check
labels, reconstruction waits for a clear active-seat betting baseline. This may
miss an entire street if polling never observes that baseline; it prevents old
labels being classified on the new street.

History resets when a complete hero hand changes (ignoring card display order),
the board/street regresses or is replaced, the dealer changes preflop, or the same
folded occupant becomes active again. Some signals can also be transient DOM
inconsistencies: resetting is conservative invalidation, not proof of a new hand.
Temporary missing/partial hero cards alone do not reset history; the last complete
hand is retained for comparison when cards return. Board and dealer signals still
work while hero is absent or sitting out.

A leaving/replaced/unidentified seat's records are discarded rather than passed
to its next occupant. Offline alone is not a fold or a new hand. There is no
verified sitting-out flag in the current parser, and names/seat numbers are not
stable account IDs.

Preflop numeric/all-in actions require that the preceding read showed that seat
to act against an existing wager. Initial contributions no larger than a known
BB are also suppressed when no prior contribution was observed. SB completion
and a BB check can be recorded after their posted contributions are visible.
This suppresses obvious blind/ante posts, but sacrifices voluntary actions whose
turn was missed. Dead blinds, straddles, and forced short all-ins cannot always
be distinguished from voluntary actions using these fields alone.

The range engine accepts the expanded vocabulary. Bet and raise retain its
existing simple aggression narrowing. Check/fold/all-in labels alone do not
narrow a range; all-in status must not automatically mean a raise. No new
opponent model was introduced. Prompt descriptions say "observed" and "partial";
an empty history no longer claims that the opponent has taken no actions.

## What one-second polling cannot recover

- Multiple actions by one player between reads, or ordering between players
  whose labels/contributions change in the same interval.
- A check or fold label that appears and disappears entirely between polls.
- Actions at a street boundary, or distinguishing a lingering label from a
  new action already completed on that street.
- The precise size/time of each individual action from a final street total.
- A complete preflop-only hand that begins and ends between reads with the
  same cards, dealer, and visible seat flags. No reliable boundary is visible.
- Correct player continuity when a replacement uses the same name/seat between
  polls, or complete recovery after a failed/ambiguous DOM read. The extension
  discards the baseline on extraction errors to avoid bridging such gaps.

The narrow next step is to capture real PokerNow action-log rows, if available,
with their actual DOM structure and any stable hand/action identifiers. Confirm
those semantics before adding a small parser for appended log entries, retaining
snapshot polling for validation. If no usable log exists, evaluate a debounced
observer limited to the existing action/board/dealer nodes to reduce missed
transitions. An observer alone still cannot recover actions never rendered or
prove their order. Neither approach is implemented here.

## Live check

Enable the existing `poker-ai:diagnostics` toggle described in
[LIVE_STATE_CHECK.md](LIVE_STATE_CHECK.md). Compare records with actual checks,
bets, calls, raises, and folds. Check that blind posts are absent, persistent
labels do not duplicate, street resets do not create calls, and an all-in is
distinct from a raise. Compare each observation batch with PokerNow's visible
action log, if present, to identify omissions. The pot-semantics recommendation
gate remains unchanged; history diagnostics run even while advice is withheld.
