import { mulberry32, parseCards, type Card } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import type { BoardRangeUpdateInput, BoardRangeUpdateResult, OpponentRangeState } from "./boardRangeUpdate.js";
import { comboProbability, createComboRange } from "./comboRange.js";
import { bindOfflineRangeState, conditionLikelihoodScenarios, createBoardRangeUpdater,
  type ActionLikelihoodModel, type OfflineConditioningOptions, type OfflineObservation, type OfflineRangeAnchor } from "./offlineConditioning.js";
import { calculateEquityVsRange, calculateRangeVsRangeEquity } from "./rangeEquity.js";
import { calculateEquityVsRanges } from "./multiwayEquity.js";

const pair = (s: string) => parseCards(s) as [Card, Card];
const range = (...rows: [string, number][]) => createComboRange(rows.map(([s, weight]) => ({ cards: pair(s), weight })));
const base = (): OpponentRangeState => ({ range: range(["As Qs", .6], ["Ah Qh", .3], ["Ac Qc", .1]),
  provenance: [{ basis: "Mathematical prior fixture", evidenceRefs: ["fixture:prior"], model: null }],
  uncertainty: { confidence: "low", assumptions: ["fixture prior"], limitations: ["not strategic data"], alternatives: [] } });
const anchor = (): OfflineRangeAnchor => ({ handId: "hand-1", sourceId: "archive-1", opponentId: "villain-1",
  heroCards: pair("Kh Kd"), board: [], throughObservation: 0, observedAt: 100, originalExpiresAt: 1000, evidenceRefs: ["fixture:prior"] });
const observation = (): OfflineObservation => ({ heroCards: pair("Kh Kd"), board: parseCards("2s 7s 9s 3d 4c"),
  action: { street: "river", action: "bet", facing: "none", priorRaises: 0, observation: 1 },
  context: { position: "BTN", potBB: 10, facingAmountBB: 0, actionToBB: 5, effectiveStackBB: 100, opponentsRemaining: 1 },
  evidence: { handId: "hand-1", sourceId: "archive-1", opponentId: "villain-1", eventId: "event-1", decisionId: "decision-1",
    observedAt: 200, originalExpiresAt: 900, historyCoverage: "complete",
    provenance: [{ basis: "Synthetic archive", evidenceRefs: ["fixture:event-1"], model: null }] } });
const modelFor = (o = observation(), probs = [.2, .8, .4]): ActionLikelihoodModel => {
  const { observation: _index, ...action } = o.action;
  return { id: "bayes-fixture", version: "1", validation: { status: "synthetic_fixture", reviewRefs: [] },
    provenance: { basis: "Synthetic mathematical fixture only", sourceRefs: ["fixture:likelihoods"] },
    assumptions: ["supplied conditional likelihoods"], limitations: ["No empirical or strategic validation"],
    scope: { board: o.board, action, context: o.context }, conditionedOnEventIds: [],
    likelihoods: ["As Qs", "Ah Qh", "Ac Qc"].map((s, i) => ({ cards: pair(s), probability: probs[i]! })) };
};
const optionsFor = (o = observation()): OfflineConditioningOptions => ({ purpose: "mathematical_test", authoritativeObservation: o,
  evaluatedAt: 300, supportedAssumptions: ["supplied conditional likelihoods"], reviews: [] });
const inputFor = (o = observation(), prior = bindOfflineRangeState(base(), anchor())): BoardRangeUpdateInput => ({ ...o, prior });
const run = (input = inputFor(), model = modelFor(input), options = optionsFor(input)): BoardRangeUpdateResult => {
  // The authoritative snapshot contains observation data only, never the prior.
  const { prior: _prior, ...o } = input;
  return createBoardRangeUpdater(model, { ...options, authoritativeObservation:
    options.authoritativeObservation === input ? o : options.authoritativeObservation })(input);
};
function state(result: BoardRangeUpdateResult): OpponentRangeState {
  expect(result.status, result.reasons.join("; ")).toBe("updated");
  if (!result.state) throw new Error("No posterior");
  return result.state;
}
const weights = (s: OpponentRangeState) => ["As Qs", "Ah Qh", "Ac Qc"].map(c => comboProbability(s.range, pair(c)));

describe("offline supplied-likelihood Bayes conditioning", () => {
  it("matches hand-calculated .12/.24/.04 mass => .3/.6/.1 posterior", () => {
    const input = inputFor(), before = JSON.stringify(input);
    const s = state(run(input));
    weights(s).forEach((w, i) => expect(w).toBeCloseTo([.3, .6, .1][i]!, 14));
    expect(s.uncertainty.confidence).toBe("low");
    expect(s.provenance[0]).toEqual(input.prior.provenance[0]);
    expect(s.provenance.at(-1)!.model).toMatchObject({ id: "bayes-fixture", version: "1", validation: "unvalidated" });
    expect(s.offlineHistory!.anchor.originalExpiresAt).toBe(1000);
    expect(s.offlineHistory!.applied[0]!.observation.evidence.originalExpiresAt).toBe(900);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("uses relative combo weights without first treating each weight as a class probability", () => {
    const b = base();
    const result = state(run(inputFor(observation(), bindOfflineRangeState({ ...b,
      range: range(["As Qs", 1], ["Ah Qh", .5], ["Ac Qc", 1 / 6]) }, anchor()))));
    weights(result).forEach((w, i) => expect(w).toBeCloseTo([.3, .6, .1][i]!, 14));
  });

  it("removes hero/board collisions before coverage and preserves legal prior on unsupported updates", () => {
    const b = base(), prior = bindOfflineRangeState({ ...b,
      range: range(["As Qs", .6], ["Ah Qh", .3], ["Kh Qc", .1], ["2s Qd", .5]) }, anchor());
    const o = observation(), m = { ...modelFor(o), likelihoods: modelFor(o).likelihoods.slice(0, 2) };
    const updated = state(run(inputFor(o, prior), m));
    expect(updated.range.combos).toHaveLength(2);
    expect(comboProbability(updated.range, pair("As Qs"))).toBeCloseTo(1 / 3, 14);
    const rejected = run(inputFor(o, prior), { ...m, likelihoods: m.likelihoods.slice(0, 1) });
    expect(rejected.status).toBe("unchanged");
    expect(rejected.state!.range.combos.map(c => c.weight)).toEqual([.6, .3]);
  });

  it("returns unavailable for all-zero likelihoods, empty or fully blocked priors", () => {
    expect(run(inputFor(), modelFor(observation(), [0, 0, 0]))).toMatchObject({ status: "unavailable", state: null });
    for (const r of [range(), range(["Kh Qc", 1]), range(["2s Qc", 1])]) {
      expect(run(inputFor(observation(), bindOfflineRangeState({ ...base(), range: r }, anchor())))).toMatchObject({ status: "unavailable", state: null });
    }
  });

  it("retains representable tiny mass despite underflow in naive multiplication", () => {
    const prior = bindOfflineRangeState({ ...base(), range: range(["As Qs", Number.MIN_VALUE], ["Ah Qh", Number.MIN_VALUE]) }, anchor());
    const s = state(run(inputFor(observation(), prior), modelFor(observation(), [.25, .75, 0])));
    expect(weights(s)[0]).toBeCloseTo(.25, 12);
    expect(weights(s)[1]).toBeCloseTo(.75, 12);
    const verySmall = state(run(inputFor(), modelFor(observation(), [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE])));
    weights(verySmall).forEach((w, i) => expect(w).toBeCloseTo([.6, .3, .1][i]!, 12));
  });

  it("abstains when normalized positive support cannot be represented", () => {
    const prior = bindOfflineRangeState({ ...base(), range: range(["As Qs", Number.MIN_VALUE], ["Ah Qh", 1]) }, anchor());
    const r = run(inputFor(observation(), prior), modelFor(observation(), [Number.MIN_VALUE, 1, 0]));
    expect(r.status).toBe("unavailable");
    expect(r.reasons[0]).toContain("numeric representation");
  });

  it.each([NaN, Infinity, -Infinity, -.1, 1.01])("rejects probability %s even on an unused row", bad => {
    const m = modelFor();
    const r = run(inputFor(), { ...m, likelihoods: [...m.likelihoods, { cards: pair("Kh Qh"), probability: bad }] });
    expect(r.status).toBe("unchanged");
    expect(r.reasons[0]).toContain("probability");
  });

  it("rejects reversed duplicate likelihoods, malformed cards and partial coverage", () => {
    const m = modelFor();
    for (const likelihoods of [[...m.likelihoods, { cards: pair("Qs As"), probability: 0 }],
      [...m.likelihoods, { cards: pair("As As"), probability: 1 }], m.likelihoods.slice(1)]) {
      expect(run(inputFor(), { ...m, likelihoods }).status).toBe("unchanged");
    }
  });

  it.each(["board", "action", "street", "position", "sizing", "pot", "depth", "opponents", "facing", "raises"])("rejects out-of-scope %s", field => {
    const m = structuredClone(modelFor());
    const edits: Record<string, () => void> = {
      board: () => { (m.scope as { board: Card[] }).board = parseCards("2s 7s 9s 3d 5c"); },
      action: () => { m.scope.action.action = "check"; }, street: () => { m.scope.action.street = "turn"; },
      position: () => { Object.assign(m.scope.context, { position: "CO" }); },
      sizing: () => { Object.assign(m.scope.context, { actionToBB: 6 }); }, pot: () => { Object.assign(m.scope.context, { potBB: 20 }); },
      depth: () => { Object.assign(m.scope.context, { effectiveStackBB: 99 }); },
      opponents: () => { Object.assign(m.scope.context, { opponentsRemaining: 2 }); },
      facing: () => { m.scope.action.facing = "raise"; }, raises: () => { m.scope.action.priorRaises = 1; },
    };
    edits[field]!();
    expect(run(inputFor(), m)).toMatchObject({ status: "unchanged" });
  });

  it("requires explicit assumptions, provenance, model identity, and actual supplied review references", () => {
    const m = modelFor();
    const invalid: ActionLikelihoodModel[] = [
      { ...m, id: "" }, { ...m, version: "" }, { ...m, provenance: { basis: "", sourceRefs: [] } },
      { ...m, assumptions: ["GTO from hand strength"] }, { ...m, limitations: [] },
      { ...m, validation: { status: "unreviewed", reviewRefs: [] } },
      { ...m, validation: { status: "reviewed", reviewRefs: ["claimed-review"] } },
      { ...m, validation: { status: "synthetic_fixture", reviewRefs: ["claimed-review"] } },
    ];
    for (const bad of invalid) expect(run(inputFor(), bad).status).toBe("unchanged");
    expect(run(inputFor(), m, { ...optionsFor(), purpose: "offline_analysis" }).status).toBe("unchanged");
    const reviewed = { ...m, validation: { status: "reviewed" as const, reviewRefs: ["fixture:review"] } };
    const options = { ...optionsFor(), purpose: "offline_analysis" as const,
      reviews: [{ modelId: m.id, version: m.version, reviewRef: "fixture:review", modelArtifact: reviewed }] };
    // Contract-path test only: these strings are NOT a genuinely reviewed model.
    expect(run(inputFor(), reviewed, options).status).toBe("updated");
    expect(run(inputFor(), { ...reviewed, version: "2" }, options).status).toBe("unchanged");
    expect(run(inputFor(), { ...reviewed, likelihoods: modelFor(observation(), [1, 1, 1]).likelihoods }, options).status).toBe("unchanged");
  });

  it("requires bound prior and independent expected observation", () => {
    expect(run(inputFor(observation(), base())).status).toBe("unchanged");
    expect(run(inputFor(), modelFor(), { ...optionsFor(), authoritativeObservation: null }).status).toBe("unchanged");
    const expected = observation();
    const changed = { ...expected, context: { ...expected.context, actionToBB: 6 } };
    expect(run(inputFor(changed), modelFor(changed), optionsFor(expected)).reasons[0]).toContain("contradicts");
    const changedExpiry = { ...expected, evidence: { ...expected.evidence, originalExpiresAt: 999 } };
    expect(run(inputFor(changedExpiry), modelFor(changedExpiry), optionsFor(expected)).status).toBe("unchanged");
  });

  it.each(["handId", "sourceId", "opponentId"])("cannot reuse another %s's prior", field => {
    const o = observation();
    const mismatch = { ...o, evidence: { ...o.evidence, [field]: "different" } };
    expect(run(inputFor(mismatch))).toMatchObject({ status: "unavailable", state: null });
  });

  it("rejects invalid known cards, changed hero, and street/board mismatch", () => {
    const o = observation();
    for (const bad of [{ ...o, heroCards: pair("Kh Kh") }, { ...o, heroCards: pair("Jh Jd") },
      { ...o, board: parseCards("2s 7s 9s 3d 2s") }, { ...o, board: parseCards("2s 7s 9s") }]) {
      expect(run(inputFor(bad))).toMatchObject({ status: "unavailable", state: null });
    }
  });

  it.each(["partial", "unknown"] as const)("rejects %s history without losing legal prior", historyCoverage => {
    const o = observation();
    const bad = { ...o, evidence: { ...o.evidence, historyCoverage } };
    expect(run(inputFor(bad))).toMatchObject({ status: "unchanged" });
  });

  it("does not refresh prior or event expiry, including at the exact deadline", () => {
    for (const evaluatedAt of [99, 199, 900, 1000, Infinity, NaN]) {
      expect(run(inputFor(), modelFor(), { ...optionsFor(), evaluatedAt }).status).toBe("unchanged");
    }
    const prior = bindOfflineRangeState(base(), { ...anchor(), originalExpiresAt: 250 });
    expect(run(inputFor(observation(), prior)).reasons[0]).toContain("expired");
  });

  it("rejects missing evidence fields and invalid numeric/context data at runtime", () => {
    const original = observation();
    const badEvidence = [
      { handId: null }, { sourceId: null }, { opponentId: null },
      { eventId: null }, { decisionId: null }, { originalExpiresAt: null }, { originalExpiresAt: 200 },
      { originalExpiresAt: Infinity }, { observedAt: NaN }, { observedAt: -1 }, { provenance: [] },
    ];
    for (const changes of badEvidence) {
      const bad = { ...original, evidence: { ...original.evidence, ...changes } };
      expect(run(inputFor(bad)).status).toBe("unchanged");
    }
    for (const changes of [{ position: null }, { potBB: 0 }, { facingAmountBB: -1 }, { effectiveStackBB: Infinity },
      { actionToBB: null }, { opponentsRemaining: 0 }, { opponentsRemaining: 1.5 }, { actionToBB: 0 }]) {
      const bad = { ...original, context: { ...original.context, ...changes } };
      expect(run(inputFor(bad)).status).toBe("unchanged");
    }
    for (const changes of [{ observation: undefined }, { observation: 0 }, { observation: 1.5 },
      { priorRaises: null }, { priorRaises: -1 }, { unopened: true }]) {
      const bad = { ...original, action: { ...original.action, ...changes } } as OfflineObservation;
      expect(run(inputFor(bad)).status).toBe("unchanged");
    }
  });

  it("validates prior anchor identities, provenance, cutoff and expiry", () => {
    for (const changes of [{ handId: "" }, { throughObservation: -.5 }, { originalExpiresAt: 100 },
      { evidenceRefs: [] }, { evidenceRefs: ["unbound-reference"] }, { board: parseCards("2s 7s") }]) {
      expect(() => bindOfflineRangeState(base(), { ...anchor(), ...changes })).toThrow();
    }
    const invalid = { ...base(), range: { kind: "combination" as const, combos: [{ cards: pair("As Qs"), weight: NaN }] } };
    expect(run(inputFor(observation(), invalid))).toMatchObject({ status: "unavailable", state: null });
  });

  it.each(["fold", "all-in"] as const)("allows a scoped %s observation but rejects further actor actions", action => {
    const original = observation();
    const terminal: OfflineObservation = { ...original,
      action: { ...original.action, action, ...(action === "all-in" ? { wagerAction: "bet" as const } : {}) },
      context: { ...original.context, actionToBB: action === "fold" ? 0 : 100 } };
    const first = state(run(inputFor(terminal)));
    const later: OfflineObservation = { ...original, action: { ...original.action, observation: 2 },
      evidence: { ...original.evidence, eventId: "event-2", decisionId: "decision-2" } };
    const result = run(inputFor(later, first), { ...modelFor(later), conditionedOnEventIds: ["event-1"] });
    expect(result.status).toBe("unchanged");
    expect(result.reasons[0]).toContain("terminal");
  });

  it("cannot launder a synthetic-conditioned prior through a later reviewed-model claim", () => {
    const prior = state(run()), original = observation();
    const next: OfflineObservation = { ...original, action: { ...original.action, observation: 2 },
      evidence: { ...original.evidence, eventId: "event-2", decisionId: "decision-2" } };
    const m = { ...modelFor(next), conditionedOnEventIds: ["event-1"],
      validation: { status: "reviewed" as const, reviewRefs: ["fixture:review"] } };
    const r = run(inputFor(next, prior), m, { ...optionsFor(next), purpose: "offline_analysis",
      reviews: [{ modelId: m.id, version: m.version, reviewRef: "fixture:review", modelArtifact: m }] });
    expect(r.status).toBe("unchanged");
    expect(r.reasons[0]).toContain("Synthetic-conditioned");
  });

  it("is idempotent on replay and rejects contradictory actions at the same event, decision or order", () => {
    const first = state(run());
    const repeated = run(inputFor(observation(), first));
    expect(repeated.status).toBe("unchanged");
    expect(repeated.state!.range).toEqual(first.range);
    expect(repeated.state).toEqual(first);
    expect(repeated.reasons[0]).toContain("already applied");
    for (const keep of ["eventId", "decisionId", "observation"]) {
      const o = observation();
      const conflict: OfflineObservation = { ...o,
        action: { ...o.action, action: "check", observation: keep === "observation" ? 1 : 2 },
        context: { ...o.context, actionToBB: 0 },
        evidence: { ...o.evidence, eventId: keep === "eventId" ? "event-1" : "event-2",
          decisionId: keep === "decisionId" ? "decision-1" : "decision-2" } };
      const r = run(inputFor(conflict, first));
      expect(r.status).toBe("unchanged");
      expect(r.reasons[0]).toContain("Contradictory repeated");
    }
  });

  it("conditions sequential actions only with ordered, history-conditional likelihoods", () => {
    const first = state(run());
    const o = observation();
    const second: OfflineObservation = { ...o, action: { ...o.action, observation: 2, action: "call", facing: "raise", priorRaises: 1 },
      context: { ...o.context, facingAmountBB: 5, actionToBB: 10 },
      evidence: { ...o.evidence, observedAt: 400, originalExpiresAt: 1200, eventId: "event-2", decisionId: "decision-2" } };
    const m = { ...modelFor(second, [.5, .25, 1]), conditionedOnEventIds: ["event-1"] };
    const options = { ...optionsFor(second), evaluatedAt: 500 };
    const r = state(run(inputFor(second, first), m, options));
    // (.3*.5, .6*.25, .1*1) = (.15,.15,.1) => (3/8,3/8,1/4).
    weights(r).forEach((w, i) => expect(w).toBeCloseTo([.375, .375, .25][i]!, 14));
    expect(r.offlineHistory!.applied).toHaveLength(2);
    expect(run(inputFor(second, first), modelFor(second), options).status).toBe("unchanged");
    expect(run(inputFor(second, first), m, { ...options, evaluatedAt: 900 }).reasons[0]).toContain("expired");
    const early = { ...second, evidence: { ...second.evidence, observedAt: 150 } };
    expect(run(inputFor(early, first), { ...modelFor(early), conditionedOnEventIds: ["event-1"] },
      { ...optionsFor(early), evaluatedAt: 500 }).reasons[0]).toContain("order");
  });

  it("supports flop to turn to river only with an unchanged board prefix", () => {
    let prior = bindOfflineRangeState(base(), anchor());
    const original = observation();
    for (const [i, street] of (["flop", "turn", "river"] as const).entries()) {
      const o: OfflineObservation = { ...original, board: original.board.slice(0, i + 3),
        action: { ...original.action, street, observation: i + 1 },
        evidence: { ...original.evidence, observedAt: 200 + i, eventId: `event-${i + 1}`, decisionId: `decision-${i + 1}` } };
      prior = state(run(inputFor(o, prior), { ...modelFor(o, [1, 1, 1]),
        conditionedOnEventIds: Array.from({ length: i }, (_, j) => `event-${j + 1}`) }));
    }
    expect(weights(prior)[0]).toBeCloseTo(.6, 14);
    const changed = { ...original, board: parseCards("2s 7s 9s 3d 5c") };
    expect(run(inputFor(changed, prior)).status).toBe("unavailable");
  });

  it.each([
    { action: "check", facing: "bet" }, { action: "bet", facing: "raise" },
    { action: "call", facing: "none" }, { action: "raise", facing: "none" },
    { action: "all-in", wagerAction: null }, { action: "bet", wagerAction: "call" },
  ])("rejects contradictory action context %j", changes => {
    const o = observation();
    const bad = { ...o, action: { ...o.action, ...changes } } as OfflineObservation;
    expect(run(inputFor(bad)).status).toBe("unchanged");
  });

  it("freezes ranges, provenance, observation ledger and supplied model snapshots", () => {
    const o = observation(), m = modelFor(o), options = optionsFor(o), input = inputFor(o);
    const updater = createBoardRangeUpdater(m, options);
    Object.assign(m.likelihoods[0]!, { probability: 1 });
    Object.assign(options, { evaluatedAt: 99999 });
    const s = state(updater(input));
    expect(weights(s)[0]).toBeCloseTo(.3, 14);
    expect(Object.isFrozen(s.range.combos[0]!.cards[0])).toBe(true);
    expect(Object.isFrozen(s.offlineHistory!.applied[0]!.model.likelihoods)).toBe(true);
    expect(Object.isFrozen(s.uncertainty.assumptions)).toBe(true);
    expect(Object.isFrozen(s.provenance)).toBe(true);
    expect(() => bindOfflineRangeState(s, anchor())).toThrow("already bound");
  });

  it("keeps labeled sensitivity posteriors separate, including rejected and impossible branches", () => {
    const results = conditionLikelihoodScenarios(inputFor(), [
      { label: "test A", model: modelFor() }, { label: "test B", model: modelFor(observation(), [1, 1, 1]) },
      { label: "impossible", model: modelFor(observation(), [0, 0, 0]) },
      { label: "unsupported", model: { ...modelFor(), assumptions: ["unsupported"] } },
    ], optionsFor());
    expect(results.map(r => r.result.status)).toEqual(["updated", "updated", "unavailable", "unchanged"]);
    expect(weights(state(results[0]!.result))[0]).toBeCloseTo(.3, 14);
    expect(weights(state(results[1]!.result))[0]).toBeCloseTo(.6, 14);
    expect(results).not.toHaveProperty("average");
    expect(() => conditionLikelihoodScenarios(inputFor(), [{ label: "same", model: modelFor() },
      { label: "same", model: modelFor() }], optionsFor())).toThrow("labels");
    expect(() => conditionLikelihoodScenarios(inputFor(), [], optionsFor())).toThrow("labels");
    const b = base();
    expect(() => bindOfflineRangeState({ ...b, uncertainty: { ...b.uncertainty, alternatives: [b.range] } }, anchor())).toThrow("Unlabeled");
  });

  it("feeds the same posterior distribution to all Phase 5A equity samplers", () => {
    // Synthetic .75/.25 prior times .25/.75 likelihood => .5/.5 posterior.
    const prior = bindOfflineRangeState({ ...base(), range: range(["As Qs", .75], ["Ah Qh", .25]) }, anchor());
    const post = state(run(inputFor(observation(), prior), modelFor(observation(), [.25, .75, 0]))).range;
    const hero = pair("Kh Kd"), board = observation().board;
    const opts = (seed = 44) => ({ iterations: 4000, rng: mulberry32(seed) });
    expect(calculateEquityVsRange(hero, post, board, opts()).equity).toBeCloseTo(.5, 1);
    const second = range(["As Js", .5], ["Qc Qd", .5]);
    // Three disjoint deals each have mass .25; only hearts/QQ lets KK win.
    for (const opponents of [[post, second], [second, post]]) {
      expect(Math.abs(calculateEquityVsRanges(hero, opponents, board, opts()).equity - 1 / 3)).toBeLessThan(.03);
    }
    // Hero KK/AsJs vs posterior has three legal equal-mass pairs; two win.
    expect(Math.abs(calculateRangeVsRangeEquity(range(["Kh Kd", .5], ["As Js", .5]), post, board, opts()).equity - 2 / 3)).toBeLessThan(.03);
    const fixed = range(["As Qs", .5], ["Ah Qh", .5]);
    expect(calculateEquityVsRange(hero, post, board, opts())).toEqual(calculateEquityVsRange(hero, fixed, board, opts()));
  }, 20000);
});
