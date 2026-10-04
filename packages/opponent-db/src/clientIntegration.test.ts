import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLiveOpponentClient } from "../../../apps/pokernow-extension/src/opponentStats.js";
import { estimateOpponentProfile } from "./estimates.js";
const state={seats:[{seatNumber:1,isOccupied:true,isYou:true,playerName:"Hero"},{seatNumber:2,isOccupied:true,isYou:false,playerName:"Villain"}]} as any;
const history={handBoundary:true,records:new Map([[2,[{seat:2,street:"preflop",action:"raise",wagerAction:null,observation:2,amount:6}]]]),notes:[]} as any;
describe("live opponent collector integration",()=>{
 beforeEach(()=>{let id=0;vi.stubGlobal("crypto",{randomUUID:()=>"window-"+(++id)});vi.stubGlobal("location",{origin:"https://www.pokernow.club",pathname:"/games/test"});vi.spyOn(Date,"now").mockReturnValue(20000);});
 afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
 it("uploads partial per-hand summaries, reads persisted profiles and keeps rates at priors",async()=>{
  let saved:any[]=[];const fetchMock=vi.fn(async(url:string,options:any)=>{
   const body=JSON.parse(options.body);
   if(url.endsWith("observations")){saved=body.observations;return {ok:true,json:async()=>({available:true,saved:saved.length})};}
   return {ok:true,json:async()=>({available:true,profiles:body.players.map((p:any)=>estimateOpponentProfile(p.identity,p.displayName,saved))})};
  });vi.stubGlobal("fetch",fetchMock);
  const client=createLiveOpponentClient("http://localhost:8787");client.observe(state,history);
  await vi.waitFor(()=>expect(client.profile("Villain")?.statsStorage).toBe("available"));
  expect(saved).toHaveLength(1);expect(saved[0].coverage).toBe("partial");expect(saved[0].metrics.vpip).toBeNull();expect(saved[0].actions[0].action).toBe("raise");
  expect(client.profile("Villain")!.playerProfile.handsObserved).toBe(1);expect(client.profile("Villain")!.playerProfile.stats.vpip.samples).toBe(0);
 });
 it("storage failure never throws into the observer or profile reader",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")));
  const client=createLiveOpponentClient("http://localhost:8787");expect(()=>client.observe(state,history)).not.toThrow();
  await vi.waitFor(()=>expect(client.profile("Villain")?.statsStorage).toBe("unavailable"));
  expect(client.profile("Villain")!.playerProfile.stats.vpip.estimate).toBe(0.25);
 });
 it("does not merge duplicate display names at the same table",async()=>{
  const fetchMock=vi.fn(async()=>({ok:true,json:async()=>({available:true,profiles:[]})}));vi.stubGlobal("fetch",fetchMock);
  const client=createLiveOpponentClient("http://localhost:8787");client.observe({seats:[...state.seats,{...state.seats[1],seatNumber:3}]} as any,history);
  expect(client.profile("Villain")).toBeNull();await vi.waitFor(()=>expect(fetchMock).toHaveBeenCalled());
  expect(fetchMock.mock.calls.some(call=>String(call[0]).endsWith("observations"))).toBe(false);
 });
});
