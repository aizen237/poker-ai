import { describe, expect, it } from "vitest";
import {
  allHandTypes,
  expandHandType,
  formatHandType,
  parseHandType,
} from "./handNotation.js";

describe("parseHandType / formatHandType", () => {
  it("round-trips a pocket pair", () => {
    const hand = parseHandType("77");
    expect(hand).toEqual({ highRank: 7, lowRank: 7, suited: false });
    expect(formatHandType(hand)).toBe("77");
  });

  it("round-trips a suited hand, always high rank first", () => {
    const hand = parseHandType("AKs");
    expect(hand).toEqual({ highRank: 14, lowRank: 13, suited: true });
    expect(formatHandType(hand)).toBe("AKs");
  });

  it("normalizes rank order regardless of input order", () => {
    const hand = parseHandType("KAs");
    expect(hand).toEqual({ highRank: 14, lowRank: 13, suited: true });
  });

  it("round-trips an offsuit hand", () => {
    const hand = parseHandType("T9o");
    expect(hand).toEqual({ highRank: 10, lowRank: 9, suited: false });
    expect(formatHandType(hand)).toBe("T9o");
  });

  it("is case-insensitive", () => {
    expect(parseHandType("akS")).toEqual({ highRank: 14, lowRank: 13, suited: true });
  });

  it("throws on invalid input", () => {
    expect(() => parseHandType("AA s")).toThrow(); // wrong length
    expect(() => parseHandType("AKx")).toThrow(); // bad suited/offsuit char
    expect(() => parseHandType("A7")).toThrow(); // 2 chars but not matching ranks
    expect(() => parseHandType("XYs")).toThrow(); // invalid ranks
  });
});

describe("allHandTypes", () => {
  it("produces exactly 169 distinct hand types", () => {
    expect(allHandTypes().length).toBe(169);
  });

  it("produces exactly 13 pocket pairs", () => {
    const pairs = allHandTypes().filter((h) => h.highRank === h.lowRank);
    expect(pairs.length).toBe(13);
  });

  it("produces exactly 78 suited and 78 offsuit combos", () => {
    const nonPairs = allHandTypes().filter((h) => h.highRank !== h.lowRank);
    const suited = nonPairs.filter((h) => h.suited);
    const offsuit = nonPairs.filter((h) => !h.suited);
    expect(suited.length).toBe(78);
    expect(offsuit.length).toBe(78);
  });

  it("has no duplicate hand types", () => {
    const names = allHandTypes().map(formatHandType);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("expandHandType", () => {
  it("a pocket pair expands to exactly 6 combos", () => {
    expect(expandHandType(parseHandType("AA")).length).toBe(6);
  });

  it("a suited hand expands to exactly 4 combos", () => {
    expect(expandHandType(parseHandType("AKs")).length).toBe(4);
  });

  it("an offsuit hand expands to exactly 12 combos", () => {
    expect(expandHandType(parseHandType("AKo")).length).toBe(12);
  });

  it("suited combos always share a suit; offsuit combos never do", () => {
    for (const combo of expandHandType(parseHandType("AKs"))) {
      expect(combo[0].suit).toBe(combo[1].suit);
    }
    for (const combo of expandHandType(parseHandType("AKo"))) {
      expect(combo[0].suit).not.toBe(combo[1].suit);
    }
  });

  it("across all 169 hand types, the total combo count is exactly 1326 (C(52,2))", () => {
    const total = allHandTypes().reduce((sum, h) => sum + expandHandType(h).length, 0);
    expect(total).toBe(1326);
  });
});