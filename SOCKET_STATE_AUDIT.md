# Socket state and unopened-preflop evidence audit

## Hand 53: scoped first-UTG activation

The full [hand-53 export](evidence/hand-53-sixmax-utg-raw-socket.json)
supersedes the earlier request below for another six-player capture. It has two
frames, no reported rejected/dropped frames, in one generation: registration in
hand 52 (`hwdhoynyho3g`, now `1791876582763`), then the directly linked hand 53
(`x9h6owk0kbw5`, now `1791876608697`, pre `1791876582763`). The registration
already has six seats; the new hand supplies all six two-card pC entries and the
same six iHPI IDs. Hero has 8h5h. New dealer is seat 4, SB 9, BB 10; increasing
seat traversal gives UTG 1, HJ 2, CO 3. Both cPI/pITT name hero at seat 1.
New tB contains only SB=1 and BB=2. eventsData is empty, not a poker action log.

`firstUtgSource.ts` now validates this exact source **shape**, not these fixed
hand/player IDs: direct end-hand registration -> next-hand first-UTG update,
normal observed 1/2 no-ante play-money Hold'em profile, six unique seated IDs,
six explicit dealt-card entries, matching iHPI, dealer/blind order, normal blind
totals and first hero turn. Empty players is accepted only in this direct linked
transition, where registration provides the six stacks. This is not a universal
patch reducer, multi-hand tracker or a decoder of later tB action changes.
Any membership/player patch, unknown profile, missing field or inconsistent
mapping rejects the witness. No arrival/departure is reconstructed by name.

`firstUtgLive.ts` independently requires the current connected hand/generation,
continuous socket segment, matching cards, six current occupied seats/positions,
DOM dealer, numeric remaining stacks >=100BB, no folded/all-in/offline/settling
seat, explicit normal blind values, hero turn and no read errors. Remaining
stacks must also match the registration stack or that stack minus its forced
blind; this supports a lower bound without guessing the general socket stack
accounting convention. Contradictory log actions or seat mappings reject it.

For this first UTG turn **there is no preceding legal voluntary turn to replay**.
The scoped context marks only this empty voluntary decision window complete;
it does not fabricate ordered blind events. Source forced-blind contributions
establish a 2-chip call gap even if nonblind DOM markers are absent. The generic
DOM monetary assessment, decisionPot, whole-hand historyComplete=false and
postflop/EV gates remain unchanged. No postflop/side-pot/accounting proof is
needed by the existing non-EV RFI chart.

The witness expires after any subsequent state update (including duplicates or
malformed intended frames), reconnect, reader gap, or ten seconds from its
original local receive time. Cached delivery cannot refresh its age. This TTL
is a local safety bound, not source time semantics. Its expiry is part of request
identity, so delayed provider responses cannot resurrect an expired decision.
Only the direct registration/new-hand class is supported; observing later hands
without a fresh compatible registration does not create another certificate.

The real adapter regression reads the original two envelopes, passes them through
the production projection/identity/metadata/runtime, cross-checks reader-shaped
DOM inputs, serializes the resulting packet and evaluates the relay policy.
8h5h UTG selects FOLD without a Raise panel or contestable pot. RAISE still lacks
independent minimum/chip-increment/2.5BB acceptance proof; mR/mAVTB and slider
attributes are not promoted. BTN/CO action windows, limps, responses to raises,
short stacks, BB strategy and all postflop expansion remain gated.

One real **FOLD-only** smoke test is now justified for this exact class. Rebuild,
reload the extension and PokerNow before the next hand so registration precedes
the boundary; restart the relay to load rebuilt ai-core. No additional raw
six-player or heads-up capture is required for this class. No auto-click occurs.

## Historical hand-49 investigation

## Source inspected

The original [hand-49 raw export](evidence/hand-49-raw-socket.json) is now the
source of truth. SHA-256 at inspection:
`19491462035031a345ef041d6e8118386880e041ec441d0df55a1d8162ffdc39`.
It contains five retained frames in local connection generation 1: one
`registered`, then four `gC`; no `rup`. Capture ended by explicit export, with
zero rejected frames and no reported retention limit. Local receive sequence,
timestamps and generation are diagnostics, not server completeness guarantees.

This supersedes the earlier summary-only findings. The old report fixture is
kept as historical evidence; new tests read the original export directly, with
no invented missing frames. Registration is already in hand 48, so the capture
does not include the beginning or complete history of hand 48.

Only audit documentation, historical-fixture provenance, an offline audit
explanation and regression tests changed in this pass. No live decoder, proof gate, strategy, recommendation,
accounting, settlement or `historyComplete` behavior changed.

## Exact frame sequence

| Local frame | Source cursor (`now`) | Source state / changes |
| --- | --- | --- |
| 1: registered | 1791681923076 | `gameState.gN=48`, `hI=sult10pqpx2q`; hero `currentPlayer.id=v7UmNXTwjJ`; three players/seats; board `[9s,Kh,Js,5h,3d]`; `gT=[1,5]`; `tB={}`; `cPI=null`, `pITT=null`; settlement result present |
| 2: gC | 1791681980133 | `players.TTXBlZfl8G.disconnectedSince` updated; `uP="<D>"`; no hand change |
| 3: gC | 1791681982561 | `gN=49`, `hI=0kunwn5db0aj`; `gT=[1,0]`, board `oTC[1]=[]`; new cards; two-player roster; seat 2 removed; `gameResult="<D>"`; SB/BB and dealer change; `tB={OoArqYL22g:1,v7UmNXTwjJ:2}`; `cPI=pITT=OoArqYL22g` |
| 4: gC | 1791682081744 | `tB={OoArqYL22g:2}` only; `pITT=null`; `cPI` absent; `cRPI=[OoArqYL22g]`, `pGS={}`, `sNA="NSAA"`; no hand/street/board replacement supplied |
| 5: gC | 1791682082616 | `cPI=pITT=v7UmNXTwjJ`; `sNA=null`; `tB` absent; no hand/street/board replacement supplied |

Each gC `pre` exactly equals the previous frame's `now`, including the link
from registration to frame 2. The existing checker reports four linked updates,
not the three links available in the previous summary. All five `eventsData`
arrays are empty. Empty eventsData therefore cannot be a complete action log or
evidence of an unopened pot. No timestamps are converted into assumed units.

## Hand start, roster and freezing

Frame 3 is now an observed hand boundary, not a presumed mid-hand first sighting:
both source hand identifiers change together, the board clears, new card entries
arrive, blinds and dealer rotate, and the prior result is removed. Freeze the
hand-49 baseline at this frame, not at registration (which belongs to hand 48).
This does not establish reconnect/backfill handling for a missed hand boundary.

The full `pC` is a player-ID-keyed object. At frame 3 it contains exactly:

- `OoArqYL22g`: two card entries, both `{value:null, showing:false}`.
- `v7UmNXTwjJ`: `{value:"Kh", showing:false}`, `{value:"Th", showing:false}`.

These are actual two-card slots, not just ambiguous object keys. Hidden null
opponent values do not mean no cards were dealt. Hero's prior cards in frame 1
were `9d,6h`. Frame-3 pC IDs agree exactly with `iHPI` and seats
`[[1,"v7UmNXTwjJ"],[3,"OoArqYL22g"]]`.

**The source-reported dealt-card roster at the start of this observed hand is
now established:** two participants, with hero at seat 1. This is a fact about
hand 49, not validation of every iHPI/pC lifecycle or a new live activation
certificate. The registration has three in-game player objects; it must not be
reused as hand-49 membership.

The prior third player is now known, not synthetic: `TTXBlZfl8G` at seat 2.
Frame 2 reports disconnection, while frame 3 carries `"<D>"` for that player's
`players`, `pGS` and `pTB` entries and excludes them from seats/iHPI/pC. This
corroborates a specific removal at the boundary. It does not define every
away/sit-out or deletion-marker case. Frame 3's `players` object contains only
the removal: treating it as a complete player dictionary would be incorrect.
Conversely, blindly deep-merging pC would retain the prior third player's cards.
No universal nested-patch reducer is inferred from these different shapes.

Freeze the new roster independently from hand 48, retain it through later
omissions/folds/departures, and never reinterpret an omitted field as an empty
roster. Flag conflicting assignments instead of rewriting history. The capture
does not contain a later hand-49 fold/departure; those existing tests remain
explicitly synthetic. Reconnect/gap invalidates current proof use even if the
historical baseline remains available for audit.

## Positions and turn progression

At frame 3 `dealerID=OoArqYL22g`, `dealerSeat=3`, `sBPI=OoArqYL22g` and
`bBPI=v7UmNXTwjJ`. This establishes consistent heads-up roles for this hand:
seat 3 BTN/SB, seat 1 BB. No clockwise assumption is necessary for two players.
The prior hand also shows dealer seat 1, SB seat 2, BB seat 3, which supports
the observed three-seat ordering but does not validate six-seat traversal,
vacancies or six-max UTG/HJ/CO assignment generally.

The actual turn-field sequence is SB/SB -> omitted/null -> hero/hero for
`cPI/pITT`. Frame 4 is transitional: explicit null pITT must not be replaced
with a guessed active actor or treated as hero's decision. Frame 5 is the first
captured update with both IDs equal to hero. These are established source field
transitions; interpreting either field as a universal turn-ready acknowledgment
still requires the source contract. No live turn gate is changed.

## tB and the completion conclusion

What is proven from the JSON: frame 3 explicitly supplies SB=1 and BB=2;
registration explicitly supplies blinds 1/2; frame 4 supplies a new SB value of
2 and does not supply a BB value; frame 5 supplies the hero turn fields. There
is no intervening *reported* hand/street/board change. `cHB` is 2 at frame 3 and
is not replaced in frames 4/5. These facts strongly support a blind completion.

What remains an interpretation: tB entries represent assigned total wagers
rather than increments, omitted nested entries retain their prior totals,
and every action affecting that interpretation is represented by these updates.
This single preflop example also cannot distinguish street totals from whole-hand
totals, since both coincide before the flop. Existing monetary verification
applies to DOM wager values, not an independently decoded socket tB contract.
There is no matching explicit call row or DOM wager/action-button capture in
this file. Empty eventsData supplies no action label.

**Do not promote this to a verified poker-action event yet.** It is now a
frame-anchored, strongly supported SB completion candidate: if tB uses assignment
of street totals, the SB calls **1 additional chip to total 2**, not a raise and
not an unopened RFI pot. The old reasons about missing frame placement and pC
contents are resolved; semantic/action-coverage reasons remain. No additional
chips, action record or accounting entry are created from this audit.

## Legality candidates and unchanged blockers

The full file does contain new candidates that the summary omitted:
`mR` changes 2 -> 4 at the hand boundary; `mAVTB` is 119 in registration,
87 at the SB turn, and 119 at the hero turn. The latter values equal the named
players' registration stacks. Their relationship to min raise-to, investment,
remaining chips and step/denomination is not proven by names or correlations.
There is no independently verified chip increment or control acceptance here.
Thus 2.5BB legality remains blocked; selected amounts and slider bounds are
still not proof. FOLD still does not require a raise-size certificate.

The observed connection is continuous; complete poker-action coverage, current
decision catch-up, reconnect recovery, universal deletion/merge rules, all-in,
side-pot/rake accounting and six-max semantics remain unproven. Global
`historyComplete=false` and every existing activation gate remain unchanged.

## Next capture

No repeat of hand 49 or any heads-up test is needed. The next **six-player
passive capture is still required**: registration, the natural new-hand boundary,
and every gC/rup through hero's first preflop decision, before acting, with six
actually dealt-in players. This is the smallest next sample for six-player
membership, ordering and action-window evidence. Use the existing raw recorder;
no special poker action is required. Any min/max/increment metadata present is
retained, but capture alone does not guarantee legality or completeness proof.
