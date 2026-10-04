import { chenScore } from "./chenScore.js";
import type { Card } from "@poker-ai/shared";
import { allHandTypes, formatHandType, parseHandType } from "./handNotation.js";
import { getPreflopOpeningReference, type Position } from "./openingRanges.js";
import { expandRange, rangeComboCount, rangeFromList, type Range, type WeightedCombo } from "./range.js";

export interface NarrowingOptions {
  /** Fraction of the range to keep, e.g. 0.25 = top 25%. */
  topFraction?: number;
  /** Lower/upper percentile bounds for a middle-band narrowing, e.g. [0.4, 0.75]. */
  band?: [number, number];
}

/** Chen orders starting-hand types only. Legacy slice helpers below use type
 * counts; the contextual estimator uses weighted combo mass and scope guards. */
function rankRangeByStrength(range: Range): string[] {
  return [...range.keys()].sort((a, b) => chenScore(parseHandType(b)) - chenScore(parseHandType(a)));
}

/** Narrows a range to the top N% by Chen score -- models a 3-bet (aggression implies strength). */
export function narrowForThreeBet(range: Range, options: NarrowingOptions = {}): Range {
  const topFraction = options.topFraction ?? 0.25;
  if (!Number.isFinite(topFraction) || topFraction <= 0 || topFraction > 1) {
    throw new Error(`topFraction must be between 0 (exclusive) and 1, got ${topFraction}`);
  }

  const ranked = rankRangeByStrength(range);
  const keepCount = Math.max(1, Math.ceil(ranked.length * topFraction));
  const kept = new Set(ranked.slice(0, keepCount));

  const narrowed: Range = new Map();
  for (const [hand, weight] of range) {
    if (kept.has(hand)) narrowed.set(hand, weight);
  }
  return narrowed;
}

/** Legacy hand-type band utility. The contextual estimator uses weighted continuation with premium traps instead. */
export function narrowForCall(range: Range, options: NarrowingOptions = {}): Range {
  const [lowerPct, upperPct] = options.band ?? [0.4, 0.75];
  if (!Number.isFinite(lowerPct) || !Number.isFinite(upperPct) || lowerPct < 0 || upperPct > 1 || lowerPct >= upperPct) {
    throw new Error(`Invalid band [${lowerPct}, ${upperPct}]: must satisfy 0 <= lower < upper <= 1`);
  }

  const ranked = rankRangeByStrength(range);
  const lowerIdx = Math.floor(ranked.length * lowerPct);
  const upperIdx = Math.ceil(ranked.length * upperPct);
  const kept = new Set(ranked.slice(lowerIdx, upperIdx));

  const narrowed: Range = new Map();
  for (const [hand, weight] of range) {
    if (kept.has(hand)) narrowed.set(hand, weight);
  }
  return narrowed;
}

/**
 * Narrows a range to exclude the top N% -- models folding to aggression
 * (a 3-bet or raise): the remaining continuing range excludes whatever
 * portion is assumed to have 4-bet/re-raised instead of calling.
 */
export function narrowExcludingTop(range: Range, topFractionExcluded: number): Range {
  if (!Number.isFinite(topFractionExcluded) || topFractionExcluded < 0 || topFractionExcluded >= 1) {
    throw new Error(`topFractionExcluded must be between 0 (inclusive) and 1 (exclusive), got ${topFractionExcluded}`);
  }

  const ranked = rankRangeByStrength(range);
  const excludeCount = Math.floor(ranked.length * topFractionExcluded);
  const excluded = new Set(ranked.slice(0, excludeCount));

  const narrowed: Range = new Map();
  for (const [hand, weight] of range) {
    if (!excluded.has(hand)) narrowed.set(hand, weight);
  }
  return narrowed;
}

export type OpponentAction = "check" | "call" | "bet" | "raise" | "fold" | "all-in";


export interface RangeAction {
  street: "preflop" | "flop" | "turn" | "river";
  action: OpponentAction;
  /** Full raises before THIS event, including other players and hero. Null if unknown. */
  priorRaises: number | null;
  facing: "none" | "bet" | "raise" | "unknown";
  facingPosition?: Position | null;
  /** Explicitly excludes limpers/straddles; zero prior raises alone is insufficient. */
  unopened?: boolean;
  wagerAction?: "call" | "bet" | "raise" | null;
  /** Equal observations cannot establish event order. */
  observation?: number;
}
export interface SmoothedTendency { estimate:number; priorMean:number; playerWeight:number; samples:number }
export interface PlayerTendencies { vpip:SmoothedTendency; pfr:SmoothedTendency }
/** A second reliability discount and a 15% cap keep sparse profiles near baseline. */
function tendencyMultiplier(rate:SmoothedTendency|undefined):number {
  if(!rate || rate.samples<=0 || ![rate.estimate,rate.priorMean,rate.playerWeight].every(v=>Number.isFinite(v)&&v>=0&&v<=1))return 1;
  return 1+Math.max(-0.15,Math.min(0.15,(rate.estimate-rate.priorMean)*rate.playerWeight));
}
export interface RangeEstimationInput {
  tendencies?:PlayerTendencies|undefined;
  position: Position | null;
  actions: readonly RangeAction[];
  historyCoverage: "complete" | "partial";
  /** Depth and table size at the observed preflop decision, not current postflop stacks. */
  effectiveStackBB: number | null;
  playersDealtIn: number | null;
  chipEvOnly: boolean;
  knownCards?: readonly Card[];
  baseline?: { range: Range; basis: string; confidence: "medium" | "low" };
}
export interface OpponentRangeEstimate {
  range: Range;
  /** Suit-specific blockers are removed here, not by deleting an entire hand type. */
  combos: WeightedCombo[];
  status: "modeled" | "prior_only" | "unavailable";
  confidence: "medium" | "low";
  basis: string;
  assumptions: string[];
  fallbacks: string[];
}

/** Approximate Chen ordering of weighted combo mass, not a solver or a chart. */
function retainStrengthMass(range: Range, fraction: number): Range {
  const ranked = rankRangeByStrength(range);
  const target = rangeComboCount(range) * fraction;
  const result: Range = new Map();
  let mass = 0;
  let boundary = Infinity;
  for (const hand of ranked) {
    const score = chenScore(parseHandType(hand));
    if (mass >= target && score < boundary) break;
    const weight = range.get(hand)!;
    result.set(hand, weight);
    mass += rangeComboCount(new Map([[hand, weight]]));
    boundary = score;
  }
  return result;
}

/** A conditional range for one opponent, replayed from the prior for this hand.
 * Unsupported actions retain that prior with explicit low confidence. */
export function estimateOpponentRange(input: RangeEstimationInput): OpponentRangeEstimate {
  const known = input.knownCards ?? [];
  if (new Set(known.map(c => c.rank + c.suit)).size !== known.length) throw new Error("Duplicate known cards");
  let range: Range = input.baseline ? new Map(input.baseline.range) : rangeFromList(allHandTypes().map(formatHandType));
  for (const [hand, weight] of range) {
    parseHandType(hand);
    if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new Error("Range weights must be finite and between 0 and 1");
    if (weight === 0) range.delete(hand);
  }
  let modeled = input.baseline !== undefined;
  let confidence: "medium" | "low" = input.baseline?.confidence ?? "medium";
  const assumptions = ["Chen strength ordering and retained fractions are illustrative heuristics, not calibrated frequencies or solved ranges."];
  const fallbacks: string[] = [];
  const entryMultiplier=tendencyMultiplier(input.tendencies?.vpip);
  const aggressionMultiplier=tendencyMultiplier(input.tendencies?.pfr);
  const path: string[] = [];
  const warn = (message: string) => { confidence = "low"; assumptions.push(message); };
  if (input.historyCoverage === "partial") warn("Partial history may omit hero actions, raises, and intervening calls; unknown raise levels are not inferred.");
  if (input.position === null) warn("Opponent position is unknown.");
  if(entryMultiplier!==1||aggressionMultiplier!==1)warn("Range width uses opportunity-aware shrunk VPIP/PFR with a second reliability discount and bounded adjustment. Fold-to-3bet is not substituted for shove fold equity.");
  const available = (candidate: Range) => expandRange(candidate, known).some(c => c.weight > 0);
  let previousStreet = -1;
  let previousObservation = -1;
  for (const event of input.actions) {
    const streetIndex = ["preflop", "flop", "turn", "river"].indexOf(event.street);
    const unordered = streetIndex < previousStreet || (event.observation !== undefined && event.observation < previousObservation) || (event.observation !== undefined && input.actions.filter(a => a.observation === event.observation).length > 1);
    previousStreet = Math.max(previousStreet, streetIndex);
    previousObservation = Math.max(previousObservation, event.observation ?? -1);
    const verb = event.action === "all-in" ? event.wagerAction : event.action;
    let label: string = event.street + " " + (verb ?? "all-in (wager unknown)");
    if (event.action === "all-in" && verb) label += " all-in";
    let candidate = range;
    let establishesModel = false;
    if (unordered) {
      warn("Unordered or regressing action retained the previous range.");
    } else if (event.street !== "preflop") {
      // Chen ranks starting hands, not strength/draws on a particular board.
      // Bet and raise remain different evidence, but neither gets a preflop cut.
      if (verb === "bet" || verb === "raise" || verb === "call") warn(label + ": board-aware continuation model unavailable; retained prior range.");
    } else if (verb === "raise" || verb === "bet") {
      const level = event.priorRaises;
      if (input.historyCoverage !== "complete" || level === null || !Number.isInteger(level) || level < 0 || event.facing === "unknown") {
        label = "preflop aggression (raise level unknown)";
        warn("Preflop aggression lacks verified prior action; no 3-bet cut applied.");
      } else if (level === 0 && event.facing === "none") {
        label = event.unopened === true ? (input.position ?? "unknown position") + " open" : "preflop raise (unopened pot unverified)";
        const reference = input.chipEvOnly && event.unopened === true ? getPreflopOpeningReference({position:input.position,effectiveStackBB:input.effectiveStackBB,playersDealtIn:input.playersDealtIn ?? 0,unopened:true}) : null;
        if (reference) {
          candidate = new Map([...range].filter(([hand]) => reference.has(hand)));
          if(aggressionMultiplier>1){
            const extras=new Map([...range].filter(([hand])=>!reference.has(hand)));
            const extraMass=rangeComboCount(candidate)*(aggressionMultiplier-1),mass=rangeComboCount(extras);
            if(mass>0){
              const selected=retainStrengthMass(extras,Math.min(1,extraMass/mass));
              const scale=Math.min(1,extraMass/rangeComboCount(selected));
              for(const [hand,weight] of selected)candidate.set(hand,weight*scale);
            }
          }else if(aggressionMultiplier<1)candidate=retainStrengthMass(candidate,aggressionMultiplier);
          if(aggressionMultiplier!==1)warn("Opening prior adjusted conservatively by shrunk PFR; maximum target mass change 15%, not a player-skill label.");
          establishesModel = true;
          assumptions.push("Opening reference is a 100BB+ six-max chip-EV RFI prior; it is carried forward only from this observed open.");
        } else warn("Opening reference out of scope (position, depth, table size or tournament conditions); retained prior.");
      } else if (level >= 1 && event.facing === "raise") {
        label = event.street + (level === 1 ? " 3-bet" : " later re-raise");
        if (input.effectiveStackBB === null || !Number.isFinite(input.effectiveStackBB) || input.effectiveStackBB < 100 || input.playersDealtIn !== 6 || !input.chipEvOnly) {
          warn(label + ": short-stack/tournament/unknown context not modeled; retained prior.");
        } else {
          const fraction = level > 1 ? 0.12 : event.facingPosition === "UTG" ? 0.18 : 0.25;
          candidate = retainStrengthMass(range, fraction * aggressionMultiplier);
          establishesModel = true;
          warn(label + ": assumed top " + fraction * 100 + "% weighted strength mass; bluffs and sizing are unmodeled.");
        }
      } else warn("Inconsistent preflop facing action and raise count; retained prior.");
    } else if (verb === "call") {
      if (input.historyCoverage !== "complete" || event.facing !== "raise" || event.priorRaises === null || !Number.isInteger(event.priorRaises) || event.priorRaises < 1 ||
          input.effectiveStackBB === null || !Number.isFinite(input.effectiveStackBB) || input.effectiveStackBB < 100 || input.playersDealtIn !== 6 || !input.chipEvOnly) {
        warn("Call context is unresolved or outside deep-stack scope; retained prior.");
      } else {
        candidate = retainStrengthMass(range, (event.priorRaises === 1 ? 0.65 : 0.5) * entryMultiplier);
        // Keep some premium traps instead of asserting that AA can never flat.
        const premiums = retainStrengthMass(range, 0.1);
        candidate = new Map([...candidate].map(([hand, weight]) => [hand, weight * (premiums.has(hand) ? 0.5 : 1)]));
        establishesModel = true;
        warn("Flat-call heuristic retains a stronger continuing subset with reduced premium weights; traps remain possible.");
      }
    } else if (event.action === "all-in") warn("All-in status alone supplies no additional range evidence.");
    path.push(label);
    if (candidate !== range && !available(candidate)) {
      fallbacks.push(label + ": heuristic removed all legal combos; retained previous weighted range.");
      confidence = "low";
    } else {
      range = candidate;
      modeled ||= establishesModel;
    }
  }
  const combos = expandRange(range, known);
  const status = combos.length === 0 ? "unavailable" : modeled ? "modeled" : "prior_only";
  if (status !== "modeled") warn(status === "unavailable" ? "Supplied prior has no legal combos; equity is unavailable, not replaced by random hands." : "No supported conditioning evidence; broad legal-card prior only, not an estimated opponent strategy.");
  return { range, combos, status, confidence,
    basis: (modeled ? "Estimated from " : "Unconditioned prior; observed ") + (path.join(" -> ") || "no actions") + (input.baseline ? "; prior: " + input.baseline.basis : ""),
    assumptions: [...new Set(assumptions)], fallbacks };
}
