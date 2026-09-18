"use strict";
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
  function parseBetValue(betValueText) {
    if (betValueText === null)
      return null;
    const trimmed = betValueText.trim();
    if (trimmed.length === 0)
      return null;
    const cleaned = trimmed.replace(/,/g, "");
    const value = Number(cleaned);
    return Number.isNaN(value) ? null : value;
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
        holeCards: [],
        currentBet: null
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
      holeCards,
      currentBet: parseBetValue(raw.betValueText)
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
  function calculateAmountToCall(state) {
    const hero = state.seats.find((s) => s.isYou);
    const heroBet = hero?.currentBet ?? 0;
    const highestOpponentBet = state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded && s.currentBet !== null).reduce((max, s) => Math.max(max, s.currentBet), 0);
    return Math.max(0, highestOpponentBet - heroBet);
  }

  // ../../packages/poker-engine/dist/types.js
  var HandCategory;
  (function(HandCategory2) {
    HandCategory2[HandCategory2["HighCard"] = 0] = "HighCard";
    HandCategory2[HandCategory2["Pair"] = 1] = "Pair";
    HandCategory2[HandCategory2["TwoPair"] = 2] = "TwoPair";
    HandCategory2[HandCategory2["ThreeOfAKind"] = 3] = "ThreeOfAKind";
    HandCategory2[HandCategory2["Straight"] = 4] = "Straight";
    HandCategory2[HandCategory2["Flush"] = 5] = "Flush";
    HandCategory2[HandCategory2["FullHouse"] = 6] = "FullHouse";
    HandCategory2[HandCategory2["FourOfAKind"] = 7] = "FourOfAKind";
    HandCategory2[HandCategory2["StraightFlush"] = 8] = "StraightFlush";
  })(HandCategory || (HandCategory = {}));

  // ../../packages/poker-engine/dist/combinatorics.js
  function combinations(items, k) {
    const results = [];
    const combo = [];
    function backtrack(start) {
      if (combo.length === k) {
        results.push([...combo]);
        return;
      }
      for (let i = start; i < items.length; i++) {
        combo.push(items[i]);
        backtrack(i + 1);
        combo.pop();
      }
    }
    backtrack(0);
    return results;
  }

  // ../../packages/poker-engine/dist/evaluator.js
  function detectStraightHigh(distinctRanksDesc) {
    if (distinctRanksDesc.length !== 5)
      return null;
    const set = new Set(distinctRanksDesc);
    if ([14, 5, 4, 3, 2].every((r) => set.has(r)))
      return 5;
    const [a, b, c, d, e] = distinctRanksDesc;
    if (a - b === 1 && b - c === 1 && c - d === 1 && d - e === 1)
      return a;
    return null;
  }
  function packValue(category, tiebreakers) {
    let value = category;
    for (let i = 0; i < 5; i++) {
      value = value * 16 + (tiebreakers[i] ?? 0);
    }
    return value;
  }
  function evaluate5(cards) {
    if (cards.length !== 5) {
      throw new Error(`evaluate5 requires exactly 5 cards, got ${cards.length}`);
    }
    const suits = cards.map((c) => c.suit);
    const isFlush = suits.every((s) => s === suits[0]);
    const rankCounts = /* @__PURE__ */ new Map();
    for (const c of cards) {
      rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
    }
    const distinctRanksDesc = [...rankCounts.keys()].sort((a, b) => b - a);
    const straightHigh = detectStraightHigh(distinctRanksDesc);
    const groups = [...rankCounts.entries()].map(([rank, count]) => ({ rank, count })).sort((a, b) => b.count !== a.count ? b.count - a.count : b.rank - a.rank);
    const allRanksDesc = cards.map((c) => c.rank).sort((a, b) => b - a);
    let category;
    let tiebreakers;
    if (isFlush && straightHigh !== null) {
      category = HandCategory.StraightFlush;
      tiebreakers = [straightHigh];
    } else if (groups[0].count === 4) {
      category = HandCategory.FourOfAKind;
      const kicker = allRanksDesc.find((r) => r !== groups[0].rank);
      tiebreakers = [groups[0].rank, kicker];
    } else if (groups[0].count === 3 && groups[1]?.count === 2) {
      category = HandCategory.FullHouse;
      tiebreakers = [groups[0].rank, groups[1].rank];
    } else if (isFlush) {
      category = HandCategory.Flush;
      tiebreakers = allRanksDesc;
    } else if (straightHigh !== null) {
      category = HandCategory.Straight;
      tiebreakers = [straightHigh];
    } else if (groups[0].count === 3) {
      category = HandCategory.ThreeOfAKind;
      const kickers = allRanksDesc.filter((r) => r !== groups[0].rank);
      tiebreakers = [groups[0].rank, ...kickers];
    } else if (groups[0].count === 2 && groups[1]?.count === 2) {
      category = HandCategory.TwoPair;
      const highPair = groups[0].rank;
      const lowPair = groups[1].rank;
      const kicker = allRanksDesc.find((r) => r !== highPair && r !== lowPair);
      tiebreakers = [highPair, lowPair, kicker];
    } else if (groups[0].count === 2) {
      category = HandCategory.Pair;
      const pairRank = groups[0].rank;
      const kickers = allRanksDesc.filter((r) => r !== pairRank);
      tiebreakers = [pairRank, ...kickers];
    } else {
      category = HandCategory.HighCard;
      tiebreakers = allRanksDesc;
    }
    return {
      category,
      tiebreakers,
      value: packValue(category, tiebreakers),
      cards: [...cards]
    };
  }
  function evaluateBest(cards) {
    if (cards.length < 5) {
      throw new Error(`evaluateBest requires at least 5 cards, got ${cards.length}`);
    }
    if (cards.length === 5) {
      return evaluate5(cards);
    }
    const candidates = combinations(cards, 5);
    let best = null;
    for (const combo of candidates) {
      const evaluated = evaluate5(combo);
      if (!best || evaluated.value > best.value) {
        best = evaluated;
      }
    }
    return best;
  }

  // ../../packages/shared/dist/card.js
  var SUITS = ["s", "h", "d", "c"];
  var RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  // ../../packages/shared/dist/deck.js
  function fullDeck() {
    const cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit });
      }
    }
    return cards;
  }
  function shuffle(items, rng = Math.random) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = items[i];
      items[i] = items[j];
      items[j] = tmp;
    }
    return items;
  }
  var Deck = class {
    cards;
    constructor(rng = Math.random, exclude = []) {
      const excludeIds = new Set(exclude.map((c) => `${c.rank}${c.suit}`));
      this.cards = shuffle(fullDeck().filter((c) => !excludeIds.has(`${c.rank}${c.suit}`)), rng);
    }
    /** Number of cards remaining. */
    get remaining() {
      return this.cards.length;
    }
    draw() {
      const card = this.cards.pop();
      if (!card)
        throw new Error("Cannot draw from an empty deck");
      return card;
    }
    drawMany(n) {
      const drawn = [];
      for (let i = 0; i < n; i++)
        drawn.push(this.draw());
      return drawn;
    }
  };

  // ../../packages/poker-engine/dist/equity.js
  var DEFAULT_ITERATIONS = 1e4;
  function calculateEquity(heroCards, board, numOpponents, options = {}) {
    if (heroCards.length !== 2) {
      throw new Error(`calculateEquity requires exactly 2 hero cards, got ${heroCards.length}`);
    }
    if (board.length > 5) {
      throw new Error(`Board cannot have more than 5 cards, got ${board.length}`);
    }
    if (numOpponents < 1) {
      throw new Error(`calculateEquity requires at least 1 opponent, got ${numOpponents}`);
    }
    const iterations = options.iterations ?? DEFAULT_ITERATIONS;
    const rng = options.rng ?? Math.random;
    const cardsToComplete = 5 - board.length;
    let winShareSum = 0;
    let wins = 0;
    let ties = 0;
    let losses = 0;
    const knownCards = [...heroCards, ...board];
    for (let i = 0; i < iterations; i++) {
      const deck = new Deck(rng, knownCards);
      const opponentHoleCards = [];
      for (let o = 0; o < numOpponents; o++) {
        opponentHoleCards.push(deck.drawMany(2));
      }
      const runoutBoard = [...board, ...deck.drawMany(cardsToComplete)];
      const heroValue = evaluateBest([...heroCards, ...runoutBoard]).value;
      const opponentValues = opponentHoleCards.map((hole) => evaluateBest([...hole, ...runoutBoard]).value);
      const maxValue = Math.max(heroValue, ...opponentValues);
      if (heroValue < maxValue) {
        losses++;
      } else {
        const winnersCount = 1 + opponentValues.filter((v) => v === maxValue).length;
        winShareSum += 1 / winnersCount;
        if (winnersCount === 1) {
          wins++;
        } else {
          ties++;
        }
      }
    }
    return {
      equity: winShareSum / iterations,
      wins,
      ties,
      losses,
      iterations
    };
  }

  // ../../packages/poker-engine/dist/ev.js
  function calculatePotOdds(currentPot, amountToCall) {
    if (currentPot < 0)
      throw new Error(`currentPot cannot be negative, got ${currentPot}`);
    if (amountToCall <= 0) {
      throw new Error(`amountToCall must be positive, got ${amountToCall} (use 0 only for a check, which has no pot odds concept)`);
    }
    const breakevenEquity = amountToCall / (currentPot + amountToCall);
    return {
      breakevenEquity,
      breakevenEquityPercent: breakevenEquity * 100
    };
  }
  function calculateBetEV(equityIfCalled, foldEquity, currentPot, betSize) {
    if (equityIfCalled < 0 || equityIfCalled > 1) {
      throw new Error(`equityIfCalled must be between 0 and 1, got ${equityIfCalled}`);
    }
    if (foldEquity < 0 || foldEquity > 1) {
      throw new Error(`foldEquity must be between 0 and 1, got ${foldEquity}`);
    }
    const evIfFold = currentPot;
    const evIfCall = equityIfCalled * (currentPot + betSize) - (1 - equityIfCalled) * betSize;
    const ev = foldEquity * evIfFold + (1 - foldEquity) * evIfCall;
    return { ev };
  }

  // ../../packages/range-engine/dist/handNotation.js
  var RANK_TO_CHAR = {
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "T",
    11: "J",
    12: "Q",
    13: "K",
    14: "A"
  };
  var CHAR_TO_RANK = Object.fromEntries(RANKS.map((r) => [RANK_TO_CHAR[r], r]));

  // ../../packages/range-engine/dist/pushFold.js
  var DEFAULT_FOLD_EQUITY = 0.5;
  function evaluateShove(heroCards, effectiveStackBB, potBB, options = {}) {
    if (effectiveStackBB <= 0) {
      throw new Error(`effectiveStackBB must be positive, got ${effectiveStackBB}`);
    }
    if (potBB <= 0) {
      throw new Error(`potBB must be positive, got ${potBB}`);
    }
    const foldEquity = options.foldEquity ?? DEFAULT_FOLD_EQUITY;
    if (foldEquity < 0 || foldEquity > 1) {
      throw new Error(`foldEquity must be between 0 and 1, got ${foldEquity}`);
    }
    const equityResult = calculateEquity(heroCards, [], 1, {
      ...options.iterations !== void 0 ? { iterations: options.iterations } : {},
      ...options.rng !== void 0 ? { rng: options.rng } : {}
    });
    const { ev } = calculateBetEV(equityResult.equity, foldEquity, potBB, effectiveStackBB);
    return {
      ev,
      equityIfCalled: equityResult.equity,
      foldEquityUsed: foldEquity,
      isProfitable: ev > 0
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
          holeCardClassLists: [],
          betValueText: null
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
          holeCardClassLists: [],
          betValueText: null
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
        betValueText: betValueEl?.textContent ?? null
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
  function extractBigBlind() {
    const blindValueEls = document.querySelectorAll(".blind-value .chips-value .normal-value");
    const bigBlindText = blindValueEls[1]?.textContent;
    if (!bigBlindText) {
      console.warn("[Poker AI Reader] Could not find big blind value, defaulting to 1 (BB conversions will be wrong)");
      return 1;
    }
    const bigBlind = Number(bigBlindText.trim());
    return Number.isNaN(bigBlind) || bigBlind <= 0 ? 1 : bigBlind;
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
  var RELAY_SERVER_URL = "http://localhost:8787/recommendation";
  function buildDecisionPacket(state, amountToCall, equity, bigBlind) {
    const hero = state.seats.find((s) => s.isYou);
    const numOpponentsRemaining = state.seats.filter(
      (s) => s.isOccupied && !s.isYou && !s.isFolded
    ).length;
    return {
      hero: {
        holeCards: hero.holeCards,
        position: "BTN",
        // KNOWN PLACEHOLDER -- see function doc comment above
        stackBB: bigBlind > 0 ? (hero.stack ?? 0) / bigBlind : hero.stack ?? 0
      },
      table: {
        potBB: bigBlind > 0 ? state.potMainValue / bigBlind : state.potMainValue,
        board: state.board,
        street: state.street,
        numOpponentsRemaining
      },
      facingAction: {
        type: amountToCall > 0 ? "bet" : "none",
        ...amountToCall > 0 ? { amountBB: bigBlind > 0 ? amountToCall / bigBlind : amountToCall } : {}
      },
      engineCalculations: {
        equity
      },
      dataConfidence: "medium"
      // position placeholder means we can't honestly claim "high" yet
    };
  }
  var SHORT_STACK_BB_THRESHOLD = 20;
  function checkPreflopPushFold(state, bigBlind) {
    const hero = state.seats.find((s) => s.isYou);
    if (!hero || hero.holeCards.length !== 2 || !hero.isCurrentToAct || state.street !== "preflop") return;
    const stackBB = bigBlind > 0 ? (hero.stack ?? 0) / bigBlind : 0;
    if (stackBB <= 0 || stackBB > SHORT_STACK_BB_THRESHOLD) return;
    const potBB = bigBlind > 0 ? state.potMainValue / bigBlind : state.potMainValue;
    if (potBB <= 0) return;
    const shove = evaluateShove(hero.holeCards, stackBB, potBB, { iterations: 2e3 });
    console.log(
      `[Poker AI Reader] PREFLOP push/fold check (${stackBB.toFixed(1)}BB effective): ${shove.isProfitable ? "SHOVE profitable" : "SHOVE not profitable"} (EV: ${shove.ev.toFixed(2)}BB, equity if called: ${(shove.equityIfCalled * 100).toFixed(1)}%, assumed fold equity: ${(shove.foldEquityUsed * 100).toFixed(0)}%)`
    );
  }
  async function requestRecommendation(packet, stateDescription) {
    try {
      const response = await fetch(RELAY_SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast", decisionPacket: packet })
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
  var lastStateJson = null;
  var lastRecommendationRequestKey = null;
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
          (s) => s.isOccupied && !s.isYou && !s.isFolded
        ).length;
        if (numOpponents >= 1) {
          const equityResult = calculateEquity(hero.holeCards, state.board, numOpponents, {
            iterations: 3e3
          });
          console.log(
            `[Poker AI Reader] Hero equity vs ${numOpponents} opponent(s): ${(equityResult.equity * 100).toFixed(1)}%`
          );
          const amountToCall = calculateAmountToCall(state);
          if (amountToCall > 0 && state.potMainValue > 0) {
            const potOdds = calculatePotOdds(state.potMainValue, amountToCall);
            console.log(
              `[Poker AI Reader] Amount to call: ${amountToCall}. Breakeven equity needed: ${potOdds.breakevenEquityPercent.toFixed(1)}%`
            );
          } else if (amountToCall === 0) {
            console.log("[Poker AI Reader] No bet facing hero (check or already matched) -- pot odds not applicable.");
          }
          if (hero.isCurrentToAct) {
            const requestKey = `${state.street}:${state.board.length}:${amountToCall}:${state.potMainValue}`;
            if (requestKey !== lastRecommendationRequestKey) {
              lastRecommendationRequestKey = requestKey;
              const bigBlind = extractBigBlind();
              const packet = buildDecisionPacket(state, amountToCall, equityResult.equity, bigBlind);
              console.log(`[Poker AI Reader] Big blind detected: ${bigBlind}. Hero stackBB: ${packet.hero.stackBB.toFixed(2)}. Facing amountBB: ${packet.facingAction.amountBB?.toFixed(2) ?? "n/a"}`);
              console.log(
                `[Poker AI Reader] It's hero's turn -- requesting AI recommendation for street=${state.street}, board=${JSON.stringify(state.board)}, potMainValue=${state.potMainValue}`
              );
              requestRecommendation(packet, `${state.street} | board: ${JSON.stringify(state.board)} | pot: ${state.potMainValue}`);
            }
          }
        }
      }
    }
  }, 1e3);
})();
