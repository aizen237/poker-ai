/** Scoped source witness for the captured registration -> first UTG hand-start
 * transition. No general patch reducer or full action-history claim. */
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const token = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
const integer = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const keys = ["id", "hI", "gN", "now", "pre", "r", "gT", "seats", "iHPI", "dealerID", "dealerSeat", "sBPI", "bBPI",
  "tB", "pGS", "cPI", "pITT", "smallBlind", "bigBlind", "ante", "deadButton", "gM", "mode", "oTC", "gameResult",
  "aD", "aS", "cM", "cR", "cRPI", "rHP", "rHC", "eventsData"];
export interface UtgProjection { event: "registered" | "gC" | "rup"; heroId: string | null; frame: Record<string, any> }

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
    const frame: Record<string, any> = {};
    for (const key of keys) if (Object.hasOwn(raw, key)) frame[key] = raw[key];
    if (p[0] === "registered") delete frame.gameResult;
    if (Object.hasOwn(raw, "players")) {
      if (!object(raw.players) || Object.keys(raw.players).length > 10) return null;
      frame.players = Object.fromEntries(Object.entries(raw.players).map(([id, player]) => [id, object(player)
        ? Object.fromEntries(["id", "stack", "status", "disconnectedSince"].filter(k => Object.hasOwn(player, k)).map(k => [k, player[k]])) : player]));
    }
    if (Object.hasOwn(raw, "pC")) {
      if (!object(raw.pC) || Object.keys(raw.pC).length > 10) return null;
      frame.pC = Object.fromEntries(Object.entries(raw.pC).map(([id, hand]) => [id, object(hand) && Array.isArray(hand.cards)
        ? { cards: hand.cards.map((c: unknown) => object(c) ? { value: id === heroId ? c.value : null, showing: c.showing } : c) } : hand]));
    }
    const result = { event: p[0], heroId: token(heroId) ? heroId : null, frame };
    return JSON.stringify(result).length <= 40_000 ? result : null;
  } catch { return null; }
}

export interface FirstUtgWitness {
  tableId: string; handId: string; handNumber: number; generation: number; cursor: number; previousCursor: number;
  receivedAt: number; heroId: string; heroSeat: number; heroCards: string[]; smallBlind: number; bigBlind: number;
  players: Array<{ playerId: string; seat: number; position: "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB"; sourceStack: number; contribution: number }>;
  provenance: string;
}

function firstUtg(reg: UtgProjection, next: UtgProjection, tableId: string, generation: number, at: number): FirstUtgWitness | null {
  const a = reg.frame, b = next.frame, hero = reg.heroId;
  if (!hero || reg.event !== "registered" || next.event !== "gC" || a.id !== tableId ||
      (Object.hasOwn(b, "id") && b.id !== tableId) || b.r === true || next.heroId !== hero ||
      !integer(a.now) || !integer(b.now) || b.pre !== a.now || b.now <= a.now ||
      !integer(a.gN) || b.gN !== a.gN + 1 || !token(a.hI) || !token(b.hI) || a.hI === b.hI ||
      !same(a.gT, [1, 5]) || !same(b.gT, [1, 0]) || !same(b.oTC, { "1": [] }) || b.gameResult !== "<D>" ||
      b.cPI !== hero || b.pITT !== hero || !same(b.cRPI, []) || !same(b.eventsData, []) ||
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
  if (cycle[1]![1] !== b.sBPI || cycle[2]![1] !== b.bBPI || cycle[3]![1] !== hero ||
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
    heroId: hero, heroSeat: cycle[3]![0], heroCards, smallBlind: 1, bigBlind: 2, players,
    provenance: `PokerNow direct hand-start ${a.hI}/${a.gN} -> ${b.hI}/${b.gN}, pre=${b.pre}, now=${b.now}; first UTG turn has no preceding voluntary turn; forced blinds only. Hand-53 observed source profile.` };
}

/** A later update of ANY kind expires the witness. No inferred update reducer. */
export function createFirstUtgSource(tableId: string, now: () => number) {
  let baseline: { data: UtgProjection; generation: number; sequence: number } | null = null;
  let witness: FirstUtgWitness | null = null;
  let lastSequence = -1;
  let lastGeneration = 0;
  return {
    accept(raw: unknown, sequence: unknown, generation: unknown, observedAt: unknown) {
      if (!integer(sequence) || !integer(generation) || generation < 1) { witness = null; baseline = null; return; }
      if (sequence <= lastSequence) return; // Same local delivery replay does not refresh time.
      witness = null;
      const previous = baseline; baseline = null;
      const contiguous = sequence === lastSequence + 1 && generation === lastGeneration;
      lastSequence = sequence;
      if (generation < lastGeneration) return;
      lastGeneration = generation;
      if (!integer(observedAt) || observedAt > now() || !object(raw) || !object(raw.frame) || JSON.stringify(raw).length > 40_000 || !["registered", "gC", "rup"].includes(raw.event)) return;
      const data = raw as unknown as UtgProjection;
      if (data.event === "registered") { baseline = { data: structuredClone(data), generation, sequence }; return; }
      if (previous && contiguous) {
        try { witness = firstUtg(previous.data, data, tableId, generation, observedAt); } catch { witness = null; }
      }
    },
    reset() { witness = null; baseline = null; },
    snapshot() { return witness && now() >= witness.receivedAt && now() - witness.receivedAt <= 10_000 ? structuredClone(witness) : null; },
  };
}
