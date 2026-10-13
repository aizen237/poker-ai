/** Contract inspected in PokerNow's public game bundle; NOT live schema certification. */
export const TIMELINE_CHANNEL = "poker-ai:hand-source:v1";
export interface HandIdentityEvidence {
  tableId: string;
  handId: string;
  handNumber: number;
  heroPlayerId: string | null;
  frameCursor: string | number | null;
  chainGap: boolean;
  source: "registered.gameState" | "rup" | "gC";
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const token = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
export function tableIdFromPath(path: string): string | null {
  return /^\/games\/([A-Za-z0-9_-]{1,160})\/?$/.exec(path)?.[1] ?? null;
}
export function validHandIdentity(value: unknown, tableId: string): value is HandIdentityEvidence {
  return object(value) && value.tableId === tableId && token(value.handId) && Number.isSafeInteger(value.handNumber) && Number(value.handNumber) > 0 &&
    (value.heroPlayerId === null || token(value.heroPlayerId)) &&
    (value.frameCursor === null || typeof value.frameCursor === "string" && value.frameCursor.length < 160 || typeof value.frameCursor === "number" && Number.isSafeInteger(value.frameCursor)) &&
    typeof value.chainGap === "boolean" && ["registered.gameState", "rup", "gC"].includes(String(value.source));
}
/** Read only the hand metadata, never forward cards, player tokens or full frames. */
export function identityFromSocketPacket(data: unknown, tableId: string, previous: HandIdentityEvidence | null): HandIdentityEvidence | null {
  if (typeof data !== "string" || data.length > 2_000_000 || !data.startsWith("42[")) return null;
  let packet: unknown;
  try { packet = JSON.parse(data.slice(2)); } catch { return null; }
  if (!Array.isArray(packet) || packet.length !== 2 || !object(packet[1])) return null;
  const [event, payload] = packet;
  if (!["registered", "rup", "gC"].includes(event)) return null;
  const frame = event === "registered" ? payload.gameState : payload;
  if (!object(frame) || (frame.id !== undefined && frame.id !== tableId)) return null;
  const full = event !== "gC" || frame.r === true;
  const handId = frame.hI ?? (!full ? previous?.handId : undefined);
  const handNumber = frame.gN ?? (!full ? previous?.handNumber : undefined);
  // A hand-number-only patch is not evidence that the old hand ID belongs to it.
  if (previous && handNumber !== previous.handNumber && !token(frame.hI)) return null;
  const value = { tableId, handId, handNumber, frameCursor: frame.now ?? null,
    heroPlayerId: event === "registered" ? (object(payload.currentPlayer) && token(payload.currentPlayer.id) ? payload.currentPlayer.id : null) : previous?.heroPlayerId ?? null,
    chainGap: !full && (!previous || frame.pre !== previous.frameCursor || previous.chainGap),
    source: event === "registered" ? "registered.gameState" : event };
  return validHandIdentity(value, tableId) ? value : null;
}
