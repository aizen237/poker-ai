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
 * The structured packet handed to an AI provider for a single decision.
 * Deliberately does NOT include a full conversation history or the raw
 * game state -- only the already-computed, relevant numbers (per Rule 4's
 * design philosophy: don't make the LLM redo work the deterministic
 * engine already did correctly). All numeric engine outputs are OPTIONAL
 * because not every field applies at every street (e.g. no equity number
 * exists yet before the AI is asked to reason, outs don't apply on the
 * river, board texture doesn't exist preflop).
 */
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

  engineCalculations: z.object({
    equity: z.number().min(0).max(1).optional(),
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