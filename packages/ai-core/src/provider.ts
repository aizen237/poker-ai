import type { DecisionPacket } from "./decisionPacket.js";
import type { Recommendation } from "./recommendation.js";

export interface AIProviderMetadata {
  name: string;
  supportsVision: boolean;
  supportsStructuredOutput: boolean;
  isFree: boolean;
}

/**
 * The provider abstraction from the original spec (§9). Every provider
 * (Groq, Gemini, OpenAI, Anthropic, OpenRouter, Ollama, ...) implements
 * this same interface -- the model-router (a later phase) and the rest
 * of the app never need to know which specific provider is behind it.
 */
export interface AIProvider {
  readonly metadata: AIProviderMetadata;

  /**
   * Sends a decision packet and returns a validated recommendation.
   * Implementations are responsible for their own prompt construction
   * and for calling parseRecommendation() on the raw response before
   * returning -- callers should never receive an unvalidated result.
   */
  getRecommendation(packet: DecisionPacket): Promise<Recommendation>;
}