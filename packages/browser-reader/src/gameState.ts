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
  /** Raw text of this seat's current-street bet indicator, e.g. "2", "check", "call", null if nothing shown. */
  betValueText: string | null;
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
  /** Amount currently bet this street, or null if it's not a numeric bet (e.g. "check"/"call" text labels, or no action yet). */
  currentBet: number | null;
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

/**
 * Parses a seat's bet-value text into a numeric current-street bet, or
 * null if it's not a number (e.g. PokerNow shows action-word text like
 * "check" or "call" in the same element rather than always a chip
 * amount -- those aren't bet sizes and should not be misread as 0 or
 * NaN).
 */
function parseBetValue(betValueText: string | null): number | null {
  if (betValueText === null) return null;
  const trimmed = betValueText.trim();
  if (trimmed.length === 0) return null;
  const cleaned = trimmed.replace(/,/g, "");
  const value = Number(cleaned);
  return Number.isNaN(value) ? null : value;
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
      currentBet: null,
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
    currentBet: parseBetValue(raw.betValueText),
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

/**
 * Computes the amount hero needs to call: the largest current bet among
 * still-active (occupied, non-folded) opponents, minus whatever hero has
 * already put in this street. Returns 0 if hero is already matched or
 * ahead (e.g. facing a check), never negative.
 */
export function calculateAmountToCall(state: PokerGameState): number {
  const hero = state.seats.find((s) => s.isYou);
  const heroBet = hero?.currentBet ?? 0;

  const highestOpponentBet = state.seats
    .filter((s) => s.isOccupied && !s.isYou && !s.isFolded && s.currentBet !== null)
    .reduce((max, s) => Math.max(max, s.currentBet!), 0);

  return Math.max(0, highestOpponentBet - heroBet);
}