import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFirstUtgSource, projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";

const frames = (hand = 243): any[] => JSON.parse(readFileSync(new URL(`./fixtures/pokernow-flop-${hand}.json`, import.meta.url), "utf8")).frames;
function replay(fs = frames()) {
  let now = 0, hero: string | null = null;
  const source = createFirstUtgSource("TABLE_TEST", () => now);
  const accept = (f: any) => {
    now = f.localReceivedAt;
    const p = projectFirstUtgSource("42" + JSON.stringify([f.event, f.payload]), hero);
    hero = p?.heroId ?? hero;
    source.accept(p, f.localReceiveSequence, f.connectionGeneration, now);
  };
  fs.forEach(accept);
  return { source, accept, at: (t: number) => { now = t; },
    accounting: () => (source.flopAcceptanceProof() ?? source.flopProof())?.accounting };
}

describe("hand243 source contribution accounting without contestable-pot authority", () => {
  it.each([[14, 0, 12], [20, 6, 18], [21, 8, 20], [22, 8, 20]])(
    "reconstructs separate streets and investments through frame %i", (count, flopSum, cumulative) => {
      const f = replay(frames().slice(0, count)), a = f.accounting()!;
      expect(a).toMatchObject({ scope: "hand243_contribution_prefix", coverage: "validated_prefix", units: "chips",
        preflop: { streetContributionSumChips: 12, contestablePotChips: null },
        flop: { streetContributionSumChips: flopSum, contestablePotChips: null },
        cumulativeInvestmentSumChips: cumulative, sourcePotPlusStreetChips: cumulative,
        sourcePot: { valueChips: 12, sequence: 14, cursor: 1792832950886, receivedAt: 1792832950993 },
        displayedTotalPotChips: null, contestablePotChips: null, netCommittedChips: null,
        returnedUncalledChips: null, rakeOrDropChips: null, potLedger: null });
      expect(a.preflop.contributions.map(p => [p.position, p.forcedChips, p.voluntaryInvestmentChips, p.streetTotalChips])).toEqual([
        ["BTN", 0, 2, 2], ["SB", 1, 1, 2], ["BB", 2, 0, 2], ["UTG", 0, 2, 2], ["HJ", 0, 2, 2], ["CO", 0, 2, 2],
      ]);
      expect(a.preflopObservations.map(o => [o.sequence, o.playerId, o.priorContribution, o.contribution])).toEqual([
        [3, "PLAYER_10", 0, 2], [5, "PLAYER_1", 0, 2], [7, "PLAYER_2", 0, 2], [9, "PLAYER_3", 0, 2], [11, "PLAYER_5", 1, 2],
      ]);
      const p = f.source.flopAcceptanceProof() ?? f.source.flopProof()!;
      expect(p).toMatchObject({ historyComplete: false, liveRecommendationsAllowed: false,
        continuity: { throughSequence: count, generation: 1 },
        facts: { amountToCallChips: null, contestablePotChips: null, legalActions: null } });
      expect(f.source.proof()).toBeNull();
    });
  it("resets street amounts without losing preflop investments or deducting blinds twice", () => {
    const a = replay(frames().slice(0, 14)).accounting()!;
    expect(a.flop.contributions.every(p => p.forcedChips === 0 && p.voluntaryInvestmentChips === 0 && p.streetTotalChips === 0)).toBe(true);
    expect(a.preflop.contributions.map(p => p.remainingCapacityChips)).toEqual([238, 253, 246, 266, 254, 233]);
    expect(a.cumulativeInvestments.map(p => [p.preflopChips, p.flopChips, p.investedChips])).toEqual(Array(6).fill([2, 0, 2]));
  });
  it("counts hero CALL2 once; next activation adds nothing and ordinary source stacks stay separate", () => {
    const fs = frames(), f = replay(fs.slice(0, 20)), before = f.accounting()!;
    f.accept(fs[20]); const after = f.accounting()!;
    expect(after.cumulativeInvestmentSumChips - before.cumulativeInvestmentSumChips).toBe(2);
    expect(after.cumulativeInvestments.map(p => [p.playerId, p.investedChips, p.observedSourceStackChips])).toEqual([
      ["PLAYER_3", 2, 238], ["PLAYER_5", 4, 253], ["PLAYER_9", 4, 246], ["PLAYER_10", 4, 266], ["PLAYER_1", 4, 254], ["PLAYER_2", 2, 233],
    ]);
    expect(after.flop.contributions.map(p => p.remainingCapacityChips)).toEqual([238, 251, 244, 264, 252, 233]);
    f.accept(fs[21]); expect(f.accounting()).toEqual(after);
    const copy = f.accounting()!; copy.preflopObservations[0]!.contribution = 999;
    copy.preflop.contributions[0]!.streetTotalChips = 999; copy.cumulativeInvestments[0]!.investedChips = 999;
    expect(f.accounting()).toEqual(after);
  });
  it("keeps original deadlines, historical reads and reset invalidation", () => {
    const fs = frames(), f = replay(fs.slice(0, 20));
    const expiry = f.source.flopProof()!.expiresAt;
    f.at(expiry - 1); expect(f.accounting()).toBeDefined();
    f.at(expiry); expect(f.accounting()).toBeUndefined();
    f.accept(fs[20]); f.accept(fs[21]); f.at(fs[21].localReceivedAt + 1000000);
    expect(f.accounting()?.cumulativeInvestmentSumChips).toBe(20);
    expect(f.source.flopProof()).toBeNull();
    expect(f.source.flopAcceptanceProof()!.originalHeroExpiresAt).toBe(expiry);
    expect(f.source.flopAcceptanceProof()).not.toHaveProperty("expiresAt");
    f.at(fs[21].localReceivedAt - 1); expect(f.accounting()).toBeUndefined();
    f.source.reset(); f.at(fs[21].localReceivedAt); expect(f.accounting()).toBeUndefined();
  });
  it("does not widen the hand239 accounting scope", () => {
    const f = replay(frames(239)); expect(f.source.flopProof()).not.toBeNull();
    expect(f.accounting()).toBeUndefined();
  });
  it.each(Array.from({ length: 21 }, (_, i) => i))(
    "rejects missing frame index %i even with repaired cursors/sequences", index => {
      const fs = frames(); fs.splice(index, 1);
      fs.forEach((f, i) => { f.localReceiveSequence = i + 1; if (i) f.payload.pre = fs[i - 1].payload.now ?? fs[i - 1].payload.gameState?.now; });
      expect(replay(fs).accounting()).toBeUndefined();
    });
  const mutations: Record<string, (fs: any[]) => void> = {
    "wrong-small-blind": fs => fs[1].payload.tB.PLAYER_5 = 2,
    "missing-big-blind": fs => delete fs[1].payload.tB.PLAYER_9,
    "extra-forced-post": fs => fs[1].payload.tB.PLAYER_1 = 1,
    "boundary-return": fs => fs[1].payload.uncalledReturn = { PLAYER_5: 1 },
    "boundary-pot": fs => fs[1].payload.pot = 99,
    "boundary-capacity": fs => fs[1].payload.mAVTB = 267,
    "nested-boundary-adjustment": fs => fs[1].payload.pC.PLAYER_1.returned = 1,
    "preflop-amount": fs => fs[4].payload.tB.PLAYER_1 = 3,
    "preflop-return": fs => fs[10].payload.tB.PLAYER_5 = 0,
    "missing-stack-collection": fs => delete fs[13].payload.players.PLAYER_1,
    "contradictory-stack": fs => fs[13].payload.players.PLAYER_5.stack--,
    "contradictory-pot": fs => fs[13].payload.pot = 18,
    "side-pot": fs => fs[13].payload.sidePots = [{ amount: 12 }],
    "second-board": fs => fs[13].payload.oTC["2"] = ["Ac", "Kd", "Ts"],
    "flop-amount": fs => fs[16].payload.tB.PLAYER_9 = 4,
    "unknown-return": fs => fs[20].payload.returnedUncalled = 2,
    "all-in": fs => fs[20].payload.pGS.PLAYER_1 = "allIn",
    "hero-return": fs => fs[20].payload.tB.PLAYER_1 = -2,
    "hero-stack-patch": fs => fs[20].payload.players = { PLAYER_1: { stack: 252 } },
    "next-actor-wager": fs => fs[21].payload.tB = { PLAYER_2: 2 },
    "reconnect": fs => fs[20].connectionGeneration = 2,
    "receipt-regression": fs => fs[20].localReceivedAt = fs[19].localReceivedAt - 1,
    "replay": fs => fs.splice(20, 0, structuredClone(fs[19])),
  };
  it.each(Object.keys(mutations))("rejects unsupported accounting: %s", name => {
    const fs = frames(); mutations[name]!(fs);
    expect(replay(fs).accounting()).toBeUndefined();
  });
  it.each(["PLAYER_1", "PLAYER_2", "PLAYER_3", "PLAYER_5", "PLAYER_9", "PLAYER_10"])(
    "requires the explicit street reset for %s", id => {
      const fs = frames(); delete fs[13].payload.tB[id];
      expect(replay(fs).accounting()).toBeUndefined();
    });
  it.each(["uncalledReturn", "sidePots", "rake", "unknown"])("cannot bridge a linked %s update", field => {
    const fs = frames(), previous = fs[19];
    fs.splice(20, 0, { ...previous, localReceivedAt: previous.localReceivedAt + 1,
      payload: { now: previous.payload.now + 1, pre: previous.payload.now, [field]: 0 } });
    fs[21].payload.pre = fs[20].payload.now;
    fs.forEach((f, i) => { f.localReceiveSequence = i + 1; });
    expect(replay(fs).accounting()).toBeUndefined();
  });
  it.each(["empty", "return", "side-pot", "reconnect"])("clears issued accounting on a synthetic %s tail", kind => {
    const fs = frames(), f = replay(), last = fs[21];
    f.accept({ ...last, localReceiveSequence: 23, localReceivedAt: last.localReceivedAt + 1,
      connectionGeneration: kind === "reconnect" ? 2 : 1,
      payload: { now: last.payload.now + 1, pre: last.payload.now,
        ...(kind === "return" ? { tB: { PLAYER_1: 0 } } : {}), ...(kind === "side-pot" ? { sidePots: [] } : {}) } });
    expect(f.accounting()).toBeUndefined();
  });
});
