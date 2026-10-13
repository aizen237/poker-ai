import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createSourceMetadataAudit, inspectMetadataFields, inspectSocketMetadata, validateSocketMetadata,
  SOCKET_METADATA_LIMIT, LOG_METADATA_LIMIT, LOG_METADATA_ROW_LIMIT, SOCKET_STATE_CANDIDATES } from "../../../apps/pokernow-extension/src/sourceMetadata.js";
import { identityFromSocketPacket, TIMELINE_CHANNEL } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { parseLogRows } from "./handTimeline.js";

const live = JSON.parse(readFileSync(new URL("./fixtures/pokernow-log-v3-live.json", import.meta.url), "utf8"));
const verifiedLinks = JSON.parse(readFileSync(new URL("./fixtures/pokernow-source-links-verified.json", import.meta.url), "utf8")) as {
  socketNowChain: number[]; logTimestampMatches: Array<{ socketNow: number; createdAt: string; description: string }>;
};
// All socket envelopes, extra fields and headers below are synthetic parser tests,
// NOT newly discovered PokerNow fields or source contract evidence.
const packet = (event: string, payload: unknown, ...extras: unknown[]) => "42" + JSON.stringify([event, payload, ...extras]);
const registered = packet("registered", { gameState: { id: "table", hI: "h1", gN: 1, now: 100, r: true,
  players: { hidden: "DO-NOT-COPY" }, privateCards: "DO-NOT-COPY" }, currentPlayer: { id: "hero", token: "DO-NOT-COPY" }, token: "DO-NOT-COPY" });
function runtime(body: unknown = live, headers: Record<string, string> = {}) {
  let now = 10000;
  const fetchLog = vi.fn(async () => new Response(JSON.stringify(body), { headers }));
  const source = createTimelineRuntime({ tableId: "table", sessionId: "test", fetchLog, now: () => now });
  const identity = identityFromSocketPacket(registered, "table", null)!;
  source.accept({ channel: TIMELINE_CHANNEL, type: "identity", sequence: 1, connected: true, tableId: "table", identity });
  return { source, fetchLog, advance: () => { now += 4000; } };
}
function metadataMessage(data = registered, sequence = 1, generation = 1) {
  return { channel: TIMELINE_CHANNEL, type: "source_metadata", tableId: "table", sequence, generation, metadata: inspectSocketMetadata(data) };
}

describe("observational source metadata inventory", () => {
  it("reports exactly what is lost for every user-reported socket state candidate", () => {
    const audit = createSourceMetadataAudit();
    // Adversarial test values, NOT captured field structures or proposed meanings.
    const candidates = Object.fromEntries(SOCKET_STATE_CANDIDATES.map(name => [name, { nested: ["DO-NOT-COPY"] }]));
    audit.socket(inspectSocketMetadata(packet("registered", { gameState: { now: 100, ...candidates }, currentPlayer: { id: "hero" } })), 1, 1, 1);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 100, now: 110, eventsData: ["DO-NOT-COPY"] })), 2, 1, 2);
    const evidence = audit.snapshot().socketStateEvidence;
    expect(evidence).toMatchObject({ provesRoster: false, provesPositions: false, provesActionWindow: false, provesRaiseLegality: false });
    expect(evidence.fields.every(field => field.availability === "name_and_type_only" && !field.rawValueRetained && field.semanticStatus === "unverified")).toBe(true);
    expect(evidence.fields.find(f => f.name === "eventsData")!.samples.map(s => s.type)).toEqual(["object", "array"]);
    expect(JSON.stringify(audit.snapshot())).not.toContain("DO-NOT-COPY");
  });
  it("does not report a missing patch field as removal, false membership or an empty event list", () => {
    const audit = createSourceMetadataAudit();
    audit.socket(inspectSocketMetadata(packet("registered", { gameState: { now: 100, eventsData: [] } })), 1, 1, 1);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 100, now: 110 })), 2, 1, 2);
    const fields = audit.snapshot().socketStateEvidence.fields;
    expect(fields.find(f => f.name === "eventsData")!.samples).toHaveLength(1);
    expect(fields.find(f => f.name === "players")).toMatchObject({ availability: "not_in_retained_inventory", rawValueRetained: false });
    expect(audit.snapshot().socketStateEvidence.provesActionWindow).toBe(false);
  });
  it("distinguishes registration wrapper fields from gameState fields", () => {
    const audit = createSourceMetadataAudit();
    audit.socket(inspectSocketMetadata(packet("registered", { gameState: { now: 100 }, eventsData: [] })), 1, 1, 1);
    expect(audit.snapshot().socketStateEvidence.fields.find(f => f.name === "eventsData")!.samples).toEqual([
      { event: "registered", localSequence: 1, generation: 1, type: "array", boundary: "envelope" },
    ]);
  });
  it("keeps field inventory generations distinct and counts no cached replay twice", () => {
    const audit = createSourceMetadataAudit();
    const initial = inspectSocketMetadata(packet("registered", { gameState: { now: 100, players: {} } }));
    audit.socket(initial, 1, 1, 1); audit.socket(initial, 1, 1, 2);
    audit.socket(initial, 2, 2, 3);
    const players = audit.snapshot().socketStateEvidence.fields.find(f => f.name === "players")!;
    expect(players.samples.map(s => s.generation)).toEqual([1, 2]);
    expect(audit.snapshot().socketStateEvidence.provesRoster).toBe(false);
  });
  it("preserves known frame fields while withholding player/card/token values", () => {
    const metadata = inspectSocketMetadata(registered)!;
    expect(metadata).toMatchObject({ event: "registered", wrapperLength: 2 });
    expect(metadata.frame.fields).toContainEqual({ path: "now", type: "number", value: 100 });
    expect(metadata.frame.fields).toContainEqual({ path: "r", type: "boolean", value: true });
    expect(metadata.envelope.fields).toContainEqual({ path: "currentPlayer", type: "object" });
    expect(JSON.stringify(metadata)).not.toContain("DO-NOT-COPY");
    expect(validateSocketMetadata(metadata)).toEqual(metadata);
  });
  it("inventories secondary fields before row parsing discards them, without assigning semantics", () => {
    const raw = { ...live[0], eventId: "sample-id", sequence: 10, revision: 4, token: "DO-NOT-COPY" };
    expect(parseLogRows([raw])).toEqual([live[0]]);
    const inventory = inspectMetadataFields(raw);
    expect(inventory.fields).toContainEqual({ path: "sequence", type: "number", value: 10 });
    expect(inventory.fields).toContainEqual({ path: "revision", type: "number", value: 4 });
    expect(inventory.fields).toContainEqual({ path: "token", type: "string" });
    expect(JSON.stringify(inventory)).not.toContain("DO-NOT-COPY");
  });
  it("retains envelope and extra wrapper metadata without accepting a new action/identity schema", () => {
    const data = packet("gC", { hI: "h1", gN: 1, now: "105", pre: "100", metadata: { version: "v2", token: "DO-NOT-COPY" } }, { batchId: "b1" });
    const metadata = inspectSocketMetadata(data)!;
    expect(metadata.extraWrapperItems[0]!.fields).toContainEqual({ path: "batchId", type: "string", value: "b1" });
    expect(metadata.frame.fields).toContainEqual({ path: "metadata.version", type: "string", value: "v2" });
    expect(identityFromSocketPacket(data, "table", null)).toBeNull();
    expect(JSON.stringify(metadata)).not.toContain("DO-NOT-COPY");
  });
  it.each(["not-json", "42[", '42["chat",{"token":"secret"}]', '42["gC",null]', '42123["gC",{}]'])("does not broaden socket acceptance for %s", data => {
    expect(inspectSocketMetadata(data)).toBeNull();
  });
  it("compares only observed raw predecessor equality and numeric magnitude, including duplicates/regression", () => {
    const audit = createSourceMetadataAudit();
    audit.socket(inspectSocketMetadata(registered), 1, 1, 1);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 100, now: 105 })), 2, 1, 2);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 105, now: 105 })), 3, 1, 3);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 99, now: 104 })), 4, 1, 4);
    expect(audit.snapshot().socket.slice(1).map(e => [e.nowComparedWithPreviousObservation, e.preExactlyMatchesPreviousNow])).toEqual([
      ["increased", true], ["equal", true], ["decreased", false],
    ]);
    expect(audit.snapshot()).toMatchObject({ authority: "observational_only", provesCompletePrefix: false });
  });
  it("does not coerce raw types or assume units; opaque cursors remain incomparable", () => {
    const audit = createSourceMetadataAudit();
    audit.socket(inspectSocketMetadata(registered), 1, 1, 1);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: "100", now: "101" })), 2, 1, 2);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: "101", now: "opaque-cursor" })), 3, 1, 3);
    expect(audit.snapshot().socket[1]).toMatchObject({ nowComparedWithPreviousObservation: "increased", preExactlyMatchesPreviousNow: false });
    expect(audit.snapshot().socket[2]).toMatchObject({ nowComparedWithPreviousObservation: "not_comparable", preExactlyMatchesPreviousNow: true });
  });
  it("does not compare different socket generations or count cached bridge replays again", () => {
    const audit = createSourceMetadataAudit(), metadata = inspectSocketMetadata(registered);
    audit.socket(metadata, 1, 1, 1); audit.socket(metadata, 1, 1, 2);
    audit.socket(metadata, 2, 2, 3);
    expect(audit.snapshot().socketObservations).toBe(2);
    expect(audit.snapshot().socket[1]).toMatchObject({ preExactlyMatchesPreviousNow: null, nowComparedWithPreviousObservation: "not_comparable" });
  });
  it("bounds socket, response, field and row retention and reports omissions", () => {
    const audit = createSourceMetadataAudit();
    for (let i = 1; i <= SOCKET_METADATA_LIMIT + 3; i++) audit.socket(inspectSocketMetadata(registered), i, 1, i);
    for (let i = 0; i < LOG_METADATA_LIMIT + 2; i++) {
      const entry = audit.response(new Headers(), 200, "h", 1, i);
      audit.payload(entry, Array(LOG_METADATA_ROW_LIMIT + 1).fill(live[0]));
    }
    expect(audit.snapshot()).toMatchObject({ socketSamplesDropped: 3, logSamplesDropped: 2 });
    expect(audit.snapshot().socket).toHaveLength(SOCKET_METADATA_LIMIT);
    expect(audit.snapshot().firstSocket!.localSequence).toBe(1);
    expect(audit.snapshot().logs[0]).toMatchObject({ rowSamplesTruncated: true, rowCount: LOG_METADATA_ROW_LIMIT + 1 });
    expect(inspectMetadataFields(Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`key${i}`, i])))).toMatchObject({ truncated: true });
  });
  it("rejects unsafe bridge metadata rather than forwarding hidden/oversized values", () => {
    expect(validateSocketMetadata({ event: { toString: "not a function" } })).toBeNull();
    for (const field of [{ path: "token", type: "string", value: "secret" }, { path: "now", type: "number", value: Infinity },
      { path: "cursor", type: "string", value: "x".repeat(161) }, { path: "now", type: "number", value: "1" }]) {
      const metadata = inspectSocketMetadata(registered)!; metadata.frame.fields = [field];
      expect(validateSocketMetadata(metadata)).toBeNull();
    }
  });
});

describe("metadata is separate from history and all policy/identity gates", () => {
  it("saves actual response layout/index/timestamp evidence and selected headers before normalization", async () => {
    const f = runtime(live, { ETag: '"sample"', Date: "Fri, 09 Oct 2026 00:00:00 GMT", "Set-Cookie": "DO-NOT-COPY", "X-Token": "DO-NOT-COPY" });
    await f.source.tick();
    const snapshot = f.source.snapshot();
    const log = snapshot.sourceStatus.sourceMetadata.logs[0]!;
    expect(log).toMatchObject({ payloadKind: "array", rowCount: 4, requestedHandId: "table:hand:h1" });
    expect(log.rows.map(r => r.responseIndex)).toEqual([0, 1, 2, 3]);
    expect(log.rows[0]!.metadata.fields).toContainEqual({ path: "createdAt", type: "string", value: "179147737859100" });
    expect(log.headers).toContainEqual({ path: "etag", type: "string", value: '"sample"' });
    expect(JSON.stringify(log)).not.toContain("DO-NOT-COPY");
    expect(snapshot.current.events[0]!.sourceTimestampRaw).toBe("179147737114700");
    expect(snapshot.current.historyComplete).toBe(false);
  });
  it("does not unwrap an unsupported envelope or treat a claimed watermark/complete flag as proof", async () => {
    const f = runtime({ metadata: { watermark: "w1", complete: true, count: 4 }, rows: live });
    await f.source.tick();
    const snapshot = f.source.snapshot();
    expect(snapshot.current.events).toEqual([]);
    expect(snapshot.current.coverage.rejectedBatchCount).toBe(1);
    expect(snapshot.sourceStatus.sourceMetadata.logs[0]!.envelope.fields).toContainEqual({ path: "metadata.complete", type: "boolean", value: true });
    expect(snapshot.current.historyComplete).toBe(false);
    expect(snapshot.sourceStatus.logContractVerified).toBe(false);
    expect(snapshot.sourceStatus.settlementComplete).toBe(false);
  });
  it("metadata observations cannot change identity, coverage, accounting or request cadence", async () => {
    const f = runtime(); await f.source.tick();
    const before = JSON.stringify(f.source.snapshot().current);
    const originalIdentity = JSON.stringify(f.source.snapshot().sourceStatus.identity);
    f.source.accept(metadataMessage(packet("gC", { hI: "other", gN: 9, now: 10, pre: 9, complete: true, watermark: 10 })));
    await f.source.tick();
    expect(JSON.stringify(f.source.snapshot().current)).toBe(before);
    expect(JSON.stringify(f.source.snapshot().sourceStatus.identity)).toBe(originalIdentity);
    expect(f.fetchLog).toHaveBeenCalledTimes(1);
    expect(f.source.snapshot().sourceStatus.sourceMetadata.socketObservations).toBe(1);
  });
  it("never uses a secondary field to resolve tied timestamps or alter deduplication", async () => {
    const f = runtime([{ createdAt: "1", msg: '"Hero @ hero" checks', sequence: 7 },
      { createdAt: "1", msg: '"Other @ other" checks', sequence: 8 }]);
    await f.source.tick();
    expect(f.source.snapshot().current.events.every(e => e.order === "ambiguous")).toBe(true);
    f.advance(); await f.source.tick();
    expect(f.source.snapshot().current.events).toHaveLength(2);
    expect(f.source.snapshot().sourceStatus.sourceMetadata.logResponses).toBe(2);
    expect(f.source.snapshot().current.historyComplete).toBe(false);
  });
});

describe("connection-scoped chain and observational timestamp links", () => {
  function capture(values = verifiedLinks.socketNowChain) {
    const audit = createSourceMetadataAudit();
    values.forEach((now, i) => audit.socket(inspectSocketMetadata(i === 0
      ? packet("registered", { gameState: { now } }) : packet("gC", { pre: values[i - 1], now })), i + 1, 1, i));
    return audit;
  }
  function response(audit: ReturnType<typeof createSourceMetadataAudit>, timestamps: unknown[]) {
    const entry = audit.response(new Headers(), 200, "hand", 1, 10);
    audit.payload(entry, timestamps.map(createdAt => ({ createdAt, msg: "synthetic message" })));
    return entry;
  }
  it("replays the reported eight-frame live chain without asserting complete action coverage", () => {
    const audit = capture();
    expect(audit.snapshot().socketContinuity).toMatchObject({ generation: 1, status: "observed_continuous", chainGap: false, linkedUpdates: 7, reasons: [] });
    expect(audit.snapshot().provesCompletePrefix).toBe(false);
  });
  it("records a broken predecessor persistently even after later linked or full frames", () => {
    const audit = capture([100, 110]);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 115, now: 120 })), 3, 1, 3);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 120, now: 130 })), 4, 1, 4);
    audit.socket(inspectSocketMetadata(packet("rup", { now: 140 })), 5, 1, 5);
    expect(audit.snapshot().socketContinuity).toMatchObject({ status: "incomplete", chainGap: true });
  });
  it("resets at reconnect and requires a new registration and subsequent link", () => {
    const audit = capture([100, 110]);
    audit.socket(inspectSocketMetadata(packet("registered", { gameState: { now: 5 } })), 3, 2, 3);
    expect(audit.snapshot().socketContinuity).toMatchObject({ status: "unknown", generation: 2, linkedUpdates: 0 });
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 5, now: 6 })), 4, 2, 4);
    expect(audit.snapshot().socketContinuity).toMatchObject({ status: "observed_continuous", generation: 2, linkedUpdates: 1 });
    expect(audit.snapshot().provesCompletePrefix).toBe(false);
  });
  it("cannot establish continuity from mid-connection attachment or missing fields", () => {
    const audit = createSourceMetadataAudit();
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 100, now: 110 })), 1, 1, 1);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 110, now: 120 })), 2, 1, 2);
    expect(audit.snapshot().socketContinuity.status).toBe("incomplete");
    const other = capture([100]);
    other.socket(inspectSocketMetadata(packet("gC", { now: 110 })), 2, 1, 2);
    expect(other.snapshot().socketContinuity.status).toBe("incomplete");
  });
  it("does not count bridge replay as a new frame; repeated source cursor pairs remain ambiguous", () => {
    const audit = capture([100, 110]);
    const duplicate = inspectSocketMetadata(packet("gC", { pre: 100, now: 110 }));
    audit.socket(duplicate, 2, 1, 3);
    expect(audit.snapshot().socketContinuity.status).toBe("observed_continuous");
    audit.socket(duplicate, 3, 1, 4);
    expect(audit.snapshot().socketContinuity).toMatchObject({ status: "incomplete", duplicateCandidates: 1, chainGap: false });
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 110, now: 120 })), 4, 1, 5);
    expect(audit.snapshot().socketContinuity.status).toBe("incomplete");
  });
  it.each([{ pre: 110, now: 105 }, { pre: 90, now: 100 }, { pre: 110, now: 110 }])("flags out-of-order/non-increasing frame %j", frame => {
    const audit = capture([100, 110]);
    audit.socket(inspectSocketMetadata(packet("gC", frame)), 3, 1, 3);
    expect(audit.snapshot().socketContinuity).toMatchObject({ status: "incomplete", chainGap: true });
  });
  it("does not ignore local observation gaps or stale generations", () => {
    const audit = capture([100, 110]);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 110, now: 120 })), 4, 1, 4);
    expect(audit.snapshot().socketContinuity.chainGap).toBe(true);
    audit.socket(inspectSocketMetadata(packet("registered", { gameState: { now: 200 } })), 5, 2, 5);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 120, now: 130 })), 6, 1, 6);
    expect(audit.snapshot().socketContinuity).toMatchObject({ generation: 2, chainGap: true });
    expect(audit.snapshot().socket.at(-1)!.localConnectionGeneration).toBe(2);
  });
  it("links the four reported exact raw timestamp pairs, without requiring every update to log", () => {
    const audit = capture();
    const entry = response(audit, verifiedLinks.logTimestampMatches.map(row => row.createdAt));
    expect(entry.timestampLinks.map(link => link.candidates[0]!.socketNowRaw)).toEqual(verifiedLinks.logTimestampMatches.map(row => row.socketNow));
    expect(entry.timestampLinks.map(link => link.sourceTimestampRaw)).toEqual(verifiedLinks.logTimestampMatches.map(row => row.createdAt));
    expect(entry.headTimestampObserved).toBe(true);
    expect(entry.provesCurrentDecisionCatchUp).toBe(false);
    expect(audit.snapshot().socketContinuity.chainGap).toBe(false);
  });
  it("retains non-matches as unknown, not a log gap or a time/unit conversion", () => {
    const audit = capture([100, 110]);
    const entry = response(audit, ["10000", "10999", "110", "1e4", " 11000", "011000", "11000.0", Number.MAX_SAFE_INTEGER + 1]);
    expect(entry.timestampLinks.map(link => link.candidates.length)).toEqual([1, 0, 0]);
    expect(entry.headTimestampObserved).toBe(false);
    expect(audit.snapshot().socketContinuity.chainGap).toBe(false);
  });
  it("preserves timestamp ties and repeated frame ambiguity instead of declaring a unique event link", () => {
    const audit = capture([100, 110]);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 100, now: 110 })), 3, 1, 3);
    const entry = response(audit, ["11000", "11000"]);
    expect(entry.timestampLinks.map(link => [link.candidates.length, link.sampledRowsWithSameTimestamp])).toEqual([[2, 2], [2, 2]]);
    expect(entry.provesCurrentDecisionCatchUp).toBe(false);
  });
  it("bounds links by the response-time generation/head, not later socket frames", () => {
    const audit = capture([100, 110]);
    const entry = audit.response(new Headers(), 200, "hand", 1, 3);
    audit.socket(inspectSocketMetadata(packet("gC", { pre: 110, now: 120 })), 3, 1, 4);
    audit.payload(entry, [{ createdAt: "12000" }]);
    expect(entry.timestampLinks[0]!.candidates).toEqual([]);
    audit.socket(inspectSocketMetadata(packet("registered", { gameState: { now: 200 } })), 4, 2, 5);
    const later = response(audit, ["11000", "20000"]);
    expect(later.timestampLinks.map(link => link.candidates.length)).toEqual([0, 1]);
    expect(later.provesCurrentDecisionCatchUp).toBe(false);
  });
  it("cannot invent links when bounded socket or row samples have been dropped", () => {
    const audit = capture(Array.from({ length: SOCKET_METADATA_LIMIT + 2 }, (_, i) => i + 1));
    const entry = response(audit, Array(LOG_METADATA_ROW_LIMIT + 1).fill("100"));
    expect(entry.rowSamplesTruncated).toBe(true);
    expect(entry.timestampLinks).toHaveLength(LOG_METADATA_ROW_LIMIT);
    expect(entry.timestampLinks.every(link => link.candidates.length === 0)).toBe(true);
    expect(entry.provesCurrentDecisionCatchUp).toBe(false);
  });
  it("keeps runtime identity/history gates unchanged for matched heads and broken chains", async () => {
    const last = verifiedLinks.socketNowChain.at(-1)!;
    const f = runtime([{ createdAt: String(BigInt(last) * 100n), msg: '"Hero @ hero" checks' }]);
    await f.source.tick();
    const before = JSON.stringify(f.source.snapshot().current);
    const identityBefore = JSON.stringify(f.source.snapshot().sourceStatus.identity);
    verifiedLinks.socketNowChain.forEach((now, i) => f.source.accept(metadataMessage(i === 0
      ? packet("registered", { gameState: { now } }) : packet("gC", { pre: verifiedLinks.socketNowChain[i - 1], now }), i + 1)));
    expect(JSON.stringify(f.source.snapshot().current)).toBe(before);
    expect(JSON.stringify(f.source.snapshot().sourceStatus.identity)).toBe(identityBefore);
    f.advance(); await f.source.tick();
    expect(f.source.snapshot().sourceStatus.sourceMetadata.logs.at(-1)!.headTimestampObserved).toBe(true);
    f.source.accept(metadataMessage(packet("gC", { pre: 1, now: last + 1 }), 9));
    const snapshot = f.source.snapshot();
    expect(snapshot.sourceStatus.sourceMetadata.socketContinuity.chainGap).toBe(true);
    expect(snapshot.current.historyComplete).toBe(false);
    expect(snapshot.sourceStatus.logContractVerified).toBe(false);
    expect(snapshot.sourceStatus.settlementComplete).toBe(false);
    expect(JSON.stringify(snapshot.sourceStatus.identity)).toBe(identityBefore);
  });
});
