import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";
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

// Optional local-only raw replay; never prints private packet contents.
const fixture = JSON.parse(readFileSync(process.env.HAND465_RAW_CAPTURE ?? new URL("./fixtures/pokernow-turn-465.json", import.meta.url), "utf8"));
const tableId = fixture.frames[0].payload.gameState.id;
const heroId = fixture.frames[0].payload.currentPlayer.id;
const villainId = fixture.frames[55].payload.dealerID;
// Synthetic matching UI values, NOT an exported checkpoint or captured HTML.
function syntheticRead() {
  const read = JSON.parse(readFileSync(new URL("./fixtures/pokernow-flop-435.json", import.meta.url), "utf8")).checkpoint.read;
  read.raw.boardCards = ["Td", "Th", "3c", "Jd"].map(c => ({ valueText: c[0], suitText: c[1] }));
  read.raw.potMainValueText = "21"; read.raw.potTotalValueText = "25";
  const stacks: Record<number, string> = { 1: "205", 2: "244", 3: "283", 5: "275", 9: "189", 10: "279" };
  for (const seat of read.raw.seats) if (seat.isOccupied) seat.stackText = seat.stackContainerText = stacks[seat.seatNumber];
  read.raw.seats[0].holeCardClassLists[0][1] = "card-c";
  read.raw.seats[0].holeCardClassLists[1][1] = "card-d";
  read.raw.seats[0].holeCardClassLists[1][2] = "card-s-6";
  read.callControl.observedAt = fixture.frames[77].localReceivedAt + 100;
  return read;
}
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
  const runtime = createTimelineRuntime({ tableId: tableId, sessionId: "hand465", now: () => now, fetchLog: vi.fn() });
  let identity: ReturnType<typeof identityFromSocketPacket> = null;
  const trace: any[] = [];
  for (const f of frames) {
    now = f.localReceivedAt;
    const data = wire(f), riverSource = projectRiverObservation(data, identity?.heroPlayerId ?? null);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId: tableId,
      sequence: f.localReceiveSequence, generation: f.connectionGeneration, observedAt: now,
      metadata: inspectSocketMetadata(data), utgSource: projectFirstUtgSource(data, identity?.heroPlayerId ?? null), riverSource });
    identity = identityFromSocketPacket(data, tableId, identity);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: tableId,
      sequence: f.localReceiveSequence, connected: true, identity });
    trace.push({ sequence: f.localReceiveSequence, kind: riverSource?.kind,
      diagnostic: runtime.snapshot().sourceStatus.riverObservationDiagnostic, observation: runtime.snapshot().sourceStatus.riverObservation });
  }
  const read = syntheticRead();
  now = read.callControl.observedAt;
  return { runtime, trace, read, at: (at: number) => { now = at; }, proofs: () =>
    buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), runtime.snapshot(), null, "hand465") };
}

describe("recorded Hand465 complete source replay", () => {
  it("retains all preceding hands and reaches the turn illustration without inserting cPI", () => {
    const r = replay();
    expect(r.trace).toHaveLength(78);
    expect(r.trace.every(t => t.kind !== undefined && t.diagnostic.sequence === t.sequence)).toBe(true);
    expect(r.trace[71].observation).toMatchObject({ street: "flop", collectedPot: 13, payableCall: 4 });
    expect(r.trace.slice(-5).map(t => t.kind)).toEqual(["turn_board_carried_actor", "check", "turn", "bet", "turn"]);
    expect(projectRiverObservation(wire(fixture.frames[73]), heroId)!.source.frame).not.toHaveProperty("cPI");
    expect(r.runtime.snapshot().sourceStatus.riverObservation).toMatchObject({
      street: "turn", handNumber: 465, heroCards: ["Qc", "6d"], board: ["Td", "Th", "3c", "Jd"],
      sequence: 78, generation: 1, heroChecked: true, collectedPot: 21, streetSubtotal: 4,
      grossPotBeforeCall: 25, payableCall: 4, historyComplete: false, liveAuthorized: false,
    });
    const p = r.proofs(), c = p.turnCallFold!.illustration!;
    expect(c).toMatchObject({ status: "conditional", chosenAction: null, llmMayChoose: false, foldEV: 0 });
    expect(c.requiredEquity).toBeCloseTo(4 / 29);
    for (const a of c.assumptions) expect(a.callEV).toBeCloseTo(a.equity * 29 - 4);
    expect(p.activation.allowed).toBe(false);
    for (const scope of ["pot", "eligibility", "accounting", "legalActions", "equity", "rangeInput"])
      expect(p.evidence.proofs.find(p => p.scope === scope)!.status).not.toBe("proven");
  }, 30000);

  it.each(["missing flag", "wrong deletion", "wrong status", "extra nested field", "extra top-level field", "hero",
    "not a new hand", "not settled", "still dealt", "stack changed", "gap", "generation"])(
    "rejects damaged preceding-hand standing-player evidence: %s", fault => {
      const r = replay(frames => {
        const p = frames[1].payload, id = Object.keys(p.players)[0], player = p.players[id];
        if (fault === "missing flag") delete player.sUNH;
        if (fault === "wrong deletion") player.hideAway = false;
        if (fault === "wrong status") player.status = "inGame";
        if (fault === "extra nested field") player.stack = 244;
        if (fault === "extra top-level field") p.directToNexTurn = false;
        if (fault === "hero") p.players = { [heroId]: player };
        if (fault === "not a new hand") { p.hI = frames[0].payload.gameState.hI; p.gN--; }
        if (fault === "not settled") frames[0].payload.gameState.gT = [1, 1];
        if (fault === "still dealt") { p.iHPI.push(id); p.pC[id] = structuredClone(p.pC[heroId]); }
        if (fault === "stack changed") player.stack = 1;
        if (fault === "gap") frames.splice(4, 1);
        if (fault === "generation") frames[4].connectionGeneration++;
      });
      expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
      expect(r.proofs().turnCallFold!.illustration).toBeNull();
    });

  it.each(["missing previous actor", "null previous actor", "contradictory previous actor", "contradictory previous pending actor",
    "missing all actors", "missing pending actor", "wrong pending actor", "null explicit actor", "contradictory explicit actor",
    "extra field", "wrong activation time", "unknown field", "old actor", "wrong pot", "missing pot", "missing debit", "wrong debit",
    "uncleared wager", "unmatched wagers", "changed flop", "duplicate board", "hero card on board", "changed cards", "nonempty responders",
    "unsupported call", "wrong call responders", "call actor", "gap", "predecessor", "generation", "receipt regression", "missing check", "wrong bettor", "missing final actor", "later frame"])(
    "withholds damaged turn evidence: %s", fault => {
      const r = replay(frames => {
        const p = frames[73].payload, previous = frames[71].payload;
        if (fault === "missing previous actor") delete previous.cPI;
        if (fault === "null previous actor") previous.cPI = null;
        if (fault === "contradictory previous actor") previous.cPI = villainId;
        if (fault === "contradictory previous pending actor") previous.pITT = villainId;
        if (fault === "missing all actors") for (const f of frames.slice(0, 74)) delete (f.payload.gameState ?? f.payload).cPI;
        if (fault === "missing pending actor") delete p.pITT;
        if (fault === "wrong pending actor") p.pITT = villainId;
        if (fault === "null explicit actor") p.cPI = null;
        if (fault === "contradictory explicit actor") p.cPI = villainId;
        if (fault === "extra field") p.directToNexTurn = false;
        if (fault === "wrong activation time") p.pASA--;
        if (fault === "unknown field") p.rake = 0;
        if (fault === "old actor") for (const f of frames.slice(73)) f.localReceivedAt += 10_000;
        if (fault === "wrong pot") p.pot--;
        if (fault === "missing pot") delete p.pot;
        if (fault === "missing debit") delete p.players[heroId];
        if (fault === "wrong debit") p.players[villainId].stack++;
        if (fault === "uncleared wager") delete p.tB[heroId];
        if (fault === "unmatched wagers") frames[72].payload.tB[heroId] = 3;
        if (fault === "changed flop") p.oTC["1"][0] = "9s";
        if (fault === "duplicate board") p.oTC["1"][3] = "Td";
        if (fault === "hero card on board") p.oTC["1"][3] = "Qc";
        if (fault === "changed cards") p.pC[heroId] = { cards: [{ value: "Ac", showing: false }, { value: "6d", showing: false }] };
        if (fault === "nonempty responders") p.cRPI = [heroId];
        if (fault === "unsupported call") frames[72].payload.sNA = "UNKNOWN";
        if (fault === "wrong call responders") frames[72].payload.cRPI = [heroId, heroId];
        if (fault === "call actor") frames[72].payload.tB = { [villainId]: 4 };
        if (fault === "gap") frames.splice(72, 1);
        if (fault === "predecessor") p.pre++;
        if (fault === "generation") frames[73].connectionGeneration++;
        if (fault === "receipt regression") frames[73].localReceivedAt = frames[72].localReceivedAt - 1;
        if (fault === "missing check") frames.splice(74, 1);
        if (fault === "wrong bettor") { frames[76].payload.tB = { [heroId]: 4 }; frames[76].payload.cRPI = [heroId]; }
        if (fault === "missing final actor") delete frames[77].payload.cPI;
        if (fault === "later frame") frames.push({ ...structuredClone(frames[77]), localReceiveSequence: 79,
          localReceivedAt: frames[77].localReceivedAt + 1, payload: { pre: frames[77].payload.now, now: frames[77].payload.now + 1,
            sN: frames[77].payload.sN + 1, mEV: 0, fV: "0.1.72", eventsData: [] } });
      });
      expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
      expect(r.proofs().turnCallFold!.illustration).toBeNull();
      expect(r.proofs().activation.allowed).toBe(false);
    });

  it.each([false, true, null, 0, "false"])("does not accept a flag added to the omitted-actor shape: %s", value => {
    const r = replay(frames => { frames[73].payload.bigBlindCheck = value; });
    expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
  });

  it("keeps explicit-actor paid turn flag requirements and unrelated omission boundaries", () => {
    const f = structuredClone(fixture.frames[73]); f.payload.cPI = heroId;
    expect(projectRiverObservation(wire(f), heroId)?.kind).toBe("other");
    f.payload.bigBlindCheck = false;
    expect(projectRiverObservation(wire(f), heroId)?.kind).toBe("turn_board");
    for (const index of [1, 3]) {
      const other = structuredClone(fixture.frames[73]); other.payload.gT = [1, index];
      expect(projectRiverObservation(wire(other), heroId)?.kind).toBe("other");
    }
    for (const index of [67, 71, 75, 77]) {
      const other = structuredClone(fixture.frames[index]); delete other.payload.cPI;
      expect(projectRiverObservation(wire(other), heroId)?.kind).toBe("other");
    }
    const explicit = replay(frames => { frames[73].payload.cPI = heroId; frames[73].payload.bigBlindCheck = false; });
    expect(explicit.runtime.snapshot().sourceStatus.riverObservation).toMatchObject({ street: "turn", payableCall: 4 });
  });

  it.each(["board", "hero", "hand", "opponent", "stack", "pot", "call", "disabled", "future control", "expiry", "disconnect", "returns"])(
    "preserves downstream identity and safety gates: %s", fault => {
      const r = replay();
      expect(r.runtime.snapshot().sourceStatus.riverObservation).not.toBeNull();
      if (fault === "board") r.read.raw.boardCards[3].valueText = "A";
      if (fault === "hero") r.runtime.snapshot().sourceStatus.identity!.heroPlayerId = villainId;
      if (fault === "hand") r.runtime.snapshot().sourceStatus.identity!.handId = "wrong";
      if (fault === "opponent") r.read.raw.seats[1].statusClasses = ["table-player", "table-player-2"];
      if (fault === "stack") r.read.raw.seats[0].stackText = "206";
      if (fault === "pot") r.read.raw.potTotalValueText = "29";
      if (fault === "call") r.read.callControl.amountChips = 5;
      if (fault === "disabled") r.read.callControl.enabled = false;
      if (fault === "future control") r.read.callControl.observedAt++;
      if (fault === "expiry") r.at(fixture.frames[77].localReceivedAt + 10_000);
      if (fault === "disconnect") r.runtime.stop("disconnect");
      if (fault === "returns") r.runtime.snapshot().current.events.push({ action: "uncalled_return" } as any);
      expect(r.proofs().turnCallFold!.illustration).toBeNull();
      expect(r.proofs().activation.allowed).toBe(false);
    });
  it.each(["source", "bundle"])("replays MAIN %s -> reducer -> synthetic matching DOM -> proofs -> production overlay", async mode => {
    vi.resetModules();
    let now = fixture.frames[0].localReceivedAt;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const runtime = createTimelineRuntime({ tableId: tableId, sessionId: "overlay465", now: () => now, fetchLog: vi.fn() });
    mocks.timeline = { ...runtime, tick() {} };
    const location = new URL(`https://www.pokernow.com/games/${tableId}`);
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
    if (mode === "bundle") runInThisContext(readFileSync(new URL("../../../apps/pokernow-extension/eventSource.js", import.meta.url), "utf8"));
    else await import("../../../apps/pokernow-extension/src/eventSource.js");
    const socket = new win.WebSocket(`wss://www.pokernow.com/socket.io/?gameID=${tableId}`);
    for (const f of fixture.frames) {
      now = f.localReceivedAt; socket.dispatchEvent(new MessageEvent("message", { data: wire(f) }));
    }
    const messages = postMessage.mock.calls.map(([m]) => m as any).filter(m => m.type === "source_metadata");
    expect(messages).toHaveLength(78);
    expect(messages.every(m => m.riverSource !== null)).toBe(true);
    expect(messages[73].riverSource.kind).toBe("turn_board_carried_actor");
    expect(messages[73].riverSource.source.frame).not.toHaveProperty("cPI");
    expect(runtime.snapshot().sourceStatus.riverObservation).not.toBeNull();
    const { raw, context, callControl } = syntheticRead();
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
    expect(overlay()).toContain("WAITING FOR PROOF");
    for (const label of ["Estimated turn equity", "CALL EV", "FOLD EV 0", "Required equity: 13.79%", "ILLUSTRATIVE ONLY"])
      expect(overlay()).toContain(label);
    expect(overlay()).toContain("Collected 21 + current bet 4 = 25 chips before CALL; payable CALL 4.");
    expect(overlay()).not.toContain("RECOMMENDATION AVAILABLE");
    now = fixture.frames[77].localReceivedAt + 10_000;
    for (const fn of [...deadlines.values()]) fn();
    intervals.get(250)!(); intervals.get(1000)!();
    expect(overlay()).not.toContain("CALL EV");
    expect(runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    expect(socket.send).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  }, 30000);
});
