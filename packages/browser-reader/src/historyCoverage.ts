import type { HandTimeline, TimelineEvent } from "./handTimeline.js";

export const COVERAGE_ISSUE_LIMIT = 32;
export const REJECTED_BATCH_LIMIT = 8;
export const MISSING_HISTORY_PROOF = [
  "No validated hand-scoped contiguous event IDs or equivalent authoritative complete-prefix certificate.",
  "No log watermark tied to the current table decision; a successful GET does not prove catch-up.",
  "No validated source tie-break for equal timestamps; receipt/presentation order is not poker action order.",
  "No validated full-response pagination, reset/revision or reconnect/backfill coverage contract.",
] as const;

type EventReference = Pick<TimelineEvent, "id" | "sourceTimestamp" | "sourceTimestampRaw" | "observedAt" | "action" | "evidence">;
export type CoverageIssueCode = "response_omission" | "possible_reset_or_stale_response" | "rejected_batch" | "source_failure" | "retention_loss" | "metadata_gap" | "identity_conflict";
export interface CoverageIssue {
  code: CoverageIssueCode;
  reason: string;
  firstObservedAt: number;
  lastObservedAt: number;
  occurrences: number;
}
export interface HistoryCoverage {
  /** No complete state is reachable with the current source contract. */
  status: "snapshot_only" | "partial_missing_hand_start" | "incomplete_gap_detected" | "source_completeness_unproven";
  historyComplete: false;
  reason: string;
  missingProof: readonly string[];
  sourceOrderingBasis: "numeric_timestamp_candidate" | "snapshot_observation_order";
  sourceSequence: null;
  sourceWatermark: null;
  caughtUpToCurrentDecision: false;
  /** Missing start does not prove the reader actually attached mid-hand. */
  ingestionStartedMidHand: "unknown";
  acceptedBatchCount: number;
  firstAcceptedAt: number | null;
  lastAcceptedAt: number | null;
  firstObservedSourceEvent: EventReference | null;
  latestObservedSourceEvent: EventReference | null;
  firstRetainedSourceEvent: EventReference | null;
  lastRetainedSourceEvent: EventReference | null;
  handStartSeen: boolean;
  handEndSeen: boolean;
  initialNonemptyBatchHadStart: boolean | null;
  retainedRowCount: number;
  unparsedRowCount: number;
  ambiguousTimestampGroupCount: number;
  unresolvedActorSeatCount: number;
  counterScope: string;
  /** Re-observed retained identities, not proof two source rows are the same action. */
  duplicateRefreshRowCount: number;
  /** New retained rows with a key below the previously observed maximum. */
  lateEarlierRowCount: number;
  rejectedBatchCount: number;
  sourceFailureCount: number;
  omittedRowObservationCount: number;
  retentionLossLowerBound: number;
  issues: CoverageIssue[];
  issueDetailsTruncated: boolean;
  rejectedBatches: Array<{
    observedAt: number; reason: string; rowIndex: number | null; batchRowCount: number | null;
    sample: { createdAt: number | string | null; createdAtType: string; msg: string | null; msgType: string; truncated: boolean } | null;
  }>;
  rejectedBatchDetailsDropped: number;
  lastBatch: {
    observedAt: number; rowCount: number;
    deliveryOrder: "empty_or_single" | "all_equal" | "ascending" | "descending" | "mixed";
    overlapRowCount: number; newRowCount: number; lateEarlierRowCount: number;
    identicalExtraRowCount: number; omittedPreviouslyRetainedRowCount: number;
    possibleResetOrStaleResponse: boolean;
  } | null;
}

export function emptyHistoryCoverage(sourceReported: boolean): HistoryCoverage {
  return {
    status: sourceReported ? "source_completeness_unproven" : "snapshot_only", historyComplete: false,
    reason: sourceReported ? "No accepted log response yet; source coverage and catch-up are unproven." : "DOM polling cannot prove complete action coverage or order.",
    missingProof: [...MISSING_HISTORY_PROOF], sourceOrderingBasis: sourceReported ? "numeric_timestamp_candidate" : "snapshot_observation_order",
    sourceSequence: null, sourceWatermark: null, caughtUpToCurrentDecision: false, ingestionStartedMidHand: "unknown",
    acceptedBatchCount: 0, firstAcceptedAt: null, lastAcceptedAt: null,
    firstObservedSourceEvent: null, latestObservedSourceEvent: null, firstRetainedSourceEvent: null, lastRetainedSourceEvent: null,
    handStartSeen: false, handEndSeen: false, initialNonemptyBatchHadStart: null,
    retainedRowCount: 0, unparsedRowCount: 0, ambiguousTimestampGroupCount: 0, unresolvedActorSeatCount: 0,
    counterScope: "Cumulative response observations against retained row identities, not unique whole-hand actions. Evicted rows may be recounted; retention loss is explicit. Identical signatures are not authoritative action IDs.",
    duplicateRefreshRowCount: 0, lateEarlierRowCount: 0, rejectedBatchCount: 0, sourceFailureCount: 0,
    omittedRowObservationCount: 0, retentionLossLowerBound: 0, issues: [], issueDetailsTruncated: false,
    rejectedBatches: [], rejectedBatchDetailsDropped: 0, lastBatch: null,
  };
}

function classify(c: HistoryCoverage) {
  if (c.sourceOrderingBasis === "snapshot_observation_order") return;
  if (c.issues.length || c.issueDetailsTruncated) {
    c.status = "incomplete_gap_detected";
    c.reason = "Coverage discontinuity or acquisition failure observed; see issues. Retained rows are not silently removed. Missing action count/cause cannot be inferred.";
  } else if (c.acceptedBatchCount && !c.handStartSeen && c.retainedRowCount) {
    c.status = "partial_missing_hand_start";
    c.reason = "No hand start has been observed. Mid-hand attachment, response lag and source omission cannot be distinguished.";
  } else {
    c.status = "source_completeness_unproven";
    c.reason = "No contiguous coverage/catch-up certificate. Start/end markers and repeated identical responses do not prove completeness.";
  }
  if (c.unparsedRowCount) c.reason += " Unparsed rows prevent complete action interpretation.";
  if (c.ambiguousTimestampGroupCount) c.reason += " Equal timestamps prevent a proven total event order.";
}

export function recordCoverageIssue(t: HandTimeline, code: CoverageIssueCode, reason: string, at: number) {
  const c = t.coverage;
  const existing = c.issues.find(issue => issue.code === code);
  if (existing) { existing.lastObservedAt = at; existing.occurrences++; }
  else if (c.issues.length < COVERAGE_ISSUE_LIMIT) c.issues.push({ code, reason: reason.slice(0, 500), firstObservedAt: at, lastObservedAt: at, occurrences: 1 });
  else c.issueDetailsTruncated = true;
  classify(c);
}

/** Bounded evidence of rejected input, never coerced into an accepted poker event. */
export function recordRejectedLogBatch(t: HandTimeline, payload: unknown, reason: string, at: number, rowIndex: number | null = null) {
  const c = t.coverage;
  c.rejectedBatchCount++;
  const raw: unknown = Array.isArray(payload) && rowIndex !== null ? payload[rowIndex] : null;
  const row = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
  const sample = row ? {
    createdAt: typeof row.createdAt === "string" ? row.createdAt.slice(0, 160) :
      typeof row.createdAt === "number" && Number.isFinite(row.createdAt) ? row.createdAt : null,
    createdAtType: typeof row.createdAt,
    msg: typeof row.msg === "string" ? row.msg.slice(0, 4000) : null, msgType: typeof row.msg,
    truncated: (typeof row.createdAt === "string" && row.createdAt.length > 160) || (typeof row.msg === "string" && row.msg.length > 4000),
  } : null;
  c.rejectedBatches.push({ observedAt: at, reason: reason.slice(0, 500), rowIndex,
    batchRowCount: Array.isArray(payload) ? payload.length : null, sample });
  if (c.rejectedBatches.length > REJECTED_BATCH_LIMIT) { c.rejectedBatches.shift(); c.rejectedBatchDetailsDropped++; }
  recordCoverageIssue(t, "rejected_batch", "One or more batches were rejected; accepted events/mapping/accounting remain intact. Rejected input is not silently skipped.", at);
}

export function recordLogSourceFailure(t: HandTimeline, reason: string, at: number) {
  t.coverage.sourceFailureCount++;
  recordCoverageIssue(t, "source_failure", reason, at);
}

const ref = (e: TimelineEvent): EventReference => ({ id: e.id, sourceTimestamp: e.sourceTimestamp,
  sourceTimestampRaw: e.sourceTimestampRaw, observedAt: e.observedAt, action: e.action, evidence: e.evidence });

/** Observe a validated full-response batch before merging. No source sequence is invented. */
export function observeLogBatch(t: HandTimeline, incoming: readonly TimelineEvent[], existing: ReadonlyMap<string, TimelineEvent>, at: number) {
  const c = t.coverage;
  c.sourceOrderingBasis = "numeric_timestamp_candidate";
  const incomingIds = new Set(incoming.map(e => e.id));
  const overlap = incoming.filter(e => existing.has(e.id)).length;
  const priorMax = c.latestObservedSourceEvent?.sourceTimestamp ?? null;
  const late = incoming.filter(e => !existing.has(e.id) && priorMax !== null && e.sourceTimestamp! < priorMax).length;
  const omitted = [...existing.keys()].filter(id => !incomingIds.has(id)).length;
  const first = [...incoming].sort((a, b) => a.sourceTimestamp! - b.sourceTimestamp!)[0];
  const last = [...incoming].sort((a, b) => b.sourceTimestamp! - a.sourceTimestamp!)[0];
  const possibleReset = omitted > 0 && (!last || (overlap === 0 && priorMax !== null && last.sourceTimestamp! <= priorMax));
  let ascending = false, descending = false;
  for (let i = 1; i < incoming.length; i++) {
    ascending ||= incoming[i]!.sourceTimestamp! > incoming[i - 1]!.sourceTimestamp!;
    descending ||= incoming[i]!.sourceTimestamp! < incoming[i - 1]!.sourceTimestamp!;
  }
  c.lastBatch = {
    observedAt: at, rowCount: incoming.length,
    deliveryOrder: incoming.length < 2 ? "empty_or_single" : ascending && descending ? "mixed" : ascending ? "ascending" : descending ? "descending" : "all_equal",
    overlapRowCount: overlap, newRowCount: incoming.length - overlap, lateEarlierRowCount: late,
    identicalExtraRowCount: incoming.length - new Set(incoming.map(e => JSON.stringify([e.sourceTimestamp, e.evidence]))).size,
    omittedPreviouslyRetainedRowCount: omitted, possibleResetOrStaleResponse: possibleReset,
  };
  c.acceptedBatchCount++; c.firstAcceptedAt ??= at; c.lastAcceptedAt = at;
  c.duplicateRefreshRowCount += overlap; c.lateEarlierRowCount += late; c.omittedRowObservationCount += omitted;
  if (first) {
    c.firstObservedSourceEvent ??= ref(first);
    c.initialNonemptyBatchHadStart ??= incoming.some(e => e.action === "hand_start");
  }
  if (last && (priorMax === null || last.sourceTimestamp! > priorMax)) c.latestObservedSourceEvent = ref(last);
  c.handStartSeen ||= incoming.some(e => e.action === "hand_start");
  c.handEndSeen ||= incoming.some(e => e.action === "hand_end");
  if (omitted) recordCoverageIssue(t, "response_omission", "A requested full-hand response omitted previously retained row identities. Stale, truncated, revised or reset response possible; missing rows are retained.", at);
  if (possibleReset) recordCoverageIssue(t, "possible_reset_or_stale_response", "An empty response or regressed response without retained overlap followed known rows; a reset cannot be distinguished from stale/partial delivery.", at);
}

export function refreshHistoryCoverage(t: HandTimeline, at: number) {
  const c = t.coverage;
  const events = t.events.filter(e => e.source === "pokernow_log_v3");
  c.firstRetainedSourceEvent = events[0] ? ref(events[0]) : null;
  c.lastRetainedSourceEvent = events.at(-1) ? ref(events.at(-1)!) : null;
  c.retainedRowCount = events.length;
  c.unparsedRowCount = events.filter(e => e.action === "unparsed").length;
  c.ambiguousTimestampGroupCount = new Set(events.filter(e => e.order === "ambiguous").map(e => e.sourceTimestamp)).size;
  c.unresolvedActorSeatCount = events.filter(e => e.actor && e.actor.seat === null).length;
  if (t.droppedEvents > c.retentionLossLowerBound) recordCoverageIssue(t, "retention_loss", "Local retention discarded source rows; counts/deduplication are limited to retained identities, not whole-hand coverage.", at);
  c.retentionLossLowerBound = t.droppedEvents;
  t.historyComplete = false; c.historyComplete = false;
  classify(c);
}
