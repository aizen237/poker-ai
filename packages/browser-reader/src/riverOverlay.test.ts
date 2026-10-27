import { afterEach, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import type { LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";
import { readCallControl } from "../../../apps/pokernow-extension/src/callControlRead.js";
import { readFileSync } from "node:fs";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { projectRiverObservation } from "../../../apps/pokernow-extension/src/riverObservation.js";
import { projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";

const mocks = vi.hoisted(() => ({ read: vi.fn(), timeline: null as any }));
vi.mock("../../../apps/pokernow-extension/src/liveTimeline.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../apps/pokernow-extension/src/liveTimeline.js")>();
  return { ...actual, startLiveTimeline: () => mocks.timeline ?? actual.startLiveTimeline() };
});
vi.mock("../../../apps/pokernow-extension/src/tableRead.js", () => ({ readLiveTable: mocks.read }));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({
  createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }),
}));
afterEach(() => { mocks.timeline = null; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it.each(["expiry", "disconnect", "call", "board", "read failure"])("hand406 numbers reach the overlay and disappear on %s without a relay request", async invalidation => {
  vi.resetModules();
  const fixture = JSON.parse(readFileSync(new URL("./fixtures/pokernow-river-406.json", import.meta.url), "utf8"));
  let now = fixture.frames[0].localReceivedAt;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const runtime = createTimelineRuntime({ tableId: "river-table", sessionId: "overlay", now: () => now, fetchLog: vi.fn() });
  let identity: ReturnType<typeof identityFromSocketPacket> = null;
  for (const f of fixture.frames) {
    now = f.localReceivedAt;
    const wire = "42" + JSON.stringify([f.event, f.payload]);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId: "river-table", sequence: f.localReceiveSequence,
      generation: f.connectionGeneration, observedAt: now, metadata: inspectSocketMetadata(wire),
      utgSource: projectFirstUtgSource(wire, identity?.heroPlayerId ?? null), riverSource: projectRiverObservation(wire, identity?.heroPlayerId ?? null) });
    identity = identityFromSocketPacket(wire, "river-table", identity);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "river-table", sequence: f.localReceiveSequence, connected: true, identity });
  }
  // Simulated within-window UI read. The original saved read remains expired.
  now += 100;
  const read = fixture.read as LiveTableRead; read.callControl!.observedAt = now;
  mocks.read.mockReturnValue(read);
  mocks.timeline = { ...runtime, tick() {} };
  const { document } = parseHTML("<html><body></body></html>");
  const location = { origin: "https://pokernow.com", pathname: "/games/river-table", href: "https://pokernow.com/games/river-table" };
  const intervals = new Map<number, () => void>();
  let deadline = () => {};
  vi.stubGlobal("document", document); vi.stubGlobal("location", location);
  vi.stubGlobal("window", { location, setTimeout: (callback: () => void) => { deadline = callback; return 1; }, clearTimeout() {} });
  vi.stubGlobal("localStorage", { getItem: () => null });
  vi.stubGlobal("setInterval", (callback: () => void, ms: number) => { intervals.set(ms, callback); return 1; });
  vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  intervals.get(1000)!();
  const overlay = () => document.getElementById("poker-ai-reader-overlay")!.textContent!;
  expect(overlay()).toContain("ILLUSTRATIVE ONLY");
  expect(overlay()).toContain("Required equity: 33.33%");
  expect(overlay()).toContain("CALL EV");
  expect(overlay()).toContain("FOLD EV 0");
  expect(overlay()).toContain("unproven");
  expect(overlay()).not.toContain("RECOMMENDATION AVAILABLE");
  expect(overlay()).not.toContain("Confidence:");
  if (invalidation === "expiry") { now = runtime.snapshot().sourceStatus.riverObservation!.expiresAt; deadline(); }
  if (invalidation === "disconnect") runtime.stop("disconnect");
  if (invalidation === "call") read.callControl!.amountChips = 13;
  if (invalidation === "board") read.raw.boardCards[4]!.valueText = "7";
  if (invalidation === "read failure") mocks.read.mockImplementation(() => { throw new Error("DOM failed"); });
  intervals.get(250)!();
  expect(overlay()).not.toContain("Required equity:");
  expect(overlay()).not.toContain("CALL EV");
  intervals.get(1000)!();
  expect(overlay()).not.toContain("Required equity:");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("shows precise river abstention in the actual overlay, detects CALL-only changes, and never asks the relay for an action", async () => {
  vi.resetModules();
  const { document } = parseHTML('<html><body><button type="button">Call 4</button></body></html>');
  const location = { origin: "https://pokernow.com", pathname: "/games/test", href: "https://pokernow.com/games/test" };
  vi.stubGlobal("document", document); vi.stubGlobal("location", location); vi.stubGlobal("window", { location });
  vi.stubGlobal("localStorage", { getItem: () => null });
  let poll = () => {};
  vi.stubGlobal("setInterval", (callback: () => void) => { poll = callback; return 1; });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const read: LiveTableRead = {
    raw: { potMainValueText: "10", potTotalValueText: "14",
      boardCards: ["2s", "7h", "9d", "Jc", "Qc"].map(c => ({ valueText: c[0]!, suitText: c[1]! })),
      seats: [
        { seatNumber: 1, isOccupied: true, isYou: true, playerNameText: "Hero", stackText: "40",
          statusClasses: ["decision-current"], betValueText: "0",
          holeCardClassLists: [["flipped", "card-h", "card-s-A"], ["flipped", "card-d", "card-s-A"]] },
        { seatNumber: 2, isOccupied: true, isYou: false, playerNameText: "Opponent", stackText: "40",
          statusClasses: [], betValueText: "4", holeCardClassLists: [] },
      ] },
    context: { blindTexts: ["1", "2"], dealerSeatNumber: 1, readErrors: [] },
    callControl: readCallControl(document, () => true),
  } as LiveTableRead; // Entire surrounding table is a deterministic synthetic fixture.
  mocks.read.mockReturnValue(read);
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  const overlay = () => document.getElementById("poker-ai-reader-overlay")!.textContent!;
  poll();
  expect(overlay()).toContain("River CALL vs FOLD withheld.");
  expect(overlay()).toContain("RAISE not evaluated.");
  expect(overlay()).toContain("contestability");
  expect(overlay()).toContain("No validated river source activation");
  expect(overlay()).not.toContain("Confidence:");
  expect(overlay()).not.toContain("Required equity:");
  read.callControl!.amountChips = 5;
  poll();
  expect(overlay()).toContain("UNSAFE");
  expect(overlay()).toContain("CALL amount contradicts");
  expect(fetchMock).not.toHaveBeenCalled();
  // Expiry of the control alone invalidates its diagnostic readiness.
  read.callControl!.amountChips = 4;
  poll();
  vi.spyOn(Date, "now").mockReturnValue(read.callControl!.observedAt + 10000);
  poll();
  expect(overlay()).toContain("stale");
  expect(fetchMock).not.toHaveBeenCalled();
  // A subsequent failed read clears the prior river display through the existing path.
  mocks.read.mockImplementation(() => { throw new Error("DOM changed mid-read"); });
  poll();
  expect(overlay()).toContain("BLOCKED");
  expect(overlay()).not.toContain("River CALL vs FOLD withheld.");
});
