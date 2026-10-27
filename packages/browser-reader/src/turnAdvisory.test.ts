import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { projectRiverObservation } from "../../../apps/pokernow-extension/src/riverObservation.js";
import { projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { buildLiveDecisionProofs } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { assessLiveState } from "./liveState.js";
import type { LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe.each(["turn", "flop"] as const)("synthetic heads-up %s source to conditional overlay input", street => {
  const fixture = JSON.parse(readFileSync(new URL(`./fixtures/pokernow-${street}-synthetic.json`, import.meta.url), "utf8"));
  const boardIndex = street === "flop" ? 2 : 3;
  function replay(mutate: (frames: any[]) => void = () => {}) {
    const frames = structuredClone(fixture.frames); mutate(frames);
    let now = frames[0].localReceivedAt;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const runtime = createTimelineRuntime({ tableId: "river-table", sessionId: "test", now: () => now, fetchLog: vi.fn() });
    let identity: ReturnType<typeof identityFromSocketPacket> = null;
    for (const f of frames) {
      now = f.localReceivedAt;
      const wire = "42" + JSON.stringify([f.event, f.payload]);
      runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId: "river-table", sequence: f.localReceiveSequence,
        generation: f.connectionGeneration, observedAt: now, metadata: inspectSocketMetadata(wire),
        utgSource: projectFirstUtgSource(wire, identity?.heroPlayerId ?? null), riverSource: projectRiverObservation(wire, identity?.heroPlayerId ?? null) });
      identity = identityFromSocketPacket(wire, "river-table", identity);
      runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "river-table", sequence: f.localReceiveSequence, connected: true, identity });
    }
    // Synchronous synthetic read inside the source activation deadline.
    now += 100;
    const read = structuredClone(fixture.read) as LiveTableRead;
    read.callControl!.observedAt = now;
    return { runtime, read, at: (value: number) => { now = value; }, assess: () =>
      buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), runtime.snapshot(), null, "test")[street === "flop" ? "flopCallFold" : "turnCallFold"]! };
  }


  it("also prices an opponent-first bet without inventing a hero check", () => {
    const f = replay(frames => {
      frames[1].payload.cPI = "player4"; frames[1].payload.pITT = "player4";
      frames.splice(2, 2);
      frames[2].payload.pre = frames[1].payload.now;
      frames.forEach((frame, i) => { frame.localReceiveSequence = i + 1; });
    });
    if (street === "flop") f.read.raw.seats[0]!.betValueText = null;
    expect(f.runtime.snapshot().sourceStatus.riverObservation).toMatchObject({ street, payableCall: 12 });
    expect(f.assess().illustration?.requiredEquity).toBeCloseTo(1 / 3);
    if (street === "flop") {
      expect(f.runtime.snapshot().sourceStatus.riverObservation!.heroChecked).toBe(false);
      expect(assessLiveState(f.read.raw, f.read.context).amountToCall).toBeNull();
      // Source zero never excuses an unreadable opponent wager or mismatched CALL.
      f.read.raw.seats.find(s => s.seatNumber === 5)!.betValueText = null;
      expect(f.assess().illustration).toBeNull();
    }
  }, 20000);
  it("reuses the river adapter for the board, current actor, stacks and payable CALL", () => {
    const f = replay(), snapshot = f.runtime.snapshot();
    expect(snapshot.sourceStatus.riverObservation, JSON.stringify(snapshot.sourceStatus.riverObservationDiagnostic))
      .toMatchObject({ street, board: street === "flop" ? ["2h", "9s", "4h"] : ["2h", "9s", "4h", "Qs"], payableCall: 12, grossPotBeforeCall: 24, liveAuthorized: false });
    const scoped = buildLiveDecisionProofs(f.read, assessLiveState(f.read.raw, f.read.context), snapshot, null, "turn");
    expect(scoped.riverCallFold).toBeNull();
    expect(scoped.activation.allowed).toBe(false);
    const r = (street === "flop" ? scoped.flopCallFold : scoped.turnCallFold)!;
    expect(r).toMatchObject({ status: "abstained", liveAuthorized: false, unsafe: false });
    expect(r.illustration).toMatchObject({ status: "conditional", chosenAction: null, requiredEquity: 1 / 3, foldEV: 0 });
    expect(r.illustrationLines.join(" ")).toContain(street === "flop" ? "Future turn/river betting and equity realization are not modeled" : "Future river betting is unmodeled");
    expect(r.illustrationLines.join(" ")).toContain("ILLUSTRATIVE ONLY");
    for (const scope of ["pot", "accounting", "terminal", "legalActions", "equity", "rangeInput"])
      expect(scoped.evidence.proofs.find(p => p.scope === scope)!.status).not.toBe("proven");
  }, 20000);
  it.each(["pot", "total", "wager", "hero-wager", "stack", "call", "disabled", "board", "duplicate", "hero", "actor", "multiway", "all-in", "identity"])
    ("withholds missing or contradictory DOM evidence: %s", kind => {
      const f = replay();
      if (kind === "pot") f.read.raw.potMainValueText = null;
      if (kind === "total") f.read.raw.potTotalValueText = "99";
      if (kind === "wager") f.read.raw.seats.find(s => s.seatNumber === 5)!.betValueText = null;
      if (kind === "hero-wager") f.read.raw.seats[0]!.betValueText = null;
      if (kind === "stack") f.read.raw.seats[0]!.stackText = null;
      if (kind === "call") f.read.callControl!.amountChips = 13;
      if (kind === "disabled") f.read.callControl!.enabled = false;
      if (kind === "board") f.read.raw.boardCards[boardIndex]!.valueText = "J";
      if (kind === "duplicate") f.read.raw.boardCards[boardIndex] = { ...f.read.raw.boardCards[0]! };
      if (kind === "hero") f.read.raw.seats[0]!.holeCardClassLists = [];
      if (kind === "actor") f.read.raw.seats[0]!.statusClasses = [];
      if (kind === "multiway") f.read.raw.seats[1]!.statusClasses = [];
      if (kind === "all-in") f.read.raw.seats[0]!.stackText = "All In";
      if (kind === "identity") f.runtime.snapshot().sourceStatus.identity!.handId = "other";
      expect(f.assess()?.illustration ?? null).toBeNull();
      expect(f.assess()?.liveAuthorized ?? false).toBe(false);
    });
  it.each(["missing-pot", "missing-bet", "gap", "generation", "predecessor", "return", "rake", "invalid-card", "duplicate", "too-few-cards", "too-many-cards", "multiway", "hero-all-in", "short-call", "villain-all-in", "later"])
    ("withholds unsupported source: %s", kind => {
      const f = replay(frames => {
        const base = frames[0].payload.gameState;
        if (kind === "missing-pot") { delete base.pot; delete frames[1].payload.pot; }
        if (kind === "missing-bet") delete frames[4].payload.tB;
        if (kind === "gap") frames[4].localReceiveSequence++;
        if (kind === "generation") frames[5].connectionGeneration++;
        if (kind === "predecessor") frames[4].payload.pre++;
        if (kind === "return") frames[4].payload.uncalledReturn = 1;
        if (kind === "rake") frames[4].payload.rake = 1;
        if (kind === "invalid-card") frames[1].payload.oTC["1"][boardIndex] = "Xs";
        if (kind === "duplicate") frames[1].payload.oTC["1"][boardIndex] = "2h";
        if (kind === "too-few-cards") frames[1].payload.oTC["1"].pop();
        if (kind === "too-many-cards") frames[1].payload.oTC["1"].push("6c");
        if (kind === "multiway") base.pGS.player2 = "inGame";
        if (kind === "hero-all-in") base.players.player1.stack = 12;
        if (kind === "short-call") base.players.player1.stack = 11;
        if (kind === "villain-all-in") base.players.player4.stack = 12;
        if (street === "flop") for (const id of ["player1", "player4"]) frames[1].payload.players[id].stack = base.players[id].stack;
        if (kind === "later") frames.push({ ...structuredClone(frames[5]), localReceiveSequence: 7, localReceivedAt: 100601,
          payload: { pre: 1005, now: 1006, fV: "0.1.72", mEV: 0, sN: 1006, eventsData: [] } });
      });
      expect(f.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
      expect(f.assess().illustration).toBeNull();
    });
  it("never renews expiry from polling and clears on clock rollback, disconnect or returns", () => {
    const f = replay(), expiry = f.assess().binding!.expiresAt;
    f.at(expiry - 1); f.read.callControl!.observedAt = expiry - 1;
    expect(f.assess().binding!.expiresAt).toBe(expiry);
    f.at(expiry); expect(f.assess().illustration).toBeNull();
    const g = replay(); g.at(100499); expect(g.assess().illustration).toBeNull();
    const h = replay(); h.runtime.stop("disconnect"); expect(h.assess().illustration).toBeNull();
    const j = replay(); j.runtime.snapshot().current.events.push({ action: "uncalled_return" } as any);
    expect(j.assess().illustration).toBeNull(); expect(j.assess().unsafe).toBe(true);
  }, 20000);
  it("does not carry a previous registration's pot into a new baseline missing its pot", () => {
    const f = replay(frames => {
      const first = structuredClone(frames[0]);
      delete frames[0].payload.gameState.pot; delete frames[1].payload.pot;
      for (const frame of frames) { frame.connectionGeneration = 2; frame.localReceiveSequence++; frame.localReceivedAt++; }
      frames.unshift(first);
    });
    expect(f.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
    expect(f.assess()?.illustration ?? null).toBeNull();
  });
  if (street === "flop") it("preserves later turn support after an unsupported flop check/check sequence", () => {
    const f = replay(frames => {
      frames[4].payload = { ...structuredClone(frames[2].payload), pre: 1003, now: 1004, sN: 1004,
        tB: { player4: "check" }, cRPI: ["player4"] };
      const turnFrames = JSON.parse(readFileSync(new URL("./fixtures/pokernow-turn-synthetic.json", import.meta.url), "utf8")).frames.slice(1);
      for (const [i, frame] of turnFrames.entries()) {
        frame.localReceiveSequence = 7 + i; frame.localReceivedAt = 100600 + i * 100;
        Object.assign(frame.payload, { pre: 1005 + i, now: 1006 + i, sN: 1006 + i });
        if (Object.hasOwn(frame.payload, "pASA")) frame.payload.pASA = frame.payload.now;
      }
      frames.push(...turnFrames);
    });
    expect(f.runtime.snapshot().sourceStatus.riverObservation).toMatchObject({ street: "turn", payableCall: 12 });
  });
  if (street === "turn") it("preserves later river support after an unsupported heads-up turn check/check sequence", () => {
    const f = replay(frames => {
      frames[4].payload = { ...structuredClone(frames[2].payload), pre: 1003, now: 1004, sN: 1004,
        tB: { player4: "check" }, cRPI: ["player4"] };
      const riverFrames = JSON.parse(readFileSync(new URL("./fixtures/pokernow-river-406.json", import.meta.url), "utf8")).frames.slice(44);
      for (const [i, frame] of riverFrames.entries()) {
        frame.localReceiveSequence = 7 + i; frame.localReceivedAt = 100600 + i * 100;
        Object.assign(frame.payload, { pre: 1005 + i, now: 1006 + i, sN: 1006 + i });
        if (Object.hasOwn(frame.payload, "pASA")) frame.payload.pASA = frame.payload.now;
      }
      frames.push(...riverFrames);
    });
    expect(f.runtime.snapshot().sourceStatus.riverObservation).toMatchObject({ street: "river", payableCall: 12 });
  });
});
