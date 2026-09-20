import { describe, expect, it } from "vitest";
import { deriveCandidateActions, validateDecisionPacket } from "./decisionPacket.js";

function validPacket() {
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
    candidateActions: ["FOLD", "CALL", "RAISE", "ALL_IN"],
    engineCalculations: {
      equity: 0.62,
      potOddsBreakevenPercent: 40,
      callEV: 1.2,
      spr: 7.5,
      outs: 9,
      boardTexture: {
        suitTexture: "rainbow",
        pairTexture: "unpaired",
        connectivity: "disconnected",
        overall: "dry",
      },
    },
    dataConfidence: "high",
  };
}

describe("validateDecisionPacket — accepts valid packets", () => {
  it("accepts a fully-populated valid packet", () => {
    expect(() => validateDecisionPacket(validPacket())).not.toThrow();
  });

  it("accepts a minimal preflop packet with most optional engine fields omitted", () => {
    const packet = {
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
    };
    expect(() => validateDecisionPacket(packet)).not.toThrow();
  });

  it("defaults dataConfidence to 'high' when omitted", () => {
    const packet = validPacket() as Record<string, unknown>;
    delete packet.dataConfidence;
    const result = validateDecisionPacket(packet);
    expect(result.dataConfidence).toBe("high");
  });
});

describe("validateDecisionPacket — rejects invalid packets", () => {
  it("rejects a packet missing hero entirely", () => {
    const packet = validPacket() as Record<string, unknown>;
    delete packet.hero;
    expect(() => validateDecisionPacket(packet)).toThrow();
  });

  it("rejects an invalid card suit", () => {
    const packet = validPacket();
    packet.hero.holeCards[0].suit = "x";
    expect(() => validateDecisionPacket(packet)).toThrow();
  });

  it("rejects an out-of-range card rank", () => {
    const packet = validPacket();
    packet.hero.holeCards[0].rank = 15;
    expect(() => validateDecisionPacket(packet)).toThrow();
  });

  it("rejects an equity value outside 0-1", () => {
    const packet = validPacket();
    packet.engineCalculations.equity = 1.5;
    expect(() => validateDecisionPacket(packet)).toThrow();
  });

  it("rejects a negative stack size", () => {
    const packet = validPacket();
    packet.hero.stackBB = -10;
    expect(() => validateDecisionPacket(packet)).toThrow();
  });

  it("rejects an invalid position string", () => {
    const packet = validPacket();
    packet.hero.position = "MIDDLE";
    expect(() => validateDecisionPacket(packet)).toThrow();
  });

  it("rejects a board with more than 5 cards", () => {
    const packet = validPacket();
    packet.table.board = [
      { rank: 2, suit: "c" },
      { rank: 3, suit: "c" },
      { rank: 4, suit: "c" },
      { rank: 5, suit: "c" },
      { rank: 6, suit: "c" },
      { rank: 7, suit: "c" },
    ];
    expect(() => validateDecisionPacket(packet)).toThrow();
  });

  it("rejects an invalid dataConfidence value", () => {
    const packet = validPacket();
    packet.dataConfidence = "extremely confident";
    expect(() => validateDecisionPacket(packet)).toThrow();
  });
});




describe("validateDecisionPacket — equitySource", () => {
  it("accepts 'estimated_range' as an equitySource", () => {
    const packet = validPacket();
    (packet.engineCalculations as Record<string, unknown>).equitySource = "estimated_range";
    expect(() => validateDecisionPacket(packet)).not.toThrow();
  });

  it("accepts 'random_hands' as an equitySource", () => {
    const packet = validPacket();
    (packet.engineCalculations as Record<string, unknown>).equitySource = "random_hands";
    expect(() => validateDecisionPacket(packet)).not.toThrow();
  });

  it("accepts 'unknown' as an equitySource", () => {
    const packet = validPacket();
    (packet.engineCalculations as Record<string, unknown>).equitySource = "unknown";
    expect(() => validateDecisionPacket(packet)).not.toThrow();
  });

  it("accepts a packet with equity but no equitySource (optional, by convention only)", () => {
    const packet = validPacket();
    expect((packet.engineCalculations as Record<string, unknown>).equitySource).toBeUndefined();
    expect(() => validateDecisionPacket(packet)).not.toThrow();
  });

  it("accepts a packet with neither equity nor equitySource (e.g. very early preflop)", () => {
    const packet = {
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
    };
    expect(() => validateDecisionPacket(packet)).not.toThrow();
  });

  it("rejects an invalid equitySource value", () => {
    const packet = validPacket();
    (packet.engineCalculations as Record<string, unknown>).equitySource = "made_up_source";
    expect(() => validateDecisionPacket(packet)).toThrow();
  });
});


describe("deriveCandidateActions", () => {
  it("returns CHECK/BET/ALL_IN when facing nothing", () => {
    expect(deriveCandidateActions("none")).toEqual(["CHECK", "BET", "ALL_IN"]);
  });

  it("returns FOLD/CALL/RAISE/ALL_IN when facing a bet", () => {
    expect(deriveCandidateActions("bet")).toEqual(["FOLD", "CALL", "RAISE", "ALL_IN"]);
  });

  it("returns FOLD/CALL/RAISE/ALL_IN when facing a raise", () => {
    expect(deriveCandidateActions("raise")).toEqual(["FOLD", "CALL", "RAISE", "ALL_IN"]);
  });

  it("returns FOLD/CALL/RAISE/ALL_IN when facing an all-in", () => {
    expect(deriveCandidateActions("all_in")).toEqual(["FOLD", "CALL", "RAISE", "ALL_IN"]);
  });
});

describe("validateDecisionPacket — candidateActions", () => {
  it("rejects a packet missing candidateActions entirely", () => {
    const packet = validPacket() as Record<string, unknown>;
    delete packet.candidateActions;
    expect(() => validateDecisionPacket(packet)).toThrow();
  });

  it("rejects an empty candidateActions array", () => {
    const packet = validPacket();
    packet.candidateActions = [];
    expect(() => validateDecisionPacket(packet)).toThrow();
  });

  it("rejects an unrecognized action string in candidateActions", () => {
    const packet = validPacket() as Record<string, unknown>;
    packet.candidateActions = ["FOLD", "SURRENDER"];
    expect(() => validateDecisionPacket(packet)).toThrow();
  });
});