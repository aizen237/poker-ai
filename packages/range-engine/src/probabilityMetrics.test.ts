import { describe, expect, it } from "vitest";
import { scoreProbabilities, summarizePredictions, type ScoredPrediction } from "./probabilityMetrics.js";

const rows = (probabilities: number[][], labels: number[]): ScoredPrediction[] => probabilities.map((p, i) => ({
  eventId: `e${i}`, handId: `h${i}`, sessionId: `s${i}`, playerIds: ["p"], probabilities: p, observedIndex: labels[i]!,
}));

describe("independent proper-score and calibration arithmetic", () => {
  it("computes natural-log loss and unhalved multiclass Brier score by hand", () => {
    const score = scoreProbabilities([.2, .3, .5], 1);
    expect(score.nll).toBeCloseTo(1.2039728043259361, 14);
    // .2^2 + (.3-1)^2 + .5^2 = .04 + .49 + .25 = .78.
    expect(score.brier).toBeCloseTo(.78, 14);
    expect(scoreProbabilities([0, 1], 1)).toEqual({ nll: -0, brier: 0 });
  });

  it("preserves infinite log loss and finite loss for tiny positive probabilities", () => {
    expect(scoreProbabilities([0, 1], 0)).toEqual({ nll: "infinite", brier: 2 });
    expect(scoreProbabilities([Number.MIN_VALUE, 1], 0).nll).toBeCloseTo(744.4400719213812, 12);
    const s = summarizePredictions(rows([[0, 1], [.5, .5]], [0, 1]), ["a", "b"], [0, .5, 1])!;
    expect(s.nll).toBe("infinite"); expect(s.zeroAssigned).toBe(1); expect(s.brier).toBe(1.25);
    expect(JSON.parse(JSON.stringify(s)).nll).toBe("infinite");
  });

  it.each([[], [.2, .2], [NaN, 1], [Infinity, 0], [-.1, 1.1], [null, 1], [".5", .5]])("rejects invalid probability vector %j", p => {
    expect(() => scoreProbabilities(p as number[], 0)).toThrow();
  });
  it.each([-1, 2, .5, NaN])("rejects missing/invalid class label %s", label => {
    expect(() => scoreProbabilities([.5, .5], label)).toThrow("label");
  });

  it("places 0, interior edges and 1 into exactly one bin and keeps empty bins null", () => {
    const s = summarizePredictions(rows([[0, 1], [.5, .5], [1, 0]], [1, 0, 0]), ["a", "b"], [0, .25, .5, .75, 1])!;
    expect(s.calibration[0]!.bins.map(b => b.count)).toEqual([1, 0, 1, 1]);
    expect(s.calibration[0]!.bins[1]).toMatchObject({ count: 0, meanPrediction: null, observedFrequency: null });
    expect(s.calibration[0]!.bins[2]).toMatchObject({ meanPrediction: .5, observedFrequency: 1 });
    expect(s.calibration[0]!.bins[3]).toMatchObject({ upperInclusive: true, meanPrediction: 1, observedFrequency: 1 });
  });

  it("matches a two-row hand calculation and reports session sensitivity without confidence claims", () => {
    const s = summarizePredictions(rows([[.65, .35], [.65, .35]], [0, 1]), ["check", "bet"], [0, .5, 1])!;
    expect(s.nll).toBeCloseTo(-(Math.log(.65) + Math.log(.35)) / 2, 14);
    expect(s.brier).toBeCloseTo(.545, 14);
    expect(s.calibration[0]!.bins[1]).toMatchObject({ count: 2, meanPrediction: .65, observedFrequency: .5 });
    expect(s.uncertainty.confidenceInterval).toBeNull();
    const sensitivity = s.uncertainty.leaveOneSessionOut!;
    expect(sensitivity.brier[0]).toBeCloseTo(.245, 14); expect(sensitivity.brier[1]).toBeCloseTo(.845, 14);
    expect(s.samples).toBe(2); expect(s.sessions).toBe(2);
  });

  it("returns no scores for empty datasets and no session sensitivity for a single session", () => {
    expect(summarizePredictions([], ["a", "b"], [0, 1])).toBeNull();
    const oneSession = rows([[.5, .5], [.5, .5]], [0, 1]).map(r => ({ ...r, sessionId: "shared" }));
    expect(summarizePredictions(oneSession, ["a", "b"], [0, 1])!.uncertainty.leaveOneSessionOut).toBeNull();
  });

  it.each([[0, .5], [.1, 1], [0, .5, .5, 1], [0, NaN, 1]])("rejects invalid calibration partition %j", edges => {
    expect(() => summarizePredictions([], ["a"], edges)).toThrow("Calibration");
  });
});
