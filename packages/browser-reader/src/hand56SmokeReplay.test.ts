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
const captured = JSON.parse(readFileSync(new URL("../../../evidence/hand-56-failed-smoke-diagnostic.txt", import.meta.url), "utf8"));
async function replay() {
  const saved = captured.handTimeline, source = saved.sourceStatus, id = source.identity;
  const response = source.sourceMetadata.logs.filter((r: any) => r.requestedHandNumber === 56).at(-1);
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
  const runtime = createTimelineRuntime({ tableId: id.tableId, sessionId: "hand56-diagnostic-replay", now: () => now, fetchLog });
  for (const frame of source.sourceMetadata.socket) {
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
  const scoped = buildLiveDecisionProofs(read, assessment, timeline, preflop, "hand56-replay");
  return { read, assessment, timeline, preflop, scoped, payload, fetchLog };
}

describe("exact saved hand-56 failed smoke diagnostic replay", () => {
  it("reparses all six blind rows through HTTP ingestion with exact actor/seat/timestamp evidence", async () => {
    const r = await replay();
    expect(r.fetchLog.mock.calls).toHaveLength(1);
    expect(r.timeline.current.events).toHaveLength(11);
    const posts = r.timeline.current.events.filter(e => e.action === "post");
    expect(posts.map(e => [e.actor?.seat, e.actor?.isHero, e.amount])).toEqual([
      [9, false, 1], [10, false, 2], [1, true, 1], [2, false, 1], [1, true, 2], [2, false, 2],
    ]);
    for (const e of posts) {
      expect(e.wagerAction).toBe("post");
      expect(e.actorSeatMappingEventId).not.toBeNull();
      expect(r.payload).toContainEqual({ msg: e.evidence, createdAt: e.sourceTimestampRaw });
    }
    expect(r.preflop.actions.map(a => a.action)).toEqual(Array(6).fill("post_blind"));
    expect(r.timeline.current.events.filter(e => e.action === "unparsed")).toEqual([]);
    const metadata = r.timeline.current.events.filter(e => e.action === "player_join" || e.action === "hole_cards");
    expect(metadata.map(e => [e.action, e.actor?.playerId ?? null])).toEqual([
      ["player_join", "v7UmNXTwjJ"], ["player_join", "amlHsejLtc"], ["hole_cards", null],
    ]);
    for (const e of metadata) {
      expect(r.payload).toContainEqual({ msg: e.evidence, createdAt: e.sourceTimestampRaw });
      expect(e.amount).toBeNull();
      expect(e.wagerAction).toBeNull();
    }
    const window = r.scoped.unopened!.proofs.find(p => p.scope === "actionWindow")!;
    expect(window.status).toBe("insufficient");
    expect(window.reasons.join(" ")).not.toMatch(/Observed source action|unknown street|no verified hand-local seat/);
    expect(r.timeline.current.historyComplete).toBe(false);
  });
  it("retains the actual roster, continuity and unknown-call blockers without repairing them", async () => {
    const r = await replay();
    expect(r.timeline.current.seatMapping.entries.map(p => p.seat)).toEqual([1, 2, 3, 9, 10]);
    expect(r.assessment.state!.seats.filter(p => p.isOccupied).map(p => p.seatNumber)).toEqual([1, 2, 3, 4, 9, 10]);
    expect(r.assessment.state!.seats.find(p => p.seatNumber === 4)!.isFolded).toBe(true);
    expect(r.assessment.positions.get(1)).toBe("HJ"); // DOM-derived, not certified.
    expect(r.timeline.sourceStatus.firstUtg).toBeNull();
    expect(r.timeline.sourceStatus.sourceMetadata.socketContinuity).toMatchObject({
      generation: 2, status: "incomplete", chainGap: false,
      reasons: captured.handTimeline.sourceStatus.sourceMetadata.socketContinuity.reasons,
    });
    expect(r.assessment.amountToCall).toBeNull();
    expect(r.preflop.situation).toBe("unknown");
    expect(r.scoped.activation.allowed).toBe(false);
    expect(r.scoped.activation.failedProofs).toEqual(expect.arrayContaining(["connection", "actionWindow", "roster", "position", "stack", "callCost"]));
  });
});
