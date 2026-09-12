import { RANKS, SUITS, type Card, type Rank, type Suit } from "@poker-ai/shared";

/**
 * A "hand type" is one of the 169 strategically distinct starting hands
 * in Hold'em: 13 pocket pairs (AA, KK, ... 22), 78 suited combos (AKs,
 * AQs, ... 32s), and 78 offsuit combos (AKo, AQo, ... 32o).
 * 13 + 78 + 78 = 169.
 */
export interface HandType {
  highRank: Rank;
  lowRank: Rank;
  /** Irrelevant (always false) when highRank === lowRank (a pocket pair). */
  suited: boolean;
}

const RANK_TO_CHAR: Record<Rank, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9",
  10: "T", 11: "J", 12: "Q", 13: "K", 14: "A",
};
const CHAR_TO_RANK: Record<string, Rank> = Object.fromEntries(
  RANKS.map((r) => [RANK_TO_CHAR[r], r]),
) as Record<string, Rank>;

/** Canonical notation, e.g. "AKs", "77", "T9o". Always high rank first. */
export function formatHandType(hand: HandType): string {
  const high = RANK_TO_CHAR[hand.highRank];
  const low = RANK_TO_CHAR[hand.lowRank];
  if (hand.highRank === hand.lowRank) return `${high}${low}`;
  return `${high}${low}${hand.suited ? "s" : "o"}`;
}

/** Parses "AKs", "77", "T9o" (case-insensitive) into a HandType. */
export function parseHandType(input: string): HandType {
  const trimmed = input.trim();
  if (trimmed.length === 2) {
    const rank = CHAR_TO_RANK[trimmed[0]!.toUpperCase()];
    const rank2 = CHAR_TO_RANK[trimmed[1]!.toUpperCase()];
    if (rank === undefined || rank2 === undefined || rank !== rank2) {
      throw new Error(`Invalid hand type "${input}": expected a pocket pair like "77"`);
    }
    return { highRank: rank, lowRank: rank, suited: false };
  }
  if (trimmed.length === 3) {
    const r1 = CHAR_TO_RANK[trimmed[0]!.toUpperCase()];
    const r2 = CHAR_TO_RANK[trimmed[1]!.toUpperCase()];
    const suitedChar = trimmed[2]!.toLowerCase();
    if (r1 === undefined || r2 === undefined || r1 === r2) {
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

/** All 169 distinct starting hand types. */
export function allHandTypes(): HandType[] {
  const types: HandType[] = [];
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = i; j < RANKS.length; j++) {
      const highRank = RANKS[j]!;
      const lowRank = RANKS[i]!;
      if (highRank === lowRank) {
        types.push({ highRank, lowRank, suited: false }); // pocket pair
      } else {
        types.push({ highRank, lowRank, suited: true });
        types.push({ highRank, lowRank, suited: false });
      }
    }
  }
  return types;
}

/**
 * Expands a HandType into every actual 2-card Card combination it
 * represents -- 6 combos for a pocket pair, 4 for suited, 12 for offsuit.
 */
export function expandHandType(hand: HandType): [Card, Card][] {
  const combos: [Card, Card][] = [];

  if (hand.highRank === hand.lowRank) {
    // Pocket pair: choose 2 of the 4 suits, C(4,2) = 6 combos.
    for (let i = 0; i < SUITS.length; i++) {
      for (let j = i + 1; j < SUITS.length; j++) {
        combos.push([
          { rank: hand.highRank, suit: SUITS[i]! },
          { rank: hand.lowRank, suit: SUITS[j]! },
        ]);
      }
    }
    return combos;
  }

  if (hand.suited) {
    // Same suit for both -- 4 combos, one per suit.
    for (const suit of SUITS) {
      combos.push([
        { rank: hand.highRank, suit },
        { rank: hand.lowRank, suit },
      ]);
    }
    return combos;
  }

  // Offsuit: every suit pairing except matching suits -- 4*4 - 4 = 12 combos.
  for (const suitHigh of SUITS) {
    for (const suitLow of SUITS) {
      if (suitHigh === suitLow) continue;
      combos.push([
        { rank: hand.highRank, suit: suitHigh },
        { rank: hand.lowRank, suit: suitLow },
      ]);
    }
  }
  return combos;
}