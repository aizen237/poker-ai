import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
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
function replay(change?: (f: any[]) => void, projectionChange?: (p: any) => void) {
  const f = frames(); change?.(f);
  let now = 0, hero: string | null = null;
  const source = createFirstUtgSource("TABLE_TEST", () => now);
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
async function live(change?: (fs: any[], read: any) => void, originalObserver = false, logActions?: string[], callMarkup = "", hand238 = false) {
  vi.resetModules();
  const fs = hand238 ? load("pokernow-hj-call-238.json").frames.slice(0, 14) : frames(!originalObserver);
  const start = fs.at(-3).payload, turn = fs.at(-1);
  const read = load("utg-reader-cross-check.json").read;
  const hero = hand238 ? "PLAYER_1" : originalObserver ? "PLAYER_1" : "PLAYER_2";
  const utg = hand238 ? "PLAYER_10" : "PLAYER_1", hj = hand238 ? "PLAYER_1" : "PLAYER_2";
  const stacks: Record<string, number> = {};
  for (const f of fs) for (const [id, p] of Object.entries((f.payload.gameState ?? f.payload).players ?? {}) as [string, any][]) {
    if (p.stack !== undefined) stacks[id] = p.stack;
  }
  for (const s of read.raw.seats) if (s.isOccupied) {
    const id = `PLAYER_${s.seatNumber}`, total = id === utg ? 5 : start.tB[id] ?? 0;
    s.isYou = id === hero;
    s.statusClasses = ["table-player", ...(s.isYou ? ["you-player"] : []), ...(id === hj ? ["decision-current"] : [])];
    // Same class used by existing recorded reader scaffolding.
    s.holeCardClassLists = s.isYou ? (hand238 ? ["7h", "Kd"] : originalObserver ? ["8h", "Qd"] : ["Ah", "Kd"])
      .map(c => ["card-container", `card-${c[1]}`, `card-s-${c[0]}`, "flipped", "med"]) : [];
    s.stackText = s.stackContainerText = String(stacks[id] - total);
    s.betValueText = total ? String(total) : null;
  }
  read.context.dealerSeatNumber = start.dealerSeat;
  read.raw.potMainValueText = "0"; read.raw.potTotalValueText = "8";
  change?.(fs, read);
  const { document } = parseHTML(`<html><body>${callMarkup}</body></html>`);
  const location = new URL("https://www.pokernow.com/games/TABLE_TEST");
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
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url.endsWith("/recommendation")) requests.push(url);
    if (logActions) return Promise.resolve(new Response(JSON.stringify(url.includes("hand_number=169")
      ? [{ msg: "-- starting hand #169", createdAt: "1000" }, ...logActions.map((msg, i) => ({ msg, createdAt: String(1001 + i) }))] : [])));
    return new Promise(() => {});
  }));
  await import("../../../apps/pokernow-extension/src/eventSource.js");
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  let socket!: Socket, generation = 0;
  const incoming = (f: any) => {
    now = f.localReceivedAt;
    while (generation < f.connectionGeneration) { generation++; socket = new win.WebSocket("wss://www.pokernow.com/socket.io/?gameID=TABLE_TEST"); }
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
    atAge: (age: number) => { now = turn.localReceivedAt + age; },
    text: () => document.getElementById("poker-ai-reader-overlay")!.textContent!,
    action: () => document.querySelector('#poker-ai-reader-overlay [style*="font-size:16px"]')?.textContent ?? null };
}

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
    expect(d.decision.scopedProofs.responseStrategy).toMatchObject({ status: "reference_missing",
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
  it.each([["7h", "2c", "72o"], ["8h", "8d", "88"], ["Ah", "Ad", "AA"]])(
    "synthetic HJ %s %s remains blocked without a reviewed reference", async (a, b, hand) => {
      const f = await live((fs, read) => {
        for (const frame of fs) {
          const cards = (frame.payload.gameState ?? frame.payload).pC?.PLAYER_2?.cards;
          if (cards) cards.forEach((c: any, i: number) => { c.value = [a, b][i]; });
        }
        read.raw.seats.find((s: any) => s.seatNumber === 2).holeCardClassLists = [a, b].map(c =>
          ["card-container", `card-${c[1]}`, `card-s-${c[0]}`, "flipped", "med"]);
      });
      expect(f.diagnostic().decision.scopedProofs.responseStrategy).toMatchObject({ hand,
        status: "reference_missing", chosenAction: null, liveAuthorized: false });
      expect(f.text()).toContain("No reviewed HJ-versus-UTG");
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
    expect(d.decision.scopedProofs.responseStrategy.status).toBe("reference_missing");
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
    expect(d.decision.scopedProofs.responseStrategy).toMatchObject({ status: "reference_missing", hand: "K7o",
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
