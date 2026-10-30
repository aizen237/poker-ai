# Hand471 turn model abstention

Baseline: `74543c35fca5de58757503ef40a0f848bef8ce0f`.

## Findings

All 78 unmodified private socket frames were replayed through the production
MAIN observer (both TypeScript source and generated `eventSource.js`), transport,
source projector, timeline reducer, decision proofs and production overlay.
The capture reports zero recorder rejections. Every frame projects successfully.
The final five shapes are `turn_board_carried_actor`, `check`, `turn`, `bet`,
`turn`. No source-recognition change is needed.

The source observer independently reaches Hand471 before any DOM is supplied:
hero `Td 2h`, board `4h 4s Th Ts`, hero checked, opponent bet 4, payable CALL 4.
Collected pot 21 plus current wager 4 gives 25 before CALL. The observation is
sequence 78, generation 1, with its original ten-second lifetime. Replaying at
100 ms after the final receipt reaches range construction; expiry is not the
cause of that replay's abstention. This is a bounded source observation, not
complete hand-history proof or authorization to act.

The private file contains only `capture` and `frames`: **historical live DOM
binding remains unverified**. The integration harness supplies explicitly
synthetic matching DOM values and passes them through `readLiveTable`, identity,
roster, cards, stacks, contributions, pot and native CALL-control checks. This
demonstrates that compatible DOM can bind; it does not recover captured HTML or
establish the state of the browser at the time of the reported overlay.

## Exact model limitation

The range engine defines a bluff as unpaired hole cards matching no board rank,
whose best hand has at most one pair. On this double-paired turn every legal
holding has at least two pair. Independent enumeration of all `C(46, 2) = 1035`
opponent holdings gives 903 two-pair hands, 131 full houses and one four of a
kind. Thus all 1035 holdings fail the category ceiling, regardless of the other
bluff filters. There are 132 strong-value combinations and zero bluff combinations.

Both frozen hypotheses require nonzero bluff mass (10% or 30%). Construction
throws on the first profile:

> Strong value / 10% bluffs: no legal bluff combinations; assumption cannot be evaluated

This is a limitation of the current bucket definition, not a claim that an
opponent cannot bluff this board. No combinations are fabricated, no mixture is
renormalized to value-only, and no strategy assumption is changed.

## Diagnostic fix

Previously `riverIllustration` returned its generic empty result after model
abstention. That discarded the binding even after all binding gates passed.
`riverCallFoldReadiness` then added the misleading message “No validated turn
source activation,” and the overlay showed `WAITING FOR PROOF`.

The fix retains the validated binding separately from a `modelAbstention`
reason, while leaving the numerical illustration null. The overlay shows
`MODEL ABSTAINED` and explains that source and DOM binding passed but the model
withheld the numerical illustration. Unproven accounting scopes and withheld
action authorization remain explicit. No proof scope is promoted.

Abstention diagnostics use the same original expiry, freshness refresh and
source/DOM invalidation gates as numerical illustrations. The final freshness
check now also runs before returning a bound abstention. Expired or mismatched
inputs cannot retain the validated-binding message. There are no source, range,
strategy, recommendation or automatic-action changes. The generated content
bundle is rebuilt; the MAIN bundle is unchanged.

## Reproduction and validation

`turn471.test.ts` defaults to a clearly labeled synthetic variation of the
existing public Hand465 transcript with this hand's cards. It adds no private
capture or identifiers to Git. To replay the private evidence without changing
any frames, run from `packages/browser-reader` in PowerShell:

```powershell
$env:HAND471_RAW_CAPTURE = 'C:/Users/HP/projects/poker-ai/evidence/turn-model-abstention-hand471.json'
npx vitest run src/turn471.test.ts --maxWorkers=1
```

Focused regressions cover independent source recognition, range enumeration,
model output, binding preservation, overlay wording, expiry, DOM mismatches,
disconnection and absence of network/action requests. The ordinary Hand465 turn
(`Qc 6d` on `Td Th 3c Jd`) and existing unpaired-turn tests exercise numerical
illustration without any range-engine change. An ordinary supported turn can
proceed when both range buckets are nonempty and the existing source, DOM and
freshness gates pass; being non-double-paired alone does not guarantee support.

Automated source/DOM replay is not live-browser confirmation. The private
capture remains under the ignored `evidence/` directory.

Validation completed:

- Initial private replay reproduced the lost binding on both MAIN paths before
  the fix; source-observation assertions already passed.
- 220 integration tests passed across Hand471, Hand465, Hand435, Hand406 and
  the combined postflop pipeline suites.
- The final 14-case Hand471 suite (including additional display invalidation
  cases) passed with both the synthetic fixture and the unmodified private
  78-frame capture.
- 76 turn/flop/river calculation tests and five range tests passed.
- `npm run build`, all workspace typechecks and `git diff --check` passed.
- Both shipped bundles match fresh esbuild output byte for byte.
- The eight intended files were scanned against private source identifiers;
  no private identifiers or raw capture are included.
