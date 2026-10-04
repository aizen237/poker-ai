import { parseCards } from "@poker-ai/shared";
import { describe, expect, it } from "vitest";
import { evaluateShove } from "./pushFold.js";
describe("shove model availability", () => {
  it.each([5, 10, 20, 45, 100])("does not invent equity or advice at %s BB", (stack) => {
    expect(evaluateShove(parseCards("Kd Qh"), stack, 1.5)).toMatchObject({status:"unavailable", authoritative:false, ev:null, equityIfCalled:null, foldEquityUsed:null, isProfitable:null});
  });
  it("labels explicit fold equity as an assumption without making EV available", () => {
    const result=evaluateShove(parseCards("As Ah"),10,1.5,{foldEquity:0.5});
    expect(result.foldEquityUsed).toBe(0.5);
    expect(result.reason).toContain("assumption");
    expect(result.ev).toBeNull();
  });
  it.each([-1, 1.1, NaN, Infinity])("rejects invalid fold equity %s", (foldEquity) => {
    expect(()=>evaluateShove(parseCards("As Ah"),10,1.5,{foldEquity})).toThrow();
  });
  it.each([0,-1,NaN,Infinity])("rejects invalid chips %s", (n)=>{
    expect(()=>evaluateShove(parseCards("As Ah"),n,1.5)).toThrow();
    expect(()=>evaluateShove(parseCards("As Ah"),10,n)).toThrow();
  });
});
