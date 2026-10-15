import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { createFirstUtgSource, projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";

const capture = JSON.parse(readFileSync(new URL("../../../evidence/hand-53-sixmax-utg-raw-socket.json", import.meta.url), "utf8"));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("production MAIN-world socket bridge to first-UTG runtime", () => {
  it.each(["valid", "false-roster", "dealer", "non-utg", "prior-action", "reconnect", "stale-hand"])("handles %s source evidence without opt-in raw capture", async variant => {
    vi.resetModules();
    const frames = structuredClone(capture.frames);
    const registration = frames[0].payload, start = frames[1].payload;
    const tableId = registration.gameState.id;
    if (variant === "false-roster") start.iHPI.pop();
    if (variant === "dealer") start.dealerID = start.sBPI;
    if (variant === "non-utg") start.cPI = start.pITT = start.sBPI;
    if (variant === "prior-action") start.tB.amlHsejLtc = 2;
    if (variant === "stale-hand") start.hI = registration.gameState.hI;
    let now = frames[0].localReceivedAt;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const runtime = createTimelineRuntime({ tableId, sessionId: "production-bridge", now: () => now,
      fetchLog: vi.fn().mockRejectedValue(new Error("No HTTP needed for this boundary")) });
    class Socket extends EventTarget {
      send = vi.fn();
      constructor(public url: string) { super(); }
      incoming(event: string, payload: unknown) {
        this.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([event, payload]) }));
      }
    }
    const postMessage = vi.fn((message: unknown) => runtime.accept(message));
    const win = { WebSocket: Socket, postMessage, addEventListener: vi.fn(),
      sessionStorage: { getItem: () => null } };
    vi.stubGlobal("window", win);
    vi.stubGlobal("location", new URL(`https://www.pokernow.club/games/${tableId}`));
    await import("../../../apps/pokernow-extension/src/eventSource.js");
    let socket = new win.WebSocket(`wss://www.pokernow.club/socket.io/?gameID=${tableId}`);
    socket.incoming("registered", registration);
    now = frames[1].localReceivedAt;
    if (variant === "reconnect") socket = new win.WebSocket(`wss://www.pokernow.club/socket.io/?gameID=${tableId}`);
    socket.incoming("gC", start);
    const snapshot = runtime.snapshot();
    if (variant === "valid") {
      expect(snapshot.sourceStatus.firstUtg).toMatchObject({ handId: start.hI, heroSeat: 1, generation: 1 });
      expect(snapshot.sourceStatus.firstUtg!.players).toHaveLength(6);
      const messages = postMessage.mock.calls.map(([message]) => message as any).filter(m => m.type === "source_metadata");
      expect(messages[0].utgSource.frame.seats).toEqual(registration.gameState.seats);
      expect(messages[1].utgSource.frame.iHPI).toEqual(start.iHPI);
      expect(Object.keys(messages[1].utgSource.frame.pC)).toEqual(Object.keys(start.pC));
      expect(messages[0].utgSource.heroId).toBe(registration.currentPlayer.id);
      for (const player of Object.values(messages[0].utgSource.frame.players) as any[]) {
        expect(Object.keys(player).sort()).toEqual(["id", "stack", "status"]);
      }
      expect(messages[1].utgSource.frame.pC.amlHsejLtc.cards.every((c: any) => c.value === null)).toBe(true);
      expect(snapshot.sourceStatus.firstUtgEvidence.observations.map(o => o.projection)).toEqual(messages.map(m => m.utgSource));
    } else expect(snapshot.sourceStatus.firstUtg).toBeNull();
    expect(snapshot.current.historyComplete).toBe(false);
    expect(socket.send).not.toHaveBeenCalled();
  });
  it("bounds observational projections without promoting them into state certificates", () => {
    const source = createFirstUtgSource("table", () => 1000);
    for (let i = 1; i <= 110; i++) source.accept({ event: "gC", heroId: "hero", frame: { pre: i, now: i + 1 } }, i, 1, i);
    const audit = source.diagnostic();
    expect(audit.observations).toHaveLength(96);
    expect(audit.droppedObservations).toBe(14);
    expect(audit.retainedCharacters).toBeLessThanOrEqual(300_000);
    expect(source.snapshot()).toBeNull();
    expect(audit.reason).toContain("Discarded pre-registration update");
    audit.observations[0]!.projection!.frame.now = 123456;
    expect(source.diagnostic().observations[0]!.projection!.frame.now).not.toBe(123456);
    expect(audit.historyComplete).toBe(false);
  });
  it("does not retain unrelated settlement payloads or malformed card objects", () => {
    const project = (frame: unknown) => projectFirstUtgSource("42" + JSON.stringify(["gC", frame]), "hero");
    expect(project({ gameResult: { privateResult: "not needed" }, pre: 1, now: 2 })!.frame).toEqual({ pre: 1, now: 2 });
    expect(project({ pC: { other: { privateNestedData: "not a card entry" } } })).toBeNull();
    expect(project({ gameResult: "<D>" })!.frame.gameResult).toBe("<D>");
  });
});
