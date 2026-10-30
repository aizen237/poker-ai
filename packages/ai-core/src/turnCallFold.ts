import { mulberry32 } from "@poker-ai/shared";
import { calculateCallEV, calculateFoldEV, calculatePotOdds, evaluateBest, HAND_CATEGORY_NAMES,
  detectFlushDraw, detectStraightDraw, classifyBoardTexture } from "@poker-ai/poker-engine";
import { calculateExactTurnEquities, calculateEquityVsRange, turnBettingAssumptions, flopBettingAssumptions } from "@poker-ai/range-engine";
import type { RiverCallFoldInput } from "./riverCallFold.js";

export const TURN_CHECKDOWN_WARNING = "Future river betting is unmodeled. Unconditional CALL/FOLD recommendation withheld. RAISE not evaluated.";
export const FLOP_CHECKDOWN_WARNING = "Future turn/river betting and equity realization are not modeled. Unconditional CALL/FOLD recommendation withheld. RAISE not evaluated.";
export type TurnCallFoldInput = RiverCallFoldInput;
export type FlopCallFoldInput = RiverCallFoldInput;

export function compareFlopCallFold(input: FlopCallFoldInput) {
  return compareCheckdownCallFold(input, "flop");
}

/** Numerical diagnostic only. A payable turn call does NOT end betting. */
export function compareTurnCallFold(input: TurnCallFoldInput) {
  return compareCheckdownCallFold(input, "turn");
}

/** Shared validation and conditional EV; flop reuses the seeded range sampler. */
function compareCheckdownCallFold(input: RiverCallFoldInput, street: "flop" | "turn") {
  const flop = street === "flop", count = flop ? 3 : 4;
  const base = { liveAuthorized: false as const, llmMayChoose: false as const, chosenAction: null,
    street, assumption: "checkdown" as const, warning: flop ? FLOP_CHECKDOWN_WARNING : TURN_CHECKDOWN_WARNING, foldEV: calculateFoldEV().ev };
  const abstain = (reason: string) => ({ ...base, status: "abstained" as const, reason,
    requiredEquity: null, equityBounds: null, callEVBounds: null, assumptions: [], handLines: [] as string[] });
  if (input.street !== street || input.board.length !== count) return abstain(`Exactly ${flop ? "three flop" : "four turn"} board cards are required.`);
  if (input.activeOpponents !== 1) return abstain("Exactly one active opponent is required.");
  if (input.accounting !== "single_pot_no_rake") return abstain("Single contestable pot, resolved returns and no rake/side pots are required.");
  const { potBeforeCall: pot, amountToCall: call, heroStack, opponentStack } = input;
  if (pot === null || call === null || heroStack === null || opponentStack === null ||
      ![pot, call, heroStack, opponentStack, pot + call].every(Number.isFinite))
    return abstain("Pot, CALL amount and both remaining stacks must be finite and known.");
  if (pot <= 0 || call <= 0 || call > pot || call >= heroStack || opponentStack <= 0)
    return abstain("A positive fully payable non-all-in CALL and consistent positive pot are required.");
  try {
    const profiles = (flop ? flopBettingAssumptions : turnBettingAssumptions)(input.heroCards, input.board);
    const exact = flop ? null : calculateExactTurnEquities(input.heroCards, profiles.map(p => p.range), input.board);
    const assumptions = profiles.map(({ range, ...profile }, index) => {
      // Fixed seed makes polling/replays reproducible; never implies exact equity.
      const equity = (flop ? calculateEquityVsRange(input.heroCards, range, input.board,
        { iterations: 10_000, rng: mulberry32(0xF10F) }) : exact![index]!).equity;
      return { ...profile, equity, callEV: calculateCallEV(equity, pot, call).ev };
    });
    const hand = evaluateBest([...input.heroCards, ...input.board]);
    const flush = detectFlushDraw(input.heroCards, input.board), straight = detectStraightDraw(input.heroCards, input.board);
    const texture = classifyBoardTexture(input.board);
    const handLines = [`Current hand: ${HAND_CATEGORY_NAMES[hand.category]}.`,
      `Draws: ${flush.hasFlushDraw ? `flush draw (${flush.suit})` : "no direct flush draw"}; ${straight.kind === "none" ? "no direct straight draw" : straight.kind.replaceAll("_", " ") + " straight draw"}.`,
      `Board texture: ${texture.overall}, ${texture.suitTexture}, ${texture.pairTexture}, ${texture.connectivity}.`,
      flop ? "Draw labels are structural, not guaranteed winning outs; backdoor draws are included in sampled runouts but not separately labeled." :
        "Draw labels are structural, not guaranteed winning outs; all legal river cards are evaluated."];
    return { ...base, status: "conditional" as const,
      reason: "Conditional CALL versus FOLD only: assumes no further betting and showdown on the river.", handLines,
      requiredEquity: calculatePotOdds(pot, call).breakevenEquity,
      equityBounds: { low: Math.min(...assumptions.map(a => a.equity)), high: Math.max(...assumptions.map(a => a.equity)) },
      callEVBounds: { low: Math.min(...assumptions.map(a => a.callEV)), high: Math.max(...assumptions.map(a => a.callEV)) }, assumptions };
  } catch (error) {
    return abstain(error instanceof Error ? error.message : `${street} range calculation failed.`);
  }
}

export function turnCallFoldDisplay(result: ReturnType<typeof compareTurnCallFold>): string[] {
  return checkdownCallFoldDisplay(result);
}

export function flopCallFoldDisplay(result: ReturnType<typeof compareFlopCallFold>): string[] {
  return checkdownCallFoldDisplay(result);
}

function checkdownCallFoldDisplay(result: ReturnType<typeof compareTurnCallFold>): string[] {
  const flop = result.street === "flop";
  if (result.status === "abstained") return [`${flop ? "Flop" : "Turn"} checkdown calculation withheld: ${result.reason}`, result.warning];
  return [...(flop ? ["ILLUSTRATIVE ONLY — conditional checkdown estimate; no action recommendation."] : []), ...result.handLines, result.reason,
    `Required equity: ${(100 * result.requiredEquity!).toFixed(2)}% = CALL / (pot before hero call + CALL).`,
    `Estimated ${result.street} equity under supplied ranges: ${(100 * result.equityBounds!.low).toFixed(2)}%–${(100 * result.equityBounds!.high).toFixed(2)}%.`,
    `Checkdown-only CALL EV ${result.callEVBounds!.low.toFixed(3)} to ${result.callEVBounds!.high.toFixed(3)}; FOLD EV 0 (input units; prior contributions sunk).`,
    ...result.assumptions.map(a => `${a.label}: checkdown equity ${(100 * a.equity).toFixed(2)}%; conditional CALL EV ${a.callEV.toFixed(3)}. ${a.valueAssumption} ${a.bluffAssumption} ${a.valueCombos} value / ${a.bluffCombos} bluff combos.`),
    flop ? "10,000 seeded Monte Carlo turn/river runouts per range; weighted opponent combos, card removal and half of ties. Sampling error remains; range sensitivity is not a confidence interval. Both remaining streets must check down for this EV." :
      "All legal river cards evaluated, with card removal and half of ties. Range sensitivity is not a confidence interval. Possible river bets, folds and additional costs can change realized EV.",
    "Conditional heuristic assumptions; no observed tendencies, solver accuracy or statistical confidence. No live action authorization.", result.warning];
}
