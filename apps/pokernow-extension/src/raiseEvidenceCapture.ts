import { isControlVisible, RAISE_SELECTORS, readRaiseControl } from "./raiseControlRead.js";
import { RAW_CAPTURE_KEY, type RawSocketCapture } from "./rawSocketCapture.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import type { PostflopReadinessCapture } from "./postflopReadinessCapture.js";
import { tableIdFromPath } from "./pokerNowTransport.js";

// Diagnostics only. This channel is never consumed by the source reducer/policy.
export const RAISE_CAPTURE_KEY = "poker-ai:raise-evidence-capture";
const CHANNEL = "poker-ai:raise-evidence-diagnostics:v1";
export const CHECKPOINT_LABELS = ["panel_opened", "min_raise_selected", "five_chips_entered", "postflop_call"] as const;
const LIMITS = { checkpoints: 8, bytes: 128 * 1024 };
const bytes = (text: string) => new TextEncoder().encode(text).byteLength;
const enabled = (target: Window) => {
  try { return target.sessionStorage.getItem(RAISE_CAPTURE_KEY) === "1"; } catch { return false; }
};

/** Observe native validity properties, never call checkValidity/reportValidity. */
export function readRaiseCheckpointDOM(root: ParentNode, visible = isControlVisible) {
  const forms = [...root.querySelectorAll<HTMLFormElement>(RAISE_SELECTORS.form)];
  const node = (element: Element) => ({ outerHTML: element.outerHTML, visible: visible(element),
    disabledAttribute: element.getAttribute("disabled"), ariaDisabled: element.getAttribute("aria-disabled"),
    blockingAncestors: [...function* () {
      for (let p: Element | null = element; p; p = p.parentElement) {
        if (p.matches('[hidden], [disabled], [inert], [aria-disabled="true"]')) {
          yield { tag: p.tagName, class: p.getAttribute("class"), hidden: p.getAttribute("hidden"),
            disabled: p.getAttribute("disabled"), inert: p.getAttribute("inert"), ariaDisabled: p.getAttribute("aria-disabled") };
        }
      }
    }()] });
  const input = (element: HTMLInputElement) => ({ ...node(element), liveValue: element.value ?? null,
    valueAttribute: element.getAttribute("value"), type: element.getAttribute("type"),
    min: element.getAttribute("min"), max: element.getAttribute("max"), step: element.getAttribute("step"),
    pattern: element.getAttribute("pattern"), inputMode: element.getAttribute("inputmode"),
    disabled: element.disabled ?? null, readOnly: element.readOnly ?? null, willValidate: element.willValidate ?? null,
    validity: element.validity ? Object.fromEntries(["valid", "badInput", "customError", "patternMismatch", "rangeOverflow",
      "rangeUnderflow", "stepMismatch", "tooLong", "tooShort", "typeMismatch", "valueMissing"]
      .map(key => [key, element.validity[key as keyof ValidityState]])) : null });
  return { origin: "manual DOM read; attributes/native validity are observations, not server legality",
    formCount: forms.length, visibleFormCount: forms.filter(visible).length,
    selected: readRaiseControl(root, visible),
    forms: forms.map(form => ({ ...node(form), noValidate: form.noValidate ?? null,
      inputs: [...form.querySelectorAll<HTMLInputElement>(".raise-bet-value input.value")].map(input),
      bbDisplays: [...form.querySelectorAll(".raise-bet-value .bb-value")].map(e => ({ ...node(e), text: e.textContent })),
      submits: [...form.querySelectorAll<HTMLInputElement>(RAISE_SELECTORS.submit)].map(input) })) };
}

/** Copy only already-existing diagnostic facts. No reconstruction in MAIN. */
export function raiseSourceObservation(snapshot: LiveTimelineDiagnostic, at: number) {
  const s = snapshot.sourceStatus, carried = s.firstUtgEvidence.carriedState;
  const frame = carried?.projection.frame;
  return { origin: "isolated-world existing liveTimeline.snapshot; observational copy, not a new proof",
    capturedAt: at, connected: s.connected, identity: s.identity,
    currentHand: { handId: snapshot.current.handId, handNumber: snapshot.current.handNumber },
    sourceState: carried ? { generation: carried.generation, localBridgeSequence: carried.sequence,
      // Only present fields are copied: missing differs from explicit null.
      fields: Object.fromEntries(["id", "hI", "gN", "now", "pre", "cPI", "pITT", "gT"]
        .filter(k => Object.hasOwn(frame!, k)).map(k => [k, frame![k]])) } : null,
    firstUtgProof: s.firstUtgProof,
    freshness: s.firstUtgEvidence.freshness,
    reason: s.firstUtgEvidence.reason, historyComplete: false as const };
}
export type RaiseSourceObservation = ReturnType<typeof raiseSourceObservation>;

/** Install in ISOLATED, opt-in only; responses cannot update runtime state. */
export function installRaiseEvidenceResponder(target: Window, snapshot: () => LiveTimelineDiagnostic,
  postflopRead?: () => PostflopReadinessCapture) {
  if (!enabled(target)) return;
  let remainingRequests = 8;
  target.addEventListener("message", event => {
    if (!enabled(target) || remainingRequests <= 0 || event.source !== target || event.origin !== target.location.origin ||
        event.data?.channel !== CHANNEL || event.data.type !== "checkpoint_source" ||
        typeof event.data.requestId !== "string" || event.data.requestId.length > 100) return;
    remainingRequests--;
    let source: RaiseSourceObservation | null = null, error: string | null = null;
    let postflop: PostflopReadinessCapture | null = null;
    try {
      if (event.data.label === "postflop_call") {
        postflop = postflopRead?.() ?? null;
        if (!postflop) error = "Postflop paired reader unavailable; no cached observation substituted.";
      } else source = raiseSourceObservation(snapshot(), Date.now());
      if (bytes(JSON.stringify({ source, postflop })) > 32 * 1024) {
        source = null; postflop = null; error = "Source observation exceeds 32KiB; rejected without truncation.";
      }
    } catch { error = "Source observation unavailable."; }
    target.postMessage({ channel: CHANNEL, type: "checkpoint_source_result", requestId: event.data.requestId, source, postflop, error }, target.location.origin);
  });
}

export interface SourceReply { source: RaiseSourceObservation | null; error: string | null; postflop?: PostflopReadinessCapture | null }
type Dependencies = {
  raw: RawSocketCapture;
  dom: () => ReturnType<typeof readRaiseCheckpointDOM>;
  source: (label: string) => Promise<SourceReply>;
  tableUrl: () => string;
  now: () => number;
  monotonic: () => number;
  disarm: () => void;
};

/** Bounded diagnostics store. Never read by recommendation or proof code. */
export class RaiseEvidenceCollector {
  private records: string[] = [];
  private retainedBytes = 2; // Complete JSON array, including delimiters.
  private busy = false;
  private active: boolean;
  private exported = false;
  private refused = 0;
  private stopReason: string | null;
  private priorBinding: string | null = null;
  constructor(on: boolean, private readonly d: Dependencies, private readonly limits = LIMITS) {
    this.active = on; this.stopReason = on ? null : "not_enabled_before_page_load";
  }
  status() { return { developmentOnly: true, authoritative: false, historyComplete: false, active: this.active,
    busy: this.busy, checkpointCount: this.records.length, retainedBytes: this.retainedBytes,
    refusedCheckpoints: this.refused, stopReason: this.stopReason, limits: { ...this.limits }, rawRecorder: this.d.raw.status() }; }
  private refuse(reason: string) { this.refused++; return { accepted: false, reason }; }
  private retain(record: unknown) {
    const json = JSON.stringify(record);
    const size = this.retainedBytes + bytes(json) + (this.records.length ? 1 : 0);
    if (size > this.limits.bytes) { this.stop("checkpoint_byte_limit"); return this.refuse("checkpoint_byte_limit; whole checkpoint rejected, no truncation"); }
    this.records.push(json); this.retainedBytes = size;
    if (this.records.length === this.limits.checkpoints) this.stop("checkpoint_limit");
    return { accepted: true, checkpoint: this.records.length };
  }
  stop(reason = "manually_disabled") {
    this.active = false; this.stopReason = reason; this.d.raw.stop(); this.d.disarm();
  }
  async checkpoint(label: string) {
    if (!this.active) return this.refuse(this.stopReason ?? "inactive");
    if (this.busy) return this.refuse("checkpoint_already_pending");
    if (!(CHECKPOINT_LABELS as readonly string[]).includes(label)) return this.refuse("unrecognized_manual_label");
    if (this.records.length >= this.limits.checkpoints) { this.stop("checkpoint_limit"); return this.refuse("checkpoint_limit"); }
    this.busy = true;
    try {
      const at = this.d.now(), performanceTime = this.d.monotonic(), tableUrl = this.d.tableUrl();
      const rawBefore = this.d.raw.status(), dom = label === "postflop_call" ? null : this.d.dom();
      const reply = await this.d.source(label);
      if (!this.active) return this.refuse("capture_stopped_while_checkpoint_pending");
      const completedAt = this.d.now(), rawAfter = this.d.raw.status(), source = reply.source;
      if (label === "postflop_call") {
        const pair = reply.postflop ?? null, b = pair?.binding, last = rawAfter.lastRetainedFrame;
        const reasons = [...(pair?.reasons ?? ["No paired isolated-world observation."]), ...(reply.error ? [reply.error] : [])];
        if (!pair?.readinessMatched || !b || pair.evidence?.ui.status !== "observed_matching") reasons.push("Postflop readiness did not match.");
        if (!pair || !b || ![at, completedAt, pair.startedAt, pair.completedAt].every(Number.isSafeInteger) ||
            at > pair.startedAt || pair.startedAt > pair.completedAt || pair.completedAt > completedAt ||
            at < b.receivedAt || completedAt >= b.expiresAt || b.expiresAt !== b.receivedAt + 10_000)
          reasons.push("Capture/reply is stale or outside the original source deadline.");
        if (!rawBefore.active || !rawAfter.active || !rawAfter.registeredCaptured || rawAfter.rejectedFrames ||
            JSON.stringify(rawBefore) !== JSON.stringify(rawAfter) || !last || !b ||
            last.sourceCursor !== b.cursor || last.connectionGeneration !== b.generation || last.localReceivedAt > at)
          reasons.push("Raw recorder is missing, changed, rejected frames, or does not match the source cursor/generation.");
        if (tableUrl !== this.d.tableUrl() || pair?.tableUrl !== tableUrl ||
            !b || tableIdFromPath(new URL(tableUrl).pathname) !== b.tableId) reasons.push("Table URL mismatch.");
        const readinessMatched = reasons.length === 0;
        const saved = this.retain({ label, capturedAt: at, completedAt, performanceTime, tableUrl, postflop: pair,
          rawRecorderBefore: rawBefore, rawRecorderAfter: rawAfter, readinessMatched, reasons,
          legalityCertified: false, historyComplete: false, liveRecommendationsAllowed: false,
          correlation: "Local read/receipt pairing only; independent recorder/bridge sequences, never server permission or screenshot timing." });
        if (saved.accepted && !readinessMatched) this.refused++;
        return saved.accepted ? { ...saved, accepted: readinessMatched, retained: true, readinessMatched, reasons } : saved;
      }
      if (!dom) return this.refuse("Missing Raise DOM read.");
      const missing: string[] = ["Independent minimum, denomination and five-chip server legality are not certified by this collector."], contradictions: string[] = [];
      if (reply.error) missing.push(reply.error);
      if (!source) missing.push("No isolated-world source snapshot; source identity/proof unavailable.");
      if (source && !source.connected) missing.push("Source disconnected.");
      if (source && (source.capturedAt < at || source.capturedAt > completedAt)) contradictions.push("Source snapshot time is outside the checkpoint interval; stale or clock-inconsistent observation.");
      if (!source?.identity) missing.push("Hand/player identity unavailable.");
      if (!source?.sourceState) missing.push("Carried source actor/generation/cursor unavailable.");
      if (!source?.firstUtgProof) missing.push("No current firstUtgProof. " + (source?.reason ?? ""));
      const expiry = source?.firstUtgProof?.expiresAt ?? source?.freshness.certificate?.expiresAt;
      if (expiry !== undefined && completedAt >= expiry) missing.push("Original source proof expired; checkpoint cannot renew it.");
      if (source?.firstUtgProof && source.firstUtgProof.witness.receivedAt > at) contradictions.push("Source witness arrived after DOM checkpoint; not simultaneous evidence.");
      if (!rawBefore.active || !rawAfter.active || rawAfter.rejectedFrames || !rawAfter.registeredCaptured) missing.push("Raw recorder inactive, incomplete, rejected frames, or registration missing; inspect recorder status.");
      if (rawBefore.frameCount !== rawAfter.frameCount) contradictions.push("Incoming frames changed during checkpoint; source and DOM are not an atomic snapshot.");
      if (source?.sourceState && rawAfter.lastRetainedFrame && source.sourceState.generation !== rawAfter.lastRetainedFrame.connectionGeneration) {
        contradictions.push("Raw recorder and source snapshot report different connection generations.");
      }
      if (this.d.tableUrl() !== tableUrl) contradictions.push("Table URL changed during checkpoint.");
      if (completedAt < at) contradictions.push("Local clock regressed during checkpoint.");
      if (!dom.selected.formVisible) missing.push("No visible Raise form.");
      if (dom.selected.selectedRaiseToChips === null) missing.push("Selected chip amount unreadable or missing.");
      if (!dom.selected.raiseSubmitVisible || dom.selected.raiseSubmitEnabled !== true) missing.push("Raise submit absent, hidden or disabled.");
      contradictions.push(...dom.selected.issues);
      if (label === "five_chips_entered" && dom.selected.selectedRaiseToChips !== 5) contradictions.push("Manual five-chip label does not match the observed selected amount.");
      const bb = source?.firstUtgProof?.witness.bigBlind;
      const display = dom.selected.displayedBBText?.match(/^\s*(\d+(?:\.\d+)?)\s*BB\s*$/i);
      if (bb && display && dom.selected.selectedRaiseToChips !== null &&
          Math.abs(Number(display[1]) * bb - dom.selected.selectedRaiseToChips) > 1e-8) {
        contradictions.push("Selected chips and displayed BB disagree under the copied source-proof big blind.");
      }
      const fields = source?.sourceState?.fields;
      if (fields && Object.hasOwn(fields, "cPI") && Object.hasOwn(fields, "pITT") && fields.cPI !== fields.pITT) contradictions.push("Source cPI/pITT differ; do not infer a single current actor.");
      const binding = JSON.stringify([tableUrl, source?.identity, source?.sourceState]);
      if (this.priorBinding !== null && this.priorBinding !== binding) contradictions.push("Source/table/actor binding differs from previous checkpoint; records are separate observations, not merged proof.");
      const record = { label, labelOrigin: "user-declared operation; not verified or performed by collector",
        capturedAt: at, completedAt, performanceTime, tableUrl, source, dom,
        rawRecorderBefore: rawBefore, rawRecorderAfter: rawAfter,
        correlation: "Local timestamps/frame counts only; raw capture sequence is not bridge/source sequence. No atomic or authoritative association claimed.",
        missingEvidence: missing, contradictions, legalityCertified: false, historyComplete: false };
      const saved = this.retain(record);
      if (saved.accepted) this.priorBinding = binding;
      return { ...saved, missingEvidence: missing, contradictions };
    } catch {
      return this.refuse("checkpoint_read_failed; no partial record retained");
    } finally { this.busy = false; }
  }
  exportJSON() {
    if (this.busy) throw new Error("Wait for the pending checkpoint before export.");
    if (this.exported) throw new Error("Evidence already exported; reload for a new capture.");
    if (this.stopReason === "not_enabled_before_page_load") throw new Error("Collector was not enabled.");
    this.exported = true;
    if (this.active) this.stop("exported");
    // Embed original raw JSON tokens, not parsed/re-serialized source numbers.
    return `{"version":1,"origin":"temporary local action-control diagnostics; never legality proof","exportedAt":${this.d.now()},"capture":${JSON.stringify(this.status())},"checkpoints":[${this.records.join(",")}],"rawSocket":${this.d.raw.exportJSON()}}`;
  }
}

/** MAIN-world manual console API; the only bridge operation requests diagnostics. */
export function installRaiseEvidenceCollector(target: Window, raw: RawSocketCapture) {
  const collector = new RaiseEvidenceCollector(enabled(target), {
    raw, dom: () => readRaiseCheckpointDOM(target.document), tableUrl: () => target.location.origin + target.location.pathname,
    now: () => Date.now(), monotonic: () => target.performance.now(),
    disarm: () => { try { target.sessionStorage.removeItem(RAISE_CAPTURE_KEY); target.sessionStorage.removeItem(RAW_CAPTURE_KEY); } catch { /* optional storage */ } },
    source: (label) => new Promise<SourceReply>(resolve => {
      const requestId = crypto.randomUUID();
      const finish = (result: SourceReply) => { target.clearTimeout(timer); target.removeEventListener("message", receive); resolve(result); };
      const receive = (event: MessageEvent) => {
        if (event.source !== target || event.origin !== target.location.origin || event.data?.channel !== CHANNEL ||
            event.data.type !== "checkpoint_source_result" || event.data.requestId !== requestId) return;
        try {
          if (bytes(JSON.stringify(event.data)) > 34 * 1024) { finish({ source: null, error: "Source reply exceeds diagnostic limit." }); return; }
          finish({ source: event.data.source ?? null, postflop: event.data.postflop ?? null, error: event.data.error ?? null });
        } catch { finish({ source: null, error: "Unreadable diagnostic source reply." }); }
      };
      const timer = target.setTimeout(() => finish({ source: null, error: "Source diagnostic response timed out; no cached proof substituted." }), 750);
      target.addEventListener("message", receive);
      target.postMessage({ channel: CHANNEL, type: "checkpoint_source", requestId, label }, target.location.origin);
    }),
  });
  Object.defineProperty(target, "pokerAIRaiseCapture", { configurable: true, value: Object.freeze({
    status: () => collector.status(), checkpoint: (label: string) => collector.checkpoint(label),
    exportJSON: () => collector.exportJSON(), stop: () => collector.stop(),
  }) });
  return collector;
}
