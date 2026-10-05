import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { readLiveTable, TABLE_SELECTORS } from "../../../apps/pokernow-extension/src/tableRead.js";
import { assessLiveState } from "./liveState.js";
import { emptyActionHistory } from "./actionHistory.js";
import { buildLiveDiagnosticSnapshot } from "../../../apps/pokernow-extension/src/diagnostics.js";

const capturedCards = readFileSync(new URL("./fixtures/pokernow-board-live.html", import.meta.url), "utf8");

function table(count = 4) {
  // Only the board card elements below are real captures. This surrounding
  // scaffold supplies existing table selectors; it is not a live table fixture.
  const { document } = parseHTML(`<html><body>
    <div class="table-cards">${capturedCards}</div>
    <div class="table-pot-size"><div class="main-value"><span class="normal-value">20</span></div></div>
    <div class="blind-value"><span class="chips-value"><span class="normal-value">1</span></span></div>
    <div class="blind-value"><span class="chips-value"><span class="normal-value">2</span></span></div>
    <div class="dealer-position-1"></div>
    <div class="table-player-1 you-player decision-current">
      <div class="table-player-name"><a>Hero</a></div>
      <div class="table-player-stack"><span class="normal-value">100</span></div>
      <div class="table-player-cards">
        <div class="card-container card-s card-s-5 flipped card-p1"></div>
        <div class="card-container card-h card-s-4 flipped card-p2"></div>
      </div>
    </div>
  </body></html>`);
  [...document.querySelectorAll(".table-cards .card-container")].slice(count).forEach(card => card.remove());
  vi.stubGlobal("document", document);
  return document;
}

afterEach(() => vi.unstubAllGlobals());

describe("PokerNow board reader: user-provided live card DOM", () => {
  it("reproduces two suit matches per card and selects exactly the main suit span", () => {
    const document = table();
    for (const card of document.querySelectorAll(".table-cards .card-container")) {
      expect(card.querySelectorAll(".suit")).toHaveLength(2);
      expect(card.querySelectorAll(TABLE_SELECTORS.boardSuit)).toHaveLength(1);
      expect(card.querySelector(TABLE_SELECTORS.boardSuit)!.classList.contains("sub-suit")).toBe(false);
    }
    const read = readLiveTable();
    expect(read.context.readErrors).toEqual([]);
    expect(read.raw.boardCards).toEqual([
      { valueText: "6", suitText: "h" }, { valueText: "K", suitText: "d" },
      { valueText: "3", suitText: "h" }, { valueText: "9", suitText: "h" },
    ]);
    expect(read.evidence.boardCardEvidence[1]).toMatchObject({
      valueTexts: ["K"], suitTexts: ["d"], allSuitTexts: ["d", "d"],
      classList: expect.arrayContaining(["card-d", "card-s-K", "flipped"]),
    });
  });
  it.each([[3, "flop"], [4, "turn"]] as const)("assembles a %s-card %s instead of losing the postflop state", (count, street) => {
    table(count);
    const read = readLiveTable();
    const assessment = assessLiveState(read.raw, read.context);
    expect(assessment.state?.street).toBe(street);
    expect(assessment.state?.board).toEqual([
      { rank: 6, suit: "h" }, { rank: 13, suit: "d" }, { rank: 3, suit: "h" }, { rank: 9, suit: "h" },
    ].slice(0, count));
    expect(buildLiveDiagnosticSnapshot(read, assessment, emptyActionHistory()).parsedStateAvailable).toBe(true);
    // Fixing card parsing must not bypass the unrelated pot-semantics gate.
    expect(assessment.pot.isPotSemanticsVerified).toBe(false);
    expect(assessment.confidence.level).toBe("low");
  });
  it("preserves an empty preflop board and existing hero hole-card parsing", () => {
    table(0);
    const read = readLiveTable();
    expect(read.raw.boardCards).toEqual([]);
    expect(read.evidence.boardCardEvidence).toEqual([]);
    expect(read.context.readErrors).toEqual([]);
    const assessment = assessLiveState(read.raw, read.context);
    expect(assessment.state?.street).toBe("preflop");
    expect(assessment.state?.seats[0]?.holeCards).toEqual([{ rank: 5, suit: "s" }, { rank: 4, suit: "h" }]);
  });
});

describe("controlled variations of the captured DOM", () => {
  it("ignores decorative sub-suit content instead of conflating it with the main suit", () => {
    const document = table();
    document.querySelector(".table-cards .sub-suit")!.textContent = "s";
    const read = readLiveTable();
    expect(read.raw.boardCards[0]).toEqual({ valueText: "6", suitText: "h" });
    expect(read.evidence.boardCardEvidence[0]!.allSuitTexts).toEqual(["s", "h"]);
    expect(read.context.readErrors).toEqual([]);
  });
  it.each(["missing suit", "empty suit", "missing rank", "classes only"])("uses captured face-up class encoding for %s", variation => {
    const document = table();
    const card = document.querySelector(".table-cards .card-container")!;
    if (variation === "missing suit" || variation === "classes only") card.querySelector(TABLE_SELECTORS.boardSuit)!.remove();
    if (variation === "empty suit") card.querySelector(TABLE_SELECTORS.boardSuit)!.textContent = " ";
    if (variation === "missing rank" || variation === "classes only") card.querySelector(".value")!.remove();
    const read = readLiveTable();
    expect(read.raw.boardCards[0]).toEqual({ valueText: "6", suitText: "h" });
    expect(read.context.readErrors).toEqual([]);
  });
  it("retains legacy text-only board parsing with one suit span", () => {
    const document = table();
    const card = document.querySelector(".table-cards .card-container")!;
    card.setAttribute("class", "card-container");
    card.querySelector(".sub-suit")!.remove();
    expect(readLiveTable().raw.boardCards[0]).toEqual({ valueText: "6", suitText: "h" });
  });
  it.each(["rank", "suit", "unreadable", "hidden classes"])("fails closed on %s without dropping the board slot", variation => {
    const document = table();
    const card = document.querySelector(".table-cards .card-container")!;
    if (variation === "rank") card.querySelector(".value")!.textContent = "7";
    if (variation === "suit") card.querySelector(TABLE_SELECTORS.boardSuit)!.textContent = "s";
    if (variation === "unreadable") { card.setAttribute("class", "card-container"); card.innerHTML = ""; }
    if (variation === "hidden classes") { card.classList.remove("flipped"); card.innerHTML = ""; }
    const read = readLiveTable();
    expect(read.raw.boardCards).toHaveLength(4);
    expect(read.context.readErrors.some(error => error.startsWith("board card 1:"))).toBe(true);
    expect(assessLiveState(read.raw, read.context).state).toBeNull();
  });
  it("still fails a missing board container rather than calling it preflop", () => {
    const document = table(0); document.querySelector(".table-cards")!.remove();
    expect(readLiveTable().context.readErrors).toContain("board container: expected one match, found 0");
  });
});
