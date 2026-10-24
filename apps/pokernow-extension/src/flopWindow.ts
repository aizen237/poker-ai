import type { FirstUtgProof, FirstUtgWitness, UtgProjection } from "./firstUtgSource.js";
import type { BoundedUtgState } from "./firstUtgState.js";
import { hjPatchKind } from "./hjWindow.js";

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

/** Closed hand239/243 raw shapes, checked before projection can hide mutations.
 * These are observations, NOT a general bet/call/check or sizing contract. */
export function flopPatchKind(raw: unknown): "turn" | "fold" | "contribution" | "bb_check" | "deal" | "bet" | null {
  if (!object(raw) || !integer(raw.now) || !integer(raw.pre) || raw.now <= raw.pre ||
      !integer(raw.sN) || raw.mEV !== 0 || raw.fV !== "0.1.72" || !same(raw.eventsData, [])) return null;
  const opening = hjPatchKind(raw);
  if (opening) return opening;
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
    observedStacks: Record<string, number> };
  activation: { sequence: number; cursor: number; previousCursor: number; receivedAt: number; playerId: string };
  observations: Array<{ sequence: number; playerId: string; priorContribution: number; contribution: number; receivedAt: number }>;
  contributions: Record<string, number>;
  facts: { amountToCallChips: null; contestablePotChips: null; legalActions: null };
}
export interface FlopPending {
  profile?: "hand243";
  witness: FirstUtgWitness;
  anchor: FlopObservationProof["anchor"];
  step: number;
  transition?: FlopObservationProof["transition"];
  observations: FlopObservationProof["observations"];
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
    actor: { playerId: string; seat: number; position: "HJ" };
    priorContributionChips: 0; newContributionChips: 2; investmentChips: 2;
    previousHighestContributionChips: 2; observedRaiseIncrementChips: 0;
    evidence: { source: "pokernow_gC"; contract: "hand243_hj_flop_call2_v1"; raw: Record<string, any> };
  };
  nextActivation: FlopObservationProof["activation"] | null;
  observations: FlopObservationProof["observations"];
  contributions: Record<string, number>;
  facts: FlopObservationProof["facts"];
}

/** Dependent recognizer only: advanceUtgState owns all state and continuity.
 * Supports exactly the recorded four contributions / BTN fold / BB check,
 * single flop deal with SB activation, SB2 / BB2 / UTG activation sequence;
 * or the separately bounded hand243 six-player prefix through HJ CALL2 / CO.
 * Historical steps survive expiry, never unsupported mutations or gaps. */
export function advanceFlopWindow(pending: FlopPending, data: UtgProjection, previous: BoundedUtgState,
  next: BoundedUtgState, sequence: number, at: number):
  { pending: FlopPending | null; proof?: Omit<FlopObservationProof, "continuity">;
    historical?: Omit<FlopAcceptanceProof, "continuity"> } | null {
  const w = pending.witness, raw = data.flopPatch ?? data.hjPatch, kind = flopPatchKind(raw), step = pending.step;
  const hand243 = pending.profile === "hand243";
  if (hand243 && !matchesFlopCallContract(w)) return null;
  if (!raw || !kind || data.event !== "gC" || data.heroId !== w.heroId || sequence !== pending.anchor.sequence + step + 1) return null;
  const projected = ["now", "pre", "eventsData", "fV", "tB", "pGS", "cRPI", "pITT", "cPI", "gT", "pC", "oTC", "players"];
  const expected = Object.fromEntries(projected.filter(k => Object.hasOwn(raw, k)).map(k => [k, k === "pC" ? {} : raw[k]]));
  if (!same(data.frame, expected)) return null;
  const role = (position: FirstUtgWitness["players"][number]["position"]) => w.players.find(p => p.position === position)!;
  const utg = role("UTG"), hj = role("HJ"), co = role("CO"), btn = role("BTN"), sb = role("SB"), bb = role("BB");
  const actors = [utg, hj, hj, co, co, btn, btn, sb, sb, bb, bb, sb, sb, bb, bb, utg,
    ...(hand243 ? [utg, hj, hj, co] : [])];
  const kinds = ["contribution", "turn", "contribution", "turn", "contribution", "turn", "fold", "turn",
    "contribution", "turn", "bb_check", "deal", "bet", "turn", "contribution", "turn",
    ...(hand243 ? ["contribution", "turn", "contribution", "turn"] : [])];
  if (hand243) kinds[6] = "contribution";
  const actor = actors[step];
  if (!actor || kind !== kinds[step]) return null;
  const totals = (through: number) => Object.fromEntries(w.players.map(p => {
    if (through >= 11) return [p.playerId,
      (p.position === "SB" && through >= 12 || p.position === "BB" && through >= 14 ||
        hand243 && (p.position === "UTG" && through >= 16 || p.position === "HJ" && through >= 18)) ? 2 : 0];
    const contributed = p.position === "UTG" && through >= 0 || p.position === "HJ" && through >= 2 ||
      p.position === "CO" && through >= 4 || p.position === "SB" && through >= 8 || hand243 && p.position === "BTN" && through >= 6;
    return [p.playerId, contributed ? 2 : p.contribution];
  }));
  const stable = (state: BoundedUtgState, through: number) => state.id === w.tableId && state.hI === w.handId && state.gN === w.handNumber &&
    state.dealerID === btn.playerId && state.dealerSeat === btn.seat && state.sBPI === sb.playerId && state.bBPI === bb.playerId &&
    same(state.seats, [...w.players].sort((a, b) => a.seat - b.seat).map(p => [p.seat, p.playerId])) &&
    state.iHPI.length === 6 && w.players.every(p => state.iHPI.includes(p.playerId)) && Object.keys(state.pC).length === 6 &&
    same(state.gT, through >= 11 ? [1, 1] : [1, 0]) &&
    same(state.oTC, through >= 11 ? { "1": pending.transition?.board ?? raw.oTC?.["1"] } : { "1": [] }) &&
    Object.keys(state.players).length === 6 && Object.keys(state.pGS).length === 6 &&
    w.players.every(p => state.pGS[p.playerId] === (!hand243 && p.position === "BTN" && through >= 6 ? "fold" : "inGame") &&
      state.players[p.playerId].stack === p.sourceStack - (through >= 11 && (hand243 || p.position !== "BTN") ? 2 : 0) &&
      !Object.hasOwn(state.players[p.playerId], "disconnectedSince") &&
      same(state.pC[p.playerId].cards, (p.playerId === w.heroId ? w.heroCards : [null, null]).map(value => ({ value, showing: false })))) &&
    Object.keys(state.tB).every(id => w.players.some(p => p.playerId === id)) &&
    w.players.every(p => (state.tB[p.playerId] ?? 0) === totals(through)[p.playerId]);
  if (!stable(previous, step - 1) || !stable(next, step)) return null;
  if (kind === "turn" || kind === "deal") {
    if (previous.pITT !== null || next.cPI !== actor.playerId || next.pITT !== actor.playerId ||
        raw.mAVTB !== actor.sourceStack - (step >= 11 ? 2 : 0)) return null;
  } else if (previous.cPI !== actor.playerId || previous.pITT !== actor.playerId || next.cPI !== actor.playerId || next.pITT !== null) return null;
  if (kind === "contribution" || kind === "bet") {
    const responders = step < 11 ? [utg, hj, co, ...(hand243 ? [btn] : []), sb].filter(p => totals(step)[p.playerId] === 2)
      : [sb, bb, ...(hand243 ? [utg, hj] : [])].filter(p => totals(step)[p.playerId] === 2);
    if (!same(raw.tB, { [actor.playerId]: 2 }) || !same(raw.cRPI, responders.map(p => p.playerId)) ||
        !same(raw.wBACPI, step < 11 ? [bb.playerId] : [])) return null;
  }
  if (kind === "fold" && (!same(raw.pGS, { [btn.playerId]: "fold" }) || !same(raw.wBACPI, [bb.playerId]))) return null;
  let transition = pending.transition;
  if (kind === "deal") {
    const board: string[] = raw.oTC["1"];
    if (hand243 && !same(board, ["6h", "Qh", "3s"]) || new Set([...board, ...w.heroCards]).size !== 5 ||
        raw.pot !== (hand243 ? 12 : 10) ||
        !same(raw.tB, Object.fromEntries(w.players.filter(p => hand243 || p.position !== "BTN").map(p => [p.playerId, "<D>"]))) ||
        Object.keys(next.tB).length !== 0 || !same(raw.players, Object.fromEntries(w.players.filter(p => hand243 || p.position !== "BTN").map(p => [p.playerId, { stack: p.sourceStack - 2 }]))) ||
        !same(Object.keys(raw.pC).sort(), w.players.map(p => p.playerId).sort()) ||
        w.players.some(p => p.playerId !== w.heroId && !same(raw.pC[p.playerId], { name1: null, name2: null, name1RH: null }))) return null;
    transition = { sequence, cursor: next.now, previousCursor: previous.now, receivedAt: at, board: [...board],
      from: "preflop", to: "flop", clearedContributions: structuredClone(previous.tB),
      observedStacks: Object.fromEntries(w.players.map(p => [p.playerId, next.players[p.playerId].stack])) };
  }
  const observations = [...pending.observations];
  if (kind === "bet" || kind === "contribution" && step > 11) observations.push({ sequence, playerId: actor.playerId,
    priorContribution: previous.tB[actor.playerId] ?? 0, contribution: next.tB[actor.playerId], receivedAt: at });
  const advanced: FlopPending = { ...pending, step: step + 1, ...(transition ? { transition } : {}), observations };
  const activation = { sequence, cursor: next.now, previousCursor: previous.now, receivedAt: at, playerId: actor.playerId };
  if (hand243 && step === 17) advanced.heroActivation = activation;
  if (hand243 && step >= 18) {
    if (!pending.heroActivation || !transition || step > 19) return null;
    // The validated SB bet set cHB=2/mR=4. Every later patch is closed and
    // cannot change either discriminator. Check matching totals and capacity
    // as well as the actor/turn release; cRPI by itself certifies no action.
    if (step === 18) {
      if (actor.playerId !== w.heroId || previous.tB[hj.playerId] !== undefined ||
          Math.max(...w.players.map(p => previous.tB[p.playerId] ?? 0)) !== 2 ||
          Math.max(...w.players.map(p => next.tB[p.playerId] ?? 0)) !== 2 ||
          previous.players[hj.playerId].stack !== 254 || raw.pre !== pending.heroActivation.cursor) return null;
      advanced.acceptance = { sequence, cursor: next.now, previousCursor: previous.now, receivedAt: at,
        street: "flop", action: "call", actor: { playerId: hj.playerId, seat: hj.seat, position: "HJ" },
        priorContributionChips: 0, newContributionChips: 2, investmentChips: 2,
        previousHighestContributionChips: 2, observedRaiseIncrementChips: 0,
        evidence: { source: "pokernow_gC", contract: "hand243_hj_flop_call2_v1", raw: structuredClone(raw) } };
    }
    if (!advanced.acceptance || step === 19 && raw.pre !== advanced.acceptance.cursor) return null;
    return { pending: step === 19 ? null : advanced, historical: {
      version: 1, scope: "historical_flop_call2", historyComplete: false, liveRecommendationsAllowed: false,
      witness: structuredClone(w), anchor: structuredClone(pending.anchor), transition: structuredClone(transition),
      heroActivation: structuredClone(pending.heroActivation), originalHeroExpiresAt: pending.heroActivation.receivedAt + 10_000,
      acceptance: structuredClone(advanced.acceptance), nextActivation: step === 19 ? activation : null,
      observations, contributions: totals(step), facts: { amountToCallChips: null, contestablePotChips: null, legalActions: null },
    } };
  }
  const heroStep = hand243 ? 17 : 15;
  if (step !== 11 && step !== heroStep) return { pending: advanced };
  return { pending: !hand243 && step === heroStep ? null : advanced, proof: {
    version: 1, scope: step === 11 ? "flop_transition" : "flop_hero_activation", historyComplete: false,
    liveRecommendationsAllowed: false, expiresAt: at + 10_000,
    witness: { ...structuredClone(w), cursor: next.now, previousCursor: previous.now, receivedAt: at,
      provenance: `Hand${hand243 ? 243 : 239} closed source observation prefix; original positions frozen at hand start. No legality, pot accounting, complete history or live recommendation authority.` },
    anchor: structuredClone(pending.anchor), transition: structuredClone(transition!),
    activation,
    observations, contributions: totals(step), facts: { amountToCallChips: null, contestablePotChips: null, legalActions: null },
  } };
}
