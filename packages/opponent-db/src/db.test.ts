import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type OpponentDatabase } from "./db.js";
import { computeOpponentStats } from "./stats.js";
import type { PlayerHandActions } from "./types.js";

function sampleAction(overrides: Partial<PlayerHandActions> = {}): PlayerHandActions {
  return {
    playerName: "Villain",
    vpip: false,
    pfr: false,
    threeBet: false,
    facedThreeBet: false,
    foldedToThreeBet: false,
    cBet: false,
    hadCBetOpportunity: false,
    facedCBet: false,
    foldedToCBet: false,
    wentToShowdown: false,
    wonAtShowdown: false,
    betsAndRaises: 0,
    calls: 0,
    ...overrides,
  };
}

describe("OpponentDatabase", () => {
  let db: OpponentDatabase;

  beforeEach(() => {
    db = openDatabase(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("records a hand action and reads it back with correct boolean round-tripping", () => {
    db.recordHandActions(
      sampleAction({
        playerName: "Villain",
        vpip: true,
        pfr: false,
        wentToShowdown: true,
        wonAtShowdown: true,
        betsAndRaises: 3,
        calls: 1,
      }),
    );

    const results = db.getPlayerHandActions("Villain");
    expect(results).toHaveLength(1);
    expect(results[0]!.vpip).toBe(true);
    expect(results[0]!.pfr).toBe(false);
    expect(results[0]!.wentToShowdown).toBe(true);
    expect(results[0]!.wonAtShowdown).toBe(true);
    expect(results[0]!.betsAndRaises).toBe(3);
    expect(results[0]!.calls).toBe(1);
  });

  it("only returns hands for the requested player, not other players", () => {
    db.recordHandActions(sampleAction({ playerName: "Villain", vpip: true }));
    db.recordHandActions(sampleAction({ playerName: "OtherPlayer", vpip: true }));
    db.recordHandActions(sampleAction({ playerName: "Villain", vpip: false }));

    const villainHands = db.getPlayerHandActions("Villain");
    expect(villainHands).toHaveLength(2);
    expect(villainHands.every((h) => h.playerName === "Villain")).toBe(true);
  });

  it("returns an empty array for a player with no recorded hands", () => {
    expect(db.getPlayerHandActions("NeverSeen")).toEqual([]);
  });

  it("computeOpponentStats produces correct results from real persisted-and-retrieved data", () => {
    // 3 of 5 hands VPIP -- write via the real DB round-trip, not in-memory objects.
    db.recordHandActions(sampleAction({ vpip: true }));
    db.recordHandActions(sampleAction({ vpip: true }));
    db.recordHandActions(sampleAction({ vpip: true }));
    db.recordHandActions(sampleAction({ vpip: false }));
    db.recordHandActions(sampleAction({ vpip: false }));

    const retrieved = db.getPlayerHandActions("Villain");
    const stats = computeOpponentStats("Villain", retrieved);

    expect(stats.handsObserved).toBe(5);
    expect(stats.vpipPercent).toBeCloseTo(60, 5);
  });

  it("preserves conditional-stat correctness through a real DB round-trip (fold-to-3bet null when never faced)", () => {
    db.recordHandActions(sampleAction({ facedThreeBet: false }));
    db.recordHandActions(sampleAction({ facedThreeBet: false }));

    const retrieved = db.getPlayerHandActions("Villain");
    const stats = computeOpponentStats("Villain", retrieved);

    expect(stats.foldToThreeBetPercent).toBeNull();
  });

    it("handles many records without error (rough volume check, not a performance benchmark)", () => {
    for (let i = 0; i < 500; i++) {
      db.recordHandActions(sampleAction({ vpip: i % 3 === 0 }));
    }
    const retrieved = db.getPlayerHandActions("Villain");
    expect(retrieved).toHaveLength(500);

    const stats = computeOpponentStats("Villain", retrieved);
    expect(stats.handsObserved).toBe(500);
    expect(stats.confidence).toBe("moderate"); // 500 is >= 100 (moderate) but < 1000 (strong)
  });
});