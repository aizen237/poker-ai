import fs from 'node:fs';
import path from 'node:path';
import {cases,capture,framesOf,root} from './captures.mjs';
import {replay} from './replay.mjs';
const type=v=>v===null?'null':Array.isArray(v)?'array':typeof v;
const payload=f=>f.event==='registered'?f.payload.gameState:f.payload;
const fields=new Map(),shapes=new Set(),nested={players:new Set(),pC:new Set()},events={},actionFlags={},casesOut=[];
let total=0;
for(const [hand,file,street]of cases){
 const c=capture(file);if(!c)continue;const frames=framesOf(c);total+=frames.length;
 for(const frame of frames){const p=payload(frame);shapes.add(`${frame.event}:${Object.keys(p).sort().join(',')}`);
  for(const[k,v]of Object.entries(p)){const x=fields.get(k)??new Set();x.add(type(v));fields.set(k,x);
   if(k==='players'||k==='pC')for(const item of Object.values(v??{}))if(item&&typeof item==='object')nested[k].add(Object.keys(item).sort().join(','));}
  if(frame.event==='registered')events.registered=(events.registered??0)+1;else events.gC=(events.gC??0)+1;
  if(p.sNA)actionFlags[p.sNA]=(actionFlags[p.sNA]??0)+1;
 }
 const out=replay(c,{targetHand:hand});
 casesOut.push({hand,frames:frames.length,result:out.failure?'rejected':'accepted',failure:out.failure?.error??null,
  street:out.state?.street??null,pot:out.state?.collectedPot??null,actions:out.state?.actions.length??0,
  actionTypes:out.state?.actions.reduce((m,a)=>(m[a.type]=(m[a.type]??0)+1,m),{})??{},actionPrefixComplete:out.state?.coverage.actionPrefixComplete??false,
  liveAuthorized:out.state?.liveAuthorized??false,domCheckpoint:c.checkpoints?.some(x=>x.observation?.unverifiedObservations?.ui)??false});
}
const report={captureCount:casesOut.length,frameCount:total,envelopeCounts:events,patchShapeVariants:shapes.size,
 nestedDictionaryShapeVariants:Object.fromEntries(Object.entries(nested).map(([k,v])=>[k,[...v].filter(Boolean).sort()])),
 topLevelFields:Object.fromEntries([...fields].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,[...v].sort()])),sourceActionFlags:actionFlags,
 coverage:casesOut, comparison:{previousSource:{handsWithTargetStreetWindows:8,requestedHands:8,hand511RiverWindow:false,hand511LastWindow:'turn at frame 26'},
  prototype:{handsWithContinuousTargetActionPrefixes:casesOut.filter(x=>x.result==='accepted'&&x.actionPrefixComplete).length,
   hand511RiverTransition:casesOut.find(x=>x.hand===511)?.street==='river',syntheticBetCallCases:8,liveAuthorization:false}}};
fs.writeFileSync(path.join(root,'prototypes/game-state-p1/coverage-matrix.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Observed ${report.captureCount} captures / ${total} frames / ${fields.size} gameplay and metadata fields / ${shapes.size} envelope key shapes.`);
console.log(`Existing windows: 8/8 earlier hands; #511 river absent. Prototype target action prefixes: ${report.comparison.prototype.handsWithContinuousTargetActionPrefixes}/9; #511 river ${report.comparison.prototype.hand511RiverTransition?'PASS':'FAIL'}; synthetic amount/order cases ${report.comparison.prototype.syntheticBetCallCases}.`);
