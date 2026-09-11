import { type Card, RANKS, SUITS } from "./card.js";

/**
 * A minimal PRNG (mulberry32) so shuffles can be seeded for deterministic
 * tests and replay verification. Never use this for anything requiring
 * cryptographic randomness — it is not that. Poker hand simulation only
 * needs statistical randomness, not unpredictability against an adversary,
 * since the deck contents are already known/fixed inputs at simulation time.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fullDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ rank, suit });
    }
  }
  return cards;
}

/** Fisher-Yates shuffle. Mutates and returns the input array. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp!;
  }
  return items;
}

export class Deck {
  private cards: Card[];

  constructor(rng: () => number = Math.random, exclude: readonly Card[] = []) {
    const excludeIds = new Set(exclude.map((c) => `${c.rank}${c.suit}`));
    this.cards = shuffle(
      fullDeck().filter((c) => !excludeIds.has(`${c.rank}${c.suit}`)),
      rng,
    );
  }

  /** Number of cards remaining. */
  get remaining(): number {
    return this.cards.length;
  }

  draw(): Card {
    const card = this.cards.pop();
    if (!card) throw new Error("Cannot draw from an empty deck");
    return card;
  }

  drawMany(n: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < n; i++) drawn.push(this.draw());
    return drawn;
  }
}