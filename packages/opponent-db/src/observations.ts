import { z } from "zod";
export const PlayerIdentitySchema = z.object({
  kind: z.enum(["player_id", "display_name"]), scope: z.string().min(1).max(500), value: z.string().min(1).max(150),
});
export const ProfileLookupSchema=z.object({identity:PlayerIdentitySchema,displayName:z.string().min(1).max(150)});
export type PlayerIdentity = z.infer<typeof PlayerIdentitySchema>;
export const metricNames = ["vpip","pfr","threeBet","foldToThreeBet","cBet","foldToCBet","wtsd","wsd"] as const;
export type RateMetric = typeof metricNames[number];
const nullableFlag = z.boolean().nullable();
export const HandObservationSchema = z.object({
  handId: z.string().min(1).max(150), identity: PlayerIdentitySchema, displayName: z.string().min(1).max(150),
  coverage: z.enum(["partial","complete"]),
  metrics: z.object({ vpip:nullableFlag,pfr:nullableFlag,threeBet:nullableFlag,foldToThreeBet:nullableFlag,cBet:nullableFlag,foldToCBet:nullableFlag,wtsd:nullableFlag,wsd:nullableFlag }),
  aggression: z.object({betsAndRaises:z.number().int().nonnegative().max(1000),calls:z.number().int().nonnegative().max(1000)}).nullable(),
  actions: z.array(z.object({seat:z.number().int().positive(),street:z.enum(["preflop","flop","turn","river"]),action:z.enum(["post_blind","check","call","bet","raise","fold","all-in"]),observation:z.number().int().nonnegative(),wagerAction:z.enum(["call","bet","raise"]).nullable().optional()})).max(1000),
  observedActions: z.number().int().nonnegative().max(1000), notes:z.array(z.string().max(500)).max(100),
}).superRefine((value,ctx)=>{
  if(value.coverage === "partial" && (Object.values(value.metrics).some(v=>v!==null)||value.aggression!==null)) ctx.addIssue({code:z.ZodIssueCode.custom,message:"Partial histories cannot supply unbiased rate denominators"});
});
export type HandObservation = z.infer<typeof HandObservationSchema>;
export function identityKey(identity: PlayerIdentity): string {
  const valid=PlayerIdentitySchema.parse(identity);
  return JSON.stringify([valid.kind,valid.scope,valid.value]);
}
export interface SummaryAction {
  seat:number; street:"preflop"|"flop"|"turn"|"river";
  action:"post_blind"|"check"|"call"|"bet"|"raise"|"fold"|"all-in";
  wagerAction?:"call"|"bet"|"raise"|null;
  observation:number;
}
export interface HandEvidence {
  handId:string; identity:PlayerIdentity; displayName:string; seat:number;
  /** Complete means a verified, finished hand including every player's actions. Polling is partial. */
  coverage:"partial"|"complete"; actions:readonly SummaryAction[];
  dealtInKnown:boolean; sawFlop:boolean|null; wentToShowdown:boolean|null; wonAtShowdown:boolean|null;
  notes?:string[];
}
/** Unknown != false. Partial positive sightings are retained for audit, not used
 * as successes in a biased sample selected only when an action was visible. */
export function summarizeHand(e:HandEvidence):HandObservation {
  const metrics:HandObservation["metrics"]={vpip:null,pfr:null,threeBet:null,foldToThreeBet:null,cBet:null,foldToCBet:null,wtsd:null,wsd:null};
  const events=e.actions.filter(a=>a.action!=="post_blind");
  const streetOrder=["preflop","flop","turn","river"];
  const ordered=events.every((a,i)=>i===0 || (a.observation>events[i-1]!.observation && streetOrder.indexOf(a.street)>=streetOrder.indexOf(events[i-1]!.street)));
  const complete=e.coverage==="complete" && e.dealtInKnown && ordered && events.every(a=>a.action!=="all-in");
  const own=events.filter(a=>a.seat===e.seat);
  const verb=(a:SummaryAction)=>a.action==="all-in"?a.wagerAction:a.action;
  let aggression:HandObservation["aggression"]=null;
  if(complete){
    const pre=events.filter(a=>a.street==="preflop");
    metrics.vpip=pre.some(a=>a.seat===e.seat&&["call","raise","bet"].includes(verb(a)??""));
    metrics.pfr=pre.some(a=>a.seat===e.seat&&["raise","bet"].includes(verb(a)??""));
    let raises=0,firstRaiser:number|null=null,lastRaiser:number|null=null;
    for(const a of pre){
      const v=verb(a);
      if(a.seat===e.seat && raises===1 && lastRaiser!==e.seat) metrics.threeBet=v==="raise"||v==="bet";
      // Fold-to-3bet: initial raiser's response to exactly one re-raise.
      if(a.seat===e.seat && raises===2 && firstRaiser===e.seat && lastRaiser!==e.seat) metrics.foldToThreeBet=v==="fold";
      if(v==="raise"||v==="bet"){raises++;firstRaiser??=a.seat;lastRaiser=a.seat;}
    }
    let flopAggression=false,cBetFacing=false;
    for(const a of events.filter(a=>a.street==="flop")){
      const v=verb(a);
      if(a.seat===e.seat && lastRaiser===e.seat && !flopAggression && ["check","bet"].includes(v??"")) metrics.cBet=v==="bet";
      if(a.seat===e.seat && cBetFacing && lastRaiser!==e.seat && ["fold","call","raise"].includes(v??"")) metrics.foldToCBet=v==="fold";
      if(v==="bet"||v==="raise"){
        cBetFacing=!flopAggression && v==="bet" && a.seat===lastRaiser;
        flopAggression=true;
      }
    }
    metrics.wtsd=e.sawFlop===true?e.wentToShowdown:null;
    metrics.wsd=e.wentToShowdown===true?e.wonAtShowdown:null;
    const post=own.filter(a=>a.street!=="preflop");
    aggression={betsAndRaises:post.filter(a=>["bet","raise"].includes(verb(a)??"")).length,calls:post.filter(a=>verb(a)==="call").length};
  }
  return HandObservationSchema.parse({handId:e.handId,identity:e.identity,displayName:e.displayName,coverage:complete?"complete":"partial",metrics,aggression,observedActions:own.length,actions:own,
    notes:[...(e.notes??[]),...(!complete?["Partial observation window; rate denominators and missed actions remain unknown."]:[])]});
}
