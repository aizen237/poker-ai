/**
 * Parses a chips value from PokerNow's nested text pattern, e.g.
 * <span class="chips-value"><span class="normal-value">585</span></span>.
 * This exact pattern was confirmed live for both pot size and player
 * stack -- same nested chips-value/normal-value text structure in both
 * places, so one function covers both use cases.
 */
export function parseChipsValueText(normalValueText: string): number {
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

export interface PotSizeInfo {
  /** The current betting round's pot (observed as 0 between hands/streets with no bets yet). */
  mainValue: number;
  /** The running total pot including carryover/antes, when present. */
  totalValue: number | null;
}

/**
 * Combines a pot's main-value and (optional) add-on/total text into a
 * single result. Confirmed live: PokerNow shows two numbers -- a
 * "main-value" (current street's pot) and a "total" add-on -- worth
 * revisiting once we watch a real hand through actual betting to be
 * fully sure which number belongs in pot-odds math (flagged honestly,
 * not resolved with certainty from static inspection alone).
 */
export function parsePotSizeInfo(mainValueText: string, totalValueText: string | null): PotSizeInfo {
  return {
    mainValue: parseChipsValueText(mainValueText),
    totalValue: totalValueText !== null ? parseChipsValueText(totalValueText) : null,
  };
}

export interface PlayerNameAndStack {
  name: string;
  stack: number;
}

/**
 * Parses a player's name + stack from their infos-ctn-container text
 * content. Confirmed live: name is plain text inside an <a> tag, stack
 * uses the same chips-value/normal-value pattern as pot size.
 */
export function parsePlayerNameAndStack(nameText: string, stackText: string): PlayerNameAndStack {
  const name = nameText.trim();
  if (name.length === 0) {
    throw new Error("Player name text is empty");
  }
  return {
    name,
    stack: parseChipsValueText(stackText),
  };
}