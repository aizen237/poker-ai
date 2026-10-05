import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { isControlVisible, readRaiseControl } from "../../../apps/pokernow-extension/src/raiseControlRead.js";
import { readLiveTable } from "../../../apps/pokernow-extension/src/tableRead.js";
import { buildLiveDiagnosticSnapshot } from "../../../apps/pokernow-extension/src/diagnostics.js";
import { assessLiveState } from "./liveState.js";
import { emptyActionHistory } from "./actionHistory.js";

// Controlled variants below; the unmodified captured form is tested separately.
// Linkedom has no layout; visibility is supplied explicitly for these tests.
function fixture(value = "60") {
  return parseHTML(`<form class="raise-controller-form">
    <div class="raise-bet-value"><input class="value" value="${value}"><span class="bb-value">30 BB</span></div>
    <input type="range" min="1" max="999" value="77">
    <div class="action-buttons"><input type="submit" class="action-button bet" value="Raise"></div>
  </form>`).document;
}
const visible = (element: Element) => !element.closest("[hidden]");
const capturedForm = readFileSync(new URL("./fixtures/pokernow-raise-live.html", import.meta.url), "utf8");
afterEach(() => vi.unstubAllGlobals());

describe("selected raise-to amount evidence", () => {
  it("reads the exact live form and exposes its values without releasing legality gates", () => {
    const { document } = parseHTML(capturedForm);
    // Linkedom lacks CSS/layout. Supply visible layout for this captured form.
    for (const element of document.querySelectorAll("*")) {
      element.getBoundingClientRect = () => ({ width: 100, height: 20 } as DOMRect);
    }
    vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible" }));
    vi.stubGlobal("document", document);
    const read = readLiveTable();
    expect(read.raiseControl).toMatchObject({ formVisible: true, selectedRaiseToText: "21", selectedRaiseToChips: 21,
      displayedBBText: "10.5BB", submitText: "Raise", raiseSubmitVisible: true, raiseSubmitEnabled: true, issues: [] });
    const snapshot = buildLiveDiagnosticSnapshot(read, assessLiveState(read.raw, read.context), emptyActionHistory());
    expect(snapshot.legality.raiseControl).toEqual(read.raiseControl);
    expect(snapshot.legality).toMatchObject({ verified: false, minRaiseTo: null, minBet: null });
    expect(snapshot.decision.candidateActionSizes).toEqual([]);
  });

  it("never derives minimums or selected amount from the captured slider", () => {
    const { document } = parseHTML(capturedForm);
    const before = readRaiseControl(document, visible);
    const slider = document.querySelector(".slider-control")!;
    for (const attribute of ["min", "max", "value"]) slider.setAttribute(attribute, "9999");
    expect(readRaiseControl(document, visible)).toEqual(before);
  });

  it.each(["missing", "hidden", "Bet", "disabled"])("distinguishes %s submit from a usable Raise submit", variation => {
    const { document } = parseHTML(capturedForm);
    const submit = document.querySelector('input[type="submit"]')!;
    if (variation === "missing") submit.remove();
    if (variation === "hidden") submit.setAttribute("hidden", "");
    if (variation === "Bet") submit.setAttribute("value", "Bet");
    if (variation === "disabled") submit.setAttribute("disabled", "");
    const result = readRaiseControl(document, visible);
    expect(result.selectedRaiseToChips).toBe(21);
    expect(result.raiseSubmitVisible).toBe(variation === "disabled");
    expect(result.raiseSubmitEnabled).toBe(variation === "disabled" ? false : null);
  });

  it("rejects multiple visible forms and ignores outside submit controls", () => {
    const { document } = parseHTML(`<html><body>${capturedForm}${capturedForm}<input type="submit" value="Raise"></body></html>`);
    expect(readRaiseControl(document, visible)).toMatchObject({ selectedRaiseToChips: null, raiseSubmitVisible: false,
      issues: ["Multiple visible raise forms"] });
    document.querySelector("form")!.remove();
    document.querySelector('form input[type="submit"]')!.remove();
    expect(readRaiseControl(document, visible).raiseSubmitVisible).toBe(false);
  });

  it("checks ancestor CSS and element layout when determining visibility", () => {
    const document = fixture(); const form = document.querySelector("form")!;
    const input = document.querySelector("input.value")!;
    input.getBoundingClientRect = () => ({ width: 100, height: 20 } as DOMRect);
    vi.stubGlobal("getComputedStyle", (element: Element) => ({ display: element === form ? "none" : "block", visibility: "visible" }));
    expect(isControlVisible(input)).toBe(false);
    vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "hidden" }));
    expect(isControlVisible(input)).toBe(false);
    vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible" }));
    expect(isControlVisible(input)).toBe(true);
    input.getBoundingClientRect = () => ({ width: 0, height: 0 } as DOMRect);
    expect(isControlVisible(input)).toBe(false);
  });
  it("reads chips and displayed BB independently of the slider", () => {
    const document = fixture();
    expect(readRaiseControl(document, visible)).toMatchObject({
      amountControlVisible: true, selectedRaiseToChips: 60, displayedBBText: "30 BB", issues: [],
    });
    document.querySelector('input[type="range"]')!.setAttribute("value", "1000");
    expect(readRaiseControl(document, visible).selectedRaiseToChips).toBe(60);
  });

  it("reads the live input property rather than its initial attribute", () => {
    const document = fixture();
    const input = document.querySelector("input.value")!;
    Object.defineProperty(input, "value", { value: "80" });
    expect(input.getAttribute("value")).toBe("60");
    expect(readRaiseControl(document, visible).selectedRaiseToChips).toBe(80);
  });

  it.each(["", "unknown", "-2", "Infinity"])("keeps invalid amount %s unknown", value => {
    expect(readRaiseControl(fixture(value), visible)).toMatchObject({ selectedRaiseToChips: null, selectedRaiseToSource: null });
  });

  it("does not substitute the slider when the amount input is missing", () => {
    const document = fixture(); document.querySelector("input.value")!.remove();
    expect(readRaiseControl(document, visible).selectedRaiseToChips).toBeNull();
  });

  it("ignores hidden forms", () => {
    const document = fixture(); document.querySelector("form")!.setAttribute("hidden", "");
    expect(readRaiseControl(document, visible)).toMatchObject({ amountControlVisible: false, selectedRaiseToChips: null, displayedBBText: null });
  });

  it("rejects ambiguous visible amounts", () => {
    const document = fixture(); const container = document.querySelector(".raise-bet-value")!;
    container.parentNode!.appendChild(container.cloneNode(true));
    expect(readRaiseControl(document, visible)).toMatchObject({ selectedRaiseToChips: null, issues: ["Multiple visible raise amount containers"] });
  });
});
