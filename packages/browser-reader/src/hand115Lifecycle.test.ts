import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseHTML, Event as DOMEvent } from "linkedom";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../../../apps/pokernow-extension/src/tableRead.js", () => ({ readLiveTable: mocks.read }));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({ createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }) }));
const diagnostic = JSON.parse(readFileSync(new URL("../../../evidence/hand-115-diagnostic.json", import.meta.url), "utf8"));
const observations = diagnostic.handTimeline.sourceStatus.firstUtgEvidence.observations;
const boundary = observations.find((o: any) => o.sequence === 67);
// Full retained production projections. Reconstructed envelopes never add
// discarded raw fields; current DOM inputs are the saved cross-check shape.
afterEach(() => { mocks.read.mockReset(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function createFixture() {
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
  const socket = new win.WebSocket(`wss://www.pokernow.com/socket.io/?gameID=${tableId}`);
  const incoming = (o: any) => {
    now = o.observedAt;
    const p = o.projection;
    socket.incoming(p.event, p.event === "registered" ? { gameState: p.frame, currentPlayer: { id: p.heroId } } : p.frame);
  };
  for (const o of observations.filter((o: any) => o.sequence <= 67)) incoming(o);
  const text = () => document.getElementById("poker-ai-reader-overlay")!.textContent!;
  const action = () => document.querySelector('#poker-ai-reader-overlay [style*="font-size:16px"]')?.textContent ?? null;
  return { read, poll, refresh, timers, document, requests, logs, text, action, socket, incoming,
    start: (firstPollAge: number) => { now = boundary.observedAt + firstPollAge; poll(); },
    atAge: (ms: number) => { now = boundary.observedAt + ms; } };
}

// Cold module loading belongs to setup, not the visibility/deadline test's budget.
// Each case still boots an isolated runtime and controls its first poll explicitly.
let currentFixture: Awaited<ReturnType<typeof createFixture>>;
beforeEach(async () => { currentFixture = await createFixture(); });
function fixture(firstPollAge = 0) {
  currentFixture.start(firstPollAge);
  return currentFixture;
}

const explain = (request: { resolve: (r: unknown) => void }, reasoning = "A3o is outside the UTG reference.") =>
  request.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy",
    result: { action: "FOLD", confidence: 0.65, reasoning } }) });

describe("hand 115 real source -> policy -> overlay lifecycle", () => {
  it("checks the deadline when a throttled page becomes visible again", async () => {
    const f = await fixture(); f.atAge(20000);
    f.document.dispatchEvent(new DOMEvent("visibilitychange"));
    expect(f.action()).toBeNull();
    expect(f.text()).toContain("EVIDENCE EXPIRED");
  });
  it("withholds advice if the countdown refresh cannot read the table", async () => {
    const f = await fixture(); f.atAge(2000);
    mocks.read.mockImplementationOnce(() => { throw new Error("unreadable"); });
    f.refresh();
    expect(f.action()).toBeNull();
    expect(f.text()).toContain("BLOCKED");
    expect(f.text()).not.toContain("Evidence expires in");
    expect(f.timers.size).toBe(0);
  });
  it("counts down from the certificate deadline, not first render or explanation", async () => {
    const f = await fixture(8000);
    expect(f.text()).toContain("Evidence expires in 2.0s");
    expect([...f.timers.values()][0]!.delay).toBe(2000);
    f.atAge(8500); f.refresh();
    expect(f.text()).toContain("Evidence expires in 1.5s");
    explain(f.requests[0]!);
    await vi.waitFor(() => expect(f.text()).toContain("A3o is outside"));
    expect(f.text()).toContain("Evidence expires in 1.5s");
    f.atAge(10000); [...f.timers.values()][0]!.callback();
    expect(f.action()).toBeNull();
    expect(f.text()).toContain("EVIDENCE EXPIRED");
    expect(f.text()).not.toContain("RECOMMENDATION AVAILABLE");
    expect(f.text()).not.toContain("Confidence:");
    expect(f.text()).not.toContain("A3o is outside");
    f.atAge(11000); f.poll();
    expect(f.text()).toContain("EVIDENCE EXPIRED");
  });
  it("late provider delivery cannot restore an action removed by the deadline timer", async () => {
    const f = await fixture();
    f.atAge(10000); [...f.timers.values()][0]!.callback();
    explain(f.requests[0]!, "Expired timer explanation");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.text()).toContain("EVIDENCE EXPIRED");
    expect(f.text()).not.toContain("Expired timer explanation");
    expect(f.action()).toBeNull();
  });
  it.each(["cards", "hand", "actor", "reconnect"])("clears the expiry label on %s without retaining old advice", async variant => {
    const f = await fixture(); f.atAge(10000); f.refresh();
    expect(f.text()).toContain("EVIDENCE EXPIRED");
    if (variant === "cards") f.read.raw.seats.find((s: any) => s.isYou)!.holeCardClassLists[0] = ["flipped", "card-s-K", "card-d"];
    else if (variant === "reconnect") f.socket.dispatchEvent(new Event("close"));
    else f.socket.incoming("gC", { pre: boundary.projection.frame.now, now: boundary.projection.frame.now + 1,
      ...(variant === "hand" ? { hI: "new-hand", gN: 116 } : { cPI: "amlHsejLtc", pITT: "amlHsejLtc" }), eventsData: [] });
    f.refresh();
    expect(f.action()).toBeNull();
    expect(f.text()).not.toContain("EVIDENCE EXPIRED");
    expect(f.text()).not.toContain("Evidence expires in");
  });
  it("keeps FOLD through unchanged polls, then expires BEFORE any later captured gC", async () => {
    const f = await fixture();
    expect(f.requests).toHaveLength(1);
    expect(f.requests[0]!.packet.decisionProofs.handId).toContain("oacpsi6ju66i");
    expect(f.action()).toBe("FOLD");
    for (const age of [1000, 2000, 3000, 9000, 9999]) {
      f.atAge(age); f.poll(); expect(f.action()).toBe("FOLD");
    }
    expect(f.requests).toHaveLength(1);
    f.atAge(10001); f.poll();
    expect(f.action()).toBeNull();
    expect(f.text()).toContain("EVIDENCE EXPIRED");
    expect(observations.slice(67).map((o: any) => o.observedAt - boundary.observedAt)).toEqual([24025, 24589, 35738, 37026]);
    for (const o of observations.slice(67)) { f.incoming(o); f.poll(); expect(f.action()).toBeNull(); }
    expect(f.requests).toHaveLength(1);
    f.atAge(Date.parse(diagnostic.capturedAt) - boundary.observedAt); f.poll();
    expect(Date.parse(diagnostic.capturedAt) - boundary.observedAt).toBe(68400);
    expect(f.action()).toBeNull();
  });
  it("a simulated late explanation does not restart the ten-second clock", async () => {
    const f = await fixture();
    f.atAge(8000); explain(f.requests[0]!);
    await vi.waitFor(() => expect(f.text()).toContain("A3o is outside"));
    expect(f.action()).toBe("FOLD");
    f.atAge(10001); f.poll();
    expect(f.action()).toBeNull();
    // This reproduces ~2 seconds between explanation and removal, but the
    // capture contains no actual LLM completion/display timestamp.
  });
  it("saved log metadata can change the request epoch without losing the still-proven FOLD", async () => {
    const f = await fixture();
    for (const age of [0, 3000, 6000, 9000]) {
      f.atAge(age); f.poll();
      const request = f.logs.shift()!;
      expect(request).toBeDefined();
      // Empty old-hand responses are test scaffolding. The current-hand text
      // and timestamps are the exact saved rows, reparsed by production code.
      const rows = request.url.includes("hand_number=115") ? diagnostic.handTimeline.current.events.map((e: any) =>
        ({ msg: e.evidence, createdAt: e.sourceTimestampRaw })) : [];
      request.resolve(new Response(JSON.stringify(rows)));
      await new Promise(resolve => setTimeout(resolve, 0));
      f.poll(); expect(f.action()).toBe("FOLD");
    }
    expect(f.requests.length).toBeGreaterThan(1);
    explain(f.requests[0]!, "Superseded explanation");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBe("FOLD"); expect(f.text()).not.toContain("Superseded explanation");
    f.atAge(10001); f.poll(); expect(f.action()).toBeNull();
  });
  it("a late first readable decision has only the original remaining proof lifetime", async () => {
    const f = await fixture(8000);
    expect(f.action()).toBe("FOLD");
    f.atAge(10001); f.poll();
    expect(f.action()).toBeNull();
    expect(f.requests).toHaveLength(1);
  });
  it.each([false, true])("late LLM delivery cannot restore expired FOLD (failure=%s)", async failure => {
    const f = await fixture(); f.atAge(10001); // Delivery before the next UI poll.
    if (failure) f.requests[0]!.reject(new Error("late failure")); else explain(f.requests[0]!, "Expired explanation");
    await vi.waitFor(() => expect(f.action()).toBeNull());
    expect(f.text()).not.toContain("Expired explanation");
  });
  it.each(["actor", "reconnect", "cards", "hand", "gap", "same-hand-update"])("invalidates on %s and rejects old-epoch explanation", async variant => {
    const f = await fixture(); f.atAge(2000);
    if (variant === "reconnect") f.socket.dispatchEvent(new Event("close"));
    else if (variant === "cards") f.read.raw.seats.find((s: any) => s.isYou)!.holeCardClassLists[0] = ["flipped", "card-s-K", "card-d"];
    else {
      // Explicit negative/scenario mutations, not additional hand-115 frames.
      const patch: any = { pre: boundary.projection.frame.now, now: boundary.projection.frame.now + 1, eventsData: [] };
      if (variant === "actor") patch.cPI = patch.pITT = "amlHsejLtc";
      if (variant === "hand") { patch.hI = "other-hand"; patch.gN = 116; }
      if (variant === "gap") patch.pre--;
      f.socket.incoming("gC", patch);
    }
    f.poll(); expect(f.action()).toBeNull();
    explain(f.requests[0]!, "Old epoch explanation");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBeNull(); expect(f.text()).not.toContain("Old epoch explanation");
  });
});

