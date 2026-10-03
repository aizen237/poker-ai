/**
 * Parses a chips value from PokerNow's nested text pattern, e.g.
 * <span class="chips-value"><span class="normal-value">585</span></span>.
 * This exact pattern was confirmed live for both pot size and player
 * stack -- same nested chips-value/normal-value text structure in both
 * places, so one function covers both use cases.
 */
export function parseChipsValueText(normalValueText: string): number {
  const text = normalValueText.trim();
  const cleaned = text.replace(/,/g, "");
  if (cleaned.length === 0) {
    throw new Error(`Chips value text is empty (expected a number, got an empty string)`);
  }
  const value = Number(cleaned);
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text) || !Number.isFinite(value) || value < 0) {
    throw new Error(`Unrecognized chips value text: "${normalValueText}"`);
  }
  return value;
}

export interface PotSizeInfo {
  /** Number displayed under main-value. Its betting semantics are unverified. */
  mainValue: number;
  /** Number displayed under add-on-container, when present. Not a verified total. */
  totalValue: number | null;
}

/**
 * Combines a pot's main-value and (optional) add-on/total text into a
 * single result. Confirmed live: PokerNow shows two numbers -- a
 * "main-value" and an add-on. Neither their relationship nor which value
 * belongs in pot-odds math is established by these captured strings.
 * Preserve both independently until a live hand confirms their meaning.
 */
export function parsePotSizeInfo(mainValueText: string, totalValueText: string | null): PotSizeInfo {
  return {
    mainValue: parseChipsValueText(mainValueText),
    totalValue: totalValueText !== null ? parseChipsValueText(totalValueText) : null,
  };
}

export interface PlayerNameAndStack {
  name: string;
  /**
   * null specifically when PokerNow shows the literal text "All In"
   * instead of a number -- confirmed live: a player's stack display
   * itself (not just their bet amount) can read "All In" once they've
   * committed everything. The exact amount they had isn't recoverable
   * from this text, so null is the honest answer rather than guessing.
   * CRITICAL: previously this threw here, which propagated uncaught all
   * the way up through assembleGameState's try/catch, silently failing
   * the ENTIRE state read for that poll tick whenever any seat showed
   * this text -- not just losing this one field.
   */
  stack: number | null;
}

const ALL_IN_STACK_TEXT = "all in";

export function isAllInStackText(text: string | null): boolean {
  return text?.trim().replace(/\s+/g, " ").toLowerCase() === ALL_IN_STACK_TEXT;
}

/** Reads the existing first-SB/second-BB selector order without defaults. */
export function parseBlindValues(texts: readonly (string | null)[]): { smallBlind: number | null; bigBlind: number | null } {
  const parse = (text: string | null | undefined): number | null => {
    if (text == null) return null;
    try {
      const value = parseChipsValueText(text);
      return value > 0 ? value : null;
    } catch {
      return null;
    }
  };
  return { smallBlind: parse(texts[0]), bigBlind: parse(texts[1]) };
}

/**
 * Parses a player's name + stack from their infos-ctn-container text
 * content. Confirmed live: name is plain text inside an <a> tag, stack
 * uses the same chips-value/normal-value pattern as pot size -- except
 * when the player is all-in, where PokerNow shows "All In" as literal
 * text in place of the number (see the stack field's doc comment).
 */
export function parsePlayerNameAndStack(nameText: string, stackText: string): PlayerNameAndStack {
  const name = nameText.trim();
  if (name.length === 0) {
    throw new Error("Player name text is empty");
  }
  if (isAllInStackText(stackText)) {
    return { name, stack: null };
  }
  return {
    name,
    stack: parseChipsValueText(stackText),
  };
}
