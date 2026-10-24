import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { assessLiveState } from "./liveState.js";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL, type HandIdentityEvidence } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { readCallControl } from "../../../apps/pokernow-extension/src/callControlRead.js";
import { flopCallEvidence } from "../../../apps/pokernow-extension/src/flopCallEvidence.js";
import { buildLiveDecisionProofs } from "../../../apps/pokernow-extension/src/decisionProofs.js";

const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
const frames = (): any[] => load("pokernow-flop-243").frames;
const activation = 1792832960591, expiry = activation + 10000;
afterEach(() => vi.restoreAllMocks());

function replay(fs = frames().slice(0, 20), markup = '<button type="button">Call 2</button>') {
  let now = 0, identity: HandIdentityEvidence | null = null, identitySequence = 0;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const runtime = createTimelineRuntime({ tableId: "TABLE_TEST", sessionId: "test", now: () => now,
    fetchLog: vi.fn(async () => new Response("[]")) });
  const accept = (f: any) => {
    now = f.localReceivedAt;
    const packet = "42" + JSON.stringify([f.event, f.payload]);
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId: "TABLE_TEST",
      sequence: f.localReceiveSequence, generation: f.connectionGeneration, observedAt: now,
      metadata: inspectSocketMetadata(packet), utgSource: projectFirstUtgSource(packet, identity?.heroPlayerId ?? null) });
    const next = identityFromSocketPacket(packet, "TABLE_TEST", identity);
    if (next && (!identity || next.handId !== identity.handId || next.chainGap !== identity.chainGap)) {
      runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "TABLE_TEST",
        sequence: ++identitySequence, connected: true, identity: next });
    }
    identity = next;
  };
  fs.forEach(accept);
  // Explicit synthetic synchronous DOM cross-check; no screenshot time/HTML is recovered.
  const read = load("utg-reader-cross-check").read;
  const stacks: Record<number, number> = { 1: 254, 2: 233, 3: 238, 5: 251, 9: 244, 10: 264 };
  for (const s of read.raw.seats) if (s.isOccupied) {
    s.isYou = s.seatNumber === 1;
    s.stackText = s.stackContainerText = String(stacks[s.seatNumber]);
    s.betValueText = [5, 9, 10].includes(s.seatNumber) ? "2" : "0";
    s.statusClasses = ["table-player", ...(s.isYou ? ["you-player", "decision-current"] : [])];
    if (s.isYou) s.holeCardClassLists = ["9d", "Qc"].map(c => ["card-container", `card-${c[1]}`, `card-s-${c[0]}`, "flipped"]);
  }
  read.context.dealerSeatNumber = 3;
  read.raw.boardCards = ["6h", "Qh", "3s"].map(c => ({ valueText: c[0], suitText: c[1] }));
  read.raw.potMainValueText = "12"; read.raw.potTotalValueText = "18";
  const control = (html = markup) => { read.callControl = readCallControl(parseHTML(html).document, el => !el.closest("[hidden]")); };
  control();
  const evidence = (timeline = runtime.snapshot(), epoch = "test-epoch") =>
    flopCallEvidence(read, assessLiveState(read.raw, read.context), timeline, epoch);
  return { runtime, read, accept, control, evidence, at: (t: number) => { now = t; },
    disconnect: () => runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "TABLE_TEST",
      sequence: ++identitySequence, connected: false, identity }) };
}

describe("hand243 independent cost, UI readiness and historical acceptance", () => {
  it("certifies source cost before acceptance while withholding permission and all decision blockers", () => {
    const f = replay(), e = f.evidence()!;
    expect(e).toMatchObject({ scope: "hand243_hj_flop_call2_cost",
      binding: { street: "flop", heroId: "PLAYER_1", heroSeat: 1, handId: "HAND_243",
        cursor: 1792832960494, activationSequence: 20, receivedAt: activation, expiresAt: expiry },
      actor: { playerId: "PLAYER_1", position: "HJ" },
      facts: { highestContributionChips: 2, priorContributionChips: 0, contributionGapChips: 2,
        remainingCapacityChips: 254, capacitySufficient: true, resultingContributionIfCalledChips: 2, remainingCapacityIfCalledChips: 252 },
      payableIfCallAuthorizedChips: { status: "proven", value: 2 }, ui: { status: "observed_matching" },
      serverLegality: { status: "unknown", value: null }, permission: null,
      fullActionSetCertified: false, liveRecommendationsAllowed: false, historyComplete: false });
    expect(f.runtime.snapshot().sourceStatus.historicalFlopAcceptance).toBeNull();
    const p = buildLiveDecisionProofs(f.read, assessLiveState(f.read.raw, f.read.context), f.runtime.snapshot(), null, "test-epoch");
    expect(p.postflopCall).toEqual(e); expect(p.callLegality).toBeNull(); expect(p.activation.allowed).toBe(false);
    for (const scope of ["actionWindow", "legalActions", "accounting", "pot", "reopening", "rangeInput", "equity", "terminal"])
      expect(p.evidence.proofs.find(p => p.scope === scope)?.status, scope).not.toBe("proven");
  });
  it.each([
    ["", "unobserved"], ['<button type="button" hidden>Call 2</button>', "unobserved"],
    ['<button type="button" disabled>Call 2</button>', "unusable"],
    ['<div inert><button type="button">Call 2</button></div>', "unusable"],
    ['<button type="button" aria-disabled="true">Call 2</button>', "unusable"],
    ['<button type="button">Call 3</button>', "contradicted"],
    ['<button type="button">Call 0</button>', "contradicted"],
    ['<button type="button" aria-label="Call 3">Call 2</button>', "contradicted"],
    ['<button type="button">Call 2</button><button type="button">Call 2</button>', "contradicted"],
    ['<button>Call 2</button>', "unusable"],
  ])("keeps source cost separate from control %s", (markup, status) => {
    const e = replay(undefined, markup).evidence()!;
    expect(e.payableIfCallAuthorizedChips).toMatchObject({ status: "proven", value: 2 });
    expect(e.ui.status).toBe(status); expect(e.permission).toBeNull();
  });
  it("does not require a control to derive source cost", () => {
    const f = replay(); delete f.read.callControl;
    expect(f.evidence()).toMatchObject({ payableIfCallAuthorizedChips: { value: 2 }, ui: { status: "unobserved" }, permission: null });
  });
  it("uses the explicit source reset for absent zero DOM totals", () => {
    const f = replay();
    for (const s of f.read.raw.seats) if (s.isOccupied && s.betValueText === "0") s.betValueText = null;
    expect(f.evidence()).toMatchObject({ payableIfCallAuthorizedChips: { value: 2 }, ui: { status: "observed_matching" }, permission: null });
  });
  it("retains source cost if a missing pot display prevents a usable DOM assessment", () => {
    const f = replay(); f.read.raw.potMainValueText = null; f.read.raw.potTotalValueText = null;
    expect(f.evidence()).toMatchObject({ payableIfCallAuthorizedChips: { value: 2 }, ui: { status: "unusable" }, permission: null });
  });
  it.each([activation - 1, activation - 10000, activation + 1, NaN])("rejects unusable control receipt %s", receipt => {
    const f = replay(); f.read.callControl.observedAt = receipt;
    expect(f.evidence()).toMatchObject({ payableIfCallAuthorizedChips: { value: 2 }, ui: { status: "unusable" }, permission: null });
  });
  it("expires a cached snapshot at the original deadline; fresh controls cannot renew it", () => {
    const f = replay(), snapshot = f.runtime.snapshot();
    f.at(activation - 1); expect(f.evidence(snapshot)).toBeNull();
    f.at(expiry - 1); f.control(); expect(f.evidence(snapshot)?.binding.expiresAt).toBe(expiry);
    f.at(expiry); f.control(); expect(f.evidence(snapshot)).toBeNull(); expect(f.evidence()).toBeNull();
    f.at(expiry + 5000); f.control(); expect(f.evidence(snapshot)).toBeNull();
  });
  it("accepted CALL at +13018ms and next activation never revive the opportunity", () => {
    const fs = frames(), f = replay(), old = f.runtime.snapshot();
    expect(fs[20].localReceivedAt - activation).toBe(13018);
    for (const frame of fs.slice(20)) {
      f.accept(frame); f.control(); expect(f.evidence()).toBeNull(); expect(f.evidence(old)).toBeNull();
      expect(f.runtime.snapshot().sourceStatus.historicalFlopAcceptance).toMatchObject({ originalHeroExpiresAt: expiry,
        acceptance: { action: "call", investmentChips: 2, receivedAt: activation + 13018 } });
      expect(f.runtime.snapshot().sourceStatus.historicalFlopAcceptance).not.toHaveProperty("expiresAt");
    }
  });
  const sourceMutations: Record<string, (fs: any[]) => void> = {
    "registered hero": fs => fs[0].payload.currentPlayer.id = "PLAYER_2",
    "current actor": fs => fs[19].payload.cPI = "PLAYER_2",
    "turn actor": fs => fs[19].payload.pITT = "PLAYER_2",
    "street": fs => fs[19].payload.gT = [1, 2],
    "highest wager": fs => fs[14].payload.cHB = 3,
    "opposing total": fs => fs[18].payload.tB.PLAYER_10 = 3,
    "prior hero contribution": fs => fs[19].payload.tB = { PLAYER_1: 1 },
    "stack shortage": fs => fs[13].payload.players.PLAYER_1.stack = 1,
    "activation capacity": fs => fs[19].payload.mAVTB = 1,
    "missing accounting boundary": fs => fs[1].payload.uncalledReturn = 0,
    "reconnect": fs => fs[19].connectionGeneration = 2,
    "receipt regression": fs => fs[19].localReceivedAt = fs[18].localReceivedAt - 1,
    "predecessor": fs => fs[19].payload.pre--,
  };
  it.each(Object.keys(sourceMutations))("rejects source contradiction: %s", name => {
    const fs = frames().slice(0, 20); sourceMutations[name]!(fs); expect(replay(fs).evidence()).toBeNull();
  });
  it.each(Array.from({ length: 20 }, (_, i) => i))("cannot derive cost with missing prefix frame %i", index => {
    const fs = frames().slice(0, 20); fs.splice(index, 1);
    fs.forEach((f, i) => { f.localReceiveSequence = i + 1; if (i) f.payload.pre = fs[i - 1].payload.now ?? fs[i - 1].payload.gameState?.now; });
    expect(replay(fs).evidence()).toBeNull();
  });
  const domMutations: Record<string, (r: any) => void> = {
    "wrong actor": r => { r.raw.seats[0].statusClasses = ["table-player", "you-player"]; },
    "wrong hero": r => r.raw.seats[0].isYou = false,
    "stack shortage": r => r.raw.seats[0].stackText = r.raw.seats[0].stackContainerText = "1",
    "wrong hero total": r => r.raw.seats[0].betValueText = "1",
    "wrong opponent total": r => r.raw.seats.find((s: any) => s.seatNumber === 5).betValueText = "3",
    "wrong street": r => r.raw.boardCards.push({ valueText: "A", suitText: "d" }),
    "wrong board": r => r.raw.boardCards[0].valueText = "7",
    "wrong cards": r => r.raw.seats[0].holeCardClassLists = [],
    "wrong dealer": r => r.context.dealerSeatNumber = 5,
    "read errors": r => r.context.readErrors.push("Unreadable actor"),
  };
  it.each(Object.keys(domMutations))("does not treat contradictory DOM as matching readiness: %s", name => {
    const f = replay(); domMutations[name]!(f.read);
    expect(f.evidence()).toMatchObject({ payableIfCallAuthorizedChips: { value: 2 },
      ui: { status: name === "read errors" ? "unusable" : "contradicted" }, permission: null });
  });
  it("does not extend to hand239, flop deal, preflop or empty epochs", () => {
    for (const count of [2, 4, 14, 19]) expect(replay(frames().slice(0, count)).evidence()).toBeNull();
    expect(replay(load("pokernow-flop-239").frames).evidence()).toBeNull();
    const f = replay(); expect(f.evidence(f.runtime.snapshot(), "")).toBeNull();
  });
  const bindingMutations: Record<string, (s: any) => void> = {
    "identity hand": s => s.sourceStatus.identity.handId = "OTHER",
    "identity hero": s => s.sourceStatus.identity.heroPlayerId = "PLAYER_2",
    "disconnected": s => s.sourceStatus.connected = false,
    "wrong source actor": s => s.sourceStatus.flopObservationProof.activation.playerId = "PLAYER_2",
    "wrong generation": s => s.sourceStatus.flopObservationProof.continuity.generation++,
    "wrong cursor": s => s.sourceStatus.flopObservationProof.continuity.cursor++,
    "wrong sequence": s => s.sourceStatus.flopObservationProof.continuity.throughSequence++,
    "renewed deadline": s => s.sourceStatus.flopObservationProof.expiresAt++,
    "capacity shortage": s => s.sourceStatus.flopObservationProof.accounting.flop.contributions.find((p: any) => p.playerId === "PLAYER_1").remainingCapacityChips = 1,
    "contradictory amount": s => s.sourceStatus.flopObservationProof.contributions.PLAYER_1 = 1,
    "missing accounting": s => delete s.sourceStatus.flopObservationProof.accounting,
  };
  it.each(Object.keys(bindingMutations))("rejects inconsistent dependent evidence: %s", name => {
    const f = replay(), snapshot = f.runtime.snapshot(); bindingMutations[name]!(snapshot);
    expect(f.evidence(snapshot)).toBeNull();
  });
  it("returns independent source facts for each epoch without retaining mutable proof results", () => {
    const f = replay(), snapshot = f.runtime.snapshot();
    const a = f.evidence(snapshot, "a")!, b = f.evidence(snapshot, "b")!;
    expect(a.binding.decisionEpoch).toBe("a"); expect(b.binding.decisionEpoch).toBe("b");
    a.binding.board[0] = "Ac"; a.facts.remainingCapacityChips = 1; a.payableIfCallAuthorizedChips.value = 999;
    expect(f.evidence(snapshot, "b")).toEqual(b);
  });
  it.each(["empty", "actor", "disconnect"])("invalidates cost on a synthetic %s tail", variant => {
    const f = replay(), last = frames()[19];
    if (variant === "disconnect") f.disconnect();
    else f.accept({ ...last, localReceiveSequence: 21, localReceivedAt: activation + 1,
      payload: { now: last.payload.now + 1, pre: last.payload.now,
        ...(variant === "actor" ? { cPI: "PLAYER_2", pITT: "PLAYER_2" } : {}) } });
    f.control(); expect(f.evidence()).toBeNull();
  });
});
