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

/** Closed hand239 raw shapes, checked before projection can hide mutations.
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
      same(raw.gT, [1, 1]) && raw.mR === 2 && raw.cHB === 0 && raw.pot === 10 &&
      raw.cPI === raw.pITT && typeof raw.cPI === "string" && raw.pASA === raw.now &&
      raw.sNA === null && raw.sNAA === null && integer(raw.mAVTB) && raw.bigBlindCheck === false && same(raw.cRPI, []) &&
      object(raw.oTC) && exact(raw.oTC, ["1"]) && Array.isArray(raw.oTC["1"]) && raw.oTC["1"].length === 3 &&
      raw.oTC["1"].every((c: unknown) => typeof c === "string" && /^[2-9TJQKA][shdc]$/.test(c)) &&
      object(raw.tB) && Object.keys(raw.tB).length === 5 && Object.values(raw.tB).every(v => v === "<D>") &&
      object(raw.players) && Object.keys(raw.players).length === 5 && Object.values(raw.players).every(p => object(p) && exact(p, ["stack"]) && integer(p.stack)) &&
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
  witness: FirstUtgWitness;
  anchor: FlopObservationProof["anchor"];
  step: number;
  transition?: FlopObservationProof["transition"];
  observations: FlopObservationProof["observations"];
}

/** Dependent recognizer only: advanceUtgState owns all state and continuity.
 * Supports exactly the recorded four contributions / BTN fold / BB check,
 * single flop deal with SB activation, SB2 / BB2 / UTG activation sequence.
 * Historical steps survive expiry, never unsupported mutations or gaps. */
export function advanceFlopWindow(pending: FlopPending, data: UtgProjection, previous: BoundedUtgState,
  next: BoundedUtgState, sequence: number, at: number):
  { pending: FlopPending | null; proof?: Omit<FlopObservationProof, "continuity"> } | null {
  const w = pending.witness, raw = data.flopPatch ?? data.hjPatch, kind = flopPatchKind(raw), step = pending.step;
  if (!raw || !kind || data.event !== "gC" || data.heroId !== w.heroId || sequence !== pending.anchor.sequence + step + 1) return null;
  const projected = ["now", "pre", "eventsData", "fV", "tB", "pGS", "cRPI", "pITT", "cPI", "gT", "pC", "oTC", "players"];
  const expected = Object.fromEntries(projected.filter(k => Object.hasOwn(raw, k)).map(k => [k, k === "pC" ? {} : raw[k]]));
  if (!same(data.frame, expected)) return null;
  const role = (position: FirstUtgWitness["players"][number]["position"]) => w.players.find(p => p.position === position)!;
  const utg = role("UTG"), hj = role("HJ"), co = role("CO"), btn = role("BTN"), sb = role("SB"), bb = role("BB");
  const actors = [utg, hj, hj, co, co, btn, btn, sb, sb, bb, bb, sb, sb, bb, bb, utg];
  const kinds = ["contribution", "turn", "contribution", "turn", "contribution", "turn", "fold", "turn",
    "contribution", "turn", "bb_check", "deal", "bet", "turn", "contribution", "turn"];
  const actor = actors[step];
  if (!actor || kind !== kinds[step]) return null;
  const totals = (through: number) => Object.fromEntries(w.players.map(p => {
    if (through >= 11) return [p.playerId,
      (p.position === "SB" && through >= 12 || p.position === "BB" && through >= 14) ? 2 : 0];
    const contributed = p.position === "UTG" && through >= 0 || p.position === "HJ" && through >= 2 ||
      p.position === "CO" && through >= 4 || p.position === "SB" && through >= 8;
    return [p.playerId, contributed ? 2 : p.contribution];
  }));
  const stable = (state: BoundedUtgState, through: number) => state.id === w.tableId && state.hI === w.handId && state.gN === w.handNumber &&
    state.dealerID === btn.playerId && state.dealerSeat === btn.seat && state.sBPI === sb.playerId && state.bBPI === bb.playerId &&
    same(state.seats, [...w.players].sort((a, b) => a.seat - b.seat).map(p => [p.seat, p.playerId])) &&
    state.iHPI.length === 6 && w.players.every(p => state.iHPI.includes(p.playerId)) && Object.keys(state.pC).length === 6 &&
    same(state.gT, through >= 11 ? [1, 1] : [1, 0]) &&
    same(state.oTC, through >= 11 ? { "1": pending.transition?.board ?? raw.oTC?.["1"] } : { "1": [] }) &&
    Object.keys(state.players).length === 6 && Object.keys(state.pGS).length === 6 &&
    w.players.every(p => state.pGS[p.playerId] === (p.position === "BTN" && through >= 6 ? "fold" : "inGame") &&
      state.players[p.playerId].stack === p.sourceStack - (through >= 11 && p.position !== "BTN" ? 2 : 0) &&
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
    const responders = step === 0 ? [utg] : step === 2 ? [utg, hj] : step === 4 ? [utg, hj, co]
      : step === 8 ? [utg, hj, co, sb] : step === 12 ? [sb] : [sb, bb];
    if (!same(raw.tB, { [actor.playerId]: 2 }) || !same(raw.cRPI, responders.map(p => p.playerId)) ||
        !same(raw.wBACPI, step < 11 ? [bb.playerId] : [])) return null;
  }
  if (kind === "fold" && (!same(raw.pGS, { [btn.playerId]: "fold" }) || !same(raw.wBACPI, [bb.playerId]))) return null;
  let transition = pending.transition;
  if (kind === "deal") {
    const board: string[] = raw.oTC["1"];
    if (new Set([...board, ...w.heroCards]).size !== 5 ||
        !same(raw.tB, Object.fromEntries(w.players.filter(p => p.position !== "BTN").map(p => [p.playerId, "<D>"]))) ||
        Object.keys(next.tB).length !== 0 || !same(raw.players, Object.fromEntries(w.players.filter(p => p.position !== "BTN").map(p => [p.playerId, { stack: p.sourceStack - 2 }]))) ||
        !same(Object.keys(raw.pC).sort(), w.players.map(p => p.playerId).sort()) ||
        w.players.some(p => p.playerId !== w.heroId && !same(raw.pC[p.playerId], { name1: null, name2: null, name1RH: null }))) return null;
    transition = { sequence, cursor: next.now, previousCursor: previous.now, receivedAt: at, board: [...board],
      from: "preflop", to: "flop", clearedContributions: structuredClone(previous.tB),
      observedStacks: Object.fromEntries(w.players.map(p => [p.playerId, next.players[p.playerId].stack])) };
  }
  const observations = [...pending.observations];
  if (step === 12 || step === 14) observations.push({ sequence, playerId: actor.playerId,
    priorContribution: previous.tB[actor.playerId] ?? 0, contribution: next.tB[actor.playerId], receivedAt: at });
  const advanced: FlopPending = { ...pending, step: step + 1, ...(transition ? { transition } : {}), observations };
  if (step !== 11 && step !== 15) return { pending: advanced };
  return { pending: step === 15 ? null : advanced, proof: {
    version: 1, scope: step === 11 ? "flop_transition" : "flop_hero_activation", historyComplete: false,
    liveRecommendationsAllowed: false, expiresAt: at + 10_000,
    witness: { ...structuredClone(w), cursor: next.now, previousCursor: previous.now, receivedAt: at,
      provenance: "Hand239 closed source observation prefix; original positions frozen at hand start. No legality, pot accounting, complete history or live recommendation authority." },
    anchor: structuredClone(pending.anchor), transition: structuredClone(transition!),
    activation: { sequence, cursor: next.now, previousCursor: previous.now, receivedAt: at, playerId: actor.playerId },
    observations, contributions: totals(step), facts: { amountToCallChips: null, contestablePotChips: null, legalActions: null },
  } };
}
