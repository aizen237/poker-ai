/** Wire metadata is validated before it can disappear from the gameplay view.
 * These are observation rules for saved 0.1.72 captures, not a protocol schema.
 * In particular dAC/network flags and future-participation flags are NOT
 * assumed to be arbitrary cosmetic booleans.
 */
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const count = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const text = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
const dictionary = (v: unknown): v is Record<string, any> => object(v) && Object.keys(v).length <= 10 &&
  Object.keys(v).every(k => /^[A-Za-z0-9_-]{1,160}$/.test(k) && !["__proto__", "prototype", "constructor"].includes(k));
const playerFields = new Set(["id", "stack", "status", "disconnectedSince"]);
const profile: Record<string, (v: unknown) => boolean> = {
  name: v => text(v, 160), avatarID: v => v === null,
  winCount: count, quitCount: count,
  dAC: v => v === false, isNetworkPlayer: v => typeof v === "boolean",
};
const descriptions = new Set(["name1", "name2", "name1RH", "name2RH", "prob1"]);
const common = new Set("now pre eventsData mEV fV sN players".split(" "));

export function normalizePostflopAncillary(raw: Record<string, any>, standingPlayer: string | null, hero: string | null, registration: boolean) {
  const normalized = structuredClone(raw), referenced = new Set<string>(), participation = new Set<string>();
  // Saved standalone deletion updates have no gameplay mutation. Status/roster
  // transitions still use their independent, strict standing-player contract.
  const standalone = Object.keys(raw).every(k => common.has(k)) && object(raw.players) &&
    Object.values(raw.players).every(p => object(p) && Object.keys(p).every(k => !playerFields.has(k)));
  if (Object.hasOwn(raw, "players")) {
    if (!dictionary(raw.players)) throw new Error("players: expected a bounded player dictionary");
    normalized.players = {};
    for (const [id, p] of Object.entries(raw.players)) {
      if (!object(p)) throw new Error("players.*: unsupported player replacement/deletion");
      const gameplay: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(p)) {
        if (playerFields.has(key)) { gameplay[key] = value; continue; }
        if (key === "sUNH" || key === "hideAway") {
          if (value !== "<D>" || id === hero || !(standingPlayer === id || standalone))
            throw new Error(`players.*.${key}: unsupported participation-flag transition`);
          if (standingPlayer !== id) participation.add(id);
        } else if (!Object.hasOwn(profile, key) || !profile[key]!(value) ||
            !registration && ["dAC", "isNetworkPlayer"].includes(key)) {
          throw new Error("players.*: unknown or malformed ancillary field");
        }
        referenced.add(id);
      }
      if (Object.keys(gameplay).length) normalized.players[id] = gameplay;
      else referenced.add(id);
    }
  }
  if (Object.hasOwn(raw, "pC")) {
    if (!dictionary(raw.pC)) throw new Error("pC: expected a bounded card dictionary");
    normalized.pC = {};
    for (const [id, hand] of Object.entries(raw.pC)) {
      if (!object(hand)) throw new Error("pC.*: expected a card record");
      for (const [key, value] of Object.entries(hand)) {
        if (key === "cards") continue;
        if (!descriptions.has(key) || value !== null && !text(value, 32))
          throw new Error("pC.*: unknown or malformed card description");
        referenced.add(id);
      }
      if (Object.hasOwn(hand, "cards")) normalized.pC[id] = { cards: hand.cards };
      else referenced.add(id);
    }
  }
  return { normalized, referenced: [...referenced], participation: [...participation] };
}

/** Match gameplay fields, independently of already validated empty metadata
 * dictionaries. Required gameplay members never become optional here. */
export function postflopShape(raw: Record<string, any>, required: string[], optional: Record<string, (v: unknown) => boolean> = {}) {
  return required.every(k => Object.hasOwn(raw, k)) && Object.entries(raw).every(([k, v]) =>
    required.includes(k) || Object.hasOwn(optional, k) && optional[k]!(v) ||
    k === "players" && object(v) && Object.values(v).every(p => object(p) && Object.keys(p).length === 0) ||
    k === "pC" && object(v) && Object.keys(v).length === 0);
}
