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

// Actual incoming envelopes -> MAIN bridge -> runtime -> live adapters -> engine
// -> contentScript overlay. No synthetic certificate or selected policy injection.
// Source envelopes are captured hands 150/168. DOM cross-checks are simulated
// using the existing reader result shape; card variants are explicitly synthetic.
async function live(options: { hand?: 150 | 168; cards?: string[]; control?: string; age?: number; delayTurn?: number; logActions?: string[];
  mutate?: (frames: any[], read: any) => void } = {}) {
  vi.resetModules();
  const captured = load(`pokernow-hj-${options.hand ?? 168}.json`);
  const frames = structuredClone(captured.frames);
  const boundary = frames.at(-3), turn = frames.at(-1), start = boundary.payload;
  const cards = options.cards ?? start.pC.PLAYER_1.cards.map((c: any) => c.value);
  start.pC.PLAYER_1.cards = cards.map((value: string) => ({ value, showing: false }));
  if (options.delayTurn) for (const f of frames.slice(-2)) f.localReceivedAt += options.delayTurn;
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
    if (id === start.cPI) seat.statusClasses.push("fold");
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
    else if (options.logActions && url.includes(`hand_number=${options.hand ?? 168}`)) resolve(new Response(JSON.stringify([
      { msg: `-- starting hand #${options.hand ?? 168}`, createdAt: "1000" },
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

describe("source-verified HJ decisions through MAIN, live adapter, policy and overlay", () => {
  it("replays original hand150 86o as HJ FOLD with six frozen positions and four active opponents", async () => {
    const f = await live({ hand: 150 });
    expect(f.action(), f.text()).toBe("FOLD");
    const p = f.requests[0]!.packet;
    expect(p.hero.position).toBe("HJ");
    expect(p.preflop).toMatchObject({ playersDealtIn: 6, openingEvidence: "hj_after_utg_fold", situation: "unopened", activeOpponents: 4 });
    expect(p.preflop.players.find((p: any) => p.position === "UTG")).toMatchObject({ seat: 10, folded: true });
    expect(p.preflop.actions).toEqual([{ seat: 10, action: "fold", totalContributionBB: 0, observation: 97, wagerAction: null }]);
    expect(p.facingAction.amountBB).toBe(1);
    expect(p.preflopExecution.exactOpeningSize.decisionWindow).toBe("hj_after_utg_fold");
    expect(evaluateDecisionPolicy(validateDecisionPacket(p))).toMatchObject({ status: "selected", chosenAction: "FOLD", llmMayChoose: false,
      activation: { allowed: true, state: "proof_ready" } });
    expect(f.text()).toContain("explanation pending");
    expect(f.socket.send).not.toHaveBeenCalled();
  });
  it("replays captured hand168 QQ as immediate exact-five HJ RAISE with panel closed", async () => {
    const f = await live();
    expect(f.action(), f.text()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
    const p = f.requests[0]!.packet, exact = p.preflopExecution.exactOpeningSize;
    expect(exact).toMatchObject({ decisionWindow: "hj_after_utg_fold", raiseToChips: 5, investmentChips: 5,
      contributionChips: 0, bigBlindChips: 2, controls: "panel_closed_unchecked",
      receivedAt: f.turn.localReceivedAt, expiresAt: f.turn.localReceivedAt + 10000 });
    expect(p.decisionProofs.proofs.find((p: any) => p.scope === "raiseLegality").status).toBe("proven");
    expect(evaluateDecisionPolicy(validateDecisionPacket(p))).toMatchObject({ status: "selected", chosenAction: "RAISE",
      llmMayChoose: false, activation: { allowed: true, state: "proof_ready" } });
    expect(f.text()).toContain("explanation pending");
    expect(f.socket.send).not.toHaveBeenCalled();
  });
  it("uses an explicitly synthetic 72o variant of hand168 for immediate FOLD", async () => {
    const f = await live({ cards: ["7h", "2d"] }); expect(f.action(), f.text()).toBe("FOLD");
    expect(f.text()).toContain("9.0s");
  });
  it.each(["ready", "different-selection"])("certifies five independently of panel selection: %s", async control => {
    const f = await live({ control });
    expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
    expect(f.requests[0]!.packet.preflopExecution.exactOpeningSize.controls).toBe(
      control === "ready" ? "selected_amount_matches" : "selected_amount_differs");
    expect(f.socket.send).not.toHaveBeenCalled();
  });
  it.each(["wrong-size", "wrong-bb", "disabled", "input-disabled", "input-readonly", "missing-input",
    "missing-submit", "hidden-submit", "duplicate"])("blocks RAISE for contradictory/unavailable controls: %s", async control => {
    const f = await live({ control });
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it.each(["unknown-rule", "version", "ante", "mode", "dead-button", "small-blind", "different-capacity"])(
    "blocks RAISE on profile or capacity mismatch: %s", async variant => {
      const f = await live({ mutate: (frames, read) => {
        const start = frames.at(-3).payload;
        if (variant === "unknown-rule") delete start.nR;
        if (variant === "version") start.fV = "0.1.73";
        if (variant === "ante") start.ante = 1;
        if (variant === "mode") start.mode = "unknown";
        if (variant === "dead-button") start.deadButton = true;
        if (variant === "small-blind") start.smallBlind = 2;
        if (variant === "different-capacity") read.raw.seats[0].stackText = "1000";
      } });
      expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    });
  it.each(["unknown-rule", "disabled-control"])("FOLD remains independent of sizing: %s", async variant => {
    const f = await live({ hand: 150, control: variant === "disabled-control" ? "disabled" : "closed",
      mutate: frames => { if (variant === "unknown-rule") delete frames.at(-3).payload.nR; } });
    expect(f.action()).toBe("FOLD");
    expect(f.requests[0]!.packet.preflopExecution.exactOpeningSize).toBeUndefined();
  });
  it.each(["missing-scope", "utg-scope", "CO", "BTN", "SB", "BB", "limped", "facing_open", "epoch", "hand", "generation", "expiry"])(
    "engine rejects transplanted or stale HJ sizing: %s", async variant => {
      const f = await live(), p = structuredClone(f.requests[0]!.packet), size = p.preflopExecution.exactOpeningSize;
      if (variant === "missing-scope") delete size.decisionWindow;
      if (variant === "utg-scope") size.decisionWindow = "first_utg_boundary";
      if (["CO", "BTN", "SB", "BB"].includes(variant)) p.hero.position = p.preflop.heroPosition = variant;
      if (["limped", "facing_open"].includes(variant)) p.preflop.situation = variant;
      if (variant === "epoch") size.decisionEpoch += "-other";
      if (variant === "hand") size.handId = "OTHER_HAND";
      if (variant === "generation") size.generation++;
      if (variant === "expiry") f.atAge(10000);
      p.decisionProofs.binding = decisionProofBinding(p, p.decisionProofs.decisionEpoch);
      expect(evaluateDecisionPolicy(p)).toMatchObject({ chosenAction: null, llmMayChoose: false });
    });
  it("a provider cannot replace the selected RAISE while its proof is fresh", async () => {
    const f = await live();
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: {
      action: "FOLD", confidence: 1, reasoning: "Provider attempts to choose another action" } }) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBe("RAISE TO 5 CHIPS (2.5 BB)");
  });
  it("engine does not turn an HJ chart RAISE into FOLD even with rebound generic sizing labels", async () => {
    const f = await live({ hand: 150 });
    const p = structuredClone(f.requests[0]!.packet);
    delete p.preflopExecution.exactOpeningSize;
    p.hero.holeCards = [{ rank: 12, suit: "s" }, { rank: 12, suit: "d" }];
    p.preflopExecution.raiseBounds = { verified: true, source: "negative-test input", minRaiseToBB: 2, chipUnitBB: 0.5 };
    const raise = p.decisionProofs.proofs.find((p: any) => p.scope === "raiseLegality");
    Object.assign(raise, { status: "proven", confidence: "high", provenance: ["negative-test label"], reasons: [] });
    p.decisionProofs.binding = decisionProofBinding(p, p.decisionProofs.decisionEpoch);
    expect(evaluateDecisionPolicy(p)).toMatchObject({ chosenAction: null, llmMayChoose: false });
  });
  it.each([150, 168] as const)("hand%i gets its deadline from genuine HJ activation, not the older anchor", async hand => {
    const f = await live({ hand, delayTurn: 20_000 });
    const action = hand === 150 ? "FOLD" : "RAISE TO 5 CHIPS (2.5 BB)";
    expect(f.now() - f.boundary.localReceivedAt).toBeGreaterThan(10_000);
    expect(f.action()).toBe(action); expect(f.text()).toContain("9.0s");
    f.atAge(9999); f.refresh(); expect(f.action()).toBe(action);
    f.atAge(10000); f.refresh(); expect(f.action()).toBeNull(); expect(f.text()).toContain("EVIDENCE EXPIRED");
    f.poll(); expect(f.action()).toBeNull();
  });
  it.each([150, 168] as const)("hand%i does not renew from controls, unchanged polls or provider failure", async hand => {
    const f = await live({ hand });
    const action = hand === 150 ? "FOLD" : "RAISE TO 5 CHIPS (2.5 BB)";
    f.atAge(4000); f.read.raiseControl = controls("ready"); f.poll(); expect(f.action()).toBe(action);
    expect(f.requests.at(-1)!.packet.preflopExecution.exactOpeningSize).toMatchObject({
      controls: "selected_amount_matches", expiresAt: f.turn.localReceivedAt + 10000 });
    expect(f.text()).toContain("6.0s");
    f.requests.at(-1)!.reject(new Error("relay offline")); await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBe(action);
    f.atAge(10000); f.refresh(); expect(f.action()).toBeNull();
  });
  it("allows the corroborating UTG fold and normal blinds without requiring log coverage", async () => {
    const f = await live({ hand: 150, logActions: ['"SB @ PLAYER_5" posts a small blind of 1',
      '"BB @ PLAYER_9" posts a big blind of 2', '"UTG @ PLAYER_10" folds'] });
    expect(f.action(), f.text()).toBe("FOLD");
  });
  it.each(['"UTG @ PLAYER_10" calls 2', '"HJ @ PLAYER_1" folds', 'unrecognized source text',
    '"HJ @ PLAYER_1" posts a missing small blind of 1'])("conflicting log row invalidates HJ: %s", async msg => {
    const f = await live({ hand: 150, logActions: [msg] }); expect(f.action()).toBeNull();
  });
  it("log and DOM folds cannot replace the missing source fold", async () => {
    const f = await live({ hand: 150, logActions: ['"UTG @ PLAYER_10" folds'], mutate: frames => { delete frames.at(-2).payload.pGS; } });
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it.each(([150, 168] as const).flatMap(hand => ["no-fold", "wrong-fold", "limp", "raise", "all-in", "extra-post", "combined", "unknown-field", "extra-update", "missing-update", "predecessor", "stale-cursor", "replay", "reconnect", "replacement", "changed-hand", "blind", "short-source", "short-dom", "wrong-actor", "wrong-dom-actor", "wrong-dom-fold", "stale-cards", "bb-walk"].map(variant => ({ hand, variant }))))("hand$hand rejects $variant without fabricating advice", async ({ hand, variant }) => {
    const f = await live({ hand, mutate: (frames, read) => {
      const start = frames.at(-3).payload, fold = frames.at(-2).payload, turn = frames.at(-1).payload;
      if (variant === "no-fold") delete fold.pGS;
      if (variant === "wrong-fold") fold.pGS = { PLAYER_2: "fold" };
      if (variant === "limp") fold.tB = { PLAYER_10: 2 };
      if (variant === "raise") fold.tB = { PLAYER_10: 5 };
      if (variant === "extra-post") fold.tB = { PLAYER_2: 1 };
      if (variant === "all-in") fold.pGS.PLAYER_10 = "allIn";
      if (variant === "combined") fold.cPI = "PLAYER_1";
      if (variant === "unknown-field") fold.unrecognizedAction = "call";
      if (variant === "extra-update") {
        const extra = structuredClone(frames.at(-2)); extra.payload = { pre: fold.pre, now: fold.pre + 1, eventsData: [] };
        fold.pre++; frames.splice(frames.length - 2, 0, extra);
      }
      if (variant === "missing-update") frames.splice(frames.length - 2, 1);
      if (variant === "predecessor") turn.pre++;
      if (variant === "stale-cursor") turn.now = turn.pre;
      if (variant === "replay") frames.splice(frames.length - 1, 0, structuredClone(frames.at(-2)));
      if (variant === "reconnect") frames.at(-1).connectionGeneration++;
      if (variant === "replacement") fold.players = { PLAYER_10: "<D>" };
      if (variant === "changed-hand") turn.hI = "OTHER_HAND";
      if (variant === "blind") start.tB.PLAYER_9 = 3;
      if (variant === "short-source") start.players = { PLAYER_1: { stack: 100 } };
      if (variant === "short-dom") read.raw.seats[0].stackText = "100";
      if (variant === "wrong-actor") turn.cPI = turn.pITT = "PLAYER_2";
      if (variant === "wrong-dom-actor") read.raw.seats[0].statusClasses = ["table-player", "you-player"];
      if (variant === "wrong-dom-fold") read.raw.seats.find((s: any) => s.seatNumber === 10).statusClasses = ["table-player"];
      if (variant === "stale-cards") read.raw.seats[0].holeCardClassLists = [["card-h", "card-s-A"], ["card-d", "card-s-A"]];
      if (variant === "bb-walk") { turn.gT = [1, 5]; turn.cPI = turn.pITT = null; }
    } });
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it.each(([150, 168] as const).flatMap(hand => ["expiry", "actor", "reconnect", "source-update"].map(variant => ({ hand, variant }))))("hand$hand rejects late explanations after $variant", async ({ hand, variant }) => {
    const f = await live({ hand }); expect(f.action()).toBe(hand === 150 ? "FOLD" : "RAISE TO 5 CHIPS (2.5 BB)");
    if (variant === "expiry") f.atAge(10000);
    if (variant === "actor") f.read.raw.seats[0].statusClasses = ["table-player", "you-player"];
    if (variant === "reconnect") f.socket.dispatchEvent(new Event("close"));
    if (variant === "source-update") f.incoming({ ...f.turn, localReceivedAt: f.now() + 1,
      payload: { pre: f.turn.payload.now, now: f.turn.payload.now + 1, eventsData: [] } });
    f.refresh(); expect(f.action()).toBeNull();
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: {
      action: "FOLD", confidence: 1, reasoning: "Late explanation must not appear" } }) });
    await new Promise(resolve => setTimeout(resolve, 0)); expect(f.action()).toBeNull(); expect(f.text()).not.toContain("Late explanation must not appear");
  });
});
