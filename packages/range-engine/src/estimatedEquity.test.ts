import { mulberry32, parseCards } from "@poker-ai/shared";
import { calculateEquity } from "@poker-ai/poker-engine";
import { describe, expect, it } from "vitest";
import { estimateOpponentRange, type OpponentRangeEstimate } from "./actionNarrowing.js";
import { calculateEquityForEstimates } from "./estimatedEquity.js";
import { calculateEquityVsRanges } from "./multiwayEquity.js";
import { rangeFromList } from "./range.js";
function estimate(hands:string[],status:OpponentRangeEstimate["status"]="modeled"):OpponentRangeEstimate {
 return {range:rangeFromList(hands),combos:[],status,confidence:"low",basis:hands.join(","),assumptions:[],fallbacks:[]};
}
const opts=()=>({iterations:60,rng:mulberry32(20)});
describe("equity source selection",()=>{
 it("uses each distinct modeled range and labels multiway equity",()=>{
  const hero=parseCards("Qh Qd"),board=parseCards("2h 3c 9d");
  const estimates=[estimate(["AA"]),estimate(["KK"])];
  const result=calculateEquityForEstimates(hero,estimates,board,opts());
  expect(result.source).toBe("estimated_multiway_ranges");expect(result.reason).toBeNull();
  expect(result.equity).toBe(calculateEquityVsRanges(hero,estimates.map(e=>e.range),board,opts()).equity);
 });
 it.each(["prior_only","unavailable"] as const)("labels fallback random when an opponent range is %s",status=>{
  const hero=parseCards("Qh Qd"),estimates=[estimate(["AA"]),estimate([],status)];
  const result=calculateEquityForEstimates(hero,estimates,[],opts());
  expect(result.source).toBe("random_hands");expect(result.reason).toContain("opponent 2");
  expect(result.equity).toBe(calculateEquity(hero,[],2,opts()).equity);
 });
 it("does not hide a sampler failure behind random equity",()=>{
  const result=calculateEquityForEstimates(parseCards("Kh Qd"),[estimate(["AA"]),estimate(["AA"]),estimate(["AA"])],[],{...opts(),maxSamplingAttempts:60});
  expect(result.equity).toBeUndefined();expect(result.source).toBeUndefined();expect(result.reason).toContain("sampling limit reached");
 });
 it("keeps heads-up source and unsupported-range behavior",()=>{
  const hero=parseCards("Qh Qd");
  expect(calculateEquityForEstimates(hero,[estimate(["AA"])],[],opts()).source).toBe("estimated_range");
  expect(calculateEquityForEstimates(hero,[estimate([],"prior_only")],[],opts()).source).toBeUndefined();
 });
 it("conditions separate position/action priors before multiway sampling",()=>{
  const estimates=(["UTG","BTN"] as const).map(position=>estimateOpponentRange({position,actions:[{street:"preflop",action:"raise",priorRaises:0,facing:"none",unopened:true}],historyCoverage:"complete",effectiveStackBB:100,playersDealtIn:6,chipEvOnly:true}));
  expect(estimates[0]!.range.size).toBeLessThan(estimates[1]!.range.size);
  expect(calculateEquityForEstimates(parseCards("Ah Qh"),estimates,parseCards("7c 8d 2s"),opts()).source).toBe("estimated_multiway_ranges");
 });
});
