import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { assessLiveState } from "./liveState.js";
import { emptyActionHistory } from "./actionHistory.js";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { TIMELINE_CHANNEL } from "../../../apps/pokernow-extension/src/pokerNowTransport.js";
import { buildLivePreflopContext } from "../../../apps/pokernow-extension/src/preflop.js";
import { buildLiveDecisionProofs } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import type { LiveTableRead } from "../../../apps/pokernow-extension/src/tableRead.js";

// Original diagnostic, unchanged. Reprocess raw reader inputs and retained
// source text/metadata; never import its old parsed actions or proof statuses.
const captured = JSON.parse(readFileSync(new URL("../../../evidence/hand-62-failed-smoke-diagnostic.txt", import.meta.url), "utf8"));
async function replay() {
  const saved = captured.handTimeline, source = saved.sourceStatus, id = source.identity;
  const response = source.sourceMetadata.logs.filter((r: any) => r.requestedHandNumber === 62).at(-1);
  // The diagnostic retains response indexes and exact timestamp text separately
  // from messages. Rejoin only unique matching rows, preserving response order.
  // No missing socket payloads, log rows or previous HTTP responses are invented.
  const payload = response.rows.map((row: any) => {
    const createdAt = row.metadata.fields.find((f: any) => f.path === "createdAt").value;
    const matches = saved.current.events.filter((e: any) => e.sourceTimestampRaw === createdAt);
    expect(matches).toHaveLength(1);
    return { createdAt, msg: matches[0].evidence };
  });
  expect(response.rowSamplesTruncated).toBe(false);
  expect(payload).toHaveLength(response.rowCount);
  let now = 0;
  const fetchLog = vi.fn(async () => new Response(JSON.stringify(payload)));
  const runtime = createTimelineRuntime({ tableId: id.tableId, sessionId: "hand62-diagnostic-replay", now: () => now, fetchLog });
  for (const frame of [source.sourceMetadata.firstSocket, ...source.sourceMetadata.socket]) {
    now = frame.receivedAt;
    runtime.accept({ channel: TIMELINE_CHANNEL, type: "source_metadata", tableId: id.tableId,
      sequence: frame.localSequence, generation: frame.localConnectionGeneration, metadata: frame.metadata });
  }
  now = response.observedAt;
  runtime.accept({ channel: TIMELINE_CHANNEL, type: "identity", tableId: id.tableId,
    sequence: 1, connected: source.connected, identity: id });
  await runtime.tick();
  const read: LiveTableRead = { raw: captured.raw, context: captured.context,
    evidence: captured.evidence, raiseControl: captured.legality.raiseControl };
  const assessment = assessLiveState(read.raw, read.context);
  runtime.observe(read, assessment);
  const timeline = runtime.snapshot();
  const preflop = buildLivePreflopContext(assessment, emptyActionHistory(), timeline, read)!;
  const scoped = buildLiveDecisionProofs(read, assessment, timeline, preflop, "hand62-replay");
  return { read, assessment, timeline, preflop, scoped, payload, fetchLog };
}

describe("exact saved hand-62 diagnostic replay", () => {
  it("preserves six listed seats and forced posts without inventing discarded socket values", async () => {
    const r = await replay();
    expect(r.timeline.sourceStatus.identity!.handId).toBe("nc9cxdfnkkkx");
    expect(r.timeline.current.events.map(e => e.action)).toEqual(["hand_start", "player_stacks", "hole_cards", "post", "post"]);
    expect(r.timeline.current.seatMapping.entries.map(p => p.seat)).toEqual([1, 2, 3, 5, 9, 10]);
    expect(r.assessment.positions.get(1)).toBe("UTG");
    expect(r.assessment.state!.seats.find(s => s.isYou)).toMatchObject({
      isCurrentToAct: true, holeCards: [{ rank: 12, suit: "c" }, { rank: 10, suit: "d" }],
    });
    expect(r.timeline.current.historyComplete).toBe(false);
    expect(r.timeline.sourceStatus.firstUtg).toBeNull();
    expect(r.scoped.activation.allowed).toBe(false);
    expect(r.scoped.activation.failedProofs).toEqual(expect.arrayContaining(["roster", "position", "actionWindow"]));
    // The original running audit saw continuity; this saved export dropped
    // observations 2..37. Replaying it cannot recreate those updates or values.
    expect(captured.handTimeline.sourceStatus.sourceMetadata.socketContinuity.status).toBe("observed_continuous");
    expect(r.timeline.sourceStatus.sourceMetadata.socketContinuity.status).toBe("incomplete");
    expect(r.timeline.sourceStatus.firstUtgEvidence.observations.every(o => o.projection === null)).toBe(true);
    const lastReceived = captured.handTimeline.sourceStatus.sourceMetadata.socket.at(-1).receivedAt;
    expect(Date.parse(captured.capturedAt) - lastReceived).toBe(94658);
  });
});
