import { describe, expect, it } from "vitest";
import { validateReasoningConsistency } from "./consistencyCheck.js";
import type { DecisionPacket } from "./decisionPacket.js";
import type { Recommendation } from "./recommendation.js";

/** Hero holds pocket Kings, board pairs one more King -- true hand is Three of a Kind. */
function tripsPacket(): DecisionPacket {
  return {
    hero: {
      holeCards: [
        { rank: 13, suit: "s" },
        { rank: 13, suit: "h" },
      ],
      position: "BTN",
      stackBB: 80,
    },
    table: {
      potBB: 12,
      board: [
        { rank: 13, suit: "d" },
        { rank: 7, suit: "h" },
        { rank: 4, suit: "d" },
        { rank: 9, suit: "s" },
        { rank: 2, suit: "c" },
      ],
      street: "river",
      numOpponentsRemaining: 1,
    },
    facingAction: { type: "none" },
    candidateActions: ["CHECK", "BET", "ALL_IN"],
    engineCalculations: {},
    dataConfidence: "high",
  };
}

/** Hero holds pocket Kings, board pairs a Queen -- true hand is Two Pair (Kings and Queens). */
function twoPairPacket(): DecisionPacket {
  return {
    hero: {
      holeCards: [
        { rank: 13, suit: "h" },
        { rank: 13, suit: "d" },
      ],
      position: "BTN",
      stackBB: 80,
    },
    table: {
      potBB: 12,
      board: [
        { rank: 12, suit: "h" },
        { rank: 12, suit: "c" },
        { rank: 2, suit: "s" },
        { rank: 5, suit: "d" },
        { rank: 9, suit: "c" },
      ],
      street: "river",
      numOpponentsRemaining: 1,
    },
    facingAction: { type: "none" },
    candidateActions: ["CHECK", "BET", "ALL_IN"],
    engineCalculations: {},
    dataConfidence: "high",
  };
}

/** Preflop -- fewer than 5 total cards, no made hand exists yet. */
function preflopPacket(): DecisionPacket {
  return {
    hero: {
      holeCards: [
        { rank: 14, suit: "s" },
        { rank: 13, suit: "s" },
      ],
      position: "UTG",
      stackBB: 100,
    },
    table: {
      potBB: 1.5,
      board: [],
      street: "preflop",
      numOpponentsRemaining: 5,
    },
    facingAction: { type: "none" },
    candidateActions: ["CHECK", "BET", "ALL_IN"],
    engineCalculations: {},
    dataConfidence: "high",
  };
}

function recommendationWithReasoning(reasoning: string): Recommendation {
  return { action: "BET", confidence: 0.7, reasoning };
}

describe("validateReasoningConsistency", () => {
  it("is consistent when reasoning correctly names the actual hand category", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("You've made three of a kind with your kings here."),
      tripsPacket(),
    );
    expect(result.isConsistent).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("is inconsistent when reasoning names a different hand category than the actual one", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("You've made a flush here, bet for value."),
      tripsPacket(),
    );
    expect(result.isConsistent).toBe(false);
    expect(result.warnings[0]).toContain("Flush");
    expect(result.warnings[0]).toContain("Three of a Kind");
  });

  it("is consistent when reasoning mentions no hand category at all", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("Betting for thin value against a capped range."),
      tripsPacket(),
    );
    expect(result.isConsistent).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("does not spuriously flag 'Pair' when the reasoning correctly says 'Two Pair'", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("You've made two pair here, kings and queens."),
      twoPairPacket(),
    );
    expect(result.isConsistent).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("is consistent regardless of reasoning content before a made hand exists (preflop)", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("You've flopped a flush already, raise big."),
      preflopPacket(),
    );
    expect(result.isConsistent).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});