import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { readLiveTable } from "../../../apps/pokernow-extension/src/tableRead.js";
import { assessLiveState } from "./liveState.js";

function table(stackMarkup = "All In", bet = "25") {
  // Reproduce the reported evidence: container text All In, no numeric child.
  // Surrounding markup, river cards and chip amounts are controlled test data,
  // not a claim that a complete live seat/table HTML capture was supplied.
  const { document } = parseHTML(`<html><body>
    <div class="table-cards">${["6h", "Kd", "3h", "9h", "2s"].map(card =>
      `<div class="card-container"><span class="value">${card[0]}</span><span class="suit">${card[1]}</span></div>`).join("")}</div>
    <div class="table-pot-size"><div class="main-value"><span class="normal-value">20</span></div></div>
    <div class="blind-value"><span class="chips-value"><span class="normal-value">1</span></span></div>
    <div class="blind-value"><span class="chips-value"><span class="normal-value">2</span></span></div>
    <div class="dealer-position-1"></div>
    <div class="table-player-1 you-player decision-current">
      <div class="table-player-name"><a>Hero</a></div>
      <div class="table-player-stack"><span class="normal-value">100</span></div>
      <div class="table-player-bet-value">5</div>
      <div class="table-player-cards">
        <div class="card-container card-s card-s-5 flipped card-p1"></div>
        <div class="card-container card-h card-s-4 flipped card-p2"></div>
      </div>
    </div>
    <div class="table-player-2">
      <div class="table-player-name"><a>Opponent</a></div>
      <div class="table-player-stack">${stackMarkup}</div>
      <div class="table-player-bet-value">${bet}</div>
    </div>
  </body></html>`);
  vi.stubGlobal("document", document);
  return document;
}

function read() {
  const result = readLiveTable();
  return { ...result, assessment: assessLiveState(result.raw, result.context) };
}

afterEach(() => vi.unstubAllGlobals());

describe("live all-in stack container", () => {
  it.each(["All In", " \nALL\u00a0IN\t", '<span class="normal-value">All In</span>'])("recognizes %s and preserves the contribution", markup => {
    table(markup);
    const { raw, context, assessment } = read();
    expect(context.readErrors).toEqual([]);
    if (!markup.includes("span")) expect(raw.seats[1]!.stackText).toBeNull();
    expect(raw.seats[1]!.stackContainerText).toBeDefined();
    expect(assessment.state?.street).toBe("river");
    expect(assessment.state?.seats[1]).toMatchObject({ isAllIn: true, stack: null, currentBet: 25, betReadError: false });
    expect(assessment.amountToCall).toBe(20);
    expect(assessment.activeOpponents).toBe(1);
    expect(assessment.confidence.reasons).not.toContain("active opponent stack missing or invalid");
    expect(assessment.confidence.level).toBe("low");
    expect(assessment.pot.isPotSemanticsVerified).toBe(false);
    expect(assessment.legality.verified).toBe(false);
  });

  it.each(["", "Unknown", "100", "Not All In"])("does not infer a stack or all-in status from %s", markup => {
    table(markup);
    const { assessment } = read();
    expect(assessment.state?.seats[1]).toMatchObject({ isAllIn: false, stack: null, currentBet: 25 });
    expect(assessment.confidence.reasons).toContain("active opponent stack missing or invalid");
  });

  it("preserves numeric stack parsing", () => {
    table('<span class="normal-value">80</span>');
    expect(read().assessment.state?.seats[1]).toMatchObject({ isAllIn: false, stack: 80, currentBet: 25 });
  });

  it("keeps an unreadable all-in contribution unknown", () => {
    table("All In", "All In");
    const { assessment } = read();
    expect(assessment.state?.seats[1]).toMatchObject({ isAllIn: true, currentBet: null, betReadError: true });
    expect(assessment.amountToCall).toBeNull();
    expect(assessment.confidence.level).toBe("low");
  });

  it("keeps an all-in hero blocked", () => {
    const document = table();
    document.querySelector(".table-player-1 .table-player-stack")!.textContent = "All In";
    const { assessment } = read();
    expect(assessment.state?.seats[0]).toMatchObject({ isAllIn: true, stack: null, currentBet: 5 });
    expect(assessment.confidence.reasons).toContain("hero stack missing or invalid");
    expect(assessment.confidence.reasons).toContain("hero has no remaining chips to act with");
  });

  it("rejects ambiguous stack containers", () => {
    const document = table();
    const container = document.querySelector(".table-player-2 .table-player-stack")!;
    container.parentNode!.appendChild(container.cloneNode(true));
    const { context, assessment } = read();
    expect(context.readErrors).toContain("seat 2 stack container: expected at most one match, found 2");
    expect(assessment.state?.seats[1]?.isAllIn).toBe(false);
    expect(assessment.confidence.level).toBe("low");
  });
});
