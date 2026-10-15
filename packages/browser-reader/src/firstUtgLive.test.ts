import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { evaluateDecisionPolicy, getPolicyRecommendation, DecisionPacketSchema, type DecisionPacket } from "@poker-ai/ai-core";
import { assessLiveState } from "./liveState.js";
import { emptyActionHistory } from "./actionHistory.js";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";
import { buildLiveDecisionProofs, liveProofRevision } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { buildLivePreflopContext, buildLivePreflopExecution } from "../../../apps/pokernow-extension/src/preflop.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL, type HandIdentityEvidence } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { readRaiseControl } from "../../../apps/pokernow-extension/src/raiseControlRead.js";
import type { LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";

// Full, unmodified live export. Variants below are explicitly regression mutations.
const capture = JSON.parse(readFileSync(new URL("../../../evidence/hand-53-sixmax-utg-raw-socket.json", import.meta.url), "utf8"));
function fixture(change?: (frames: any[]) => void, logActions: string[] = []) {
  const frames = structuredClone(capture.frames);
  change?.(frames);
  const registered = frames[0].payload.gameState, start = frames[1].payload;
  const tableId = registered.id, heroId = frames[0].payload.currentPlayer.id;
  let now = frames[0].localReceivedAt, sequence = 0, identitySequence = 0;
  let identity: HandIdentityEvidence | null = null;
  const runtime = createTimelineRuntime({ tableId, sessionId: "hand53", now: () => now,
    fetchLog: async url => new Response(JSON.stringify(url.includes("hand_number=53") ? [
      { msg: "-- starting hand #53", createdAt: "1000" },
      { msg: "Player stacks: " + registered.seats.map(([seat, id]: [number, string]) =>
        `#${seat} "${registered.players[id].name} @ ${id}" (${registered.players[id].stack})`).join(" | "), createdAt: "1001" },
      ...logActions.map((msg, i) => ({ msg, createdAt: String(1002 + i) })),
    ] : [])) });
  function accept(event: string, payload: any, generation = 1) {
    const wire = "42" + JSON.stringify([event, payload]);
    // Same projection, metadata, identity order and runtime as eventSource.ts.
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId, sequence: ++sequence, generation,
      observedAt: now, metadata: inspectSocketMetadata(wire), utgSource: projectFirstUtgSource(wire, identity?.heroPlayerId ?? null) });
    identity = identityFromSocketPacket(wire, tableId, identity);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId, sequence: ++identitySequence, connected: true, identity });
  }
  for (const frame of frames) { now = frame.localReceivedAt; accept(frame.event, frame.payload, frame.connectionGeneration); }
  // Synchronous reader cross-check shape, not a fabricated HTML capture. Source
  // proof always comes through the actual two recorded envelopes above.
  const raw: LiveTableRead["raw"] = { boardCards: [], potMainValueText: "0", potTotalValueText: "3",
    seats: registered.seats.map(([seatNumber, id]: [number, string]) => ({ seatNumber, isOccupied: true, isYou: id === heroId,
      playerNameText: registered.players[id].name, stackText: String(registered.players[id].stack - (start.tB[id] ?? 0)),
      statusClasses: id === heroId ? ["decision-current"] : [],
      holeCardClassLists: id === heroId ? start.pC[id].cards.map((c: any) => ["flipped", `card-${c.value[1]}`, `card-s-${c.value[0]}`]) : [],
      betValueText: start.tB[id] === undefined ? null : String(start.tB[id]) })) };
  const { document } = parseHTML("<body></body>");
  const read = { raw, context: { blindTexts: ["1", "2"], dealerSeatNumber: 4, readErrors: [] },
    raiseControl: readRaiseControl(document, () => true) } as LiveTableRead;
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
    const preliminary = buildLiveDecisionProofs(read, assessment, snapshot, preflop, "hand53-first-utg");
    packet.decisionProofs = buildLiveDecisionProofs(read, assessment, snapshot, preflop, "hand53-first-utg", packet).evidence;
    return { packet, snapshot, assessment, preliminary, policy: evaluateDecisionPolicy(packet) };
  }
  return { read, build, runtime, frames, accept, advance: (ms: number) => { now += ms; } };
}

describe("hand-53 first UTG live adapter (full captured envelopes)", () => {
  // Reported action grammar combined with the existing hand-53 capture. The
  // actors/timestamps are regression scaffolding, NOT the failed smoke hand.
  it.each(["normal", "missed", "mixed", "hero"])("allows %s forced posts without inventing voluntary actions", async variant => {
    const actions = variant === "normal" ? ['"dfgdfgdfg @ mNU27Fo1qX" posts a small blind of 1', '"tyertete @ TTXBlZfl8G" posts a big blind of 2']
      : variant === "missed" ? ['"dfgdfgdfg @ mNU27Fo1qX" posts a missing small blind of 1', '"tyertete @ TTXBlZfl8G" posts a missed big blind of 2']
      : variant === "hero" ? ['"aizen @ v7UmNXTwjJ" posts a missing small blind of 1', '"aizen @ v7UmNXTwjJ" posts a missed big blind of 2']
      : ['"dfgdfgdfg @ mNU27Fo1qX" posts a small blind of 1', '"dfgdfgdfg @ mNU27Fo1qX" posts a missing small blind of 1', '"tyertete @ TTXBlZfl8G" posts a missed big blind of 2'];
    const f = fixture(undefined, actions);
    await f.runtime.tick(); f.advance(3001); await f.runtime.tick();
    const r = f.build(), posts = r.snapshot.current.events.filter(e => e.action === "post");
    expect(posts).toHaveLength(actions.length);
    expect(posts.every(e => e.wagerAction === "post" && e.actor?.seat !== null)).toBe(true);
    if (variant === "hero") expect(posts.every(e => e.actor?.isHero === true)).toBe(true);
    expect(r.packet.preflop!.situation).toBe("unopened");
    expect(r.policy.chosenAction).toBe("FOLD");
    expect(r.snapshot.current.historyComplete).toBe(false);
  });
  it.each(["calls 2", "raises to 6", "posts a mystery fee of 2"].flatMap(action =>
    ["aizen @ v7UmNXTwjJ", "Jrbfurbx @ amlHsejLtc"].map(actor => ({ action, actor }))))("forced posts do not hide later $actor $action", async ({ action, actor }) => {
    const f = fixture(undefined, ['"dfgdfgdfg @ mNU27Fo1qX" posts a missing small blind of 1', `"${actor}" ${action}`]);
    await f.runtime.tick(); f.advance(3001); await f.runtime.tick();
    const r = f.build();
    expect(r.policy.chosenAction).toBeNull();
    expect(r.preliminary.unopened!.proofs.find(p => p.scope === "actionWindow")!.status).toBe("contradicted");
  });
  it.each([false, true])("metadata does not mask unknown actions (unknown=%s)", async unknown => {
    const f = fixture(undefined, [
      'The player "aizen @ v7UmNXTwjJ" joined the game with a stack of 250.',
      "Your hand is 8\u2665, 5\u2665",
      ...(unknown ? ["Unknown source update"] : []),
    ]);
    await f.runtime.tick(); f.advance(3001); await f.runtime.tick();
    const r = f.build();
    expect(r.snapshot.current.events.filter(e => e.action === "player_join" || e.action === "hole_cards")).toHaveLength(2);
    expect(r.policy.chosenAction).toBe(unknown ? null : "FOLD");
    expect(r.snapshot.current.historyComplete).toBe(false);
  });
  it("activates 85s FOLD without pot, log prefix, equity or Raise controls", async () => {
    const f = fixture(), r = f.build();
    expect(r.snapshot.sourceStatus.firstUtg).toMatchObject({ handId: "x9h6owk0kbw5", handNumber: 53, heroSeat: 1, heroCards: ["8h", "5h"] });
    expect(r.snapshot.sourceStatus.firstUtg!.players.map(p => [p.seat, p.position])).toEqual([[4,"BTN"],[9,"SB"],[10,"BB"],[1,"UTG"],[2,"HJ"],[3,"CO"]]);
    expect(r.snapshot.current.historyComplete).toBe(false);
    expect(r.snapshot.current.events).toEqual([]);
    expect(r.assessment.amountToCall).toBeNull(); // Generic absent-marker rule remains unchanged.
    expect(r.assessment.decisionPot).toBeNull();
    expect(r.packet.preflop).toMatchObject({ openingEvidence: "first_utg_hand_start", situation: "unopened", amountToCallBB: 1, playersDealtIn: 6, actions: [] });
    expect(r.preliminary.activation).toMatchObject({ allowed: true, failedProofs: [] });
    expect(r.policy).toMatchObject({ status: "selected", chosenAction: "FOLD", activation: { allowed: true } });
    expect(r.policy.activation!.requiredProofs).not.toEqual(expect.arrayContaining(["pot", "raiseLegality"]));
    expect(r.packet.preflopExecution!.controls.raiseSubmitVisible).toBe(false);
    // Relay serialization/schema validation must retain the scoped input.
    const packet = DecisionPacketSchema.parse(JSON.parse(JSON.stringify(r.packet)));
    const router = { getRecommendation: vi.fn().mockRejectedValue(new Error("offline")) };
    expect(await getPolicyRecommendation(packet, router, { mode: "fast" }, true)).toMatchObject({
      decisionSource: "engine_policy", result: { action: "FOLD" }, activation: { allowed: true } });
  });
  it("RAISE chart membership still fails without independent 2.5BB legality", () => {
    const f = fixture(frames => { frames[1].payload.pC.v7UmNXTwjJ.cards[0].value = "Ah"; frames[1].payload.pC.v7UmNXTwjJ.cards[1].value = "Ad"; });
    const r = f.build();
    expect(r.preliminary.activation.failedProofs).toEqual(["raiseLegality"]);
    expect(r.policy.chosenAction).toBeNull();
  });
  it("QTo UTG is FOLD and does not consume raise, pot or equity proofs", () => {
    // Card mutation of hand 53 only; this is NOT a replay of absent hand-62 evidence.
    const f = fixture(frames => {
      frames[1].payload.pC.v7UmNXTwjJ.cards[0].value = "Qc";
      frames[1].payload.pC.v7UmNXTwjJ.cards[1].value = "Td";
    });
    const r = f.build();
    expect(r.policy).toMatchObject({ chosenAction: "FOLD", activation: { allowed: true } });
    expect(r.policy.activation!.requiredProofs).not.toEqual(expect.arrayContaining(["raiseLegality"]));
    expect(r.policy.activation!.requiredProofs).not.toEqual(expect.arrayContaining(["pot"]));
    expect(r.policy.activation!.requiredProofs).not.toEqual(expect.arrayContaining(["equity"]));
    expect(r.snapshot.current.historyComplete).toBe(false);
  });
  it.each(["pre", "generation", "dealer", "blind", "ante", "roster", "players", "hero-call", "opponent-call", "events", "turn"])("rejects changed source %s", variant => {
    const f = fixture(frames => {
      const a = frames[0].payload.gameState, b = frames[1].payload;
      if (variant === "pre") b.pre--;
      if (variant === "generation") frames[1].connectionGeneration = 2;
      if (variant === "dealer") b.dealerID = b.sBPI;
      if (variant === "blind") b.sBPI = b.bBPI;
      if (variant === "ante") a.ante = 1;
      if (variant === "roster") b.iHPI.pop();
      if (variant === "players") b.players = { newPlayer: { id: "newPlayer", stack: 250 } };
      if (variant === "hero-call") b.tB.v7UmNXTwjJ = 2;
      if (variant === "opponent-call") b.tB.amlHsejLtc = 2;
      if (variant === "events") b.eventsData = [{ unknown: true }];
      if (variant === "turn") b.cPI = b.pITT = "amlHsejLtc";
    });
    expect(f.build().policy.chosenAction).toBeNull();
  });
  it.each(["leave", "join", "cards", "short", "dealer", "fold", "all-in", "offline", "settlement", "read-error", "blind-value"])("rejects current DOM %s", variant => {
    const f = fixture();
    if (variant === "leave") f.read.raw.seats.pop();
    if (variant === "join") f.read.raw.seats.push({ ...f.read.raw.seats[1]!, seatNumber: 8 });
    if (variant === "cards") f.read.raw.seats[0]!.holeCardClassLists = [["flipped","card-h","card-s-K"],["flipped","card-h","card-s-Q"]];
    if (variant === "short") f.read.raw.seats[1]!.stackText = "198";
    if (variant === "dealer") f.read.context.dealerSeatNumber = 3;
    if (variant === "fold") f.read.raw.seats[1]!.statusClasses = ["fold"];
    if (variant === "all-in") f.read.raw.seats[1]!.stackContainerText = "All In";
    if (variant === "offline") f.read.raw.seats[1]!.statusClasses = ["offline"];
    if (variant === "settlement") f.read.raw.seats[1]!.stackIsSettlement = true;
    if (variant === "read-error") f.read.context.readErrors.push("ambiguous stack");
    if (variant === "blind-value") f.read.raw.seats[5]!.betValueText = null;
    expect(f.build().policy.chosenAction).toBeNull();
  });
  it("expires on any subsequent socket frame, including duplicates", () => {
    for (const duplicate of [false, true]) {
      const f = fixture(), before = liveProofRevision(f.runtime.snapshot());
      const last = f.frames[1].payload;
      f.accept("gC", duplicate ? last : { pre: last.now, now: last.now + 1 });
      expect(liveProofRevision(f.runtime.snapshot())).not.toBe(before);
      expect(f.build().policy.chosenAction).toBeNull();
    }
  });
  it("expires with original receive time, preventing cached replay from renewing it", () => {
    const f = fixture(), before = liveProofRevision(f.runtime.snapshot());
    f.advance(10_001);
    expect(liveProofRevision(f.runtime.snapshot())).not.toBe(before);
    expect(f.build().policy.chosenAction).toBeNull();
  });
  it("disconnect and reader gaps invalidate the independent witness", () => {
    const disconnected = fixture();
    disconnected.runtime.stop("connection closed");
    expect(disconnected.build().policy.chosenAction).toBeNull();
    const gap = fixture();
    gap.runtime.gap("reader failed");
    expect(gap.build().policy.chosenAction).toBeNull();
  });
  it("contradictory source mapping blocks the first-turn certificate", () => {
    const f = fixture();
    f.runtime.snapshot().current.seatMapping.status = "invalid";
    expect(f.build().policy.chosenAction).toBeNull();
  });
  it.each(["hand", "cards", "generation"])("rejects stale packet %s binding", variant => {
    const r = fixture().build();
    if (variant === "hand") r.packet.decisionProofs!.handId = "other";
    if (variant === "generation") r.packet.decisionProofs!.connectionGeneration = 2;
    if (variant === "cards") r.packet.hero.holeCards[0]!.rank = 14;
    expect(evaluateDecisionPolicy(r.packet).activation?.allowed).toBe(false);
  });
});
