import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { readRaiseControl } from "../../../apps/pokernow-extension/src/raiseControlRead.js";
import { evaluateDecisionPolicy, decisionProofBinding, validateDecisionPacket } from "@poker-ai/ai-core";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../../../apps/pokernow-extension/src/tableRead.js", () => ({ readLiveTable: mocks.read }));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({ createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }) }));
const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const captured = load("pokernow-exact-five-accepted.json");
const formHTML = readFileSync(new URL("./fixtures/pokernow-raise-live.html", import.meta.url), "utf8");
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function controls(kind: string) {
  const { document } = parseHTML(`<html><body>${kind === "closed" ? "" : formHTML}</body></html>`);
  const input = document.querySelector<HTMLInputElement>(".raise-bet-value input.value");
  const bb = document.querySelector(".raise-bet-value .bb-value");
  if (input) input.value = kind === "wrong-size" ? "6" : "5";
  if (bb) bb.textContent = kind === "wrong-bb" ? "3BB" : "2.5BB";
  if (kind === "disabled") document.querySelector('input[type="submit"]')!.setAttribute("disabled", "");
  if (kind === "input-disabled") input!.setAttribute("disabled", "");
  if (kind === "input-readonly") input!.setAttribute("readonly", "");
  if (kind === "different-selection") { input!.value = "4"; bb!.textContent = "2BB"; }
  if (kind === "missing-input") input!.remove();
  if (kind === "missing-submit") document.querySelector('input[type="submit"]')!.remove();
  if (kind === "hidden-submit") document.querySelector('input[type="submit"]')!.setAttribute("hidden", "");
  if (kind === "duplicate") document.body.appendChild(document.querySelector("form")!.cloneNode(true));
  return readRaiseControl(document, e => !e.closest("[hidden]"));
}

// Actual incoming envelopes -> MAIN bridge -> runtime -> live adapters -> engine
// -> contentScript overlay. No synthetic certificate or selected policy injection.
// A synchronous table-read cross-check is simulated using the existing reader
// result shape; no hand169 DOM recording exists. Card variants are test inputs.
async function live(options: { cards?: string[]; control?: string; age?: number;
  mutate?: (frames: any[], read: any) => void } = {}) {
  vi.resetModules();
  const frames = structuredClone(captured.frames).filter((f: any) => f.localReceiveSequence <= 65);
  const boundary = frames.at(-1), start = boundary.payload;
  const cards = options.cards ?? ["Ac", "Ad"];
  start.pC.PLAYER_1.cards = cards.map(value => ({ value, showing: false }));
  const read = load("utg-reader-cross-check.json").read;
  const stacks: Record<string, number> = {};
  for (const f of frames) {
    const p = f.payload.gameState ?? f.payload;
    for (const [id, v] of Object.entries(p.players ?? {}) as Array<[string, any]>) if (v.stack !== undefined) stacks[id] = v.stack;
  }
  for (const seat of read.raw.seats) if (seat.isOccupied) {
    seat.stackText = seat.stackContainerText = String(stacks[`PLAYER_${seat.seatNumber}`]);
    if (seat.isYou) seat.holeCardClassLists = cards.map(c => ["card-container", `card-${c[1]}`, `card-s-${c[0]}`, "flipped", "med"]);
  }
  read.raiseControl = controls(options.control ?? "closed");
  options.mutate?.(frames, read);
  const { document } = parseHTML("<html><body></body></html>");
  const location = new URL("https://www.pokernow.com/games/TABLE_TEST");
  const listeners: Array<(e: any) => void> = [];
  let now = frames[0].localReceivedAt, poll = () => {}, refresh = () => {};
  const timers = new Map<number, () => void>(); let timerId = 0;
  class Socket extends EventTarget {
    send = vi.fn();
    constructor(public url: string) { super(); }
    incoming(f: any) { this.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([f.event, f.payload]) })); }
  }
  const win = { location, WebSocket: Socket,
    setTimeout: (cb: () => void) => { timers.set(++timerId, cb); return timerId; }, clearTimeout: (id: number) => timers.delete(id),
    addEventListener: (type: string, cb: (e: any) => void) => { if (type === "message") listeners.push(cb); },
    postMessage: (data: unknown) => { for (const cb of listeners) cb({ source: win, origin: location.origin, data }); },
    sessionStorage: { getItem: () => null } };
  vi.stubGlobal("window", win); vi.stubGlobal("document", document); vi.stubGlobal("location", location);
  vi.stubGlobal("localStorage", { getItem: () => null });
  vi.spyOn(Date, "now").mockImplementation(() => now);
  vi.stubGlobal("setInterval", (cb: () => void, ms: number) => { if (ms === 250) refresh = cb; else poll = cb; return 1; });
  for (const method of ["log", "warn", "error"] as const) vi.spyOn(console, method).mockImplementation(() => {});
  mocks.read.mockImplementation(() => read);
  const requests: Array<{ packet: any; resolve: (value: unknown) => void; reject: (error: Error) => void }> = [];
  vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit) => new Promise((resolve, reject) => {
    if (url.endsWith("/recommendation")) requests.push({ packet: JSON.parse(init.body as string).decisionPacket, resolve, reject });
  })));
  await import("../../../apps/pokernow-extension/src/eventSource.js");
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  let socket!: Socket, generation = 0;
  const incoming = (f: any) => {
    now = f.localReceivedAt;
    while (generation < f.connectionGeneration) { generation++; socket = new win.WebSocket("wss://www.pokernow.com/socket.io/?gameID=TABLE_TEST"); }
    socket.incoming(f);
  };
  for (const f of frames) incoming(f);
  now = boundary.localReceivedAt + (options.age ?? 1000); poll();
  return { read, requests, poll, refresh, incoming, socket, now: () => now,
    atAge: (age: number) => { now = boundary.localReceivedAt + age; },
    action: () => document.querySelector('#poker-ai-reader-overlay [style*="font-size:16px"]')?.textContent ?? null,
    text: () => document.getElementById("poker-ai-reader-overlay")!.textContent! };
}

describe("observed exact-five rule through the production decision/display path", () => {
  it("anchors acceptance after expiry without promoting mR or changing Q8o", async () => {
    const f = await live({ cards: ["8h", "Qd"] });
    expect(f.action()).toBe("FOLD");
    const boundary = captured.frames[64], accepted = captured.frames[65], next = captured.frames[66];
    expect(accepted.localReceivedAt - boundary.localReceivedAt).toBe(67338);
    expect(accepted.payload).toMatchObject({ pre: boundary.payload.now, tB: { PLAYER_1: 5 }, cHB: 5, mR: 8 });
    expect(next.payload).toMatchObject({ pre: accepted.payload.now, cPI: "PLAYER_2", pITT: "PLAYER_2" });
    expect(boundary.payload).not.toHaveProperty("mR");
    f.incoming(accepted); f.refresh(); expect(f.action()).toBeNull();
  });
  it.each([["Ac", "Ad"], ["As", "Kd"], ["Qh", "Qs"]])("immediately displays a chart-included %s %s RAISE with closed panel", async (a, b) => {
    const f = await live({ cards: [a, b] });
    expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
    const packet = f.requests[0]!.packet;
    expect(packet.preflopExecution.exactOpeningSize).toMatchObject({ raiseToChips: 5, investmentChips: 5, units: "chips",
      contributionChips: 0, controls: "panel_closed_unchecked", handId: "HAND_169", generation: 2 });
    expect(packet.preflopExecution.raiseBounds).toBeUndefined();
    expect(packet.decisionProofs.proofs.find((p: any) => p.scope === "raiseLegality").status).toBe("proven");
    expect(evaluateDecisionPolicy(validateDecisionPacket(packet))).toMatchObject({ status: "selected", chosenAction: "RAISE",
      chosenSizeBB: 2.5, raiseToBB: 2.5, llmMayChoose: false, activation: { allowed: true, state: "proof_ready" } });
    expect(f.text()).toContain("controls not checked");
    expect(f.socket.send).not.toHaveBeenCalled();
  });
  it("accepts matching visible controls and retains the original deadline after a panel edit", async () => {
    const f = await live(); const expiry = f.requests[0]!.packet.preflopExecution.exactOpeningSize.expiresAt;
    f.atAge(4000); f.read.raiseControl = controls("ready"); f.poll();
    expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
    expect(f.requests.at(-1)!.packet.preflopExecution.exactOpeningSize).toMatchObject({ expiresAt: expiry, controls: "selected_amount_matches" });
    expect(f.requests.at(-1)!.packet.decisionProofs.decisionEpoch).not.toBe(f.requests[0]!.packet.decisionProofs.decisionEpoch);
    f.atAge(10000); f.refresh(); expect(f.action()).toBeNull(); expect(f.text()).toContain("EVIDENCE EXPIRED");
  });
  it("separates the certified total from a different current panel selection", async () => {
    const f = await live({ control: "different-selection" });
    expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
    expect(f.text()).toContain("Selected amount differs: manually set 5 chips");
    expect(f.requests[0]!.packet.preflopExecution.exactOpeningSize.controls).toBe("selected_amount_differs");
    f.requests[0]!.reject(new Error("relay offline")); await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.text()).toContain("Selected amount differs: manually set 5 chips");
  });
  it.each(["disabled", "input-disabled", "input-readonly", "missing-input", "missing-submit", "hidden-submit", "duplicate", "wrong-size", "wrong-bb"])("blocks contradictory/unavailable %s controls", async control => {
    const f = await live({ control }); expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it.each(["version", "missing-version", "missing-current-fV", "unknown-nR", "ante", "mode", "cap", "sPM", "rIT", "wrong-actor", "contribution", "capacity", "stale-cards", "missing-boundary", "gap", "reconnect"])("rejects %s evidence", async variant => {
    const f = await live({ mutate: (frames, read) => {
      const boundary = frames.at(-1).payload;
      if (variant === "version") boundary.fV = "0.1.73";
      if (variant === "missing-version") for (const frame of frames) delete (frame.payload.gameState ?? frame.payload).version;
      if (variant === "missing-current-fV") delete boundary.fV;
      if (variant === "unknown-nR") boundary.nR = [2];
      if (variant === "ante") boundary.ante = 1;
      if (variant === "mode") boundary.mode = "real";
      if (variant === "cap") boundary.mTB = 4;
      if (variant === "sPM") boundary.sPM = true;
      if (variant === "rIT") boundary.rIT = "unknown";
      if (variant === "wrong-actor") boundary.pITT = "PLAYER_2";
      if (variant === "contribution") boundary.tB.PLAYER_1 = 2;
      if (variant === "capacity") read.raw.seats[0].stackText = "4";
      if (variant === "stale-cards") read.raw.seats[0].holeCardClassLists[0] = ["card-container", "card-h", "card-s-K"];
      if (variant === "missing-boundary") frames.pop();
      if (variant === "gap") frames.splice(63, 1);
      if (variant === "reconnect") frames.at(-1).connectionGeneration++;
    } });
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("does not read inherited mR as a current minimum", async () => {
    const f = await live({ mutate: frames => { for (const frame of frames) if (frame.event !== "gC") (frame.payload.gameState ?? frame.payload).mR = 900; } });
    expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
  });
  it("selected five and an enabled submit cannot substitute for the rule profile", async () => {
    const f = await live({ control: "ready", mutate: frames => { delete frames.at(-1).payload.fV; } });
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("FOLD needs neither the size profile nor usable Raise controls", async () => {
    const f = await live({ cards: ["8h", "Qd"], control: "disabled", mutate: frames => { delete frames.at(-1).payload.fV; } });
    expect(f.action()).toBe("FOLD");
    expect(f.requests[0]!.packet.decisionProofs.proofs.find((p: any) => p.scope === "raiseLegality").status).toBe("insufficient");
  });
  it.each([10000, 15000])("does not activate at age %i", async age => {
    const f = await live({ age }); expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("relay failure cannot hide a fresh engine raise or renew it", async () => {
    const f = await live(); f.requests[0]!.reject(new Error("relay offline"));
    await new Promise(resolve => setTimeout(resolve, 0)); expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
    f.atAge(10000); f.refresh(); expect(f.action()).toBeNull();
  });
  it.each(["expiry", "reconnect", "actor", "source-update"])("late LLM cannot restore after %s", async variant => {
    const f = await live();
    if (variant === "expiry") f.atAge(10000);
    if (variant === "reconnect") f.socket.dispatchEvent(new Event("close"));
    if (variant === "actor") f.read.raw.seats[0].statusClasses = ["table-player", "table-player-1", "you-player"];
    if (variant === "source-update") f.incoming({ ...captured.frames[65], localReceivedAt: f.now() + 1 });
    f.refresh(); expect(f.action()).toBeNull();
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: { action: "RAISE", sizingBB: 2.5, confidence: 1, reasoning: "Late explanation" } }) });
    await new Promise(resolve => setTimeout(resolve, 0)); expect(f.action()).toBeNull(); expect(f.text()).not.toContain("Late explanation");
  });
  it("LLM cannot replace the current engine action/size", async () => {
    const f = await live(); f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: { action: "FOLD", confidence: 1, reasoning: "Override" } }) });
    await new Promise(resolve => setTimeout(resolve, 0)); expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
    expect(f.text()).not.toContain("Override");
  });
  it.each(["epoch", "hand", "generation", "amount", "expiry", "units"])("engine rejects a rebound packet with stale/altered %s sizing", async key => {
    const f = await live(); const p = structuredClone(f.requests[0]!.packet), s = p.preflopExecution.exactOpeningSize;
    if (key === "epoch") s.decisionEpoch = "old";
    if (key === "hand") s.handId = "old";
    if (key === "generation") s.generation++;
    if (key === "amount") s.raiseToChips = 6;
    if (key === "expiry") s.expiresAt += 10000;
    if (key === "units") s.units = "BB";
    p.decisionProofs.binding = decisionProofBinding(p, p.decisionProofs.decisionEpoch);
    expect(evaluateDecisionPolicy(p).status).not.toBe("selected");
  });
});
