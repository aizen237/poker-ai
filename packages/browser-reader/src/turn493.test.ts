import { readFileSync } from "node:fs";
import { runInNewContext, runInThisContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { assessLiveState } from "./liveState.js";

// Optional private replay uses the original capture unchanged. Never prints it.
const capture = JSON.parse(readFileSync(process.env.HAND493_RAW_CAPTURE ??
  new URL("./fixtures/pokernow-turn-493.json", import.meta.url), "utf8"));
const checkpoint = capture.checkpoints[0], observation = checkpoint.observation;
const fixture = capture.rawSocket;
const receivedAt = 1793347065281, expiresAt = 1793347075281;
const expectedTrace = JSON.parse(readFileSync(new URL("./fixtures/pokernow-turn-493-trace.json", import.meta.url), "utf8"));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.doUnmock("@poker-ai/ai-core"); });

async function replay(mode: "source" | "bundle" = "source", mutate: (frames: any[]) => void = () => {}) {
  vi.resetModules();
  const f = structuredClone(fixture); mutate(f.frames);
  const tableId = f.frames[0].payload.gameState.id;
  let now = f.frames[0].localReceivedAt;
  const at = (time: number) => { now = time; };
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const fetchLog = vi.fn();
  const runtime = createTimelineRuntime({ tableId, sessionId: "turn493", now: () => now, fetchLog });
  const location = new URL(`https://www.pokernow.com/games/${tableId}`);
  class Socket extends EventTarget { send = vi.fn(); constructor(public url: string) { super(); } }
  const messages: any[] = [];
  const win = { WebSocket: Socket, location, addEventListener() {}, sessionStorage: { getItem: () => null },
    postMessage(message: any) { if (message.type === "source_metadata") messages.push(message); runtime.accept(message); },
    setTimeout: () => 1, clearTimeout() {} };
  vi.stubGlobal("window", win); vi.stubGlobal("location", location);
  if (mode === "bundle") runInThisContext(readFileSync(new URL("../../../apps/pokernow-extension/eventSource.js", import.meta.url), "utf8"));
  else await import("../../../apps/pokernow-extension/src/eventSource.js");
  const socket = new win.WebSocket(`wss://www.pokernow.com/socket.io/?gameID=${tableId}`);
  const trace: any[] = [];
  for (const frame of f.frames) {
    at(frame.localReceivedAt);
    socket.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([frame.event, frame.payload]) }));
    trace.push(structuredClone(runtime.snapshot().sourceStatus));
  }
  return { runtime, trace, messages, socket, fetchLog, at };
}

function recordedRead() {
  // This is the actual synchronous browser read, not DOM inferred from source.
  // Keep CALL observedAt (6ms after capture start), ordinary stack text, empty
  // seats, folded contributions, card class lists and evidence verbatim.
  return structuredClone(observation.unverifiedObservations.ui);
}
async function proofBuilder(mode: "source" | "content bundle" = "source") {
  const source = (await import("../../../apps/pokernow-extension/src/decisionProofs.js")).buildLiveDecisionProofs;
  if (mode === "source") return source;
  // Exercise shipped bundled functions without starting unrelated overlay/network
  // boot code. No function bodies are rewritten; this is not a browser UI test.
  const bundle = readFileSync(new URL("../../../apps/pokernow-extension/contentScript.js", import.meta.url), "utf8");
  const boundary = bundle.indexOf("  // src/contentScript.ts");
  expect(boundary).toBeGreaterThan(0);
  const context = { Date, URL, build: null as typeof source | null };
  runInNewContext(bundle.slice(0, boundary) + "globalThis.build = buildLiveDecisionProofs; })();", context);
  return context.build!;
}
function assertBlocked(p: Awaited<ReturnType<typeof proofBuilder>> extends (...args: any) => infer R ? R : never) {
  expect(p.activation.allowed).toBe(false);
  expect(p.turnCallFold?.liveAuthorized).toBe(false);
  for (const scope of ["pot", "eligibility", "accounting", "legalActions", "equity", "rangeInput"])
    expect(p.evidence.proofs.find(p => p.scope === scope)?.status).not.toBe("proven");
}

describe("Hand493 original raw frames and real recorded DOM checkpoint", () => {
  it.each(["source", "bundle"] as const)("recognizes all 28 MAIN %s frames and binds the recorded read", async mode => {
    const r = await replay(mode);
    expect(fixture.capture).toMatchObject({ frameCount: 28, rejectedFrames: 0, registeredCaptured: true });
    expect(r.messages).toHaveLength(28);
    expect(r.trace.map((s, i) => ({ frame: i + 1, kind: r.messages[i].riverSource?.kind,
      diagnostic: { reason: s.riverObservationDiagnostic.reason, sequence: s.riverObservationDiagnostic.sequence,
        generation: s.riverObservationDiagnostic.generation } }))).toEqual(expectedTrace);
    expect(r.trace[21].riverObservation).toMatchObject({ street: "flop", payableCall: 4 });
    expect(r.trace[27].riverObservation).toMatchObject({ street: "turn", handNumber: 493,
      heroCards: ["Tc", "4d"], board: ["5s", "5c", "4c", "Jc"], sequence: 28,
      receivedAt, expiresAt, collectedPot: 21, streetSubtotal: 4, grossPotBeforeCall: 25, payableCall: 4,
      liveAuthorized: false, historyComplete: false });
    expect(observation.epochBefore).toEqual(observation.epochAfter);
    expect(observation).toMatchObject({ epochStatus: "observed_matching", observationPaired: false });
    expect(observation.epochAfter).toMatchObject({ stateAvailable: true, matchesRead: true });
    expect(observation.reasons).toEqual(["UI does not provide one readable hero flop decision."]);
    expect(checkpoint.capturedAt - receivedAt).toBe(7474);
    const read = recordedRead(), original = structuredClone(read);
    expect(read.callControl).toMatchObject({ observedAt: 1793347072761, enabled: true, amountChips: 4, rawText: "Call 4" });
    expect(read.raw.seats.filter((s: any) => s.isOccupied).map((s: any) => [s.seatNumber, s.stackText, s.betValueText]))
      .toEqual([[1, "172", "check"], [2, "244", null], [3, "337", "4"], [5, "275", null], [9, "174", null], [10, "273", null]]);
    const build = await proofBuilder();
    r.at(observation.completedAt);
    const assessment = assessLiveState(read.raw, read.context);
    const p = build(read, assessment, r.runtime.snapshot(), null, observation.epochAfter.decisionEpoch);
    expect(read).toEqual(original);
    for (const scope of ["decisionState", "connection", "stack", "callCost"])
      expect(p.evidence.proofs.find(p => p.scope === scope)?.status).toBe("proven");
    expect(p.evidence.proofs.some(p => p.status === "contradicted")).toBe(false);
    const turn = p.turnCallFold!;
    expect(turn).toMatchObject({ unsafe: false, modelAbstention: null,
      binding: { receivedAt, expiresAt, sequence: 28, decisionEpoch: observation.epochAfter.decisionEpoch } });
    expect(turn.illustration).toMatchObject({ status: "conditional", chosenAction: null, llmMayChoose: false, foldEV: 0 });
    // Baseline frozen-clock exact results; bit-for-bit unchanged by memoization.
    expect(turn.illustration!.assumptions.map(a => [a.equity, a.callEV, a.valueCombos, a.bluffCombos])).toEqual([
      [0.3409829888027549, 5.888506675279893, 387, 648],
      [0.45212444209536595, 9.111608820765612, 387, 648],
    ]);
    expect(turn.illustration!.requiredEquity).toBe(4 / 29);
    assertBlocked(p);
    // Cached numerical results cannot extend either source or control expiry.
    r.at(expiresAt);
    expect(build(read, assessment, r.runtime.snapshot(), null, "expired").turnCallFold?.illustration).toBeNull();
    expect(r.socket.send).not.toHaveBeenCalled(); expect(r.fetchLog).not.toHaveBeenCalled();
  }, 30000);

  it.each(["source", "content bundle"] as const)("finishes cold %s calculation within the original deadline using elapsed wall time", async mode => {
    const r = await replay(), build = await proofBuilder(mode), read = recordedRead();
    r.at(observation.completedAt);
    const snapshot = r.runtime.snapshot(), assessment = assessLiveState(read.raw, read.context);
    const start = performance.now();
    vi.spyOn(Date, "now").mockImplementation(() => observation.completedAt + Math.floor(performance.now() - start));
    const p = build(read, assessment, snapshot, null, observation.epochAfter.decisionEpoch);
    const elapsed = performance.now() - start;
    expect(elapsed, `cold calculation ${elapsed.toFixed(1)}ms; remaining ${expiresAt - observation.completedAt}ms`)
      .toBeLessThan(expiresAt - observation.completedAt);
    expect(p.turnCallFold?.illustration?.status).toBe("conditional");
    expect(p.turnCallFold?.binding?.expiresAt).toBe(expiresAt);
    assertBlocked(p);
  }, 30000);

  it("still discards a successful computation that crosses expiry", async () => {
    const r = await replay();
    vi.doMock("@poker-ai/ai-core", async original => {
      const real = await original<typeof import("@poker-ai/ai-core")>();
      return { ...real, compareTurnCallFold: (input: Parameters<typeof real.compareTurnCallFold>[0]) => {
        const result = real.compareTurnCallFold(input);
        expect(result.status).toBe("conditional");
        r.at(expiresAt); return result;
      } };
    });
    const build = await proofBuilder(), read = recordedRead(); r.at(observation.completedAt);
    const p = build(read, assessLiveState(read.raw, read.context), r.runtime.snapshot(), null, "slow");
    expect(p.turnCallFold).toMatchObject({ illustration: null, binding: null, modelAbstention: null });
    assertBlocked(p);
  }, 30000);

  it.each(["cards", "board", "seat", "stack", "contribution", "main pot", "total pot", "disabled CALL", "wrong CALL",
    "missing CALL", "stale CALL", "future CALL", "actor", "read error", "offline", "settlement", "identity", "generation", "disconnect", "return", "expired", "before receipt"])(
    "withholds when the recorded evidence is contradicted or unusable: %s", async fault => {
      const r = await replay(), build = await proofBuilder(), read = recordedRead();
      r.at(observation.completedAt);
      const snapshot = r.runtime.snapshot(), hero = read.raw.seats[0];
      if (fault === "cards") hero.holeCardClassLists[0][2] = "card-s-A";
      if (fault === "board") read.raw.boardCards[3].valueText = "Q";
      if (fault === "seat") hero.seatNumber = 4;
      if (fault === "stack") hero.stackText = "173";
      if (fault === "contribution") hero.betValueText = "1";
      if (fault === "main pot") read.raw.potMainValueText = "20";
      if (fault === "total pot") read.raw.potTotalValueText = "24";
      if (fault === "disabled CALL") read.callControl.enabled = false;
      if (fault === "wrong CALL") read.callControl.amountChips = 5;
      if (fault === "missing CALL") read.callControl = null;
      if (fault === "stale CALL") read.callControl.observedAt = receivedAt - 1;
      if (fault === "future CALL") read.callControl.observedAt = observation.completedAt + 1;
      if (fault === "actor") hero.statusClasses = hero.statusClasses.filter((c: string) => c !== "decision-current");
      if (fault === "read error") read.context.readErrors.push("ambiguous stack");
      if (fault === "offline") hero.statusClasses.push("offline");
      if (fault === "settlement") hero.stackIsSettlement = true;
      if (fault === "identity") snapshot.sourceStatus.identity!.handId = "OTHER_HAND";
      if (fault === "generation") snapshot.sourceStatus.sourceMetadata.socketContinuity.generation++;
      if (fault === "disconnect") snapshot.sourceStatus.connected = false;
      if (fault === "return") snapshot.current.accounting.adjustments.push({} as any);
      if (fault === "expired") r.at(expiresAt);
      if (fault === "before receipt") r.at(receivedAt - 1);
      const p = build(read, assessLiveState(read.raw, read.context), snapshot, null, "negative");
      expect(p.turnCallFold?.illustration).toBeNull(); assertBlocked(p);
    });

  it.each(["gap", "CALL amount", "CALL missing", "board prefix", "pot collection"])("preserves source rejection: %s", async fault => {
    const r = await replay("source", frames => {
      const hero = frames[0].payload.currentPlayer.id;
      if (fault === "gap") frames[27].payload.pre++;
      if (fault === "CALL amount") frames[22].payload.tB[hero] = 5;
      if (fault === "CALL missing") frames.splice(22, 1);
      if (fault === "board prefix") frames[23].payload.oTC["1"][0] = "6s";
      if (fault === "pot collection") frames[23].payload.pot++;
    });
    expect(r.runtime.snapshot().sourceStatus.riverObservation).toBeNull();
  });
});
