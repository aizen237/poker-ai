import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { readCallControl } from "../../../apps/pokernow-extension/src/callControlRead.js";
import { readLiveTable } from "../../../apps/pokernow-extension/src/tableRead.js";
import { buildLiveDiagnosticSnapshot } from "../../../apps/pokernow-extension/src/diagnostics.js";
import { assessLiveState } from "./liveState.js";
import { emptyActionHistory } from "./actionHistory.js";

const observed = JSON.parse(readFileSync(new URL("./fixtures/pokernow-call-control-observation.json", import.meta.url), "utf8"));
const visible = (el: Element) => !el.closest("[hidden]");
const read = (html: string) => readCallControl(parseHTML(html).document, visible);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("CALL label observations, never server permission", () => {
  it("replays saved tag/type/text facts without pretending to have captured outerHTML", () => {
    const c = observed.control;
    const result = read(`<button type="${c.type}">${c.text}</button>`);
    expect(result).toMatchObject({ tag: c.tag, type: c.type, rawText: c.text,
      amountChips: 2, visibleCount: 1, enabled: true, serverAuthorization: "unproven", issues: [] });
  });
  it("observes synthetic CALL 5 without clicking or assigning a source timestamp", () => {
    const { document } = parseHTML('<button type="button">CALL <span>5</span></button>');
    const click = vi.spyOn(document.querySelector("button")!, "click");
    vi.spyOn(Date, "now").mockReturnValue(1234);
    expect(readCallControl(document, visible)).toMatchObject({ amountChips: 5, observedAt: 1234,
      serverAuthorization: "unproven", enabled: true });
    expect(click).not.toHaveBeenCalled();
  });
  it.each(["disabled", 'aria-disabled="true"', "inert"])("observes unavailable %s controls", attribute => {
    expect(read(`<div ${attribute}><button type="button" ${attribute === "disabled" ? "disabled" : ""}>Call 5</button></div>`).enabled).toBe(false);
  });
  it("observes disabled fieldsets", () => {
    expect(read('<fieldset disabled><button type="button">Call 5</button></fieldset>').enabled).toBe(false);
  });
  it("keeps absent/hidden controls unknown rather than guessing zero", () => {
    expect(read('<button type="button" hidden>Call 5</button>')).toMatchObject({ visibleCount: 0, amountChips: null, enabled: null, rawText: null });
    expect(read('<button type="button">Check</button><div>Call 5</div>')).toMatchObject({ visibleCount: 0, amountChips: null });
  });
  it("rejects duplicate visible labels even when amounts match", () => {
    expect(read('<button type="button">Call 5</button><button type="button">Call 5</button>')).toMatchObject({
      visibleCount: 2, amountChips: null, enabled: null, issues: [expect.stringContaining("Multiple")] });
  });
  it.each(["Call", "Call five", "Call -5", "Call 5BB", "Call 5 2.5BB", "Call Infinity", "Call 9007199254740992"])("does not invent chips from %s", label => {
    expect(read(`<button type="button">${label}</button>`)).toMatchObject({ amountChips: null, issues: [expect.any(String)] });
  });
  it.each(['<button>Call 5</button>', '<input type="submit" value="Call 5">', '<div role="button">Call 5</div>'])("keeps unsupported control shape untrusted: %s", markup => {
    const result = read(markup);
    expect(result.amountChips).toBeNull(); expect(result.issues.length).toBeGreaterThan(0);
  });
  it("flags a contradictory accessibility label", () => {
    expect(read('<button type="button" aria-label="Call 6">Call 5</button>').issues).toContainEqual(expect.stringContaining("accessibility"));
  });
  it("includes observation in the real table-read and diagnostic paths without certifying legality", () => {
    const { document } = parseHTML('<button type="button">Call 5</button>');
    document.querySelector("button")!.getBoundingClientRect = () => ({ width: 100, height: 20 } as DOMRect);
    vi.stubGlobal("document", document);
    vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible" }));
    const r = readLiveTable();
    const d = buildLiveDiagnosticSnapshot(r, assessLiveState(r.raw, r.context), emptyActionHistory());
    expect(d.legality.callControl).toMatchObject({ amountChips: 5, serverAuthorization: "unproven" });
    expect(d.decision.scopedProofs.callLegality).toBeNull();
    expect(d.legality.verified).toBe(false); expect(d.decision.packetBuilt).toBe(false);
  });
});
