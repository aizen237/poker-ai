import type { FirstUtgProof, FirstUtgWitness, UtgProjection } from "./firstUtgSource.js";
import type { BoundedUtgState } from "./firstUtgState.js";
import { hjPatchKind } from "./hjWindow.js";
import type { CoFacingOpenProof } from "./bettingWindow.js";

const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => same(v, b[i]));
  return object(a) && object(b) && Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(k => Object.hasOwn(b, k) && same(a[k], b[k]));
};
const exact = (v: Record<string, any>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const common = ["now", "pre", "eventsData", "mEV", "fV", "sN"];

/** Closed boundary gate for hand243 accounting and the hand248 profile. The opening witness owns
 * identity/posts; this closed raw shape prevents hidden returns/pot mutations
 * from being discarded by projection. It does not change preflop permission. */
export function isFlopAccountingBoundary(raw: unknown, profile: "hand243" | "hand248" = "hand243"): boolean {
  const hand248 = profile === "hand248";
  return object(raw) && exact(raw, [...common, ...(hand248 ? ["mR", "cHB"] : []), "gN", "gT", "hI", "nR", "pC", "tB", "cPI", "oTC", "pGS",
    "rHP", "sBS", "sNA", "bBPI", "cRPI", "iHPI", "pASA", "pITT", "sBPI", "sNAA", "mAVTB",
    "wBACPI", "players", "dealerID", "dealerSeat", "gameResult", "rHC"]) &&
    raw.mEV === 0 && integer(raw.sN) && raw.sNA === null && raw.sNAA === null &&
    raw.pASA === raw.now && raw.mAVTB === (hand248 ? 236 : 268) && raw.sBS === (hand248 ? 3 : 5) &&
    (!hand248 || raw.mR === 4 && raw.cHB === 2) && same(raw.wBACPI, [raw.bBPI]) &&
    object(raw.pC) && Object.values(raw.pC).every(p => object(p) &&
      exact(p, ["cards", "name1", "name2", "name1RH", "name2RH", "prob1"]) &&
      [p.name1, p.name2, p.name1RH, p.name2RH, p.prob1].every(v => v === null) &&
      Array.isArray(p.cards) && p.cards.every((c: unknown) => object(c) && exact(c, ["value", "showing"])));
}

/** Reuses the preflop source accounting rows, separately for each street.
 * Neither these gross investments nor display arithmetic is a net pot ledger. */
export interface FlopContributionAccounting {
  scope: "hand243_contribution_prefix" | "hand248_contribution_prefix";
  coverage: "validated_prefix";
  units: "chips";
  preflop: CoFacingOpenProof["accounting"];
  flop: CoFacingOpenProof["accounting"];
  preflopObservations: FlopObservationProof["observations"];
  cumulativeInvestments: Array<{ playerId: string; seat: number; preflopChips: number; flopChips: number;
    investedChips: number; observedSourceStackChips: number }>;
  cumulativeInvestmentSumChips: number;
  sourcePot: { valueChips: number; sequence: number; cursor: number; receivedAt: number };
  /** Addition only, never an independently observed display or eligible pot. */
  sourcePotPlusStreetChips: number;
  displayedTotalPotChips: null;
  contestablePotChips: null;
  netCommittedChips: null;
  returnedUncalledChips: null;
  rakeOrDropChips: null;
  potLedger: null;
}

/** Closed hand239/243/248 raw shapes, checked before projection can hide mutations.
 * These are observations, NOT a general bet/call/check or sizing contract. */
export function flopPatchKind(raw: unknown): "turn" | "fold" | "contribution" | "bb_check" | "deal" | "bet" | null {
  if (!object(raw) || !integer(raw.now) || !integer(raw.pre) || raw.now <= raw.pre ||
      !integer(raw.sN) || raw.mEV !== 0 || raw.fV !== "0.1.72" || !same(raw.eventsData, [])) return null;
  const opening = hjPatchKind(raw);
  if (opening) return opening;
  // Hand248 frame18 explicitly activates SB but omits mAVTB. This shape is
  // consumed only at that profile's preflop SB step below; no value is invented
  // or borrowed from a prior actor, and preflop permission grammar is unchanged.
  if (exact(raw, [...common, "cPI", "pITT", "sNA", "pASA", "sNAA"]) &&
      typeof raw.cPI === "string" && raw.pITT === raw.cPI && raw.sNA === null &&
      raw.sNAA === null && raw.pASA === raw.now) return "turn";
  const action = raw.sNA === "NSAA" && raw.pITT === null && integer(raw.sNAA);
  const contribution = object(raw.tB) && Object.keys(raw.tB).length === 1 && Object.values(raw.tB)[0] === 2 &&
    same(raw.pGS, {}) && Array.isArray(raw.cRPI) && Array.isArray(raw.wBACPI);
  if (action && contribution && exact(raw, [...common, "tB", "pGS", "sNA", "cRPI", "pITT", "sNAA", "wBACPI"])) return "contribution";
  if (action && contribution && raw.mR === 4 && raw.cHB === 2 &&
      exact(raw, [...common, "mR", "tB", "cHB", "pGS", "sNA", "cRPI", "pITT", "sNAA", "wBACPI"])) return "bet";
  if (action && raw.bigBlindCheck === true && same(raw.wBACPI, []) &&
      exact(raw, [...common, "sNA", "pITT", "sNAA", "wBACPI", "bigBlindCheck"])) return "bb_check";
  if (exact(raw, [...common, "gT", "mR", "pC", "tB", "cHB", "cPI", "oTC", "pot", "sNA", "cRPI",
      "pASA", "pITT", "sNAA", "mAVTB", "players", "bigBlindCheck"]) &&
      same(raw.gT, [1, 1]) && raw.mR === 2 && raw.cHB === 0 && (raw.pot === 10 || raw.pot === 12) &&
      raw.cPI === raw.pITT && typeof raw.cPI === "string" && raw.pASA === raw.now &&
      raw.sNA === null && raw.sNAA === null && integer(raw.mAVTB) && raw.bigBlindCheck === false && same(raw.cRPI, []) &&
      object(raw.oTC) && exact(raw.oTC, ["1"]) && Array.isArray(raw.oTC["1"]) && raw.oTC["1"].length === 3 &&
      raw.oTC["1"].every((c: unknown) => typeof c === "string" && /^[2-9TJQKA][shdc]$/.test(c)) &&
      object(raw.tB) && Object.keys(raw.tB).length === raw.pot / 2 && Object.values(raw.tB).every(v => v === "<D>") &&
      object(raw.players) && Object.keys(raw.players).length === raw.pot / 2 && Object.values(raw.players).every(p => object(p) && exact(p, ["stack"]) && integer(p.stack)) &&
      object(raw.pC) && Object.keys(raw.pC).length === 6 && Object.values(raw.pC).every(p => object(p) &&
        exact(p, ["name1", "name2", "name1RH"]) && p.name1RH === null &&
        (p.name1 === null || typeof p.name1 === "string" && p.name1.length <= 32) && (p.name2 === null || p.name2 === "<D>"))) return "deal";
  return null;
}

export interface FlopObservationProof {
  version: 1;
  scope: "flop_transition" | "flop_hero_activation";
  historyComplete: false;
  liveRecommendationsAllowed: false;
  expiresAt: number;
  continuity: FirstUtgProof["continuity"];
  witness: FirstUtgWitness;
  anchor: { sequence: number; cursor: number; receivedAt: number };
  transition: { sequence: number; cursor: number; previousCursor: number; receivedAt: number;
    board: string[]; from: "preflop"; to: "flop"; clearedContributions: Record<string, number>;
    observedStacks: Record<string, number>; observedPotChips: number };
  activation: { sequence: number; cursor: number; previousCursor: number; receivedAt: number; playerId: string };
  observations: Array<{ sequence: number; playerId: string; priorContribution: number; contribution: number; receivedAt: number }>;
  contributions: Record<string, number>;
  accounting?: FlopContributionAccounting;
  facts: { amountToCallChips: null; contestablePotChips: null; legalActions: null };
}
export interface FlopPending {
  profile?: "hand243" | "hand248";
  witness: FirstUtgWitness;
  anchor: FlopObservationProof["anchor"];
  step: number;
  transition?: FlopObservationProof["transition"];
  observations: FlopObservationProof["observations"];
  /** Only initialized by the corresponding closed raw boundary. */
  preflopObservations?: FlopObservationProof["observations"];
  heroActivation?: FlopObservationProof["activation"];
  acceptance?: FlopAcceptanceProof["acceptance"];
}

const HAND243_STACKS = { UTG: 268, HJ: 256, CO: 235, BTN: 240, SB: 255, BB: 248 } as const;
/** Independent historical contract. Never a future CALL permission or a
 * generalization of the preflop hand238 legality contract. */
export function matchesFlopCallContract(w: FirstUtgWitness): boolean {
  return !!w.openingSizeProfile && w.players.length === 6 &&
    w.players.find(p => p.playerId === w.heroId)?.position === "HJ" &&
    same(w.heroCards, ["9d", "Qc"]) &&
    w.players.every(p => p.sourceStack === HAND243_STACKS[p.position]);
}
const HAND248_STACKS = { UTG: 236, HJ: 255, CO: 308, BTN: 230, SB: 230, BB: 243 } as const;
/** Separate recorded CO profile. Cards/stacks/board are not generalized from
 * a diagnostic UI pair; identities remain relational to the original roster. */
export function matchesFlop248Contract(w: FirstUtgWitness): boolean {
  return !!w.openingSizeProfile && w.players.length === 6 &&
    w.players.find(p => p.playerId === w.heroId)?.position === "CO" &&
    same(w.heroCards, ["2s", "7s"]) &&
    w.players.every(p => p.sourceStack === HAND248_STACKS[p.position]);
}
export interface FlopAcceptanceProof {
  version: 1;
  scope: "historical_flop_call2";
  historyComplete: false;
  liveRecommendationsAllowed: false;
  continuity: FirstUtgProof["continuity"];
  witness: FirstUtgWitness;
  anchor: FlopObservationProof["anchor"];
  transition: FlopObservationProof["transition"];
  heroActivation: FlopObservationProof["activation"];
  /** Original deadline is evidence only; this historical result has no new opportunity. */
  originalHeroExpiresAt: number;
  acceptance: {
    sequence: number; cursor: number; previousCursor: number; receivedAt: number;
    street: "flop"; action: "call";
    actor: { playerId: string; seat: number; position: "HJ" | "CO" };
    priorContributionChips: 0; newContributionChips: 2; investmentChips: 2;
    previousHighestContributionChips: 2; observedRaiseIncrementChips: 0;
    evidence: { source: "pokernow_gC"; contract: "hand243_hj_flop_call2_v1" | "hand248_co_flop_call2_v1"; raw: Record<string, any> };
  };
  nextActivation: FlopObservationProof["activation"] | null;
  observations: FlopObservationProof["observations"];
  contributions: Record<string, number>;
  accounting?: FlopContributionAccounting;
  facts: FlopObservationProof["facts"];
}

/** Called only after the existing recognizer validates the entire prefix.
 * Sum observed deltas independently, then reconcile with reset/source totals.
 * Do not call reconcileCompleteHandAccounting/proveContestablePot: their
 * complete-hand, net-adjustment and no-rake evidence is absent here. */
function contributionAccounting(pending: FlopPending, next: BoundedUtgState): FlopContributionAccounting | null {
  const { witness: w, transition: t, preflopObservations: pre, observations: flop } = pending;
  if (!pending.profile || !t || !pre) return null;
  const street = (observations: FlopObservationProof["observations"], preflop: boolean): CoFacingOpenProof["accounting"] => {
    const contributions = w.players.map(p => {
      const forcedChips = preflop ? p.contribution : 0;
      const voluntaryInvestmentChips = observations.filter(o => o.playerId === p.playerId)
        .reduce((sum, o) => sum + o.contribution - o.priorContribution, 0);
      const streetTotalChips = forcedChips + voluntaryInvestmentChips;
      return { playerId: p.playerId, seat: p.seat, position: p.position, forcedChips, voluntaryInvestmentChips,
        streetTotalChips, remainingCapacityChips: (preflop ? p.sourceStack : t.observedStacks[p.playerId]!) - streetTotalChips };
    });
    return { units: "chips", contributions, streetContributionSumChips: contributions.reduce((sum, p) => sum + p.streetTotalChips, 0),
      contestablePotChips: null, provenance: `Hand${pending.profile === "hand248" ? 248 : 243} closed source prefix: forced posts plus distinct observed increases. Remaining capacity is arithmetic, not an observed stack decrement or CALL permission.` };
  };
  const preflop = street(pre, true), current = street(flop, false);
  if (preflop.contributions.some(p => p.streetTotalChips !== t.clearedContributions[p.playerId] ||
      p.remainingCapacityChips !== t.observedStacks[p.playerId]) ||
      current.contributions.some(p => p.streetTotalChips !== (next.tB[p.playerId] ?? 0)) ||
      preflop.streetContributionSumChips !== t.observedPotChips) return null;
  const cumulativeInvestments = preflop.contributions.map((p, i) => ({ playerId: p.playerId, seat: p.seat,
    preflopChips: p.streetTotalChips, flopChips: current.contributions[i]!.streetTotalChips,
    investedChips: p.streetTotalChips + current.contributions[i]!.streetTotalChips,
    observedSourceStackChips: next.players[p.playerId].stack }));
  return { scope: pending.profile === "hand248" ? "hand248_contribution_prefix" : "hand243_contribution_prefix", coverage: "validated_prefix", units: "chips", preflop, flop: current,
    preflopObservations: structuredClone(pre), cumulativeInvestments,
    cumulativeInvestmentSumChips: cumulativeInvestments.reduce((sum, p) => sum + p.investedChips, 0),
    sourcePot: { valueChips: t.observedPotChips, sequence: t.sequence, cursor: t.cursor, receivedAt: t.receivedAt },
    sourcePotPlusStreetChips: t.observedPotChips + current.streetContributionSumChips,
    displayedTotalPotChips: null, contestablePotChips: null, netCommittedChips: null,
    returnedUncalledChips: null, rakeOrDropChips: null, potLedger: null };
}

/** Dependent recognizer only: advanceUtgState owns all state and continuity.
 * Supports exactly the recorded four contributions / BTN fold / BB check,
 * single flop deal with SB activation, SB2 / BB2 / UTG activation sequence;
 * or the separately bounded six-player hand243 HJ CALL2 / CO and hand248
 * CO CALL2 / BTN prefixes. No generic betting-history or CALL permission.
 * Historical steps survive expiry, never unsupported mutations or gaps. */
export function advanceFlopWindow(pending: FlopPending, data: UtgProjection, previous: BoundedUtgState,
  next: BoundedUtgState, sequence: number, at: number):
  { pending: FlopPending | null; proof?: Omit<FlopObservationProof, "continuity">;
    historical?: Omit<FlopAcceptanceProof, "continuity"> } | null {
  const w = pending.witness, raw = data.flopPatch ?? data.hjPatch, kind = flopPatchKind(raw), step = pending.step;
  const hand243 = pending.profile === "hand243";
  const hand248 = pending.profile === "hand248", sixWay = hand243 || hand248;
  if (hand243 && !matchesFlopCallContract(w)) return null;
  if (hand248 && !matchesFlop248Contract(w)) return null;
  if (!raw || !kind || data.event !== "gC" || data.heroId !== w.heroId || sequence !== pending.anchor.sequence + step + 1) return null;
  const projected = ["now", "pre", "eventsData", "fV", "tB", "pGS", "cRPI", "pITT", "cPI", "gT", "pC", "oTC", "players"];
  const expected = Object.fromEntries(projected.filter(k => Object.hasOwn(raw, k)).map(k => [k, k === "pC" ? {} : raw[k]]));
  if (!same(data.frame, expected)) return null;
  const role = (position: FirstUtgWitness["players"][number]["position"]) => w.players.find(p => p.position === position)!;
  const utg = role("UTG"), hj = role("HJ"), co = role("CO"), btn = role("BTN"), sb = role("SB"), bb = role("BB");
  const actors = [utg, hj, hj, co, co, btn, btn, sb, sb, bb, bb, sb, sb, bb, bb, utg,
    ...(sixWay ? [utg, hj, hj, co] : []), ...(hand248 ? [co, btn] : [])];
  const kinds = ["contribution", "turn", "contribution", "turn", "contribution", "turn", "fold", "turn",
    "contribution", "turn", "bb_check", "deal", "bet", "turn", "contribution", "turn",
    ...(sixWay ? ["contribution", "turn", "contribution", "turn"] : []), ...(hand248 ? ["contribution", "turn"] : [])];
  if (sixWay) kinds[6] = "contribution";
  const actor = actors[step];
  if (!actor || kind !== kinds[step]) return null;
  const totals = (through: number) => Object.fromEntries(w.players.map(p => {
    if (through >= 11) return [p.playerId,
      (p.position === "SB" && through >= 12 || p.position === "BB" && through >= 14 ||
        sixWay && (p.position === "UTG" && through >= 16 || p.position === "HJ" && through >= 18) ||
        hand248 && p.position === "CO" && through >= 20) ? 2 : 0];
    const contributed = p.position === "UTG" && through >= 0 || p.position === "HJ" && through >= 2 ||
      p.position === "CO" && through >= 4 || p.position === "SB" && through >= 8 || sixWay && p.position === "BTN" && through >= 6;
    return [p.playerId, contributed ? 2 : p.contribution];
  }));
  const stable = (state: BoundedUtgState, through: number) => state.id === w.tableId && state.hI === w.handId && state.gN === w.handNumber &&
    state.dealerID === btn.playerId && state.dealerSeat === btn.seat && state.sBPI === sb.playerId && state.bBPI === bb.playerId &&
    same(state.seats, [...w.players].sort((a, b) => a.seat - b.seat).map(p => [p.seat, p.playerId])) &&
    state.iHPI.length === 6 && w.players.every(p => state.iHPI.includes(p.playerId)) && Object.keys(state.pC).length === 6 &&
    same(state.gT, through >= 11 ? [1, 1] : [1, 0]) &&
    same(state.oTC, through >= 11 ? { "1": pending.transition?.board ?? raw.oTC?.["1"] } : { "1": [] }) &&
    Object.keys(state.players).length === 6 && Object.keys(state.pGS).length === 6 &&
    w.players.every(p => state.pGS[p.playerId] === (!sixWay && p.position === "BTN" && through >= 6 ? "fold" : "inGame") &&
      state.players[p.playerId].stack === p.sourceStack - (through >= 11 && (sixWay || p.position !== "BTN") ? 2 : 0) &&
      !Object.hasOwn(state.players[p.playerId], "disconnectedSince") &&
      same(state.pC[p.playerId].cards, (p.playerId === w.heroId ? w.heroCards : [null, null]).map(value => ({ value, showing: false })))) &&
    Object.keys(state.tB).every(id => w.players.some(p => p.playerId === id)) &&
    w.players.every(p => (state.tB[p.playerId] ?? 0) === totals(through)[p.playerId]);
  if (!stable(previous, step - 1) || !stable(next, step)) return null;
  if (kind === "turn" || kind === "deal") {
    const recordedCapacityOmission = hand248 && step === 7 && !Object.hasOwn(raw, "mAVTB");
    if (previous.pITT !== null || next.cPI !== actor.playerId || next.pITT !== actor.playerId ||
        !recordedCapacityOmission && raw.mAVTB !== actor.sourceStack - (step >= 11 ? 2 : 0)) return null;
  } else if (previous.cPI !== actor.playerId || previous.pITT !== actor.playerId || next.cPI !== actor.playerId || next.pITT !== null) return null;
  if (kind === "contribution" || kind === "bet") {
    const responders = step < 11 ? [utg, hj, co, ...(sixWay ? [btn] : []), sb].filter(p => totals(step)[p.playerId] === 2)
      : [sb, bb, ...(sixWay ? [utg, hj] : []), ...(hand248 ? [co] : [])].filter(p => totals(step)[p.playerId] === 2);
    if (!same(raw.tB, { [actor.playerId]: 2 }) || !same(raw.cRPI, responders.map(p => p.playerId)) ||
        !same(raw.wBACPI, step < 11 ? [bb.playerId] : [])) return null;
  }
  if (kind === "fold" && (!same(raw.pGS, { [btn.playerId]: "fold" }) || !same(raw.wBACPI, [bb.playerId]))) return null;
  let transition = pending.transition;
  if (kind === "deal") {
    const board: string[] = raw.oTC["1"];
    if (hand243 && !same(board, ["6h", "Qh", "3s"]) || hand248 && !same(board, ["3s", "7d", "2d"]) ||
        new Set([...board, ...w.heroCards]).size !== 5 || raw.pot !== (sixWay ? 12 : 10) ||
        !same(raw.tB, Object.fromEntries(w.players.filter(p => sixWay || p.position !== "BTN").map(p => [p.playerId, "<D>"]))) ||
        Object.keys(next.tB).length !== 0 || !same(raw.players, Object.fromEntries(w.players.filter(p => sixWay || p.position !== "BTN").map(p => [p.playerId, { stack: p.sourceStack - 2 }]))) ||
        !same(Object.keys(raw.pC).sort(), w.players.map(p => p.playerId).sort()) ||
        w.players.some(p => p.playerId !== w.heroId && !same(raw.pC[p.playerId], { name1: null, name2: null, name1RH: null }))) return null;
    transition = { sequence, cursor: next.now, previousCursor: previous.now, receivedAt: at, board: [...board],
      from: "preflop", to: "flop", clearedContributions: structuredClone(previous.tB),
      observedStacks: Object.fromEntries(w.players.map(p => [p.playerId, next.players[p.playerId].stack])), observedPotChips: raw.pot };
  }
  const observations = [...pending.observations];
  if (kind === "bet" || kind === "contribution" && step > 11) observations.push({ sequence, playerId: actor.playerId,
    priorContribution: previous.tB[actor.playerId] ?? 0, contribution: next.tB[actor.playerId], receivedAt: at });
  const advanced: FlopPending = { ...pending, step: step + 1, ...(transition ? { transition } : {}), observations };
  if (pending.preflopObservations && kind === "contribution" && step < 11) {
    advanced.preflopObservations = [...pending.preflopObservations, { sequence, playerId: actor.playerId,
      priorContribution: previous.tB[actor.playerId] ?? 0, contribution: next.tB[actor.playerId], receivedAt: at }];
  }
  const accounting = contributionAccounting(advanced, next);
  const activation = { sequence, cursor: next.now, previousCursor: previous.now, receivedAt: at, playerId: actor.playerId };
  const heroStep = hand248 ? 19 : hand243 ? 17 : 15;
  if (sixWay && step === heroStep) advanced.heroActivation = activation;
  if (sixWay && step > heroStep) {
    if (!pending.heroActivation || !transition || step > heroStep + 2) return null;
    // The validated SB bet set cHB=2/mR=4. Every later patch is closed and
    // cannot change either discriminator. Check matching totals and capacity
    // as well as the actor/turn release; cRPI by itself certifies no action.
    if (step === heroStep + 1) {
      if (actor.playerId !== w.heroId || previous.tB[actor.playerId] !== undefined ||
          Math.max(...w.players.map(p => previous.tB[p.playerId] ?? 0)) !== 2 ||
          Math.max(...w.players.map(p => next.tB[p.playerId] ?? 0)) !== 2 ||
          previous.players[actor.playerId].stack !== (hand248 ? 306 : 254) || raw.pre !== pending.heroActivation.cursor) return null;
      advanced.acceptance = { sequence, cursor: next.now, previousCursor: previous.now, receivedAt: at,
        street: "flop", action: "call", actor: { playerId: actor.playerId, seat: actor.seat, position: hand248 ? "CO" : "HJ" },
        priorContributionChips: 0, newContributionChips: 2, investmentChips: 2,
        previousHighestContributionChips: 2, observedRaiseIncrementChips: 0,
        evidence: { source: "pokernow_gC", contract: hand248 ? "hand248_co_flop_call2_v1" : "hand243_hj_flop_call2_v1", raw: structuredClone(raw) } };
    }
    if (!advanced.acceptance || step === heroStep + 2 && raw.pre !== advanced.acceptance.cursor) return null;
    return { pending: step === heroStep + 2 ? null : advanced, historical: {
      version: 1, scope: "historical_flop_call2", historyComplete: false, liveRecommendationsAllowed: false,
      witness: structuredClone(w), anchor: structuredClone(pending.anchor), transition: structuredClone(transition),
      heroActivation: structuredClone(pending.heroActivation), originalHeroExpiresAt: pending.heroActivation.receivedAt + 10_000,
      acceptance: structuredClone(advanced.acceptance), nextActivation: step === heroStep + 2 ? activation : null,
      observations, contributions: totals(step), facts: { amountToCallChips: null, contestablePotChips: null, legalActions: null },
      ...(accounting ? { accounting } : {}),
    } };
  }
  if (step !== 11 && step !== heroStep) return { pending: advanced };
  return { pending: !sixWay && step === heroStep ? null : advanced, proof: {
    version: 1, scope: step === 11 ? "flop_transition" : "flop_hero_activation", historyComplete: false,
    liveRecommendationsAllowed: false, expiresAt: at + 10_000,
    witness: { ...structuredClone(w), cursor: next.now, previousCursor: previous.now, receivedAt: at,
      provenance: `Hand${hand248 ? 248 : hand243 ? 243 : 239} closed source observation prefix; original positions frozen at hand start. No legality, contestable-pot, complete history or live recommendation authority.` },
    anchor: structuredClone(pending.anchor), transition: structuredClone(transition!),
    activation,
    observations, contributions: totals(step), facts: { amountToCallChips: null, contestablePotChips: null, legalActions: null },
    ...(accounting ? { accounting } : {}),
  } };
}
