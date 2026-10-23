# Phase 5D: bounded public-data feasibility and ingestion pilot

Implemented from `fd4e97c` on 2026-10-23. Read Phase 5A/5B/5C, the likelihood
registry, benchmark, conditioning/probability code, opponent-db persistence and
estimation, and existing tests before implementation. A fresh query-only,
read-only SQLite audit still found **0 legacy rows and 1,709 partial live
observations**. No private records were exported or used for calibration.

**Result:** authentic public data can support a narrow offline ingestion and
scoring demonstration. Of 448 inspected Pluribus hands, 447 pass this adapter,
with 1,243 postflop actions. Eight satisfy the deliberately narrow exhaustive
fold/call scope: two development observations and six held-out observations.
All six are scoreable in both Phase 5C modes. This makes descriptive empirical
scoring possible; **reliable empirical calibration, a combination-dependent
behavior model, tournament transfer and defensible recommendations remain
unestablished**. No externally reviewed model was discovered or invented.

## Sources, bounds and licensing

Pinned sources:

- [phh-dataset](https://github.com/uoftcprg/phh-dataset/tree/e47fbd5816372360bade4de5d712346fe1bb70f6),
  commit `e47fbd5816372360bade4de5d712346fe1bb70f6`.
- [phh-std](https://github.com/uoftcprg/phh-std/tree/c1bd44c3d0faef9ed989be8d6675f814c0e0f62d),
  commit `c1bd44c3d0faef9ed989be8d6675f814c0e0f62d`.
- [Brown and Sandholm, 2019](https://doi.org/10.1126/science.aay2400), the original
  Pluribus research identified by the dataset publisher; the authors' public
  [paper](https://noambrown.github.io/papers/19-Science-Superhuman.pdf) was inspected.

Both repositories declare MIT. The exact dataset notice is preserved in
`scripts/fixtures/phh/LICENSE`. PHH conversion is attributed to the publisher;
televised annotations and the specification to Juho Kim; Pluribus observations
to Brown/Sandholm. This records the publisher's license, not an independent
rights audit of every earlier video, scraped log or journal supplement. Only
the small publisher-licensed PHH records selected below are redistributed.
Original videos/supplements, HandHQ logs and Wikipedia prose are not committed.

Read README/license/specification and nonrecursive directory sizes before
fetching individual records. No repository clone, compressed archive or Zenodo
download was performed. Original retained content totals **314,705 bytes**:
244,576 bytes for 448 Pluribus hands and 70,129 bytes for 83 WSOP hands. A separate
636,240-byte HandHQ file and five historical/example PHH files (5,474 bytes)
were inspected only for feasibility. Total distinct inspected hand-history
content was 956,419 bytes, excluding documentation and API metadata. Repeated
fetches during initial inspection are not additional hands. The Python loader
enforces a 600-file / 1,000,000-byte bound on its retained pilot inputs and never
downloads anything.

The fixture manifests record original path, Git blob SHA-1, byte length and
exact decoded UTF-8 content. Every offline run verifies the blobs before parsing.
This is reproducible source identity, not independent verification against the
original broadcasts or original Pluribus logs. The latter were not downloaded.

## Feasibility audit

All inspected hand records use TOML-based PHH (`.phh` per hand, `.phhs` numbered
tables for a collection). Unknown cards are `??`. The specification permits
partial histories and infinite/unknown stacks: merely parsing PHH never proves
complete observations. Its required/optional fields, positional ordering,
heads-up reversal of forced bets, `cc`, bet-to `cbr`, and show/muck semantics
were inspected directly.

| Source actually inspected | Profile, forced bets and depths | Completeness, visibility and missingness | Suitability |
| --- | --- | --- | --- |
| Pluribus complete blocks 100–105: 448 hands | NT/NLHE, six dealt-in players, 50/100 blinds, zero antes/straddles, all stacks reset to 10,000 (100 BB). Research cash/chip-EV format, not tournament. Human professional aliases plus Pluribus. | Full ordered deals/actions and final stacks. All initial hole cards recorded, including folds; these are archive labels, not publicly visible in-game cards. No per-action timestamps, authenticated sessions, stable real-person mapping, explicit rake schedule or currency field. | 447 strictly replayed hands; one unsupported fractional payout. 1,243 valid postflop actions, eight narrow benchmark rows. No inference of equilibrium strategy from behavior. |
| WSOP 2023 Event 43 Day 5: all 83 televised hands | Mixed-game tournament: 11 NT, 14 FO/8, 13 F7S, 10 FR, seven each PO, FT, N2L1D, F7S/8, F2L3D. 67 five-handed, nine four-handed, six heads-up, one three-handed. NT hands all five-handed, blinds 40k/80k, 50k/100k or 75k/150k, BB ante 1.5 BB; starting depths 14.167–129.5 BB. | All have ending stacks and action arrays; whole mixed-game legality not certified here. 61 unknown-card tokens across action strings; none in the 11 NT records. Televised-card visibility is distinct from player knowledge. No decision times, complete ICM/payout/prize context, blind schedule or live-source proof. | Metadata census, not benchmark ingestion. All 83 excluded from the cash six-seat/no-ante contract; 72 also have another variant. Tournament provenance alone does not establish a match to the intended target profile. |
| HandHQ Absolute Poker, first lexical 1000NLH archive under `10/`: 999 records | NT cash, 5/10 nominal blinds; 464 two-, 361 six-, 121 five-, 52 four-, one three-handed. Four records have nonstandard single-live-blind arrays. 790 no-ante and 209 ante 2.5/player. Starting depths 2.15–527.5 nominal BB. Scraped/anonymized July 2009 player population. | TOML metadata census only, not legal replay. No known initial hole cards in any hand; 149 hands contain explicit known-card show actions, a selected reveal process. Winnings fields but no final-stack fields; rake and session/alias continuity unverified. | Not selected. Potential action/reveal observations require an independently audited adapter, missingness treatment, rake/accounting and applicable profile support. No count of valid benchmark decisions is claimed from its 999 parsed records. |
| Dwan–Ivey 2009: one selected historical hand | NT cash, three represented players, 1,000/2,000 blinds, ante 500 each; stacks 276.75, 562.8, 1,000 BB. | Two known hole pairs, one unknown pair; action sequence through all-in/runout. No ending-stack reconciliation, exact time, rake or population sample frame. | Outside profile; selected televised large pot, not a representative cohort. |
| Antonius–Blom 2009: one selected historical hand | Heads-up pot-limit Omaha, 500/1,000 blinds (PHH heads-up assignment reversed), no antes; 678.4735 and 1,259.45025 BB. | Both four-card holdings supplied, actions/runout supplied; no final stacks or rake specification. | Wrong variant/table size/depth; no benchmark ingestion. |
| Arieh–Yockey 2019: one selected historical hand | Four-player fixed-limit 2–7 triple draw tournament; blinds 75k/150k, limits 150k/300k, no antes; 7.867–71.767 BB. | Two known starting hands and two unknown; draw/replacement/reveal actions. No final-stack reconciliation or complete tournament utility context. | Wrong variant/table size; exceptional-hand selection. |
| Phua–Xuan 2019: one selected historical hand | Six-player short-deck, ante 3,000 each plus button forced bet 3,000; stacks 204k–495k. No conventional two-blind BB profile; stacks 68–165 ante units. Event identifies Triton London but this record alone does not reliably resolve cash/tournament format. | All six initial pairs and runout supplied; no final stacks, rake or detailed event-format provenance. | Wrong variant/ante structure; format uncertainty not guessed. |
| Alice–Carol Wikipedia badugi example | Four-player fixed-limit badugi, 1/2 blinds, 2/4 limits, zero antes, stacks 200. | Illustrative named actors, unknown deals/draws followed by two shown hands. | **Not authentic behavioral evidence**; excluded. MIT PHH transcription does not establish the separate Wikipedia prose license. |
| phh-std examples/specification | MIT format documentation, not a separate behavior dataset. Repeats Dwan–Ivey and Arieh–Yockey examples. | Example descriptions have differing event-number text; not used to establish identities or completeness. | Zero new independent observations; do not double-count examples with phh-dataset. |

The dataset README also advertises ACPC bot competitions, hundreds of millions
of hands (with known duplicates) excluded from the GitHub version, and the much
larger HandHQ corpus. Those archives were **not inspected or downloaded**; no
variant/stakes/identity/completeness claim beyond publisher metadata is made.
`tournament.records` in the generated replay report preserves each of the 83
records' exact blinds, antes, bring-ins, limits, stacks and missing-card counts,
including stud games where BB depth is undefined. No tournament record is
silently reconstructed under PokerKit's default cash rules.

HandHQ source identity for reproducibility: commit above,
`data/handhq/ABS-2009-07-01_2009-07-23_1000NLH_OBFU/10/abs NLH handhq_1-OBFUSCATED.phhs`,
Git blob `264feaa7858641b8a67466f29ea4d060695ff283`. Its metadata audit and
aggregate findings do not promote it to validated evidence.

The five small standalone records are `data/dwan-ivey-2009.phh`,
`data/antonius-blom-2009.phh`, `data/arieh-yockey-2019.phh`,
`data/phua-xuan-2019.phh` and `data/alice-carol-wikipedia.phh` at the pinned
dataset commit. Their comments identify video/Wikipedia sources; those
underlying media were not independently reviewed. The standard's
`examples.rst`, `spec.rst` and `required.rst` were inspected at its pinned commit.

## Selection, exclusions and reconstruction

Initially selected complete Pluribus blocks 100 and 101 by source identity,
not showdown or outcome: 163 hands / 90,065 bytes, 537 postflop actions and only
one binary response. Made one disclosed expansion to complete blocks 100–105,
then stopped irrespective of labels or score. This is a convenience pilot,
not a random, representative or preregistered confirmatory sample.

Direct `parse_action` replay using pinned PokerKit 0.7.7 checks actual actor
order, streets, legal raises/calls, contributions, returns, terminal status and
final stacks. **Never use its `HandHistory.state_actions` convenience iterator**
for this task: inspection showed that it can repair histories by inserting
checks/folds/unknown deals. The adapter permits only forced posting, collection,
unknown burns, default single-runout selection, hand killing and settlement
automations. It cannot add a player's decision, dealt card, board or show/muck.
Warnings cause rejection. Missing, out-of-order, illegal, colliding-card,
incomplete or inconsistent records never publish partial candidate rows.

The one excluded hand, `102/0.phh`, has final stacks of 10,112.5 for two tied
players. Integer-chip settlement would allocate the odd chip differently. The
adapter deliberately does not choose a fractional split/rounding convention;
it excludes that hand, including its eleven postflop actions. This is an
unsupported accounting case, **not a claim that the source hand is corrupt**.
All 447 accepted hands conserve 60,000 chips and match final stacks with no
rake deducted. That observed zero-deduction result is the replay's rake scope;
it does not establish a rake schedule for HandHQ, tournaments or PokerNow.

Accepted counts: blocks 100/101/102/103/104/105 have respectively
71/92/72/67/110/35 hands. They contain 2,758 preflop and 609 flop + 376 turn +
258 river player decisions. All 1,243 postflop decisions are considered before
selection. **1,235 are excluded from this benchmark** because they are not
heads-up, facing a payable wager with raising unavailable. They are still
authentic reconstructed observations, potentially useful to a future broader
action-space model; they are not silently coerced to check/bet or fold/call.

For the eight retained rows, there are exactly two active players, a positive
call cost, legal fold/call, and no legal raise. The other player is all-in or
the actor cannot exceed the call. No chip-size grid or guessed bet abstraction
is needed. The corpus happens to put all eight on the river. Positions follow
PHH's clockwise order: p1 SB, p2 BB, p3 UTG, p4 HJ, p5 CO, p6 BTN. The adapter
reconstructs current actor, last aggressor, prior raise count, ordered board,
pot including outstanding bets, payable call cost, call street-total size,
remaining stacks and opponents before the action. Effective depth is the
actor's still-riskable amount, capped by the other active player's current
street bet plus remaining stack, minus the actor's existing bet; it is not the
actor's original 100 BB stack.

Example `105/14`: the UTG actor already contributed 3,050 this street, has
3,975 behind and faces HJ's 7,025 all-in raise. Pre-action pot is 16,175, call
cost 3,975 (39.75 BB), call-to 7,025 (70.25 BB), and effective remaining depth
39.75 BB. The recorded choice is fold. These quantities are separately checked
against hand-calculated test expectations. Accepted binary effective depths
range from 39.75 to 78.75 BB, within hands that began at 100 BB.

## Visibility

Pluribus's archive records all initial dealt cards, even for folds. The retained
opponent labels are therefore `independent_reveal` from a full-deal research
archive, not a declaration that cards were publicly visible before betting.
For each terminal decision, the other active player is the designated observer:
that player knows their own cards. Only those two cards and the already-dealt
board enter prediction. No later board, other folded players' cards, opponent
archive cards or outcome enters the prior or fitted probabilities.

If the acting opponent's cards are unknown, they remain null: action-marginal
evaluation can proceed with the stated prior, revealed-combo evaluation cannot.
If the observer's own pair is unavailable, this Phase 5C bridge excludes the
row. Negative tests exercise both cases; no unrevealed card is inferred from
winnings, action, hand strength or a likely holding. All eight real retained
rows have known archive labels. Conditional label availability permits scoring
a supplied combo model; it does **not** make eight different combos sufficient
to learn or validate a combo-dependent model.

## Holdout

Fixed source blocks 100–102 supply development observations and 103–105 supply
evaluation observations. This split was fixed for the bounded expansion; the
initial audit and implementation are exploratory, not an untouched external
scientific evaluation. Model probabilities use development labels only. No
tuning, smoothing, outcome-driven row selection or post-score expansion occurs.
All fixture expectations derived after inspection are tests, not extra training
observations or evidence of independent review.

Source path/block/hand and one-based action ordinal define stable hand/event
IDs. Whole hands are deduplicated before splitting by both source identity and
a SHA-256 fingerprint of rules, initial stacks and complete canonical actions.
Hole-pair ordering and flop-card ordering are canonicalized for this duplicate
check; the original chronological board remains intact in observations. The
fingerprint excludes player aliases and local hand numbers to catch repeated
deals/actions under another ID. Conflicting same-ID records reject the cohort;
duplicate aliases cannot make an extra evaluation hand. No duplicates were
found in this selected corpus. This bounded procedure cannot detect every
possible duplicate elsewhere in the uninspected archive.

Player aliases are hashed in one study namespace. They are not authenticated
real-person identities. Source directories are not established independent
sessions: every row is conservatively assigned the same study cluster. Only
**hand holdout** is claimed. Phase 5C's session/player holdouts correctly reject
overlapping development data in tests. Session sensitivity is unavailable with
one study cluster; no confidence interval, effective sample size or unseen-player
claim is supplied.

There are no wall-clock action timestamps or expiry fields in these PHH records.
The bridge explicitly uses action ordinals as an archive-only logical clock,
with a fixed boundary 201 after the adapter's 200-action maximum. This is new
offline replay bookkeeping, **not recovered source time or an original live
deadline**. It is marked in provenance, cannot establish freshness, and is
never supplied to the live reader/updater. Existing live deadlines are untouched.

## Baseline, scoring and actual results

Reuse Phase 5C's registry, model/development manifests, exact scopes, hand-holdout
checks, marginalization, scoring and calibration summaries without weakening
their validators. No model enters Phase 5B reviewed offline conditioning.
The new adapter is not exported from the production range-engine index.

The sole baseline is **raw pooled development fold frequency**: one fold and
one call, so both probabilities are 0.5. This number comes from actual training
observations, not an invented strategy table or a synthetic fixture. It is
explicitly constant across cards/contexts and pools one human and one bot
observation. That pooling is a diagnostic assumption, not evidence that the
two populations have interchangeable policies. Human/bot identities and
separate three-observation held-out reports are retained. Zero frequencies are
not clipped; a synthetic negative test confirms infinite NLL when appropriate.

### Uniform prior

The diagnostic prior gives equal weights to all physical combinations legal
against the board; Phase 5C then removes the observer's cards and normalizes.
It is an explicitly unfitted combinatorial assumption, ignores earlier betting,
and is not an empirical opponent range. Opponent label cards never determine
its support. Because this baseline is constant across combos, marginal and
known-combo predictions are identical apart from floating-point summation.
The same scores do not establish correctness of the prior or conditional model.

| Source hand | Split | Actor population | Observed river response |
| --- | --- | --- | --- |
| 100/61 | Development | Bot | Call all-in |
| 102/23 | Development | Human | Fold |
| 103/3 | Evaluation | Human | Call all-in |
| 103/15 | Evaluation | Bot | Call all-in |
| 104/45 | Evaluation | Bot | Fold |
| 104/77 | Evaluation | Bot | Fold |
| 105/14 | Evaluation | Human | Fold |
| 105/29 | Evaluation | Human | Fold |

Both actual runs score **6/6 observations, six hands, one study cluster**, with
zero coverage failures. Each exact scope has only **one** observation. Each
score is NLL approximately **0.69314718056 nats** and unhalved Brier **0.5**.
The held-out sample contains four folds and two calls; each actor stratum has
two folds and one call. Phase 5C keeps the six exact-context calibration
summaries separate; no cross-context winner, accuracy certificate or posterior
strategy is claimed. No competing behavioral model is available for comparison.

Both reports remain `status: unvalidated`, `empiricalCalibration:
descriptive_only`, with selected-sample limitations. Independent-reveal labels
include folds, so this particular archive's inclusion is not showdown-only;
it still has convenience-block, population and decision-context selection.
This is real-data plumbing and descriptive scoring evidence. Synthetic
mutations and older mathematical fixtures supply only contract/test evidence.

## Reproduction and checks

Python 3.11+ with the pinned optional offline dependency; Node compatible with
the repository (validated with Python 3.13.4 and Node 22.16.0). From repository
root on Windows PowerShell:

```powershell
python -m venv .data/phase5d-venv
.data/phase5d-venv/Scripts/python -m pip install -r scripts/phh-requirements.txt
.data/phase5d-venv/Scripts/python -m unittest discover -s scripts -p test_phh_pilot.py -v
.data/phase5d-venv/Scripts/python scripts/phh_pilot.py --output .data/phase5d-replay.json
npm run build:ts
node scripts/evaluate-phh-pilot.mjs .data/phase5d-replay.json .data/phase5d-evaluation.json
npm run test --workspace=@poker-ai/range-engine -- src/phhPilot.test.ts src/likelihoodBenchmark.test.ts src/probabilityMetrics.test.ts src/offlineConditioning.test.ts
```

On POSIX use `.data/phase5d-venv/bin/python`. Dependency installation downloads
the small PokerKit package, not poker archives. After installation, both replay
and evaluation are entirely offline. `observations.json` is reproduced exactly
from source in Python tests; it is a convenient small real fixture for the
ordinary TypeScript suite, not a substitute for validating source bytes.
Full detailed reports are generated under ignored `.data/`; no private evidence
is read by these commands.

Validation completed on 2026-10-23:

| Check | Result |
| --- | --- |
| Python direct-replay/source/visibility/accounting tests | 14 passed, including exact regeneration of the eight actual observations |
| Targeted pilot + Phase 5B/5C tests | 124 passed across four TypeScript files |
| Full `npm test` | 2,920 passed across 102 files |
| Workspace totals | AI-core 491; browser-reader 1,961; opponent-db 41; poker-engine 101; range-engine 317; shared 9 |
| `npm run typecheck` | Passed across all workspaces/apps |
| `npm run build` | Passed |
| `npm run build:extension` | Passed; both tracked generated bundles unchanged |
| Actual offline replay/evaluation | 447 accepted hands; eight selected observations; 6/6 held-out scores in each mode |
| `git diff --check` and staged diff check | Passed |

The first full run hit the existing BB capture CLI's 20-second child-process
timeout and the new adapter determinism test's five-second timeout. The former
passed unchanged in isolation and in the final full suite. The latter was
changed to hash/compare complete exported artifacts instead of redundantly
running eight scoring reports; Phase 5C already tests scorer determinism.
No timeout or safety assertion was relaxed. The final full suite passed all
tests, and the final Python run includes conflicting-invalid-copy rejection.
PowerShell rendered esbuild's normal stderr progress as `NativeCommandError`
text in redirected logs, but both build commands exited zero with successful
bundles and no TypeScript/esbuild diagnostic errors.

## Next milestone and unchanged live boundaries

The most useful next milestone is an **audited tournament-specific observation
and model contract**, with a precisely specified target table/ante/depth/utility
profile, chronological opportunity-complete histories, lawful provenance,
explicit card visibility, and genuinely disjoint source clusters. The 11 NT
WSOP records are useful candidates for testing a future tournament replay
adapter, not enough to establish representative tournament behavior. Extend
the profile/action-space contracts only with independent legality/accounting
tests; obtain a suitably scoped model/baseline and a larger held-out cohort with
justified uncertainty before making a calibration claim. No public dataset here
establishes PokerNow applicability or supplies a reviewed recommendation policy.

Live postflop recommendations remain disabled. Preflop behavior, source evidence
rules, original live deadlines, BB abstention, global `historyComplete=false`,
call/raise legality and betting-accounting safeguards are unchanged. No
opponent-db writes, private evidence export, provider inference, PokerNow
interaction, poker action automation, GTO claim or live strategy activation
occurred. The pre-existing untracked `.agents/` directory is excluded.
