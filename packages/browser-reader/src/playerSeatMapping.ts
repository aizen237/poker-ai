import type { HandTimeline, TimelineEvent } from "./handTimeline.js";

export interface PlayerStackEntry {
  seat: number;
  name: string;
  playerId: string;
  /** Source text only; never used as a current stack or an accounting input. */
  stackText: string;
}
type ParsedStacks = { kind: "not_row" } | { kind: "invalid"; reason: string } | { kind: "valid"; entries: PlayerStackEntry[] };

/** Only the explicit log_v3 syntax is a mapping source. No display-name lookup. */
export function parsePlayerStacks(text: string): ParsedStacks {
  if (!/^Player stacks\b/.test(text)) return { kind: "not_row" };
  const invalid = (reason: string): ParsedStacks => ({ kind: "invalid", reason });
  if (text.length > 4000 || /[\r\n]/.test(text) || !text.startsWith("Player stacks: ")) return invalid("Malformed Player stacks header or row bounds.");
  const parts = text.slice("Player stacks: ".length).split(" | ");
  // The existing DOM reader supports seats 1..10. Larger/unknown tables fail closed.
  if (!parts.length || parts.length > 10) return invalid("Unsupported Player stacks entry count.");
  const entries: PlayerStackEntry[] = [];
  const seats = new Set<number>(), ids = new Set<string>();
  for (const part of parts) {
    const match = /^#([1-9]|10) "([^"\r\n]{1,160}) @ ([A-Za-z0-9_-]{1,160})" \((0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?\)$/.exec(part);
    if (!match || !match[2]!.trim()) return invalid("Malformed Player stacks entry; expected #seat \"name @ playerId\" (stack).");
    const seat = Number(match[1]), playerId = match[3]!, stackText = match[4]! + (match[5] ?? "");
    if (!Number.isFinite(Number(stackText)) || Number(stackText) > Number.MAX_SAFE_INTEGER) return invalid("Player stacks amount exceeds supported bounds.");
    if (seats.has(seat) || ids.has(playerId)) return invalid("Duplicate seat or player ID in Player stacks row.");
    seats.add(seat); ids.add(playerId);
    entries.push({ seat, name: match[2]!, playerId, stackText });
  }
  return { kind: "valid", entries };
}

export interface SeatMappingEvidence {
  eventId: string;
  text: string;
  sourceTimestamp: number;
  sourceTimestampRaw: number | string;
}
export interface HandSeatMapping {
  status: "unknown" | "source_reported" | "invalid";
  source: "pokernow_log_v3.player_stacks";
  /** Retained for audit even when invalid; never use entries unless source_reported. */
  entries: (PlayerStackEntry & { evidenceEventId: string; fromTimestamp: number })[];
  evidence: SeatMappingEvidence[];
  reasons: string[];
}
export function emptySeatMapping(): HandSeatMapping {
  return { status: "unknown", source: "pokernow_log_v3.player_stacks", entries: [], evidence: [], reasons: ["No valid Player stacks row observed for this hand."] };
}

/** Hand-local and persistent across row truncation, folds and DOM departures. */
export function applyPlayerSeatMapping(timeline: HandTimeline, events: TimelineEvent[]): void {
  const mapping = timeline.seatMapping;
  const invalidate = (reason: string) => {
    mapping.status = "invalid";
    mapping.reasons = [reason, "Mapping invalid for the rest of this hand; actor seats cleared. Historical entries are evidence only."];
  };
  for (const event of events) {
    if (mapping.status === "invalid") break;
    const parsed = parsePlayerStacks(event.evidence);
    if (parsed.kind === "not_row" || mapping.evidence.some(e => e.eventId === event.id)) continue;
    const evidence: SeatMappingEvidence = { eventId: event.id, text: event.evidence,
      sourceTimestamp: event.sourceTimestamp!, sourceTimestampRaw: event.sourceTimestampRaw! };
    // Bounded independently of the timeline so first evidence survives event eviction.
    if (mapping.evidence.length >= 32) {
      mapping.evidence[31] = evidence;
      invalidate("Player stacks evidence retention limit reached; mapping coverage is uncertain.");
      break;
    }
    mapping.evidence.push(evidence);
    if (parsed.kind === "invalid") { invalidate(parsed.reason); break; }
    const conflict = parsed.entries.find(entry => mapping.entries.some(known =>
      (known.playerId === entry.playerId && known.seat !== entry.seat) ||
      (known.seat === entry.seat && known.playerId !== entry.playerId)));
    if (conflict) {
      invalidate(`Contradictory Player stacks assignment for player ID ${conflict.playerId} / seat ${conflict.seat}.`);
      break;
    }
    // Validate the whole row before extending any entry. Omitted players remain mapped.
    for (const entry of parsed.entries) {
      const known = mapping.entries.find(e => e.playerId === entry.playerId);
      if (!known) mapping.entries.push({ ...entry, evidenceEventId: event.id, fromTimestamp: event.sourceTimestamp! });
      else if (event.sourceTimestamp! < known.fromTimestamp) {
        // A late-arriving earlier row can establish earlier evidence of the same assignment.
        Object.assign(known, entry, { evidenceEventId: event.id, fromTimestamp: event.sourceTimestamp! });
      }
    }
    mapping.status = "source_reported";
    mapping.reasons = [];
  }
  for (const event of events) {
    if (!event.actor) continue;
    event.actor.seat = null;
    event.actorSeatMappingEventId = null;
    if (mapping.status !== "source_reported") continue;
    const entry = mapping.entries.find(e => e.playerId === event.actor!.playerId);
    if (entry && event.sourceTimestamp! > entry.fromTimestamp) {
      event.actor.seat = entry.seat;
      event.actorSeatMappingEventId = entry.evidenceEventId;
    }
  }
  if (mapping.status === "invalid") {
    const reason = `Player-to-seat mapping invalid: ${mapping.reasons[0]}`;
    if (!timeline.reasons.includes(reason) && timeline.reasons.length < 50) timeline.reasons.push(reason);
  }
}
