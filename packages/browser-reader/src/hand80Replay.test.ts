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
import type { LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";

const captured = JSON.parse(readFileSync(new URL("../../../evidence/hand-80-diagnostic.json", import.meta.url), "utf8"));
// Replay the retained production projections, not invented raw envelopes or
// prebuilt certificates. The saved DOM is a cross-check; fresh replay timing is
// tested separately from the actual export (98.5 seconds after the boundary).
function replay(change?: (observations: any[]) => void) {
  const observations = structuredClone(captured.handTimeline.sourceStatus.firstUtgEvidence.observations);
  change?.(observations);
  const tableId = observations[0].projection.frame.id;
  let now = 0, identity: HandIdentityEvidence | null = null, identitySequence = 0;
  const runtime = createTimelineRuntime({ tableId, sessionId: "hand80-retained-projection", now: () => now,
    fetchLog: async url => new Response(JSON.stringify(url.includes("hand_number=80") ? captured.handTimeline.current.events.map((e: any) =>
      ({ msg: e.evidence, createdAt: e.sourceTimestampRaw })) : [])) });
  const carried: any[] = [];
  for (const o of observations) {
    now = o.observedAt;
    const p = o.projection;
    const payload = p.event === "registered" ? { gameState: p.frame, currentPlayer: { id: p.heroId } } : p.frame;
    const wire = "42" + JSON.stringify([p.event, payload]);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId, sequence: o.sequence,
      generation: o.generation, observedAt: o.observedAt, metadata: inspectSocketMetadata(wire), utgSource: p });
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
    packet.decisionProofs = buildLiveDecisionProofs(read, assessment, snapshot, preflop, "hand80-replay", packet).evidence;
    return { snapshot, packet, policy: evaluateDecisionPolicy(packet) };
  }
  return { runtime, build, carried, advance: () => { now += 3000; }, atExport: () => { now = Date.parse(captured.capturedAt); } };
}

describe("hand 80 through the real retained-source adapter", () => {
  it("carries six hands and certifies fresh JTo UTG FOLD without raise legality", () => {
    const f = replay(), r = f.build();
    expect(f.carried).toHaveLength(70);
    expect(f.carried.every(Boolean)).toBe(true);
    expect(f.carried[68].projection.frame).toMatchObject({ gN: 79, gT: [1, 5], tB: {} });
    expect(f.carried[69].projection.frame.players.mNU27Fo1qX).toEqual({ id: "mNU27Fo1qX", stack: 250, status: "inGame" });
    expect(r.snapshot.sourceStatus.firstUtg).toMatchObject({ handNumber: 80, handId: "ifuhzlpn8ejr", heroSeat: 1, heroCards: ["Td", "Jh"] });
    expect(r.snapshot.sourceStatus.firstUtg!.players.map(p => [p.seat, p.position])).toEqual([[5,"BTN"],[9,"SB"],[10,"BB"],[1,"UTG"],[2,"HJ"],[3,"CO"]]);
    expect(r.snapshot.sourceStatus.sourceMetadata.socketContinuity.status).toBe("observed_continuous");
    expect(r.snapshot.current.historyComplete).toBe(false);
    expect(r.packet.preflop).toMatchObject({ situation: "unopened", openingEvidence: "first_utg_hand_start" });
    expect(r.policy).toMatchObject({ status: "selected", chosenAction: "FOLD", llmMayChoose: false, activation: { allowed: true, state: "proof_ready" } });
    expect(r.policy.activation!.requiredProofs).not.toEqual(expect.arrayContaining(["raiseLegality"]));
  });

  it("does not renew the witness at the actual late export time", () => {
    const f = replay(); f.atExport();
    expect(Date.parse(captured.capturedAt) - captured.handTimeline.sourceStatus.firstUtgEvidence.observations.at(-1).observedAt).toBe(98538);
    expect(f.build().snapshot.sourceStatus.firstUtg).toBeNull();
    expect(f.build().policy.chosenAction).toBeNull();
  });

  it("reprocesses the saved log rows without importing their old parsed status", async () => {
    const f = replay();
    // Drain final refreshes for the three retained previous hands first.
    for (let i = 0; i < 4; i++) { if (i) f.advance(); await f.runtime.tick(); }
    const r = f.build();
    expect(r.snapshot.current.events.map(e => e.action)).toEqual(["hand_start", "player_stacks", "hole_cards", "post", "post"]);
    expect(r.policy.chosenAction).toBe("FOLD");
    expect(r.snapshot.current.historyComplete).toBe(false);
  });

  it.each(["generation", "skip", "pre", "replay", "cursor", "table", "hand", "player", "dealt", "dealer", "blind", "hero", "roster", "rup", "refresh", "events", "hero-action", "opponent-action", "stack", "hero-id"])("fails closed on %s without later silent recovery", variant => {
    const f = replay(rows => {
      const early = rows[4], last = rows.at(-1).projection.frame;
      if (variant === "generation") early.generation++;
      if (variant === "skip") rows.splice(4, 1);
      if (variant === "pre") early.projection.frame.pre--;
      if (variant === "replay") rows.splice(5, 0, structuredClone(early));
      if (variant === "cursor") early.projection.frame.now = early.projection.frame.pre;
      if (variant === "table") early.projection.frame.id = "other-table";
      if (variant === "hand") early.projection.frame.gN = 99;
      if (variant === "player") early.projection.frame.players = { v7UmNXTwjJ: { stack: "unknown" } };
      if (variant === "dealt") last.pC.v7UmNXTwjJ.cards = [];
      if (variant === "dealer") last.dealerID = last.bBPI;
      if (variant === "blind") last.sBPI = last.bBPI;
      if (variant === "hero") last.cPI = last.pITT = "amlHsejLtc";
      if (variant === "roster") last.iHPI.pop();
      if (variant === "rup") early.projection.event = "rup";
      if (variant === "refresh") early.projection.frame.r = true;
      if (variant === "events") early.projection.frame.eventsData = [{ unknown: true }];
      if (variant === "hero-action") last.tB.v7UmNXTwjJ = 2;
      if (variant === "opponent-action") last.tB.amlHsejLtc = 2;
      if (variant === "stack") rows.at(-2).projection.frame.players.v7UmNXTwjJ = { stack: 150 };
      if (variant === "hero-id") early.projection.heroId = "amlHsejLtc";
    });
    expect(f.build().snapshot.sourceStatus.firstUtg).toBeNull();
    expect(f.build().policy.chosenAction).toBeNull();
    expect(f.build().snapshot.current.historyComplete).toBe(false);
  });
});
