import { assembleGameState, calculateAmountToCall, computeDataConfidence, type RawSeatInput, type RawBoardCardInput } from "@poker-ai/browser-reader";
import { calculateEquity, calculatePotOdds } from "@poker-ai/poker-engine";
import type { DecisionPacket } from "@poker-ai/ai-core";
import { evaluateShove } from "@poker-ai/range-engine";
console.log("[Poker AI Reader] Content script loaded on:", window.location.href);

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


const RELAY_SERVER_URL = "http://localhost:8787/recommendation"
const POSITION_IS_KNOWN = false; // KNOWN PLACEHOLDER -- flips to true once real dealer-button tracking exists.

/**
 * Builds a full DecisionPacket from the live game state. KNOWN GAP,
 * documented not hidden: hero's real position (BTN/CO/etc.) isn't
 * computed yet -- that requires tracking the dealer button's seat and
 * hero's seat relative to it, which isn't built. Using "BTN" as a fixed
 * placeholder for now so the AI receives *a* valid position rather than
 * an invalid one, but this is not yet a trustworthy field.
 */
function buildDecisionPacket(
  state: ReturnType<typeof readGameState> extends infer T ? NonNullable<T> : never,
  amountToCall: number,
  equity: number,
  bigBlind: number,
  bigBlindWasDefaulted: boolean,
): DecisionPacket {
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
      type: amountToCall > 0 ? "bet" : "none",
      ...(amountToCall > 0 ? { amountBB: bigBlind > 0 ? amountToCall / bigBlind : amountToCall } : {}),
    },
    engineCalculations: {
      equity,
    },
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
  console.log(
    `[Poker AI Reader] PREFLOP push/fold check (${stackBB.toFixed(1)}BB effective): ` +
      `${shove.isProfitable ? "SHOVE profitable" : "SHOVE not profitable"} (EV: ${shove.ev.toFixed(2)}BB, ` +
      `equity if called: ${(shove.equityIfCalled * 100).toFixed(1)}%, assumed fold equity: ${(shove.foldEquityUsed * 100).toFixed(0)}%)`,
  );
}

async function requestRecommendation(packet: DecisionPacket, stateDescription: string) {
  try {
    const response = await fetch(RELAY_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "fast", decisionPacket: packet }),
    });
    const data = await response.json();
    if (data.ok) {
      console.log(`[Poker AI Reader] AI recommendation (for: ${stateDescription}):`, data.result);
    } else {
      console.error(`[Poker AI Reader] Relay server returned an error (for: ${stateDescription}):`, data.error);
    }
  } catch (error) {
    console.error(`[Poker AI Reader] Failed to reach relay server (for: ${stateDescription}):`, error);
  }
}

let lastStateJson: string | null = null;
let lastRecommendationRequestKey: string | null = null;

setInterval(() => {
  const state = readGameState();
  if (!state) return;

  const stateJson = JSON.stringify(state);
  if (stateJson !== lastStateJson) {
    console.log("[Poker AI Reader] Game state changed:", JSON.parse(stateJson));
    lastStateJson = stateJson;

    const bigBlindForPreflopCheck = extractBigBlind();
    checkPreflopPushFold(state, bigBlindForPreflopCheck);

    const hero = state.seats.find((s) => s.isYou);
    if (hero && hero.holeCards.length === 2 && state.street !== "preflop") {
      const numOpponents = state.seats.filter(
        (s) => s.isOccupied && !s.isYou && !s.isFolded,
      ).length;

      if (numOpponents >= 1) {
        const equityResult = calculateEquity(hero.holeCards, state.board, numOpponents, {
          iterations: 3000,
        });
        console.log(
          `[Poker AI Reader] Hero equity vs ${numOpponents} opponent(s): ${(equityResult.equity * 100).toFixed(1)}%`,
        );

        const amountToCall = calculateAmountToCall(state);
        if (amountToCall > 0 && state.potMainValue > 0) {
          const potOdds = calculatePotOdds(state.potMainValue, amountToCall);
          console.log(
            `[Poker AI Reader] Amount to call: ${amountToCall}. Breakeven equity needed: ${potOdds.breakevenEquityPercent.toFixed(1)}%`,
          );
        } else if (amountToCall === 0) {
          console.log("[Poker AI Reader] No bet facing hero (check or already matched) -- pot odds not applicable.");
        }

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
            const bigBlind = extractBigBlind();
            const bigBlindWasDefaulted = !isBigBlindReadable();
            const packet = buildDecisionPacket(state, amountToCall, equityResult.equity, bigBlind, bigBlindWasDefaulted);
            console.log(`[Poker AI Reader] Big blind detected: ${bigBlind}. Hero stackBB: ${packet.hero.stackBB.toFixed(2)}. Facing amountBB: ${packet.facingAction.amountBB?.toFixed(2) ?? "n/a"}`);
            console.log(
              `[Poker AI Reader] It's hero's turn -- requesting AI recommendation for street=${state.street}, board=${JSON.stringify(state.board)}, potMainValue=${state.potMainValue}`,
            );
            requestRecommendation(packet, `${state.street} | board: ${JSON.stringify(state.board)} | pot: ${state.potMainValue}`);
          }
        }
      }
    }
  }
}, 1000);