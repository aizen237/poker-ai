"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

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

  // ../../packages/browser-reader/dist/dataConfidence.js
  var EXPECTED_BOARD_COUNT = {
    preflop: 0,
    flop: 3,
    turn: 4,
    river: 5
  };
  function computeDataConfidence(state, context) {
    const criticalReasons = [];
    const uncertainReasons = [];
    const hero = state.seats.find((s) => s.isYou);
    if (!hero) {
      criticalReasons.push("hero seat not found in state");
    } else {
      if (hero.holeCards.length !== 2) {
        criticalReasons.push(`hero hole cards incomplete (${hero.holeCards.length}/2)`);
      }
      if (hero.stack === null || !Number.isFinite(hero.stack) || hero.stack < 0) {
        criticalReasons.push("hero stack missing or invalid");
      }
      if (hero.isFolded) {
        criticalReasons.push("hero has already folded -- no decision to make");
      }
      if (!hero.isCurrentToAct) {
        criticalReasons.push("it is not hero's turn -- unsafe to base a decision on this state");
      }
      if (hero.isOffline) {
        criticalReasons.push("hero is showing as offline");
      }
    }
    const expectedBoardCount = EXPECTED_BOARD_COUNT[state.street];
    if (state.board.length !== expectedBoardCount) {
      criticalReasons.push(`board card count (${state.board.length}) does not match street "${state.street}" (expected ${expectedBoardCount})`);
    }
    if (!Number.isFinite(state.potMainValue) || state.potMainValue < 0) {
      criticalReasons.push("pot value missing or invalid");
    }
    if (!Number.isFinite(context.amountToCall) || context.amountToCall < 0) {
      criticalReasons.push("amount-to-call is missing or invalid");
    }
    const activeOpponents = state.seats.filter((s) => s.isOccupied && !s.isYou && !s.isFolded);
    if (activeOpponents.length < 1) {
      criticalReasons.push("no active opponents remain -- hand is already decided");
    }
    if (context.bigBlindWasDefaulted) {
      criticalReasons.push("big blind could not be read from the table -- BB-based sizing is unreliable");
    }
    if (activeOpponents.some((s) => s.isOffline)) {
      uncertainReasons.push("at least one active opponent is showing as offline -- their state may be stale");
    }
    if (!context.isPositionKnown) {
      uncertainReasons.push("hero's real table position is not yet known (placeholder in use)");
    }
    if (criticalReasons.length > 0) {
      return { level: "low", reasons: criticalReasons };
    }
    if (uncertainReasons.length > 0) {
      return { level: "medium", reasons: uncertainReasons };
    }
    return { level: "high", reasons: [] };
  }

  // ../../packages/browser-reader/dist/actionHistory.js
  function emptyActionHistory() {
    return /* @__PURE__ */ new Map();
  }
  function highestActiveBet(state) {
    let highest = 0;
    for (const seat of state.seats) {
      if (seat.isOccupied && !seat.isFolded && seat.currentBet !== null && seat.currentBet > highest) {
        highest = seat.currentBet;
      }
    }
    return highest;
  }
  function isNewHand(previous, current) {
    const prevHero = previous.seats.find((s) => s.isYou);
    const currHero = current.seats.find((s) => s.isYou);
    const prevCards = prevHero?.holeCards ?? [];
    const currCards = currHero?.holeCards ?? [];
    if (prevCards.length !== currCards.length)
      return true;
    return prevCards.some((c, i) => c.rank !== currCards[i]?.rank || c.suit !== currCards[i]?.suit);
  }
  function updateActionHistory(history, previous, current) {
    if (!previous || isNewHand(previous, current)) {
      return emptyActionHistory();
    }
    const next = new Map(history);
    const previousHighestBet = highestActiveBet(previous);
    for (const seat of current.seats) {
      if (!seat.isOccupied || seat.isYou)
        continue;
      const prevSeat = previous.seats.find((s) => s.seatNumber === seat.seatNumber);
      if (!prevSeat || !prevSeat.isOccupied)
        continue;
      let action = null;
      if (!prevSeat.isFolded && seat.isFolded) {
        action = "fold";
      } else if (seat.currentBet !== null && seat.currentBet !== prevSeat.currentBet) {
        action = seat.currentBet > previousHighestBet ? "raise" : "call";
      }
      if (action) {
        const existing = next.get(seat.seatNumber) ?? [];
        next.set(seat.seatNumber, [...existing, { street: current.street, action }]);
      }
    }
    return next;
  }

  // ../../packages/browser-reader/dist/position.js
  function assignPositions(seats, dealerSeatNumber) {
    const occupied = seats.filter((s) => s.isOccupied).sort((a, b) => a.seatNumber - b.seatNumber);
    const positions = /* @__PURE__ */ new Map();
    if (occupied.length === 0)
      return positions;
    const dealerIndex = occupied.findIndex((s) => s.seatNumber === dealerSeatNumber);
    if (dealerIndex === -1) {
      return positions;
    }
    const clockwise = [...occupied.slice(dealerIndex), ...occupied.slice(0, dealerIndex)];
    const n = clockwise.length;
    clockwise.forEach((seat, i) => {
      let position;
      if (i === 0) {
        position = "BTN";
      } else if (n === 2) {
        position = "BB";
      } else if (i === 1) {
        position = "SB";
      } else if (i === 2) {
        position = "BB";
      } else if (i === n - 1) {
        position = "CO";
      } else if (i === n - 2 && n >= 6) {
        position = "HJ";
      } else {
        position = "UTG";
      }
      positions.set(seat.seatNumber, position);
    });
    return positions;
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
  function calculateCallEV(equity, currentPot, amountToCall) {
    if (equity < 0 || equity > 1)
      throw new Error(`equity must be between 0 and 1, got ${equity}`);
    if (amountToCall <= 0)
      throw new Error(`amountToCall must be positive, got ${amountToCall}`);
    const ev = equity * currentPot - (1 - equity) * amountToCall;
    return { ev };
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
  function calculateSPR(effectiveStack, currentPot) {
    if (currentPot <= 0)
      throw new Error(`currentPot must be positive to compute SPR, got ${currentPot}`);
    return effectiveStack / currentPot;
  }

  // ../../packages/poker-engine/dist/outs.js
  function calculateOuts(holeCards, board) {
    if (holeCards.length !== 2) {
      throw new Error(`calculateOuts requires exactly 2 hole cards, got ${holeCards.length}`);
    }
    if (board.length !== 3 && board.length !== 4) {
      throw new Error(`calculateOuts requires a 3-card (flop) or 4-card (turn) board, got ${board.length}`);
    }
    const known = [...holeCards, ...board];
    const knownIds = new Set(known.map((c) => `${c.rank}${c.suit}`));
    const unseenCards = fullDeck().filter((c) => !knownIds.has(`${c.rank}${c.suit}`));
    const currentCategory = evaluateBest(known).category;
    const outs = [];
    for (const candidate of unseenCards) {
      const nextBoard = [...board, candidate];
      const improvedCategory = evaluateBest([...holeCards, ...nextBoard]).category;
      if (improvedCategory > currentCategory) {
        outs.push(candidate);
      }
    }
    return { outs, count: outs.length };
  }

  // ../../packages/poker-engine/dist/boardTexture.js
  function classifySuitTexture(board) {
    const suitCounts = /* @__PURE__ */ new Map();
    for (const c of board) {
      suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1);
    }
    const counts = [...suitCounts.values()].sort((a, b) => b - a);
    if (counts[0] >= board.length)
      return "monotone";
    if (counts[0] >= 2)
      return "two_tone";
    return "rainbow";
  }
  function classifyPairTexture(board) {
    const rankCounts = /* @__PURE__ */ new Map();
    for (const c of board) {
      rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
    }
    const maxCount = Math.max(...rankCounts.values());
    if (maxCount >= 3)
      return "trips_plus";
    if (maxCount === 2)
      return "paired";
    return "unpaired";
  }
  function classifyConnectivity(board) {
    const ranks = [...new Set(board.map((c) => c.rank))].sort((a, b) => a - b);
    let closePairs = 0;
    for (let i = 0; i < ranks.length; i++) {
      for (let j = i + 1; j < ranks.length; j++) {
        if (ranks[j] - ranks[i] <= 4)
          closePairs++;
      }
    }
    if (closePairs === 0)
      return "disconnected";
    if (closePairs <= 2)
      return "somewhat_connected";
    return "highly_connected";
  }
  function classifyOverall(suitTexture, pairTexture, connectivity) {
    let wetnessScore = 0;
    if (suitTexture === "monotone")
      wetnessScore += 2;
    else if (suitTexture === "two_tone")
      wetnessScore += 1;
    if (connectivity === "highly_connected")
      wetnessScore += 2;
    else if (connectivity === "somewhat_connected")
      wetnessScore += 1;
    if (pairTexture !== "unpaired")
      wetnessScore -= 1;
    if (wetnessScore >= 3)
      return "wet";
    if (wetnessScore >= 1)
      return "semi_wet";
    return "dry";
  }
  function classifyBoardTexture(board) {
    if (board.length < 3 || board.length > 5) {
      throw new Error(`classifyBoardTexture requires a 3-5 card board, got ${board.length}`);
    }
    const suitTexture = classifySuitTexture(board);
    const pairTexture = classifyPairTexture(board);
    const connectivity = classifyConnectivity(board);
    const overall = classifyOverall(suitTexture, pairTexture, connectivity);
    return { suitTexture, pairTexture, connectivity, overall };
  }

  // ../../node_modules/zod/v3/external.js
  var external_exports = {};
  __export(external_exports, {
    BRAND: () => BRAND,
    DIRTY: () => DIRTY,
    EMPTY_PATH: () => EMPTY_PATH,
    INVALID: () => INVALID,
    NEVER: () => NEVER,
    OK: () => OK,
    ParseStatus: () => ParseStatus,
    Schema: () => ZodType,
    ZodAny: () => ZodAny,
    ZodArray: () => ZodArray,
    ZodBigInt: () => ZodBigInt,
    ZodBoolean: () => ZodBoolean,
    ZodBranded: () => ZodBranded,
    ZodCatch: () => ZodCatch,
    ZodDate: () => ZodDate,
    ZodDefault: () => ZodDefault,
    ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
    ZodEffects: () => ZodEffects,
    ZodEnum: () => ZodEnum,
    ZodError: () => ZodError,
    ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
    ZodFunction: () => ZodFunction,
    ZodIntersection: () => ZodIntersection,
    ZodIssueCode: () => ZodIssueCode,
    ZodLazy: () => ZodLazy,
    ZodLiteral: () => ZodLiteral,
    ZodMap: () => ZodMap,
    ZodNaN: () => ZodNaN,
    ZodNativeEnum: () => ZodNativeEnum,
    ZodNever: () => ZodNever,
    ZodNull: () => ZodNull,
    ZodNullable: () => ZodNullable,
    ZodNumber: () => ZodNumber,
    ZodObject: () => ZodObject,
    ZodOptional: () => ZodOptional,
    ZodParsedType: () => ZodParsedType,
    ZodPipeline: () => ZodPipeline,
    ZodPromise: () => ZodPromise,
    ZodReadonly: () => ZodReadonly,
    ZodRecord: () => ZodRecord,
    ZodSchema: () => ZodType,
    ZodSet: () => ZodSet,
    ZodString: () => ZodString,
    ZodSymbol: () => ZodSymbol,
    ZodTransformer: () => ZodEffects,
    ZodTuple: () => ZodTuple,
    ZodType: () => ZodType,
    ZodUndefined: () => ZodUndefined,
    ZodUnion: () => ZodUnion,
    ZodUnknown: () => ZodUnknown,
    ZodVoid: () => ZodVoid,
    addIssueToContext: () => addIssueToContext,
    any: () => anyType,
    array: () => arrayType,
    bigint: () => bigIntType,
    boolean: () => booleanType,
    coerce: () => coerce,
    custom: () => custom,
    date: () => dateType,
    datetimeRegex: () => datetimeRegex,
    defaultErrorMap: () => en_default,
    discriminatedUnion: () => discriminatedUnionType,
    effect: () => effectsType,
    enum: () => enumType,
    function: () => functionType,
    getErrorMap: () => getErrorMap,
    getParsedType: () => getParsedType,
    instanceof: () => instanceOfType,
    intersection: () => intersectionType,
    isAborted: () => isAborted,
    isAsync: () => isAsync,
    isDirty: () => isDirty,
    isValid: () => isValid,
    late: () => late,
    lazy: () => lazyType,
    literal: () => literalType,
    makeIssue: () => makeIssue,
    map: () => mapType,
    nan: () => nanType,
    nativeEnum: () => nativeEnumType,
    never: () => neverType,
    null: () => nullType,
    nullable: () => nullableType,
    number: () => numberType,
    object: () => objectType,
    objectUtil: () => objectUtil,
    oboolean: () => oboolean,
    onumber: () => onumber,
    optional: () => optionalType,
    ostring: () => ostring,
    pipeline: () => pipelineType,
    preprocess: () => preprocessType,
    promise: () => promiseType,
    quotelessJson: () => quotelessJson,
    record: () => recordType,
    set: () => setType,
    setErrorMap: () => setErrorMap,
    strictObject: () => strictObjectType,
    string: () => stringType,
    symbol: () => symbolType,
    transformer: () => effectsType,
    tuple: () => tupleType,
    undefined: () => undefinedType,
    union: () => unionType,
    unknown: () => unknownType,
    util: () => util,
    void: () => voidType
  });

  // ../../node_modules/zod/v3/helpers/util.js
  var util;
  (function(util2) {
    util2.assertEqual = (_) => {
    };
    function assertIs(_arg) {
    }
    util2.assertIs = assertIs;
    function assertNever(_x) {
      throw new Error();
    }
    util2.assertNever = assertNever;
    util2.arrayToEnum = (items) => {
      const obj = {};
      for (const item of items) {
        obj[item] = item;
      }
      return obj;
    };
    util2.getValidEnumValues = (obj) => {
      const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
      const filtered = {};
      for (const k of validKeys) {
        filtered[k] = obj[k];
      }
      return util2.objectValues(filtered);
    };
    util2.objectValues = (obj) => {
      return util2.objectKeys(obj).map(function(e) {
        return obj[e];
      });
    };
    util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
      const keys = [];
      for (const key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          keys.push(key);
        }
      }
      return keys;
    };
    util2.find = (arr, checker) => {
      for (const item of arr) {
        if (checker(item))
          return item;
      }
      return void 0;
    };
    util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
    function joinValues(array, separator = " | ") {
      return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
    }
    util2.joinValues = joinValues;
    util2.jsonStringifyReplacer = (_, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    };
  })(util || (util = {}));
  var objectUtil;
  (function(objectUtil2) {
    objectUtil2.mergeShapes = (first, second) => {
      return {
        ...first,
        ...second
        // second overwrites first
      };
    };
  })(objectUtil || (objectUtil = {}));
  var ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set"
  ]);
  var getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "undefined":
        return ZodParsedType.undefined;
      case "string":
        return ZodParsedType.string;
      case "number":
        return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
      case "boolean":
        return ZodParsedType.boolean;
      case "function":
        return ZodParsedType.function;
      case "bigint":
        return ZodParsedType.bigint;
      case "symbol":
        return ZodParsedType.symbol;
      case "object":
        if (Array.isArray(data)) {
          return ZodParsedType.array;
        }
        if (data === null) {
          return ZodParsedType.null;
        }
        if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
          return ZodParsedType.promise;
        }
        if (typeof Map !== "undefined" && data instanceof Map) {
          return ZodParsedType.map;
        }
        if (typeof Set !== "undefined" && data instanceof Set) {
          return ZodParsedType.set;
        }
        if (typeof Date !== "undefined" && data instanceof Date) {
          return ZodParsedType.date;
        }
        return ZodParsedType.object;
      default:
        return ZodParsedType.unknown;
    }
  };

  // ../../node_modules/zod/v3/ZodError.js
  var ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite"
  ]);
  var quotelessJson = (obj) => {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(/"([^"]+)":/g, "$1:");
  };
  var ZodError = class _ZodError extends Error {
    get errors() {
      return this.issues;
    }
    constructor(issues) {
      super();
      this.issues = [];
      this.addIssue = (sub) => {
        this.issues = [...this.issues, sub];
      };
      this.addIssues = (subs = []) => {
        this.issues = [...this.issues, ...subs];
      };
      const actualProto = new.target.prototype;
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(this, actualProto);
      } else {
        this.__proto__ = actualProto;
      }
      this.name = "ZodError";
      this.issues = issues;
    }
    format(_mapper) {
      const mapper = _mapper || function(issue) {
        return issue.message;
      };
      const fieldErrors = { _errors: [] };
      const processError = (error) => {
        for (const issue of error.issues) {
          if (issue.code === "invalid_union") {
            issue.unionErrors.map(processError);
          } else if (issue.code === "invalid_return_type") {
            processError(issue.returnTypeError);
          } else if (issue.code === "invalid_arguments") {
            processError(issue.argumentsError);
          } else if (issue.path.length === 0) {
            fieldErrors._errors.push(mapper(issue));
          } else {
            let curr = fieldErrors;
            let i = 0;
            while (i < issue.path.length) {
              const el = issue.path[i];
              const terminal = i === issue.path.length - 1;
              if (!terminal) {
                curr[el] = curr[el] || { _errors: [] };
              } else {
                curr[el] = curr[el] || { _errors: [] };
                curr[el]._errors.push(mapper(issue));
              }
              curr = curr[el];
              i++;
            }
          }
        }
      };
      processError(this);
      return fieldErrors;
    }
    static assert(value) {
      if (!(value instanceof _ZodError)) {
        throw new Error(`Not a ZodError: ${value}`);
      }
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(mapper = (issue) => issue.message) {
      const fieldErrors = {};
      const formErrors = [];
      for (const sub of this.issues) {
        if (sub.path.length > 0) {
          const firstEl = sub.path[0];
          fieldErrors[firstEl] = fieldErrors[firstEl] || [];
          fieldErrors[firstEl].push(mapper(sub));
        } else {
          formErrors.push(mapper(sub));
        }
      }
      return { formErrors, fieldErrors };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  ZodError.create = (issues) => {
    const error = new ZodError(issues);
    return error;
  };

  // ../../node_modules/zod/v3/locales/en.js
  var errorMap = (issue, _ctx) => {
    let message;
    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        if (issue.received === ZodParsedType.undefined) {
          message = "Required";
        } else {
          message = `Expected ${issue.expected}, received ${issue.received}`;
        }
        break;
      case ZodIssueCode.invalid_literal:
        message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
        break;
      case ZodIssueCode.unrecognized_keys:
        message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
        break;
      case ZodIssueCode.invalid_union:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_union_discriminator:
        message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
        break;
      case ZodIssueCode.invalid_enum_value:
        message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
        break;
      case ZodIssueCode.invalid_arguments:
        message = `Invalid function arguments`;
        break;
      case ZodIssueCode.invalid_return_type:
        message = `Invalid function return type`;
        break;
      case ZodIssueCode.invalid_date:
        message = `Invalid date`;
        break;
      case ZodIssueCode.invalid_string:
        if (typeof issue.validation === "object") {
          if ("includes" in issue.validation) {
            message = `Invalid input: must include "${issue.validation.includes}"`;
            if (typeof issue.validation.position === "number") {
              message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
            }
          } else if ("startsWith" in issue.validation) {
            message = `Invalid input: must start with "${issue.validation.startsWith}"`;
          } else if ("endsWith" in issue.validation) {
            message = `Invalid input: must end with "${issue.validation.endsWith}"`;
          } else {
            util.assertNever(issue.validation);
          }
        } else if (issue.validation !== "regex") {
          message = `Invalid ${issue.validation}`;
        } else {
          message = "Invalid";
        }
        break;
      case ZodIssueCode.too_small:
        if (issue.type === "array")
          message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
        else if (issue.type === "string")
          message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
        else if (issue.type === "number")
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
        else if (issue.type === "bigint")
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
        else if (issue.type === "date")
          message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.too_big:
        if (issue.type === "array")
          message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
        else if (issue.type === "string")
          message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
        else if (issue.type === "number")
          message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
        else if (issue.type === "bigint")
          message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
        else if (issue.type === "date")
          message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.custom:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_intersection_types:
        message = `Intersection results could not be merged`;
        break;
      case ZodIssueCode.not_multiple_of:
        message = `Number must be a multiple of ${issue.multipleOf}`;
        break;
      case ZodIssueCode.not_finite:
        message = "Number must be finite";
        break;
      default:
        message = _ctx.defaultError;
        util.assertNever(issue);
    }
    return { message };
  };
  var en_default = errorMap;

  // ../../node_modules/zod/v3/errors.js
  var overrideErrorMap = en_default;
  function setErrorMap(map) {
    overrideErrorMap = map;
  }
  function getErrorMap() {
    return overrideErrorMap;
  }

  // ../../node_modules/zod/v3/helpers/parseUtil.js
  var makeIssue = (params) => {
    const { data, path, errorMaps, issueData } = params;
    const fullPath = [...path, ...issueData.path || []];
    const fullIssue = {
      ...issueData,
      path: fullPath
    };
    if (issueData.message !== void 0) {
      return {
        ...issueData,
        path: fullPath,
        message: issueData.message
      };
    }
    let errorMessage = "";
    const maps = errorMaps.filter((m) => !!m).slice().reverse();
    for (const map of maps) {
      errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
    }
    return {
      ...issueData,
      path: fullPath,
      message: errorMessage
    };
  };
  var EMPTY_PATH = [];
  function addIssueToContext(ctx, issueData) {
    const overrideMap = getErrorMap();
    const issue = makeIssue({
      issueData,
      data: ctx.data,
      path: ctx.path,
      errorMaps: [
        ctx.common.contextualErrorMap,
        // contextual error map is first priority
        ctx.schemaErrorMap,
        // then schema-bound map if available
        overrideMap,
        // then global override map
        overrideMap === en_default ? void 0 : en_default
        // then global default map
      ].filter((x) => !!x)
    });
    ctx.common.issues.push(issue);
  }
  var ParseStatus = class _ParseStatus {
    constructor() {
      this.value = "valid";
    }
    dirty() {
      if (this.value === "valid")
        this.value = "dirty";
    }
    abort() {
      if (this.value !== "aborted")
        this.value = "aborted";
    }
    static mergeArray(status, results) {
      const arrayValue = [];
      for (const s of results) {
        if (s.status === "aborted")
          return INVALID;
        if (s.status === "dirty")
          status.dirty();
        arrayValue.push(s.value);
      }
      return { status: status.value, value: arrayValue };
    }
    static async mergeObjectAsync(status, pairs) {
      const syncPairs = [];
      for (const pair of pairs) {
        const key = await pair.key;
        const value = await pair.value;
        syncPairs.push({
          key,
          value
        });
      }
      return _ParseStatus.mergeObjectSync(status, syncPairs);
    }
    static mergeObjectSync(status, pairs) {
      const finalObject = {};
      for (const pair of pairs) {
        const { key, value } = pair;
        if (key.status === "aborted")
          return INVALID;
        if (value.status === "aborted")
          return INVALID;
        if (key.status === "dirty")
          status.dirty();
        if (value.status === "dirty")
          status.dirty();
        if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
          finalObject[key.value] = value.value;
        }
      }
      return { status: status.value, value: finalObject };
    }
  };
  var INVALID = Object.freeze({
    status: "aborted"
  });
  var DIRTY = (value) => ({ status: "dirty", value });
  var OK = (value) => ({ status: "valid", value });
  var isAborted = (x) => x.status === "aborted";
  var isDirty = (x) => x.status === "dirty";
  var isValid = (x) => x.status === "valid";
  var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

  // ../../node_modules/zod/v3/helpers/errorUtil.js
  var errorUtil;
  (function(errorUtil2) {
    errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
  })(errorUtil || (errorUtil = {}));

  // ../../node_modules/zod/v3/types.js
  var ParseInputLazyPath = class {
    constructor(parent, value, path, key) {
      this._cachedPath = [];
      this.parent = parent;
      this.data = value;
      this._path = path;
      this._key = key;
    }
    get path() {
      if (!this._cachedPath.length) {
        if (Array.isArray(this._key)) {
          this._cachedPath.push(...this._path, ...this._key);
        } else {
          this._cachedPath.push(...this._path, this._key);
        }
      }
      return this._cachedPath;
    }
  };
  var handleResult = (ctx, result) => {
    if (isValid(result)) {
      return { success: true, data: result.value };
    } else {
      if (!ctx.common.issues.length) {
        throw new Error("Validation failed but no issues detected.");
      }
      return {
        success: false,
        get error() {
          if (this._error)
            return this._error;
          const error = new ZodError(ctx.common.issues);
          this._error = error;
          return this._error;
        }
      };
    }
  };
  function processCreateParams(params) {
    if (!params)
      return {};
    const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
    if (errorMap2 && (invalid_type_error || required_error)) {
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    }
    if (errorMap2)
      return { errorMap: errorMap2, description };
    const customMap = (iss, ctx) => {
      const { message } = params;
      if (iss.code === "invalid_enum_value") {
        return { message: message ?? ctx.defaultError };
      }
      if (typeof ctx.data === "undefined") {
        return { message: message ?? required_error ?? ctx.defaultError };
      }
      if (iss.code !== "invalid_type")
        return { message: ctx.defaultError };
      return { message: message ?? invalid_type_error ?? ctx.defaultError };
    };
    return { errorMap: customMap, description };
  }
  var ZodType = class {
    get description() {
      return this._def.description;
    }
    _getType(input) {
      return getParsedType(input.data);
    }
    _getOrReturnCtx(input, ctx) {
      return ctx || {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      };
    }
    _processInputParams(input) {
      return {
        status: new ParseStatus(),
        ctx: {
          common: input.parent.common,
          data: input.data,
          parsedType: getParsedType(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        }
      };
    }
    _parseSync(input) {
      const result = this._parse(input);
      if (isAsync(result)) {
        throw new Error("Synchronous parse encountered promise.");
      }
      return result;
    }
    _parseAsync(input) {
      const result = this._parse(input);
      return Promise.resolve(result);
    }
    parse(data, params) {
      const result = this.safeParse(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    safeParse(data, params) {
      const ctx = {
        common: {
          issues: [],
          async: params?.async ?? false,
          contextualErrorMap: params?.errorMap
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const result = this._parseSync({ data, path: ctx.path, parent: ctx });
      return handleResult(ctx, result);
    }
    "~validate"(data) {
      const ctx = {
        common: {
          issues: [],
          async: !!this["~standard"].async
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      if (!this["~standard"].async) {
        try {
          const result = this._parseSync({ data, path: [], parent: ctx });
          return isValid(result) ? {
            value: result.value
          } : {
            issues: ctx.common.issues
          };
        } catch (err) {
          if (err?.message?.toLowerCase()?.includes("encountered")) {
            this["~standard"].async = true;
          }
          ctx.common = {
            issues: [],
            async: true
          };
        }
      }
      return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
        value: result.value
      } : {
        issues: ctx.common.issues
      });
    }
    async parseAsync(data, params) {
      const result = await this.safeParseAsync(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    async safeParseAsync(data, params) {
      const ctx = {
        common: {
          issues: [],
          contextualErrorMap: params?.errorMap,
          async: true
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
      const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
      return handleResult(ctx, result);
    }
    refine(check, message) {
      const getIssueProperties = (val) => {
        if (typeof message === "string" || typeof message === "undefined") {
          return { message };
        } else if (typeof message === "function") {
          return message(val);
        } else {
          return message;
        }
      };
      return this._refinement((val, ctx) => {
        const result = check(val);
        const setError = () => ctx.addIssue({
          code: ZodIssueCode.custom,
          ...getIssueProperties(val)
        });
        if (typeof Promise !== "undefined" && result instanceof Promise) {
          return result.then((data) => {
            if (!data) {
              setError();
              return false;
            } else {
              return true;
            }
          });
        }
        if (!result) {
          setError();
          return false;
        } else {
          return true;
        }
      });
    }
    refinement(check, refinementData) {
      return this._refinement((val, ctx) => {
        if (!check(val)) {
          ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
          return false;
        } else {
          return true;
        }
      });
    }
    _refinement(refinement) {
      return new ZodEffects({
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "refinement", refinement }
      });
    }
    superRefine(refinement) {
      return this._refinement(refinement);
    }
    constructor(def) {
      this.spa = this.safeParseAsync;
      this._def = def;
      this.parse = this.parse.bind(this);
      this.safeParse = this.safeParse.bind(this);
      this.parseAsync = this.parseAsync.bind(this);
      this.safeParseAsync = this.safeParseAsync.bind(this);
      this.spa = this.spa.bind(this);
      this.refine = this.refine.bind(this);
      this.refinement = this.refinement.bind(this);
      this.superRefine = this.superRefine.bind(this);
      this.optional = this.optional.bind(this);
      this.nullable = this.nullable.bind(this);
      this.nullish = this.nullish.bind(this);
      this.array = this.array.bind(this);
      this.promise = this.promise.bind(this);
      this.or = this.or.bind(this);
      this.and = this.and.bind(this);
      this.transform = this.transform.bind(this);
      this.brand = this.brand.bind(this);
      this.default = this.default.bind(this);
      this.catch = this.catch.bind(this);
      this.describe = this.describe.bind(this);
      this.pipe = this.pipe.bind(this);
      this.readonly = this.readonly.bind(this);
      this.isNullable = this.isNullable.bind(this);
      this.isOptional = this.isOptional.bind(this);
      this["~standard"] = {
        version: 1,
        vendor: "zod",
        validate: (data) => this["~validate"](data)
      };
    }
    optional() {
      return ZodOptional.create(this, this._def);
    }
    nullable() {
      return ZodNullable.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return ZodArray.create(this);
    }
    promise() {
      return ZodPromise.create(this, this._def);
    }
    or(option) {
      return ZodUnion.create([this, option], this._def);
    }
    and(incoming) {
      return ZodIntersection.create(this, incoming, this._def);
    }
    transform(transform) {
      return new ZodEffects({
        ...processCreateParams(this._def),
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "transform", transform }
      });
    }
    default(def) {
      const defaultValueFunc = typeof def === "function" ? def : () => def;
      return new ZodDefault({
        ...processCreateParams(this._def),
        innerType: this,
        defaultValue: defaultValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodDefault
      });
    }
    brand() {
      return new ZodBranded({
        typeName: ZodFirstPartyTypeKind.ZodBranded,
        type: this,
        ...processCreateParams(this._def)
      });
    }
    catch(def) {
      const catchValueFunc = typeof def === "function" ? def : () => def;
      return new ZodCatch({
        ...processCreateParams(this._def),
        innerType: this,
        catchValue: catchValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodCatch
      });
    }
    describe(description) {
      const This = this.constructor;
      return new This({
        ...this._def,
        description
      });
    }
    pipe(target) {
      return ZodPipeline.create(this, target);
    }
    readonly() {
      return ZodReadonly.create(this);
    }
    isOptional() {
      return this.safeParse(void 0).success;
    }
    isNullable() {
      return this.safeParse(null).success;
    }
  };
  var cuidRegex = /^c[^\s-]{8,}$/i;
  var cuid2Regex = /^[0-9a-z]+$/;
  var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
  var nanoidRegex = /^[a-z0-9_-]{21}$/i;
  var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
  var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
  var emojiRegex;
  var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
  var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
  var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
  var dateRegex = new RegExp(`^${dateRegexSource}$`);
  function timeRegexSource(args) {
    let secondsRegexSource = `[0-5]\\d`;
    if (args.precision) {
      secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
    } else if (args.precision == null) {
      secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
    }
    const secondsQuantifier = args.precision ? "+" : "?";
    return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
  }
  function timeRegex(args) {
    return new RegExp(`^${timeRegexSource(args)}$`);
  }
  function datetimeRegex(args) {
    let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
    const opts = [];
    opts.push(args.local ? `Z?` : `Z`);
    if (args.offset)
      opts.push(`([+-]\\d{2}:?\\d{2})`);
    regex = `${regex}(${opts.join("|")})`;
    return new RegExp(`^${regex}$`);
  }
  function isValidIP(ip, version) {
    if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
      return true;
    }
    if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
      return true;
    }
    return false;
  }
  function isValidJWT(jwt, alg) {
    if (!jwtRegex.test(jwt))
      return false;
    try {
      const [header] = jwt.split(".");
      if (!header)
        return false;
      const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
      const decoded = JSON.parse(atob(base64));
      if (typeof decoded !== "object" || decoded === null)
        return false;
      if ("typ" in decoded && decoded?.typ !== "JWT")
        return false;
      if (!decoded.alg)
        return false;
      if (alg && decoded.alg !== alg)
        return false;
      return true;
    } catch {
      return false;
    }
  }
  function isValidCidr(ip, version) {
    if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
      return true;
    }
    if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
      return true;
    }
    return false;
  }
  var ZodString = class _ZodString extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = String(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.string) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.string,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.length < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.length > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "length") {
          const tooBig = input.data.length > check.value;
          const tooSmall = input.data.length < check.value;
          if (tooBig || tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            if (tooBig) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            } else if (tooSmall) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            }
            status.dirty();
          }
        } else if (check.kind === "email") {
          if (!emailRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "email",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "emoji") {
          if (!emojiRegex) {
            emojiRegex = new RegExp(_emojiRegex, "u");
          }
          if (!emojiRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "emoji",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "uuid") {
          if (!uuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "uuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "nanoid") {
          if (!nanoidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "nanoid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid") {
          if (!cuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid2") {
          if (!cuid2Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid2",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ulid") {
          if (!ulidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ulid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "url") {
          try {
            new URL(input.data);
          } catch {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "regex") {
          check.regex.lastIndex = 0;
          const testResult = check.regex.test(input.data);
          if (!testResult) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "regex",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "trim") {
          input.data = input.data.trim();
        } else if (check.kind === "includes") {
          if (!input.data.includes(check.value, check.position)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { includes: check.value, position: check.position },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "toLowerCase") {
          input.data = input.data.toLowerCase();
        } else if (check.kind === "toUpperCase") {
          input.data = input.data.toUpperCase();
        } else if (check.kind === "startsWith") {
          if (!input.data.startsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { startsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "endsWith") {
          if (!input.data.endsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { endsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "datetime") {
          const regex = datetimeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "datetime",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "date") {
          const regex = dateRegex;
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "date",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "time") {
          const regex = timeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "time",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "duration") {
          if (!durationRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "duration",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ip") {
          if (!isValidIP(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ip",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "jwt") {
          if (!isValidJWT(input.data, check.alg)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "jwt",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cidr") {
          if (!isValidCidr(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cidr",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64") {
          if (!base64Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64url") {
          if (!base64urlRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _regex(regex, validation, message) {
      return this.refinement((data) => regex.test(data), {
        validation,
        code: ZodIssueCode.invalid_string,
        ...errorUtil.errToObj(message)
      });
    }
    _addCheck(check) {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    email(message) {
      return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
      return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
      return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
      return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
      return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
      return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
      return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
      return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
      return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    base64url(message) {
      return this._addCheck({
        kind: "base64url",
        ...errorUtil.errToObj(message)
      });
    }
    jwt(options) {
      return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
    }
    ip(options) {
      return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    cidr(options) {
      return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "datetime",
          precision: null,
          offset: false,
          local: false,
          message: options
        });
      }
      return this._addCheck({
        kind: "datetime",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        offset: options?.offset ?? false,
        local: options?.local ?? false,
        ...errorUtil.errToObj(options?.message)
      });
    }
    date(message) {
      return this._addCheck({ kind: "date", message });
    }
    time(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "time",
          precision: null,
          message: options
        });
      }
      return this._addCheck({
        kind: "time",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        ...errorUtil.errToObj(options?.message)
      });
    }
    duration(message) {
      return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
      return this._addCheck({
        kind: "regex",
        regex,
        ...errorUtil.errToObj(message)
      });
    }
    includes(value, options) {
      return this._addCheck({
        kind: "includes",
        value,
        position: options?.position,
        ...errorUtil.errToObj(options?.message)
      });
    }
    startsWith(value, message) {
      return this._addCheck({
        kind: "startsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    endsWith(value, message) {
      return this._addCheck({
        kind: "endsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    min(minLength, message) {
      return this._addCheck({
        kind: "min",
        value: minLength,
        ...errorUtil.errToObj(message)
      });
    }
    max(maxLength, message) {
      return this._addCheck({
        kind: "max",
        value: maxLength,
        ...errorUtil.errToObj(message)
      });
    }
    length(len, message) {
      return this._addCheck({
        kind: "length",
        value: len,
        ...errorUtil.errToObj(message)
      });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(message) {
      return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxLength() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodString.create = (params) => {
    return new ZodString({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodString,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepDecCount = (step.toString().split(".")[1] || "").length;
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  var ZodNumber = class _ZodNumber extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
      this.step = this.multipleOf;
    }
    _parse(input) {
      if (this._def.coerce) {
        input.data = Number(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.number) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.number,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check of this._def.checks) {
        if (check.kind === "int") {
          if (!util.isInteger(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_type,
              expected: "integer",
              received: "float",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (floatSafeRemainder(input.data, check.value) !== 0) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "finite") {
          if (!Number.isFinite(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_finite,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodNumber({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodNumber({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    int(message) {
      return this._addCheck({
        kind: "int",
        message: errorUtil.toString(message)
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    finite(message) {
      return this._addCheck({
        kind: "finite",
        message: errorUtil.toString(message)
      });
    }
    safe(message) {
      return this._addCheck({
        kind: "min",
        inclusive: true,
        value: Number.MIN_SAFE_INTEGER,
        message: errorUtil.toString(message)
      })._addCheck({
        kind: "max",
        inclusive: true,
        value: Number.MAX_SAFE_INTEGER,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
    get isInt() {
      return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
    }
    get isFinite() {
      let max = null;
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
          return true;
        } else if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        } else if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return Number.isFinite(min) && Number.isFinite(max);
    }
  };
  ZodNumber.create = (params) => {
    return new ZodNumber({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodNumber,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  var ZodBigInt = class _ZodBigInt extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
    }
    _parse(input) {
      if (this._def.coerce) {
        try {
          input.data = BigInt(input.data);
        } catch {
          return this._getInvalidInput(input);
        }
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.bigint) {
        return this._getInvalidInput(input);
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              type: "bigint",
              minimum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              type: "bigint",
              maximum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (input.data % check.value !== BigInt(0)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _getInvalidInput(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx.parsedType
      });
      return INVALID;
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodBigInt({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodBigInt({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodBigInt.create = (params) => {
    return new ZodBigInt({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodBigInt,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  var ZodBoolean = class extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = Boolean(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.boolean) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.boolean,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodBoolean.create = (params) => {
    return new ZodBoolean({
      typeName: ZodFirstPartyTypeKind.ZodBoolean,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  var ZodDate = class _ZodDate extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = new Date(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.date) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.date,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      if (Number.isNaN(input.data.getTime())) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_date
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.getTime() < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              message: check.message,
              inclusive: true,
              exact: false,
              minimum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.getTime() > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              message: check.message,
              inclusive: true,
              exact: false,
              maximum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return {
        status: status.value,
        value: new Date(input.data.getTime())
      };
    }
    _addCheck(check) {
      return new _ZodDate({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    min(minDate, message) {
      return this._addCheck({
        kind: "min",
        value: minDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    max(maxDate, message) {
      return this._addCheck({
        kind: "max",
        value: maxDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    get minDate() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min != null ? new Date(min) : null;
    }
    get maxDate() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max != null ? new Date(max) : null;
    }
  };
  ZodDate.create = (params) => {
    return new ZodDate({
      checks: [],
      coerce: params?.coerce || false,
      typeName: ZodFirstPartyTypeKind.ZodDate,
      ...processCreateParams(params)
    });
  };
  var ZodSymbol = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.symbol) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.symbol,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodSymbol.create = (params) => {
    return new ZodSymbol({
      typeName: ZodFirstPartyTypeKind.ZodSymbol,
      ...processCreateParams(params)
    });
  };
  var ZodUndefined = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.undefined,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodUndefined.create = (params) => {
    return new ZodUndefined({
      typeName: ZodFirstPartyTypeKind.ZodUndefined,
      ...processCreateParams(params)
    });
  };
  var ZodNull = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.null) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.null,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodNull.create = (params) => {
    return new ZodNull({
      typeName: ZodFirstPartyTypeKind.ZodNull,
      ...processCreateParams(params)
    });
  };
  var ZodAny = class extends ZodType {
    constructor() {
      super(...arguments);
      this._any = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodAny.create = (params) => {
    return new ZodAny({
      typeName: ZodFirstPartyTypeKind.ZodAny,
      ...processCreateParams(params)
    });
  };
  var ZodUnknown = class extends ZodType {
    constructor() {
      super(...arguments);
      this._unknown = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodUnknown.create = (params) => {
    return new ZodUnknown({
      typeName: ZodFirstPartyTypeKind.ZodUnknown,
      ...processCreateParams(params)
    });
  };
  var ZodNever = class extends ZodType {
    _parse(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.never,
        received: ctx.parsedType
      });
      return INVALID;
    }
  };
  ZodNever.create = (params) => {
    return new ZodNever({
      typeName: ZodFirstPartyTypeKind.ZodNever,
      ...processCreateParams(params)
    });
  };
  var ZodVoid = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.void,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodVoid.create = (params) => {
    return new ZodVoid({
      typeName: ZodFirstPartyTypeKind.ZodVoid,
      ...processCreateParams(params)
    });
  };
  var ZodArray = class _ZodArray extends ZodType {
    _parse(input) {
      const { ctx, status } = this._processInputParams(input);
      const def = this._def;
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (def.exactLength !== null) {
        const tooBig = ctx.data.length > def.exactLength.value;
        const tooSmall = ctx.data.length < def.exactLength.value;
        if (tooBig || tooSmall) {
          addIssueToContext(ctx, {
            code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
            minimum: tooSmall ? def.exactLength.value : void 0,
            maximum: tooBig ? def.exactLength.value : void 0,
            type: "array",
            inclusive: true,
            exact: true,
            message: def.exactLength.message
          });
          status.dirty();
        }
      }
      if (def.minLength !== null) {
        if (ctx.data.length < def.minLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.minLength.message
          });
          status.dirty();
        }
      }
      if (def.maxLength !== null) {
        if (ctx.data.length > def.maxLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.maxLength.message
          });
          status.dirty();
        }
      }
      if (ctx.common.async) {
        return Promise.all([...ctx.data].map((item, i) => {
          return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        })).then((result2) => {
          return ParseStatus.mergeArray(status, result2);
        });
      }
      const result = [...ctx.data].map((item, i) => {
        return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      });
      return ParseStatus.mergeArray(status, result);
    }
    get element() {
      return this._def.type;
    }
    min(minLength, message) {
      return new _ZodArray({
        ...this._def,
        minLength: { value: minLength, message: errorUtil.toString(message) }
      });
    }
    max(maxLength, message) {
      return new _ZodArray({
        ...this._def,
        maxLength: { value: maxLength, message: errorUtil.toString(message) }
      });
    }
    length(len, message) {
      return new _ZodArray({
        ...this._def,
        exactLength: { value: len, message: errorUtil.toString(message) }
      });
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodArray.create = (schema, params) => {
    return new ZodArray({
      type: schema,
      minLength: null,
      maxLength: null,
      exactLength: null,
      typeName: ZodFirstPartyTypeKind.ZodArray,
      ...processCreateParams(params)
    });
  };
  function deepPartialify(schema) {
    if (schema instanceof ZodObject) {
      const newShape = {};
      for (const key in schema.shape) {
        const fieldSchema = schema.shape[key];
        newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
      }
      return new ZodObject({
        ...schema._def,
        shape: () => newShape
      });
    } else if (schema instanceof ZodArray) {
      return new ZodArray({
        ...schema._def,
        type: deepPartialify(schema.element)
      });
    } else if (schema instanceof ZodOptional) {
      return ZodOptional.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodNullable) {
      return ZodNullable.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodTuple) {
      return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
    } else {
      return schema;
    }
  }
  var ZodObject = class _ZodObject extends ZodType {
    constructor() {
      super(...arguments);
      this._cached = null;
      this.nonstrict = this.passthrough;
      this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      const shape = this._def.shape();
      const keys = util.objectKeys(shape);
      this._cached = { shape, keys };
      return this._cached;
    }
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.object) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const { status, ctx } = this._processInputParams(input);
      const { shape, keys: shapeKeys } = this._getCached();
      const extraKeys = [];
      if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
        for (const key in ctx.data) {
          if (!shapeKeys.includes(key)) {
            extraKeys.push(key);
          }
        }
      }
      const pairs = [];
      for (const key of shapeKeys) {
        const keyValidator = shape[key];
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (this._def.catchall instanceof ZodNever) {
        const unknownKeys = this._def.unknownKeys;
        if (unknownKeys === "passthrough") {
          for (const key of extraKeys) {
            pairs.push({
              key: { status: "valid", value: key },
              value: { status: "valid", value: ctx.data[key] }
            });
          }
        } else if (unknownKeys === "strict") {
          if (extraKeys.length > 0) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.unrecognized_keys,
              keys: extraKeys
            });
            status.dirty();
          }
        } else if (unknownKeys === "strip") {
        } else {
          throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
        }
      } else {
        const catchall = this._def.catchall;
        for (const key of extraKeys) {
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: catchall._parse(
              new ParseInputLazyPath(ctx, value, ctx.path, key)
              //, ctx.child(key), value, getParsedType(value)
            ),
            alwaysSet: key in ctx.data
          });
        }
      }
      if (ctx.common.async) {
        return Promise.resolve().then(async () => {
          const syncPairs = [];
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
              key,
              value,
              alwaysSet: pair.alwaysSet
            });
          }
          return syncPairs;
        }).then((syncPairs) => {
          return ParseStatus.mergeObjectSync(status, syncPairs);
        });
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get shape() {
      return this._def.shape();
    }
    strict(message) {
      errorUtil.errToObj;
      return new _ZodObject({
        ...this._def,
        unknownKeys: "strict",
        ...message !== void 0 ? {
          errorMap: (issue, ctx) => {
            const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
            if (issue.code === "unrecognized_keys")
              return {
                message: errorUtil.errToObj(message).message ?? defaultError
              };
            return {
              message: defaultError
            };
          }
        } : {}
      });
    }
    strip() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "passthrough"
      });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(augmentation) {
      return new _ZodObject({
        ...this._def,
        shape: () => ({
          ...this._def.shape(),
          ...augmentation
        })
      });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(merging) {
      const merged = new _ZodObject({
        unknownKeys: merging._def.unknownKeys,
        catchall: merging._def.catchall,
        shape: () => ({
          ...this._def.shape(),
          ...merging._def.shape()
        }),
        typeName: ZodFirstPartyTypeKind.ZodObject
      });
      return merged;
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(key, schema) {
      return this.augment({ [key]: schema });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(index) {
      return new _ZodObject({
        ...this._def,
        catchall: index
      });
    }
    pick(mask) {
      const shape = {};
      for (const key of util.objectKeys(mask)) {
        if (mask[key] && this.shape[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    omit(mask) {
      const shape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (!mask[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    /**
     * @deprecated
     */
    deepPartial() {
      return deepPartialify(this);
    }
    partial(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        const fieldSchema = this.shape[key];
        if (mask && !mask[key]) {
          newShape[key] = fieldSchema;
        } else {
          newShape[key] = fieldSchema.optional();
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    required(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (mask && !mask[key]) {
          newShape[key] = this.shape[key];
        } else {
          const fieldSchema = this.shape[key];
          let newField = fieldSchema;
          while (newField instanceof ZodOptional) {
            newField = newField._def.innerType;
          }
          newShape[key] = newField;
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    keyof() {
      return createZodEnum(util.objectKeys(this.shape));
    }
  };
  ZodObject.create = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strict",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
      shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  var ZodUnion = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const options = this._def.options;
      function handleResults(results) {
        for (const result of results) {
          if (result.result.status === "valid") {
            return result.result;
          }
        }
        for (const result of results) {
          if (result.result.status === "dirty") {
            ctx.common.issues.push(...result.ctx.common.issues);
            return result.result;
          }
        }
        const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return Promise.all(options.map(async (option) => {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          return {
            result: await option._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            }),
            ctx: childCtx
          };
        })).then(handleResults);
      } else {
        let dirty = void 0;
        const issues = [];
        for (const option of options) {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          const result = option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          });
          if (result.status === "valid") {
            return result;
          } else if (result.status === "dirty" && !dirty) {
            dirty = { result, ctx: childCtx };
          }
          if (childCtx.common.issues.length) {
            issues.push(childCtx.common.issues);
          }
        }
        if (dirty) {
          ctx.common.issues.push(...dirty.ctx.common.issues);
          return dirty.result;
        }
        const unionErrors = issues.map((issues2) => new ZodError(issues2));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  ZodUnion.create = (types, params) => {
    return new ZodUnion({
      options: types,
      typeName: ZodFirstPartyTypeKind.ZodUnion,
      ...processCreateParams(params)
    });
  };
  var getDiscriminator = (type) => {
    if (type instanceof ZodLazy) {
      return getDiscriminator(type.schema);
    } else if (type instanceof ZodEffects) {
      return getDiscriminator(type.innerType());
    } else if (type instanceof ZodLiteral) {
      return [type.value];
    } else if (type instanceof ZodEnum) {
      return type.options;
    } else if (type instanceof ZodNativeEnum) {
      return util.objectValues(type.enum);
    } else if (type instanceof ZodDefault) {
      return getDiscriminator(type._def.innerType);
    } else if (type instanceof ZodUndefined) {
      return [void 0];
    } else if (type instanceof ZodNull) {
      return [null];
    } else if (type instanceof ZodOptional) {
      return [void 0, ...getDiscriminator(type.unwrap())];
    } else if (type instanceof ZodNullable) {
      return [null, ...getDiscriminator(type.unwrap())];
    } else if (type instanceof ZodBranded) {
      return getDiscriminator(type.unwrap());
    } else if (type instanceof ZodReadonly) {
      return getDiscriminator(type.unwrap());
    } else if (type instanceof ZodCatch) {
      return getDiscriminator(type._def.innerType);
    } else {
      return [];
    }
  };
  var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const discriminator = this.discriminator;
      const discriminatorValue = ctx.data[discriminator];
      const option = this.optionsMap.get(discriminatorValue);
      if (!option) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [discriminator]
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return option._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      } else {
        return option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      }
    }
    get discriminator() {
      return this._def.discriminator;
    }
    get options() {
      return this._def.options;
    }
    get optionsMap() {
      return this._def.optionsMap;
    }
    /**
     * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
     * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
     * have a different value for each object in the union.
     * @param discriminator the name of the discriminator property
     * @param types an array of object schemas
     * @param params
     */
    static create(discriminator, options, params) {
      const optionsMap = /* @__PURE__ */ new Map();
      for (const type of options) {
        const discriminatorValues = getDiscriminator(type.shape[discriminator]);
        if (!discriminatorValues.length) {
          throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
        }
        for (const value of discriminatorValues) {
          if (optionsMap.has(value)) {
            throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
          }
          optionsMap.set(value, type);
        }
      }
      return new _ZodDiscriminatedUnion({
        typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
        discriminator,
        options,
        optionsMap,
        ...processCreateParams(params)
      });
    }
  };
  function mergeValues(a, b) {
    const aType = getParsedType(a);
    const bType = getParsedType(b);
    if (a === b) {
      return { valid: true, data: a };
    } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
      const bKeys = util.objectKeys(b);
      const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = { ...a, ...b };
      for (const key of sharedKeys) {
        const sharedValue = mergeValues(a[key], b[key]);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
      if (a.length !== b.length) {
        return { valid: false };
      }
      const newArray = [];
      for (let index = 0; index < a.length; index++) {
        const itemA = a[index];
        const itemB = b[index];
        const sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
      return { valid: true, data: a };
    } else {
      return { valid: false };
    }
  }
  var ZodIntersection = class extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const handleParsed = (parsedLeft, parsedRight) => {
        if (isAborted(parsedLeft) || isAborted(parsedRight)) {
          return INVALID;
        }
        const merged = mergeValues(parsedLeft.value, parsedRight.value);
        if (!merged.valid) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_intersection_types
          });
          return INVALID;
        }
        if (isDirty(parsedLeft) || isDirty(parsedRight)) {
          status.dirty();
        }
        return { status: status.value, value: merged.data };
      };
      if (ctx.common.async) {
        return Promise.all([
          this._def.left._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }),
          this._def.right._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
        ]).then(([left, right]) => handleParsed(left, right));
      } else {
        return handleParsed(this._def.left._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }), this._def.right._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }));
      }
    }
  };
  ZodIntersection.create = (left, right, params) => {
    return new ZodIntersection({
      left,
      right,
      typeName: ZodFirstPartyTypeKind.ZodIntersection,
      ...processCreateParams(params)
    });
  };
  var ZodTuple = class _ZodTuple extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (ctx.data.length < this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        return INVALID;
      }
      const rest = this._def.rest;
      if (!rest && ctx.data.length > this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        status.dirty();
      }
      const items = [...ctx.data].map((item, itemIndex) => {
        const schema = this._def.items[itemIndex] || this._def.rest;
        if (!schema)
          return null;
        return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
      }).filter((x) => !!x);
      if (ctx.common.async) {
        return Promise.all(items).then((results) => {
          return ParseStatus.mergeArray(status, results);
        });
      } else {
        return ParseStatus.mergeArray(status, items);
      }
    }
    get items() {
      return this._def.items;
    }
    rest(rest) {
      return new _ZodTuple({
        ...this._def,
        rest
      });
    }
  };
  ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    }
    return new ZodTuple({
      items: schemas,
      typeName: ZodFirstPartyTypeKind.ZodTuple,
      rest: null,
      ...processCreateParams(params)
    });
  };
  var ZodRecord = class _ZodRecord extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const pairs = [];
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      for (const key in ctx.data) {
        pairs.push({
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
          value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (ctx.common.async) {
        return ParseStatus.mergeObjectAsync(status, pairs);
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get element() {
      return this._def.valueType;
    }
    static create(first, second, third) {
      if (second instanceof ZodType) {
        return new _ZodRecord({
          keyType: first,
          valueType: second,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(third)
        });
      }
      return new _ZodRecord({
        keyType: ZodString.create(),
        valueType: first,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(second)
      });
    }
  };
  var ZodMap = class extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.map) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.map,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      const pairs = [...ctx.data.entries()].map(([key, value], index) => {
        return {
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
          value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
        };
      });
      if (ctx.common.async) {
        const finalMap = /* @__PURE__ */ new Map();
        return Promise.resolve().then(async () => {
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        });
      } else {
        const finalMap = /* @__PURE__ */ new Map();
        for (const pair of pairs) {
          const key = pair.key;
          const value = pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      }
    }
  };
  ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
      valueType,
      keyType,
      typeName: ZodFirstPartyTypeKind.ZodMap,
      ...processCreateParams(params)
    });
  };
  var ZodSet = class _ZodSet extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.set) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.set,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const def = this._def;
      if (def.minSize !== null) {
        if (ctx.data.size < def.minSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.minSize.message
          });
          status.dirty();
        }
      }
      if (def.maxSize !== null) {
        if (ctx.data.size > def.maxSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.maxSize.message
          });
          status.dirty();
        }
      }
      const valueType = this._def.valueType;
      function finalizeSet(elements2) {
        const parsedSet = /* @__PURE__ */ new Set();
        for (const element of elements2) {
          if (element.status === "aborted")
            return INVALID;
          if (element.status === "dirty")
            status.dirty();
          parsedSet.add(element.value);
        }
        return { status: status.value, value: parsedSet };
      }
      const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
      if (ctx.common.async) {
        return Promise.all(elements).then((elements2) => finalizeSet(elements2));
      } else {
        return finalizeSet(elements);
      }
    }
    min(minSize, message) {
      return new _ZodSet({
        ...this._def,
        minSize: { value: minSize, message: errorUtil.toString(message) }
      });
    }
    max(maxSize, message) {
      return new _ZodSet({
        ...this._def,
        maxSize: { value: maxSize, message: errorUtil.toString(message) }
      });
    }
    size(size, message) {
      return this.min(size, message).max(size, message);
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodSet.create = (valueType, params) => {
    return new ZodSet({
      valueType,
      minSize: null,
      maxSize: null,
      typeName: ZodFirstPartyTypeKind.ZodSet,
      ...processCreateParams(params)
    });
  };
  var ZodFunction = class _ZodFunction extends ZodType {
    constructor() {
      super(...arguments);
      this.validate = this.implement;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.function) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.function,
          received: ctx.parsedType
        });
        return INVALID;
      }
      function makeArgsIssue(args, error) {
        return makeIssue({
          data: args,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_arguments,
            argumentsError: error
          }
        });
      }
      function makeReturnsIssue(returns, error) {
        return makeIssue({
          data: returns,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_return_type,
            returnTypeError: error
          }
        });
      }
      const params = { errorMap: ctx.common.contextualErrorMap };
      const fn = ctx.data;
      if (this._def.returns instanceof ZodPromise) {
        const me = this;
        return OK(async function(...args) {
          const error = new ZodError([]);
          const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
            error.addIssue(makeArgsIssue(args, e));
            throw error;
          });
          const result = await Reflect.apply(fn, this, parsedArgs);
          const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
            error.addIssue(makeReturnsIssue(result, e));
            throw error;
          });
          return parsedReturns;
        });
      } else {
        const me = this;
        return OK(function(...args) {
          const parsedArgs = me._def.args.safeParse(args, params);
          if (!parsedArgs.success) {
            throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
          }
          const result = Reflect.apply(fn, this, parsedArgs.data);
          const parsedReturns = me._def.returns.safeParse(result, params);
          if (!parsedReturns.success) {
            throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
          }
          return parsedReturns.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...items) {
      return new _ZodFunction({
        ...this._def,
        args: ZodTuple.create(items).rest(ZodUnknown.create())
      });
    }
    returns(returnType) {
      return new _ZodFunction({
        ...this._def,
        returns: returnType
      });
    }
    implement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    strictImplement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    static create(args, returns, params) {
      return new _ZodFunction({
        args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
        returns: returns || ZodUnknown.create(),
        typeName: ZodFirstPartyTypeKind.ZodFunction,
        ...processCreateParams(params)
      });
    }
  };
  var ZodLazy = class extends ZodType {
    get schema() {
      return this._def.getter();
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const lazySchema = this._def.getter();
      return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
  };
  ZodLazy.create = (getter, params) => {
    return new ZodLazy({
      getter,
      typeName: ZodFirstPartyTypeKind.ZodLazy,
      ...processCreateParams(params)
    });
  };
  var ZodLiteral = class extends ZodType {
    _parse(input) {
      if (input.data !== this._def.value) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_literal,
          expected: this._def.value
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
    get value() {
      return this._def.value;
    }
  };
  ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
      value,
      typeName: ZodFirstPartyTypeKind.ZodLiteral,
      ...processCreateParams(params)
    });
  };
  function createZodEnum(values, params) {
    return new ZodEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodEnum,
      ...processCreateParams(params)
    });
  }
  var ZodEnum = class _ZodEnum extends ZodType {
    _parse(input) {
      if (typeof input.data !== "string") {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(this._def.values);
      }
      if (!this._cache.has(input.data)) {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Values() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    extract(values, newDef = this._def) {
      return _ZodEnum.create(values, {
        ...this._def,
        ...newDef
      });
    }
    exclude(values, newDef = this._def) {
      return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
        ...this._def,
        ...newDef
      });
    }
  };
  ZodEnum.create = createZodEnum;
  var ZodNativeEnum = class extends ZodType {
    _parse(input) {
      const nativeEnumValues = util.getValidEnumValues(this._def.values);
      const ctx = this._getOrReturnCtx(input);
      if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(util.getValidEnumValues(this._def.values));
      }
      if (!this._cache.has(input.data)) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
      ...processCreateParams(params)
    });
  };
  var ZodPromise = class extends ZodType {
    unwrap() {
      return this._def.type;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.promise,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
      return OK(promisified.then((data) => {
        return this._def.type.parseAsync(data, {
          path: ctx.path,
          errorMap: ctx.common.contextualErrorMap
        });
      }));
    }
  };
  ZodPromise.create = (schema, params) => {
    return new ZodPromise({
      type: schema,
      typeName: ZodFirstPartyTypeKind.ZodPromise,
      ...processCreateParams(params)
    });
  };
  var ZodEffects = class extends ZodType {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const effect = this._def.effect || null;
      const checkCtx = {
        addIssue: (arg) => {
          addIssueToContext(ctx, arg);
          if (arg.fatal) {
            status.abort();
          } else {
            status.dirty();
          }
        },
        get path() {
          return ctx.path;
        }
      };
      checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
      if (effect.type === "preprocess") {
        const processed = effect.transform(ctx.data, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(processed).then(async (processed2) => {
            if (status.value === "aborted")
              return INVALID;
            const result = await this._def.schema._parseAsync({
              data: processed2,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return INVALID;
            if (result.status === "dirty")
              return DIRTY(result.value);
            if (status.value === "dirty")
              return DIRTY(result.value);
            return result;
          });
        } else {
          if (status.value === "aborted")
            return INVALID;
          const result = this._def.schema._parseSync({
            data: processed,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        }
      }
      if (effect.type === "refinement") {
        const executeRefinement = (acc) => {
          const result = effect.refinement(acc, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(result);
          }
          if (result instanceof Promise) {
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          }
          return acc;
        };
        if (ctx.common.async === false) {
          const inner = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          executeRefinement(inner.value);
          return { status: status.value, value: inner.value };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
            if (inner.status === "aborted")
              return INVALID;
            if (inner.status === "dirty")
              status.dirty();
            return executeRefinement(inner.value).then(() => {
              return { status: status.value, value: inner.value };
            });
          });
        }
      }
      if (effect.type === "transform") {
        if (ctx.common.async === false) {
          const base = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (!isValid(base))
            return INVALID;
          const result = effect.transform(base.value, checkCtx);
          if (result instanceof Promise) {
            throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
          }
          return { status: status.value, value: result };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
            if (!isValid(base))
              return INVALID;
            return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
              status: status.value,
              value: result
            }));
          });
        }
      }
      util.assertNever(effect);
    }
  };
  ZodEffects.create = (schema, effect, params) => {
    return new ZodEffects({
      schema,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect,
      ...processCreateParams(params)
    });
  };
  ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
    return new ZodEffects({
      schema,
      effect: { type: "preprocess", transform: preprocess },
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      ...processCreateParams(params)
    });
  };
  var ZodOptional = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.undefined) {
        return OK(void 0);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodOptional.create = (type, params) => {
    return new ZodOptional({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodOptional,
      ...processCreateParams(params)
    });
  };
  var ZodNullable = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.null) {
        return OK(null);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodNullable.create = (type, params) => {
    return new ZodNullable({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodNullable,
      ...processCreateParams(params)
    });
  };
  var ZodDefault = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      let data = ctx.data;
      if (ctx.parsedType === ZodParsedType.undefined) {
        data = this._def.defaultValue();
      }
      return this._def.innerType._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  ZodDefault.create = (type, params) => {
    return new ZodDefault({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodDefault,
      defaultValue: typeof params.default === "function" ? params.default : () => params.default,
      ...processCreateParams(params)
    });
  };
  var ZodCatch = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const newCtx = {
        ...ctx,
        common: {
          ...ctx.common,
          issues: []
        }
      };
      const result = this._def.innerType._parse({
        data: newCtx.data,
        path: newCtx.path,
        parent: {
          ...newCtx
        }
      });
      if (isAsync(result)) {
        return result.then((result2) => {
          return {
            status: "valid",
            value: result2.status === "valid" ? result2.value : this._def.catchValue({
              get error() {
                return new ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        });
      } else {
        return {
          status: "valid",
          value: result.status === "valid" ? result.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      }
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  ZodCatch.create = (type, params) => {
    return new ZodCatch({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodCatch,
      catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
      ...processCreateParams(params)
    });
  };
  var ZodNaN = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.nan) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.nan,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
  };
  ZodNaN.create = (params) => {
    return new ZodNaN({
      typeName: ZodFirstPartyTypeKind.ZodNaN,
      ...processCreateParams(params)
    });
  };
  var BRAND = /* @__PURE__ */ Symbol("zod_brand");
  var ZodBranded = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const data = ctx.data;
      return this._def.type._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    unwrap() {
      return this._def.type;
    }
  };
  var ZodPipeline = class _ZodPipeline extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.common.async) {
        const handleAsync = async () => {
          const inResult = await this._def.in._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return DIRTY(inResult.value);
          } else {
            return this._def.out._parseAsync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        };
        return handleAsync();
      } else {
        const inResult = this._def.in._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return {
            status: "dirty",
            value: inResult.value
          };
        } else {
          return this._def.out._parseSync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }
    }
    static create(a, b) {
      return new _ZodPipeline({
        in: a,
        out: b,
        typeName: ZodFirstPartyTypeKind.ZodPipeline
      });
    }
  };
  var ZodReadonly = class extends ZodType {
    _parse(input) {
      const result = this._def.innerType._parse(input);
      const freeze = (data) => {
        if (isValid(data)) {
          data.value = Object.freeze(data.value);
        }
        return data;
      };
      return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodReadonly.create = (type, params) => {
    return new ZodReadonly({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodReadonly,
      ...processCreateParams(params)
    });
  };
  function cleanParams(params, data) {
    const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
    const p2 = typeof p === "string" ? { message: p } : p;
    return p2;
  }
  function custom(check, _params = {}, fatal) {
    if (check)
      return ZodAny.create().superRefine((data, ctx) => {
        const r = check(data);
        if (r instanceof Promise) {
          return r.then((r2) => {
            if (!r2) {
              const params = cleanParams(_params, data);
              const _fatal = params.fatal ?? fatal ?? true;
              ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
            }
          });
        }
        if (!r) {
          const params = cleanParams(_params, data);
          const _fatal = params.fatal ?? fatal ?? true;
          ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
        }
        return;
      });
    return ZodAny.create();
  }
  var late = {
    object: ZodObject.lazycreate
  };
  var ZodFirstPartyTypeKind;
  (function(ZodFirstPartyTypeKind2) {
    ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
    ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
    ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
    ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
    ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
    ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
    ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
    ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
    ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
    ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
    ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
    ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
    ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
    ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
    ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
    ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
    ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
    ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
    ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
    ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
    ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
    ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
    ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
    ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
    ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
    ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
    ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
    ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
    ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
    ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
    ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
    ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
    ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
    ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
    ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
    ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
  var instanceOfType = (cls, params = {
    message: `Input not instance of ${cls.name}`
  }) => custom((data) => data instanceof cls, params);
  var stringType = ZodString.create;
  var numberType = ZodNumber.create;
  var nanType = ZodNaN.create;
  var bigIntType = ZodBigInt.create;
  var booleanType = ZodBoolean.create;
  var dateType = ZodDate.create;
  var symbolType = ZodSymbol.create;
  var undefinedType = ZodUndefined.create;
  var nullType = ZodNull.create;
  var anyType = ZodAny.create;
  var unknownType = ZodUnknown.create;
  var neverType = ZodNever.create;
  var voidType = ZodVoid.create;
  var arrayType = ZodArray.create;
  var objectType = ZodObject.create;
  var strictObjectType = ZodObject.strictCreate;
  var unionType = ZodUnion.create;
  var discriminatedUnionType = ZodDiscriminatedUnion.create;
  var intersectionType = ZodIntersection.create;
  var tupleType = ZodTuple.create;
  var recordType = ZodRecord.create;
  var mapType = ZodMap.create;
  var setType = ZodSet.create;
  var functionType = ZodFunction.create;
  var lazyType = ZodLazy.create;
  var literalType = ZodLiteral.create;
  var enumType = ZodEnum.create;
  var nativeEnumType = ZodNativeEnum.create;
  var promiseType = ZodPromise.create;
  var effectsType = ZodEffects.create;
  var optionalType = ZodOptional.create;
  var nullableType = ZodNullable.create;
  var preprocessType = ZodEffects.createWithPreprocess;
  var pipelineType = ZodPipeline.create;
  var ostring = () => stringType().optional();
  var onumber = () => numberType().optional();
  var oboolean = () => booleanType().optional();
  var coerce = {
    string: ((arg) => ZodString.create({ ...arg, coerce: true })),
    number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
    boolean: ((arg) => ZodBoolean.create({
      ...arg,
      coerce: true
    })),
    bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
    date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
  };
  var NEVER = INVALID;

  // ../../packages/ai-core/dist/decisionPacket.js
  var CardSchema = external_exports.object({
    rank: external_exports.union([
      external_exports.literal(2),
      external_exports.literal(3),
      external_exports.literal(4),
      external_exports.literal(5),
      external_exports.literal(6),
      external_exports.literal(7),
      external_exports.literal(8),
      external_exports.literal(9),
      external_exports.literal(10),
      external_exports.literal(11),
      external_exports.literal(12),
      external_exports.literal(13),
      external_exports.literal(14)
    ]),
    suit: external_exports.enum(["s", "h", "d", "c"])
  });
  var PositionSchema = external_exports.enum(["UTG", "HJ", "CO", "BTN", "SB", "BB"]);
  var StreetSchema = external_exports.enum(["preflop", "flop", "turn", "river"]);
  var FacingActionSchema = external_exports.enum(["none", "bet", "raise", "all_in"]);
  var EquitySourceSchema = external_exports.enum(["estimated_range", "random_hands", "unknown"]);
  var CandidateActionSchema = external_exports.enum(["FOLD", "CHECK", "CALL", "BET", "RAISE", "ALL_IN"]);
  function deriveCandidateActions(facingActionType) {
    const facingBet = facingActionType === "bet" || facingActionType === "raise" || facingActionType === "all_in";
    return facingBet ? ["FOLD", "CALL", "RAISE", "ALL_IN"] : ["CHECK", "BET", "ALL_IN"];
  }
  var DecisionPacketSchema = external_exports.object({
    hero: external_exports.object({
      holeCards: external_exports.tuple([CardSchema, CardSchema]),
      position: PositionSchema,
      stackBB: external_exports.number().positive()
    }),
    table: external_exports.object({
      potBB: external_exports.number().positive(),
      board: external_exports.array(CardSchema).max(5),
      street: StreetSchema,
      numOpponentsRemaining: external_exports.number().int().min(1)
    }),
    facingAction: external_exports.object({
      type: FacingActionSchema,
      amountBB: external_exports.number().nonnegative().optional()
    }),
    /** Derived via deriveCandidateActions() -- see its doc comment above. */
    candidateActions: external_exports.array(CandidateActionSchema).min(1),
    engineCalculations: external_exports.object({
      equity: external_exports.number().min(0).max(1).optional(),
      /** Should be present whenever equity is -- see EquitySourceSchema doc comment above. Not schema-enforced as a pair, by convention only. */
      equitySource: EquitySourceSchema.optional(),
      potOddsBreakevenPercent: external_exports.number().min(0).max(100).optional(),
      callEV: external_exports.number().optional(),
      spr: external_exports.number().positive().optional(),
      outs: external_exports.number().int().nonnegative().optional(),
      boardTexture: external_exports.object({
        suitTexture: external_exports.enum(["monotone", "two_tone", "rainbow"]),
        pairTexture: external_exports.enum(["paired", "trips_plus", "unpaired"]),
        connectivity: external_exports.enum(["disconnected", "somewhat_connected", "highly_connected"]),
        overall: external_exports.enum(["dry", "semi_wet", "wet"])
      }).optional()
    }),
    opponentContext: external_exports.object({
      estimatedRangeDescription: external_exports.string().optional(),
      rangeVsHeroEquity: external_exports.number().min(0).max(1).optional()
    }).optional(),
    /** Explicit confidence flag per Rule 5: never let the AI reason
     *  confidently over uncertain data. */
    dataConfidence: external_exports.enum(["high", "medium", "low"]).default("high")
  });

  // ../../packages/ai-core/dist/recommendation.js
  var RecommendationSchema = external_exports.object({
    action: external_exports.enum(["FOLD", "CHECK", "CALL", "BET", "RAISE", "ALL_IN"]),
    sizingBB: external_exports.number().positive().optional(),
    confidence: external_exports.number().min(0).max(1),
    reasoning: external_exports.string().min(1),
    alternative: external_exports.object({
      action: external_exports.enum(["FOLD", "CHECK", "CALL", "BET", "RAISE", "ALL_IN"]),
      reasoning: external_exports.string().min(1)
    }).optional()
  });

  // ../../packages/ai-core/dist/auditRecord.js
  var AuditRecordSchema = external_exports.object({
    timestamp: external_exports.string().datetime(),
    sessionId: external_exports.string(),
    handId: external_exports.string(),
    decisionPacket: DecisionPacketSchema,
    provider: external_exports.string(),
    model: external_exports.string(),
    promptVersion: external_exports.string(),
    rawResponse: external_exports.string().optional(),
    parsedRecommendation: RecommendationSchema.optional(),
    latencyMs: external_exports.number().nonnegative(),
    error: external_exports.string().optional()
  });

  // ../../packages/ai-core/dist/modelRegistry.js
  var ModelConfigSchema = external_exports.object({
    provider: external_exports.enum(["groq", "gemini"]),
    modelId: external_exports.string().min(1),
    supportsVision: external_exports.boolean(),
    supportsStructuredOutput: external_exports.boolean(),
    costTier: external_exports.enum(["free", "paid"]),
    speedTier: external_exports.enum(["fast", "moderate", "slow"]),
    /** Latency we've actually measured ourselves, not a vendor claim.
     *  Optional until we've run a real test against this exact model. */
    measuredLatencyMs: external_exports.number().positive().optional(),
    /** When we last confirmed (via a real API call) that this model is
     *  actually callable -- per the lesson learned twice now that
     *  documentation and reality can drift apart (Groq's Enterprise-only
     *  model move, needing to verify Gemini's model name against official
     *  docs rather than guessing). null means never verified. */
    lastVerifiedAt: external_exports.string().datetime().nullable()
  });

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
  function formatHandType(hand) {
    const high = RANK_TO_CHAR[hand.highRank];
    const low = RANK_TO_CHAR[hand.lowRank];
    if (hand.highRank === hand.lowRank)
      return `${high}${low}`;
    return `${high}${low}${hand.suited ? "s" : "o"}`;
  }
  function parseHandType(input) {
    const trimmed = input.trim();
    if (trimmed.length === 2) {
      const rank = CHAR_TO_RANK[trimmed[0].toUpperCase()];
      const rank2 = CHAR_TO_RANK[trimmed[1].toUpperCase()];
      if (rank === void 0 || rank2 === void 0 || rank !== rank2) {
        throw new Error(`Invalid hand type "${input}": expected a pocket pair like "77"`);
      }
      return { highRank: rank, lowRank: rank, suited: false };
    }
    if (trimmed.length === 3) {
      const r1 = CHAR_TO_RANK[trimmed[0].toUpperCase()];
      const r2 = CHAR_TO_RANK[trimmed[1].toUpperCase()];
      const suitedChar = trimmed[2].toLowerCase();
      if (r1 === void 0 || r2 === void 0 || r1 === r2) {
        throw new Error(`Invalid hand type "${input}": unrecognized ranks`);
      }
      if (suitedChar !== "s" && suitedChar !== "o") {
        throw new Error(`Invalid hand type "${input}": expected trailing "s" or "o"`);
      }
      const [highRank, lowRank] = r1 > r2 ? [r1, r2] : [r2, r1];
      return { highRank, lowRank, suited: suitedChar === "s" };
    }
    throw new Error(`Invalid hand type "${input}": expected 2 or 3 characters`);
  }
  function expandHandType(hand) {
    const combos = [];
    if (hand.highRank === hand.lowRank) {
      for (let i = 0; i < SUITS.length; i++) {
        for (let j = i + 1; j < SUITS.length; j++) {
          combos.push([
            { rank: hand.highRank, suit: SUITS[i] },
            { rank: hand.lowRank, suit: SUITS[j] }
          ]);
        }
      }
      return combos;
    }
    if (hand.suited) {
      for (const suit of SUITS) {
        combos.push([
          { rank: hand.highRank, suit },
          { rank: hand.lowRank, suit }
        ]);
      }
      return combos;
    }
    for (const suitHigh of SUITS) {
      for (const suitLow of SUITS) {
        if (suitHigh === suitLow)
          continue;
        combos.push([
          { rank: hand.highRank, suit: suitHigh },
          { rank: hand.lowRank, suit: suitLow }
        ]);
      }
    }
    return combos;
  }

  // ../../packages/range-engine/dist/range.js
  function rangeFromList(hands) {
    const range = /* @__PURE__ */ new Map();
    for (const h of hands) {
      range.set(formatHandType(parseHandType(h)), 1);
    }
    return range;
  }
  function expandRange(range, excludeCards = []) {
    const excludeIds = new Set(excludeCards.map((c) => `${c.rank}${c.suit}`));
    const result = [];
    for (const [handStr, weight] of range) {
      const combos = expandHandType(parseHandType(handStr));
      for (const combo of combos) {
        const overlaps = combo.some((c) => excludeIds.has(`${c.rank}${c.suit}`));
        if (!overlaps) {
          result.push({ cards: combo, weight });
        }
      }
    }
    return result;
  }

  // ../../packages/range-engine/dist/rangeEquity.js
  var DEFAULT_ITERATIONS2 = 1e4;
  function weightedSample(combos, rng) {
    const totalWeight = combos.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight <= 0) {
      throw new Error("Cannot sample from a range with zero total weight (empty or all-excluded range)");
    }
    let roll = rng() * totalWeight;
    for (const combo of combos) {
      roll -= combo.weight;
      if (roll <= 0)
        return combo;
    }
    return combos[combos.length - 1];
  }
  function calculateEquityVsRange(heroCards, opponentRange, board, options = {}) {
    if (heroCards.length !== 2) {
      throw new Error(`calculateEquityVsRange requires exactly 2 hero cards, got ${heroCards.length}`);
    }
    if (board.length > 5) {
      throw new Error(`Board cannot have more than 5 cards, got ${board.length}`);
    }
    const iterations = options.iterations ?? DEFAULT_ITERATIONS2;
    const rng = options.rng ?? Math.random;
    const cardsToComplete = 5 - board.length;
    const knownCards = [...heroCards, ...board];
    const opponentCombos = expandRange(opponentRange, knownCards);
    if (opponentCombos.length === 0) {
      throw new Error("Opponent range has no valid combos remaining after excluding known cards");
    }
    let winShareSum = 0;
    for (let i = 0; i < iterations; i++) {
      const opponentCombo = weightedSample(opponentCombos, rng);
      const excludeThisIteration = [...knownCards, ...opponentCombo.cards];
      const deck = new Deck(rng, excludeThisIteration);
      const runoutBoard = [...board, ...deck.drawMany(cardsToComplete)];
      const heroValue = evaluateBest([...heroCards, ...runoutBoard]).value;
      const opponentValue = evaluateBest([...opponentCombo.cards, ...runoutBoard]).value;
      if (heroValue > opponentValue)
        winShareSum += 1;
      else if (heroValue === opponentValue)
        winShareSum += 0.5;
    }
    return { equity: winShareSum / iterations, iterations };
  }

  // ../../packages/range-engine/dist/openingRanges.js
  var OPENING_RANGE_HANDS = {
    UTG: [
      "77",
      "88",
      "99",
      "TT",
      "JJ",
      "QQ",
      "KK",
      "AA",
      "A9s",
      "ATs",
      "AJs",
      "AQs",
      "AKs",
      "KTs",
      "KJs",
      "KQs",
      "QTs",
      "QJs",
      "JTs",
      "T9s",
      "ATo",
      "AJo",
      "AQo",
      "AKo",
      "KQo"
    ],
    HJ: [
      "66",
      "77",
      "88",
      "99",
      "TT",
      "JJ",
      "QQ",
      "KK",
      "AA",
      "A7s",
      "A8s",
      "A9s",
      "ATs",
      "AJs",
      "AQs",
      "AKs",
      "K9s",
      "KTs",
      "KJs",
      "KQs",
      "Q9s",
      "QTs",
      "QJs",
      "J9s",
      "JTs",
      "T9s",
      "98s",
      "ATo",
      "AJo",
      "AQo",
      "AKo",
      "KJo",
      "KQo",
      "QJo"
    ],
    CO: [
      "22",
      "33",
      "44",
      "55",
      "66",
      "77",
      "88",
      "99",
      "TT",
      "JJ",
      "QQ",
      "KK",
      "AA",
      "A2s",
      "A3s",
      "A4s",
      "A5s",
      "A6s",
      "A7s",
      "A8s",
      "A9s",
      "ATs",
      "AJs",
      "AQs",
      "AKs",
      "K7s",
      "K8s",
      "K9s",
      "KTs",
      "KJs",
      "KQs",
      "Q8s",
      "Q9s",
      "QTs",
      "QJs",
      "J8s",
      "J9s",
      "JTs",
      "T8s",
      "T9s",
      "97s",
      "98s",
      "87s",
      "76s",
      "A8o",
      "A9o",
      "ATo",
      "AJo",
      "AQo",
      "AKo",
      "K9o",
      "KTo",
      "KJo",
      "KQo",
      "QTo",
      "QJo",
      "JTo"
    ],
    BTN: [
      "22",
      "33",
      "44",
      "55",
      "66",
      "77",
      "88",
      "99",
      "TT",
      "JJ",
      "QQ",
      "KK",
      "AA",
      "A2s",
      "A3s",
      "A4s",
      "A5s",
      "A6s",
      "A7s",
      "A8s",
      "A9s",
      "ATs",
      "AJs",
      "AQs",
      "AKs",
      "K2s",
      "K3s",
      "K4s",
      "K5s",
      "K6s",
      "K7s",
      "K8s",
      "K9s",
      "KTs",
      "KJs",
      "KQs",
      "Q4s",
      "Q5s",
      "Q6s",
      "Q7s",
      "Q8s",
      "Q9s",
      "QTs",
      "QJs",
      "J6s",
      "J7s",
      "J8s",
      "J9s",
      "JTs",
      "T6s",
      "T7s",
      "T8s",
      "T9s",
      "95s",
      "96s",
      "97s",
      "98s",
      "85s",
      "86s",
      "87s",
      "75s",
      "76s",
      "64s",
      "65s",
      "54s",
      "A2o",
      "A3o",
      "A4o",
      "A5o",
      "A6o",
      "A7o",
      "A8o",
      "A9o",
      "ATo",
      "AJo",
      "AQo",
      "AKo",
      "K7o",
      "K8o",
      "K9o",
      "KTo",
      "KJo",
      "KQo",
      "Q9o",
      "QTo",
      "QJo",
      "J9o",
      "JTo",
      "T9o"
    ],
    SB: [
      "22",
      "33",
      "44",
      "55",
      "66",
      "77",
      "88",
      "99",
      "TT",
      "JJ",
      "QQ",
      "KK",
      "AA",
      "A2s",
      "A3s",
      "A4s",
      "A5s",
      "A6s",
      "A7s",
      "A8s",
      "A9s",
      "ATs",
      "AJs",
      "AQs",
      "AKs",
      "K5s",
      "K6s",
      "K7s",
      "K8s",
      "K9s",
      "KTs",
      "KJs",
      "KQs",
      "Q8s",
      "Q9s",
      "QTs",
      "QJs",
      "J8s",
      "J9s",
      "JTs",
      "T8s",
      "T9s",
      "97s",
      "98s",
      "87s",
      "76s",
      "65s",
      "A7o",
      "A8o",
      "A9o",
      "ATo",
      "AJo",
      "AQo",
      "AKo",
      "K9o",
      "KTo",
      "KJo",
      "KQo",
      "QTo",
      "QJo",
      "JTo"
    ]
  };
  function getOpeningRange(position) {
    if (position === "BB")
      return rangeFromList([]);
    return rangeFromList(OPENING_RANGE_HANDS[position]);
  }

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

  // ../../packages/range-engine/dist/chenScore.js
  function chenScore(hand) {
    const { highRank, lowRank, suited } = hand;
    let score;
    if (highRank === 14)
      score = 10;
    else if (highRank === 13)
      score = 8;
    else if (highRank === 12)
      score = 7;
    else if (highRank === 11)
      score = 6;
    else if (highRank === 10)
      score = 5;
    else
      score = highRank / 2;
    if (highRank === lowRank) {
      score = Math.max(score * 2, 5);
      return score;
    }
    if (suited)
      score += 2;
    const gap = highRank - lowRank - 1;
    if (gap === 1)
      score -= 1;
    else if (gap === 2)
      score -= 2;
    else if (gap === 3)
      score -= 4;
    else if (gap >= 4)
      score -= 5;
    if ((gap === 0 || gap === 1) && highRank < 12) {
      score += 1;
    }
    return Math.ceil(score);
  }

  // ../../packages/range-engine/dist/actionNarrowing.js
  function rankRangeByStrength(range) {
    return [...range.keys()].sort((a, b) => chenScore(parseHandType(b)) - chenScore(parseHandType(a)));
  }
  function narrowForThreeBet(range, options = {}) {
    const topFraction = options.topFraction ?? 0.25;
    if (topFraction <= 0 || topFraction > 1) {
      throw new Error(`topFraction must be between 0 (exclusive) and 1, got ${topFraction}`);
    }
    const ranked = rankRangeByStrength(range);
    const keepCount = Math.max(1, Math.ceil(ranked.length * topFraction));
    const kept = new Set(ranked.slice(0, keepCount));
    const narrowed = /* @__PURE__ */ new Map();
    for (const [hand, weight] of range) {
      if (kept.has(hand))
        narrowed.set(hand, weight);
    }
    return narrowed;
  }
  function narrowForCall(range, options = {}) {
    const [lowerPct, upperPct] = options.band ?? [0.4, 0.75];
    if (lowerPct < 0 || upperPct > 1 || lowerPct >= upperPct) {
      throw new Error(`Invalid band [${lowerPct}, ${upperPct}]: must satisfy 0 <= lower < upper <= 1`);
    }
    const ranked = rankRangeByStrength(range);
    const lowerIdx = Math.floor(ranked.length * lowerPct);
    const upperIdx = Math.ceil(ranked.length * upperPct);
    const kept = new Set(ranked.slice(lowerIdx, upperIdx));
    const narrowed = /* @__PURE__ */ new Map();
    for (const [hand, weight] of range) {
      if (kept.has(hand))
        narrowed.set(hand, weight);
    }
    return narrowed;
  }
  function defaultBaselineRange() {
    return getOpeningRange("BTN");
  }
  function estimateOpponentRange(actions, baseline = defaultBaselineRange()) {
    let range = baseline;
    for (const action of actions) {
      if (action === "raise") {
        range = narrowForThreeBet(range);
      } else if (action === "call") {
        range = narrowForCall(range);
      }
    }
    return range;
  }

  // src/contentScript.ts
  console.log("[Poker AI Reader] Content script loaded on:", window.location.href);
  var overlayState = {
    street: "-",
    equityLine: null,
    potOddsLine: null,
    preflopLine: null,
    aiStatus: "idle",
    aiResult: null,
    aiWarnings: []
  };
  var OVERLAY_ID = "poker-ai-reader-overlay";
  function ensureOverlay() {
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
  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  var AI_STATUS_COLORS = {
    idle: "#888888",
    waiting: "#e0a030",
    received: "#4caf50",
    blocked: "#e05050",
    error: "#e05050"
  };
  function renderOverlay() {
    const el = ensureOverlay();
    const s = overlayState;
    const parts = [];
    parts.push(`<div style="font-weight:600; margin-bottom:6px; color:#9ad;">Poker AI Reader</div>`);
    parts.push(`<div>Street: <b>${escapeHtml(s.street)}</b></div>`);
    if (s.equityLine) parts.push(`<div>${escapeHtml(s.equityLine)}</div>`);
    if (s.potOddsLine) parts.push(`<div>${escapeHtml(s.potOddsLine)}</div>`);
    if (s.preflopLine) {
      parts.push(
        `<div style="margin-top:6px; padding-top:6px; border-top:1px solid #444;">${escapeHtml(s.preflopLine)}</div>`
      );
    }
    parts.push(`<div style="margin-top:8px; padding-top:8px; border-top:1px solid #444;">`);
    parts.push(
      `<div style="color:${AI_STATUS_COLORS[s.aiStatus]}; font-weight:600;">${escapeHtml(s.aiStatus.toUpperCase())}</div>`
    );
    if (s.aiResult) {
      parts.push(`<div style="font-size:16px; font-weight:700; margin:4px 0;">${escapeHtml(s.aiResult.action)}</div>`);
      parts.push(`<div>Confidence: ${(s.aiResult.confidence * 100).toFixed(0)}%</div>`);
      parts.push(`<div style="margin-top:4px; color:#ccc;">${escapeHtml(s.aiResult.reasoning)}</div>`);
    }
    if (s.aiWarnings.length > 0) {
      parts.push(
        `<div style="margin-top:6px; color:#e0a030;">${s.aiWarnings.map((w) => escapeHtml(w)).join("<br/>")}</div>`
      );
    }
    parts.push(`</div>`);
    el.innerHTML = parts.join("");
  }
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
  function extractDealerSeatNumber() {
    const dealerEl = document.querySelector('[class*="dealer-position-"]');
    if (!dealerEl) return null;
    const match = [...dealerEl.classList].find((c) => c.startsWith("dealer-position-"));
    if (!match) return null;
    const seatNumber = Number(match.replace("dealer-position-", ""));
    return Number.isNaN(seatNumber) ? null : seatNumber;
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
  function isBigBlindReadable() {
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
        potTotalValueText: pot.total
      });
    } catch (error) {
      console.error("[Poker AI Reader] Failed to assemble game state:", error);
      return null;
    }
  }
  var RELAY_SERVER_URL = "http://localhost:8787/recommendation";
  function buildDecisionPacket(input) {
    const {
      state,
      amountToCall,
      equity,
      equitySource,
      bigBlind,
      bigBlindWasDefaulted,
      heroPosition,
      isPositionKnown,
      opponentActionsDescription
    } = input;
    const hero = state.seats.find((s) => s.isYou);
    const numOpponentsRemaining = state.seats.filter(
      (s) => s.isOccupied && !s.isYou && !s.isFolded
    ).length;
    const confidence = computeDataConfidence(state, {
      amountToCall,
      bigBlindWasDefaulted,
      isPositionKnown
    });
    console.log(
      `[Poker AI Reader] Data confidence: ${confidence.level}${confidence.reasons.length > 0 ? ` (${confidence.reasons.join("; ")})` : ""}`
    );
    const facingActionType = amountToCall > 0 ? "bet" : "none";
    let potOddsBreakevenPercent;
    let callEV;
    if (amountToCall > 0 && state.potMainValue > 0) {
      potOddsBreakevenPercent = calculatePotOdds(state.potMainValue, amountToCall).breakevenEquityPercent;
      callEV = calculateCallEV(equity, state.potMainValue, amountToCall).ev;
    }
    let spr;
    if (hero.stack !== null && state.potMainValue > 0) {
      spr = calculateSPR(hero.stack, state.potMainValue);
    }
    let outs;
    if (state.board.length === 3 || state.board.length === 4) {
      outs = calculateOuts(hero.holeCards, state.board).count;
    }
    let boardTexture;
    if (state.board.length >= 3) {
      boardTexture = classifyBoardTexture(state.board);
    }
    return {
      hero: {
        holeCards: hero.holeCards,
        position: heroPosition,
        stackBB: bigBlind > 0 ? (hero.stack ?? 0) / bigBlind : hero.stack ?? 0
      },
      table: {
        potBB: bigBlind > 0 ? state.potMainValue / bigBlind : state.potMainValue,
        board: state.board,
        street: state.street,
        numOpponentsRemaining
      },
      facingAction: {
        type: facingActionType,
        ...amountToCall > 0 ? { amountBB: bigBlind > 0 ? amountToCall / bigBlind : amountToCall } : {}
      },
      candidateActions: deriveCandidateActions(facingActionType),
      engineCalculations: {
        equity,
        equitySource,
        potOddsBreakevenPercent,
        callEV,
        spr,
        outs,
        boardTexture
      },
      opponentContext: opponentActionsDescription ? { estimatedRangeDescription: opponentActionsDescription } : void 0,
      dataConfidence: confidence.level
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
    const preflopLine = `PREFLOP (${stackBB.toFixed(1)}BB effective): ${shove.isProfitable ? "SHOVE profitable" : "SHOVE not profitable"} (EV: ${shove.ev.toFixed(2)}BB, equity if called: ${(shove.equityIfCalled * 100).toFixed(1)}%, assumed fold equity: ${(shove.foldEquityUsed * 100).toFixed(0)}%)`;
    console.log(`[Poker AI Reader] ${preflopLine}`);
    overlayState.preflopLine = preflopLine;
    renderOverlay();
  }
  async function requestRecommendation(packet, stateDescription, requestKey) {
    try {
      const response = await fetch(RELAY_SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast", decisionPacket: packet })
      });
      const data = await response.json();
      if (requestKey !== lastRecommendationRequestKey) {
        console.warn(
          `[Poker AI Reader] Discarding stale AI response (for: ${stateDescription}) -- a newer decision point is already current.`
        );
        return;
      }
      if (data.ok) {
        console.log(`[Poker AI Reader] AI recommendation (for: ${stateDescription}):`, data.result);
        overlayState.aiResult = {
          action: data.result.action,
          confidence: data.result.confidence,
          reasoning: data.result.reasoning
        };
        overlayState.aiWarnings = [
          ...data.blocked ? [`Blocked: ${data.blockedReason}${data.originalReason ? ` -- ${data.originalReason}` : ""}`] : [],
          ...data.consistencyWarnings ?? []
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
  var lastStateJson = null;
  var lastRecommendationRequestKey = null;
  var previousGameState = null;
  var actionHistory = emptyActionHistory();
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
      const dealerSeatNumber = extractDealerSeatNumber();
      const positions = dealerSeatNumber !== null ? assignPositions(state.seats, dealerSeatNumber) : /* @__PURE__ */ new Map();
      if (hero && hero.holeCards.length === 2 && state.street !== "preflop") {
        const numOpponents = state.seats.filter(
          (s) => s.isOccupied && !s.isYou && !s.isFolded
        ).length;
        if (numOpponents >= 1) {
          let equityResult;
          let equitySource;
          let opponentActionsDescription;
          if (numOpponents === 1) {
            const opponent = state.seats.find((s) => s.isOccupied && !s.isYou && !s.isFolded);
            const opponentActions = (actionHistory.get(opponent.seatNumber) ?? []).map((r) => r.action);
            opponentActionsDescription = opponentActions.length > 0 ? `Opponent's actions this hand so far (in order): ${opponentActions.join(", ")}.` : "Opponent has taken no actions yet this hand.";
            const opponentPosition = positions.get(opponent.seatNumber);
            const estimatedRange = opponentPosition ? estimateOpponentRange(opponentActions, getOpeningRange(opponentPosition)) : estimateOpponentRange(opponentActions);
            try {
              equityResult = calculateEquityVsRange(hero.holeCards, estimatedRange, state.board, {
                iterations: 3e3
              });
              equitySource = "estimated_range";
              console.log(
                `[Poker AI Reader] Hero equity vs estimated range (actions so far: ${opponentActions.length > 0 ? opponentActions.join(", ") : "none yet"}): ${(equityResult.equity * 100).toFixed(1)}%`
              );
            } catch (error) {
              console.warn("[Poker AI Reader] Range-based equity failed, falling back to random hands:", error);
              equityResult = calculateEquity(hero.holeCards, state.board, numOpponents, { iterations: 3e3 });
              equitySource = "random_hands";
              console.log(
                `[Poker AI Reader] Hero equity vs ${numOpponents} opponent(s) (random hands, fallback): ${(equityResult.equity * 100).toFixed(1)}%`
              );
            }
          } else {
            equityResult = calculateEquity(hero.holeCards, state.board, numOpponents, { iterations: 3e3 });
            equitySource = "random_hands";
            console.log(
              `[Poker AI Reader] Hero equity vs ${numOpponents} opponent(s) (random hands -- multiway, no range model yet): ${(equityResult.equity * 100).toFixed(1)}%`
            );
          }
          overlayState.equityLine = `Equity: ${(equityResult.equity * 100).toFixed(1)}% (${equitySource === "estimated_range" ? "vs estimated range" : "vs random hands"})`;
          const amountToCall = calculateAmountToCall(state);
          if (amountToCall > 0 && state.potMainValue > 0) {
            const potOdds = calculatePotOdds(state.potMainValue, amountToCall);
            console.log(
              `[Poker AI Reader] Amount to call: ${amountToCall}. Breakeven equity needed: ${potOdds.breakevenEquityPercent.toFixed(1)}%`
            );
            overlayState.potOddsLine = `To call: ${amountToCall} (breakeven: ${potOdds.breakevenEquityPercent.toFixed(1)}%)`;
          } else if (amountToCall === 0) {
            console.log("[Poker AI Reader] No bet facing hero (check or already matched) -- pot odds not applicable.");
            overlayState.potOddsLine = null;
          }
          renderOverlay();
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
                heroPosition: positions.get(hero.seatNumber) ?? "BTN",
                isPositionKnown: positions.has(hero.seatNumber),
                opponentActionsDescription
              });
              console.log(`[Poker AI Reader] Big blind detected: ${bigBlind}. Hero stackBB: ${packet.hero.stackBB.toFixed(2)}. Facing amountBB: ${packet.facingAction.amountBB?.toFixed(2) ?? "n/a"}`);
              console.log(
                `[Poker AI Reader] It's hero's turn -- requesting AI recommendation for street=${state.street}, board=${JSON.stringify(state.board)}, potMainValue=${state.potMainValue}`
              );
              requestRecommendation(packet, `${state.street} | board: ${JSON.stringify(state.board)} | pot: ${state.potMainValue}`, requestKey);
            }
          }
        }
      }
    }
  }, 1e3);
})();
