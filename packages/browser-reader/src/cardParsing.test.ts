import { describe, expect, it } from "vitest";
import { parseBoardCardFromText, parseHoleCardFromClassList } from "./cardParsing.js";

describe("parseHoleCardFromClassList — real captured PokerNow examples", () => {
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