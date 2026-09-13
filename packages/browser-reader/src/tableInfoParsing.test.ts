import { describe, expect, it } from "vitest";
import { parseChipsValueText, parsePlayerNameAndStack, parsePotSizeInfo } from "./tableInfoParsing.js";

describe("parseChipsValueText — real captured examples", () => {
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
});