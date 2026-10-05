import { estimateOpponentProfile } from "./estimates.js";
import type { HandObservation, PlayerIdentity } from "./observations.js";
interface ObservationStore {
 recordObservation(observation:HandObservation):void;
 getObservations(identity:PlayerIdentity):HandObservation[];
 close():void;
}
/** Storage failures return unavailable status and priors without throwing. Policy decides whether to abstain. */
export function createOpponentService(open:()=>Promise<ObservationStore>, now:()=>number=Date.now) {
 let store:ObservationStore|null=null,pending:Promise<ObservationStore|null>|null=null,retryAt=0;
 async function getStore():Promise<ObservationStore|null>{
  if(store)return store;if(now()<retryAt)return null;
  if(!pending) pending=Promise.resolve().then(open).then(value=>{store=value;return value;}).catch(()=>{retryAt=now()+30000;return null;}).finally(()=>{pending=null;});
  return pending;
 }
 function failed(){try{store?.close();}catch{}store=null;retryAt=now()+30000;}
 return {
  async record(observations:HandObservation[]){
   const db=await getStore();if(!db)return {available:false,saved:0};
   let saved=0;try{for(const observation of observations){db.recordObservation(observation);saved++;}return {available:true,saved};}catch{failed();return {available:false,saved};}
  },
  async profile(identity:PlayerIdentity,displayName:string){
   try{const db=await getStore();return {available:db!==null,profile:estimateOpponentProfile(identity,displayName,db?.getObservations(identity)??[])};}
   catch{failed();return {available:false,profile:estimateOpponentProfile(identity,displayName,[])};}
  },
  close(){try{store?.close();}catch{}store=null;},
 };
}
