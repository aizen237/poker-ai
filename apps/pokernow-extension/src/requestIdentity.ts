/** Full observed decision identity; no lossy card-count/pot concatenation. */
export function decisionFingerprint(tableUrl: string, raw: unknown, context: unknown, raiseControl: unknown): string {
  return JSON.stringify({ tableUrl, raw, context, raiseControl });
}
/** Epoch distinguishes A -> B -> A, even when the full state returns to A. */
export function decisionRequestKey(epoch: number, fingerprint: string): string {
  return `${epoch}:${fingerprint}`;
}
