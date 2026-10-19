# Phase 3E: source-verified unopened SB FOLD; SB RAISE remains gated

Hand212 update: [the accepted SB raise audit](PREFLOP_SB_212_ACCEPTANCE.md)
verifies a source total of five after the posted one. The remaining blocker is
the nonzero-contribution UI input-to-total link, not absence of SB acceptance.
The original evidence assessment below records hands147/165; hand212 supersedes
its missing-acceptance statements without changing activation.

This adds only the supported first Small Blind decision after UTG, HJ, CO and
BTN explicitly fold. The existing SB chart is unchanged. Out-of-chart hands
may display FOLD; chart-included hands abstain pending independent SB sizing.
UTG/HJ/CO/BTN FOLD and exact-five RAISE keep their existing contracts.

## Recorded source authority

| Local capture | Hand | Boundary | UTG fold/HJ turn | HJ fold/CO turn | CO fold/BTN turn | BTN fold/SB turn | Original hero cards |
| --- | --- | --- | --- | --- | --- | --- | --- |
| raise-sizing-paired.json | 147 | 63 | 64/65 | 66/67 | 68/69 | 70/71 | 3s 3h |
| raise-5-accepted.json | 165 | 21 | 22/23 | 24/25 | 26/27 | 28/29 | 9s Qc |

These are local receive sequences, not authoritative server event indexes.
Both have hero seat1 SB, seat2 BB, seat3 UTG, seat5 HJ, seat9 CO and seat10 BTN.
The boundary contains exactly those six iHPI/card-membership identities and
normal tB totals hero=1 and BB=2. All eight following payloads match the existing
closed raw fold/turn grammar. Each pGS=fold belongs to the preceding actor; each
separate cPI/pITT activation names the next actor. Source pre/now links match.
No wager, card, roster, stack or settings mutation occurs in this window.
The next captured hero action in each hand is a fold, not an accepted raise.

The existing bounded reducer remains the sole source/continuity authority.
Its shared fold-prefix recognizer now accepts eight transitions for SB, retaining
the original six-player positions. It issues `sourceStatus.sbProof`, scope
`sb_after_utg_hj_co_btn_folds`, with the anchor, four raw fold records, HJ/CO/BTN
activations, final SB activation and the same continuity receipt used elsewhere.
Only the final turn issues a decision certificate. Its original receive time
+10 seconds is the deadline. Boundary-to-SB delays are 10.850s and 14.156s;
the older anchor is structural evidence, not renewed actionable advice.

Every subsequent source update invalidates the certificate. Reconnect, missing,
replayed, reordered, combined, unknown or contradictory updates discard the
window. Exact raw-field checks run before projection can discard unknown fields.
DOM polling, panel edits and provider output cannot renew evidence. No BB
certificate or generic betting-history permission is introduced.

Live cross-checks require all six original seats/positions, the four expected
folds, hero as sole current actor, matching cards/dealer/blinds and numeric stacks.
The conservative source >=202 chips and current >=200 checks remain unchanged
for every player. BB must remain occupied, unfolded, online, ordinary/not-all-in
and not settling. Hero's explicit current contribution must be 1; BB's must be 2.
Missing blind contributions cannot be supplied from absent DOM text.
The call gap is 2-1=1 chip (0.5BB), not the two-chip total.

The packet preserves six dealt-in players, one active opponent, four ordered
folds and both blind contributions. Decision-local historyCoverage=complete
describes this closed opening window only. Global historyComplete remains false;
side-pot, return/rake, general reopening and postflop gates are unchanged.

## Strategy scope and independent sizing assessment

The existing SB chart explicitly belongs to the six-max deep-stack raise-first-in
reference. Its existing deterministic policy is raise-or-fold, not a solver or
complete SB strategy with limps/calls. Four folds leave the hand unopened; they
do not change it into a two-player dealt-in chart. Original Q9o is outside this
SB chart and produces FOLD. Original 33 is included and remains blocked from
RAISE; unsupported RAISE is never replaced with FOLD. No ranges were changed.

| Required fact | Existing authority | Conclusion / missing evidence |
| --- | --- | --- |
| Initial SB turn, no voluntary wager | Fresh six-player anchor plus eight exact patches | Proven within the scoped source contract; not a reopening-after-action case |
| Forced contributions | Source tB hero1/BB2 and synchronous explicit DOM values | Proven; cost to call is one additional chip |
| Game profile / capacity | Same version/fV0.1.72, 1/2 no-ante play-money profile and deep-stack checks | Proven supported profile; no source min/max/grid decoder |
| Initial raise right | Ordinary no-limit profile and first voluntary SB opportunity | Supports the rule expectation, but is not an independent exact-five permission |
| Minimum opening raise-to | Earlier zero-contribution Min Raise=4 observation | Consistent with the expected rule; no paired SB minimum/control evidence in these captures |
| Amount field total vs additional for SB | Existing raise-to convention and verified street totals; hand169 input/source acceptance with contribution0 | Zero contribution cannot distinguish conventions. Phase 1 explicitly left nonzero contribution validation unresolved |
| Five on applicable SB grid | Hand169 accepted total5 with contribution0 | Supporting evidence only; no independent nonzero-contribution acceptance or verified general grid |
| Investment / stack cap | Required accounting is total5 minus posted1 = additional4; maximum total would be remaining stack+1 | Arithmetic is known, but not permission to submit input5. Do not apply the old zero-contribution size<=stack comparison to SB |
| Controls | Existing read-only form parser | Selected5, enabled submit, HTML validity, mR/mAVTB and slider values do not prove server acceptance |

Therefore SB RAISE is deliberately NOT enabled. The ONE existing sizing producer
returns an explicit insufficient-evidence reason for a fresh SB window. It
does not supply a size or raiseLegality certificate. The exact-size schema still
permits only contribution0/investment5 for its existing supported positions.
The engine also refuses a scoped SB chart RAISE even if synthetic generic bounds
or a transplanted earlier-position size are supplied. No speculative SB sizing
contract, altered chart, extra collector or secondary validator was added.

FOLD requires neither sizing/control proof nor pot EV. It renders immediately,
with the panel closed or open, before an optional explanation. Contradictory
Raise controls cannot authorize RAISE and do not invalidate an otherwise proven
FOLD. Expired or changed decisions lose actionable styling; providers cannot
override, delay, renew or resurrect them.

## Tests and validation

Sanitized fixtures retain original cards, numbers, order and timestamps. Earlier
frames reuse tracked bounded prefixes; the final eight payloads retain all raw
fields with identity substitution only. DOM cross-checks are explicitly simulated
from the existing reader shape; remaining stacks subtract posted contributions.
Positive tests use the real MAIN bridge, reducer, live adapters, engine and
overlay. Original Q9o tests FOLD and original 33 tests blocked RAISE. Synthetic
72o and negative mutations are labeled; final positive proofs/decisions are not mocked.

Validation passed:

- Targeted SB source and production-path tests: 189 (49 source, 140 live).
- Targeted ai-core policy/context tests: 82.
- Full `npm test`: 2,375 tests in 90 files, including every existing UTG/HJ/CO/BTN regression.
- `npm run typecheck`, `npm run build`, `npm run build:extension` and `git diff --check` passed.
- The tracked extension bundle was rebuilt. Raw local evidence remains ignored;
  only sanitized regression fixtures are included.

## Remaining scope and one minimal additional capture

SB RAISE, BB, limps, responses to aggression, short stacks, other profiles and
postflop remain unsupported. No poker actions are automated. Tests do not
constitute a new live SB verification.

The smallest missing sizing evidence is one paired **nonzero-contribution SB**
opening: same supported profile, four explicit folds, hero already posted1,
BB2, manually selected Min Raise and then input5/2.5BB, followed by an actual
accepted source total5 and four-chip additional debit with BB receiving the turn.
Only a separately user-authorized, manually submitted controlled play-money
raise can demonstrate that acceptance; this feature does not authorize or do it.

For that one test, reload the rebuilt extension and refresh PokerNow before the
hand, restart the relay, and arm the existing collector as described in
[RAISE_EVIDENCE_CAPTURE.md](RAISE_EVIDENCE_CAPTURE.md). Take `panel_opened`,
`min_raise_selected` and `five_chips_entered` checkpoints during the SB window.
If you choose to authorize the controlled manual test, submit yourself and export
once immediately after the accepted source transition and BB turn. Keep it local.
The collector's absent firstUtgProof warning is expected for SB: it still captures
current hand/actor/generation/cursor and raw incoming frames. It does not certify
SB permission. Do not reuse an expired SB witness or interpret this historical
capture as future live authorization. No repeat of the earlier UTG test is needed.
