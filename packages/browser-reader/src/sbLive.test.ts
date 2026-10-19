import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { readRaiseControl } from "../../../apps/pokernow-extension/src/raiseControlRead.js";
import { evaluateDecisionPolicy, decisionProofBinding, validateDecisionPacket, evaluatePreflopReference, unopenedChartAction } from "@poker-ai/ai-core";

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


describe("recorded SB sequence through MAIN -> source proof -> policy -> overlay", () => {
  it.each(["closed", "ready", "different-selection", "wrong-bb", "disabled", "duplicate"])(
    "hand212 original77 remains blocked with %s controls: accepted total does not reveal input", async control => {
      const f = await live({ hand: 212, control });
      expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
      expect(f.text()).toContain("hand212 accepted source total=5");
      expect(f.text()).toContain("no paired control evidence");
      expect(f.socket.send).not.toHaveBeenCalled();
    });
  it("hand212 acceptance outside the deadline cannot authorize or renew the decision", async () => {
    const f = await live({ hand: 212 });
    const [raise, bbTurn] = load("pokernow-sb-212.json").frames.slice(-2);
    expect(raise.localReceivedAt - f.turn.localReceivedAt).toBe(41772);
    expect(raise.payload.tB.PLAYER_1 - f.boundary.payload.tB.PLAYER_1).toBe(4);
    f.atAge(10000); f.refresh(); f.poll(); expect(f.action()).toBeNull();
    f.incoming(raise); f.refresh(); f.poll();
    f.incoming(bbTurn); f.refresh(); f.poll();
    // Deliberately stale DOM still shows hero SB: source/expiry must veto it.
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("synthetic out-of-chart hand212 preserves FOLD and cannot be resurrected by acceptance or late explanation", async () => {
    const f = await live({ hand: 212, cards: ["7c", "2d"] });
    expect(f.action(), f.text()).toBe("FOLD");
    const pending = f.requests[0]!;
    f.atAge(9999); f.refresh(); expect(f.action()).toBe("FOLD");
    f.atAge(10000); f.refresh(); expect(f.action()).toBeNull(); expect(f.text()).toContain("EVIDENCE EXPIRED");
    for (const frame of load("pokernow-sb-212.json").frames.slice(-2)) f.incoming(frame);
    f.refresh(); f.poll();
    pending.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: {
      action: "FOLD", confidence: 1, reasoning: "Expired hand212 explanation" } }) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(f.action()).toBeNull(); expect(f.text()).not.toContain("Expired hand212 explanation");
  });
  it("hand165 original Q9o displays FOLD, preserves six positions and the posted blind", async () => {
    const f = await live(); expect(f.action(), f.text()).toBe("FOLD");
    const p = f.requests[0]!.packet;
    expect(p.hero.position).toBe("SB");
    expect(p.preflop).toMatchObject({ playersDealtIn: 6, activeOpponents: 1,
      amountToCallBB: 0.5, openingEvidence: "sb_after_utg_hj_co_btn_folds", situation: "unopened" });
    expect(p.preflop.players.filter((p: any) => p.folded).map((p: any) => p.position)).toEqual(["BTN", "UTG", "HJ", "CO"]);
    expect(p.preflop.players.filter((p: any) => !p.folded).map((p: any) => p.position)).toEqual(["SB", "BB"]);
    expect(p.preflop.actions).toEqual([f.frames.at(-8), f.frames.at(-6), f.frames.at(-4), f.frames.at(-2)].map(frame => ({
      seat: Number(Object.keys(frame.payload.pGS)[0]!.split("_")[1]), action: "fold", totalContributionBB: 0,
      observation: frame.localReceiveSequence, wagerAction: null,
    })));
    expect(p.preflop.players.find((p: any) => p.position === "SB").contributionBB).toBe(0.5);
    expect(p.preflop.players.find((p: any) => p.position === "BB").contributionBB).toBe(1);
    expect(p.facingAction.amountBB).toBe(0.5); // One additional chip, not the two-chip total.
    expect(p.hero.stackBB * 2).toBe(Number(f.read.raw.seats[0].stackText));
    expect(p.preflopExecution.exactOpeningSize).toBeUndefined();
    expect(evaluateDecisionPolicy(validateDecisionPacket(p))).toMatchObject({ status: "selected", chosenAction: "FOLD",
      llmMayChoose: false, activation: { state: "proof_ready", allowed: true } });
    expect(f.text()).toContain("explanation pending"); expect(f.text()).toContain("9.0s");
    expect(f.socket.send).not.toHaveBeenCalled();
  });
  it.each(["closed", "ready", "disabled", "wrong-bb", "duplicate"])("FOLD is independent of %s Raise controls and pot/sizing proofs", async control => {
    const f = await live({ control, mutate: frames => { delete frames.at(-9).payload.nR; } });
    expect(f.action(), f.text()).toBe("FOLD");
    const p = f.requests[0]!.packet;
    expect(p.decisionProofs.proofs.find((p: any) => p.scope === "pot").status).not.toBe("proven");
    expect(p.decisionProofs.proofs.find((p: any) => p.scope === "raiseLegality")).toMatchObject({ status: "insufficient" });
  });
  it.each(["closed", "ready", "different-selection", "wrong-size", "disabled", "duplicate"])(
    "hand147 original 33 is chart RAISE but remains blocked with %s controls", async control => {
      const f = await live({ hand: 147, control });
      expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
      expect(f.text()).toContain("SB sizing is unverified"); expect(f.text()).toContain("additional investment=4");
      expect(f.text()).toContain("WAITING FOR PROOF"); expect(f.socket.send).not.toHaveBeenCalled();
    });
  it("synthetic 72o on the hand147 source path is FOLD, not a substitute for 33", async () => {
    const f = await live({ hand: 147, cards: ["7c", "2d"] }); expect(f.action(), f.text()).toBe("FOLD");
  });
  it.each(["zero-contribution-rule", "four-additional", "generic-bounds"])("cannot authorize SB RAISE using %s", async variant => {
    const f = await live(), p = structuredClone(f.requests[0]!.packet);
    // Negative engine test only: vary cards and inject purported permissions.
    // Positive integration decisions above are never mocked/certified in tests.
    p.hero.holeCards = [{ rank: 3, suit: "s" }, { rank: 3, suit: "h" }];
    expect(unopenedChartAction(p)).toBe("RAISE");
    if (variant === "generic-bounds") p.preflopExecution.raiseBounds = {
      source: "synthetic permission must not bypass SB gate", verified: true, chipUnitBB: 0.5, minRaiseToBB: 2 };
    else p.preflopExecution.exactOpeningSize = { decisionWindow: "btn_after_utg_hj_co_folds",
      rule: "pokernow-0.1.72-th-4fun-1-2-exact5-v1", raiseToChips: 5,
      contributionChips: variant === "four-additional" ? 1 : 0,
      investmentChips: variant === "four-additional" ? 4 : 5 };
    const result = evaluatePreflopReference(p);
    expect(result.action).toBeNull(); expect(result.raiseToBB).toBeNull(); expect(result.investmentBB).toBeNull();
    expect(result.reasons.join(" ")).toContain("five total requires four additional chips");
  });
  it("uses SB activation's original deadline, never the boundary or panel edit", async () => {
    const f = await live(); expect(f.turn.localReceivedAt - f.boundary.localReceivedAt).toBe(14156);
    f.atAge(4000); f.read.raiseControl = controls("ready"); f.poll();
    expect(f.action()).toBe("FOLD"); expect(f.text()).toContain("6.0s");
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: {
      action: "FOLD", confidence: 1, reasoning: "old epoch" } }) });
    await new Promise(resolve => setTimeout(resolve, 0)); expect(f.text()).not.toContain("old epoch");
    f.atAge(9999); f.refresh(); expect(f.action()).toBe("FOLD");
    f.atAge(10000); f.refresh(); expect(f.action()).toBeNull(); expect(f.text()).toContain("EVIDENCE EXPIRED");
    f.poll(); expect(f.action()).toBeNull();
  });
  it.each([0, 1, 2, 3, 4, 5, 6, 7].flatMap(step => ["missing", "replay", "predecessor", "stale", "reconnect",
    "unknown", "coalesced", "wager", "reordered", "wrong-actor"].map(variant => ({ step, variant }))))(
    "rejects $variant at SB-prefix step $step", async ({ step, variant }) => {
      const f = await live({ mutate: frames => {
        const i = frames.length - 8 + step, frame = frames[i], p = frame.payload;
        if (variant === "missing") frames.splice(i, 1);
        if (variant === "replay") frames.splice(i, 0, structuredClone(frame));
        if (variant === "predecessor") p.pre++;
        if (variant === "stale") p.now = p.pre;
        if (variant === "reconnect") frame.connectionGeneration++;
        if (variant === "unknown") p.unknownAction = "fold";
        if (variant === "coalesced") Object.assign(p, frames[i === frames.length - 1 ? i - 1 : i + 1].payload);
        if (variant === "wager") p.tB = { PLAYER_10: 2 };
        if (variant === "reordered") { const other = i === frames.length - 1 ? i - 1 : i + 1; [frames[i], frames[other]] = [frames[other], frames[i]]; }
        if (variant === "wrong-actor") { if (p.pGS) p.pGS = { PLAYER_2: "fold" }; else p.cPI = p.pITT = "PLAYER_2"; }
      } }); expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    });
  it.each(["limp", "raise", "all-in", "extra-post", "roster", "table", "hand", "hero-id", "dealer", "profile", "version",
    "short-source", "short-dom", "short-bb", "stack-mismatch", "bb-offline", "bb-folded", "bb-all-in", "settling",
    "dom-position", "dom-actor", "dom-fold", "cards", "extra-update", "sb-zero", "sb-missing", "bb-wrong", "source-sb", "source-bb", "blind-change"])(
    "rejects %s", async variant => {
      const f = await live({ mutate: (frames, read) => {
        const start = frames.at(-9).payload, fold = frames.at(-2).payload, turn = frames.at(-1).payload;
        const bb = read.raw.seats.find((s: any) => s.seatNumber === 2);
        if (variant === "limp") fold.tB = { PLAYER_10: 2 };
        if (variant === "raise") fold.tB = { PLAYER_10: 5 };
        if (variant === "all-in") fold.pGS = { PLAYER_10: "allIn" };
        if (variant === "extra-post") fold.tB = { PLAYER_3: 1 };
        if (variant === "roster") fold.players = { PLAYER_10: "<D>" };
        if (variant === "table") turn.id = "OTHER_TABLE";
        if (variant === "hand") turn.hI = "OTHER_HAND";
        if (variant === "hero-id") for (const frame of frames.filter(f => f.event === "registered")) frame.payload.currentPlayer.id = "PLAYER_2";
        if (variant === "dealer") start.dealerSeat = 3;
        if (variant === "profile") start.ante = 1;
        if (variant === "version") start.fV = "0.1.73";
        if (variant === "short-source") start.players = { PLAYER_1: { stack: 100 } };
        if (variant === "short-dom") read.raw.seats[0].stackText = "100";
        if (variant === "short-bb") bb.stackText = "100";
        if (variant === "stack-mismatch") read.raw.seats[0].stackText = "1000";
        if (variant === "bb-offline") bb.statusClasses.push("offline");
        if (variant === "bb-folded") bb.statusClasses.push("fold");
        if (variant === "bb-all-in") bb.stackContainerText = bb.stackText = "All In";
        if (variant === "settling") read.raw.seats[0].stackIsSettlement = true;
        if (variant === "dom-position") read.context.dealerSeatNumber = 3;
        if (variant === "dom-actor") read.raw.seats[0].statusClasses = ["table-player", "you-player"];
        if (variant === "dom-fold") read.raw.seats.find((s: any) => s.seatNumber === 10).statusClasses = ["table-player"];
        if (variant === "cards") read.raw.seats[0].holeCardClassLists = [["card-h", "card-s-A"], ["card-d", "card-s-A"]];
        if (variant === "extra-update") frames.push({ ...structuredClone(frames.at(-1)), payload: { pre: turn.now, now: turn.now + 1, eventsData: [] } });
        if (variant === "sb-zero") read.raw.seats[0].betValueText = "0";
        if (variant === "sb-missing") read.raw.seats[0].betValueText = null;
        if (variant === "bb-wrong") bb.betValueText = "1";
        if (variant === "source-sb") start.tB.PLAYER_1 = 0;
        if (variant === "source-bb") start.tB.PLAYER_2 = 1;
        if (variant === "blind-change") fold.bigBlind = 4;
      } }); expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    });
  it("accepts matching four-fold log corroboration", async () => {
    const f = await live({ logActions: ['"SB @ PLAYER_1" posts a small blind of 1', '"BB @ PLAYER_2" posts a big blind of 2',
      '"UTG @ PLAYER_3" folds', '"HJ @ PLAYER_5" folds', '"CO @ PLAYER_9" folds', '"BTN @ PLAYER_10" folds'] });
    expect(f.action(), f.text()).toBe("FOLD");
  });
  it.each(['"BTN @ PLAYER_10" calls 2', '"SB @ PLAYER_1" folds', '"SB @ PLAYER_1" posts a missing small blind of 1',
    '"BB @ PLAYER_2" folds', "unknown action"])("rejects contradictory log: %s", async msg => {
      const f = await live({ logActions: [msg] }); expect(f.action()).toBeNull();
    });
  it("rejects reversed corroborating folds", async () => {
    const f = await live({ logActions: ['"BTN @ PLAYER_10" folds', '"CO @ PLAYER_9" folds'] }); expect(f.action()).toBeNull();
  });
  it("does not leak the SB window into a BB decision", async () => {
    const f = await live(), p = structuredClone(f.requests[0]!.packet);
    p.hero.position = p.preflop.heroPosition = "BB";
    p.decisionProofs.binding = decisionProofBinding(p, p.decisionProofs.decisionEpoch);
    expect(evaluateDecisionPolicy(p)).toMatchObject({ chosenAction: null, llmMayChoose: false });
  });
  it("provider failure preserves fresh FOLD; wrong provider action cannot override it", async () => {
    const f = await live(); f.requests[0]!.reject(new Error("relay offline"));
    await new Promise(resolve => setTimeout(resolve, 0)); expect(f.action()).toBe("FOLD");
    f.read.raiseControl = controls("ready"); f.poll();
    f.requests.at(-1)!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: {
      action: "RAISE", confidence: 1, reasoning: "Override engine" } }) });
    await new Promise(resolve => setTimeout(resolve, 0)); expect(f.action()).toBe("FOLD"); expect(f.text()).not.toContain("Override engine");
  });
  it.each(["expiry", "actor", "reconnect", "source-update"])("rejects late explanation after %s", async variant => {
    const f = await live(); expect(f.action()).toBe("FOLD");
    if (variant === "expiry") f.atAge(10000);
    if (variant === "actor") f.read.raw.seats[0].statusClasses = ["table-player", "you-player"];
    if (variant === "reconnect") f.socket.dispatchEvent(new Event("close"));
    if (variant === "source-update") f.incoming({ ...f.turn, localReceivedAt: f.now() + 1, payload: {
      pre: f.turn.payload.now, now: f.turn.payload.now + 1, eventsData: [] } });
    f.refresh(); expect(f.action()).toBeNull();
    f.requests[0]!.resolve({ ok: true, json: async () => ({ ok: true, decisionSource: "engine_policy", result: {
      action: "FOLD", confidence: 1, reasoning: "Late SB explanation" } }) });
    await new Promise(resolve => setTimeout(resolve, 0)); expect(f.action()).toBeNull(); expect(f.text()).not.toContain("Late SB explanation");
  });
});

// Actual incoming envelopes -> MAIN bridge -> runtime -> live adapters -> engine
// -> contentScript overlay. No synthetic certificate or selected policy injection.
// Source envelopes are captured hands 147/165. DOM cross-checks are simulated
// using the existing reader result shape; card variants are explicitly synthetic.
async function live(options: { hand?: 147 | 165 | 212; cards?: string[]; control?: string; age?: number; delayTurn?: number; logActions?: string[];
  mutate?: (frames: any[], read: any) => void } = {}) {
  vi.resetModules();
  const captured = load(`pokernow-sb-${options.hand ?? 165}.json`);
  // Hand212 includes the later accepted raise/BB turn; start at its real SB window.
  const frames = structuredClone(options.hand === 212 ? captured.frames.slice(0, 10) : captured.frames);
  const boundary = frames.at(-9), turn = frames.at(-1), start = boundary.payload;
  const cards = options.cards ?? start.pC.PLAYER_1.cards.map((c: any) => c.value);
  start.pC.PLAYER_1.cards = cards.map((value: string) => ({ value, showing: false }));
  if (options.delayTurn) for (const f of frames.slice(-8)) f.localReceivedAt += options.delayTurn;
  const read = load("utg-reader-cross-check.json").read;
  const stacks: Record<string, number> = {};
  for (const f of frames) {
    const p = f.payload.gameState ?? f.payload;
    for (const [id, v] of Object.entries(p.players ?? {}) as Array<[string, any]>) if (v.stack !== undefined) stacks[id] = v.stack;
  }
  for (const seat of read.raw.seats) if (seat.isOccupied) {
    seat.stackText = seat.stackContainerText = String(stacks[`PLAYER_${seat.seatNumber}`] - (start.tB[`PLAYER_${seat.seatNumber}`] ?? 0));
    if (seat.isYou) seat.holeCardClassLists = cards.map(c => ["card-container", `card-${c[1]}`, `card-s-${c[0]}`, "flipped", "med"]);
  }
  read.context.dealerSeatNumber = start.dealerSeat;
  for (const seat of read.raw.seats) if (seat.isOccupied) {
    const id = `PLAYER_${seat.seatNumber}`;
    seat.betValueText = start.tB[id] === undefined ? null : String(start.tB[id]);
    if ([frames.at(-8), frames.at(-6), frames.at(-4), frames.at(-2)].some(f => Object.keys(f.payload.pGS)[0] === id)) seat.statusClasses.push("fold");
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
    else if (options.logActions && url.includes(`hand_number=${options.hand ?? 165}`)) resolve(new Response(JSON.stringify([
      { msg: `-- starting hand #${options.hand ?? 165}`, createdAt: "1000" },
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
