/** Observational metadata audit, never full history or first-UTG activation proof.
 * Scoped activation consumes the bounded reducer's FirstUtgProof contract. */
import type { SourceBootstrapReceipt } from "./firstUtgSource.js";
type Scalar = string | number | boolean | null;
export interface MetadataField { path: string; type: string; value?: Scalar }
export interface FieldInventory { fields: MetadataField[]; truncated: boolean }
export interface SocketMetadata {
  event: "registered" | "rup" | "gC";
  wrapperLength: number;
  envelope: FieldInventory;
  frame: FieldInventory;
  extraWrapperItems: FieldInventory[];
}
const FIELD_LIMIT = 64;
const VALUE_LIMIT = 160;
export const SOCKET_METADATA_LIMIT = 32;
export const LOG_METADATA_LIMIT = 4;
export const LOG_METADATA_ROW_LIMIT = 32;
// Search terms, NOT semantic definitions or proof that PokerNow supplies them.
const valueNames = new Set(["id", "hI", "gN", "now", "pre", "r", "createdAt", "seq", "sequence", "index", "offset",
  "cursor", "watermark", "version", "revision", "eventId", "messageId", "batchId", "snapshotId", "snapshotVersion",
  "nextCursor", "previousCursor", "lastEventId", "firstEventId", "total", "count", "hasMore", "complete"]);
const containers = new Set(["meta", "metadata", "pagination", "coverage"]);
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const kind = (x: unknown) => x === null ? "null" : Array.isArray(x) ? "array" : typeof x;
const scalar = (x: unknown): x is Scalar => x === null || typeof x === "boolean" ||
  typeof x === "number" && Number.isFinite(x) || typeof x === "string" && x.length <= VALUE_LIMIT;
const allowedPath = (path: string) => {
  const parts = path.split(".");
  return parts.length <= 3 && parts.slice(0, -1).every(p => containers.has(p)) && valueNames.has(parts.at(-1)!);
};

/** Key/type inventory at known envelope/frame/row boundaries. No player/card/token values. */
export function inspectMetadataFields(input: unknown): FieldInventory {
  const result: FieldInventory = { fields: [], truncated: false };
  const visit = (value: unknown, prefix: string, depth: number) => {
    if (!object(value)) return;
    for (const [key, field] of Object.entries(value)) {
      if (result.fields.length === FIELD_LIMIT) { result.truncated = true; break; }
      const path = prefix + (/^[A-Za-z0-9_-]{1,64}$/.test(key) ? key : "<unsupported-key>");
      const entry: MetadataField = { path, type: kind(field) };
      if (allowedPath(path) && scalar(field)) entry.value = field;
      result.fields.push(entry);
      if (containers.has(key) && object(field)) {
        if (depth < 2) visit(field, path + ".", depth + 1);
        else result.truncated = true;
      }
    }
  };
  visit(input, "", 0);
  return result;
}

export function inspectSocketMetadata(data: unknown): SocketMetadata | null {
  if (typeof data !== "string" || data.length > 2_000_000 || !data.startsWith("42[")) return null;
  let packet: unknown;
  try { packet = JSON.parse(data.slice(2)); } catch { return null; }
  if (!Array.isArray(packet) || packet.length < 2 || !["registered", "rup", "gC"].includes(packet[0]) || !object(packet[1])) return null;
  const event = packet[0] as SocketMetadata["event"];
  const envelope = packet[1];
  return { event, wrapperLength: packet.length, envelope: inspectMetadataFields(envelope),
    frame: inspectMetadataFields(event === "registered" ? envelope.gameState : envelope),
    extraWrapperItems: packet.slice(2, 4).map(inspectMetadataFields) };
}

/** Page-world bridge remains untrusted. Copy only the bounded diagnostic schema. */
export function validateSocketMetadata(value: unknown): SocketMetadata | null {
  if (!object(value) || typeof value.event !== "string" || !["registered", "rup", "gC"].includes(value.event) ||
      !Number.isSafeInteger(value.wrapperLength) || Number(value.wrapperLength) < 2 ||
      !Array.isArray(value.extraWrapperItems) || value.extraWrapperItems.length > 2) return null;
  const inventory = (raw: unknown): FieldInventory | null => {
    if (!object(raw) || !Array.isArray(raw.fields) || raw.fields.length > FIELD_LIMIT || typeof raw.truncated !== "boolean") return null;
    const fields: MetadataField[] = [];
    for (const entry of raw.fields) {
      if (!object(entry) || typeof entry.path !== "string" || entry.path.length > 200 ||
          typeof entry.type !== "string" || !["null", "array", "string", "number", "boolean", "object", "undefined"].includes(entry.type)) return null;
      const field: MetadataField = { path: entry.path, type: entry.type };
      if (Object.hasOwn(entry, "value")) {
        if (!allowedPath(entry.path) || !scalar(entry.value) || kind(entry.value) !== entry.type) return null;
        field.value = entry.value;
      }
      fields.push(field);
    }
    return { fields, truncated: raw.truncated };
  };
  const envelope = inventory(value.envelope), frame = inventory(value.frame);
  const extras = value.extraWrapperItems.map(inventory);
  return envelope && frame && extras.every(x => x !== null) ? {
    event: value.event as SocketMetadata["event"], wrapperLength: Number(value.wrapperLength),
    envelope, frame, extraWrapperItems: extras as FieldInventory[],
  } : null;
}

function getField(inventory: FieldInventory, name: string): Scalar | undefined {
  return inventory.fields.find(f => f.path === name)?.value;
}
function integerKey(x: Scalar | undefined): bigint | null {
  return typeof x === "number" && Number.isSafeInteger(x) && x >= 0 ? BigInt(x) :
    typeof x === "string" && /^(?:0|[1-9][0-9]{0,159})$/.test(x) ? BigInt(x) : null;
}
function numericRelation(before: Scalar | undefined, after: Scalar | undefined) {
  const a = integerKey(before), b = integerKey(after);
  return a === null || b === null ? "not_comparable" : b === a ? "equal" : b > a ? "increased" : "decreased";
}
const headerValues = new Set(["date", "etag", "last-modified", "content-range", "content-length", "x-total-count", "x-request-id", "x-cursor", "x-watermark", "x-revision"]);
export interface LogMetadata {
  requestedHandId: string; requestedHandNumber: number | null; observedAt: number; httpStatus: number;
  headers: MetadataField[]; headersTruncated: boolean;
  payloadKind: string; envelope: FieldInventory; rowCount: number | null;
  rows: Array<{ responseIndex: number; metadata: FieldInventory }>;
  rowSamplesTruncated: boolean;
  socketHeadAtResponse: { localSequence: number; generation: number; now: Scalar | null } | null;
  timestampLinks: Array<{ responseIndex: number; sourceTimestampRaw: Scalar;
    candidates: Array<{ localSequence: number; generation: number; socketNowRaw: Scalar }>;
    sampledRowsWithSameTimestamp: number }>;
  headTimestampObserved: boolean;
  timestampLinkScope: string;
  provesCurrentDecisionCatchUp: false;
}
export interface SocketContinuity {
  baselineSequence?: number;
  generation: number | null;
  status: "unknown" | "observed_continuous" | "incomplete";
  chainGap: boolean;
  reasons: string[];
  linkedUpdates: number;
  duplicateCandidates: number;
  scope: string;
}
export interface SocketObservation {
  localSequence: number; localConnectionGeneration: number; receivedAt: number;
  metadata: SocketMetadata;
  nowComparedWithPreviousObservation: ReturnType<typeof numericRelation>;
  preExactlyMatchesPreviousNow: boolean | null;
}

/** User-reported candidate names, not decoded PokerNow semantics. Their values
 * were deliberately NOT retained by the metadata-only capture contract.
 */
export const SOCKET_STATE_CANDIDATES = ["players", "seats", "dealerSeat", "dealerID", "eventsData",
  "gT", "cPI", "pITT", "pASA", "sPI", "iHPI", "cRPI"] as const;

export function summarizeSocketStateEvidence(observations: readonly SocketObservation[]) {
  return {
    authority: "observational_only" as const,
    provesRoster: false, provesPositions: false, provesActionWindow: false, provesRaiseLegality: false,
    scope: "This inventory retains field names/types only. The separate sourceStatus.firstUtgEvidence contains bounded production proof projections; sourceStatus.firstUtg is the validated witness. rawValueRetained=false here does not describe that separate bridge.",
    fields: [...SOCKET_STATE_CANDIDATES, "currentPlayer"].map(name => {
      const samples = observations.flatMap(observation => {
        const inventories = name === "currentPlayer" ? [{ boundary: "envelope", inventory: observation.metadata.envelope }]
          : [{ boundary: "frame", inventory: observation.metadata.frame },
            ...(observation.metadata.event === "registered" ? [{ boundary: "envelope", inventory: observation.metadata.envelope }] : [])];
        return inventories.flatMap(({ boundary, inventory }) => inventory.fields.filter(field => field.path === name).map(field => ({
          event: observation.metadata.event, localSequence: observation.localSequence,
          generation: observation.localConnectionGeneration, type: field.type, boundary,
        })));
      });
      return { name, availability: samples.length ? "name_and_type_only" : "not_in_retained_inventory",
        rawValueRetained: false, semanticStatus: "unverified", samples };
    }),
    requiredCapture: "Inspect sourceStatus.firstUtgEvidence first. Older inventory-only exports cannot recover discarded values; a missing production projection requires source values, never reconstruction from names/types or DOM occupancy.",
  };
}

export function createSourceMetadataAudit() {
  const socket: SocketObservation[] = [];
  const logs: LogMetadata[] = [];
  let firstSocket: SocketObservation | null = null;
  let socketObservations = 0, logResponses = 0, lastSequence = -1;
  const newContinuity = (generation: number | null): SocketContinuity => ({ generation, status: "unknown", chainGap: false,
    reasons: [], linkedUpdates: 0, duplicateCandidates: 0,
    scope: "Observed socket metadata within one connection generation only. Not full-hand, reconnect/backfill or log coverage proof." });
  let continuity = newContinuity(null);
  const issue = (reason: string, gap = false) => {
    if (!continuity.reasons.includes(reason)) continuity.reasons.push(reason);
    continuity.chainGap ||= gap;
    continuity.status = "incomplete";
  };
  return {
    socket(raw: unknown, localSequence: unknown, generation: unknown, at: number, bootstrap?: SourceBootstrapReceipt) {
      if (!Number.isSafeInteger(localSequence) || Number(localSequence) <= lastSequence ||
          !Number.isSafeInteger(generation) || Number(generation) < 1) return;
      const metadata = validateSocketMetadata(raw);
      if (!metadata) return;
      // Stale-generation frames never replace the current generation's baseline.
      if (continuity.generation !== null && Number(generation) < continuity.generation) {
        issue("Stale connection-generation observation rejected.", true); return;
      }
      const oldSequence = lastSequence;
      lastSequence = Number(localSequence);
      const previous = socket.at(-1);
      const before = previous && previous.localConnectionGeneration === generation ? getField(previous.metadata.frame, "now") : undefined;
      const now = getField(metadata.frame, "now"), pre = getField(metadata.frame, "pre");
      // Internal receipt already validates full values. Revalidating it against
      // the lossy field inventory creates a competing, weaker source of truth.
      const validatedBootstrap = bootstrap && bootstrap.sequence === localSequence && bootstrap.generation === generation;
      if (validatedBootstrap && bootstrap.kind === "registration" && metadata.event === "registered") {
        continuity = newContinuity(Number(generation));
        continuity.baselineSequence = Number(localSequence);
        // The baseline starts here. No claim about the discarded prefix.
      } else if (validatedBootstrap && bootstrap.kind === "equivalent_refresh" && metadata.event === "rup" &&
          continuity.generation === generation && !continuity.reasons.length &&
          Number(localSequence) === oldSequence + 1 && previous?.metadata.event === "registered" && now === before) {
        // Same complete bounded state/cursor, not a new action or linked update.
      } else if (continuity.generation !== generation) {
        continuity = newContinuity(Number(generation));
        if (metadata.event !== "registered" || integerKey(now) === null) {
          issue("No valid registration baseline observed in this connection generation.");
        }
      } else {
        if (Number(localSequence) !== oldSequence + 1) issue("Local metadata observations skipped; the observed socket chain cannot be certified.", true);
        if (metadata.event !== "gC") {
          issue("Mid-generation full/registration frame has no validated continuity/backfill contract.");
        } else if (now === before && pre === getField(previous!.metadata.frame, "pre")) {
          continuity.duplicateCandidates++;
          issue("Repeated pre/now pair; duplicate candidate, not proven identical event payload.");
        } else {
          if (before == null || pre == null || integerKey(now) === null || integerKey(before) === null) {
            issue("Missing or unsupported cursor/predecessor; continuity is unknown.");
          } else if (pre !== before || numericRelation(before, now) !== "increased") {
            issue("Predecessor mismatch or non-increasing cursor; possible gap, replay or out-of-order frame.", true);
          } else {
            continuity.linkedUpdates++;
            if (!continuity.reasons.length) continuity.status = "observed_continuous";
          }
        }
      }
      const entry: SocketObservation = { localSequence: Number(localSequence), localConnectionGeneration: Number(generation), receivedAt: at, metadata,
        nowComparedWithPreviousObservation: numericRelation(before, now),
        preExactlyMatchesPreviousNow: before == null || pre == null ? null : before === pre };
      firstSocket ??= entry; socket.push(entry); socketObservations++;
      if (socket.length > SOCKET_METADATA_LIMIT) socket.shift();
    },
    response(headers: Headers, httpStatus: number, handId: string, handNumber: number | null, at: number) {
      const fields: MetadataField[] = [];
      let truncated = false;
      // Header names are inventory only; cookie/auth/unknown header values are never copied.
      headers.forEach((value, name) => {
        if (fields.length === FIELD_LIMIT) { truncated = true; return; }
        const field: MetadataField = { path: name, type: "string" };
        if (headerValues.has(name) && value.length <= VALUE_LIMIT) field.value = value;
        fields.push(field);
      });
      const entry: LogMetadata = { requestedHandId: handId, requestedHandNumber: handNumber, observedAt: at, httpStatus,
        headers: fields, headersTruncated: truncated, payloadKind: "not_inspected", envelope: { fields: [], truncated: false },
        rowCount: null, rows: [], rowSamplesTruncated: false,
        socketHeadAtResponse: socket.length ? { localSequence: socket.at(-1)!.localSequence,
          generation: socket.at(-1)!.localConnectionGeneration, now: getField(socket.at(-1)!.metadata.frame, "now") ?? null } : null,
        timestampLinks: [], headTimestampObserved: false, provesCurrentDecisionCatchUp: false,
        timestampLinkScope: "Exact integer createdAt = socket now * 100 candidate only; units, unique event identity, hand association and complete log coverage are unproven. Compared with retained frames in the response-head generation, at/before that head. Non-match may be a non-log update, lag, truncation or missing evidence. Head match is not a catch-up certificate." };
      logs.push(entry); logResponses++;
      if (logs.length > LOG_METADATA_LIMIT) logs.shift();
      return entry;
    },
    payload(entry: LogMetadata, payload: unknown) {
      entry.payloadKind = kind(payload);
      entry.envelope = inspectMetadataFields(payload);
      entry.rowCount = Array.isArray(payload) ? payload.length : null;
      // No envelope unwrapping or new parser acceptance. An unsupported object remains rejected.
      if (Array.isArray(payload)) {
        entry.rows = payload.slice(0, LOG_METADATA_ROW_LIMIT).map((row, responseIndex) => ({ responseIndex, metadata: inspectMetadataFields(row) }));
        entry.rowSamplesTruncated = payload.length > LOG_METADATA_ROW_LIMIT;
        const head = entry.socketHeadAtResponse;
        const samples = entry.rows.map(row => ({ row, raw: getField(row.metadata, "createdAt") }));
        entry.timestampLinks = samples.flatMap(({ row, raw }) => {
          const timestamp = integerKey(raw);
          if (timestamp === null || raw == null) return [];
          const candidates = socket.filter(frame => head && frame.localConnectionGeneration === head.generation &&
            frame.localSequence <= head.localSequence && integerKey(getField(frame.metadata.frame, "now")) !== null &&
            integerKey(getField(frame.metadata.frame, "now"))! * 100n === timestamp).map(frame => ({
              localSequence: frame.localSequence, generation: frame.localConnectionGeneration,
              socketNowRaw: getField(frame.metadata.frame, "now")!,
            }));
          return [{ responseIndex: row.responseIndex, sourceTimestampRaw: raw, candidates,
            sampledRowsWithSameTimestamp: samples.filter(s => integerKey(s.raw) === timestamp).length }];
        });
        entry.headTimestampObserved = entry.timestampLinks.some(link => link.candidates.some(frame => frame.localSequence === head?.localSequence));
      }
    },
    snapshot() {
      return { authority: "observational_only", provesCompletePrefix: false,
        scope: "Known socket envelope/frame and log response boundaries. Search-name scalar values are hypotheses, not semantic proof. Unknown object interiors/values are omitted; absence here does not prove absence upstream.",
        localFields: "localSequence, localConnectionGeneration, receivedAt, observedAt and responseIndex are generated by this reader, not server action IDs.",
        comparisonScope: "Numeric magnitude and exact pre/previous-now equality between retained observations only; no units, contiguity, causal order or catch-up guarantee.",
        socketContinuity: { ...continuity, reasons: [...continuity.reasons] },
        socketStateEvidence: summarizeSocketStateEvidence(firstSocket && socket[0] !== firstSocket ? [firstSocket, ...socket] : socket),
        firstSocket, socketObservations, socketSamplesDropped: Math.max(0, socketObservations - socket.length), socket,
        logResponses, logSamplesDropped: Math.max(0, logResponses - logs.length), logs };
    },
  };
}
