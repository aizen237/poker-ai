import { projectFirstUtgSource, type UtgProjection } from "./firstUtgSource.js";
import { initializeUtgState, advanceUtgState, type BoundedUtgState } from "./firstUtgState.js";

const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const chips = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
// A CALL can settle near the decision deadline. Retain its evidence only for
// the next paid turn frame, never as a renewed decision or action authority.
const PAID_TURN_CONTINUITY_MS = 2_000;
const exact = (v: Record<string, any>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const common = "now pre eventsData mEV fV sN".split(" ");
const turn = [...common, "cPI", "sNA", "pASA", "pITT", "sNAA", "mAVTB"];
// Observed transport fields only. Unknown financial/return mutations invalidate
// the observation before sanitization; these flags never imply zero rake.
const fields = new Set(("id hI gN now pre r gT seats iHPI dealerID dealerSeat sBPI bBPI tB pGS cPI pITT smallBlind bigBlind ante deadButton gM mode oTC gameResult aD aS cM cR cRPI rHP rHC eventsData version fV nR mTB rIT sPM players pC sBS sNA pASA sNAA mAVTB wBACPI mEV sN mR cHB pot uP aGC aVC dSB gDM pTB sG lE lSPI pASA dLTWTB dLTWoTB ownerID status bigBlindCheck directToNexTurn recordChatForReplay allowStandaloneRebuy rH sPI tHC").split(" "));

interface RiverProjection {
  source: UtgProjection;
  pot?: number;
  standingUpPlayer?: string;
  kind: "other" | "river" | "turn_board" | "turn_board_carried_actor" | "flop_board" | "check" | "turn" | "bet" | "call";
  actor: string | null;
  amount: number | null;
}

/** Postflop normalization into the EXISTING bounded reducer. No changes to
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
    // Hand465 frame 2: a settled hand -> new hand excludes one standing player.
    // Only this closed status/deletion patch may discard these two UI flags;
    // the linked reducer below must independently confirm the hand/roster change.
    const standingUpShape = event === "gC" && same(raw.gT, [1, 0]) && raw.gameResult === "<D>" &&
      exact(raw, [...common, ..."gN gT hI mR nR pC tB cHB cPI oTC pGS rHP sBS sNA bBPI cRPI iHPI pASA pITT sBPI sNAA wBACPI players dealerID dealerSeat gameResult rHC".split(" ")]) &&
      object(raw.players) && Object.keys(raw.players).length === 1;
    const standingUpPlayer = standingUpShape ? Object.keys(raw.players)[0]! : null;
    const standingUp = standingUpPlayer !== null && standingUpPlayer !== knownHero && object(raw.players[standingUpPlayer]) &&
      exact(raw.players[standingUpPlayer], ["status", "sUNH", "hideAway"]) &&
      raw.players[standingUpPlayer].status === "standingUp" && raw.players[standingUpPlayer].sUNH === "<D>" &&
      raw.players[standingUpPlayer].hideAway === "<D>";
    if (object(raw.players) && Object.values(raw.players).some(p => !object(p) ||
        !(standingUp && p === raw.players[standingUpPlayer!]) &&
        Object.keys(p).some(k => !["id", "stack", "status", "disconnectedSince", "dAC", "name", "avatarID", "winCount", "quitCount", "isNetworkPlayer"].includes(k)))) return null;
    if (object(raw.tB)) normalized.tB = Object.fromEntries(Object.entries(raw.tB).map(([id, n]) => [id, n === "check" ? 0 : n]));
    const source = projectFirstUtgSource("42" + JSON.stringify([event, event === "registered" ? { currentPlayer: payload.currentPlayer, gameState: normalized } : normalized]), knownHero);
    if (!source) return null;
    // Discard the unrelated profile recognizers; only their sanitized frame is used.
    const result: RiverProjection = { source: { event: source.event, heroId: source.heroId, frame: source.frame },
      ...(standingUp ? { standingUpPlayer: standingUpPlayer! } : {}),
      ...(Object.hasOwn(raw, "pot") ? { pot: raw.pot } : {}), kind: "other", actor: null, amount: null };
    const active = raw.cPI === raw.pITT && typeof raw.cPI === "string" && raw.sNA === null && raw.sNAA === null && raw.pASA === raw.now;
    if (exact(raw, turn) && active && chips(raw.mAVTB)) { result.kind = "turn"; result.actor = raw.cPI; }
    if (exact(raw, [...turn, "gT", "pC", "tB", "oTC", "cRPI", "players"]) && active &&
        (same(raw.gT, [1, 3]) || same(raw.gT, [1, 2])) && same(raw.cRPI, []) && same(raw.players, {}) &&
        object(raw.tB) && Object.values(raw.tB).every(v => v === "<D>")) result.kind = same(raw.gT, [1, 3]) ? "river" : "turn_board";
    // Reuse the collection/deal shape on every street. Paid streets publish pot
    // and stacks; a check/check deal above has no new chips to collect. Later
    // street variants are illustrative input support, not live certificates.
    const paidDeal = [...turn, "gT", "mR", "pC", "tB", "cHB", "oTC", "pot", "cRPI", "players"];
    // Hand435 omits bigBlindCheck on the paid flop deal. This is a separate
    // closed wire shape, not evidence that an absent flag means false. The
    // linked reducer still requires collection/stack reconciliation, cleared
    // wagers and a heads-up preflop -> flop boundary before opening a window.
    // Keep this explicit-actor omission shape flop-only; never accept true/null.
    const paidDealShape = exact(raw, [...paidDeal, "bigBlindCheck"]) && raw.bigBlindCheck === false ||
      same(raw.gT, [1, 1]) && exact(raw, paidDeal);
    // Hand465 is a DIFFERENT closed shape: both cPI and bigBlindCheck absent,
    // paid turn only. This is a candidate, never an actor inferred from pITT.
    // The receiver requires a matching explicit activation in this same hand/flop.
    const carriedTurnShape = event === "gC" && same(raw.gT, [1, 2]) && exact(raw, paidDeal.filter(k => k !== "cPI")) &&
      raw.pITT === source.heroId && raw.sNA === null && raw.sNAA === null && raw.pASA === raw.now;
    if ((paidDealShape && active || carriedTurnShape) &&
        [1, 2, 3].some(index => same(raw.gT, [1, index])) && raw.cHB === 0 && chips(raw.mR) && chips(raw.mAVTB) &&
        same(raw.cRPI, []) && object(raw.players) &&
        Object.values(raw.players).every(p => object(p) && exact(p, ["stack"]) && chips(p.stack)) &&
        object(raw.tB) && Object.values(raw.tB).every(v => v === "<D>"))
      result.kind = carriedTurnShape ? "turn_board_carried_actor" : raw.gT[1] === 1 ? "flop_board" : raw.gT[1] === 2 ? "turn_board" : "river";
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
      if (chips(amount) && amount > 0 && same(raw.pGS, {}) && same(raw.wBACPI, []) &&
          Array.isArray(raw.cRPI) && raw.cRPI.length === 2 && new Set(raw.cRPI).size === 2 && raw.cRPI.includes(actor) &&
          exact(raw, [...common, "tB", "pGS", "sNA", "cRPI", "pITT", "sNAA", "wBACPI"])) {
        result.kind = "call"; result.actor = actor; result.amount = amount;
      }
    }
    return result;
  } catch { return null; }
}

export interface RiverObservation {
  street: "flop" | "turn" | "river";
  tableId: string; handId: string; handNumber: number; heroId: string; heroCards: string[]; board: string[];
  generation: number; sequence: number; cursor: number; receivedAt: number; expiresAt: number;
  collectedPot: number; streetSubtotal: number; grossPotBeforeCall: number; payableCall: number;
  heroChecked: boolean;
  players: Array<{ playerId: string; seat: number; folded: boolean; contribution: number; remainingStack: number }>;
  historyComplete: false; liveAuthorized: false;
}

/** Decision-local observation, not a new authority/proof framework. Registration
 * and every linked patch use the existing reducer. A closed postflop check/bet/
 * activation window supplies price and gross display arithmetic only. */
export function createRiverObservation(tableId: string, now: () => number) {
  let state: BoundedUtgState | null = null, heroId: string | null = null;
  let sequence = 0, generation = 0, at = -1, pot: number | null = null;
  let pending: { step: number; street: RiverObservation["street"]; villain: string; base: BoundedUtgState; pot: number; bet: number } | null = null;
  let observation: RiverObservation | null = null;
  type ActorSource = { handId: string; handNumber: number; street: number[]; actor: string; cursor: number; expiresAt: number };
  let actorSource: ActorSource | null = null;
  let paidTurnBridge: { actor: ActorSource; callCursor: number; receivedAt: number; sequence: number; generation: number } | null = null;
  let reason = "Waiting for a continuous postflop source window.";
  const reset = () => { state = null; heroId = null; pot = null; pending = null; observation = null; actorSource = null; paidTurnBridge = null; reason = "Postflop observation invalidated; fresh registration is required."; };
  return {
    reset,
    accept(input: unknown, seq: unknown, gen: unknown, received: unknown) {
      observation = null; // Every new source frame invalidates; polling never renews.
      const bridge = paidTurnBridge;
      paidTurnBridge = null; // Single use: even an unrelated valid event consumes it.
      try {
        if (!object(input) || !chips(seq) || !chips(gen) || !chips(received) || received > now() || received < at ||
            now() - received >= 10_000 || !object(input.source)) throw new Error("Invalid receipt");
        const p = input as unknown as RiverProjection, s = p.source;
        if (!s.heroId || s.event !== "registered" && (seq !== sequence + 1 || gen !== generation || s.heroId !== heroId || !state) ||
            s.event === "registered" && gen <= generation) throw new Error("Discontinuous river source");
        const previous = state, previousPot = pot;
        state = s.event === "registered" ? initializeUtgState(s.frame, tableId, s.heroId) : advanceUtgState(state!, s.frame, tableId, s.heroId);
        if (p.standingUpPlayer !== undefined) {
          const id = p.standingUpPlayer;
          if (!previous || s.event !== "gC" || !same(previous.gT, [1, 5]) || !same(state.gT, [1, 0]) ||
              previous.hI === state.hI || state.gN !== previous.gN + 1 || id === s.heroId ||
              previous.players[id]?.status !== "inGame" || state.players[id]?.status !== "standingUp" ||
              !previous.iHPI.includes(id) || !same(state.iHPI, previous.iHPI.filter((player: string) => player !== id)) ||
              state.pGS[id] !== "fold" || Object.hasOwn(state.pC, id) ||
              !same(previous.seats, state.seats) || state.players[id].stack !== previous.players[id].stack ||
              [state.cPI, state.pITT, state.dealerID, state.sBPI, state.bBPI].includes(id))
            throw new Error("Unsupported standing-player hand boundary.");
        }
        heroId = s.heroId; sequence = seq; generation = gen; at = received;
        reason = "Continuous observations; waiting for a supported postflop check/bet/activation window.";
        // A new baseline/hand cannot borrow monetary evidence from the old one.
        if (s.event === "registered" || previous?.hI !== state.hI) { pending = null; pot = null; }
        if (s.event === "registered" || actorSource && (actorSource.handId !== state.hI || actorSource.handNumber !== state.gN ||
            actorSource.actor !== state.cPI)) actorSource = null;
        if (p.kind === "call" && actorSource && previous?.now === actorSource.cursor &&
            received < actorSource.expiresAt && now() < actorSource.expiresAt && state.now - actorSource.cursor < 10_000 &&
            actorSource.actor === heroId && same(actorSource.street, [1, 1]) &&
            previous.pITT === heroId && previous.cPI === heroId && p.actor === heroId && state.pITT === null &&
            same(state.gT, [1, 1]) && (previous.tB[heroId] === 0 || previous.tB[heroId] === undefined) &&
            chips(p.amount) && p.amount > 0 && state.cRPI.length === 2 && state.cRPI.includes(heroId) &&
            state.iHPI.filter((id: string) => state!.pGS[id] === "inGame").length === 2 &&
            state.cRPI.every((id: string) => state!.pGS[id] === "inGame" && state!.tB[id] === p.amount &&
              state!.players[id].stack > p.amount! && (id === heroId || previous.tB[id] === p.amount)))
          paidTurnBridge = { actor: actorSource, callCursor: state.now, receivedAt: received, sequence: seq, generation: gen };
        // An explicit activation is usable only by its immediately linked CALL.
        actorSource = p.kind === "turn" && typeof p.actor === "string" && p.actor === state.cPI && p.actor === state.pITT
          ? { handId: state.hI, handNumber: state.gN, street: [...state.gT], actor: p.actor, cursor: state.now, expiresAt: received + 10_000 }
          : null;
        if (p.pot !== undefined) { if (!chips(p.pot)) throw new Error("Invalid pot"); pot = p.pot; }
        if (s.event !== "registered" && previous && previous.hI === state.hI && !same(previous.gT, state.gT) &&
            [1, 2, 3].some(index => same(state!.gT, [1, index]))) {
          const collected = Object.values(previous.tB ?? {}).reduce<number>((sum, value) => sum + Number(value), 0);
          // Clearing wagers cannot silently carry an earlier street's pot or
          // undebited stacks into a new calculation, even for unsupported deal
          // shapes. An explicit new pot can establish the gross baseline when
          // no earlier pot was observed; never assume a missing baseline is zero.
          if (collected > 0 && (p.pot === undefined || p.pot < collected ||
              previousPot !== null && p.pot !== previousPot + collected ||
              Object.entries(previous.tB).some(([id, value]) => Number(value) > 0 &&
                state!.players[id]?.stack !== previous.players[id].stack - Number(value))))
            throw new Error("Postflop collection is missing or contradicts previous wagers, pot or stacks.");
        }
        if (p.kind === "turn_board_carried_actor") {
          // The original decision already ended at CALL. This short continuity
          // bridge proves only its immediate collection, using both clocks.
          if (!previous || Object.hasOwn(s.frame, "cPI") || !bridge || bridge.callCursor !== previous.now ||
              bridge.sequence + 1 !== seq || bridge.generation !== gen ||
              received - bridge.receivedAt >= PAID_TURN_CONTINUITY_MS || now() - bridge.receivedAt >= PAID_TURN_CONTINUITY_MS ||
              state.now - bridge.callCursor >= PAID_TURN_CONTINUITY_MS ||
              bridge.actor.handId !== state.hI || bridge.actor.handNumber !== state.gN || !same(bridge.actor.street, [1, 1]) ||
              bridge.actor.actor !== heroId || previous.cPI !== heroId || previous.pITT !== null || state.pITT !== heroId ||
              previous.hI !== state.hI || previous.gN !== state.gN || !same(previous.gT, [1, 1]) ||
              !same(previous.seats, state.seats) || !same(previous.iHPI, state.iHPI) || !same(previous.pGS, state.pGS) ||
              !same(previous.pC, state.pC) || previous.dealerID !== state.dealerID ||
              Object.entries(previous.players).some(([id, player]) => !same(state!.players[id],
                { ...(player as object), stack: previous.players[id].stack - (previous.tB[id] ?? 0) })) ||
              Object.keys(previous.tB).length !== 2 || !chips(previous.tB[heroId]) || previous.tB[heroId] <= 0 ||
              Object.entries(previous.tB).some(([id, amount]) => previous.pGS[id] !== "inGame" || amount !== previous.tB[s.heroId!]))
            throw new Error("Paid turn lacks a matching independently established flop actor.");
        }
        if (p.kind === "river" || p.kind === "turn_board" || p.kind === "turn_board_carried_actor" || p.kind === "flop_board") {
          const street = p.kind === "river" ? "river" : p.kind === "flop_board" ? "flop" : "turn";
          const streetIndex = street === "river" ? 3 : street === "turn" ? 2 : 1;
          const boardCount = streetIndex + 2, previousBoardCount = street === "flop" ? 0 : boardCount - 1;
          const active = state.iHPI.filter((id: string) => state!.pGS[id] === "inGame");
          const board = state.oTC?.["1"], cards = state.pC[heroId]?.cards.map((c: any) => c.value);
          if (!previous || !same(previous.gT, [1, streetIndex - 1]) || !same(state.gT, [1, streetIndex]) ||
              (street === "river" ? state.cPI !== heroId : !active.includes(state.cPI)) || state.pITT !== state.cPI ||
              state.gM !== "th" || state.version !== "0.1.72" || state.rIT !== "no" || state.sPM !== false || !same(state.rHP, []) ||
              !Array.isArray(board) || board.length !== boardCount || !same(previous.oTC?.["1"], board.slice(0, previousBoardCount)) ||
              !Array.isArray(cards) || cards.length !== 2 || cards.some(c => typeof c !== "string") || new Set([...board, ...cards]).size !== boardCount + 2 ||
              active.length !== 2 || !active.includes(heroId) || pot === null || pot <= 0 ||
              Object.keys(state.tB).length !== 0 || state.iHPI.length !== state.seats.length ||
              state.iHPI.some((id: string) => !state!.seats.some((r: any[]) => r[1] === id) || !["inGame", "fold"].includes(state!.pGS[id])) ||
              active.some((id: string) => state!.players[id].stack <= 0 || state!.players[id].disconnectedSince !== undefined)) {
            // An unsupported early street (e.g. still multiway) must not discard the
            // continuous reducer needed by a later supported river boundary.
            if (street !== "river") { pending = null; reason = `Unsupported ${street} boundary.`; return; }
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
          if (w.street !== "river") { pending = null; reason = `${w.street} window changed; illustration withheld.`; return; }
          throw new Error("River window changed");
        }
        if (w.step === 0 && p.kind === "check" && p.actor === heroId && previous?.cPI === heroId) w.step++;
        else if (w.step === 1 && p.kind === "turn" && p.actor === w.villain) w.step++;
        else if (w.step === 2 && p.kind === "bet" && p.actor === w.villain && previous?.pITT === w.villain && chips(p.amount) &&
            p.amount > 0 && p.amount < state.players[w.villain].stack && p.amount < state.players[heroId].stack) { w.bet = p.amount; w.step++; }
        else if (w.step === 3 && p.kind === "turn" && p.actor === heroId &&
            (state.tB[heroId] === 0 || w.street !== "river" && state.tB[heroId] === undefined) && state.tB[w.villain] === w.bet) {
          observation = { street: w.street, tableId, handId: state.hI, handNumber: state.gN, heroId, heroCards: state.pC[heroId].cards.map((c: any) => c.value),
            board: [...state.oTC["1"]], generation, sequence, cursor: state.now, receivedAt: received, expiresAt: received + 10_000,
            collectedPot: pot!, streetSubtotal: w.bet, grossPotBeforeCall: pot! + w.bet, payableCall: w.bet,
            heroChecked: w.base.cPI === heroId,
            players: state.seats.map(([seat, playerId]: [number, string]) => ({ seat, playerId, folded: state!.pGS[playerId] === "fold",
              contribution: state!.tB[playerId] ?? 0, remainingStack: state!.players[playerId].stack - (state!.tB[playerId] ?? 0) })),
            historyComplete: false, liveAuthorized: false };
          pending = null;
          reason = `Matched ${w.street} source window; gross arithmetic only, no contestable-pot or action authorization.`;
        } else if (w.street !== "river") {
          // Other valid early-street actions end this diagnostic window, but
          // retain the reducer for the pre-existing river implementation.
          pending = null; reason = `Unsupported ${w.street} action sequence; illustration withheld.`;
        } else throw new Error("Incomplete river window");
      } catch (error) { reset(); reason = error instanceof Error ? error.message : "River observation rejected."; }
    },
    snapshot() { return observation && now() >= observation.receivedAt && now() < observation.expiresAt ? structuredClone(observation) : null; },
    diagnostic() { return { reason: observation && (now() < observation.receivedAt || now() >= observation.expiresAt)
      ? "Postflop observation expired at its original activation deadline." : reason, sequence, generation }; },
  };
}
