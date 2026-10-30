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

// CI uses a SYNTHETIC variant of the already-public Hand465 transcript. Only
// its last hand's cards change. It is not the private Hand471 capture.
// Local investigation replays that entire unmodified capture via this env var.
function fixture() {
  if (process.env.HAND471_RAW_CAPTURE) return JSON.parse(readFileSync(process.env.HAND471_RAW_CAPTURE, "utf8"));
  const f = JSON.parse(readFileSync(new URL("./fixtures/pokernow-turn-465.json", import.meta.url), "utf8"));
  const cards: Record<string, string> = { Qc: "Td", "6d": "2h", Td: "4h", Th: "4s", "3c": "Th", Jd: "Ts" };
  f.frames = f.frames.map((frame: any, i: number) => i < 55 ? frame :
    JSON.parse(JSON.stringify(frame), (_key, value) => typeof value === "string" ? cards[value] ?? value : value));
  return f;
}
const reason = "Strong value / 10% bluffs: no legal bluff combinations; assumption cannot be evaluated";

async function replay(mode: "source" | "bundle" = "source") {
  vi.resetModules();
  const f = fixture(), tableId = f.frames[0].payload.gameState.id;
  let now = f.frames[0].localReceivedAt;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const runtime = createTimelineRuntime({ tableId, sessionId: "turn-abstention", now: () => now, fetchLog: vi.fn() });
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
  for (const frame of f.frames) {
    now = frame.localReceivedAt;
    socket.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([frame.event, frame.payload]) }));
  }
  const messages = postMessage.mock.calls.map(([m]) => m as any).filter(m => m.type === "source_metadata");
  expect(f.capture).toMatchObject({ frameCount: 78, rejectedFrames: 0 });
  expect(messages).toHaveLength(78);
  expect(messages.every(m => m.riverSource !== null)).toBe(true);
  expect(messages.slice(-5).map(m => m.riverSource.kind)).toEqual(["turn_board_carried_actor", "check", "turn", "bet", "turn"]);
  const w = runtime.snapshot().sourceStatus.riverObservation!;
  // Assert source recognition independently, BEFORE constructing any DOM.
  expect(w).toMatchObject({ street: "turn", handNumber: process.env.HAND471_RAW_CAPTURE ? 471 : 465,
    heroCards: ["Td", "2h"], board: ["4h", "4s", "Th", "Ts"], sequence: 78, generation: 1,
    heroChecked: true, collectedPot: 21, streetSubtotal: 4, grossPotBeforeCall: 25, payableCall: 4,
    historyComplete: false, liveAuthorized: false, receivedAt: f.frames[77].localReceivedAt });
  expect(w.expiresAt).toBe(w.receivedAt + 10_000);

  // Explicitly SYNTHETIC matching DOM, derived from source values. There is no
  // captured DOM/checkpoint in the private evidence; this cannot verify live UI.
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
  now += 100;
  const read = readLiveTable();
  const assessment = assessLiveState(read.raw, read.context);
  expect(assessment.positions.get(1)).toBe("HJ"); expect(assessment.positions.get(3)).toBe("BTN");
  const proofs = () => buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), runtime.snapshot(), null, "turn-abstention");
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  return { runtime, w, read, proofs, document, socket, fetch, at: (at: number) => { now = at; },
    poll: () => intervals.get(1000)!(), refresh: () => intervals.get(250)!(),
    overlay: () => document.getElementById("poker-ai-reader-overlay")!.textContent! };
}

describe("Hand471 double-paired turn model abstention", () => {
  it.each(["source", "bundle"] as const)("preserves valid binding through model abstention after all 78 MAIN %s frames", async mode => {
    const r = await replay(mode), p = r.proofs(), turn = p.turnCallFold!;
    expect(turn.unsafe).toBe(false);
    expect(turn.reasons).toContain(reason);
    expect(turn.binding).toMatchObject({ sequence: 78, expiresAt: r.w.expiresAt });
    expect(turn.modelAbstention).toBe(reason);
    expect(turn.illustration).toBeNull();
    expect(turn.reasons.join(" ")).not.toContain("No validated turn source activation");
    expect(p.activation.allowed).toBe(false);
    for (const scope of ["pot", "eligibility", "accounting", "legalActions", "equity", "rangeInput"])
      expect(p.evidence.proofs.find(proof => proof.scope === scope)!.status).not.toBe("proven");
    r.poll();
    expect(r.overlay()).toContain("MODEL ABSTAINED");
    expect(r.overlay()).toContain("Source and DOM binding validated; numerical illustration withheld by the model.");
    expect(r.overlay()).toContain(reason);
    expect(r.overlay()).not.toMatch(/No validated turn source activation|WAITING FOR PROOF|Estimated turn equity|CALL EV|RECOMMENDATION AVAILABLE/);
    r.at(r.w.expiresAt); r.refresh();
    expect(r.overlay()).not.toContain("MODEL ABSTAINED");
    expect(r.overlay()).not.toContain("Source and DOM binding validated");
    expect(r.overlay()).toContain("WAITING FOR PROOF");
    expect(r.socket.send).not.toHaveBeenCalled(); expect(r.fetch).not.toHaveBeenCalled();
  });

  it.each(["board", "call", "disabled", "expiry", "disconnect", "identity", "pot", "stack"])(
    "does not classify failed %s binding as model abstention", async fault => {
      const r = await replay();
      if (fault === "board") r.read.raw.boardCards[3]!.valueText = "J";
      if (fault === "call") r.read.callControl!.amountChips = 5;
      if (fault === "disabled") r.read.callControl!.enabled = false;
      if (fault === "expiry") r.at(r.w.expiresAt);
      if (fault === "disconnect") r.runtime.stop("disconnect");
      if (fault === "identity") r.runtime.snapshot().sourceStatus.identity!.handId = "wrong";
      if (fault === "pot") r.read.raw.potTotalValueText = "29";
      if (fault === "stack") r.read.raw.seats[0]!.stackText = "1";
      const p = r.proofs();
      expect(p.turnCallFold!.binding).toBeNull();
      expect(p.turnCallFold!.modelAbstention).toBeNull();
      expect(p.turnCallFold!.illustration).toBeNull();
      expect(p.activation.allowed).toBe(false);
    });

  it.each(["board", "call", "disabled", "disconnect"])("clears the model diagnostic immediately after %s changes", async fault => {
    const r = await replay(); r.poll();
    expect(r.overlay()).toContain("MODEL ABSTAINED");
    if (fault === "board") r.document.querySelector(".table-cards .card-container:last-child .value")!.textContent = "J";
    if (fault === "call") r.document.querySelector("button")!.textContent = "Call 5";
    if (fault === "disabled") r.document.querySelector("button")!.setAttribute("disabled", "");
    if (fault === "disconnect") r.runtime.stop("disconnect");
    r.refresh();
    expect(r.overlay()).not.toContain("MODEL ABSTAINED");
    expect(r.overlay()).not.toContain("Source and DOM binding validated");
    expect(r.overlay()).not.toMatch(/Estimated turn equity|CALL EV|RECOMMENDATION AVAILABLE/);
    expect(r.socket.send).not.toHaveBeenCalled(); expect(r.fetch).not.toHaveBeenCalled();
  });
});
