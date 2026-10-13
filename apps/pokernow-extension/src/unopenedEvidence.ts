import type { ScopedProof } from "@poker-ai/ai-core";
import { parsePlayerStacks, type LiveStateAssessment } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import { currentFirstUtg } from "./firstUtgLive.js";

/** Audit actual source evidence, not DOM-derived absence of wagers or supplied proof labels.
 * General logs cannot certify dealt-in membership or decision catch-up. The
 * separately validated direct first-UTG boundary is the sole live exception.
 */
export function inspectLiveUnopenedEvidence(read: LiveTableRead, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null) {
  const hand = timeline?.current, source = timeline?.sourceStatus;
  const first = currentFirstUtg(read, assessment, timeline);
  const mapping = hand?.seatMapping;
  const events = hand?.events.filter(e => e.source === "pokernow_log_v3") ?? [];
  const starts = events.filter(e => e.action === "hand_start");
  const hero = assessment.state?.seats.find(s => s.isOccupied && s.isYou);
  const heroId = source?.identity?.heroPlayerId;
  const entry = mapping?.status === "source_reported" && heroId ? mapping.entries.find(e => e.playerId === heroId) : undefined;
  const matchingIdentity = !!source?.identity && hand?.handId === `${source.identity.tableId}:hand:${source.identity.handId}` && hand.handNumber === source.identity.handNumber;
  const heroSeatVerified = matchingIdentity && !!entry && entry.seat === hero?.seatNumber;
  const occupied = assessment.state?.seats.filter(s => s.isOccupied) ?? [];
  const rosterReasons = ["Player stacks proves ID/seat/stack entries, not which players received cards. Six listed players is not a certified six-player dealt-in roster."];
  const rows = events.filter(e => e.action === "player_stacks").map(e => ({ event: e, parsed: parsePlayerStacks(e.evidence) }));
  const sixPlayerRow = rows.find(r => r.parsed.kind === "valid" && r.parsed.entries.length === 6);
  const membershipChanged = rows.some(r => {
    const parsed = r.parsed;
    return parsed.kind === "valid" && mapping?.entries.some(entry =>
      !parsed.entries.some(p => p.playerId === entry.playerId && p.seat === entry.seat));
  }) ||
    !!mapping?.entries.length && (mapping.entries.length !== occupied.length || mapping.entries.some(e => !occupied.some(s => s.seatNumber === e.seat))) ||
    (timeline?.snapshotFallback.events.some(e => e.action === "arrival" || e.action === "departure") ?? false);
  const identityConflict = mapping?.status === "invalid" || !!entry && !!hero && entry.seat !== hero.seatNumber || !matchingIdentity && !!source?.identity;
  if (!sixPlayerRow) rosterReasons.push("No single six-player source row for this hand; mappings merged across rows are not a dealt-in list.");
  if (membershipChanged) rosterReasons.push("Player arrival/departure or changed membership observed; hand roster cannot be certified.");
  if (identityConflict) rosterReasons.push("Contradictory/degraded hand or player-ID-to-seat mapping.");
  if (!heroSeatVerified) rosterReasons.push("Registered hero ID is not independently mapped to the current DOM hero seat.");
  const actionReasons: string[] = [];
  if (starts.length !== 1) actionReasons.push("Exactly one source hand_start is required.");
  const disallowed = events.filter(e => !["hand_start", "player_stacks", "post", "fold"].includes(e.action));
  if (disallowed.length) actionReasons.push(`Observed source action(s) exclude a proven unopened window: ${disallowed.map(e => e.action).join(", ")}.`);
  if (events.some(e => e.order === "ambiguous" || e.action !== "hand_start" && e.street !== "preflop")) actionReasons.push("Timestamp ties or unknown street prevent ordered preflop attribution.");
  if (events.some(e => e.actor && (e.actor.seat === null || !e.actorSeatMappingEventId))) actionReasons.push("A source actor has no verified hand-local seat mapping.");
  if (events.some(e => e.action === "fold" && e.actor?.playerId === heroId)) actionReasons.push("Hero has already folded in the source window.");
  if (hand?.coverage.issues.length || hand?.droppedEvents) actionReasons.push("Source rejection, omission, gap or retention loss affects this hand.");
  actionReasons.push("No authoritative source prefix/watermark proves all preflop actions through the current hero decision. Timestamp ordering and socket continuity do not establish absence of a delayed/missing action.");
  const proof = (scope: ScopedProof["scope"], reasons: string[], contradicted = false): ScopedProof => ({
    scope, status: contradicted ? "contradicted" : "insufficient", confidence: "low",
    provenance: ["log_v3 events/Player stacks + registered.currentPlayer.id; DOM is a cross-check only"], reasons });
  return {
    socketStateEvidence: source?.sourceMetadata.socketStateEvidence ?? null,
    candidate: !!first || assessment.state?.street === "preflop" && disallowed.length === 0,
    firstUtgBoundary: first,
    heroSeat: { status: first || heroSeatVerified ? "proven" : identityConflict ? "contradicted" : "insufficient",
      seat: first?.heroSeat ?? (heroSeatVerified ? entry!.seat : null), playerId: heroId ?? null, evidenceEventId: entry?.evidenceEventId ?? null },
    listedPlayerCount: first ? 6 : sixPlayerRow?.parsed.kind === "valid" ? sixPlayerRow.parsed.entries.length : null,
    dealerSeat: { status: first ? "proven" : "insufficient", sourceSeat: first?.players.find(p => p.position === "BTN")?.seat ?? null, domSeatCrossCheck: read.context.dealerSeatNumber,
      reason: first ? first.provenance : "Player stacks has no dealer field; captured source has no validated dealer/clockwise seating contract." },
    observedSourceEvents: events.map(e => ({ id: e.id, action: e.action, actor: e.actor, order: e.order,
      timestamp: e.sourceTimestampRaw, evidence: e.evidence })),
    proofs: first ? (["roster", "position", "actionWindow"] as const).map(scope => ({
      scope, status: "proven" as const, confidence: "high" as const,
      provenance: [first.provenance, "Six explicit dealt-card entries/iHPI IDs; inherited seats cross-checked against dealer/SB/BB and current DOM; first UTG only."], reasons: [],
    })) : [proof("roster", rosterReasons, identityConflict || membershipChanged),
      proof("position", ["Player stacks supplies seat assignments only. Dealt-in membership, source dealer and clockwise seat order are unproven."], identityConflict),
      proof("actionWindow", actionReasons, identityConflict || disallowed.length > 0)],
    raiseControl: { selectedRaiseToChips: read.raiseControl?.selectedRaiseToChips ?? null,
      raiseSubmitEnabled: read.raiseControl?.raiseSubmitEnabled ?? null, status: "insufficient",
      reason: "Selected text input and enabled submit are observations, not an independently verified minimum/step or validation acknowledgment for 2.5BB. Slider min/max/value is not authoritative." },
  };
}
