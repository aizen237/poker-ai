import { describe, expect, it } from "vitest";
import { parseBoardCardFromText, parseBoardCardFromEvidence, parseHoleCardFromClassList } from "./cardParsing.js";

describe("parseHoleCardFromClassList — real captured PokerNow examples", () => {
  it("ignores inherited object properties in card classes", () => {
    expect(parseHoleCardFromClassList(["flipped", "constructor"])).toBeNull();
    expect(parseHoleCardFromClassList(["flipped", "toString", "card-h", "card-s-Q"])).toEqual({ rank: 12, suit: "h" });
  });
  it("does not guess when visible card classes contain conflicting ranks or suits", () => {
    expect(parseHoleCardFromClassList(["flipped", "card-h", "card-s", "card-s-Q"])).toBeNull();
    expect(parseHoleCardFromClassList(["flipped", "card-h", "card-s-Q", "card-s-T"])).toBeNull();
  });
  it("parses 5 of spades (real capture: card-container card-s   card-s-5 flipped card-p1)", () => {
    const classList = ["card-container", "card-s", "card-s-5", "flipped", "card-p1", "med", "sub-suit"];
    expect(parseHoleCardFromClassList(classList)).toEqual({ rank: 5, suit: "s" });
  });

  it("parses 4 of hearts (real capture: card-container card-h   card-s-4 flipped card-p2)", () => {
    const classList = ["card-container", "card-h", "card-s-4", "flipped", "card-p2", "med", "sub-suit"];
    expect(parseHoleCardFromClassList(classList)).toEqual({ rank: 4, suit: "h" });
  });

  it("returns null for a card that is not flipped (an opponent's hidden card)", () => {
    const classList = ["card-container", "card-p1", "med", "sub-suit"];
    expect(parseHoleCardFromClassList(classList)).toBeNull();
  });

  it("returns null if flipped is present but suit/rank classes are missing (unexpected markup)", () => {
    const classList = ["card-container", "flipped", "card-p1"];
    expect(parseHoleCardFromClassList(classList)).toBeNull();
  });

  it("parses all four suits correctly", () => {
    expect(parseHoleCardFromClassList(["card-s", "card-s-K", "flipped"])).toEqual({ rank: 13, suit: "s" });
    expect(parseHoleCardFromClassList(["card-h", "card-s-K", "flipped"])).toEqual({ rank: 13, suit: "h" });
    expect(parseHoleCardFromClassList(["card-d", "card-s-K", "flipped"])).toEqual({ rank: 13, suit: "d" });
    expect(parseHoleCardFromClassList(["card-c", "card-s-K", "flipped"])).toEqual({ rank: 13, suit: "c" });
  });

  it("parses face cards and ace correctly (T, J, Q, K, A)", () => {
    expect(parseHoleCardFromClassList(["card-s", "card-s-T", "flipped"])).toEqual({ rank: 10, suit: "s" });
    expect(parseHoleCardFromClassList(["card-s", "card-s-J", "flipped"])).toEqual({ rank: 11, suit: "s" });
    expect(parseHoleCardFromClassList(["card-s", "card-s-Q", "flipped"])).toEqual({ rank: 12, suit: "s" });
    expect(parseHoleCardFromClassList(["card-s", "card-s-A", "flipped"])).toEqual({ rank: 14, suit: "s" });
  });
});

describe("parseBoardCardFromText — real captured PokerNow examples", () => {
  it("parses 10 of hearts (real capture: value=10, suit=h)", () => {
    expect(parseBoardCardFromText("10", "h")).toEqual({ rank: 10, suit: "h" });
  });

  it("parses 5 of hearts (real capture: value=5, suit=h)", () => {
    expect(parseBoardCardFromText("5", "h")).toEqual({ rank: 5, suit: "h" });
  });

  it("parses 10 of spades (real capture: value=10, suit=s)", () => {
    expect(parseBoardCardFromText("10", "s")).toEqual({ rank: 10, suit: "s" });
  });

  it("parses jack of diamonds (real capture: value=J, suit=d)", () => {
    expect(parseBoardCardFromText("J", "d")).toEqual({ rank: 11, suit: "d" });
  });

  it("is case-insensitive and trims whitespace on suit text", () => {
    expect(parseBoardCardFromText(" 10 ", " H ")).toEqual({ rank: 10, suit: "h" });
  });

  it("throws on unrecognized value text", () => {
    expect(() => parseBoardCardFromText("XX", "h")).toThrow();
  });

  it("throws on unrecognized suit text", () => {
    expect(() => parseBoardCardFromText("10", "x")).toThrow();
  });
});

describe("board evidence normalization", () => {
  it.each([["s", "\u2660"], ["h", "\u2665"], ["d", "\u2666"], ["c", "\u2663"]])("normalizes %s suit letters/symbols and repeated matching signals", (suit, symbol) => {
    expect(parseBoardCardFromEvidence({ classList: [], valueTexts: [" 10 ", "T"], suitTexts: [suit!, symbol! + "\uFE0F"] }))
      .toEqual({ rank: 10, suit });
  });
  it("rejects conflicting duplicates instead of taking the first one", () => {
    expect(() => parseBoardCardFromEvidence({ classList: [], valueTexts: ["6"], suitTexts: ["h", "s"] })).toThrow("consistent");
    expect(() => parseBoardCardFromEvidence({ classList: [], valueTexts: ["6", "9"], suitTexts: ["h"] })).toThrow("consistent");
  });
  it("rejects conflicting card classes even with matching text", () => {
    expect(() => parseBoardCardFromEvidence({ classList: ["flipped", "card-h", "card-d", "card-s-6"], valueTexts: ["6"], suitTexts: ["h"] })).toThrow("consistent");
  });
});
