import { rangeFromList, type Range } from "./range.js";

export type Position = "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB";

/**
 * Standard 6-max deep-stack (100BB+) raise-first-in opening ranges.
 * These are widely-taught reference ranges, not a derived or "solved"
 * result -- different training resources draw slightly different
 * boundaries. Treat as a reasonable, documented starting point (per the
 * original spec: "the exact range model can start simple").
 *
 * IMPORTANT: these are DEEP STACK ranges. As effective stack depth
 * shrinks in an MTT (this project's actual use case), correct play
 * shifts toward push/fold, which these ranges do NOT model. A
 * stack-depth-aware range layer is a near-term follow-up, not covered
 * here.
 *
 * BB has no entry: the big blind doesn't "open" -- it defends/responds
 * to another player's raise, which is a different range concept.
 */
const OPENING_RANGE_HANDS: Record<Exclude<Position, "BB">, string[]> = {
  UTG: [
    "77", "88", "99", "TT", "JJ", "QQ", "KK", "AA",
    "A9s", "ATs", "AJs", "AQs", "AKs",
    "KTs", "KJs", "KQs",
    "QTs", "QJs",
    "JTs",
    "T9s",
    "ATo", "AJo", "AQo", "AKo",
    "KQo",
  ],
  HJ: [
    "66", "77", "88", "99", "TT", "JJ", "QQ", "KK", "AA",
    "A7s", "A8s", "A9s", "ATs", "AJs", "AQs", "AKs",
    "K9s", "KTs", "KJs", "KQs",
    "Q9s", "QTs", "QJs",
    "J9s", "JTs",
    "T9s",
    "98s",
    "ATo", "AJo", "AQo", "AKo",
    "KJo", "KQo",
    "QJo",
  ],
  CO: [
    "22", "33", "44", "55", "66", "77", "88", "99", "TT", "JJ", "QQ", "KK", "AA",
    "A2s", "A3s", "A4s", "A5s", "A6s", "A7s", "A8s", "A9s", "ATs", "AJs", "AQs", "AKs",
    "K7s", "K8s", "K9s", "KTs", "KJs", "KQs",
    "Q8s", "Q9s", "QTs", "QJs",
    "J8s", "J9s", "JTs",
    "T8s", "T9s",
    "97s", "98s",
    "87s",
    "76s",
    "A8o", "A9o", "ATo", "AJo", "AQo", "AKo",
    "K9o", "KTo", "KJo", "KQo",
    "QTo", "QJo",
    "JTo",
  ],
  BTN: [
    "22", "33", "44", "55", "66", "77", "88", "99", "TT", "JJ", "QQ", "KK", "AA",
    "A2s", "A3s", "A4s", "A5s", "A6s", "A7s", "A8s", "A9s", "ATs", "AJs", "AQs", "AKs",
    "K2s", "K3s", "K4s", "K5s", "K6s", "K7s", "K8s", "K9s", "KTs", "KJs", "KQs",
    "Q4s", "Q5s", "Q6s", "Q7s", "Q8s", "Q9s", "QTs", "QJs",
    "J6s", "J7s", "J8s", "J9s", "JTs",
    "T6s", "T7s", "T8s", "T9s",
    "95s", "96s", "97s", "98s",
    "85s", "86s", "87s",
    "75s", "76s",
    "64s", "65s",
    "54s",
    "A2o", "A3o", "A4o", "A5o", "A6o", "A7o", "A8o", "A9o", "ATo", "AJo", "AQo", "AKo",
    "K7o", "K8o", "K9o", "KTo", "KJo", "KQo",
    "Q9o", "QTo", "QJo",
    "J9o", "JTo",
    "T9o",
  ],
  SB: [
    "22", "33", "44", "55", "66", "77", "88", "99", "TT", "JJ", "QQ", "KK", "AA",
    "A2s", "A3s", "A4s", "A5s", "A6s", "A7s", "A8s", "A9s", "ATs", "AJs", "AQs", "AKs",
    "K5s", "K6s", "K7s", "K8s", "K9s", "KTs", "KJs", "KQs",
    "Q8s", "Q9s", "QTs", "QJs",
    "J8s", "J9s", "JTs",
    "T8s", "T9s",
    "97s", "98s",
    "87s",
    "76s",
    "65s",
    "A7o", "A8o", "A9o", "ATo", "AJo", "AQo", "AKo",
    "K9o", "KTo", "KJo", "KQo",
    "QTo", "QJo",
    "JTo",
  ],
};

/** Returns the standard opening range for a position, or an empty range for BB (see note above). */
export function getOpeningRange(position: Position): Range {
  if (position === "BB") return rangeFromList([]);
  return rangeFromList(OPENING_RANGE_HANDS[position]);
}

export const ALL_POSITIONS: Position[] = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];