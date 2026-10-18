import type { FirstUtgProof, FirstUtgWitness, UtgProjection } from "./firstUtgSource.js";
import { validatedOpeningPatch, type HjProof } from "./hjWindow.js";

export interface CoProof extends Omit<FirstUtgProof, "scope"> {
  scope: "co_after_utg_hj_folds";
  anchor: HjProof["anchor"];
  folds: [HjProof["fold"], HjProof["fold"]];
  hjActivation: HjProof["activation"];
  activation: HjProof["activation"];
}
export interface CoPending {
  witness: FirstUtgWitness;
  anchor: HjProof["anchor"];
  folds: HjProof["fold"][];
  hjActivation?: HjProof["activation"];
}

/** Exact four-patch sequence captured in hands143/149/167. Called only after
 * the existing reducer validates continuity. No later positions or renewal. */
export function advanceCoWindow(pending: CoPending, data: UtgProjection, sequence: number, at: number):
  { pending: CoPending; proof?: Omit<CoProof, "continuity"> } | null {
  const w = pending.witness, patch = validatedOpeningPatch(data, w.heroId);
  if (!patch || pending.folds.length > 2) return null;
  const { raw, kind } = patch;
  const utg = w.players.find(p => p.position === "UTG")!;
  const hj = w.players.find(p => p.position === "HJ")!;
  const bb = w.players.find(p => p.position === "BB")!;
  const step = pending.folds.length === 0 ? 0 : !pending.hjActivation ? 1 : pending.folds.length === 1 ? 2 : 3;
  const previousCursor = step === 0 ? pending.anchor.cursor : step === 2
    ? pending.hjActivation!.sourcePatch.now : pending.folds.at(-1)!.cursor;
  if (sequence !== pending.anchor.sequence + step + 1 || raw.pre !== previousCursor) return null;
  if (step === 0 || step === 2) {
    const actor = step === 0 ? utg : hj;
    if (kind !== "fold" || Object.keys(raw.pGS)[0] !== actor.playerId || raw.wBACPI[0] !== bb.playerId) return null;
    return { pending: { ...pending, folds: [...pending.folds, {
      sequence, cursor: raw.now, previousCursor: raw.pre, receivedAt: at,
      playerId: actor.playerId, seat: actor.seat, sourcePatch: structuredClone(raw),
    }] } };
  }
  if (kind !== "turn" || raw.cPI !== (step === 1 ? hj.playerId : w.heroId)) return null;
  if (step === 1) return { pending: { ...pending, hjActivation: { sequence, sourcePatch: structuredClone(raw) } } };
  const witness = { ...w, cursor: raw.now, previousCursor: raw.pre, receivedAt: at,
    provenance: `${w.provenance} Explicit UTG fold -> HJ turn -> HJ fold -> first CO activation at ${raw.now}. Closed hands-143/149/167 patch contract; no generic action coverage.` };
  return { pending, proof: { version: 1, scope: "co_after_utg_hj_folds", historyComplete: false,
    expiresAt: at + 10_000, witness, anchor: structuredClone(pending.anchor),
    folds: structuredClone(pending.folds) as CoProof["folds"], hjActivation: structuredClone(pending.hjActivation!),
    activation: { sequence, sourcePatch: structuredClone(raw) } } };
}
