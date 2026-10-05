import type { Card } from "./card.js";
/** Reject malformed simulation inputs before they can produce NaN or plausible false equity. */
export function validateSimulationInput(known: readonly Card[], boardCount: number, iterations: number): void {
  if (![0, 3, 4, 5].includes(boardCount)) throw new Error("Invalid board count");
  if (!Number.isSafeInteger(iterations) || iterations < 1) throw new Error("Iterations must be a positive integer");
  if (known.some(c => !Number.isInteger(c.rank) || c.rank < 2 || c.rank > 14 || !["s", "h", "d", "c"].includes(c.suit))) throw new Error("Invalid card");
  if (new Set(known.map(c => `${c.rank}${c.suit}`)).size !== known.length) throw new Error("Duplicate known cards");
}
