import { z } from "zod";

const CardSchema = z.object({
  rank: z.union([
    z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6),
    z.literal(7), z.literal(8), z.literal(9), z.literal(10), z.literal(11),
    z.literal(12), z.literal(13), z.literal(14),
  ]),
  suit: z.enum(["s", "h", "d", "c"]),
});

const PositionSchema = z.enum(["UTG", "HJ", "CO", "BTN", "SB", "BB"]);

const StreetSchema = z.enum(["preflop", "flop", "turn", "river"]);


const FacingActionSchema = z.enum(["none", "bet", "raise", "all_in"]);

/**
 * Records how an equity number was produced, so the AI (and anyone
 * reading the audit trail) knows what it's actually looking at rather
 * than assuming every equity figure means the same thing:
 * - "estimated_range": heads-up equity computed against the opponent's
 *   narrowed range from their action history this hand.
 * - "random_hands": Monte Carlo equity vs random hands -- the fallback
 *   used for multiway pots (no multi-opponent range model exists yet)
 *   and for heads-up when range estimation itself fails.
 * - "unknown": reserved for a future/unrecognized source rather than
 *   silently mislabeling it as one of the above.
 */
const EquitySourceSchema = z.enum(["estimated_range", "random_hands", "unknown"]);

/**
 * The structured packet handed to an AI provider for a single decision.
 * Deliberately does NOT include a full conversation history or the raw
 * game state -- only the already-computed, relevant numbers (per Rule 4's
 * design philosophy: don't make the LLM redo work the deterministic
 * engine already did correctly). All numeric engine outputs are OPTIONAL
 * because not every field applies at every street (e.g. no equity number
 * exists yet before the AI is asked to reason, outs don't apply on the
 * river, board texture doesn't exist preflop).
 */

const CandidateActionSchema = z.enum(["FOLD", "CHECK", "CALL", "BET", "RAISE", "ALL_IN"]);

/**
 * Pure derivation from facingAction.type -- always call this rather than
 * hand-writing the list at each call site, so every caller stays in sync
 * if the legal-action shape ever changes. Deliberately coarse (not
 * stack-aware, e.g. RAISE is listed even when hero is too short to
 * actually raise) -- exact legality is validateActionLegality's job on
 * the relay server; this just tells the AI which category of actions is
 * on the table before it reasons, per Rule 4's "organize evidence,
 * don't make the model guess" philosophy.
 */
export function deriveCandidateActions(facingActionType: z.infer<typeof FacingActionSchema>): z.infer<typeof CandidateActionSchema>[] {
  const facingBet = facingActionType === "bet" || facingActionType === "raise" || facingActionType === "all_in";
  return facingBet ? ["FOLD", "CALL", "RAISE", "ALL_IN"] : ["CHECK", "BET", "ALL_IN"];
}

export const DecisionPacketSchema = z.object({
  hero: z.object({
    holeCards: z.tuple([CardSchema, CardSchema]),
    position: PositionSchema,
    stackBB: z.number().positive(),
  }),

  table: z.object({
    potBB: z.number().positive(),
    board: z.array(CardSchema).max(5),
    street: StreetSchema,
    numOpponentsRemaining: z.number().int().min(1),
  }),

  facingAction: z.object({
    type: FacingActionSchema,
    amountBB: z.number().nonnegative().optional(),
  }),

  /** Derived via deriveCandidateActions() -- see its doc comment above. */
  candidateActions: z.array(CandidateActionSchema).min(1),

  engineCalculations: z.object({
    equity: z.number().min(0).max(1).optional(),
    /** Should be present whenever equity is -- see EquitySourceSchema doc comment above. Not schema-enforced as a pair, by convention only. */
    equitySource: EquitySourceSchema.optional(),
    potOddsBreakevenPercent: z.number().min(0).max(100).optional(),
    callEV: z.number().optional(),
    spr: z.number().positive().optional(),
    outs: z.number().int().nonnegative().optional(),
    boardTexture: z
      .object({
        suitTexture: z.enum(["monotone", "two_tone", "rainbow"]),
        pairTexture: z.enum(["paired", "trips_plus", "unpaired"]),
        connectivity: z.enum(["disconnected", "somewhat_connected", "highly_connected"]),
        overall: z.enum(["dry", "semi_wet", "wet"]),
      })
      .optional(),
  }),

  opponentContext: z
    .object({
      estimatedRangeDescription: z.string().optional(),
      rangeVsHeroEquity: z.number().min(0).max(1).optional(),
    })
    .optional(),

  /** Explicit confidence flag per Rule 5: never let the AI reason
   *  confidently over uncertain data. */
  dataConfidence: z.enum(["high", "medium", "low"]).default("high"),
});

export type DecisionPacket = z.infer<typeof DecisionPacketSchema>;

/** Validates and returns a typed packet, throwing with a clear message on any schema violation. */
export function validateDecisionPacket(input: unknown): DecisionPacket {
  return DecisionPacketSchema.parse(input);
}