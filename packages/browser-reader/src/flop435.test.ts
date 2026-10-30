import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { projectRiverObservation } from "../../../apps/pokernow-extension/src/riverObservation.js";
import { projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { buildLiveDecisionProofs } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { readLiveTable } from "../../../apps/pokernow-extension/src/tableRead.js";
import { assessLiveState } from "./liveState.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/pokernow-flop-435.json", import.meta.url), "utf8"));
const mocks = vi.hoisted(() => ({ timeline: null as any }));
vi.mock("../../../apps/pokernow-extension/src/liveTimeline.js", async original => ({
  ...await original<typeof import("../../../apps/pokernow-extension/src/liveTimeline.js")>(),
  startLiveTimeline: () => mocks.timeline,
}));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({
  createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }),
}));
afterEach(() => { mocks.timeline = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const wire = (f: any) => "42" + JSON.stringify([f.event, f.payload]);

function replay(mutate: (frames: any[]) => void = () => {}) {
  const frames = structuredClone(fixture.frames); mutate(frames);
  let now = frames[0].localReceivedAt;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const runtime = createTimelineRuntime({ tableId: "flop-table", sessionId: "hand435", now: () => now, fetchLog: vi.fn() });
  let identity: ReturnType<typeof identityFromSocketPacket> = null;
  const trace: any[] = [];
  for (const f of frames) {
    now = f.localReceivedAt;
    const data = wire(f), riverSource = projectRiverObservation(data, identity?.heroPlayerId ?? null);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId: "flop-table",
      sequence: f.localReceiveSequence, generation: f.connectionGeneration, observedAt: now,
      metadata: inspectSocketMetadata(data), utgSource: projectFirstUtgSource(data, identity?.heroPlayerId ?? null), riverSource });
    identity = identityFromSocketPacket(data, "flop-table", identity);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "flop-table",
      sequence: f.localReceiveSequence, connected: true, identity });
    trace.push({ sequence: f.localReceiveSequence, kind: riverSource?.kind,
      diagnostic: runtime.snapshot().sourceStatus.riverObservationDiagnostic });
  }
  const read = structuredClone(fixture.checkpoint.read);
  now = read.callControl.observedAt;
  return { runtime, trace, read, at: (at: number) => { now = at; }, proofs: () =>
    buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), runtime.snapshot(), null, "hand435") };
}

describe("recorded hand435 flop recognition", () => {
  it("retains source continuity across the recorded hands preceding Hand459 without inventing a checkpoint", () => {
    const recorded = JSON.parse(readFileSync(new URL("./fixtures/pokernow-flop-459.json", import.meta.url), "utf8"));
    let now = recorded.frames[0].localReceivedAt;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const runtime = createTimelineRuntime({ tableId: "flop-table", sessionId: "hand459", now: () => now, fetchLog: vi.fn() });
    let identity: ReturnType<typeof identityFromSocketPacket> = null;
    const kinds: (string | undefined)[] = [];
    for (const f of recorded.frames) {
      now = f.localReceivedAt;
      const data = wire(f), riverSource = projectRiverObservation(data, identity?.heroPlayerId ?? null);
      kinds.push(riverSource?.kind);
      runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId: "flop-table",
        sequence: f.localReceiveSequence, generation: f.connectionGeneration, observedAt: now,
        metadata: inspectSocketMetadata(data), utgSource: projectFirstUtgSource(data, identity?.heroPlayerId ?? null), riverSource });
      identity = identityFromSocketPacket(data, "flop-table", identity);
      runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "flop-table",
        sequence: f.localReceiveSequence, connected: true, identity });
    }
    expect(recorded.capture).toEqual({ frameCount: 77, checkpointCount: 0, rejectedFrames: 0, registeredCaptured: true });
    expect(Object.hasOwn(recorded.frames[72].payload, "bigBlindCheck")).toBe(false);
    expect(kinds.slice(-5)).toEqual(["flop_board", "check", "turn", "bet", "turn"]);
    const bettor = Object.keys(recorded.frames[75].payload.tB)[0];
    expect(recorded.frames[60].payload.dealerID).toBe(bettor);
    expect(runtime.snapshot().sourceStatus.riverObservation).toMatchObject({
      street: "flop", handNumber: 459, heroCards: ["Ts", "5d"], board: ["9s", "3h", "8s"],
      sequence: 77, generation: 1, heroChecked: true, collectedPot: 13, streetSubtotal: 4,
      grossPotBeforeCall: 17, payableCall: 4, receivedAt: 1793321840958, expiresAt: 1793321850958,
      historyComplete: false, liveAuthorized: false,
    });
    // Source-only capture: deliberately no invented DOM read, illustration or paired checkpoint.
    now += 10_000;
    expect(runtime.snapshot().sourceStatus.riverObservation).toBeNull();
  });

  it("recognizes the missing-flag deal and all 62 production projections", () => {
    const r = replay();
    expect(r.trace.every(t => t.kind !== undefined)).toBe(true);
    expect(r.trace.slice(-5).map(t => t.kind)).toEqual(["flop_board", "check", "turn", "bet", "turn"]);
    expect(r.runtime.snapshot().sourceStatus.riverObservation, JSON.stringify(r.trace.slice(-5))).toMatchObject({
      street: "flop", handNumber: 435, heroCards: ["Qh", "Ac"], board: ["2s", "4d", "9c"],
      sequence: 62, generation: 1, heroChecked: true, collectedPot: 13, streetSubtotal: 4,
      grossPotBeforeCall: 17, payableCall: 4, receivedAt: 1793210999261, expiresAt: 1793211009261,
      historyComplete: false, liveAuthorized: false,
    });
    expect(Object.hasOwn(fixture.frames[57].payload, "bigBlindCheck")).toBe(false);
    expect(fixture.capture).toMatchObject({ frameCount: 62, rejectedFrames: 0, registeredCaptured: true });
    expect(fixture.checkpoint).toMatchObject({ observationPaired: true, epochStatus: "observed_matching", reasons: [] });
  });

  it("calculates at the recorded paired checkpoint and rejects the later recorded diagnostic", () => {
    const r = replay(), p = r.proofs(), c = p.flopCallFold!.illustration!;
    expect(c).not.toBeNull();
    expect(c).toMatchObject({ status: "conditional", chosenAction: null, llmMayChoose: false, foldEV: 0 });
    expect(c.requiredEquity).toBeCloseTo(4 / 21);
    for (const a of c.assumptions) {
      expect(a.equity).toBeGreaterThanOrEqual(0); expect(a.equity).toBeLessThanOrEqual(1);
      expect(a.callEV).toBeCloseTo(a.equity * 21 - 4);
    }
    expect(p.activation.allowed).toBe(false);
    for (const scope of ["pot", "eligibility", "accounting", "legalActions", "equity", "rangeInput"])
      expect(p.evidence.proofs.find(p => p.scope === scope)!.status).not.toBe("proven");
    const expiry = p.flopCallFold!.binding!.expiresAt;
    expect(fixture.diagnostic.read.callControl.observedAt - expiry).toBe(200);
    r.at(fixture.diagnostic.read.callControl.observedAt);
    Object.assign(r.read, structuredClone(fixture.diagnostic.read));
    expect(r.proofs().flopCallFold!.illustration).toBeNull();
    expect(r.runtime.snapshot().sourceStatus.riverObservationDiagnostic.reason).toContain("expired");
  }, 30000);

  it.each([false, true, null, 0, "false"])("accepts only explicit false when the flag is present: %s", value => {
    const r = replay(frames => { frames[57].payload.bigBlindCheck = value; });
    expect(r.runtime.snapshot().sourceStatus.riverObservation !== null).toBe(value === false);
  });

  it.each([2, 3])("does not generalize the omitted flag to street index %s", index => {
    const f = structuredClone(fixture.frames[57]); f.payload.gT = [1, index];
    expect(projectRiverObservation(wire(f), "player1")?.kind).toBe("other");
    f.payload.bigBlindCheck = false;
    expect(projectRiverObservation(wire(f), "player1")?.kind).toBe(index === 2 ? "turn_board" : "river");
  });

  it.each(["missing pot", "pot too small", "missing stack debit", "wrong stack debit", "uncleared wager",
    "missing board", "duplicate board", "hero card on board", "wrong street", "wrong actor", "pending actor",
    "wrong pASA", "nonempty responders", "nonzero cHB", "negative mR", "negative mAVTB",
    "extra known field", "unknown field", "nested mutation", "description mutation", "missing frame",
    "reordered frames", "predecessor", "generation", "receipt regression", "unsupported check",
    "wrong bettor", "all-in bet", "nonempty events", "wrong version", "later update"])("withholds damaged source: %s", fault => {
    const r = replay(frames => {
      const p = frames[57].payload;
      if (fault === "missing pot") delete p.pot;
      if (fault === "pot too small") p.pot--;
      if (fault === "missing stack debit") delete p.players.player1;
      if (fault === "wrong stack debit") p.players.player3.stack++;
      if (fault === "uncleared wager") delete p.tB.player9;
      if (fault === "missing board") delete p.oTC;
      if (fault === "duplicate board") p.oTC["1"][2] = "2s";
      if (fault === "hero card on board") p.oTC["1"][2] = "Ac";
      if (fault === "wrong street") p.gT = [1, 2];
      if (fault === "wrong actor") p.cPI = p.pITT = "player2";
      if (fault === "pending actor") p.pITT = null;
      if (fault === "wrong pASA") p.pASA--;
      if (fault === "nonempty responders") p.cRPI = ["player1"];
      if (fault === "nonzero cHB") p.cHB = 1;
      if (fault === "negative mR") p.mR = -1;
      if (fault === "negative mAVTB") p.mAVTB = -1;
      if (fault === "extra known field") p.directToNexTurn = false;
      if (fault === "unknown field") p.rake = 1;
      if (fault === "nested mutation") p.players.player1.returned = 1;
      if (fault === "description mutation") p.pC.player1.unknown = null;
      if (fault === "missing frame") frames.splice(59, 1);
      if (fault === "reordered frames") [frames[58], frames[59]] = [frames[59], frames[58]];
      if (fault === "predecessor") p.pre++;
      if (fault === "generation") frames[60].connectionGeneration++;
      if (fault === "receipt regression") frames[60].localReceivedAt = frames[59].localReceivedAt - 1;
      if (fault === "unsupported check") frames[58].payload.tB.player1 = 0;
      if (fault === "wrong bettor") {
        frames[60].payload.tB = { player1: 4 }; frames[60].payload.cRPI = ["player1"];
      }
      if (fault === "all-in bet") {
        frames[60].payload.tB.player3 = 251; frames[60].payload.cHB = 251;
      }
      if (fault === "nonempty events") p.eventsData = [{}];
      if (fault === "wrong version") p.fV = "0.1.73";
      if (fault === "later update") frames.push({ ...structuredClone(frames[61]), localReceiveSequence: 63,
        localReceivedAt: frames[61].localReceivedAt + 1, payload: { pre: frames[61].payload.now,
          now: frames[61].payload.now + 1, sN: frames[61].payload.sN + 1, mEV: 0, fV: "0.1.72", eventsData: [] } });
    });
    expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    expect(r.proofs().flopCallFold!.illustration).toBeNull();
    expect(r.proofs().activation.allowed).toBe(false);
  });

  it.each(["pot", "stack", "board", "roster", "call", "disabled", "future control", "returns", "disconnect", "expiry"])(
    "preserves downstream rejection: %s", fault => {
      const r = replay();
      expect(r.runtime.snapshot().sourceStatus.riverObservation).not.toBeNull();
      if (fault === "pot") r.read.raw.potTotalValueText = "21";
      if (fault === "stack") r.read.raw.seats[0].stackText = "239";
      if (fault === "board") r.read.raw.boardCards[0].valueText = "3";
      if (fault === "roster") r.read.raw.seats[1].statusClasses = ["table-player", "table-player-2"];
      if (fault === "call") r.read.callControl.amountChips = 5;
      if (fault === "disabled") r.read.callControl.enabled = false;
      if (fault === "future control") r.read.callControl.observedAt++;
      if (fault === "returns") r.runtime.snapshot().current.events.push({ action: "uncalled_return" } as any);
      if (fault === "disconnect") r.runtime.stop("Disconnected");
      if (fault === "expiry") r.at(fixture.frames[61].localReceivedAt + 10_000);
      expect(r.proofs().flopCallFold!.illustration).toBeNull();
      expect(r.proofs().activation.allowed).toBe(false);
    });

  it("replays MAIN socket observer -> reducer -> recorded DOM values -> proofs -> production overlay", async () => {
    vi.resetModules();
    let now = fixture.frames[0].localReceivedAt;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const runtime = createTimelineRuntime({ tableId: "flop-table", sessionId: "overlay435", now: () => now, fetchLog: vi.fn() });
    mocks.timeline = { ...runtime, tick() {} };
    const location = new URL("https://www.pokernow.com/games/flop-table");
    class Socket extends EventTarget {
      send = vi.fn();
      constructor(public url: string) { super(); }
    }
    const intervals = new Map<number, () => void>(), deadlines = new Map<number, () => void>();
    let timer = 0;
    const postMessage = vi.fn((message: unknown) => runtime.accept(message));
    const win = { WebSocket: Socket, location, postMessage, addEventListener() {}, sessionStorage: { getItem: () => null },
      setTimeout: (fn: () => void) => { deadlines.set(++timer, fn); return timer; },
      clearTimeout: (id: number) => deadlines.delete(id) };
    vi.stubGlobal("window", win); vi.stubGlobal("location", location);
    await import("../../../apps/pokernow-extension/src/eventSource.js");
    const socket = new win.WebSocket("wss://www.pokernow.com/socket.io/?gameID=flop-table");
    for (const f of fixture.frames) {
      now = f.localReceivedAt; socket.dispatchEvent(new MessageEvent("message", { data: wire(f) }));
    }
    const messages = postMessage.mock.calls.map(([m]) => m as any).filter(m => m.type === "source_metadata");
    expect(messages).toHaveLength(62);
    expect(messages[57].riverSource.kind).toBe("flop_board");
    // The separate historical first-UTG/flop recognizer remains unsupported.
    expect(messages[57].utgSource).toBeNull();
    expect(messages[0].riverSource.source.frame.players.player1.name).toBeUndefined();
    expect(runtime.snapshot().sourceStatus.flopObservationProof).toBeNull();
    expect(runtime.snapshot().sourceStatus.riverObservation).not.toBeNull();

    // Reconstructed markup from the recorded raw read, not a saved HTML page.
    const { raw, context, callControl } = fixture.checkpoint.read;
    const { document } = parseHTML(`<html><body>
      <div class="table-cards">${raw.boardCards.map((c: any) => `<div class="card-container card-${c.suitText} card-s-${c.valueText} flipped"><span class="value">${c.valueText}</span><span class="suit">${c.suitText}</span></div>`).join("")}</div>
      <div class="table-pot-size"><div class="main-value"><span class="normal-value">${raw.potMainValueText}</span></div><div class="add-on-container"><span class="normal-value">${raw.potTotalValueText}</span></div></div>
      ${context.blindTexts.map((v: string) => `<div class="blind-value"><div class="chips-value"><span class="normal-value">${v}</span></div></div>`).join("")}
      <div class="dealer-position-${context.dealerSeatNumber}"></div>
      ${raw.seats.filter((s: any) => s.isOccupied).map((s: any) => `<div class="${s.statusClasses.join(" ")}"><div class="table-player-name"><a>${s.playerNameText}</a></div><div class="table-player-stack"><span class="normal-value">${s.stackText}</span></div><div class="table-player-cards">${s.holeCardClassLists.map((c: string[]) => `<div class="${c.join(" ")}"></div>`).join("")}</div>${s.betValueText === null ? "" : `<div class="table-player-bet-value">${s.betValueText}</div>`}</div>`).join("")}
      <button type="button">${callControl.rawText}</button></body></html>`);
    document.querySelector("button")!.getBoundingClientRect = () => ({ width: 30, height: 20 } as DOMRect);
    vi.stubGlobal("document", document);
    vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible" }));
    vi.stubGlobal("setInterval", (fn: () => void, ms: number) => { intervals.set(ms, fn); return 1; });
    vi.stubGlobal("localStorage", { getItem: () => null });
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    for (const method of ["log", "warn", "error"] as const) vi.spyOn(console, method).mockImplementation(() => {});
    now = callControl.observedAt;
    const read = readLiveTable();
    expect(read.raw).toEqual(raw); expect(read.context).toEqual(context); expect(read.callControl).toEqual(callControl);
    expect(assessLiveState(read.raw, read.context).positions.get(1)).toBe("HJ");
    expect(assessLiveState(read.raw, read.context).positions.get(3)).toBe("BTN");
    await import("../../../apps/pokernow-extension/src/contentScript.js");
    intervals.get(1000)!();
    const overlay = () => document.getElementById("poker-ai-reader-overlay")!.textContent!;
    for (const label of ["Estimated flop equity", "CALL EV", "FOLD EV 0", "Required equity: 19.05%", "ILLUSTRATIVE ONLY", "WAITING FOR PROOF"])
      expect(overlay()).toContain(label);
    expect(overlay()).toContain("Collected 13 + current bet 4 = 17 chips before CALL; payable CALL 4.");
    expect(overlay()).not.toContain("RECOMMENDATION AVAILABLE");
    now = fixture.frames[61].localReceivedAt + 10_000;
    for (const fn of [...deadlines.values()]) fn();
    intervals.get(250)!(); intervals.get(1000)!();
    expect(overlay()).not.toContain("CALL EV");
    expect(runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    expect(socket.send).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  }, 30000);
});
