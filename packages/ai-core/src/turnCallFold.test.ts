import { describe, expect, it } from "vitest";
import { parseCards } from "@poker-ai/shared";
import { compareTurnCallFold, turnCallFoldDisplay, compareFlopCallFold, flopCallFoldDisplay, type TurnCallFoldInput } from "./turnCallFold.js";

const fixture = (): TurnCallFoldInput => ({ street: "turn", heroCards: parseCards("Ah Ad"), board: parseCards("2s 7h 9d Jc"),
  activeOpponents: 1, potBeforeCall: 30, amountToCall: 10, heroStack: 200, opponentStack: 200, accounting: "single_pot_no_rake" });

it("Hand471 withholds all numerical output when the fixed bluff mixture is impossible", () => {
  const result = compareTurnCallFold({ ...fixture(), heroCards: parseCards("Td 2h"), board: parseCards("4h 4s Th Ts"),
    potBeforeCall: 25, amountToCall: 4 });
  expect(result).toMatchObject({ status: "abstained", liveAuthorized: false, llmMayChoose: false, chosenAction: null,
    requiredEquity: null, equityBounds: null, callEVBounds: null, assumptions: [],
    reason: "Strong value / 10% bluffs: no legal bluff combinations; assumption cannot be evaluated" });
  expect(turnCallFoldDisplay(result).join(" ")).toContain("Turn checkdown calculation withheld");
  expect(turnCallFoldDisplay(result).join(" ")).not.toMatch(/Estimated turn equity|CALL EV|preferred/);
});

describe.each(["turn", "flop"] as const)("%s conditional diagnostics never select an action", street => {
  const compare = street === "flop" ? compareFlopCallFold : compareTurnCallFold;
  const displayResult = street === "flop" ? flopCallFoldDisplay : turnCallFoldDisplay;
  const localFixture = () => ({ ...fixture(), street, board: fixture().board.slice(0, street === "flop" ? 3 : 4) });
  it.each([
    { hero: "As Ks", board: "Qs Js Ts 3d", sign: "positive" },
    { hero: "3h 4d", board: "9s Jh Qd Kc", sign: "negative" },
    { hero: "Ah Ad", board: "2s 7h 9d Jc", sign: "mixed" },
  ])("reports $sign checkdown EV without an unconditional preference", ({ hero, board, sign }) => {
    const input = { ...localFixture(), heroCards: parseCards(hero), board: parseCards(board).slice(0, street === "flop" ? 3 : 4) };
    // Two cards to come give AA more equity than on the turn; a larger price
    // places the threshold between the two explicit flop range hypotheses.
    if (street === "flop" && sign === "mixed") input.potBeforeCall = 20;
    const total = input.potBeforeCall! + input.amountToCall!, required = input.amountToCall! / total;
    const r = compare(input);
    expect(r).toMatchObject({ status: "conditional", chosenAction: null, liveAuthorized: false, llmMayChoose: false, requiredEquity: required, foldEV: 0 });
    if (sign === "positive") expect(r.callEVBounds!.low).toBeGreaterThan(0);
    if (sign === "negative") expect(r.callEVBounds!.high).toBeLessThan(0);
    if (sign === "mixed") { expect(r.callEVBounds!.low).toBeLessThan(0); expect(r.callEVBounds!.high).toBeGreaterThan(0); }
    for (const a of r.assumptions) expect(a.callEV).toBeCloseTo(a.equity * total - input.amountToCall!, 10);
    const display = displayResult(r).join(" ");
    for (const text of [`Required equity: ${(100 * required).toFixed(2)}%`, "checkdown", "Strong value / 10% bluffs", "Thin value / 30% bluffs",
      street === "flop" ? "Future turn/river betting and equity realization are not modeled" : "Future river betting is unmodeled", "Unconditional CALL/FOLD recommendation withheld", "FOLD EV 0"])
      expect(display).toContain(text);
    expect(display).not.toMatch(/CALL preferred|FOLD preferred|Confidence:/);
  }, 20000);
  it.each([
    { street: "river" }, { board: parseCards(street === "flop" ? "2s 7h" : "2s 7h 9d") }, { activeOpponents: 2 }, { activeOpponents: 0 },
    { potBeforeCall: null }, { amountToCall: null }, { heroStack: null }, { opponentStack: null },
    { potBeforeCall: NaN }, { amountToCall: Infinity }, { heroStack: -1 }, { opponentStack: -1 },
    { amountToCall: 0 }, { amountToCall: 201 }, { heroStack: 10 }, { opponentStack: 0 }, { potBeforeCall: 5 },
    { accounting: "unknown" as const }, { heroCards: parseCards("Ah Ah") }, { heroCards: parseCards("Ah") },
    { board: parseCards("2s 7h 9d Ah") },
  ])("withholds unsupported inputs %j", patch => {
    const r = compare({ ...localFixture(), ...patch });
    expect(r).toMatchObject({ status: "abstained", chosenAction: null, liveAuthorized: false, requiredEquity: null, assumptions: [] });
  });
});

describe("flop hand and draw labels reuse the poker engine", () => {
  it.each([
    ["Kh 9h", "2h 7h Qs", "High Card", "flush draw (h)", "two_tone"],
    ["8h 9h", "6s 7d Qh", "High Card", "open ended straight draw", "rainbow"],
    ["8h Th", "6s 7d Qh", "High Card", "gutshot straight draw", "rainbow"],
    ["Ah Ad", "2s 2h 9d", "Two Pair", "no direct straight draw", "paired"],
    ["As Ks", "Qs Js Ts", "Straight Flush", "no direct flush draw", "monotone"],
  ])("labels %s on %s without turning draws into outs-based equity", (hero, board, hand, draw, texture) => {
    const result = compareFlopCallFold({ ...fixture(), street: "flop", heroCards: parseCards(hero), board: parseCards(board) });
    expect(result.status).toBe("conditional");
    const lines = flopCallFoldDisplay(result).join(" ");
    for (const expected of [`Current hand: ${hand}`, draw, texture, "not guaranteed winning outs", "ILLUSTRATIVE ONLY"])
      expect(lines).toContain(expected);
  }, 20000);
});
