import { createLiveOpponentClient } from "./opponentStats.js";
import { buildLivePreflopContext } from "./preflop.js";
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
import { preflopUncertainty, deriveCandidateActions, type DecisionPacket } from "@poker-ai/ai-core";
import { calculateEquityForEstimates, estimateOpponentRange } from "@poker-ai/range-engine";
import { readLiveTable } from "./tableRead.js";
import { logLiveDiagnostics } from "./diagnostics.js";
import { decisionFingerprint, decisionRequestKey } from "./requestIdentity.js";
import { RecommendationSchema } from "@poker-ai/ai-core";
console.log("[Poker AI Reader] Content script loaded on:", window.location.href);

// ---------------------------------------------------------------------
// On-page overlay: replaces "go check devtools" with a small visible
// panel on the table itself. Deliberately minimal -- one fixed-position
// box, re-rendered in full from a single state object each time
// anything changes, rather than hand-patched DOM nodes. pointer-events
// is off on the container so it never blocks clicks on the real table
// underneath it.
// ---------------------------------------------------------------------

type AIStatus = "idle" | "waiting" | "received" | "blocked" | "error";

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
};

function renderOverlay() {
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
    `<div style="color:${AI_STATUS_COLORS[s.aiStatus]}; font-weight:600;">${escapeHtml(s.aiStatus.toUpperCase())}</div>`,
  );
  if (s.policyLine) parts.push(`<div>${escapeHtml(s.policyLine)}</div>`);
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
  try {
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
    const latestFingerprint = decisionFingerprint(location.origin + location.pathname, latest.raw, latest.context, latest.raiseControl);
    if (requestKey !== decisionRequestKey(requestSequence, latestFingerprint)) {
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

    overlayState.policyLine = data.policy
      ? `Decision: ${data.decisionSource}; policy ${data.policy.status} (${data.policy.confidence} confidence)` : null;
    if (data.policy) console.log("[Poker AI Reader] Engine policy evidence:", data.policy);
    if (data.ok && data.result === null && data.blocked) {
      overlayState.aiResult = null;
      overlayState.aiStatus = "blocked";
      overlayState.aiWarnings = data.uncertainty ?? [data.originalReason ?? data.blockedReason];
    } else if (data.ok) {
      if (!response.ok || Array.isArray(data.result)) throw new Error("Invalid live relay response");
      data.result = RecommendationSchema.parse(data.result);
      console.log(`[Poker AI Reader] AI recommendation (for: ${stateDescription}):`, data.result);
      overlayState.aiResult = {
        action: data.result.action + (data.result.sizingBB === undefined ? "" : ` ${data.result.sizingBB}BB${data.decisionSource === "engine_policy" ? " additional" : ""}`)
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
let lastRecommendationRequestKey: string | null = null;
let previousGameState: GameState | null = null;
let actionHistory: ActionHistory = emptyActionHistory();
let currentDiagnosticPacket: DecisionPacket | null = null;

setInterval(() => {
  try {
  const read = readLiveTable();
  const assessment = assessLiveState(read.raw, read.context);
  // Include blinds, dealer, and extraction failures in the identity of a read.
  const stateJson = decisionFingerprint(location.origin + location.pathname, read.raw, read.context, read.raiseControl);
  if (stateJson !== lastStateJson) {
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
  const preflop = buildLivePreflopContext(assessment, actionHistory);
  logLiveDiagnostics(read, assessment, actionHistory, preflop, currentDiagnosticPacket);
  if (stateJson !== lastStateJson) {
    lastStateJson = stateJson;
    // Invalidate in-flight results on every changed or failed read, including
    // leaving hero's turn. A later identical-looking decision gets a new token.
    lastRecommendationRequestKey = null;
    requestSequence++;
    const { state, confidence, bigBlind, amountToCall, positions, decisionPot } = assessment;
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
    if (!state) return;
    const hero = state.seats.find((s) => s.isYou);
    const heroPosition = hero ? positions.get(hero.seatNumber) : undefined;
    if (preflop) {
      overlayState.preflopLine = "Preflop: " + preflop.situation + (preflop.decisionSupport === "uncertain" ? " - insufficient strategic model / uncertain" : "");
      overlayState.aiWarnings = [...confidence.reasons, ...preflop.reasons];
      renderOverlay();
    }
    // Gate ALL advice (including preflop and pot odds) before any
    // strategic calculation or request. Pot semantics remain unresolved pending capture.
    if (confidence.level === "low" || !hero || hero.stack === null || bigBlind === null ||
        amountToCall === null || decisionPot === null || heroPosition === undefined ||
        !assessment.pot.isPotSemanticsVerified || assessment.pot.decisionPotSource === null) return;

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
        table: { potBB: decisionPot / bigBlind, board: [], street: "preflop", numOpponentsRemaining: preflop.activeOpponents },
        facingAction: { type: facing, ...(amountToCall > 0 ? { amountBB: amountToCall / bigBlind } : {}) },
        candidateActions: deriveCandidateActions(facing), engineCalculations: {}, dataConfidence: confidence.level, preflop,
        potEvidence: { ...assessment.pot, bigBlind },
        opponentContext: { opponents: state.seats.filter(s=>s.isOccupied&&!s.isYou&&!s.isFolded).map(s=>({seat:s.seatNumber,position:positions.get(s.seatNumber)??null,rangeBasis:"Preflop context remains uncertain",rangeConfidence:"low",rangeStatus:"prior_only",...(opponentStats.profile(s.playerName)??{})})) },
      };
      const uncertainty = preflopUncertainty(packet);
      overlayState.preflopLine = "Preflop: " + preflop.situation;
      if (uncertainty) {
        overlayState.aiStatus = "blocked";
        overlayState.aiWarnings = uncertainty;
      } else if (hero.isCurrentToAct && hero.holeCards.length === 2) {
        const requestKey = decisionRequestKey(requestSequence, stateJson);
        lastRecommendationRequestKey = requestKey;
        overlayState.aiStatus = "waiting";
        overlayState.policyLine = null;
        currentDiagnosticPacket = packet;
        logLiveDiagnostics(read, assessment, actionHistory, preflop, packet);
        requestRecommendation(packet, "structured preflop", requestKey);
      }
      renderOverlay();
      return;
    }
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
            currentDiagnosticPacket = packet;
            logLiveDiagnostics(read, assessment, actionHistory, preflop, packet);
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
    requestSequence++;
    lastRecommendationRequestKey = null;
    lastStateJson = null;
    previousGameState = null;
    actionHistory = emptyActionHistory();
    currentDiagnosticPacket = null;
    overlayState.aiResult = null;
    overlayState.aiStatus = "blocked";
    overlayState.street = "unreadable";
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
