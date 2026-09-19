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
  var POSITION_IS_KNOWN = false;
  function buildDecisionPacket(state, amountToCall, equity, bigBlind, bigBlindWasDefaulted) {
    const hero = state.seats.find((s) => s.isYou);
    const numOpponentsRemaining = state.seats.filter(
      (s) => s.isOccupied && !s.isYou && !s.isFolded
    ).length;
    const confidence = computeDataConfidence(state, {
      amountToCall,
      bigBlindWasDefaulted,
      isPositionKnown: POSITION_IS_KNOWN
    });
    console.log(
      `[Poker AI Reader] Data confidence: ${confidence.level}${confidence.reasons.length > 0 ? ` (${confidence.reasons.join("; ")})` : ""}`
    );
    return {
      hero: {
        holeCards: hero.holeCards,
        position: "BTN",
        // KNOWN PLACEHOLDER -- see POSITION_IS_KNOWN above
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
  var previousGameState = null;
  var actionHistory = emptyActionHistory();
  setInterval(() => {
    const state = readGameState();
    if (!state) return;
    const stateJson = JSON.stringify(state);
    if (stateJson !== lastStateJson) {
      console.log("[Poker AI Reader] Game state changed:", JSON.parse(stateJson));
      lastStateJson = stateJson;
      actionHistory = updateActionHistory(actionHistory, previousGameState, state);
      previousGameState = state;
      const bigBlindForPreflopCheck = extractBigBlind();
      checkPreflopPushFold(state, bigBlindForPreflopCheck);
      const hero = state.seats.find((s) => s.isYou);
      if (hero && hero.holeCards.length === 2 && state.street !== "preflop") {
        const numOpponents = state.seats.filter(
          (s) => s.isOccupied && !s.isYou && !s.isFolded
        ).length;
        if (numOpponents >= 1) {
          let equityResult;
          if (numOpponents === 1) {
            const opponent = state.seats.find((s) => s.isOccupied && !s.isYou && !s.isFolded);
            const opponentActions = (actionHistory.get(opponent.seatNumber) ?? []).map((r) => r.action);
            const estimatedRange = estimateOpponentRange(opponentActions);
            try {
              equityResult = calculateEquityVsRange(hero.holeCards, estimatedRange, state.board, {
                iterations: 3e3
              });
              console.log(
                `[Poker AI Reader] Hero equity vs estimated range (actions so far: ${opponentActions.length > 0 ? opponentActions.join(", ") : "none yet"}): ${(equityResult.equity * 100).toFixed(1)}%`
              );
            } catch (error) {
              console.warn("[Poker AI Reader] Range-based equity failed, falling back to random hands:", error);
              equityResult = calculateEquity(hero.holeCards, state.board, numOpponents, { iterations: 3e3 });
              console.log(
                `[Poker AI Reader] Hero equity vs ${numOpponents} opponent(s) (random hands, fallback): ${(equityResult.equity * 100).toFixed(1)}%`
              );
            }
          } else {
            equityResult = calculateEquity(hero.holeCards, state.board, numOpponents, { iterations: 3e3 });
            console.log(
              `[Poker AI Reader] Hero equity vs ${numOpponents} opponent(s) (random hands -- multiway, no range model yet): ${(equityResult.equity * 100).toFixed(1)}%`
            );
          }
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
              const bigBlindWasDefaulted = !isBigBlindReadable();
              const packet = buildDecisionPacket(state, amountToCall, equityResult.equity, bigBlind, bigBlindWasDefaulted);
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
