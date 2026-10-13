import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ingestHandLog, newHandTimeline, TIMELINE_LIMIT, type LogRow } from "./handTimeline.js";
import { MISSING_HISTORY_PROOF, REJECTED_BATCH_LIMIT } from "./historyCoverage.js";

const row = (key: number, msg: string): LogRow => ({ createdAt: String(key), msg });
const start = row(1, "-- starting hand #1 --");
const mapping = row(2, readFileSync(new URL("./fixtures/pokernow-player-stacks-live.txt", import.meta.url), "utf8").trimEnd());
const live = JSON.parse(readFileSync(new URL("./fixtures/pokernow-log-v3-live.json", import.meta.url), "utf8"));
// Synthetic full-hand wording/order and timestamps, using the observed return and
// seat-map grammar. Neither a full synthetic hand nor these timestamps prove a contract.
const full = [start, mapping, row(3, '"aizen @ v7UmNXTwjJ" posts a small blind of 1'),
  row(4, '"aizemmmm @ TTXBlZfl8G" posts a big blind of 2'), row(5, '"aizen23 @ OoArqYL22g" raises to 4'),
  row(6, '"aizen @ v7UmNXTwjJ" folds'), row(7, '"aizemmmm @ TTXBlZfl8G" folds'),
  row(8, 'Uncalled bet of 2 returned to "aizen23 @ OoArqYL22g"'),
  row(9, '"aizen23 @ OoArqYL22g" collected 5 from pot'), row(10, "-- ending hand #1 --")];
const timeline = () => newHandTimeline("table:hand:1", 1);

describe("source completeness evidence, never a policy unlock", () => {
  it("does not certify a full synthetic hand from start through return, award and end", () => {
    const t = timeline(); ingestHandLog(t, full.toReversed(), 100);
    expect(t.coverage).toMatchObject({ status: "source_completeness_unproven", historyComplete: false,
      handStartSeen: true, handEndSeen: true, initialNonemptyBatchHadStart: true, unparsedRowCount: 0,
      unresolvedActorSeatCount: 0, retainedRowCount: full.length, sourceSequence: null, sourceWatermark: null, caughtUpToCurrentDecision: false,
      lastBatch: { deliveryOrder: "descending", newRowCount: full.length, overlapRowCount: 0 } });
    expect(t.coverage.missingProof).toEqual(MISSING_HISTORY_PROOF);
    expect(t.events.map(e => e.actor?.seat ?? null)).toEqual([null, null, 1, 2, 3, 1, 2, 3, 3, null]);
    expect(t.accounting.adjustments.map(e => e.kind)).toEqual(["uncalled_return", "pot_award"]);
    expect(t.accounting.totals).toBeNull(); expect(t.historyComplete).toBe(false);
  });
  it("shows missing-start partial coverage for the actual live fixture without guessing attachment time", () => {
    const t = timeline(); ingestHandLog(t, live, 100);
    expect(t.coverage).toMatchObject({ status: "partial_missing_hand_start", ingestionStartedMidHand: "unknown",
      handStartSeen: false, initialNonemptyBatchHadStart: false, acceptedBatchCount: 1,
      firstObservedSourceEvent: { sourceTimestampRaw: "179147737114700", action: "fold" },
      latestObservedSourceEvent: { sourceTimestampRaw: "179147737859100", action: "street" } });
    expect(t.coverage.reason).toContain("cannot be distinguished");
  });
  it("can recover a missing prefix while retaining evidence that the first response lacked it", () => {
    const t = timeline(); ingestHandLog(t, full.slice(5), 100); ingestHandLog(t, full, 200);
    expect(t.coverage).toMatchObject({ status: "source_completeness_unproven", initialNonemptyBatchHadStart: false,
      handStartSeen: true, lateEarlierRowCount: 5, firstObservedSourceEvent: { action: "fold" },
      firstRetainedSourceEvent: { action: "hand_start" }, firstAcceptedAt: 100, lastAcceptedAt: 200 });
    expect(t.historyComplete).toBe(false);
  });
  it("keeps no-response and empty-response coverage unproven without claiming mid-hand attachment", () => {
    const t = timeline();
    expect(t.coverage.status).toBe("source_completeness_unproven");
    ingestHandLog(t, [], 100);
    expect(t.coverage).toMatchObject({ status: "source_completeness_unproven", retainedRowCount: 0, initialNonemptyBatchHadStart: null });
  });
  it("does not upgrade stable repeated full responses and records overlap without duplicating actions", () => {
    const t = timeline(); ingestHandLog(t, full, 100);
    const before = JSON.stringify(t.events);
    for (let i = 1; i <= 3; i++) ingestHandLog(t, full, 100 + i);
    expect(JSON.stringify(t.events)).toBe(before);
    expect(t.coverage).toMatchObject({ acceptedBatchCount: 4, duplicateRefreshRowCount: 30, lateEarlierRowCount: 0,
      lastBatch: { overlapRowCount: 10, newRowCount: 0 }, status: "source_completeness_unproven" });
  });
  it("counts a late earlier row once while preserving original observations", () => {
    const t = timeline(); ingestHandLog(t, [start, full[4]!], 100);
    ingestHandLog(t, [full[4]!, mapping, start], 200);
    ingestHandLog(t, [start, mapping, full[4]!], 300);
    expect(t.coverage.lateEarlierRowCount).toBe(1);
    expect(t.events.map(e => e.observedAt)).toEqual([100, 200, 100]);
    expect(t.coverage.issues).toEqual([]);
  });
  it("does not invent missing actions from gaps between timestamp magnitudes", () => {
    const t = timeline(); ingestHandLog(t, [start, row(999999, '"aizen @ v7UmNXTwjJ" checks')], 100);
    expect(t.coverage.issues).toEqual([]);
    expect(t.coverage.status).toBe("source_completeness_unproven");
  });
  it("keeps identical same-timestamp occurrences and different tied actions explicitly ambiguous", () => {
    const t = timeline();
    const tied = [start, row(2, '"aizen @ v7UmNXTwjJ" checks'), row(2, '"aizen @ v7UmNXTwjJ" checks'), row(2, "Flop: [Kc, 8c, 4c]")];
    ingestHandLog(t, tied, 100); ingestHandLog(t, tied.toReversed(), 200);
    expect(t.events).toHaveLength(4);
    expect(t.events.slice(1).every(e => e.order === "ambiguous" && e.street === null)).toBe(true);
    expect(t.coverage).toMatchObject({ ambiguousTimestampGroupCount: 1, duplicateRefreshRowCount: 4, lastBatch: { identicalExtraRowCount: 1 } });
    expect(t.coverage.reason).toContain("Equal timestamps");
  });
  it("normalizes reordered delivery without treating input array order as action order or a gap", () => {
    const t = timeline(); ingestHandLog(t, full, 100);
    const original = JSON.stringify(t.events);
    ingestHandLog(t, [...full.slice(5), ...full.slice(0, 5)], 200);
    expect(t.coverage.lastBatch!.deliveryOrder).toBe("mixed");
    expect(JSON.stringify(t.events)).toBe(original); expect(t.coverage.issues).toEqual([]);
  });
  it("records an omitted middle row while retaining it, and does not erase the anomaly on recovery", () => {
    const t = timeline(); ingestHandLog(t, full, 100); ingestHandLog(t, full.filter((_, i) => i !== 4), 200);
    expect(t.events).toHaveLength(10);
    expect(t.coverage).toMatchObject({ status: "incomplete_gap_detected", omittedRowObservationCount: 1,
      lastBatch: { omittedPreviouslyRetainedRowCount: 1, possibleResetOrStaleResponse: false } });
    expect(t.coverage.issues.map(i => i.code)).toContain("response_omission");
    ingestHandLog(t, full, 300);
    expect(t.coverage.status).toBe("incomplete_gap_detected");
  });
  it.each([{ batch: [] }, { batch: [row(0, '"unknown @ unknown-id" checks')] }])("flags possible reset/stale response without clearing accepted history: %j", ({ batch }) => {
    const t = timeline(); ingestHandLog(t, full, 100); ingestHandLog(t, batch, 200);
    expect(t.coverage.lastBatch!.possibleResetOrStaleResponse).toBe(true);
    expect(t.coverage.issues.map(i => i.code)).toContain("possible_reset_or_stale_response");
    expect(t.events.some(e => e.action === "hand_start")).toBe(true);
  });
  it("retains unknown text inside an otherwise valid full hand and exposes interpretation failure", () => {
    const t = timeline(); ingestHandLog(t, [...full, row(11, "UNSUPPORTED settlement text")], 100);
    expect(t.coverage.unparsedRowCount).toBe(1);
    expect(t.coverage.reason).toContain("Unparsed rows");
    expect(t.events.at(-1)!.evidence).toBe("UNSUPPORTED settlement text");
    expect(t.coverage.handEndSeen).toBe(true); expect(t.historyComplete).toBe(false);
  });
  it("records malformed timestamp evidence while rejecting the entire batch atomically", () => {
    const t = timeline(); ingestHandLog(t, full, 100);
    const before = JSON.stringify([t.events, t.seatMapping, t.accounting]);
    expect(() => ingestHandLog(t, [start, { createdAt: "2oops", msg: "original unsupported text" }], 200)).toThrow();
    expect(JSON.stringify([t.events, t.seatMapping, t.accounting])).toBe(before);
    expect(t.coverage).toMatchObject({ status: "incomplete_gap_detected", acceptedBatchCount: 1, rejectedBatchCount: 1,
      rejectedBatches: [{ observedAt: 200, rowIndex: 1, batchRowCount: 2,
        sample: { createdAt: "2oops", msg: "original unsupported text", truncated: false } }] });
  });
  it("bounds rejected evidence and exposes truncation rather than silently dropping errors", () => {
    const t = timeline();
    for (let i = 0; i < REJECTED_BATCH_LIMIT + 2; i++) {
      expect(() => ingestHandLog(t, [{ createdAt: "9".repeat(1000), msg: "x".repeat(5000) }], i)).toThrow();
    }
    expect(t.coverage.rejectedBatches).toHaveLength(REJECTED_BATCH_LIMIT);
    expect(t.coverage.rejectedBatchDetailsDropped).toBe(2);
    expect(t.coverage.rejectedBatches[0]!.sample).toMatchObject({ truncated: true });
    expect(t.coverage.rejectedBatches[0]!.sample!.msg).toHaveLength(4000);
    expect(t.events).toEqual([]);
  });
  it.each(["starting", "ending"])("rejects a %s marker from another hand, preserving the conflicting row as rejected evidence", marker => {
    const t = timeline();
    expect(() => ingestHandLog(t, [row(1, `-- ${marker} hand #2 --`)], 100)).toThrow(/contradicts/);
    expect(t.coverage.rejectedBatches[0]!.sample!.msg).toContain("#2");
    expect(t.events).toEqual([]);
  });
  it("starts coverage afresh on a new hand; prior start/end/omissions cannot certify it", () => {
    const old = timeline(); ingestHandLog(old, full, 100); ingestHandLog(old, [], 200);
    const next = newHandTimeline("table:hand:2", 2);
    expect(next.coverage).toMatchObject({ acceptedBatchCount: 0, handStartSeen: false, handEndSeen: false,
      status: "source_completeness_unproven", issues: [], firstObservedSourceEvent: null });
    expect(old.coverage.handEndSeen).toBe(true);
  });
  it("exposes retained bounds and lost history without treating start eviction as a mid-hand start", () => {
    const t = timeline();
    ingestHandLog(t, [start, ...Array.from({ length: TIMELINE_LIMIT }, (_, i) => row(i + 2, '"aizen @ v7UmNXTwjJ" checks'))], 100);
    expect(t.coverage).toMatchObject({ handStartSeen: true, status: "incomplete_gap_detected", retentionLossLowerBound: 1,
      firstObservedSourceEvent: { action: "hand_start" }, firstRetainedSourceEvent: { action: "check" }, retainedRowCount: TIMELINE_LIMIT });
    expect(t.coverage.issues.map(i => i.code)).toContain("retention_loss");
  });
  it("does not promote the fallback's local sequence into a source completeness certificate", () => {
    expect(newHandTimeline("local").coverage).toMatchObject({ status: "snapshot_only", sourceOrderingBasis: "snapshot_observation_order",
      sourceSequence: null, sourceWatermark: null, historyComplete: false });
  });
});
