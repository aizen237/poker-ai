import type { FirstUtgProof, FirstUtgWitness, UtgProjection } from "./firstUtgSource.js";
import { validatedOpeningPatch, type HjProof } from "./hjWindow.js";
import type { BoundedUtgState } from "./firstUtgState.js";

const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Shared Phase 4D coverage; historical recognition must not widen permission. */
export const HJ_CALL_RULE = "pokernow-0.1.72-th-4fun-1-2-hj-call5-hand238-v1";
const HAND238_CAPACITIES = { UTG: 265, HJ: 253, CO: 240, BTN: 244, SB: 254, BB: 246 } as const;
export function matchesHjCallContract(w: FirstUtgWitness): boolean {
  return w.openingSizeProfile === "pokernow-0.1.72-th-4fun-1-2-exact5-v1" &&
    w.players.length === 6 && w.players.every(p => p.sourceStack === HAND238_CAPACITIES[p.position]);
}

/** Hand238 frame15 only. Shape is not action semantics: the current actor,
 * prior totals, unchanged highest wager and reviewed profile are checked below. */
export function isObservedHjCallPatch(raw: unknown): raw is Record<string, any> {
  if (!object(raw)) return false;
  const keys = ["tB", "now", "pGS", "sNA", "cRPI", "pITT", "sNAA", "wBACPI", "eventsData", "pre", "mEV", "fV", "sN"];
  return Object.keys(raw).length === keys.length && keys.every(k => Object.hasOwn(raw, k)) &&
    integer(raw.now) && integer(raw.pre) && raw.now > raw.pre && integer(raw.sNAA) && integer(raw.sN) &&
    raw.mEV === 0 && raw.fV === "0.1.72" && raw.sNA === "NSAA" && raw.pITT === null &&
    same(raw.pGS, {}) && same(raw.wBACPI, []) && same(raw.eventsData, []) &&
    object(raw.tB) && Object.keys(raw.tB).length === 1 && Object.values(raw.tB)[0] === 5 &&
    Array.isArray(raw.cRPI) && raw.cRPI.length === 2 && raw.cRPI[0] !== raw.cRPI[1] &&
    raw.cRPI[1] === Object.keys(raw.tB)[0];
}

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

/** Hand261 HJ activation omits mAVTB. No capacity is inferred from that field;
 * this closed shape is consumed only immediately after an accepted UTG open5. */
export function isObservedHjFacingTurnPatch(raw: unknown): raw is Record<string, any> {
  const fields = ["now", "pre", "eventsData", "mEV", "fV", "sN", "cPI", "pITT", "sNA", "pASA", "sNAA"];
  return object(raw) && Object.keys(raw).length === fields.length && fields.every(k => Object.hasOwn(raw, k)) &&
    integer(raw.now) && integer(raw.pre) && raw.now > raw.pre && integer(raw.sN) &&
    raw.mEV === 0 && raw.fV === "0.1.72" && same(raw.eventsData, []) &&
    typeof raw.cPI === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(raw.cPI) && raw.pITT === raw.cPI &&
    raw.sNA === null && raw.sNAA === null && raw.pASA === raw.now;
}

function validatedFacingTurnPatch(data: UtgProjection, heroId: string) {
  const existing = validatedOpeningPatch(data, heroId);
  if (existing) return existing;
  const raw = data.bettingPatch, fields = ["now", "pre", "eventsData", "fV", "pITT", "cPI"];
  if (data.event !== "gC" || data.heroId !== heroId || !isObservedHjFacingTurnPatch(raw) ||
      Object.keys(data.frame).length !== fields.length ||
      !fields.every(k => Object.hasOwn(data.frame, k) && same(data.frame[k], raw[k]))) return null;
  return { raw, kind: "turn" as const };
}

/** Source-derived event with explicit chip semantics, original actor/roster and
 * ordering provenance. The closed action union deliberately exposes only the
 * implemented grammar; future actions require their own reviewed recognizers. */
export interface BettingTransitionBase {
  id: string;
  tableId: string; handId: string; handNumber: number; generation: number;
  sequence: number; cursor: number; previousCursor: number; receivedAt: number;
  street: "preflop";
  priorContributionChips: 0; newContributionChips: 5; investmentChips: 5;
  originalRoster: FirstUtgWitness["players"];
}
export type VerifiedBettingTransition = BettingTransitionBase & ({
  action: "raise";
  actor: { playerId: string; seat: number; position: "UTG" };
  previousHighestContributionChips: 2; observedRaiseIncrementChips: 3;
  evidence: { source: "pokernow_gC"; contract: "hand169_utg_open5_v1"; raw: Record<string, any> };
} | {
  action: "call";
  actor: { playerId: string; seat: number; position: "HJ" };
  previousHighestContributionChips: 5; observedRaiseIncrementChips: 0;
  evidence: { source: "pokernow_gC"; contract: typeof HJ_CALL_RULE; raw: Record<string, any> };
});
type OpenTransition = Extract<VerifiedBettingTransition, { action: "raise" }>;
type CallTransition = Extract<VerifiedBettingTransition, { action: "call" }>;

export interface FacingOpenProof extends Omit<FirstUtgProof, "scope"> {
  scope: "hj_facing_utg_open5";
  anchor: HjProof["anchor"];
  transitions: [OpenTransition];
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
  transition?: OpenTransition;
  hjActivation?: HjProof["activation"] & { receivedAt: number };
  call?: CallTransition;
}

export interface CoFacingOpenProof extends Omit<FacingOpenProof, "scope" | "transitions" | "actor"> {
  scope: "co_facing_utg_open5_hj_call5";
  transitions: [OpenTransition, CallTransition];
  actor: { playerId: string; seat: number; position: "CO" };
  hjActivation: NonNullable<FacingOpenPending["hjActivation"]>;
  accounting: {
    units: "chips";
    contributions: Array<{ playerId: string; seat: number; position: FirstUtgWitness["players"][number]["position"];
      forcedChips: number; voluntaryInvestmentChips: number; streetTotalChips: number;
      remainingCapacityChips: number }>;
    streetContributionSumChips: number;
    contestablePotChips: null;
    provenance: string;
  };
}

/** Dependent recognizer invoked only after advanceUtgState succeeds. It consumes
 * the SAME continuity authority as the opening windows; it does not reduce or
 * repair source state and cannot mint a connection receipt. */
export function advanceFacingOpenWindow(pending: FacingOpenPending, data: UtgProjection,
  previous: BoundedUtgState, next: BoundedUtgState, sequence: number, at: number):
  { pending: FacingOpenPending; proof?: Omit<FacingOpenProof, "continuity">;
    coProof?: Omit<CoFacingOpenProof, "continuity"> } | null {
  const w = pending.witness, utg = w.players.find(p => p.position === "UTG")!,
    hj = w.players.find(p => p.position === "HJ")!;
  if (!w.openingSizeProfile || data.heroId !== w.heroId || data.event !== "gC" ||
      previous.hI !== w.handId || next.hI !== w.handId || next.gN !== w.handNumber ||
      !same(next.gT, [1, 0])) return null;
  if (pending.hjActivation) {
    // Historical source facts survive an advice deadline, but never an
    // intervening unsupported update. This is the same consecutive recognizer.
    if (!matchesHjCallContract(w) || previous.cPI !== hj.playerId) return null;
    const t = pending.transition!, activation = pending.hjActivation;
    const totalsMatch = (state: BoundedUtgState, called: boolean) => w.players.every(p =>
      (state.tB[p.playerId] ?? 0) === (p.playerId === utg.playerId || called && p.playerId === hj.playerId ? 5 : p.contribution));
    if (!pending.call) {
      const raw = data.bettingPatch;
      const fields = ["tB", "now", "pGS", "cRPI", "pITT", "eventsData", "pre", "fV"];
      if (!isObservedHjCallPatch(raw) || Object.keys(data.frame).length !== fields.length ||
          !fields.every(k => Object.hasOwn(data.frame, k) && same(data.frame[k], raw[k])) ||
          sequence !== activation.sequence + 1 || raw.pre !== activation.sourcePatch.now ||
          previous.pITT !== hj.playerId || hj.contribution !== 0 ||
          Object.keys(raw.tB)[0] !== hj.playerId || !same(raw.cRPI, [utg.playerId, hj.playerId]) ||
          !totalsMatch(previous, false) || !totalsMatch(next, true) || next.pITT !== null || next.cPI !== hj.playerId) return null;
      const call: CallTransition = {
        id: `${w.tableId}:${w.handId}:${w.generation}:${raw.now}:call`,
        tableId: w.tableId, handId: w.handId, handNumber: w.handNumber, generation: w.generation,
        sequence, cursor: raw.now, previousCursor: raw.pre, receivedAt: at,
        street: "preflop", action: "call", actor: { playerId: hj.playerId, seat: hj.seat, position: "HJ" },
        priorContributionChips: 0, newContributionChips: 5, investmentChips: 5,
        previousHighestContributionChips: 5, observedRaiseIncrementChips: 0,
        originalRoster: structuredClone(w.players),
        evidence: { source: "pokernow_gC", contract: HJ_CALL_RULE, raw: structuredClone(raw) },
      };
      return { pending: { ...pending, call } };
    }
    const patch = validatedOpeningPatch(data, w.heroId), call = pending.call;
    const co = w.players.find(p => p.position === "CO")!;
    if (!patch || patch.kind !== "turn" || sequence !== call.sequence + 1 || patch.raw.pre !== call.cursor ||
        previous.pITT !== null || next.cPI !== co.playerId || next.pITT !== co.playerId ||
        !totalsMatch(previous, true) || !totalsMatch(next, true)) return null;
    const players = w.players.map(p => ({ ...p,
      contribution: p.playerId === utg.playerId || p.playerId === hj.playerId ? 5 : p.contribution }));
    const contributions = players.map(p => ({ playerId: p.playerId, seat: p.seat, position: p.position,
      forcedChips: w.players.find(original => original.playerId === p.playerId)!.contribution,
      voluntaryInvestmentChips: p.position === "UTG" || p.position === "HJ" ? 5 : 0,
      streetTotalChips: p.contribution, remainingCapacityChips: p.sourceStack - p.contribution }));
    return { pending, coProof: {
      version: 1, scope: "co_facing_utg_open5_hj_call5", historyComplete: false, expiresAt: at + 10_000,
      witness: { ...w, players, cursor: next.now, previousCursor: previous.now, receivedAt: at,
        provenance: `${w.provenance} Closed hand238 prefix: UTG raise0->5, HJ turn, HJ call0->5 matching highest5, then CO activation. Historical facts only; no CO action permission or whole-hand coverage.` },
      anchor: structuredClone(pending.anchor), transitions: [structuredClone(t), structuredClone(call)],
      hjActivation: structuredClone(activation), activation: { sequence, sourcePatch: structuredClone(patch.raw) },
      actor: { playerId: co.playerId, seat: co.seat, position: "CO" },
      facts: { amountToCallChips: 5, acceptedRaiseToChips: 5, nextMinimumRaiseToChips: null,
        aggressionReopened: null, contestablePotChips: null },
      accounting: { units: "chips", contributions,
        streetContributionSumChips: contributions.reduce((sum, p) => sum + p.streetTotalChips, 0),
        contestablePotChips: null,
        provenance: "Original forced posts plus two distinct accepted additional investments, cross-checked against source street totals. Remaining capacity is arithmetic, not an observed stack decrement; no pot/returns/rake/settlement proof." },
    } };
  }
  if (previous.cPI !== utg.playerId) return null;
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
    const transition: OpenTransition = {
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
  const patch = validatedFacingTurnPatch(data, w.heroId), t = pending.transition;
  if (!patch || patch.kind !== "turn" || sequence !== t.sequence + 1 || patch.raw.pre !== t.cursor ||
      previous.pITT !== null || next.cPI !== hj.playerId || next.pITT !== hj.playerId ||
      !w.players.every(p => (next.tB[p.playerId] ?? 0) === (p.playerId === utg.playerId ? 5 : p.contribution))) return null;
  return { pending: { ...pending, hjActivation: { sequence, sourcePatch: structuredClone(patch.raw), receivedAt: at } }, proof: {
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
