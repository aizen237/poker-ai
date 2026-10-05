# PokerNow board capture

`pokernow-board-live.html` contains the four exact card elements provided by the
user on 2026-10-05: 6h, Kd, 3h, 9h. Chat escaping before angle brackets was removed;
the element structure, classes, and text are preserved.

Each card contains `.suit.sub-suit` and `.suit`, both with the same suit text.
The main suit selector is `.suit:not(.sub-suit)`. Suit classes are `card-h` /
`card-d`; rank classes use the fixed `card-s-` prefix even for non-spades.

Tests wrap these real card captures in a synthetic table scaffold only to invoke
the existing DOM reader. Modified/malformed cases are explicitly test variants.
This fixture does not verify pot semantics, action controls, or the entire table.

## Raise controller capture

`pokernow-raise-live.html` preserves the raise form supplied by the user on
2026-10-05, including the selected input value `21`, BB text `10.5BB`, preset
buttons, slider, and Raise submit input. Tests read the input's current `value`
property; the HTML attribute is only its initial value. CSS/layout visibility is
simulated in DOM tests because Linkedom does not implement browser layout.

The capture establishes where to read the selected total and submit label. It
does not establish a legal minimum: slider min/max/value and the Min Raise
button must not be treated as numeric minimum-raise evidence.
