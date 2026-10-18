import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { readRaiseControl } from "../../../apps/pokernow-extension/src/raiseControlRead.js";
import { evaluateDecisionPolicy, decisionProofBinding, validateDecisionPacket } from "@poker-ai/ai-core";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../../../apps/pokernow-extension/src/tableRead.js", () => ({ readLiveTable: mocks.read }));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({ createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }) }));
const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

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

describe("captured CO windows through MAIN -> reducer -> policy -> overlay", () => {
  it.each([143, 149, 167] as const)("hand%i preserves original cards and frozen CO positions", async hand => {
    const f = await live({ hand }), action = hand === 143 ? "FOLD" : "RAISE TO 5 CHIPS (2.5 BB)";
    expect(f.action(), f.text()).toBe(action);
    const p = f.requests[0]!.packet;
    expect(p.hero.position).toBe("CO");
    expect(p.preflop).toMatchObject({ playersDealtIn: 6, activeOpponents: 3,
      openingEvidence: "co_after_utg_hj_folds", situation: "unopened" });
    expect(p.preflop.players.filter((p: any) => p.folded).map((p: any) => p.position)).toEqual(["UTG", "HJ"]);
    expect(p.preflop.actions).toEqual([f.frames.at(-4), f.frames.at(-2)].map(frame => ({
      seat: Number(Object.keys(frame.payload.pGS)[0]!.split("_")[1]), action: "fold", totalContributionBB: 0,
      observation: frame.localReceiveSequence, wagerAction: null,
    })));
    expect(evaluateDecisionPolicy(validateDecisionPacket(p))).toMatchObject({
      status: "selected", chosenAction: hand === 143 ? "FOLD" : "RAISE", llmMayChoose: false,
      activation: { state: "proof_ready", allowed: true },
    });
    expect(p.preflopExecution.exactOpeningSize).toMatchObject({
      decisionWindow: "co_after_utg_hj_folds", raiseToChips: 5, investmentChips: 5, contributionChips: 0,
      bigBlindChips: 2, receivedAt: f.turn.localReceivedAt, expiresAt: f.turn.localReceivedAt + 10000,
      controls: "panel_closed_unchecked",
    });
    expect(f.text()).toContain("explanation pending");
    expect(f.socket.send).not.toHaveBeenCalled();
  });
  it("uses CO activation after an older anchor and retains the original deadline across panel edits", async () => {
    const f = await live({ hand: 149 }); // Captured CO turn is 10.106s after boundary.
    expect(f.turn.localReceivedAt - f.boundary.localReceivedAt).toBe(10106);
    expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
    f.atAge(4000); f.read.raiseControl = controls("ready"); f.poll();
    expect(f.requests.at(-1)!.packet.preflopExecution.exactOpeningSize).toMatchObject({
      controls: "selected_amount_matches", expiresAt: f.turn.localReceivedAt + 10000 });
    expect(f.text()).toContain("6.0s");
    expect(f.requests.at(-1)!.packet.decisionProofs.decisionEpoch).not.toBe(f.requests[0]!.packet.decisionProofs.decisionEpoch);
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: {
      action: "RAISE", confidence: 1, reasoning: "old epoch explanation" } }) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)"); expect(f.text()).not.toContain("old epoch explanation");
    f.atAge(9999); f.refresh(); expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
    f.atAge(10000); f.refresh(); expect(f.action()).toBeNull(); expect(f.text()).toContain("EVIDENCE EXPIRED");
    f.poll(); expect(f.action()).toBeNull();
  });
  it.each(["ready", "different-selection"])("keeps certified sizing separate from %s controls", async control => {
    const f = await live({ control }); expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
    expect(f.requests[0]!.packet.preflopExecution.exactOpeningSize.controls).toBe(
      control === "ready" ? "selected_amount_matches" : "selected_amount_differs");
    if (control === "different-selection") expect(f.text()).toContain("Selected amount differs: manually set 5 chips");
  });
  it.each(["wrong-size", "wrong-bb", "disabled", "input-disabled", "input-readonly", "missing-input",
    "missing-submit", "hidden-submit", "duplicate"])("blocks RAISE with %s controls", async control => {
    const f = await live({ control }); expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("missing sizing blocks chart RAISE even when five is selected, without substituting FOLD", async () => {
    const f = await live({ control: "ready", mutate: frames => { delete frames.at(-5).payload.nR; } });
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    expect(f.text()).toContain("WAITING FOR PROOF");
  });
  it("FOLD needs neither exact-five profile nor usable Raise controls", async () => {
    const f = await live({ hand: 143, control: "disabled", mutate: frames => { delete frames.at(-5).payload.nR; } });
    expect(f.action()).toBe("FOLD");
    expect(f.requests[0]!.packet.preflopExecution.exactOpeningSize).toBeUndefined();
  });
  it.each([0, 1, 2, 3].flatMap(step => ["missing", "replay", "predecessor", "stale", "reconnect", "unknown", "coalesced", "wager"].map(variant => ({ step, variant }))))(
    "rejects $variant at CO-prefix step $step", async ({ step, variant }) => {
      const f = await live({ mutate: frames => {
        const i = frames.length - 4 + step, frame = frames[i], p = frame.payload;
        if (variant === "missing") frames.splice(i, 1);
        if (variant === "replay") frames.splice(i, 0, structuredClone(frame));
        if (variant === "predecessor") p.pre++;
        if (variant === "stale") p.now = p.pre;
        if (variant === "reconnect") frame.connectionGeneration++;
        if (variant === "unknown") p.unknownAction = "fold";
        if (variant === "coalesced") Object.assign(p, frames[i === frames.length - 1 ? i - 1 : i + 1].payload);
        if (variant === "wager") p.tB = { PLAYER_10: 2 };
      } });
      expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    });
  it.each(["wrong-utg", "wrong-hj", "wrong-hj-turn", "wrong-co-turn", "limp", "raise", "all-in", "extra-post", "roster", "table",
    "hand", "hero-id", "dealer", "profile", "version", "short-source", "short-dom", "stack-mismatch", "offline", "settling", "dom-position",
    "dom-actor", "dom-fold", "cards", "extra-update"])("rejects %s", async variant => {
      const f = await live({ mutate: (frames, read) => {
        const start = frames.at(-5).payload, fold1 = frames.at(-4).payload, turn1 = frames.at(-3).payload,
          fold2 = frames.at(-2).payload, turn2 = frames.at(-1).payload;
        if (variant === "wrong-utg") fold1.pGS = { PLAYER_10: "fold" };
        if (variant === "wrong-hj") fold2.pGS = { PLAYER_9: "fold" };
        if (variant === "wrong-hj-turn") turn1.cPI = turn1.pITT = "PLAYER_2";
        if (variant === "wrong-co-turn") turn2.cPI = turn2.pITT = "PLAYER_2";
        if (variant === "limp") fold2.tB = { PLAYER_10: 2 };
        if (variant === "raise") fold2.tB = { PLAYER_10: 5 };
        if (variant === "all-in") fold2.pGS = { PLAYER_10: "allIn" };
        if (variant === "extra-post") fold2.tB = { PLAYER_2: 1 };
        if (variant === "roster") fold2.players = { PLAYER_10: "<D>" };
        if (variant === "table") turn2.id = "OTHER_TABLE";
        if (variant === "hand") turn2.hI = "OTHER_HAND";
        if (variant === "hero-id") frames.find(f => f.event === "registered").payload.currentPlayer.id = "PLAYER_2";
        if (variant === "dealer") start.dealerSeat = 3;
        if (variant === "profile") start.ante = 1;
        if (variant === "version") start.fV = "0.1.73";
        if (variant === "short-source") start.players = { PLAYER_1: { stack: 100 } };
        if (variant === "short-dom") read.raw.seats[0].stackText = "100";
        if (variant === "stack-mismatch") read.raw.seats[0].stackText = "1000";
        if (variant === "offline") read.raw.seats[0].statusClasses.push("offline");
        if (variant === "settling") read.raw.seats[0].stackIsSettlement = true;
        if (variant === "dom-position") read.context.dealerSeatNumber = 3;
        if (variant === "dom-actor") read.raw.seats[0].statusClasses = ["table-player", "you-player"];
        if (variant === "dom-fold") read.raw.seats.find((s: any) => s.seatNumber === 10).statusClasses = ["table-player"];
        if (variant === "cards") read.raw.seats[0].holeCardClassLists = [["card-h", "card-s-A"], ["card-d", "card-s-A"]];
        if (variant === "extra-update") frames.push({ ...structuredClone(frames.at(-1)),
          payload: { pre: turn2.now, now: turn2.now + 1, eventsData: [] } });
      } });
      expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    });
  it.each([143, 149] as const)("hand%i accepts only matching log corroboration", async hand => {
    const f = await live({ hand, logActions: ['"SB @ PLAYER_3" posts a small blind of 1',
      '"BB @ PLAYER_5" posts a big blind of 2', '"UTG @ PLAYER_9" folds', '"HJ @ PLAYER_10" folds'] });
    expect(f.action(), f.text()).toBe(hand === 143 ? "FOLD" : "RAISE TO 5 CHIPS (2.5 BB)");
  });
  it.each(['"HJ @ PLAYER_10" calls 2', '"CO @ PLAYER_1" folds', '"SB @ PLAYER_3" posts a missing small blind of 1', "unknown poker action"])(
    "contradictory log remains fail-closed: %s", async msg => {
      const f = await live({ logActions: [msg] }); expect(f.action()).toBeNull();
    });
  it("reversed source log folds contradict the proven order", async () => {
    const f = await live({ logActions: ['"HJ @ PLAYER_10" folds', '"UTG @ PLAYER_9" folds'] });
    expect(f.action()).toBeNull();
  });
  it.each(["missing-size", "missing-scope", "hj-scope", "utg-scope", "BTN", "SB", "BB", "epoch", "hand", "generation"])(
    "engine rejects transplanted CO sizing: %s", async variant => {
      const f = await live(), p = structuredClone(f.requests[0]!.packet), size = p.preflopExecution.exactOpeningSize;
      if (variant === "missing-size") delete p.preflopExecution.exactOpeningSize;
      if (variant === "missing-scope") delete size.decisionWindow;
      if (variant === "hj-scope") size.decisionWindow = "hj_after_utg_fold";
      if (variant === "utg-scope") size.decisionWindow = "first_utg_boundary";
      if (["BTN", "SB", "BB"].includes(variant)) p.hero.position = p.preflop.heroPosition = variant;
      if (variant === "epoch") size.decisionEpoch += "-other";
      if (variant === "hand") size.handId = "OTHER";
      if (variant === "generation") size.generation++;
      p.decisionProofs.binding = decisionProofBinding(p, p.decisionProofs.decisionEpoch);
      expect(evaluateDecisionPolicy(p)).toMatchObject({ chosenAction: null, llmMayChoose: false });
    });
  it.each([143, 149] as const)("provider failure cannot remove fresh hand%i advice", async hand => {
    const f = await live({ hand }), action = f.action();
    f.requests[0]!.reject(new Error("relay offline"));
    await new Promise(resolve => setTimeout(resolve, 0)); expect(f.action()).toBe(action);
    f.atAge(10000); f.refresh(); expect(f.action()).toBeNull();
  });
  it("a provider cannot replace the engine's five-chip RAISE", async () => {
    const f = await live();
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: {
      action: "FOLD", confidence: 1, reasoning: "Override engine" } }) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)"); expect(f.text()).not.toContain("Override engine");
  });
  it.each(([143, 149] as const).flatMap(hand => ["expiry", "actor", "reconnect", "source-update"].map(variant => ({ hand, variant }))))(
    "hand$hand rejects late explanation after $variant", async ({ hand, variant }) => {
      const f = await live({ hand }); expect(f.action()).not.toBeNull();
      if (variant === "expiry") f.atAge(10000);
      if (variant === "actor") f.read.raw.seats[0].statusClasses = ["table-player", "you-player"];
      if (variant === "reconnect") f.socket.dispatchEvent(new Event("close"));
      if (variant === "source-update") f.incoming({ ...f.turn, localReceivedAt: f.now() + 1,
        payload: { pre: f.turn.payload.now, now: f.turn.payload.now + 1, eventsData: [] } });
      f.refresh(); expect(f.action()).toBeNull();
      f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: {
        action: hand === 143 ? "FOLD" : "RAISE", confidence: 1, reasoning: "Late CO explanation" } }) });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(f.action()).toBeNull(); expect(f.text()).not.toContain("Late CO explanation");
    });
});

// Actual incoming envelopes -> MAIN bridge -> runtime -> live adapters -> engine
// -> contentScript overlay. No synthetic certificate or selected policy injection.
// Source envelopes are captured hands 143/149/167. DOM cross-checks are simulated
// using the existing reader result shape; card variants are explicitly synthetic.
async function live(options: { hand?: 143 | 149 | 167; cards?: string[]; control?: string; age?: number; delayTurn?: number; logActions?: string[];
  mutate?: (frames: any[], read: any) => void } = {}) {
  vi.resetModules();
  const captured = load(`pokernow-co-${options.hand ?? 149}.json`);
  const frames = structuredClone(captured.frames);
  const boundary = frames.at(-5), turn = frames.at(-1), start = boundary.payload;
  const cards = options.cards ?? start.pC.PLAYER_1.cards.map((c: any) => c.value);
  start.pC.PLAYER_1.cards = cards.map((value: string) => ({ value, showing: false }));
  if (options.delayTurn) for (const f of frames.slice(-4)) f.localReceivedAt += options.delayTurn;
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
  read.context.dealerSeatNumber = start.dealerSeat;
  for (const seat of read.raw.seats) if (seat.isOccupied) {
    const id = `PLAYER_${seat.seatNumber}`;
    seat.betValueText = start.tB[id] === undefined ? null : String(start.tB[id]);
    if ([frames.at(-4), frames.at(-2)].some(f => Object.keys(f.payload.pGS)[0] === id)) seat.statusClasses.push("fold");
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
    else if (options.logActions && url.includes(`hand_number=${options.hand ?? 149}`)) resolve(new Response(JSON.stringify([
      { msg: `-- starting hand #${options.hand ?? 149}`, createdAt: "1000" },
      ...options.logActions.map((msg, i) => ({ msg, createdAt: String(1001 + i) })),
    ])));
    else if (options.logActions) resolve(new Response("[]"));
  })));
  await import("../../../apps/pokernow-extension/src/eventSource.js");
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  let socket!: Socket, generation = 0;
  const incoming = (f: any) => {
    now = f.localReceivedAt;
    while (generation < f.connectionGeneration) { generation++; socket = new win.WebSocket("wss://www.pokernow.com/socket.io/?gameID=TABLE_TEST"); }
    socket.incoming(f);
  };
  for (const f of frames) {
    incoming(f);
    // Exercise actual asynchronous log acquisition while the source advances;
    // otherwise archived-hand fetches still precede the target hand's request.
    if (options.logActions) { poll(); await new Promise(resolve => setTimeout(resolve, 0)); }
  }
  now = turn.localReceivedAt + (options.age ?? 1000); poll();
  if (options.logActions) { await new Promise(resolve => setTimeout(resolve, 0)); poll(); }
  return { read, requests, poll, refresh, incoming, socket, frames, boundary, turn, now: () => now,
    atAge: (age: number) => { now = turn.localReceivedAt + age; },
    action: () => document.querySelector('#poker-ai-reader-overlay [style*="font-size:16px"]')?.textContent ?? null,
    text: () => document.getElementById("poker-ai-reader-overlay")!.textContent! };
}
