import type { FirstUtgProof, FirstUtgWitness, UtgProjection } from "./firstUtgSource.js";

const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const token = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
const common = ["now", "pre", "eventsData", "mEV", "fV", "sN"];

/** Closed raw-patch shapes observed in hands 150/168. Extra fields are NOT
 * discarded before this check: even a mutation outside the bounded reducer
 * disqualifies this small action window. Opaque fields are shape/profile
 * discriminators, never betting permissions or timestamp-unit assumptions. */
export function hjPatchKind(raw: unknown): "fold" | "turn" | null {
  if (!object(raw) || !integer(raw.now) || !integer(raw.pre) || raw.now <= raw.pre ||
      !integer(raw.sN) || raw.mEV !== 0 || raw.fV !== "0.1.72" ||
      !Array.isArray(raw.eventsData) || raw.eventsData.length) return null;
  const exact = (fields: string[]) => Object.keys(raw).length === fields.length && fields.every(k => Object.hasOwn(raw, k));
  if (exact([...common, "pGS", "sNA", "pITT", "sNAA", "wBACPI"]) &&
      object(raw.pGS) && Object.keys(raw.pGS).length === 1 && token(Object.keys(raw.pGS)[0]) &&
      Object.values(raw.pGS)[0] === "fold" && raw.sNA === "NSAF" && raw.pITT === null &&
      integer(raw.sNAA) && Array.isArray(raw.wBACPI) && raw.wBACPI.length === 1 && token(raw.wBACPI[0])) return "fold";
  if (exact([...common, "cPI", "pITT", "sNA", "pASA", "sNAA", "mAVTB"]) &&
      token(raw.cPI) && raw.pITT === raw.cPI && raw.sNA === null && raw.sNAA === null &&
      raw.pASA === raw.now && integer(raw.mAVTB)) return "turn";
  return null;
}

export interface HjProof extends Omit<FirstUtgProof, "scope"> {
  scope: "hj_after_utg_fold";
  anchor: { sequence: number; cursor: number; receivedAt: number; firstActorId: string };
  fold: { sequence: number; cursor: number; previousCursor: number; receivedAt: number; playerId: string; seat: number;
    sourcePatch: Record<string, any> };
  activation: { sequence: number; sourcePatch: Record<string, any> };
}
export interface HjPending {
  witness: FirstUtgWitness;
  anchor: HjProof["anchor"];
  fold?: HjProof["fold"];
}

/** Shared closed-shape check for the HJ, CO, BTN and SB recognizers. The bounded
 * projection must agree with the retained raw patch; no dropped mutation. */
export function validatedOpeningPatch(data: UtgProjection, heroId: string) {
  const raw = data.hjPatch, kind = hjPatchKind(raw);
  const projectedKeys = ["now", "pre", "eventsData", "fV", "pITT", kind === "fold" ? "pGS" : "cPI"];
  if (!raw || !kind || data.event !== "gC" || data.heroId !== heroId ||
      Object.keys(data.frame).length !== projectedKeys.length || !projectedKeys.every(k => Object.hasOwn(data.frame, k)) ||
      Object.entries(data.frame).some(([k, v]) => JSON.stringify(raw[k]) !== JSON.stringify(v))) return null;
  return { raw, kind };
}

/** Called only AFTER the existing reducer validates this consecutive update.
 * This is a two-transition recognizer, not another continuity/state reducer. */
export function advanceHjWindow(pending: HjPending, data: UtgProjection, sequence: number, at: number):
  { pending: HjPending; proof?: Omit<HjProof, "continuity"> } | null {
  const w = pending.witness, patch = validatedOpeningPatch(data, w.heroId);
  if (!patch) return null;
  const { raw, kind } = patch;
  const utg = w.players.find(p => p.position === "UTG")!, bb = w.players.find(p => p.position === "BB")!;
  if (!pending.fold) {
    if (kind !== "fold" || sequence !== pending.anchor.sequence + 1 || raw.pre !== pending.anchor.cursor ||
        Object.keys(raw.pGS)[0] !== utg.playerId || raw.wBACPI[0] !== bb.playerId) return null;
    return { pending: { ...pending, fold: { sequence, cursor: raw.now, previousCursor: raw.pre, receivedAt: at,
      playerId: utg.playerId, seat: utg.seat, sourcePatch: structuredClone(raw) } } };
  }
  if (kind !== "turn" || sequence !== pending.fold.sequence + 1 || raw.pre !== pending.fold.cursor || raw.cPI !== w.heroId) return null;
  const witness = { ...w, cursor: raw.now, previousCursor: raw.pre, receivedAt: at,
    provenance: `${w.provenance} Explicit UTG fold at ${pending.fold.cursor}; immediately linked first HJ activation at ${raw.now}. Closed hands-150/168 patch contract; no generic action coverage.` };
  return { pending, proof: { version: 1, scope: "hj_after_utg_fold", historyComplete: false, expiresAt: at + 10_000,
    witness, anchor: structuredClone(pending.anchor), fold: structuredClone(pending.fold),
    activation: { sequence, sourcePatch: structuredClone(raw) } } };
}
