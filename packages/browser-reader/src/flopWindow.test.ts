import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFirstUtgSource, projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";
import { parseHTML } from "linkedom";
import { liveDecisionFingerprint } from "../../../apps/pokernow-extension/src/requestIdentity.js";
import { liveProofRevision } from "../../../apps/pokernow-extension/src/decisionProofs.js";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../../../apps/pokernow-extension/src/tableRead.js", () => ({ readLiveTable: mocks.read }));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({ createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }) }));

const frames = (): any[] => JSON.parse(readFileSync(new URL("./fixtures/pokernow-flop-239.json", import.meta.url), "utf8")).frames;
function replay(fs = frames(), changeProjection?: (p: any, f: any) => void) {
  let now = 0, hero: string | null = null;
  const source = createFirstUtgSource("TABLE_TEST", () => now);
  const accept = (f: any) => {
    now = f.localReceivedAt;
    const p = projectFirstUtgSource("42" + JSON.stringify([f.event, f.payload]), hero);
    changeProjection?.(p, f); hero = p?.heroId ?? hero;
    source.accept(p, f.localReceiveSequence, f.connectionGeneration, now);
  };
  for (const f of fs) accept(f);
  return { source, accept, at: (t: number) => { now = t; } };
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("hand239 recorded flop observations through the sole source authority", () => {
  it("retains registration, reconnecting player removal marker, fresh boundary and original positions", () => {
    const f = replay(frames().slice(0, 4)), p = f.source.proof()!;
    expect(p).toMatchObject({ witness: { heroId: "PLAYER_1", handId: "HAND_239", handNumber: 239,
      heroCards: ["3s", "Js"] }, continuity: { baselineSequence: 1, throughSequence: 4, generation: 1 } });
    expect(p.witness.players.map(p => [p.seat, p.position, p.sourceStack])).toEqual([
      [5, "BTN", 253], [9, "SB", 244], [10, "BB", 260], [1, "UTG", 261], [2, "HJ", 240], [3, "CO", 244],
    ]);
    expect(f.source.flopProof()).toBeNull();
  });
  it("certifies frame16's board, explicit reset and SB activation while preserving private cards", () => {
    const f = replay(frames().slice(0, 16)), p = f.source.flopProof()!;
    expect(p).toMatchObject({ scope: "flop_transition", historyComplete: false, liveRecommendationsAllowed: false,
      continuity: { baselineSequence: 1, throughSequence: 16, generation: 1, cursor: 1792829782249 },
      anchor: { sequence: 4 }, activation: { sequence: 16, playerId: "PLAYER_9", receivedAt: 1792829779949 },
      transition: { sequence: 16, from: "preflop", to: "flop", board: ["8d", "Jh", "Ts"],
        clearedContributions: { PLAYER_9: 2, PLAYER_10: 2, PLAYER_1: 2, PLAYER_2: 2, PLAYER_3: 2 },
        observedStacks: { PLAYER_1: 259, PLAYER_2: 238, PLAYER_3: 242, PLAYER_5: 253, PLAYER_9: 242, PLAYER_10: 258 } },
      expiresAt: 1792829789949, observations: [], facts: { amountToCallChips: null, contestablePotChips: null, legalActions: null } });
    expect(Object.values(p.contributions)).toEqual([0, 0, 0, 0, 0, 0]);
    const state = f.source.diagnostic().carriedState!.projection.frame;
    expect(state.pC.PLAYER_1.cards).toEqual([{ value: "3s", showing: false }, { value: "Js", showing: false }]);
    for (const [id, hand] of Object.entries(state.pC) as [string, any][])
      if (id !== "PLAYER_1") expect(hand.cards.every((c: any) => c.value === null)).toBe(true);
    expect(state.tB).toEqual({});
    expect(f.source.proof()).toBeNull();
  });
  it("validates frames17-20 and issues only the explicit hero activation with its own original deadline", () => {
    for (const count of [17, 18, 19]) expect(replay(frames().slice(0, count)).source.flopProof()).toBeNull();
    const f = replay(), p = f.source.flopProof()!;
    expect(p).toMatchObject({ scope: "flop_hero_activation", activation: { sequence: 20, playerId: "PLAYER_1",
      receivedAt: 1792829805759, cursor: 1792829808066 }, expiresAt: 1792829815759,
      continuity: { throughSequence: 20 }, contributions: { PLAYER_1: 0, PLAYER_2: 0, PLAYER_3: 0, PLAYER_5: 0, PLAYER_9: 2, PLAYER_10: 2 },
      observations: [{ sequence: 17, playerId: "PLAYER_9", priorContribution: 0, contribution: 2 },
        { sequence: 19, playerId: "PLAYER_10", priorContribution: 0, contribution: 2 }] });
    expect(p.activation.receivedAt).toBeGreaterThan(p.transition.receivedAt + 10000);
    expect(p.historyComplete).toBe(false); expect(p.liveRecommendationsAllowed).toBe(false);
    expect(Object.values(p.facts)).toEqual([null, null, null]);
    p.transition.board.reverse(); p.witness.players[0]!.seat = 99;
    expect(f.source.flopProof()!.transition.board).toEqual(["8d", "Jh", "Ts"]);
    expect(f.source.flopProof()!.witness.players[0]!.seat).toBe(5);
    f.at(1792829805758); expect(f.source.flopProof()).toBeNull();
    f.at(1792829815758); expect(f.source.flopProof()).not.toBeNull();
    f.at(1792829815759); expect(f.source.flopProof()).toBeNull();
    f.at(1792829815760); expect(f.source.flopProof()).toBeNull();
  });
  it.each(Array.from({ length: 20 }, (_, i) => i))("cannot repair missing recorded frame %i", index => {
    const fs = frames(); fs.splice(index, 1);
    expect(replay(fs).source.flopProof()).toBeNull();
  });
  it.each(Array.from({ length: 16 }, (_, i) => i + 4))("unknown raw mutation at index %i cannot disappear into the projection", index => {
    const fs = frames(); fs[index].payload.unknownMutation = true;
    expect(replay(fs).source.flopProof()).toBeNull();
  });
  const mutations: Record<string, (fs: any[]) => void> = {
    predecessor: fs => fs[15].payload.pre++, sequence: fs => fs[15].localReceiveSequence++,
    generation: fs => fs[15].connectionGeneration++, replay: fs => fs.splice(18, 0, structuredClone(fs[17])),
    "receipt-regression": fs => fs[19].localReceivedAt = fs[18].localReceivedAt - 1,
    "source-regression": fs => fs[19].payload.now = fs[19].payload.pre,
    "wrong-table": fs => fs[15].payload.id = "OTHER",
    "wrong-hand": fs => fs[15].payload.hI = "OTHER",
    "wrong-number": fs => fs[15].payload.gN = 240,
    "wrong-hero": fs => fs[0].payload.currentPlayer.id = "PLAYER_2",
    "roster-change": fs => fs[17].payload.iHPI = ["PLAYER_1"],
    "dealer-change": fs => fs[15].payload.dealerSeat = 3,
    "seat-change": fs => fs[15].payload.seats = [[1, "PLAYER_1"]],
    "wrong-profile": fs => fs[0].payload.gameState.ante = 1,
    "missing-boundary-profile": fs => fs[3].payload.fV = "0.1.73",
    "boundary-highest-contradiction": fs => fs[3].payload.cHB = 3,
    "boundary-round-contradiction": fs => fs[3].payload.mR = 5,
    "disconnected-player": fs => delete fs[2].payload.players.PLAYER_2.disconnectedSince,
    "all-in": fs => fs[16].payload.pGS = { PLAYER_9: "allIn" },
    "no-street": fs => delete fs[15].payload.gT,
    "turn-street": fs => fs[15].payload.gT = [1, 2],
    "no-board": fs => delete fs[15].payload.oTC,
    "short-board": fs => fs[15].payload.oTC["1"].pop(),
    "duplicate-board": fs => fs[15].payload.oTC["1"][1] = "8d",
    "hero-collision": fs => fs[15].payload.oTC["1"][1] = "Js",
    "multiple-boards": fs => fs[15].payload.oTC["2"] = ["Ah", "Kh", "Qh"],
    "reordered-board-tail": fs => fs[17].payload.oTC = { "1": ["Jh", "8d", "Ts"] },
    "missing-reset": fs => delete fs[15].payload.tB.PLAYER_1,
    "zero-instead-of-deletion": fs => fs[15].payload.tB.PLAYER_1 = 0,
    "extra-reset": fs => fs[15].payload.tB.PLAYER_5 = "<D>",
    "bad-collected-stack": fs => fs[15].payload.players.PLAYER_1.stack++,
    "unknown-deal-field": fs => fs[15].payload.unknownMutation = true,
    "card-mutation": fs => fs[15].payload.pC.PLAYER_1.cards = [{ value: "Ah", showing: false }, { value: "Kd", showing: false }],
    "missing-card-description": fs => delete fs[15].payload.pC.PLAYER_1.name2,
    "wrong-first-flop-actor": fs => fs[15].payload.cPI = fs[15].payload.pITT = "PLAYER_10",
    "conflicting-first-flop-actor": fs => fs[15].payload.pITT = "PLAYER_10",
    "preflop-total": fs => fs[4].payload.tB.PLAYER_1 = 3,
    "preflop-order": fs => fs[6].payload.tB = { PLAYER_3: 2 },
    "missing-bb-check": fs => delete fs[14].payload.bigBlindCheck,
    "wrong-fold": fs => fs[10].payload.pGS = { PLAYER_3: "fold" },
    "flop-total": fs => fs[16].payload.tB.PLAYER_9 = 3,
    "flop-second-total": fs => fs[18].payload.tB.PLAYER_10 = 3,
    "flop-extra-wager": fs => fs[18].payload.tB.PLAYER_2 = 2,
    "flop-wrong-contributor": fs => fs[18].payload.tB = { PLAYER_2: 2 },
    "flop-wrong-activation": fs => fs[17].payload.cPI = fs[17].payload.pITT = "PLAYER_2",
    "coalesced-activation": fs => fs[18].payload.cPI = "PLAYER_1",
    "unknown-activation": fs => fs[19].payload.unknownMutation = true,
    "wrong-hero-activation": fs => fs[19].payload.cPI = fs[19].payload.pITT = "PLAYER_2",
    "conflicting-hero-activation": fs => fs[19].payload.pITT = "PLAYER_2",
    "no-hero-activation": fs => delete fs[19].payload.pITT,
    "refresh": fs => fs[19].event = "rup",
  };
  it.each(Object.keys(mutations))("rejects synthetic %s", variant => {
    const fs = frames(); mutations[variant]!(fs);
    expect(replay(fs).source.flopProof()).toBeNull();
  });
  it.each(["missing-raw", "projected-board", "projected-cards", "projected-contribution"])("rejects %s projection contradiction", variant => {
    const f = replay(frames(), (p, frame) => {
      if (frame.localReceiveSequence !== 16 || !p) return;
      if (variant === "missing-raw") delete p.flopPatch;
      if (variant === "projected-board") p.frame.oTC = { "1": [...p.frame.oTC["1"]].reverse() };
      if (variant === "projected-cards") p.frame.pC = { PLAYER_1: { cards: [{ value: "Ah", showing: false }, { value: "Kd", showing: false }] } };
      if (variant === "projected-contribution") p.frame.tB = {};
    });
    expect(f.source.flopProof()).toBeNull();
  });
  it.each(["empty", "actor", "hand", "reconnect", "disconnect", "missing-projection"])("invalidates the issued proof on %s without renewal", variant => {
    const f = replay(), last = frames()[19]; expect(f.source.flopProof()).not.toBeNull();
    if (variant === "disconnect") f.source.reset();
    else if (variant === "missing-projection") f.source.accept(null, 21, 1, last.localReceivedAt);
    else f.accept({ ...last, localReceiveSequence: 21, localReceivedAt: last.localReceivedAt + 1,
      connectionGeneration: variant === "reconnect" ? 2 : 1,
      payload: { now: last.payload.now + 1, pre: last.payload.now,
        ...(variant === "actor" ? { cPI: "PLAYER_2", pITT: "PLAYER_2" } : {}),
        ...(variant === "hand" ? { hI: "OTHER" } : {}) } });
    expect(f.source.flopProof()).toBeNull();
  });
  it("reset also destroys historical pending observations", () => {
    const f = replay(frames().slice(0, 19)); f.source.reset(); f.accept(frames()[19]);
    expect(f.source.flopProof()).toBeNull();
  });
});

describe("recorded flop MAIN -> source runtime -> decision/display boundary", () => {
  it.each([[239, false], [243, false], [243, true], [244, false], [246, false], [248, false]] as const)("hand%i withholds advice, legality and history (unknown return: %s)", async (hand, unknownReturn) => {
    vi.resetModules();
    const fs: any[] = hand === 239 ? frames() : JSON.parse(readFileSync(new URL(`./fixtures/pokernow-flop-${hand === 248 ? 248 : 243}.json`, import.meta.url), "utf8")).frames;
    const synthetic = hand === 244 || hand === 246;
    // Synthetic ordinary profile, explicitly outside both certified hands.
    if (synthetic) for (const entry of fs) {
      const frame = entry.payload.gameState ?? entry.payload;
      if (frame.gN) frame.gN += hand - 243;
      if (frame.hI) frame.hI = frame.hI === "HAND_243" ? `HAND_${hand}` : `HAND_${hand - 1}`;
      if (frame.pC?.PLAYER_1?.cards) frame.pC.PLAYER_1.cards = [{ value: "As", showing: false }, { value: "Kd", showing: false }];
      if (frame.oTC?.["1"]?.length === 3) frame.oTC["1"] = ["Ah", "7c", "2s"];
      if (frame.players) for (const player of Object.values(frame.players) as any[]) if (typeof player.stack === "number") player.stack += 50;
    }
    if (unknownReturn) fs[20].payload.uncalledReturn = { PLAYER_1: 2 }; // Labeled synthetic rejection case.
    if (hand === 246) {
      const previous = fs[18];
      const extra = Array.from({ length: 9 }, (_, i) => ({ event: "gC", connectionGeneration: 1,
        localReceivedAt: previous.localReceivedAt + i + 1,
        payload: { now: previous.payload.now + i + 1, pre: previous.payload.now + i } }));
      fs[19].payload.pre = extra.at(-1)!.payload.now;
      fs.splice(19, 0, ...extra);
      fs.forEach((f, i) => { f.localReceiveSequence = i + 1; });
    }
    const prefixCount = hand === 248 ? 30 : hand === 246 ? 29 : 20;
    const last = fs[prefixCount - 1], expiry = last.localReceivedAt + 10000;
    // This read/HTML is explicit test scaffolding, NOT a recovered screenshot
    // timestamp or DOM capture. Raw source envelopes/times remain unchanged.
    const read = JSON.parse(readFileSync(new URL("./fixtures/utg-reader-cross-check.json", import.meta.url), "utf8")).read;
    const stacks: Record<number, number> = hand === 239 ? { 1: 259, 2: 238, 3: 242, 5: 253, 9: 240, 10: 256 }
      : { 1: 254, 2: 233, 3: 238, 5: 251, 9: 244, 10: 264 };
    for (const seat of read.raw.seats) if (seat.isOccupied) {
      seat.isYou = seat.seatNumber === 1;
      seat.stackText = seat.stackContainerText = String(stacks[seat.seatNumber] + (synthetic ? 50 : 0));
      seat.betValueText = (hand !== 239 ? [5, 9, 10] : [9, 10]).includes(seat.seatNumber) ? "2" : "0";
      seat.statusClasses = ["table-player", `table-player-${seat.seatNumber}`,
        ...(seat.isYou ? ["you-player", "decision-current"] : []), ...(hand === 239 && seat.seatNumber === 5 ? ["fold"] : [])];
      if (seat.isYou) seat.holeCardClassLists = (hand === 239 ? ["3s", "Js"] : synthetic ? ["As", "Kd"] : ["9d", "Qc"])
        .map(c => ["card-container", `card-${c[1]}`, `card-s-${c[0]}`, "flipped"]);
    }
    read.raw.dealerSeatNumber = hand === 239 ? 5 : 3;
    read.context.dealerSeatNumber = read.raw.dealerSeatNumber;
    read.evidence.dealerClasses = ["dealer-button-ctn", `dealer-position-${read.raw.dealerSeatNumber}`];
    read.raw.boardCards = (hand === 239 ? ["8d", "Jh", "Ts"] : synthetic ? ["Ah", "7c", "2s"] : ["6h", "Qh", "3s"]).map(c => ({ valueText: c[0], suitText: c[1] }));
    read.raw.potMainValueText = hand === 239 ? "10" : "12"; read.raw.potTotalValueText = hand === 239 ? "14" : "18";
    // Real saved table read for hand248. The installed bridge/clock/control
    // invocation below is a replay, not a new real checkpoint or recovered epoch.
    if (hand === 248) Object.assign(read, JSON.parse(readFileSync(new URL("./fixtures/pokernow-flop-248-checkpoint.json", import.meta.url), "utf8"))
      .checkpoint.observation.unverifiedObservations.ui);
    const { document } = parseHTML('<html><body><button type="button">Call 2</button></body></html>');
    const click = vi.spyOn(document.querySelector("button")!, "click");
    const location = new URL("https://www.pokernow.com/games/TABLE_TEST");
    const listeners: Array<(e: any) => void> = [];
    let now = fs[0].localReceivedAt, poll = () => {}, refresh = () => {};
    class Socket extends EventTarget {
      send = vi.fn();
      constructor(public url: string) { super(); }
      incoming(f: any) { this.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([f.event, f.payload]) })); }
    }
    const captureSettings = new Map([["poker-ai:raise-evidence-capture", "1"], ["poker-ai:raw-socket-capture", "1"]]);
    const win = { location, WebSocket: Socket, performance, setTimeout: () => 1, clearTimeout() {},
      addEventListener: (type: string, cb: (e: any) => void) => { if (type === "message") listeners.push(cb); },
      removeEventListener: (type: string, cb: (e: any) => void) => { if (type === "message") {
        const index = listeners.indexOf(cb); if (index >= 0) listeners.splice(index, 1);
      } },
      postMessage: (data: unknown) => { for (const cb of listeners) cb({ source: win, origin: location.origin, data }); },
      sessionStorage: { getItem: (key: string) => captureSettings.get(key) ?? null, removeItem: (key: string) => captureSettings.delete(key) } };
    vi.stubGlobal("window", win); vi.stubGlobal("document", document); vi.stubGlobal("location", location);
    if (hand === 246) {
      vi.stubGlobal("HTMLInputElement", document.defaultView!.HTMLInputElement);
      // Synthetic reproduction of the reported capture, not recovered hand246 UI.
      // Use today's real reader: the old cross-check fixture omits seat/stack evidence.
      // Long multibyte names exercise UTF-8 byte limits without dropping UI text.
      document.body.insertAdjacentHTML("beforeend", `<div class="table-cards">${read.raw.boardCards.map((c: any) =>
        `<div class="card-container"><span class="value">${c.valueText}</span><span class="suit">${{ h: "♥", c: "♣", s: "♠" }[c.suitText as "h"]}</span></div>`).join("")}</div>
        <div class="dealer-position-3"></div><div class="table-pot-size"><span class="main-value"><span class="normal-value">12</span></span><span class="add-on-container"><span class="normal-value">18</span></span></div>
        <div class="blind-value"><span class="chips-value"><span class="normal-value">1</span></span></div><div class="blind-value"><span class="chips-value"><span class="normal-value">2</span></span></div>
        ${read.raw.seats.filter((s: any) => s.isOccupied).map((s: any) => `<div class="${s.statusClasses.join(" ")}">
          <span class="table-player-name"><a>PLAYER_${s.seatNumber}_${"観測".repeat(36)}</a></span>
          <span class="table-player-stack"><span class="normal-value">${s.stackText}</span></span>
          <span class="table-player-bet-value">${s.betValueText}</span>
          <span class="table-player-cards">${s.holeCardClassLists.map((classes: string[]) => `<span class="${classes.join(" ")}"></span>`).join("")}</span></div>`).join("")}`);
      vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible" }));
      document.querySelector("button")!.getBoundingClientRect = () => ({ width: 50, height: 20 }) as DOMRect;
      const actual = await vi.importActual<typeof import("../../../apps/pokernow-extension/src/tableRead.js")>("../../../apps/pokernow-extension/src/tableRead.js");
      Object.assign(read, actual.readLiveTable());
      expect(read.context.readErrors).toEqual([]);
    }
    vi.stubGlobal("localStorage", { getItem: () => "1", removeItem() {} });
    vi.spyOn(Date, "now").mockImplementation(() => now);
    vi.stubGlobal("setInterval", (cb: () => void, ms: number) => { if (ms === 250) refresh = cb; else poll = cb; return 1; });
    const logs: any[][] = [], requests: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args) => { logs.push(args); });
    vi.spyOn(console, "warn").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn((url: string) => { requests.push(url); return Promise.resolve(new Response("[]")); }));
    const { readCallControl } = await import("../../../apps/pokernow-extension/src/callControlRead.js");
    mocks.read.mockImplementation(() => { read.callControl = readCallControl(document, () => true); return read; });
    await import("../../../apps/pokernow-extension/src/eventSource.js");
    await import("../../../apps/pokernow-extension/src/contentScript.js");
    const socket = new win.WebSocket("wss://www.pokernow.com/socket.io/?gameID=TABLE_TEST");
    for (const f of fs.slice(0, prefixCount)) { now = f.localReceivedAt; socket.incoming(f); }
    if (hand === 246) now += 3703;
    if (hand === 248) now += 1625;
    const diagnostic = () => JSON.parse(logs.filter(args => String(args[0]).includes("Copyable snapshot JSON")).at(-1)![1]);
    const blocked = () => {
      poll(); const d = diagnostic(), p = d.decision.scopedProofs;
      expect(p.activation.allowed).toBe(false);
      // Existing DOM arithmetic may report a numeric call gap. It cannot
      // supply a CALL legality certificate or consume the source observation.
      for (const scope of ["actionWindow", "legalActions", "accounting", "pot"])
        expect(p.evidence.proofs.find((proof: any) => proof.scope === scope)?.status, scope).not.toBe("proven");
      expect(p.responseWindow).toBeNull(); expect(p.callLegality).toBeNull();
      if (hand === 243 && d.handTimeline.sourceStatus.flopObservationProof?.scope === "flop_hero_activation") {
        expect(p.postflopCall).toMatchObject({ payableIfCallAuthorizedChips: { status: "proven", value: 2 },
          ui: { status: "observed_matching" }, permission: null, liveRecommendationsAllowed: false,
          binding: { expiresAt: expiry } });
      } else expect(p.postflopCall).toBeNull();
      expect(d.handTimeline.current.historyComplete).toBe(false);
      expect(d.handTimeline.current.events).toEqual([]);
      expect(document.querySelector('#poker-ai-reader-overlay [style*="font-size:16px"]')).toBeNull();
      expect(requests.filter(url => url.endsWith("/recommendation"))).toEqual([]);
      expect(socket.send).not.toHaveBeenCalled();
      return d.handTimeline.sourceStatus.flopObservationProof;
    };
    if (synthetic) expect(blocked()).toBeNull();
    else expect(blocked()).toMatchObject({ scope: "flop_hero_activation", activation: { sequence: prefixCount }, expiresAt: expiry });
    if (hand === 248) expect(blocked()?.accounting).toMatchObject({ scope: "hand248_contribution_prefix",
      preflop: { streetContributionSumChips: 12 }, flop: { streetContributionSumChips: 8 }, cumulativeInvestmentSumChips: 20 });
    if (hand === 243) expect(blocked()?.accounting).toMatchObject({
      preflop: { streetContributionSumChips: 12 }, flop: { streetContributionSumChips: 6 },
      cumulativeInvestmentSumChips: 18, sourcePot: { valueChips: 12 }, contestablePotChips: null, potLedger: null,
    });
    if (hand === 243) {
      const capture = await (win as any).pokerAIRaiseCapture.checkpoint("postflop_call");
      expect(capture, JSON.stringify(capture)).toMatchObject({ accepted: true, readinessMatched: true });
      expect(blocked()?.expiresAt).toBe(expiry);
    }
    const captureTimeline = diagnostic().handTimeline;
    const observed = await (win as any).pokerAIRaiseCapture.checkpoint("postflop_observation");
    expect(observed, JSON.stringify(observed)).toMatchObject({ accepted: true, retained: true, observationPaired: true });
    if (synthetic) {
      expect(observed.profile).toBe("unsupported_or_uncertified");
      expect(await (win as any).pokerAIRaiseCapture.checkpoint("postflop_call")).toMatchObject({ accepted: false, retained: true });
    }
    if (hand === 248) {
      expect(observed.profile).toBe("existing_narrow_source_certificate");
      expect(await (win as any).pokerAIRaiseCapture.checkpoint("postflop_call")).toMatchObject({ accepted: false, retained: true });
    }
    // Log refresh and polling cannot renew the source opportunity.
    await new Promise(resolve => setTimeout(resolve, 0));
    now = last.localReceivedAt + 9999; refresh();
    if (synthetic) expect(blocked()).toBeNull(); else expect(blocked()?.expiresAt).toBe(expiry);
    now++; refresh(); expect(blocked()).toBeNull();
    if (hand === 243) expect(await (win as any).pokerAIRaiseCapture.checkpoint("postflop_call")).toMatchObject({ accepted: false, retained: true });
    if (hand === 243) {
      for (const f of fs.slice(20)) {
        now = f.localReceivedAt; socket.incoming(f);
        expect(blocked()).toBeNull();
        if (unknownReturn) expect(diagnostic().handTimeline.sourceStatus.historicalFlopAcceptance).toBeNull();
        else expect(diagnostic().handTimeline.sourceStatus.historicalFlopAcceptance).toMatchObject({
          scope: "historical_flop_call2", originalHeroExpiresAt: expiry, acceptance: { action: "call", sequence: 21 },
          nextActivation: f.localReceiveSequence === 22 ? { sequence: 22, playerId: "PLAYER_2" } : null,
          accounting: { preflop: { streetContributionSumChips: 12 }, flop: { streetContributionSumChips: 8 },
            cumulativeInvestmentSumChips: 20, sourcePot: { valueChips: 12 }, displayedTotalPotChips: null,
            contestablePotChips: null, potLedger: null },
        });
      }
      now += 10000; refresh(); expect(blocked()).toBeNull();
      if (!unknownReturn) expect(diagnostic().handTimeline.sourceStatus.historicalFlopAcceptance.originalHeroExpiresAt).toBe(expiry);
    }
    if (hand === 248) {
      for (const f of fs.slice(30)) {
        now = f.localReceivedAt; socket.incoming(f); expect(blocked()).toBeNull();
        expect(diagnostic().handTimeline.sourceStatus.historicalFlopAcceptance).toMatchObject({
          originalHeroExpiresAt: expiry, acceptance: { sequence: 31, actor: { position: "CO" },
            evidence: { contract: "hand248_co_flop_call2_v1" } },
          nextActivation: f.localReceiveSequence === 32 ? { sequence: 32, playerId: "PLAYER_2" } : null,
          accounting: { cumulativeInvestmentSumChips: 22, contestablePotChips: null },
        });
      }
    }
    const tail = fs.at(-1);
    socket.incoming({ ...tail, payload: { now: tail.payload.now + 1, pre: tail.payload.now } });
    expect(blocked()).toBeNull();
    expect(diagnostic().handTimeline.sourceStatus.historicalFlopAcceptance).toBeNull();
    socket.dispatchEvent(new Event("close")); expect(blocked()).toBeNull();
    if (hand === 243) {
      const captured = JSON.parse((win as any).pokerAIRaiseCapture.exportJSON());
      expect(captured.checkpoints.filter((cp: any) => cp.label === "postflop_call").map((cp: any) => cp.readinessMatched)).toEqual([true, false]);
      expect(captured.checkpoints[0].postflop.binding).toMatchObject({ expiresAt: expiry, activationSequence: 20 });
      expect(captured.checkpoints[0].postflop.binding.decisionEpoch).not.toBe("diagnostic");
      expect(captured.checkpoints[0].postflop.read.callControl).toMatchObject({ enabled: true, amountChips: 2 });
      expect(captured.rawSocket.frames.slice(0, 20)).toEqual(fs.slice(0, 20));
      expect(socket.send).not.toHaveBeenCalled(); expect(click).not.toHaveBeenCalled(); expect(captureSettings.size).toBe(0);
    }
    if (hand !== 243) {
      const captured = JSON.parse((win as any).pokerAIRaiseCapture.exportJSON());
      const cp = captured.checkpoints[0];
      if (hand === 246) {
        const observation = cp.observation;
        const stateJson = liveDecisionFingerprint(String(location), read, liveProofRevision(captureTimeline), "flop", cp.capturedAt);
        const legacy = { ...observation, epochBefore: { decisionEpoch: observation.epochBefore.decisionEpoch, stateJson },
          epochAfter: { decisionEpoch: observation.epochAfter.decisionEpoch, stateJson } };
        const size = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");
        expect(size({ observation: legacy })).toBeGreaterThan(32 * 1024);
        expect(size({ observation })).toBeLessThanOrEqual(32 * 1024);
        expect(observation.epochBefore).toEqual({ decisionEpoch: observation.epochAfter.decisionEpoch,
          stateAvailable: true, matchesRead: true });
        expect(observation.epochAfter).toEqual(observation.epochBefore);
        expect(observation.epochBefore).not.toHaveProperty("stateJson");
        expect(observation.epochAfter).not.toHaveProperty("stateJson");
        expect(cp.capturedAt - last.localReceivedAt).toBe(3703);
        expect(cp.rawRecorderBefore).toMatchObject({ frameCount: 29, rejectedFrames: 0 });
        expect(observation.unverifiedObservations.ui).toEqual({ ...read, callControl: { ...read.callControl, observedAt: cp.capturedAt } });
      }
      expect(cp).toMatchObject({ observationPaired: true, permission: null, liveRecommendationsAllowed: false });
      expect(cp.observation.epochBefore.decisionEpoch).not.toBe("diagnostic");
      expect(cp.observation.unverifiedObservations.ui.callControl).toMatchObject({ enabled: true, amountChips: 2 });
      if (synthetic) expect(cp.observation.sourceVerifiedFacts).toBeNull();
      if (hand === 248) expect(cp.observation.sourceVerifiedFacts.proof).toMatchObject({
        activation: { sequence: 30 }, expiresAt: expiry, accountingScope: "hand248_contribution_prefix" });
      expect(captured.rawSocket.frames.slice(0, prefixCount)).toEqual(fs.slice(0, prefixCount));
      expect(socket.send).not.toHaveBeenCalled(); expect(click).not.toHaveBeenCalled(); expect(captureSettings.size).toBe(0);
    }
  });
});
