import { emptyActionHistory, updateActionHistory, type ActionHistoryContext } from "./actionHistory.js";
import type { PokerGameState, SeatState } from "./gameState.js";
import { applyPlayerSeatMapping, emptySeatMapping, parsePlayerStacks, type HandSeatMapping } from "./playerSeatMapping.js";
import { observedHandAccounting, type ObservedHandAccounting } from "./handAccounting.js";
import { emptyHistoryCoverage, observeLogBatch, recordRejectedLogBatch, refreshHistoryCoverage, type HistoryCoverage } from "./historyCoverage.js";

export const TIMELINE_LIMIT = 500;
export type TimelineAction = "observation_start" | "hand_start" | "hand_end" | "player_stacks" | "player_join" | "hole_cards" | "street" | "post" | "check" | "bet" | "call" | "raise" | "fold" | "fold_observed" | "all-in" | "uncalled_return" | "showdown" | "settlement" | "arrival" | "departure" | "wager_observed" | "unparsed" | "gap";
export interface TimelineEvent {
  id: string;
  /** Presentation order, NEVER a server sequence or a completeness certificate. */
  sequence: number;
  street: PokerGameState["street"] | null;
  actor: { seat: number | null; name: string | null; playerId: string | null; isHero: boolean | null } | null;
  /** Links a server actor's seat to the exact Player stacks evidence; DOM actors have no such proof. */
  actorSeatMappingEventId: string | null;
  action: TimelineAction;
  amount: number | null;
  amountMeaning: "reported_unspecified" | "street_total" | "award_reported" | "return_reported" | null;
  wagerAction: "bet" | "call" | "raise" | "post" | null;
  raiseTo: number | null;
  allIn: boolean | null;
  source: "pokernow_log_v3" | "dom_snapshot";
  confidence: "source_reported" | "inferred" | "unknown";
  order: "timestamp_candidate" | "ambiguous" | "observation_batch";
  /** Exact integer ordering key, NOT epoch milliseconds or a validated server sequence. */
  sourceTimestamp: number | null;
  /** Original JSON value, including numeric-string text. Timestamp units are unknown. */
  sourceTimestampRaw: number | string | null;
  observation: number | null;
  observedAt: number;
  evidence: string;
}
export interface HandTimeline {
  handId: string;
  identityKind: "source_reported" | "local_segment";
  handNumber: number | null;
  historyComplete: false;
  reasons: string[];
  events: TimelineEvent[];
  snapshotEvents: TimelineEvent[];
  source: "pokernow_log_v3" | "dom_snapshot";
  droppedEvents: number;
  seatMapping: HandSeatMapping;
  accounting: ObservedHandAccounting;
  coverage: HistoryCoverage;
}
export interface LogRow { createdAt: number | string; msg: string }
class LogRowValidationError extends Error {
  constructor(message: string, readonly rowIndex: number | null) { super(message); }
}
function timestampKey(value: unknown): number {
  // Live log_v3 sends canonical decimal strings. Keep the original safe-integer
  // numeric contract too; reject coercion, rounding, signs, whitespace and exponents.
  if (typeof value !== "number" && !(typeof value === "string" && /^(?:0|[1-9][0-9]{0,15})$/.test(value))) {
    throw new Error("Unsupported log row schema; expected safe nonnegative integer createdAt (number or decimal string) and bounded msg.");
  }
  const key = Number(value);
  if (!Number.isSafeInteger(key) || key < 0 || Object.is(key, -0) || (typeof value === "string" && String(key) !== value)) {
    throw new Error("Unsupported log row schema; expected safe nonnegative integer createdAt (number or decimal string) and bounded msg.");
  }
  return key;
}
export function parseLogRows(payload: unknown): LogRow[] {
  if (!Array.isArray(payload) || payload.length > 2000) throw new Error("Log payload is not a bounded row array.");
  return payload.map((row, index) => {
    try {
      if (!row || typeof row !== "object" || Array.isArray(row) ||
          typeof row.msg !== "string" || row.msg.length === 0 || row.msg.length > 4000) throw new Error("Unsupported log row schema; expected safe createdAt and bounded msg.");
      timestampKey(row.createdAt);
      return { createdAt: row.createdAt, msg: row.msg };
    } catch (error) {
      throw new LogRowValidationError(error instanceof Error ? error.message : "Invalid log row", index);
    }
  });
}
const snapshotActor = (s: SeatState): NonNullable<TimelineEvent["actor"]> => ({ seat: s.seatNumber, name: s.playerName, playerId: null, isHero: s.isYou });
const identity = (s?: SeatState) => s?.isOccupied && s.playerName ? `${s.seatNumber}:${s.playerName}` : null;
const baseReasons = ["No validated source watermark/contiguous event sequence; complete history is not established.",
  "A sanitized live sample supports decimal-string timestamps; full log coverage, tie ordering, units and delivery lag remain unverified."];
export function newHandTimeline(handId: string, handNumber: number | null = null): HandTimeline {
  return { handId, handNumber, identityKind: handNumber === null ? "local_segment" : "source_reported",
    historyComplete: false, reasons: [...baseReasons, ...(handNumber === null ? ["Local observation segment, not a PokerNow hand ID; invisible same-card hands may be missed."] : [])],
    events: [], snapshotEvents: [], source: "dom_snapshot", droppedEvents: 0, seatMapping: emptySeatMapping(), accounting: observedHandAccounting(handId, []),
    coverage: emptyHistoryCoverage(handNumber !== null) };
}
export function timelineReason(t: HandTimeline, reason: string) {
  if (!t.reasons.includes(reason) && t.reasons.length < 50) t.reasons.push(reason);
}

/** Non-action metadata only; supplies neither dealt-in membership nor coverage. */
export function isSourceNonActionMetadata(event: TimelineEvent): boolean {
  return event.source === "pokernow_log_v3" && (event.action === "player_join" || event.action === "hole_cards");
}

/** Conservative text normalization. Unsupported templates remain raw unparsed events. */
export function normalizeLogRow(row: LogRow, observedAt: number): TimelineEvent {
  const text = row.msg;
  const timestamp = timestampKey(row.createdAt);
  const joined = /^The player "([^"\r\n]{1,160}) @ ([A-Za-z0-9_-]{1,160})" joined the game with a stack of ((?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,8})?)\.$/.exec(text);
  const cards = /^Your hand is ((?:[2-9TJQKA]|10)[\u2663\u2666\u2665\u2660]), ((?:[2-9TJQKA]|10)[\u2663\u2666\u2665\u2660])$/.exec(text);
  // Only the observed whole-message grammar, with a bounded positive decimal amount.
  // Other return wording stays unparsed; no return is inferred from stack/bet deltas.
  const returned = /^Uncalled bet of ((?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,8})?) returned to "([^"\r\n]{1,160}) @ ([A-Za-z0-9_-]{1,160})"$/.exec(text);
  const event: TimelineEvent = { id: `${timestamp}:${text}`, sequence: 0, street: null, actor: null, actorSeatMappingEventId: null, action: "unparsed",
    amount: null, amountMeaning: null, wagerAction: null, raiseTo: null, allIn: null, source: "pokernow_log_v3", confidence: "unknown",
    order: "timestamp_candidate", sourceTimestamp: timestamp, sourceTimestampRaw: row.createdAt, observation: null, observedAt, evidence: text };
  // The client renderer identifies starting/street/collect/check/fold/wager text.
  // Exact whole templates (especially all-in/end/showdown) remain provisional.
  if (returned && returned[0] === text && returned[2]!.trim() && Number(returned[1]) > 0 && Number.isSafeInteger(Number(returned[1]!.replace(".", "")))) {
    event.action = "uncalled_return";
    event.amount = Number(returned[1]);
    event.amountMeaning = "return_reported";
    event.actor = { seat: null, name: returned[2]!, playerId: returned[3]!, isHero: null };
  }
  else if (joined && joined[0] === text && joined[1]!.trim() && Number.isSafeInteger(Number(joined[3]!.replace(".", "")))) {
    event.action = "player_join";
    event.actor = { seat: null, name: joined[1]!, playerId: joined[2]!, isHero: null };
    // Joining stack stays in raw evidence, never a wager or current stack input.
  }
  else if (cards && cards[0] === text && cards[1]!.replace("10", "T") !== cards[2]!.replace("10", "T")) {
    event.action = "hole_cards"; // No actor ID in this row; do not invent one.
  }
  else if (/^-- starting\b/.test(text)) { event.action = "hand_start"; event.street = "preflop"; }
  else if (/^-- ending\b/.test(text)) event.action = "hand_end";
  else if (parsePlayerStacks(text).kind === "valid") event.action = "player_stacks";
  else {
    const street = /^(flop|turn|river):/i.exec(text);
    if (street) { event.action = "street"; event.street = street[1]!.toLowerCase() as PokerGameState["street"]; }
    const actor = /^"(.+) @ ([^"\r\n]+)" (.+)$/.exec(text);
    if (actor) {
      event.actor = { seat: null, name: actor[1]!, playerId: actor[2]!, isHero: null };
      const action = actor[3]!;
      // Explicit live-reported system-post variants only. These are not calls
      // or raises; their accounting meaning is still reported_unspecified.
      const missedBlind = /^posts a (?:missing small blind|missed big blind) of ((?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,8})?)$/.exec(action);
      const numeric = /^(bets|raises to|calls|posts (?:a |the )?(?:small blind|big blind|ante) of) ([0-9]+(?:\.[0-9]+)?)( and go all in)?$/.exec(action);
      if (action === "checks" || action === "folds") event.action = action === "checks" ? "check" : "fold";
      else if (missedBlind && actor[0] === text && missedBlind[0] === action && Number(missedBlind[1]) > 0 &&
          Number.isSafeInteger(Number(missedBlind[1]!.replace(".", "")))) {
        event.action = "post";
        event.wagerAction = "post";
        event.amount = Number(missedBlind[1]);
        event.amountMeaning = "reported_unspecified";
      }
      else if (numeric && Number.isFinite(Number(numeric[2]))) {
        event.action = numeric[1] === "bets" ? "bet" : numeric[1] === "raises to" ? "raise" : numeric[1] === "calls" ? "call" : "post";
        event.amount = Number(numeric[2]);
        event.wagerAction = event.action;
        event.amountMeaning = event.action === "raise" ? "street_total" : "reported_unspecified";
        if (event.action === "raise") event.raiseTo = event.amount;
        if (numeric[3]) { event.allIn = true; event.action = "all-in"; }
      } else {
        const collected = /^collected ([0-9]+(?:\.[0-9]+)?) from .+$/.exec(action);
        if (collected && Number.isFinite(Number(collected[1]))) {
          event.action = "settlement"; event.amount = Number(collected[1]); event.amountMeaning = "award_reported";
        } else if (/^shows /.test(action)) event.action = "showdown";
      }
    }
  }
  if (event.action !== "unparsed") event.confidence = "source_reported";
  return event;
}

/** Full-hand refresh, not timestamp-cursor fetch: keep overlap and late rows. */
export function ingestHandLog(t: HandTimeline, payload: unknown, observedAt: number): void {
  let rows: LogRow[];
  try {
    rows = parseLogRows(payload); // Validate before changing accepted events/mapping/accounting.
    const conflict = rows.findIndex(row => {
      const number = /^-- (?:starting|ending) hand #(\d+)\b/.exec(row.msg);
      return number && t.handNumber !== null && Number(number[1]) !== t.handNumber;
    });
    if (conflict !== -1) throw new LogRowValidationError("Log hand number contradicts the requested hand; batch rejected.", conflict);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Log validation failed";
    recordRejectedLogBatch(t, payload, reason, observedAt, error instanceof LogRowValidationError ? error.rowIndex : null);
    timelineReason(t, `Rejected log batch: ${reason}`);
    throw error;
  }
  const existing = new Map(t.source === "pokernow_log_v3" ? t.events.map(e => [e.id, e]) : []);
  const seen = new Map<string, number>();
  const incoming = new Set<string>();
  const incomingEvents: TimelineEvent[] = [];
  for (const row of rows) {
    const event = normalizeLogRow(row, observedAt);
    const occurrence = (seen.get(event.id) ?? 0) + 1; seen.set(event.id, occurrence);
    event.id = `${t.handId}:log:${event.id}:${occurrence}`; incoming.add(event.id);
    incomingEvents.push(event);
  }
  observeLogBatch(t, incomingEvents, existing, observedAt);
  if ([...existing.keys()].some(key => !incoming.has(key))) timelineReason(t, "A full-hand response omitted previously seen rows; retained history may be stale or the response truncated.");
  for (const event of incomingEvents) if (!existing.has(event.id)) existing.set(event.id, event);
  // Numeric magnitude supplies candidate chronology independent of response order.
  // No unit conversion, wall-clock interpretation, or tie-breaking action order.
  const sorted = [...existing.values()].sort((a, b) => a.sourceTimestamp! - b.sourceTimestamp!);
  const counts = new Map<number, number>();
  for (const e of sorted) counts.set(e.sourceTimestamp!, (counts.get(e.sourceTimestamp!) ?? 0) + 1);
  let street: TimelineEvent["street"] = null;
  for (const [i, e] of sorted.entries()) {
    e.sequence = i + 1;
    const tied = counts.get(e.sourceTimestamp!)! > 1;
    e.order = tied ? "ambiguous" : "timestamp_candidate";
    if (tied) { street = null; timelineReason(t, "Repeated source timestamp: event order (and possibly street attribution) is ambiguous."); }
    if (!tied && (e.action === "street" || e.action === "hand_start")) street = normalizeLogRow({ createdAt: e.sourceTimestamp!, msg: e.evidence }, observedAt).street;
    e.street = tied ? null : street;
    if (e.action === "unparsed") timelineReason(t, "Unrecognized log text retained; action coverage is incomplete.");
  }
  if (!sorted.some(e => e.action === "hand_start")) timelineReason(t, "Hand-start row not observed in log response.");
  applyPlayerSeatMapping(t, sorted);
  // Lower bound on truncated log rows; repeated full refreshes must not inflate it.
  t.droppedEvents = Math.max(t.droppedEvents, sorted.length - TIMELINE_LIMIT);
  if (sorted.length > TIMELINE_LIMIT) timelineReason(t, "Timeline retention limit reached; older events were discarded.");
  t.events = sorted.slice(-TIMELINE_LIMIT); t.source = "pokernow_log_v3";
  t.accounting = observedHandAccounting(t.handId, t.events, t.droppedEvents);
  // Always false: timestamps are not contiguous action IDs and API completeness is unverified.
  t.historyComplete = false;
  refreshHistoryCoverage(t, observedAt);
}

/** Reuses V1 reconstruction with hero enabled; never upgrades snapshot coverage. */
export function createSnapshotTimeline(sessionId: string) {
  let previous: PokerGameState | null = null;
  let history = emptyActionHistory();
  let fingerprint = "";
  let segment = 0;
  let serial = 0;
  let timeline = newHandTimeline(`${sessionId}:segment:${segment}`);
  const archived: HandTimeline[] = [];
  const archive = () => { if (timeline.events.length) archived.push(timeline); if (archived.length > 3) archived.shift(); };
  const append = (action: TimelineAction, state: PokerGameState | null, seat: SeatState | null, evidence: string, at: number, amount: number | null = null) => {
    const event: TimelineEvent = { id: `${sessionId}:observation:${++serial}`, sequence: serial,
      street: state?.street ?? null, actor: seat ? snapshotActor(seat) : null, actorSeatMappingEventId: null, action, amount,
      amountMeaning: amount === null ? null : "street_total", raiseTo: action === "raise" ? amount : null,
      wagerAction: action === "bet" || action === "call" || action === "raise" || action === "post" ? action : null,
      allIn: seat?.isAllIn ?? null, source: "dom_snapshot", confidence: "inferred", order: "observation_batch",
      sourceTimestamp: null, sourceTimestampRaw: null, observation: history.observation, observedAt: at, evidence };
    timeline.snapshotEvents.push(event);
    if (timeline.snapshotEvents.length > TIMELINE_LIMIT) { timeline.snapshotEvents.shift(); timeline.droppedEvents++; timelineReason(timeline, "Snapshot retention limit reached."); }
    timeline.events = [...timeline.snapshotEvents];
    return event;
  };
  return {
    observe(state: PokerGameState | null, context: ActionHistoryContext, errors: readonly string[], at: number) {
      const key = JSON.stringify([state, context, errors]);
      if (key === fingerprint) return timeline;
      fingerprint = key;
      if (!state || errors.length) {
        append("gap", null, null, errors.join("; ") || "State unavailable", at);
        timelineReason(timeline, "Read failure broke observation continuity.");
        previous = null; history = emptyActionHistory(); return timeline;
      }
      const next = updateActionHistory(history, previous, state, { ...context, includeHero: true, requireExplicitContributions: true });
      if (next.handBoundary) {
        archive();
        timeline = newHandTimeline(`${sessionId}:segment:${++segment}`);
        history = next;
        append("observation_start", state, null, next.notes[0] ?? "Conservative boundary", at);
        for (const seat of state.seats.filter(s => s.isOccupied && s.isFolded)) {
          const event = append("fold_observed", null, seat, "Already folded at this baseline; fold action, timing and street were not observed", at);
          event.confidence = "unknown";
        }
      }
      history = next;
      if (previous && !next.handBoundary) {
        if (previous.street !== state.street) append("street", state, null, `Board count transition ${previous.street} -> ${state.street}; spanning actions unknown`, at);
        for (const before of previous.seats.filter(s => s.isOccupied)) {
          if (identity(before) !== identity(state.seats.find(s => s.seatNumber === before.seatNumber))) append("departure", state, before, "Seat disappeared or changed identity; not a fold or proof of hand exit", at);
        }
        for (const seat of state.seats.filter(s => s.isOccupied)) {
          const before = previous.seats.find(s => s.seatNumber === seat.seatNumber);
          if (identity(seat) === null || identity(before) !== identity(seat)) { append("arrival", state, seat, "New or unidentified occupied seat/name; hand participation unknown", at); continue; }
          const records = history.records.get(seat.seatNumber)?.filter(r => r.observation === history.observation) ?? [];
          for (const record of records) append(record.action, state, seat, `Snapshot delta; ${record.wagerAction ?? record.action}; intermediate actions may be missing`, at, record.amount);
          // The legacy wager helper returns early across streets/while awaiting a
          // clean betting baseline. A visible fold transition is still evidence,
          // but not evidence of its street or order relative to intervening actions.
          if (before && !before.isFolded && seat.isFolded && !records.some(r => r.action === "fold")) {
            const event = append("fold", state, seat, "Fold flag became true between observations; intermediate actions/order are unknown", at);
            if (previous.street !== state.street) {
              event.street = null;
              event.evidence += "; street transition spans the fold, so its street is unknown";
            }
          }
          if (previous.street === state.street && !records.length && seat.currentBet !== null && seat.currentBet !== before?.currentBet) {
            append("wager_observed", state, seat, "Changed contribution; post/action/return order is not proven", at, seat.currentBet);
          }
        }
      }
      for (const note of history.notes) timelineReason(timeline, note);
      timelineReason(timeline, "DOM polls can miss hero/opponent actions and complete same-card hands; sequence is observation order only.");
      previous = state; return timeline;
    },
    current: () => timeline,
    archived: () => archived,
    reset() {
      archive(); previous = null; fingerprint = ""; history = emptyActionHistory();
      timeline = newHandTimeline(`${sessionId}:segment:${++segment}`);
    },
  };
}
