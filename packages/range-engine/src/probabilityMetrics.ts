import { immutableCopy } from "./boardComboFeatures.js";
import { demand, validateDistribution } from "./likelihoodRegistry.js";

/** JSON-safe infinity: zero probability on an observed outcome is infinite NLL,
 * not missing data or a clipped finite loss. Natural logarithms (nats). */
export type LogLoss = number | "infinite";
export function scoreProbabilities(probabilities: readonly number[], observedIndex: number) {
  validateDistribution(probabilities);
  demand(Number.isSafeInteger(observedIndex) && observedIndex >= 0 && observedIndex < probabilities.length, "Missing/invalid action label");
  const assigned = probabilities[observedIndex]!;
  return Object.freeze({ nll: assigned === 0 ? "infinite" as const : -Math.log(assigned),
    brier: probabilities.reduce((sum, p, i) => sum + (p - Number(i === observedIndex)) ** 2, 0) });
}
export interface ScoredPrediction {
  readonly eventId: string;
  readonly handId: string;
  readonly sessionId: string;
  readonly playerIds: readonly string[];
  readonly probabilities: readonly number[];
  readonly observedIndex: number;
}
export function validateCalibrationBins(edges: readonly number[]): void {
  demand(edges.length >= 2 && edges[0] === 0 && edges.at(-1) === 1 &&
    edges.every((v, i) => Number.isFinite(v) && (i === 0 || v > edges[i - 1]!)), "Calibration bins must partition [0,1]");
}
function means(rows: readonly ScoredPrediction[]) {
  const scores = rows.map(r => scoreProbabilities(r.probabilities, r.observedIndex));
  const zeroAssigned = scores.filter(s => s.nll === "infinite").length;
  return { nll: zeroAssigned > 0 ? "infinite" as const : scores.reduce((s, r) => s + (r.nll as number), 0) / rows.length,
    brier: scores.reduce((s, r) => s + r.brier, 0) / rows.length, zeroAssigned };
}
const numericLoss = (n: LogLoss) => n === "infinite" ? Infinity : n;
const jsonLoss = (n: number): LogLoss => n === Infinity ? "infinite" : n;

/** Descriptive summaries, no inferred IID assumption, reliability threshold or
 * automatic calibration verdict. Empty bins retain count 0 and null statistics. */
export function summarizePredictions(rows: readonly ScoredPrediction[], actionIds: readonly string[], edges: readonly number[]) {
  validateCalibrationBins(edges);
  demand(actionIds.length > 0 && new Set(actionIds).size === actionIds.length, "Invalid action IDs");
  for (const row of rows) demand(row.probabilities.length === actionIds.length, "Inconsistent action space");
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => a.eventId < b.eventId ? -1 : 1);
  const sessions = [...new Set(sorted.map(r => r.sessionId))].sort();
  const result = means(sorted);
  const calibration = actionIds.map((actionId, index) => ({ actionId, bins: edges.slice(0, -1).map((lo, bin) => {
    const hi = edges[bin + 1]!;
    const selected = sorted.filter(r => r.probabilities[index]! >= lo && (r.probabilities[index]! < hi || hi === 1));
    return { lower: lo, upper: hi, upperInclusive: hi === 1, count: selected.length,
      meanPrediction: selected.length ? selected.reduce((s, r) => s + r.probabilities[index]!, 0) / selected.length : null,
      observedFrequency: selected.length ? selected.filter(r => r.observedIndex === index).length / selected.length : null };
  }) }));
  const leaveSessionOut = sessions.length > 1 ? sessions.map(session => means(sorted.filter(r => r.sessionId !== session))) : [];
  return immutableCopy({ samples: sorted.length, hands: new Set(sorted.map(r => r.handId)).size, sessions: sessions.length,
    players: new Set(sorted.flatMap(r => [...r.playerIds])).size, ...result, calibration,
    uncertainty: { confidenceInterval: null, reason: "No independent sampling design or effective sample size inferred",
      leaveOneSessionOut: leaveSessionOut.length ? {
        nll: [jsonLoss(Math.min(...leaveSessionOut.map(r => numericLoss(r.nll)))), jsonLoss(Math.max(...leaveSessionOut.map(r => numericLoss(r.nll))))],
        brier: [Math.min(...leaveSessionOut.map(r => r.brier)), Math.max(...leaveSessionOut.map(r => r.brier))],
        interpretation: "Descriptive session sensitivity, not a confidence interval" } : null } });
}
