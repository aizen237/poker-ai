import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { buildLiveDecisionProofs } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { readLiveTable } from "../../../apps/pokernow-extension/src/tableRead.js";
import { assessLiveState } from "./liveState.js";

const mocks = vi.hoisted(() => ({ timeline: null as any }));
vi.mock("../../../apps/pokernow-extension/src/liveTimeline.js", async original => ({
  ...await original<typeof import("../../../apps/pokernow-extension/src/liveTimeline.js")>(),
  startLiveTimeline: () => mocks.timeline,
}));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({
  createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }),
}));
afterEach(() => { mocks.timeline = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// Original full capture with identity/profile substitutions only. Optional private
// replay reads the raw file directly and never logs packet contents.
const fixture = JSON.parse(readFileSync(process.env.HAND477_RAW_CAPTURE ?? new URL("./fixtures/pokernow-turn-477.json", import.meta.url), "utf8"));
const heroId = fixture.frames[0].payload.currentPlayer.id;
const villainId = fixture.frames[38].payload.cRPI[0];
async function replay(mode: "source" | "bundle" = "source", mutate: (frames: any[]) => void = () => {},
  processingDelay?: { sequence: number; ms: number }, mutateEnvelope: (message: any) => void = () => {}) {
  vi.resetModules();
  const f = structuredClone(fixture); mutate(f.frames); const tableId = f.frames[0].payload.gameState.id;
  let now = f.frames[0].localReceivedAt;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const runtime = createTimelineRuntime({ tableId, sessionId: "turn477", now: () => now, fetchLog: vi.fn() });
  mocks.timeline = { ...runtime, tick() {} };
  const location = new URL(`https://www.pokernow.com/games/${tableId}`);
  class Socket extends EventTarget {
    send = vi.fn();
    constructor(public url: string) { super(); }
  }
  const intervals = new Map<number, () => void>(), deadlines = new Map<number, () => void>();
  let timer = 0;
  const postMessage = vi.fn((message: any) => {
    mutateEnvelope(message);
    if (message.type === "source_metadata" && message.sequence === processingDelay?.sequence) now += processingDelay.ms;
    runtime.accept(message);
  });
  const win = { WebSocket: Socket, location, postMessage, addEventListener() {}, sessionStorage: { getItem: () => null },
    setTimeout: (fn: () => void) => { deadlines.set(++timer, fn); return timer; },
    clearTimeout: (id: number) => deadlines.delete(id) };
  vi.stubGlobal("window", win); vi.stubGlobal("location", location);
  if (mode === "bundle") runInThisContext(readFileSync(new URL("../../../apps/pokernow-extension/eventSource.js", import.meta.url), "utf8"));
  else await import("../../../apps/pokernow-extension/src/eventSource.js");
  const socket = new win.WebSocket(`wss://www.pokernow.com/socket.io/?gameID=${tableId}`);
  const trace: any[] = [];
  for (const frame of f.frames) {
    now = frame.localReceivedAt;
    socket.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([frame.event, frame.payload]) }));
    trace.push(structuredClone(runtime.snapshot().sourceStatus));
  }
  const messages = postMessage.mock.calls.map(([m]) => m as any).filter(m => m.type === "source_metadata");
  return { runtime, trace, messages, intervals, socket, at: (at: number) => { now = at; } };
}

async function bind(r: Awaited<ReturnType<typeof replay>>) {
  // Explicitly SYNTHETIC matching DOM, derived from source values. There is no
  // captured DOM/checkpoint in the private evidence; this cannot verify live UI.
  const w = r.runtime.snapshot().sourceStatus.riverObservation!;
  const { runtime, intervals, socket } = r;
  const card = (c: string) => `<div class="card-container card-${c[1]} card-s-${c[0]} flipped"><span class="value">${c[0]}</span><span class="suit">${c[1]}</span></div>`;
  const { document } = parseHTML(`<html><body><div class="table-cards">${w.board.map(card).join("")}</div>
    <div class="table-pot-size"><div class="main-value"><span class="normal-value">${w.collectedPot}</span></div><div class="add-on-container"><span class="normal-value">${w.grossPotBeforeCall}</span></div></div>
    <div class="blind-value"><span class="chips-value"><span class="normal-value">1</span></span></div>
    <div class="blind-value"><span class="chips-value"><span class="normal-value">2</span></span></div><div class="dealer-position-3"></div>
    ${w.players.map(p => `<div class="table-player table-player-${p.seat} ${p.playerId === w.heroId ? "you-player decision-current" : ""} ${p.folded ? "fold" : ""}">
      <div class="table-player-name"><a>Player ${p.seat}</a></div><div class="table-player-stack"><span class="normal-value">${p.remainingStack}</span></div>
      <div class="table-player-cards">${p.playerId === w.heroId ? w.heroCards.map(card).join("") : ""}</div>
      ${p.folded ? "" : `<div class="table-player-bet-value">${p.contribution || "check"}</div>`}</div>`).join("")}
    <button type="button">Call 4</button></body></html>`);
  document.querySelector("button")!.getBoundingClientRect = () => ({ width: 30, height: 20 } as DOMRect);
  vi.stubGlobal("document", document);
  vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible" }));
  vi.stubGlobal("setInterval", (fn: () => void, ms: number) => { intervals.set(ms, fn); return 1; });
  vi.stubGlobal("localStorage", { getItem: () => null });
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  for (const method of ["log", "warn", "error"] as const) vi.spyOn(console, method).mockImplementation(() => {});
  r.at(w.receivedAt + 100);
  const read = readLiveTable();
  const assessment = assessLiveState(read.raw, read.context);
  expect(assessment.positions.get(1)).toBe("HJ"); expect(assessment.positions.get(3)).toBe("BTN");
  const proofs = () => buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), runtime.snapshot(), null, "turn477");
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  return { runtime, w, read, proofs, document, socket, fetch, at: r.at,
    poll: () => intervals.get(1000)!(), refresh: () => intervals.get(250)!(),
    overlay: () => document.getElementById("poker-ai-reader-overlay")!.textContent! };
}

describe("Hand477 paid turn continuity", () => {
  it.each(["source", "bundle"] as const)("replays all 46 original MAIN %s frames", async mode => {
    const r = await replay(mode);
    expect(fixture.capture).toMatchObject({ frameCount: 46, rejectedFrames: 0, registeredCaptured: true });
    expect(r.messages).toHaveLength(46);
    expect(r.messages.every(m => m.riverSource !== null)).toBe(true);
    expect(r.trace.slice(0, 41).every((t, i) => t.riverObservationDiagnostic.sequence === i + 1)).toBe(true);
    expect(r.trace[39].riverObservation).toMatchObject({ street: "flop", payableCall: 4 });
    expect(r.messages.slice(-6).map(m => m.riverSource.kind)).toEqual(["call", "turn_board_carried_actor", "check", "turn", "bet", "turn"]);
    expect(r.messages[41].riverSource.source.frame).not.toHaveProperty("cPI");
    expect(r.trace.every((t, i) => t.riverObservationDiagnostic.sequence === i + 1)).toBe(true);
    expect(r.runtime.snapshot().sourceStatus.riverObservation).toMatchObject({
      street: "turn", handNumber: 477, heroCards: ["2s", "Ah"], board: ["Qd", "Th", "6d", "Tc"],
      sequence: 46, collectedPot: 21, streetSubtotal: 4, grossPotBeforeCall: 25, payableCall: 4,
      historyComplete: false, liveAuthorized: false,
    });
    const b = await bind(r), p = b.proofs(), c = p.turnCallFold!.illustration!;
    expect(c).toMatchObject({ status: "conditional", chosenAction: null, llmMayChoose: false, foldEV: 0 });
    expect(c.requiredEquity).toBeCloseTo(4 / 29);
    for (const a of c.assumptions) { expect(Number.isFinite(a.equity)).toBe(true); expect(a.callEV).toBeCloseTo(a.equity * 29 - 4); }
    expect(p.activation.allowed).toBe(false);
    for (const scope of ["pot", "eligibility", "accounting", "legalActions", "equity", "rangeInput"])
      expect(p.evidence.proofs.find(proof => proof.scope === scope)!.status).not.toBe("proven");
    b.poll();
    for (const label of ["WAITING FOR PROOF", "Estimated turn equity", "CALL EV", "FOLD EV 0", "Required equity: 13.79%", "ILLUSTRATIVE ONLY"])
      expect(b.overlay()).toContain(label);
    expect(b.overlay()).not.toMatch(/MODEL ABSTAINED|RECOMMENDATION AVAILABLE/);
    b.at(b.w.expiresAt); b.refresh();
    expect(b.overlay()).not.toContain("CALL EV");
    expect(b.socket.send).not.toHaveBeenCalled(); expect(b.fetch).not.toHaveBeenCalled();
  }, 30000);

  it("isolates the old expiry guard by changing only frame40 receipt by 242ms", async () => {
    const r = await replay("source", frames => { frames[39].localReceivedAt += 242; });
    expect(r.runtime.snapshot().sourceStatus.riverObservation).toMatchObject({ street: "turn", payableCall: 4 });
    const b = await bind(r);
    expect(b.proofs().turnCallFold!.illustration).not.toBeNull();
  }, 30000);

  it("preserves the exact 241ms overrun and the immutable flop deadline", async () => {
    const deadline = fixture.frames[39].localReceivedAt + 10_000;
    expect(fixture.frames[40].localReceivedAt).toBe(deadline - 583);
    expect(fixture.frames[41].localReceivedAt).toBe(deadline + 241);
    expect(fixture.frames[41].localReceivedAt - fixture.frames[40].localReceivedAt).toBe(824);
    const r = await replay("source", frames => frames.splice(40));
    r.at(deadline - 1);
    expect(r.runtime.snapshot().sourceStatus.riverObservation!.expiresAt).toBe(deadline);
    r.at(deadline);
    expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    const called = await replay("source", frames => frames.splice(41));
    expect(called.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
  });

  it.each([1999, 2000, 2001])("bounds turn receipt continuity at %ims after CALL", async delay => {
    const r = await replay("source", frames => {
      const delta = frames[40].localReceivedAt + delay - frames[41].localReceivedAt;
      for (const f of frames.slice(41)) f.localReceivedAt += delta;
    });
    expect(r.runtime.snapshot().sourceStatus.riverObservation !== null).toBe(delay < 2000);
  });

  it.each([9999, 10000, 10001])("never uses a CALL received %ims after original activation", async delay => {
    const r = await replay("source", frames => {
      const delta = frames[39].localReceivedAt + delay - frames[40].localReceivedAt;
      for (const f of frames.slice(40)) f.localReceivedAt += delta;
    });
    expect(r.runtime.snapshot().sourceStatus.riverObservation !== null).toBe(delay < 10000);
  });

  it.each([{ sequence: 41, ms: 583 }, { sequence: 42, ms: 1176 }])(
    "rejects processing at the deadline despite a timely receipt: $sequence", async delay => {
      const r = await replay("source", () => {}, delay);
      expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    });

  it.each(["late source CALL", "delayed source turn", "missing actor", "wrong actor", "wrong pending actor", "unsupported CALL",
    "wrong CALL actor", "wrong responders", "wrong CALL amount", "missing CALL", "source cursor", "duplicate source cursor",
    "sequence gap", "generation", "receipt regression", "hand", "table", "roster", "board prefix", "hero cards",
    "pot", "missing pot", "missing debit", "wrong debit", "folded stack", "uncleared wager", "extra field",
    "explicit null actor", "pending turn actor", "unrelated before CALL", "unrelated after CALL", "later frame"])(
    "withholds broken or contradictory continuity: %s", async fault => {
      const r = await replay("source", frames => {
        const activation = frames[39].payload, call = frames[40].payload, deal = frames[41].payload;
        if (fault === "late source CALL" || fault === "delayed source turn") {
          const start = fault === "late source CALL" ? 40 : 41;
          const delta = frames[start - 1].payload.now + (start === 40 ? 10000 : 2000) - frames[start].payload.now;
          for (let i = start; i < frames.length; i++) {
            frames[i].payload.now += delta;
            if (i > start) frames[i].payload.pre += delta;
            if (frames[i].payload.pASA != null) frames[i].payload.pASA += delta;
          }
        }
        if (fault === "missing actor") delete activation.cPI;
        if (fault === "wrong actor") activation.cPI = villainId;
        if (fault === "wrong pending actor") activation.pITT = villainId;
        if (fault === "unsupported CALL") call.sNA = "UNKNOWN";
        if (fault === "wrong CALL actor") call.tB = { [villainId]: 4 };
        if (fault === "wrong responders") call.cRPI = [heroId, heroId];
        if (fault === "wrong CALL amount") call.tB[heroId] = 3;
        if (fault === "missing CALL") frames.splice(40, 1);
        if (fault === "source cursor") deal.pre++;
        if (fault === "duplicate source cursor") deal.now = call.now;
        if (fault === "receipt regression") frames[41].localReceivedAt = frames[40].localReceivedAt - 1;
        if (fault === "hand") deal.hI = "wrong-hand";
        if (fault === "table") deal.id = "wrong-table";
        if (fault === "roster") deal.iHPI = [heroId, villainId];
        if (fault === "board prefix") deal.oTC["1"][0] = "9s";
        if (fault === "hero cards") deal.pC[heroId] = { cards: [{ value: "Ac", showing: false }, { value: "2s", showing: false }] };
        if (fault === "pot") deal.pot--;
        if (fault === "missing pot") delete deal.pot;
        if (fault === "missing debit") delete deal.players[heroId];
        if (fault === "wrong debit") deal.players[villainId].stack++;
        if (fault === "folded stack") {
          const id = Object.keys(fixture.frames[0].payload.gameState.players).find(id => id !== heroId && id !== villainId)!;
          deal.players[id] = { stack: 1 };
        }
        if (fault === "uncleared wager") delete deal.tB[heroId];
        if (fault === "extra field") deal.rake = 0;
        if (fault === "explicit null actor") deal.cPI = null;
        if (fault === "pending turn actor") deal.pITT = villainId;
        if (["unrelated before CALL", "unrelated after CALL", "later frame"].includes(fault)) {
          const index = fault === "unrelated before CALL" ? 40 : fault === "unrelated after CALL" ? 41 : 46;
          const prev = frames[index - 1];
          const inserted = { ...structuredClone(prev), localReceiveSequence: index + 1, localReceivedAt: prev.localReceivedAt + 1,
            payload: { now: prev.payload.now + 1, pre: prev.payload.now, sN: prev.payload.sN + 1, mEV: 0, fV: "0.1.72", eventsData: [] } };
          if (index < frames.length) frames[index].payload.pre = inserted.payload.now;
          for (const f of frames.slice(index)) { f.localReceiveSequence++; f.payload.sN++; }
          frames.splice(index, 0, inserted);
        }
      }, undefined, message => {
        // MAIN assigns these envelope fields itself, independently of the raw
        // recorder metadata. Damage the emitted envelope at the receiver edge.
        if (message.type === "source_metadata" && message.sequence === 42) {
          if (fault === "sequence gap") message.sequence++;
          if (fault === "generation") message.generation++;
        }
      });
      expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
      expect(r.socket.send).not.toHaveBeenCalled();
    });

  it.each(["identity", "board", "pot", "stack", "call", "disabled", "expiry", "disconnect"])(
    "preserves downstream %s gates", async fault => {
      const b = await bind(await replay());
      if (fault === "identity") b.runtime.snapshot().sourceStatus.identity!.handId = "wrong-hand";
      if (fault === "board") b.read.raw.boardCards[3]!.valueText = "J";
      if (fault === "pot") b.read.raw.potTotalValueText = "29";
      if (fault === "stack") b.read.raw.seats[0]!.stackText = "1";
      if (fault === "call") b.read.callControl!.amountChips = 5;
      if (fault === "disabled") b.read.callControl!.enabled = false;
      if (fault === "expiry") b.at(b.w.expiresAt);
      if (fault === "disconnect") b.runtime.stop("disconnect");
      const p = b.proofs();
      expect(p.turnCallFold!.illustration).toBeNull();
      expect(p.activation.allowed).toBe(false);
    });
});
