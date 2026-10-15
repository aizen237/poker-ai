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

const captured = JSON.parse(readFileSync(new URL("../../../evidence/hand-127-diagnostic.json", import.meta.url), "utf8"));

// Replay the retained production projections, not invented raw envelopes or
// prebuilt certificates. The saved DOM is a cross-check; fresh replay timing is
// tested separately from the actual export (9.026 seconds after the boundary).
function replay(change?: (observations: any[]) => void, lossyInventory = false) {
  const observations = structuredClone(captured.handTimeline.sourceStatus.firstUtgEvidence.observations);
  change?.(observations);
  const tableId = captured.handTimeline.sourceStatus.identity.tableId;
  let now = 0, identity: HandIdentityEvidence | null = null, identitySequence = 0;
  const runtime = createTimelineRuntime({ tableId, sessionId: "hand127-retained-projection", now: () => now,
    fetchLog: async url => new Response(JSON.stringify(url.includes("hand_number=127") ? captured.handTimeline.current.events.map((e: any) =>
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
    const metadata = inspectSocketMetadata(wire)!;
    // Explicit synthetic inventory loss. Bootstrap inventories were evicted
    // from the saved hand-127 audit; do not pretend to reconstruct them.
    if (lossyInventory && p.event !== "gC") {
      metadata.frame.fields = metadata.frame.fields.filter(f => !["now", "pre"].includes(f.path));
      metadata.frame.truncated = true;
    }
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId, sequence: o.sequence,
      generation: o.generation, observedAt: o.observedAt, metadata, utgSource: p });
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
    packet.decisionProofs = buildLiveDecisionProofs(read, assessment, snapshot, preflop, "hand127-replay", packet).evidence;
    return { snapshot, packet, policy: evaluateDecisionPolicy(packet) };
  }
  return { runtime, build, carried, advance: () => { now += 3000; }, atExport: () => { now = Date.parse(captured.capturedAt); } };
}

describe("hand 127 scoped continuity authority", () => {
  it("binds bootstrap 90/91 through boundary 161 and activates at the actual fresh export", () => {
    const f = replay(); f.atExport();
    const r = f.build();
    expect(r.snapshot.sourceStatus.firstUtgProof).toMatchObject({ scope: "first_utg_boundary", historyComplete: false,
      continuity: { status: "validated_prefix", baselineSequence: 90, throughSequence: 161, generation: 3, handId: "zyrbaxapvjfp", cursor: 1792071364093 },
      witness: { heroCards: ["5d", "8s"], receivedAt: 1792071363868 }, expiresAt: 1792071373868 });
    expect(Date.parse(captured.capturedAt) - r.snapshot.sourceStatus.firstUtg!.receivedAt).toBe(9026);
    expect(r.policy).toMatchObject({ chosenAction: "FOLD", activation: { allowed: true, state: "proof_ready" } });
    expect(r.snapshot.current.historyComplete).toBe(false);
    expect(r.snapshot.sourceStatus.sourceMetadata.provesCompletePrefix).toBe(false);
    f.advance(); expect(f.build().policy.chosenAction).toBeNull();
  });
  it("a lossy observational chain cannot overrule a validated scoped contract", () => {
    const f = replay(undefined, true), r = f.build();
    expect(r.snapshot.sourceStatus.sourceMetadata.socketContinuity.status).toBe("incomplete");
    expect(r.snapshot.sourceStatus.firstUtgProof?.continuity.status).toBe("validated_prefix");
    expect(r.packet.decisionProofs!.proofs.find(p => p.scope === "connection")!.status).toBe("proven");
    expect(r.policy.activation?.allowed).toBe(true);
    expect(r.snapshot.current.historyComplete).toBe(false);
  });
  it("metadata alone cannot replace missing validated source state", () => {
    const f = replay(rows => { rows.find(o => o.sequence === 92).projection.frame.players = { v7UmNXTwjJ: { stack: "unknown" } }; });
    const r = f.build();
    expect(r.snapshot.sourceStatus.sourceMetadata.socketContinuity.status).toBe("observed_continuous");
    expect(r.snapshot.sourceStatus.firstUtgProof).toBeNull();
    expect(r.policy.chosenAction).toBeNull();
  });
  it.each(["sequence", "predecessor", "refresh", "registration", "generation"])("retains fail-closed behavior for %s", variant => {
    const f = replay(rows => {
      const reg = rows.find(o => o.sequence === 90), refresh = rows.find(o => o.sequence === 91), patch = rows.find(o => o.sequence === 92);
      if (variant === "sequence") rows.splice(rows.indexOf(patch), 1);
      if (variant === "predecessor") patch.projection.frame.pre--;
      if (variant === "refresh") refresh.projection.frame.players.v7UmNXTwjJ.stack++;
      if (variant === "registration") delete reg.projection.frame.seats;
      if (variant === "generation") patch.generation++;
    });
    expect(f.build().snapshot.sourceStatus.firstUtgProof).toBeNull();
    expect(f.build().policy.chosenAction).toBeNull();
  });
});

