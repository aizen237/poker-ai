import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFirstUtgSource, projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";

const frames = (): any[] => JSON.parse(readFileSync(new URL("./fixtures/pokernow-flop-243.json", import.meta.url), "utf8")).frames;
function replay(fs = frames(), mutate?: (p: any, f: any) => void) {
  let now = 0, hero: string | null = null;
  const source = createFirstUtgSource("TABLE_TEST", () => now);
  const accept = (f: any) => {
    now = f.localReceivedAt;
    const p = projectFirstUtgSource("42" + JSON.stringify([f.event, f.payload]), hero);
    mutate?.(p, f); hero = p?.heroId ?? hero;
    source.accept(p, f.localReceiveSequence, f.connectionGeneration, now);
  };
  fs.forEach(accept);
  return { source, accept, at: (t: number) => { now = t; } };
}

describe("hand243 historical flop CALL2 through the existing source authority", () => {
  it("independently anchors HJ hero, six participants and the frame14 flop reset", () => {
    const f = replay(frames().slice(0, 14)), p = f.source.flopProof()!;
    expect(p).toMatchObject({ scope: "flop_transition", witness: { handNumber: 243, heroId: "PLAYER_1", heroCards: ["9d", "Qc"] },
      anchor: { sequence: 2 }, continuity: { baselineSequence: 1, throughSequence: 14, generation: 1 },
      transition: { sequence: 14, board: ["6h", "Qh", "3s"], clearedContributions: {
        PLAYER_1: 2, PLAYER_2: 2, PLAYER_3: 2, PLAYER_5: 2, PLAYER_9: 2, PLAYER_10: 2,
      } }, activation: { playerId: "PLAYER_5" } });
    expect(p.witness.players.map(p => [p.seat, p.position, p.sourceStack])).toEqual([
      [3, "BTN", 240], [5, "SB", 255], [9, "BB", 248], [10, "UTG", 268], [1, "HJ", 256], [2, "CO", 235],
    ]);
    expect(f.source.flopAcceptanceProof()).toBeNull();
    expect(f.source.proof()).toBeNull();
  });
  it("expires the original hero opportunity before the real CALL, without losing historical recognition", () => {
    const fs = frames(), f = replay(fs.slice(0, 20)), p = f.source.flopProof()!;
    expect(p).toMatchObject({ scope: "flop_hero_activation", activation: { sequence: 20, playerId: "PLAYER_1" },
      expiresAt: 1792832970591, contributions: { PLAYER_5: 2, PLAYER_9: 2, PLAYER_10: 2, PLAYER_1: 0, PLAYER_2: 0, PLAYER_3: 0 } });
    expect(p.observations.map(o => [o.sequence, o.playerId, o.contribution])).toEqual([
      [15, "PLAYER_5", 2], [17, "PLAYER_9", 2], [19, "PLAYER_10", 2],
    ]);
    f.at(p.expiresAt - 1); expect(f.source.flopProof()).not.toBeNull();
    f.at(p.expiresAt); expect(f.source.flopProof()).toBeNull();
    f.at(fs[20].localReceivedAt); expect(f.source.flopProof()).toBeNull();
    expect(f.source.flopAcceptanceProof()).toBeNull();
    f.accept(fs[20]);
    const accepted = f.source.flopAcceptanceProof()!;
    expect(accepted).toMatchObject({ scope: "historical_flop_call2", historyComplete: false, liveRecommendationsAllowed: false,
      originalHeroExpiresAt: p.expiresAt, heroActivation: p.activation, nextActivation: null,
      continuity: { throughSequence: 21, cursor: 1792832973510 },
      acceptance: { sequence: 21, cursor: 1792832973510, previousCursor: 1792832960494, receivedAt: 1792832973609,
        street: "flop", action: "call", actor: { playerId: "PLAYER_1", seat: 1, position: "HJ" },
        priorContributionChips: 0, newContributionChips: 2, investmentChips: 2, previousHighestContributionChips: 2,
        observedRaiseIncrementChips: 0, evidence: { contract: "hand243_hj_flop_call2_v1", raw: fs[20].payload } },
      facts: { amountToCallChips: null, contestablePotChips: null, legalActions: null } });
    expect(accepted.acceptance.receivedAt - accepted.heroActivation.receivedAt).toBe(13018);
    expect(accepted).not.toHaveProperty("expiresAt");
    expect(f.source.flopProof()).toBeNull();
    f.accept(fs[21]);
    expect(f.source.flopAcceptanceProof()).toMatchObject({ originalHeroExpiresAt: p.expiresAt, acceptance: accepted.acceptance,
      continuity: { throughSequence: 22, cursor: 1792832974352 },
      nextActivation: { sequence: 22, playerId: "PLAYER_2", previousCursor: 1792832973510, receivedAt: 1792832974441 } });
    expect(f.source.flopProof()).toBeNull();
    expect(f.source.hjProof()).toBeNull();
    expect(f.source.coFacingOpenProof()).toBeNull();
    f.at(fs[21].localReceivedAt + 1000000);
    expect(f.source.flopAcceptanceProof()).not.toBeNull(); // Historical, never a live deadline.
    expect(f.source.flopProof()).toBeNull();
    const copy = f.source.flopAcceptanceProof()!; copy.acceptance.evidence.raw.tB.PLAYER_1 = 999;
    expect(f.source.flopAcceptanceProof()!.acceptance.newContributionChips).toBe(2);
    expect(f.source.flopAcceptanceProof()!.acceptance.evidence.raw.tB.PLAYER_1).toBe(2);
    f.at(fs[21].localReceivedAt - 1); expect(f.source.flopAcceptanceProof()).toBeNull();
  });
  it.each(Array.from({ length: 22 }, (_, i) => i))("does not repair missing recorded frame index %i", index => {
    const fs = frames(); fs.splice(index, 1);
    const p = replay(fs).source.flopAcceptanceProof();
    if (index === 21) expect(p?.nextActivation).toBeNull();
    else expect(p).toBeNull();
  });
  it.each(Array.from({ length: 20 }, (_, i) => i + 2))("unknown mutation at dependent index %i cannot disappear through projection", index => {
    const fs = frames(); fs[index].payload.unknown = true;
    expect(replay(fs).source.flopAcceptanceProof()).toBeNull();
  });
  const mutations: Record<string, (fs: any[]) => void> = {
    "cRPI-only": fs => delete fs[20].payload.tB,
    "wrong-contributor": fs => fs[20].payload.tB = { PLAYER_2: 2 },
    "raise": fs => fs[20].payload.tB.PLAYER_1 = 4,
    "partial-call": fs => fs[20].payload.tB.PLAYER_1 = 1,
    "check": fs => fs[20].payload.tB.PLAYER_1 = 0,
    "fold": fs => fs[20].payload.pGS.PLAYER_1 = "fold",
    "all-in": fs => fs[20].payload.pGS.PLAYER_1 = "allIn",
    "no-release": fs => fs[20].payload.pITT = "PLAYER_1",
    "extra-contribution": fs => fs[20].payload.tB.PLAYER_2 = 2,
    "no-cRPI": fs => delete fs[20].payload.cRPI,
    "reordered-responders": fs => fs[20].payload.cRPI.reverse(),
    "changed-highest": fs => fs[20].payload.cHB = 3,
    "changed-raise-bound": fs => fs[20].payload.mR = 6,
    "missing-bet-discriminator": fs => delete fs[14].payload.cHB,
    "wrong-bet": fs => fs[14].payload.cHB = 3,
    "wrong-hero-activation": fs => fs[19].payload.cPI = fs[19].payload.pITT = "PLAYER_2",
    "wrong-next-actor": fs => fs[21].payload.cPI = fs[21].payload.pITT = "PLAYER_3",
    "conflicting-next-actor": fs => fs[21].payload.pITT = "PLAYER_1",
    "missing-next-actor": fs => delete fs[21].payload.pITT,
    "wrong-next-capacity": fs => fs[21].payload.mAVTB++,
    "coalesced-next-activation": fs => fs[20].payload.cPI = "PLAYER_2",
    "wrong-hero": fs => fs[0].payload.currentPlayer.id = "PLAYER_10",
    "other-stack-profile": fs => fs[0].payload.gameState.players.PLAYER_2.stack++,
    "short-stack": fs => fs[0].payload.gameState.players.PLAYER_1.stack = 1,
    "other-game-profile": fs => fs[0].payload.gameState.ante = 1,
    "missing-registration-highest": fs => delete fs[0].payload.gameState.cHB,
    "wrong-registration-bound": fs => fs[0].payload.gameState.mR = 6,
    "boundary-highest-override": fs => fs[1].payload.cHB = 3,
    "boundary-malformed-bound": fs => fs[1].payload.mR = null,
    "predecessor": fs => fs[20].payload.pre++,
    "sequence-gap": fs => fs[20].localReceiveSequence++,
    "replay": fs => fs.splice(20, 0, structuredClone(fs[19])),
    "generation": fs => fs[20].connectionGeneration++,
    "receipt-regression": fs => fs[20].localReceivedAt = fs[19].localReceivedAt - 1,
    "hand": fs => fs[20].payload.hI = "OTHER",
    "hand-number": fs => fs[20].payload.gN = 244,
    "table": fs => fs[20].payload.id = "OTHER",
    "refresh": fs => fs[20].event = "rup",
    "turn": fs => fs[20].payload.gT = [1, 2],
    "board-change": fs => fs[20].payload.oTC = { "1": ["6h", "Qh", "4s"] },
    "card-collision": fs => fs[13].payload.oTC["1"][0] = "Qc",
    "other-board-profile": fs => fs[13].payload.oTC["1"][0] = "7h",
    "other-hole-cards": fs => fs[1].payload.pC.PLAYER_1.cards[0].value = "8d",
    "missing-reset": fs => delete fs[13].payload.tB.PLAYER_1,
    "bad-stack-collection": fs => fs[13].payload.players.PLAYER_1.stack++,
    "missing-BTN-call": fs => fs[8].payload.tB = {},
  };
  it.each(Object.keys(mutations))("rejects synthetic %s without acceptance or next-turn promotion", variant => {
    const fs = frames(); mutations[variant]!(fs);
    const f = replay(fs);
    expect(f.source.flopAcceptanceProof()).toBeNull(); expect(f.source.flopProof()).toBeNull();
  });
  it.each([14, 20, 21, 22])("rejects contradictory retained/projected frame %i", sequence => {
    const f = replay(frames(), (p, frame) => {
      if (frame.localReceiveSequence === sequence && p) p.frame.cPI = "PLAYER_3";
    });
    expect(f.source.flopAcceptanceProof()).toBeNull();
  });
  it("does not extrapolate acceptance to a consistently changed stack profile", () => {
    const fs = frames();
    for (const p of Object.values(fs[0].payload.gameState.players) as any[]) p.stack++;
    for (const f of fs.slice(1)) {
      if (f.payload.mAVTB !== undefined) f.payload.mAVTB++;
      for (const p of Object.values(f.payload.players ?? {}) as any[]) if (p.stack !== undefined) p.stack++;
    }
    expect(replay(fs).source.flopAcceptanceProof()).toBeNull();
  });
  it.each([14, 20, 21])("cannot bridge an inserted empty but cursor-linked update after frame %i", count => {
    const fs = frames(), previous = fs[count - 1];
    fs.splice(count, 0, { ...previous, localReceivedAt: previous.localReceivedAt + 1,
      payload: { now: previous.payload.now + 1, pre: previous.payload.now } });
    fs[count + 1].payload.pre = fs[count].payload.now;
    fs.forEach((f, i) => { f.localReceiveSequence = i + 1; });
    expect(replay(fs).source.flopAcceptanceProof()).toBeNull();
  });
  it.each([14, 21, 22])("requires the retained raw shape at frame %i", sequence => {
    const f = replay(frames(), (p, frame) => {
      if (frame.localReceiveSequence === sequence && p) { delete p.flopPatch; delete p.hjPatch; }
    });
    expect(f.source.flopAcceptanceProof()).toBeNull();
  });
  it("ignores dictionary order but preserves array order", () => {
    const reorder = (v: any): any => Array.isArray(v) ? v.map(reorder) : v && typeof v === "object"
      ? Object.fromEntries(Object.entries(v).reverse().map(([k, value]) => [k, reorder(value)])) : v;
    expect(replay(reorder(frames())).source.flopAcceptanceProof()?.nextActivation?.sequence).toBe(22);
  });
  it.each([20, 21, 22])("reset destroys pending/issued historical evidence after frame %i", count => {
    const fs = frames(), f = replay(fs.slice(0, count)); f.source.reset(); fs.slice(count).forEach(f.accept);
    expect(f.source.flopAcceptanceProof()).toBeNull(); expect(f.source.flopProof()).toBeNull();
  });
  it.each(["empty", "unknown", "null", "disconnect", "reconnect"])("invalidates the completed historical result on %s", variant => {
    const fs = frames(), f = replay(), last = fs[21];
    if (variant === "disconnect") f.source.reset();
    else if (variant === "null") f.source.accept(null, 23, 1, last.localReceivedAt);
    else f.accept({ ...last, localReceiveSequence: 23, connectionGeneration: variant === "reconnect" ? 2 : 1,
      payload: { now: last.payload.now + 1, pre: last.payload.now, ...(variant === "unknown" ? { unknown: true } : {}) } });
    expect(f.source.flopAcceptanceProof()).toBeNull(); expect(f.source.flopProof()).toBeNull();
  });
});
