import { describe, expect, it } from "vitest";
import { ingestHandLog, isSourceNonActionMetadata, newHandTimeline, normalizeLogRow } from "./handTimeline.js";

describe("explicit PokerNow non-action log metadata", () => {
  it.each([
    ['The player "aizen @ v7UmNXTwjJ" joined the game with a stack of 244.', "player_join"],
    ["Your hand is 6\u2666, A\u2665", "hole_cards"],
  ])("preserves exact metadata: %s", (msg, action) => {
    const e = normalizeLogRow({ msg, createdAt: "179188099424104" }, 1);
    expect(e).toMatchObject({ action, evidence: msg, sourceTimestampRaw: "179188099424104",
      amount: null, wagerAction: null, raiseTo: null, confidence: "source_reported" });
    expect(isSourceNonActionMetadata(e)).toBe(true);
    if (action === "player_join") expect(e.actor).toMatchObject({ name: "aizen", playerId: "v7UmNXTwjJ", seat: null });
    else expect(e.actor).toBeNull();
    const t = newHandTimeline("test", 56);
    ingestHandLog(t, [{ msg, createdAt: "179188099424104" }], 1);
    expect(t.historyComplete).toBe(false);
    expect(t.seatMapping.entries).toEqual([]);
  });
  it.each([
    "Unknown source update", "Your hand is something", "Your hand is 6d, Ah",
    "Your hand is 6\u2666, 6\u2666", "Your hand is T\u2666, 10\u2666",
    "Your hand is 6\u2666, A\u2665\n", "Your hand is 6\u2666, A\u2665 and calls 2",
    'The player "name" joined the game with a stack of 244.',
    'The player "name @ id" joined the game with a stack of -1.',
    'The player "name @ id" joined the game with a stack of 1e3.',
    'The player "name @ id" joined the game with a stack of 9999999999999999.',
    'The player "name @ id" joined the game with a stack of 244.\n',
    'The player "name @ id" joined the game with a stack of 244. calls 2',
  ])("keeps unsupported or malformed text fail-closed: %s", msg => {
    const e = normalizeLogRow({ msg, createdAt: "1" }, 1);
    expect(e.action).toBe("unparsed");
    expect(isSourceNonActionMetadata(e)).toBe(false);
  });
});
