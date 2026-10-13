import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { freezeReportedSocketRoster, inspectReportedBlindCompletion, type ReportedSocketRoster } from "./socketHandEvidence.js";
import { createSourceMetadataAudit, inspectSocketMetadata } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { identityFromSocketPacket, type HandIdentityEvidence } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";

const report = JSON.parse(readFileSync(new URL("./fixtures/pokernow-hand-49-socket-report.json", import.meta.url), "utf8"));
const start = () => structuredClone(report.handStart) as ReportedSocketRoster & { tB: Record<string, number> };
const binding = () => ({ generation: 1, hI: report.handStart.hI, gN: 49,
  chainStatus: "observed_continuous" as const, chainGap: false });

describe("hand 49 reported socket observations (not a reconstructed raw capture)", () => {
  it("records exactly two consistent participant candidates, not six-max certification", () => {
    const result = freezeReportedSocketRoster(start(), 1).inspect(binding());
    expect(result.status).toBe("consistent_scoped_candidate");
    expect(result.roster.seats).toEqual([[1, "v7UmNXTwjJ"], [3, "OoArqYL22g"]]);
    expect(result.roster.iHPI).toEqual(["OoArqYL22g", "v7UmNXTwjJ"]);
    expect(result).toMatchObject({ provesDealtInRoster: false, historyComplete: false, provesActionWindow: false, provesRaiseLegality: false });
  });
  it("derives HU button/SB and BB without relying on seat array or clockwise order", () => {
    const original = start();
    const reversed = start(); reversed.seats.reverse();
    const positions = (input: ReportedSocketRoster) => freezeReportedSocketRoster(input, 1).inspect(binding()).observedPositions!.sort((a, b) => a.seat - b.seat);
    expect(positions(original)).toEqual([{ seat: 1, playerId: "v7UmNXTwjJ", position: "BB" },
      { seat: 3, playerId: "OoArqYL22g", position: "BTN/SB" }]);
    expect(positions(reversed)).toEqual(positions(original));
  });
  it("freezes first reported roster across later omissions/folds/departures; mutations cannot rewrite it", () => {
    const input = start(); const audit = freezeReportedSocketRoster(input, 1);
    input.seats.pop(); input.iHPI.pop();
    const result = audit.inspect(binding(), [[1, "v7UmNXTwjJ"]]);
    expect(result.roster.seats).toHaveLength(2);
    expect(result.status).toBe("consistent_scoped_candidate");
    result.roster.seats.pop();
    expect(audit.inspect(binding()).roster.seats).toHaveLength(2);
    // Omission is not decoded as a fold/departure action.
    expect(result.provesActionWindow).toBe(false);
  });
  it("does not carry a departed prior-hand player into this hand (synthetic prior-hand scaffold)", () => {
    const previous = start(); previous.hI = "synthetic_prior_hand"; previous.gN = 48;
    previous.seats.push([2, "synthetic_departed"]); previous.iHPI.push("synthetic_departed"); previous.pCPlayerIds.push("synthetic_departed");
    previous.dealerID = "synthetic_departed"; previous.dealerSeat = 2;
    const old = freezeReportedSocketRoster(previous, 1);
    expect(old.inspect({ ...binding(), hI: previous.hI, gN: previous.gN }).status).toBe("consistent_scoped_candidate");
    expect(old.inspect(binding()).status).toBe("insufficient_or_invalid");
    expect(freezeReportedSocketRoster(start(), 1).inspect(binding()).roster.iHPI).not.toContain("synthetic_departed");
  });
  it.each(["dealerSeat", "dealerID", "sBPI", "bBPI"])("rejects contradictory %s (synthetic mutation)", field => {
    const input = start(); Object.assign(input, { [field]: field === "dealerSeat" ? 1 : "invalid_id" });
    const result = freezeReportedSocketRoster(input, 1).inspect(binding());
    expect(result.status).toBe("insufficient_or_invalid"); expect(result.observedPositions).toBeNull();
  });
  it.each(["duplicate_seat", "duplicate_id", "missing_card_id", "missing_in_hand_id"])("rejects ambiguous roster %s", kind => {
    const input = start();
    if (kind === "duplicate_seat") input.seats[1]![0] = 1;
    if (kind === "duplicate_id") input.seats[1]![1] = input.seats[0]![1];
    if (kind === "missing_card_id") input.pCPlayerIds.pop();
    if (kind === "missing_in_hand_id") input.iHPI.pop();
    expect(freezeReportedSocketRoster(input, 1).inspect(binding()).status).toBe("insufficient_or_invalid");
  });
  it("does not certify a synthetic six-player position order from a HU sample", () => {
    const input = start();
    input.seats = [[1, "a"], [2, "b"], [3, "c"], [4, "d"], [5, "e"], [6, "f"]];
    input.iHPI = input.seats.map(s => s[1]); input.pCPlayerIds = [...input.iHPI];
    Object.assign(input, { dealerID: "a", dealerSeat: 1, sBPI: "b", bBPI: "c" });
    const result = freezeReportedSocketRoster(input, 1).inspect(binding());
    expect(result.observedPositions).toBeNull(); expect(result.provesDealtInRoster).toBe(false);
  });
  it("flags joins/seat conflicts without silently changing the hand-start roster", () => {
    const audit = freezeReportedSocketRoster(start(), 1);
    const result = audit.inspect(binding(), [[1, "v7UmNXTwjJ"], [3, "replacement"]]);
    expect(result.status).toBe("insufficient_or_invalid");
    expect(result.roster.seats[1]).toEqual([3, "OoArqYL22g"]);
    expect(audit.inspect(binding()).status).toBe("insufficient_or_invalid");
  });
  it("invalidates current use on reconnect or chain gap even if later values look consistent", () => {
    for (const change of [{ generation: 2 }, { chainGap: true }, { chainStatus: "incomplete" as const }]) {
      const audit = freezeReportedSocketRoster(start(), 1);
      expect(audit.inspect({ ...binding(), ...change }).status).toBe("insufficient_or_invalid");
      expect(audit.inspect(binding()).status).toBe("insufficient_or_invalid");
    }
  });
  it("records the exact completion candidate without treating it as verified action evidence", () => {
    const result = inspectReportedBlindCompletion(start(), report.laterContribution, report.finalTurn);
    expect(result).toMatchObject({ interpretation: "possible_small_blind_completion", additionalChipsIfStreetTotals: 1,
      totalContributionIfStreetTotals: 2, verifiedAction: null, provesUnopened: false });
    expect(result.reasons.join(" ")).toContain("tB");
  });
  it("does not misclassify a larger contribution or mismatched turn as this completion", () => {
    expect(inspectReportedBlindCompletion(start(), { ...report.laterContribution, to: 4 }, report.finalTurn).interpretation).toBe("unknown");
    expect(inspectReportedBlindCompletion(start(), report.laterContribution, { ...report.finalTurn, cPI: "someone_else" }).interpretation).toBe("unknown");
  });
  it("empty eventsData is not evidence of no voluntary action", () => {
    expect(report.eventsData).toEqual([]);
    expect(report.laterContribution.to).toBeGreaterThan(report.laterContribution.from);
    expect(inspectReportedBlindCompletion(start(), report.laterContribution, report.finalTurn).provesUnopened).toBe(false);
  });
});

describe("reported hand-49 cursors through the existing metadata checker", () => {
  // The values/links are reported live. Wrappers and generation=1 below are
  // synthetic test scaffolding: their exact placement was not supplied.
  function chain() {
    const audit = createSourceMetadataAudit();
    report.socketNowChain.forEach((now: number, i: number) => audit.socket(inspectSocketMetadata("42" + JSON.stringify(
      i === 0 ? ["registered", { gameState: { now } }] : ["gC", { pre: report.socketNowChain[i - 1], now }])), i + 1, 1, i));
    return audit;
  }
  it("accepts the four reported links only as within-generation continuity", () => {
    const result = chain().snapshot();
    expect(result.socketContinuity).toMatchObject({ status: "observed_continuous", linkedUpdates: 3, chainGap: false });
    expect(result.provesCompletePrefix).toBe(false);
  });
  it("flags a missing link and does not repair it from a matching later link", () => {
    const audit = chain(); const last = report.socketNowChain.at(-1);
    for (let i = 1; i <= 2; i++) audit.socket(inspectSocketMetadata("42" + JSON.stringify(["gC", {
      pre: i === 1 ? last - 1 : last + 1, now: last + i,
    }])), 4 + i, 1, i);
    expect(audit.snapshot().socketContinuity).toMatchObject({ chainGap: true, status: "incomplete" });
  });
  it("reconnect discards continuity of the previous generation", () => {
    const audit = chain();
    audit.socket(inspectSocketMetadata('42["registered",{"gameState":{"now":1}}]'), 5, 2, 5);
    expect(audit.snapshot().socketContinuity).toMatchObject({ generation: 2, status: "unknown", linkedUpdates: 0 });
    expect(audit.snapshot().provesCompletePrefix).toBe(false);
  });
});

// Read the user's original export directly; no rebuilt/sanitized replacement
// frames. Synthetic mutations below are explicitly negative transport tests.
const rawCapture = JSON.parse(readFileSync(new URL("../../../evidence/hand-49-raw-socket.json", import.meta.url), "utf8"));
type CapturedFrame = { localReceiveSequence: number; localReceivedAt: number; connectionGeneration: number;
  event: string; payload: Record<string, any> };
const rawFrames: CapturedFrame[] = rawCapture.frames;
const registration = rawFrames[0]!.payload.gameState;
const handStart = rawFrames[2]!.payload;
const sbUpdate = rawFrames[3]!.payload;
const heroTurn = rawFrames[4]!.payload;
const wire = (frame: CapturedFrame) => "42" + JSON.stringify([frame.event, frame.payload]);
function rawAudit(frames = rawFrames) {
  const audit = createSourceMetadataAudit();
  for (const f of frames) audit.socket(inspectSocketMetadata(wire(f)), f.localReceiveSequence, f.connectionGeneration, f.localReceivedAt);
  return audit;
}
const rawRoster = (state: Record<string, any>): ReportedSocketRoster => ({
  hI: state.hI, gN: state.gN, seats: state.seats, iHPI: state.iHPI, pCPlayerIds: Object.keys(state.pC),
  dealerID: state.dealerID, dealerSeat: state.dealerSeat, sBPI: state.sBPI, bBPI: state.bBPI,
});

describe("original hand-49 raw socket export", () => {
  it("retains all five actual envelopes and the registration in hand 48", () => {
    expect(rawCapture.capture).toMatchObject({ frameCount: 5, registeredCaptured: true, rejectedFrames: 0,
      stopReason: "exported_or_manually_stopped", historyCompletenessProof: false });
    expect(rawFrames.map(f => [f.localReceiveSequence, f.connectionGeneration, f.event])).toEqual([
      [1, 1, "registered"], [2, 1, "gC"], [3, 1, "gC"], [4, 1, "gC"], [5, 1, "gC"],
    ]);
    expect(rawFrames[0]!.payload.currentPlayer.id).toBe("v7UmNXTwjJ");
    expect(registration).toMatchObject({ gN: 48, hI: "sult10pqpx2q", now: 1791681923076, smallBlind: 1, bigBlind: 2 });
    expect(registration.seats).toEqual([[1, "v7UmNXTwjJ"], [2, "TTXBlZfl8G"], [3, "OoArqYL22g"]]);
  });
  it("replays registration plus every real predecessor through the existing continuity checker", () => {
    expect(rawFrames.map(f => f.event === "registered" ? f.payload.gameState.now : f.payload.now)).toEqual([
      1791681923076, 1791681980133, 1791681982561, 1791682081744, 1791682082616,
    ]);
    expect(rawAudit().snapshot().socketContinuity).toMatchObject({ generation: 1, status: "observed_continuous", linkedUpdates: 4, chainGap: false });
    expect(rawAudit().snapshot().provesCompletePrefix).toBe(false);
  });
  it("detects the actual 48-to-49 boundary without hero-card polling", () => {
    let identity: HandIdentityEvidence | null = null;
    const hands: unknown[] = [];
    for (const frame of rawFrames) {
      identity = identityFromSocketPacket(wire(frame), registration.id, identity);
      expect(identity?.chainGap).toBe(false);
      hands.push([identity?.handNumber, identity?.handId]);
    }
    expect(hands).toEqual([[48, "sult10pqpx2q"], [48, "sult10pqpx2q"],
      [49, "0kunwn5db0aj"], [49, "0kunwn5db0aj"], [49, "0kunwn5db0aj"]]);
    expect(handStart).toMatchObject({ gT: [1, 0], oTC: { "1": [] }, gameResult: "<D>" });
    expect(registration.gT).toEqual([1, 5]);
  });
  it("inspects full two-card entries, including hidden cards, rather than merely pC keys", () => {
    expect(Object.keys(handStart.pC).sort()).toEqual([...handStart.iHPI].sort());
    expect(handStart.pC.OoArqYL22g.cards).toEqual([{ value: null, showing: false }, { value: null, showing: false }]);
    expect(handStart.pC.v7UmNXTwjJ.cards).toEqual([{ value: "Kh", showing: false }, { value: "Th", showing: false }]);
    expect(registration.pC.v7UmNXTwjJ.cards.map((c: any) => c.value)).toEqual(["9d", "6h"]);
    expect(handStart.pC).not.toHaveProperty("TTXBlZfl8G");
    // Hidden null cards are present slots, not proof of an undealt/empty hand.
    expect(handStart.pC.OoArqYL22g.cards).toHaveLength(2);
  });
  it("uses actual removal evidence and freezes the new HU roster independently of hand 48", () => {
    const old = freezeReportedSocketRoster(rawRoster(registration), 1);
    expect(rawFrames[1]!.payload.players.TTXBlZfl8G).toEqual({ disconnectedSince: 1791681980133 });
    expect(handStart.players).toEqual({ TTXBlZfl8G: "<D>" });
    expect(handStart.pGS.TTXBlZfl8G).toBe("<D>");
    expect(handStart.pTB.TTXBlZfl8G).toBe("<D>");
    const frozen = freezeReportedSocketRoster(rawRoster(handStart), 1);
    expect(old.inspect(binding()).status).toBe("insufficient_or_invalid");
    expect(frozen.inspect(binding()).roster.iHPI).toEqual(["OoArqYL22g", "v7UmNXTwjJ"]);
    expect(frozen.inspect(binding()).observedPositions).toEqual([
      { seat: 1, playerId: "v7UmNXTwjJ", position: "BB" }, { seat: 3, playerId: "OoArqYL22g", position: "BTN/SB" },
    ]);
    // Later frames omit roster fields; do not replace the frozen baseline with
    // an empty roster, or interpret the players deletion patch as a full list.
    expect(sbUpdate).not.toHaveProperty("seats");
    expect(heroTurn).not.toHaveProperty("iHPI");
    expect(frozen.inspect(binding()).roster.seats).toEqual(handStart.seats);
  });
  it("distinguishes source state progression from a verified poker action", () => {
    expect(handStart).toMatchObject({ tB: { OoArqYL22g: 1, v7UmNXTwjJ: 2 }, cHB: 2, cPI: "OoArqYL22g", pITT: "OoArqYL22g" });
    expect(sbUpdate.tB).toEqual({ OoArqYL22g: 2 });
    expect(sbUpdate.pITT).toBeNull();
    expect(sbUpdate).not.toHaveProperty("cPI");
    expect(sbUpdate).not.toHaveProperty("gT");
    expect(sbUpdate.tB).not.toHaveProperty("v7UmNXTwjJ");
    expect(heroTurn).toMatchObject({ cPI: "v7UmNXTwjJ", pITT: "v7UmNXTwjJ" });
    expect(heroTurn).not.toHaveProperty("tB");
    const candidate = inspectReportedBlindCompletion({ ...rawRoster(handStart), tB: handStart.tB },
      { playerId: handStart.sBPI, from: handStart.tB[handStart.sBPI], to: sbUpdate.tB[handStart.sBPI] },
      { cPI: heroTurn.cPI, pITT: heroTurn.pITT });
    expect(candidate).toMatchObject({ interpretation: "possible_small_blind_completion", additionalChipsIfStreetTotals: 1,
      totalContributionIfStreetTotals: 2, verifiedAction: null, provesUnopened: false });
    // No fixture-derived chip/action meaning is fed into policy or accounting.
  });
  it("does not turn empty eventsData or plausible abbreviated values into certificates", () => {
    for (const f of rawFrames) expect((f.event === "registered" ? f.payload.gameState : f.payload).eventsData).toEqual([]);
    expect(registration.mR).toBe(2); expect(handStart.mR).toBe(4);
    expect(registration.mAVTB).toBe(119); expect(handStart.mAVTB).toBe(87); expect(heroTurn.mAVTB).toBe(119);
    expect(rawAudit().snapshot().socketStateEvidence).toMatchObject({ provesRaiseLegality: false, provesActionWindow: false });
    // mR=4 / mAVTB=119 are values, not established min/max/increment contracts.
  });
  it("fails continuity if an actual frame is omitted (synthetic capture loss)", () => {
    const audit = rawAudit(rawFrames.filter(f => f.localReceiveSequence !== 2));
    expect(audit.snapshot().socketContinuity).toMatchObject({ status: "incomplete", chainGap: true });
  });
  it("does not carry hand-49 continuity over a reconnect (synthetic generation change)", () => {
    const frames = structuredClone(rawFrames); frames[4]!.connectionGeneration = 2;
    const audit = rawAudit(frames);
    expect(audit.snapshot().socketContinuity).toMatchObject({ generation: 2, status: "incomplete" });
    expect(audit.snapshot().provesCompletePrefix).toBe(false);
  });
});
