import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFirstUtgSource, projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";

const saved = (hand: number) => JSON.parse(readFileSync(new URL(`./fixtures/pokernow-btn-${hand}.json`, import.meta.url), "utf8")).frames;
function replay(hand = 148, change?: (frames: any[]) => void, mutateProjection?: (p: any) => void) {
  const frames = saved(hand); change?.(frames);
  let now = 0, hero: string | null = null;
  const source = createFirstUtgSource("TABLE_TEST", () => now);
  const accept = (f: any) => {
    now = f.localReceivedAt;
    const p = projectFirstUtgSource("42" + JSON.stringify([f.event, f.payload]), hero);
    mutateProjection?.(p);
    hero = p?.heroId ?? hero;
    source.accept(p, f.localReceiveSequence, f.connectionGeneration, now);
  };
  for (const f of frames) accept(f);
  return { source, frames, accept, at: (time: number) => { now = time; } };
}

describe("BTN proof issued by the existing bounded continuity authority", () => {
  it.each([148, 166])("hand%i certifies three ordered folds and intermediate HJ/CO activations", hand => {
    const f = replay(hand), boundary = f.frames.at(-7), turn = f.frames.at(-1), proof = f.source.btnProof()!;
    expect(proof).toMatchObject({ version: 1, scope: "btn_after_utg_hj_co_folds", historyComplete: false,
      expiresAt: turn.localReceivedAt + 10000, anchor: { sequence: boundary.localReceiveSequence, cursor: boundary.payload.now },
      hjActivation: { sequence: f.frames.at(-5).localReceiveSequence, sourcePatch: f.frames.at(-5).payload },
      coActivation: { sequence: f.frames.at(-3).localReceiveSequence, sourcePatch: f.frames.at(-3).payload },
      activation: { sequence: turn.localReceiveSequence, sourcePatch: turn.payload },
      witness: { heroId: "PLAYER_1", heroSeat: 1, cursor: turn.payload.now, previousCursor: f.frames.at(-2).payload.now,
        receivedAt: turn.localReceivedAt, openingSizeProfile: "pokernow-0.1.72-th-4fun-1-2-exact5-v1" } });
    expect(proof.folds).toMatchObject([f.frames.at(-6), f.frames.at(-4), f.frames.at(-2)].map(frame => ({
      sequence: frame.localReceiveSequence, sourcePatch: frame.payload, playerId: Object.keys(frame.payload.pGS)[0],
    })));
    expect(proof.witness.players.map(p => p.position)).toEqual(["BTN", "SB", "BB", "UTG", "HJ", "CO"]);
    expect(proof.witness.heroCards).toEqual(hand === 148 ? ["Qd", "Jd"] : ["Kc", "8d"]);
    expect(f.source.proof()).toBeNull(); expect(f.source.hjProof()).toBeNull();
    expect(f.source.diagnostic().historyComplete).toBe(false);
    proof.folds[0].sourcePatch.pGS = {};
    expect(f.source.btnProof()!.folds[0].sourcePatch.pGS).toEqual({ PLAYER_5: "fold" });
  });
  it.each([1, 2, 3, 4, 5, 6])("no actionable BTN certificate with %i trailing transitions missing", count => {
    expect(replay(148, frames => frames.splice(-count)).source.btnProof()).toBeNull();
  });
  it.each([0, 1, 2, 3, 4, 5].flatMap(step => ["sequence", "generation", "receive-time", "missing-projected-field"].map(variant => ({ step, variant }))))(
    "step$step rejects $variant", ({ step, variant }) => {
      const target = saved(148).at(-6 + step).payload.now;
      const f = replay(148, frames => {
        const frame = frames.at(-6 + step);
        if (variant === "sequence") frame.localReceiveSequence++;
        if (variant === "generation") frame.connectionGeneration++;
        if (variant === "receive-time") frame.localReceivedAt = frames.at(-7 + step).localReceivedAt - 1;
      }, p => {
        if (variant === "missing-projected-field" && p?.frame.now === target) delete p.frame.pITT;
      });
      expect(f.source.btnProof()).toBeNull();
    });
  it.each(["registration", "refresh", "roster", "dealt-cards", "blind", "non-btn"])("rejects bad %s evidence", variant => {
    const f = replay(166, frames => {
      const start = frames.at(-7).payload;
      if (variant === "registration") for (const frame of frames.filter((f: any) => f.event === "registered")) delete frame.payload.gameState.players.PLAYER_1.id;
      if (variant === "refresh") frames.find((f: any) => f.event === "rup").payload.players.PLAYER_1.stack++;
      if (variant === "roster") start.iHPI.pop();
      if (variant === "dealt-cards") delete start.pC.PLAYER_10;
      if (variant === "blind") start.tB.PLAYER_3 = 3;
      if (variant === "non-btn") start.cPI = start.pITT = "PLAYER_10";
    });
    expect(f.source.btnProof()).toBeNull();
  });
  it("expiry, later updates and reset cannot renew BTN", () => {
    const f = replay(), turn = f.frames.at(-1);
    f.at(turn.localReceivedAt + 9999); expect(f.source.btnProof()).not.toBeNull();
    f.at(turn.localReceivedAt + 10000); expect(f.source.btnProof()).toBeNull();
    expect(f.source.diagnostic().btnWindow.reason).toContain("expired");
    const updated = replay();
    updated.accept({ ...turn, localReceiveSequence: turn.localReceiveSequence + 1, localReceivedAt: turn.localReceivedAt + 1,
      payload: { pre: turn.payload.now, now: turn.payload.now + 1, eventsData: [] } });
    expect(updated.source.btnProof()).toBeNull();
    const pending = replay(148, frames => frames.pop()); pending.source.reset(); pending.accept(turn);
    expect(pending.source.btnProof()).toBeNull();
    const ready = replay(); ready.source.reset(); expect(ready.source.btnProof()).toBeNull();
  });
});
