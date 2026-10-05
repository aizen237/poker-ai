import { assembleGameState, calculateAmountToCall, type PokerGameState, type RawTableInput } from "./gameState.js";
import { computeDataConfidence, type ConfidenceResult } from "./dataConfidence.js";
import { assignPositions, type Position } from "./position.js";
import { parseBlindValues } from "./tableInfoParsing.js";
import { readPotProvenance, type PotProvenance } from "./potSemantics.js";

export interface LiveReadContext {
  blindTexts: readonly (string | null)[];
  dealerSeatNumber: number | null;
  /** Missing/ambiguous selector results from this same synchronous DOM read. */
  readErrors: string[];
}

export interface LiveStateAssessment {
  state: PokerGameState | null;
  confidence: ConfidenceResult;
  positions: Map<number, Position>;
  smallBlind: number | null;
  bigBlind: number | null;
  amountToCall: number | null;
  activeOpponents: number | null;
  /** Intentionally unresolved: never substitute main or add-on without live evidence. */
  decisionPot: number | null;
  pot: PotProvenance;
  legality: {
    verified: boolean;
    contributionMeaning: "unverified";
    minBet: number | null;
    minRaiseTo: number | null;
    chipUnit: number | null;
    aggressionReopened: boolean | null;
    reasons: string[];
  };
}

/** Pure assessment of one read; test fixtures are raw values, not invented DOM markup. */
export function assessLiveState(raw: RawTableInput, context: LiveReadContext): LiveStateAssessment {
  const pot = readPotProvenance(raw);
  const legality: LiveStateAssessment["legality"] = {
    verified: false, contributionMeaning: "unverified", minBet: null, minRaiseTo: null,
    chipUnit: null, aggressionReopened: null,
    reasons: ["Current-bet totals and absent/check-as-zero need live confirmation.",
      "Action controls, minimum raise-to, chip unit and reopening rights have no verified reader."],
  };
  const blinds = parseBlindValues(context.blindTexts);
  const readErrors = [...context.readErrors];
  if (blinds.smallBlind === null) readErrors.push("small blind could not be read");
  if (blinds.bigBlind === null) readErrors.push("big blind could not be read -- BB conversions disabled");
  if (blinds.smallBlind !== null && blinds.bigBlind !== null && blinds.smallBlind > blinds.bigBlind) {
    readErrors.push("small blind exceeds big blind -- verify selector order");
  }
  let state: PokerGameState;
  try {
    state = assembleGameState(raw);
  } catch (error) {
    return {
      state: null, ...blinds, positions: new Map(), amountToCall: null, activeOpponents: null, decisionPot: pot.decisionPot, pot, legality,
      confidence: { level: "low", reasons: [...readErrors, error instanceof Error ? error.message : String(error)] },
    };
  }
  const positions = context.dealerSeatNumber === null ? new Map<number, Position>() : assignPositions(state.seats, context.dealerSeatNumber);
  const hero = state.seats.find((s) => s.isYou);
  const amountToCall = calculateAmountToCall(state);
  const confidence = computeDataConfidence(state, {
    amountToCall,
    bigBlindWasDefaulted: blinds.bigBlind === null,
    isPositionKnown: hero !== undefined && positions.has(hero.seatNumber),
    potSemanticsVerified: pot.isPotSemanticsVerified,
    contributionSemanticsVerified: false,
  });
  return {
    state, ...blinds, positions, amountToCall, decisionPot: pot.decisionPot, pot, legality,
    activeOpponents: state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded).length,
    confidence: readErrors.length > 0
      ? { level: "low", reasons: [...readErrors, ...confidence.reasons] }
      : confidence,
  };
}
