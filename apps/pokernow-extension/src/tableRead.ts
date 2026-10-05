import { parseBoardCardFromEvidence, type LiveReadContext, type RawTableInput, type BoardCardEvidence } from "@poker-ai/browser-reader";
import { formatCard } from "@poker-ai/shared";
import { readRaiseControl } from "./raiseControlRead.js";

// Existing PokerNow selectors, kept together for inspection. No alternate DOM
// layout is assumed when a selector fails; record the failure instead.
export const TABLE_SELECTORS = {
  board: ".table-cards",
  boardCard: ".card-container",
  boardValue: ".value",
  boardSuit: ".suit:not(.sub-suit)",
  boardAllSuits: ".suit",
  seat: ".table-player-N (N=1..10)",
  name: ".table-player-name a",
  stack: ".table-player-stack .normal-value",
  stackContainer: ".table-player-stack",
  holeCard: ".table-player-cards .card-container",
  bet: ".table-player-bet-value",
  mainPot: ".table-pot-size .main-value .normal-value",
  addOnPot: ".table-pot-size .add-on-container .normal-value",
  potContainer: ".table-pot-size",
  blind: ".blind-value .chips-value .normal-value",
  dealer: '[class*="dealer-position-"]',
} as const;

export function readLiveTable() {
  const readErrors: string[] = [];
  const unique = (root: ParentNode, selector: string, label: string, required: boolean) => {
    const matches = root.querySelectorAll(selector);
    if (matches.length > 1 || (required && matches.length === 0)) {
      readErrors.push(`${label}: expected ${required ? "one" : "at most one"} match, found ${matches.length}`);
    }
    return matches.length === 1 ? matches[0]! : null;
  };
  const board = unique(document, TABLE_SELECTORS.board, "board container", true);
  const boardCardEvidence: BoardCardEvidence[] = [];
  const boardCards = [...(board?.querySelectorAll(TABLE_SELECTORS.boardCard) ?? [])].map((card, index) => {
    const evidence: BoardCardEvidence = {
      classList: [...card.classList],
      valueTexts: [...card.querySelectorAll(TABLE_SELECTORS.boardValue)].map(node => node.textContent ?? ""),
      suitTexts: [...card.querySelectorAll(TABLE_SELECTORS.boardSuit)].map(node => node.textContent ?? ""),
      allSuitTexts: [...card.querySelectorAll(TABLE_SELECTORS.boardAllSuits)].map(node => node.textContent ?? ""),
    };
    boardCardEvidence.push(evidence);
    try {
      const parsed = parseBoardCardFromEvidence(evidence);
      return { valueText: formatCard(parsed).slice(0, -1), suitText: parsed.suit };
    } catch (error) {
      readErrors.push(`board card ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
      // Preserve the slot: dropping it would manufacture a different board/street.
      return { valueText: "", suitText: "" };
    }
  });
  const seatEvidence: Array<Record<string, unknown>> = [];
  const seats: RawTableInput["seats"] = [];
  for (let seatNumber = 1; seatNumber <= 10; seatNumber++) {
    const seat = unique(document, `.table-player-${seatNumber}`, `seat ${seatNumber}`, false);
    const classes = [...(seat?.classList ?? [])];
    const name = seat ? unique(seat, TABLE_SELECTORS.name, `seat ${seatNumber} name`, false) : null;
    const stack = seat ? unique(seat, TABLE_SELECTORS.stack, `seat ${seatNumber} stack`, false) : null;
    const stackContainer = seat ? unique(seat, TABLE_SELECTORS.stackContainer, `seat ${seatNumber} stack container`, false) : null;
    const bet = seat ? unique(seat, TABLE_SELECTORS.bet, `seat ${seatNumber} bet`, false) : null;
    const holeCards = [...(seat?.querySelectorAll(TABLE_SELECTORS.holeCard) ?? [])];
    // A missing stack must not erase a named player from occupancy/position counts.
    const isOccupied = name !== null;
    if (!name && (stack || classes.includes("you-player") || classes.includes("decision-current"))) {
      readErrors.push(`seat ${seatNumber}: player markers present but name element missing`);
    }
    seats.push({
      seatNumber, isOccupied, isYou: classes.includes("you-player"),
      playerNameText: name?.textContent ?? null, stackText: stack?.textContent ?? null,
      stackContainerText: stackContainer?.textContent ?? null,
      statusClasses: classes, holeCardClassLists: holeCards.map((card) => [...card.classList]),
      betValueText: bet?.textContent ?? null,
    });
    seatEvidence.push({
      seatNumber, seatMatches: document.querySelectorAll(`.table-player-${seatNumber}`).length,
      nameFound: name !== null, stackValueFound: stack !== null, betFound: bet !== null,
      stackContainerText: stackContainer?.textContent ?? null,
      seatText: seat?.textContent ?? null,
    });
  }
  const main = unique(document, TABLE_SELECTORS.mainPot, "main pot", true);
  const addOn = unique(document, TABLE_SELECTORS.addOnPot, "add-on pot", false);
  const blindTexts = [...document.querySelectorAll(TABLE_SELECTORS.blind)].map((el) => el.textContent);
  if (blindTexts.length !== 2) readErrors.push(`blind values: expected two, found ${blindTexts.length}`);
  const dealer = unique(document, TABLE_SELECTORS.dealer, "dealer marker", true);
  const dealerClasses = [...(dealer?.classList ?? [])];
  const dealerTokens = dealerClasses.filter((cls) => cls.startsWith("dealer-position-"));
  const token = dealerTokens.length === 1 ? dealerTokens[0] : undefined;
  const dealerSeatNumber = token && /^dealer-position-(?:[1-9]|10)$/.test(token) ? Number(token.slice("dealer-position-".length)) : null;
  if (dealerSeatNumber === null) readErrors.push("dealer seat number unreadable or ambiguous");
  const raw: RawTableInput = {
    seats, boardCards, potMainValueText: main?.textContent ?? null, potTotalValueText: addOn?.textContent ?? null,
  };
  const context: LiveReadContext = { blindTexts, dealerSeatNumber, readErrors };
  return {
    raw, context,
    raiseControl: readRaiseControl(),
    evidence: {
      selectors: TABLE_SELECTORS, seatEvidence, dealerClasses, boardCardEvidence,
      boardContainerFound: board !== null, boardCardElementCount: boardCards.length,
      mainPotFound: main !== null, addOnPotFound: addOn !== null,
      potContainerText: document.querySelector(TABLE_SELECTORS.potContainer)?.textContent ?? null,
    },
  };
}

export type LiveTableRead = ReturnType<typeof readLiveTable>;
