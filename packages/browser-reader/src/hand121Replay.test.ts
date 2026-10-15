import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateDecisionPolicy, type DecisionPacket } from "@poker-ai/ai-core";
import { assessLiveState } from "./liveState.js";
import { emptyActionHistory } from "./actionHistory.js";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL, type HandIdentityEvidence } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { buildLiveDecisionProofs, liveProofRevision } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { buildLivePreflopContext, buildLivePreflopExecution } from "../../../apps/pokernow-extension/src/preflop.js";
import { projectFirstUtgSource, createFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";
import { initializeUtgState, advanceUtgState } from "../../../apps/pokernow-extension/src/firstUtgState.js";
import type { LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";

const captured = JSON.parse(readFileSync(new URL("../../../evidence/hand-121-diagnostic.json", import.meta.url), "utf8"));
// Replay the retained production projections, not invented raw envelopes or
// prebuilt certificates. The saved DOM is a cross-check; fresh replay timing is
// tested separately from the actual export (18.2 seconds after the boundary).
function replay(change?: (observations: any[]) => void) {
  const observations = structuredClone(captured.handTimeline.sourceStatus.firstUtgEvidence.observations);
  change?.(observations);
  const tableId = observations[0].projection.frame.id;
  let now = 0, identity: HandIdentityEvidence | null = null, identitySequence = 0;
  const runtime = createTimelineRuntime({ tableId, sessionId: "hand121-retained-projection", now: () => now,
    fetchLog: async url => new Response(JSON.stringify(url.includes("hand_number=121") ? captured.handTimeline.current.events.map((e: any) =>
      ({ msg: e.evidence, createdAt: e.sourceTimestampRaw })) : [])) });
  const carried: any[] = [];
  for (const o of observations) {
    now = o.observedAt;
    const p = o.projection;
    const payload = p.event === "registered" ? { gameState: p.frame, currentPlayer: { id: p.heroId } } : p.frame;
    const wire = "42" + JSON.stringify([p.event, payload]);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId, sequence: o.sequence,
      generation: o.generation, observedAt: o.observedAt, metadata: inspectSocketMetadata(wire), utgSource: projectFirstUtgSource(wire, p.heroId) });
    identity = identityFromSocketPacket(wire, tableId, identity);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId, sequence: ++identitySequence, connected: true, identity });
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
    packet.decisionProofs = buildLiveDecisionProofs(read, assessment, snapshot, preflop, "hand121-replay", packet).evidence;
    return { snapshot, packet, policy: evaluateDecisionPolicy(packet) };
  }
  return { runtime, build, carried, advance: () => { now += 3000; }, atExport: () => { now = Date.parse(captured.capturedAt); } };
}

const rows = captured.handTimeline.sourceStatus.firstUtgEvidence.observations;
const oldId = "nQ-ZBcAfge", newId = "L6CP6v3_ST";
function beforeReplacement() {
  const reg = rows[0].projection;
  let state = initializeUtgState(reg.frame, reg.frame.id, reg.heroId);
  for (const o of rows.slice(1, 5)) state = advanceUtgState(state, o.projection.frame, state.id, reg.heroId);
  return { state, patch: structuredClone(rows[5].projection.frame), hero: reg.heroId };
}

describe("hand 121 explicit replacement through the production projection and adapter", () => {
  it("carries all 78 updates and selects fresh 96o UTG FOLD after replacement", () => {
    const f = replay(), r = f.build();
    expect(f.carried).toHaveLength(78);
    expect(f.carried.every(Boolean)).toBe(true);
    expect(f.carried[5].projection.frame.pC).not.toHaveProperty(oldId);
    expect(f.carried[5].projection.frame.players[newId]).toEqual({ id: newId, stack: 250, status: "inGame" });
    expect(r.snapshot.sourceStatus.firstUtg).toMatchObject({ handNumber: 121, handId: "wyjwwbgbqwuz", heroSeat: 1, heroCards: ["9h", "6d"] });
    expect(r.snapshot.sourceStatus.firstUtg!.players.find(p => p.seat === 5)?.playerId).toBe(newId);
    expect(r.snapshot.sourceStatus.sourceMetadata.socketContinuity.status).toBe("observed_continuous");
    expect(r.snapshot.current.historyComplete).toBe(false);
    expect(r.policy).toMatchObject({ status: "selected", chosenAction: "FOLD", llmMayChoose: false, activation: { allowed: true, state: "proof_ready" } });
    expect(r.policy.activation!.requiredProofs).not.toContain("raiseLegality");
  });
  it("does not restore proof at the actual export, 18.227 seconds after the boundary", () => {
    const f = replay(); f.atExport();
    expect(Date.parse(captured.capturedAt) - rows.at(-1).observedAt).toBe(18227);
    expect(f.build().snapshot.sourceStatus.firstUtg).toBeNull();
    expect(f.build().policy.chosenAction).toBeNull();
  });
  it("keeps the fresh FOLD after reparsing the saved source log rows", async () => {
    const f = replay();
    for (let i = 0; i < 4; i++) { if (i) f.advance(); await f.runtime.tick(); }
    const r = f.build();
    expect(r.snapshot.current.events.map(e => e.action)).toEqual(["hand_start", "player_stacks", "hole_cards", "post", "post"]);
    expect(r.policy.chosenAction).toBe("FOLD");
    expect(r.snapshot.current.historyComplete).toBe(false);
  });
  it("does not issue a certificate for the mid-hand replacement itself", () => {
    let now = 0;
    const source = createFirstUtgSource(rows[0].projection.frame.id, () => now);
    for (const o of rows.slice(0, 6)) { now = o.observedAt; source.accept(o.projection, o.sequence, o.generation, now); }
    expect(source.diagnostic().carriedState).not.toBeNull();
    expect(source.snapshot()).toBeNull();
    expect(source.diagnostic().historyComplete).toBe(false);
  });
  it("uses new-ID stack and cards without mutating or inheriting the departed player's data", () => {
    const { state, patch, hero } = beforeReplacement();
    state.players[oldId].stack = 999;
    state.pC[oldId].cards[0] = { value: "As", showing: true };
    const before = structuredClone(state);
    const next = advanceUtgState(state, patch, state.id, hero);
    expect(state).toEqual(before);
    expect(next.players[newId].stack).toBe(250);
    expect(next.pC[newId]).toEqual(patch.pC[newId]);
    expect(next.pC[newId]).not.toEqual(state.pC[oldId]);
    for (const key of ["players", "pGS", "pC"]) expect(next[key]).not.toHaveProperty(oldId);
  });
  it("reconciles an explicit departure with a complete remaining-roster snapshot", () => {
    const { state, patch, hero } = beforeReplacement();
    delete patch.players[newId]; delete patch.pGS[newId]; delete patch.pC[newId];
    patch.seats = patch.seats.filter((s: any) => s[1] !== newId);
    patch.iHPI = patch.iHPI.filter((id: string) => id !== newId);
    patch.dealerID = hero; patch.dealerSeat = 1;
    const next = advanceUtgState(state, patch, state.id, hero);
    expect(next.seats).toHaveLength(5);
    expect(next.players).not.toHaveProperty(oldId);
    expect(next.players).not.toHaveProperty(newId);
  });
  it.each(["seats", "iHPI", "pC", "status-deletion", "partial-cards", "old-card", "old-seat", "old-roster",
    "missing-player", "missing-id", "missing-stack", "missing-status", "wrong-id", "old-bet", "old-actor", "old-blind", "old-role", "unknown-deletion"])("rejects incomplete/contradictory replacement: %s", variant => {
    const { state, patch, hero } = beforeReplacement();
    if (["seats", "iHPI", "pC"].includes(variant)) delete patch[variant];
    if (variant === "status-deletion") delete patch.pGS[oldId];
    if (variant === "partial-cards") delete patch.pC[hero];
    if (variant === "old-card") patch.pC[oldId] = state.pC[oldId];
    if (variant === "old-seat") patch.seats.find((s: any) => s[0] === 5)[1] = oldId;
    if (variant === "old-roster") patch.iHPI.push(oldId);
    if (variant === "missing-player") delete patch.players[newId];
    if (variant === "missing-id") delete patch.players[newId].id;
    if (variant === "missing-stack") delete patch.players[newId].stack;
    if (variant === "missing-status") delete patch.players[newId].status;
    if (variant === "wrong-id") patch.players[newId].id = oldId;
    if (variant === "old-bet") state.tB[oldId] = 4;
    if (variant === "old-actor") patch.cPI = oldId;
    if (variant === "old-blind") patch.bBPI = oldId;
    if (variant === "old-role") patch.cRPI = [oldId];
    if (variant === "unknown-deletion") { patch.players.unknown = "<D>"; patch.pGS.unknown = "<D>"; }
    const before = structuredClone(state);
    expect(() => advanceUtgState(state, patch, state.id, hero)).toThrow();
    expect(state).toEqual(before);
  });
  it("reports the precise dictionary and unavailable player reference", () => {
    const { state, patch, hero } = beforeReplacement();
    state.tB[oldId] = 4;
    expect(() => advanceUtgState(state, patch, state.id, hero)).toThrow(`tB.${oldId} references an unavailable player`);
  });
  it.each(["partial-deletion", "missing-identity", "gap", "generation", "stale-player", "missing-deletion"])("cannot silently recover from %s at a later hand boundary", variant => {
    const f = replay(o => {
      const p = o[5].projection.frame;
      if (variant === "partial-deletion") delete p.pGS[oldId];
      if (variant === "missing-identity") delete p.players[newId].id;
      if (variant === "gap") p.pre--;
      if (variant === "generation") o[5].generation++;
      if (variant === "stale-player") p.tB[oldId] = 4;
      if (variant === "missing-deletion") delete p.players[oldId];
    });
    expect(f.build().snapshot.sourceStatus.firstUtg).toBeNull();
    expect(f.build().policy.chosenAction).toBeNull();
    expect(f.build().snapshot.current.historyComplete).toBe(false);
  });
});

