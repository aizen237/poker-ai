import type { Card } from "@poker-ai/shared";
import { parseBoardCardFromText, parseHoleCardFromClassList } from "./cardParsing.js";
import { isAllInStackText, parseChipsValueText, parsePlayerNameAndStack, parsePotSizeInfo } from "./tableInfoParsing.js";

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
  potMainValueText: string | null;
  potTotalValueText: string | null;
}

export interface SeatState {
  seatNumber: number;
  isOccupied: boolean;
  isYou: boolean;
  playerName: string | null;
  stack: number | null;
  /** Literal All In stack label, not an inferred numeric zero. */
  isAllIn?: boolean;
  /** A present bet label could not be interpreted as a contribution or check. */
  betReadError?: boolean;
  isFolded: boolean;
  isCurrentToAct: boolean;
  isOffline: boolean;
  /** Only populated for you.player (own hand) or a revealed showdown -- otherwise empty, per Rule 5: we never guess at hidden cards. */
  holeCards: Card[];
  /** Amount currently bet this street, or null if it's not a numeric bet (e.g. "check"/"call" text labels, or no action yet). */
  currentBet: number | null;
  /**
   * True when PokerNow's bet-value element for this seat literally reads
   * "check" -- confirmed live: the same element that normally shows a
   * numeric bet amount instead shows the class "check" and the text
   * "check" when a player checks. Previously indistinguishable from "no
   * action yet this street" (both parsed to currentBet: null); this is
   * the first time a genuine check can be told apart from that.
   */
  isChecking: boolean;
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
  try {
    return parseChipsValueText(trimmed);
  } catch {
    return null;
  }
}

function isCheckText(betValueText: string | null): boolean {
  return betValueText !== null && betValueText.trim().toLowerCase() === "check";
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
      isChecking: false,
    };
  }

  const isFolded = raw.statusClasses.includes("fold");
  const isCurrentToAct = raw.statusClasses.includes("decision-current");
  const isOffline = raw.statusClasses.includes("offline");

  const playerName = raw.playerNameText?.trim() || null;
  let stack: number | null = null;
  if (playerName !== null && raw.stackText !== null) {
    try {
      stack = parsePlayerNameAndStack(playerName, raw.stackText).stack;
    } catch {
      // Keep an occupied seat and its identity even when the stack is unreadable.
      stack = null;
    }
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
    isAllIn: isAllInStackText(raw.stackText),
    betReadError: raw.betValueText !== null && parseBetValue(raw.betValueText) === null && !isCheckText(raw.betValueText),
    isFolded,
    isCurrentToAct,
    isOffline,
    holeCards,
    currentBet: parseBetValue(raw.betValueText),
    isChecking: isCheckText(raw.betValueText),
  };
}

/**
 * Assembles a full PokerGameState from already-extracted raw DOM values.
 * This function does NOT touch the DOM itself -- it's pure, testable
 * logic; the actual document.querySelector-style extraction into
 * RawTableInput is the browser extension's job (a separate, later step).
 */
export function assembleGameState(raw: RawTableInput): PokerGameState {
  if (raw.potMainValueText === null) throw new Error("Main pot element is missing");
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
 * ahead (e.g. facing a check), never negative. An absent indicator or an
 * explicit check retains the existing zero-contribution interpretation;
 * confirm that interpretation against the live call button. Other action
 * labels (call/raise/All In) do not reveal a numeric contribution.
 * Returns null when hero or any relevant contribution is unreadable.
 * This is the uncapped wager gap; it is not capped at hero's stack.
 */
export function calculateAmountToCall(state: PokerGameState): number | null {
  const heroes = state.seats.filter((s) => s.isOccupied && s.isYou);
  const hero = heroes[0];
  if (heroes.length !== 1 || !hero || hero.isFolded) return null;
  const relevantSeats = state.seats.filter((s) => s.isOccupied && !s.isFolded);
  if (relevantSeats.some((s) => s.betReadError || (s.currentBet !== null && (!Number.isFinite(s.currentBet) || s.currentBet < 0)))) return null;
  const heroBet = hero?.currentBet ?? 0;

  const highestOpponentBet = state.seats
    .filter((s) => s.isOccupied && !s.isYou && !s.isFolded && s.currentBet !== null)
    .reduce((max, s) => Math.max(max, s.currentBet!), 0);

  return Math.max(0, highestOpponentBet - heroBet);
}
