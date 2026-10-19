import { createFirstUtgSource, projectFirstUtgSource } from "./firstUtgSource.js";
import { hjPatchKind } from "./hjWindow.js";

const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
export const BB_CAPTURE_LIMITS = { frames: 500, bytes: 4 * 1024 * 1024 } as const;

/** Offline evidence inventory only. Never imported by the live bridge/adapter.
 * Replays the EXISTING source authority; does not issue a BB proof, merge state,
 * infer a complete prefix, decode opaque fields, or recommend an action. */
export function auditBbLimpCapture(input: unknown) {
  const result = {
    purpose: "local BB source-evidence audit; observations are not certificates",
    historyComplete: false as const, bbDecisionEnabled: false as const,
    sourceContract: "six-player SB completion grammar remains unverified" as const,
    strategy: "No reviewed BB-vs-SB-limp reference or future-action value model" as const,
    issues: [] as string[],
    observations: [] as Array<{
      kind: "sb_total_two_candidate" | "sb_raise_total_observed" | "sb_fold_observed" | "bb_turn_observed";
      handId: string; handNumber: number; tableId: string; heroId: string;
      sequence: number; generation: number; receivedAt: number; cursor: number;
      dealtInCount: number; sbId: string; bbId: string;
      sbBefore: number | null; sbAfter: number | null; bbAfter: number | null;
      linkedCompletionSequence: number | null; sourcePatch: Record<string, unknown>;
    }>,
    rejected: [] as Array<{ sequence: number | null; reason: string }>,
  };
  const capture = object(input) && object(input.rawSocket) ? input.rawSocket : input;
  if (!object(capture) || !Array.isArray(capture.frames) || capture.frames.length > BB_CAPTURE_LIMITS.frames ||
      new TextEncoder().encode(JSON.stringify(input)).length > BB_CAPTURE_LIMITS.bytes) {
    result.issues.push("Expected a bounded raw recorder export (at most 500 frames / 4MiB)."); return result;
  }
  if (!object(capture.capture) || capture.capture.registeredCaptured !== true || capture.capture.rejectedFrames !== 0 ||
      capture.capture.frameCount !== capture.frames.length || capture.capture.active !== false ||
      capture.capture.stopReason !== "exported_or_manually_stopped")
    result.issues.push("Missing registration/capture metadata, dropped frames, or inconsistent/truncated export; coverage cannot be established.");
  let now = 0, hero: string | null = null, table: string | null = null;
  let source: ReturnType<typeof createFirstUtgSource> | null = null;
  let previous: ReturnType<ReturnType<typeof createFirstUtgSource>["diagnostic"]>["carriedState"] = null;
  let candidate: { sequence: number; generation: number; hand: string; cursor: number; at: number } | null = null;
  for (const f of capture.frames) {
    if (!object(f) || !integer(f.localReceiveSequence) || f.localReceiveSequence < 1 || !integer(f.connectionGeneration) ||
        f.connectionGeneration < 1 || !integer(f.localReceivedAt) || !["registered", "gC", "rup"].includes(f.event) || !object(f.payload)) {
      result.rejected.push({ sequence: null, reason: "Malformed raw frame metadata/event." });
      source?.reset(); previous = null; candidate = null; continue;
    }
    now = f.localReceivedAt;
    const data = projectFirstUtgSource("42" + JSON.stringify([f.event, f.payload]), hero);
    if (!source && f.event === "registered" && data?.heroId && typeof data.frame.id === "string") {
      table = data.frame.id; source = createFirstUtgSource(table!, () => now);
    }
    if (!source) {
      result.rejected.push({ sequence: f.localReceiveSequence, reason: "No registered source baseline; pre-registration patch discarded." });
      continue;
    }
    source.accept(data, f.localReceiveSequence, f.connectionGeneration, now);
    const diagnostic = source.diagnostic(), carried = diagnostic.carriedState;
    if (!carried) {
      result.rejected.push({ sequence: f.localReceiveSequence, reason: diagnostic.reason });
      previous = null; candidate = null; continue;
    }
    hero = carried.projection.heroId;
    const before = previous?.projection.frame, after = carried.projection.frame, raw = f.payload;
    // No local continuity implementation: only consecutive carried states accepted
    // by the existing authority can contribute observations. Registration/refresh
    // and new-hand boundaries cannot be mistaken for voluntary actions.
    const sameWindow = f.event === "gC" && previous && before &&
      previous.generation === carried.generation && before.hI === after.hI && before.gN === after.gN &&
      before.sBPI === after.sBPI && before.bBPI === after.bBPI &&
      JSON.stringify(before.gT) === "[1,0]" && JSON.stringify(after.gT) === "[1,0]";
    if (sameWindow) {
      const sb = after.sBPI, bb = after.bBPI;
      const sbBefore = typeof before!.tB?.[sb] === "number" ? before!.tB[sb] : null;
      const sbAfter = typeof after.tB?.[sb] === "number" ? after.tB[sb] : null;
      const bbAfter = typeof after.tB?.[bb] === "number" ? after.tB[bb] : null;
      let kind: typeof result.observations[number]["kind"] | null = null;
      let linked: number | null = null;
      if (before!.cPI === sb && before!.pITT === sb && sbBefore === 1 && bbAfter === 2 &&
          object(raw.tB) && Object.keys(raw.tB).length === 1 && sbAfter !== null && raw.tB[sb] === sbAfter &&
          after.pGS?.[sb] === "inGame" && after.pGS?.[bb] === "inGame" && raw.pITT === null) {
        if (sbAfter === 2) kind = "sb_total_two_candidate";
        else if (sbAfter > 2) kind = "sb_raise_total_observed";
      } else if (hjPatchKind(raw) === "fold" && before!.cPI === sb && before!.pITT === sb && raw.pGS[sb] === "fold") {
        kind = "sb_fold_observed";
      } else if (hjPatchKind(raw) === "turn" && raw.cPI === bb && before!.pITT === null &&
          after.pGS?.[sb] === "inGame" && after.pGS?.[bb] === "inGame") {
        kind = "bb_turn_observed";
        if (candidate && candidate.sequence + 1 === f.localReceiveSequence && candidate.generation === carried.generation &&
            candidate.hand === after.hI && candidate.cursor === raw.pre && now >= candidate.at && sbAfter === 2 && bbAfter === 2)
          linked = candidate.sequence;
      }
      if (kind) result.observations.push({ kind, handId: after.hI, handNumber: after.gN, tableId: table!, heroId: hero!,
        sequence: f.localReceiveSequence, generation: carried.generation, receivedAt: now, cursor: after.now,
        dealtInCount: after.iHPI.length, sbId: sb, bbId: bb, sbBefore, sbAfter, bbAfter,
        linkedCompletionSequence: linked, sourcePatch: structuredClone(raw) });
      candidate = kind === "sb_total_two_candidate" ? { sequence: f.localReceiveSequence,
        generation: carried.generation, hand: after.hI, cursor: after.now, at: now } : null;
    } else candidate = null;
    previous = carried;
  }
  result.issues.push("A total-two candidate is not an action contract: retain the raw completion/turn envelopes and corroborating Session Log call/DOM evidence.",
    "No BB anchor/four-fold completion certificate or strategy is issued; no positive live recommendation follows from this report.");
  return result;
}
