import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";
import { readLiveTable } from "../../../apps/pokernow-extension/src/tableRead.js";
import { buildLiveDecisionProofs } from "../../../apps/pokernow-extension/src/decisionProofs.js";
import { assessLiveState } from "./liveState.js";
import { ingestHandLog, newHandTimeline } from "./handTimeline.js";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Phase 6A: actual postflop sightings do not certify live transitions", () => {
  it("replays the captured settled board through MAIN -> projector -> sole source runtime", async () => {
    vi.resetModules();
    const frames = JSON.parse(fixture("pokernow-bb-completion-candidate-49.json")).frames;
    let now = frames[0].localReceivedAt;
    const runtime = createTimelineRuntime({ tableId: "TABLE_TEST", sessionId: "phase6a-replay",
      now: () => now, fetchLog: vi.fn(() => { throw new Error("This replay has no captured HTTP response"); }) });
    const location = { pathname: "/games/TABLE_TEST", hostname: "www.pokernow.com",
      origin: "https://www.pokernow.com", href: "https://www.pokernow.com/games/TABLE_TEST" };
    class Socket extends EventTarget {
      send = vi.fn();
      constructor(public url: string) { super(); }
    }
    const win = { WebSocket: Socket, location, sessionStorage: { getItem: () => null },
      addEventListener() {}, postMessage: (message: unknown) => runtime.accept(message) };
    vi.stubGlobal("window", win); vi.stubGlobal("location", location);
    vi.spyOn(Date, "now").mockImplementation(() => now);
    await import("../../../apps/pokernow-extension/src/eventSource.js");
    const socket = new win.WebSocket("wss://www.pokernow.com/socket.io/?gameID=TABLE_TEST");
    for (const [index, frame] of frames.entries()) {
      now = frame.localReceivedAt;
      socket.dispatchEvent(new MessageEvent("message", { data: "42" + JSON.stringify([frame.event, frame.payload]) }));
      const snapshot = runtime.snapshot(), s = snapshot.sourceStatus;
      if (index === 0) {
        // A real five-card array in a settled registration, NOT a river deal or turn.
        expect(s.identity).toMatchObject({ handNumber: 48, handId: "HAND_48" });
        expect(s.firstUtgEvidence.carriedState?.projection.frame).toMatchObject({
          gT: [1, 5], oTC: { "1": ["9s", "Kh", "Js", "5h", "3d"] },
        });
        const pC = s.firstUtgEvidence.carriedState!.projection.frame.pC;
        // Source visibility filtering must not promote shown opponent cards to hero knowledge.
        for (const [id, hand] of Object.entries(pC) as [string, any][])
          if (id !== "PLAYER_1") expect(hand.cards.every((c: any) => c.value === null)).toBe(true);
      }
      for (const key of ["firstUtgProof", "hjProof", "coProof", "btnProof", "sbProof", "facingOpenProof", "coFacingOpenProof"] as const)
        expect(s[key]).toBeNull();
      expect(snapshot.current.historyComplete).toBe(false);
      expect(snapshot.current.events).toEqual([]); // No action inference from tB/actor changes.
    }
    expect(runtime.snapshot().sourceStatus.identity?.handNumber).toBe(49);
    expect(socket.send).not.toHaveBeenCalled();
  });

  it("retains the real four-card DOM order without supplying a source identity or decision window", () => {
    // Only the four card elements are captured. All surrounding markup is a
    // simulated browser scaffold, unrelated to hand48/49 or the log sample.
    const { document } = parseHTML(`<html><body><div class="table-cards">${fixture("pokernow-board-live.html")}</div>
      <div class="table-pot-size"><div class="main-value"><span class="normal-value">20</span></div></div>
      <div class="blind-value"><span class="chips-value"><span class="normal-value">1</span></span></div>
      <div class="blind-value"><span class="chips-value"><span class="normal-value">2</span></span></div>
      <div class="dealer-position-1"></div><div class="table-player-1 you-player decision-current">
      <div class="table-player-name"><a>Hero</a></div>
      <div class="table-player-stack"><span class="normal-value">100</span></div>
      <div class="table-player-cards"><div class="card-container card-s card-s-5 flipped card-p1"></div>
      <div class="card-container card-h card-s-4 flipped card-p2"></div></div></div></body></html>`);
    vi.stubGlobal("document", document);
    const read = readLiveTable(), assessment = assessLiveState(read.raw, read.context);
    expect(assessment.state?.street).toBe("turn");
    expect(assessment.state?.board).toEqual([
      { rank: 6, suit: "h" }, { rank: 13, suit: "d" }, { rank: 3, suit: "h" }, { rank: 9, suit: "h" },
    ]);
    const proofs = buildLiveDecisionProofs(read, assessment, null, null, "simulated-dom");
    expect(proofs.evidence.handId).toBeNull();
    expect(proofs.evidence.proofs.find(p => p.scope === "actionWindow")?.status).toBe("insufficient");
    expect(proofs.activation.allowed).toBe(false);
  });

  it.each(["original", "missing-flop", "reordered-response", "tied-actions"])(
    "reparses real log text (%s) without treating log delivery as a live activation", variant => {
      // No captured hand identity accompanied this four-row sample. Keep it a
      // local segment. Negative variants are synthetic, never new evidence.
      const rows = JSON.parse(fixture("pokernow-log-v3-live.json"));
      if (variant === "missing-flop") rows.shift();
      if (variant === "reordered-response") rows.reverse();
      if (variant === "tied-actions") rows[1].createdAt = rows[2].createdAt;
      const timeline = newHandTimeline("phase6a-unassociated-log-sample");
      ingestHandLog(timeline, rows, 1000); // Synthetic replay time, not recovered action time.
      const actions = timeline.events.map(e => e.action);
      // Equal timestamps have no poker ordering; assert membership plus the
      // ambiguity flag below, never demand a fabricated raise-before-call.
      if (variant === "tied-actions") expect(actions.toSorted()).toEqual(["call", "fold", "raise", "street"]);
      else expect(actions).toEqual(variant === "missing-flop"
        ? ["fold", "raise", "call"] : ["fold", "raise", "call", "street"]);
      if (variant !== "missing-flop") expect(timeline.events.at(-1)).toMatchObject({
        street: "flop", evidence: "Flop: [Kc, 8c, 4c]", sourceTimestampRaw: "179147737859100",
      });
      expect(timeline.historyComplete).toBe(false);
      expect(timeline.coverage.caughtUpToCurrentDecision).toBe(false);
      expect(timeline.coverage.sourceWatermark).toBeNull();
      expect(timeline.events.every(e => e.actor?.seat == null)).toBe(true);
      if (variant === "tied-actions") expect(timeline.events.filter(e => e.order === "ambiguous")).toHaveLength(2);
    });
});
