import { describe, expect, it, vi } from "vitest";
import { createModelRouter, type RegisteredProvider } from "./modelRouter.js";
import type { AIProvider } from "./provider.js";
import type { ModelConfig } from "./modelRegistry.js";
import type { DecisionPacket } from "./decisionPacket.js";
import type { Recommendation } from "./recommendation.js";

function fakeProvider(name: string, behavior: () => Promise<Recommendation>): AIProvider {
  return {
    metadata: { name, supportsVision: false, supportsStructuredOutput: false, isFree: true },
    getRecommendation: vi.fn(behavior),
  };
}

function fakeConfig(overrides: Partial<ModelConfig> = {}): ModelConfig {
  return {
    provider: "groq",
    modelId: "fake-model",
    supportsVision: false,
    supportsStructuredOutput: false,
    costTier: "free",
    speedTier: "fast",
    lastVerifiedAt: null,
    ...overrides,
  };
}

const samplePacket = {} as DecisionPacket; // router logic doesn't inspect packet contents itself

const okRecommendation: Recommendation = {
  action: "CALL",
  confidence: 0.7,
  reasoning: "test",
};

describe("createModelRouter — fast mode", () => {
  it("returns the fastest provider's recommendation when it succeeds", async () => {
    const fast = fakeProvider("fast-one", async () => okRecommendation);
    const slow = fakeProvider("slow-one", async () => ({ ...okRecommendation, action: "FOLD" }));

    const router = createModelRouter([
      { provider: slow, config: fakeConfig({ measuredLatencyMs: 9000 }) },
      { provider: fast, config: fakeConfig({ measuredLatencyMs: 2000 }) },
    ]);

    const result = await router.getRecommendation(samplePacket, { mode: "fast" });
    expect(result).toEqual(okRecommendation);
    expect(slow.getRecommendation).not.toHaveBeenCalled();
  });

  it("fails over to the next-fastest provider if the fastest throws", async () => {
    const failing = fakeProvider("failing", async () => {
      throw new Error("rate limited");
    });
    const backup = fakeProvider("backup", async () => okRecommendation);

    const router = createModelRouter([
      { provider: failing, config: fakeConfig({ measuredLatencyMs: 1000 }) },
      { provider: backup, config: fakeConfig({ measuredLatencyMs: 5000 }) },
    ]);

    const result = await router.getRecommendation(samplePacket, { mode: "fast" });
    expect(result).toEqual(okRecommendation);
  });

  it("throws with all provider errors listed if every provider fails", async () => {
    const failA = fakeProvider("a", async () => { throw new Error("error A"); });
    const failB = fakeProvider("b", async () => { throw new Error("error B"); });

    const router = createModelRouter([
      { provider: failA, config: fakeConfig() },
      { provider: failB, config: fakeConfig() },
    ]);

    await expect(router.getRecommendation(samplePacket, { mode: "fast" })).rejects.toThrow(/error A.*error B/s);
  });
});

describe("createModelRouter — strong mode", () => {
  it("falls back to fast-mode behavior and warns about the known gap", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const provider = fakeProvider("only-one", async () => okRecommendation);

    const router = createModelRouter([{ provider, config: fakeConfig() }]);
    const result = await router.getRecommendation(samplePacket, { mode: "strong" });

    expect(result).toEqual(okRecommendation);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("no quality-tiered model"));
    warnSpy.mockRestore();
  });
});

describe("createModelRouter — consensus mode", () => {
  it("returns every provider's result, including partial failures", async () => {
    const good = fakeProvider("good", async () => okRecommendation);
    const bad = fakeProvider("bad", async () => { throw new Error("boom"); });

    const router = createModelRouter([
      { provider: good, config: fakeConfig() },
      { provider: bad, config: fakeConfig() },
    ]);

    const results = await router.getRecommendation(samplePacket, { mode: "consensus" });
    expect(Array.isArray(results)).toBe(true);
    const list = results as Awaited<ReturnType<typeof router.getRecommendation>> & unknown[];
    expect(list).toHaveLength(2);

    const goodResult = (list as any[]).find((r) => r.providerName === "good");
    const badResult = (list as any[]).find((r) => r.providerName === "bad");
    expect(goodResult.recommendation).toEqual(okRecommendation);
    expect(badResult.error).toBe("boom");
  });
});

describe("createModelRouter — manual mode", () => {
  it("calls exactly the named provider", async () => {
    const chosen = fakeProvider("chosen-one", async () => okRecommendation);
    const other = fakeProvider("other-one", async () => ({ ...okRecommendation, action: "FOLD" }));

    const router = createModelRouter([
      { provider: chosen, config: fakeConfig() },
      { provider: other, config: fakeConfig() },
    ]);

    const result = await router.getRecommendation(samplePacket, {
      mode: "manual",
      manualProviderName: "chosen-one",
    });

    expect(result).toEqual(okRecommendation);
    expect(other.getRecommendation).not.toHaveBeenCalled();
  });

  it("throws if manualProviderName is missing", async () => {
    const provider = fakeProvider("p", async () => okRecommendation);
    const router = createModelRouter([{ provider, config: fakeConfig() }]);
    await expect(router.getRecommendation(samplePacket, { mode: "manual" })).rejects.toThrow(/manualProviderName/);
  });

  it("throws if the named provider isn't registered", async () => {
    const provider = fakeProvider("p", async () => okRecommendation);
    const router = createModelRouter([{ provider, config: fakeConfig() }]);
    await expect(
      router.getRecommendation(samplePacket, { mode: "manual", manualProviderName: "nonexistent" }),
    ).rejects.toThrow(/No registered provider/);
  });
});

describe("createModelRouter — construction", () => {
  it("throws if constructed with zero providers", () => {
    expect(() => createModelRouter([])).toThrow();
  });
});