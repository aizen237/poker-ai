import { z } from "zod";
import { getConfidenceLevel } from "./types.js";
import { identityKey, PlayerIdentitySchema, metricNames, type HandObservation, type PlayerIdentity, type RateMetric } from "./observations.js";
/** Transparent placeholder priors, not measured PokerNow population statistics. */
export const STAT_PRIORS = {vpip:0.25,pfr:0.18,threeBet:0.07,foldToThreeBet:0.5,cBet:0.55,foldToCBet:0.45,wtsd:0.28,wsd:0.5,aggression:0.6} as const;
export const PRIOR_SAMPLES=40;
export const RateEstimateSchema=z.object({estimate:z.number().min(0).max(1),priorMean:z.number().min(0).max(1),priorSamples:z.number().positive(),successes:z.number().int().nonnegative(),samples:z.number().int().nonnegative(),playerWeight:z.number().min(0).max(1),confidence:z.enum(["low","moderate","strong"])});
export type RateEstimate=z.infer<typeof RateEstimateSchema>;
export function shrinkRate(successes:number,samples:number,priorMean:number):RateEstimate {
  if(!Number.isSafeInteger(samples)||!Number.isSafeInteger(successes)||samples<0||successes<0||successes>samples||!Number.isFinite(priorMean)||priorMean<=0||priorMean>=1)throw new Error("Invalid binomial evidence");
  return {estimate:(successes+priorMean*PRIOR_SAMPLES)/(samples+PRIOR_SAMPLES),priorMean,priorSamples:PRIOR_SAMPLES,successes,samples,playerWeight:samples/(samples+PRIOR_SAMPLES),confidence:getConfidenceLevel(samples)};
}
const statsSchema=z.object({vpip:RateEstimateSchema,pfr:RateEstimateSchema,threeBet:RateEstimateSchema,foldToThreeBet:RateEstimateSchema,cBet:RateEstimateSchema,foldToCBet:RateEstimateSchema,wtsd:RateEstimateSchema,wsd:RateEstimateSchema,aggression:RateEstimateSchema});
export const OpponentProfileSchema=z.object({identity:PlayerIdentitySchema,displayName:z.string(),handsObserved:z.number().int().nonnegative(),eligibleHands:z.number().int().nonnegative(),confidence:z.enum(["low","moderate","strong"]),stats:statsSchema,aggressionFactor:z.number().finite().nonnegative(),notes:z.array(z.string())});
export type OpponentProfile=z.infer<typeof OpponentProfileSchema>;
export function estimateOpponentProfile(identity:PlayerIdentity,displayName:string,observations:readonly HandObservation[]):OpponentProfile {
  const hands=[...new Map(observations.filter(h=>identityKey(h.identity)===identityKey(identity)).map(h=>[h.handId,h])).values()];
  const eligible=hands.filter(h=>h.coverage==="complete");
  const stats=Object.fromEntries(metricNames.map(name=>{
    const values=eligible.map(h=>h.metrics[name]).filter(v=>v!==null);
    return [name,shrinkRate(values.filter(Boolean).length,values.length,STAT_PRIORS[name])];
  })) as Record<RateMetric,RateEstimate>;
  const a=eligible.reduce((sum,h)=>sum+(h.aggression?.betsAndRaises??0),0),c=eligible.reduce((sum,h)=>sum+(h.aggression?.calls??0),0);
  const aggression=shrinkRate(a,a+c,STAT_PRIORS.aggression);
  return {identity,displayName,handsObserved:hands.length,eligibleHands:eligible.length,confidence:getConfidenceLevel(Math.min(stats.vpip.samples,stats.pfr.samples)),stats:{...stats,aggression},aggressionFactor:aggression.estimate/(1-aggression.estimate),notes:[
    "Rates use (successes + priorMean * 40) / (eligible opportunities + 40). Priors are explicit modeling assumptions, not calibrated population measurements.",
    "handsObserved counts recorded observation windows; only eligible opportunities affect rates. Missing actions never count as false.",
    ...(identity.kind==="display_name"?["Identity is scoped table/display name; duplicate names and name reuse can collide, and renames split history."]:[]),
  ]};
}
