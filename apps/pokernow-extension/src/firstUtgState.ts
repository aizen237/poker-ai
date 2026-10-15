/** Bounded projection reducer, not a betting/action-history emulator.
 * Scalars/arrays replace; observed player-keyed dictionaries patch by ID.
 * A new hand replaces dealt-card membership rather than retaining old cards. */
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const token = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v) && !["__proto__", "prototype", "constructor"].includes(v);
const integer = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const chips = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= Number.MAX_SAFE_INTEGER;
const dictionary = (v: unknown): v is Record<string, any> => object(v) && Object.keys(v).length <= 10 && Object.keys(v).every(token);
const ids = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 10 && v.every(token) && new Set(v).size === v.length;
const allowed = new Set("id hI gN now pre r gT seats iHPI dealerID dealerSeat sBPI bBPI tB pGS cPI pITT smallBlind bigBlind ante deadButton gM mode aD aS cM cR players pC cRPI eventsData rHP rHC oTC gameResult".split(" "));
export type BoundedUtgState = Record<string, any>;

function validateFrame(frame: unknown): asserts frame is BoundedUtgState {
  if (!object(frame) || JSON.stringify(frame).length > 40_000) throw new Error("Malformed or oversized source projection.");
  for (const [k, v] of Object.entries(frame)) {
    if (!allowed.has(k)) throw new Error(`Unsupported projected field ${k}.`);
    let valid = true;
    if (["id", "hI", "dealerID", "sBPI", "bBPI"].includes(k)) valid = token(v);
    if (["cPI", "pITT"].includes(k)) valid = v === null || token(v);
    if (["gN", "now", "pre"].includes(k)) valid = integer(v);
    if (k === "dealerSeat") valid = integer(v) && v >= 1 && v <= 10;
    if (["smallBlind", "bigBlind"].includes(k)) valid = chips(v) && v > 0;
    if (k === "ante") valid = v === null || chips(v);
    if (["r", "deadButton", "aD", "aS", "cM", "cR"].includes(k)) valid = typeof v === "boolean";
    if (["gM", "mode"].includes(k)) valid = typeof v === "string" && v.length <= 32;
    if (k === "gT") valid = Array.isArray(v) && v.length === 2 && v.every(integer);
    if (["iHPI", "cRPI", "rHP"].includes(k)) valid = ids(v);
    if (k === "rHC") valid = v === null; // Runout variants remain unsupported.
    if (k === "eventsData") valid = Array.isArray(v) && v.length === 0;
    if (k === "gameResult") valid = v === "<D>"; // Only the retained boundary marker.
    if (k === "seats") valid = Array.isArray(v) && v.length <= 10 && v.every((s, i) => Array.isArray(s) && s.length === 2 &&
      integer(s[0]) && s[0] >= 1 && s[0] <= 10 && token(s[1]) && (i === 0 || v[i - 1][0] < s[0])) && new Set(v.map(s => s[1])).size === v.length;
    if (k === "oTC") valid = object(v) && Object.keys(v).length === 1 && Array.isArray(v["1"]) && v["1"].length <= 5 &&
      v["1"].every((c: unknown) => typeof c === "string" && /^[2-9TJQKA][shdc]$/.test(c));
    if (k === "tB") valid = dictionary(v) && Object.values(v).every(x => x === "<D>" || chips(x));
    if (k === "pGS") valid = dictionary(v) && Object.values(v).every(x => typeof x === "string" && ["inGame", "fold", "allIn", "<D>"].includes(x));
    if (k === "players") valid = dictionary(v) && Object.entries(v).every(([id, p]) => p === "<D>" || object(p) &&
      Object.entries(p).every(([field, value]) => field === "id" ? value === id : field === "stack" ? chips(value) :
        field === "status" ? typeof value === "string" && value.length <= 32 : field === "disconnectedSince" ? integer(value) || value === "<D>" : false));
    if (k === "pC") valid = dictionary(v) && Object.values(v).every(h => object(h) && Object.keys(h).length === 1 &&
      Array.isArray(h.cards) && h.cards.length === 2 && h.cards.every((c: any) => object(c) && Object.keys(c).every(f => ["value", "showing"].includes(f)) &&
        typeof c.showing === "boolean" && (c.value === null || typeof c.value === "string" && /^[2-9TJQKA][shdc]$/.test(c.value))));
    if (!valid) throw new Error(`Malformed or unsupported source ${k}.`);
  }
}

function validateState(state: BoundedUtgState, tableId: string, heroId: string) {
  validateFrame(state);
  if (state.id !== tableId || !token(state.hI) || !integer(state.gN) || state.gN < 1 || !integer(state.now) ||
      !Array.isArray(state.seats) || !dictionary(state.players) || !object(state.pGS) || !Array.isArray(state.gT) || !ids(state.iHPI) ||
      !object(state.pC) || !Object.hasOwn(state.players, heroId)) throw new Error("Incomplete registered/carried source identity or player state.");
  for (const [id, p] of Object.entries(state.players)) if (!object(p) || p.id !== id || !chips(p.stack) || typeof p.status !== "string") {
    throw new Error("Incomplete or contradictory source player identity/stack.");
  }
  if (state.seats.some((s: [number, string]) => !Object.hasOwn(state.players, s[1]))) throw new Error("Seat references an unavailable source player.");
  for (const key of ["pGS", "tB", "pC"]) {
    const missing = object(state[key]) && Object.keys(state[key]).find(id => !Object.hasOwn(state.players, id));
    if (missing) throw new Error(`Player-keyed source ${key}.${missing} references an unavailable player.`);
  }
  if (state.dealerID !== undefined && state.dealerSeat !== undefined && !state.seats.some((s: [number, string]) => s[0] === state.dealerSeat && s[1] === state.dealerID)) {
    throw new Error("Contradictory source dealer/seat assignment.");
  }
}

export function initializeUtgState(frame: unknown, tableId: string, heroId: string): BoundedUtgState {
  validateFrame(frame);
  const state = structuredClone(frame);
  validateState(state, tableId, heroId);
  return state;
}

export function advanceUtgState(previous: BoundedUtgState, patch: unknown, tableId: string, heroId: string): BoundedUtgState {
  validateFrame(patch);
  if (patch.r === true) throw new Error("Full-refresh/backfill continuity is not supported by the carried proof.");
  if (!integer(patch.now) || patch.now <= previous.now || patch.pre !== previous.now) throw new Error("Source predecessor mismatch, stale or replayed update.");
  if (Object.hasOwn(patch, "id") && patch.id !== tableId) throw new Error("Conflicting source table identity.");
  const changedHand = Object.hasOwn(patch, "hI") && patch.hI !== previous.hI || Object.hasOwn(patch, "gN") && patch.gN !== previous.gN;
  if (changedHand && (!token(patch.hI) || patch.hI === previous.hI || patch.gN !== previous.gN + 1 ||
      !Array.isArray(patch.iHPI) || !object(patch.pC) || !object(patch.tB) || JSON.stringify(patch.gT) !== "[1,0]")) {
    throw new Error("Conflicting or incomplete new-hand transition.");
  }
  const next = structuredClone(previous);
  const removed = Object.entries(patch.players ?? {}).filter(([, p]) => p === "<D>").map(([id]) => id);
  if (removed.length) {
    // Hand-121 seq 6: explicit player/pGS deletions accompany a complete
    // seats/iHPI/pC replacement. pC has no deletion marker for the departed ID.
    // Do not infer cleanup from a seat change or drop arbitrary stale entries.
    const roster = patch.iHPI;
    if (!Array.isArray(roster) || !Array.isArray(patch.seats) || !object(patch.pC) ||
        Object.keys(patch.pC).length !== roster.length || patch.seats.length !== roster.length ||
        !roster.every((id: string) => Object.hasOwn(patch.pC, id) && patch.seats.some((s: [number, string]) => s[1] === id)) ||
        removed.some(id => id === heroId || !Object.hasOwn(previous.players, id) || roster.includes(id) ||
          patch.pGS?.[id] !== "<D>" || Object.hasOwn(patch.pC, id))) {
      throw new Error("Player deletion lacks a consistent explicit roster/card snapshot and status deletion.");
    }
    // All card records below come from this patch, never the previous occupant.
    next.pC = {};
  }
  for (const [key, value] of Object.entries(patch)) {
    if (["players", "pGS", "tB", "pC"].includes(key)) {
      if (changedHand && ["tB", "pC"].includes(key)) next[key] = {};
      next[key] ??= {};
      for (const [id, entry] of Object.entries(value)) {
        if (entry === "<D>") { delete next[key][id]; continue; }
        if (key === "players") {
          next.players[id] = { ...next.players[id], ...structuredClone(entry as object) };
          if (next.players[id].disconnectedSince === "<D>") delete next.players[id].disconnectedSince;
        } else next[key][id] = structuredClone(entry);
      }
    } else next[key] = structuredClone(value);
  }
  validateState(next, tableId, heroId);
  if (removed.some(id => ["dealerID", "sBPI", "bBPI", "cPI", "pITT"].some(key => next[key] === id) ||
      ["cRPI", "rHP"].some(key => next[key]?.includes(id)))) {
    throw new Error("Deleted player remains referenced by source roles or actors.");
  }
  if (changedHand && (Object.keys(next.pC).length !== next.iHPI.length || !next.iHPI.every((id: string) => Object.hasOwn(next.pC, id)))) {
    throw new Error("Dealt-card membership contradicts the new-hand roster.");
  }
  if (changedHand && next.iHPI.length === 6 && next.seats.length === 6) {
    const dealer = next.seats.findIndex((s: [number, string]) => s[0] === next.dealerSeat && s[1] === next.dealerID);
    if (dealer < 0 || next.seats[(dealer + 1) % 6][1] !== next.sBPI || next.seats[(dealer + 2) % 6][1] !== next.bBPI) {
      throw new Error("Contradictory six-player dealer/blind traversal.");
    }
  }
  return next;
}
