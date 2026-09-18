import { describe, expect, it } from "vitest";
import { validateActionLegality } from "./actionLegality.js";
import type { DecisionPacket } from "./decisionPacket.js";
import type { Recommendation } from "./recommendation.js";

function validPacket(): DecisionPacket {
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
      board: [
        { rank: 7, suit: "h" },
        { rank: 4, suit: "d" },
        { rank: 2, suit: "c" },
      ],
      street: "flop",
      numOpponentsRemaining: 1,
    },
    facingAction: {
      type: "bet",
      amountBB: 4,
    },
    engineCalculations: {
      equity: 0.62,
    },
    dataConfidence: "high",
  };
}

function validRecommendation(): Recommendation {
  return {
    action: "CALL",
    confidence: 0.7,
    reasoning: "Good pot odds to continue.",
  };
}

describe("validateActionLegality — accepts legal actions", () => {
  it("accepts a legal action and returns it unchanged", () => {
    const result = validateActionLegality(validRecommendation(), validPacket());
    expect(result.isLegal).toBe(true);
    expect(result.effectiveRecommendation).toEqual(validRecommendation());
  });
});

describe("validateActionLegality — rejects illegal actions", () => {
  it("rejects CHECK when facing a bet", () => {
    const recommendation: Recommendation = {
      action: "CHECK",
      confidence: 0.5,
      reasoning: "Checking to see a free card.",
    };
    const result = validateActionLegality(recommendation, validPacket());
    expect(result.isLegal).toBe(false);
    expect(result.effectiveRecommendation.action).toBe("FOLD");
    expect(result.reason).toContain("CHECK is not legal");
  });

  it("rejects CALL when there is nothing to call", () => {
    const packet = validPacket();
    packet.facingAction = { type: "none" };
    const recommendation: Recommendation = {
      action: "CALL",
      confidence: 0.5,
      reasoning: "Calling the bet.",
    };
    const result = validateActionLegality(recommendation, packet);
    expect(result.isLegal).toBe(false);
    expect(result.reason).toContain("CALL is not legal");
  });

  it("rejects ALL_IN when hero has no remaining stack", () => {
    const packet = validPacket();
    packet.hero.stackBB = 0;
    const recommendation: Recommendation = {
      action: "ALL_IN",
      confidence: 0.5,
      reasoning: "Shoving.",
    };
    const result = validateActionLegality(recommendation, packet);
    expect(result.isLegal).toBe(false);
    expect(result.reason).toContain("ALL_IN is not legal");
  });

  it("rejects a bet/raise sizing that exceeds hero's stack", () => {
    const packet = validPacket();
    packet.hero.stackBB = 20;
    const recommendation: Recommendation = {
      action: "RAISE",
      sizingBB: 25,
      confidence: 0.5,
      reasoning: "Raising big.",
    };
    const result = validateActionLegality(recommendation, packet);
    expect(result.isLegal).toBe(false);
    expect(result.reason).toContain("exceeds hero's stack");
  });
});

describe("validateActionLegality — edge cases", () => {
  it("accepts CHECK when facing nothing", () => {
    const packet = validPacket();
    packet.facingAction = { type: "none" };
    const recommendation: Recommendation = {
      action: "CHECK",
      confidence: 0.5,
      reasoning: "Checking, no bet to face.",
    };
    const result = validateActionLegality(recommendation, packet);
    expect(result.isLegal).toBe(true);
  });

  it("accepts ALL_IN when hero has a positive stack", () => {
    const packet = validPacket();
    packet.hero.stackBB = 12;
    const recommendation: Recommendation = {
      action: "ALL_IN",
      confidence: 0.5,
      reasoning: "Shoving.",
    };
    const result = validateActionLegality(recommendation, packet);
    expect(result.isLegal).toBe(true);
  });

  it("accepts a bet/raise sizing exactly equal to hero's stack", () => {
    const packet = validPacket();
    packet.hero.stackBB = 20;
    const recommendation: Recommendation = {
      action: "RAISE",
      sizingBB: 20,
      confidence: 0.5,
      reasoning: "Raising exactly all-in sized.",
    };
    const result = validateActionLegality(recommendation, packet);
    expect(result.isLegal).toBe(true);
  });

  it("accepts CALL when facing a raise (not just a bet)", () => {
    const packet = validPacket();
    packet.facingAction = { type: "raise", amountBB: 10 };
    const recommendation: Recommendation = {
      action: "CALL",
      confidence: 0.5,
      reasoning: "Calling the raise.",
    };
    const result = validateActionLegality(recommendation, packet);
    expect(result.isLegal).toBe(true);
  });

  it("documents the known gap: BET with no sizingBB is not flagged", () => {
    const packet = validPacket();
    packet.facingAction = { type: "none" };
    const recommendation: Recommendation = {
      action: "BET",
      confidence: 0.5,
      reasoning: "Betting, sizing omitted.",
    };
    const result = validateActionLegality(recommendation, packet);
    // Currently passes through as "legal" -- this test exists to make
    // that gap visible and break loudly if someone tries to silently
    // rely on sizing always being validated.
    expect(result.isLegal).toBe(true);
  });
});