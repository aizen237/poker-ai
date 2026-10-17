import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFirstUtgSource, projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";

const saved = (hand: number) => JSON.parse(readFileSync(new URL(`./fixtures/pokernow-hj-${hand}.json`, import.meta.url), "utf8")).frames;
function replay(hand = 150, change?: (frames: any[]) => void, changeProjection?: (projection: any) => void) {
  const frames = saved(hand); change?.(frames);
  let now = 0, hero: string | null = null;
  const source = createFirstUtgSource("TABLE_TEST", () => now);
  const accept = (f: any) => {
    now = f.localReceivedAt;
    const projection = projectFirstUtgSource("42" + JSON.stringify([f.event, f.payload]), hero);
    changeProjection?.(projection);
    hero = projection?.heroId ?? hero;
    source.accept(projection, f.localReceiveSequence, f.connectionGeneration, now);
  };
  for (const f of frames) accept(f);
  return { source, frames, accept, at: (value: number) => { now = value; } };
}
describe("HJ dependent window under the existing bounded source authority", () => {
  it.each([150, 168])("preserves captured hand%i cards, roster, prefix provenance and global incompleteness", hand => {
    const f = replay(hand), start = f.frames.at(-3), fold = f.frames.at(-2), turn = f.frames.at(-1);
    const p = f.source.hjProof()!;
    expect(p).toMatchObject({ version: 1, scope: "hj_after_utg_fold", historyComplete: false,
      expiresAt: turn.localReceivedAt + 10000,
      anchor: { sequence: start.localReceiveSequence, cursor: start.payload.now, firstActorId: "PLAYER_10" },
      fold: { sequence: fold.localReceiveSequence, playerId: "PLAYER_10", seat: 10, sourcePatch: fold.payload },
      activation: { sequence: turn.localReceiveSequence, sourcePatch: turn.payload },
      witness: { heroId: "PLAYER_1", heroSeat: 1, previousCursor: fold.payload.now, cursor: turn.payload.now,
        receivedAt: turn.localReceivedAt, heroCards: hand === 168 ? ["Qs", "Qd"] : ["8d", "6h"] } });
    expect(p.witness.players).toHaveLength(6);
    expect(p.witness.players.find(p => p.playerId === "PLAYER_1")!.position).toBe("HJ");
    expect(p.witness.openingSizeProfile).toBe("pokernow-0.1.72-th-4fun-1-2-exact5-v1");
    expect(f.source.proof()).toBeNull();
    expect(f.source.diagnostic().historyComplete).toBe(false);
    // Consumers cannot mutate the authoritative frozen source state.
    p.witness.players[0]!.seat = 99;
    expect(f.source.hjProof()!.witness.players[0]!.seat).not.toBe(99);
  });
  it("a hand anchor and a fold are not actionable until the explicit HJ turn", () => {
    expect(replay(150, frames => frames.splice(-2)).source.hjProof()).toBeNull();
    expect(replay(150, frames => frames.pop()).source.hjProof()).toBeNull();
  });
  it.each(["sequence", "generation", "regressing-time", "malformed-registration", "refresh", "different-roster", "wrong-dealer", "wrong-profile", "non-hj"])("rejects %s", variant => {
    const f = replay(variant === "refresh" ? 168 : 150, frames => {
      const start = frames.at(-3).payload, turn = frames.at(-1);
      if (variant === "sequence") turn.localReceiveSequence++;
      if (variant === "generation") turn.connectionGeneration++;
      if (variant === "regressing-time") turn.localReceivedAt = frames.at(-2).localReceivedAt - 1;
      if (variant === "malformed-registration") delete frames.find((f: any) => f.event === "registered").payload.gameState.players.PLAYER_1.id;
      if (variant === "refresh") frames.filter((f: any) => f.event === "rup").at(-1).payload.players.PLAYER_1.stack++;
      if (variant === "different-roster") start.iHPI.pop();
      if (variant === "wrong-dealer") start.dealerSeat = 2;
      if (variant === "wrong-profile") start.version = "0.1.73";
      if (variant === "non-hj") start.cPI = start.pITT = "PLAYER_2";
    });
    expect(f.source.hjProof()).toBeNull();
  });
  it("expires exactly ten seconds from the new activation, not the older hand anchor", () => {
    const f = replay(150, frames => { for (const frame of frames.slice(-2)) frame.localReceivedAt += 30000; });
    const issued = f.frames.at(-1).localReceivedAt;
    expect(f.source.hjProof()).not.toBeNull();
    f.at(issued + 9999); expect(f.source.hjProof()).not.toBeNull();
    f.at(issued + 10000); expect(f.source.hjProof()).toBeNull();
    expect(f.source.diagnostic().hjWindow.reason).toContain("expired");
  });
  it("every later update invalidates; repeating the same turn cannot renew", () => {
    const f = replay(), turn = f.frames.at(-1);
    f.accept({ ...turn, localReceiveSequence: turn.localReceiveSequence + 1, localReceivedAt: turn.localReceivedAt + 5,
      payload: { ...turn.payload, pre: turn.payload.now, now: turn.payload.now + 5, pASA: turn.payload.now + 5 } });
    expect(f.source.hjProof()).toBeNull();
  });
  it("reset removes both the active proof and any pending hand anchor", () => {
    const f = replay(); f.source.reset(); expect(f.source.hjProof()).toBeNull();
    const pending = replay(150, frames => frames.pop()); pending.source.reset();
    pending.accept(saved(150).at(-1)); expect(pending.source.hjProof()).toBeNull();
  });
  it("unknown raw mutation fields cannot disappear into a successful projected fold", () => {
    const fold = saved(150).at(-2);
    const projection = projectFirstUtgSource("42" + JSON.stringify([fold.event, { ...fold.payload, tB: { PLAYER_10: 4 } }]), "PLAYER_1");
    expect(projection?.hjPatch).toBeUndefined();
    const missing = replay(150, undefined, p => { if (p?.hjPatch?.pGS) delete p.frame.pGS; });
    expect(missing.source.hjProof()).toBeNull();
  });
});
