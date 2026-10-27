import { createLiveOpponentClient } from "./opponentStats.js";
import { buildLivePreflopContext, buildLivePreflopExecution } from "./preflop.js";
import {
  assessLiveState,
  emptyActionHistory,
  updateActionHistory,
  type ActionHistory,
  type Position,
  type PokerGameState,
  type ConfidenceResult,
  type PotProvenance,
} from "@poker-ai/browser-reader";
import {
  calculateCallEV,
  calculateOuts,
  calculatePotOdds,
  calculateSPR,
  classifyBoardTexture,
} from "@poker-ai/poker-engine";
import { evaluateDecisionPolicy, deriveCandidateActions, type DecisionPacket } from "@poker-ai/ai-core";
import { calculateEquityForEstimates, estimateOpponentRange } from "@poker-ai/range-engine";
import { readLiveTable } from "./tableRead.js";
import { logLiveDiagnostics } from "./diagnostics.js";
import { decisionFingerprint, decisionRequestKey } from "./requestIdentity.js";
import { RecommendationSchema, lockedEngineRecommendation, validateReasoningConsistency } from "@poker-ai/ai-core";
import { startLiveTimeline } from "./liveTimeline.js";
import { installRaiseEvidenceResponder } from "./raiseEvidenceCapture.js";
import { capturePostflopReadiness } from "./postflopReadinessCapture.js";
import { capturePostflopObservation } from "./postflopObservationCapture.js";
import { buildLiveDecisionProofs, liveProofRevision, activationLabel } from "./decisionProofs.js";
console.log("[Poker AI Reader] Content script loaded on:", window.location.href);

// ---------------------------------------------------------------------
// On-page overlay: replaces "go check devtools" with a small visible
// panel on the table itself. Deliberately minimal -- one fixed-position
// box, re-rendered in full from a single state object each time
// anything changes, rather than hand-patched DOM nodes. pointer-events
// is off on the container so it never blocks clicks on the real table
// underneath it.
// ---------------------------------------------------------------------

type AIStatus = "idle" | "waiting" | "received" | "blocked" | "error" | "waiting_for_proof" | "unsupported" | "unsafe" | "evidence_expired";

interface OverlayState {
  street: string;
  equityLine: string | null;
  potOddsLine: string | null;
  preflopLine: string | null;
  opponentStatsLine: string | null;
  policyLine: string | null;
  aiStatus: AIStatus;
  aiResult: { action: string; confidence: number; reasoning: string } | null;
  aiWarnings: string[];
}

const overlayState: OverlayState = {
  street: "-",
  equityLine: null,
  potOddsLine: null,
  preflopLine: null,
  opponentStatsLine: null,
  policyLine: null,
  aiStatus: "idle",
  aiResult: null,
  aiWarnings: [],
};

const OVERLAY_ID = "poker-ai-reader-overlay";
let riverDisplay: { lines: string[]; source: string; expiresAt: number } | null = null;
let riverExpiryTimer: number | undefined;
function clearRiverDisplay() {
  riverDisplay = null;
  if (riverExpiryTimer !== undefined) window.clearTimeout(riverExpiryTimer);
  riverExpiryTimer = undefined;
}

function ensureOverlay(): HTMLElement {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) return existing;

  const el = document.createElement("div");
  el.id = OVERLAY_ID;
  el.style.cssText = `
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 999999;
    width: 280px;
    max-height: 90vh;
    overflow-y: auto;
    background: rgba(20, 20, 24, 0.92);
    color: #eee;
    font-family: -apple-system, "Segoe UI", sans-serif;
    font-size: 12px;
    line-height: 1.4;
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
    pointer-events: none;
  `.trim();
  document.body.appendChild(el);
  return el;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const AI_STATUS_COLORS: Record<AIStatus, string> = {
  idle: "#888888",
  waiting: "#e0a030",
  received: "#4caf50",
  blocked: "#e05050",
  error: "#e05050",
  waiting_for_proof: "#e0a030", unsupported: "#888888", unsafe: "#e05050",
  evidence_expired: "#999999",
};

function renderOverlay() {
  refreshDisplayLifetime();
  const el = ensureOverlay();
  const s = overlayState;
  const parts: string[] = [];

  parts.push(`<div style="font-weight:600; margin-bottom:6px; color:#9ad;">Poker AI Reader</div>`);
  parts.push(`<div>Street: <b>${escapeHtml(s.street)}</b></div>`);
  if (s.equityLine) parts.push(`<div>${escapeHtml(s.equityLine)}</div>`);
  if (s.potOddsLine) parts.push(`<div>${escapeHtml(s.potOddsLine)}</div>`);
  if (s.opponentStatsLine) parts.push(`<div>${escapeHtml(s.opponentStatsLine)}</div>`);
  if (s.preflopLine) {
    parts.push(
      `<div style="margin-top:6px; padding-top:6px; border-top:1px solid #444;">${escapeHtml(s.preflopLine)}</div>`,
    );
  }

  parts.push(`<div style="margin-top:8px; padding-top:8px; border-top:1px solid #444;">`);
  parts.push(
    `<div style="color:${AI_STATUS_COLORS[s.aiStatus]}; font-weight:600;">${escapeHtml(s.aiStatus === "received" ? "RECOMMENDATION AVAILABLE" : s.aiStatus.replaceAll("_", " ").toUpperCase())}</div>`,
  );
  if (s.policyLine) parts.push(`<div>${escapeHtml(s.policyLine)}</div>`);
  if (riverDisplay) parts.push(`<div data-river-illustration style="margin-top:8px; padding:6px; border:1px solid #888;">${riverDisplay.lines.map(escapeHtml).join("<br/>")}</div>`);
  if (s.aiResult && displayLifetime) parts.push(`<div data-proof-countdown>Evidence expires in ${Math.max(0, (displayLifetime.expiresAt - Date.now()) / 1000).toFixed(1)}s</div>`);
  if (s.aiResult) {
    parts.push(`<div style="font-size:16px; font-weight:700; margin:4px 0;">${escapeHtml(s.aiResult.action)}</div>`);
    parts.push(`<div>Confidence: ${(s.aiResult.confidence * 100).toFixed(0)}%</div>`);
    parts.push(`<div style="margin-top:4px; color:#ccc;">${escapeHtml(s.aiResult.reasoning)}</div>`);
  }
  if (s.aiWarnings.length > 0) {
    parts.push(
      `<div style="margin-top:6px; color:#e0a030;">${s.aiWarnings.map((w) => escapeHtml(w)).join("<br/>")}</div>`,
    );
  }
  parts.push(`</div>`);

  el.innerHTML = parts.join("");
}

type GameState = PokerGameState;

const RELAY_SERVER_URL = "http://localhost:8787/recommendation"

interface BuildDecisionPacketInput {
  state: GameState;
  amountToCall: number;
  equity: number | undefined;
  equitySource: DecisionPacket["engineCalculations"]["equitySource"];
  bigBlind: number;
  decisionPot: number;
  potProvenance: PotProvenance;
  confidence: ConfidenceResult;
  /** A detected position is required; no BTN fallback. */
  heroPosition: Position;
  /** Per-seat range evidence for all active opponents. */
  opponentRangeContext?: DecisionPacket["opponentContext"];
}

/**
 * Builds a full DecisionPacket from the live game state. This is the
 * evidence packet: every deterministic fact the policy/explanation path
 * needs -- equity, pot odds, EV, SPR, outs, board texture, candidate
 * actions, an opponent read -- is computed and organized HERE, once, so
 * the AI never has to (or has to guess at) any of it itself. Each
 * engineCalculations field is only computed when its underlying
 * function's own precondition actually holds (e.g. outs don't exist on
 * the river) -- left undefined otherwise, never faked.
 *
 * Inputs must pass the live-read gate first: no fallback stack, blind,
 * position, or unverified displayed pot is substituted into this packet.
 */
function buildDecisionPacket(input: BuildDecisionPacketInput): DecisionPacket {
  const {
    state,
    amountToCall,
    equity,
    equitySource,
    bigBlind,
    decisionPot,
    potProvenance,
    confidence,
    heroPosition,
    opponentRangeContext,
  } = input;
  const hero = state.seats.find((s) => s.isYou)!;
  const numOpponentsRemaining = state.seats.filter(
    (s) => s.isOccupied && !s.isYou && !s.isFolded,
  ).length;

  if (confidence.level === "low" || hero.stack === null || !Number.isFinite(bigBlind) || bigBlind <= 0 ||
      !potProvenance.isPotSemanticsVerified || potProvenance.decisionPotSource === null || potProvenance.decisionPot !== decisionPot) {
    throw new Error("Cannot build a DecisionPacket from an untrusted table read");
  }
  console.log(
    `[Poker AI Reader] Data confidence: ${confidence.level}${confidence.reasons.length > 0 ? ` (${confidence.reasons.join("; ")})` : ""}`,
  );

  const facingActionType = amountToCall > 0 ? "bet" : "none";

  let potOddsBreakevenPercent: number | undefined;
  let callEV: number | undefined;
  if (amountToCall > 0 && decisionPot > 0) {
    potOddsBreakevenPercent = calculatePotOdds(decisionPot, amountToCall).breakevenEquityPercent;
    if (equity !== undefined) callEV = calculateCallEV(equity, decisionPot / bigBlind, amountToCall / bigBlind).ev;
  }

  let spr: number | undefined;
  const headsUpOpponent = numOpponentsRemaining === 1
    ? state.seats.find(s => s.isOccupied && !s.isYou && !s.isFolded) : undefined;
  // A hero-only stack/pot ratio is not effective SPR. Omit multiway/unknown stacks.
  if (hero.stack !== null && hero.stack > 0 && headsUpOpponent?.stack != null && headsUpOpponent.stack > 0 && decisionPot > 0) {
    spr = calculateSPR(Math.min(hero.stack, headsUpOpponent.stack), decisionPot);
  }

  let outs: number | undefined;
  if (state.board.length === 3 || state.board.length === 4) {
    outs = calculateOuts(hero.holeCards, state.board).count;
  }

  let boardTexture: DecisionPacket["engineCalculations"]["boardTexture"];
  if (state.board.length >= 3) {
    boardTexture = classifyBoardTexture(state.board);
  }

  return {
    hero: {
      holeCards: hero.holeCards as [import("@poker-ai/shared").Card, import("@poker-ai/shared").Card],
      position: heroPosition,
      stackBB: hero.stack / bigBlind,
    },
    table: {
      potBB: decisionPot / bigBlind,
      board: state.board,
      street: state.street,
      numOpponentsRemaining,
    },
    facingAction: {
      type: facingActionType,
      ...(amountToCall > 0 ? { amountBB: amountToCall / bigBlind } : {}),
    },
    candidateActions: deriveCandidateActions(facingActionType),
    potEvidence: { ...potProvenance, bigBlind },
    // policyContext intentionally absent until live pot/legality and range
    // uncertainty evidence are verified. The relay reports explicit fallback
    // eligibility; never invent fold equity or exact raise controls here.
    engineCalculations: {
      equity,
      equitySource,
      potOddsBreakevenPercent,
      callEV,
      spr,
      outs,
      boardTexture,
    },
    opponentContext: opponentRangeContext,
    dataConfidence: confidence.level,
  };
}

function openingControlNote(packet: DecisionPacket): string {
  const state = packet.preflopExecution?.exactOpeningSize?.controls;
  return state === "panel_closed_unchecked" ? "; Raise panel closed: controls not checked"
    : state === "selected_amount_differs" ? "; Selected amount differs: manually set 5 chips before acting"
    : state === "selected_amount_matches" ? "; Selected total matches 5 chips; manual action only" : "";
}

/**
 * requestKey is the value lastRecommendationRequestKey held at the
 * moment THIS request was sent. Fixes a real race: the existing dedup
 * only stops the same decision point from firing twice -- it does
 * nothing to stop an older, still-in-flight response from being treated
 * as current once a NEWER decision point has already taken over (e.g.
 * hero's turn came up again before the previous street's response came
 * back). Comparing against the live lastRecommendationRequestKey at
 * resolve-time, not send-time, is what actually catches this -- and the
 * overlay reuses the exact same check, so it can never show a stale
 * result either.
 */
async function requestRecommendation(packet: DecisionPacket, stateDescription: string, requestKey: string) {
  let policy: ReturnType<typeof evaluateDecisionPolicy> | null = null;
  let locked: ReturnType<typeof lockedEngineRecommendation> = null;
  try {
    policy = evaluateDecisionPolicy(packet);
    locked = lockedEngineRecommendation(policy);
    if (locked && requestKey === lastRecommendationRequestKey) {
      bindDisplayLifetime(requestKey, packet);
      overlayState.aiResult = {
        ...locked,
        action: locked.action === "RAISE" && packet.preflopExecution?.exactOpeningSize ? "RAISE TO 5 CHIPS (2.5 BB)"
          : locked.action === "RAISE" && policy.raiseToBB !== null ? `RAISE TO ${policy.raiseToBB} BB`
          : locked.action + (locked.sizingBB === undefined ? "" : ` ${locked.sizingBB}BB additional`),
      };
      overlayState.aiStatus = "received";
      overlayState.policyLine = `Engine decision (${policy.confidence} confidence); explanation pending` + (locked.action === "RAISE" ? openingControlNote(packet) : "");
      overlayState.aiWarnings = policy.reasons;
      renderOverlay(); // Paint the engine selection before starting any provider work.
    }
    const response = await fetch(RELAY_SERVER_URL, {
      method: "POST",
      signal: AbortSignal.timeout(70_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "fast", decisionPacket: packet }),
    });
    const data = await response.json();

    if (requestKey !== lastRecommendationRequestKey) {
      console.warn(
        `[Poker AI Reader] Discarding stale AI response (for: ${stateDescription}) -- a newer decision point is already current.`,
      );
      return;
    }

    // A response can arrive between polls. Re-read before showing it instead
    // of assuming the last one-second snapshot still describes the live turn.
    const latest = readLiveTable();
    const latestFingerprint = JSON.stringify([decisionFingerprint(location.origin + location.pathname, latest.raw, latest.context, latest.raiseControl), liveProofRevision(handTimeline.snapshot())]);
    if (requestKey !== decisionRequestKey(requestSequence, latestFingerprint) || !responseProofStillCurrent(packet, latest)) {
      lastRecommendationRequestKey = null;
      overlayState.aiResult = null;
      overlayState.aiStatus = "blocked";
      overlayState.policyLine = null;
      overlayState.aiWarnings = ["Table changed while the recommendation was pending."];
      overlayState.equityLine = null;
      overlayState.potOddsLine = null;
      overlayState.preflopLine = null;
      renderOverlay();
      return;
    }

    if (locked) {
      // This request may enrich the explanation only. Neither provider action,
      // size nor confidence may replace the synchronous engine result.
      if (!response.ok || !data.ok || data.blocked || data.activation?.allowed === false || Array.isArray(data.result)) {
        throw new Error("Explanation unavailable or relay rejected the response");
      }
      const explanation = RecommendationSchema.parse(data.result);
      if (data.decisionSource !== "engine_policy" || explanation.action !== locked.action || explanation.sizingBB !== locked.sizingBB ||
          !validateReasoningConsistency(explanation, packet).isConsistent) {
        throw new Error("Explanation does not match the locked engine action");
      }
      if (overlayState.aiResult) overlayState.aiResult.reasoning = explanation.reasoning;
      overlayState.aiStatus = "received";
      overlayState.policyLine = `Engine decision (${policy.confidence} confidence)` + (locked.action === "RAISE" ? openingControlNote(packet) : "");
      overlayState.aiWarnings = [...policy.reasons, ...(data.consistencyWarnings ?? [])];
      renderOverlay();
      return;
    }
    overlayState.policyLine = data.policy
      ? `Decision: ${data.decisionSource}; policy ${data.policy.status} (${data.policy.confidence} confidence)` : null;
    if (data.policy) console.log("[Poker AI Reader] Engine policy evidence:", data.policy);
    if (data.ok && data.result === null && data.blocked) {
      overlayState.aiResult = null;
      overlayState.aiStatus = data.activation?.state === "unsafe" ? "unsafe" : data.activation?.state === "unsupported" ? "unsupported" : "waiting_for_proof";
      overlayState.aiWarnings = data.uncertainty ?? [data.originalReason ?? data.blockedReason];
    } else if (data.ok) {
      if (!response.ok || Array.isArray(data.result)) throw new Error("Invalid live relay response");
      data.result = RecommendationSchema.parse(data.result);
      console.log(`[Poker AI Reader] AI recommendation (for: ${stateDescription}):`, data.result);
      overlayState.aiResult = {
        action: packet.table.street === "preflop" && data.decisionSource === "engine_policy" && data.result.action === "RAISE" && data.policy?.raiseToBB != null
          ? `RAISE TO ${data.policy.raiseToBB} BB`
          : data.result.action + (data.result.sizingBB === undefined ? "" : ` ${data.result.sizingBB}BB${data.decisionSource === "engine_policy" ? " additional" : ""}`)
          + (data.policy?.raiseToBB == null ? "" : ` (to ${data.policy.raiseToBB}BB)`),
        confidence: data.result.confidence,
        reasoning: data.result.reasoning,
      };
      overlayState.aiWarnings = [
        ...(data.blocked ? [`Blocked: ${data.blockedReason}${data.originalReason ? ` -- ${data.originalReason}` : ""}`] : []),
        ...(data.consistencyWarnings ?? []),
        ...(data.policy?.reasons ?? []),
        ...(packet.opponentContext?.rangeConfidence === "low" ? ["Opponent range confidence: low", ...(packet.opponentContext.rangeAssumptions ?? []), ...(packet.opponentContext.rangeFallbacks ?? [])] : []),
      ];
      overlayState.aiStatus = data.blocked ? "blocked" : "received";
    } else {
      console.error(`[Poker AI Reader] Relay server returned an error (for: ${stateDescription}):`, data.error);
      overlayState.aiStatus = "error";
      overlayState.aiResult = null;
      overlayState.aiWarnings = [String(data.error)];
    }
    renderOverlay();
  } catch (error) {
    console.error(`[Poker AI Reader] Failed to reach relay server (for: ${stateDescription}):`, error);
    if (requestKey === lastRecommendationRequestKey) {
      // Failure may also arrive between polls; never preserve an expired lock.
      let fresh = false;
      try {
        const latest = readLiveTable();
        const fingerprint = JSON.stringify([decisionFingerprint(location.origin + location.pathname, latest.raw, latest.context, latest.raiseControl), liveProofRevision(handTimeline.snapshot())]);
        fresh = requestKey === decisionRequestKey(requestSequence, fingerprint);
      } catch { /* Failed read invalidates the current display. */ }
      if (locked && policy && fresh) {
        overlayState.aiStatus = "received";
        overlayState.policyLine = `Engine decision (${policy.confidence} confidence); explanation unavailable` + (locked.action === "RAISE" ? openingControlNote(packet) : "");
        overlayState.aiWarnings = [...policy.reasons, "Relay explanation failed, timed out, or returned an invalid response. Engine action retained."];
        renderOverlay();
        return;
      }
      if (!fresh) lastRecommendationRequestKey = null;
      overlayState.aiStatus = "error";
      overlayState.aiResult = null;
      overlayState.policyLine = null;
      overlayState.aiWarnings = ["Relay request failed, timed out, or returned an invalid response."];
      renderOverlay();
    }
  }
}

const opponentStats = createLiveOpponentClient("http://localhost:8787");
let requestSequence = 0;
let lastStateJson: string | null = null;
let lastDomStateJson: string | null = null;
let lastRecommendationRequestKey: string | null = null;
let previousGameState: GameState | null = null;
let actionHistory: ActionHistory = emptyActionHistory();
let currentDiagnosticPacket: DecisionPacket | null = null;
const handTimeline = startLiveTimeline();
try {
  installRaiseEvidenceResponder(window, () => handTimeline.snapshot(), () => capturePostflopReadiness({
    snapshot: () => handTimeline.snapshot(), read: readLiveTable,
    epoch: () => ({ decisionEpoch: String(requestSequence), stateJson: lastStateJson }),
    tableUrl: () => location.origin + location.pathname, now: () => Date.now(),
  }), () => capturePostflopObservation({
    snapshot: () => handTimeline.snapshot(), read: readLiveTable,
    epoch: () => ({ decisionEpoch: String(requestSequence), stateJson: lastStateJson }),
    tableUrl: () => location.origin + location.pathname, now: () => Date.now(),
  }));
} catch { /* Optional diagnostics only. */ }

// Display-only deadline: never renews evidence or participates in activation.
// No old action is retained after expiry or any decision/source change.
let displayLifetime: { requestKey: string; expiresAt: number; receivedAt: number; dom: string; source: string; responsePacket?: DecisionPacket } | null = null;
let expiryTimer: number | undefined;
/** Reuse the adapter so new control contradictions also invalidate pending/displayed HJ folds. */
function responseProofStillCurrent(packet: DecisionPacket, read: ReturnType<typeof readLiveTable>): boolean {
  if (!packet.preflopExecution?.hjResponseWindow) return true;
  const assessment = assessLiveState(read.raw, read.context), timeline = handTimeline.snapshot();
  const preflop = buildLivePreflopContext(assessment, actionHistory, timeline, read);
  return buildLiveDecisionProofs(read, assessment, timeline, preflop,
    packet.decisionProofs!.decisionEpoch, packet).activation.allowed;
}
function displaySourceBinding() {
  const revision = JSON.parse(liveProofRevision(handTimeline.snapshot()));
  // Expiry removes the witness; retain only the expired label for this exact
  // otherwise unchanged decision. Any other revision clears it.
  delete revision.firstUtg;
  delete revision.hj;
  delete revision.co;
  delete revision.btn;
  delete revision.sb;
  delete revision.facingOpen;
  return JSON.stringify(revision);
}
function clearDisplayLifetime() {
  displayLifetime = null;
  if (expiryTimer !== undefined) window.clearTimeout(expiryTimer);
  expiryTimer = undefined;
}
function bindDisplayLifetime(requestKey: string, packet: DecisionPacket) {
  clearDisplayLifetime();
  const source = handTimeline.snapshot().sourceStatus;
  const proof = source.firstUtgProof ?? source.hjProof ?? source.coProof ?? source.btnProof ?? source.sbProof ?? source.facingOpenProof;
  if (!proof || lastDomStateJson === null) return;
  displayLifetime = { requestKey, receivedAt: proof.witness.receivedAt, expiresAt: proof.expiresAt,
    dom: lastDomStateJson, source: displaySourceBinding(),
    ...(packet.preflopExecution?.hjResponseWindow ? { responsePacket: packet } : {}) };
  expiryTimer = window.setTimeout(refreshFreshnessDisplay, Math.max(0, displayLifetime.expiresAt - Date.now()));
}
function refreshDisplayLifetime() {
  if (!displayLifetime) return;
  if (displayLifetime.dom !== lastDomStateJson || displayLifetime.source !== displaySourceBinding() || Date.now() < displayLifetime.receivedAt ||
      Date.now() < displayLifetime.expiresAt && !(handTimeline.snapshot().sourceStatus.firstUtgProof ?? handTimeline.snapshot().sourceStatus.hjProof ?? handTimeline.snapshot().sourceStatus.coProof ?? handTimeline.snapshot().sourceStatus.btnProof ?? handTimeline.snapshot().sourceStatus.sbProof ?? handTimeline.snapshot().sourceStatus.facingOpenProof)) {
    clearDisplayLifetime();
    overlayState.aiResult = null;
    overlayState.policyLine = null;
    overlayState.aiStatus = "waiting_for_proof";
    lastRecommendationRequestKey = null;
    return;
  }
  if (Date.now() >= displayLifetime.expiresAt) {
    lastRecommendationRequestKey = null; // Late explanations cannot restore advice.
    overlayState.aiResult = null;
    overlayState.aiStatus = "evidence_expired";
    overlayState.policyLine = "No current recommendation. Fresh source evidence is required.";
    overlayState.aiWarnings = [];
  }
}
function refreshFreshnessDisplay() {
  if (riverDisplay) {
    try {
      const read = readLiveTable(), timeline = handTimeline.snapshot();
      const river = buildLiveDecisionProofs(read, assessLiveState(read.raw, read.context), timeline, null, "display-refresh").riverCallFold;
      if (Date.now() >= riverDisplay.expiresAt || liveProofRevision(timeline) !== riverDisplay.source || !river?.illustration) {
        clearRiverDisplay();
        overlayState.aiStatus = river?.unsafe ? "unsafe" : "waiting_for_proof";
        overlayState.aiWarnings = river?.reasons ?? ["River illustration expired or inputs changed; fresh matching evidence is required."];
      }
    } catch {
      clearRiverDisplay();
      handTimeline.gap("River display read failed.");
      overlayState.aiStatus = "blocked";
    }
    renderOverlay();
  }
  if (!displayLifetime) return;
  // Also catch changed cards/actor between ordinary polls. This read can
  // invalidate a display, but cannot issue or extend a certificate.
  try {
    const read = readLiveTable();
    const dom = decisionFingerprint(location.origin + location.pathname, read.raw, read.context, read.raiseControl);
    if (dom !== displayLifetime.dom || displayLifetime.responsePacket && Date.now() < displayLifetime.expiresAt &&
        !responseProofStillCurrent(displayLifetime.responsePacket, read)) {
      clearDisplayLifetime();
      lastRecommendationRequestKey = null;
      overlayState.aiResult = null;
      overlayState.policyLine = null;
      overlayState.aiStatus = "waiting_for_proof";
    }
  } catch {
    clearDisplayLifetime();
    lastRecommendationRequestKey = null;
    overlayState.aiResult = null;
    overlayState.policyLine = null;
    overlayState.aiStatus = "blocked";
  }
  renderOverlay();
}
setInterval(refreshFreshnessDisplay, 250);
// Browsers may throttle timers in background tabs. Recheck before presenting
// the panel when the page becomes visible again; never restart the clock.
document.addEventListener("visibilitychange", refreshFreshnessDisplay);
window.addEventListener?.("focus", refreshFreshnessDisplay);

setInterval(() => {
  try {
  const read = readLiveTable();
  const assessment = assessLiveState(read.raw, read.context);
  handTimeline.observe(read, assessment);
  void handTimeline.tick();
  // Include blinds, dealer, and extraction failures in the identity of a read.
  const domStateJson = decisionFingerprint(location.origin + location.pathname, read.raw, read.context, read.raiseControl);
  const timelineSnapshot = handTimeline.snapshot();
  // River diagnostics must notice CALL-only changes and observation expiry as
  // well. Omit the receipt timestamp itself so a fresh identical poll is stable.
  const { observedAt: callObservedAt, ...callObservation } = read.callControl ?? {};
  const stateJson = JSON.stringify([domStateJson, liveProofRevision(timelineSnapshot),
    ...(assessment.state?.street === "river" ? [{ callObservation,
      callFresh: callObservedAt !== undefined && callObservedAt <= Date.now() && Date.now() - callObservedAt < 10_000 }] : [])]);
  if (stateJson !== lastStateJson) currentDiagnosticPacket = null;
  if (domStateJson !== lastDomStateJson) {
    lastDomStateJson = domStateJson;
    currentDiagnosticPacket = null;
    const state = assessment.state;
    if (!state || read.context.readErrors.length > 0) {
      previousGameState = null;
      actionHistory = emptyActionHistory();
      opponentStats.observe(null, actionHistory);
    } else {
      actionHistory = updateActionHistory(actionHistory, previousGameState, state, {
        bigBlind: assessment.bigBlind,
        dealerSeatNumber: read.context.dealerSeatNumber,
      });
      previousGameState = state;
      opponentStats.observe(state, actionHistory);
    }
  }
  opponentStats.tick();
  const preflop = buildLivePreflopContext(assessment, actionHistory, timelineSnapshot, read);
  logLiveDiagnostics(read, assessment, actionHistory, preflop, currentDiagnosticPacket, handTimeline.snapshot());
  if (stateJson !== lastStateJson) {
    clearRiverDisplay();
    currentDiagnosticPacket = null;
    lastStateJson = stateJson;
    // Invalidate in-flight results on every changed or failed read, including
    // leaving hero's turn. A later identical-looking decision gets a new token.
    lastRecommendationRequestKey = null;
    requestSequence++;
    const { state, confidence, bigBlind, amountToCall: parsedAmountToCall, positions, decisionPot } = assessment;
    // Only cross-checked source windows can supply absent contribution zeros.
    // The HJ response price follows the accepted UTG total, not a CALL control.
    const amountToCall = (preflop?.actionWindowEvidence === "hj_facing_utg_open5" || preflop?.openingEvidence === "first_utg_hand_start" || preflop?.openingEvidence === "hj_after_utg_fold" || preflop?.openingEvidence === "co_after_utg_hj_folds" || preflop?.openingEvidence === "btn_after_utg_hj_co_folds" || preflop?.openingEvidence === "sb_after_utg_hj_co_btn_folds") && bigBlind !== null
      ? preflop.amountToCallBB! * bigBlind : parsedAmountToCall;
    overlayState.street = state?.street ?? "unreadable";
    overlayState.opponentStatsLine = state ? state.seats.filter(s=>s.isOccupied&&!s.isYou&&!s.isFolded).map(s=>{const evidence=opponentStats.profile(s.playerName);return s.playerName+": "+(evidence?evidence.playerProfile.handsObserved+" observed windows / "+evidence.playerProfile.eligibleHands+" eligible hands ("+evidence.statsStorage+")":"identity ambiguous");}).join("; ") : null;
    overlayState.aiResult = null;
    overlayState.policyLine = null;
    overlayState.equityLine = null;
    overlayState.potOddsLine = null;
    overlayState.preflopLine = null;
    overlayState.aiWarnings = confidence.reasons;
    overlayState.aiStatus = "blocked";
    renderOverlay();
    if (!state) {
      const failed = buildLiveDecisionProofs(read, assessment, timelineSnapshot, preflop, String(requestSequence));
      overlayState.aiStatus = failed.activation.state === "unsafe" ? "unsafe" : "waiting_for_proof";
      overlayState.policyLine = activationLabel(failed.activation.state);
      overlayState.aiWarnings = [...failed.activation.reasons, ...confidence.reasons];
      renderOverlay();
      return;
    }
    const hero = state.seats.find((s) => s.isYou);
    const heroPosition = hero ? positions.get(hero.seatNumber) : undefined;
    if (preflop) {
      overlayState.preflopLine = "Preflop: " + preflop.situation + (preflop.decisionSupport === "uncertain" ? " - insufficient strategic model / uncertain" : "");
      overlayState.aiWarnings = [...confidence.reasons, ...preflop.reasons];
      renderOverlay();
    }
    const scoped = buildLiveDecisionProofs(read, assessment, timelineSnapshot, preflop, String(requestSequence));
    if (scoped.riverCallFold) {
      // Separate assumption-based illustration; never an action/LLM pathway.
      overlayState.aiStatus = scoped.riverCallFold.unsafe ? "unsafe" : "waiting_for_proof";
      overlayState.policyLine = "River CALL vs FOLD withheld. " + scoped.riverCallFold.warning;
      overlayState.aiWarnings = scoped.riverCallFold.reasons;
      if (scoped.riverCallFold.illustration && scoped.riverCallFold.binding) {
        riverDisplay = { lines: scoped.riverCallFold.illustrationLines, source: liveProofRevision(timelineSnapshot),
          expiresAt: scoped.riverCallFold.binding.expiresAt };
        riverExpiryTimer = window.setTimeout(refreshFreshnessDisplay, Math.max(0, riverDisplay.expiresAt - Date.now()));
      }
      renderOverlay();
      return;
    }
    overlayState.aiStatus = scoped.activation.state === "proof_ready" ? "idle" : scoped.activation.state;
    overlayState.policyLine = activationLabel(scoped.activation.state) + " (" + scoped.activation.supportedDecisionType + ")";
    overlayState.aiWarnings = [...new Set([...scoped.activation.reasons, ...(state.street === "preflop" ? [] : confidence.reasons)])];
    renderOverlay();
    // Range/terminal model checks occur with the constructed packet; structural
    // proof failures cannot be bypassed by asking a provider for an action.
    if (scoped.activation.state === "unsafe" || scoped.activation.state === "unsupported" ||
      scoped.activation.failedProofs.some(scope => !["rangeInput", "equity", "terminal"].includes(scope))) return;
    if (!hero || hero.stack === null || bigBlind === null || amountToCall === null || heroPosition === undefined) return;

    overlayState.aiStatus = "idle";
    if (state.street === "preflop") {
      if (!preflop) {
        overlayState.aiStatus = "blocked";
        overlayState.aiWarnings = ["Structured preflop context is unavailable."];
        renderOverlay();
        return;
      }
      const facing = amountToCall > 0 ? "raise" : "none";
      const packet: DecisionPacket = {
        hero: { holeCards: hero.holeCards as DecisionPacket["hero"]["holeCards"], position: heroPosition, stackBB: hero.stack / bigBlind },
        table: { potBB: decisionPot === null ? null : decisionPot / bigBlind, board: [], street: "preflop", numOpponentsRemaining: preflop.activeOpponents },
        facingAction: { type: facing, ...(amountToCall > 0 ? { amountBB: amountToCall / bigBlind } : {}) },
        candidateActions: deriveCandidateActions(facing), engineCalculations: {}, dataConfidence: confidence.level, preflop,
        preflopExecution: { ...buildLivePreflopExecution(read, assessment, liveProofRevision(timelineSnapshot), scoped.openingSize ?? undefined)!,
          ...(scoped.responseExecution ? { hjResponseWindow: scoped.responseExecution } : {}) },
        potEvidence: { ...assessment.pot, bigBlind },
        opponentContext: { opponents: state.seats.filter(s=>s.isOccupied&&!s.isYou&&!s.isFolded).map(s=>({seat:s.seatNumber,position:positions.get(s.seatNumber)??null,rangeBasis:"Preflop context remains uncertain",rangeConfidence:"low",rangeStatus:"prior_only",...(opponentStats.profile(s.playerName)??{})})) },
      };
      packet.decisionProofs = buildLiveDecisionProofs(read, assessment, timelineSnapshot, preflop, String(requestSequence), packet).evidence;
      const policy = evaluateDecisionPolicy(packet);
      currentDiagnosticPacket = packet;
      overlayState.preflopLine = "Preflop: " + preflop.situation;
      if (policy.status !== "selected" || !policy.activation?.allowed) {
        overlayState.aiStatus = policy.activation?.state === "unsafe" ? "unsafe" : policy.activation?.state === "unsupported" ? "unsupported" : "waiting_for_proof";
        overlayState.aiWarnings = policy.reasons;
      } else if (hero.isCurrentToAct && hero.holeCards.length === 2) {
        const requestKey = decisionRequestKey(requestSequence, stateJson);
        lastRecommendationRequestKey = requestKey;
        overlayState.aiStatus = "waiting";
        overlayState.policyLine = null;
        currentDiagnosticPacket = packet;
        logLiveDiagnostics(read, assessment, actionHistory, preflop, packet, handTimeline.snapshot());
        requestRecommendation(packet, "structured preflop", requestKey);
      }
      renderOverlay();
      return;
    }
    // EV/postflop behavior keeps the full existing monetary/confidence gates.
    if (confidence.level === "low" || decisionPot === null ||
        !assessment.pot.isPotSemanticsVerified || assessment.pot.decisionPotSource === null) return;
    if (hero && hero.holeCards.length === 2) {
      const numOpponents = state.seats.filter(
        (s) => s.isOccupied && !s.isYou && !s.isFolded,
      ).length;

      if (numOpponents >= 1) {
        const opponents = state.seats.filter(s => s.isOccupied && !s.isYou && !s.isFolded);
        const estimates = opponents.map(opponent => {
          const records = actionHistory.records.get(opponent.seatNumber) ?? [];
          return estimateOpponentRange({
            position: positions.get(opponent.seatNumber) ?? null,
            // Missing hero actions prevent counting observed raises as a complete sequence.
            actions: records.map(r => ({ street: r.street, action: r.action,
              priorRaises: null, facing: "unknown" as const, wagerAction: r.wagerAction, observation: r.observation })),
            historyCoverage: "partial", effectiveStackBB: null, playersDealtIn: null, chipEvOnly: false,
            knownCards: [...hero.holeCards, ...state.board],
            tendencies: opponentStats.profile(opponent.playerName)?.playerProfile.stats,
          });
        });
        const selection = calculateEquityForEstimates(hero.holeCards, estimates, state.board, { iterations: 3000 });
        const equityResult = selection.equity === undefined ? undefined : { equity: selection.equity };
        const equitySource = selection.source;
        const opponentRangeContext: DecisionPacket["opponentContext"] = {
          estimatedRangeDescription: estimates.map((estimate, i) => "Seat " + opponents[i]!.seatNumber + ": " + estimate.basis).join("; "),
          rangeConfidence: selection.reason || estimates.some(e => e.confidence === "low") ? "low" : "medium",
          rangeStatus: selection.equity === undefined ? "unavailable" : estimates.every(e => e.status === "modeled") ? "modeled" : "prior_only",
          rangeAssumptions: [...actionHistory.notes, ...estimates.flatMap((e,i) => e.assumptions.map(reason => "Seat " + opponents[i]!.seatNumber + ": " + reason)),
            ...(opponents.length > 1 ? ["Multiway equity is showdown share of one common pot; side pots and future betting are not modeled."] : [])],
          rangeFallbacks: [...estimates.flatMap((e,i) => e.fallbacks.map(reason => "Seat " + opponents[i]!.seatNumber + ": " + reason)), ...(selection.reason ? [selection.reason] : [])],
          opponents: estimates.map((estimate,i) => ({ seat: opponents[i]!.seatNumber,
            position: positions.get(opponents[i]!.seatNumber) ?? null,
            rangeBasis: estimate.basis, rangeConfidence: estimate.confidence, rangeStatus: estimate.status, ...(opponentStats.profile(opponents[i]!.playerName) ?? {}) })),
        };
        overlayState.aiWarnings = [opponentRangeContext.estimatedRangeDescription!, ...opponentRangeContext.rangeAssumptions!, ...opponentRangeContext.rangeFallbacks!];
        const equityLabel = equitySource === "estimated_multiway_ranges" ? "vs distinct opponent ranges; heuristic"
          : equitySource === "estimated_range" ? "vs estimated range; heuristic" : "vs random hands; ranges unavailable";
        overlayState.equityLine = equityResult ? "Equity: " + (equityResult.equity * 100).toFixed(1) + "% (" + equityLabel + ")" : "Equity unavailable: opponent range is uncertain";

        if (amountToCall > 0 && decisionPot > 0) {
          const potOdds = calculatePotOdds(decisionPot, amountToCall);
          console.log(
            `[Poker AI Reader] Amount to call: ${amountToCall}. Breakeven equity needed: ${potOdds.breakevenEquityPercent.toFixed(1)}%`,
          );
          overlayState.potOddsLine = `To call: ${amountToCall} (breakeven: ${potOdds.breakevenEquityPercent.toFixed(1)}%)`;
        } else if (amountToCall === 0) {
          console.log("[Poker AI Reader] No bet facing hero (check or already matched) -- pot odds not applicable.");
          overlayState.potOddsLine = null;
        }
        renderOverlay();

        // Only actually call the AI when it's genuinely hero's turn --
        // otherwise this would fire a real API request on every single
        // board/bet change from ANY player, not just when a decision is
        // actually needed. Also de-duplicated by a request key so the
        // same exact turn doesn't trigger multiple requests if polled
        // more than once before the state next changes.
        if (hero.isCurrentToAct) {
          const requestKey = decisionRequestKey(requestSequence, stateJson);
          if (requestKey !== lastRecommendationRequestKey) {
            lastRecommendationRequestKey = requestKey;
            overlayState.aiStatus = "waiting";
            overlayState.policyLine = null;
            overlayState.aiResult = null;
            overlayState.aiWarnings = opponentRangeContext ? [opponentRangeContext.estimatedRangeDescription ?? "", ...(opponentRangeContext.rangeAssumptions ?? []), ...(opponentRangeContext.rangeFallbacks ?? [])] : [];
            renderOverlay();

            const packet = buildDecisionPacket({
              state,
              amountToCall,
              equity: equityResult?.equity,
              equitySource,
              bigBlind,
              decisionPot,
              potProvenance: assessment.pot,
              confidence,
              heroPosition,
              opponentRangeContext,
            });
            packet.decisionProofs = buildLiveDecisionProofs(read, assessment, timelineSnapshot, preflop, String(requestSequence), packet).evidence;
            currentDiagnosticPacket = packet;
            logLiveDiagnostics(read, assessment, actionHistory, preflop, packet, handTimeline.snapshot());
            console.log(`[Poker AI Reader] Big blind detected: ${bigBlind}. Hero stackBB: ${packet.hero.stackBB.toFixed(2)}. Facing amountBB: ${packet.facingAction.amountBB?.toFixed(2) ?? "n/a"}`);
            console.log(
              `[Poker AI Reader] It's hero's turn -- requesting AI recommendation for street=${state.street}, board=${JSON.stringify(state.board)}, decisionPot=${decisionPot}`,
            );
            requestRecommendation(packet, `${state.street} | board: ${JSON.stringify(state.board)} | pot: ${decisionPot}`, requestKey);
          }
        }
      }
    }
  }
  } catch (error) {
    // An exception must invalidate outstanding responses and all derived display facts.
    handTimeline.gap("Live polling failed; snapshot continuity lost.");
    requestSequence++;
    lastRecommendationRequestKey = null;
    lastStateJson = null;
    lastDomStateJson = null;
    previousGameState = null;
    actionHistory = emptyActionHistory();
    currentDiagnosticPacket = null;
    overlayState.aiResult = null;
    overlayState.aiStatus = "blocked";
    clearDisplayLifetime();
    overlayState.street = "unreadable";
    clearRiverDisplay();
    overlayState.opponentStatsLine = null;
    overlayState.policyLine = null;
    overlayState.equityLine = null;
    overlayState.potOddsLine = null;
    overlayState.preflopLine = null;
    overlayState.aiWarnings = ["Live read/calculation failed; recommendation withheld."];
    console.error("[Poker AI Reader] Poll failed", error);
    renderOverlay();
  }
}, 1000);
