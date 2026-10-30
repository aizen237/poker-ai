import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { parseHTML } from "linkedom";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { projectRiverObservation } from "../../../apps/pokernow-extension/src/riverObservation.js";
import { projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { buildLiveDecisionProofs } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { readLiveTable } from "../../../apps/pokernow-extension/src/tableRead.js";
import { assessLiveState } from "./liveState.js";

const mocks = vi.hoisted(() => ({ timeline: null as any }));
vi.mock("../../../apps/pokernow-extension/src/liveTimeline.js", async original => ({
  ...await original<typeof import("../../../apps/pokernow-extension/src/liveTimeline.js")>(),
  startLiveTimeline: () => mocks.timeline,
}));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({
  createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }),
}));
afterEach(() => { mocks.timeline = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// One synthetic hand, not a stitched live capture or evidence certificate.
// Reuse the existing fixture's identities/cards and closed patch shapes; later
// paid-street collection/deals are synthetic variants of its flop collection.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/pokernow-flop-synthetic.json", import.meta.url), "utf8"));
type Street = "flop" | "turn" | "river";
async function table(reportedFlop = false) {
  vi.resetModules();
  let now = 100000, cursor = 1000, sequence = 0;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const runtime = createTimelineRuntime({ tableId: "river-table", sessionId: "combined", now: () => now, fetchLog: vi.fn() });
  mocks.timeline = { ...runtime, tick() {} };
  let identity: ReturnType<typeof identityFromSocketPacket> = null;
  const { document } = parseHTML('<html><body><main id="table"></main></body></html>');
  const location = new URL("https://pokernow.com/games/river-table");
  const intervals = new Map<number, () => void>(), deadlines = new Map<number, () => void>();
  let timer = 0;
  vi.stubGlobal("document", document); vi.stubGlobal("location", location);
  vi.stubGlobal("window", { location,
    setTimeout: (fn: () => void) => { deadlines.set(++timer, fn); return timer; },
    clearTimeout: (id: number) => deadlines.delete(id) });
  vi.stubGlobal("setInterval", (fn: () => void, ms: number) => { intervals.set(ms, fn); return 1; });
  vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible" }));
  vi.stubGlobal("localStorage", { getItem: () => null });
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  for (const method of ["log", "warn", "error"] as const) vi.spyOn(console, method).mockImplementation(() => {});

  const base = structuredClone(fixture.frames[0].payload.gameState);
  // Reported cards/positions only; all source shapes, times, pots and stacks
  // remain synthetic scaffolding, not a reconstruction of the failed hand.
  const heroCards = reportedFlop ? ["2s", "2c"] : ["8s", "As"];
  if (reportedFlop) {
    base.pC.player1.cards = heroCards.map(value => ({ value, showing: false }));
    base.seats = base.seats.map(([seat, id]: [number, string]) =>
      [seat, id === "player3" ? "player4" : id === "player4" ? "player3" : id]);
    base.dealerID = "player4"; base.sBPI = "player3";
  }
  const stacks = Object.fromEntries(Object.entries(base.players).map(([id, p]: [string, any]) => [id, p.stack as number]));
  let board: string[] = [], pot = 12, bets: Record<string, number> = {}, actor: string | null = "player1";
  let checked = false, call = 0;
  const card = (c: string) => `<div class="card-container card-${c[1]} card-s-${c[0]} flipped"><span class="value">${c[0]}</span><span class="suit sub-suit">${c[1]}</span><span class="suit">${c[1]}</span></div>`;
  function dom() {
    document.getElementById("table")!.innerHTML = `<div class="table-cards">${board.map(card).join("")}</div>
      <div class="table-pot-size"><div class="main-value"><span class="normal-value">${pot}</span></div>
      <div class="add-on-container"><span class="normal-value">${pot + Object.values(bets).reduce((a, b) => a + b, 0)}</span></div></div>
      <div class="blind-value"><span class="chips-value"><span class="normal-value">1</span></span></div>
      <div class="blind-value"><span class="chips-value"><span class="normal-value">2</span></span></div><div class="dealer-position-3"></div>
      ${base.seats.map(([seat, id]: [number, string]) => `<div class="table-player-${seat} ${id === "player1" ? "you-player" : ""} ${base.pGS[id] === "fold" ? "fold" : ""} ${actor === id ? "decision-current" : ""}">
        <div class="table-player-name"><a>${id}</a></div><div class="table-player-stack"><span class="normal-value">${stacks[id]! - (bets[id] ?? 0)}</span></div>
        <div class="table-player-cards">${id === "player1" ? heroCards.map(card).join("") : ""}</div>
        ${bets[id] !== undefined || id === "player1" && checked ? `<div class="table-player-bet-value">${bets[id] || "check"}</div>` : ""}</div>`).join("")}
      <button type="button">Call ${call}</button>`;
    document.querySelector("button")!.getBoundingClientRect = () => ({ width: 30, height: 20 } as DOMRect);
  }
  function accept(payload: any, event = "gC", seq = ++sequence, generation = 1) {
    const wire = "42" + JSON.stringify([event, payload]);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId: "river-table", sequence: seq,
      generation, observedAt: now, metadata: inspectSocketMetadata(wire),
      utgSource: projectFirstUtgSource(wire, identity?.heroPlayerId ?? null),
      riverSource: projectRiverObservation(wire, identity?.heroPlayerId ?? null) });
    identity = identityFromSocketPacket(wire, "river-table", identity);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "river-table", sequence: seq, connected: true, identity });
  }
  function patch(fields: any, alter: (p: any) => void = () => {}) {
    now += 100;
    const payload = { ...structuredClone(fields), pre: cursor++, now: cursor, sN: cursor, fV: "0.1.72", mEV: 0, eventsData: [] };
    if (Object.hasOwn(payload, "pASA")) payload.pASA = cursor;
    if (typeof payload.sNAA === "number") payload.sNAA = cursor + 1;
    alter(payload); accept(payload);
  }
  accept({ currentPlayer: { id: "player1" }, gameState: base }, "registered");
  dom();
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  const poll = () => intervals.get(1000)!(), refresh = () => intervals.get(250)!();
  function decision(street: Street, amount: number, options: { opponentFirst?: boolean; alterDeal?: (p: any) => void } = {}) {
    pot += Object.values(bets).reduce((a, b) => a + b, 0);
    for (const [id, value] of Object.entries(bets)) stacks[id]! -= value;
    board = (reportedFlop ? ["Jh", "8d", "8c", "Qs", "6c"] : ["2h", "9s", "4h", "Qs", "6c"])
      .slice(0, street === "flop" ? 3 : street === "turn" ? 4 : 5);
    const deal = structuredClone(fixture.frames[1].payload);
    Object.assign(deal, { gT: [1, board.length - 2], oTC: { "1": board }, pot,
      players: Object.fromEntries(Object.entries(stacks).map(([id, stack]) => [id, { stack }])),
      cPI: options.opponentFirst ? "player4" : "player1", pITT: options.opponentFirst ? "player4" : "player1" });
    bets = {}; checked = false; call = 0; actor = deal.cPI;
    patch(deal, options.alterDeal); dom(); refresh();
    expect(document.querySelector("[data-river-illustration]")).toBeNull();
    if (!options.opponentFirst) {
      patch(fixture.frames[2].payload); bets.player1 = 0; checked = true;
      patch(fixture.frames[3].payload);
    }
    const bet = structuredClone(fixture.frames[4].payload);
    Object.assign(bet, { tB: { player4: amount }, cHB: amount, mR: amount * 2 });
    patch(bet); bets.player4 = amount;
    patch(fixture.frames[5].payload); actor = "player1"; call = amount; dom();
  }
  function heroCall() {
    patch({ tB: { player1: call }, sNA: "NSAA", cRPI: ["player4", "player1"], pITT: null, sNAA: 1 });
    bets.player1 = call; actor = null; checked = false; dom(); refresh();
  }
  const proofs = () => { const read = readLiveTable(); return buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), runtime.snapshot(), null, "combined"); };
  const comparison = () => { const p = proofs(); return p.flopCallFold ?? p.turnCallFold ?? p.riverCallFold; };
  const overlay = () => document.getElementById("poker-ai-reader-overlay")!.textContent!;
  return { runtime, document, patch, decision, heroCall, dom, proofs, comparison, overlay, poll, refresh, fetch,
    at: (at: number) => { now = at; }, deadline: () => { for (const fn of [...deadlines.values()]) fn(); },
    nextHand() {
      patch({ hI: "combined-next", gN: 407, gT: [1, 0], oTC: { "1": [] }, iHPI: base.iHPI, pC: base.pC,
        tB: {}, pGS: base.pGS, cPI: "player1", pITT: "player1", pot: 0 });
      board = []; bets = {}; pot = 0; call = 0; checked = false; dom(); refresh();
    },
  };
}

describe("combined postflop pipeline", () => {
  it("illustrates the reported HJ 22 versus BTN CALL4 only with a supported synthetic source sequence", async () => {
    const t = await table(true); t.decision("flop", 4);
    const read = readLiveTable(), assessment = assessLiveState(read.raw, read.context);
    expect(assessment.positions.get(1)).toBe("HJ");
    expect(assessment.positions.get(3)).toBe("BTN");
    expect(assessment.activeOpponents).toBe(1);
    expect(assessment.bigBlind).toBe(2); expect(assessment.smallBlind).toBe(1);
    const w = t.runtime.snapshot().sourceStatus.riverObservation!;
    expect(w).toMatchObject({ street: "flop", heroCards: ["2s", "2c"], board: ["Jh", "8d", "8c"],
      heroChecked: true, payableCall: 4, collectedPot: 12, grossPotBeforeCall: 16 });
    expect(w.expiresAt).toBe(w.receivedAt + 10_000);
    const proofs = t.proofs(), calculation = proofs.flopCallFold!.illustration!;
    expect(proofs.activation.allowed).toBe(false);
    expect(calculation).toMatchObject({ status: "conditional", chosenAction: null, llmMayChoose: false,
      requiredEquity: 0.2, foldEV: 0 });
    t.poll();
    expect(t.overlay()).toContain("Estimated flop equity");
    expect(t.overlay()).toContain("CALL EV");
    expect(t.overlay()).toContain("ILLUSTRATIVE ONLY");
    // The status remains WAITING even when the separate numerical panel exists.
    expect(t.overlay()).toContain("WAITING FOR PROOF");
    const dom = readLiveTable().raw;
    t.runtime.gap("Synthetic missing source; same visible cards and CALL.");
    t.poll();
    expect(readLiveTable().raw).toEqual(dom);
    expect(t.overlay()).toContain("Street: flop");
    expect(t.overlay()).toContain("No validated flop source activation");
    expect(t.overlay()).not.toContain("CALL EV");
    expect(t.fetch).not.toHaveBeenCalled();
  }, 30000);

  it("reads and renders one continuous hand through paid flop, turn, river and the next hand", async () => {
    const t = await table(); t.poll(); expect(t.overlay()).toContain("Street: preflop");
    let sequence = 0;
    for (const [street, count, pot, call, stack] of [
      ["flop", 3, 12, 4, 248], ["turn", 4, 20, 8, 244], ["river", 5, 36, 12, 236],
    ] as const) {
      t.decision(street, call);
      const snapshot = t.runtime.snapshot(), w = snapshot.sourceStatus.riverObservation;
      expect(w, JSON.stringify(snapshot.sourceStatus.riverObservationDiagnostic)).toMatchObject({ street,
        collectedPot: pot, streetSubtotal: call, grossPotBeforeCall: pot + call, payableCall: call });
      expect(w!.board).toHaveLength(count); expect(w!.sequence).toBeGreaterThan(sequence); sequence = w!.sequence;
      expect(w!.players.filter(p => !p.folded)).toHaveLength(2);
      expect(w!.players.find(p => p.playerId === "player1")).toMatchObject({ contribution: 0, remainingStack: stack });
      expect(w!.players.find(p => p.playerId === "player4")).toMatchObject({ contribution: call, remainingStack: stack - 1 - call });
      const proofs = t.proofs(), r = t.comparison()!, calculation = r.illustration!;
      expect(proofs.activation.allowed).toBe(false); expect(r.liveAuthorized).toBe(false);
      expect(calculation).not.toBeNull(); expect(calculation.llmMayChoose).toBe(false);
      expect(calculation.requiredEquity).toBeCloseTo(call / (pot + 2 * call));
      expect(calculation.foldEV).toBe(0);
      for (const a of calculation.assumptions) {
        expect(a.equity).toBeGreaterThanOrEqual(0); expect(a.equity).toBeLessThanOrEqual(1);
        expect(a.callEV).toBeCloseTo(a.equity * (pot + 2 * call) - call);
      }
      for (const scope of ["pot", "accounting", "equity", "rangeInput", "legalActions"])
        expect(proofs.evidence.proofs.find(p => p.scope === scope)!.status).not.toBe("proven");
      t.poll();
      for (const label of [`Street: ${street}`, "ILLUSTRATIVE ONLY", "Current hand:", "Required equity:", "CALL EV", "FOLD EV 0", "Strong value / 10% bluffs", "Thin value / 30% bluffs", "unproven"])
        expect(t.overlay()).toContain(label);
      expect(t.overlay()).toContain("Current hand: High Card.");
      expect(t.overlay()).toContain(`Collected ${pot} + current bet ${call} = ${pot + call} chips before CALL; payable CALL ${call}. The bet is included once.`);
      expect(t.overlay()).toContain(`Required equity: ${(100 * call / (pot + 2 * call)).toFixed(2)}%`);
      for (const a of calculation.assumptions)
        expect(t.overlay()).toContain(`CALL EV ${(a.equity * (pot + 2 * call) - call).toFixed(3)}`);
      if (street !== "river") {
        expect(calculation).toMatchObject({ status: "conditional", chosenAction: null });
        expect(t.overlay()).toContain(`Draws: ${street === "turn" ? "flush draw (s)" : "no direct flush draw"}; no direct straight draw.`);
        expect(t.overlay()).toContain(street === "flop" ? "Future turn/river betting and equity realization are not modeled" : "Future river betting is unmodeled");
      } else expect(t.overlay()).not.toContain("Draws:");
      expect(t.overlay()).not.toContain("RECOMMENDATION AVAILABLE");
      t.heroCall(); expect(t.overlay()).not.toContain("Required equity:"); t.poll();
      expect(t.comparison()?.illustration).toBeNull();
    }
    t.nextHand(); t.poll(); expect(t.overlay()).toContain("Street: preflop");
    expect(t.overlay()).not.toContain("CALL EV"); expect(t.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    expect(t.fetch).not.toHaveBeenCalled();
  }, 30000);

  it.each(["flop", "turn", "river"] as const)("notices a CALL-only readiness recovery and contradiction on %s", async street => {
    const t = await table(); t.decision("flop", 4);
    if (street !== "flop") { t.heroCall(); t.decision("turn", 8); }
    if (street === "river") { t.heroCall(); t.decision("river", 12); }
    const button = t.document.querySelector("button")!;
    button.setAttribute("disabled", ""); t.poll(); expect(t.overlay()).not.toContain("Required equity:");
    button.removeAttribute("disabled"); t.poll(); expect(t.overlay()).toContain("Required equity:");
    button.textContent = "Call 99"; t.refresh(); t.poll();
    expect(t.overlay()).not.toContain("Required equity:"); expect(t.overlay()).toContain("UNSAFE");
    expect(t.fetch).not.toHaveBeenCalled();
  }, 30000);

  it("uses source-established zero for an opponent-first turn without inventing a hero check", async () => {
    const t = await table(); t.decision("flop", 4); t.heroCall(); t.decision("turn", 8, { opponentFirst: true });
    expect(readLiveTable().raw.seats[0]!.betValueText).toBeNull();
    expect(t.runtime.snapshot().sourceStatus.riverObservation).toMatchObject({ street: "turn", heroChecked: false });
    expect(t.comparison()!.illustration?.requiredEquity).toBeCloseTo(8 / 36);
    t.poll(); expect(t.overlay()).toContain("continuous turn source window");
  }, 30000);

  describe.each(["turn", "river"] as const)("unsupported paid %s transport", street => {
  it.each(["pot missing", "pot stale", "stack stale", "opponent stack stale", "uncleared wager", "wrong board", "checkdown shape", "unknown field", "extra known field"])("withholds %s", async fault => {
    const t = await table(); t.decision("flop", 4); t.heroCall();
    if (street === "river") { t.decision("turn", 8); t.heroCall(); }
    t.decision(street, street === "turn" ? 8 : 12, { alterDeal(p) {
      if (fault === "pot missing") delete p.pot;
      if (fault === "pot stale") p.pot = 12;
      if (fault === "stack stale") p.players.player1.stack = 248;
      if (fault === "opponent stack stale") p.players.player4.stack = 247;
      if (fault === "uncleared wager") delete p.tB.player4;
      if (fault === "wrong board") p.oTC["1"].pop();
      if (fault === "unknown field") p.rake = 1;
      // A known field does not make a new wire shape supported.
      if (fault === "extra known field") p.directToNexTurn = false;
      if (fault === "checkdown shape") {
        for (const key of ["mR", "cHB", "pot", "bigBlindCheck"]) delete p[key];
        p.players = {};
      }
    } });
    expect(t.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    t.poll(); expect(t.overlay()).not.toContain("CALL EV"); expect(t.overlay()).toContain("withheld");
    expect(t.proofs().activation.allowed).toBe(false);
    expect(t.fetch).not.toHaveBeenCalled();
  });
  });

  describe.each(["flop", "turn", "river"] as const)("%s invalidation", street => {
  it.each(["hero acts", "opponent acts", "player disconnects", "connection drops", "CALL disabled", "source gap", "unknown source", "new hand", "expiry", "conflicting DOM", "multiway"])("clears the active illustration on %s", async change => {
    const t = await table(); t.decision("flop", 4);
    if (street !== "flop") { t.heroCall(); t.decision("turn", 8); }
    if (street === "river") { t.heroCall(); t.decision("river", 12); }
    t.poll(); expect(t.overlay()).toContain("Required equity:");
    if (change === "hero acts") t.heroCall();
    if (change === "opponent acts") t.patch({ tB: { player4: 8 } });
    if (change === "player disconnects") t.patch({ players: { player4: { disconnectedSince: 100 } } });
    if (change === "connection drops") t.runtime.stop("disconnect");
    if (change === "CALL disabled") t.document.querySelector("button")!.setAttribute("disabled", "");
    if (change === "source gap") t.patch({}, p => { p.pre--; });
    if (change === "unknown source") t.patch({ rake: 1 });
    if (change === "new hand") t.nextHand();
    if (change === "expiry") { t.at(t.runtime.snapshot().sourceStatus.riverObservation!.expiresAt); t.deadline(); }
    if (change === "conflicting DOM") t.document.querySelector(".table-cards .value")!.textContent = "K";
    if (change === "multiway") t.document.querySelector(".table-player-2")!.classList.remove("fold");
    t.refresh(); expect(t.overlay()).not.toContain("Required equity:"); t.poll(); expect(t.overlay()).not.toContain("CALL EV");
    expect(t.fetch).not.toHaveBeenCalled();
  }, 30000);
  });
});
