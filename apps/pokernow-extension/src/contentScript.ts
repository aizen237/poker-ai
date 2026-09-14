import { assembleGameState, calculateAmountToCall, type RawSeatInput, type RawBoardCardInput } from "@poker-ai/browser-reader";
import { calculateEquity, calculatePotOdds } from "@poker-ai/poker-engine";
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

let lastStateJson: string | null = null;

setInterval(() => {
  const state = readGameState();
  if (!state) return;

  const stateJson = JSON.stringify(state);
  if (stateJson !== lastStateJson) {
    console.log("[Poker AI Reader] Game state changed:", JSON.parse(stateJson));
    lastStateJson = stateJson;

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
      }
    }
  }
}, 1000);