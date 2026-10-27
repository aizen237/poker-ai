import { describe, expect, it } from "vitest";
import { parseCards } from "@poker-ai/shared";
import { compareRiverCallFold, riverCallFoldDisplay, type RiverCallFoldInput } from "./riverCallFold.js";

// Hypothetical inputs only: these fixtures do not certify any PokerNow source.
const fixture = (): RiverCallFoldInput => ({ street: "river", heroCards: parseCards("Ah Ad"),
  board: parseCards("2s 7h 9d Jc Qc"), activeOpponents: 1, potBeforeCall: 30,
  amountToCall: 10, heroStack: 200, opponentStack: 200, accounting: "single_pot_no_rake" });

describe("river CALL versus FOLD only", () => {
  it("prefers CALL with the nuts under both supplied assumptions", () => {
    const r = compareRiverCallFold({ ...fixture(), heroCards: parseCards("As Ks"), board: parseCards("Qs Js Ts 3d 2c") });
    expect(r.status).toBe("call_preferred");
    expect(r.requiredEquity).toBe(.25);
    expect(r.equityBounds?.low).toBeCloseTo(1, 12);
    expect(r.callEVBounds?.low).toBeCloseTo(30, 10);
  });
  it("prefers FOLD when neither assumption clears the price", () => {
    const r = compareRiverCallFold({ ...fixture(), heroCards: parseCards("4h 5d"), potBeforeCall: 100, amountToCall: 100 });
    expect(r.status).toBe("fold_preferred");
    expect(r.callEVBounds!.high).toBeLessThan(0);
    expect(r.foldEV).toBe(0);
  });
  it("reports range-dependent when the assumptions straddle breakeven", () => {
    const r = compareRiverCallFold(fixture());
    expect(r.status).toBe("uncertain");
    expect(r.requiredEquity).toBe(.25);
    expect(r.callEVBounds!.low).toBeCloseTo(-6, 10); // .1 * 30 - .9 * 10
    expect(r.callEVBounds!.high).toBeGreaterThan(0);
  });
  it("does not call an equality a strict preference", () => {
    const low = compareRiverCallFold(fixture()).equityBounds!.low;
    expect(compareRiverCallFold({ ...fixture(), potBeforeCall: 10 * (1 - low) / low }).status).toBe("uncertain");
  });
  it.each([
    { street: "turn" }, { board: parseCards("2s 7h 9d Jc") }, { activeOpponents: 2 },
    { amountToCall: 0 }, { amountToCall: 201 }, { heroStack: 10 }, { opponentStack: 0 },
    { potBeforeCall: null }, { amountToCall: null }, { heroStack: null }, { opponentStack: null },
    { potBeforeCall: NaN }, { potBeforeCall: Infinity }, { potBeforeCall: 5 }, { accounting: "unknown" as const },
    { board: parseCards("2s 7h 9d Jc Ah") }, { heroCards: parseCards("Ah Ah") },
  ])("abstains for invalid or unsupported inputs %j", patch => {
    const r = compareRiverCallFold({ ...fixture(), ...patch });
    expect(r.status).toBe("abstained");
    expect(r.requiredEquity).toBeNull();
    expect(r.assumptions).toEqual([]);
    expect(r.liveAuthorized).toBe(false);
  });
  it("locks conditional wording and labels without producing an authorized action", () => {
    const r = compareRiverCallFold(fixture());
    expect(r).toMatchObject({ liveAuthorized: false, llmMayChoose: false });
    expect(r).not.toHaveProperty("action");
    const display = riverCallFoldDisplay(r).join(" ");
    for (const text of ["Required equity: 25.00%", "Strong value / 10% bluffs", "Thin value / 30% bluffs",
      "Range-dependent / uncertain.", "RAISE not evaluated.", "No live action authorization."])
      expect(display).toContain(text);
    expect(display).not.toMatch(/Confidence:|optimal action/i);
  });
});
