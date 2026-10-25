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
import { liveProofRevision } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { decisionFingerprint } from "../../../apps/pokernow-extension/src/requestIdentity.js";
import { capturePostflopReadiness } from "../../../apps/pokernow-extension/src/postflopReadinessCapture.js";
import { capturePostflopObservation } from "../../../apps/pokernow-extension/src/postflopObservationCapture.js";
import { RawSocketCapture } from "../../../apps/pokernow-extension/src/rawSocketCapture.js";
import { RaiseEvidenceCollector } from "../../../apps/pokernow-extension/src/raiseEvidenceCapture.js";

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

describe("development-only paired postflop readiness capture", () => {
  function paired(markup?: string) {
    const f = replay(undefined, markup), url = "https://www.pokernow.com/games/TABLE_TEST";
    const epoch = { decisionEpoch: "7", stateJson: JSON.stringify([
      decisionFingerprint(url, f.read.raw, f.read.context, f.read.raiseControl), liveProofRevision(f.runtime.snapshot()),
    ]) };
    const d = { snapshot: vi.fn(() => f.runtime.snapshot()), read: vi.fn(() => { f.control(markup); return f.read; }),
      epoch: vi.fn(() => ({ ...epoch })), tableUrl: vi.fn(() => url), now: () => Date.now() };
    const raw = new RawSocketCapture(true);
    for (const frame of frames().slice(0, 20)) raw.observe("42" + JSON.stringify([frame.event, frame.payload]), frame.connectionGeneration, frame.localReceivedAt);
    const source = vi.fn(async () => ({ source: null, error: null, postflop: capturePostflopReadiness(d) }));
    const raiseDOM = vi.fn(), disarm = vi.fn();
    const collector = new RaiseEvidenceCollector(true, { raw, dom: raiseDOM, source, tableUrl: d.tableUrl,
      now: d.now, monotonic: () => 123, disarm });
    return { ...f, d, epoch, raw, source, raiseDOM, collector, disarm, capture: () => capturePostflopReadiness(d),
      export: () => JSON.parse(collector.exportJSON()) };
  }
  it("brackets a fresh real source prefix and simulated DOM with the existing epoch/deadline", async () => {
    const f = paired(), before = f.runtime.snapshot();
    expect(await f.collector.checkpoint("postflop_call")).toMatchObject({ accepted: true, retained: true, readinessMatched: true, reasons: [] });
    const exported = f.export(), cp = exported.checkpoints[0], pair = cp.postflop;
    expect(pair).toMatchObject({ readinessMatched: true, authoritative: false, legalityCertified: false,
      historyComplete: false, contestablePotCertified: false, liveRecommendationsAllowed: false,
      binding: { decisionEpoch: "7", handId: "HAND_243", heroId: "PLAYER_1", street: "flop", generation: 1, expiresAt: expiry },
      startedAt: activation, completedAt: activation,
      read: { callControl: { observedAt: activation, amountChips: 2, enabled: true, visibleCount: 1 } } });
    expect(pair.before).toEqual(pair.after);
    expect(pair.before.sourceState).toMatchObject({ localBridgeSequence: 20, generation: 1,
      fields: { cPI: "PLAYER_1", pITT: "PLAYER_1", gT: [1, 1], now: 1792832960494 } });
    expect(cp.rawRecorderBefore).toEqual(cp.rawRecorderAfter);
    expect(cp.rawRecorderBefore.lastRetainedFrame.sourceCursor).toBe(pair.binding.cursor);
    expect(exported.rawSocket.frames).toEqual(frames().slice(0, 20));
    expect(f.runtime.snapshot()).toEqual(before); expect(f.epoch.decisionEpoch).toBe("7");
    expect(f.raiseDOM).not.toHaveBeenCalled(); expect(f.disarm).toHaveBeenCalledOnce();
  });
  it.each([
    ['<button type="button" disabled>Call 2</button>', false, 2],
    ['<button type="button" aria-disabled="true">Call 2</button>', false, 2],
    ['<div inert><button type="button">Call 2</button></div>', false, 2],
    ['<button type="button">Call 3</button>', true, 3],
    ['<button type="button" hidden>Call 2</button>', null, null],
    ["", null, null],
    ['<button type="button">Call 2</button><button type="button">Call 2</button>', null, null],
  ] as const)("retains but rejects unavailable/contradictory control: %s", async (markup, enabled, amountChips) => {
    const f = paired(markup);
    expect(await f.collector.checkpoint("postflop_call")).toMatchObject({ accepted: false, retained: true, readinessMatched: false });
    const cp = f.export().checkpoints[0];
    expect(cp.postflop.read.callControl).toMatchObject({ enabled, amountChips, observedAt: activation });
    expect(cp.legalityCertified).toBe(false); expect(cp.postflop.evidence.permission).toBeNull();
  });
  it.each(["epoch", "not-polled", "actor", "street", "amount", "stack", "hand", "generation", "deadline", "cursor"])(
    "rejects mismatched %s without advancing the epoch or source", variant => {
      const f = paired();
      if (variant === "epoch") f.d.epoch.mockReturnValueOnce({ ...f.epoch, decisionEpoch: "6" });
      if (variant === "not-polled") f.epoch.stateJson = "old poll";
      if (variant === "actor") f.read.raw.seats[0].statusClasses = ["table-player", "you-player"];
      if (variant === "street") f.read.raw.boardCards.push({ valueText: "A", suitText: "h" });
      if (variant === "amount") f.read.raw.seats[0].betValueText = "1";
      if (variant === "stack") f.read.raw.seats[0].stackText = f.read.raw.seats[0].stackContainerText = "1";
      if (["hand", "generation", "deadline", "cursor"].includes(variant)) {
        const s = f.runtime.snapshot();
        if (variant === "hand") s.sourceStatus.identity!.handId = "OTHER";
        if (variant === "generation") s.sourceStatus.firstUtgEvidence.carriedState!.generation++;
        if (variant === "cursor") s.sourceStatus.firstUtgEvidence.carriedState!.projection.frame.now++;
        if (variant === "deadline") s.sourceStatus.flopObservationProof!.expiresAt++;
        f.d.snapshot.mockReturnValue(s);
      }
      expect(f.capture().readinessMatched).toBe(false); expect(f.epoch.decisionEpoch).toBe("7");
    });
  it.each(["pre-activation", "stale-control", "future-control", "during-expiry", "clock-regression"])("rejects invalid timing: %s", variant => {
    const f = paired();
    if (variant === "pre-activation") f.at(activation - 1);
    f.d.read.mockImplementation(() => {
      f.control();
      if (variant === "stale-control") f.read.callControl.observedAt--;
      if (variant === "future-control") f.read.callControl.observedAt++;
      if (variant === "during-expiry") f.at(expiry);
      if (variant === "clock-regression") f.at(activation - 1);
      return f.read;
    });
    expect(f.capture().readinessMatched).toBe(false);
  });
  it("retains the original deadline on repeated capture, then rejects expiry and historical acceptance", async () => {
    const f = paired();
    f.at(expiry - 1); expect(await f.collector.checkpoint("postflop_call")).toMatchObject({ accepted: true });
    f.at(expiry); expect(await f.collector.checkpoint("postflop_call")).toMatchObject({ accepted: false });
    f.accept(frames()[20]); expect(await f.collector.checkpoint("postflop_call")).toMatchObject({ accepted: false });
    const rows = f.export().checkpoints;
    expect(rows[0].postflop.binding.expiresAt).toBe(expiry);
    expect(rows[1].postflop.binding).toBeNull(); expect(rows[2].postflop.binding).toBeNull();
    expect(f.runtime.snapshot().sourceStatus.historicalFlopAcceptance?.originalHeroExpiresAt).toBe(expiry);
  });
  it("rejects source advancement during the synchronous read", () => {
    const f = paired(), last = frames()[19];
    f.d.read.mockImplementation(() => {
      f.accept({ ...last, localReceiveSequence: 21, localReceivedAt: activation + 1,
        payload: { pre: last.payload.now, now: last.payload.now + 1 } });
      f.control(); return f.read;
    });
    expect(f.capture().readinessMatched).toBe(false);
  });
  it.each(["new-frame", "late-reply", "stale-reply", "wrong-cursor", "wrong-generation", "rejected-frame", "no-registration", "stopped", "wrong-url", "missing-reply"])(
    "rejects outer recorder/bridge mismatch: %s", async variant => {
      const f = paired(), pair = f.capture();
      if (variant === "wrong-cursor") f.raw.observe('42["gC",{"now":123}]', 1, activation);
      if (variant === "wrong-generation") f.raw.observe('42["gC",{"now":1792832960494}]', 2, activation);
      if (variant === "rejected-frame") f.raw.observe('42["gC",', 1, activation);
      if (variant === "no-registration") vi.spyOn(f.raw, "status").mockReturnValue({ ...f.raw.status(), registeredCaptured: false });
      if (variant === "stale-reply") f.at(activation + 1);
      if (variant === "stopped") f.raw.stop();
      f.source.mockImplementation(async () => {
        if (variant === "new-frame") f.raw.observe('42["gC",{"now":123}]', 1, activation);
        if (variant === "late-reply") f.at(expiry);
        if (variant === "wrong-url") f.d.tableUrl.mockReturnValue("https://www.pokernow.com/games/OTHER");
        return variant === "missing-reply" ? { source: null, error: null, postflop: null as any } : { source: null, error: null, postflop: pair };
      });
      expect(await f.collector.checkpoint("postflop_call")).toMatchObject({ accepted: false, retained: true });
      expect(f.export().checkpoints[0].readinessMatched).toBe(false);
    });
  it("does not assume raw recorder and source bridge local sequence numbers are interchangeable", async () => {
    const f = paired();
    // A distinct raw-only earlier frame can shift the local raw index. Cursor
    // and generation still bind the last frame; raw records remain reviewable.
    const shifted = new RawSocketCapture(true);
    shifted.observe('42["rup",{}]', 1, activation - 100000);
    for (const frame of frames().slice(0, 20)) shifted.observe("42" + JSON.stringify([frame.event, frame.payload]), 1, frame.localReceivedAt);
    const c = new RaiseEvidenceCollector(true, { raw: shifted, dom: f.raiseDOM, source: f.source,
      tableUrl: f.d.tableUrl, now: Date.now, monotonic: () => 0, disarm: vi.fn() });
    expect(await c.checkpoint("postflop_call")).toMatchObject({ accepted: true });
    expect(JSON.parse(c.exportJSON()).checkpoints[0].rawRecorderAfter.frameCount).toBe(21);
  });
  it("rejects a stable different table URL even if its DOM fingerprint was polled", async () => {
    const f = paired(), url = "https://www.pokernow.com/games/OTHER";
    f.d.tableUrl.mockReturnValue(url);
    f.epoch.stateJson = JSON.stringify([
      decisionFingerprint(url, f.read.raw, f.read.context, f.read.raiseControl), liveProofRevision(f.runtime.snapshot()),
    ]);
    expect(await f.collector.checkpoint("postflop_call")).toMatchObject({ accepted: false, retained: true, reasons: ["Table URL mismatch."] });
  });
});

describe("general postflop observation capture (synthetic UI/source variants)", () => {
  function fixture(certified = false) {
    const fs = frames().slice(0, 20);
    if (!certified) for (const entry of fs) {
      const frame = entry.payload.gameState ?? entry.payload;
      if (frame.pC?.PLAYER_1?.cards) frame.pC.PLAYER_1.cards = [{ value: "As", showing: false }, { value: "Kd", showing: false }];
      if (frame.oTC?.["1"]?.length === 3) frame.oTC["1"] = ["Ah", "7c", "2s"];
      if (frame.players) for (const player of Object.values(frame.players) as any[]) if (typeof player.stack === "number") player.stack += 50;
    }
    const f = replay(fs), url = "https://www.pokernow.com/games/TABLE_TEST";
    if (!certified) {
      f.read.raw.boardCards = ["Ah", "7c", "2s"].map(c => ({ valueText: c[0], suitText: c[1] }));
      for (const s of f.read.raw.seats) if (s.isOccupied) s.stackText = s.stackContainerText = String(Number(s.stackText) + 50);
      f.read.raw.seats[0].holeCardClassLists = ["As", "Kd"].map(c => ["card-container", `card-${c[1]}`, `card-s-${c[0]}`, "flipped"]);
    }
    const epoch = { decisionEpoch: "7", stateJson: JSON.stringify([
      decisionFingerprint(url, f.read.raw, f.read.context, f.read.raiseControl), liveProofRevision(f.runtime.snapshot()),
    ]) };
    const d = { snapshot: vi.fn(() => f.runtime.snapshot()), read: vi.fn(() => { f.control(); return f.read; }),
      epoch: vi.fn(() => ({ ...epoch })), tableUrl: vi.fn(() => url), now: () => Date.now() };
    const raw = new RawSocketCapture(true);
    for (const entry of fs) raw.observe("42" + JSON.stringify([entry.event, entry.payload]), 1, entry.localReceivedAt);
    const source = vi.fn(async (): Promise<any> => ({ source: null, error: null, observation: capturePostflopObservation(d) }));
    const dom = vi.fn(), disarm = vi.fn();
    const collector = new RaiseEvidenceCollector(true, { raw, dom, source, tableUrl: d.tableUrl, now: d.now, monotonic: () => 0, disarm });
    return { ...f, fs, d, epoch, raw, source, collector, dom, disarm, capture: () => capturePostflopObservation(d),
      export: () => JSON.parse(collector.exportJSON()) };
  }
  it("pairs different cards, board and stacks without certifying the profile or modifying authority", async () => {
    const f = fixture(), before = f.runtime.snapshot();
    expect(await f.collector.checkpoint("postflop_observation")).toMatchObject({ accepted: true, retained: true,
      observationPaired: true, profile: "unsupported_or_uncertified" });
    const cp = f.export().checkpoints[0];
    expect(cp.observation).toMatchObject({ sourceVerifiedFacts: null, permission: null, liveRecommendationsAllowed: false,
      unverifiedObservations: { board: ["Ah", "7c", "2s"], callReadiness: "observed_enabled", ui: { callControl: { amountChips: 2 } } },
      epochBefore: { decisionEpoch: "7" } });
    expect(cp.rawSourceObservations.fields.oTC.value).toEqual({ "1": ["Ah", "7c", "2s"] });
    expect(cp.rawSourceObservations.contributionPatches.length).toBeGreaterThan(0);
    expect(f.runtime.snapshot()).toEqual(before); expect(f.epoch.decisionEpoch).toBe("7");
    expect(f.evidence()).toBeNull(); expect(capturePostflopReadiness(f.d).readinessMatched).toBe(false);
    expect(f.dom).not.toHaveBeenCalled(); expect(f.disarm).toHaveBeenCalledOnce();
  });
  it.each(["board", "actor", "street", "hand", "hero", "contribution", "gap", "disconnect", "stale-carried", "epoch", "no-epoch", "source-change", "clock", "stale-ui", "future-ui", "stale-source"])(
    "retains and rejects %s", async variant => {
      const f = fixture(), s = f.runtime.snapshot(), frame = s.sourceStatus.firstUtgEvidence.carriedState!.projection.frame;
      if (variant === "board") frame.oTC["1"] = ["Ac", "7c", "2s"];
      if (variant === "actor") frame.pITT = "PLAYER_2";
      if (variant === "street") frame.gT = [1, 2];
      if (variant === "hand") frame.hI = "OTHER";
      if (variant === "hero") s.sourceStatus.identity!.heroPlayerId = "PLAYER_2";
      if (variant === "contribution") frame.tB.PLAYER_9 = 100;
      if (variant === "gap") s.sourceStatus.sourceMetadata.socketContinuity.chainGap = true;
      if (variant === "disconnect") s.sourceStatus.connected = false;
      if (variant === "stale-carried") s.sourceStatus.firstUtgEvidence.carriedState!.sequence--;
      f.d.snapshot.mockReturnValue(s);
      if (variant === "epoch") f.epoch.stateJson = "old poll";
      if (variant === "no-epoch") f.epoch.stateJson = null as any;
      if (variant === "source-change") f.d.snapshot.mockReturnValueOnce(f.runtime.snapshot()).mockReturnValue({ ...s, sourceStatus: { ...s.sourceStatus, connected: false } });
      if (variant === "stale-source") f.at(activation + 10000);
      f.d.read.mockImplementation(() => {
        f.control();
        if (variant === "clock") f.at(activation - 1);
        if (variant === "stale-ui") f.read.callControl.observedAt--;
        if (variant === "future-ui") f.read.callControl.observedAt++;
        return f.read;
      });
      expect(await f.collector.checkpoint("postflop_observation")).toMatchObject({ accepted: false, retained: true, observationPaired: false });
      expect(f.export().checkpoints[0].reasons.length).toBeGreaterThan(0);
    });
  it.each(["disabled", "missing", "duplicate", "aria", "unsupported"])("labels CALL %s without inventing legality", variant => {
    const f = fixture();
    const markup = { disabled: '<button type="button" disabled>Call 2</button>', missing: '',
      duplicate: '<button type="button">Call 2</button><button type="button">Call 2</button>',
      aria: '<button type="button" aria-label="Call 3">Call 2</button>', unsupported: '<input type="button" value="Call 2">' };
    f.d.read.mockImplementation(() => { f.control(markup[variant as keyof typeof markup]); return f.read; });
    expect(f.capture()).toMatchObject({ permission: null, legalityCertified: false,
      unverifiedObservations: { callReadiness: "unavailable" } });
  });
  it("retains unsupported partial source projections without promoting them to facts", async () => {
    const f = fixture(), s = f.runtime.snapshot(); s.sourceStatus.firstUtgEvidence.carriedState = null;
    f.d.snapshot.mockReturnValue(s);
    const result = await f.collector.checkpoint("postflop_observation");
    expect(result).toMatchObject({ retained: true });
    const cp = f.export().checkpoints[0];
    expect(cp.observation.sourceVerifiedFacts).toBeNull(); expect(cp.observation.unverifiedObservations.source).toBeNull();
    expect(cp.observation.limitations.join(" ")).toContain("partial, unverified");
    expect(cp.rawSourceObservations.fields.cPI.value).toBe("PLAYER_1");
  });
  it.each(["raw-update", "raw-stopped", "rejected-frame", "wrong-cursor", "wrong-generation", "no-registration", "late-reply", "missing-reply", "url"])(
    "rejects outer %s", async variant => {
      const f = fixture(), pair = f.capture();
      if (variant === "raw-stopped") f.raw.stop();
      if (variant === "rejected-frame") f.raw.observe('42["gC",', 1, activation);
      if (variant === "wrong-cursor") f.raw.observe('42["gC",{"now":1}]', 1, activation);
      if (variant === "wrong-generation") f.raw.observe('42["gC",{"now":1792832960494}]', 2, activation);
      if (variant === "no-registration") vi.spyOn(f.raw, "status").mockReturnValue({ ...f.raw.status(), registeredCaptured: false });
      f.source.mockImplementation(async () => {
        if (variant === "raw-update") f.raw.observe('42["gC",{"now":1}]', 1, activation);
        if (variant === "late-reply") f.at(activation + 750);
        if (variant === "url") f.d.tableUrl.mockReturnValue("https://www.pokernow.com/games/OTHER");
        return { source: null, error: null, observation: variant === "missing-reply" ? null : pair };
      });
      expect(await f.collector.checkpoint("postflop_observation")).toMatchObject({ accepted: false, retained: true });
    });
  it("copies original certified deadlines and cannot renew them at reply or later capture", async () => {
    const f = fixture(true); f.at(expiry - 1);
    const pair = f.capture();
    expect(pair.sourceVerifiedFacts?.proof.expiresAt).toBe(expiry);
    f.source.mockImplementation(async () => { f.at(expiry); return { source: null, error: null, observation: pair }; });
    expect(await f.collector.checkpoint("postflop_observation")).toMatchObject({ accepted: false, retained: true });
    f.source.mockImplementation(async () => ({ source: null, error: null, observation: f.capture() }));
    expect(await f.collector.checkpoint("postflop_observation")).toMatchObject({ accepted: false, retained: true });
    expect(f.capture().sourceVerifiedFacts).toBeNull(); expect(f.runtime.snapshot().sourceStatus.flopObservationProof).toBeNull();
  });
  it("labels reconnects without claiming continuity with an earlier generation", () => {
    const f = fixture(), s = f.runtime.snapshot();
    s.sourceStatus.sourceMetadata.socket.at(-1)!.localConnectionGeneration = 2;
    f.d.snapshot.mockReturnValue(s);
    expect(f.capture().limitations.join(" ")).toContain("Reconnect generation");
  });
});
