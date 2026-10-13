import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { readLiveTable } from "../../../apps/pokernow-extension/src/tableRead.js";
import { buildLiveDiagnosticSnapshot } from "../../../apps/pokernow-extension/src/diagnostics.js";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { assessLiveState } from "./liveState.js";
import { emptyActionHistory } from "./actionHistory.js";
import { computeDataConfidence } from "./dataConfidence.js";

const captured: string[] = JSON.parse(readFileSync(new URL("./fixtures/pokernow-winner-stacks-live.json", import.meta.url), "utf8"));
const passed = JSON.parse(readFileSync(new URL("./fixtures/pokernow-return-settlement-verified.json", import.meta.url), "utf8"));
const stacks = readFileSync(new URL("./fixtures/pokernow-player-stacks-live.txt", import.meta.url), "utf8").trimEnd();
const chips = (value: string) => `<span class="chips-value"><span class="normal-value">${value}</span></span>`;
const container = (markup: string) => `<p class="table-player-stack">${markup}</p>`;
function table(winner = captured[2]!, classes = "winner") {
  // Only the three stack containers are live captures. The table, cards, bets,
  // winner flag placement and turn below are test scaffolding, not a full capture.
  const { document } = parseHTML(`<html><body>
    <div class="table-cards"></div>
    <div class="table-pot-size"><div class="main-value"><span class="normal-value">6</span></div></div>
    <div class="blind-value">${chips("1")}</div><div class="blind-value">${chips("2")}</div>
    <div class="dealer-position-1"></div>
    ${["aizen", "aizemmmm", "aizen23"].map((name, index) => `<div class="table-player-${index + 1} ${index === 0 ? "you-player decision-current" : index === 2 ? classes : ""}">
      <div class="table-player-name"><a>${name}</a></div>
      ${index === 2 ? winner : captured[index]}
      <div class="table-player-bet-value">check</div>
      ${index === 0 ? '<div class="table-player-cards"><div class="card-container card-s card-s-A flipped"></div><div class="card-container card-h card-s-K flipped"></div></div>' : ""}
    </div>`).join("")}
  </body></html>`);
  vi.stubGlobal("document", document);
  return document;
}
function read() {
  const result = readLiveTable();
  return { read: result, assessment: assessLiveState(result.raw, result.context) };
}
afterEach(() => vi.unstubAllGlobals());

describe("captured winner stack/prize structure", () => {
  it("separates 47 from +6 by structure without inventing a spendable stack or an award", () => {
    table();
    const { read: r, assessment: a } = read();
    expect(r.context.readErrors).toEqual([]);
    expect(r.raw.seats[2]).toMatchObject({ stackText: "47", stackContainerText: "47 +6", stackIsSettlement: true });
    expect(r.evidence.seatEvidence[2]!.stackDisplay).toMatchObject({ status: "settlement_display", displayedBaseChips: 47,
      awardChips: 6, awardText: "+6", normalValueCount: 2, prizeCount: 1 });
    expect(a.state!.seats[2]).toMatchObject({ stack: null, isSettling: true, isAllIn: false });
    expect(a.confidence.level).toBe("low");
    expect(a.confidence.reasons).toContain("settlement display present -- waiting for stable remaining stacks");
    expect(a.legality.verified).toBe(false);
    expect(a.decisionPot).toBeNull();
    const snapshot = buildLiveDiagnosticSnapshot(r, a, emptyActionHistory());
    expect(snapshot.seats[2]).toMatchObject({ stack: null, stackText: "47", isSettling: true });
    expect(snapshot.decision.packetBuilt).toBe(false);
  });
  it("reads the two ordinary captured stacks unchanged", () => {
    table();
    expect(read().assessment.state!.seats.slice(0, 2).map(s => s.stack)).toEqual([150, 9]);
  });
  it.each(["0", "47", "1,000", "0.5"])("reads a stable numeric stack %s without adding winnings", value => {
    table(container(chips(value)), "");
    expect(read().assessment.state!.seats[2]).toMatchObject({ stack: Number(value.replaceAll(",", "")), isAllIn: false, isSettling: false });
  });
  it.each(["All In", '<span class="normal-value">All In</span>'])("preserves explicit all-in display %s and the contribution", value => {
    const document = table(container(value), "");
    document.querySelector(".table-player-3 .table-player-bet-value")!.textContent = "4";
    expect(read().assessment.state!.seats[2]).toMatchObject({ stack: null, isAllIn: true, currentBet: 4 });
  });
  it("recognizes prize settlement without requiring a winner class", () => {
    table(captured[2], "");
    expect(read().assessment.state!.seats[2]).toMatchObject({ isSettling: true, stack: null });
  });
  it("keeps a winner-class-only transitional stack unavailable until the stable display returns", () => {
    const document = table(container(chips("53")));
    expect(read().assessment.state!.seats[2]).toMatchObject({ isSettling: true, stack: null });
    document.querySelector(".table-player-3")!.classList.remove("winner");
    expect(read().assessment.state!.seats[2]).toMatchObject({ isSettling: false, stack: 53 });
  });
  it("supports the same proven components with optional BB display spans", () => {
    const markup = captured[2]!.replace(/<span class="normal-value">/g, '<span class="bb-value">3<small>BB</small></span><span class="normal-value">');
    table(markup);
    expect(read().read.evidence.seatEvidence[2]!.stackDisplay).toMatchObject({ displayedBaseChips: 47, awardChips: 6 });
  });
  it.each([
    container(chips("47") + chips("6")),
    container('<span class="normal-value">47</span><span class="normal-value">6</span>'),
    container(chips("47") + " +6"),
    container(chips("47 +6")),
    container("47 +6"),
    container(`<div>${chips("47")}</div>`),
    container(chips("47") + `<span class="unknown-award">+${chips("6")}</span>`),
    container(chips("47") + `<span><span class="table-player-stack-prize">+${chips("6")}</span></span>`),
    container(chips("47") + `<div><span class="table-player-stack-prize">+${chips("6")}</span></div>`),
    container(chips("47") + `<span class="table-player-stack-prize">+${chips("6")}${chips("7")}</span>`),
    container(chips("47") + `<span class="table-player-stack-prize">+${chips("6")}</span><span class="table-player-stack-prize">+${chips("6")}</span>`),
    container(chips("47") + `<span class="table-player-stack-prize">+${chips("oops")}</span>`),
    container(chips("47") + `<span class="table-player-stack-prize red">${chips("-6")}</span>`),
    container(chips("47") + `<span class="table-player-stack-prize">+${chips("6")}</span> 8`),
  ])("fails closed for ambiguous or unsupported display %s", markup => {
    table(markup, "");
    const { read: r, assessment: a } = read();
    expect(r.raw.seats[2]!.stackText).toBeNull();
    expect(a.state!.seats[2]!.stack).toBeNull();
    expect(r.context.readErrors!.some(e => e.startsWith("seat 3 stack:"))).toBe(true);
    expect(a.confidence.level).toBe("low");
  });
  it("rejects duplicate containers even when only one has a numeric node", () => {
    table(container(chips("47")) + container("All In"), "");
    const { read: r, assessment: a } = read();
    expect(r.context.readErrors).toContain("seat 3 stack container: expected at most one match, found 2");
    expect(a.state!.seats[2]).toMatchObject({ stack: null, isAllIn: false });
  });
  it("settlement alone lowers confidence even if other monetary proofs are supplied", () => {
    table();
    const state = read().assessment.state!;
    // Isolate the flag from the unknown-stack check, including a folded seat.
    state.seats[2]!.stack = 47; state.seats[2]!.isFolded = true;
    expect(computeDataConfidence(state, { amountToCall: 0, potSemanticsVerified: true,
      contributionSemanticsVerified: true, bigBlindWasDefaulted: false, isPositionKnown: true }).reasons)
      .toContain("settlement display present -- waiting for stable remaining stacks");
  });
  it("keeps the LIVE VERIFIED return/award separate and never re-applies the DOM prize", async () => {
    // Reported sequence/amounts/IDs are live evidence; canonical rows, initial
    // mapping and timestamps below are scaffolding, not a captured API response.
    const messages = [stacks, '"aizen23 @ OoArqYL22g" bets 4', '"aizen @ v7UmNXTwjJ" folds',
      '"aizemmmm @ TTXBlZfl8G" folds', 'Uncalled bet of 4 returned to "aizen23 @ OoArqYL22g"',
      '"aizen23 @ OoArqYL22g" collected 6 from pot'];
    const rows = messages.map((msg, i) => ({ msg, createdAt: String(i + 1) }));
    let now = 10000;
    const source = createTimelineRuntime({ tableId: "table", sessionId: "test", now: () => now,
      fetchLog: vi.fn(async () => new Response(JSON.stringify(rows))) });
    const identity = identityFromSocketPacket('42["registered",{"gameState":{"id":"table","hI":"h1","gN":1,"now":100},"currentPlayer":{"id":"OoArqYL22g"}}]', "table", null)!;
    source.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: "table", sequence: 1, connected: true, identity });
    await source.tick();
    const before = source.snapshot().current.accounting;
    expect(before.adjustments).toHaveLength(2);
    expect(before.adjustments[0]).toMatchObject({ kind: passed.return.action, amount: passed.return.amount,
      playerId: passed.return.playerId, seat: passed.return.seat, effectIfIndependentlyComplete: {
        returnedUncalledDelta: passed.return.returnedUncalledDelta, netCommittedDelta: passed.return.netCommittedDelta, potAwardsDelta: 0 } });
    expect(before.adjustments[1]).toMatchObject({ kind: passed.award.kind, amount: passed.award.amount,
      seat: passed.award.seat, effectIfIndependentlyComplete: { potAwardsDelta: passed.award.potAwardsDelta, netCommittedDelta: 0 } });
    expect(before.adjustments[0]!.provenance).toMatchObject({ text: messages[4], sourceTimestampRaw: "5" });
    table();
    for (let i = 0; i < 3; i++) {
      const r = read(); source.observe(r.read, r.assessment);
      now += 4000; await source.tick();
    }
    expect(source.snapshot().current.accounting).toEqual(before);
    expect(before.totals).toBeNull();
    expect(source.snapshot().current.historyComplete).toBe(false);
    expect(source.snapshot().sourceStatus.settlementComplete).toBe(false);
  });
});
