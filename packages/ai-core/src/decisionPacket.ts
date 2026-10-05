import { OpponentProfileSchema } from "@poker-ai/opponent-db/browser";
import { z } from "zod";
import { buildPreflopContext, PreflopContextSchema } from "./preflopContext.js";
import { PolicyContextSchema, PotEvidenceSchema } from "./decisionPolicy.js";

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
 * - "estimated_multiway_ranges": joint equity vs distinct weighted ranges.
 * - "random_hands": explicitly random opponents, including multiway fallback
 *   when one or more opponent ranges cannot be constructed.
 * - "unknown": reserved for a future/unrecognized source rather than
 *   silently mislabeling it as one of the above.
 */
const EquitySourceSchema = z.enum(["estimated_range", "estimated_multiway_ranges", "random_hands", "unknown"]);

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
    stackBB: z.number().finite().positive(),
  }),

  table: z.object({
    potBB: z.number().finite().nonnegative(), // 0 is valid: the very first action of a hand, before blinds have registered in the main pot display
    board: z.array(CardSchema).max(5),
    street: StreetSchema,
    numOpponentsRemaining: z.number().int().min(1),
  }),

  facingAction: z.object({
    type: FacingActionSchema,
    amountBB: z.number().finite().nonnegative().optional(),
  }),

  /** Derived via deriveCandidateActions() -- see its doc comment above. */
  candidateActions: z.array(CandidateActionSchema).min(1),
  /** Optional for legacy packets; preflop requests without it yield uncertainty. */
  preflop: PreflopContextSchema.optional(),
  /** Optional evidence for the conservative deterministic policy; never an LLM action. */
  policyContext: PolicyContextSchema.optional(),
  /** Preserved display values/provenance for live packets; not interchangeable pots. */
  potEvidence: PotEvidenceSchema.optional(),

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
      rangeConfidence: z.enum(["medium", "low"]).optional(),
      rangeStatus: z.enum(["modeled", "prior_only", "unavailable"]).optional(),
      rangeAssumptions: z.array(z.string()).optional(),
      rangeFallbacks: z.array(z.string()).optional(),
      opponents: z.array(z.object({
        seat: z.number().int().positive(), position: PositionSchema.nullable(),
        playerProfile: OpponentProfileSchema.optional(),
        statsStorage: z.enum(["available","unavailable","pending"]).optional(),
        rangeBasis: z.string(), rangeConfidence: z.enum(["medium", "low"]),
        rangeStatus: z.enum(["modeled", "prior_only", "unavailable"]),
      })).optional(),
      rangeVsHeroEquity: z.number().min(0).max(1).optional(),
    })
    .optional(),

  /** Explicit confidence flag per Rule 5: never let the AI reason
   *  confidently over uncertain data. */
  dataConfidence: z.enum(["high", "medium", "low"]).default("low"),
});

export type DecisionPacket = z.infer<typeof DecisionPacketSchema>;

/** Validates and returns a typed packet, throwing with a clear message on any schema violation. */
export function validateDecisionPacket(input: unknown): DecisionPacket {
  const packet = DecisionPacketSchema.parse(input);
  const expectedBoard = { preflop: 0, flop: 3, turn: 4, river: 5 }[packet.table.street];
  const cards = [...packet.hero.holeCards, ...packet.table.board];
  if (packet.table.board.length !== expectedBoard) throw new Error("Board count contradicts street");
  if (new Set(cards.map(c => `${c.rank}${c.suit}`)).size !== cards.length) throw new Error("Duplicate visible cards in DecisionPacket");
  if (packet.preflop) {
    if (packet.table.street !== "preflop") throw new Error("Preflop context cannot accompany a postflop packet");
    const context = buildPreflopContext(packet.preflop);
    if (context.heroPosition !== packet.hero.position || context.heroStackBB !== packet.hero.stackBB ||
        context.potBB !== packet.table.potBB || context.activeOpponents !== packet.table.numOpponentsRemaining ||
        context.amountToCallBB !== (packet.facingAction.amountBB ?? 0)) throw new Error("Preflop context contradicts the DecisionPacket");
    packet.preflop = context;
  }
  return packet;
}

/** Shared wording keeps range uncertainty separate from confidence in DOM facts. */
export function opponentRangePromptLines(packet: DecisionPacket): string[] {
  const context = packet.opponentContext;
  if (!context) return [];
  return [
    ...(context.estimatedRangeDescription ? ["Opponent range basis: " + context.estimatedRangeDescription] : []),
    ...(context.rangeConfidence ? ["Range model confidence: " + context.rangeConfidence + "; status: " + context.rangeStatus + ". This is separate from table-read confidence."] : []),
    ...(context.opponents ?? []).map(opponent => "Opponent seat " + opponent.seat + " (" + (opponent.position ?? "unknown position") + "): " + opponent.rangeBasis + "; status " + opponent.rangeStatus + "; confidence " + opponent.rangeConfidence),
    ...(context.opponents ?? []).filter(opponent=>opponent.playerProfile).map(opponent=>"Opponent statistics for seat " + opponent.seat + ": " + JSON.stringify({storage:opponent.statsStorage,profile:{displayName:opponent.playerProfile!.displayName,handsObserved:opponent.playerProfile!.handsObserved,eligibleHands:opponent.playerProfile!.eligibleHands,confidence:opponent.playerProfile!.confidence,stats:opponent.playerProfile!.stats,aggressionFactor:opponent.playerProfile!.aggressionFactor,notes:opponent.playerProfile!.notes}}) + ". Use shrunk estimates and each stat's opportunity count, not raw percentages. Fold-to-3bet is conditional historical evidence, not shove fold equity; do not invent a caller model or label player skill."),
    ...(context.rangeAssumptions ?? []).map(reason => "Range assumption: " + reason),
    ...(context.rangeFallbacks ?? []).map(reason => "Range fallback: " + reason),
    ...(context.rangeConfidence === "low" ? ["Do not treat heuristic range equity as a precise probability or invent equity when unavailable."] : []),
  ];
}

/** One provenance label shared by every provider. */
export function describeEquitySource(source: DecisionPacket["engineCalculations"]["equitySource"]): string {
  if (source === "estimated_range") return "estimated against one opponent's weighted range (heads-up)";
  if (source === "estimated_multiway_ranges") return "estimated jointly against distinct weighted opponent ranges with card removal and split pots; not side-pot EV";
  if (source === "random_hands") return "computed against random hands, not modeled opponent ranges; consult range fallback reasons";
  return "source not recorded -- treat with extra caution";
}
