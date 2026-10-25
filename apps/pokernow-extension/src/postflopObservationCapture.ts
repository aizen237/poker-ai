import { assessLiveState } from "@poker-ai/browser-reader";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import type { LiveTableRead } from "./tableRead.js";
import { liveProofRevision } from "./decisionProofs.js";
import { decisionFingerprint } from "./requestIdentity.js";

type Dependencies = { snapshot: () => LiveTimelineDiagnostic; read: () => LiveTableRead;
  epoch: () => { decisionEpoch: string; stateJson: string | null }; tableUrl: () => string; now: () => number };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Diagnostic pairing only. No recognizer, reducer, epoch or deadline is advanced.
 * Unsupported profiles remain useful observations, never certified readiness. */
export function capturePostflopObservation(d: Dependencies) {
  const copySource = (s: LiveTimelineDiagnostic) => {
    const source = s.sourceStatus, evidence = source.firstUtgEvidence;
    const carried = evidence.carriedState, frame = carried?.projection.frame;
    const head = source.sourceMetadata.socket.at(-1);
    return structuredClone({ connected: source.connected, identity: source.identity,
      currentHand: { handId: s.current.handId, handNumber: s.current.handNumber },
      head: head ? { sequence: head.localSequence, generation: head.localConnectionGeneration,
        receivedAt: head.receivedAt, cursor: head.metadata.frame.fields.find(f => f.path === "now")?.value ?? null } : null,
      continuity: source.sourceMetadata.socketContinuity,
      coverageIssues: s.current.coverage.issues,
      carried: carried ? { generation: carried.generation, sequence: carried.sequence,
        heroId: carried.projection.heroId,
        // Missing fields stay missing; deleted contributions are never filled with zero.
        fields: Object.fromEntries(["id", "hI", "gN", "now", "pre", "cPI", "pITT", "gT", "oTC", "tB", "seats", "players", "pGS"]
          .filter(k => Object.hasOwn(frame!, k)).map(k => [k, frame![k]])) } : null,
      reducerReason: evidence.reason,
      // Copy the existing narrow certificate, including its ORIGINAL deadline.
      existingFlopProof: source.flopObservationProof ? {
        scope: source.flopObservationProof.scope, activation: source.flopObservationProof.activation,
        expiresAt: source.flopObservationProof.expiresAt, continuity: source.flopObservationProof.continuity,
        board: source.flopObservationProof.transition.board, contributions: source.flopObservationProof.contributions,
        accountingScope: source.flopObservationProof.accounting?.scope ?? null,
      } : null,
      priorCertificate: evidence.freshness.certificate });
  };
  const startedAt = d.now(), tableUrl = d.tableUrl(), epochBefore = { ...d.epoch() };
  const first = d.snapshot(), before = copySource(first);
  const read = structuredClone(d.read()), assessment = assessLiveState(read.raw, read.context);
  const last = d.snapshot(), after = copySource(last), epochAfter = { ...d.epoch() }, completedAt = d.now();
  const reasons: string[] = [], limitations: string[] = [];
  const head = before.head, frame = before.carried?.fields;
  const state = assessment.state, seats = state?.seats.filter(s => s.isOccupied) ?? [];
  const hero = seats.find(s => s.isYou), call = read.callControl;
  const cards = state?.board.map(c => `${"23456789TJQKA"[c.rank - 2]}${c.suit}`) ?? null;
  if (!same(before, after) || tableUrl !== d.tableUrl()) reasons.push("Source or table changed across the read.");
  if (!before.connected || !head || before.identity?.chainGap || before.continuity.chainGap ||
      before.continuity.status !== "observed_continuous" ||
      before.coverageIssues.some(i => i.code === "metadata_gap" || i.code === "identity_conflict"))
    reasons.push("Source disconnected, missing, or has an unresolved continuity gap.");
  if (head && head.generation !== 1) limitations.push("Reconnect generation: no continuity with the previous connection is claimed.");
  if (![startedAt, completedAt, call?.observedAt, head?.receivedAt].every(Number.isSafeInteger) ||
      completedAt < startedAt || call!.observedAt < startedAt || call!.observedAt > completedAt ||
      head!.receivedAt > startedAt || completedAt - head!.receivedAt >= 10_000)
    reasons.push("Stale, future, missing or unbracketed local observation time.");
  const polled = (s: LiveTimelineDiagnostic) => JSON.stringify([
    decisionFingerprint(tableUrl, read.raw, read.context, read.raiseControl), liveProofRevision(s),
  ]);
  const epochStatus = !epochBefore.decisionEpoch || epochBefore.stateJson === null ? "unavailable"
    : same(epochBefore, epochAfter) && epochBefore.stateJson === polled(first) && epochAfter.stateJson === polled(last)
      ? "observed_matching" : "mismatched";
  if (epochStatus !== "observed_matching") reasons.push("Existing decision epoch unavailable or mismatched; capture does not create one.");
  if (!state || state.street !== "flop" || seats.filter(s => s.isYou).length !== 1 ||
      seats.filter(s => s.isCurrentToAct).length !== 1 || !hero?.isCurrentToAct || read.context.readErrors.length)
    reasons.push("UI does not provide one readable hero flop decision.");
  if (!frame) limitations.push("No carried source state for this profile; raw field samples are partial, unverified observations.");
  else {
    if (!head || before.carried!.sequence !== head.sequence || before.carried!.generation !== head.generation || frame.now !== head.cursor)
      reasons.push("Carried source is stale or differs from the latest source head.");
    if (frame.hI !== before.identity?.handId || frame.gN !== before.identity?.handNumber ||
        frame.id !== before.identity?.tableId || before.carried!.heroId !== before.identity?.heroPlayerId ||
        frame.cPI !== before.carried!.heroId || frame.pITT !== before.carried!.heroId || !same(frame.gT, [1, 1]))
      reasons.push("Source hand, hero actor or flop street is missing or contradictory.");
    if (!same(frame.oTC?.["1"], cards)) reasons.push("Source and UI board observations differ or are missing.");
    const sourceSeats = frame.seats as Array<[number, string]>;
    if (!sourceSeats?.some(([seat, id]) => seat === hero?.seatNumber && id === before.carried!.heroId))
      reasons.push("Source and UI hero seats differ.");
    // Compare explicit values only. Absence is unknown, not a zero/reset proof.
    for (const [seat, id] of sourceSeats ?? []) {
      const dom = seats.find(s => s.seatNumber === seat), contribution = frame.tB?.[id];
      if (typeof contribution === "number" && dom?.currentBet != null && contribution !== dom.currentBet)
        reasons.push(`Source/UI contribution contradiction at seat ${seat}.`);
      if (contribution === undefined || dom?.currentBet == null)
        limitations.push(`Contribution comparison unavailable at seat ${seat}; no zero inferred.`);
    }
  }
  if (!call || call.visibleCount !== 1 || call.amountChips === null || call.enabled !== true || call.issues.length)
    limitations.push("CALL readiness unavailable or contradictory; inspect the exact control observation.");
  if (call?.contradictions.length) reasons.push(...call.contradictions);
  const proof = before.existingFlopProof;
  if (proof && (startedAt < proof.activation.receivedAt || completedAt >= proof.expiresAt))
    reasons.push("Existing source certificate is outside its original deadline.");
  const profile = proof ? "existing_narrow_source_certificate" : "unsupported_or_uncertified";
  if (!proof) limitations.push("No current certified flop profile; no source decision deadline is available or created.");
  return { version: 1 as const, mode: "postflop_observation" as const, developmentOnly: true, authoritative: false,
    permission: null, legalityCertified: false, historyComplete: false, liveRecommendationsAllowed: false,
    startedAt, completedAt, tableUrl, epochBefore, epochAfter, epochStatus,
    before, after, profile,
    sourceVerifiedFacts: proof ? { origin: "Existing narrow source certificate only; never broadened by this capture", proof } : null,
    unverifiedObservations: { source: before.carried, ui: read, board: cards,
      contributions: seats.map(s => ({ seat: s.seatNumber, value: s.currentBet })),
      callReadiness: call?.visibleCount === 1 && call.amountChips !== null && call.enabled === true && !call.issues.length
        ? "observed_enabled" : "unavailable" },
    observationPaired: reasons.length === 0, reasons, limitations,
    timingScope: "Local source receipt age only (10s diagnostic stale threshold); never activation, permission or a renewed deadline.",
  };
}
export type PostflopObservationCapture = ReturnType<typeof capturePostflopObservation>;
