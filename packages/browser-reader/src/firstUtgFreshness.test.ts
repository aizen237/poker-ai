import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createFirstUtgSource } from "../../../apps/pokernow-extension/src/firstUtgSource.js";

const saved = (name: string) => JSON.parse(readFileSync(new URL(`../../../evidence/${name}`, import.meta.url), "utf8"))
  .handTimeline.sourceStatus.firstUtgEvidence.observations;
const hand115 = saved("hand-115-diagnostic.json"), hand80 = saved("hand-80-diagnostic.json");
const boundary = hand115.find((o: any) => o.sequence === 67);
const tableId = hand115[0].projection.frame.id;
function fixture() {
  let now = 0;
  const source = createFirstUtgSource(tableId, () => now);
  const accept = (o: any) => {
    now = o.observedAt;
    source.accept(o.projection, o.sequence, o.generation, o.observedAt);
  };
  for (const o of hand115.filter((o: any) => o.sequence <= 67)) accept(o);
  return { source, accept, age: (ms: number) => { now = boundary.observedAt + ms; } };
}

describe("source freshness and unsupported same-decision renewal", () => {
  it("exposes exact original lifetime without making diagnostic reads into renewal", () => {
    const f = fixture();
    expect(f.source.diagnostic().freshness).toMatchObject({ status: "fresh", remainingMs: 10000,
      sameDecisionRenewalSupported: false, certificate: { issuedBySequence: 67, handId: "oacpsi6ju66i" } });
    f.age(9999); expect(f.source.diagnostic().freshness.remainingMs).toBe(1);
    f.age(10000); expect(f.source.snapshot()).not.toBeNull();
    f.age(10001);
    for (let i = 0; i < 3; i++) {
      expect(f.source.snapshot()).toBeNull();
      expect(f.source.diagnostic().freshness).toMatchObject({ status: "expired", remainingMs: 0, ageMs: 10001 });
    }
  });
  it("retains expiry as the first cause when later real disconnect/reconnect updates arrive", () => {
    const f = fixture();
    for (const o of hand115.filter((o: any) => o.sequence > 67)) f.accept(o);
    expect(f.source.snapshot()).toBeNull();
    const a = f.source.diagnostic().freshness;
    expect(a.status).toBe("expired");
    expect(a.certificate!.invalidation).toMatchObject({ sequence: 68, at: boundary.observedAt + 24025 });
    expect(a.certificate!.expiresAt).toBe(boundary.observedAt + 10000);
    a.certificate!.expiresAt += 100000; // Export is a copy, not mutable proof.
    expect(f.source.snapshot()).toBeNull();
    expect(f.source.diagnostic().freshness.certificate!.expiresAt).toBe(boundary.observedAt + 10000);
  });
  it.each(["cursor-only", "explicit-actor", "full-gC", "full-rup", "cached-registration", "same-sequence", "replayed-boundary", "changed-actor", "disconnected-player", "gap", "generation"])("does not certify candidate renewal: %s", variant => {
    const f = fixture();
    const frame = f.source.diagnostic().carriedState!.projection.frame;
    // Explicit synthetic candidate messages, not purported captured renewals.
    const o: any = { sequence: 68, generation: 1, observedAt: boundary.observedAt + 12000,
      projection: { event: "gC", heroId: boundary.projection.heroId, frame: { pre: frame.now, now: frame.now + 1, eventsData: [] } } };
    if (variant === "explicit-actor") o.projection.frame.cPI = o.projection.frame.pITT = o.projection.heroId;
    if (["full-gC", "full-rup"].includes(variant)) {
      o.projection.frame = { ...structuredClone(frame), pre: frame.now, now: frame.now + 1 };
      if (variant === "full-rup") o.projection.event = "rup";
    }
    if (variant === "cached-registration") o.projection = structuredClone(hand115[0].projection);
    if (variant === "same-sequence") { o.projection = structuredClone(boundary.projection); o.sequence = 67; }
    if (variant === "replayed-boundary") o.projection = structuredClone(boundary.projection);
    if (variant === "changed-actor") o.projection.frame.cPI = o.projection.frame.pITT = "amlHsejLtc";
    if (variant === "disconnected-player") o.projection.frame.players = { TTXBlZfl8G: { disconnectedSince: frame.now + 1 } };
    if (variant === "gap") o.projection.frame.pre--;
    if (variant === "generation") o.generation = 2;
    f.accept(o);
    expect(f.source.snapshot()).toBeNull();
    expect(f.source.diagnostic().freshness.certificate!.receivedAt).toBe(boundary.observedAt);
    expect(f.source.diagnostic().historyComplete).toBe(false);
  });
  it("keeps same-hand linked state without treating it as a new first-action certificate", () => {
    const f = fixture(), previous = boundary.projection.frame;
    f.accept({ sequence: 68, generation: 1, observedAt: boundary.observedAt + 2000,
      projection: { event: "gC", heroId: boundary.projection.heroId, frame: { pre: previous.now, now: previous.now + 1, eventsData: [] } } });
    expect(f.source.snapshot()).toBeNull();
    expect(f.source.diagnostic().freshness.status).toBe("invalidated");
    expect(f.source.diagnostic().carriedState!.projection.frame.hI).toBe(previous.hI);
    f.age(5000); f.source.reset();
    expect(f.source.diagnostic().freshness.certificate!.invalidation!.at).toBe(boundary.observedAt + 2000);
  });
  it.each(["actor", "action", "offline", "hand", "reconnect"])("immediately invalidates source proof on %s before expiry", variant => {
    const f = fixture(); f.age(2000);
    if (variant === "reconnect") f.source.reset();
    else {
      const frame: any = { pre: boundary.projection.frame.now, now: boundary.projection.frame.now + 1, eventsData: [] };
      if (variant === "actor") frame.cPI = frame.pITT = "amlHsejLtc";
      if (variant === "action") frame.pGS = { v7UmNXTwjJ: "fold" };
      if (variant === "offline") frame.players = { TTXBlZfl8G: { disconnectedSince: frame.now } };
      if (variant === "hand") { frame.hI = "other-hand"; frame.gN = 116; }
      f.accept({ sequence: 68, generation: 1, observedAt: boundary.observedAt + 2000,
        projection: { event: "gC", heroId: boundary.projection.heroId, frame } });
    }
    expect(f.source.snapshot()).toBeNull();
    expect(f.source.diagnostic().freshness).toMatchObject({ status: "invalidated", remainingMs: 0,
      certificate: { invalidation: { at: boundary.observedAt + 2000 } } });
    f.age(20000); expect(f.source.diagnostic().freshness.status).toBe("invalidated");
  });
  it("can issue independent proof for a later captured hand; this is not same-decision renewal", () => {
    let now = 0;
    const source = createFirstUtgSource(tableId, () => now);
    for (const o of hand80) { now = o.observedAt; source.accept(o.projection, o.sequence, 1, now); }
    expect(source.snapshot()?.handNumber).toBe(80);
    now += 10001; expect(source.snapshot()).toBeNull();
    source.reset();
    // Hand 115's original receive times are later. A local-sequence offset and
    // new generation model a reconnect, without inventing source payloads.
    for (const o of hand115.filter((o: any) => o.sequence <= 67)) {
      now = o.observedAt; source.accept(o.projection, o.sequence + hand80.length, 2, now);
      if (o.sequence === 1) expect(source.snapshot()).toBeNull();
    }
    expect(source.snapshot()).toMatchObject({ handNumber: 115, generation: 2, receivedAt: boundary.observedAt });
    expect(source.diagnostic().freshness.status).toBe("fresh");
    expect(source.diagnostic().historyComplete).toBe(false);
  });
});
