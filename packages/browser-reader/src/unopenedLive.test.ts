import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { evaluateDecisionPolicy, getPolicyRecommendation, type DecisionPacket, type ModelRouter } from "@poker-ai/ai-core";
import { assessLiveState } from "./liveState.js";
import { emptyActionHistory } from "./actionHistory.js";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { buildLiveDecisionProofs, liveProofRevision } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { buildLivePreflopContext, buildLivePreflopExecution } from "../../../apps/pokernow-extension/src/preflop.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { readRaiseControl } from "../../../apps/pokernow-extension/src/raiseControlRead.js";
import type { LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";

const capturedForm = readFileSync(new URL("./fixtures/pokernow-raise-live.html", import.meta.url), "utf8");
// Controlled six-seat variants of the ingested contracts, not a claimed new live capture.
// All timeline/proofs come through production ingestion and the real live adapter.
async function fixture(heroSeat = 4, variation = "normal", stateCandidates: Record<string, unknown> = {}) {
  let now = 1000;
  const stacks = 'Player stacks: ' + Array.from({ length: 6 }, (_, i) => `#${i + 1} "Player${i + 1} @ id${i + 1}" (200)`).join(" | ");
  const messages = ['-- starting hand #1', stacks,
    '"Player5 @ id5" posts a small blind of 1', '"Player6 @ id6" posts a big blind of 2',
    ...Array.from({ length: heroSeat - 1 }, (_, i) => `"Player${i + 1} @ id${i + 1}" folds`)];
  if (variation === "forced-only") messages.splice(4);
  if (variation === "limp") messages[4] = '"Player1 @ id1" calls 2';
  if (variation === "raise") messages[4] = '"Player1 @ id1" raises to 6';
  if (variation === "hero-action") messages.push(`"Player${heroSeat} @ id${heroSeat}" calls 2`);
  if (variation === "mapping-conflict") messages.push(stacks.replace('#1 "Player1 @ id1"', '#1 "Imposter @ other"'));
  if (variation === "mapping-missing") messages.splice(1, 1);
  const rows = messages.map((msg, i) => ({ msg, createdAt: String(10000 + i * 10) }));
  const runtime = createTimelineRuntime({ tableId: "table", sessionId: "integration", now: () => now,
    fetchLog: async () => new Response(JSON.stringify([...rows].reverse())) });
  const wire = (event: string, data: unknown) => "42" + JSON.stringify([event, data]);
  const registered = wire("registered", { gameState: { id: "table", hI: "h1", gN: 1, now: 100, ...stateCandidates }, currentPlayer: { id: `id${heroSeat}` } });
  const id = identityFromSocketPacket(registered, "table", null)!;
  runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "table", sequence: 1, connected: true, identity: id });
  const metadata = (packet: string, sequence: number, generation = 1) => runtime.accept({ channel: TIMELINE_CHANNEL,
    type: "source_metadata", tableId: "table", sequence, generation, metadata: inspectSocketMetadata(packet) });
  metadata(registered, 1);
  metadata(wire("gC", { pre: variation === "gap" ? 999 : 100, now: 110 }), 2);
  await runtime.tick();
  const { document } = parseHTML(capturedForm);
  document.querySelector("input.value")!.setAttribute("value", "5");
  document.querySelector(".bb-value")!.textContent = "2.5BB";
  if (variation === "no-control") document.querySelector("form")!.remove();
  const raw: LiveTableRead["raw"] = { boardCards: [], potMainValueText: "0", potTotalValueText: "3",
    seats: Array.from({ length: 6 }, (_, i) => ({ seatNumber: i + 1, isOccupied: true, isYou: i + 1 === heroSeat,
      playerNameText: `Player${i + 1}`, stackText: variation === "short" && i === 5 ? "194" : "200",
      statusClasses: i + 1 === heroSeat ? ["decision-current"] : i + 1 < heroSeat && variation !== "forced-only" ? ["fold"] : [],
      holeCardClassLists: i + 1 === heroSeat ? [["flipped", "card-d", "card-s-K"], ["flipped", "card-h", "card-s-Q"]] : [],
      betValueText: i === 4 ? "1" : i === 5 ? "2" : "0" })) };
  if (variation === "leave") raw.seats.pop();
  if (variation === "join") raw.seats.push({ ...raw.seats[0]!, seatNumber: 7, playerNameText: "New player", statusClasses: [] });
  if (variation === "hero-seat-mismatch") { raw.seats[heroSeat - 1]!.isYou = false; raw.seats[0]!.isYou = true; }
  const read = { raw, context: { blindTexts: ["1", "2"], dealerSeatNumber: 4, readErrors: [] },
    raiseControl: readRaiseControl(document, e => !e.closest("[hidden]")) } as LiveTableRead;
  const assessment = assessLiveState(raw, read.context);
  const snapshot = runtime.snapshot();
  const context = buildLivePreflopContext(assessment, emptyActionHistory(), snapshot)!;
  const preliminary = buildLiveDecisionProofs(read, assessment, snapshot, context, "decision-1");
  const hero = assessment.state!.seats.find(s => s.isYou)!;
  const packet: DecisionPacket = {
    hero: { position: assessment.positions.get(hero.seatNumber)!, holeCards: hero.holeCards as DecisionPacket["hero"]["holeCards"], stackBB: hero.stack! / 2 },
    table: { street: "preflop", board: [], potBB: null, numOpponentsRemaining: context.activeOpponents },
    preflop: context, facingAction: { type: "raise", amountBB: assessment.amountToCall! / 2 },
    candidateActions: ["FOLD", "CALL", "RAISE"], engineCalculations: {}, dataConfidence: assessment.confidence.level,
    potEvidence: { ...assessment.pot, bigBlind: 2 },
    preflopExecution: buildLivePreflopExecution(read, assessment, liveProofRevision(snapshot)),
  };
  packet.decisionProofs = buildLiveDecisionProofs(read, assessment, snapshot, context, "decision-1", packet).evidence;
  return { packet, preliminary, snapshot, read, runtime, wire, metadata,
    advance: () => { now += 4000; } };
}

describe("real adapter unopened activation boundary; no synthetic proof certificates", () => {
  it("cannot certify six dealt-in players/dealer or action coverage from socket field names", async () => {
    // Deliberately invented candidate contents test the trust boundary only.
    // No claim that these are actual PokerNow field structures or semantics.
    const candidates = { players: { id1: { seated: true, dealt: false } }, seats: ["id1", "id2", "id3", "id4", "id5", "id6"],
      dealerSeat: 4, dealerID: "id4", eventsData: [{ action: "posts", id: 1 }, { action: "hero_turn", id: 2 }],
      gT: 1, cPI: "id4", pITT: ["id1"], pASA: [], sPI: [], iHPI: [], cRPI: "id4" };
    const f = await fixture(4, "normal", candidates);
    const evidence = f.snapshot.sourceStatus.sourceMetadata.socketStateEvidence;
    expect(evidence.fields.filter(row => row.name !== "currentPlayer").every(row => row.availability === "name_and_type_only")).toBe(true);
    expect(evidence).toMatchObject({ provesRoster: false, provesPositions: false, provesActionWindow: false, provesRaiseLegality: false });
    expect(f.preliminary.unopened!.socketStateEvidence).toEqual(evidence);
    expect(evaluateDecisionPolicy(f.packet).activation).toMatchObject({ allowed: false,
      failedProofs: expect.arrayContaining(["roster", "position", "actionWindow", "raiseLegality"]) });
    expect(f.snapshot.current.events.some(e => e.evidence.includes("hero_turn"))).toBe(false);
    expect(f.snapshot.current.historyComplete).toBe(false);
  });
  it("source-reported hero voluntary action rejects unopened classification", async () => {
    const f = await fixture(4, "hero-action");
    expect(f.preliminary.unopened!.candidate).toBe(false);
    expect(f.packet.preflop!.actions).toContainEqual(expect.objectContaining({ seat: 4, action: "call" }));
    expect(evaluateDecisionPolicy(f.packet).chosenAction).toBeNull();
  });
  it("duplicate socket update cannot certify an eventsData action window", async () => {
    const f = await fixture();
    f.metadata(f.wire("gC", { pre: 100, now: 110, eventsData: [] }), 3);
    const snapshot = f.runtime.snapshot();
    expect(snapshot.sourceStatus.sourceMetadata.socketContinuity.status).toBe("incomplete");
    const proof = buildLiveDecisionProofs(f.read, assessLiveState(f.read.raw, f.read.context), snapshot, f.packet.preflop!, "later");
    expect(proof.activation.failedProofs).toEqual(expect.arrayContaining(["connection", "actionWindow"]));
    expect(proof.activation.allowed).toBe(false);
  });
  it.each([3, 4])("evaluates six-player CO/BTN seat %s using source rows without pretending they prove coverage", async seat => {
    const f = await fixture(seat);
    expect(f.preliminary.unopened).toMatchObject({ heroSeat: { status: "proven", seat }, listedPlayerCount: 6,
      dealerSeat: { status: "insufficient", sourceSeat: null, domSeatCrossCheck: 4 } });
    expect(f.preliminary.activation.requiredProofs).not.toEqual(expect.arrayContaining(["pot"]));
    expect(f.preliminary.activation.failedProofs).toEqual(expect.arrayContaining(["roster", "position", "actionWindow", "raiseLegality"]));
    expect(f.snapshot.current.historyComplete).toBe(false);
    const router: ModelRouter = { getRecommendation: vi.fn() };
    expect(await getPolicyRecommendation(f.packet, router, { mode: "fast" }, true)).toMatchObject({
      result: null, activation: { allowed: false }, decisionSource: "abstained" });
    expect(router.getRecommendation).not.toHaveBeenCalled();
    expect(f.packet.preflop!.actions.every(a => a.totalContributionBB === null)).toBe(true);
    expect(evaluateDecisionPolicy(f.packet).activation!.requiredProofs).not.toContain("accounting");
  });
  it("forced posts alone cannot prove that BTN's turn is unopened", async () => {
    const f = await fixture(4, "forced-only");
    expect(f.snapshot.current.events.map(e => e.action)).toEqual(["hand_start", "player_stacks", "post", "post"]);
    expect(f.preliminary.activation.failedProofs).toContain("actionWindow");
    expect(evaluateDecisionPolicy(f.packet).chosenAction).toBeNull();
  });
  it.each(["limp", "raise"])("uses source %s even if DOM bets look unopened", async variant => {
    const f = await fixture(4, variant);
    expect(f.preliminary.unopened!.candidate).toBe(false);
    expect(f.preliminary.unopened!.proofs.find(p => p.scope === "actionWindow")!.status).toBe("contradicted");
    expect(evaluateDecisionPolicy(f.packet).chosenAction).toBeNull();
  });
  it.each(["join", "leave", "mapping-conflict", "hero-seat-mismatch"])("rejects %s without repairing identity by display name", async variant => {
    const f = await fixture(4, variant);
    expect(f.preliminary.unopened!.proofs.find(p => p.scope === "roster")!.status).toBe("contradicted");
    expect(f.preliminary.activation.allowed).toBe(false);
  });
  it("does not certify a degraded mapping", async () => {
    const f = await fixture(4, "mapping-missing");
    expect(f.preliminary.unopened!.heroSeat.status).toBe("insufficient");
    expect(f.preliminary.activation.failedProofs).toContain("roster");
  });
  it("rejects <100BB effective against an active opponent", async () => {
    const f = await fixture(4, "short"); expect(f.preliminary.activation.failedProofs).toContain("stack");
  });
  it.each(["normal", "no-control"])("keeps exact 2.5BB legality unknown with %s controls", async variant => {
    const f = await fixture(4, variant);
    expect(f.packet.preflopExecution!.controls.selectedRaiseToBB).toBe(variant === "normal" ? 2.5 : null);
    expect(f.packet.preflopExecution!.raiseBounds).toBeUndefined();
    expect(f.preliminary.activation.failedProofs).toContain("raiseLegality");
    expect(f.preliminary.unopened!.raiseControl.reason).toContain("validation acknowledgment");
  });
  it.each(["hand", "generation", "cards"])("rejects stale %s binding produced by the adapter", async variant => {
    const f = await fixture();
    if (variant === "hand") f.packet.decisionProofs!.handId = "table:hand:h2";
    if (variant === "generation") f.packet.decisionProofs!.connectionGeneration = 2;
    if (variant === "cards") f.packet.hero.holeCards[0] = { rank: 14, suit: "c" };
    expect(evaluateDecisionPolicy(f.packet).activation).toMatchObject({ allowed: false, state: "unsafe", failedProofs: expect.arrayContaining(["decisionState"]) });
  });
  it("keeps an observed chain gap unsafe", async () => {
    const f = await fixture(4, "gap");
    expect(f.preliminary.activation).toMatchObject({ allowed: false, state: "unsafe", failedProofs: expect.arrayContaining(["connection"]) });
  });
  it("a reconnect starts a new generation without recovering source-window proof", async () => {
    const f = await fixture(), before = liveProofRevision(f.runtime.snapshot());
    f.metadata(f.wire("registered", { gameState: { now: 200 } }), 3, 2);
    const snapshot = f.runtime.snapshot();
    expect(liveProofRevision(snapshot)).not.toBe(before);
    const result = buildLiveDecisionProofs(f.read, assessLiveState(f.read.raw, f.read.context), snapshot, f.packet.preflop!, "decision-2");
    expect(result.evidence.connectionGeneration).toBe(2);
    expect(result.activation.failedProofs).toEqual(expect.arrayContaining(["connection", "actionWindow"]));
  });
});
