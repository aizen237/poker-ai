import { z } from "zod";

export const ModelConfigSchema = z.object({
  provider: z.enum(["groq", "gemini"]),
  modelId: z.string().min(1),
  supportsVision: z.boolean(),
  supportsStructuredOutput: z.boolean(),
  costTier: z.enum(["free", "paid"]),
  speedTier: z.enum(["fast", "moderate", "slow"]),
  /** Latency we've actually measured ourselves, not a vendor claim.
   *  Optional until we've run a real test against this exact model. */
  measuredLatencyMs: z.number().positive().optional(),
  /** When we last confirmed (via a real API call) that this model is
   *  actually callable -- per the lesson learned twice now that
   *  documentation and reality can drift apart (Groq's Enterprise-only
   *  model move, needing to verify Gemini's model name against official
   *  docs rather than guessing). null means never verified. */
  lastVerifiedAt: z.string().datetime().nullable(),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * The current known model registry. This is DATA, not hardcoded logic --
 * the whole point (per the original spec's explicit warning) is that
 * this list is expected to go stale and needs periodic re-verification,
 * not that it's assumed correct forever. measuredLatencyMs values below
 * come from our own real tryGroq.ts/tryGemini.ts test runs, not vendor
 * marketing claims.
 */
export const MODEL_REGISTRY: ModelConfig[] = [
  {
    provider: "groq",
    modelId: "openai/gpt-oss-120b",
    supportsVision: false,
    supportsStructuredOutput: false,
    costTier: "free",
    speedTier: "fast",
    measuredLatencyMs: 2300,
    lastVerifiedAt: "2026-09-13T04:00:00.000Z",
  },
  {
    provider: "gemini",
    modelId: "gemini-3.5-flash",
    supportsVision: true,
    supportsStructuredOutput: false,
    costTier: "free",
    speedTier: "slow",
    measuredLatencyMs: 9469,
    lastVerifiedAt: "2026-09-13T13:54:27.000Z",
  },
];

export function getModelConfig(provider: string, modelId: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find((m) => m.provider === provider && m.modelId === modelId);
}

export function getModelsByProvider(provider: string): ModelConfig[] {
  return MODEL_REGISTRY.filter((m) => m.provider === provider);
}

/** Fastest known free model -- useful default for latency-sensitive live decisions. */
export function getFastestFreeModel(): ModelConfig | undefined {
  return MODEL_REGISTRY
    .filter((m) => m.costTier === "free" && m.measuredLatencyMs !== undefined)
    .sort((a, b) => (a.measuredLatencyMs ?? Infinity) - (b.measuredLatencyMs ?? Infinity))[0];
}