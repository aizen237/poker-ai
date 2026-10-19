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
  coActivation?: HjProof["activation"];
  btnActivation?: HjProof["activation"];
}

export interface BtnProof extends Omit<CoProof, "scope" | "folds"> {
  scope: "btn_after_utg_hj_co_folds";
  folds: [HjProof["fold"], HjProof["fold"], HjProof["fold"]];
  coActivation: HjProof["activation"];
}

export interface SbProof extends Omit<BtnProof, "scope" | "folds"> {
  scope: "sb_after_utg_hj_co_btn_folds";
  folds: [HjProof["fold"], HjProof["fold"], HjProof["fold"], HjProof["fold"]];
  btnActivation: HjProof["activation"];
}

/** Exact four-patch sequence captured in hands143/149/167. Called only after
 * the existing reducer validates continuity. No later positions or renewal. */
export function advanceCoWindow(pending: CoPending, data: UtgProjection, sequence: number, at: number):
  { pending: CoPending; proof?: Omit<CoProof, "continuity"> } | null {
  const result = advanceFoldPrefix(pending, data, sequence, at, "CO");
  if (!result) return null;
  return { pending: result.pending, ...(result.proof ? { proof: { ...result.proof,
    scope: "co_after_utg_hj_folds" as const, folds: result.proof.folds as CoProof["folds"] } } : {}) };
}

/** Same closed fold/turn grammar, extended by the captured third fold/turn in
 * hands148/166. Continuity remains owned by firstUtgSource, not this recognizer. */
export function advanceBtnWindow(pending: CoPending, data: UtgProjection, sequence: number, at: number):
  { pending: CoPending; proof?: Omit<BtnProof, "continuity"> } | null {
  const result = advanceFoldPrefix(pending, data, sequence, at, "BTN");
  if (!result) return null;
  return { pending: result.pending, ...(result.proof ? { proof: { ...result.proof,
    scope: "btn_after_utg_hj_co_folds" as const, folds: result.proof.folds as BtnProof["folds"],
    coActivation: structuredClone(pending.coActivation!) } } : {}) };
}

/** Hands147/165 contain the fourth explicit fold/turn. This supplies only a
 * decision window; the zero-contribution exact-five rule does not authorize SB. */
export function advanceSbWindow(pending: CoPending, data: UtgProjection, sequence: number, at: number):
  { pending: CoPending; proof?: Omit<SbProof, "continuity"> } | null {
  const result = advanceFoldPrefix(pending, data, sequence, at, "SB");
  if (!result) return null;
  return { pending: result.pending, ...(result.proof ? { proof: { ...result.proof,
    scope: "sb_after_utg_hj_co_btn_folds" as const, folds: result.proof.folds as SbProof["folds"],
    coActivation: structuredClone(pending.coActivation!), btnActivation: structuredClone(pending.btnActivation!) } } : {}) };
}

/** Frozen actor order plus separate explicit activations; no skipped/coalesced
 * transitions, general history coverage, later-position permission or renewal. */
function advanceFoldPrefix(pending: CoPending, data: UtgProjection, sequence: number, at: number, target: "CO" | "BTN" | "SB") {
  const w = pending.witness, patch = validatedOpeningPatch(data, w.heroId);
  const length = target === "CO" ? 2 : target === "BTN" ? 3 : 4;
  if (!patch || pending.folds.length > length || w.players.find(p => p.playerId === w.heroId)?.position !== target) return null;
  const { raw, kind } = patch;
  const actors = ["UTG", "HJ", "CO", "BTN", "SB"].map(position => w.players.find(p => p.position === position)!);
  const bb = w.players.find(p => p.position === "BB")!;
  const turns = [pending.hjActivation, pending.coActivation, pending.btnActivation].filter(v => v !== undefined);
  const step = pending.folds.length + turns.length;
  const previousCursor = step === 0 ? pending.anchor.cursor : step % 2 === 0
    ? turns.at(-1)!.sourcePatch.now : pending.folds.at(-1)!.cursor;
  if (step >= length * 2 || sequence !== pending.anchor.sequence + step + 1 || raw.pre !== previousCursor) return null;
  if (step % 2 === 0) {
    const actor = actors[step / 2]!;
    if (kind !== "fold" || Object.keys(raw.pGS)[0] !== actor.playerId || raw.wBACPI[0] !== bb.playerId) return null;
    return { pending: { ...pending, folds: [...pending.folds, {
      sequence, cursor: raw.now, previousCursor: raw.pre, receivedAt: at,
      playerId: actor.playerId, seat: actor.seat, sourcePatch: structuredClone(raw),
    }] } };
  }
  if (kind !== "turn" || raw.cPI !== actors[(step + 1) / 2]!.playerId) return null;
  if (step < length * 2 - 1) return { pending: { ...pending,
    [step === 1 ? "hjActivation" : step === 3 ? "coActivation" : "btnActivation"]: { sequence, sourcePatch: structuredClone(raw) } } };
  const witness = { ...w, cursor: raw.now, previousCursor: raw.pre, receivedAt: at,
    provenance: `${w.provenance} Explicit UTG fold -> HJ turn -> HJ fold -> ${target === "CO" ? "first CO" : target === "BTN" ? "CO turn -> CO fold -> first BTN" : "CO turn -> CO fold -> BTN turn -> BTN fold -> first SB"} activation at ${raw.now}. Closed ${target === "CO" ? "hands-143/149/167" : target === "BTN" ? "hands-148/166" : "hands-147/165"} patch contract; no generic action coverage.` };
  return { pending, proof: { version: 1 as const, historyComplete: false as const,
    expiresAt: at + 10_000, witness, anchor: structuredClone(pending.anchor),
    folds: structuredClone(pending.folds), hjActivation: structuredClone(pending.hjActivation!),
    activation: { sequence, sourcePatch: structuredClone(raw) } } };
}
