import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { assessLiveState } from "./liveState.js";
import { readRaiseControl } from "../../../apps/pokernow-extension/src/raiseControlRead.js";
import { createFirstUtgSource, projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../../../apps/pokernow-extension/src/tableRead.js", () => ({ readLiveTable: mocks.read }));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({ createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }) }));
const load = (file: string) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), "utf8"));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("BB abstention through real MAIN -> reader -> overlay (no BB policy exists)", () => {
  it("recorded hand164 is a walk, not a free BB CHECK opportunity", async () => {
    const frames = load("pokernow-bb-walk-164.json").frames;
    expect(frames.at(-2).payload.pGS).toEqual({ PLAYER_10: "fold" });
    expect(frames.at(-1).payload).toMatchObject({ cPI: null, gT: [1, 5], gameResult: { PLAYER_1: { gained: 2 } } });
    expect(frames.slice(1).some((f: any) => f.payload.cPI === "PLAYER_1")).toBe(false);
    const f = await replay("walk");
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    expect(f.socket.send).not.toHaveBeenCalled();
  });
  it("the existing source authority issues no opening certificate for this registered BB walk", () => {
    let now = 0, hero: string | null = null;
    const source = createFirstUtgSource("TABLE_TEST", () => now);
    for (const f of load("pokernow-bb-walk-164.json").frames) {
      now = f.localReceivedAt;
      const p = projectFirstUtgSource("42" + JSON.stringify([f.event, f.payload]), hero);
      hero = p?.heroId ?? hero;
      source.accept(p, f.localReceiveSequence, f.connectionGeneration, now);
      expect([source.proof(), source.hjProof(), source.coProof(), source.btnProof(), source.sbProof()]).toEqual([null, null, null, null, null]);
      expect(source.diagnostic().historyComplete).toBe(false);
    }
  });
  // These mutations test rejection only. They are NOT captured six-player SB
  // completions, a verified call grammar, or positive BB permission fixtures.
  it.each(["limp", "raise", "wrong-actor", "missed", "gap", "reconnect", "replay", "expired", "changed-hand", "ambiguous-contribution"])(
    "synthetic %s cannot turn a legal-looking BB DOM option into advice", async variant => {
      const f = await replay(variant);
      expect(f.assessment.state?.seats.find(s => s.isYou)?.isCurrentToAct).toBe(true);
      expect(f.assessment.positions.get(1)).toBe("BB");
      expect(f.assessment.amountToCall).toBe(variant === "raise" ? 3 : 0);
      expect(f.action(), f.text()).toBeNull(); expect(f.requests).toHaveLength(0);
      f.age(20_000); f.poll(); expect(f.action()).toBeNull();
      expect(f.socket.send).not.toHaveBeenCalled();
    });
});

async function replay(variant: string) {
  vi.resetModules();
  const frames = load("pokernow-bb-walk-164.json").frames;
  const start = frames[0].payload.gameState, walk = variant === "walk";
  const amount = variant === "raise" ? 5 : 2;
  if (!walk) {
    // Intentionally hypothetical wager/activation: absence of a source contract
    // and BB strategy must still prevent any action, even with plausible totals.
    const wager = frames.at(-2).payload;
    delete wager.pGS;
    wager.tB = { PLAYER_10: amount };
    const last = frames.at(-1);
    last.payload = { ...structuredClone(frames.at(-3).payload), pre: wager.now, now: last.payload.now,
      cPI: "PLAYER_1", pITT: "PLAYER_1" };
    last.payload.pASA = last.payload.now;
    if (variant === "wrong-actor") last.payload.cPI = last.payload.pITT = "PLAYER_3";
    if (variant === "missed") frames.splice(-2, 1);
    if (variant === "gap") last.payload.pre++;
    if (variant === "reconnect") last.connectionGeneration++;
    if (variant === "replay") frames.splice(-1, 0, structuredClone(frames.at(-2)));
    if (variant === "changed-hand") last.payload.hI = "OTHER_HAND";
    if (variant === "ambiguous-contribution") wager.tB = { PLAYER_10: "2" };
  }
  const read = load("utg-reader-cross-check.json").read;
  read.context.dealerSeatNumber = start.dealerSeat;
  const folded = [2, 3, 5, 9, ...(walk ? [10] : [])];
  for (const seat of read.raw.seats) if (seat.isOccupied) {
    const id = `PLAYER_${seat.seatNumber}`;
    seat.statusClasses = ["table-player", ...(seat.isYou ? ["you-player"] : []),
      ...(folded.includes(seat.seatNumber) ? ["fold"] : []), ...(!walk && seat.isYou ? ["decision-current"] : [])];
    seat.stackText = seat.stackContainerText = String(start.players[id].stack - (start.tB[id] ?? 0));
    seat.betValueText = walk ? null : id === "PLAYER_1" ? "2" : id === "PLAYER_10" ? String(amount) : null;
    if (seat.isYou) seat.holeCardClassLists = start.pC.PLAYER_1.cards.map((c: any) => ["card-container", `card-${c.value[1]}`, `card-s-${c.value[0]}`, "flipped", "med"]);
  }
  read.raw.potMainValueText = "0";
  read.raw.potTotalValueText = walk ? "0" : String(amount + 2);
  const assessment = assessLiveState(read.raw, read.context);
  const { document } = parseHTML("<html><body></body></html>");
  read.raiseControl = readRaiseControl(document, () => true);
  const location = new URL("https://www.pokernow.com/games/TABLE_TEST");
  const listeners: Array<(e: any) => void> = [];
  let now = frames[0].localReceivedAt, poll = () => {};
  class Socket extends EventTarget {
    send = vi.fn();
    constructor(public url: string) { super(); }
    incoming(f: any) { this.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([f.event, f.payload]) })); }
  }
  const win = { location, WebSocket: Socket, setTimeout: () => 1, clearTimeout() {},
    addEventListener: (type: string, cb: (e: any) => void) => { if (type === "message") listeners.push(cb); },
    postMessage: (data: unknown) => { for (const cb of listeners) cb({ source: win, origin: location.origin, data }); },
    sessionStorage: { getItem: () => null } };
  vi.stubGlobal("window", win); vi.stubGlobal("document", document); vi.stubGlobal("location", location);
  vi.stubGlobal("localStorage", { getItem: () => null });
  vi.spyOn(Date, "now").mockImplementation(() => now);
  vi.stubGlobal("setInterval", (cb: () => void, ms: number) => { if (ms !== 250) poll = cb; return 1; });
  for (const method of ["log", "warn", "error"] as const) vi.spyOn(console, method).mockImplementation(() => {});
  mocks.read.mockImplementation(() => read);
  const requests: unknown[] = [];
  vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit) => new Promise(() => {
    if (url.endsWith("/recommendation")) requests.push(JSON.parse(init.body as string));
  })));
  await import("../../../apps/pokernow-extension/src/eventSource.js");
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  let socket!: Socket, generation = 0;
  for (const f of frames) {
    now = f.localReceivedAt;
    while (generation < f.connectionGeneration) { generation++; socket = new win.WebSocket("wss://www.pokernow.com/socket.io/?gameID=TABLE_TEST"); }
    socket.incoming(f);
  }
  now += variant === "expired" ? 10_001 : 1_000; poll();
  return { requests, socket, poll, assessment, age: (ms: number) => { now += ms; },
    action: () => document.querySelector('#poker-ai-reader-overlay [style*="font-size:16px"]')?.textContent ?? null,
    text: () => document.getElementById("poker-ai-reader-overlay")!.textContent! };
}
