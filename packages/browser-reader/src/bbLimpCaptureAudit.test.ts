import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { auditBbLimpCapture, BB_CAPTURE_LIMITS } from "../../../apps/pokernow-extension/src/bbLimpCaptureAudit.js";

const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const candidate = () => load("pokernow-bb-completion-candidate-49.json");
describe("local BB capture audit, never a decision certificate", () => {
  it("indexes actual hand49 total-two/BB-turn observations without promoting the two-player candidate", () => {
    const input = candidate(), original = structuredClone(input), report = auditBbLimpCapture(input);
    expect(report.rejected).toEqual([]);
    expect(report.observations).toMatchObject([
      { kind: "sb_total_two_candidate", sequence: 4, dealtInCount: 2, sbBefore: 1, sbAfter: 2, bbAfter: 2,
        linkedCompletionSequence: null, sourcePatch: input.frames[3].payload },
      { kind: "bb_turn_observed", sequence: 5, dealtInCount: 2, linkedCompletionSequence: 4,
        sourcePatch: input.frames[4].payload },
    ]);
    expect(report).toMatchObject({ historyComplete: false, bbDecisionEnabled: false });
    expect(report.sourceContract).toContain("unverified"); expect(report.strategy).toContain("No reviewed");
    expect(input).toEqual(original);
  });
  it("actual six-player hand224 accepted SB raise is not a limp", () => {
    const report = auditBbLimpCapture(load("pokernow-sb-224.json"));
    expect(report.observations.map(o => o.kind)).toEqual(["sb_raise_total_observed", "bb_turn_observed"]);
    expect(report.observations[0]).toMatchObject({ dealtInCount: 6, sbBefore: 1, sbAfter: 5, bbAfter: 2 });
    expect(report.observations[1].linkedCompletionSequence).toBeNull(); expect(report.bbDecisionEnabled).toBe(false);
  });
  it("recorded hand164 SB fold/settlement cannot produce a BB option", () => {
    const report = auditBbLimpCapture(load("pokernow-bb-walk-164.json"));
    expect(report.observations.map(o => o.kind)).toEqual(["sb_fold_observed"]);
  });
  it.each(["missing", "generation", "predecessor", "replay", "time", "table", "hand", "malformed"])(
    "does not link candidate across %s", variant => {
      const input = candidate(), turn = input.frames[4];
      if (variant === "missing") input.frames.splice(3, 1);
      if (variant === "generation") turn.connectionGeneration++;
      if (variant === "predecessor") turn.payload.pre++;
      if (variant === "replay") input.frames.splice(4, 0, structuredClone(input.frames[3]));
      if (variant === "time") turn.localReceivedAt = input.frames[3].localReceivedAt - 1;
      if (variant === "table") turn.payload.id = "OTHER_TABLE";
      if (variant === "hand") turn.payload.hI = "OTHER_HAND";
      if (variant === "malformed") turn.payload.pITT = [];
      const report = auditBbLimpCapture(input);
      expect(report.rejected.length).toBeGreaterThan(0);
      expect(report.observations.some(o => o.linkedCompletionSequence !== null)).toBe(false);
    });
  it.each(["missing-total", "string-total", "extra-wager", "wrong-actor", "all-in", "bb-contribution", "unknown-field"])(
    "does not certify ambiguous/unsupported %s", variant => {
      const input = candidate(), patch = input.frames[3].payload;
      if (variant === "missing-total") delete patch.tB;
      if (variant === "string-total") patch.tB.PLAYER_3 = "2";
      if (variant === "extra-wager") patch.tB.PLAYER_1 = 2;
      if (variant === "wrong-actor") input.frames[2].payload.cPI = input.frames[2].payload.pITT = "PLAYER_1";
      if (variant === "all-in") patch.pGS.PLAYER_3 = "allIn";
      if (variant === "bb-contribution") input.frames[2].payload.tB.PLAYER_1 = 3;
      if (variant === "unknown-field") patch.unknownAction = "cannot infer semantics";
      const report = auditBbLimpCapture(input);
      expect(report.bbDecisionEnabled).toBe(false); expect(report.historyComplete).toBe(false);
      // Unknown raw fields may remain observational; they are never silently
      // deleted to claim a verified completion grammar.
      if (variant === "unknown-field") expect(report.observations[0].sourcePatch.unknownAction).toBe("cannot infer semantics");
      else expect(report.observations.some(o => o.kind === "sb_total_two_candidate")).toBe(false);
    });
  it("expired historical observations remain evidence, not an actionable lifetime", () => {
    const report = auditBbLimpCapture(candidate());
    expect(report.observations).toHaveLength(2);
    expect(report).not.toHaveProperty("expiresAt"); expect(report).not.toHaveProperty("chosenAction");
    expect(report.bbDecisionEnabled).toBe(false);
  });
  it.each([null, {}, { frames: [] }, { frames: Array(BB_CAPTURE_LIMITS.frames + 1).fill({}) },
    { frames: [], padding: "x".repeat(BB_CAPTURE_LIMITS.bytes) }])("rejects malformed/oversized export", value => {
    const report = auditBbLimpCapture(value); expect(report.issues.length).toBeGreaterThan(0);
    expect(report.observations).toEqual([]); expect(report.bbDecisionEnabled).toBe(false);
  });
  it("flags dropped data and supports the existing paired-collector wrapper", () => {
    const rawSocket = candidate(); rawSocket.capture.rejectedFrames = 1;
    const report = auditBbLimpCapture({ rawSocket }); expect(report.issues[0]).toContain("dropped");
    expect(report.bbDecisionEnabled).toBe(false);
  });
  it.each(["frame_limit", "buffer_size_limit", "incoming_frame_size_limit"])("flags recorder stop %s even before a rejected-frame count increments", reason => {
    const input = candidate(); input.capture.stopReason = reason;
    expect(auditBbLimpCapture(input).issues[0]).toContain("truncated");
  });
  it("the local CLI serializes the same audit without changing its input", () => {
    const cli = fileURLToPath(new URL("../../../apps/pokernow-extension/scripts/audit-bb-capture.mjs", import.meta.url));
    const path = fileURLToPath(new URL("./fixtures/pokernow-bb-completion-candidate-49.json", import.meta.url));
    const before = readFileSync(path, "utf8");
    const run = spawnSync(process.execPath, [cli, path], { encoding: "utf8", timeout: 20000 });
    expect(run.status, run.stderr).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual(auditBbLimpCapture(JSON.parse(before)));
    expect(readFileSync(path, "utf8")).toBe(before);
  });
});
