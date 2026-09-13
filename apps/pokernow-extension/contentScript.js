(() => {
  // ../../packages/browser-reader/dist/cardParsing.js
  var CLASS_SUIT_MAP = {
    "card-s": "s",
    "card-h": "h",
    "card-d": "d",
    "card-c": "c"
  };
  var CLASS_RANK_MAP = {
    "card-s-2": 2,
    "card-s-3": 3,
    "card-s-4": 4,
    "card-s-5": 5,
    "card-s-6": 6,
    "card-s-7": 7,
    "card-s-8": 8,
    "card-s-9": 9,
    "card-s-T": 10,
    "card-s-J": 11,
    "card-s-Q": 12,
    "card-s-K": 13,
    "card-s-A": 14
  };
  function parseHoleCardFromClassList(classList) {
    if (!classList.includes("flipped")) {
      return null;
    }
    let suit;
    let rank;
    for (const cls of classList) {
      if (cls in CLASS_SUIT_MAP) {
        suit = CLASS_SUIT_MAP[cls];
      }
      if (cls in CLASS_RANK_MAP) {
        rank = CLASS_RANK_MAP[cls];
      }
    }
    if (suit === void 0 || rank === void 0) {
      return null;
    }
    return { rank, suit };
  }
  var TEXT_SUIT_MAP = {
    h: "h",
    s: "s",
    d: "d",
    c: "c"
  };
  var TEXT_RANK_MAP = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14
  };
  function parseBoardCardFromText(valueText, suitText) {
    const rank = TEXT_RANK_MAP[valueText.trim()];
    const suit = TEXT_SUIT_MAP[suitText.trim().toLowerCase()];
    if (rank === void 0) {
      throw new Error(`Unrecognized board card value text: "${valueText}"`);
    }
    if (suit === void 0) {
      throw new Error(`Unrecognized board card suit text: "${suitText}"`);
    }
    return { rank, suit };
  }

  // ../../packages/browser-reader/dist/tableInfoParsing.js
  function parseChipsValueText(normalValueText) {
    const cleaned = normalValueText.trim().replace(/,/g, "");
    if (cleaned.length === 0) {
      throw new Error(`Chips value text is empty (expected a number, got an empty string)`);
    }
    const value = Number(cleaned);
    if (Number.isNaN(value)) {
      throw new Error(`Unrecognized chips value text: "${normalValueText}"`);
    }
    return value;
  }
  function parsePotSizeInfo(mainValueText, totalValueText) {
    return {
      mainValue: parseChipsValueText(mainValueText),
      totalValue: totalValueText !== null ? parseChipsValueText(totalValueText) : null
    };
  }
  function parsePlayerNameAndStack(nameText, stackText) {
    const name = nameText.trim();
    if (name.length === 0) {
      throw new Error("Player name text is empty");
    }
    return {
      name,
      stack: parseChipsValueText(stackText)
    };
  }

  // ../../packages/browser-reader/dist/gameState.js
  function deriveStreet(boardCardCount) {
    if (boardCardCount === 0)
      return "preflop";
    if (boardCardCount === 3)
      return "flop";
    if (boardCardCount === 4)
      return "turn";
    if (boardCardCount === 5)
      return "river";
    throw new Error(`Unexpected board card count: ${boardCardCount} (expected 0, 3, 4, or 5)`);
  }
  function assembleSeat(raw) {
    if (!raw.isOccupied) {
      return {
        seatNumber: raw.seatNumber,
        isOccupied: false,
        isYou: false,
        playerName: null,
        stack: null,
        isFolded: false,
        isCurrentToAct: false,
        isOffline: false,
        holeCards: []
      };
    }
    const isFolded = raw.statusClasses.includes("fold");
    const isCurrentToAct = raw.statusClasses.includes("decision-current");
    const isOffline = raw.statusClasses.includes("offline");
    let playerName = null;
    let stack = null;
    if (raw.playerNameText !== null && raw.stackText !== null) {
      const parsed = parsePlayerNameAndStack(raw.playerNameText, raw.stackText);
      playerName = parsed.name;
      stack = parsed.stack;
    }
    const holeCards = raw.holeCardClassLists.map(parseHoleCardFromClassList).filter((c) => c !== null);
    return {
      seatNumber: raw.seatNumber,
      isOccupied: true,
      isYou: raw.isYou,
      playerName,
      stack,
      isFolded,
      isCurrentToAct,
      isOffline,
      holeCards
    };
  }
  function assembleGameState(raw) {
    const board = raw.boardCards.map((c) => parseBoardCardFromText(c.valueText, c.suitText));
    const potInfo = parsePotSizeInfo(raw.potMainValueText, raw.potTotalValueText);
    const seats = raw.seats.map(assembleSeat);
    return {
      seats,
      board,
      potMainValue: potInfo.mainValue,
      potTotalValue: potInfo.totalValue,
      street: deriveStreet(board.length)
    };
  }

  // src/contentScript.ts
  console.log("[Poker AI Reader] Content script loaded on:", window.location.href);
  function extractBoardCards() {
    const boardContainer = document.querySelector(".table-cards");
    if (!boardContainer) return [];
    const cards = [];
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
  function extractSeats() {
    const seats = [];
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
          holeCardClassLists: []
        });
        continue;
      }
      const classList = [...seatEl.classList];
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
          holeCardClassLists: []
        });
        continue;
      }
      const holeCardEls = seatEl.querySelectorAll(".table-player-cards .card-container");
      const holeCardClassLists = [...holeCardEls].map((el) => [...el.classList]);
      seats.push({
        seatNumber,
        isOccupied: true,
        isYou: classList.includes("you-player"),
        playerNameText: nameEl.textContent,
        stackText: stackEl.textContent,
        statusClasses: classList,
        holeCardClassLists
      });
    }
    return seats;
  }
  function extractPotValues() {
    const mainEl = document.querySelector(".table-pot-size .main-value .normal-value");
    const totalEl = document.querySelector(".table-pot-size .add-on-container .normal-value");
    return {
      main: mainEl?.textContent ?? "0",
      total: totalEl?.textContent ?? null
    };
  }
  function readGameState() {
    const pot = extractPotValues();
    try {
      return assembleGameState({
        seats: extractSeats(),
        boardCards: extractBoardCards(),
        potMainValueText: pot.main,
        potTotalValueText: pot.total
      });
    } catch (error) {
      console.error("[Poker AI Reader] Failed to assemble game state:", error);
      return null;
    }
  }
  var lastStateJson = null;
  setInterval(() => {
    const state = readGameState();
    if (!state) return;
    const stateJson = JSON.stringify(state);
    if (stateJson !== lastStateJson) {
      console.log("[Poker AI Reader] Game state changed:", JSON.parse(stateJson));
      lastStateJson = stateJson;
    }
  }, 1e3);
})();
