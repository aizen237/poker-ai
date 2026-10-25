import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFirstUtgSource, projectFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";
import { hjPatchKind } from "../../../apps/pokernow-extension/src/hjWindow.js";
import { assessLiveState } from "./liveState.js";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL, type HandIdentityEvidence } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { capturePostflopObservation } from "../../../apps/pokernow-extension/src/postflopObservationCapture.js";
import { buildLiveDecisionProofs, liveProofRevision } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { decisionFingerprint } from "../../../apps/pokernow-extension/src/requestIdentity.js";

const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
const frames = (): any[] => load("pokernow-flop-248").frames;
const checkpoint = () => load("pokernow-flop-248-checkpoint").checkpoint;
const activation = 1792933814275, expiry = activation + 10000;
function replay(fs = frames(), change?: (p: any, f: any) => void) {
  let now = 0, hero: string | null = null;
  const source = createFirstUtgSource("TABLE_TEST", () => now);
  const accept = (f: any) => {
    now = f.localReceivedAt;
    const p = projectFirstUtgSource("42" + JSON.stringify([f.event, f.payload]), hero);
    change?.(p, f); hero = p?.heroId ?? hero;
    source.accept(p, f.localReceiveSequence, f.connectionGeneration, now);
  };
  fs.forEach(accept);
  return { source, accept, at: (t: number) => { now = t; } };
}
afterEach(() => vi.restoreAllMocks());

describe("real hand248 bounded source opportunity, independent of diagnostic pairing", () => {
  it("retains the complete continuous prefix and fresh CO identity without splicing another hand", () => {
    const fs = frames();
    expect(fs).toHaveLength(32);
    fs.forEach((f, i) => {
      expect(f.localReceiveSequence).toBe(i + 1); expect(f.connectionGeneration).toBe(1);
      if (i) {
        expect(f.payload.pre).toBe((fs[i - 1].payload.gameState ?? fs[i - 1].payload).now);
        expect(f.payload.now).toBeGreaterThan(f.payload.pre);
        expect(f.localReceivedAt).toBeGreaterThan(fs[i - 1].localReceivedAt);
      }
    });
    const p = replay(fs.slice(0, 22)).source.flopProof()!;
    expect(p).toMatchObject({ scope: "flop_transition", anchor: { sequence: 10, receivedAt: 1792933771816 },
      witness: { heroId: "PLAYER_1", heroSeat: 1, handId: "HAND_248", handNumber: 248, heroCards: ["2s", "7s"] },
      continuity: { baselineSequence: 1, throughSequence: 22, generation: 1 },
      transition: { sequence: 22, receivedAt: 1792933794299, board: ["3s", "7d", "2d"], observedPotChips: 12 },
      activation: { playerId: "PLAYER_3" }, expiresAt: 1792933804299 });
    expect(p.witness.players.map(p => [p.seat, p.position, p.sourceStack])).toEqual([
      [2, "BTN", 230], [3, "SB", 230], [5, "BB", 243], [9, "UTG", 236], [10, "HJ", 255], [1, "CO", 308],
    ]);
    expect(Object.values(p.transition.clearedContributions)).toEqual(Array(6).fill(2));
    expect(Object.values(p.contributions)).toEqual(Array(6).fill(0));
  });
  it("uses the explicit SB actor despite its absent capacity field, without widening preflop permissions", () => {
    const fs = frames(); expect(fs[17].payload).not.toHaveProperty("mAVTB");
    expect(hjPatchKind(fs[17].payload)).toBeNull();
    expect(replay(fs.slice(0, 30)).source.flopProof()?.activation.sequence).toBe(30);
  });
  it("certifies four observed flop contributions and separate gross accounting before hero responds", () => {
    const f = replay(frames().slice(0, 30)), p = f.source.flopProof()!;
    expect(p).toMatchObject({ scope: "flop_hero_activation", activation: { sequence: 30,
      receivedAt: activation, cursor: 1792933814692, playerId: "PLAYER_1" }, expiresAt: expiry,
      historyComplete: false, liveRecommendationsAllowed: false,
      facts: { amountToCallChips: null, legalActions: null, contestablePotChips: null },
      contributions: { PLAYER_1: 0, PLAYER_2: 0, PLAYER_3: 2, PLAYER_5: 2, PLAYER_9: 2, PLAYER_10: 2 },
      accounting: { scope: "hand248_contribution_prefix", preflop: { streetContributionSumChips: 12 },
        flop: { streetContributionSumChips: 8 }, cumulativeInvestmentSumChips: 20, sourcePotPlusStreetChips: 20,
        sourcePot: { valueChips: 12, sequence: 22, receivedAt: 1792933794299 },
        displayedTotalPotChips: null, contestablePotChips: null, netCommittedChips: null,
        returnedUncalledChips: null, rakeOrDropChips: null, potLedger: null } });
    expect(p.observations.map(o => [o.sequence, o.playerId, o.priorContribution, o.contribution, o.receivedAt])).toEqual([
      [23, "PLAYER_3", 0, 2, 1792933796739], [25, "PLAYER_5", 0, 2, 1792933798924],
      [27, "PLAYER_9", 0, 2, 1792933812473], [29, "PLAYER_10", 0, 2, 1792933813477],
    ]);
    expect(p.accounting!.preflopObservations.map(o => [o.sequence, o.priorContribution, o.contribution])).toEqual([
      [11, 0, 2], [13, 0, 2], [15, 0, 2], [17, 0, 2], [19, 1, 2],
    ]);
    expect(p.accounting!.flop.contributions.map(p => p.remainingCapacityChips)).toEqual([228, 226, 239, 232, 251, 306]);
    expect(f.source.proof()).toBeNull(); expect(f.source.flopAcceptanceProof()).toBeNull();
    p.transition.board.reverse(); p.accounting!.flop.contributions[0]!.streetTotalChips = 999;
    expect(f.source.flopProof()!.transition.board).toEqual(["3s", "7d", "2d"]);
    expect(f.source.flopProof()!.accounting!.flop.contributions[0]!.streetTotalChips).toBe(0);
    f.at(activation - 1); expect(f.source.flopProof()).toBeNull();
    f.at(expiry - 1); expect(f.source.flopProof()?.expiresAt).toBe(expiry);
    f.at(expiry); expect(f.source.flopProof()).toBeNull();
  });
  it("certifies late historical matching investment and BTN activation without a new deadline", () => {
    const fs = frames(), f = replay(fs.slice(0, 30)); f.accept(fs[30]);
    expect(fs[30].localReceivedAt - expiry).toBe(928);
    expect(f.source.flopProof()).toBeNull();
    const h = f.source.flopAcceptanceProof()!;
    expect(h).toMatchObject({ originalHeroExpiresAt: expiry, nextActivation: null,
      acceptance: { sequence: 31, receivedAt: 1792933825203, action: "call", actor: { playerId: "PLAYER_1", position: "CO" },
        priorContributionChips: 0, newContributionChips: 2, investmentChips: 2,
        previousHighestContributionChips: 2, observedRaiseIncrementChips: 0,
        evidence: { contract: "hand248_co_flop_call2_v1", raw: fs[30].payload } },
      accounting: { flop: { streetContributionSumChips: 10 }, cumulativeInvestmentSumChips: 22 },
      historyComplete: false, liveRecommendationsAllowed: false });
    expect(h).not.toHaveProperty("expiresAt");
    f.accept(fs[31]); expect(f.source.flopAcceptanceProof()).toMatchObject({ acceptance: h.acceptance,
      accounting: h.accounting, nextActivation: { sequence: 32, playerId: "PLAYER_2", receivedAt: 1792933826019 } });
    f.at(fs[31].localReceivedAt - 1); expect(f.source.flopAcceptanceProof()).toBeNull();
    f.at(expiry + 100000); expect(f.source.flopAcceptanceProof()?.originalHeroExpiresAt).toBe(expiry);
    expect(f.source.flopProof()).toBeNull(); f.source.reset(); expect(f.source.flopAcceptanceProof()).toBeNull();
  });
  it.each(Array.from({ length: 31 }, (_, i) => i))("cannot certify after missing original frame index %i", index => {
    const fs = frames(); fs.splice(index, 1); const f = replay(fs);
    expect(f.source.flopProof()).toBeNull(); expect(f.source.flopAcceptanceProof()).toBeNull();
  });
  it.each(Array.from({ length: 22 }, (_, i) => i + 9))("cannot repair a missing hand248 step by relinking index %i", index => {
    const fs = frames(); fs.splice(index, 1);
    fs.forEach((f, i) => { f.localReceiveSequence = i + 1; if (i) f.payload.pre = (fs[i - 1].payload.gameState ?? fs[i - 1].payload).now; });
    const f = replay(fs); expect(f.source.flopAcceptanceProof()).toBeNull(); expect(f.source.flopProof()).toBeNull();
  });
  it.each(Array.from({ length: 23 }, (_, i) => i + 9))("unknown raw mutation cannot disappear at index %i", index => {
    const fs = frames(); fs[index].payload.uncalledReturn = 0;
    expect(replay(fs).source.flopAcceptanceProof()).toBeNull();
    if (index < 30) expect(replay(fs.slice(0, 30)).source.flopProof()).toBeNull();
  });
  const mutations: Record<string, (fs: any[]) => void> = {
    hero: fs => fs[0].payload.currentPlayer.id = "PLAYER_2",
    boundaryHighest: fs => fs[9].payload.cHB = 3,
    boundaryRound: fs => delete fs[9].payload.mR,
    boundaryCapacity: fs => fs[9].payload.mAVTB++,
    boundaryNested: fs => fs[9].payload.pC.PLAYER_1.unknown = true,
    cards: fs => fs[9].payload.pC.PLAYER_1.cards[0].value = "As",
    sbActor: fs => fs[17].payload.cPI = "PLAYER_2",
    sbCapacity: fs => fs[17].payload.mAVTB = 229,
    sbNullCapacity: fs => fs[17].payload.mAVTB = null,
    missingOtherCapacity: fs => delete fs[27].payload.mAVTB,
    noCheck: fs => delete fs[20].payload.bigBlindCheck,
    board: fs => fs[21].payload.oTC["1"] = ["7d", "3s", "2d"],
    heroCollision: fs => fs[21].payload.oTC["1"][0] = "2s",
    secondBoard: fs => fs[21].payload.oTC["2"] = ["As", "Kd", "Qc"],
    stack: fs => fs[21].payload.players.PLAYER_1.stack--,
    pot: fs => fs[21].payload.pot++,
    allIn: fs => fs[28].payload.pGS.PLAYER_10 = "allIn",
    amount: fs => fs[28].payload.tB.PLAYER_10 = 3,
    order: fs => fs[28].payload.cRPI.reverse(),
    heroActor: fs => fs[29].payload.pITT = "PLAYER_2",
    hand: fs => fs[29].payload.hI = "OTHER",
    turn: fs => fs[29].payload.gT = [1, 2],
    generation: fs => fs[29].connectionGeneration++,
    receipt: fs => fs[29].localReceivedAt = fs[28].localReceivedAt - 1,
    predecessor: fs => fs[29].payload.pre++,
    acceptedAmount: fs => fs[30].payload.tB.PLAYER_1 = 3,
    acceptedNoTotal: fs => delete fs[30].payload.tB,
    nextActor: fs => fs[31].payload.pITT = "PLAYER_10",
  };
  it.each(Object.keys(mutations))("rejects synthetic contradiction: %s", name => {
    const fs = frames(); mutations[name]!(fs);
    expect(replay(fs).source.flopAcceptanceProof()).toBeNull();
    if (!name.startsWith("accepted") && name !== "nextActor") expect(replay(fs.slice(0, 30)).source.flopProof()).toBeNull();
  });
  it.each(["PLAYER_1", "PLAYER_2", "PLAYER_3", "PLAYER_5", "PLAYER_9", "PLAYER_10"])("requires every reset marker: %s", id => {
    const fs = frames(); delete fs[21].payload.tB[id]; expect(replay(fs).source.flopAcceptanceProof()).toBeNull();
  });
  it.each([10, 18, 22, 30, 31, 32])("requires the retained production raw gate at frame %i", sequence => {
    const f = replay(frames(), (p, frame) => {
      if (p && frame.localReceiveSequence === sequence) { delete p.flop248Boundary; delete p.flopPatch; delete p.hjPatch; }
    });
    expect(f.source.flopAcceptanceProof()).toBeNull();
  });
  it.each([22, 30, 31, 32])("invalidates source proofs and pending recognition after frame %i", count => {
    for (const variant of ["reset", "empty", "null", "reconnect"]) {
      const fs = frames(), f = replay(fs.slice(0, count)), last = fs[count - 1];
      if (variant === "reset") f.source.reset();
      else if (variant === "null") f.source.accept(null, count + 1, 1, last.localReceivedAt);
      else f.accept({ ...last, localReceiveSequence: count + 1, connectionGeneration: variant === "reconnect" ? 2 : 1,
        payload: { now: last.payload.now + 1, pre: last.payload.now } });
      expect(f.source.flopProof()).toBeNull(); expect(f.source.flopAcceptanceProof()).toBeNull();
      fs.slice(count).forEach(f.accept); expect(f.source.flopAcceptanceProof()).toBeNull();
    }
  });
  it("inspects the entire real checkpoint without converting historical diagnostic assertions to authority", () => {
    const c = checkpoint(), o = c.observation, fs = frames();
    expect(c).toMatchObject({ observationPaired: true, reasons: [], capturedAt: activation + 1625,
      completedAt: 1792933815913, permission: null, legalityCertified: false, historyComplete: false, liveRecommendationsAllowed: false });
    expect(c.rawRecorderBefore).toEqual(c.rawRecorderAfter);
    expect(c.rawRecorderBefore).toMatchObject({ frameCount: 30, active: true, registeredCaptured: true, rejectedFrames: 0,
      lastRetainedFrame: { localReceivedAt: activation, sourceCursor: fs[29].payload.now } });
    expect(o.before).toEqual(o.after); expect(o.epochBefore).toEqual(o.epochAfter);
    expect(o.epochBefore).toEqual({ decisionEpoch: "30", stateAvailable: true, matchesRead: true });
    expect(o).toMatchObject({ startedAt: 1792933815901, completedAt: 1792933815907,
      epochStatus: "observed_matching", sourceVerifiedFacts: null, profile: "unsupported_or_uncertified" });
    expect(o.before.head.receivedAt).toBe(activation + 8); // Distinct overlay receipt, not raw recording time.
    expect(o.limitations).toEqual(["Contribution comparison unavailable at seat 1; no zero inferred.",
      "Contribution comparison unavailable at seat 2; no zero inferred.",
      "No current certified flop profile; no source decision deadline is available or created."]);
    const read = o.unverifiedObservations.ui, state = assessLiveState(read.raw, read.context);
    expect(state.state?.street).toBe("flop"); expect(state.positions.get(1)).toBe("CO");
    expect(read.callControl).toMatchObject({ observedAt: 1792933815904, visibleCount: 1, tag: "BUTTON", type: "button",
      rawText: "Call 2", amountChips: 2, enabled: true, issues: [], contradictions: [], serverAuthorization: "unproven" });
    expect(read.raiseControl).toMatchObject({ formVisible: false, raiseSubmitVisible: false, raiseSubmitEnabled: null });
    expect(read.raw.seats.filter((s: any) => s.isOccupied).map((s: any) => [s.seatNumber, s.stackText, s.betValueText])).toEqual([
      [1, "306", null], [2, "228", null], [3, "226", "2"], [5, "239", "2"], [9, "232", "2"], [10, "251", "2"],
    ]);
    const f = replay(fs.slice(0, 30)); f.at(c.completedAt);
    expect(f.source.flopProof()?.expiresAt).toBe(expiry);
    f.at(expiry); expect(f.source.flopProof()).toBeNull(); // Fresh UI/epoch cannot renew it.
  });
});

describe("hand248 real source and saved UI through production diagnostic/decision infrastructure", () => {
  function setup() {
    let now = 0, identity: HandIdentityEvidence | null = null, identitySequence = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const runtime = createTimelineRuntime({ tableId: "TABLE_TEST", sessionId: "replay", now: () => now,
      fetchLog: vi.fn(async () => new Response("[]")) });
    const accept = (f: any) => {
      now = f.localReceivedAt;
      const packet = "42" + JSON.stringify([f.event, f.payload]);
      runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId: "TABLE_TEST",
        sequence: f.localReceiveSequence, generation: f.connectionGeneration, observedAt: now,
        metadata: inspectSocketMetadata(packet), utgSource: projectFirstUtgSource(packet, identity?.heroPlayerId ?? null) });
      const next = identityFromSocketPacket(packet, "TABLE_TEST", identity);
      if (next && (!identity || next.handId !== identity.handId || next.chainGap !== identity.chainGap))
        runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "TABLE_TEST", sequence: ++identitySequence, connected: true, identity: next });
      identity = next;
    };
    frames().slice(0, 30).forEach(accept);
    const cp = checkpoint(), read = cp.observation.unverifiedObservations.ui;
    now = read.callControl.observedAt;
    // The original internal stateJson was intentionally not exported. Recompute
    // only a replay fingerprint using today's production code, never claim to
    // recover that original string or mint a live epoch from saved evidence.
    const epoch = (): { decisionEpoch: string; stateJson: string | null } => ({ decisionEpoch: "replay-epoch", stateJson: JSON.stringify([
      decisionFingerprint(cp.tableUrl, read.raw, read.context, read.raiseControl), liveProofRevision(runtime.snapshot()),
    ]) });
    const dependencies = { snapshot: () => runtime.snapshot(), read: () => read, epoch, tableUrl: () => cp.tableUrl, now: () => now };
    const blocked = () => {
      const p = buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), runtime.snapshot(), null, "replay-epoch");
      expect(p.activation.allowed).toBe(false); expect(p.postflopCall).toBeNull(); expect(p.callLegality).toBeNull();
      for (const scope of ["actionWindow", "legalActions", "accounting", "pot", "rangeInput", "equity", "terminal"]) {
        const proof = p.evidence.proofs.find(p => p.scope === scope);
        expect(proof, scope).toBeDefined(); expect(proof!.status, scope).not.toBe("proven");
      }
      expect(runtime.snapshot().current.historyComplete).toBe(false); expect(runtime.snapshot().current.events).toEqual([]);
    };
    return { read, runtime, accept, dependencies, blocked, at: (t: number) => { now = t; } };
  }
  it("pairs the saved read with newly verified source facts while all live recommendation gates remain closed", () => {
    const f = setup(), result = capturePostflopObservation(f.dependencies);
    expect(result).toMatchObject({ observationPaired: true, reasons: [], permission: null,
      legalityCertified: false, historyComplete: false, liveRecommendationsAllowed: false,
      sourceVerifiedFacts: { proof: { activation: { sequence: 30 }, expiresAt: expiry, accountingScope: "hand248_contribution_prefix" } } });
    expect(result.unverifiedObservations.ui).toEqual(f.read); f.blocked();
    f.at(expiry); expect(f.runtime.snapshot().sourceStatus.flopObservationProof).toBeNull(); f.blocked();
    frames().slice(30).forEach(f.accept); f.blocked();
  });
  it.each(["board", "hero", "contribution", "epoch-id", "epoch-state", "epoch-missing", "source-advance", "expired", "future-control"])(
    "rejects a synthetic paired-checkpoint contradiction: %s", variant => {
      const f = setup(), d = f.dependencies;
      if (variant === "board") f.read.raw.boardCards[0].valueText = "A";
      if (variant === "hero") f.read.raw.seats[0].isYou = false;
      if (variant === "contribution") f.read.raw.seats[2].betValueText = "3";
      if (variant.startsWith("epoch-")) {
        const original = d.epoch(); let calls = 0;
        d.epoch = () => (++calls === 2 || variant === "epoch-missing")
          ? { decisionEpoch: variant === "epoch-id" ? "changed" : original.decisionEpoch,
            stateJson: variant === "epoch-missing" ? null : variant === "epoch-state" ? "changed" : original.stateJson } : original;
      }
      if (variant === "source-advance") d.read = () => { f.accept(frames()[30]); return f.read; };
      if (variant === "expired") f.at(expiry);
      if (variant === "future-control") f.read.callControl.observedAt++;
      expect(capturePostflopObservation(d).observationPaired).toBe(false); f.blocked();
    });
  it("does not derive permission from a paired record with unavailable CALL readiness", () => {
    const f = setup(); f.read.callControl.enabled = false;
    const o = capturePostflopObservation(f.dependencies);
    expect(o.observationPaired).toBe(true); expect(o.unverifiedObservations.callReadiness).toBe("unavailable");
    expect(o.permission).toBeNull(); f.blocked();
  });
});
