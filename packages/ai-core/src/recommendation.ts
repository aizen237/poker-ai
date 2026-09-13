import { z } from "zod";

/**
 * The structured response we require from any AI provider. Matches
 * PokerRecommendation from the original spec (§10), enforced via Zod
 * rather than trusting free-form prose -- if a provider's response
 * doesn't match this shape, it's rejected before it ever reaches the UI.
 */
export const RecommendationSchema = z.object({
  action: z.enum(["FOLD", "CHECK", "CALL", "BET", "RAISE", "ALL_IN"]),
  sizingBB: z.number().positive().optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  alternative: z
    .object({
      action: z.enum(["FOLD", "CHECK", "CALL", "BET", "RAISE", "ALL_IN"]),
      reasoning: z.string().min(1),
    })
    .optional(),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

/**
 * Validates a raw AI response. Providers differ in how cleanly they
 * return structured output (some wrap JSON in markdown fences, some
 * return it directly) -- this handles the common markdown-fence case
 * before validation, since that's a formatting quirk, not a content
 * problem, and shouldn't cause a rejection.
 */
export function parseRecommendation(rawResponse: string): Recommendation {
  const cleaned = rawResponse.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`AI response is not valid JSON after cleanup: ${rawResponse.slice(0, 200)}`);
  }

  return RecommendationSchema.parse(parsed);
}