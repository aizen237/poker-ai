import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { allHandTypes, formatHandType } from "@poker-ai/range-engine";
import { createFirstUtgSource, projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";
import { isObservedUtgOpenPatch } from "../../../apps/pokernow-extension/src/bettingWindow.js";
import { callLegalityEvidence } from "../../../apps/pokernow-extension/src/callLegalityEvidence.js";
import { assessLiveState } from "./liveState.js";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../../../apps/pokernow-extension/src/tableRead.js", () => ({ readLiveTable: mocks.read }));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({ createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }) }));
const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
function frames(hjObserver = false): any[] {
  const recorded = [...load("pokernow-exact-five-accepted.json").frames.slice(0, 65),
    ...load("pokernow-utg-open-169.json").frames];
  // Explicitly synthetic observer/private-card variation. The captured public
  // roster, wagers, actor transitions and times remain unchanged. Hand169 was
  // captured by UTG, so no test claims these are captured HJ private cards.
  if (hjObserver) for (const f of recorded) {
    if (f.event === "registered") f.payload.currentPlayer.id = "PLAYER_2";
    const p = f.payload.gameState ?? f.payload;
    if (p.pC) for (const [id, hand] of Object.entries(p.pC) as Array<[string, any]>) {
      hand.cards.forEach((c: any, i: number) => { c.value = id === "PLAYER_2" ? ["Ah", "Kd"][i] : null; });
    }
  }
  return recorded;
}
function replay(change?: (f: any[]) => void, projectionChange?: (p: any) => void, recorded = frames()) {
  const f = recorded; change?.(f);
  let now = 0, hero: string | null = null;
  const source = createFirstUtgSource(f[0].payload.gameState.id, () => now);
  const accept = (frame: any) => {
    now = frame.localReceivedAt;
    const p = projectFirstUtgSource("42" + JSON.stringify([frame.event, frame.payload]), hero);
    projectionChange?.(p); hero = p?.heroId ?? hero;
    source.accept(p, frame.localReceiveSequence, frame.connectionGeneration, now);
  };
  for (const frame of f) accept(frame);
  return { source, frames: f, accept, at: (time: number) => { now = time; } };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("recorded hand261 stack-reset boundary", () => {
  it("uses all six new-hand stacks for the accepted open and linked HJ turn", () => {
    const frames = load("pokernow-hj-open-261.json").frames;
    const f = replay(undefined, undefined, frames.slice(0, 2));
    expect(f.source.diagnostic().carriedState?.projection.frame.players.PLAYER_1.stack).toBe(250);
    expect(f.source.diagnostic().hjWindow.anchor?.sequence).toBe(2);
    expect(f.source.facingOpenProof()).toBeNull();
    f.accept(frames[2]);
    expect(f.source.diagnostic().facingOpenWindow.transition?.newContributionChips).toBe(5);
    expect(f.source.facingOpenProof()).toBeNull();
    f.accept(frames[3]);
    const p = f.source.facingOpenProof();
    expect(p, JSON.stringify(f.source.diagnostic().facingOpenWindow)).not.toBeNull();
    expect(p).toMatchObject({ scope: "hj_facing_utg_open5", anchor: { sequence: 2 }, activation: { sequence: 4 },
      witness: { handNumber: 261, heroId: "PLAYER_1", heroSeat: 1, heroCards: ["5c", "Ts"] },
      actor: { playerId: "PLAYER_1", position: "HJ" }, facts: { amountToCallChips: 5 } });
    expect(p!.witness.players.map(p => p.sourceStack)).toEqual(Array(6).fill(250));
    expect(p!.transitions[0].originalRoster.map(p => p.sourceStack)).toEqual(Array(6).fill(250));
    expect(p!.transitions[0]).toMatchObject({ sequence: 3, priorContributionChips: 0, newContributionChips: 5,
      actor: { playerId: "PLAYER_6", seat: 10, position: "UTG" }, evidence: { raw: frames[2].payload } });
  });
  it.each(["missing-players", "partial", "extra-player", "wrong-id", "missing-stack", "string-stack", "null-stack", "fractional-stack",
    "negative-stack", "unsafe-stack", "short-stack", "deleted-player", "identity", "status", "disconnected", "hidden-player-mutation",
    "unknown-boundary-mutation", "seats", "roster", "dealer", "blinds", "profile", "ante", "postflop",
    "sequence", "predecessor", "generation", "replayed", "raise6", "wrong-turn", "unknown-open-mutation", "unknown-turn-mutation",
    "turn-players", "malformed-turn-capacity", "coalesced", "missing-open", "intervening-update"])("rejects %s", variant => {
    const f = replay(fs => {
      const b = fs[1].payload, r = fs[2].payload, t = fs[3].payload, hero = "PLAYER_1";
      if (variant === "missing-players") delete b.players;
      if (variant === "partial") delete b.players[hero];
      if (variant === "extra-player") b.players.EXTRA = { stack: 250 };
      if (variant === "wrong-id") { delete b.players[hero]; b.players.EXTRA = { stack: 250 }; }
      if (variant === "missing-stack") b.players[hero] = {};
      if (variant === "string-stack") b.players[hero].stack = "250";
      if (variant === "null-stack") b.players[hero].stack = null;
      if (variant === "fractional-stack") b.players[hero].stack = 250.5;
      if (variant === "negative-stack") b.players[hero].stack = -1;
      if (variant === "unsafe-stack") b.players[hero].stack = Number.MAX_SAFE_INTEGER + 1;
      if (variant === "short-stack") b.players[hero].stack = 201;
      if (variant === "deleted-player") b.players[hero] = "<D>";
      if (variant === "identity") b.players[hero].id = "OTHER";
      if (variant === "status") b.players[hero].status = "inGame";
      if (variant === "disconnected") b.players[hero].disconnectedSince = 123;
      if (variant === "hidden-player-mutation") b.players[hero].name = "OTHER";
      if (variant === "unknown-boundary-mutation") b.unknownAction = true;
      if (variant === "seats") { b.seats = structuredClone(fs[0].payload.gameState.seats); b.seats[0][0] = 0; }
      if (variant === "roster") b.iHPI[0] = "OTHER";
      if (variant === "dealer") b.dealerSeat = 2;
      if (variant === "blinds") b.tB[b.sBPI] = 2;
      if (variant === "profile") b.fV = "0.1.73";
      if (variant === "ante") b.ante = 1;
      if (variant === "postflop") b.gT = [1, 1];
      if (variant === "sequence") fs[3].localReceiveSequence++;
      if (variant === "predecessor") t.pre++;
      if (variant === "generation") fs[3].connectionGeneration++;
      if (variant === "replayed") fs.splice(3, 0, structuredClone(fs[2]));
      if (variant === "raise6") r.tB.PLAYER_6 = r.cHB = 6;
      if (variant === "wrong-turn") t.cPI = t.pITT = "PLAYER_2";
      if (variant === "unknown-open-mutation") r.unknownAction = true;
      if (variant === "unknown-turn-mutation") t.unknownAction = true;
      if (variant === "turn-players") t.players = { [hero]: { stack: 251 } };
      if (variant === "malformed-turn-capacity") t.mAVTB = null;
      if (variant === "coalesced") r.cPI = r.pITT = hero;
      if (variant === "missing-open") fs.splice(2, 1);
      if (variant === "intervening-update") {
        fs.splice(3, 0, { ...fs[3], payload: { pre: r.now, now: r.now + 1, eventsData: [], fV: "0.1.72" } });
        fs[4].localReceiveSequence++; t.pre = r.now + 1;
      }
    }, undefined, load("pokernow-hj-open-261.json").frames);
    expect(f.source.facingOpenProof()).toBeNull();
  });
  it.each(["missing-reset-shape", "missing-turn-raw", "mismatched-turn-projection"])("rejects %s", variant => {
    const f = replay(undefined, p => {
      if (variant === "missing-reset-shape" && p) delete p.handStartStackReset;
      if (p?.frame.cPI === "PLAYER_1") {
        if (variant === "missing-turn-raw") delete p.bettingPatch;
        if (variant === "mismatched-turn-projection") p.frame.pITT = "PLAYER_2";
      }
    }, load("pokernow-hj-open-261.json").frames);
    expect(f.source.facingOpenProof()).toBeNull();
  });
  it("uses authoritative reset amounts even when previous-hand stacks were short", () => {
    const f = replay(fs => {
      for (const p of Object.values(fs[0].payload.gameState.players) as any[]) p.stack = 100;
    }, undefined, load("pokernow-hj-open-261.json").frames);
    expect(f.source.facingOpenProof()!.witness.players.every(p => p.sourceStack === 250)).toBe(true);
  });
  it("does not extend the no-mAVTB turn shape to an unopened HJ window", () => {
    const f = replay(fs => {
      const b = fs[1].payload, r = fs[2].payload;
      fs[2].payload = { now: r.now, pre: r.pre, eventsData: [], mEV: 0, fV: "0.1.72", sN: r.sN,
        pGS: { [b.cPI]: "fold" }, sNA: "NSAF", pITT: null, sNAA: r.sNAA, wBACPI: [b.bBPI] };
    }, undefined, load("pokernow-hj-open-261.json").frames);
    expect(f.source.facingOpenProof()).toBeNull();
    expect(f.source.hjProof()).toBeNull();
  });
  it("expires and never renews from an unrelated source update", () => {
    const f = replay(undefined, undefined, load("pokernow-hj-open-261.json").frames), t = f.frames[3];
    f.at(t.localReceivedAt - 1); expect(f.source.facingOpenProof()).toBeNull();
    f.at(t.localReceivedAt + 9999); expect(f.source.facingOpenProof()).not.toBeNull();
    f.at(t.localReceivedAt + 10000); expect(f.source.facingOpenProof()).toBeNull();
    f.accept({ ...t, localReceiveSequence: 5, localReceivedAt: t.localReceivedAt + 11000,
      payload: { pre: t.payload.now, now: t.payload.now + 1, eventsData: [], fV: "0.1.72" } });
    expect(f.source.facingOpenProof()).toBeNull();
  });
});

describe("recorded hand169 accepted opening transition", () => {
  it("uses the unchanged UTG observer capture, frozen roster and original HJ deadline", () => {
    const f = replay(), p = f.source.facingOpenProof()!;
    expect(p).toMatchObject({ scope: "hj_facing_utg_open5", historyComplete: false,
      anchor: { sequence: 65 }, activation: { sequence: 67 },
      continuity: { generation: 2, throughSequence: 67 },
      actor: { playerId: "PLAYER_2", seat: 2, position: "HJ" },
      witness: { heroId: "PLAYER_1", heroCards: ["8h", "Qd"] },
      facts: { amountToCallChips: 5, nextMinimumRaiseToChips: null, aggressionReopened: null, contestablePotChips: null } });
    expect(p.transitions[0]).toMatchObject({ sequence: 66, action: "raise", street: "preflop",
      actor: { playerId: "PLAYER_1", seat: 1, position: "UTG" },
      priorContributionChips: 0, newContributionChips: 5, investmentChips: 5, observedRaiseIncrementChips: 3,
      evidence: { raw: f.frames.at(-2).payload } });
    expect(p.transitions[0].originalRoster).toHaveLength(6);
    expect(p.transitions[0].originalRoster.find(p => p.position === "UTG")!.contribution).toBe(0);
    expect(p.witness.players.find(p => p.position === "UTG")!.contribution).toBe(5);
    expect(p.expiresAt).toBe(f.frames.at(-1).localReceivedAt + 10000);
    expect(p.witness.receivedAt - p.anchor.receivedAt).toBeGreaterThan(10000);
    expect(f.source.proof()).toBeNull(); expect(f.source.hjProof()).toBeNull();
    p.transitions[0].originalRoster[0]!.seat = 99;
    expect(f.source.facingOpenProof()!.transitions[0].originalRoster[0]!.seat).not.toBe(99);
  });
  it("retains an observed action while waiting, without issuing a turn certificate", () => {
    const f = replay(f => f.pop());
    expect(f.source.facingOpenProof()).toBeNull();
    expect(f.source.diagnostic().facingOpenWindow.transition?.newContributionChips).toBe(5);
  });
  it.each(["missing", "sequence", "predecessor", "replayed", "generation", "wrong-wager-actor", "wrong-turn",
    "call", "raise6", "all-in", "extra-wager", "coalesced", "unknown", "roster", "hand", "profile", "short",
    "missing-boundary", "stale-cursor", "disconnected", "bad-registration"])("rejects %s", variant => {
    const f = replay(fs => {
      const b = fs.at(-3), r = fs.at(-2), t = fs.at(-1);
      if (variant === "missing") fs.splice(-2, 1);
      if (variant === "sequence") t.localReceiveSequence++;
      if (variant === "predecessor") t.payload.pre++;
      if (variant === "replayed") fs.splice(-1, 0, structuredClone(r));
      if (variant === "generation") t.connectionGeneration++;
      if (variant === "wrong-wager-actor") { r.payload.tB = { PLAYER_3: 5 }; r.payload.cRPI = ["PLAYER_3"]; }
      if (variant === "wrong-turn") t.payload.cPI = t.payload.pITT = "PLAYER_3";
      if (variant === "call") r.payload.tB.PLAYER_1 = 2;
      if (variant === "raise6") r.payload.tB.PLAYER_1 = r.payload.cHB = 6;
      if (variant === "all-in") r.payload.pGS = { PLAYER_1: "allIn" };
      if (variant === "extra-wager") r.payload.tB.PLAYER_3 = 5;
      if (variant === "coalesced") r.payload.cPI = "PLAYER_2";
      if (variant === "unknown") r.payload.unknownAction = true;
      if (variant === "roster") r.payload.seats = [[1, "PLAYER_1"]];
      if (variant === "hand") t.payload.hI = "OTHER";
      if (variant === "profile") b.payload.fV = "0.1.73";
      if (variant === "short") b.payload.players = { PLAYER_1: { stack: 100 } };
      if (variant === "missing-boundary") fs.splice(-3, 1);
      if (variant === "stale-cursor") t.payload.now = t.payload.pre;
      if (variant === "disconnected") b.payload.players = { PLAYER_2: { disconnectedSince: 123 } };
      if (variant === "bad-registration") delete fs.filter(f => f.event === "registered").at(-1).payload.gameState.players.PLAYER_1.id;
    });
    expect(f.source.facingOpenProof()).toBeNull();
    expect(f.source.diagnostic().historyComplete).toBe(false);
  });
  it.each(["missing-raw", "mismatched-projection"])("rejects %s without trusting inventory", variant => {
    const f = replay(undefined, p => { if (p?.bettingPatch) {
      if (variant === "missing-raw") delete p.bettingPatch;
      else p.frame.tB = { PLAYER_1: 6 };
    } });
    expect(f.source.facingOpenProof()).toBeNull();
  });
  it("does not treat mR as a new generic sizing contract", () => {
    const raw = frames().at(-2).payload;
    expect(isObservedUtgOpenPatch(raw)).toBe(true);
    expect(isObservedUtgOpenPatch({ ...raw, mR: 7 })).toBe(false);
    expect(replay().source.facingOpenProof()!.facts.nextMinimumRaiseToChips).toBeNull();
  });
  it("expires precisely, rejects clock regression, and never renews on the next source update", () => {
    const f = replay(), t = f.frames.at(-1), at = t.localReceivedAt;
    f.at(at - 1); expect(f.source.facingOpenProof()).toBeNull();
    f.at(at + 9999); expect(f.source.facingOpenProof()).not.toBeNull();
    f.at(at + 10000); expect(f.source.facingOpenProof()).toBeNull();
    f.accept({ ...t, localReceiveSequence: 68, localReceivedAt: at + 11000,
      payload: { pre: t.payload.now, now: t.payload.now + 1, eventsData: [], fV: "0.1.72" } });
    expect(f.source.facingOpenProof()).toBeNull();
  });
  it("reset destroys both a pending action and an issued window", () => {
    const f = replay(fs => fs.pop()); f.source.reset(); f.accept(frames().at(-1));
    expect(f.source.facingOpenProof()).toBeNull();
    const g = replay(); g.source.reset(); expect(g.source.facingOpenProof()).toBeNull();
  });
  it("a later valid registration in a NEW generation can recover without inheriting the invalid baseline", () => {
    const f = replay(fs => { delete fs.find(f => f.event === "registered").payload.gameState.players.PLAYER_1.id; });
    expect(f.source.facingOpenProof()?.continuity).toMatchObject({ baselineSequence: 18, generation: 2 });
  });
});

// Real MAIN bridge -> source runtime -> context/proofs -> overlay. Only the
// observer's unavailable private-card view and DOM cross-check are simulated.
async function live(change?: (fs: any[], read: any) => void, originalObserver = false, logActions?: string[], callMarkup = "", hand238 = false,
  co238?: { originalObserver?: boolean }, captured?: any[]) {
  vi.resetModules();
  const fs = captured ?? (hand238 ? load("pokernow-hj-call-238.json").frames.slice(0, co238 ? 16 : 14) : frames(!originalObserver));
  const tableId = fs[0].payload.gameState.id;
  const start = (co238 ? fs[11] : fs.at(-3)).payload, turn = fs.at(-1);
  if (co238 && !co238.originalObserver) for (const f of fs) {
    // Public envelopes unchanged; CO registration/cards are explicitly simulated.
    if (f.event === "registered") f.payload.currentPlayer.id = "PLAYER_2";
    const p = f.payload.gameState ?? f.payload;
    if (p.pC) for (const [id, hand] of Object.entries(p.pC) as [string, any][])
      hand.cards.forEach((c: any, i: number) => { c.value = id === "PLAYER_2" ? ["Ah", "Kd"][i] : null; });
  }
  const read = load("utg-reader-cross-check.json").read;
  const hero = captured ? fs[0].payload.currentPlayer.id : co238 && !co238.originalObserver ? "PLAYER_2" : hand238 ? "PLAYER_1" : originalObserver ? "PLAYER_1" : "PLAYER_2";
  const utg = captured ? start.cPI : hand238 ? "PLAYER_10" : "PLAYER_1", hj = captured ? turn.payload.cPI : hand238 ? "PLAYER_1" : "PLAYER_2";
  const stacks: Record<string, number> = {};
  for (const f of fs) for (const [id, p] of Object.entries((f.payload.gameState ?? f.payload).players ?? {}) as [string, any][]) {
    if (p.stack !== undefined) stacks[id] = p.stack;
  }
  for (const s of read.raw.seats) if (s.isOccupied) {
    const id = captured ? fs[0].payload.gameState.seats.find(([seat]: [number, string]) => seat === s.seatNumber)[1] : `PLAYER_${s.seatNumber}`;
    const total = id === utg || co238 && id === hj ? 5 : start.tB[id] ?? 0;
    if (captured) s.playerNameText = fs[0].payload.gameState.players[id].name;
    s.isYou = id === hero;
    s.statusClasses = ["table-player", ...(s.isYou ? ["you-player"] : []), ...(id === (co238 ? "PLAYER_2" : hj) ? ["decision-current"] : [])];
    // Same class used by existing recorded reader scaffolding.
    s.holeCardClassLists = s.isYou ? (captured ? start.pC[hero].cards.map((c: any) => c.value) : co238 && !co238.originalObserver ? ["Ah", "Kd"] : hand238 ? ["7h", "Kd"] : originalObserver ? ["8h", "Qd"] : ["Ah", "Kd"])
      .map(c => ["card-container", `card-${c[1]}`, `card-s-${c[0]}`, "flipped", "med"]) : [];
    s.stackText = s.stackContainerText = String(stacks[id] - total);
    s.betValueText = total ? String(total) : null;
  }
  read.context.dealerSeatNumber = start.dealerSeat;
  read.raw.potMainValueText = "0"; read.raw.potTotalValueText = co238 ? "13" : "8";
  change?.(fs, read);
  const { document } = parseHTML(`<html><body>${callMarkup}</body></html>`);
  const location = new URL(`https://www.pokernow.com/games/${tableId}`);
  const listeners: Array<(e: any) => void> = [];
  let now = fs[0].localReceivedAt, poll = () => {}, refresh = () => {};
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
  // Observe the production diagnostic, not a hand-built proof or final decision.
  vi.stubGlobal("localStorage", { getItem: () => "1", removeItem() {} });
  vi.spyOn(Date, "now").mockImplementation(() => now);
  vi.stubGlobal("setInterval", (cb: () => void, ms: number) => { if (ms === 250) refresh = cb; else poll = cb; return 1; });
  const logs: any[][] = [];
  vi.spyOn(console, "log").mockImplementation((...args) => { logs.push(args); });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { readCallControl } = await import("../../../apps/pokernow-extension/src/callControlRead.js");
  // Synthetic CALL DOM variants use the production observer. Linkedom has no
  // layout; only visibility is supplied. Hand238's screenshot supports the label,
  // not these DOM attributes or a precisely timed within-window observation.
  mocks.read.mockImplementation(() => {
    read.callControl = readCallControl(document, el => !el.closest("[hidden]"));
    return read;
  });
  const requests: unknown[] = [];
  let resolveRecommendation: ((response: Response) => void) | undefined;
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url.endsWith("/recommendation")) {
      requests.push(url);
      return new Promise<Response>(resolve => { resolveRecommendation = resolve; });
    }
    if (logActions) return Promise.resolve(new Response(JSON.stringify(url.includes(`hand_number=${hand238 ? 238 : 169}`)
      ? [{ msg: `-- starting hand #${hand238 ? 238 : 169}`, createdAt: "1000" }, ...logActions.map((msg, i) => ({ msg, createdAt: String(1001 + i) }))] : [])));
    return new Promise(() => {});
  }));
  await import("../../../apps/pokernow-extension/src/eventSource.js");
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  let socket!: Socket, generation = 0;
  const incoming = (f: any) => {
    now = f.localReceivedAt;
    while (generation < f.connectionGeneration) { generation++; socket = new win.WebSocket(`wss://www.pokernow.com/socket.io/?gameID=${tableId}`); }
    socket.incoming(f);
  };
  for (const f of fs) {
    incoming(f);
    if (logActions) { poll(); await new Promise(resolve => setTimeout(resolve, 0)); }
  }
  now = turn.localReceivedAt + 1000; poll();
  if (logActions) { await new Promise(resolve => setTimeout(resolve, 0)); poll(); }
  const diagnostic = () => {
    const row = logs.filter(args => String(args[0]).includes("Copyable snapshot JSON")).at(-1);
    return row ? JSON.parse(row[1]) : null;
  };
  return { read, document, requests, socket, poll, refresh, incoming, turn, diagnostic,
    respond: async (body: unknown) => {
      resolveRecommendation?.(new Response(JSON.stringify(body)));
      await new Promise(resolve => setTimeout(resolve, 0));
    },
    atAge: (age: number) => { now = turn.localReceivedAt + age; },
    text: () => document.getElementById("poker-ai-reader-overlay")!.textContent!,
    action: () => document.querySelector('#poker-ai-reader-overlay [style*="font-size:16px"]')?.textContent ?? null };
}

describe("hand261 captured source with matching simulated DOM", () => {
  // Source shapes/cards are retained; identifiers and clocks are sanitized. No recorded DOM exists for hand261;
  // the read scaffold supplies its six seats, dealer, T5o, 250-chip capacities,
  // remaining stacks (UTG 245, SB 249, BB 248), wagers and current HJ actor.
  const capturedLive = (change?: (fs: any[], read: any) => void) =>
    live(change, false, undefined, '<button type="button">Call 5</button>', false, undefined,
      load("pokernow-hj-open-261.json").frames);
  it("classifies T5o and displays the existing locked FOLD, then expires", async () => {
    const f = await capturedLive(), d = f.diagnostic();
    expect(d.preflop).toMatchObject({ situation: "facing_open", heroPosition: "HJ", amountToCallBB: 2.5,
      actionWindowEvidence: "hj_facing_utg_open5" });
    expect(d.decision.scopedProofs.responseStrategy).toMatchObject({ status: "pure", hand: "T5o", strategyClass: "FOLD" });
    expect(d.decision.scopedProofs.activation.allowed).toBe(true);
    expect(f.action(), f.text()).toBe("FOLD");
    expect(f.requests).toHaveLength(1);
    expect(f.socket.send).not.toHaveBeenCalled();
    await f.respond({ ok: true, decisionSource: "engine_policy", result: { action: "CALL", confidence: 1, reasoning: "Override" } });
    expect(f.action()).toBe("FOLD");
    f.atAge(9999); f.refresh(); expect(f.action()).toBe("FOLD");
    f.atAge(10000); f.refresh(); expect(f.action()).toBeNull();
    expect(f.text()).toContain("EVIDENCE EXPIRED");
  });
  it.each(["old-stacks", "source-stack-conflict", "short-stack", "over-strategy-capacity", "cards", "actor", "dealer", "wager", "pot"])(
    "withholds advice for %s", async variant => {
      const f = await capturedLive((fs, read) => {
        const hero = read.raw.seats.find((s: any) => s.isYou);
        if (variant === "old-stacks") hero.stackText = hero.stackContainerText = "338";
        if (variant === "source-stack-conflict") fs[1].payload.players.PLAYER_1.stack = 251;
        if (variant === "short-stack" || variant === "over-strategy-capacity") {
          const amount = variant === "short-stack" ? 201 : 301;
          fs[1].payload.players.PLAYER_1.stack = amount;
          hero.stackText = hero.stackContainerText = String(amount);
        }
        if (variant === "cards") hero.holeCardClassLists = [["card-h", "card-s-A"], ["card-d", "card-s-K"]];
        if (variant === "actor") hero.statusClasses = ["table-player", "you-player"];
        if (variant === "dealer") read.context.dealerSeatNumber = 2;
        if (variant === "wager") read.raw.seats.find((s: any) => s.seatNumber === 10).betValueText = "6";
        if (variant === "pot") read.raw.potTotalValueText = "99";
      });
      expect(f.action(), f.text()).toBeNull(); expect(f.requests).toHaveLength(0);
    });
});

// Deliberately synthetic private cards; reuses the reviewed public source grammar.
// No hand-specific collection or assertion that recorded HJ held these cards.
function foldCards(fs: any[], read: any, hand = ["7h", "2c"]) {
  for (const frame of fs) {
    const cards = (frame.payload.gameState ?? frame.payload).pC?.PLAYER_2?.cards;
    if (cards) cards.forEach((c: any, i: number) => { c.value = hand[i]; });
  }
  read.raw.seats.find((s: any) => s.seatNumber === 2).holeCardClassLists = hand.map(c =>
    ["card-container", `card-${c[1]}`, `card-s-${c[0]}`, "flipped", "med"]);
}
describe("reviewed weak-offsuit HJ folds through the existing locked overlay", () => {
  it.each(["72o", "94o", "Q7o"])("paints and explains %s before a pending explanation, then expires", async hand => {
    const f = await live((fs, read) => foldCards(fs, read, [`${hand[0]}h`, `${hand[1]}c`])), d = f.diagnostic();
    expect(d.decision.scopedProofs.responseStrategy).toMatchObject({ status: "pure", hand,
      strategyClass: "FOLD", chosenAction: null, liveAuthorized: false,
      reference: { provenance: { kind: "heuristic", review: "reviewed" } },
      remainingRequirements: { FOLD: [] }, call: { authorization: "unproven" } });
    expect(d.decision.scopedProofs.activation.allowed).toBe(true);
    expect(f.action()).toBe("FOLD");
    expect(f.text()).toContain(`Fold ${hand} facing UTG`);
    expect(f.text()).toContain("conservative heuristic");
    expect(f.text()).toContain("not exact GTO");
    expect(f.requests).toHaveLength(1);
    expect(f.socket.send).not.toHaveBeenCalled();
    f.atAge(9999); f.refresh(); expect(f.action()).toBe("FOLD");
    f.atAge(10000); f.refresh(); expect(f.action()).toBeNull();
    expect(f.text()).toContain("EVIDENCE EXPIRED");
    await f.respond({ ok: true, decisionSource: "engine_policy", result: { action: "FOLD", confidence: 1, reasoning: "Late" } });
    expect(f.action()).toBeNull();
  });
  it.each([["Qh", "8c"], ["7h", "2h"], ["Kh", "2c"], ["9h", "9c"]])(
    "abstains through the overlay for uncovered %s %s", async (a, b) => {
      const f = await live((fs, read) => foldCards(fs, read, [a, b]));
      expect(f.diagnostic().decision.scopedProofs.responseStrategy.status).toBe("uncovered");
      expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    });
  it("rejects an explanation changing the locked action", async () => {
    const f = await live(foldCards);
    expect(f.action(), f.text()).toBe("FOLD");
    await f.respond({ ok: true, decisionSource: "engine_policy", result: { action: "CALL", confidence: 1, reasoning: "Override" } });
    expect(f.action()).toBe("FOLD");
    expect(f.text()).toContain("conservative heuristic");
  });
  it.each(["refresh", "pending-response"])("rechecks a new CALL-price contradiction on %s", async variant => {
    const f = await live(foldCards, false, undefined, '<button type="button">Call 5</button>');
    expect(f.action()).toBe("FOLD");
    f.document.querySelector("button")!.textContent = "Call 6";
    if (variant === "refresh") f.refresh();
    else await f.respond({ ok: true, decisionSource: "engine_policy", result: { action: "FOLD", confidence: 1, reasoning: "Late" } });
    expect(f.action()).toBeNull();
  });
  it("does not require a total-pot display or verified contestable pot for a pure fold", async () => {
    const f = await live((fs, read) => {
      foldCards(fs, read); read.raw.potTotalValueText = null;
    });
    expect(f.action(), f.text()).toBe("FOLD");
  });
  it.each(["disconnect", "source-update", "cards", "actor", "clock-regression"])(
    "clears the displayed fold on %s and discards a late explanation", async variant => {
      const f = await live(foldCards);
      expect(f.action()).toBe("FOLD");
      if (variant === "disconnect") f.socket.dispatchEvent(new Event("close"));
      if (variant === "source-update") f.incoming({ ...f.turn, localReceiveSequence: 68,
        localReceivedAt: f.turn.localReceivedAt + 2000,
        payload: { pre: f.turn.payload.now, now: f.turn.payload.now + 1, eventsData: [], fV: "0.1.72" } });
      if (variant === "cards") f.read.raw.seats.find((s: any) => s.seatNumber === 2).holeCardClassLists = [["card-h", "card-s-A"], ["card-d", "card-s-K"]];
      if (variant === "actor") f.read.raw.seats.find((s: any) => s.seatNumber === 2).statusClasses = ["table-player", "you-player"];
      if (variant === "clock-regression") f.atAge(-1);
      f.refresh(); f.poll();
      expect(f.action()).toBeNull();
      await f.respond({ ok: true, decisionSource: "engine_policy", result: { action: "FOLD", confidence: 1, reasoning: "Late" } });
      expect(f.action()).toBeNull();
    });
  it.each(["out-of-range", "unknown-stack", "pot-conflict", "source-cards", "profile", "wrong-open", "gap"])(
    "abstains for newly supported Q7o with %s", async variant => {
      const f = await live((fs, read) => {
        foldCards(fs, read, ["Qh", "7c"]);
        if (variant === "out-of-range") {
          for (const frame of fs) {
            const p = (frame.payload.gameState ?? frame.payload).players?.PLAYER_2;
            if (p?.stack !== undefined) p.stack = 302;
          }
          const hero = read.raw.seats.find((s: any) => s.seatNumber === 2);
          hero.stackText = hero.stackContainerText = "302";
        }
        if (variant === "unknown-stack") read.raw.seats.find((s: any) => s.seatNumber === 2).stackText = null;
        if (variant === "pot-conflict") read.raw.potTotalValueText = "99";
        if (variant === "source-cards") fs.at(-3).payload.pC.PLAYER_2.cards[0].value = "Ah";
        if (variant === "profile") fs.at(-3).payload.fV = "0.1.73";
        if (variant === "wrong-open") fs.at(-2).payload.tB.PLAYER_1 = 6;
        if (variant === "gap") fs.at(-1).payload.pre++;
      });
      expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    });
  it("contradictory CALL price blocks FOLD, while a missing/disabled CALL control does not", async () => {
    const f = await live(foldCards, false, undefined, '<button type="button">Call 6</button>');
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    expect(f.diagnostic().decision.scopedProofs.activation.state).toBe("unsafe");
    const g = await live(foldCards, false, undefined, '<button type="button" disabled>Call 5</button>');
    expect(g.action()).toBe("FOLD");
  });
});

describe("169-category illustrative HJ overlay through automated source replay", () => {
  const referenceText = (f: Awaited<ReturnType<typeof live>>) =>
    f.document.querySelector("[data-hj-reference]")?.textContent ?? null;
  it.each(allHandTypes().map(formatHandType))("displays %s source frequencies with separate live authorization", async hand => {
    const f = await live((fs, read) => foldCards(fs, read, [`${hand[0]}h`, `${hand[1]}${hand.endsWith("s") ? "h" : "c"}`]));
    const r = f.diagnostic().decision.scopedProofs.responseStrategy.sourceReference;
    expect(r).toMatchObject({ hand, chosenAction: null, liveAuthorized: false,
      reference: { provenance: { kind: "illustrative" } } });
    expect(["pure", "mixed"]).toContain(r.status);
    expect(referenceText(f)).toContain(`${hand}: HJ vs UTG 2.5BB`);
    expect(referenceText(f)).toContain("ILLUSTRATIVE PREFLOP REFERENCE");
    expect(referenceText(f)).toContain("not a verified live recommendation");
    expect(referenceText(f)).toContain("CALL 0%");
    expect(referenceText(f)).toContain("CALL 0% is explicit source data; cold-call permission remains unknown.");
    expect(referenceText(f)).toContain(r.status === "pure" ? `Pure source classification: ${r.strategyClass}.` : "Mixed strategy retained");
    expect(referenceText(f)).toContain("THREE_BET to 7.5BB");
    const liveFold = f.diagnostic().decision.scopedProofs.responseStrategy.status === "pure";
    expect(referenceText(f)).toContain(liveFold ? "original 21-hand heuristic FOLD subset" : "one of the other 148 categories");
    expect(f.action()).toBe(liveFold ? "FOLD" : null);
    expect(f.requests).toHaveLength(liveFold ? 1 : 0);
    expect(f.socket.send).not.toHaveBeenCalled();
    f.atAge(10000); f.refresh();
    expect(referenceText(f)).toBeNull(); expect(f.action()).toBeNull();
  });
  it("shows exact mixed frequencies without selecting a random action or requesting an explanation", async () => {
    const f = await live((fs, read) => foldCards(fs, read, ["Ah", "Qc"]));
    expect(referenceText(f)).toContain("FOLD 46.1943796%");
    expect(referenceText(f)).toContain("THREE_BET to 7.5BB 53.8056204%");
    expect(referenceText(f)).toContain("Mixed strategy retained; no action sampled or selected");
    f.atAge(9000); f.poll(); f.refresh();
    expect(referenceText(f)).not.toBeNull();
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    f.atAge(10000); f.refresh(); expect(referenceText(f)).toBeNull();
    expect(f.text()).toContain("EVIDENCE EXPIRED");
  });
  it.each(["disconnect", "source-update", "cards", "actor", "clock-regression", "pot", "call", "read-error"])(
    "removes source-only THREE_BET information on %s between polls", async variant => {
      const f = await live((fs, read) => foldCards(fs, read, ["Ah", "Ac"]), false, undefined, '<button type="button">Call 5</button>');
      expect(referenceText(f)).toContain("THREE_BET to 7.5BB 100%");
      if (variant === "disconnect") f.socket.dispatchEvent(new Event("close"));
      if (variant === "source-update") f.incoming({ ...f.turn, localReceiveSequence: 68,
        localReceivedAt: f.turn.localReceivedAt + 2000,
        payload: { pre: f.turn.payload.now, now: f.turn.payload.now + 1, eventsData: [], fV: "0.1.72" } });
      if (variant === "cards") f.read.raw.seats.find((s: any) => s.isYou).holeCardClassLists = [["card-h", "card-s-A"], ["card-d", "card-s-K"]];
      if (variant === "actor") f.read.raw.seats.find((s: any) => s.isYou).statusClasses = [];
      if (variant === "clock-regression") f.atAge(-1);
      if (variant === "pot") f.read.raw.potTotalValueText = "99";
      if (variant === "call") f.document.querySelector("button")!.textContent = "Call 6";
      if (variant === "read-error") mocks.read.mockImplementation(() => { throw new Error("Unreadable"); });
      f.refresh(); expect(referenceText(f)).toBeNull();
      expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    });
  it.each(["pot", "call", "gap", "wrong-position"])("withholds illustrative information on initial %s mismatch", async variant => {
    const f = await live((fs, read) => {
      foldCards(fs, read, ["Ah", "Ac"]);
      if (variant === "pot") read.raw.potTotalValueText = "99";
      if (variant === "gap") fs.at(-1).payload.pre++;
      if (variant === "wrong-position") read.context.dealerSeatNumber = 3;
    }, false, undefined, variant === "call" ? '<button type="button">Call 6</button>' : "");
    expect(referenceText(f)).toBeNull(); expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("does not require raise-sizing or CALL permission to illustrate a pure FOLD", async () => {
    const f = await live((fs, read) => foldCards(fs, read, ["8h", "8c"]));
    expect(referenceText(f)).toContain("FOLD 100%");
    expect(f.diagnostic().decision.scopedProofs.responseStrategy.call.authorization).toBe("unproven");
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("matching the source three-bet size does not establish live raise legality or strategy applicability", async () => {
    const f = await live((fs, read) => {
      foldCards(fs, read, ["Ah", "Ac"]);
      read.raiseControl = { ...read.raiseControl, formVisible: true, amountControlVisible: true,
        selectedRaiseToChips: 15, selectedRaiseToText: "15", raiseSubmitVisible: true, raiseSubmitEnabled: true, issues: [] };
    });
    expect(referenceText(f)).toContain("THREE_BET to 7.5BB 100%");
    expect(f.diagnostic().decision.scopedProofs.responseStrategy.threeBet.raiseRights).toBe("unproven");
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("late explanations cannot restore an expired source reference or broaden the live FOLD", async () => {
    const f = await live(foldCards);
    expect(referenceText(f)).not.toBeNull(); expect(f.action()).toBe("FOLD");
    f.atAge(10000); f.refresh();
    await f.respond({ ok: true, decisionSource: "engine_policy", result: { action: "RAISE", sizingBB: 7.5, confidence: 1, reasoning: "Override" } });
    expect(referenceText(f)).toBeNull(); expect(f.action()).toBeNull();
  });
});

describe("HJ facing recorded UTG open through the production context/display path", () => {
  it("classifies facing_open with five-chip call gap, but selects nothing, even with AK", async () => {
    const f = await live(), d = f.diagnostic();
    expect(d?.preflop).toMatchObject({ situation: "facing_open", heroPosition: "HJ", playersDealtIn: 6,
      historyCoverage: "complete", actionWindowEvidence: "hj_facing_utg_open5",
      amountToCallBB: 2.5, raiseToBB: 2.5, lastAggressorSeat: 1, activeOpponents: 5, decisionSupport: "uncertain" });
    expect(d.preflop.openingEvidence).toBeUndefined();
    expect(d.preflop.actions).toEqual([{ seat: 1, action: "raise", totalContributionBB: 2.5, observation: 66, wagerAction: "raise" }]);
    expect(d.handTimeline.current.historyComplete).toBe(false);
    expect(d.decision.scopedProofs.activation).toMatchObject({ allowed: false, state: "unsupported" });
    expect(d.decision.scopedProofs.responseStrategy).toMatchObject({ status: "uncovered",
      chosenAction: null, strategyClass: null, liveAuthorized: false,
      call: { contributionGapChips: 5, payableIfCallAuthorizedChips: 5, authorization: "unproven" },
      threeBet: { fullMinimumRaiseToChips: null, permittedMaximumRaiseToChips: null, chipUnit: null, raiseRights: "unproven" } });
    expect(d.decision.scopedProofs.responseStrategy.binding.expiresAt).toBe(d.handTimeline.sourceStatus.facingOpenProof.expiresAt);
    for (const scope of ["connection", "actionWindow", "position", "roster", "stack", "callCost"])
      expect(d.decision.scopedProofs.evidence.proofs.find((p: any) => p.scope === scope).status).toBe("proven");
    for (const scope of ["raiseLegality", "reopening", "pot", "accounting"])
      expect(d.decision.scopedProofs.evidence.proofs.find((p: any) => p.scope === scope).status).toBe("insufficient");
    expect(f.text()).toContain("facing_open"); expect(f.text()).toContain("UNSUPPORTED");
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0); expect(f.socket.send).not.toHaveBeenCalled();
  });
  it("the original UTG observer cannot consume another player's HJ context", async () => {
    const f = await live(undefined, true);
    expect(f.diagnostic().handTimeline.sourceStatus.facingOpenProof).not.toBeNull();
    expect(f.diagnostic().preflop.actionWindowEvidence).toBeUndefined();
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it.each(["missing", "wrong-actor", "wrong-total", "unknown", "reconnect", "hand", "dom-total", "dom-stack", "dom-actor", "dom-cards", "dom-fold", "dom-roster", "dom-blind", "dom-dealer"])("withholds certified context for %s", async variant => {
    const f = await live((fs, read) => {
      const r = fs.at(-2), t = fs.at(-1), utg = read.raw.seats.find((s: any) => s.seatNumber === 1);
      const hero = read.raw.seats.find((s: any) => s.seatNumber === 2);
      if (variant === "missing") fs.splice(-2, 1);
      if (variant === "wrong-actor") t.payload.cPI = t.payload.pITT = "PLAYER_3";
      if (variant === "wrong-total") r.payload.tB.PLAYER_1 = 6;
      if (variant === "unknown") r.payload.unknownAction = true;
      if (variant === "reconnect") t.connectionGeneration++;
      if (variant === "hand") t.payload.hI = "OTHER";
      if (variant === "dom-total") utg.betValueText = "6";
      if (variant === "dom-stack") utg.stackText = utg.stackContainerText = "244";
      if (variant === "dom-actor") hero.statusClasses = ["table-player", "you-player"];
      if (variant === "dom-cards") hero.holeCardClassLists = [["card-h", "card-s-2"], ["card-d", "card-s-3"]];
      if (variant === "dom-fold") utg.statusClasses.push("fold");
      if (variant === "dom-roster") utg.isOccupied = false;
      if (variant === "dom-blind") read.context.blindTexts = ["2", "4"];
      if (variant === "dom-dealer") read.context.dealerSeatNumber = 3;
    });
    expect(f.diagnostic()?.preflop?.actionWindowEvidence).toBeUndefined();
    expect(f.diagnostic()?.decision.scopedProofs.responseStrategy).toBeNull();
    expect(f.diagnostic()?.decision.scopedProofs.callLegality).toBeNull();
    expect(f.document.querySelector("[data-hj-reference]")).toBeNull();
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0); expect(f.socket.send).not.toHaveBeenCalled();
  });
  it("unchanged polls do not renew context; expiry and disconnect remove it without producing advice", async () => {
    const f = await live(), expiry = f.diagnostic().handTimeline.sourceStatus.facingOpenProof.expiresAt;
    f.atAge(9000); f.poll();
    expect(f.diagnostic().handTimeline.sourceStatus.facingOpenProof.expiresAt).toBe(expiry);
    expect(f.diagnostic().decision.scopedProofs.responseStrategy.binding.expiresAt).toBe(expiry);
    f.atAge(10000); f.refresh(); f.poll();
    expect(f.diagnostic().preflop.actionWindowEvidence).toBeUndefined();
    expect(f.diagnostic().decision.scopedProofs.responseStrategy).toBeNull();
    expect(f.diagnostic().decision.scopedProofs.callLegality).toBeNull();
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    f.socket.dispatchEvent(new Event("close")); f.poll();
    expect(f.diagnostic().handTimeline.sourceStatus.facingOpenProof).toBeNull();
  });
  it("permits a corroborating open and ordinary posts without claiming complete log coverage", async () => {
    const f = await live(undefined, false, ['"SB @ PLAYER_9" posts a small blind of 1',
      '"BB @ PLAYER_10" posts a big blind of 2', '"UTG @ PLAYER_1" raises to 5']);
    expect(f.diagnostic().preflop.actionWindowEvidence).toBe("hj_facing_utg_open5");
    expect(f.diagnostic().handTimeline.current.historyComplete).toBe(false);
    expect(f.requests).toHaveLength(0);
  });
  it.each([["8h", "8d", "88"], ["Ah", "Ad", "AA"]])(
    "synthetic HJ %s %s remains uncovered by the installed fold subset", async (a, b, hand) => {
      const f = await live((fs, read) => {
        for (const frame of fs) {
          const cards = (frame.payload.gameState ?? frame.payload).pC?.PLAYER_2?.cards;
          if (cards) cards.forEach((c: any, i: number) => { c.value = [a, b][i]; });
        }
        read.raw.seats.find((s: any) => s.seatNumber === 2).holeCardClassLists = [a, b].map(c =>
          ["card-container", `card-${c[1]}`, `card-s-${c[0]}`, "flipped", "med"]);
      });
      expect(f.diagnostic().decision.scopedProofs.responseStrategy).toMatchObject({ hand,
        status: "uncovered", chosenAction: null, liveAuthorized: false });
      expect(f.text()).toContain("Source classification is illustrative only");
      expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
      expect(f.socket.send).not.toHaveBeenCalled();
    });
  it.each(["matching-five", "disabled", "contradictory"])("%s Raise controls cannot authorize a response", async variant => {
    const f = await live((_, read) => {
      read.raiseControl = { ...read.raiseControl, formVisible: true, amountControlVisible: true,
        selectedRaiseToChips: variant === "contradictory" ? 3 : 5, selectedRaiseToText: variant === "contradictory" ? "3" : "5",
        raiseSubmitVisible: true, raiseSubmitEnabled: variant !== "disabled",
        issues: variant === "contradictory" ? ["Multiple visible raise forms"] : [] };
    });
    expect(f.diagnostic().decision.scopedProofs.responseStrategy.liveAuthorized).toBe(false);
    expect(f.diagnostic().decision.scopedProofs.openingSize).toBeNull();
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("insufficient HJ capacity invalidates the live context, not just a proposed CALL", async () => {
    const f = await live((_, read) => {
      const hero = read.raw.seats.find((s: any) => s.seatNumber === 2);
      hero.stackText = hero.stackContainerText = "3";
    });
    expect(f.diagnostic().decision.scopedProofs.responseStrategy).toBeNull();
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it("binds source cost/capacity and matching synthetic CALL UI without certifying server legality", async () => {
    const f = await live(undefined, false, undefined, '<button type="button">Call 5</button>');
    const d = f.diagnostic(), c = d.decision.scopedProofs.callLegality;
    expect(c).toMatchObject({ version: 1, scope: "hj_facing_utg_open5_call", authorized: false, historyComplete: false,
      binding: { handNumber: 169, heroId: "PLAYER_2", heroSeat: 2, generation: 2, activationSequence: 67,
        receivedAt: f.turn.localReceivedAt, expiresAt: f.turn.localReceivedAt + 10000 },
      facts: { units: "chips", bigBlindChips: 2, utgContributionChips: 5, heroContributionChips: 0,
        contributionGapChips: 5, payableIfCallAuthorizedChips: 5, resultingContributionIfCalledChips: 5,
        remainingStackChips: 249, capacitySufficient: true },
      costProof: { status: "proven" }, ui: { status: "observed_matching", observation: { amountChips: 5 } },
      serverLegality: { status: "unproven" }, legalActionsProof: { status: "insufficient" } });
    expect(d.decision.scopedProofs.responseStrategy.status).toBe("uncovered");
    expect(d.decision.scopedProofs.activation.allowed).toBe(false);
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0); expect(f.socket.send).not.toHaveBeenCalled();
  });
  it.each([
    ['', "unobserved"], ['<button type="button" hidden>Call 5</button>', "unobserved"],
    ['<button type="button" disabled>Call 5</button>', "unusable"],
    ['<button type="button">Call 6</button>', "contradicted"],
    ['<button type="button">Call 0</button>', "contradicted"],
    ['<button type="button">Call 5BB</button>', "unusable"],
    ['<button type="button">Call 5</button><button type="button">Call 5</button>', "contradicted"],
  ])("keeps CALL readiness separate for %s", async (html, status) => {
    const f = await live(undefined, false, undefined, html);
    const c = f.diagnostic().decision.scopedProofs.callLegality;
    expect(c.ui.status).toBe(status); expect(c.facts.contributionGapChips).toBe(5);
    expect(c.authorized).toBe(false); expect(c.serverLegality.status).toBe("unproven");
    expect(f.diagnostic().decision.scopedProofs.activation.state).toBe(status === "contradicted" ? "unsafe" : "unsupported");
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it.each(["pre-activation", "future", "missing-time", "empty-epoch"])("does not manufacture readiness/proof for %s", async variant => {
    const f = await live(undefined, false, undefined, '<button type="button">Call 5</button>');
    const r = structuredClone(f.read);
    r.callControl.observedAt = variant === "pre-activation" ? f.turn.localReceivedAt - 1 :
      variant === "future" ? Date.now() + 1 : variant === "missing-time" ? null : Date.now();
    const c = callLegalityEvidence(r, assessLiveState(r.raw, r.context), f.diagnostic().handTimeline, variant === "empty-epoch" ? "" : "current-test-epoch");
    if (variant === "empty-epoch") expect(c).toBeNull();
    else { expect(c!.ui.status).toBe("unusable"); expect(c!.authorized).toBe(false); }
  });
  it("retains the original deadline across new control observations and drops facts at expiry", async () => {
    const f = await live(undefined, false, undefined, '<button type="button">Call 5</button>');
    const deadline = f.diagnostic().decision.scopedProofs.callLegality.binding.expiresAt;
    f.atAge(9999); f.poll();
    expect(f.diagnostic().decision.scopedProofs.callLegality).toMatchObject({ binding: { expiresAt: deadline }, ui: { status: "observed_matching" } });
    f.atAge(10000); f.refresh(); f.poll();
    expect(f.diagnostic().decision.scopedProofs.callLegality).toBeNull();
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it.each(["actor", "same-actor-update", "disconnect"])("invalidates dependent CALL facts on %s", async variant => {
    const f = await live(undefined, false, undefined, '<button type="button">Call 5</button>');
    if (variant === "disconnect") f.socket.dispatchEvent(new Event("close"));
    else f.incoming({ ...f.turn, localReceivedAt: f.turn.localReceivedAt + 2000,
      payload: { ...f.turn.payload, pre: f.turn.payload.now, now: f.turn.payload.now + 1,
        cPI: variant === "actor" ? "PLAYER_3" : "PLAYER_2", pITT: variant === "actor" ? "PLAYER_3" : "PLAYER_2" } });
    f.poll();
    expect(f.diagnostic().decision.scopedProofs.callLegality).toBeNull();
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it.each(["4", "5", "199", "All In"])("does not expand the deep-stack CALL scope to stack %s", async stack => {
    const f = await live((_, read) => {
      const hj = read.raw.seats.find((s: any) => s.seatNumber === 2);
      hj.stackText = hj.stackContainerText = stack;
    }, false, undefined, '<button type="button">Call 5</button>');
    expect(f.diagnostic().decision.scopedProofs.callLegality).toBeNull();
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it.each(["hero-contribution", "hero-identity", "hero-settling"])("rejects %s despite a matching button", async variant => {
    const f = await live((_, read) => {
      const hj = read.raw.seats.find((s: any) => s.seatNumber === 2);
      if (variant === "hero-contribution") hj.betValueText = "1";
      if (variant === "hero-identity") hj.isYou = false;
      if (variant === "hero-settling") hj.stackIsSettlement = true;
    }, false, undefined, '<button type="button">Call 5</button>');
    expect(f.diagnostic().decision.scopedProofs.callLegality).toBeNull();
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
  it.each(['"UTG @ PLAYER_1" calls 2', '"UTG @ PLAYER_1" raises to 6', '"HJ @ PLAYER_2" raises to 5',
    '"HJ @ PLAYER_2" folds', 'unrecognized poker event', '"HJ @ PLAYER_2" posts a missed big blind of 2'])(
    "rejects contradictory/unknown log evidence: %s", async row => {
      const f = await live(undefined, false, [row]);
      expect(f.diagnostic().preflop.actionWindowEvidence).toBeUndefined();
      expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    });
});

describe("hand238 scoped empirical CALL permission through production", () => {
  const markup = '<button type="button">CALL 5</button>';
  const run = (change?: (fs: any[], read: any) => void, html = markup) => live(change, false, undefined, html, true);
  const noAdvice = (f: Awaited<ReturnType<typeof live>>) => {
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    expect(f.socket.send).not.toHaveBeenCalled();
    expect(f.diagnostic().handTimeline.current.historyComplete).toBe(false);
    expect(f.diagnostic().decision.scopedProofs.activation.allowed).toBe(false);
  };
  it("binds CALL-only permission to the actual HJ observer, original positions and fresh opportunity", async () => {
    const f = await run(), d = f.diagnostic(), c = d.decision.scopedProofs.callLegality;
    expect(d.preflop).toMatchObject({ heroPosition: "HJ", situation: "facing_open", lastAggressorSeat: 10, amountToCallBB: 2.5 });
    expect(c).toMatchObject({ authorized: false, historyComplete: false,
      facts: { contributionGapChips: 5, remainingStackChips: 253, payableIfCallAuthorizedChips: 5 },
      serverLegality: { status: "proven", authority: "scoped_empirical_acceptance" },
      legalActionsProof: { status: "insufficient" },
      permission: { action: "CALL", status: "proven", callCostChips: 5, priorContributionChips: 0,
        resultingContributionChips: 5, remainingStackAfterCallChips: 248, fullActionSetCertified: false,
        recommendationAuthorized: false,
        binding: { tableId: "TABLE_TEST", handId: "HAND_238", handNumber: 238, heroId: "PLAYER_1", heroSeat: 1,
          heroCards: ["7h", "Kd"], generation: 1, cursor: 1792581151977, activationSequence: 14,
          receivedAt: 1792581149857, expiresAt: 1792581159857 },
        continuity: { generation: 1, baselineSequence: 1, throughSequence: 14 },
        control: { rawText: "CALL 5", enabled: true, amountChips: 5 } } });
    expect(c.permission.binding).toEqual(c.binding);
    expect(c.binding.decisionEpoch).toBe(d.decision.scopedProofs.responseStrategy.binding.decisionEpoch);
    expect(c.permission.players.map((p: any) => [p.position, p.seat, p.sourceStack, p.contribution])).toEqual([
      ["BTN", 3, 244, 0], ["SB", 5, 254, 1], ["BB", 9, 246, 2],
      ["UTG", 10, 265, 5], ["HJ", 1, 253, 0], ["CO", 2, 240, 0] ]);
    expect(d.decision.scopedProofs.responseStrategy).toMatchObject({ status: "uncovered", hand: "K7o",
      chosenAction: null, liveAuthorized: false, call: { authorization: "proven" },
      remainingRequirements: { CALL: ["reviewed_response_strategy"] } });
    for (const scope of ["legalActions", "raiseLegality", "reopening", "pot", "accounting"])
      expect(d.decision.scopedProofs.evidence.proofs.find((p: any) => p.scope === scope).status).toBe("insufficient");
    noAdvice(f);
  });
  it("retains the deadline and cannot revive permission with the historical accepted CALL or CO turn", async () => {
    const f = await run();
    const recorded = load("pokernow-hj-call-238.json").frames;
    const call = recorded[14], co = recorded[15];
    // All raw acceptance fields are preserved: cRPI includes both players but
    // only HJ's contribution changes, to the existing highest (not above it).
    expect(call.payload.tB).toEqual({ PLAYER_1: 5 });
    expect(call.payload.cRPI).toEqual(["PLAYER_10", "PLAYER_1"]);
    expect(call.payload).not.toHaveProperty("cHB");
    expect(call.payload.pre).toBe(f.turn.payload.now);
    expect(co.payload.pre).toBe(call.payload.now);
    expect(co.payload.cPI).toBe("PLAYER_2"); expect(co.payload.pITT).toBe("PLAYER_2");
    expect(call.localReceivedAt - f.turn.localReceivedAt).toBe(14806);
    f.atAge(9999); f.poll();
    expect(f.diagnostic().decision.scopedProofs.callLegality.permission.binding.expiresAt).toBe(1792581159857);
    f.atAge(10000); f.refresh(); f.poll();
    expect(f.diagnostic().decision.scopedProofs.callLegality).toBeNull();
    for (const frame of [call, co]) {
      f.incoming(frame); f.poll();
      expect(f.diagnostic().handTimeline.sourceStatus.facingOpenProof).toBeNull();
      expect(f.diagnostic().decision.scopedProofs.callLegality).toBeNull(); noAdvice(f);
    }
  });
  it.each([
    ['', "unobserved"], ['<button type="button" hidden>Call 5</button>', "unobserved"],
    ['<button type="button" disabled>Call 5</button>', "unusable"],
    ['<button type="button">Call 6</button>', "contradicted"],
    ['<button type="button">Call 0</button>', "contradicted"],
    ['<button type="button">Call 5BB</button>', "unusable"],
    ['<button type="button">Call 5</button><button type="button">Call 5</button>', "contradicted"],
  ])("withholds ready permission for control %s", async (html, status) => {
    const f = await run(undefined, html), c = f.diagnostic().decision.scopedProofs.callLegality;
    expect(c.ui.status).toBe(status); expect(c.permission).toBeNull();
    expect(c.serverLegality.status).toBe("proven");
    expect(f.diagnostic().decision.scopedProofs.responseStrategy.remainingRequirements.CALL).toContain("current_call_authorization");
    noAdvice(f);
  });
  it.each(["wrong-amount", "wrong-actor", "reconnect", "predecessor", "missing-open", "unknown-open-field",
    "profile", "hand", "hero-contribution", "short-stack", "dom-actor", "cards", "settling"])("rejects %s", async variant => {
    const f = await run((fs, read) => {
      const start = fs[11], open = fs[12], turn = fs[13], hero = read.raw.seats.find((s: any) => s.seatNumber === 1);
      if (variant === "wrong-amount") open.payload.tB.PLAYER_10 = open.payload.cHB = 6;
      if (variant === "wrong-actor") turn.payload.cPI = turn.payload.pITT = "PLAYER_2";
      if (variant === "reconnect") turn.connectionGeneration++;
      if (variant === "predecessor") turn.payload.pre++;
      if (variant === "missing-open") fs.splice(12, 1);
      if (variant === "unknown-open-field") open.payload.unknownAction = true;
      if (variant === "profile") start.payload.fV = "0.1.73";
      if (variant === "hand") turn.payload.hI = "OTHER_HAND";
      if (variant === "hero-contribution") hero.betValueText = "1";
      if (variant === "short-stack") { fs[0].payload.gameState.players.PLAYER_1.stack = 4; hero.stackText = hero.stackContainerText = "4"; }
      if (variant === "dom-actor") hero.statusClasses = ["table-player", "you-player"];
      if (variant === "cards") hero.holeCardClassLists = [["card-h", "card-s-A"], ["card-d", "card-s-A"]];
      if (variant === "settling") hero.stackIsSettlement = true;
    });
    expect(f.diagnostic().decision.scopedProofs.callLegality).toBeNull(); noAdvice(f);
  });
  it.each([1, 2, 3, 5, 9, 10])("does not extrapolate empirical coverage to a changed stack at seat %s", async seat => {
    const f = await run((fs, read) => {
      const id = `PLAYER_${seat}`;
      for (const frame of fs) {
        const p = (frame.payload.gameState ?? frame.payload).players?.[id];
        if (p?.stack !== undefined) p.stack++;
      }
      const s = read.raw.seats.find((s: any) => s.seatNumber === seat);
      s.stackText = s.stackContainerText = String(Number(s.stackText) + 1);
    });
    const c = f.diagnostic().decision.scopedProofs.callLegality;
    expect(c).not.toBeNull(); expect(c.costProof.status).toBe("proven");
    expect(c.serverLegality.status).toBe("unproven"); expect(c.permission).toBeNull(); noAdvice(f);
  });
  it.each(["actor", "contradictory-total", "same-actor", "disconnect"])("invalidates permission on later %s", async variant => {
    const f = await run();
    expect(f.diagnostic().decision.scopedProofs.callLegality.permission).not.toBeNull();
    if (variant === "disconnect") f.socket.dispatchEvent(new Event("close"));
    else f.incoming({ ...f.turn, localReceivedAt: f.turn.localReceivedAt + 2000,
      payload: { ...f.turn.payload, pre: f.turn.payload.now, now: f.turn.payload.now + 1,
        ...(variant === "contradictory-total" ? { tB: { PLAYER_10: 6 } } : {}),
        cPI: variant === "actor" ? "PLAYER_2" : "PLAYER_1", pITT: variant === "actor" ? "PLAYER_2" : "PLAYER_1" } });
    f.poll(); expect(f.diagnostic().decision.scopedProofs.callLegality).toBeNull(); noAdvice(f);
  });
  it.each(["pre-activation", "future", "clock-regression", "empty-epoch"])("withholds permission for %s", async variant => {
    const f = await run(), r = structuredClone(f.read), timeline = f.diagnostic().handTimeline;
    if (variant === "pre-activation") r.callControl.observedAt = f.turn.localReceivedAt - 1;
    if (variant === "future") r.callControl.observedAt = Date.now() + 1;
    if (variant === "clock-regression") f.atAge(-1);
    const c = callLegalityEvidence(r, assessLiveState(r.raw, r.context), timeline, variant === "empty-epoch" ? "" : "test-epoch");
    expect(c?.permission ?? null).toBeNull(); noAdvice(f);
  });
  it("rebinds a new epoch without reusing or extending the prior permission", async () => {
    const f = await run(), timeline = f.diagnostic().handTimeline;
    const a = callLegalityEvidence(f.read, assessLiveState(f.read.raw, f.read.context), timeline, "epoch-a")!;
    const b = callLegalityEvidence(f.read, assessLiveState(f.read.raw, f.read.context), timeline, "epoch-b")!;
    expect(a.permission!.binding.decisionEpoch).toBe("epoch-a");
    expect(b.permission!.binding.decisionEpoch).toBe("epoch-b");
    expect(a.permission!.binding.expiresAt).toBe(b.permission!.binding.expiresAt); noAdvice(f);
  });
});

describe("hand238 multi-action source prefix", () => {
  const recorded = () => load("pokernow-hj-call-238.json").frames;
  const run = (change?: (fs: any[]) => void, projection?: (p: any) => void) => replay(change, projection, recorded());
  it("certifies the original HJ observer's public raise/call/CO prefix with separate contributions", () => {
    const f = run(), p = f.source.coFacingOpenProof()!;
    expect(p).toMatchObject({ scope: "co_facing_utg_open5_hj_call5", historyComplete: false,
      witness: { heroId: "PLAYER_1", handId: "HAND_238", handNumber: 238, generation: 1, cursor: 1792581167582,
        receivedAt: 1792581165464 }, anchor: { sequence: 12, cursor: 1792581137163 },
      hjActivation: { sequence: 14, receivedAt: 1792581149857 }, activation: { sequence: 16 },
      actor: { playerId: "PLAYER_2", seat: 2, position: "CO" },
      continuity: { baselineSequence: 1, throughSequence: 16, generation: 1 },
      expiresAt: 1792581175464,
      facts: { amountToCallChips: 5, nextMinimumRaiseToChips: null, contestablePotChips: null },
      accounting: { units: "chips", streetContributionSumChips: 13, contestablePotChips: null } });
    expect(p.transitions).toMatchObject([
      { sequence: 13, action: "raise", actor: { position: "UTG", seat: 10 }, priorContributionChips: 0,
        newContributionChips: 5, investmentChips: 5, previousHighestContributionChips: 2, observedRaiseIncrementChips: 3 },
      { sequence: 15, action: "call", actor: { position: "HJ", seat: 1 }, priorContributionChips: 0,
        newContributionChips: 5, investmentChips: 5, previousHighestContributionChips: 5, observedRaiseIncrementChips: 0 },
    ]);
    expect(p.transitions[0].evidence.raw).toEqual(f.frames[12].payload);
    expect(p.transitions[1].evidence.raw).toEqual(f.frames[14].payload);
    expect(p.hjActivation.sourcePatch).toEqual(f.frames[13].payload);
    expect(p.activation.sourcePatch).toEqual(f.frames[15].payload);
    expect(p.accounting.contributions.map(c => [c.position, c.forcedChips, c.voluntaryInvestmentChips, c.streetTotalChips, c.remainingCapacityChips])).toEqual([
      ["BTN", 0, 0, 0, 244], ["SB", 1, 0, 1, 253], ["BB", 2, 0, 2, 244],
      ["UTG", 0, 5, 5, 260], ["HJ", 0, 5, 5, 248], ["CO", 0, 0, 0, 240],
    ]);
    expect(f.source.facingOpenProof()).toBeNull(); expect(f.source.coProof()).toBeNull();
    p.accounting.contributions[0]!.streetTotalChips = 99;
    p.transitions[1].evidence.raw.tB.PLAYER_1 = 99;
    expect(f.source.coFacingOpenProof()!.accounting.streetContributionSumChips).toBe(13);
    expect(f.source.coFacingOpenProof()!.transitions[1].evidence.raw.tB.PLAYER_1).toBe(5);
  });
  it("retains historical facts after HJ expiry without issuing CO before its own activation", () => {
    const fs = recorded(), f = replay(undefined, undefined, fs.slice(0, 14));
    const hjDeadline = f.source.facingOpenProof()!.expiresAt;
    f.at(hjDeadline); expect(f.source.facingOpenProof()).toBeNull();
    f.accept(fs[14]);
    expect(f.source.coFacingOpenProof()).toBeNull(); expect(f.source.facingOpenProof()).toBeNull();
    expect(f.source.diagnostic().coFacingOpenWindow.transitions.map(t => t.action)).toEqual(["raise", "call"]);
    f.accept(fs[15]);
    expect(f.source.coFacingOpenProof()!.expiresAt).toBe(fs[15].localReceivedAt + 10000);
    expect(f.source.coFacingOpenProof()!.expiresAt).not.toBe(hjDeadline);
    expect(f.source.facingOpenProof()).toBeNull();
  });
  it.each(["missing-open", "missing-hj-turn", "missing-call", "missing-co-turn", "call-amount", "extra-contribution",
    "coalesced", "unknown-call-field", "unknown-turn-field", "raise-disguised-as-call", "wrong-call-actor", "wrong-hj-actor",
    "wrong-co-actor", "cRPI-only", "wrong-cRPI", "call-predecessor", "turn-predecessor", "replayed-call", "sequence-gap",
    "reconnect-call", "reconnect-turn", "fold-status", "all-in", "changed-hand", "changed-roster", "changed-blind",
    "changed-profile", "regressing-time", "stale-cursor", "refresh"])("rejects %s", variant => {
    const f = run(fs => {
      const call = fs[14], co = fs[15];
      if (variant === "missing-open") fs.splice(12, 1);
      if (variant === "missing-hj-turn") fs.splice(13, 1);
      if (variant === "missing-call") fs.splice(14, 1);
      if (variant === "missing-co-turn") fs.pop();
      if (variant === "call-amount") call.payload.tB.PLAYER_1 = 4;
      if (variant === "extra-contribution") call.payload.tB.PLAYER_2 = 5;
      if (variant === "coalesced") call.payload.cPI = call.payload.pITT = "PLAYER_2";
      if (variant === "unknown-call-field") call.payload.unreviewed = true;
      if (variant === "unknown-turn-field") co.payload.unreviewed = true;
      if (variant === "raise-disguised-as-call") { call.payload.tB.PLAYER_1 = 8; call.payload.cHB = 8; }
      if (variant === "wrong-call-actor") call.payload.tB = { PLAYER_2: 5 };
      if (variant === "wrong-hj-actor") fs[13].payload.cPI = fs[13].payload.pITT = "PLAYER_2";
      if (variant === "wrong-co-actor") co.payload.cPI = co.payload.pITT = "PLAYER_3";
      if (variant === "cRPI-only") delete call.payload.tB;
      if (variant === "wrong-cRPI") call.payload.cRPI = ["PLAYER_2", "PLAYER_1"];
      if (variant === "call-predecessor") call.payload.pre++;
      if (variant === "turn-predecessor") co.payload.pre++;
      if (variant === "replayed-call") fs.splice(15, 0, structuredClone(call));
      if (variant === "sequence-gap") co.localReceiveSequence++;
      if (variant === "reconnect-call") call.connectionGeneration++;
      if (variant === "reconnect-turn") co.connectionGeneration++;
      if (variant === "fold-status") call.payload.pGS = { PLAYER_1: "fold" };
      if (variant === "all-in") call.payload.pGS = { PLAYER_1: "allIn" };
      if (variant === "changed-hand") co.payload.hI = "OTHER";
      if (variant === "changed-roster") co.payload.iHPI = ["PLAYER_1", "PLAYER_2"];
      if (variant === "changed-blind") co.payload.bigBlind = 4;
      if (variant === "changed-profile") fs[11].payload.fV = "0.1.73";
      if (variant === "regressing-time") call.localReceivedAt = fs[13].localReceivedAt - 1;
      if (variant === "stale-cursor") co.payload.now = co.payload.pre;
      if (variant === "refresh") co.event = "rup";
    });
    expect(f.source.coFacingOpenProof()).toBeNull(); expect(f.source.diagnostic().historyComplete).toBe(false);
  });
  it.each(["raw-omitted", "projection-mismatch"])("rejects %s in the existing projector path", variant => {
    const f = run(undefined, p => {
      if (p?.bettingPatch?.cRPI.length === 2) {
        if (variant === "raw-omitted") delete p.bettingPatch;
        else p.frame.tB = { PLAYER_1: 6 };
      }
    });
    expect(f.source.coFacingOpenProof()).toBeNull();
  });
  it.each([1, 2, 3, 5, 9, 10])("preserves exact empirical stack coverage at seat %s", seat => {
    const f = run(fs => { for (const frame of fs) {
      const p = (frame.payload.gameState ?? frame.payload).players?.[`PLAYER_${seat}`];
      if (p?.stack !== undefined) p.stack++;
    } });
    expect(f.source.coFacingOpenProof()).toBeNull();
  });
  it("rejects expired/regressing CO witnesses and cannot renew on a same-actor source update", () => {
    const f = run(), co = f.frames[15];
    f.at(co.localReceivedAt - 1); expect(f.source.coFacingOpenProof()).toBeNull();
    f.at(co.localReceivedAt + 9999); expect(f.source.coFacingOpenProof()).not.toBeNull();
    f.at(co.localReceivedAt + 10000); expect(f.source.coFacingOpenProof()).toBeNull();
    f.accept({ ...co, localReceiveSequence: 17, localReceivedAt: co.localReceivedAt + 10001,
      payload: { ...co.payload, pre: co.payload.now, now: co.payload.now + 1, pASA: co.payload.now + 1 } });
    expect(f.source.coFacingOpenProof()).toBeNull();
  });
  it.each([14, 15, 16])("reset clears retained prefix/certificate after frame%s", count => {
    const fs = recorded(), f = replay(undefined, undefined, fs.slice(0, count));
    f.source.reset();
    for (const frame of fs.slice(count)) f.accept(frame);
    expect(f.source.coFacingOpenProof()).toBeNull();
    expect(f.source.diagnostic().coFacingOpenWindow.transitions).toEqual([]);
  });
});

describe("CO open-plus-caller source-to-overlay replay", () => {
  const run = (change?: (fs: any[], read: any) => void, logs?: string[]) => live(change, false, logs, '<button type="button">Call 5</button>', true, {});
  const noAdvice = (f: Awaited<ReturnType<typeof live>>) => {
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0); expect(f.socket.send).not.toHaveBeenCalled();
    expect(f.diagnostic().decision.scopedProofs.activation.allowed).toBe(false);
    expect(f.diagnostic().decision.scopedProofs.callLegality).toBeNull();
    expect(f.diagnostic().decision.scopedProofs.openingSize).toBeNull();
    expect(f.diagnostic().handTimeline.current.historyComplete).toBe(false);
  };
  it("classifies the two actions for simulated CO and binds its independent deadline without strategy", async () => {
    const f = await run(), d = f.diagnostic(), p = d.decision.scopedProofs;
    expect(d.preflop).toMatchObject({ heroPosition: "CO", situation: "facing_open_and_callers", playersDealtIn: 6,
      actionWindowEvidence: "co_facing_utg_open5_hj_call5", historyCoverage: "complete", potBB: null,
      amountToCallBB: 2.5, lastAggressorSeat: 10, decisionSupport: "uncertain",
      actions: [{ seat: 10, action: "raise", wagerAction: "raise", totalContributionBB: 2.5, observation: 13 },
        { seat: 1, action: "call", wagerAction: "call", totalContributionBB: 2.5, observation: 15 }] });
    expect(p.coResponse).toMatchObject({ chosenAction: null, liveAuthorized: false, strategy: "missing", legality: "unproven",
      binding: { heroId: "PLAYER_2", generation: 1, receivedAt: 1792581165464, expiresAt: 1792581175464 },
      accounting: { streetContributionSumChips: 13, contestablePotChips: null } });
    expect(p.coResponse.binding.decisionEpoch).toBe(p.evidence.decisionEpoch);
    expect(p.responseWindow.scope).toBe("co_facing_utg_open5_hj_call5");
    expect(p.responseStrategy).toBeNull(); expect(p.activation.state).toBe("unsupported");
    for (const scope of ["actionWindow", "connection", "roster", "position", "stack", "callCost"])
      expect(p.evidence.proofs.find((x: any) => x.scope === scope).status).toBe("proven");
    for (const scope of ["pot", "accounting", "eligibility", "legalActions", "raiseLegality", "reopening"])
      expect(p.evidence.proofs.find((x: any) => x.scope === scope).status).toBe("insufficient");
    expect(f.text()).toContain("facing_open_and_callers"); expect(f.text()).toContain("UNSUPPORTED"); noAdvice(f);
  });
  it("the actual captured HJ observer certifies public CO activation but cannot consume CO context", async () => {
    const f = await live(undefined, false, undefined, '', true, { originalObserver: true });
    expect(f.diagnostic().handTimeline.sourceStatus.coFacingOpenProof.actor.position).toBe("CO");
    expect(f.diagnostic().decision.scopedProofs.coResponse).toBeNull();
    expect(f.diagnostic().preflop.actionWindowEvidence).toBeUndefined(); noAdvice(f);
  });
  it.each(["missing-call", "call-total", "utg-total", "hj-total", "blind-total", "hj-stack", "co-stack", "actor",
    "cards", "dealer", "reconnect", "predecessor", "unknown-call", "unknown-turn"])("withholds context for %s", async variant => {
    const f = await run((fs, read) => {
      const hj = read.raw.seats.find((s: any) => s.seatNumber === 1), co = read.raw.seats.find((s: any) => s.seatNumber === 2);
      if (variant === "missing-call") fs.splice(14, 1);
      if (variant === "call-total") fs[14].payload.tB.PLAYER_1 = 6;
      if (variant === "utg-total") read.raw.seats.find((s: any) => s.seatNumber === 10).betValueText = "6";
      if (variant === "hj-total") hj.betValueText = "4";
      if (variant === "blind-total") read.raw.seats.find((s: any) => s.seatNumber === 5).betValueText = "2";
      if (variant === "hj-stack") hj.stackText = hj.stackContainerText = "253";
      if (variant === "co-stack") co.stackText = co.stackContainerText = "4";
      if (variant === "actor") co.statusClasses = ["table-player", "you-player"];
      if (variant === "cards") co.holeCardClassLists = [["card-h", "card-s-7"], ["card-d", "card-s-K"]];
      if (variant === "dealer") read.context.dealerSeatNumber = 5;
      if (variant === "reconnect") fs[15].connectionGeneration++;
      if (variant === "predecessor") fs[15].payload.pre++;
      if (variant === "unknown-call") fs[14].payload.unreviewed = true;
      if (variant === "unknown-turn") fs[15].payload.unreviewed = true;
    });
    expect(f.diagnostic().decision.scopedProofs.coResponse).toBeNull();
    expect(f.diagnostic().preflop?.actionWindowEvidence).toBeUndefined(); noAdvice(f);
  });
  it("unchanged polls and matching controls never refresh CO's source deadline", async () => {
    const f = await run(), first = f.diagnostic().decision.scopedProofs.coResponse.binding;
    f.atAge(9999); f.poll();
    expect(f.diagnostic().decision.scopedProofs.coResponse.binding.expiresAt).toBe(first.expiresAt);
    f.atAge(10000); f.refresh(); f.poll();
    expect(f.diagnostic().decision.scopedProofs.coResponse).toBeNull();
    expect(f.diagnostic().decision.scopedProofs.responseWindow).toBeNull(); noAdvice(f);
  });
  it.each(["same-actor", "changed-actor", "contradictory-total", "disconnect"])("invalidates CO context on %s", async variant => {
    const f = await run();
    if (variant === "disconnect") f.socket.dispatchEvent(new Event("close"));
    else f.incoming({ ...f.turn, localReceivedAt: f.turn.localReceivedAt + 2000,
      payload: { ...f.turn.payload, pre: f.turn.payload.now, now: f.turn.payload.now + 1,
        ...(variant === "contradictory-total" ? { tB: { PLAYER_1: 6 } } : {}),
        cPI: variant === "changed-actor" ? "PLAYER_3" : "PLAYER_2", pITT: variant === "changed-actor" ? "PLAYER_3" : "PLAYER_2" } });
    f.poll(); expect(f.diagnostic().decision.scopedProofs.coResponse).toBeNull(); noAdvice(f);
  });
  it("allows matching log corroboration without making it complete history", async () => {
    const f = await run(undefined, ['"SB @ PLAYER_5" posts a small blind of 1', '"BB @ PLAYER_9" posts a big blind of 2',
      '"UTG @ PLAYER_10" raises to 5', '"HJ @ PLAYER_1" calls 5']);
    expect(f.diagnostic().preflop.actionWindowEvidence).toBe("co_facing_utg_open5_hj_call5"); noAdvice(f);
  });
  it.each([
    ['"HJ @ PLAYER_1" raises to 5'], ['"HJ @ PLAYER_1" calls 4'], ['"CO @ PLAYER_2" calls 5'],
    ['"HJ @ PLAYER_1" calls 5', '"UTG @ PLAYER_10" raises to 5'],
    ['"HJ @ PLAYER_1" calls 5', '"HJ @ PLAYER_1" calls 5'], ['unrecognized action'],
  ])("rejects contradictory log rows %s", async (...rows: string[]) => {
    const f = await run(undefined, rows);
    expect(f.diagnostic().decision.scopedProofs.coResponse).toBeNull(); noAdvice(f);
  });
});

// Phase 6A: no captured postflop continuation exists. These are adversarial
// synthetic tails after a REAL accepted preflop prefix, not positive evidence
// for gT codes, card transitions, action semantics or a new source contract.
describe("Phase 6A: unsupported postflop source/DOM cannot reuse a preflop certificate", () => {
  it.each(["dom-only", "flop", "turn-without-flop", "river-without-turn", "duplicate-board", "hero-card-collision",
    "reordered-board", "wrong-actor", "contradictory-actors", "missing-frame", "predecessor-gap",
    "reordered-action", "reconnect", "stale", "new-hand"])("blocks synthetic %s through MAIN to overlay", async variant => {
    // Original HJ observer and all 16 actual hand238 envelopes are preserved.
    // live() supplies DOM scaffolding only. The public CO certificate below
    // is a positive control that the real preflop source authority is running.
    const f = await live(undefined, false, undefined, '<button type="button">Call 5</button>', true, { originalObserver: true });
    const original = f.diagnostic().handTimeline.sourceStatus.coFacingOpenProof;
    expect(original).toMatchObject({ activation: { sequence: 16 }, expiresAt: 1792581175464 });
    const board = ["2c", "3d", "4h", "5s", "6c"].slice(0,
      variant === "turn-without-flop" ? 4 : variant === "river-without-turn" ? 5 : 3);
    if (variant === "duplicate-board") board[1] = board[0]!;
    if (variant === "hero-card-collision") board[0] = "7h";
    if (variant === "reordered-board") board.reverse();
    const tail = { ...f.turn, localReceiveSequence: 17, localReceivedAt: f.turn.localReceivedAt + 2000,
      payload: { pre: f.turn.payload.now, now: f.turn.payload.now + 1, eventsData: [], fV: "0.1.72",
        gT: [1, board.length - 2], oTC: { "1": board }, cPI: "PLAYER_1", pITT: "PLAYER_1" } as any };
    if (variant === "wrong-actor") tail.payload.cPI = tail.payload.pITT = "PLAYER_2";
    if (variant === "contradictory-actors") tail.payload.pITT = "PLAYER_2";
    // MAIN assigns its own sequence; omit a source predecessor instead of
    // pretending a raw recorder sequence can inject a bridge sequence number.
    if (variant === "missing-frame" || variant === "predecessor-gap") tail.payload.pre++;
    if (variant === "reordered-action") tail.payload = structuredClone(load("pokernow-hj-call-238.json").frames[14].payload);
    if (variant === "reconnect") tail.connectionGeneration++;
    if (variant === "stale") tail.localReceivedAt = original.expiresAt + 1;
    if (variant === "new-hand") { tail.payload.hI = "OTHER_HAND"; tail.payload.gN = 239; }
    if (variant !== "dom-only") f.incoming(tail);
    f.read.raw.boardCards = board.map(c => ({ valueText: c[0], suitText: c[1] }));
    for (const seat of f.read.raw.seats) if (seat.isOccupied) seat.statusClasses = ["table-player",
      ...(seat.isYou ? ["you-player", "decision-current"] : [])];
    f.poll();
    const d = f.diagnostic(), p = d.decision.scopedProofs, source = d.handTimeline.sourceStatus;
    for (const key of ["firstUtgProof", "hjProof", "coProof", "btnProof", "sbProof", "facingOpenProof", "coFacingOpenProof"]) {
      // With no new message, the public PREflop CO proof can still be fresh;
      // the postflop DOM must nevertheless fail its dependent live cross-check.
      if (variant === "dom-only" && key === "coFacingOpenProof") expect(source[key]).toEqual(original);
      else expect(source[key]).toBeNull();
    }
    expect(p.activation.allowed).toBe(false);
    expect(p.evidence.proofs.find((proof: any) => proof.scope === "actionWindow").status).not.toBe("proven");
    expect(p.responseWindow).toBeNull(); expect(p.callLegality).toBeNull(); expect(p.openingSize).toBeNull();
    expect(d.handTimeline.current.historyComplete).toBe(false);
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0); expect(f.socket.send).not.toHaveBeenCalled();
    // Repeated favorable-looking UI reads cannot resurrect the old deadline.
    f.atAge(11000); f.refresh(); f.poll();
    expect(f.diagnostic().decision.scopedProofs.activation.allowed).toBe(false);
    expect(f.diagnostic().handTimeline.sourceStatus.coFacingOpenProof).toBeNull();
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
  });
});

// Phase 4F evidence boundary: the real hand238 recording ENDS at CO activation.
// Every appended frame below is a SYNTHETIC negative variant, never a recorded
// CO action or evidence for a new action contract.
describe("Phase 4F: no certified CO response or BTN response activation", () => {
  const variants = ["actor-only", "guessed-call", "guessed-fold", "guessed-raise",
    "coalesced", "reordered", "unknown-update", "reconnect"] as const;
  function syntheticContinuation(variant: typeof variants[number]) {
    const recorded = load("pokernow-hj-call-238.json").frames;
    const co = recorded[15];
    const envelope = (payload: any, offset: number) => ({ ...co,
      localReceiveSequence: 16 + offset, localReceivedAt: co.localReceivedAt + offset * 1000,
      payload: { ...payload, pre: co.payload.now + offset - 1, now: co.payload.now + offset } });
    const turn = envelope({ ...co.payload, cPI: "PLAYER_3", pITT: "PLAYER_3",
      pASA: co.payload.now + 2, mAVTB: 244 }, 2);
    const call = { ...recorded[14].payload, tB: { PLAYER_2: 5 },
      cRPI: ["PLAYER_10", "PLAYER_1", "PLAYER_2"] };
    // Copying an observed HJ CALL / earlier-hand fold / UTG raise shape does
    // not establish that CO performed that action in this response context.
    const fold = { ...recorded[5].payload, pGS: { PLAYER_2: "fold" } };
    const raise = { ...recorded[12].payload, tB: { PLAYER_2: 8 }, cHB: 8, mR: 11,
      cRPI: ["PLAYER_2"] };
    if (variant === "actor-only") return [envelope(turn.payload, 1)];
    if (variant === "coalesced") return [envelope({ ...call, ...turn.payload, tB: call.tB }, 1)];
    if (variant === "reordered") return [envelope(turn.payload, 1), envelope(call, 2)];
    const action = variant === "guessed-fold" ? fold : variant === "guessed-raise" ? raise
      : variant === "unknown-update" ? { eventsData: [], fV: "0.1.72", unreviewedAction: true } : call;
    const tail = [envelope(action, 1), turn];
    if (variant === "reconnect") tail.forEach(f => { f.connectionGeneration = 2; });
    return tail;
  }
  it("the unmodified recorded prefix certifies CO only, without a third action or BTN window", async () => {
    // Real recorded public source and HJ registration/cards; browser DOM is
    // simulated by live(). This is not a captured CO or BTN browser session.
    const f = await live(undefined, false, undefined, "", true, { originalObserver: true });
    const d = f.diagnostic(), s = d.handTimeline.sourceStatus;
    expect(s.coFacingOpenProof).toMatchObject({ activation: { sequence: 16 },
      actor: { position: "CO" }, expiresAt: 1792581175464,
      accounting: { streetContributionSumChips: 13, contestablePotChips: null } });
    expect(s.coFacingOpenProof.transitions.map((t: any) => [t.actor.position, t.action])).toEqual([
      ["UTG", "raise"], ["HJ", "call"],
    ]);
    expect(s.btnProof).toBeNull();
    expect(d.decision.scopedProofs.responseWindow).toBeNull();
    expect(d.decision.scopedProofs.activation.allowed).toBe(false);
    expect(d.handTimeline.current.historyComplete).toBe(false);
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    expect(f.socket.send).not.toHaveBeenCalled();
  });
  it.each(variants)("the production source rejects synthetic %s as a response certificate", variant => {
    const f = replay(undefined, undefined, load("pokernow-hj-call-238.json").frames);
    expect(f.source.coFacingOpenProof()?.activation.sequence).toBe(16);
    for (const frame of syntheticContinuation(variant)) {
      f.accept(frame);
      expect(f.source.coFacingOpenProof()).toBeNull();
      expect(f.source.facingOpenProof()).toBeNull();
      expect(f.source.btnProof()).toBeNull();
      expect(f.source.diagnostic().coFacingOpenWindow.transitions).toEqual([]);
      expect(f.source.diagnostic().historyComplete).toBe(false);
    }
  });
  it.each(variants)("simulated BTN browser stays blocked after synthetic %s", async variant => {
    const f = await live((fs, read) => {
      // Explicitly simulated BTN registration/private cards/DOM. Preserve all
      // recorded public actions, original seats, stacks, contributions and IDs.
      for (const frame of fs) {
        if (frame.event === "registered") frame.payload.currentPlayer.id = "PLAYER_3";
        const p = frame.payload.gameState ?? frame.payload;
        if (p.pC) for (const [id, hand] of Object.entries(p.pC) as [string, any][])
          hand.cards.forEach((c: any, i: number) => { c.value = id === "PLAYER_3" ? ["Ah", "Kd"][i] : null; });
      }
      for (const s of read.raw.seats) if (s.isOccupied) {
        s.isYou = s.seatNumber === 3;
        s.statusClasses = ["table-player", ...(s.isYou ? ["you-player"] : []),
          ...(s.seatNumber === 2 ? ["decision-current"] : [])];
        s.holeCardClassLists = s.isYou ? [["card-h", "card-s-A"], ["card-d", "card-s-K"]] : [];
      }
    }, false, undefined, '<button type="button">Call 5</button>', true, { originalObserver: true });
    for (const frame of syntheticContinuation(variant)) f.incoming(frame);
    // Even a favorable-looking BTN UI and CALL5 control cannot repair source
    // evidence or turn the response into an unopened BTN policy decision.
    for (const s of f.read.raw.seats) if (s.isOccupied) s.statusClasses = ["table-player",
      ...(s.isYou ? ["you-player", "decision-current"] : [])];
    f.poll();
    const d = f.diagnostic(), p = d.decision.scopedProofs;
    expect(d.preflop.heroPosition).toBe("BTN");
    expect(d.preflop.actionWindowEvidence).toBeUndefined();
    expect(d.preflop.openingEvidence).toBeUndefined();
    expect(d.handTimeline.sourceStatus.btnProof).toBeNull();
    expect(d.handTimeline.current.historyComplete).toBe(false);
    expect(p.responseWindow).toBeNull(); expect(p.responseStrategy).toBeNull();
    expect(p.callLegality).toBeNull(); expect(p.openingSize).toBeNull();
    expect(p.activation.allowed).toBe(false);
    expect(f.action()).toBeNull(); expect(f.requests).toHaveLength(0);
    expect(f.socket.send).not.toHaveBeenCalled();
  });
});
