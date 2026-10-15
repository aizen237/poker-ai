import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../../../apps/pokernow-extension/src/tableRead.js", () => ({ readLiveTable: mocks.read }));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({ createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }) }));

// Full retained production projections. Reconstructed envelopes never add
// discarded raw fields; current DOM inputs are the saved cross-check shape.
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function fixture(file: string, mutate?: (rows: any[]) => void, truncateInventory = false, firstPollAge?: number) {
  const diagnostic = JSON.parse(readFileSync(new URL(`../../../evidence/${file}`, import.meta.url), "utf8"));
  const observations = structuredClone(diagnostic.handTimeline.sourceStatus.firstUtgEvidence.observations)
    .filter((o: any) => file.includes("115") ? o.sequence <= 67 : true);
  mutate?.(observations);
  const boundary = observations.at(-1);
  vi.resetModules();
  const { document } = parseHTML("<html><body></body></html>");
  const tableId = diagnostic.handTimeline.sourceStatus.identity.tableId;
  const location = new URL(`https://www.pokernow.com/games/${tableId}`);
  const listeners: Array<(event: any) => void> = [];
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let timerId = 0;
  class Socket extends EventTarget {
    send = vi.fn();
    constructor(public url: string) { super(); }
    incoming(event: string, payload: unknown) { this.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([event, payload]) })); }
  }
  const win = { location, WebSocket: Socket,
    setTimeout: (callback: () => void, delay: number) => { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout: (id: number) => { timers.delete(id); },
    addEventListener: (type: string, listener: (event: any) => void) => { if (type === "message") listeners.push(listener); },
    postMessage: (data: unknown) => { for (const listener of listeners) listener({ source: win, origin: location.origin, data }); },
    sessionStorage: { getItem: () => null },
  };
  vi.stubGlobal("window", win); vi.stubGlobal("document", document); vi.stubGlobal("location", location);
  vi.stubGlobal("localStorage", { getItem: () => null });
  let now = observations[0].observedAt;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  for (const method of ["log", "warn", "error"] as const) vi.spyOn(console, method).mockImplementation(() => {});
  let poll = () => {};
  let refresh = () => {};
  vi.stubGlobal("setInterval", (callback: () => void, ms: number) => { if (ms === 250) refresh = callback; else poll = callback; return 1; });
  const read = structuredClone({ raw: diagnostic.raw, context: diagnostic.context, evidence: diagnostic.evidence, raiseControl: diagnostic.legality.raiseControl });
  mocks.read.mockImplementation(() => read);
  const requests: Array<{ packet: any; resolve: (r: unknown) => void; reject: (e: Error) => void }> = [];
  const logs: Array<{ url: string; resolve: (r: unknown) => void }> = [];
  vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit) => new Promise((resolve, reject) => {
    if (url.endsWith("/recommendation")) requests.push({ packet: JSON.parse(init.body as string).decisionPacket, resolve, reject });
    else if (url.includes("/log_v3?")) logs.push({ url, resolve });
    // Tests can deliver the saved log rows; otherwise keep acquisition pending
    // to isolate source/expiry delivery from HTTP revisions.
  })));
  await import("../../../apps/pokernow-extension/src/eventSource.js");
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  let socket: Socket;
  let generation = 0;
  const incoming = (o: any) => {
    now = o.observedAt;
    while (generation < o.generation) { generation++; socket = new win.WebSocket(`wss://www.pokernow.com/socket.io/?gameID=${tableId}`); }
    const p = structuredClone(o.projection);
    // Synthetic inventory-cap regression, not fabricated live envelope fields.
    // The real projector retains its known values despite unrelated fields.
    if (truncateInventory && p.event !== "gC") p.frame = { ...Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`diagnosticExtra${i}`, 0])), ...p.frame };
    socket!.incoming(p.event, p.event === "registered" ? { gameState: p.frame, currentPlayer: { id: p.heroId } } : p.frame);
  };
  for (const o of observations) incoming(o);
  now = boundary.observedAt + (firstPollAge ?? (file.includes("133") ? Date.parse(diagnostic.capturedAt) - boundary.observedAt : file.includes("127") ? 9026 : 1000));
  poll();
  const text = () => document.getElementById("poker-ai-reader-overlay")!.textContent!;
  const action = () => document.querySelector('#poker-ai-reader-overlay [style*="font-size:16px"]')?.textContent ?? null;
  return { read, poll, refresh, timers, document, requests, logs, text, action, socket: socket!, incoming, atAge: (ms: number) => { now = boundary.observedAt + ms; } };
}

describe("one scoped continuity contract from MAIN bridge through live overlay", () => {
  it.each(["hand-103-reconnect-diagnostic.json", "hand-115-diagnostic.json", "hand-121-diagnostic.json", "hand-127-diagnostic.json"])("selects and displays fresh FOLD for %s without LLM or raise proof", async file => {
    const f = await fixture(file);
    expect(f.action()).toBe("FOLD");
    expect(f.requests).toHaveLength(1);
    expect(f.requests[0]!.packet.decisionProofs.proofs.find((p: any) => p.scope === "connection")).toMatchObject({ status: "proven", confidence: "high" });
    expect(f.requests[0]!.packet.decisionProofs.proofs.find((p: any) => p.scope === "raiseLegality").status).toBe("insufficient");
    if (file.includes("127")) expect(f.text()).toContain("Evidence expires in 1.0s");
    f.atAge(10000); f.refresh();
    expect(f.action()).toBeNull(); expect(f.text()).toContain("EVIDENCE EXPIRED");
  });
  it("inventory truncation cannot veto a validated full-source prefix", async () => {
    const f = await fixture("hand-127-diagnostic.json", undefined, true);
    expect(f.action()).toBe("FOLD");
    expect(f.socket.send).not.toHaveBeenCalled();
  });
  it.each(["malformed-registration", "mismatched-refresh", "missing-update", "replayed-update", "generation", "wrong-actor"])("blocks %s even when metadata looks continuous", async variant => {
    const f = await fixture("hand-127-diagnostic.json", rows => {
      const reg = rows.find(o => o.sequence === 90), refresh = rows.find(o => o.sequence === 91);
      if (variant === "malformed-registration") delete reg.projection.frame.players.v7UmNXTwjJ.id;
      if (variant === "mismatched-refresh") refresh.projection.frame.players.v7UmNXTwjJ.stack++;
      if (variant === "missing-update") rows.splice(rows.findIndex(o => o.sequence === 93), 1);
      if (variant === "replayed-update") rows.splice(rows.findIndex(o => o.sequence === 93), 0, structuredClone(refresh));
      if (variant === "generation") rows.at(-1).generation++;
      if (variant === "wrong-actor") rows.at(-1).projection.frame.cPI = "amlHsejLtc";
    });
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("does not recover an incomplete replacement through a later hand", async () => {
    const f = await fixture("hand-121-diagnostic.json", rows => { delete rows[5].projection.frame.pGS["nQ-ZBcAfge"]; });
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("reconnect clears the action and an old LLM response cannot restore it", async () => {
    const f = await fixture("hand-127-diagnostic.json");
    expect(f.action()).toBe("FOLD");
    f.socket.dispatchEvent(new Event("close")); f.refresh();
    expect(f.action()).toBeNull();
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: { action: "FOLD", confidence: 0.65, reasoning: "Old generation" } }) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBeNull(); expect(f.text()).not.toContain("Old generation");
  });
});

describe("hand 133 actual source-to-overlay lifecycle", () => {
  it("identifies the saved legacy contract shape instead of trusting generic activation labels", () => {
    for (const file of ["hand-133-early.json", "hand-133-late.json"]) {
      const saved = JSON.parse(readFileSync(new URL(`../../../evidence/${file}`, import.meta.url), "utf8"));
      expect(Object.hasOwn(saved.handTimeline.sourceStatus, "firstUtgProof")).toBe(false);
    }
  });
  it("renders QTo FOLD at the actual early capture time (8.858s), before any HTTP response", async () => {
    const f = await fixture("hand-133-early.json");
    expect(f.action()).toBe("FOLD");
    expect(f.text()).toContain("Evidence expires in 1.1s");
    expect(f.requests).toHaveLength(1);
    expect(f.requests[0]!.packet.decisionProofs.proofs.find((p: any) => p.scope === "connection").status).toBe("proven");
    expect(f.requests[0]!.packet.decisionProofs.proofs.find((p: any) => p.scope === "raiseLegality").status).toBe("insufficient");
    expect(f.socket.send).not.toHaveBeenCalled();
  });
  it("keeps FOLD through simulated one-second polls and clears it at the original deadline", async () => {
    // Saved DOM is held constant in this simulation; the captures do not record
    // historical DOM polls. Phase .858 aligns the last fresh poll with export.
    const f = await fixture("hand-133-early.json", undefined, false, 858);
    for (let age = 858; age < 10000; age += 1000) {
      f.atAge(age); f.poll(); f.refresh();
      expect(f.action()).toBe("FOLD");
    }
    expect(f.requests).toHaveLength(1);
    f.atAge(10000); f.refresh();
    expect(f.action()).toBeNull(); expect(f.text()).toContain("EVIDENCE EXPIRED");
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: { action: "FOLD", confidence: 0.65, reasoning: "Late hand133 explanation" } }) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBeNull(); expect(f.text()).not.toContain("Late hand133 explanation");
    f.atAge(18857); f.poll();
    expect(f.action()).toBeNull();
  });
  it("cannot create a recommendation from the late capture at 18.857s", async () => {
    const f = await fixture("hand-133-late.json");
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("saved hand133 log rows advance the epoch without hiding fresh FOLD", async () => {
    const saved = JSON.parse(readFileSync(new URL("../../../evidence/hand-133-early.json", import.meta.url), "utf8"));
    const f = await fixture("hand-133-early.json", undefined, false, 0);
    let deliveredCurrentHand = false;
    for (const age of [0, 3000, 6000, 9000]) {
      f.atAge(age); f.poll();
      const request = f.logs.shift()!;
      expect(request).toBeDefined();
      const currentHand = request.url.includes("hand_number=133");
      deliveredCurrentHand ||= currentHand;
      // Prior-hand HTTP contents were not saved: empty responses are scheduling
      // scaffolding only. Current rows/text/timestamps are the captured evidence.
      const rows = currentHand ? saved.handTimeline.current.events.map((e: any) =>
        ({ msg: e.evidence, createdAt: e.sourceTimestampRaw })) : [];
      request.resolve(new Response(JSON.stringify(rows)));
      await new Promise(resolve => setTimeout(resolve, 0));
      f.poll(); expect(f.action()).toBe("FOLD");
    }
    expect(deliveredCurrentHand).toBe(true);
    expect(f.requests.length).toBeGreaterThan(1);
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: { action: "FOLD", confidence: 0.65, reasoning: "Superseded hand133 explanation" } }) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBe("FOLD"); expect(f.text()).not.toContain("Superseded hand133 explanation");
  });
  it("provider failure does not hide a still-fresh engine FOLD", async () => {
    const f = await fixture("hand-133-early.json");
    f.requests[0]!.reject(new Error("relay unavailable"));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBe("FOLD");
    f.atAge(10000); f.refresh(); expect(f.action()).toBeNull();
  });
});

