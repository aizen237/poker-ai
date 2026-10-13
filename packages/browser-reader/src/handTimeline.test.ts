import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assembleGameState, type RawTableInput } from "./gameState.js";
import { createSnapshotTimeline, ingestHandLog, newHandTimeline, normalizeLogRow, parseLogRows, TIMELINE_LIMIT } from "./handTimeline.js";
import { assessLiveState } from "./liveState.js";

const row = (createdAt: number | string, msg: string) => ({ createdAt, msg });
const liveRows = JSON.parse(readFileSync(new URL("./fixtures/pokernow-log-v3-live.json", import.meta.url), "utf8"));
// Template fixtures, not captured API responses. Unknown wording is retained.
describe("candidate PokerNow hand log timeline", () => {
  it.each([
    ['"Hero @ hero-id" posts a small blind of 1', "post", 1],
    ['"Villain @ v-id" posts a big blind of 2', "post", 2],
    ['"Hero @ hero-id" posts an ante of 1', "unparsed", null],
    ['"Hero @ hero-id" checks', "check", null],
    ['"Hero @ hero-id" bets 3', "bet", 3],
    ['"Villain @ v-id" calls 3', "call", 3],
    ['"Hero @ hero-id" raises to 6', "raise", 6],
    ['"Villain @ v-id" folds', "fold", null],
    ['"Villain @ v-id" raises to 8 and go all in', "all-in", 8],
    ['"Hero @ hero-id" shows a pair', "showdown", null],
    ['"Hero @ hero-id" collected 18 from pot', "settlement", 18],
  ])("retains provenance for %s", (msg, action, amount) => {
    expect(normalizeLogRow(row(100, msg as string), 200)).toMatchObject({ action, amount, evidence: msg, source: "pokernow_log_v3", sourceTimestamp: 100 });
  });
  it("recovers rapid consecutive hero/opponent actions in one response instead of inferring them from a final wager", () => {
    const t = newHandTimeline("table:hand:h1", 1);
    const rows = [row(1, "-- starting hand #1 --"), row(2, '"Hero @ h" bets 2'), row(3, '"V @ v" raises to 6'), row(4, '"Hero @ h" calls 4')];
    ingestHandLog(t, rows.toReversed(), 10);
    expect(t.events.map(e => e.action)).toEqual(["hand_start", "bet", "raise", "call"]);
    expect(t.events.map(e => e.sequence)).toEqual([1, 2, 3, 4]);
    expect(t.events[2]).toMatchObject({ raiseTo: 6, amountMeaning: "street_total", actor: { playerId: "v", seat: null } });
    expect(t.events[3]!.amountMeaning).toBe("reported_unspecified");
    expect(t.historyComplete).toBe(false);
  });
  it("deduplicates overlapping responses and includes late rows without losing source timestamps", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, [row(1, "-- starting hand"), row(3, '"V @ v" folds')], 10);
    const id = t.events[1]!.id;
    ingestHandLog(t, [row(3, '"V @ v" folds'), row(2, '"Hero @ h" bets 2'), row(1, "-- starting hand")], 20);
    expect(t.events).toHaveLength(3); expect(t.events[2]!.id).toBe(id);
    expect(t.events[2]!.observedAt).toBe(10); expect(t.events[1]!.observedAt).toBe(20);
  });
  it("never deduplicates two same-timestamp events into one or fabricates their order", () => {
    const t = newHandTimeline("h", 1);
    const rows = [row(1, "-- starting hand"), row(2, '"Hero @ h" checks'), row(2, '"Hero @ h" checks'), row(2, "flop: 2s, 8s, 8d")];
    ingestHandLog(t, rows, 10); ingestHandLog(t, rows, 20);
    expect(t.events).toHaveLength(4);
    expect(t.events.slice(1).every(e => e.order === "ambiguous" && e.street === null)).toBe(true);
    expect(t.historyComplete).toBe(false);
  });
  it("keeps street actions on the source-reported street and settlement distinct from complete history", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, [row(1, "-- starting hand"), row(2, '"Hero @ h" raises to 6'), row(3, "flop: 2s 8s 8d"),
      row(4, '"Hero @ h" checks'), row(5, "turn: 2s 8s 8d 3h"), row(6, "river: 2s 8s 8d 3h 4c"), row(7, '"Hero @ h" collected 12 from pot'), row(8, "-- ending hand")], 20);
    expect(t.events[1]!.street).toBe("preflop"); expect(t.events[3]!.street).toBe("flop");
    expect(t.events[6]).toMatchObject({ street: "river", action: "settlement" });
    expect(t.historyComplete).toBe(false);
  });
  it("retains omitted rows and unknown wording with explicit reasons", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, [row(1, '"V @ v" unfamiliar action')], 10);
    ingestHandLog(t, [], 20);
    expect(t.events[0]!.action).toBe("unparsed");
    expect(t.reasons.join(" ")).toMatch(/omitted/); expect(t.reasons.join(" ")).toMatch(/Hand-start/);
  });
  it.each([{}, [{ createdAt: "1e3", msg: "x" }], [{ createdAt: 1, msg: null }], [{ createdAt: Infinity, msg: "x" }]])("rejects malformed batches atomically", payload => {
    const t = newHandTimeline("h", 1);
    expect(() => ingestHandLog(t, payload, 10)).toThrow(); expect(t.events).toHaveLength(0);
  });
  it("bounds retention and records truncation", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, Array.from({ length: TIMELINE_LIMIT + 1 }, (_, i) => row(i, '"V @ v" checks')), 10);
    expect(t.events).toHaveLength(TIMELINE_LIMIT); expect(t.droppedEvents).toBe(1); expect(t.historyComplete).toBe(false);
    expect(() => parseLogRows(Array(2001).fill(row(1, "x")))).toThrow();
  });
  it("rejects an explicitly contradictory hand number without corrupting the current timeline", () => {
    const t = newHandTimeline("h", 1);
    expect(() => ingestHandLog(t, [row(1, "-- starting hand #2 --")], 10)).toThrow(/contradicts/);
    expect(t.events).toEqual([]);
  });
});

describe("sanitized live log_v3 response", () => {
  it("accepts the exact newest-first capture, preserves raw text and derives only candidate chronology", () => {
    const before = JSON.stringify(liveRows);
    expect(parseLogRows(liveRows)).toEqual(liveRows);
    const t = newHandTimeline("live-hand", 1);
    ingestHandLog(t, liveRows, 100);
    expect(t.events.map(e => e.action)).toEqual(["fold", "raise", "call", "street"]);
    expect(t.events.map(e => e.sourceTimestampRaw)).toEqual(liveRows.toReversed().map((r: { createdAt: string }) => r.createdAt));
    expect(t.events.map(e => e.sourceTimestamp)).toEqual([179147737114700, 179147737522200, 179147737773000, 179147737859100]);
    expect(t.events.map(e => e.sequence)).toEqual([1, 2, 3, 4]);
    expect(t.events.every(e => e.order === "timestamp_candidate")).toBe(true);
    expect(t.events[0]).toMatchObject({ actor: { playerId: "PLAYER_ID_C" }, street: null });
    expect(t.events[1]).toMatchObject({ raiseTo: 4, street: null });
    expect(t.events[3]).toMatchObject({ street: "flop", evidence: "Flop: [Kc, 8c, 4c]" });
    expect(t.historyComplete).toBe(false);
    expect(t.reasons.join(" ")).toContain("Hand-start row not observed");
    expect(JSON.stringify(liveRows)).toBe(before);
  });
  it("deduplicates repeated refreshes of the live capture without losing first-seen provenance", () => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, liveRows, 100);
    const events = structuredClone(t.events);
    ingestHandLog(t, liveRows.toReversed(), 200);
    expect(t.events).toEqual(events);
  });
  it("retains repeated messages, tied numeric-string timestamps and unknown text in newest-first variants", () => {
    const t = newHandTimeline("h", 1);
    const rows = [row("179147737859101", '"PLAYER_A @ PLAYER_ID_A" unknown wording'),
      row("179147737859100", "Flop: [Kc, 8c, 4c]"),
      row("179147737859100", '"PLAYER_A @ PLAYER_ID_A" checks'),
      row("179147737859100", '"PLAYER_A @ PLAYER_ID_A" checks'),
      row("179147737859099", '"PLAYER_A @ PLAYER_ID_A" checks')];
    ingestHandLog(t, rows, 100);
    const ids = t.events.map(e => e.id);
    ingestHandLog(t, rows.toReversed(), 200);
    expect(t.events.map(e => e.id)).toEqual(ids);
    expect(t.events).toHaveLength(5);
    expect(t.events.slice(1, 4).every(e => e.order === "ambiguous" && e.street === null)).toBe(true);
    expect(t.events.at(-1)).toMatchObject({ action: "unparsed", street: null, evidence: rows[0]!.msg });
    expect(t.historyComplete).toBe(false);
  });
  it.each([0, "0", 1, "1", Number.MAX_SAFE_INTEGER, String(Number.MAX_SAFE_INTEGER)])("accepts bounded exact integer timestamp %s without changing representation", timestamp => {
    const [parsed] = parseLogRows([row(timestamp, "unknown")]);
    expect(normalizeLogRow(parsed!, 100)).toMatchObject({ sourceTimestamp: Number(timestamp), sourceTimestampRaw: timestamp });
  });
  it.each(["", " ", " 1", "1 ", "1\n", "+1", "-1", "-0", "01", "1.0", "1e3", "0x10", "1,000", "NaN", "Infinity", "１２", "9007199254740992", "9".repeat(100),
    -1, -0, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, null, undefined, true, {}, []])("rejects malformed or unsafe timestamp %j atomically", timestamp => {
    const t = newHandTimeline("h", 1);
    ingestHandLog(t, liveRows, 100);
    const before = JSON.stringify({ events: t.events, seatMapping: t.seatMapping, accounting: t.accounting });
    expect(() => ingestHandLog(t, [...liveRows, { createdAt: timestamp, msg: "x" }], 200)).toThrow(/schema/);
    expect(JSON.stringify({ events: t.events, seatMapping: t.seatMapping, accounting: t.accounting })).toBe(before);
    expect(t.coverage.rejectedBatchCount).toBe(1);
    expect(t.coverage.status).toBe("incomplete_gap_detected");
  });
  it("keeps message and row bounds for the string-timestamp contract", () => {
    for (const msg of [null, {}, "", "x".repeat(4001)]) expect(() => parseLogRows([{ createdAt: "179147737859100", msg }])).toThrow();
    expect(() => parseLogRows(Array(2001).fill(liveRows[0]))).toThrow();
    expect(() => parseLogRows([[]])).toThrow();
  });
});

function raw(): RawTableInput {
  return { potMainValueText: "4", potTotalValueText: "4", boardCards: [{ valueText: "2", suitText: "s" }, { valueText: "8", suitText: "s" }, { valueText: "8", suitText: "d" }],
    seats: [1, 2, 3].map(seatNumber => ({ seatNumber, isOccupied: true, isYou: seatNumber === 1, playerNameText: `P${seatNumber}`, stackText: "50", betValueText: "0",
      statusClasses: seatNumber === 1 ? ["decision-current"] : [], holeCardClassLists: seatNumber === 1 ? [["flipped", "card-h", "card-s-A"], ["flipped", "card-d", "card-s-K"]] : [] })) };
}
const context = { bigBlind: 2, dealerSeatNumber: 2 };
describe("explicitly incomplete snapshot fallback", () => {
  it.each([0, 1])("preserves seat index %s's fold while the wager helper is waiting for a clean street baseline", actor => {
    const t = createSnapshotTimeline("s"), r = raw(); r.boardCards = [];
    t.observe(assembleGameState(r), context, [], 1);
    r.boardCards = raw().boardCards;
    for (const seat of r.seats) seat.betValueText = null;
    t.observe(assembleGameState(r), context, [], 2);
    r.seats[actor]!.statusClasses = ["fold"];
    if (actor === 0) r.seats[actor]!.holeCardClassLists = [];
    t.observe(assembleGameState(r), context, [], 3);
    expect(t.current().events.filter(e => e.action === "fold")).toMatchObject([{ actor: { seat: actor + 1, isHero: actor === 0 }, street: "flop", order: "observation_batch" }]);
    t.observe(assembleGameState(r), context, [], 4);
    expect(t.current().events.filter(e => e.action === "fold")).toHaveLength(1);
    expect(t.current().historyComplete).toBe(false);
  });
  it.each([0, 1])("preserves seat index %s's fold across a street transition without claiming its street", actor => {
    const t = createSnapshotTimeline("s"), r = raw(); t.observe(assembleGameState(r), context, [], 1);
    r.seats[actor]!.statusClasses = ["fold"];
    r.boardCards.push({ valueText: "3", suitText: "h" });
    t.observe(assembleGameState(r), context, [], 2);
    expect(t.current().events.find(e => e.action === "fold")).toMatchObject({ actor: { seat: actor + 1 }, street: null, amount: null, order: "observation_batch" });
    expect(t.current().historyComplete).toBe(false);
  });
  it("retains an opponent fold during rapid wagers but does not fabricate the missing betting sequence", () => {
    const t = createSnapshotTimeline("s"), r = raw(); t.observe(assembleGameState(r), context, [], 1);
    r.seats[0]!.betValueText = "8"; r.seats[1]!.betValueText = "8"; r.seats[2]!.statusClasses = ["fold"];
    t.observe(assembleGameState(r), context, [], 2);
    expect(t.current().events.slice(1).map(e => e.action)).toEqual(["wager_observed", "wager_observed", "fold"]);
    expect(t.current().events.slice(1).every(e => e.order === "observation_batch")).toBe(true);
    expect(t.current().reasons.join(" ")).toContain("Multiple wagers");
    r.seats[2]!.isOccupied = false; t.observe(assembleGameState(r), context, [], 3);
    expect(t.current().events.filter(e => e.action === "fold")).toHaveLength(1);
    expect(t.current().historyComplete).toBe(false);
  });
  it("records already-folded baseline evidence without inventing an observed fold action", () => {
    const t = createSnapshotTimeline("s"), r = raw(); r.seats[0]!.statusClasses = ["fold"];
    t.observe(assembleGameState(r), context, [], 1);
    expect(t.current().events.map(e => e.action)).toEqual(["observation_start", "fold_observed"]);
    expect(t.current().events[1]).toMatchObject({ actor: { isHero: true }, street: null, confidence: "unknown", source: "dom_snapshot" });
    t.observe(null, context, ["bad read"], 2);
    t.observe(assembleGameState(r), context, [], 3);
    expect(t.current().events.map(e => e.action)).toEqual(["observation_start", "fold_observed"]);
    expect(t.archived()[0]!.events.at(-1)!.action).toBe("gap");
    expect(t.current().historyComplete).toBe(false);
  });
  it("does not assign a departing/replaced/unnamed player's fold to the previous occupant", () => {
    for (const name of ["Replacement", null]) {
      const t = createSnapshotTimeline("s"), r = raw(); t.observe(assembleGameState(r), context, [], 1);
      r.seats[1]!.playerNameText = name; r.seats[1]!.statusClasses = ["fold"];
      t.observe(assembleGameState(r), context, [], 2);
      expect(t.current().events.some(e => e.action === "fold")).toBe(false);
    }
  });
  it("includes hero actions and retains past events when an opponent leaves", () => {
    const t = createSnapshotTimeline("s"), r = raw(); t.observe(assembleGameState(r), context, [], 1);
    r.seats[0]!.betValueText = "2"; t.observe(assembleGameState(r), context, [], 2);
    expect(t.current().events.some(e => e.action === "bet" && e.actor?.isHero)).toBe(true);
    r.seats[1]!.statusClasses = ["fold"]; t.observe(assembleGameState(r), context, [], 3);
    r.seats[1]!.isOccupied = false; t.observe(assembleGameState(r), context, [], 4);
    expect(t.current().events.map(e => e.action)).toEqual(["observation_start", "bet", "fold", "departure"]);
    expect(t.current().historyComplete).toBe(false);
  });
  it("does not assign a bet/call/raise order to multiple changes between polls", () => {
    const t = createSnapshotTimeline("s"), r = raw(); t.observe(assembleGameState(r), context, [], 1);
    r.seats[0]!.betValueText = "8"; r.seats[1]!.betValueText = "8";
    t.observe(assembleGameState(r), context, [], 2);
    expect(t.current().events.slice(1).every(e => e.action === "wager_observed" && e.order === "observation_batch")).toBe(true);
    expect(t.current().reasons.join(" ")).toContain("Multiple wagers");
  });
  it("tracks explicit check and all-in without manufacturing a numeric stack", () => {
    const t = createSnapshotTimeline("s"), r = raw(); t.observe(assembleGameState(r), context, [], 1);
    r.seats[0]!.betValueText = "check"; t.observe(assembleGameState(r), context, [], 2);
    r.seats[1]!.stackText = null; r.seats[1]!.stackContainerText = "All In"; r.seats[1]!.betValueText = "50";
    t.observe(assembleGameState(r), context, [], 3);
    expect(t.current().events.map(e => e.action)).toContain("check"); expect(t.current().events.map(e => e.action)).toContain("all-in");
  });
  it("never labels initial preflop contributions as voluntary actions or proven blinds", () => {
    const t = createSnapshotTimeline("s"), r = raw(); r.boardCards = [];
    t.observe(assembleGameState(r), context, [], 1);
    r.seats[1]!.betValueText = "1"; r.seats[2]!.betValueText = "2";
    t.observe(assembleGameState(r), context, [], 2);
    expect(t.current().events.slice(1).every(e => e.action === "wager_observed")).toBe(true);
  });
  it("does not transfer previous-street wagers to the next street", () => {
    const t = createSnapshotTimeline("s"), r = raw(); t.observe(assembleGameState(r), context, [], 1);
    r.boardCards.push({ valueText: "3", suitText: "h" }); r.seats[1]!.betValueText = "6";
    t.observe(assembleGameState(r), context, [], 2);
    expect(t.current().events.map(e => e.action)).toEqual(["observation_start", "street"]);
  });
  it("uses a conservative new segment for same-card board resets, not a fabricated stable hand ID", () => {
    const t = createSnapshotTimeline("s"), r = raw(); t.observe(assembleGameState(r), context, [], 1);
    const id = t.current().handId; r.boardCards = []; t.observe(assembleGameState(r), context, [], 2);
    expect(t.current().handId).not.toBe(id); expect(t.current().identityKind).toBe("local_segment");
    expect(t.archived()).toHaveLength(1);
  });
  it("cannot detect an entire same-card hand between identical polls and never claims completeness", () => {
    const t = createSnapshotTimeline("s"), r = raw(); t.observe(assembleGameState(r), context, [], 1);
    const before = JSON.stringify(t.current()); t.observe(assembleGameState(r), context, [], 10000);
    expect(JSON.stringify(t.current())).toBe(before); expect(t.current().historyComplete).toBe(false);
  });
  it("keeps transient missing hole cards within the segment and records broken reads as gaps", () => {
    const t = createSnapshotTimeline("s"), r = raw(); t.observe(assembleGameState(r), context, [], 1);
    const id = t.current().handId; r.seats[0]!.holeCardClassLists = []; t.observe(assembleGameState(r), context, [], 2);
    expect(t.current().handId).toBe(id);
    t.observe(null, context, ["failed read"], 3); expect(t.current().events.at(-1)!.action).toBe("gap");
    t.observe(assembleGameState(r), context, [], 4); expect(t.current().handId).not.toBe(id);
  });
  it("does not modify the decision-pot or legality gates", () => {
    const r = raw(); const assessment = assessLiveState(r, { blindTexts: ["1", "2"], dealerSeatNumber: 2, readErrors: [] });
    const t = createSnapshotTimeline("s"); t.observe(assessment.state, context, [], 1);
    expect(assessment.decisionPot).toBeNull(); expect(assessment.legality.verified).toBe(false);
    expect(t.current().historyComplete).toBe(false);
  });
  it("records replacement as departure/arrival, retaining the former player's actions", () => {
    const t = createSnapshotTimeline("s"), r = raw(); t.observe(assembleGameState(r), context, [], 1);
    r.seats[1]!.betValueText = "2"; t.observe(assembleGameState(r), context, [], 2);
    r.seats[1]!.playerNameText = "Replacement"; r.seats[1]!.betValueText = "0";
    t.observe(assembleGameState(r), context, [], 3);
    expect(t.current().events.find(e => e.action === "bet")!.actor!.name).toBe("P2");
    expect(t.current().events.slice(-2).map(e => e.action)).toEqual(["departure", "arrival"]);
  });
});
