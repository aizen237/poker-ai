import { assessLiveState } from "@poker-ai/browser-reader";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import type { LiveTableRead } from "./tableRead.js";
import { flopCallEvidence } from "./flopCallEvidence.js";
import { liveProofRevision } from "./decisionProofs.js";
import { liveDecisionFingerprint } from "./requestIdentity.js";
import { raiseSourceObservation } from "./raiseEvidenceCapture.js";

type Epoch = { decisionEpoch: string; stateJson: string | null };
type Dependencies = { snapshot: () => LiveTimelineDiagnostic; read: () => LiveTableRead;
  epoch: () => Epoch; tableUrl: () => string; now: () => number };

/** One synchronous, opt-in diagnostic read. Never advances the runtime, epoch,
 * history, deadline or policy. Only Phase6E's existing narrow scope can match. */
export function capturePostflopReadiness(d: Dependencies) {
  const copySource = (s: LiveTimelineDiagnostic, at: number) => {
    const { connected, identity, currentHand, sourceState } = raiseSourceObservation(s, at);
    return structuredClone({ connected, identity, currentHand, sourceState, proof: s.sourceStatus.flopObservationProof });
  };
  const startedAt = d.now(), tableUrl = d.tableUrl(), epochBefore = { ...d.epoch() };
  const first = d.snapshot(), before = copySource(first, startedAt);
  const read = d.read();
  const assessment = assessLiveState(read.raw, read.context);
  const evidence = flopCallEvidence(read, assessment, first, epochBefore.decisionEpoch);
  const last = d.snapshot(), after = copySource(last, d.now()), epochAfter = { ...d.epoch() };
  const completedAt = d.now(), binding = evidence?.binding ?? null;
  const reasons: string[] = [];
  if (!evidence || evidence.ui.status !== "observed_matching") reasons.push("No fresh matching Phase6E source/DOM/CALL observation.");
  const stateJson = (s: LiveTimelineDiagnostic) => liveDecisionFingerprint(
    tableUrl, read, liveProofRevision(s), assessment.state?.street, completedAt);
  if (!epochBefore.decisionEpoch || epochBefore.stateJson === null ||
      JSON.stringify(epochBefore) !== JSON.stringify(epochAfter) ||
      epochBefore.stateJson !== stateJson(first) || epochAfter.stateJson !== stateJson(last))
    reasons.push("Current read/source does not match the existing decision epoch; wait for an ordinary poll, never mint a capture epoch.");
  if (JSON.stringify(before) !== JSON.stringify(after) || tableUrl !== d.tableUrl()) reasons.push("Source or table changed across the read.");
  const state = before.sourceState, fields = state?.fields;
  if (!binding || !state || state.generation !== binding.generation ||
      state.localBridgeSequence !== before.proof?.continuity.throughSequence ||
      fields?.now !== binding.cursor || fields?.hI !== binding.handId || fields?.gN !== binding.handNumber ||
      fields?.cPI !== binding.heroId || fields?.pITT !== binding.heroId || JSON.stringify(fields?.gT) !== "[1,1]")
    reasons.push("Carried source hand/actor/street/generation/cursor does not match the original opportunity.");
  const observedAt = read.callControl?.observedAt;
  if (![startedAt, completedAt, observedAt].every(Number.isSafeInteger) ||
      observedAt! < startedAt || observedAt! > completedAt || completedAt < startedAt ||
      !binding || startedAt < binding.receivedAt || completedAt >= binding.expiresAt ||
      binding.expiresAt !== binding.receivedAt + 10_000)
    reasons.push("Read is stale, unbracketed, clock-inconsistent or outside the original ten-second window.");
  // As in capturePostflopObservation, compare the complete fingerprints above
  // but avoid two escaped copies of the source revision in the 32KiB bridge.
  const epochObservation = (epoch: Epoch, snapshot: LiveTimelineDiagnostic) => ({
    decisionEpoch: epoch.decisionEpoch, stateAvailable: epoch.stateJson !== null,
    matchesRead: epoch.stateJson !== null && epoch.stateJson === stateJson(snapshot),
  });
  return { version: 1 as const, developmentOnly: true, authoritative: false, legalityCertified: false,
    historyComplete: false, contestablePotCertified: false, liveRecommendationsAllowed: false,
    readinessMatched: reasons.length === 0, startedAt, completedAt, tableUrl,
    epochBefore: epochObservation(epochBefore, first), epochAfter: epochObservation(epochAfter, last),
    binding, before, after, read: structuredClone(read), evidence, reasons };
}
export type PostflopReadinessCapture = ReturnType<typeof capturePostflopReadiness>;
