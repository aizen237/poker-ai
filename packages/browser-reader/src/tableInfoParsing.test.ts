import { describe, expect, it } from "vitest";
import { parseChipsValueText, parsePlayerNameAndStack, parsePotSizeInfo, parseBlindValues } from "./tableInfoParsing.js";

describe("parseChipsValueText — real captured examples", () => {
  it.each(["Infinity", "-Infinity", "NaN", "-1", "0x10", "1e3", "1,2", "1,,000", "1,000 chips"])("rejects invalid or ambiguous chip text %s", (text) => {
    expect(() => parseChipsValueText(text)).toThrow();
  });

  it("preserves numeric zero and decimal chip values", () => {
    expect(parseChipsValueText("0")).toBe(0);
    expect(parseChipsValueText(" 1,234.50 ")).toBe(1234.5);
  });
  it("parses a real captured stack value (585)", () => {
    expect(parseChipsValueText("585")).toBe(585);
  });

  it("parses a real captured pot total (7)", () => {
    expect(parseChipsValueText("7")).toBe(7);
  });

  it("parses zero correctly (real captured main-value between hands)", () => {
    expect(parseChipsValueText("0")).toBe(0);
  });

  it("handles comma-separated thousands", () => {
    expect(parseChipsValueText("1,500")).toBe(1500);
  });

  it("trims whitespace", () => {
    expect(parseChipsValueText("  250  ")).toBe(250);
  });

  it("throws on unrecognized text", () => {
    expect(() => parseChipsValueText("abc")).toThrow();
  });

  it("throws on empty text", () => {
    expect(() => parseChipsValueText("")).toThrow();
  });
});

describe("parsePotSizeInfo — real captured example (main=0, total=7)", () => {
  it("combines both values correctly", () => {
    const result = parsePotSizeInfo("0", "7");
    expect(result.mainValue).toBe(0);
    expect(result.totalValue).toBe(7);
  });

  it("handles a missing total (null) when there's no add-on shown", () => {
    const result = parsePotSizeInfo("45", null);
    expect(result.mainValue).toBe(45);
    expect(result.totalValue).toBeNull();
  });
});

describe("parsePlayerNameAndStack — real captured example (fc6666, 585)", () => {
  it("parses the real captured name and stack together", () => {
    const result = parsePlayerNameAndStack("fc6666", "585");
    expect(result.name).toBe("fc6666");
    expect(result.stack).toBe(585);
  });

  it("trims whitespace from the name", () => {
    const result = parsePlayerNameAndStack("  Talion  ", "197");
    expect(result.name).toBe("Talion");
  });

  it("throws if the name is empty", () => {
    expect(() => parsePlayerNameAndStack("", "100")).toThrow();
    expect(() => parsePlayerNameAndStack("   ", "100")).toThrow();
  });

  it("throws if the stack text is unrecognized", () => {
    expect(() => parsePlayerNameAndStack("Talion", "not-a-number")).toThrow();
  });

  
  it("returns a null stack (not a throw) when the stack text is 'All In' -- confirmed live", () => {
    const result = parsePlayerNameAndStack("aizennnnn", "All In");
    expect(result.name).toBe("aizennnnn");
    expect(result.stack).toBeNull();
  });

  it("recognizes 'All In' case-insensitively and with surrounding whitespace", () => {
    expect(parsePlayerNameAndStack("Talion", "  all in  ").stack).toBeNull();
    expect(parsePlayerNameAndStack("Talion", "ALL IN").stack).toBeNull();
  });

  it("still throws for genuinely unrecognized stack text, not just blanket-accepting anything", () => {
    expect(() => parsePlayerNameAndStack("Talion", "allin")).toThrow();
    expect(() => parsePlayerNameAndStack("Talion", "all-in")).toThrow();
  });
});

describe("parseBlindValues", () => {
  it("keeps missing values unknown and never uses a numeric fallback", () => {
    expect(parseBlindValues([])).toEqual({ smallBlind: null, bigBlind: null });
    expect(parseBlindValues(["1"])).toEqual({ smallBlind: 1, bigBlind: null });
    expect(parseBlindValues(["0", "Infinity"])).toEqual({ smallBlind: null, bigBlind: null });
  });
});
