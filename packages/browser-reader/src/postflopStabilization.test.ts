import { readFileSync } from "node:fs";
import { runInThisContext, runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { assessLiveState } from "./liveState.js";

const fixture = JSON.parse(readFileSync(process.env.HAND499_RAW_CAPTURE ?? new URL("./fixtures/pokernow-turn-499.json", import.meta.url), "utf8"));
const original = fixture.rawSocket.frames;
const checkpoint = fixture.checkpoint ?? { read: fixture.checkpoints[0].observation.unverifiedObservations.ui,
  completedAt: fixture.checkpoints[0].observation.completedAt, decisionEpoch: fixture.checkpoints[0].observation.epochAfter.decisionEpoch };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function replay(mutate: (frames: any[]) => void = () => {}, mode: "source" | "bundle" = "source") {
  vi.resetModules();
  const frames = structuredClone(original); mutate(frames);
  const tableId = frames[0].payload.gameState.id;
  let now = frames[0].localReceivedAt;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const fetchLog = vi.fn(), runtime = createTimelineRuntime({ tableId, sessionId: "stabilization", now: () => now, fetchLog });
  const location = new URL(`https://www.pokernow.com/games/${tableId}`);
  class Socket extends EventTarget { send = vi.fn(); }
  const messages: any[] = [];
  const win = { WebSocket: Socket, location, addEventListener() {}, sessionStorage: { getItem: () => null },
    postMessage(m: any) { if (m.type === "source_metadata") messages.push(m); runtime.accept(m); }, setTimeout: () => 1, clearTimeout() {} };
  vi.stubGlobal("window", win); vi.stubGlobal("location", location);
  if (mode === "bundle") runInThisContext(readFileSync(new URL("../../../apps/pokernow-extension/eventSource.js", import.meta.url), "utf8"));
  else await import("../../../apps/pokernow-extension/src/eventSource.js");
  const socket = new (win.WebSocket as any)(`wss://www.pokernow.com/socket.io/?gameID=${tableId}`);
  const trace: any[] = [];
  for (const f of frames) {
    now = f.localReceivedAt;
    socket.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([f.event, f.payload]) }));
    trace.push(runtime.snapshot().sourceStatus);
  }
  expect(socket.send).not.toHaveBeenCalled(); expect(fetchLog).not.toHaveBeenCalled();
  return { runtime, trace, messages, at: (time: number) => { now = time; } };
}

function insertMetadata(frames: any[], index: number) {
  const previous = frames[index - 1], next = frames[index];
  const id = frames[0].payload.gameState.seats.find((s: any) => s[1] !== frames[0].payload.currentPlayer.id)[1];
  const now = previous.payload.now + 1;
  const frame = { event: "gC", localReceivedAt: previous.localReceivedAt + 1,
    payload: { now, pre: previous.payload.now, sN: now, fV: "0.1.72", mEV: 0, eventsData: [], players: { [id]: { winCount: 101 } } } };
  if (next) next.payload.pre = now;
  frames.splice(index, 0, frame);
}

describe("field-aware postflop source release gate", () => {
  it.each(["source", "bundle"] as const)("replays all 81 unchanged Hand499 frames through MAIN %s and binds actual recorded DOM", async mode => {
    const r = await replay(() => {}, mode);
    expect(r.messages).toHaveLength(81);
    expect(r.trace.every((s, i) => s.riverObservationDiagnostic.sequence === i + 1)).toBe(true);
    expect(r.messages[1].riverSource).toMatchObject({ kind: "ancillary", actor: null, amount: null });
    expect(r.trace[74].riverObservation).toMatchObject({ street: "flop", payableCall: 4 });
    expect(r.trace[80].riverObservation).toMatchObject({ street: "turn", collectedPot: 21, payableCall: 4,
      grossPotBeforeCall: 25, sequence: 81, historyComplete: false, liveAuthorized: false,
      receivedAt: 1793370468119, expiresAt: 1793370478119 });
    const source = (await import("../../../apps/pokernow-extension/src/decisionProofs.js")).buildLiveDecisionProofs;
    const ctx = { Date, URL, structuredClone, build: null as typeof source | null };
    const bundle = readFileSync(new URL("../../../apps/pokernow-extension/contentScript.js", import.meta.url), "utf8");
    if (mode === "bundle") runInNewContext(bundle.slice(0, bundle.indexOf("  // src/contentScript.ts")) + "globalThis.build=buildLiveDecisionProofs;})();", ctx);
    const build = mode === "source" ? source : ctx.build!;
    const read = structuredClone(checkpoint.read), assessment = assessLiveState(read.raw, read.context);
    r.at(checkpoint.completedAt);
    const snapshot = r.runtime.snapshot(), started = performance.now();
    vi.spyOn(Date, "now").mockImplementation(() => checkpoint.completedAt + Math.floor(performance.now() - started));
    const result = build(read, assessment, snapshot, null, checkpoint.decisionEpoch);
    const elapsed = performance.now() - started;
    expect(elapsed, `cold ${mode} equity computation: ${elapsed.toFixed(1)}ms`).toBeLessThan(1793370478119 - checkpoint.completedAt);
    expect(result.turnCallFold?.illustration).toMatchObject({ status: "conditional", chosenAction: null, llmMayChoose: false, requiredEquity: 4 / 29 });
    expect(result.turnCallFold?.binding?.expiresAt).toBe(1793370478119);
    expect(result.activation.allowed).toBe(false);
    for (const scope of ["pot", "eligibility", "accounting", "legalActions", "equity", "rangeInput"])
      expect(result.evidence.proofs.find(p => p.scope === scope)?.status).not.toBe("proven");
    vi.spyOn(Date, "now").mockReturnValue(1793370478119);
    expect(build(read, assessment, snapshot, null, "expired").turnCallFold?.illustration).toBeNull();
  }, 30000);

  it.each(["name", "winCount", "quitCount", "avatarID", "card labels", "no labels", "key order", "single deletion"])(
    "recognizes gameplay independently of %s", async variant => {
      const r = await replay(frames => {
        const id = frames[0].payload.currentPlayer.id;
        if (variant === "single deletion") delete Object.values<any>(frames[1].payload.players)[0].hideAway;
        for (const f of frames.slice(70)) {
          const p = f.payload;
          if (["name", "winCount", "quitCount", "avatarID"].includes(variant)) {
            p.players ??= {}; p.players[id] ??= {};
            p.players[id][variant] = variant === "name" ? "Independent profile label" : variant === "avatarID" ? null : 123;
          }
          if (variant === "card labels") { p.pC ??= {}; p.pC[id] ??= {}; p.pC[id].name1 = "Pair"; }
          if (variant === "no labels" && p.pC) for (const hand of Object.values<any>(p.pC)) for (const key of Object.keys(hand)) if (key !== "cards") delete hand[key];
          if (variant === "key order") f.payload = Object.fromEntries(Object.entries(p).reverse());
        }
      });
      expect(r.trace[80].riverObservation, JSON.stringify(r.trace[80].riverObservationDiagnostic)).toMatchObject({ street: "turn", sequence: 81 });
    });

  it("lets ancillary updates preserve pending action order without becoming actions", async () => {
    const r = await replay(frames => insertMetadata(frames, 79));
    expect(r.messages[79].riverSource.kind).toBe("ancillary");
    expect(r.trace[79].riverObservation).toBeNull();
    expect(r.trace[81].riverObservation).toMatchObject({ street: "turn", sequence: 82 });
  });
  it("never renews an active observation on a metadata-only update", async () => {
    const r = await replay(frames => insertMetadata(frames, 81));
    expect(r.trace[80].riverObservation).not.toBeNull();
    expect(r.trace[81].riverObservation).toBeNull();
    expect(r.trace[81].riverObservationDiagnostic.gate).toBe("ancillary");
  });
  it("keeps the paid-turn bridge single-use even across an ancillary update", async () => {
    const r = await replay(frames => insertMetadata(frames, 76));
    expect(r.trace.at(-1).riverObservation).toBeNull();
    expect(r.trace.at(-1).riverObservationDiagnostic.firstFailure.gate).toBe("actor_bridge");
  });

  it.each(["null", "boolean", "unknown field", "unknown player", "empty unknown player", "unsafe key", "hero flags", "not settled", "not folded", "money mixed with flags", "bad counter", "bad name", "network mutation", "bad capacity", "bad pot"])(
    "fails closed with the originating frame and gate: %s", async fault => {
      const r = await replay(frames => {
        const p = frames[1].payload, id = Object.keys(p.players)[0], player = p.players[id];
        if (fault === "null") player.sUNH = null;
        if (fault === "boolean") player.hideAway = false;
        if (fault === "unknown field") player.futureFlag = "<D>";
        if (fault === "unknown player") p.players = { unknownPlayer: player };
        if (fault === "empty unknown player") p.players.unknownPlayer = {};
        if (fault === "unsafe key") p.players = JSON.parse('{"__proto__":{"sUNH":"<D>"}}');
        if (fault === "hero flags") p.players = { [frames[0].payload.currentPlayer.id]: player };
        if (fault === "not settled") frames[0].payload.gameState.gT = [1, 0];
        if (fault === "not folded") frames[0].payload.gameState.pGS[id] = "inGame";
        if (fault === "money mixed with flags") player.stack = 1;
        if (fault === "bad counter") player.winCount = -1;
        if (fault === "bad name") player.name = {};
        if (fault === "network mutation") player.isNetworkPlayer = true;
        if (fault === "bad capacity") p.mAVTB = "999";
        if (fault === "bad pot") p.pot = -1;
      });
      expect(r.trace.at(-1).riverObservation).toBeNull();
      expect(r.trace.at(-1).riverObservationDiagnostic.firstFailure).toMatchObject({ sequence: 2 });
      expect(r.trace.at(-1).riverObservationDiagnostic.attemptedSequence).toBe(81);
    });

  it.each(["reorder", "duplicate", "gap", "pot", "hero debit", "opponent debit", "board", "capacity", "expiry bridge"])(
    "preserves continuity and monetary gates: %s", async fault => {
      const r = await replay(frames => {
        const p = frames[76].payload, hero = frames[0].payload.currentPlayer.id;
        if (fault === "reorder") [frames[78], frames[79]] = [frames[79], frames[78]];
        if (fault === "duplicate") frames.splice(79, 0, structuredClone(frames[78]));
        if (fault === "gap") frames.splice(79, 1);
        if (fault === "pot") p.pot++;
        if (fault === "hero debit") p.players[hero].stack++;
        if (fault === "opponent debit") Object.values<any>(p.players).find(p => p !== frames[76].payload.players[hero]).stack++;
        if (fault === "board") p.oTC["1"][0] = "As";
        if (fault === "capacity") delete p.mAVTB;
        if (fault === "expiry bridge") frames[76].localReceivedAt = frames[75].localReceivedAt + 2000;
      });
      expect(r.trace.at(-1).riverObservation).toBeNull();
    });
});
