// Temporary, opt-in raw evidence capture. Never an input to poker proofs/policy.
export const RAW_CAPTURE_KEY = "poker-ai:raw-socket-capture";
const MAX_FRAMES = 500;
const MAX_CHARACTERS = 4 * 1024 * 1024;

// Keep source JSON tokens rather than reserializing parsed numbers (which can
// round large integers). JSON.parse validates syntax; this scanner only locates
// original value slices. Strings/arrays/objects retain their original contents.
function endOfValue(text: string, start: number): number {
  let depth = 0;
  let quoted = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === "\\") i++;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      if (depth === 0) return i;
      depth--;
    } else if (c === "," && depth === 0) return i;
  }
  return text.length;
}

function members(object: string): Array<{ key: string; raw: string }> {
  const result: Array<{ key: string; raw: string }> = [];
  let i = 1;
  while (i < object.length) {
    while (/\s|,/.test(object[i] ?? "") && i < object.length) i++;
    if (object[i] === "}") break;
    const keyStart = i++;
    while (i < object.length) {
      if (object[i] === "\\") i += 2;
      else if (object[i++] === '"') break;
    }
    const key = JSON.parse(object.slice(keyStart, i)) as string;
    while (object[i] !== ":" && i < object.length) i++;
    i++;
    const end = endOfValue(object, i);
    result.push({ key, raw: object.slice(i, end).trim() });
    i = end;
  }
  return result;
}

function registrationProjection(payload: string): string {
  const fields: string[] = [];
  for (const { key, raw } of members(payload)) {
    if (key === "gameState") fields.push(`"gameState":${raw}`);
    if (key === "currentPlayer") {
      // Only identity is in scope; do not retain other registration/player data.
      const selected = raw.startsWith("{")
        ? `{${members(raw).filter(field => field.key === "id").map(field => `"id":${field.raw}`).join(",")}}`
        : raw;
      fields.push(`"currentPlayer":${selected}`);
    }
  }
  return `{${fields.join(",")}}`;
}

type Frame = { localReceiveSequence: number; localReceivedAt: number; connectionGeneration: number;
  event: string; payloadJSON: string };

export class RawSocketCapture {
  private frames: Frame[] = [];
  private characters = 0;
  private sourceCharacters = 0;
  private active: boolean;
  private stopReason: string | null;
  private rejectedFrames = 0;
  constructor(enabled: boolean, private readonly limits = { frames: MAX_FRAMES, characters: MAX_CHARACTERS }) {
    this.active = enabled;
    this.stopReason = enabled ? null : "not_enabled_before_page_load";
  }

  observe(data: unknown, generation: number, receivedAt = Date.now()): void {
    if (!this.active || typeof data !== "string" || !data.startsWith("42[")) return;
    // Bound parsing as well as retained data. An oversized event may hide a
    // target frame: stop explicitly rather than silently claiming it was kept.
    if (data.length > this.limits.characters) { this.stop("incoming_frame_size_limit"); return; }
    try {
      const wrapper: unknown = JSON.parse(data.slice(2));
      if (!Array.isArray(wrapper) || !["registered", "gC", "rup"].includes(wrapper[0])) return;
      if (wrapper.length < 2) {
        this.rejectedFrames++; return;
      }
      const event = wrapper[0] as string;
      const body = data.slice(2);
      const start = endOfValue(body, 1) + 1;
      const raw = body.slice(start, endOfValue(body, start)).trim();
      const payloadJSON = event === "registered" && raw.startsWith("{") ? registrationProjection(raw) : raw;
      if (this.frames.length >= this.limits.frames) { this.stop("frame_limit"); return; }
      // Charge the complete source frame: JS substring storage may retain its
      // backing string even when only a small registration projection is kept.
      if (this.sourceCharacters + data.length > this.limits.characters) { this.stop("buffer_size_limit"); return; }
      this.frames.push({ localReceiveSequence: this.frames.length + 1, localReceivedAt: receivedAt,
        connectionGeneration: generation, event, payloadJSON });
      this.characters += payloadJSON.length;
      this.sourceCharacters += data.length;
    } catch { this.rejectedFrames++; }
  }

  stop(reason = "exported_or_manually_stopped"): void {
    if (this.active) { this.active = false; this.stopReason = reason; }
  }

  status() {
    const last = this.frames.at(-1);
    const payload = last ? JSON.parse(last.payloadJSON) : null;
    const cursor = last?.event === "registered" ? payload?.gameState?.now : payload?.now;
    return { temporaryDiagnosticsOnly: true, authoritativeOrdering: false, historyCompletenessProof: false,
      active: this.active, stopReason: this.stopReason, frameCount: this.frames.length,
      retainedJsonCharacters: this.characters, rejectedFrames: this.rejectedFrames,
      retainedSourceCharacters: this.sourceCharacters,
      registeredCaptured: this.frames.some(frame => frame.event === "registered"),
      lastRetainedFrame: last ? { localReceiveSequence: last.localReceiveSequence, localReceivedAt: last.localReceivedAt,
        connectionGeneration: last.connectionGeneration, event: last.event,
        // Diagnostic linkage only; raw and bridge sequences are independent.
        sourceCursor: Number.isSafeInteger(cursor) ? cursor as number : null } : null,
      limits: { ...this.limits } };
  }

  /** Existing raw buffer, read only. Each field keeps its own receipt/cursor.
   * No patch reducer, zero filling, source semantics or decision authority. */
  postflopObservations() {
    const generation = this.frames.at(-1)?.connectionGeneration;
    const fields: Record<string, { value: unknown; localReceivedAt: number; sourceCursor: unknown;
      localReceiveSequence: number; connectionGeneration: number }> = {};
    const contributionPatches: Array<{ value: unknown; localReceivedAt: number; sourceCursor: unknown;
      localReceiveSequence: number; connectionGeneration: number }> = [];
    let truncated = false, boundaryObserved = false;
    for (const entry of [...this.frames].reverse()) {
      if (entry.connectionGeneration !== generation) break;
      const payload = JSON.parse(entry.payloadJSON), frame = entry.event === "registered" ? payload?.gameState : payload;
      if (!frame || typeof frame !== "object") continue;
      const sample = (value: unknown) => ({ value, localReceivedAt: entry.localReceivedAt, sourceCursor: frame.now ?? null,
        localReceiveSequence: entry.localReceiveSequence, connectionGeneration: entry.connectionGeneration });
      if (entry.event === "registered" && !fields.heroId && payload.currentPlayer?.id) fields.heroId = sample(payload.currentPlayer.id);
      if (!boundaryObserved) {
        for (const key of ["id", "hI", "gN", "cPI", "pITT", "gT", "oTC"])
          if (!Object.hasOwn(fields, key) && Object.hasOwn(frame, key)) fields[key] = sample(frame[key]);
        if (Object.hasOwn(frame, "tB")) {
          if (contributionPatches.length < 24) contributionPatches.push(sample(frame.tB)); else truncated = true;
        }
        if (Object.hasOwn(frame, "hI")) boundaryObserved = true;
      }
    }
    return { status: "unverified_raw_field_observations", fields, contributionPatches: contributionPatches.reverse(),
      contributionSamplesTruncated: truncated, handIdentityFieldObserved: boundaryObserved,
      scope: "Each value is a separate source field observation, not reconstructed current state. Patches/deletions are not totals or zero. Raw export retains original tokens; parsed diagnostic numbers are unverified." };
  }

  exportJSON(): string {
    this.stop();
    const frames = this.frames.map(({ payloadJSON, ...metadata }) =>
      `${JSON.stringify(metadata).slice(0, -1)},"payload":${payloadJSON}}`);
    return `{"capture":${JSON.stringify(this.status())},"frames":[${frames.join(",")}]}`;
  }
}

export function installRawSocketCapture(target: Window): RawSocketCapture {
  let enabled = false;
  try { enabled = target.sessionStorage.getItem(RAW_CAPTURE_KEY) === "1"; } catch { /* Disabled by default. */ }
  const capture = new RawSocketCapture(enabled);
  const disarm = () => { try { target.sessionStorage.removeItem(RAW_CAPTURE_KEY); } catch { /* No storage required. */ } };
  Object.defineProperty(target, "pokerAIRawCapture", { configurable: true, value: Object.freeze({
    status: () => capture.status(),
    stop: () => { capture.stop(); disarm(); },
    exportJSON: () => { disarm(); return capture.exportJSON(); },
  }) });
  return capture;
}
