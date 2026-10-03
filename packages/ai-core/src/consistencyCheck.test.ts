import { describe, expect, it } from "vitest";
import { parseCards } from "@poker-ai/shared";
import { evaluateBest, HAND_CATEGORY_NAMES } from "@poker-ai/poker-engine";
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

function packetWithCards(holeCards: string, board: string): DecisionPacket {
  const packet = twoPairPacket();
  const [first, second] = parseCards(holeCards);
  if (!first || !second) throw new Error("Fixture requires two hole cards");
  packet.hero.holeCards = [first, second];
  packet.table.board = parseCards(board);
  return packet;
}

const CATEGORY_FIXTURES = [
  { category: "High Card", holeCards: "As Jd", board: "9c 7h 5s 3d 2c" },
  { category: "Pair", holeCards: "As Ad", board: "9c 7h 5s 3d 2c" },
  // Exact live example: Q-heart/T-spade on J-heart/K-spade/K-club/Q-spade/4-heart.
  { category: "Two Pair", holeCards: "Qh Ts", board: "Jh Ks Kc Qs 4h" },
  { category: "Three of a Kind", holeCards: "Ks Kh", board: "Kd 7h 4d 9s 2c" },
  { category: "Straight", holeCards: "As Kd", board: "Qc Jh Ts 3d 2c" },
  { category: "Flush", holeCards: "As Js", board: "9s 7s 5s 3d 2c" },
  { category: "Full House", holeCards: "Ks Kh", board: "Kd 7h 7d 9s 2c" },
  { category: "Four of a Kind", holeCards: "Ks Kh", board: "Kd Kc 4d 9s 2c" },
  { category: "Straight Flush", holeCards: "As Ks", board: "Qs Js Ts 3d 2c" },
] as const;

describe("live two-pair wording regression", () => {
  it.each([
    "Hero has two-pair (KKQQ) on a paired board.",
    "Hero has two pair",
    "Hero has two\u2010pair (KKQQ) on a paired board.",
    "Hero has two\u2011pair (KKQQ) on a paired board.",
    "Hero has two\u2012pair (KKQQ) on a paired board.",
    "Hero has two\u2013pair (KKQQ) on a paired board.",
  ])("detects only Two Pair in %s", (reasoning) => {
    const recommendation = recommendationWithReasoning(reasoning);
    const livePacket = packetWithCards("Qh Ts", "Jh Ks Kc Qs 4h");
    const evaluated = evaluateBest([...livePacket.hero.holeCards, ...livePacket.table.board]);
    expect(HAND_CATEGORY_NAMES[evaluated.category]).toBe("Two Pair");
    expect(evaluated.tiebreakers.slice(0, 2)).toEqual([13, 12]);
    expect(validateReasoningConsistency(recommendation, livePacket)).toEqual({
      isConsistent: true,
      warnings: [],
    });

    // A matching actual category can hide extra detected categories. Use a
    // different actual hand and assert the complete claim in the warning:
    // this fails for no detection, Pair alone, or Pair/Two Pair together.
    expect(validateReasoningConsistency(recommendation, tripsPacket())).toEqual({
      isConsistent: false,
      warnings: ["Reasoning claims hero has Two Pair but hero's actual made hand is Three of a Kind."],
    });
  });

  it.each(["Hero has a pair", "Hero has top pair"])("detects Pair in %s", (reasoning) => {
    const recommendation = recommendationWithReasoning(reasoning);
    expect(validateReasoningConsistency(recommendation, packetWithCards("As Ad", "9c 7h 5s 3d 2c"))).toEqual({
      isConsistent: true,
      warnings: [],
    });
    expect(validateReasoningConsistency(recommendation, packetWithCards("Qh Ts", "Jh Ks Kc Qs 4h"))).toEqual({
      isConsistent: false,
      warnings: ["Reasoning claims hero has Pair but hero's actual made hand is Two Pair."],
    });
  });

  it("reports a contradiction without mutating or replacing the recommendation or packet", () => {
    const recommendation = recommendationWithReasoning("Hero has a pair");
    const packet = packetWithCards("Qh Ts", "Jh Ks Kc Qs 4h");
    const originalRecommendation = structuredClone(recommendation);
    const originalPacket = structuredClone(packet);

    expect(validateReasoningConsistency(recommendation, packet)).toEqual({
      isConsistent: false,
      warnings: ["Reasoning claims hero has Pair but hero's actual made hand is Two Pair."],
    });
    expect(recommendation).toEqual(originalRecommendation);
    expect(packet).toEqual(originalPacket);
  });
});

describe.each(CATEGORY_FIXTURES)("category overlap checks with actual $category", ({ category, holeCards, board }) => {
  it.each(HAND_CATEGORY_NAMES)("detects exactly the claimed category: %s", (claimed) => {
    const packet = packetWithCards(holeCards, board);
    expect(HAND_CATEGORY_NAMES[evaluateBest([...packet.hero.holeCards, ...packet.table.board]).category]).toBe(category);
    const result = validateReasoningConsistency(recommendationWithReasoning(`Hero has ${claimed.toLowerCase()}.`), packet);
    expect(result).toEqual({
      isConsistent: claimed === category,
      warnings: claimed === category
        ? []
        : [`Reasoning claims hero has ${claimed} but hero's actual made hand is ${category}.`],
    });
  });

  it.each([
    "Hero has a flush draw",
    "The board is paired",
    "Opponent may have a pair",
  ])("ignores a draw, board description, or opponent claim: %s", (reasoning) => {
    expect(validateReasoningConsistency(recommendationWithReasoning(reasoning), packetWithCards(holeCards, board))).toEqual({
      isConsistent: true,
      warnings: [],
    });
  });
});

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


describe("validateReasoningConsistency — false-positive regressions (from live testing)", () => {
  it("does not treat 'paired board' as a claim about hero's hand", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("Hero has two pair (Kings and Queens) on a paired, semi-wet board."),
      twoPairPacket(),
    );
    expect(result.isConsistent).toBe(true);
  });

  it("recognizes a hyphenated 'two-pair' as Two Pair", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("Hero has two-pair (KKQQ) here."),
      twoPairPacket(),
    );
    expect(result.isConsistent).toBe(true);
  });

  it("recognizes a non-breaking-hyphen 'two\u2011pair' as Two Pair", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("Hero has two\u2011pair (KKQQ) here."),
      twoPairPacket(),
    );
    expect(result.isConsistent).toBe(true);
  });

  it("does not treat categories mentioned about the board or opponents as claims about hero", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("Hero has two pair, but the board allows a flush and opponents could hold a straight."),
      twoPairPacket(),
    );
    expect(result.isConsistent).toBe(true);
  });

  it("does not treat a draw as a made-hand claim", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("Hero has a flush draw here, so betting carries extra equity."),
      twoPairPacket(),
    );
    expect(result.isConsistent).toBe(true);
  });

  it("still flags a genuine contradiction phrased with 'only'", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("Hero has only a middle pair here."),
      twoPairPacket(),
    );
    expect(result.isConsistent).toBe(false);
    expect(result.warnings[0]).toContain("Pair");
  });

  it("reads 'straight flush' as one claim, not also 'straight' and 'flush' separately", () => {
    const result = validateReasoningConsistency(
      recommendationWithReasoning("Hero has a straight flush."),
      tripsPacket(),
    );
    expect(result.isConsistent).toBe(false);
    expect(result.warnings[0]).toContain("Straight Flush");
    expect(result.warnings[0]).not.toContain("/");
  });
});
