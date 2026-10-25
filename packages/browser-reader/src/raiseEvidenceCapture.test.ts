import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import { RawSocketCapture, RAW_CAPTURE_KEY } from "../../../apps/pokernow-extension/src/rawSocketCapture.js";
import { CHECKPOINT_LABELS, installRaiseEvidenceCollector, installRaiseEvidenceResponder, RAISE_CAPTURE_KEY,
  RaiseEvidenceCollector, raiseSourceObservation, readRaiseCheckpointDOM, type RaiseSourceObservation } from "../../../apps/pokernow-extension/src/raiseEvidenceCapture.js";
import { createTimelineRuntime } from "../../../apps/pokernow-extension/src/liveTimeline.js";

const html = readFileSync(new URL("./fixtures/pokernow-raise-live.html", import.meta.url), "utf8");
const visible = (e: Element) => !e.closest("[hidden]");
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function fixture(on = true, limits?: { checkpoints: number; bytes: number }) {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  let now = 1000;
  const raw = new RawSocketCapture(true);
  raw.observe('42["registered",{"gameState":{"hI":"one","nested":{"null":null,"ordered":[3,1,2]},"huge":9007199254740993},"currentPlayer":{"id":"hero"}}]', 1, now);
  const runtime = createTimelineRuntime({ tableId: "table", sessionId: "test", now: () => now, fetchLog: vi.fn() });
  const source = raiseSourceObservation(runtime.snapshot(), now);
  // Diagnostic-only synthetic source facts; never submitted to a proof adapter.
  Object.assign(source, { connected: true, identity: { tableId: "table", handId: "one", heroPlayerId: "hero" },
    sourceState: { generation: 1, localBridgeSequence: 10, fields: { hI: "one", now: 11, cPI: "hero", pITT: "hero" } } });
  const read = vi.fn(() => readRaiseCheckpointDOM(document, visible));
  const sourceRead = vi.fn(async () => ({ source: structuredClone(source), error: null }));
  const disarm = vi.fn();
  const c = new RaiseEvidenceCollector(on, { raw, dom: read, source: sourceRead, disarm,
    tableUrl: () => "https://www.pokernow.com/games/table", now: () => now, monotonic: () => 50 }, limits);
  return { c, raw, source, read, sourceRead, document, disarm, at: (time: number) => { now = time; } };
}
const parse = (f: ReturnType<typeof fixture>) => JSON.parse(f.c.exportJSON());

describe("manual RAISE evidence: never proof or poker interaction", () => {
  it("is disabled by default and never reads DOM/source on a disabled checkpoint", async () => {
    const f = fixture(false);
    expect(await f.c.checkpoint("panel_opened")).toMatchObject({ accepted: false, reason: "not_enabled_before_page_load" });
    expect(f.read).not.toHaveBeenCalled(); expect(f.sourceRead).not.toHaveBeenCalled();
    expect(() => f.c.exportJSON()).toThrow("not enabled");
  });
  it("exports original nested raw JSON tokens, order, missing/null and live values without actions", async () => {
    const f = fixture();
    const input = f.document.querySelector<HTMLInputElement>("input.value")!;
    Object.defineProperty(input, "value", { value: "5" });
    const click = vi.spyOn(input, "click"), events = vi.fn();
    f.document.addEventListener("input", events); f.document.addEventListener("submit", events);
    const before = f.document.toString();
    expect(await f.c.checkpoint("five_chips_entered")).toMatchObject({ accepted: true });
    const exported = f.c.exportJSON();
    expect(exported).toContain('"huge":9007199254740993');
    const result = JSON.parse(exported), cp = result.checkpoints[0];
    expect(result.rawSocket.frames[0].payload.gameState.nested).toEqual({ null: null, ordered: [3, 1, 2] });
    expect(result.rawSocket.frames[0].payload.gameState.nested).not.toHaveProperty("absent");
    expect(cp.source.sourceState.fields).not.toHaveProperty("pre");
    expect(cp.dom.forms[0].inputs[0]).toMatchObject({ liveValue: "5", valueAttribute: "21", min: null, max: null, step: null, pattern: "[0-9]*" });
    expect(cp.dom.selected).toMatchObject({ selectedRaiseToChips: 5, displayedBBText: "10.5BB", raiseSubmitEnabled: true });
    expect(cp.legalityCertified).toBe(false); expect(cp.historyComplete).toBe(false);
    expect(f.document.toString()).toBe(before); expect(click).not.toHaveBeenCalled(); expect(events).not.toHaveBeenCalled();
    expect(f.disarm).toHaveBeenCalledOnce(); expect(f.raw.status().active).toBe(false);
    expect(() => f.c.exportJSON()).toThrow("already exported");
  });
  it("keeps hidden and duplicate structures instead of choosing an arbitrary form", async () => {
    const f = fixture(); f.document.querySelector("form")!.insertAdjacentHTML("afterend", html);
    await f.c.checkpoint("panel_opened");
    f.document.querySelector("form")!.setAttribute("hidden", "");
    await f.c.checkpoint("min_raise_selected");
    const rows = parse(f).checkpoints;
    expect(rows[0].dom).toMatchObject({ formCount: 2, visibleFormCount: 2 });
    expect(rows[0].contradictions).toContain("Multiple visible raise forms");
    expect(rows[1].dom).toMatchObject({ formCount: 2, visibleFormCount: 1 });
    expect(rows[1].dom.forms[0].visible).toBe(false);
    expect(rows[1].dom.forms[0].blockingAncestors[0].hidden).toBe("");
  });
  it("preserves missing controls and disabled observations", async () => {
    const f = fixture(); f.document.querySelector("input.value")!.remove();
    f.document.querySelector('input[type="submit"]')!.setAttribute("disabled", "");
    await f.c.checkpoint("five_chips_entered");
    const cp = parse(f).checkpoints[0];
    expect(cp.dom.forms[0].inputs).toEqual([]);
    expect(cp.dom.selected).toMatchObject({ selectedRaiseToText: null, selectedRaiseToChips: null, raiseSubmitEnabled: false });
    expect(cp.contradictions).toContain("Manual five-chip label does not match the observed selected amount.");
    expect(cp.missingEvidence).toContain("Raise submit absent, hidden or disabled.");
  });
  it("reads validity properties without invoking native validation", async () => {
    const f = fixture(), input = f.document.querySelector("input.value")!;
    const check = vi.fn(); Object.defineProperty(input, "checkValidity", { value: check });
    Object.defineProperty(input, "validity", { value: { valid: false, patternMismatch: true, stepMismatch: false } });
    await f.c.checkpoint("panel_opened");
    expect(parse(f).checkpoints[0].dom.forms[0].inputs[0].validity).toMatchObject({ valid: false, patternMismatch: true });
    expect(check).not.toHaveBeenCalled();
  });
  it("stops at eight checkpoints and reports refusals without dropping retained data", async () => {
    const f = fixture();
    for (let i = 0; i < 8; i++) expect(await f.c.checkpoint("panel_opened")).toMatchObject({ accepted: true });
    expect(await f.c.checkpoint("panel_opened")).toMatchObject({ accepted: false, reason: "checkpoint_limit" });
    expect(f.c.status()).toMatchObject({ checkpointCount: 8, refusedCheckpoints: 1, active: false });
    expect(parse(f).checkpoints).toHaveLength(8);
  });
  it("enforces the UTF-8 byte limit, refusing whole oversized records", async () => {
    const f = fixture(); await f.c.checkpoint("panel_opened");
    f.document.querySelector("form")!.setAttribute("data-large", "♥".repeat(45000));
    expect(await f.c.checkpoint("panel_opened")).toMatchObject({ accepted: false });
    const output = parse(f);
    expect(output.capture.stopReason).toBe("checkpoint_byte_limit");
    expect(output.checkpoints).toHaveLength(1);
    expect(new TextEncoder().encode(JSON.stringify(output.checkpoints)).length).toBe(output.capture.retainedBytes);
    expect(output.capture.retainedBytes).toBeLessThanOrEqual(128 * 1024);
  });
  it.each(["hand", "actor", "generation"])("keeps distinct records and flags changed %s", async kind => {
    const f = fixture(); await f.c.checkpoint("panel_opened");
    if (kind === "generation") f.source.sourceState!.generation++;
    else f.source.sourceState!.fields[kind === "hand" ? "hI" : "cPI"] = "different";
    await f.c.checkpoint("min_raise_selected");
    const cp = parse(f).checkpoints;
    expect(cp[1].contradictions.some((r: string) => r.includes("differs from previous"))).toBe(true);
    expect(cp[0].source.sourceState.fields.hI).toBe("one");
    expect(cp[0].source.sourceState.fields.cPI).toBe("hero");
  });
  it("flags expiry/disconnection without extending or reconstructing a certificate", async () => {
    const f = fixture(); f.source.connected = false;
    Object.assign(f.source.freshness, { certificate: { expiresAt: 11000 }, status: "expired" });
    f.at(11000); await f.c.checkpoint("panel_opened");
    const cp = parse(f).checkpoints[0];
    expect(cp.source.firstUtgProof).toBeNull(); expect(cp.source.freshness.certificate.expiresAt).toBe(11000);
    expect(cp.missingEvidence).toContain("Source disconnected.");
    expect(cp.missingEvidence).toContain("Original source proof expired; checkpoint cannot renew it.");
  });
  it("copies original certificate expiry and flags chip/BB mismatch without certifying legality", async () => {
    const f = fixture();
    Object.assign(f.source, { firstUtgProof: { version: 1, scope: "first_utg_boundary", expiresAt: 11000, historyComplete: false,
      continuity: { generation: 1, cursor: 11 }, witness: { receivedAt: 1000, bigBlind: 2, heroCards: ["Ah", "Ac"] } } });
    const input = f.document.querySelector("input.value")!;
    Object.defineProperty(input, "value", { value: "5" });
    f.at(10999); f.source.capturedAt = 10999;
    await f.c.checkpoint("five_chips_entered");
    f.at(11000); f.source.capturedAt = 11000;
    await f.c.checkpoint("five_chips_entered");
    const rows = parse(f).checkpoints;
    expect(rows[0].source.firstUtgProof).toEqual(f.source.firstUtgProof);
    expect(rows[0].contradictions).toContain("Selected chips and displayed BB disagree under the copied source-proof big blind.");
    expect(rows[0].missingEvidence.some((r: string) => r.includes("expired"))).toBe(false);
    expect(rows[1].missingEvidence.some((r: string) => r.includes("expired"))).toBe(true);
    expect(rows[1].source.firstUtgProof.expiresAt).toBe(11000);
  });
  it("labels stale source times and missing responder facts without defaults", async () => {
    const f = fixture(); f.at(2000); await f.c.checkpoint("panel_opened");
    expect(parse(f).checkpoints[0].contradictions).toContain("Source snapshot time is outside the checkpoint interval; stale or clock-inconsistent observation.");
  });
  it("flags frames arriving between DOM and source observations", async () => {
    const f = fixture();
    f.sourceRead.mockImplementationOnce(async () => { f.raw.observe('42["gC",{"now":12}]', 2); return { source: f.source, error: null }; });
    await f.c.checkpoint("panel_opened"); const cp = parse(f).checkpoints[0];
    expect(cp.rawRecorderBefore.frameCount).toBe(1); expect(cp.rawRecorderAfter.frameCount).toBe(2);
    expect(cp.contradictions).toContain("Incoming frames changed during checkpoint; source and DOM are not an atomic snapshot.");
  });
  it("exports recorder loss/limit status instead of claiming full capture", async () => {
    const f = fixture(); f.raw.observe('42["gC",', 1); f.raw.stop("buffer_size_limit");
    await f.c.checkpoint("panel_opened"); const cp = parse(f).checkpoints[0];
    expect(cp.rawRecorderAfter).toMatchObject({ rejectedFrames: 1, stopReason: "buffer_size_limit", active: false });
    expect(cp.missingEvidence.some((r: string) => r.includes("Raw recorder"))).toBe(true);
  });
  it("does not export partial/pending checkpoints or retain one after stop", async () => {
    const f = fixture(); let finish!: (v: { source: RaiseSourceObservation; error: null }) => void;
    f.sourceRead.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = f.c.checkpoint("panel_opened");
    expect(await f.c.checkpoint("panel_opened")).toMatchObject({ accepted: false, reason: "checkpoint_already_pending" });
    expect(() => f.c.exportJSON()).toThrow("pending"); f.c.stop(); finish({ source: f.source, error: null });
    expect(await pending).toMatchObject({ accepted: false }); expect(parse(f).checkpoints).toEqual([]);
  });
  it("rejects unsupported labels before any source request", async () => {
    const f = fixture(); expect(await f.c.checkpoint("submit_raise")).toMatchObject({ accepted: false });
    expect(f.sourceRead).not.toHaveBeenCalled(); expect(CHECKPOINT_LABELS).toHaveLength(4);
  });
});

describe("opt-in diagnostic bridge", () => {
  function browser(on: boolean, respond = true, postflopRead?: () => any) {
    const { document } = parseHTML(html);
    for (const e of document.querySelectorAll("*")) e.getBoundingClientRect = () => ({ width: 10, height: 10 } as DOMRect);
    vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible" }));
    const settings = new Map(on ? [[RAISE_CAPTURE_KEY, "1"], [RAW_CAPTURE_KEY, "1"]] : []);
    const listeners = new Set<(event: any) => void>();
    const target: any = { document, location: new URL("https://www.pokernow.com/games/table"), performance,
      sessionStorage: { getItem: (k: string) => settings.get(k) ?? null, removeItem: (k: string) => settings.delete(k) },
      setTimeout, clearTimeout, addEventListener: (_: string, fn: any) => listeners.add(fn), removeEventListener: (_: string, fn: any) => listeners.delete(fn),
      postMessage: vi.fn((data: unknown) => { for (const l of [...listeners]) l({ source: target, origin: target.location.origin, data }); }) };
    const runtime = createTimelineRuntime({ tableId: "table", sessionId: "bridge", now: Date.now, fetchLog: vi.fn() });
    const snapshot = vi.fn(() => runtime.snapshot());
    if (respond) installRaiseEvidenceResponder(target, snapshot, postflopRead);
    const raw = new RawSocketCapture(on); installRaiseEvidenceCollector(target, raw);
    return { target, settings, snapshot, runtime, raw };
  }
  it("does not install a source listener or send diagnostic requests when disabled", async () => {
    const f = browser(false); await f.target.pokerAIRaiseCapture.checkpoint("panel_opened");
    expect(f.target.postMessage).not.toHaveBeenCalled(); expect(f.snapshot).not.toHaveBeenCalled();
  });
  it("pairs with the real timeline snapshot and never mutates its proof or fetches", async () => {
    const f = browser(true), before = f.runtime.snapshot();
    expect(await f.target.pokerAIRaiseCapture.checkpoint("panel_opened")).toMatchObject({ accepted: true });
    expect(f.snapshot).toHaveBeenCalledOnce();
    expect(f.runtime.snapshot().sourceStatus.firstUtgProof).toEqual(before.sourceStatus.firstUtgProof);
    const output = JSON.parse(f.target.pokerAIRaiseCapture.exportJSON());
    expect(output.checkpoints[0].source).toMatchObject({ connected: false, firstUtgProof: null, historyComplete: false });
    expect(f.settings.size).toBe(0);
    expect(f.target.postMessage.mock.calls.every(([m]: any) => m.channel === "poker-ai:raise-evidence-diagnostics:v1")).toBe(true);
  });
  it("captures missing response without substituting cached source facts", async () => {
    const f = browser(true, false);
    await f.target.pokerAIRaiseCapture.checkpoint("panel_opened");
    const cp = JSON.parse(f.target.pokerAIRaiseCapture.exportJSON()).checkpoints[0];
    expect(cp.source).toBeNull(); expect(cp.missingEvidence.some((r: string) => r.includes("timed out"))).toBe(true);
  });
  it("does not read postflop DOM or send requests unless enabled before load", async () => {
    const read = vi.fn(), f = browser(false, true, read);
    expect(await f.target.pokerAIRaiseCapture.checkpoint("postflop_call")).toMatchObject({ accepted: false });
    expect(read).not.toHaveBeenCalled(); expect(f.target.postMessage).not.toHaveBeenCalled();
  });
  it("rejects a missing paired callback instead of substituting an old or preflop snapshot", async () => {
    const f = browser(true);
    expect(await f.target.pokerAIRaiseCapture.checkpoint("postflop_call")).toMatchObject({ accepted: false, retained: true });
    expect(f.snapshot).not.toHaveBeenCalled();
    const cp = JSON.parse(f.target.pokerAIRaiseCapture.exportJSON()).checkpoints[0];
    expect(cp.postflop).toBeNull(); expect(cp.reasons.join(" ")).toContain("paired reader unavailable");
  });
  it.each(["missing", "oversized", "throws"])("rejects %s paired source replies", async kind => {
    const read = vi.fn(() => { if (kind === "throws") throw new Error("read failed"); return { payload: "x".repeat(33000) }; });
    const f = browser(true, kind !== "missing", read);
    expect(await f.target.pokerAIRaiseCapture.checkpoint("postflop_call")).toMatchObject({ accepted: false, retained: true });
    const cp = JSON.parse(f.target.pokerAIRaiseCapture.exportJSON()).checkpoints[0];
    expect(cp.postflop).toBeNull();
    expect(cp.reasons.join(" ")).toContain(kind === "missing" ? "timed out" : kind === "oversized" ? "32KiB" : "unavailable");
    expect(f.snapshot).not.toHaveBeenCalled();
  });
});
