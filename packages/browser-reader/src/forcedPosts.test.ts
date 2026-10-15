import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ingestHandLog, newHandTimeline, normalizeLogRow } from "./handTimeline.js";

const report = JSON.parse(readFileSync(new URL("./fixtures/pokernow-missed-blind-report.json", import.meta.url), "utf8"));
const forms = ["posts a small blind of 1", "posts a big blind of 2", ...report.actions] as string[];

describe("explicit forced blind source rows", () => {
  for (const name of ["Hero", "Opponent"]) {
    it.each(forms)(`${name}: %s preserves post identity, amount and provenance`, action => {
      const msg = `"${name} @ id${name}" ${action}`;
      const row = { msg, createdAt: "179147737773000" };
      const timeline = newHandTimeline("test", 1);
      ingestHandLog(timeline, [
        { msg: "-- starting hand #1", createdAt: "179147737771000" },
        { msg: 'Player stacks: #1 "Hero @ idHero" (250) | #2 "Opponent @ idOpponent" (250)', createdAt: "179147737772000" }, row,
      ], 123);
      expect(timeline.events.at(-1)).toMatchObject({ action: "post", wagerAction: "post", amount: Number(action.at(-1)),
        actor: { name, playerId: `id${name}`, seat: name === "Hero" ? 1 : 2 }, street: "preflop",
        source: "pokernow_log_v3", sourceTimestampRaw: row.createdAt, sourceTimestamp: Number(row.createdAt),
        evidence: msg, amountMeaning: "reported_unspecified", raiseTo: null, allIn: null });
      expect(timeline.events.at(-1)!.actorSeatMappingEventId).not.toBeNull();
      expect(timeline.historyComplete).toBe(false);
    });
  }
  it.each(["posts a missing big blind of 2", "posts a missed small blind of 1", "posts a penalty of 2",
    "posts a missing small blind of -1", "posts a missed big blind of 2e0", "posts a missed big blind of 0",
    "posts a missed big blind of 9007199254740992", "posts a missed big blind of 2 and go all in",
    "posts a missing small blind of 1 extra", "posts a missing small blind of 1\n"])("keeps unsupported text unparsed: %s", action => {
    expect(normalizeLogRow({ msg: `"Hero @ idHero" ${action}`, createdAt: "1000" }, 1).action).toBe("unparsed");
  });
});
