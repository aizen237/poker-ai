import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { projectRiverObservation } from "../../../apps/pokernow-extension/src/riverObservation.js";
import { projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { buildLiveDecisionProofs } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { assessLiveState } from "./liveState.js";
import type { LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/pokernow-river-406.json", import.meta.url), "utf8"));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function replay(mutate: (frames: any[]) => void = () => {}) {
  const frames = structuredClone(fixture.frames); mutate(frames);
  let now = frames[0].localReceivedAt;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const runtime = createTimelineRuntime({ tableId: "river-table", sessionId: "test", now: () => now, fetchLog: vi.fn() });
  let identity: ReturnType<typeof identityFromSocketPacket> = null;
  for (const f of frames) {
    now = f.localReceivedAt;
    const wire = "42" + JSON.stringify([f.event, f.payload]);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId: "river-table", sequence: f.localReceiveSequence,
      generation: f.connectionGeneration, observedAt: now, metadata: inspectSocketMetadata(wire),
      utgSource: projectFirstUtgSource(wire, identity?.heroPlayerId ?? null), riverSource: projectRiverObservation(wire, identity?.heroPlayerId ?? null) });
    identity = identityFromSocketPacket(wire, "river-table", identity);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "river-table", sequence: f.localReceiveSequence, connected: true, identity });
  }
  // The saved control is already 244ms beyond expiry. This earlier UI receipt
  // is an explicitly simulated synchronous read, not new historical evidence.
  now += 100;
  const read = structuredClone(fixture.read) as LiveTableRead;
  read.callControl!.observedAt = now;
  return { runtime, read, at: (value: number) => { now = value; }, assess: () =>
    buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), runtime.snapshot(), null, "test").riverCallFold! };
}

describe("hand406 river observation to conditional calculation", () => {
  it("replays the production socket observer and sanitizes the river bridge; close invalidates it", async () => {
    vi.resetModules();
    let now = fixture.frames[0].localReceivedAt;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const runtime = createTimelineRuntime({ tableId: "river-table", sessionId: "bridge", now: () => now, fetchLog: vi.fn() });
    class Socket extends EventTarget {
      send = vi.fn();
      constructor(public url: string) { super(); }
      incoming(event: string, payload: unknown) { this.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([event, payload]) })); }
    }
    const postMessage = vi.fn((message: unknown) => runtime.accept(message));
    const win = { WebSocket: Socket, postMessage, addEventListener: vi.fn(), sessionStorage: { getItem: () => null } };
    vi.stubGlobal("window", win); vi.stubGlobal("location", new URL("https://www.pokernow.com/games/river-table"));
    await import("../../../apps/pokernow-extension/src/eventSource.js");
    const socket = new win.WebSocket("wss://www.pokernow.com/socket.io/?gameID=river-table");
    for (const f of fixture.frames) { now = f.localReceivedAt; socket.incoming(f.event, f.payload); }
    expect(runtime.snapshot().sourceStatus.riverObservation?.payableCall).toBe(12);
    const messages = postMessage.mock.calls.map(([m]) => m as any).filter(m => m.type === "source_metadata");
    expect(messages).toHaveLength(49);
    expect(messages[0].riverSource.source.frame.players.player1.name).toBeUndefined();
    expect(messages[13].riverSource.source.frame.pC.player4.cards.every((c: any) => c.value === null)).toBe(true);
    expect(socket.send).not.toHaveBeenCalled();
    socket.dispatchEvent(new Event("close"));
    expect(runtime.snapshot().sourceStatus.riverObservation).toBeNull();
  });
  it("links all 49 real frame shapes and prices CALL12 from gross24, without certifying assumptions", () => {
    const f = replay();
    expect(f.runtime.snapshot().sourceStatus.riverObservation, JSON.stringify(f.runtime.snapshot().sourceStatus.riverObservationDiagnostic)).not.toBeNull();
    expect(f.runtime.snapshot().sourceStatus.riverObservation).toMatchObject({ handNumber: 406, sequence: 49,
      collectedPot: 12, streetSubtotal: 12, grossPotBeforeCall: 24, payableCall: 12, historyComplete: false, liveAuthorized: false });
    const r = f.assess();
    expect(r.unsafe).toBe(false); expect(r.liveAuthorized).toBe(false); expect(r.status).toBe("abstained");
    expect(r.illustration?.requiredEquity).toBeCloseTo(1 / 3);
    expect(r.illustration?.foldEV).toBe(0);
    expect(r.illustrationLines.join(" ")).toContain("ILLUSTRATIVE ONLY");
    expect(r.illustrationLines.join(" ")).toContain("zero rake/drop");
    expect(r.reasons.join(" ")).not.toContain("No validated river source activation");
    expect(r.reasons.join(" ")).toContain("rake");
  });
  it.each(["hand", "hero", "board", "bet", "stack", "pot", "opponent", "call", "disabled", "all-in"])("invalidates a modified DOM/identity: %s", kind => {
    const f = replay();
    if (kind === "hand" || kind === "hero") {
      const snapshot = f.runtime.snapshot();
      snapshot.sourceStatus.identity![kind === "hand" ? "handId" : "heroPlayerId"] = "wrong";
    }
    if (kind === "board") f.read.raw.boardCards[4]!.valueText = "7";
    if (kind === "bet") f.read.raw.seats.find(s => s.seatNumber === 5)!.betValueText = "13";
    if (kind === "stack") f.read.raw.seats[0]!.stackText = "247";
    if (kind === "pot") f.read.raw.potTotalValueText = "36";
    if (kind === "opponent") f.read.raw.seats[1]!.statusClasses = [];
    if (kind === "call") f.read.callControl!.amountChips = 13;
    if (kind === "disabled") f.read.callControl!.enabled = false;
    if (kind === "all-in") f.read.raw.seats[0]!.stackText = "All In";
    expect(f.assess().illustration).toBeNull(); expect(f.assess().liveAuthorized).toBe(false);
  });
  it.each(["missing", "incomplete", "predecessor", "generation", "return", "rake", "all-in", "short-call", "exact-all-in", "villain-all-in", "hand", "board", "hero", "later"])("rejects damaged source: %s", kind => {
    const f = replay(frames => {
      if (kind === "missing") frames.splice(45, 1);
      if (kind === "incomplete") delete frames[48].payload.pITT;
      if (kind === "predecessor") frames[47].payload.pre++;
      if (kind === "generation") frames[48].connectionGeneration++;
      if (kind === "return") frames[47].payload.uncalledReturn = 1;
      if (kind === "rake") frames[47].payload.rake = 1;
      if (kind === "all-in") frames[47].payload.pGS = { player4: "allIn" };
      if (kind === "short-call") frames[25].payload.players.player1.stack = 11;
      if (kind === "exact-all-in") frames[25].payload.players.player1.stack = 12;
      if (kind === "villain-all-in") frames[25].payload.players.player4.stack = 12;
      if (kind === "hand") frames[48].payload.hI = "wrong";
      if (kind === "board") frames[48].payload.oTC = { "1": ["2h", "9s", "4h", "Qs", "7c"] };
      if (kind === "hero") frames[48].payload.cPI = "player4";
      if (kind === "later") frames.push({ ...structuredClone(frames[48]), localReceiveSequence: 50, localReceivedAt: frames[48].localReceivedAt + 1,
        payload: { pre: frames[48].payload.now, now: frames[48].payload.now + 1, fV: "0.1.72", mEV: 0, sN: frames[48].payload.now + 2, eventsData: [] } });
    });
    expect(f.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    expect(f.assess().illustration).toBeNull();
  });
  it("accepts another coherent price without hardcoding12 or double-counting", () => {
    const f = replay(frames => { frames[47].payload.tB.player4 = 8; frames[47].payload.cHB = 8; frames[47].payload.mR = 16; });
    f.read.raw.seats.find(s => s.seatNumber === 5)!.betValueText = "8";
    f.read.raw.seats.find(s => s.seatNumber === 5)!.stackText = "239";
    f.read.raw.potTotalValueText = "20"; f.read.callControl!.amountChips = 8;
    expect(f.assess().illustration?.requiredEquity).toBeCloseTo(8 / 28);
  });
  it("keeps original expiry, rejects captured late read, future receipt and disconnect", () => {
    const f = replay(), expiry = f.assess().binding!.expiresAt;
    f.at(expiry - 1); f.read.callControl!.observedAt = expiry - 1;
    expect(f.assess().illustration).not.toBeNull();
    f.at(expiry); expect(f.assess().illustration).toBeNull();
    f.at(fixture.read.callControl.observedAt); f.read.callControl = structuredClone(fixture.read.callControl);
    expect(f.assess().illustration).toBeNull();
    const g = replay(); g.read.callControl!.observedAt += 1;
    expect(g.assess().illustration).toBeNull();
    g.runtime.stop("Disconnected"); expect(g.assess().illustration).toBeNull();
  });
  it("withholds on observed unresolved returns even with unchanged numeric displays", () => {
    const f = replay();
    f.runtime.snapshot().current.events.push({ action: "uncalled_return" } as any);
    expect(f.assess().illustration).toBeNull(); expect(f.assess().unsafe).toBe(true);
  });
});
