import { parseChipsValueText } from "./tableInfoParsing.js";
import type { RawTableInput } from "./gameState.js";

/** Display totals and hero-contestable EV pot are distinct quantities. */
export interface PotProvenance {
  unit: "chips";
  mainPot: number | null;
  /** Read from add-on-container; total meaning confirmed only in captured situations. */
  displayedTotalPot: number | null;
  decisionPot: number | null;
  decisionPotSource: string | null;
  isPotSemanticsVerified: boolean;
}

/** Preserve independently readable values even if another field invalidates the read.
 * Live evidence confirms total = collected + street contributions in observed
 * cases. It does not establish hero eligibility, returns or rake for a new hand.
 */
export function readPotProvenance(raw: Pick<RawTableInput, "potMainValueText" | "potTotalValueText">): PotProvenance {
  const parse = (text: string | null): number | null => {
    if (text === null) return null;
    try { return parseChipsValueText(text); } catch { return null; }
  };
  return {
    unit: "chips", mainPot: parse(raw.potMainValueText), displayedTotalPot: parse(raw.potTotalValueText),
    decisionPot: null, decisionPotSource: null, isPotSemanticsVerified: false,
  };
}
