import { describe, expect, it } from "vitest";
import { assessLiveState } from "./liveState.js";
import type { RawTableInput } from "./gameState.js";
import { buildLiveDecisionProofs, liveProofRevision, activationLabel } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import type { LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";

// Raw-value scaffolds exercise existing parsers; they do not certify additional live DOM or pot semantics.
function readFixture(): LiveTableRead {
  const raw: RawTableInput = { potMainValueText: "10", potTotalValueText: "14", boardCards: [
    { valueText: "2", suitText: "s" }, { valueText: "8", suitText: "s" }, { valueText: "8", suitText: "d" }], seats: [
    { seatNumber: 1, isOccupied: true, isYou: true, playerNameText: "Hero", stackText: "40", statusClasses: ["decision-current"],
      holeCardClassLists: [["flipped", "card-h", "card-s-Q"], ["flipped", "card-c", "card-s-T"]], betValueText: "check" },
    { seatNumber: 2, isOccupied: true, isYou: false, playerNameText: "Opponent", stackText: "40", statusClasses: [], holeCardClassLists: [], betValueText: "4" },
  ] };
  // Only raw/context are consumed here; no synthetic element structure is presented as observed.
  return { raw, context: { blindTexts: ["1", "2"], dealerSeatNumber: 1, readErrors: [] } } as LiveTableRead;
}
function sourceFixture() {
  let now = 1000;
  const source = createTimelineRuntime({ tableId: "table", sessionId: "test", now: () => now,
    fetchLog: async () => new Response(JSON.stringify([{ createdAt: "11000", msg: '"Hero @ hero" checks' }])) });
  const wire = (event: string, payload: unknown) => "42" + JSON.stringify([event, payload]);
  const registered = wire("registered", { gameState: { id: "table", hI: "h1", gN: 1, now: 100 } });
  source.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "table", sequence: 1, connected: true,
    identity: identityFromSocketPacket(registered, "table", null) });
  const metadata = (packet: string, sequence: number, generation = 1) => source.accept({ channel: TIMELINE_CHANNEL,
    type: "source_metadata", tableId: "table", sequence, generation, metadata: inspectSocketMetadata(packet) });
  metadata(registered, 1);
  metadata(wire("gC", { pre: 100, now: 110 }), 2);
  return { source, wire, metadata, advance: () => { now += 4000; } };
}
const assess = (read: LiveTableRead, source: ReturnType<typeof sourceFixture>["source"] | null = null) =>
  buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), source?.snapshot() ?? null, null, "local-epoch");

describe("live scoped proof projection", () => {
  it("reuses verified call-gap/stack/blind facts while keeping pot/window/eligibility unknown", () => {
    const { source } = sourceFixture();
    const result = assess(readFixture(), source);
    const fact = (scope: string) => result.evidence.proofs.find(p => p.scope === scope)!;
    for (const scope of ["decisionState", "callCost", "stack", "blinds", "connection"]) expect(fact(scope).status).toBe("proven");
    for (const scope of ["pot", "actionWindow", "eligibility", "accounting", "legalActions", "equity"]) expect(fact(scope).status).toBe("insufficient");
    expect(result.activation.allowed).toBe(false);
    expect(source.snapshot().current.historyComplete).toBe(false);
  });
  it("blocks check/bet with a zero call gap instead of inventing a betting model", () => {
    const read = readFixture(); read.raw.seats[1]!.betValueText = "check"; read.raw.potTotalValueText = "10";
    const result = assess(read);
    expect(result.activation.supportedDecisionType).toBe("heads_up_bet_check");
    expect(result.activation.failedProofs).toEqual(expect.arrayContaining(["pot", "raiseLegality", "terminal"]));
  });
  it("recovers a previously missing call value without retaining the earlier failure", () => {
    const read = readFixture(); read.raw.seats[1]!.betValueText = "call";
    expect(assess(read).activation.failedProofs).toContain("callCost");
    read.raw.seats[1]!.betValueText = "4";
    expect(assess(read).activation.failedProofs).not.toContain("callCost");
    read.raw.potTotalValueText = "999";
    expect(assess(read).activation).toMatchObject({ allowed: false, state: "unsafe", failedProofs: expect.arrayContaining(["pot"]) });
  });
  it("preserves settlement blocking and ordinary-stack recovery without adding prizes", () => {
    const read = readFixture(); read.raw.seats[1]!.stackIsSettlement = true;
    expect(assess(read).activation.state).toBe("unsafe");
    read.raw.seats[1]!.stackIsSettlement = false;
    expect(assess(read).evidence.proofs.find(p => p.scope === "stack")!.status).toBe("proven");
  });
  it("leaves short all-in reopening, eligibility and side-pot accounting unproven", () => {
    const read = readFixture(); read.raw.seats[1]!.stackText = "All In";
    const result = assess(read);
    expect(result.activation.failedProofs).toEqual(expect.arrayContaining(["reopening", "eligibility", "accounting", "stack"]));
    expect(result.activation.allowed).toBe(false);
  });
  it("blocks multiway postflop separately from temporary missing proofs", () => {
    const read = readFixture(); read.raw.seats.push({ ...read.raw.seats[1]!, seatNumber: 3, playerNameText: "Other", betValueText: "check" });
    expect(assess(read).activation).toMatchObject({ allowed: false, state: "unsupported", supportedDecisionType: "multiway_postflop" });
  });
  it("retains the observed return and its unresolved pot effect without mutating accounting", async () => {
    const source = createTimelineRuntime({ tableId: "table", sessionId: "test", now: () => 1000,
      fetchLog: async () => new Response(JSON.stringify([{ createdAt: "10", msg: 'Uncalled bet of 4 returned to "Opponent @ opp"' }])) });
    const packet = '42["registered",{"gameState":{"id":"table","hI":"h1","gN":1,"now":100}}]';
    source.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "table", sequence: 1, connected: true, identity: identityFromSocketPacket(packet, "table", null) });
    await source.tick();
    const before = JSON.stringify(source.snapshot().current.accounting);
    const result = assess(readFixture(), source);
    expect(result.evidence.proofs.find(p => p.scope === "accounting")!.reasons.join(" ")).toContain("uncalled return");
    expect(JSON.stringify(source.snapshot().current.accounting)).toBe(before);
    expect(source.snapshot().current.historyComplete).toBe(false);
  });
  it("invalidates the proof revision on gaps and reconnects even with unchanged DOM", () => {
    const f = sourceFixture(), before = liveProofRevision(f.source.snapshot());
    f.metadata(f.wire("gC", { pre: 999, now: 120 }), 3);
    expect(liveProofRevision(f.source.snapshot())).not.toBe(before);
    expect(assess(readFixture(), f.source).activation.state).toBe("unsafe");
    f.metadata(f.wire("registered", { gameState: { now: 200 } }), 4, 2);
    const result = assess(readFixture(), f.source);
    expect(result.evidence.connectionGeneration).toBe(2);
    expect(result.activation.allowed).toBe(false);
    expect(result.evidence.proofs.find(p => p.scope === "connection")!.status).toBe("insufficient");
  });
  it("invalidates on new log evidence but does not churn solely for identical response refreshes", async () => {
    const f = sourceFixture(), before = liveProofRevision(f.source.snapshot());
    await f.source.tick();
    const after = liveProofRevision(f.source.snapshot()); expect(after).not.toBe(before);
    f.advance(); await f.source.tick();
    expect(liveProofRevision(f.source.snapshot())).toBe(after);
  });
  it("does not repair a same-hand disconnect merely because the new generation links", () => {
    const f = sourceFixture();
    f.source.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "table", sequence: 2, connected: false, identity: null });
    const wire = f.wire("registered", { gameState: { id: "table", hI: "h1", gN: 1, now: 200 } });
    f.source.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "table", sequence: 3, connected: true,
      identity: identityFromSocketPacket(wire, "table", null) });
    f.metadata(wire, 3, 2); f.metadata(f.wire("gC", { pre: 200, now: 210 }), 4, 2);
    expect(f.source.snapshot().sourceStatus.sourceMetadata.socketContinuity.status).toBe("observed_continuous");
    const result = assess(readFixture(), f.source);
    expect(result.activation).toMatchObject({ allowed: false, state: "unsafe", failedProofs: expect.arrayContaining(["connection"]) });
  });
  it("keeps contradictory source seat mappings unsafe without using names to repair them", () => {
    const f = sourceFixture();
    const timeline = f.source.snapshot();
    timeline.current.seatMapping.status = "invalid";
    timeline.current.seatMapping.reasons = ["Conflicting player IDs for seat 1"];
    const read = readFixture();
    const result = buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), timeline, null, "epoch");
    expect(result.activation).toMatchObject({ allowed: false, state: "unsafe", failedProofs: expect.arrayContaining(["eligibility"]) });
  });
  it("distinguishes usable-proof, unsupported, waiting and unsafe labels", () => {
    expect(activationLabel("proof_ready")).toContain("evaluating");
    expect(activationLabel("unsupported")).toBe("Unsupported situation");
    expect(activationLabel("waiting_for_proof")).toContain("Waiting");
    expect(activationLabel("unsafe")).toContain("unsafe");
  });
});
