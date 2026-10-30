import { projectRiverObservation } from "../../../apps/pokernow-extension/src/riverObservation.js";
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
const fixture = JSON.parse(readFileSync(process.env.HAND482_RAW_CAPTURE ?? new URL("./fixtures/pokernow-turn-482.json", import.meta.url), "utf8"));
const heroId = fixture.frames[0].payload.currentPlayer.id;
const villainId = fixture.frames[65].payload.cRPI[0];
async function replay(mode: "source" | "bundle" = "source", mutate: (frames: any[]) => void = () => {},
  processingDelay?: { sequence: number; ms: number }, mutateEnvelope: (message: any) => void = () => {}) {
  vi.resetModules();
  const f = structuredClone(fixture); mutate(f.frames); const tableId = f.frames[0].payload.gameState.id;
  let now = f.frames[0].localReceivedAt;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const runtime = createTimelineRuntime({ tableId, sessionId: "turn482", now: () => now, fetchLog: vi.fn() });
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
  const proofs = () => buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), runtime.snapshot(), null, "turn482");
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  return { runtime, w, read, proofs, document, socket, fetch, at: r.at,
    poll: () => intervals.get(1000)!(), refresh: () => intervals.get(250)!(),
    overlay: () => document.getElementById("poker-ai-reader-overlay")!.textContent! };
}


describe("Hand482 exact source variants", () => {
  it.each(["source", "bundle"] as const)("replays all 67 original MAIN %s frames", async mode => {
    const r = await replay(mode);
    expect(fixture.capture).toMatchObject({ frameCount: 67, rejectedFrames: 0, registeredCaptured: true });
    expect(r.messages).toHaveLength(67);
    expect(r.messages.every(m => m.riverSource !== null)).toBe(true);
    expect(r.trace[60].riverObservation).toMatchObject({ street: "flop", payableCall: 4 });
    expect(r.messages.slice(-6).map(m => m.riverSource.kind)).toEqual(["call", "turn_board_carried_actor", "check", "turn", "bet", "turn"]);
    expect(r.messages[62].riverSource.source.frame).not.toHaveProperty("cPI");
    expect(r.trace.every((t, i) => t.riverObservationDiagnostic.sequence === i + 1)).toBe(true);
    expect(r.runtime.snapshot().sourceStatus.riverObservation).toMatchObject({
      street: "turn", handNumber: 482, heroCards: ["6d", "3h"], board: ["6s", "3d", "8c", "2h"],
      sequence: 67, collectedPot: 21, streetSubtotal: 4, grossPotBeforeCall: 25, payableCall: 4,
      historyComplete: false, liveAuthorized: false,
    });
    expect(r.messages[1].riverSource.standingUpPlayer).toBe(Object.keys(fixture.frames[1].payload.players)[0]);
    expect(r.messages[56].riverSource.kind).toBe("flop_board");
    expect(fixture.frames[56].payload).not.toHaveProperty("mAVTB");
    expect(r.messages[56].riverSource.source.frame).not.toHaveProperty("mAVTB");
    const b = await bind(r), p = b.proofs(), c = p.turnCallFold!.illustration!;
    expect(p.turnCallFold!.modelAbstention).toBeNull();
    expect(c.assumptions).toHaveLength(2);
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

  it.each(["late source CALL", "delayed source turn", "missing actor", "wrong actor", "wrong pending actor", "unsupported CALL",
    "wrong CALL actor", "wrong responders", "wrong CALL amount", "missing CALL", "source cursor", "duplicate source cursor",
    "sequence gap", "generation", "receipt regression", "hand", "table", "roster", "board prefix", "hero cards",
    "pot", "missing pot", "missing debit", "wrong debit", "folded stack", "uncleared wager", "extra field",
    "explicit null actor", "pending turn actor", "unrelated before CALL", "unrelated after CALL", "later frame"])(
    "withholds broken or contradictory continuity: %s", async fault => {
      const r = await replay("source", frames => {
        const activation = frames[60].payload, call = frames[61].payload, deal = frames[62].payload;
        if (fault === "late source CALL" || fault === "delayed source turn") {
          const start = fault === "late source CALL" ? 61 : 62;
          const delta = frames[start - 1].payload.now + (start === 61 ? 10000 : 2000) - frames[start].payload.now;
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
        if (fault === "missing CALL") frames.splice(61, 1);
        if (fault === "source cursor") deal.pre++;
        if (fault === "duplicate source cursor") deal.now = call.now;
        if (fault === "receipt regression") frames[62].localReceivedAt = frames[61].localReceivedAt - 1;
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
          const index = fault === "unrelated before CALL" ? 61 : fault === "unrelated after CALL" ? 62 : 67;
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
        if (message.type === "source_metadata" && message.sequence === 63) {
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

const standingId = Object.keys(fixture.frames[1].payload.players)[0]!;
const wire = (frame: any) => "42" + JSON.stringify([frame.event, frame.payload]);

describe("Hand482 standing-player boundary guards", () => {
  it("retains the prior exact no-capacity Hand465 shape", async () => {
    const r = await replay("source", frames => { delete frames[1].payload.mAVTB; });
    expect(r.trace.every((t, i) => t.riverObservationDiagnostic.sequence === i + 1)).toBe(true);
    expect(r.runtime.snapshot().sourceStatus.riverObservation?.street).toBe("turn");
  });

  it.each([null, -1, 1.5, "244", false, {}, Number.MAX_SAFE_INTEGER + 1])(
    "rejects malformed standing capacity %j", async value => {
      const r = await replay("source", frames => { frames[1].payload.mAVTB = value; });
      expect(r.messages[1].riverSource).toBeNull();
      expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    });

  it.each(["mR", "rHC", "gameResult", "cPI", "iHPI", "pC", "pGS"])(
    "does not generalize missing standing-boundary field %s", async field => {
      const r = await replay("source", frames => { delete frames[1].payload[field]; });
      expect(r.messages[1].riverSource).toBeNull();
      expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    });

  it.each(["extra top", "extra player", "missing deletion", "wrong deletion", "wrong status", "hero stands",
    "two standing players", "same hand", "skipped hand", "unsettled previous", "previous status", "previous roster",
    "retained roster", "retained cards", "active standing player", "standing actor", "standing pending actor",
    "standing dealer", "standing small blind", "standing big blind"])(
    "rejects contradictory standing transition: %s", async fault => {
      const r = await replay("source", frames => {
        const before = frames[0].payload.gameState, p = frames[1].payload;
        if (fault === "extra top") p.pot = 0;
        if (fault === "extra player") p.players[standingId].stack = before.players[standingId].stack;
        if (fault === "missing deletion") delete p.players[standingId].hideAway;
        if (fault === "wrong deletion") p.players[standingId].sUNH = null;
        if (fault === "wrong status") p.players[standingId].status = "inGame";
        if (fault === "hero stands") p.players = { [heroId]: p.players[standingId] };
        if (fault === "two standing players") p.players[villainId] = structuredClone(p.players[standingId]);
        if (fault === "same hand") { p.hI = before.hI; p.gN = before.gN; }
        if (fault === "skipped hand") p.gN++;
        if (fault === "unsettled previous") before.gT = [1, 2];
        if (fault === "previous status") before.players[standingId].status = "standingUp";
        if (fault === "previous roster") before.iHPI = before.iHPI.filter((id: string) => id !== standingId);
        if (fault === "retained roster") p.iHPI.push(standingId);
        if (fault === "retained cards") p.pC[standingId] = structuredClone(p.pC[villainId]);
        if (fault === "active standing player") p.pGS[standingId] = "inGame";
        if (fault === "standing actor") p.cPI = standingId;
        if (fault === "standing pending actor") p.pITT = standingId;
        if (fault === "standing dealer") { p.dealerID = standingId; p.dealerSeat = before.seats.find((s: any[]) => s[1] === standingId)[0]; }
        if (fault === "standing small blind") p.sBPI = standingId;
        if (fault === "standing big blind") p.bBPI = standingId;
      });
      expect(r.trace[1].riverObservationDiagnostic.sequence).toBeLessThan(2);
      expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    });
});

describe("Hand482 paid flop omission boundaries", () => {
  it.each([58, 60, 62, 64, 66])("still requires capacity on activation/turn frame index %i", index => {
    const f = structuredClone(fixture.frames[index]); delete f.payload.mAVTB;
    expect(projectRiverObservation(wire(f), heroId)?.kind).toBe("other");
  });

  it.each(["cPI", "pITT", "pot", "players", "tB", "pC", "mR", "cHB", "oTC"])(
    "does not classify another missing-field variant: %s", field => {
      const f = structuredClone(fixture.frames[56]); delete f.payload[field];
      expect(projectRiverObservation(wire(f), heroId)?.kind).not.toBe("flop_board");
    });

  it.each(["extra field", "nested extra", "null capacity", "negative capacity", "string capacity", "null actor",
    "wrong actor", "turn", "river", "flag false", "flag true", "flag null"])(
    "does not broaden the capacity omission to %s", fault => {
      const f = structuredClone(fixture.frames[56]), p = f.payload;
      if (fault === "extra field") p.sBS = 1;
      if (fault === "nested extra") p.players[heroId].status = "inGame";
      if (fault === "null capacity") p.mAVTB = null;
      if (fault === "negative capacity") p.mAVTB = -1;
      if (fault === "string capacity") p.mAVTB = "182";
      if (fault === "null actor") p.cPI = null;
      if (fault === "wrong actor") p.cPI = villainId;
      if (fault === "turn") p.gT = [1, 2];
      if (fault === "river") p.gT = [1, 3];
      if (fault.startsWith("flag")) p.bigBlindCheck = fault === "flag null" ? null : fault === "flag true";
      expect(projectRiverObservation(wire(f), heroId)?.kind).not.toBe("flop_board");
    });

  it("separates unsupported flop classification from independent later turn continuity", async () => {
    // Counterfactual classifier control only. This known extra field keeps the
    // flop outside the closed shape without inventing a capacity or an action.
    const r = await replay("source", frames => { frames[56].payload.sBS = 1; });
    expect(r.messages[56].riverSource.kind).toBe("other");
    expect(r.trace[60].riverObservation).toBeNull();
    expect(r.trace.every((t, i) => t.riverObservationDiagnostic.sequence === i + 1)).toBe(true);
    const b = await bind(r);
    expect(b.proofs().turnCallFold!.illustration).not.toBeNull();
  });

  it.each(["pot", "missing pot", "missing debit", "wrong debit", "uncleared wager", "board prefix", "active roster"])(
    "preserves flop reconciliation: %s", async fault => {
      const r = await replay("source", frames => {
        const p = frames[56].payload;
        if (fault === "pot") p.pot--;
        if (fault === "missing pot") delete p.pot;
        if (fault === "missing debit") delete p.players[heroId];
        if (fault === "wrong debit") p.players[villainId].stack++;
        if (fault === "uncleared wager") delete p.tB[heroId];
        if (fault === "board prefix") p.oTC["1"] = ["6s", "3d", "6s"];
        if (fault === "active roster") p.pGS = { [standingId]: "inGame" };
      });
      expect(r.trace[60].riverObservation).toBeNull();
      // An uncleared hero wager rejects this flop boundary. The later explicit
      // CHECK replaces it, so the independently reconciled turn can still open,
      // as it could before this recognition change. Do not conflate windows.
      if (fault === "uncleared wager") {
        expect(r.trace[56].riverObservationDiagnostic.reason).toBe("Unsupported flop boundary.");
        expect(r.runtime.snapshot().sourceStatus.riverObservation?.street).toBe("turn");
      } else expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    });
});

describe("Hand482 disconnect evidence", () => {
  it("retains and deletes disconnectedSince without losing source continuity", async () => {
    const r = await replay();
    const id = Object.keys(fixture.frames[53].payload.players)[0]!;
    expect(r.messages[53].riverSource.source.frame.players[id].disconnectedSince).toBe(fixture.frames[53].payload.players[id].disconnectedSince);
    expect(r.messages[54].riverSource.source.frame.players[id].disconnectedSince).toBe("<D>");
    expect(r.trace[53].riverObservationDiagnostic.sequence).toBe(54);
    expect(r.trace[54].riverObservationDiagnostic.sequence).toBe(55);
    expect(r.runtime.snapshot().sourceStatus.riverObservation?.street).toBe("turn");
  });

  it.each(["null", "negative", "string", "extra field", "missing predecessor", "active unreconnected"])(
    "does not bypass disconnect validation: %s", async fault => {
      const r = await replay("source", frames => {
        const p = frames[53].payload, id = Object.keys(p.players)[0]!;
        if (fault === "null") p.players[id].disconnectedSince = null;
        if (fault === "negative") p.players[id].disconnectedSince = -1;
        if (fault === "string") p.players[id].disconnectedSince = "offline";
        if (fault === "extra field") p.players[id].unknown = 0;
        if (fault === "missing predecessor") delete frames[54].payload.pre;
        if (fault === "active unreconnected") p.players = { [heroId]: p.players[id] };
      });
      expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    });
});
