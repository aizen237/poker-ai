import {
  assembleGameState,
  calculateAmountToCall,
  computeDataConfidence,
  emptyActionHistory,
  updateActionHistory,
  type ActionHistory,
  type RawSeatInput,
  type RawBoardCardInput,
} from "@poker-ai/browser-reader";
import {
  calculateCallEV,
  calculateEquity,
  calculateOuts,
  calculatePotOdds,
  calculateSPR,
  classifyBoardTexture,
} from "@poker-ai/poker-engine";
import { deriveCandidateActions, type DecisionPacket } from "@poker-ai/ai-core";
import { calculateEquityVsRange, estimateOpponentRange, evaluateShove } from "@poker-ai/range-engine";
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
  aiStatus: AIStatus;
  aiResult: { action: string; confidence: number; reasoning: string } | null;
  aiWarnings: string[];
}

const overlayState: OverlayState = {
  street: "-",
  equityLine: null,
  potOddsLine: null,
  preflopLine: null,
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
  if (s.preflopLine) {
    parts.push(
      `<div style="margin-top:6px; padding-top:6px; border-top:1px solid #444;">${escapeHtml(s.preflopLine)}</div>`,
    );
  }

  parts.push(`<div style="margin-top:8px; padding-top:8px; border-top:1px solid #444;">`);
  parts.push(
    `<div style="color:${AI_STATUS_COLORS[s.aiStatus]}; font-weight:600;">${escapeHtml(s.aiStatus.toUpperCase())}</div>`,
  );
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

function extractBoardCards(): RawBoardCardInput[] {
  const boardContainer = document.querySelector(".table-cards");
  if (!boardContainer) return [];

  const cards: RawBoardCardInput[] = [];
  const cardContainers = boardContainer.querySelectorAll(".card-container");

  for (const container of cardContainers) {
    const valueEl = container.querySelector(".value");
    const suitEl = container.querySelector(".suit");
    if (valueEl?.textContent && suitEl?.textContent) {
      cards.push({ valueText: valueEl.textContent, suitText: suitEl.textContent });
    }
  }

  return cards;
}

function extractSeats(): RawSeatInput[] {
  const seats: RawSeatInput[] = [];

  for (let seatNumber = 1; seatNumber <= 10; seatNumber++) {
    const seatEl = document.querySelector(`.table-player-${seatNumber}`);
    if (!seatEl) {
      seats.push({
        seatNumber,
        isOccupied: false,
        isYou: false,
        playerNameText: null,
        stackText: null,
        statusClasses: [],
        holeCardClassLists: [],
        betValueText: null,
      });
      continue;
    }

    const classList = [...seatEl.classList];
    // An empty/unsat seat still has a "table-player-N" div (with just a
    // Sit button, per what we confirmed during DOM inspection) -- detect
    // real occupancy by checking for the player-name element instead of
    // just "does this div exist".
    const nameEl = seatEl.querySelector(".table-player-name a");
    const stackEl = seatEl.querySelector(".table-player-stack .normal-value");

    if (!nameEl || !stackEl) {
      seats.push({
        seatNumber,
        isOccupied: false,
        isYou: false,
        playerNameText: null,
        stackText: null,
        statusClasses: [],
        holeCardClassLists: [],
        betValueText: null,
      });
      continue;
    }

    const holeCardEls = seatEl.querySelectorAll(".table-player-cards .card-container");
    const holeCardClassLists = [...holeCardEls].map((el) => [...el.classList]);

    const betValueEl = seatEl.querySelector(".table-player-bet-value");

    seats.push({
      seatNumber,
      isOccupied: true,
      isYou: classList.includes("you-player"),
      playerNameText: nameEl.textContent,
      stackText: stackEl.textContent,
      statusClasses: classList,
      holeCardClassLists,
      betValueText: betValueEl?.textContent ?? null,
    });
  }

  return seats;
}

function extractPotValues(): { main: string; total: string | null } {
  const mainEl = document.querySelector(".table-pot-size .main-value .normal-value");
  const totalEl = document.querySelector(".table-pot-size .add-on-container .normal-value");
  return {
    main: mainEl?.textContent ?? "0",
    total: totalEl?.textContent ?? null,
  };
}

function extractBigBlind(): number {
  const blindValueEls = document.querySelectorAll(".blind-value .chips-value .normal-value");
  // First is small blind, second is big blind, per confirmed DOM structure.
  const bigBlindText = blindValueEls[1]?.textContent;
  if (!bigBlindText) {
    console.warn("[Poker AI Reader] Could not find big blind value, defaulting to 1 (BB conversions will be wrong)");
    return 1;
  }
  const bigBlind = Number(bigBlindText.trim());
  return Number.isNaN(bigBlind) || bigBlind <= 0 ? 1 : bigBlind;
}

/**
 * Independent check for whether the big blind is actually readable from
 * the DOM right now. Kept separate from extractBigBlind() on purpose --
 * this only feeds data-confidence and never changes what
 * extractBigBlind() itself returns to its existing callers (preflop
 * push/fold, BB conversions).
 */
function isBigBlindReadable(): boolean {
  const blindValueEls = document.querySelectorAll(".blind-value .chips-value .normal-value");
  const bigBlindText = blindValueEls[1]?.textContent;
  if (!bigBlindText) return false;
  const bigBlind = Number(bigBlindText.trim());
  return !Number.isNaN(bigBlind) && bigBlind > 0;
}
function readGameState() {
  const pot = extractPotValues();
  try {
    return assembleGameState({
      seats: extractSeats(),
      boardCards: extractBoardCards(),
      potMainValueText: pot.main,
      potTotalValueText: pot.total,
    });
  } catch (error) {
    console.error("[Poker AI Reader] Failed to assemble game state:", error);
    return null;
  }
}

type GameState = ReturnType<typeof readGameState> extends infer T ? NonNullable<T> : never;


const RELAY_SERVER_URL = "http://localhost:8787/recommendation"
const POSITION_IS_KNOWN = false; // KNOWN PLACEHOLDER -- flips to true once real dealer-button tracking exists.

interface BuildDecisionPacketInput {
  state: GameState;
  amountToCall: number;
  equity: number;
  equitySource: DecisionPacket["engineCalculations"]["equitySource"];
  bigBlind: number;
  bigBlindWasDefaulted: boolean;
  /** Heads-up only -- see the numOpponents branch below. */
  opponentActionsDescription?: string | undefined;
}

/**
 * Builds a full DecisionPacket from the live game state. This is the
 * "structured decision-policy layer": every deterministic fact the AI
 * needs -- equity, pot odds, EV, SPR, outs, board texture, candidate
 * actions, an opponent read -- is computed and organized HERE, once, so
 * the AI never has to (or has to guess at) any of it itself. Each
 * engineCalculations field is only computed when its underlying
 * function's own precondition actually holds (e.g. outs don't exist on
 * the river) -- left undefined otherwise, never faked.
 *
 * KNOWN GAP, documented not hidden: hero's real position (BTN/CO/etc.)
 * isn't computed yet -- that requires tracking the dealer button's seat
 * and hero's seat relative to it, which isn't built. Using "BTN" as a
 * fixed placeholder for now so the AI receives *a* valid position rather
 * than an invalid one, but this is not yet a trustworthy field.
 */
function buildDecisionPacket(input: BuildDecisionPacketInput): DecisionPacket {
  const { state, amountToCall, equity, equitySource, bigBlind, bigBlindWasDefaulted, opponentActionsDescription } = input;
  const hero = state.seats.find((s) => s.isYou)!;
  const numOpponentsRemaining = state.seats.filter(
    (s) => s.isOccupied && !s.isYou && !s.isFolded,
  ).length;

  const confidence = computeDataConfidence(state, {
    amountToCall,
    bigBlindWasDefaulted,
    isPositionKnown: POSITION_IS_KNOWN,
  });
  console.log(
    `[Poker AI Reader] Data confidence: ${confidence.level}${confidence.reasons.length > 0 ? ` (${confidence.reasons.join("; ")})` : ""}`,
  );

  const facingActionType = amountToCall > 0 ? "bet" : "none";

  let potOddsBreakevenPercent: number | undefined;
  let callEV: number | undefined;
  if (amountToCall > 0 && state.potMainValue > 0) {
    potOddsBreakevenPercent = calculatePotOdds(state.potMainValue, amountToCall).breakevenEquityPercent;
    callEV = calculateCallEV(equity, state.potMainValue, amountToCall).ev;
  }

  let spr: number | undefined;
  if (hero.stack !== null && state.potMainValue > 0) {
    spr = calculateSPR(hero.stack, state.potMainValue);
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
      position: "BTN", // KNOWN PLACEHOLDER -- see POSITION_IS_KNOWN above
      stackBB: bigBlind > 0 ? (hero.stack ?? 0) / bigBlind : (hero.stack ?? 0),
    },
    table: {
      potBB: bigBlind > 0 ? state.potMainValue / bigBlind : state.potMainValue,
      board: state.board,
      street: state.street,
      numOpponentsRemaining,
    },
    facingAction: {
      type: facingActionType,
      ...(amountToCall > 0 ? { amountBB: bigBlind > 0 ? amountToCall / bigBlind : amountToCall } : {}),
    },
    candidateActions: deriveCandidateActions(facingActionType),
    engineCalculations: {
      equity,
      equitySource,
      potOddsBreakevenPercent,
      callEV,
      spr,
      outs,
      boardTexture,
    },
    opponentContext: opponentActionsDescription ? { estimatedRangeDescription: opponentActionsDescription } : undefined,
    dataConfidence: confidence.level,
  };
}

const SHORT_STACK_BB_THRESHOLD = 20;

/**
 * Preflop push/fold advice, position-independent (unlike opening ranges,
 * which need real position data we don't have yet -- see the placeholder
 * note on buildDecisionPacket). Only fires below a stack-depth threshold,
 * since push/fold logic isn't the right tool for deep-stacked preflop
 * decisions. Deep-stack preflop is an honest, documented gap for now,
 * not silently faked.
 */
function checkPreflopPushFold(state: ReturnType<typeof readGameState> extends infer T ? NonNullable<T> : never, bigBlind: number) {
  const hero = state.seats.find((s) => s.isYou);
  if (!hero || hero.holeCards.length !== 2 || !hero.isCurrentToAct || state.street !== "preflop") return;

  const stackBB = bigBlind > 0 ? (hero.stack ?? 0) / bigBlind : 0;
  if (stackBB <= 0 || stackBB > SHORT_STACK_BB_THRESHOLD) return;

  const potBB = bigBlind > 0 ? state.potMainValue / bigBlind : state.potMainValue;
  if (potBB <= 0) return;

  const shove = evaluateShove(hero.holeCards, stackBB, potBB, { iterations: 2000 });
  const preflopLine = `PREFLOP (${stackBB.toFixed(1)}BB effective): ${
    shove.isProfitable ? "SHOVE profitable" : "SHOVE not profitable"
  } (EV: ${shove.ev.toFixed(2)}BB, equity if called: ${(shove.equityIfCalled * 100).toFixed(1)}%, assumed fold equity: ${(shove.foldEquityUsed * 100).toFixed(0)}%)`;
  console.log(`[Poker AI Reader] ${preflopLine}`);
  overlayState.preflopLine = preflopLine;
  renderOverlay();
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

    if (data.ok) {
      console.log(`[Poker AI Reader] AI recommendation (for: ${stateDescription}):`, data.result);
      overlayState.aiResult = {
        action: data.result.action,
        confidence: data.result.confidence,
        reasoning: data.result.reasoning,
      };
      overlayState.aiWarnings = [
        ...(data.blocked ? [`Blocked: ${data.blockedReason}${data.originalReason ? ` -- ${data.originalReason}` : ""}`] : []),
        ...(data.consistencyWarnings ?? []),
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
      overlayState.aiWarnings = ["Failed to reach relay server -- is it running?"];
      renderOverlay();
    }
  }
}

let lastStateJson: string | null = null;
let lastRecommendationRequestKey: string | null = null;
let previousGameState: GameState | null = null;
let actionHistory: ActionHistory = emptyActionHistory();

setInterval(() => {
  const state = readGameState();
  if (!state) return;

  const stateJson = JSON.stringify(state);
  if (stateJson !== lastStateJson) {
    console.log("[Poker AI Reader] Game state changed:", JSON.parse(stateJson));
    lastStateJson = stateJson;

    overlayState.street = state.street;
    overlayState.preflopLine = null;
    renderOverlay();

    actionHistory = updateActionHistory(actionHistory, previousGameState, state);
    previousGameState = state;

    const bigBlindForPreflopCheck = extractBigBlind();
    checkPreflopPushFold(state, bigBlindForPreflopCheck);

    const hero = state.seats.find((s) => s.isYou);
    if (hero && hero.holeCards.length === 2 && state.street !== "preflop") {
      const numOpponents = state.seats.filter(
        (s) => s.isOccupied && !s.isYou && !s.isFolded,
      ).length;

      if (numOpponents >= 1) {
        let equityResult: { equity: number };
        let equitySource: DecisionPacket["engineCalculations"]["equitySource"];
        let opponentActionsDescription: string | undefined;

        if (numOpponents === 1) {
          const opponent = state.seats.find((s) => s.isOccupied && !s.isYou && !s.isFolded)!;
          const opponentActions = (actionHistory.get(opponent.seatNumber) ?? []).map((r) => r.action);
          opponentActionsDescription =
            opponentActions.length > 0
              ? `Opponent's actions this hand so far (in order): ${opponentActions.join(", ")}.`
              : "Opponent has taken no actions yet this hand.";
          const estimatedRange = estimateOpponentRange(opponentActions);
          try {
            equityResult = calculateEquityVsRange(hero.holeCards, estimatedRange, state.board, {
              iterations: 3000,
            });
            equitySource = "estimated_range";
            console.log(
              `[Poker AI Reader] Hero equity vs estimated range (actions so far: ${
                opponentActions.length > 0 ? opponentActions.join(", ") : "none yet"
              }): ${(equityResult.equity * 100).toFixed(1)}%`,
            );
          } catch (error) {
            // Estimated range narrowed to nothing overlapping the known
            // cards -- fall back to equity vs random rather than crash.
            console.warn("[Poker AI Reader] Range-based equity failed, falling back to random hands:", error);
            equityResult = calculateEquity(hero.holeCards, state.board, numOpponents, { iterations: 3000 });
            equitySource = "random_hands";
            console.log(
              `[Poker AI Reader] Hero equity vs ${numOpponents} opponent(s) (random hands, fallback): ${(equityResult.equity * 100).toFixed(1)}%`,
            );
          }
        } else {
          // Multiway pots: the range engine doesn't yet support equity
          // vs multiple distinct opponent ranges at once -- documented
          // gap, falls back to equity vs random hands for now. No
          // opponent-action description either, for the same reason.
          equityResult = calculateEquity(hero.holeCards, state.board, numOpponents, { iterations: 3000 });
          equitySource = "random_hands";
          console.log(
            `[Poker AI Reader] Hero equity vs ${numOpponents} opponent(s) (random hands -- multiway, no range model yet): ${(equityResult.equity * 100).toFixed(1)}%`,
          );
        }

        overlayState.equityLine = `Equity: ${(equityResult.equity * 100).toFixed(1)}% (${equitySource === "estimated_range" ? "vs estimated range" : "vs random hands"})`;

        const amountToCall = calculateAmountToCall(state);
        if (amountToCall > 0 && state.potMainValue > 0) {
          const potOdds = calculatePotOdds(state.potMainValue, amountToCall);
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
          const requestKey = `${state.street}:${state.board.length}:${amountToCall}:${state.potMainValue}`;
          if (requestKey !== lastRecommendationRequestKey) {
            lastRecommendationRequestKey = requestKey;
            overlayState.aiStatus = "waiting";
            overlayState.aiResult = null;
            overlayState.aiWarnings = [];
            renderOverlay();

            const bigBlind = extractBigBlind();
            const bigBlindWasDefaulted = !isBigBlindReadable();
            const packet = buildDecisionPacket({
              state,
              amountToCall,
              equity: equityResult.equity,
              equitySource,
              bigBlind,
              bigBlindWasDefaulted,
              opponentActionsDescription,
            });
            console.log(`[Poker AI Reader] Big blind detected: ${bigBlind}. Hero stackBB: ${packet.hero.stackBB.toFixed(2)}. Facing amountBB: ${packet.facingAction.amountBB?.toFixed(2) ?? "n/a"}`);
            console.log(
              `[Poker AI Reader] It's hero's turn -- requesting AI recommendation for street=${state.street}, board=${JSON.stringify(state.board)}, potMainValue=${state.potMainValue}`,
            );
            requestRecommendation(packet, `${state.street} | board: ${JSON.stringify(state.board)} | pot: ${state.potMainValue}`, requestKey);
          }
        }
      }
    }
  }
}, 1000);