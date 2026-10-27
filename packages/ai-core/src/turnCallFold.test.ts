import { describe, expect, it } from "vitest";
import { parseCards } from "@poker-ai/shared";
import { compareTurnCallFold, turnCallFoldDisplay, type TurnCallFoldInput } from "./turnCallFold.js";

const fixture = (): TurnCallFoldInput => ({ street: "turn", heroCards: parseCards("Ah Ad"), board: parseCards("2s 7h 9d Jc"),
  activeOpponents: 1, potBeforeCall: 30, amountToCall: 10, heroStack: 200, opponentStack: 200, accounting: "single_pot_no_rake" });

describe("turn conditional diagnostics never select an action", () => {
  it.each([
    { hero: "As Ks", board: "Qs Js Ts 3d", sign: "positive" },
    { hero: "3h 4d", board: "9s Jh Qd Kc", sign: "negative" },
    { hero: "Ah Ad", board: "2s 7h 9d Jc", sign: "mixed" },
  ])("reports $sign checkdown EV without an unconditional preference", ({ hero, board, sign }) => {
    const input = { ...fixture(), heroCards: parseCards(hero), board: parseCards(board) };
    const r = compareTurnCallFold(input);
    expect(r).toMatchObject({ status: "conditional", chosenAction: null, liveAuthorized: false, llmMayChoose: false, requiredEquity: .25, foldEV: 0 });
    if (sign === "positive") expect(r.callEVBounds!.low).toBeGreaterThan(0);
    if (sign === "negative") expect(r.callEVBounds!.high).toBeLessThan(0);
    if (sign === "mixed") { expect(r.callEVBounds!.low).toBeLessThan(0); expect(r.callEVBounds!.high).toBeGreaterThan(0); }
    for (const a of r.assumptions) expect(a.callEV).toBeCloseTo(a.equity * 40 - 10, 10);
    const display = turnCallFoldDisplay(r).join(" ");
    for (const text of ["Required equity: 25.00%", "checkdown", "Strong value / 10% bluffs", "Thin value / 30% bluffs",
      "Future river betting is unmodeled", "Unconditional CALL/FOLD recommendation withheld", "FOLD EV 0"])
      expect(display).toContain(text);
    expect(display).not.toMatch(/CALL preferred|FOLD preferred|Confidence:/);
  }, 20000);
  it.each([
    { street: "river" }, { board: parseCards("2s 7h 9d") }, { activeOpponents: 2 }, { activeOpponents: 0 },
    { potBeforeCall: null }, { amountToCall: null }, { heroStack: null }, { opponentStack: null },
    { potBeforeCall: NaN }, { amountToCall: Infinity }, { heroStack: -1 }, { opponentStack: -1 },
    { amountToCall: 0 }, { amountToCall: 201 }, { heroStack: 10 }, { opponentStack: 0 }, { potBeforeCall: 5 },
    { accounting: "unknown" as const }, { heroCards: parseCards("Ah Ah") }, { heroCards: parseCards("Ah") },
    { board: parseCards("2s 7h 9d Ah") },
  ])("withholds unsupported inputs %j", patch => {
    const r = compareTurnCallFold({ ...fixture(), ...patch });
    expect(r).toMatchObject({ status: "abstained", chosenAction: null, liveAuthorized: false, requiredEquity: null, assumptions: [] });
  });
});
