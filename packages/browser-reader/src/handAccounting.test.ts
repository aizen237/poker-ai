import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ingestHandLog, newHandTimeline, normalizeLogRow, TIMELINE_LIMIT } from "./handTimeline.js";
import { reconcileCompleteHandAccounting, type GrossHandLedger } from "./handAccounting.js";
import { proveContestablePot } from "./legalityProof.js";

// Exact live messages; timestamps, action/award rows and complete ledgers are synthetic.
const returned = readFileSync(new URL("./fixtures/pokernow-uncalled-return-live.txt", import.meta.url), "utf8").trimEnd();
const stacks = readFileSync(new URL("./fixtures/pokernow-player-stacks-live.txt", import.meta.url), "utf8").trimEnd();
const row = (createdAt: number, msg: string) => ({ createdAt: String(createdAt), msg });
function timeline(messages = [row(1, stacks), row(2, returned)]) {
  const t = newHandTimeline("test-hand", 1); ingestHandLog(t, messages, 100); return t;
}
function complete(): GrossHandLedger {
  return { handId: "test-hand", source: "Synthetic independently complete gross ledger/adjustments with chip units; not live certification",
    coverage: "complete_hand", contributionBasis: "gross_before_returns", noRakeOrDropVerified: true,
    chipUnit: 1, heroSeat: 1, heroRemainingStack: 10, displayedTotalPot: 6, collectedMainPot: 6,
    players: [
      { playerId: "v7UmNXTwjJ", seat: 1, grossCommitted: 3, netStreetContribution: 0, folded: false },
      { playerId: "TTXBlZfl8G", seat: 2, grossCommitted: 2, netStreetContribution: 0, folded: false },
      { playerId: "OoArqYL22g", seat: 3, grossCommitted: 2, netStreetContribution: 0, folded: true },
    ], adjustments: timeline().accounting.adjustments };
}

describe("explicit PokerNow uncalled-return parsing and observations", () => {
  it("parses the exact live row as a distinct non-wager event with original provenance", () => {
    const e = normalizeLogRow({ createdAt: "179147737859100", msg: returned }, 500);
    expect(e).toMatchObject({ action: "uncalled_return", amount: 1, amountMeaning: "return_reported", wagerAction: null, raiseTo: null,
      actor: { name: "aizen", playerId: "v7UmNXTwjJ", seat: null }, evidence: returned,
      sourceTimestampRaw: "179147737859100", sourceTimestamp: 179147737859100, source: "pokernow_log_v3", confidence: "source_reported" });
  });
  it("maps the return by player ID and exposes only conditional accounting effects", () => {
    const t = timeline();
    expect(t.events[1]).toMatchObject({ actor: { playerId: "v7UmNXTwjJ", seat: 1 }, actorSeatMappingEventId: t.events[0]!.id });
    expect(t.accounting).toMatchObject({ status: "incomplete", totals: null, adjustments: [{ kind: "uncalled_return", amount: 1,
      seat: 1, status: "mapped_observation", provenance: { text: returned, sourceTimestampRaw: "2", seatMappingEventId: t.events[0]!.id },
      effectIfIndependentlyComplete: { grossCommittedDelta: 0, returnedUncalledDelta: 1, netCommittedDelta: -1, potAwardsDelta: 0 } }] });
    expect(t.historyComplete).toBe(false);
  });
  it.each(["no mapping", "unknown ID", "contradictory mapping", "tied mapping"])("retains a return but withholds accounting for %s", variant => {
    const rows = [row(1, stacks), row(2, returned)];
    if (variant === "no mapping") rows.shift();
    if (variant === "unknown ID") rows[1] = row(2, returned.replace("v7UmNXTwjJ", "unknown-id"));
    if (variant === "contradictory mapping") rows.push(row(3, 'Player stacks: #2 "aizen @ v7UmNXTwjJ" (153)'));
    if (variant === "tied mapping") rows[1] = row(1, returned);
    const t = timeline(rows);
    expect(t.events.find(e => e.action === "uncalled_return")!.actor!.seat).toBeNull();
    expect(t.accounting.adjustments[0]).toMatchObject({ status: "unresolved", effectIfIndependentlyComplete: null });
    const input = complete(); input.adjustments = t.accounting.adjustments;
    expect(reconcileCompleteHandAccounting(input).status).toBe("unknown");
  });
  it.each(["0", "-1", "+1", "1e3", "NaN", "Infinity", "1,000", "01", ".5", "1.", "1.123456789", "9007199254740992", "9007199254740991.1", ""])("keeps malformed/unsupported return amount %s unparsed", amount => {
    const text = `Uncalled bet of ${amount} returned to "aizen @ v7UmNXTwjJ"`;
    expect(normalizeLogRow(row(1, text), 100)).toMatchObject({ action: "unparsed", amount: null, evidence: text });
  });
  it.each([
    'Uncalled bet 1 returned to "aizen @ v7UmNXTwjJ"', 'Uncalled bet of 1 returned to "aizen"',
    'uncalled bet of 1 returned to "aizen @ v7UmNXTwjJ"', `${returned} extra`, `${returned}\n`,
    '"aizen @ v7UmNXTwjJ" receives uncalled bet 1', 'Uncalled bet of 1 returned to "aizen @ "',
  ])("does not generalize return wording: %s", text => {
    const t = timeline([row(1, stacks), row(2, text)]);
    expect(t.events[1]!.action).toBe("unparsed");
    expect(t.accounting.adjustments).toEqual([]);
    expect(t.accounting.reasons.join(" ")).toContain("Unparsed");
  });
  it("accepts bounded positive decimal syntax without changing the source text", () => {
    expect(normalizeLogRow(row(1, returned.replace("of 1", "of 0.5")), 100)).toMatchObject({ action: "uncalled_return", amount: 0.5 });
  });
  it("rebuilds accounting idempotently on duplicate/full refreshes, without cumulative subtraction", () => {
    const t = timeline(), before = JSON.stringify(t.accounting);
    ingestHandLog(t, [row(2, returned), row(1, stacks)], 200);
    ingestHandLog(t, [row(1, stacks), row(2, returned)], 300);
    expect(JSON.stringify(t.accounting)).toBe(before);
    expect(t.accounting.adjustments).toHaveLength(1);
  });
  it("does not guess whether identical tied rows are two actual returns", () => {
    const t = timeline([row(1, stacks), row(2, returned), row(2, returned)]);
    expect(t.accounting.adjustments).toHaveLength(2);
    expect(t.accounting.adjustments.every(a => a.status === "unresolved" && a.effectIfIndependentlyComplete === null)).toBe(true);
  });
  it("keeps return, collection and hand end separate without certifying complete history", () => {
    const t = timeline([row(1, stacks), row(2, returned), row(3, '"aizen @ v7UmNXTwjJ" collected 6 from pot'), row(4, "-- ending hand #1 --")]);
    expect(t.events.map(e => e.action)).toEqual(["player_stacks", "uncalled_return", "settlement", "hand_end"]);
    expect(t.accounting.adjustments.map(a => a.kind)).toEqual(["uncalled_return", "pot_award"]);
    expect(t.accounting.adjustments[1]!.effectIfIndependentlyComplete).toMatchObject({ netCommittedDelta: 0, potAwardsDelta: 6 });
    expect(t.accounting.totals).toBeNull(); expect(t.historyComplete).toBe(false);
  });
  it("exposes truncation instead of pretending evicted returns never occurred", () => {
    const t = timeline([row(1, stacks), row(2, returned), ...Array.from({ length: TIMELINE_LIMIT }, (_, i) => row(i + 3, '"aizen @ v7UmNXTwjJ" checks'))]);
    expect(t.accounting.adjustments).toEqual([]);
    expect(t.accounting.reasons.join(" ")).toContain("truncation");
    expect(t.accounting.totals).toBeNull();
  });
});

describe("independently complete gross/net accounting, separate from live activation", () => {
  it("separates gross commitments, returns, net chips and folded dead money; excludes the return from contestable pot", () => {
    const input = complete(), before = JSON.stringify(input);
    const result = reconcileCompleteHandAccounting(input);
    expect(result.status).toBe("proven");
    expect(result.totals).toEqual({ grossCommitted: 7, returnedUncalled: 1, netCommitted: 6, potAwards: 0, foldedDeadMoney: 2, outstandingPot: 6 });
    expect(result.players[0]).toMatchObject({ grossCommitted: 3, returnedUncalled: 1, netCommitted: 2 });
    expect(result.potLedger!.players[0]!.committed).toBe(2);
    const pot = proveContestablePot(result.potLedger!);
    expect(pot.contestablePotBeforeCall).toMatchObject({ status: "proven", value: 6 });
    expect(pot.uncalledReturns).toEqual([]);
    expect(JSON.stringify(input)).toBe(before);
  });
  it("deduplicates the same event ID and gives the same result on repeated reconciliation", () => {
    const input = complete(); input.adjustments.push(structuredClone(input.adjustments[0]!));
    const first = reconcileCompleteHandAccounting(input), second = reconcileCompleteHandAccounting(input);
    expect(first.totals!.returnedUncalled).toBe(1);
    expect(first.adjustmentEventIds).toHaveLength(1); expect(second).toEqual(first);
  });
  it("does not subtract returns from independently NET current-street contributions again", () => {
    const input = complete(); input.players.forEach(p => p.netStreetContribution = 2); input.collectedMainPot = 0;
    const result = reconcileCompleteHandAccounting(input);
    expect(result.potLedger!.players.map(p => p.streetContribution)).toEqual([2, 2, 2]);
    expect(proveContestablePot(result.potLedger!).contestablePotBeforeCall.value).toBe(6);
  });
  it("does not carry returns into another hand", () => {
    const input = complete(); input.handId = "another-hand";
    expect(reconcileCompleteHandAccounting(input).status).toBe("unknown");
  });
  it("separates awards from returns and disables the pot adapter once awards start", () => {
    const input = complete(); input.adjustments = timeline([row(1, stacks), row(2, returned), row(3, '"aizen @ v7UmNXTwjJ" collected 6 from pot'), row(4, "-- ending hand #1 --")]).accounting.adjustments;
    input.collectedMainPot = 0; input.displayedTotalPot = 0;
    const result = reconcileCompleteHandAccounting(input);
    expect(result.status).toBe("proven");
    expect(result.totals).toMatchObject({ grossCommitted: 7, returnedUncalled: 1, netCommitted: 6, potAwards: 6, outstandingPot: 0, foldedDeadMoney: 2 });
    expect(result.potLedger).toBeNull();
  });
  it("accounts for fractional chips only with independently supplied chip units", () => {
    const input = complete(); input.chipUnit = 0.5;
    input.adjustments = timeline([row(1, stacks), row(2, returned.replace("of 1", "of 0.5"))]).accounting.adjustments;
    input.displayedTotalPot = 6.5; input.collectedMainPot = 6.5;
    expect(reconcileCompleteHandAccounting(input).totals).toMatchObject({ returnedUncalled: 0.5, netCommitted: 6.5 });
  });
  it.each(["incomplete", "no rake evidence", "already net", "net mislabeled gross", "return exceeds gross", "conflicting duplicate", "unknown player", "wrong seat", "off-grid", "net street exceeds net", "awards exceed pot"])("fails closed for %s", variant => {
    const input = complete();
    if (variant === "incomplete") input.coverage = "snapshot_only";
    if (variant === "no rake evidence") input.noRakeOrDropVerified = false;
    if (variant === "already net") (input as { contributionBasis: string }).contributionBasis = "net_after_returns";
    if (variant === "net mislabeled gross") input.players[0]!.grossCommitted = 2;
    if (variant === "return exceeds gross") input.adjustments[0]!.amount = 4;
    if (variant === "conflicting duplicate") input.adjustments.push({ ...input.adjustments[0]!, amount: 2 });
    if (variant === "unknown player") input.adjustments[0]!.playerId = "unknown";
    if (variant === "wrong seat") input.adjustments[0]!.seat = 2;
    if (variant === "off-grid") input.adjustments[0]!.amount = 0.5;
    if (variant === "net street exceeds net") input.players[0]!.netStreetContribution = 3;
    if (variant === "awards exceed pot") input.adjustments.push({ ...input.adjustments[0]!, eventId: "award", kind: "pot_award", amount: 100 });
    expect(reconcileCompleteHandAccounting(input)).toMatchObject({ status: "unknown", totals: null, potLedger: null });
  });
});
