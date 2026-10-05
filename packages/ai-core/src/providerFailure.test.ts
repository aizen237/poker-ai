import { afterEach, expect, it, vi } from "vitest";
import { createGroqProvider } from "./providers/groq.js";
import { createGeminiProvider } from "./providers/gemini.js";
import { createNvidiaProvider } from "./providers/nvidia.js";
import { createModelRouter } from "./modelRouter.js";
import { getModelsByProvider } from "./modelRegistry.js";
import { validateDecisionPacket } from "./decisionPacket.js";
import { getPolicyRecommendation } from "./policyRecommendation.js";

const packet = () => validateDecisionPacket({ hero: { holeCards: [{ rank: 14, suit: "s" }, { rank: 13, suit: "h" }], position: "BTN", stackBB: 40 },
  table: { board: [{ rank: 2, suit: "s" }, { rank: 5, suit: "h" }, { rank: 8, suit: "d" }], street: "flop", potBB: 10, numOpponentsRemaining: 1 },
  facingAction: { type: "bet", amountBB: 3 }, candidateActions: ["FOLD", "CALL"], engineCalculations: {}, dataConfidence: "high" });
afterEach(() => vi.unstubAllGlobals());
it.each(["http", "malformed", "timeout"])("falls back from real Groq adapter to Gemini for %s failure", async failure => {
  const requests: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    requests.push(url); expect(options.signal).toBeInstanceOf(AbortSignal);
    if (url.includes("groq")) {
      if (failure === "timeout") throw new DOMException("Timed out", "TimeoutError");
      if (failure === "http") return { ok: false, status: 429, text: async () => "Rate limited" };
      return { ok: true, json: async () => ({ choices: [{ message: { content: "not JSON" } }] }) };
    }
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ action: "CALL", confidence: 0.4, reasoning: "Uncertain" }) }] } }] }) };
  }));
  const router = createModelRouter([
    { provider: createGroqProvider({ apiKey: "test" }), config: getModelsByProvider("groq")[0]! },
    { provider: createGeminiProvider({ apiKey: "test" }), config: getModelsByProvider("gemini")[0]! },
  ]);
  expect(await router.getRecommendation(packet(), { mode: "fast" })).toMatchObject({ action: "CALL" });
  expect(requests).toHaveLength(2);
});
it.each([createGroqProvider, createGeminiProvider, createNvidiaProvider])("bounds provider I/O with a deadline", async create => {
  vi.stubGlobal("fetch", vi.fn(async (_url, options: RequestInit) => { expect(options.signal).toBeInstanceOf(AbortSignal); throw new Error("offline"); }));
  await expect(create({ apiKey: "test" }).getRecommendation(packet())).rejects.toThrow("offline");
});
it("abstains when every consensus provider failed", async () => {
  const result = await getPolicyRecommendation(packet(), { getRecommendation: async () => [{ providerName: "test", error: "offline" }] }, { mode: "consensus" });
  expect(result).toMatchObject({ result: null, decisionSource: "abstained", blockedReason: "all_providers_failed" });
});
it("does not present a confident action after an explicit opponent database failure", async () => {
  const input = packet();
  input.opponentContext = { opponents: [{ seat: 2, position: "BB", rangeBasis: "Population prior after storage failure",
    rangeStatus: "prior_only", rangeConfidence: "low", statsStorage: "unavailable" }] };
  const getRecommendation = vi.fn();
  expect(await getPolicyRecommendation(input, { getRecommendation }, { mode: "fast" })).toMatchObject({ result: null, blockedReason: "opponent_storage_unavailable" });
  expect(getRecommendation).not.toHaveBeenCalled();
});
