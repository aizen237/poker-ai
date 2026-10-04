import { calculateEquityVsRange } from "./rangeEquity.js";
import { parseCards } from "@poker-ai/shared";
import type { RangeAction, RangeEstimationInput } from "./actionNarrowing.js";
import { describe, expect, it } from "vitest";
import { estimateOpponentRange, narrowExcludingTop, narrowForCall, narrowForThreeBet } from "./actionNarrowing.js";
import { getOpeningRange } from "./openingRanges.js";
import { expandRange, rangeComboCount, rangeFromList } from "./range.js";

describe("narrowForThreeBet", () => {
  it("the narrowed range is always a genuine subset of the original", () => {
    const original = getOpeningRange("BTN");
    const narrowed = narrowForThreeBet(original);
    for (const hand of narrowed.keys()) {
      expect(original.has(hand)).toBe(true);
    }
  });

  it("is meaningfully narrower than the original range", () => {
    const original = getOpeningRange("BTN");
    const narrowed = narrowForThreeBet(original);
    expect(narrowed.size).toBeLessThan(original.size);
  });

  it("AA always survives a 3-bet narrowing (it's always in the top slice)", () => {
    const original = getOpeningRange("BTN");
    const narrowed = narrowForThreeBet(original);
    expect(narrowed.has("AA")).toBe(true);
  });

  it("the weakest hands in a wide range do not survive a tight 3-bet narrowing", () => {
    const original = getOpeningRange("BTN"); // wide range, includes hands like 54s
    const narrowed = narrowForThreeBet(original, { topFraction: 0.1 }); // very tight
    expect(narrowed.has("54s")).toBe(false);
  });

  it("throws on an out-of-bounds topFraction", () => {
    expect(() => narrowForThreeBet(getOpeningRange("BTN"), { topFraction: 0 })).toThrow();
    expect(() => narrowForThreeBet(getOpeningRange("BTN"), { topFraction: 1.5 })).toThrow();
  });
});

describe("narrowForCall", () => {
  it("the narrowed range is always a genuine subset of the original", () => {
    const original = getOpeningRange("CO");
    const narrowed = narrowForCall(original);
    for (const hand of narrowed.keys()) {
      expect(original.has(hand)).toBe(true);
    }
  });

  it("excludes the very strongest hand (AA) -- it would 3-bet, not flat", () => {
    const original = getOpeningRange("CO");
    const narrowed = narrowForCall(original);
    expect(narrowed.has("AA")).toBe(false);
  });

  it("throws on an invalid band", () => {
    expect(() => narrowForCall(getOpeningRange("CO"), { band: [0.8, 0.5] })).toThrow(); // reversed
    expect(() => narrowForCall(getOpeningRange("CO"), { band: [-0.1, 0.5] })).toThrow(); // out of bounds
  });
});

describe("narrowExcludingTop", () => {
  it("removes exactly the strongest hands and keeps the rest", () => {
    const original = getOpeningRange("UTG");
    const narrowed = narrowExcludingTop(original, 0.2);
    expect(narrowed.has("AA")).toBe(false); // in the excluded top 20%
    expect(narrowed.size).toBeLessThan(original.size);
    expect(narrowed.size).toBeGreaterThan(0);
  });

  it("excluding 0% returns the range unchanged in size", () => {
    const original = getOpeningRange("UTG");
    const narrowed = narrowExcludingTop(original, 0);
    expect(narrowed.size).toBe(original.size);
  });

  it("throws on an out-of-bounds fraction", () => {
    expect(() => narrowExcludingTop(getOpeningRange("UTG"), 1)).toThrow();
    expect(() => narrowExcludingTop(getOpeningRange("UTG"), -0.1)).toThrow();
  });
});

describe("combo weights carry through narrowing correctly", () => {
  it("a narrowed range's combo count is less than or equal to the original's", () => {
    const original = getOpeningRange("BTN");
    const narrowed = narrowForThreeBet(original);
    expect(rangeComboCount(narrowed)).toBeLessThanOrEqual(rangeComboCount(original));
  });

  it("kept hands retain their original weight (no weight distortion during narrowing)", () => {
    const original = getOpeningRange("BTN");
    const narrowed = narrowForThreeBet(original);
    for (const [hand, weight] of narrowed) {
      expect(weight).toBe(original.get(hand));
    }
  });
});



function event(action:RangeAction["action"], priorRaises:number|null, facing:RangeAction["facing"], street:RangeAction["street"]="preflop"):RangeAction {
 return {action,priorRaises,facing,street,unopened:street==="preflop"&&priorRaises===0&&facing==="none"};
}
function input(actions:RangeAction[]= [event("raise",0,"none")]):RangeEstimationInput {
 return {position:"CO",actions,historyCoverage:"complete",effectiveStackBB:100,playersDealtIn:6,chipEvOnly:true};
}
describe("contextual estimateOpponentRange",()=>{
 it("starts a BTN opener wider than UTG and does not 3-bet-cut an open",()=>{
  const btn=estimateOpponentRange({...input(),position:"BTN"});
  const utg=estimateOpponentRange({...input(),position:"UTG"});
  expect(rangeComboCount(btn.range)).toBeGreaterThan(rangeComboCount(utg.range));
  expect(btn.range).toEqual(getOpeningRange("BTN"));expect(btn.confidence).toBe("medium");expect(btn.basis).toContain("BTN open");
 });
 it("distinguishes 3-bet from open and later re-raise",()=>{
  const open=estimateOpponentRange({...input(),position:"BTN"});
  const three=estimateOpponentRange(input([event("raise",1,"raise")]));
  const four=estimateOpponentRange(input([event("raise",2,"raise")]));
  expect(rangeComboCount(three.range)).toBeLessThan(rangeComboCount(open.range));
  expect(rangeComboCount(four.range)).toBeLessThan(rangeComboCount(three.range));
  expect(three.basis).toContain("3-bet");expect(four.basis).toContain("later re-raise");expect(three.confidence).toBe("low");
 });
 it("uses known prior aggressor position without pretending calibrated frequencies",()=>{
  const utg=estimateOpponentRange(input([{...event("raise",1,"raise"),facingPosition:"UTG"}]));
  const btn=estimateOpponentRange(input([{...event("raise",1,"raise"),facingPosition:"BTN"}]));
  expect(rangeComboCount(utg.range)).toBeLessThanOrEqual(rangeComboCount(btn.range));expect(utg.assumptions.join(" ")).toContain("assumed");
 });
 it("flat call retains a continuing subset, including some premium traps",()=>{
  const prior=rangeFromList(["AA","KK","QQ","JJ","AKs","AQs","AJs","KQs","TT","99","88","72o","32o"]);
  const c=estimateOpponentRange({...input([event("call",1,"raise")]),baseline:{range:prior,basis:"explicit test prior",confidence:"medium"}});
  expect(c.range.has("AA")).toBe(true);expect(c.range.get("AA")).toBeLessThan(1);expect(c.range.has("32o")).toBe(false);
  for(const [hand,weight] of c.range){expect(prior.has(hand)).toBe(true);expect(weight).toBeLessThanOrEqual(prior.get(hand)!);}
 });
 it("sequential actions narrow the previous weighted range without resetting",()=>{
  const open=estimateOpponentRange(input());
  const both=estimateOpponentRange(input([event("raise",0,"none"),event("call",2,"raise")]));
  const resumed=estimateOpponentRange({...input([event("call",2,"raise")]),baseline:{range:open.range,basis:open.basis,confidence:open.confidence}});
  expect(both.range).toEqual(resumed.range);expect(rangeComboCount(both.range)).toBeLessThan(rangeComboCount(open.range));
  expect(both.basis).toContain("CO open -> preflop call");
  for(const hand of both.range.keys())expect(open.range.has(hand)).toBe(true);
 });
 it.each(["bet","raise","call"] as const)("postflop %s preserves prior instead of using Chen/RFI strength",verb=>{
  const before=estimateOpponentRange(input());
  const after=estimateOpponentRange(input([event("raise",0,"none"),event(verb,verb==="raise"?1:0,verb==="bet"?"none":"bet","flop")]));
  expect(after.range).toEqual(before.range);expect(after.confidence).toBe("low");expect(after.basis).toContain("flop "+verb);expect(after.assumptions.join(" ")).toContain("board-aware");
 });
 it("postflop-only history has an explicitly unconditioned prior, not a positional opening chart",()=>{
  const result=estimateOpponentRange(input([event("bet",0,"none","flop")]));
  expect(result.status).toBe("prior_only");expect(result.range.size).toBe(169);expect(result.confidence).toBe("low");
 });
 it.each(["BB",null] as const)("does not turn %s position into an empty opening/defending range",position=>{
  const result=estimateOpponentRange({...input(),position});expect(result.range.size).toBe(169);expect(result.status).toBe("prior_only");
 });
 it.each([10,20,45])("does not apply a deep reference at %sBB",effectiveStackBB=>{
  const result=estimateOpponentRange({...input(),effectiveStackBB});expect(result.status).toBe("prior_only");
 });
 it("does not guess missing preflop raise level from partial history",()=>{
  const result=estimateOpponentRange({...input([event("raise",null,"unknown")]),historyCoverage:"partial"});
  expect(result.status).toBe("prior_only");expect(result.basis).toContain("raise level unknown");
 });
 it("does not assign a false order to tied observations",()=>{
  const result=estimateOpponentRange(input([{...event("raise",0,"none"),observation:1},{...event("call",1,"raise"),observation:1}]));
  expect(result.status).toBe("prior_only");expect(result.assumptions.join(" ")).toContain("Unordered");
 });
 it("unknown all-in status does not narrow twice",()=>{
  const before=estimateOpponentRange(input());const after=estimateOpponentRange(input([event("raise",0,"none"),event("all-in",null,"unknown")]));
  expect(after.range).toEqual(before.range);expect(after.confidence).toBe("low");
 });
 it("preserves fractional prior weights through an open",()=>{
  const prior=new Map([["AA",0.25],["AKs",0.6],["72o",0.8]]);
  const result=estimateOpponentRange({...input(),baseline:{range:prior,basis:"weighted prior",confidence:"medium"}});
  expect(result.range.get("AA")).toBe(0.25);expect(result.range.get("AKs")).toBe(0.6);expect(result.range.has("72o")).toBe(false);
  expect(prior.size).toBe(3);
 });
 it("removes hero and board blockers per combo without deleting an entire suited class",()=>{
  const known=parseCards("As Kd Ah 7c 2h");
  const result=estimateOpponentRange({...input([]),knownCards:known,baseline:{range:new Map([["AA",0.4],["AKs",0.7]]),basis:"test",confidence:"medium"}});
  expect(result.combos.filter(c=>c.cards.every(card=>card.rank===14))).toHaveLength(1);
  expect(result.combos.filter(c=>c.weight===0.7)).toHaveLength(1);
  for(const c of result.combos)for(const card of c.cards)expect(known.some(k=>k.rank===card.rank&&k.suit===card.suit)).toBe(false);
 });
 it("restores the previous weighted prior if a heuristic leaves only blocked hands",()=>{
  const prior=new Map([["AA",1],["72o",0.3]]);
  const result=estimateOpponentRange({...input([event("raise",1,"raise")]),knownCards:parseCards("As Ah Ac"),baseline:{range:prior,basis:"test prior",confidence:"medium"}});
  expect(result.range).toEqual(prior);expect(result.combos.length).toBeGreaterThan(0);expect(result.confidence).toBe("low");expect(result.fallbacks).toHaveLength(1);
 });
 it("does not invent replacement hands if the supplied prior itself is impossible",()=>{
  const result=estimateOpponentRange({...input([]),knownCards:parseCards("As Ah Ac"),baseline:{range:rangeFromList(["AA"]),basis:"impossible prior",confidence:"medium"}});
  expect(result.status).toBe("unavailable");expect(result.combos).toEqual([]);expect(result.range.size).toBe(1);
 });
 it("zero weights are excluded and invalid weights rejected",()=>{
  const baseline={range:new Map([["AA",0]]),basis:"test",confidence:"medium" as const};
  expect(estimateOpponentRange({...input([]),baseline}).status).toBe("unavailable");
  expect(expandRange(baseline.range)).toEqual([]);
  baseline.range.set("AA",NaN);expect(()=>estimateOpponentRange({...input([]),baseline})).toThrow();
 });
});

describe("range evidence boundaries",()=>{
 it("does not use an RFI chart when limpers may precede the raise",()=>{
  const result=estimateOpponentRange(input([{...event("raise",0,"none"),unopened:false}]));
  expect(result.status).toBe("prior_only");
 });
 it("does not rebuild an empty supplied prior into a made-up range",()=>{
  expect(estimateOpponentRange({...input(),baseline:{range:new Map(),basis:"empty",confidence:"low"}}).status).toBe("unavailable");
 });
 it("does not expand a tiny range through repeated calls",()=>{
  const result=estimateOpponentRange({...input([event("call",1,"raise"),event("call",2,"raise")]),baseline:{range:new Map([["AA",0.4]]),basis:"tiny",confidence:"medium"}});
  expect([...result.range.keys()]).toEqual(["AA"]);expect(result.range.get("AA")).toBeCloseTo(0.1);expect(result.combos).toHaveLength(6);
 });
});

describe("range-equity integration",()=>{
 it("can sample a recovered prior without reintroducing blocked cards",()=>{
  const hero=parseCards("As Ah"),board=parseCards("Ac 7c 2h");
  const result=estimateOpponentRange({...input([event("raise",1,"raise")]),knownCards:[...hero,...board],baseline:{range:new Map([["AA",1],["KK",0.2]]),basis:"weighted prior",confidence:"medium"}});
  expect(result.fallbacks).toHaveLength(1);expect(result.combos).toHaveLength(6);
  const equity=calculateEquityVsRange(hero,result.range,board,{iterations:30});expect(equity.equity).toBeGreaterThanOrEqual(0);expect(equity.equity).toBeLessThanOrEqual(1);
 });
 it("zero-weight-only ranges cannot generate a fake equity result",()=>{
  expect(()=>calculateEquityVsRange(parseCards("As Ah"),new Map([["KK",0]]),[],{iterations:1})).toThrow("no valid combos");
 });
});

describe("shrunk opponent tendencies",()=>{
 const tendencies=(samples:number)=>({vpip:{estimate:(samples+0.25*40)/(samples+40),priorMean:0.25,playerWeight:samples/(samples+40),samples},pfr:{estimate:(samples+0.18*40)/(samples+40),priorMean:0.18,playerWeight:samples/(samples+40),samples}});
 it("zero samples leave the baseline unchanged",()=>{
  expect(estimateOpponentRange({...input(),tendencies:tendencies(0)}).range).toEqual(estimateOpponentRange(input()).range);
 });
 it("tiny extreme samples make only a small weighted change",()=>{
  const base=estimateOpponentRange(input()),small=estimateOpponentRange({...input(),tendencies:tendencies(5)});
  expect(rangeComboCount(small.range)/rangeComboCount(base.range)).toBeLessThan(1.02);
  expect(small.confidence).toBe("low");
 });
 it("large high-PFR samples widen an applicable open with a capped weighted adjustment",()=>{
  const base=estimateOpponentRange(input()),wide=estimateOpponentRange({...input(),tendencies:tendencies(1000)});
  expect(rangeComboCount(wide.range)).toBeGreaterThan(rangeComboCount(base.range));
  expect(rangeComboCount(wide.range)).toBeLessThanOrEqual(rangeComboCount(base.range)*1.15+1e-8);
 });
 it("statistics never turn unsupported short-stack or partial histories into a model",()=>{
  expect(estimateOpponentRange({...input(),historyCoverage:"partial",tendencies:tendencies(1000)}).status).toBe("prior_only");
  expect(estimateOpponentRange({...input(),effectiveStackBB:10,tendencies:tendencies(1000)}).status).toBe("prior_only");
 });
});
