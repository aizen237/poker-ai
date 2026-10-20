import type { FirstUtgProof, FirstUtgWitness, UtgProjection } from "./firstUtgSource.js";
import { validatedOpeningPatch, type HjProof } from "./hjWindow.js";
import type { BoundedUtgState } from "./firstUtgState.js";

const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Closed hand169 acceptance shape, checked BEFORE projecting away unknown
 * fields. mR/sNA/etc are observed discriminators, not decoded legal bounds.
 * No generic wager, all-in, call, or coalesced-turn contract follows. */
export function isObservedUtgOpenPatch(raw: unknown): raw is Record<string, any> {
  if (!object(raw)) return false;
  const keys = ["mR", "tB", "cHB", "now", "pGS", "sNA", "cRPI", "pITT", "sNAA",
    "wBACPI", "eventsData", "pre", "mEV", "fV", "sN"];
  return Object.keys(raw).length === keys.length && keys.every(k => Object.hasOwn(raw, k)) &&
    integer(raw.now) && integer(raw.pre) && raw.now > raw.pre && integer(raw.sNAA) && integer(raw.sN) &&
    raw.mR === 8 && raw.cHB === 5 && raw.mEV === 0 && raw.fV === "0.1.72" &&
    raw.sNA === "NSAA" && raw.pITT === null && same(raw.pGS, {}) && same(raw.wBACPI, []) &&
    same(raw.eventsData, []) && object(raw.tB) && Object.keys(raw.tB).length === 1 &&
    Object.values(raw.tB)[0] === 5 && same(raw.cRPI, Object.keys(raw.tB));
}

/** Source-derived event with explicit chip semantics, original actor/roster and
 * ordering provenance. The closed action union deliberately exposes only the
 * implemented grammar; future actions require their own reviewed recognizers. */
export interface VerifiedBettingTransition {
  id: string;
  tableId: string; handId: string; handNumber: number; generation: number;
  sequence: number; cursor: number; previousCursor: number; receivedAt: number;
  street: "preflop"; action: "raise";
  actor: { playerId: string; seat: number; position: "UTG" };
  priorContributionChips: 0; newContributionChips: 5; investmentChips: 5;
  previousHighestContributionChips: 2; observedRaiseIncrementChips: 3;
  originalRoster: FirstUtgWitness["players"];
  evidence: { source: "pokernow_gC"; contract: "hand169_utg_open5_v1"; raw: Record<string, any> };
}

export interface FacingOpenProof extends Omit<FirstUtgProof, "scope"> {
  scope: "hj_facing_utg_open5";
  anchor: HjProof["anchor"];
  transitions: [VerifiedBettingTransition];
  activation: HjProof["activation"];
  actor: { playerId: string; seat: number; position: "HJ" };
  facts: {
    amountToCallChips: 5;
    acceptedRaiseToChips: 5;
    /** Observed acceptance certifies neither a future re-raise nor its grid. */
    nextMinimumRaiseToChips: null;
    aggressionReopened: null;
    contestablePotChips: null;
  };
}
export interface FacingOpenPending {
  witness: FirstUtgWitness;
  anchor: HjProof["anchor"];
  transition?: VerifiedBettingTransition;
}

/** Dependent recognizer invoked only after advanceUtgState succeeds. It consumes
 * the SAME continuity authority as the opening windows; it does not reduce or
 * repair source state and cannot mint a connection receipt. */
export function advanceFacingOpenWindow(pending: FacingOpenPending, data: UtgProjection,
  previous: BoundedUtgState, next: BoundedUtgState, sequence: number, at: number):
  { pending: FacingOpenPending; proof?: Omit<FacingOpenProof, "continuity"> } | null {
  const w = pending.witness, utg = w.players.find(p => p.position === "UTG")!,
    hj = w.players.find(p => p.position === "HJ")!;
  if (!w.openingSizeProfile || data.heroId !== w.heroId || data.event !== "gC" ||
      previous.hI !== w.handId || next.hI !== w.handId || next.gN !== w.handNumber ||
      !same(next.gT, [1, 0]) || previous.cPI !== utg.playerId) return null;
  if (!pending.transition) {
    const raw = data.bettingPatch;
    const fields = ["tB", "now", "pGS", "cRPI", "pITT", "eventsData", "pre", "fV"];
    if (!isObservedUtgOpenPatch(raw) || Object.keys(data.frame).length !== fields.length ||
        !fields.every(k => Object.hasOwn(data.frame, k) && same(data.frame[k], raw[k])) ||
        sequence !== pending.anchor.sequence + 1 || raw.pre !== pending.anchor.cursor ||
        previous.pITT !== utg.playerId || Object.keys(raw.tB)[0] !== utg.playerId ||
        !w.players.every(p => (previous.tB[p.playerId] ?? 0) === p.contribution) ||
        utg.contribution !== 0 || next.tB[utg.playerId] !== 5 || next.pITT !== null ||
        next.cPI !== utg.playerId) return null;
    const transition: VerifiedBettingTransition = {
      id: `${w.tableId}:${w.handId}:${w.generation}:${raw.now}:raise`,
      tableId: w.tableId, handId: w.handId, handNumber: w.handNumber, generation: w.generation,
      sequence, cursor: raw.now, previousCursor: raw.pre, receivedAt: at,
      street: "preflop", action: "raise", actor: { playerId: utg.playerId, seat: utg.seat, position: "UTG" },
      priorContributionChips: 0, newContributionChips: 5, investmentChips: 5,
      previousHighestContributionChips: 2, observedRaiseIncrementChips: 3,
      originalRoster: structuredClone(w.players),
      evidence: { source: "pokernow_gC", contract: "hand169_utg_open5_v1", raw: structuredClone(raw) },
    };
    return { pending: { ...pending, transition } };
  }
  const patch = validatedOpeningPatch(data, w.heroId), t = pending.transition;
  if (!patch || patch.kind !== "turn" || sequence !== t.sequence + 1 || patch.raw.pre !== t.cursor ||
      previous.pITT !== null || next.cPI !== hj.playerId || next.pITT !== hj.playerId ||
      !w.players.every(p => (next.tB[p.playerId] ?? 0) === (p.playerId === utg.playerId ? 5 : p.contribution))) return null;
  return { pending, proof: {
    version: 1, scope: "hj_facing_utg_open5", historyComplete: false, expiresAt: at + 10_000,
    witness: { ...w, cursor: next.now, previousCursor: previous.now, receivedAt: at,
      players: w.players.map(p => ({ ...p, contribution: p.playerId === utg.playerId ? 5 : p.contribution })),
      provenance: `${w.provenance} Hand169 closed acceptance: UTG total0->5, then separate HJ activation. Decision-local action context only; no response strategy, general legality or whole-hand coverage.` },
    anchor: structuredClone(pending.anchor), transitions: [structuredClone(t)],
    actor: { playerId: hj.playerId, seat: hj.seat, position: "HJ" },
    activation: { sequence, sourcePatch: structuredClone(patch.raw) },
    facts: { amountToCallChips: 5, acceptedRaiseToChips: 5, nextMinimumRaiseToChips: null,
      aggressionReopened: null, contestablePotChips: null },
  } };
}
