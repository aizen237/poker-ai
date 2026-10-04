import { describe, expect, it } from "vitest";
import { mkdtempSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { summarizeHand, identityKey, HandObservationSchema, type HandEvidence, type HandObservation } from "./observations.js";
import { estimateOpponentProfile, STAT_PRIORS, PRIOR_SAMPLES } from "./estimates.js";
import { openDatabase } from "./db.js";
import { createOpponentService } from "./service.js";
const identity={kind:"display_name" as const,scope:"https://www.pokernow.club/games/test",value:"Villain"};
function evidence(overrides:Partial<HandEvidence>={}):HandEvidence {
 return {handId:"window-1",identity,displayName:"Villain",seat:2,coverage:"complete",dealtInKnown:true,sawFlop:true,wentToShowdown:false,wonAtShowdown:null,
 actions:[{seat:1,street:"preflop",action:"raise",observation:1},{seat:2,street:"preflop",action:"call",observation:2},{seat:1,street:"flop",action:"bet",observation:3},{seat:2,street:"flop",action:"fold",observation:4}],...overrides};
}
function hand(id:number,positive=true):HandObservation {
 const h=summarizeHand(evidence({handId:"hand-"+id}));h.metrics.vpip=positive;h.metrics.pfr=positive;return h;
}
describe("opportunity-aware estimates",()=>{
 it.each([0,5,100,1000])("shrinks evidence from %s hands toward explicit priors",count=>{
  const profile=estimateOpponentProfile(identity,"Villain",Array.from({length:count},(_,i)=>hand(i,i%5!==0)));
  const successes=Array.from({length:count},(_,i)=>i%5!==0).filter(Boolean).length;
  expect(profile.handsObserved).toBe(count);expect(profile.eligibleHands).toBe(count);
  expect(profile.stats.vpip.estimate).toBeCloseTo((successes+STAT_PRIORS.vpip*PRIOR_SAMPLES)/(count+PRIOR_SAMPLES));
  expect(profile.stats.vpip.playerWeight).toBeCloseTo(count/(count+PRIOR_SAMPLES));
  expect(profile.confidence).toBe(count>=1000?"strong":count>=100?"moderate":"low");
 });
 it("five observed successes never become an authoritative 100% rate",()=>{
  const profile=estimateOpponentProfile(identity,"Villain",Array.from({length:5},(_,i)=>hand(i)));
  expect(profile.stats.vpip.estimate).toBeCloseTo(1/3);expect(profile.stats.vpip.confidence).toBe("low");
  expect(profile.stats.vpip.playerWeight).toBeLessThan(0.12);
 });
 it("1000 partial windows do not become eligible samples or false zero rates",()=>{
  const profile=estimateOpponentProfile(identity,"Villain",Array.from({length:1000},(_,i)=>summarizeHand(evidence({handId:"p"+i,coverage:"partial"}))));
  expect(profile.handsObserved).toBe(1000);expect(profile.eligibleHands).toBe(0);expect(profile.confidence).toBe("low");
  expect(profile.stats.vpip.estimate).toBe(STAT_PRIORS.vpip);expect(profile.stats.vpip.samples).toBe(0);
 });
 it("a rare conditional stat keeps its own small denominator despite many hands",()=>{
  const hands=Array.from({length:1000},(_,i)=>{const h=hand(i);h.metrics.foldToCBet=i===0?true:null;h.metrics.threeBet=null;return h;});
  const p=estimateOpponentProfile(identity,"Villain",hands);
  expect(p.confidence).toBe("strong");expect(p.stats.foldToCBet.samples).toBe(1);expect(p.stats.foldToCBet.confidence).toBe("low");
  expect(p.stats.threeBet.samples).toBe(0);expect(p.stats.foldToCBet.estimate).toBeLessThan(0.5);
 });
 it("aggression remains finite with only raises and no calls",()=>{
  const h=hand(1);h.aggression={betsAndRaises:5,calls:0};const p=estimateOpponentProfile(identity,"Villain",[h]);
  expect(Number.isFinite(p.aggressionFactor)).toBe(true);expect(p.stats.aggression.samples).toBe(5);
  expect(p.stats.aggression.estimate).toBeLessThan(0.7);
 });
});
describe("per-hand summaries",()=>{
 it("derives a flat caller's VPIP, 3-bet opportunity, and fold-to-cbet opportunity",()=>{
  const h=summarizeHand(evidence());expect(h.metrics).toMatchObject({vpip:true,pfr:false,threeBet:false,foldToThreeBet:null,cBet:null,foldToCBet:true,wtsd:false,wsd:null});
 });
 it("derives the preflop raiser's flop c-bet and postflop aggression",()=>{
  const h=summarizeHand(evidence({seat:1}));expect(h.metrics).toMatchObject({vpip:true,pfr:true,threeBet:null,cBet:true,foldToCBet:null});
  expect(h.aggression).toEqual({betsAndRaises:1,calls:0});
 });
 it("distinguishes a 3-bet opportunity from folding to that 3-bet",()=>{
  const actions:HandEvidence["actions"]=[{seat:1,street:"preflop",action:"raise",observation:1},{seat:2,street:"preflop",action:"raise",observation:2},{seat:1,street:"preflop",action:"fold",observation:3}];
  expect(summarizeHand(evidence({actions,seat:2})).metrics.threeBet).toBe(true);
  expect(summarizeHand(evidence({actions,seat:1})).metrics.foldToThreeBet).toBe(true);
 });
 it("does not count a blind post as voluntary participation or a 3-bet opportunity",()=>{
  const h=summarizeHand(evidence({actions:[{seat:2,street:"preflop",action:"post_blind",observation:1},{seat:2,street:"preflop",action:"check",observation:2}]}));
  expect(h.metrics.vpip).toBe(false);expect(h.metrics.threeBet).toBeNull();
 });
 it("a donk bet removes the preflop raiser's c-bet opportunity",()=>{
  const h=summarizeHand(evidence({seat:1,actions:[{seat:1,street:"preflop",action:"raise",observation:1},{seat:2,street:"preflop",action:"call",observation:2},{seat:2,street:"flop",action:"bet",observation:3},{seat:1,street:"flop",action:"call",observation:4}]}));
  expect(h.metrics.cBet).toBeNull();expect(h.metrics.foldToCBet).toBeNull();
 });
 it("unknown showdown results and partial/tied histories stay unknown",()=>{
  const partial=summarizeHand(evidence({coverage:"partial"}));expect(Object.values(partial.metrics).every(v=>v===null)).toBe(true);expect(partial.observedActions).toBe(2);expect(partial.actions).toHaveLength(2);
  expect(summarizeHand(evidence({wentToShowdown:null})).metrics.wtsd).toBeNull();
  const tied=summarizeHand(evidence({actions:evidence().actions.map(a=>({...a,observation:1}))}));expect(tied.coverage).toBe("partial");
  expect(()=>HandObservationSchema.parse({...partial,metrics:{...partial.metrics,vpip:true}})).toThrow();
 });
});
describe("live observation persistence",()=>{
 it("deduplicates snapshots and survives close/reopen without replacing legacy data",()=>{
  const dir=mkdtempSync(join(tmpdir(),"poker-opponents-")),file=join(dir,"observations.sqlite");let db=openDatabase(file);
  try{
   db.recordObservation(hand(1));db.recordObservation(hand(1));expect(db.getObservations(identity)).toHaveLength(1);
   db.close();db=openDatabase(file);expect(db.getObservations(identity)).toHaveLength(1);
   expect(estimateOpponentProfile(identity,"Villain",db.getObservations(identity)).stats.vpip.samples).toBe(1);
   const partial=summarizeHand(evidence({handId:"hand-1",coverage:"partial"}));db.recordObservation(partial);expect(db.getObservations(identity)[0]!.coverage).toBe("complete");
  }finally{db.close();for(const suffix of ["","-wal","-shm"])if(existsSync(file+suffix))unlinkSync(file+suffix);rmdirSync(dir);}
 });
 it("keeps same display names on separate tables separate",()=>{
  expect(identityKey(identity)).not.toBe(identityKey({...identity,scope:"another-table"}));
  const db=openDatabase(":memory:");try{db.recordObservation(hand(1));expect(db.getObservations({...identity,scope:"another-table"})).toEqual([]);}finally{db.close();}
 });
 it("open/read/write failures return priors without throwing",async()=>{
  const openFailure=createOpponentService(async()=>{throw new Error("locked or missing native module");});
  expect((await openFailure.profile(identity,"Villain")).profile.stats.vpip.estimate).toBe(STAT_PRIORS.vpip);
  expect(await openFailure.record([hand(1)])).toEqual({available:false,saved:0});
  const broken=createOpponentService(async()=>({recordObservation(){throw new Error("disk full");},getObservations(){throw new Error("corrupt");},close(){throw new Error("closed");}}));
  expect((await broken.profile(identity,"Villain")).available).toBe(false);
  const writeFailure=createOpponentService(async()=>({recordObservation(){throw new Error("disk full");},getObservations(){return [];},close(){}}));
  expect((await writeFailure.record([hand(1)])).available).toBe(false);
 });
 it("retries after an unavailable database recovers",async()=>{
  let now=0,attempts=0;const db=openDatabase(":memory:");const service=createOpponentService(async()=>{if(attempts++===0)throw new Error("offline");return db;},()=>now);
  expect((await service.profile(identity,"Villain")).available).toBe(false);now=31000;
  expect((await service.record([hand(1)])).available).toBe(true);expect((await service.profile(identity,"Villain")).profile.handsObserved).toBe(1);service.close();
 });
});
