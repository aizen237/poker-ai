import type { AIProvider, GetRecommendationOptions } from "./provider.js";
import type { Recommendation } from "./recommendation.js";
import type { DecisionPacket } from "./decisionPacket.js";
import type { ModelConfig } from "./modelRegistry.js";

export type RouterMode = "fast" | "strong" | "consensus" | "manual";

export interface RegisteredProvider {
  provider: AIProvider;
  config: ModelConfig;
}

export interface ConsensusResult {
  providerName: string;
  recommendation?: Recommendation;
  error?: string;
}

export interface RouterOptions extends GetRecommendationOptions {
  mode: RouterMode;
  /** Required only when mode is "manual". */
  manualProviderName?: string;
}

/**
 * Orders registered providers by measured latency (ascending), for use
 * by fast-mode selection and as the failover sequence -- if the fastest
 * fails, try the next-fastest, and so on.
 */
function orderByLatency(providers: RegisteredProvider[]): RegisteredProvider[] {
  return [...providers].sort(
    (a, b) => (a.config.measuredLatencyMs ?? Infinity) - (b.config.measuredLatencyMs ?? Infinity),
  );
}

/**
 * Fast mode with built-in failover: tries providers in speed order,
 * moving to the next if one throws. Throws only if ALL registered
 * providers fail.
 */
async function getFastRecommendation(
  providers: RegisteredProvider[],
  packet: DecisionPacket,
  options: GetRecommendationOptions,
): Promise<Recommendation> {
  const ordered = orderByLatency(providers);
  const errors: string[] = [];

  for (const { provider } of ordered) {
    try {
      return await provider.getRecommendation(packet, options);
    } catch (error) {
      errors.push(`${provider.metadata.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`All providers failed. Errors: ${errors.join(" | ")}`);
}

/**
 * Consensus mode: calls every registered provider in parallel, returns
 * every result (success or failure) rather than throwing on partial
 * failure -- matches the original spec's example of comparing multiple
 * models' recommendations side by side.
 */
async function getConsensusRecommendations(
  providers: RegisteredProvider[],
  packet: DecisionPacket,
  options: GetRecommendationOptions,
): Promise<ConsensusResult[]> {
  const results = await Promise.allSettled(
    providers.map(({ provider }) => provider.getRecommendation(packet, options)),
  );

  return results.map((result, i) => {
    const providerName = providers[i]!.provider.metadata.name;
    if (result.status === "fulfilled") {
      return { providerName, recommendation: result.value };
    }
    return {
      providerName,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });
}

export interface ModelRouter {
  getRecommendation(packet: DecisionPacket, options: RouterOptions): Promise<Recommendation | ConsensusResult[]>;
}

export function createModelRouter(providers: RegisteredProvider[]): ModelRouter {
  if (providers.length === 0) {
    throw new Error("createModelRouter requires at least one registered provider");
  }

  async function getRecommendation(
    packet: DecisionPacket,
    options: RouterOptions,
  ): Promise<Recommendation | ConsensusResult[]> {
    switch (options.mode) {
      case "fast":
        return getFastRecommendation(providers, packet, options);

      case "strong":
        // KNOWN GAP: no quality-tiered model exists in the registry yet
        // (both current entries are free-tier, speed-differentiated, not
        // quality-differentiated). Falls back to fast-mode behavior until
        // a genuinely "strong" model is registered. Not silently -- warn
        // so this gap stays visible rather than looking solved.
        console.warn(
          '[modelRouter] "strong" mode requested but no quality-tiered model is registered yet -- falling back to "fast" mode behavior.',
        );
        return getFastRecommendation(providers, packet, options);

      case "consensus":
        return getConsensusRecommendations(providers, packet, options);

      case "manual": {
        if (!options.manualProviderName) {
          throw new Error('"manual" mode requires manualProviderName to be set');
        }
        const found = providers.find((p) => p.provider.metadata.name === options.manualProviderName);
        if (!found) {
          throw new Error(
            `No registered provider named "${options.manualProviderName}". Available: ${providers.map((p) => p.provider.metadata.name).join(", ")}`,
          );
        }
        return found.provider.getRecommendation(packet, options);
      }
    }
  }

  return { getRecommendation };
}