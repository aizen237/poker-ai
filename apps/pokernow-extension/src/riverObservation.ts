import { projectFirstUtgSource, type UtgProjection } from "./firstUtgSource.js";
import { initializeUtgState, advanceUtgState, type BoundedUtgState } from "./firstUtgState.js";

const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const chips = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const exact = (v: Record<string, any>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const common = "now pre eventsData mEV fV sN".split(" ");
const turn = [...common, "cPI", "sNA", "pASA", "pITT", "sNAA", "mAVTB"];
// Observed transport fields only. Unknown financial/return mutations invalidate
// the observation before sanitization; these flags never imply zero rake.
const fields = new Set(("id hI gN now pre r gT seats iHPI dealerID dealerSeat sBPI bBPI tB pGS cPI pITT smallBlind bigBlind ante deadButton gM mode oTC gameResult aD aS cM cR cRPI rHP rHC eventsData version fV nR mTB rIT sPM players pC sBS sNA pASA sNAA mAVTB wBACPI mEV sN mR cHB pot uP aGC aVC dSB gDM pTB sG lE lSPI pASA dLTWTB dLTWoTB ownerID status bigBlindCheck directToNexTurn recordChatForReplay allowStandaloneRebuy rH sPI tHC").split(" "));

interface RiverProjection {
  source: UtgProjection;
  pot?: number;
  kind: "other" | "river" | "turn_board" | "check" | "turn" | "bet";
  actor: string | null;
  amount: number | null;
}

/** Turn/river normalization into the EXISTING bounded reducer. No changes to
 * preflop source grammar. No opponent cards, names or raw frames cross worlds. */
export function projectRiverObservation(data: unknown, knownHero: string | null): RiverProjection | null {
  if (typeof data !== "string" || data.length > 2_000_000 || !data.startsWith("42[")) return null;
  try {
    const [event, payload] = JSON.parse(data.slice(2));
    if (!["registered", "gC"].includes(event) || !object(payload)) return null;
    const raw = event === "registered" ? payload.gameState : payload;
    if (!object(raw) || Object.keys(raw).some(k => !fields.has(k)) ||
        !same(raw.eventsData, []) || raw.fV !== "0.1.72" || raw.mEV !== 0 ||
        !chips(raw.now) || !chips(raw.sN) || Object.hasOwn(raw, "pot") && !chips(raw.pot)) return null;
    const normalized = structuredClone(raw);
    if (object(raw.pC)) {
      normalized.pC = {};
      for (const [id, hand] of Object.entries(raw.pC)) {
        if (!object(hand) || Object.keys(hand).some(k => !["cards", "name1", "name2", "name1RH", "name2RH", "prob1"].includes(k))) return null;
        if (Object.hasOwn(hand, "cards")) normalized.pC[id] = hand;
        // Description-only patches preserve private cards; never synthesize them.
        else if (Object.values(hand).some(v => v !== null && (typeof v !== "string" || v.length > 32))) return null;
      }
    }
    if (object(raw.players) && Object.values(raw.players).some(p => !object(p) ||
        Object.keys(p).some(k => !["id", "stack", "status", "disconnectedSince", "dAC", "name", "avatarID", "winCount", "quitCount", "isNetworkPlayer"].includes(k)))) return null;
    if (object(raw.tB)) normalized.tB = Object.fromEntries(Object.entries(raw.tB).map(([id, n]) => [id, n === "check" ? 0 : n]));
    const source = projectFirstUtgSource("42" + JSON.stringify([event, event === "registered" ? { currentPlayer: payload.currentPlayer, gameState: normalized } : normalized]), knownHero);
    if (!source) return null;
    // Discard the unrelated profile recognizers; only their sanitized frame is used.
    const result: RiverProjection = { source: { event: source.event, heroId: source.heroId, frame: source.frame },
      ...(Object.hasOwn(raw, "pot") ? { pot: raw.pot } : {}), kind: "other", actor: null, amount: null };
    const active = raw.cPI === raw.pITT && typeof raw.cPI === "string" && raw.sNA === null && raw.sNAA === null && raw.pASA === raw.now;
    if (exact(raw, turn) && active && chips(raw.mAVTB)) { result.kind = "turn"; result.actor = raw.cPI; }
    if (exact(raw, [...turn, "gT", "pC", "tB", "oTC", "cRPI", "players"]) && active &&
        (same(raw.gT, [1, 3]) || same(raw.gT, [1, 2])) && same(raw.cRPI, []) && same(raw.players, {}) &&
        object(raw.tB) && Object.values(raw.tB).every(v => v === "<D>")) result.kind = same(raw.gT, [1, 3]) ? "river" : "turn_board";
    const action = raw.sNA === "NSAA" && raw.pITT === null && chips(raw.sNAA);
    if (action && object(raw.tB) && Object.keys(raw.tB).length === 1) {
      const [actor, amount] = Object.entries(raw.tB)[0]!;
      if (amount === "check" && exact(raw, [...common, "tB", "sNA", "cRPI", "pITT", "sNAA"]) && same(raw.cRPI, [actor])) {
        result.kind = "check"; result.actor = actor;
      }
      if (chips(amount) && amount > 0 && raw.cHB === amount && same(raw.pGS, {}) && same(raw.cRPI, [actor]) && same(raw.wBACPI, []) &&
          exact(raw, [...common, "mR", "tB", "cHB", "pGS", "sNA", "cRPI", "pITT", "sNAA", "wBACPI"])) {
        result.kind = "bet"; result.actor = actor; result.amount = amount;
      }
    }
    return result;
  } catch { return null; }
}

export interface RiverObservation {
  street: "turn" | "river";
  tableId: string; handId: string; handNumber: number; heroId: string; heroCards: string[]; board: string[];
  generation: number; sequence: number; cursor: number; receivedAt: number; expiresAt: number;
  collectedPot: number; streetSubtotal: number; grossPotBeforeCall: number; payableCall: number;
  players: Array<{ playerId: string; seat: number; folded: boolean; contribution: number; remainingStack: number }>;
  historyComplete: false; liveAuthorized: false;
}

/** Decision-local observation, not a new authority/proof framework. Registration
 * and every linked patch use the existing reducer. A closed turn/river check/bet/
 * activation window supplies price and gross display arithmetic only. */
export function createRiverObservation(tableId: string, now: () => number) {
  let state: BoundedUtgState | null = null, heroId: string | null = null;
  let sequence = 0, generation = 0, at = -1, pot: number | null = null;
  let pending: { step: number; street: "turn" | "river"; villain: string; base: BoundedUtgState; pot: number; bet: number } | null = null;
  let observation: RiverObservation | null = null;
  let reason = "Waiting for a continuous turn/river source window.";
  const reset = () => { state = null; heroId = null; pot = null; pending = null; observation = null; reason = "Turn/river observation invalidated; fresh registration is required."; };
  return {
    reset,
    accept(input: unknown, seq: unknown, gen: unknown, received: unknown) {
      observation = null; // Every new source frame invalidates; polling never renews.
      try {
        if (!object(input) || !chips(seq) || !chips(gen) || !chips(received) || received > now() || received < at ||
            now() - received >= 10_000 || !object(input.source)) throw new Error("Invalid receipt");
        const p = input as unknown as RiverProjection, s = p.source;
        if (!s.heroId || s.event !== "registered" && (seq !== sequence + 1 || gen !== generation || s.heroId !== heroId || !state) ||
            s.event === "registered" && gen <= generation) throw new Error("Discontinuous river source");
        const previous = state;
        state = s.event === "registered" ? initializeUtgState(s.frame, tableId, s.heroId) : advanceUtgState(state!, s.frame, tableId, s.heroId);
        heroId = s.heroId; sequence = seq; generation = gen; at = received;
        reason = "Continuous observations; waiting for a supported turn/river check/bet/activation window.";
        // A new baseline/hand cannot borrow monetary evidence from the old one.
        if (s.event === "registered" || previous?.hI !== state.hI) { pending = null; pot = null; }
        if (p.pot !== undefined) { if (!chips(p.pot)) throw new Error("Invalid pot"); pot = p.pot; }
        if (p.kind === "river" || p.kind === "turn_board") {
          const street = p.kind === "river" ? "river" : "turn", streetIndex = street === "river" ? 3 : 2;
          const boardCount = street === "river" ? 5 : 4;
          const active = state.iHPI.filter((id: string) => state!.pGS[id] === "inGame");
          const board = state.oTC?.["1"], cards = state.pC[heroId]?.cards.map((c: any) => c.value);
          if (!previous || !same(previous.gT, [1, streetIndex - 1]) || !same(state.gT, [1, streetIndex]) ||
              (street === "river" ? state.cPI !== heroId : !active.includes(state.cPI)) || state.pITT !== state.cPI ||
              state.gM !== "th" || state.version !== "0.1.72" || state.rIT !== "no" || state.sPM !== false || !same(state.rHP, []) ||
              !Array.isArray(board) || board.length !== boardCount || !same(previous.oTC?.["1"], board.slice(0, boardCount - 1)) ||
              !Array.isArray(cards) || cards.length !== 2 || cards.some(c => typeof c !== "string") || new Set([...board, ...cards]).size !== boardCount + 2 ||
              active.length !== 2 || !active.includes(heroId) || pot === null || pot <= 0 ||
              Object.keys(state.tB).length !== 0 || state.iHPI.length !== state.seats.length ||
              state.iHPI.some((id: string) => !state!.seats.some((r: any[]) => r[1] === id) || !["inGame", "fold"].includes(state!.pGS[id])) ||
              active.some((id: string) => state!.players[id].stack <= 0 || state!.players[id].disconnectedSince !== undefined)) {
            // An unsupported turn (e.g. still multiway) must not discard the
            // continuous reducer needed by a later supported river boundary.
            if (street === "turn") { pending = null; reason = "Unsupported turn boundary."; return; }
            throw new Error("Unsupported river boundary");
          }
          pending = { step: state.cPI === heroId ? 0 : 2, street, villain: active.find((id: string) => id !== heroId), base: structuredClone(state), pot, bet: 0 };
          return;
        }
        if (!pending) return;
        const w = pending;
        if (state.hI !== w.base.hI || pot !== w.pot || !same(state.seats, w.base.seats) ||
            !same(state.pGS, w.base.pGS) || !same(state.pC, w.base.pC) || !same(state.players, w.base.players) ||
            !same(state.oTC, w.base.oTC) || !same(state.gT, w.base.gT)) {
          if (w.street === "turn") { pending = null; reason = "Turn window changed; illustration withheld."; return; }
          throw new Error("River window changed");
        }
        if (w.step === 0 && p.kind === "check" && p.actor === heroId && previous?.cPI === heroId) w.step++;
        else if (w.step === 1 && p.kind === "turn" && p.actor === w.villain) w.step++;
        else if (w.step === 2 && p.kind === "bet" && p.actor === w.villain && previous?.pITT === w.villain && chips(p.amount) &&
            p.amount > 0 && p.amount < state.players[w.villain].stack && p.amount < state.players[heroId].stack) { w.bet = p.amount; w.step++; }
        else if (w.step === 3 && p.kind === "turn" && p.actor === heroId &&
            (state.tB[heroId] === 0 || w.street === "turn" && state.tB[heroId] === undefined) && state.tB[w.villain] === w.bet) {
          observation = { street: w.street, tableId, handId: state.hI, handNumber: state.gN, heroId, heroCards: state.pC[heroId].cards.map((c: any) => c.value),
            board: [...state.oTC["1"]], generation, sequence, cursor: state.now, receivedAt: received, expiresAt: received + 10_000,
            collectedPot: pot!, streetSubtotal: w.bet, grossPotBeforeCall: pot! + w.bet, payableCall: w.bet,
            players: state.seats.map(([seat, playerId]: [number, string]) => ({ seat, playerId, folded: state!.pGS[playerId] === "fold",
              contribution: state!.tB[playerId] ?? 0, remainingStack: state!.players[playerId].stack - (state!.tB[playerId] ?? 0) })),
            historyComplete: false, liveAuthorized: false };
          pending = null;
          reason = `Matched ${w.street} source window; gross arithmetic only, no contestable-pot or action authorization.`;
        } else if (w.street === "turn") {
          // Other valid turn actions end this narrow diagnostic window, but
          // retain the reducer for the pre-existing river implementation.
          pending = null; reason = "Unsupported turn action sequence; illustration withheld.";
        } else throw new Error("Incomplete river window");
      } catch (error) { reset(); reason = error instanceof Error ? error.message : "River observation rejected."; }
    },
    snapshot() { return observation && now() >= observation.receivedAt && now() < observation.expiresAt ? structuredClone(observation) : null; },
    diagnostic() { return { reason: observation && (now() < observation.receivedAt || now() >= observation.expiresAt)
      ? "Turn/river observation expired at its original activation deadline." : reason, sequence, generation }; },
  };
}
