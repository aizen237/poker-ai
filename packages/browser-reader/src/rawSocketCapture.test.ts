import { afterEach, describe, expect, it, vi } from "vitest";
import { installRawSocketCapture, RAW_CAPTURE_KEY, RawSocketCapture } from "../../../apps/pokernow-extension/src/rawSocketCapture.js";

const packet = (event: string, payload: unknown) => "42" + JSON.stringify([event, payload]);
const exported = (capture: RawSocketCapture) => JSON.parse(capture.exportJSON());
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("temporary raw socket capture (synthetic transport tests, not live semantics)", () => {
  it("preserves nested values, array order, unknown control fields and registration identity only", () => {
    const capture = new RawSocketCapture(true);
    const gameState = { players: { b: { cards: [null, ""] }, a: { stack: "100" } }, seats: [3, 1, 2],
      eventsData: [{ action: "unknown", nested: [[2, 1], {}] }], controls: { min: "5", increment: 0.5 } };
    capture.observe(packet("registered", { gameState, currentPlayer: { id: "hero", token: "omit" }, secret: "omit" }), 1, 100);
    capture.observe(packet("gC", gameState), 1, 101);
    capture.observe(packet("rup", { arbitraryFutureField: [false, null, {}, []] }), 1, 102);
    const result = exported(capture);
    expect(result.frames[0]).toEqual({ localReceiveSequence: 1, localReceivedAt: 100, connectionGeneration: 1,
      event: "registered", payload: { gameState, currentPlayer: { id: "hero" } } });
    expect(result.frames[1].payload).toEqual(gameState);
    expect(result.frames[2].payload).toEqual({ arbitraryFutureField: [false, null, {}, []] });
    expect(JSON.stringify(result)).not.toContain("omit");
    expect(result.capture.historyCompletenessProof).toBe(false);
  });

  it("preserves absent/null/empty fields without synthesizing state", () => {
    const capture = new RawSocketCapture(true);
    for (const payload of [{}, { gameState: null, currentPlayer: null }, { gameState: {}, currentPlayer: {} },
      { gameState: { players: [], seats: null }, currentPlayer: { id: "" } }]) {
      capture.observe(packet("registered", payload), 1);
    }
    expect(exported(capture).frames.map((f: any) => f.payload)).toEqual([
      {}, { gameState: null, currentPlayer: null }, { gameState: {}, currentPlayer: {} },
      { gameState: { players: [], seats: null }, currentPlayer: { id: "" } },
    ]);
  });

  it("retains original numeric tokens, string escapes and duplicate keys in serialized evidence", () => {
    const capture = new RawSocketCapture(true);
    const raw = '{"now":9007199254740993,"negative":-0,"exp":1e+02,"text":"a\\\"b,}\\u0061","x":1,"x":2}';
    capture.observe(`42["gC",${raw}]`, 1);
    capture.observe(`42["registered",{"gameState":${raw},"currentPlayer":{"id":"\\u0061"}}]`, 1);
    const json = capture.exportJSON();
    expect(json).toContain(`"payload":${raw}`);
    expect(json).toContain(`"gameState":${raw}`);
    expect(json).toContain('"id":"\\u0061"');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("keeps duplicate and old-generation frames in receive order without merging", () => {
    const capture = new RawSocketCapture(true);
    for (const generation of [1, 1, 2, 1]) capture.observe(packet("gC", { now: 7 }), generation, 10);
    const frames = exported(capture).frames;
    expect(frames.map((f: any) => f.connectionGeneration)).toEqual([1, 1, 2, 1]);
    expect(frames.map((f: any) => f.localReceiveSequence)).toEqual([1, 2, 3, 4]);
  });

  it("stops at frame capacity without evicting registration", () => {
    const capture = new RawSocketCapture(true, { frames: 2, characters: 1000 });
    capture.observe(packet("registered", { gameState: {} }), 1);
    for (let i = 0; i < 20; i++) capture.observe(packet("gC", { i }), 1);
    expect(capture.status()).toMatchObject({ active: false, frameCount: 2, stopReason: "frame_limit", registeredCaptured: true });
    expect(exported(capture).frames[0].event).toBe("registered");
  });

  it("bounds total retained characters and oversized input parsing", () => {
    const capture = new RawSocketCapture(true, { frames: 100, characters: 60 });
    for (let i = 0; i < 20; i++) capture.observe(packet("gC", { text: "1234567890" }), 1);
    expect(capture.status()).toMatchObject({ active: false, stopReason: "buffer_size_limit" });
    expect(capture.status().retainedJsonCharacters).toBeLessThanOrEqual(60);
    expect(capture.status().retainedSourceCharacters).toBeLessThanOrEqual(60);
    const oversized = new RawSocketCapture(true, { frames: 100, characters: 30 });
    oversized.observe(packet("gC", { text: "x".repeat(100) }), 1);
    expect(oversized.status()).toMatchObject({ frameCount: 0, stopReason: "incoming_frame_size_limit" });
    const projected = new RawSocketCapture(true, { frames: 100, characters: 180 });
    for (let i = 0; i < 10; i++) projected.observe(packet("registered", { gameState: {}, excluded: "x".repeat(80) }), 1);
    expect(projected.status()).toMatchObject({ frameCount: 1, stopReason: "buffer_size_limit" });
  });

  it("filters unrelated/binary messages and records malformed rejections", () => {
    const capture = new RawSocketCapture(true);
    for (const data of ["2", "3", packet("chat", { text: "private" }), new ArrayBuffer(1)]) capture.observe(data, 1);
    expect(capture.status()).toMatchObject({ frameCount: 0, rejectedFrames: 0 });
    capture.observe('42["gC",', 1);
    capture.observe('42["rup"]', 1);
    expect(capture.status()).toMatchObject({ frameCount: 0, rejectedFrames: 2 });
    capture.observe(packet("gC", {}), 1);
    expect(exported(capture).frames).toHaveLength(1);
  });

  it("does not impose an object schema on raw update payloads", () => {
    const capture = new RawSocketCapture(true);
    for (const value of [null, [], [2, 1], "", false, 0]) capture.observe(packet("rup", value), 1);
    expect(exported(capture).frames.map((f: any) => f.payload)).toEqual([null, [], [2, 1], "", false, 0]);
  });

  it("is disabled by default; export stops and stays serializable/repeatable", () => {
    const disabled = new RawSocketCapture(false);
    disabled.observe(packet("gC", {}), 1);
    expect(exported(disabled).frames).toEqual([]);
    const capture = new RawSocketCapture(true);
    capture.observe(packet("gC", { x: 1 }), 1);
    const json = capture.exportJSON();
    capture.observe(packet("gC", { x: 2 }), 1);
    expect(capture.exportJSON()).toBe(json);
  });

  it("exposes one export method and disarms per-tab storage on export", () => {
    const storage = new Map([[RAW_CAPTURE_KEY, "1"]]);
    const target: any = { sessionStorage: { getItem: (k: string) => storage.get(k), removeItem: (k: string) => storage.delete(k) } };
    const capture = installRawSocketCapture(target);
    capture.observe(packet("gC", { seats: [2, 1] }), 1);
    const copy = vi.fn();
    copy(target.pokerAIRawCapture.exportJSON());
    expect(JSON.parse(copy.mock.calls[0]![0]).frames[0].payload.seats).toEqual([2, 1]);
    expect(storage.has(RAW_CAPTURE_KEY)).toBe(false);
    expect(target.pokerAIRawCapture.status().active).toBe(false);
  });

  it("works with inaccessible session storage and leaves capture off", () => {
    const target: any = { get sessionStorage() { throw new Error("denied"); } };
    expect(installRawSocketCapture(target).status().active).toBe(false);
    expect(() => target.pokerAIRawCapture.exportJSON()).not.toThrow();
  });

  it("observes only existing matching sockets, with no send/network action or raw bridge messages", async () => {
    class Socket extends EventTarget {
      static instances: Socket[] = [];
      send = vi.fn();
      constructor(public url: string) { super(); Socket.instances.push(this); }
      incoming(data: string) { this.dispatchEvent(new MessageEvent("message", { data })); }
    }
    const target: any = { WebSocket: Socket, sessionStorage: { getItem: () => "1", removeItem: vi.fn() },
      postMessage: vi.fn(), addEventListener: vi.fn() };
    vi.stubGlobal("window", target);
    vi.stubGlobal("location", new URL("https://www.pokernow.club/games/table"));
    await import("../../../apps/pokernow-extension/src/eventSource.js");
    expect(Socket.instances).toHaveLength(0);
    const wrongTable = new target.WebSocket("wss://www.pokernow.club/socket.io/?gameID=other");
    const wrongHost = new target.WebSocket("wss://example.com/socket.io/?gameID=table");
    wrongTable.incoming(packet("gC", { secret: "excluded" }));
    wrongHost.incoming(packet("gC", { secret: "excluded" }));
    const socket = new target.WebSocket("wss://www.pokernow.club/socket.io/?gameID=table");
    socket.incoming(packet("registered", { gameState: { hI: "hand", gN: 1, now: 1, players: { rawOnly: true } }, currentPlayer: { id: "hero" } }));
    socket.incoming(packet("gC", { pre: 1, now: 2, eventsData: [{ privateNestedValue: 42 }] }));
    socket.incoming('42["gC",');
    expect(target.postMessage.mock.calls.at(-1)![0]).toMatchObject({ type: "source_metadata", metadata: null, utgSource: null });
    const next = new target.WebSocket("wss://www.pokernow.club/socket.io/?gameID=table");
    next.incoming(packet("rup", { now: 3 }));
    const result = JSON.parse(target.pokerAIRawCapture.exportJSON());
    expect(result.frames.map((f: any) => f.connectionGeneration)).toEqual([1, 1, 2]);
    expect(result.frames[1].payload.eventsData).toEqual([{ privateNestedValue: 42 }]);
    expect(JSON.stringify(target.postMessage.mock.calls)).not.toContain("privateNestedValue");
    expect(target.postMessage.mock.calls.some((call: any) => call[0].type === "identity")).toBe(true);
    expect(target.postMessage.mock.calls.some((call: any) => call[0].type === "source_metadata")).toBe(true);
    expect(Socket.instances.every(s => s.send.mock.calls.length === 0)).toBe(true);
  });
});
