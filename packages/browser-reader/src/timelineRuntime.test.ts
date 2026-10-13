import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { identityFromSocketPacket, tableIdFromPath, TIMELINE_CHANNEL, validHandIdentity } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { assessLiveState } from "./liveState.js";
import type { RawTableInput } from "./gameState.js";
import type { LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";

const registered = (id = "h1", number = 1) => "42" + JSON.stringify(["registered", {
  gameState: { id: "table", hI: id, gN: number, now: 100, privateCards: "must-not-forward" },
  currentPlayer: { id: "hero", token: "must-not-forward" },
}]);
const identity = (id = "h1", number = 1) => identityFromSocketPacket(registered(id, number), "table", null)!;
const message = (sequence: number, id = "h1", number = 1, connected = true) => ({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "table", sequence, connected, identity: identity(id, number) });
const rows = [{ createdAt: 100, msg: "-- starting hand #1 --" }, { createdAt: 101, msg: '"Hero @ hero" checks' }];
const liveRows = JSON.parse(readFileSync(new URL("./fixtures/pokernow-log-v3-live.json", import.meta.url), "utf8"));
const playerStacks = readFileSync(new URL("./fixtures/pokernow-player-stacks-live.txt", import.meta.url), "utf8").trimEnd();
const uncalledReturn = readFileSync(new URL("./fixtures/pokernow-uncalled-return-live.txt", import.meta.url), "utf8").trimEnd();
const response = (body: unknown = rows, status = 200) => new Response(JSON.stringify(body), { status });
function runtime(fetchLog = vi.fn(async () => response())) {
  let now = 10000;
  const source = createTimelineRuntime({ tableId: "table", sessionId: "test", fetchLog, now: () => now });
  return { source, fetchLog, advance: (amount = 4000) => { now += amount; } };
}

describe("read-only source contract", () => {
  it("extracts only sanitized stable hand metadata and hero ID from registered gameState", () => {
    const result = identity();
    expect(result).toMatchObject({ tableId: "table", handId: "h1", handNumber: 1, heroPlayerId: "hero", source: "registered.gameState", chainGap: false });
    expect(JSON.stringify(result)).not.toContain("must-not-forward");
    expect(tableIdFromPath("/games/table")).toBe("table");
    expect(tableIdFromPath("/games/a/other")).toBeNull();
  });
  it("preserves identity through deltas and exposes predecessor gaps without inventing actions", () => {
    const first = identity();
    const next = identityFromSocketPacket('42["gC",{"pre":100,"now":101}]', "table", first)!;
    expect(next).toMatchObject({ handId: "h1", heroPlayerId: "hero", chainGap: false });
    expect(identityFromSocketPacket('42["gC",{"pre":102,"now":103}]', "table", next)!.chainGap).toBe(true);
  });
  it.each(["42[", '42["newChatMessage",{}]', '42["rup",{"id":"other","hI":"h","gN":1}]', '42["gC",{"gN":2}]', '42["rup",{"hI":"h","gN":1.5}]'])("rejects unknown/malformed/cross-table packet %s", packet => {
    expect(identityFromSocketPacket(packet, "table", identity())).toBeNull();
  });
  it("does not accept an arbitrary page object as verified identity", () => {
    expect(validHandIdentity({ ...identity(), handNumber: Infinity }, "table")).toBe(false);
    expect(validHandIdentity({ ...identity(), heroPlayerId: { token: "x" } }, "table")).toBe(false);
  });
});

describe("server log acquisition and recovery", () => {
  it("exposes hand-local coverage with mixed hero/opponent actions and an independently mapped roster", async () => {
    const batch = [
      { createdAt: "1", msg: "-- starting hand #1 --" }, { createdAt: "2", msg: playerStacks },
      { createdAt: "3", msg: '"aizen @ v7UmNXTwjJ" checks' },
      { createdAt: "4", msg: '"aizemmmm @ TTXBlZfl8G" bets 2' },
      { createdAt: "5", msg: '"aizen @ v7UmNXTwjJ" calls 2' },
    ];
    const f = runtime(vi.fn(async () => response(batch.toReversed())));
    f.source.accept({ ...message(1), identity: { ...identity(), heroPlayerId: "v7UmNXTwjJ" } });
    await f.source.tick();
    const snapshot = f.source.snapshot();
    expect(snapshot.current.events.slice(2).map(e => [e.action, e.actor?.isHero, e.actor?.seat])).toEqual([
      ["check", true, 1], ["bet", false, 2], ["call", true, 1],
    ]);
    expect(snapshot.sourceStatus.historyCoverage).toMatchObject({ status: "source_completeness_unproven", handStartSeen: true,
      sourceWatermark: null, sourceSequence: null, unresolvedActorSeatCount: 0 });
    expect(snapshot.current.historyComplete).toBe(false);
    expect(snapshot.sourceStatus.logContractVerified).toBe(false);
  });
  it.each(["v7UmNXTwjJ", "TTXBlZfl8G"])("identifies a hero/opponent return with hero ID %s without applying it to live pots", async heroPlayerId => {
    const returnRows = [{ createdAt: "1", msg: playerStacks }, { createdAt: "2", msg: uncalledReturn },
      { createdAt: "3", msg: '"aizen @ v7UmNXTwjJ" collected 4 from pot' }, { createdAt: "4", msg: "-- ending hand #1 --" }];
    const f = runtime(vi.fn(async () => response(returnRows)));
    f.source.accept({ ...message(1), identity: { ...identity(), heroPlayerId } });
    await f.source.tick();
    const snapshot = f.source.snapshot();
    expect(snapshot.current.events[1]).toMatchObject({ action: "uncalled_return", amount: 1,
      actor: { playerId: "v7UmNXTwjJ", seat: 1, isHero: heroPlayerId === "v7UmNXTwjJ" } });
    expect(snapshot.current.accounting).toMatchObject({ status: "incomplete", totals: null });
    expect(snapshot.current.accounting.adjustments.map(a => a.kind)).toEqual(["uncalled_return", "pot_award"]);
    expect(snapshot.current.accounting.adjustments[0]!.provenance.text).toBe(uncalledReturn);
    f.advance(); await f.source.tick();
    expect(f.source.snapshot().current.accounting.adjustments).toHaveLength(2);
    expect(f.source.snapshot().current.historyComplete).toBe(false);
    expect(f.source.snapshot().sourceStatus.settlementComplete).toBe(false);
    f.source.accept(message(2, "h2", 2));
    expect(f.source.snapshot().current.accounting.adjustments).toEqual([]);
    expect(f.source.snapshot().archivedHands[0]!.accounting.adjustments).toHaveLength(2);
  });
  it("maps hero/opponents by source ID and retains seats after DOM departure without using DOM names as a source", async () => {
    const mappedRows = [{ createdAt: "1", msg: playerStacks },
      { createdAt: "2", msg: '"aizen @ v7UmNXTwjJ" checks' },
      { createdAt: "3", msg: '"aizemmmm @ TTXBlZfl8G" folds' }];
    const f = runtime(vi.fn(async () => response(mappedRows)));
    f.source.accept({ ...message(1), identity: { ...identity(), heroPlayerId: "v7UmNXTwjJ" } });
    const raw: RawTableInput = { potMainValueText: "4", potTotalValueText: "4", boardCards: [], seats: [1, 2, 3].map(seatNumber => ({
      seatNumber, isOccupied: true, isYou: seatNumber === 1, playerNameText: "DOM name deliberately different",
      stackText: "50", betValueText: "0", statusClasses: [], holeCardClassLists: [],
    })) };
    const context = { blindTexts: ["1", "2"], dealerSeatNumber: 1, readErrors: [] };
    const observe = () => { const a = assessLiveState(raw, context); f.source.observe({ raw, context } as LiveTableRead, a); return a; };
    observe();
    expect(f.source.snapshot().sourceStatus.actorSeatMapping.status).toBe("unknown");
    await f.source.tick();
    const snapshot = f.source.snapshot();
    expect(snapshot.sourceStatus.actorSeatMapping).toMatchObject({ status: "source_reported", source: "pokernow_log_v3.player_stacks" });
    expect(snapshot.current.events[1]!.actor).toMatchObject({ playerId: "v7UmNXTwjJ", isHero: true, seat: 1 });
    expect(snapshot.current.events[2]!.actor).toMatchObject({ playerId: "TTXBlZfl8G", isHero: false, seat: 2 });
    const mapping = JSON.stringify(snapshot.current.seatMapping);
    raw.seats[1]!.isOccupied = false; raw.seats[1]!.playerNameText = null;
    const assessment = observe();
    expect(JSON.stringify(f.source.snapshot().current.seatMapping)).toBe(mapping);
    expect(f.source.snapshot().current.events[2]!.actor!.seat).toBe(2);
    expect(assessment.decisionPot).toBeNull(); expect(assessment.legality.verified).toBe(false);
    expect(f.source.snapshot().current.historyComplete).toBe(false);
    f.source.accept(message(2, "h2", 2));
    expect(f.source.snapshot().sourceStatus.actorSeatMapping.status).toBe("unknown");
    expect(f.source.snapshot().archivedHands[0]!.seatMapping.status).toBe("source_reported");
  });
  it("exposes a contradictory mapping and clears assigned actor seats on refresh", async () => {
    const first = [{ createdAt: "1", msg: playerStacks }, { createdAt: "2", msg: '"aizen @ v7UmNXTwjJ" checks' }];
    const fetchLog = vi.fn().mockResolvedValueOnce(response(first)).mockResolvedValueOnce(response([
      ...first, { createdAt: "3", msg: 'Player stacks: #2 "aizen @ v7UmNXTwjJ" (153)' },
    ]));
    const f = runtime(fetchLog); f.source.accept(message(1)); await f.source.tick();
    expect(f.source.snapshot().current.events[1]!.actor!.seat).toBe(1);
    f.advance(); await f.source.tick();
    expect(f.source.snapshot().sourceStatus.actorSeatMapping.status).toBe("invalid");
    expect(f.source.snapshot().sourceStatus.actorSeatMapping.reasons.join(" ")).toContain("Contradictory");
    expect(f.source.snapshot().current.events[1]!.actor!.seat).toBeNull();
    expect(f.source.snapshot().current.historyComplete).toBe(false);
  });
  it("accepts the live string-timestamp response, records success and labels a source-reported hero fold", async () => {
    const f = runtime(vi.fn(async () => response(liveRows)));
    f.source.accept({ ...message(1), identity: { ...identity(), heroPlayerId: "PLAYER_ID_C" } });
    await f.source.tick();
    const snapshot = f.source.snapshot();
    expect(snapshot.sourceStatus.lastSuccess).toBe(10000);
    expect(snapshot.sourceStatus.status).toContain("Server log received");
    expect(snapshot.sourceStatus.timestampUnits).toContain("Unknown");
    expect(snapshot.current.events.map(e => e.action)).toEqual(["fold", "raise", "call", "street"]);
    expect(snapshot.current.events[0]).toMatchObject({ actor: { isHero: true, playerId: "PLAYER_ID_C", seat: null }, sourceTimestampRaw: "179147737114700" });
    expect(snapshot.current.events[1]!.actor!.isHero).toBe(false);
    f.advance(); await f.source.tick();
    expect(f.source.snapshot().current.events).toHaveLength(4);
    expect(f.source.snapshot().sourceStatus.lastSuccess).toBe(14000);
    expect(snapshot.current.historyComplete).toBe(false);
    expect(snapshot.sourceStatus.logContractVerified).toBe(false);
  });
  it("fails closed on malformed timestamp text and recovers with the live contract after backoff", async () => {
    const fetchLog = vi.fn().mockResolvedValueOnce(response([{ createdAt: "179147737859100oops", msg: "x" }]))
      .mockResolvedValueOnce(response(liveRows));
    const f = runtime(fetchLog); f.source.accept(message(1)); await f.source.tick();
    expect(f.source.snapshot().sourceStatus.lastSuccess).toBeNull();
    expect(f.source.snapshot().current.events).toEqual([]);
    expect(f.source.snapshot().sourceStatus.historyCoverage).toMatchObject({ status: "incomplete_gap_detected", rejectedBatchCount: 1, sourceFailureCount: 0 });
    f.advance(6000); await f.source.tick();
    expect(f.source.snapshot().sourceStatus.lastSuccess).toBe(16000);
    expect(f.source.snapshot().current.events).toHaveLength(4);
    expect(f.source.snapshot().current.historyComplete).toBe(false);
    expect(f.source.snapshot().sourceStatus.historyCoverage.status).toBe("incomplete_gap_detected");
  });
  it("makes no request until a valid hand identity is observed", async () => {
    const f = runtime(); await f.source.tick();
    f.source.accept({ ...message(1), tableId: "other" }); await f.source.tick();
    expect(f.fetchLog).not.toHaveBeenCalled(); expect(f.source.snapshot().current.historyComplete).toBe(false);
  });
  it("uses only same-origin GET for a complete hand refresh and labels hero events by source ID", async () => {
    const f = runtime(); f.source.accept(message(1)); await f.source.tick();
    expect(f.fetchLog).toHaveBeenCalledWith("/api/games/table/log_v3?hand_number=1", expect.objectContaining({ method: "GET", credentials: "same-origin", cache: "no-store" }));
    const snapshot = f.source.snapshot();
    expect(snapshot.current.events[1]!.actor).toMatchObject({ playerId: "hero", isHero: true, seat: null });
    expect(snapshot.current.historyComplete).toBe(false);
    expect(snapshot.sourceStatus.logContractVerified).toBe(false);
    await f.source.tick(); expect(f.fetchLog).toHaveBeenCalledOnce();
  });
  it("changes hand identity even when hero cards and DOM state could be identical", async () => {
    const f = runtime(); f.source.accept(message(1)); await f.source.tick();
    f.source.accept(message(2, "h2", 2));
    expect(f.source.snapshot().current.handId).toBe("table:hand:h2");
    expect(f.source.snapshot().current.events).toEqual([]);
    expect(f.source.snapshot().archivedHands[0]!.events).toHaveLength(2);
    expect(f.source.snapshot().current.coverage.acceptedBatchCount).toBe(0);
    expect(f.source.snapshot().archivedHands[0]!.coverage.acceptedBatchCount).toBe(1);
    // Refresh previous hand once to seek final settlement; never call it complete.
    f.advance(); await f.source.tick(); expect(f.fetchLog.mock.calls.at(-1)![0]).toContain("hand_number=1");
    f.advance(); await f.source.tick(); expect(f.fetchLog.mock.calls.at(-1)![0]).toContain("hand_number=2");
  });
  it("applies delayed responses to their original hand, never a newer one", async () => {
    let resolve!: (response: Response) => void;
    const fetchLog = vi.fn(() => new Promise<Response>(r => { resolve = r; }));
    const f = runtime(fetchLog); f.source.accept(message(1)); const pending = f.source.tick();
    f.source.accept(message(2, "h2", 2)); resolve(response()); await pending;
    expect(f.source.snapshot().current.events).toEqual([]);
    expect(f.source.snapshot().archivedHands[0]!.events).toHaveLength(2);
    expect(f.source.snapshot().sourceStatus.historyCoverage.acceptedBatchCount).toBe(0);
    expect(f.source.snapshot().archivedHands[0]!.coverage).toMatchObject({ acceptedBatchCount: 1, handStartSeen: true });
  });
  it("retains explicit gaps for skipped hands, disconnected sources and stale bridge messages", async () => {
    const f = runtime(); f.source.accept(message(1)); f.source.accept(message(2, "h4", 4));
    expect(f.source.snapshot().current.reasons.join(" ")).toContain("Hand number jumped");
    f.source.accept(message(3, "h4", 4, false)); await f.source.tick(); expect(f.fetchLog).not.toHaveBeenCalled();
    f.source.accept(message(2)); expect(f.source.snapshot().current.handNumber).toBe(4);
    f.source.accept(message(4, "h3", 3)); expect(f.source.snapshot().sourceStatus.connected).toBe(false);
  });
  it.each(["HTTP", "malformed", "network"])("fails closed with bounded retries on %s failure", async failure => {
    const fetchLog = vi.fn(async () => { if (failure === "network") throw new Error("offline"); return failure === "HTTP" ? response({}, 403) : response({ unsupported: true }); });
    const f = runtime(fetchLog); f.source.accept(message(1)); await f.source.tick();
    expect(f.source.snapshot().current.historyComplete).toBe(false);
    expect(f.source.snapshot().current.reasons.join(" ")).toContain("Log source failure");
    expect(f.source.snapshot().sourceStatus.historyCoverage.status).toBe("incomplete_gap_detected");
    expect(f.source.snapshot().sourceStatus.historyCoverage.sourceFailureCount).toBe(failure === "malformed" ? 0 : 1);
    expect(f.source.snapshot().sourceStatus.historyCoverage.rejectedBatchCount).toBe(failure === "malformed" ? 1 : 0);
    f.advance(1000); await f.source.tick(); expect(fetchLog).toHaveBeenCalledOnce();
  });
  it("bounds archived hands and rejects conflicting hand IDs/numbers", () => {
    const f = runtime(); for (let n = 1; n <= 10; n++) f.source.accept(message(n, `h${n}`, n));
    expect(f.source.snapshot().archivedHands).toHaveLength(3);
    f.source.accept(message(11, "h10", 11)); expect(f.source.snapshot().sourceStatus.connected).toBe(false);
  });
  it("rejects an archived hand ID reused with a later hand number instead of merging two hands", async () => {
    const f = runtime(); f.source.accept(message(1)); await f.source.tick();
    f.source.accept(message(2, "h2", 2));
    f.source.accept(message(3, "h1", 3));
    expect(f.source.snapshot().current.handId).toBe("table:hand:h2");
    expect(f.source.snapshot().current.events).toEqual([]);
    expect(f.source.snapshot().sourceStatus.connected).toBe(false);
    expect(f.source.snapshot().sourceStatus.historyCoverage.issues.map(i => i.code)).toContain("identity_conflict");
    expect(f.source.snapshot().archivedHands[0]!.handNumber).toBe(1);
    expect(f.source.snapshot().archivedHands[0]!.events).toHaveLength(2);
  });
  it("flags an ID change without a number advance while keeping timelines separate", () => {
    const f = runtime(); f.source.accept(message(1)); f.source.accept(message(2, "replacement", 1));
    expect(f.source.snapshot().current.handId).toBe("table:hand:replacement");
    expect(f.source.snapshot().sourceStatus.historyCoverage).toMatchObject({ status: "incomplete_gap_detected", handStartSeen: false });
    expect(f.source.snapshot().archivedHands[0]!.handId).toBe("table:hand:h1");
  });
});

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("observes existing socket messages without changing send, connection arguments or unrelated sockets", async () => {
  vi.resetModules();
  class Socket extends EventTarget {
    static OPEN = 1;
    send = vi.fn();
    constructor(public url: string, public protocols?: string[]) { super(); }
  }
  const postMessage = vi.fn();
  const location = { hostname: "pokernow.com", origin: "https://pokernow.com", pathname: "/games/table", href: "https://pokernow.com/games/table" };
  const win = { WebSocket: Socket, postMessage, addEventListener: vi.fn() };
  vi.stubGlobal("window", win); vi.stubGlobal("location", location);
  await import("../../../apps/pokernow-extension/src/eventSource.js");
  const socket = new win.WebSocket("wss://pokernow.com/socket.io/?gameID=table", ["test"]);
  expect(socket.protocols).toEqual(["test"]); expect(win.WebSocket.OPEN).toBe(1);
  socket.dispatchEvent(new MessageEvent("message", { data: registered() }));
  expect(postMessage.mock.calls.at(-1)![0]).toMatchObject({ identity: { handId: "h1" }, connected: true });
  expect(JSON.stringify(postMessage.mock.calls)).not.toContain("must-not-forward");
  expect(socket.send).not.toHaveBeenCalled();
  const identityMessages = postMessage.mock.calls.filter(call => call[0].type === "identity").length;
  socket.dispatchEvent(new MessageEvent("message", { data: '42["gC",{"pre":100,"now":101}]' }));
  socket.dispatchEvent(new MessageEvent("message", { data: '42["gC",{"pre":101,"now":102,"r":false}]' }));
  const metadataMessages = postMessage.mock.calls.filter(call => call[0].type === "source_metadata");
  expect(metadataMessages).toHaveLength(3);
  expect(metadataMessages.at(-1)![0].metadata.frame.fields).toContainEqual({ path: "pre", type: "number", value: 101 });
  expect(metadataMessages.at(-1)![0].metadata.frame.fields).toContainEqual({ path: "now", type: "number", value: 102 });
  expect(postMessage.mock.calls.filter(call => call[0].type === "identity")).toHaveLength(identityMessages);
  // Ready replays initial/latest sanitized metadata, not a new server sequence.
  const ready = win.addEventListener.mock.calls.find(call => call[0] === "message")![1];
  ready({ source: win, origin: location.origin, data: { channel: TIMELINE_CHANNEL, type: "ready" } });
  expect(postMessage.mock.calls.at(-2)![0]).toMatchObject({ type: "source_metadata", sequence: 1, metadata: { event: "registered" } });
  expect(postMessage.mock.calls.at(-1)![0]).toMatchObject({ type: "source_metadata", sequence: 3 });
  expect(socket.send).not.toHaveBeenCalled();
  const count = postMessage.mock.calls.length;
  const unrelated = new win.WebSocket("wss://other.example/socket.io/?gameID=table");
  unrelated.dispatchEvent(new MessageEvent("message", { data: registered() }));
  expect(postMessage).toHaveBeenCalledTimes(count);
  socket.dispatchEvent(new Event("close")); expect(postMessage.mock.calls.at(-1)![0].connected).toBe(false);
});
