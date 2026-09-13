import { describe, expect, it } from "vitest";
import { parseRecommendation } from "./recommendation.js";

function validJson() {
  return JSON.stringify({
    action: "RAISE",
    sizingBB: 6,
    confidence: 0.87,
    reasoning: "Strong range advantage and favorable position.",
    alternative: {
      action: "CALL",
      reasoning: "A more conservative line if unsure about opponent's range.",
    },
  });
}

describe("parseRecommendation — accepts valid responses", () => {
  it("parses plain valid JSON", () => {
    const result = parseRecommendation(validJson());
    expect(result.action).toBe("RAISE");
    expect(result.sizingBB).toBe(6);
    expect(result.confidence).toBe(0.87);
  });

  it("parses JSON wrapped in markdown code fences (a common provider quirk)", () => {
    const wrapped = "```json\n" + validJson() + "\n```";
    const result = parseRecommendation(wrapped);
    expect(result.action).toBe("RAISE");
  });

  it("parses JSON with surrounding whitespace", () => {
    const padded = "\n\n  " + validJson() + "  \n\n";
    const result = parseRecommendation(padded);
    expect(result.action).toBe("RAISE");
  });

  it("accepts a minimal valid response without the optional fields", () => {
    const minimal = JSON.stringify({
      action: "FOLD",
      confidence: 0.65,
      reasoning: "Equity too low to continue profitably.",
    });
    const result = parseRecommendation(minimal);
    expect(result.action).toBe("FOLD");
    expect(result.sizingBB).toBeUndefined();
    expect(result.alternative).toBeUndefined();
  });
});

describe("parseRecommendation — rejects malformed responses", () => {
  it("throws on completely non-JSON text", () => {
    expect(() => parseRecommendation("I think you should raise here.")).toThrow();
  });

  it("throws on an invalid action value", () => {
    const bad = JSON.stringify({
      action: "MUCK",
      confidence: 0.5,
      reasoning: "test",
    });
    expect(() => parseRecommendation(bad)).toThrow();
  });

  it("throws on confidence outside 0-1", () => {
    const bad = JSON.stringify({
      action: "CALL",
      confidence: 1.5,
      reasoning: "test",
    });
    expect(() => parseRecommendation(bad)).toThrow();
  });

  it("throws on missing reasoning", () => {
    const bad = JSON.stringify({
      action: "CALL",
      confidence: 0.5,
    });
    expect(() => parseRecommendation(bad)).toThrow();
  });

  it("throws on empty reasoning string", () => {
    const bad = JSON.stringify({
      action: "CALL",
      confidence: 0.5,
      reasoning: "",
    });
    expect(() => parseRecommendation(bad)).toThrow();
  });

  it("throws on truncated/incomplete JSON (a real failure mode: response cut off mid-stream)", () => {
    const truncated = '{"action": "RAISE", "confidence": 0.8, "reasoning": "Strong hand, r';
    expect(() => parseRecommendation(truncated)).toThrow();
  });
});