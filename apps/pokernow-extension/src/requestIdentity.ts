import type { LiveTableRead } from "./tableRead.js";

/** Full observed decision identity; no lossy card-count/pot concatenation. */
export function decisionFingerprint(tableUrl: string, raw: unknown, context: unknown, raiseControl: unknown): string {
  return JSON.stringify({ tableUrl, raw, context, raiseControl });
}
/** Epoch distinguishes A -> B -> A, even when the full state returns to A. */
export function decisionRequestKey(epoch: number, fingerprint: string): string {
  return `${epoch}:${fingerprint}`;
}
/** Polling, response delivery and diagnostic captures must bind the same inputs. */
export function liveDecisionFingerprint(tableUrl: string, read: LiveTableRead, sourceRevision: string,
  street: string | undefined, now = Date.now(),
  dom = decisionFingerprint(tableUrl, read.raw, read.context, read.raiseControl)): string {
  // A fresh identical control read is stable; its state and freshness still bind the epoch.
  const { observedAt, ...callObservation } = read.callControl ?? {};
  return JSON.stringify([dom, sourceRevision,
    ...(["preflop", "flop", "turn", "river"].includes(street ?? "") ? [{ callObservation,
      callFresh: observedAt !== undefined && observedAt <= now && now - observedAt < 10_000 }] : [])]);
}
