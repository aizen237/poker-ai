import { createSnapshotTimeline, ingestHandLog, newHandTimeline, timelineReason, recordCoverageIssue, recordLogSourceFailure, type HandTimeline, type LiveStateAssessment } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import { tableIdFromPath, TIMELINE_CHANNEL, validHandIdentity, type HandIdentityEvidence } from "./pokerNowTransport.js";
import { createSourceMetadataAudit } from "./sourceMetadata.js";
import { createFirstUtgSource } from "./firstUtgSource.js";

export interface TimelineRuntimeOptions {
  tableId: string;
  sessionId: string;
  fetchLog: (url: string, init: RequestInit) => Promise<Response>;
  now: () => number;
}
/** Source timeline stays incomplete. Dependent UTG/HJ/CO/BTN/SB witnesses support only
 * their decision-local chart classes, never generic betting/history coverage. */
export function createTimelineRuntime(options: TimelineRuntimeOptions) {
  const fallback = createSnapshotTimeline(options.sessionId);
  const hands = new Map<string, HandTimeline>();
  const heroIds = new Map<string, string | null>();
  const pendingFinal = new Set<string>();
  const sourceMetadata = createSourceMetadataAudit();
  const firstUtgSource = createFirstUtgSource(options.tableId, options.now);
  let identity: HandIdentityEvidence | null = null;
  let current: HandTimeline | null = null;
  let connected = false, busy = false, nextFetch = 0, failures = 0, sequence = -1;
  let status = "Waiting for sanitized hand metadata; refresh the tab after loading the extension.";
  let lastSuccess: number | null = null;
  const keyOf = (id: HandIdentityEvidence) => `${options.tableId}:hand:${id.handId}`;
  return {
    accept(message: unknown) {
      if (!message || typeof message !== "object") return;
      const m = message as Record<string, unknown>;
      if (m.channel === TIMELINE_CHANNEL && m.type === "source_metadata" && m.tableId === options.tableId) {
        let bootstrap: ReturnType<typeof firstUtgSource.accept>;
        try { bootstrap = firstUtgSource.accept(m.utgSource, m.sequence, m.generation, m.observedAt); } catch { firstUtgSource.reset(); }
        sourceMetadata.socket(m.metadata, m.sequence, m.generation, options.now(), bootstrap);
        return; // Does not update global history coverage or requests.
      }
      if (m.channel !== TIMELINE_CHANNEL || m.type !== "identity" || m.tableId !== options.tableId ||
          !Number.isSafeInteger(m.sequence) || Number(m.sequence) <= sequence || typeof m.connected !== "boolean" ||
          (m.identity !== null && !validHandIdentity(m.identity, options.tableId))) return;
      sequence = Number(m.sequence); connected = m.connected;
      if (!connected || !m.identity) {
        firstUtgSource.reset();
        status = "Source disconnected or no validated hand metadata; no new log requests.";
        if (current) {
          timelineReason(current, "Socket observation gap; reconnect/full-history coverage remains unverified.");
          recordCoverageIssue(current, "metadata_gap", "Socket observation gap; no validated backfill/catch-up certificate. This does not identify missing log actions.", options.now());
        }
        return;
      }
      const next = m.identity as HandIdentityEvidence;
      if (identity && next.handNumber < identity.handNumber) {
        connected = false; status = "Regressing hand metadata rejected; reload/capture required.";
        if (current) recordCoverageIssue(current, "identity_conflict", status, options.now());
        return;
      }
      if (current && identity && keyOf(next) === current.handId && next.handNumber !== identity.handNumber) {
        connected = false; status = "Conflicting hand ID/number rejected."; timelineReason(current, status);
        recordCoverageIssue(current, "identity_conflict", status, options.now()); return;
      }
      const retainedHand = hands.get(keyOf(next));
      if (retainedHand && retainedHand.handNumber !== next.handNumber) {
        connected = false; status = "Reused retained hand ID with a different hand number rejected.";
        if (current) {
          timelineReason(current, status);
          recordCoverageIssue(current, "identity_conflict", status, options.now());
        }
        return;
      }
      if (!current || current.handId !== keyOf(next)) {
        if (current) pendingFinal.add(current.handId);
        const key = keyOf(next);
        current = hands.get(key) ?? newHandTimeline(key, next.handNumber);
        hands.set(key, current);
        fallback.reset();
        if (identity && next.handNumber === identity.handNumber && next.handId !== identity.handId) {
          recordCoverageIssue(current, "identity_conflict", "Hand ID changed without a hand-number advance; reset/replacement semantics are unproven. Timelines remain separate.", options.now());
        }
        if (identity && next.handNumber > identity.handNumber + 1) timelineReason(current, "Hand number jumped; intervening hands were not captured.");
        timelineReason(current, "Hand identity reported by page socket; snapshot segment is separate and not proof of hand start.");
        while (hands.size > 4) { const oldest = hands.keys().next().value!; hands.delete(oldest); heroIds.delete(oldest); pendingFinal.delete(oldest); }
      }
      identity = next;
      heroIds.set(current.handId, next.heroPlayerId);
      if (next.chainGap) {
        timelineReason(current, "Socket frame predecessor mismatch; metadata is not an ordered action stream.");
        recordCoverageIssue(current, "metadata_gap", "Socket frame predecessor mismatch. It is not a log-row sequence and cannot locate/count missing actions.", options.now());
      }
      status = "Source metadata available; server log coverage remains unverified.";
    },
    observe(read: LiveTableRead, assessment: LiveStateAssessment) {
      fallback.observe(assessment.state, { bigBlind: assessment.bigBlind, dealerSeatNumber: read.context.dealerSeatNumber }, read.context.readErrors, options.now());
      // Snapshot segments have no server hand ID. Keep them separate rather than
      // claiming a render observed near a socket message belongs to that hand.
    },
    gap(reason: string) {
      firstUtgSource.reset();
      fallback.observe(null, {}, [reason], options.now());
      if (current) timelineReason(current, reason);
    },
    stop(reason: string) { connected = false; firstUtgSource.reset(); status = reason; if (current) timelineReason(current, reason); },
    async tick() {
      if (busy || !connected || !current || options.now() < nextFetch) return;
      const finalKey = pendingFinal.values().next().value;
      const target = finalKey ? hands.get(finalKey)! : current;
      const heroPlayerId = heroIds.get(target.handId) ?? null;
      if (finalKey) pendingFinal.delete(finalKey);
      busy = true; nextFetch = options.now() + 3000;
      let submittedToIngestion = false;
      try {
        // Full hand refresh avoids dropping same-timestamp rows at an after_at boundary.
        const url = `/api/games/${encodeURIComponent(options.tableId)}/log_v3?hand_number=${target.handNumber}`;
        const response = await options.fetchLog(url, { method: "GET", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10_000) });
        let metadata: ReturnType<typeof sourceMetadata.response> | null = null;
        try { metadata = sourceMetadata.response(response.headers, response.status, target.handId, target.handNumber, options.now()); } catch { /* diagnostics only */ }
        if (!response.ok) throw new Error(`Log request HTTP ${response.status}`);
        if (Number(response.headers.get("content-length") ?? 0) > 2_000_000) throw new Error("Log response exceeds capture limit");
        const text = await response.text();
        if (text.length > 2_000_000) throw new Error("Log response exceeds capture limit");
        if (hands.get(target.handId) !== target) return; // Evicted/old table: never apply to another hand.
        const payload: unknown = JSON.parse(text);
        try { if (metadata) sourceMetadata.payload(metadata, payload); } catch { /* diagnostics only */ }
        submittedToIngestion = true;
        ingestHandLog(target, payload, options.now());
        for (const event of target.events) if (event.actor && heroPlayerId) event.actor.isHero = event.actor.playerId === heroPlayerId;
        lastSuccess = options.now(); failures = 0;
        status = "Server log received; historyComplete=false pending validated coverage/order contract.";
      } catch (error) {
        failures++; nextFetch = options.now() + Math.min(60_000, 3000 * 2 ** Math.min(failures, 5));
        status = error instanceof Error ? error.message : "Log capture failed";
        // Schema/hand-conflict rejection is recorded atomically by ingestion.
        // HTTP/JSON/network failures have no accepted row payload to invent.
        if (!submittedToIngestion) recordLogSourceFailure(target, status, options.now());
        timelineReason(target, `Log source failure: ${status}`);
      } finally { busy = false; }
    },
    snapshot() {
      const firstUtgProof = connected ? firstUtgSource.proof() : null;
      return { current: current ?? fallback.current(), snapshotFallback: fallback.current(),
        archivedSnapshotSegments: fallback.archived(),
        archivedHands: [...hands.values()].filter(h => h !== current),
        sourceStatus: { status, connected, busy, lastSuccess, identity,
          sourceMetadata: sourceMetadata.snapshot(),
          firstUtgProof,
          hjProof: connected ? firstUtgSource.hjProof() : null,
          coProof: connected ? firstUtgSource.coProof() : null,
          btnProof: connected ? firstUtgSource.btnProof() : null,
          sbProof: connected ? firstUtgSource.sbProof() : null,
          // Compatibility/display view of the same contract, not another validator.
          firstUtg: firstUtgProof?.witness ?? null,
          firstUtgEvidence: firstUtgSource.diagnostic(),
          historyCoverage: (current ?? fallback.current()).coverage,
          coverageScope: "Diagnostic only. Socket frame cursors, timestamp filters and local presentation sequences cannot certify contiguous log coverage or current-decision catch-up.",
          actorSeatMapping: { ...(current ?? fallback.current()).seatMapping,
            scope: "Hand-local Player stacks evidence, matched by player ID only. Actor seats require a later timestamp; ties/earlier actions stay unknown. DOM names are only a manual cross-check. Hero identity comes from the registered current-player ID." },
          timestampUnits: "Unknown. sourceTimestampRaw preserves the original JSON value; sourceTimestamp is an exact integer candidate ordering key, not a wall-clock time. Equal keys remain ambiguous.",
          amountUnits: "Log amounts are source-reported; chip/BB and call-versus-total semantics still require cross-checking.",
          snapshotAssociation: "Unverified temporal cross-check; DOM snapshots have no server hand ID.",
          logContractVerified: false, settlementComplete: false } };
    },
  };
}
export type LiveTimelineDiagnostic = ReturnType<ReturnType<typeof createTimelineRuntime>["snapshot"]>;

export function startLiveTimeline() {
  const tableId = typeof location !== "undefined" ? tableIdFromPath(location.pathname) : null;
  const runtime = createTimelineRuntime({ tableId: tableId ?? "unavailable", sessionId: crypto.randomUUID(), now: () => Date.now(),
    fetchLog: (url, init) => fetch(url, init) });
  if (tableId && typeof window.addEventListener === "function") {
    window.addEventListener("message", event => {
      if (event.source === window && event.origin === location.origin && tableIdFromPath(location.pathname) === tableId) runtime.accept(event.data);
    });
    window.postMessage({ channel: TIMELINE_CHANNEL, type: "ready" }, location.origin);
    window.addEventListener("pagehide", () => runtime.stop("Page hidden/unloaded; source stopped."));
  }
  return { ...runtime, tick: async () => {
    if (!tableId || tableIdFromPath(location.pathname) !== tableId) { runtime.stop("Table route changed or unavailable; reload to attach a new source."); return; }
    await runtime.tick();
  } };
}
