import { mulberry32, parseCards, type Card } from "@poker-ai/shared";
import { evaluateBest } from "@poker-ai/poker-engine";
import { describe, expect, it } from "vitest";
import { calculateEquityVsRanges } from "./multiwayEquity.js";
import { calculateEquityVsRange } from "./rangeEquity.js";
import { expandRange, rangeFromList, type Range } from "./range.js";
import { getOpeningRange } from "./openingRanges.js";

// Independent exhaustive river oracle: sum product weights over legal joint deals.
function exactRiver(hero:Card[], ranges:Range[], board:Card[]):number {
 const known=[...hero,...board];let mass=0,share=0;
 for(const a of expandRange(ranges[0]!,known)) for(const b of expandRange(ranges[1]!,known)) {
  if(a.cards.some(c=>b.cards.some(d=>c.rank===d.rank&&c.suit===d.suit)))continue;
  const values=[hero,a.cards,b.cards].map(h=>evaluateBest([...h,...board]).value);
  const best=Math.max(...values),weight=a.weight*b.weight;
  mass+=weight;if(values[0]===best)share+=weight/values.filter(v=>v===best).length;
 }
 return share/mass;
}
const options=(seed=1,iterations=1000)=>({rng:mulberry32(seed),iterations});
describe("calculateEquityVsRanges",()=>{
 it("QQ fares much worse against AA and KK than two wide ranges",()=>{
  const hero=parseCards("Qh Qd");
  const tight=calculateEquityVsRanges(hero,[rangeFromList(["AA"]),rangeFromList(["KK"])],[],options(3,1800));
  const wide=calculateEquityVsRanges(hero,[getOpeningRange("BTN"),getOpeningRange("CO")],[],options(4,1800));
  expect(tight.equity).toBeLessThan(0.3);expect(wide.equity).toBeGreaterThan(tight.equity+0.15);
 },20000);
 it.each([[],parseCards("2c 7d 9h"),parseCards("2c 7d 9h Ts"),parseCards("2c 7d 9h Ts 3d")].map(board=>({board})))("supports every street",({board})=>{
  const result=calculateEquityVsRanges(parseCards("As Kd"),[rangeFromList(["QQ"]),rangeFromList(["JJ"])],board,options(5,40));
  expect(result.iterations).toBe(40);expect(result.equity).toBeGreaterThanOrEqual(0);expect(result.equity).toBeLessThanOrEqual(1);
 });
 it.each([2,3,4])("splits a board royal flush among hero and %s opponents",count=>{
  const result=calculateEquityVsRanges(parseCards("2c 3d"),Array.from({length:count},()=>rangeFromList(["66","77","88","99"])),parseCards("As Ks Qs Js Ts"),options(8,60));
  expect(result.equity).toBeCloseTo(1/(count+1),12);
 });
 it("splits only between the two actual winners in a three-player pot",()=>{
  const result=calculateEquityVsRanges(parseCards("As Kd"),[rangeFromList(["AQo"]),rangeFromList(["KK"])],parseCards("2c 3d 4h 5s 9c"),options(1,60));
  expect(result.equity).toBe(0.5);
 });
 it("hero receives zero when only opponents tie for best",()=>{
  const result=calculateEquityVsRanges(parseCards("Kh Qd"),[rangeFromList(["AA"]),rangeFromList(["AA"])],parseCards("2c 3d 4h 5s 9c"),options(1,60));
  expect(result.equity).toBe(0);expect(result.rejectedSamples).toBeGreaterThan(0);
 });
 it("restarts a dead-end deal without counting it as a loss",()=>{
  const result=calculateEquityVsRanges(parseCards("As Ah"),[rangeFromList(["AA","KK"]),rangeFromList(["AA"])],parseCards("2c 3d 7h 8s 9c"),options(2,100));
  expect(result.equity).toBe(0.5);expect(result.iterations).toBe(100);expect(result.attempts).toBeGreaterThan(100);
 });
 it("terminates safely when individually legal ranges are jointly impossible",()=>{
  expect(()=>calculateEquityVsRanges(parseCards("Kh Qd"),Array.from({length:3},()=>rangeFromList(["AA"])),[],{...options(1,10),maxSamplingAttempts:30})).toThrow("sampling limit reached");
 });
 it("removes hero and board cards before sampling each range",()=>{
  expect(()=>calculateEquityVsRanges(parseCards("As Ah"),[rangeFromList(["KK"]),rangeFromList(["AA"])],parseCards("Ac Ad 2h"),options())).toThrow("Opponent 2 range has no legal combos");
 });
 it("matches exact weighted joint equity despite asymmetric blockers and seat order",()=>{
  const hero=parseCards("Kc Qd"),board=parseCards("As Kh 7c 2h 3s");
  const ranges=[new Map([["AKs",0.2],["KK",1],["QQ",0.6]]),new Map([["KQs",0.7],["KJs",0.1],["AA",0.5],["JTs",1]])];
  const expected=exactRiver(hero,ranges,board);
  expect(calculateEquityVsRanges(hero,ranges,board,options(40,4000)).equity).toBeCloseTo(expected,1);
  expect(calculateEquityVsRanges(hero,[ranges[1]!,ranges[0]!],board,options(41,4000)).equity).toBeCloseTo(expected,1);
 },20000);
 it("reproduces the same samples with an injected seeded RNG",()=>{
  const ranges=[getOpeningRange("UTG"),getOpeningRange("BTN")],hero=parseCards("Ah Qh");
  expect(calculateEquityVsRanges(hero,ranges,[],options(99,100))).toEqual(calculateEquityVsRanges(hero,ranges,[],options(99,100)));
 });
 it("one opponent agrees with the existing heads-up implementation",()=>{
  const hero=parseCards("Ah Qh"),range=getOpeningRange("CO"),board=parseCards("Kh 7h 2c");
  const headsUp=calculateEquityVsRange(hero,range,board,options(12,800));
  const multi=calculateEquityVsRanges(hero,[range],board,options(12,800));
  expect(multi.equity).toBeCloseTo(headsUp.equity,10);
 });
 it.each([0,-1,1.5,NaN,Infinity])("rejects invalid iteration count %s",iterations=>{
  expect(()=>calculateEquityVsRanges(parseCards("As Kh"),[rangeFromList(["QQ"])],[],{iterations})).toThrow();
 });
 it("rejects duplicate cards, empty ranges, invalid boards, budgets, and RNG values",()=>{
  const hero=parseCards("As Kh"),ranges=[rangeFromList(["QQ"])];
  expect(()=>calculateEquityVsRanges(hero,ranges,parseCards("As 2c 3c"),options())).toThrow("Duplicate");
  expect(()=>calculateEquityVsRanges(hero,[new Map()],[],options())).toThrow("no legal combos");
  expect(()=>calculateEquityVsRanges(hero,[],[],options())).toThrow();
  expect(()=>calculateEquityVsRanges(hero,ranges,parseCards("2c"),options())).toThrow();
  expect(()=>calculateEquityVsRanges(hero,ranges,[],{iterations:10,maxSamplingAttempts:5})).toThrow();
  expect(()=>calculateEquityVsRanges(hero,ranges,[],{iterations:1,rng:()=>1})).toThrow("RNG");
 });
});
