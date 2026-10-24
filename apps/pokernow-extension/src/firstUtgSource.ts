import { initializeUtgState, advanceUtgState } from "./firstUtgState.js";
import { advanceHjWindow, hjPatchKind, type HjPending, type HjProof } from "./hjWindow.js";
import { advanceCoWindow, advanceBtnWindow, advanceSbWindow, type CoPending, type CoProof, type BtnProof, type SbProof } from "./coWindow.js";
import { isObservedUtgOpenPatch, isObservedHjCallPatch, advanceFacingOpenWindow, type FacingOpenPending, type FacingOpenProof, type CoFacingOpenProof } from "./bettingWindow.js";
import { flopPatchKind, advanceFlopWindow, type FlopPending, type FlopObservationProof } from "./flopWindow.js";

/** Scoped first-UTG witness from consecutive bounded source state.
 * No general poker-state emulator or full action-history claim. */
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const token = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
const integer = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
// Object member order is not semantic; array order and absent/null are.
const equivalent = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => equivalent(v, b[i]));
  return object(a) && object(b) && Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(k => Object.hasOwn(b, k) && equivalent(a[k], b[k]));
};
/** Internal validation receipt, never accepted from a page message. */
export interface SourceBootstrapReceipt {
  kind: "registration" | "equivalent_refresh";
  sequence: number; generation: number; tableId: string; handId: string; handNumber: number;
  now: number; pre: number | undefined;
}
const keys = ["id", "hI", "gN", "now", "pre", "r", "gT", "seats", "iHPI", "dealerID", "dealerSeat", "sBPI", "bBPI",
  "tB", "pGS", "cPI", "pITT", "smallBlind", "bigBlind", "ante", "deadButton", "gM", "mode", "oTC", "gameResult",
  "aD", "aS", "cM", "cR", "cRPI", "rHP", "rHC", "eventsData", "version", "fV", "nR", "mTB", "rIT", "sPM"];
export interface UtgProjection { event: "registered" | "gC" | "rup"; heroId: string | null; frame: Record<string, any>;
  /** Only the two exact raw transition shapes; absent means no HJ/CO/BTN/SB permission. */
  hjPatch?: Record<string, any>;
  /** Closed accepted UTG open / HJ call only; unknown raw mutations never disappear into a proof. */
  bettingPatch?: Record<string, any>;
  /** Closed hand239 observations only; never action permission. */
  flopPatch?: Record<string, any>;
  /** Raw hand-start discriminators, not decoded betting bounds. */
  flopBoundary?: { mR: number; cHB: number } }

/** Separate bounded projection; no names, credentials, stats or opponent cards. */
export function projectFirstUtgSource(data: unknown, knownHero: string | null): UtgProjection | null {
  if (typeof data !== "string" || data.length > 2_000_000 || !data.startsWith("42[")) return null;
  try {
    const p = JSON.parse(data.slice(2));
    if (!Array.isArray(p) || p.length !== 2 || !["registered", "gC", "rup"].includes(p[0]) || !object(p[1])) return null;
    const raw = p[0] === "registered" ? p[1].gameState : p[1];
    if (!object(raw)) return null;
    // Unknown nested events/results stay in the opt-in raw capture, not the
    // automatic cross-world projection. This witness supports empty events only.
    if (Object.hasOwn(raw, "eventsData") && !same(raw.eventsData, [])) return null;
    const heroId = p[0] === "registered" ? p[1].currentPlayer?.id : knownHero;
    const flopKind = p[0] === "gC" ? flopPatchKind(raw) : null;
    const frame: Record<string, any> = {};
    for (const key of keys) if (Object.hasOwn(raw, key)) frame[key] = raw[key];
    // Only the observed hand-boundary removal marker is consumed by the proof.
    // Settlement payloads may contain unrelated player/result data.
    if (p[0] === "registered" || frame.gameResult !== "<D>") delete frame.gameResult;
    if (Object.hasOwn(raw, "players")) {
      if (!object(raw.players) || Object.keys(raw.players).length > 10) return null;
      frame.players = Object.fromEntries(Object.entries(raw.players).map(([id, player]) => [id, object(player)
        ? Object.fromEntries(["id", "stack", "status", "disconnectedSince"].filter(k => Object.hasOwn(player, k)).map(k => [k, player[k]])) : player]));
    }
    if (Object.hasOwn(raw, "pC")) {
      if (!object(raw.pC) || Object.keys(raw.pC).length > 10) return null;
      // Hand239 flop carries descriptions only, with no cards member. The
      // closed raw deal shape is retained for the dependent recognizer. An
      // empty card patch lets the existing reducer preserve private cards;
      // descriptions never become new cards or opponent knowledge.
      if (flopKind === "deal") {
        if (Object.entries(raw.pC).some(([id, hand]) => id !== heroId &&
            !equivalent(hand, { name1: null, name2: null, name1RH: null }))) return null;
        frame.pC = {};
      } else {
        if (Object.values(raw.pC).some(hand => !object(hand) || !Array.isArray(hand.cards) || hand.cards.length > 2 ||
            hand.cards.some((c: unknown) => !object(c) || !(c.value === null || typeof c.value === "string") || typeof c.showing !== "boolean"))) return null;
        frame.pC = Object.fromEntries(Object.entries(raw.pC).map(([id, hand]) => [id,
          { cards: (hand as any).cards.map((c: any) => ({ value: id === heroId ? c.value : null, showing: c.showing })) }]));
      }
    }
    const result = { event: p[0], heroId: token(heroId) ? heroId : null, frame,
      ...(p[0] === "gC" && same(raw.gT, [1, 0]) && integer(raw.mR) && integer(raw.cHB)
        ? { flopBoundary: { mR: raw.mR, cHB: raw.cHB } } : {}),
      ...(flopKind && flopKind !== "turn" && flopKind !== "fold" ? { flopPatch: raw } : {}),
      ...(p[0] === "gC" && (isObservedUtgOpenPatch(raw) || isObservedHjCallPatch(raw)) ? { bettingPatch: raw } : {}),
      ...(p[0] === "gC" && hjPatchKind(raw) ? { hjPatch: raw } : {}) };
    return JSON.stringify(result).length <= 40_000 ? result : null;
  } catch { return null; }
}

export interface FirstUtgWitness {
  tableId: string; handId: string; handNumber: number; generation: number; cursor: number; previousCursor: number;
  receivedAt: number; heroId: string; heroSeat: number; heroCards: string[]; smallBlind: number; bigBlind: number;
  players: Array<{ playerId: string; seat: number; position: "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB"; sourceStack: number; contribution: number }>;
  provenance: string;
  /** Exact observed profile fingerprint, not decoded min/max/grid fields. */
  openingSizeProfile?: "pokernow-0.1.72-th-4fun-1-2-exact5-v1";
}

/** The sole continuity authority for this decision class. Minted inside the
 * validated reducer, never accepted from page messages or metadata inventory. */
export interface FirstUtgProof {
  version: 1;
  scope: "first_utg_boundary";
  historyComplete: false;
  expiresAt: number;
  continuity: { status: "validated_prefix"; baselineSequence: number; throughSequence: number;
    generation: number; tableId: string; handId: string; cursor: number };
  witness: FirstUtgWitness;
}

function firstUtg(reg: UtgProjection, next: UtgProjection, tableId: string, generation: number, at: number,
  role: "UTG" | "HJ" | "CO" | "BTN" | "SB" = "UTG"): FirstUtgWitness | null {
  const a = reg.frame, b = next.frame, hero = reg.heroId;
  const firstActor = role === "UTG" ? hero : b.cPI;
  if (role !== "UTG" && (a.version !== "0.1.72" || (b.version ?? a.version) !== "0.1.72" || b.fV !== "0.1.72")) return null;
  if (!hero || next.event !== "gC" || a.id !== tableId ||
      (Object.hasOwn(b, "id") && b.id !== tableId) || b.r === true || next.heroId !== hero ||
      !integer(a.now) || !integer(b.now) || b.pre !== a.now || b.now <= a.now ||
      !integer(a.gN) || b.gN !== a.gN + 1 || !token(a.hI) || !token(b.hI) || a.hI === b.hI ||
      !same(a.gT, [1, 5]) || !same(b.gT, [1, 0]) || !same(b.oTC, { "1": [] }) || b.gameResult !== "<D>" ||
      b.cPI !== firstActor || b.pITT !== firstActor || !same(b.cRPI, []) || !same(b.eventsData, []) ||
      !same(b.players, {}) || !same(b.rHP, []) || b.rHC !== null) return null;
  // Match the observed normal, no-ante play-money Hold'em profile only. These
  // abbreviated flags are profile constraints, not guessed rule definitions.
  const profile = { smallBlind: 1, bigBlind: 2, ante: null, deadButton: false, gM: "th", mode: "4fun", aD: false, aS: false, cM: false, cR: false };
  for (const [k, value] of Object.entries(profile)) if (!same(a[k], value) || Object.hasOwn(b, k) && !same(b[k], value)) return null;
  if (!Array.isArray(a.seats) || a.seats.length !== 6 || Object.hasOwn(b, "seats") && !same(a.seats, b.seats) ||
      !Array.isArray(b.iHPI) || b.iHPI.length !== 6 || !object(a.players) || !object(b.pC) || !object(b.tB) ||
      !object(a.pGS) || !object(b.pGS)) return null;
  const seats = a.seats as unknown[];
  if (!seats.every((s, i) => Array.isArray(s) && s.length === 2 && integer(s[0]) && s[0] >= 1 && s[0] <= 10 && token(s[1]) &&
      (i === 0 || (seats[i - 1] as any[])[0] < s[0]))) return null;
  const rows = seats as [number, string][];
  const ids = rows.map(s => s[1]);
  if (new Set(ids).size !== 6 || new Set(b.iHPI).size !== 6 || Object.keys(b.pC).length !== 6 ||
      !ids.every(id => b.iHPI.includes(id) && Object.hasOwn(b.pC, id)) || Object.keys(a.players).length !== 6 ||
      Object.keys(b.pGS).some(id => !ids.includes(id))) return null;
  const dealer = rows.findIndex(([seat, id]) => seat === b.dealerSeat && id === b.dealerID);
  if (dealer < 0) return null;
  const cycle = [...rows.slice(dealer), ...rows.slice(0, dealer)];
  const heroIndex = role === "UTG" ? 3 : role === "HJ" ? 4 : role === "CO" ? 5 : role === "BTN" ? 0 : 1;
  if (cycle[1]![1] !== b.sBPI || cycle[2]![1] !== b.bBPI || cycle[3]![1] !== firstActor || cycle[heroIndex]![1] !== hero ||
      Object.keys(b.tB).length !== 2 || b.tB[b.sBPI] !== 1 || b.tB[b.bBPI] !== 2) return null;
  const roles = ["BTN", "SB", "BB", "UTG", "HJ", "CO"] as const;
  const players: FirstUtgWitness["players"] = [];
  for (let i = 0; i < cycle.length; i++) {
    const [seat, playerId] = cycle[i]!, p = a.players[playerId], cards = b.pC[playerId]?.cards;
    if (!object(p) || p.id !== playerId || !integer(p.stack) || p.stack < 202 || p.status !== "inGame" ||
        Object.hasOwn(p, "disconnectedSince") || (b.pGS[playerId] ?? a.pGS[playerId]) !== "inGame" ||
        !Array.isArray(cards) || cards.length !== 2 || cards.some(c => !object(c) || c.showing !== false ||
          (playerId === hero ? typeof c.value !== "string" || !/^[2-9TJQKA][shdc]$/.test(c.value) : c.value !== null))) return null;
    players.push({ seat, playerId, position: roles[i]!, sourceStack: p.stack, contribution: i === 1 ? 1 : i === 2 ? 2 : 0 });
  }
  const heroCards: string[] = b.pC[hero].cards.map((c: any) => c.value);
  if (new Set(heroCards).size !== 2) return null;
  return { tableId, handId: b.hI, handNumber: b.gN, generation, cursor: b.now, previousCursor: a.now, receivedAt: at,
    heroId: hero, heroSeat: cycle[heroIndex]![0], heroCards, smallBlind: 1, bigBlind: 2, players,
    ...(a.version === "0.1.72" && b.fV === "0.1.72" &&
      (b.version ?? a.version) === "0.1.72" && same(b.nR, [1]) &&
      (Object.hasOwn(b, "mTB") ? b.mTB : a.mTB) === null &&
      (Object.hasOwn(b, "rIT") ? b.rIT : a.rIT) === "no" &&
      (Object.hasOwn(b, "sPM") ? b.sPM : a.sPM) === false
      ? { openingSizeProfile: "pokernow-0.1.72-th-4fun-1-2-exact5-v1" as const } : {}),
    provenance: `PokerNow validated hand-start ${a.hI}/${a.gN} -> ${b.hI}/${b.gN}, pre=${b.pre}, now=${b.now}; first UTG turn has no preceding voluntary turn; forced blinds only. Hand-53 observed source profile; bounded consecutive source state.${role !== "UTG" ? ` Frozen ${role} anchor only; not yet an actionable decision.` : ""}` };
}

/** Every later update expires the current decision witness. Validated state may
 * continue to the next hand; it never certifies action-history completeness. */
export function createFirstUtgSource(tableId: string, now: () => number) {
  let baseline: { data: UtgProjection; generation: number; sequence: number; baselineSequence: number } | null = null;
  let witness: FirstUtgWitness | null = null;
  let flopPending: FlopPending | null = null;
  let flopProof: FlopObservationProof | null = null;
  let facingPending: FacingOpenPending | null = null;
  let facingProof: FacingOpenProof | null = null;
  let coFacingProof: CoFacingOpenProof | null = null;
  let hjPending: HjPending | null = null;
  let hjProof: HjProof | null = null;
  let hjReason = "No supported HJ boundary/fold/turn sequence observed.";
  let coPending: CoPending | null = null;
  let coProof: CoProof | null = null;
  let coReason = "No supported CO boundary/two-fold/turn sequence observed.";
  let btnPending: CoPending | null = null;
  let btnProof: BtnProof | null = null;
  let btnReason = "No supported BTN boundary/three-fold/turn sequence observed.";
  let sbPending: CoPending | null = null;
  let sbProof: SbProof | null = null;
  let sbReason = "No supported SB boundary/four-fold/turn sequence observed.";
  // Diagnostic history only: never consumed by snapshot() or proof activation.
  let lastCertificate: { handId: string; generation: number; issuedBySequence: number; receivedAt: number; expiresAt: number;
    invalidation: { at: number; sequence: number | null; reason: string } | null } | null = null;
  const invalidateWitness = (reason: string, sequence: number | null) => {
    witness = null;
    flopProof = null;
    hjProof = null;
    coProof = null;
    btnProof = null;
    sbProof = null;
    facingProof = null;
    coFacingProof = null;
    if (lastCertificate && (!lastCertificate.invalidation || sequence !== null &&
        lastCertificate.invalidation.sequence === sequence && lastCertificate.invalidation.at === now())) {
      lastCertificate.invalidation = { at: now(), sequence, reason };
    }
  };
  let lastSequence = -1;
  let lastGeneration = 0;
  let rejectedGeneration: number | null = null;
  let lastObservedAt = -1;
  let registrationSeen = false;
  type Observation = { sequence: number; generation: number; observedAt: number; projection: UtgProjection | null };
  const observations: Observation[] = [];
  let retainedCharacters = 0, droppedObservations = 0;
  let reason = "No bounded first-UTG source projection received.";
  const currentProof = (): FirstUtgProof | null => {
    if (!witness || !baseline || now() < witness.receivedAt || now() - witness.receivedAt > 10_000 ||
        baseline.generation !== witness.generation || baseline.data.frame.hI !== witness.handId || baseline.data.frame.now !== witness.cursor) return null;
    return { version: 1, scope: "first_utg_boundary", historyComplete: false, expiresAt: witness.receivedAt + 10_000,
      continuity: { status: "validated_prefix", baselineSequence: baseline.baselineSequence, throughSequence: baseline.sequence,
        generation: baseline.generation, tableId, handId: witness.handId, cursor: witness.cursor }, witness: structuredClone(witness) };
  };
  return {
    accept(raw: unknown, sequence: unknown, generation: unknown, observedAt: unknown): SourceBootstrapReceipt | undefined {
      const reject = (message: string) => { invalidateWitness(message, integer(sequence) ? sequence : null); facingPending = null; flopPending = null; hjPending = null; hjReason = message; coPending = null; coReason = message; btnPending = null; btnReason = message; sbPending = null; sbReason = message; baseline = null; rejectedGeneration = lastGeneration; reason = message; };
      if (!integer(sequence) || !integer(generation) || generation < 1) { reject("Invalid local source sequence/generation."); return; }
      if (sequence <= lastSequence || generation < lastGeneration) { reject("Stale/replayed local source delivery invalidated carried state."); return; }
      invalidateWitness("Subsequent source update requires a new certificate; no same-decision renewal contract is verified.", sequence);
      const previous = baseline; baseline = null;
      const newGeneration = generation !== lastGeneration;
      if (newGeneration) { facingPending = null; flopPending = null; }
      const contiguous = sequence === lastSequence + 1 && !newGeneration;
      lastSequence = sequence;
      lastGeneration = generation;
      if (newGeneration) { hjPending = null; coPending = null; coReason = "New generation; CO evidence reset."; btnPending = null; btnReason = "New generation; BTN evidence reset."; sbPending = null; sbReason = "New generation; SB evidence reset."; rejectedGeneration = null; lastObservedAt = -1; registrationSeen = false; }
      if (!integer(observedAt) || observedAt > now() || observedAt < lastObservedAt) { reject("Invalid or regressing local receive time."); return; }
      lastObservedAt = observedAt;
      const valid = object(raw) && object(raw.frame) && JSON.stringify(raw).length <= 40_000 && ["registered", "gC", "rup"].includes(raw.event);
      const observation: Observation = { sequence, generation, observedAt, projection: valid ? structuredClone(raw) as unknown as UtgProjection : null };
      observations.push(observation); retainedCharacters += JSON.stringify(observation).length;
      while (observations.length > 96 || retainedCharacters > 300_000) {
        retainedCharacters -= JSON.stringify(observations.shift()!).length; droppedObservations++;
      }
      if (!valid) { reject("Missing, malformed or unbound first-UTG source projection; inventory fields cannot replace source values."); return; }
      const data = raw as unknown as UtgProjection;
      const receipt = (kind: SourceBootstrapReceipt["kind"], frame: Record<string, any>): SourceBootstrapReceipt =>
        ({ kind, sequence, generation, tableId, handId: frame.hI, handNumber: frame.gN, now: frame.now, pre: frame.pre });
      // Before the first full registration, patches are untrusted and never
      // inherited. Their absence/gaps say nothing about the new baseline.
      if (!registrationSeen && data.event !== "registered") {
        reason = "Discarded pre-registration update; waiting for a validated full registration in this generation.";
        return;
      }
      if (registrationSeen && rejectedGeneration === generation) { baseline = null; return; }
      try {
        if (data.event === "registered" && !registrationSeen) {
          registrationSeen = true; // A failed registration cannot be repaired silently in this generation.
          if (!token(data.heroId)) throw new Error("Registration has no validated hero ID.");
          const frame = initializeUtgState(data.frame, tableId, data.heroId);
          rejectedGeneration = null;
          baseline = { data: { ...data, frame }, generation, sequence, baselineSequence: sequence };
          reason = "Validated registration retained; waiting for a supported fresh first-UTG boundary.";
          return receipt("registration", frame);
        }
        if (!previous || !contiguous) throw new Error("No valid registered baseline or consecutive local sequence in this generation.");
        if (data.heroId !== previous.data.heroId) throw new Error("Conflicting source hero identity.");
        if (data.event === "rup" && previous.data.event === "registered") {
          const frame = initializeUtgState(data.frame, tableId, data.heroId!);
          if (!equivalent(frame, previous.data.frame)) throw new Error("Bootstrap rup differs from the registered projection; no refresh/backfill proof.");
          baseline = { data: { ...data, frame }, generation, sequence, baselineSequence: previous.baselineSequence };
          reason = "Equivalent immediate bootstrap rup validated; waiting for linked updates and a fresh hand boundary.";
          return receipt("equivalent_refresh", frame);
        }
        // Only the identical, immediate bootstrap refresh above is supported.
        if (data.event !== "gC") throw new Error("Full rup/registration refresh invalidates carried continuity; no backfill proof.");
        const frame = advanceUtgState(previous.data.frame, data.frame, tableId, data.heroId!);
        const flopAnchor = firstUtg(previous.data, data, tableId, generation, observedAt);
        const flopAdvanced = flopPending ? advanceFlopWindow(flopPending, data, previous.data.frame, frame, sequence, observedAt) : null;
        flopPending = flopAnchor?.openingSizeProfile && equivalent(data.flopBoundary, { mR: 4, cHB: 2 }) ? { witness: flopAnchor, step: 0, observations: [],
          anchor: { sequence, cursor: flopAnchor.cursor, receivedAt: observedAt } } : flopAdvanced?.pending ?? null;
        flopProof = flopAdvanced?.proof ? { ...flopAdvanced.proof,
          continuity: { status: "validated_prefix", baselineSequence: previous.baselineSequence,
            throughSequence: sequence, generation, tableId, handId: frame.hI, cursor: frame.now } } : null;
        const anchor = firstUtg(previous.data, data, tableId, generation, observedAt, "HJ");
        // An observed UTG browser can certify the public transition, but only an
        // independently cross-checked current HJ/CO hero may consume its context.
        const facingAnchor = anchor ?? firstUtg(previous.data, data, tableId, generation, observedAt)
          ?? firstUtg(previous.data, data, tableId, generation, observedAt, "CO");
        const facingAdvanced = facingPending
          ? advanceFacingOpenWindow(facingPending, data, previous.data.frame, frame, sequence, observedAt) : null;
        facingPending = facingAnchor ? { witness: facingAnchor, anchor: { sequence, cursor: facingAnchor.cursor,
          receivedAt: observedAt, firstActorId: facingAnchor.players.find(p => p.position === "UTG")!.playerId } }
          : facingAdvanced?.pending ?? null;
        facingProof = facingAdvanced?.proof ? { ...facingAdvanced.proof,
          continuity: { status: "validated_prefix", baselineSequence: previous.baselineSequence,
            throughSequence: sequence, generation, tableId, handId: frame.hI, cursor: frame.now } } : null;
        coFacingProof = facingAdvanced?.coProof ? { ...facingAdvanced.coProof,
          continuity: { status: "validated_prefix", baselineSequence: previous.baselineSequence,
            throughSequence: sequence, generation, tableId, handId: frame.hI, cursor: frame.now } } : null;
        // Keep historical HJ activation for the immediately next accepted CALL,
        // independent of its advice expiry. All unsupported updates clear it.
        if (coFacingProof) facingPending = null;
        const advanced = hjPending ? advanceHjWindow(hjPending, data, sequence, observedAt) : null;
        hjPending = anchor ? { witness: anchor, anchor: { sequence, cursor: anchor.cursor, receivedAt: observedAt,
          firstActorId: anchor.players.find(p => p.position === "UTG")!.playerId } } : advanced?.pending ?? null;
        hjProof = advanced?.proof ? { ...advanced.proof,
          continuity: { status: "validated_prefix", baselineSequence: previous.baselineSequence,
            throughSequence: sequence, generation, tableId, handId: frame.hI, cursor: frame.now } } : null;
        if (hjProof) hjPending = null; // No same-decision renewal or later-position reuse.
        hjReason = hjProof ? "Explicit UTG fold and immediately linked HJ first turn proven; live cross-checks still required."
          : anchor ? "Frozen six-player HJ hand anchor; waiting for the next explicit UTG fold."
          : advanced ? "Explicit UTG fold accepted; waiting for the immediately linked HJ activation."
          : "No supported consecutive boundary -> UTG fold -> HJ turn; unsupported updates invalidate this window.";
        const coAnchor = firstUtg(previous.data, data, tableId, generation, observedAt, "CO");
        const coAdvanced = coPending ? advanceCoWindow(coPending, data, sequence, observedAt) : null;
        coPending = coAnchor ? { witness: coAnchor, folds: [], anchor: {
          sequence, cursor: coAnchor.cursor, receivedAt: observedAt,
          firstActorId: coAnchor.players.find(p => p.position === "UTG")!.playerId,
        } } : coAdvanced?.pending ?? null;
        coProof = coAdvanced?.proof ? { ...coAdvanced.proof,
          continuity: { status: "validated_prefix", baselineSequence: previous.baselineSequence,
            throughSequence: sequence, generation, tableId, handId: frame.hI, cursor: frame.now } } : null;
        if (coProof) coPending = null;
        coReason = coProof ? "Explicit UTG/HJ folds and linked first CO turn proven; live cross-checks still required."
          : coAnchor ? "Frozen CO anchor; waiting for explicit UTG fold, HJ turn/fold and CO turn."
          : coAdvanced ? "Supported CO prefix retained; waiting for the next exact fold/turn transition."
          : "No consecutive boundary -> UTG fold -> HJ turn -> HJ fold -> CO turn; unsupported updates invalidate this window.";
        const btnAnchor = firstUtg(previous.data, data, tableId, generation, observedAt, "BTN");
        const btnAdvanced = btnPending ? advanceBtnWindow(btnPending, data, sequence, observedAt) : null;
        btnPending = btnAnchor ? { witness: btnAnchor, folds: [], anchor: {
          sequence, cursor: btnAnchor.cursor, receivedAt: observedAt,
          firstActorId: btnAnchor.players.find(p => p.position === "UTG")!.playerId,
        } } : btnAdvanced?.pending ?? null;
        btnProof = btnAdvanced?.proof ? { ...btnAdvanced.proof,
          continuity: { status: "validated_prefix", baselineSequence: previous.baselineSequence,
            throughSequence: sequence, generation, tableId, handId: frame.hI, cursor: frame.now } } : null;
        if (btnProof) btnPending = null;
        btnReason = btnProof ? "Explicit UTG/HJ/CO folds and linked first BTN turn proven; live cross-checks still required."
          : btnAnchor ? "Frozen BTN anchor; waiting for explicit UTG fold, HJ turn/fold, CO turn/fold and BTN turn."
          : btnAdvanced ? "Supported BTN prefix retained; waiting for the next exact fold/turn transition."
          : "No consecutive boundary -> UTG fold -> HJ turn -> HJ fold -> CO turn -> CO fold -> BTN turn; unsupported updates invalidate this window.";
        const sbAnchor = firstUtg(previous.data, data, tableId, generation, observedAt, "SB");
        const sbAdvanced = sbPending ? advanceSbWindow(sbPending, data, sequence, observedAt) : null;
        sbPending = sbAnchor ? { witness: sbAnchor, folds: [], anchor: {
          sequence, cursor: sbAnchor.cursor, receivedAt: observedAt,
          firstActorId: sbAnchor.players.find(p => p.position === "UTG")!.playerId,
        } } : sbAdvanced?.pending ?? null;
        sbProof = sbAdvanced?.proof ? { ...sbAdvanced.proof,
          continuity: { status: "validated_prefix", baselineSequence: previous.baselineSequence,
            throughSequence: sequence, generation, tableId, handId: frame.hI, cursor: frame.now } } : null;
        if (sbProof) sbPending = null;
        sbReason = sbProof ? "Explicit UTG/HJ/CO/BTN folds and linked first SB turn proven; live cross-checks still required."
          : sbAnchor ? "Frozen SB anchor; waiting for explicit UTG fold, HJ/CO/BTN turns and folds, then SB turn."
          : sbAdvanced ? "Supported SB prefix retained; waiting for the next exact fold/turn transition."
          : "No consecutive boundary -> UTG fold -> HJ turn -> HJ fold -> CO turn -> CO fold -> BTN turn -> BTN fold -> SB turn; unsupported updates invalidate this window.";
        witness = firstUtg(previous.data, data, tableId, generation, observedAt);
        if (witness) lastCertificate = { handId: witness.handId, generation, issuedBySequence: sequence,
          receivedAt: witness.receivedAt, expiresAt: witness.receivedAt + 10_000, invalidation: null };
        baseline = { data: { ...data, frame }, generation, sequence, baselineSequence: previous.baselineSequence };
        reason = witness ? "First-UTG boundary proven from consecutive bounded source state; synchronous DOM and freshness checks still required."
          : "Validated source state carried forward; this update is not a supported first-UTG boundary.";
      } catch (error) { reject(error instanceof Error ? error.message : "Unsupported source mutation."); }
    },
    reset() { invalidateWitness("Source disconnect, reader gap or reset invalidated first-UTG evidence.", null); facingPending = null; flopPending = null; hjPending = null; hjReason = "Source disconnected/reset."; coPending = null; coReason = "Source disconnected/reset."; btnPending = null; btnReason = "Source disconnected/reset."; sbPending = null; sbReason = "Source disconnected/reset."; baseline = null; rejectedGeneration = lastGeneration; reason = "Source disconnect, reader gap or reset invalidated first-UTG evidence."; },
    snapshot() { return currentProof()?.witness ?? null; },
    proof: currentProof,
    flopProof() { return flopProof && baseline && now() >= flopProof.witness.receivedAt && now() < flopProof.expiresAt &&
      baseline.generation === flopProof.witness.generation && baseline.data.frame.hI === flopProof.witness.handId &&
      baseline.data.frame.now === flopProof.witness.cursor ? structuredClone(flopProof) : null; },
    facingOpenProof() { return facingProof && baseline && now() >= facingProof.witness.receivedAt && now() < facingProof.expiresAt &&
      baseline.generation === facingProof.witness.generation && baseline.data.frame.hI === facingProof.witness.handId &&
      baseline.data.frame.now === facingProof.witness.cursor ? structuredClone(facingProof) : null; },
    coFacingOpenProof() { return coFacingProof && baseline && now() >= coFacingProof.witness.receivedAt && now() < coFacingProof.expiresAt &&
      baseline.generation === coFacingProof.witness.generation && baseline.data.frame.hI === coFacingProof.witness.handId &&
      baseline.data.frame.now === coFacingProof.witness.cursor ? structuredClone(coFacingProof) : null; },
    hjProof() { return hjProof && baseline && now() >= hjProof.witness.receivedAt && now() < hjProof.expiresAt &&
      baseline.generation === hjProof.witness.generation && baseline.data.frame.hI === hjProof.witness.handId &&
      baseline.data.frame.now === hjProof.witness.cursor ? structuredClone(hjProof) : null; },
    coProof() { return coProof && baseline && now() >= coProof.witness.receivedAt && now() < coProof.expiresAt &&
      baseline.generation === coProof.witness.generation && baseline.data.frame.hI === coProof.witness.handId &&
      baseline.data.frame.now === coProof.witness.cursor ? structuredClone(coProof) : null; },
    btnProof() { return btnProof && baseline && now() >= btnProof.witness.receivedAt && now() < btnProof.expiresAt &&
      baseline.generation === btnProof.witness.generation && baseline.data.frame.hI === btnProof.witness.handId &&
      baseline.data.frame.now === btnProof.witness.cursor ? structuredClone(btnProof) : null; },
    sbProof() { return sbProof && baseline && now() >= sbProof.witness.receivedAt && now() < sbProof.expiresAt &&
      baseline.generation === sbProof.witness.generation && baseline.data.frame.hI === sbProof.witness.handId &&
      baseline.data.frame.now === sbProof.witness.cursor ? structuredClone(sbProof) : null; },
    diagnostic() {
      const currentTime = now();
      const certificate = lastCertificate ? structuredClone(lastCertificate) : null;
      const status = !certificate ? "not_issued" : currentTime < certificate.receivedAt ? "clock_regression"
        : certificate.invalidation && certificate.invalidation.at <= certificate.expiresAt ? "invalidated"
        : currentTime > certificate.expiresAt ? "expired" : certificate.invalidation ? "invalidated" : "fresh";
      return { scope: "Bounded production projection and validated state reducer. Never proves whole-hand history.",
        coFacingOpenWindow: { scope: "Closed hand238 historical prefix; no CO action authorization",
          transitions: structuredClone(coFacingProof?.transitions ??
            (facingPending?.call ? [facingPending.transition!, facingPending.call] : facingPending?.transition ? [facingPending.transition] : [])),
          hjActivation: structuredClone(coFacingProof?.hjActivation ?? facingPending?.hjActivation ?? null),
          expiresAt: coFacingProof?.expiresAt ?? null },
        facingOpenWindow: { scope: "Context only; no CALL/FOLD/3-BET authorization",
          reason: facingProof ? now() >= facingProof.expiresAt ? "HJ-facing-open proof expired." : "Accepted UTG open5 then explicit HJ activation; live cross-check required."
            : facingPending?.call ? "Accepted HJ call5; awaiting the immediately linked CO activation."
            : facingPending?.hjActivation ? "Historical HJ activation retained; awaiting the immediately next accepted CALL. No advice renewal."
            : facingPending?.transition ? "Accepted UTG open5; awaiting the immediately linked HJ activation."
            : facingPending ? "Frozen anchor; awaiting exact hand169 opening transition."
            : "No supported consecutive boundary -> UTG open5 -> HJ turn.",
          transition: facingPending?.transition ?? facingProof?.transitions[0] ?? null,
          expiresAt: facingProof?.expiresAt ?? null },
        freshness: { scope: "Latest issued source certificate only; diagnostic history is not actionable proof. Other live gates still apply.",
          status, certificate, ageMs: certificate ? currentTime - certificate.receivedAt : null,
          remainingMs: certificate && status === "fresh" ? Math.max(0, certificate.expiresAt - currentTime) : 0,
          sameDecisionRenewalSupported: false as const,
          missingRenewalEvidence: "No verified fresh server decision snapshot/acknowledgment binds this hand, first-action window and actor to a current request or authoritative decision version. Cached state, cursor continuity and receive time are insufficient." },
        hjWindow: { reason: hjProof && now() >= hjProof.expiresAt ? "HJ proof expired at its original activation deadline." : hjReason,
          anchor: hjPending?.anchor ?? hjProof?.anchor ?? null, expiresAt: hjProof?.expiresAt ?? null },
        coWindow: { reason: coProof && now() >= coProof.expiresAt ? "CO proof expired at its original activation deadline." : coReason,
          anchor: coPending?.anchor ?? coProof?.anchor ?? null, expiresAt: coProof?.expiresAt ?? null },
        btnWindow: { reason: btnProof && now() >= btnProof.expiresAt ? "BTN proof expired at its original activation deadline." : btnReason,
          anchor: btnPending?.anchor ?? btnProof?.anchor ?? null, expiresAt: btnProof?.expiresAt ?? null },
        sbWindow: { reason: sbProof && now() >= sbProof.expiresAt ? "SB proof expired at its original activation deadline." : sbReason,
          anchor: sbPending?.anchor ?? sbProof?.anchor ?? null, expiresAt: sbProof?.expiresAt ?? null },
        reason: witness && now() - witness.receivedAt > 10_000 ? "First-UTG witness expired after 10 seconds; original receive time is not renewed." : reason,
        observations: structuredClone(observations), droppedObservations, retainedCharacters,
        carriedState: baseline ? { generation: baseline.generation, sequence: baseline.sequence, projection: structuredClone(baseline.data) } : null,
        limits: { observations: 96, characters: 300_000 }, historyComplete: false as const };
    },
  };
}
