import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ingestHandLog, newHandTimeline, TIMELINE_LIMIT } from "./handTimeline.js";
import { parsePlayerStacks } from "./playerSeatMapping.js";

// Exact supplied row; timestamps/action rows below are synthetic ordering scaffolds.
const stacks = readFileSync(new URL("./fixtures/pokernow-player-stacks-live.txt", import.meta.url), "utf8").trimEnd();
const row = (createdAt: number, msg: string) => ({ createdAt: String(createdAt), msg });
const action = (id: string, name = "same name") => `"${name} @ ${id}" folds`;

describe("source-reported per-hand seat mapping", () => {
  it("parses the exact three-player capture including raw stack text", () => {
    expect(parsePlayerStacks(stacks)).toEqual({ kind: "valid", entries: [
      { seat: 1, name: "aizen", playerId: "v7UmNXTwjJ", stackText: "153" },
      { seat: 2, name: "aizemmmm", playerId: "TTXBlZfl8G", stackText: "13" },
      { seat: 3, name: "aizen23", playerId: "OoArqYL22g", stackText: "46" },
    ] });
  });
  it("maps subsequent actors from a newest-first response, retaining exact provenance", () => {
    const t = newHandTimeline("h", 1);
    const rows = [row(1, stacks), row(2, action("v7UmNXTwjJ")), row(3, action("TTXBlZfl8G")), row(4, action("OoArqYL22g"))];
    ingestHandLog(t, rows.toReversed(), 100);
    expect(t.events[0]).toMatchObject({ action: "player_stacks", evidence: stacks, confidence: "source_reported" });
    expect(t.seatMapping.status).toBe("source_reported");
    expect(t.events.slice(1).map(e => e.actor!.seat)).toEqual([1, 2, 3]);
    expect(t.events.slice(1).every(e => e.actorSeatMappingEventId === t.events[0]!.id)).toBe(true);
    expect(t.seatMapping.evidence).toEqual([{ eventId: t.events[0]!.id, text: stacks, sourceTimestamp: 1, sourceTimestampRaw: "1" }]);
    ingestHandLog(t, rows, 200);
    expect(t.seatMapping.evidence).toHaveLength(1);
    expect(t.historyComplete).toBe(false);
  });
  it("matches IDs despite duplicate or changed display names and never matches name alone", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, [row(1, 'Player stacks: #1 "same @ id1" (10) | #2 "same @ id2" (20)'),
      row(2, action("id1", "renamed")), row(3, action("id2", "same")), row(4, action("other", "same"))], 100);
    expect(t.events.slice(1).map(e => e.actor!.seat)).toEqual([1, 2, null]);
    expect(t.events[3]!.actorSeatMappingEventId).toBeNull();
  });
  it("keeps folded/omitted players mapped throughout the hand", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, [row(1, stacks), row(2, action("TTXBlZfl8G"))], 100);
    ingestHandLog(t, [row(3, 'Player stacks: #1 "aizen @ v7UmNXTwjJ" (160)'), row(4, action("TTXBlZfl8G"))], 200);
    expect(t.seatMapping.entries).toHaveLength(3);
    expect(t.events.filter(e => e.actor?.playerId === "TTXBlZfl8G").map(e => e.actor!.seat)).toEqual([2, 2]);
  });
  it.each([
    'Player stacks: #1 "one @ id" (10) | #1 "two @ other" (20)',
    'Player stacks: #1 "one @ id" (10) | #2 "two @ id" (20)',
    'Player stacks: #1 "one @ id" (10) | #1 "one @ id" (10)',
  ])("rejects duplicate assignments atomically: %s", text => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, [row(1, text), row(2, action("id"))], 100);
    expect(t.seatMapping.status).toBe("invalid");
    expect(t.seatMapping.entries).toEqual([]);
    expect(t.events[0]!.action).toBe("unparsed");
    expect(t.events[1]!.actor!.seat).toBeNull();
    expect(t.seatMapping.evidence[0]!.text).toBe(text);
  });
  it.each([
    'Player stacks: #2 "aizen @ v7UmNXTwjJ" (153)',
    'Player stacks: #1 "replacement @ new-id" (153)',
  ])("invalidates the whole hand mapping on a later contradiction: %s", contradiction => {
    const t = newHandTimeline("h", 1);
    const initial = [row(1, stacks), row(2, action("v7UmNXTwjJ"))];
    ingestHandLog(t, initial, 100);
    expect(t.events[1]!.actor!.seat).toBe(1);
    ingestHandLog(t, [...initial, row(3, contradiction), row(4, action("v7UmNXTwjJ"))], 200);
    expect(t.seatMapping.status).toBe("invalid");
    expect(t.seatMapping.reasons.join(" ")).toContain("Contradictory");
    expect(t.seatMapping.entries.find(e => e.playerId === "v7UmNXTwjJ")!.seat).toBe(1);
    expect(t.events.filter(e => e.actor).every(e => e.actor!.seat === null && e.actorSeatMappingEventId === null)).toBe(true);
    expect(t.seatMapping.evidence.at(-1)!.text).toBe(contradiction);
    ingestHandLog(t, [...initial, row(5, stacks)], 300);
    expect(t.seatMapping.status).toBe("invalid");
    expect(t.historyComplete).toBe(false);
  });
  it("treats a late-arriving older contradiction identically", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, [row(2, stacks), row(3, action("v7UmNXTwjJ"))], 100);
    ingestHandLog(t, [row(1, 'Player stacks: #4 "aizen @ v7UmNXTwjJ" (153)')], 200);
    expect(t.seatMapping.status).toBe("invalid");
    expect(t.events.find(e => e.actor)!.actor!.seat).toBeNull();
  });
  it("does not assign seats to earlier or tied actions, but can use a late earlier matching row", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, [row(1, action("v7UmNXTwjJ")), row(2, stacks), row(2, action("v7UmNXTwjJ")), row(3, action("v7UmNXTwjJ"))], 100);
    expect(t.events.filter(e => e.actor).map(e => e.actor!.seat)).toEqual([null, null, 1]);
    expect(t.events[2]!.order).toBe("ambiguous");
    ingestHandLog(t, [row(0, stacks)], 200);
    expect(t.events.filter(e => e.actor).map(e => e.actor!.seat)).toEqual([1, 1, 1]);
    expect(t.events.find(e => e.sourceTimestamp === 2 && e.actor)!.order).toBe("ambiguous");
  });
  it("retains mapping provenance beyond the event retention limit and never inherits it into a new hand", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, [row(0, stacks), ...Array.from({ length: TIMELINE_LIMIT }, (_, i) => row(i + 1, action("v7UmNXTwjJ")))], 100);
    expect(t.events.some(e => e.action === "player_stacks")).toBe(false);
    ingestHandLog(t, [row(600, action("v7UmNXTwjJ"))], 200);
    expect(t.events.at(-1)!.actor!.seat).toBe(1);
    expect(t.seatMapping.evidence[0]!.text).toBe(stacks);
    const next = newHandTimeline("next", 2);
    ingestHandLog(next, [row(1000, action("v7UmNXTwjJ"))], 300);
    expect(next.seatMapping.status).toBe("unknown");
    expect(next.events[0]!.actor!.seat).toBeNull();
  });
  it("bounds mapping evidence and fails closed instead of losing provenance silently", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, Array.from({ length: 33 }, (_, i) => row(i, stacks)), 100);
    expect(t.seatMapping.status).toBe("invalid");
    expect(t.seatMapping.evidence).toHaveLength(32);
    expect(t.seatMapping.reasons[0]).toContain("retention limit");
  });
  it.each([
    "Player stacks:", "Player stacks #1", 'Player stacks: #0 "n @ id" (1)', 'Player stacks: #11 "n @ id" (1)',
    'Player stacks: #01 "n @ id" (1)', 'Player stacks: #1 "n" (1)', 'Player stacks: #1 "n @ " (1)',
    'Player stacks: #1 "n @ id" (All In)', 'Player stacks: #1 "n @ id" (-1)', 'Player stacks: #1 "n @ id" (1e3)',
    'Player stacks: #1 "n @ id" (9007199254740992)', 'Player stacks: #1 "n @ id" (1) trailing',
    'Player stacks: #1 "n @ id" (1) | broken', 'Player stacks: #1 "n @ id" (1)\n',
  ])("retains malformed row and invalidates existing mapping: %s", text => {
    expect(parsePlayerStacks(text).kind).toBe("invalid");
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, [row(1, stacks), row(2, action("v7UmNXTwjJ"))], 100);
    ingestHandLog(t, [row(3, text)], 200);
    expect(t.seatMapping.status).toBe("invalid");
    expect(t.events.find(e => e.actor)!.actor!.seat).toBeNull();
    expect(t.events.at(-1)).toMatchObject({ action: "unparsed", evidence: text });
  });
  it("ignores unrelated unknown rows without losing a valid mapping", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, [row(1, stacks), row(2, "unknown message")], 100);
    expect(t.seatMapping.status).toBe("source_reported");
    expect(t.events.at(-1)!.action).toBe("unparsed");
  });
});
