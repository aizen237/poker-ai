import { describe, expect, it } from "vitest";
import { buildAuditRecord } from "./auditRecord.js";
import type { DecisionPacket } from "./decisionPacket.js";

function samplePacket(): DecisionPacket {
  return {
    hero: {
      holeCards: [
        { rank: 14, suit: "s" },
        { rank: 13, suit: "s" },
      ],
      position: "BTN",
      stackBB: 45,
    },
    table: {
      potBB: 6,
      board: [],
      street: "preflop",
      numOpponentsRemaining: 1,
    },
    facingAction: { type: "none" },
    engineCalculations: {},
    dataConfidence: "high",
  };
}

describe("buildAuditRecord", () => {
  it("builds a valid record for a successful call", () => {
    const record = buildAuditRecord({
      sessionId: "session-1",
      handId: "hand-1",
      decisionPacket: samplePacket(),
      provider: "groq",
      model: "openai/gpt-oss-120b",
      promptVersion: "v2-explicit-hand-category",
      latencyMs: 2300,
      rawResponse: '{"action":"CALL","confidence":0.7,"reasoning":"test"}',
      parsedRecommendation: { action: "CALL", confidence: 0.7, reasoning: "test" },
    });

    expect(record.provider).toBe("groq");
    expect(record.latencyMs).toBe(2300);
    expect(record.parsedRecommendation?.action).toBe("CALL");
    expect(record.error).toBeUndefined();
  });

  it("builds a valid record for a failed call (no recommendation, has an error)", () => {
    const record = buildAuditRecord({
      sessionId: "session-1",
      handId: "hand-2",
      decisionPacket: samplePacket(),
      provider: "groq",
      model: "openai/gpt-oss-120b",
      promptVersion: "v2-explicit-hand-category",
      latencyMs: 500,
      error: "Groq API error (429): rate limit exceeded",
    });

    expect(record.error).toContain("rate limit");
    expect(record.parsedRecommendation).toBeUndefined();
    expect(record.rawResponse).toBeUndefined();
  });

  it("always includes a valid ISO timestamp set at build time", () => {
    const before = new Date();
    const record = buildAuditRecord({
      sessionId: "s",
      handId: "h",
      decisionPacket: samplePacket(),
      provider: "groq",
      model: "m",
      promptVersion: "v1",
      latencyMs: 0,
    });
    const after = new Date();

    const recordTime = new Date(record.timestamp);
    expect(recordTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(recordTime.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("throws if the decision packet embedded in the record is invalid", () => {
    const badPacket = { ...samplePacket(), hero: undefined } as unknown as DecisionPacket;
    expect(() =>
      buildAuditRecord({
        sessionId: "s",
        handId: "h",
        decisionPacket: badPacket,
        provider: "groq",
        model: "m",
        promptVersion: "v1",
        latencyMs: 0,
      }),
    ).toThrow();
  });

  it("throws on negative latency", () => {
    expect(() =>
      buildAuditRecord({
        sessionId: "s",
        handId: "h",
        decisionPacket: samplePacket(),
        provider: "groq",
        model: "m",
        promptVersion: "v1",
        latencyMs: -1,
      }),
    ).toThrow();
  });
});