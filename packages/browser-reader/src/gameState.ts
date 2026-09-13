import type { Card } from "@poker-ai/shared";
import { parseBoardCardFromText, parseHoleCardFromClassList } from "./cardParsing.js";
import { parsePlayerNameAndStack, parsePotSizeInfo } from "./tableInfoParsing.js";

export interface RawSeatInput {
  seatNumber: number;
  isOccupied: boolean;
  isYou: boolean;
  playerNameText: string | null;
  stackText: string | null;
  /** Raw class-list fragments observed on the seat div, e.g. ["fold"], ["decision-current"], ["offline"]. */
  statusClasses: string[];
  /** One class-list array per hole card element found (0, 1, or 2 -- matches what's actually in the DOM). */
  holeCardClassLists: string[][];
}

export interface RawBoardCardInput {
  valueText: string;
  suitText: string;
}

export interface RawTableInput {
  seats: RawSeatInput[];
  boardCards: RawBoardCardInput[];
  potMainValueText: string;
  potTotalValueText: string | null;
}

export interface SeatState {
  seatNumber: number;
  isOccupied: boolean;
  isYou: boolean;
  playerName: string | null;
  stack: number | null;
  isFolded: boolean;
  isCurrentToAct: boolean;
  isOffline: boolean;
  /** Only populated for you.player (own hand) or a revealed showdown -- otherwise empty, per Rule 5: we never guess at hidden cards. */
  holeCards: Card[];
}

export interface PokerGameState {
  seats: SeatState[];
  board: Card[];
  potMainValue: number;
  potTotalValue: number | null;
  street: "preflop" | "flop" | "turn" | "river";
}

function deriveStreet(boardCardCount: number): PokerGameState["street"] {
  if (boardCardCount === 0) return "preflop";
  if (boardCardCount === 3) return "flop";
  if (boardCardCount === 4) return "turn";
  if (boardCardCount === 5) return "river";
  throw new Error(`Unexpected board card count: ${boardCardCount} (expected 0, 3, 4, or 5)`);
}

function assembleSeat(raw: RawSeatInput): SeatState {
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
    };
  }

  const isFolded = raw.statusClasses.includes("fold");
  const isCurrentToAct = raw.statusClasses.includes("decision-current");
  const isOffline = raw.statusClasses.includes("offline");

  let playerName: string | null = null;
  let stack: number | null = null;
  if (raw.playerNameText !== null && raw.stackText !== null) {
    const parsed = parsePlayerNameAndStack(raw.playerNameText, raw.stackText);
    playerName = parsed.name;
    stack = parsed.stack;
  }

  // Per Rule 5: only include hole cards we could actually parse (i.e.
  // genuinely flipped/visible). parseHoleCardFromClassList already
  // returns null for hidden cards -- we filter those out rather than
  // guess or fabricate a placeholder.
  const holeCards: Card[] = raw.holeCardClassLists
    .map(parseHoleCardFromClassList)
    .filter((c): c is Card => c !== null);

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
  };
}

/**
 * Assembles a full PokerGameState from already-extracted raw DOM values.
 * This function does NOT touch the DOM itself -- it's pure, testable
 * logic; the actual document.querySelector-style extraction into
 * RawTableInput is the browser extension's job (a separate, later step).
 */
export function assembleGameState(raw: RawTableInput): PokerGameState {
  const board = raw.boardCards.map((c) => parseBoardCardFromText(c.valueText, c.suitText));
  const potInfo = parsePotSizeInfo(raw.potMainValueText, raw.potTotalValueText);
  const seats = raw.seats.map(assembleSeat);

  return {
    seats,
    board,
    potMainValue: potInfo.mainValue,
    potTotalValue: potInfo.totalValue,
    street: deriveStreet(board.length),
  };
}