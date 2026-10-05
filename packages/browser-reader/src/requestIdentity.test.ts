import { describe, expect, it } from "vitest";
import { decisionFingerprint, decisionRequestKey } from "../../../apps/pokernow-extension/src/requestIdentity.js";

describe("live decision request identity", () => {
  const raw = { board: ["2s", "8s", "8d"], pot: 7, call: 3, seats: [{ name: "Hero", stack: 18, bet: 0, current: true }] };
  const fingerprint = (state: unknown = raw, url = "https://pokernow.com/games/a", control: unknown = null) => decisionFingerprint(url, state, { dealer: 2 }, control);
  it("deduplicates identical observations", () => {
    expect(decisionRequestKey(1, fingerprint())).toBe(decisionRequestKey(1, fingerprint(structuredClone(raw))));
  });
  it.each([
    { ...raw, board: ["2h", "8s", "8d"] },
    { ...raw, seats: [{ name: "Hero", stack: 17, bet: 0, current: true }] },
    { ...raw, seats: [{ name: "Hero", stack: 18, bet: 0, current: false }] },
    { ...raw, seats: [{ name: "Replacement", stack: 18, bet: 0, current: true }] },
  ])("distinguishes changed cards/stack/actor/occupant with identical pot and call", state => {
    expect(fingerprint(state)).not.toBe(fingerprint());
  });
  it("distinguishes tables, controls and read failures", () => {
    expect(fingerprint(raw, "https://pokernow.com/games/b")).not.toBe(fingerprint());
    expect(fingerprint(raw, undefined, { selectedRaiseToChips: 6 })).not.toBe(fingerprint());
    expect(decisionFingerprint("https://pokernow.com/games/a", raw, { readErrors: ["missing board"] }, null)).not.toBe(fingerprint());
  });
  it("rejects an old A response after A -> B -> A and after a failed poll", () => {
    const old = decisionRequestKey(1, fingerprint());
    expect(old).not.toBe(decisionRequestKey(3, fingerprint()));
  });
});
