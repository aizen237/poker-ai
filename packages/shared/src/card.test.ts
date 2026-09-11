import { describe, expect, it } from "vitest";
import { cardFromId, cardId, cardsEqual, formatCard, parseCard, parseCards } from "./card.js";
import { Deck, fullDeck, mulberry32 } from "./deck.js";

describe("card parsing/formatting", () => {
  it("round-trips every rank and suit", () => {
    for (const str of ["2c", "3d", "4h", "5s", "6c", "7d", "8h", "9s", "Tc", "Jd", "Qh", "Ks", "Ah"]) {
      const card = parseCard(str);
      expect(formatCard(card)).toBe(str[0]!.toUpperCase() === "T" ? "T" + str[1] : str[0]! + str[1]);
    }
  });

  it("accepts lowercase rank chars for ten/jack/queen/king/ace", () => {
    expect(parseCard("th")).toEqual({ rank: 10, suit: "h" });
    expect(parseCard("as")).toEqual({ rank: 14, suit: "s" });
  });

  it("throws on malformed input rather than guessing", () => {
    expect(() => parseCard("Xh")).toThrow();
    expect(() => parseCard("Az")).toThrow();
    expect(() => parseCard("A")).toThrow();
    expect(() => parseCard("Ahh")).toThrow();
  });

  it("parses a space-separated hand", () => {
    const hand = parseCards("As Kd 7c");
    expect(hand).toHaveLength(3);
    expect(cardsEqual(hand[0]!, { rank: 14, suit: "s" })).toBe(true);
  });

  it("cardId/cardFromId round-trip for all 52 cards", () => {
    for (const card of fullDeck()) {
      const id = cardId(card);
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThanOrEqual(51);
      expect(cardsEqual(cardFromId(id), card)).toBe(true);
    }
    const ids = new Set(fullDeck().map(cardId));
    expect(ids.size).toBe(52);
  });
});

describe("Deck", () => {
  it("contains exactly 52 unique cards by default", () => {
    const deck = new Deck(mulberry32(42));
    expect(deck.remaining).toBe(52);
    const drawn = deck.drawMany(52);
    const unique = new Set(drawn.map((c) => `${c.rank}${c.suit}`));
    expect(unique.size).toBe(52);
    expect(deck.remaining).toBe(0);
  });

  it("excludes specified cards (e.g. hero hole cards / known board)", () => {
    const excluded = parseCards("As Kd");
    const deck = new Deck(mulberry32(1), excluded);
    expect(deck.remaining).toBe(50);
    const drawn = deck.drawMany(50);
    for (const c of drawn) {
      expect(excluded.some((e) => cardsEqual(e, c))).toBe(false);
    }
  });

  it("is deterministic given the same seed", () => {
    const a = new Deck(mulberry32(7)).drawMany(52);
    const b = new Deck(mulberry32(7)).drawMany(52);
    expect(a).toEqual(b);
  });

  it("throws when drawing from an empty deck", () => {
    const deck = new Deck(mulberry32(3));
    deck.drawMany(52);
    expect(() => deck.draw()).toThrow();
  });
});