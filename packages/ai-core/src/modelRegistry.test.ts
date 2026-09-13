import { describe, expect, it } from "vitest";
import {
  getFastestFreeModel,
  getModelConfig,
  getModelsByProvider,
  MODEL_REGISTRY,
  ModelConfigSchema,
} from "./modelRegistry.js";

describe("MODEL_REGISTRY", () => {
  it("every entry in the registry is valid against its own schema", () => {
    for (const model of MODEL_REGISTRY) {
      expect(() => ModelConfigSchema.parse(model)).not.toThrow();
    }
  });

  it("has no duplicate provider+modelId combinations", () => {
    const keys = MODEL_REGISTRY.map((m) => `${m.provider}:${m.modelId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("getModelConfig", () => {
  it("finds a known model", () => {
    const config = getModelConfig("groq", "openai/gpt-oss-120b");
    expect(config).toBeDefined();
    expect(config?.speedTier).toBe("fast");
  });

  it("returns undefined for an unknown model", () => {
    expect(getModelConfig("groq", "nonexistent-model")).toBeUndefined();
  });

  it("returns undefined for an unknown provider", () => {
    expect(getModelConfig("openai", "gpt-4")).toBeUndefined();
  });
});

describe("getModelsByProvider", () => {
  it("returns only models for the requested provider", () => {
    const groqModels = getModelsByProvider("groq");
    expect(groqModels.length).toBeGreaterThan(0);
    for (const model of groqModels) {
      expect(model.provider).toBe("groq");
    }
  });

  it("returns an empty array for a provider with no registered models", () => {
    expect(getModelsByProvider("openai")).toEqual([]);
  });
});

describe("getFastestFreeModel", () => {
  it("returns the model with the lowest measured latency among free models", () => {
    const fastest = getFastestFreeModel();
    expect(fastest).toBeDefined();
    expect(fastest?.provider).toBe("groq");

    // Cross-check: no other free model with a measured latency should be faster.
    const otherFreeModels = MODEL_REGISTRY.filter(
      (m) => m.costTier === "free" && m.measuredLatencyMs !== undefined && m !== fastest,
    );
    for (const other of otherFreeModels) {
      expect(other.measuredLatencyMs!).toBeGreaterThanOrEqual(fastest!.measuredLatencyMs!);
    }
  });
});