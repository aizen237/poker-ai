import { estimateOpponentProfile } from "@poker-ai/opponent-db/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateDecisionPacket, describeEquitySource, opponentRangePromptLines } from "./decisionPacket.js";
import { createGroqProvider } from "./providers/groq.js";
import { createGeminiProvider } from "./providers/gemini.js";
import { createNvidiaProvider } from "./providers/nvidia.js";
function packet() {
 return validateDecisionPacket({hero:{holeCards:[{rank:14,suit:"s"},{rank:12,suit:"d"}],position:"CO",stackBB:45},
  table:{street:"flop",board:[{rank:2,suit:"c"},{rank:7,suit:"h"},{rank:8,suit:"d"}],potBB:10,numOpponentsRemaining:2},
  facingAction:{type:"none"},candidateActions:["CHECK","BET","ALL_IN"],dataConfidence:"high",
  engineCalculations:{equity:0.35,equitySource:"estimated_multiway_ranges"},
  opponentContext:{rangeConfidence:"low",rangeStatus:"modeled",rangeAssumptions:["Independent weighted priors conditioned on legal cards"],rangeFallbacks:[],opponents:[
   {seat:2,position:"UTG",rangeBasis:"UTG open",rangeConfidence:"medium",rangeStatus:"modeled"},
   {seat:3,position:"BTN",rangeBasis:"BTN call",rangeConfidence:"low",rangeStatus:"modeled",statsStorage:"available",playerProfile:estimateOpponentProfile({kind:"display_name",scope:"table-test",value:"Villain"},"Villain",[])},
  ]},
 });
}
describe("multiway equity evidence",()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it("preserves separate seat evidence and distinct equity provenance",()=>{
  const p=packet();expect(p.engineCalculations.equitySource).toBe("estimated_multiway_ranges");
  expect(p.opponentContext?.opponents).toHaveLength(2);
  const text=opponentRangePromptLines(p).join(" ");expect(text).toContain("seat 2 (UTG)");expect(text).toContain("seat 3 (BTN)");
  expect(describeEquitySource("random_hands")).toContain("not modeled opponent ranges");
  expect(describeEquitySource("estimated_multiway_ranges")).toContain("distinct weighted opponent ranges");
 });
 it.each([createGroqProvider,createGeminiProvider,createNvidiaProvider])("labels range-based and random multiway equity distinctly in provider requests",async create=>{
  const content=JSON.stringify({action:"CHECK",confidence:0.3,reasoning:"Uncertain range model"});
  const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({choices:[{message:{content}}],candidates:[{content:{parts:[{text:content}]}}]})});
  vi.stubGlobal("fetch",fetchMock);const provider=create({apiKey:"test-only"});const p=packet();
  await provider.getRecommendation(p);
  expect(fetchMock.mock.calls[0]![1].body).toContain("estimated jointly against distinct weighted opponent ranges");
  expect(fetchMock.mock.calls[0]![1].body).toContain("seat 3 (BTN)");
  expect(fetchMock.mock.calls[0]![1].body).toContain("Opponent statistics for seat 3");
  expect(fetchMock.mock.calls[0]![1].body).not.toContain("table-test");
  expect(fetchMock.mock.calls[0]![1].body).toContain("each stat's opportunity count");
  p.engineCalculations.equitySource="random_hands";p.opponentContext!.opponents![1]!.rangeStatus="prior_only";
  p.opponentContext!.rangeStatus="prior_only";p.opponentContext!.rangeFallbacks=["BTN range unavailable; all opponents sampled as random hands"];
  await provider.getRecommendation(p);
  expect(fetchMock.mock.calls[1]![1].body).toContain("computed against random hands, not modeled opponent ranges");
  expect(fetchMock.mock.calls[1]![1].body).not.toContain("estimated jointly against distinct weighted opponent ranges");
 });
});
