import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { lockedEngineRecommendation, type DecisionPolicyResult } from "@poker-ai/ai-core";

const mocks = vi.hoisted(() => ({ read: vi.fn(), raiseDisplayOnly: false }));
vi.mock("../../../apps/pokernow-extension/src/tableRead.js", () => ({ readLiveTable: mocks.read }));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({ createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }) }));
vi.mock("@poker-ai/ai-core", async importOriginal => {
  const actual = await importOriginal<typeof import("@poker-ai/ai-core")>();
  return { ...actual, evaluateDecisionPolicy: (packet: Parameters<typeof actual.evaluateDecisionPolicy>[0]) => {
    const result = actual.evaluateDecisionPolicy(packet);
    // RAISE rendering only: no assertion that hand 68 or live sizing is authorized.
    return mocks.raiseDisplayOnly && result.status === "selected" ? { ...result, chosenAction: "RAISE", chosenSizeBB: 2.5, raiseToBB: 2.5 } : result;
  } };
});
const raw = JSON.parse(readFileSync(new URL("../../../evidence/hand-68-raw-socket.json", import.meta.url), "utf8"));
const diagnostic = JSON.parse(readFileSync(new URL("../../../evidence/hand-68-selected-fold-diagnostic.json", import.meta.url), "utf8"));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); mocks.raiseDisplayOnly = false; });

async function fixture(blocked = false) {
  vi.resetModules();
  const { document } = parseHTML("<html><body></body></html>");
  const tableId = raw.frames[0].payload.gameState.id;
  const location = new URL(`https://www.pokernow.com/games/${tableId}`);
  const listeners: Array<(event: any) => void> = [];
  class Socket extends EventTarget {
    send = vi.fn();
    constructor(public url: string) { super(); }
    incoming(event: string, payload: unknown) { this.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([event, payload]) })); }
  }
  const win = { location, WebSocket: Socket,
    setTimeout: () => 1, clearTimeout: () => {},
    addEventListener: (type: string, listener: (event: any) => void) => { if (type === "message") listeners.push(listener); },
    postMessage: (data: unknown) => { for (const listener of listeners) listener({ source: win, origin: location.origin, data }); },
    sessionStorage: { getItem: () => null },
  };
  vi.stubGlobal("window", win); vi.stubGlobal("document", document); vi.stubGlobal("location", location);
  vi.stubGlobal("localStorage", { getItem: () => null });
  let now = raw.frames[0].localReceivedAt;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  for (const method of ["log", "warn", "error"] as const) vi.spyOn(console, method).mockImplementation(() => {});
  let poll = () => {};
  vi.stubGlobal("setInterval", (callback: () => void) => { poll = callback; return 1; });
  const read = structuredClone({ raw: diagnostic.raw, context: diagnostic.context, evidence: diagnostic.evidence, raiseControl: diagnostic.legality.raiseControl });
  mocks.read.mockImplementation(() => read);
  const requests: Array<{ packet: any; resolve: (r: unknown) => void; reject: (e: Error) => void }> = [];
  vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit) => new Promise((resolve, reject) => {
    if (url.endsWith("/recommendation")) requests.push({ packet: JSON.parse(init.body as string).decisionPacket, resolve, reject });
    // Keep log acquisition pending to isolate display delivery from additional
    // source revisions; source proof comes from the original two raw envelopes.
  })));
  await import("../../../apps/pokernow-extension/src/eventSource.js");
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  const socket = new win.WebSocket(`wss://www.pokernow.com/socket.io/?gameID=${tableId}`);
  for (const frame of raw.frames) {
    now = frame.localReceivedAt;
    const payload = structuredClone(frame.payload);
    if (blocked && frame.event === "gC") payload.iHPI.pop();
    socket.incoming(frame.event, payload);
  }
  now = Date.parse(diagnostic.capturedAt); // Original decision age, not a renewed source timestamp.
  poll();
  const text = () => document.getElementById("poker-ai-reader-overlay")!.textContent!;
  const action = () => document.querySelector('#poker-ai-reader-overlay [style*="font-size:16px"]')?.textContent ?? null;
  return { read, poll, requests, text, action, socket, advance: (ms: number) => { now += ms; } };
}

describe("hand 68 production source -> policy -> content-script overlay", () => {
  it.each(["not-selected", "not-allowed", "llm-may-choose", "no-action"])("does not fabricate an immediate action: %s", variant => {
    const policy: DecisionPolicyResult = structuredClone(diagnostic.decision.policy);
    if (variant === "not-selected") policy.status = "uncertain";
    if (variant === "not-allowed") policy.activation!.allowed = false;
    if (variant === "llm-may-choose") policy.llmMayChoose = true;
    if (variant === "no-action") policy.chosenAction = null;
    expect(lockedEngineRecommendation(policy)).toBeNull();
  });
  it("shows FOLD synchronously while explanation is pending, then accepts only matching reasoning", async () => {
    const f = await fixture();
    expect(f.requests).toHaveLength(1);
    expect(f.requests[0]!.packet.decisionProofs.handId).toContain("vvmeaiftbzht");
    expect(f.action()).toBe("FOLD");
    expect(f.text()).toContain("explanation pending");
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy",
      result: { action: "FOLD", confidence: 0.99, reasoning: "Q6o is outside the UTG reference." } }) });
    await vi.waitFor(() => expect(f.text()).toContain("Q6o is outside"));
    expect(f.action()).toBe("FOLD");
    expect(f.text()).not.toContain("99%");
  });
  it("unchanged UI polls keep the locked FOLD without restarting the explanation", async () => {
    const f = await fixture();
    for (let i = 0; i < 3; i++) { f.advance(1000); f.poll(); expect(f.action()).toBe("FOLD"); }
    expect(f.requests).toHaveLength(1);
  });
  it.each(["expiry", "actor", "disconnect"])("clears FOLD on %s and rejects a late explanation", async reason => {
    const f = await fixture();
    if (reason === "expiry") f.advance(10001);
    if (reason === "actor") {
      f.read.raw.seats.find((s: any) => s.isYou)!.statusClasses = ["table-player", "you-player"];
      f.read.raw.seats.find((s: any) => s.seatNumber === 2)!.statusClasses = ["table-player", "decision-current"];
    }
    if (reason === "disconnect") f.socket.dispatchEvent(new Event("close"));
    f.poll();
    expect(f.action()).toBeNull();
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy",
      result: { action: "FOLD", confidence: 0.65, reasoning: "Stale explanation must not restore an action" } }) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBeNull();
    expect(f.text()).not.toContain("Stale explanation");
  });
  it.each(["network", "HTTP", "different action", "different size", "blocked"])("retains FOLD when explanation fails: %s", async kind => {
    const f = await fixture();
    if (kind === "network") f.requests[0]!.reject(new Error("offline"));
    else f.requests[0]!.resolve({ ok: kind !== "HTTP", json: async () => ({ ok: true, blocked: kind === "blocked", decisionSource: "engine_policy",
      result: { action: kind === "different action" ? "CALL" : "FOLD", ...(kind === "different size" ? { sizingBB: 2 } : {}), confidence: 0.99, reasoning: "Do not display this explanation" } }) });
    await vi.waitFor(() => expect(f.text()).toContain("explanation unavailable"));
    expect(f.action()).toBe("FOLD");
    expect(f.text()).not.toContain("Do not display");
  });
  it.each([false, true])("expired source cannot retain a result on response/failure (failure=%s)", async failure => {
    const f = await fixture();
    f.advance(10001); // No intervening poll: delivery must recheck proof freshness.
    if (failure) f.requests[0]!.reject(new Error("offline"));
    else f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, result: { action: "FOLD", confidence: 0.65, reasoning: "Old explanation" } }) });
    await vi.waitFor(() => expect(f.action()).toBeNull());
    expect(f.text()).not.toContain("Old explanation");
  });
  it("an old hand response cannot overwrite a newer decision", async () => {
    const f = await fixture();
    const next = structuredClone(raw.frames[1].payload);
    next.pre = next.now; next.now++; next.hI = "next-hand"; next.gN++;
    f.socket.incoming("gC", next); f.poll();
    expect(f.action()).toBeNull();
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, result: { action: "FOLD", confidence: 0.65, reasoning: "Old hand" } }) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBeNull(); expect(f.text()).not.toContain("Old hand");
  });
  it("blocked roster proof never creates a recommendation", async () => {
    const f = await fixture(true);
    expect(f.requests).toHaveLength(0); expect(f.action()).toBeNull();
  });
  it("renders a selected RAISE with the engine total, independently of an explanation", async () => {
    mocks.raiseDisplayOnly = true;
    const f = await fixture();
    expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
    expect(f.text()).toContain("explanation pending");
  });
});
