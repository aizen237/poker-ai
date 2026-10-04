import { estimateOpponentProfile, summarizeHand, identityKey, OpponentProfileSchema, type HandObservation, type PlayerIdentity, type OpponentProfile } from "@poker-ai/opponent-db/browser";
import type { PokerGameState, ActionHistory } from "@poker-ai/browser-reader";

/** Background collection runs independently of the recommendation/pot gate. */
export function createLiveOpponentClient(relay:string) {
  let handId=crypto.randomUUID(),lastSync=0,busy=false;
  let storage:"pending"|"available"|"unavailable"="pending";
  let players:{identity:PlayerIdentity;displayName:string}[]=[];
  const pending=new Map<string,HandObservation>(),cache=new Map<string,OpponentProfile>();
  let ambiguous=new Set<string>();
  const identity=(name:string):PlayerIdentity=>({kind:"display_name",scope:location.origin+location.pathname,value:name});
  async function post(route:string,body:unknown) {
    const response=await fetch(relay+route,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error("Opponent storage request failed");return response.json();
  }
  async function sync(){
    if(busy||Date.now()-lastSync<10000)return;busy=true;lastSync=Date.now();
    try{
      const batch=[...pending.entries()].slice(0,50);
      if(batch.length){const saved=await post("/opponents/observations",{observations:batch.map(([,value])=>value)});if(!saved.available)throw new Error("Opponent storage unavailable");for(const [key,value]of batch)if(pending.get(key)===value)pending.delete(key);}
      const result=await post("/opponents/profiles",{players});
      if(!result.available)throw new Error("Opponent storage unavailable");
      for(const raw of result.profiles){const profile=OpponentProfileSchema.parse(raw);cache.set(identityKey(profile.identity),profile);}
      storage="available";
    }catch{storage="unavailable";}finally{busy=false;}
  }
  return {
    observe(state:PokerGameState|null,history:ActionHistory){
      try {
      if(!state){handId=crypto.randomUUID();return;}
      if(history.handBoundary)handId=crypto.randomUUID();
      const opponents=state.seats.filter(s=>s.isOccupied&&!s.isYou&&s.playerName);
      const counts=new Map<string,number>();for(const seat of state.seats.filter(s=>s.isOccupied&&s.playerName))counts.set(seat.playerName!,1+(counts.get(seat.playerName!)??0));
      ambiguous=new Set([...counts].filter(([,n])=>n>1).map(([name])=>name));
      players=opponents.filter(s=>!ambiguous.has(s.playerName!)).map(s=>({identity:identity(s.playerName!),displayName:s.playerName!}));
      for(const seat of opponents){
        if(ambiguous.has(seat.playerName!))continue;
        const observation=summarizeHand({handId,identity:identity(seat.playerName!),displayName:seat.playerName!,seat:seat.seatNumber,
          coverage:"partial",actions:history.records.get(seat.seatNumber)??[],dealtInKnown:false,sawFlop:null,wentToShowdown:null,wonAtShowdown:null,notes:history.notes});
        pending.set(identityKey(observation.identity)+handId,observation);
      }
      // Bounded memory during relay outages; never affect the live decision loop.
      while(pending.size>200)pending.delete(pending.keys().next().value!);
      if(cache.size>200)cache.delete(cache.keys().next().value!);
      void sync();
      } catch { storage="unavailable"; }
    },
    profile(name:string|null){
      if(!name||name.length>150||identity(name).scope.length>500||ambiguous.has(name))return null;
      return {playerProfile:storage==="available"?(cache.get(identityKey(identity(name)))??estimateOpponentProfile(identity(name),name,[])):estimateOpponentProfile(identity(name),name,[]),statsStorage:storage};
    },
    tick(){void sync();},
  };
}
