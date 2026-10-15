import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateDecisionPolicy, type DecisionPacket } from "@poker-ai/ai-core";
import { assessLiveState } from "./liveState.js";
import { emptyActionHistory } from "./actionHistory.js";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL, type HandIdentityEvidence } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { buildLiveDecisionProofs, liveProofRevision } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { buildLivePreflopContext, buildLivePreflopExecution } from "../../../apps/pokernow-extension/src/preflop.js";
import type { LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";

const captured = JSON.parse(readFileSync(new URL("../../../evidence/hand-103-reconnect-diagnostic.json", import.meta.url), "utf8"));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
// Replay the retained production projections, not invented raw envelopes or
// prebuilt certificates. The saved DOM is a cross-check; fresh replay timing is
// tested separately from the actual export (14.7 seconds after the boundary).
function replay(change?: (observations: any[]) => void) {
  const observations = structuredClone(captured.handTimeline.sourceStatus.firstUtgEvidence.observations);
  change?.(observations);
  const tableId = captured.handTimeline.sourceStatus.identity.tableId;
  let now = 0, identity: HandIdentityEvidence | null = null, identitySequence = 0;
  const runtime = createTimelineRuntime({ tableId, sessionId: "hand103-retained-projection", now: () => now,
    fetchLog: async url => new Response(JSON.stringify(url.includes("hand_number=103") ? captured.handTimeline.current.events.map((e: any) =>
      ({ msg: e.evidence, createdAt: e.sourceTimestampRaw })) : [])) });
  const carried: any[] = [];
  let generation = 0;
  for (const o of observations) {
    now = o.observedAt;
    if (generation !== o.generation) {
      generation = o.generation; identity = null;
      runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId, sequence: ++identitySequence, connected: false, identity: null });
    }
    const p = o.projection;
    const payload = p.event === "registered" ? { gameState: p.frame, currentPlayer: { id: p.heroId } } : p.frame;
    const wire = "42" + JSON.stringify([p.event, payload]);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId, sequence: o.sequence,
      generation: o.generation, observedAt: o.observedAt, metadata: inspectSocketMetadata(wire), utgSource: p });
    const nextIdentity = identityFromSocketPacket(wire, tableId, identity);
    if (nextIdentity) { identity = nextIdentity;
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId, sequence: ++identitySequence, connected: true, identity }); }
    carried.push(runtime.snapshot().sourceStatus.firstUtgEvidence.carriedState);
  }
  const read: LiveTableRead = { raw: structuredClone(captured.raw), context: captured.context,
    evidence: captured.evidence, raiseControl: captured.legality.raiseControl };
  function build() {
    const assessment = assessLiveState(read.raw, read.context), snapshot = runtime.snapshot();
    const preflop = buildLivePreflopContext(assessment, emptyActionHistory(), snapshot, read)!;
    const hero = assessment.state!.seats.find(s => s.isYou)!;
    const packet: DecisionPacket = {
      hero: { position: assessment.positions.get(hero.seatNumber)!, holeCards: hero.holeCards as DecisionPacket["hero"]["holeCards"], stackBB: hero.stack! / 2 },
      table: { street: "preflop", board: [], potBB: null, numOpponentsRemaining: preflop.activeOpponents }, preflop,
      facingAction: { type: "raise", amountBB: preflop.amountToCallBB ?? 1 }, candidateActions: ["FOLD", "CALL", "RAISE"],
      engineCalculations: {}, dataConfidence: assessment.confidence.level, potEvidence: { ...assessment.pot, bigBlind: 2 },
      preflopExecution: buildLivePreflopExecution(read, assessment, liveProofRevision(snapshot)),
    };
    packet.decisionProofs = buildLiveDecisionProofs(read, assessment, snapshot, preflop, "hand103-replay", packet).evidence;
    return { snapshot, packet, policy: evaluateDecisionPolicy(packet) };
  }
  return { runtime, build, carried, advance: () => { now += 3000; }, atExport: () => { now = Date.parse(captured.capturedAt); } };
}

describe("hand 103 reconnect production projection replay", () => {
  it("recovers through the actual MAIN-world socket bridge without sending poker actions", async () => {
    vi.resetModules();
    const tableId = captured.handTimeline.sourceStatus.identity.tableId;
    let now = 0, generation = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const runtime = createTimelineRuntime({ tableId, sessionId: "reconnect-main-bridge", now: () => now,
      fetchLog: async () => new Response("[]") });
    class Socket extends EventTarget {
      send = vi.fn();
      constructor(public url: string) { super(); }
      incoming(event: string, payload: unknown) {
        this.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([event, payload]) }));
      }
    }
    const win = { WebSocket: Socket, postMessage: (message: unknown) => runtime.accept(message), addEventListener: vi.fn(),
      sessionStorage: { getItem: () => null } };
    vi.stubGlobal("window", win);
    vi.stubGlobal("location", new URL(`https://www.pokernow.com/games/${tableId}`));
    await import("../../../apps/pokernow-extension/src/eventSource.js");
    const sockets: Socket[] = [];
    for (const o of captured.handTimeline.sourceStatus.firstUtgEvidence.observations) {
      now = o.observedAt;
      if (generation !== o.generation) {
        generation = o.generation;
        sockets.push(new win.WebSocket(`wss://www.pokernow.com/socket.io/?gameID=${tableId}`));
      }
      const p = o.projection;
      sockets.at(-1)!.incoming(p.event, p.event === "registered" ? { gameState: p.frame, currentPlayer: { id: p.heroId } } : p.frame);
    }
    expect(runtime.snapshot().sourceStatus.firstUtg).toMatchObject({ handNumber: 103, generation: 2, heroCards: ["Ts", "2d"] });
    expect(runtime.snapshot().sourceStatus.sourceMetadata.socketContinuity.status).toBe("observed_continuous");
    // A delayed old-socket message must not touch the generation-2 witness.
    sockets[0]!.incoming("gC", { now: 1, pre: 0 });
    expect(runtime.snapshot().sourceStatus.firstUtg?.handNumber).toBe(103);
    expect(sockets.every(socket => socket.send.mock.calls.length === 0)).toBe(true);
  });
  it("discards generation 1 and pre-registration 140, validates 141/142 and reaches fresh FOLD", () => {
    const f = replay(), r = f.build();
    expect(f.carried.slice(0, 25).every(x => x === null)).toBe(true);
    expect(f.carried[25]).toMatchObject({ generation: 2, sequence: 141, projection: { event: "registered", frame: { gN: 97 } } });
    expect(f.carried[26]).toMatchObject({ generation: 2, sequence: 142, projection: { event: "rup" } });
    expect(f.carried[25].projection.frame).toEqual(f.carried[26].projection.frame);
    expect(r.snapshot.sourceStatus.firstUtg).toMatchObject({ generation: 2, handNumber: 103, handId: "m8r13zb012ch", heroSeat: 1, heroCards: ["Ts", "2d"] });
    expect(r.snapshot.sourceStatus.sourceMetadata.socketContinuity).toMatchObject({ status: "observed_continuous", baselineSequence: 141, chainGap: false, linkedUpdates: 69 });
    expect(r.policy).toMatchObject({ status: "selected", chosenAction: "FOLD", llmMayChoose: false, activation: { allowed: true, state: "proof_ready" } });
    expect(r.policy.activation!.requiredProofs).not.toContain("raiseLegality");
    expect(r.snapshot.current.historyComplete).toBe(false);
  });
  it("reparses the exact saved log rows without overriding source proof", async () => {
    const f = replay();
    for (let i = 0; i < 4; i++) { if (i) f.advance(); await f.runtime.tick(); }
    expect(f.build().policy.chosenAction).toBe("FOLD");
    expect(f.build().snapshot.current.events.map(e => e.action)).toEqual(["hand_start", "player_stacks", "hole_cards", "post", "post"]);
  });
  it("cannot certify registration's ongoing hand or renew expiry at the export", () => {
    const initial = replay(rows => rows.splice(27));
    expect(initial.build().snapshot.sourceStatus.firstUtg).toBeNull();
    const f = replay(); f.atExport();
    expect(Date.parse(captured.capturedAt) - captured.handTimeline.sourceStatus.firstUtgEvidence.observations.at(-1).observedAt).toBe(14678);
    expect(f.build().policy.chosenAction).toBeNull();
  });
  it("compares object fields independent of enumeration order", () => {
    const f = replay(rows => { const r = rows.find(r => r.sequence === 142); r.projection.frame = Object.fromEntries(Object.entries(r.projection.frame).reverse()); });
    expect(f.build().policy.chosenAction).toBe("FOLD");
  });
  it.each(["no-registration", "bad-registration", "wrong-table", "wrong-hero", "changed-refresh", "missing-refresh-field", "refresh-hand", "refresh-cursor", "skip-refresh", "skip-patch", "duplicate-refresh", "later-refresh", "pre-mismatch", "replay", "generation", "old-generation", "missing-projection", "dealer", "roster", "turn", "repeat-registration", "refresh-array-order"])("blocks %s", variant => {
    const f = replay(rows => {
      const reg = rows.find(r => r.sequence === 141), refresh = rows.find(r => r.sequence === 142), patch = rows.find(r => r.sequence === 143);
      if (variant === "no-registration") rows.splice(rows.indexOf(reg), 1);
      if (variant === "bad-registration") delete reg.projection.frame.players;
      if (variant === "wrong-table") reg.projection.frame.id = "another-table";
      if (variant === "wrong-hero") refresh.projection.heroId = "amlHsejLtc";
      if (variant === "changed-refresh") refresh.projection.frame.players.v7UmNXTwjJ.stack++;
      if (variant === "missing-refresh-field") delete refresh.projection.frame.ante;
      if (variant === "refresh-hand") refresh.projection.frame.hI = "other-hand";
      if (variant === "refresh-cursor") refresh.projection.frame.now++;
      if (variant === "skip-refresh") rows.splice(rows.indexOf(refresh), 1);
      if (variant === "skip-patch") rows.splice(rows.indexOf(patch), 1);
      if (variant === "duplicate-refresh") rows.splice(rows.indexOf(refresh) + 1, 0, structuredClone(refresh));
      if (variant === "later-refresh") patch.projection = structuredClone(refresh.projection);
      if (variant === "pre-mismatch") patch.projection.frame.pre--;
      if (variant === "replay") rows.splice(rows.indexOf(patch) + 1, 0, structuredClone(patch));
      if (variant === "generation") patch.generation = 3;
      if (variant === "old-generation") patch.generation = 1;
      if (variant === "missing-projection") patch.projection.frame = {};
      if (variant === "dealer") rows.at(-1).projection.frame.dealerSeat = 3;
      if (variant === "roster") rows.at(-1).projection.frame.iHPI.pop();
      if (variant === "turn") rows.at(-1).projection.frame.cPI = "amlHsejLtc";
      if (variant === "repeat-registration") patch.projection = structuredClone(reg.projection);
      if (variant === "refresh-array-order") refresh.projection.frame.iHPI.reverse();
    });
    expect(f.build().policy.chosenAction).toBeNull();
    expect(f.build().snapshot.current.historyComplete).toBe(false);
  });
});

