import { createGroqProvider } from "./providers/groq.js";
import { createGeminiProvider } from "./providers/gemini.js";
import { createNvidiaProvider } from "./providers/nvidia.js";
import { describe, expect, it, vi, afterEach } from "vitest";
import { buildPreflopContext, preflopUncertainty, preflopPromptLines, type PreflopInput } from "./preflopContext.js";
import { validateDecisionPacket, type DecisionPacket } from "./decisionPacket.js";
import { getPreflopOpeningReference } from "@poker-ai/range-engine";
function player(seat:number, position:PreflopInput["players"][number]["position"], remainingStackBB=100, contributionBB=0) {
 return {seat,position,remainingStackBB,contributionBB,folded:false,allIn:false};
}
function action(seat:number, totalContributionBB:number, observation:number, kind:PreflopInput["actions"][number]["action"]="raise") {
 return {seat,totalContributionBB,observation,action:kind,wagerAction:null};
}
function open():PreflopInput {
 return {heroSeat:1,players:[player(1,"BTN",45),player(2,"UTG",85,15)],playersDealtIn:6,
 potBB:16.5,amountToCallBB:15,contributionMeaning:"street_total",historyCoverage:"complete",
 actions:[action(2,15,1)],historyNotes:[],tournamentContext:"chip_ev_only"};
}
function packet(input:PreflopInput):DecisionPacket {
 const preflop=buildPreflopContext(input);
 return {hero:{holeCards:[{rank:13,suit:"d"},{rank:12,suit:"h"}],position:preflop.heroPosition!,stackBB:preflop.heroStackBB!},
 table:{street:"preflop",board:[],potBB:input.potBB!,numOpponentsRemaining:preflop.activeOpponents},
 facingAction:{type:"raise",amountBB:input.amountToCallBB!},candidateActions:["FOLD","CALL","RAISE","ALL_IN"],engineCalculations:{},dataConfidence:"high",preflop};
}
function unopened():PreflopInput {
 return {...open(),players:[player(1,"UTG"),player(2,"HJ"),player(3,"CO"),player(4,"BTN"),player(5,"SB",99.5,0.5),player(6,"BB",99,1)],
 actions:[],potBB:1.5,amountToCallBB:1};
}
describe("structured preflop context",()=>{
 it.each(["BTN","SB","BB"] as const)("KQ 45BB vs UTG raise-to 15BB from %s does not authorize a call",position=>{
  const input=open();input.players[0]!.position=position;
  const p=validateDecisionPacket(packet(input));
  expect(p.preflop).toMatchObject({situation:"facing_open",heroStackBB:45,raiseToBB:15,effectiveStackBB:45,decisionSupport:"uncertain",blindDefending:position!=="BTN"});
  expect(preflopUncertainty(p)).not.toBeNull();expect(p.engineCalculations.equity).toBeUndefined();
 });
 it("preserves a late-position raiser and a shorter effective stack",()=>{
  const input=open();input.players[1]!.position="CO";input.players[1]!.remainingStackBB=5;
  expect(buildPreflopContext(input)).toMatchObject({effectiveStackBB:20,lastAggressorSeat:2,decisionSupport:"uncertain"});
  expect(buildPreflopContext(input).players[1]!.position).toBe("CO");
 });
 it("distinguishes 15BB total from the 12BB owed after hero opened to 3BB",()=>{
  const input=open();input.players[0]!.contributionBB=3;input.amountToCallBB=12;input.actions=[action(1,3,1),action(2,15,2)];
  expect(buildPreflopContext(input)).toMatchObject({situation:"facing_3bet",raiseToBB:15,amountToCallBB:12,effectiveStackBB:48,decisionSupport:"uncertain"});
 });
 it("recognizes a 4-bet from prior action, not raise size",()=>{
  const input=open();input.players[0]!.contributionBB=7;input.amountToCallBB=8;
  input.actions=[action(2,3,1),action(1,7,2),action(2,15,3)];
  expect(buildPreflopContext(input).situation).toBe("facing_4bet_or_more");
 });
 it("recognizes open plus caller with pairwise effective stacks",()=>{
  const input=open();input.players.push(player(3,"CO",20,15));input.actions.push(action(3,15,2,"call"));
  const c=buildPreflopContext(input);expect(c.situation).toBe("facing_open_and_callers");expect(c.activeOpponents).toBe(2);
  expect(c.effectiveStackBB).toBeNull();expect(c.effectiveStacks.map(p=>p.effectiveStackBB)).toEqual([45,35]);expect(c.decisionSupport).toBe("uncertain");
 });
 it.each(["increment","unknown"] as const)("does not interpret a 15BB %s as raise-to",meaning=>{
  const input=open();input.contributionMeaning=meaning;const c=buildPreflopContext(input);
  expect(c.raiseToBB).toBeNull();expect(c.situation).toBe("unknown");expect(c.effectiveStackBB).toBeNull();
 });
 it("does not infer raise level from partial opponent-only history",()=>{
  const input=open();input.historyCoverage="partial";
  expect(buildPreflopContext(input)).toMatchObject({situation:"facing_raise_unknown_level",lastAggressorSeat:null,decisionSupport:"uncertain"});
 });
 it("does not order actions observed together",()=>{
  const input=open();input.players[0]!.contributionBB=3;input.amountToCallBB=12;input.actions.unshift(action(1,3,1));
  expect(buildPreflopContext(input).situation).toBe("facing_raise_unknown_level");
 });
 it("rejects contradictory call amounts as evidence of a full sequence",()=>{
  const input=open();input.amountToCallBB=5;expect(buildPreflopContext(input).situation).toBe("facing_raise_unknown_level");
 });
 it("recognizes verified unopened six-max deep-stack reference coverage",()=>{
  const c=buildPreflopContext(unopened());expect(c.situation).toBe("unopened");expect(c.openingReference.applicable).toBe(true);expect(c.decisionSupport).toBe("ai_judgment");
 });
 it("recognizes a limp without applying RFI charts",()=>{
  const input=unopened();input.players[1]!.contributionBB=1;input.actions=[action(2,1,1,"call")];
  expect(buildPreflopContext(input)).toMatchObject({situation:"limped_pot",decisionSupport:"uncertain",openingReference:{applicable:false}});
 });
 it.each([10,20,45,99])("does not apply deep-stack ranges or pure push/fold at %s BB",stack=>{
  const input=unopened();input.players[0]!.remainingStackBB=stack;
  const c=buildPreflopContext(input);expect(c.openingReference.applicable).toBe(false);expect(c.pushFold).toBe("not_applicable");expect(c.decisionSupport).toBe("uncertain");
 });
 it("only screens short blind-vs-blind unopened play for further modeling",()=>{
  const input=unopened();input.players=[player(1,"SB",9.5,0.5),player(2,"BB",9,1)];input.playersDealtIn=2;input.amountToCallBB=0.5;
  expect(buildPreflopContext(input)).toMatchObject({pushFold:"requires_calling_model",decisionSupport:"uncertain"});
 });
 it("preserves unknown All In stack and unknown wager type",()=>{
  const input=open();input.players[1]!.remainingStackBB=null;input.players[1]!.allIn=true;input.actions[0]!.action="all-in";
  expect(buildPreflopContext(input)).toMatchObject({effectiveStackBB:null,situation:"facing_raise_unknown_level",decisionSupport:"uncertain"});
 });
 it("does not count a short all-in as a full re-raise",()=>{
  const input=open();input.players[0]!.contributionBB=10;input.amountToCallBB=5;
  input.actions=[action(1,10,1),{...action(2,15,2,"all-in"),wagerAction:"raise"}];
  expect(buildPreflopContext(input).situation).toBe("facing_raise_unknown_level");
 });
 it("excludes folded players from active opponent count",()=>{
  const input=open();input.players.push({...player(3,"CO"),folded:true});expect(buildPreflopContext(input).activeOpponents).toBe(1);
 });
 it.each(["pot","position","tournament","dealt"])("withholds AI fallback when %s is unknown",field=>{
  const input=unopened();if(field==="pot")input.potBB=null;if(field==="position")input.players[0]!.position=null;if(field==="tournament")input.tournamentContext="unknown";if(field==="dealt")input.playersDealtIn=null;
  expect(buildPreflopContext(input).decisionSupport).toBe("uncertain");
 });
 it("returns no BB response range instead of an empty opening range",()=>{
  expect(getPreflopOpeningReference({position:"BB",effectiveStackBB:100,playersDealtIn:6,unopened:true})).toBeNull();
  expect(getPreflopOpeningReference({position:"BTN",effectiveStackBB:100,playersDealtIn:6,unopened:false})).toBeNull();
 });
 it("recomputes client-supplied eligibility and rejects contradictory packet facts",()=>{
  const p=packet(open());p.preflop!.decisionSupport="ai_judgment";expect(preflopUncertainty(validateDecisionPacket(p))).not.toBeNull();
  p.hero.stackBB=100;expect(()=>validateDecisionPacket(p)).toThrow("contradicts");
 });
 it("blocks legacy preflop packets without affecting postflop",()=>{
  const p=packet(open());delete p.preflop;expect(preflopUncertainty(p)).not.toBeNull();p.table.street="flop";
  expect(preflopUncertainty(p)).toBeNull();expect(preflopPromptLines(p)).toEqual([]);
 });
 it("includes structured context and assumption limits in prompts",()=>{
  const text=preflopPromptLines(packet(open())).join(" ");expect(text).toContain("facing_open");expect(text).toContain("Hand strength alone");expect(text).toContain("100BB+");
 });
});

describe("provider preflop integration",()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it.each([createGroqProvider,createGeminiProvider,createNvidiaProvider])("sends context to each provider without affecting postflop prompts",async create=>{
  const content=JSON.stringify({action:"RAISE",confidence:0.3,reasoning:"Reference only; AI judgment."});
  const mock=vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content}}],candidates:[{content:{parts:[{text:content}]}}]})});
  vi.stubGlobal("fetch",mock);
  const provider=create({apiKey:"test-only"});const p=packet(unopened());
  await provider.getRecommendation(p);
  expect(mock.mock.calls[0]![1].body).toContain("Structured preflop context");
  delete p.preflop;p.table.street="flop";p.table.board=[{rank:2,suit:"c"},{rank:3,suit:"h"},{rank:8,suit:"d"}];
  await provider.getRecommendation(p);
  expect(mock.mock.calls[1]![1].body).not.toContain("Structured preflop context");
 });
});
