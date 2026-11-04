// Reuse only the existing typed metadata boundary and dictionary reducer.
// No production action recognizer is imported. Production files are unmodified.
import { initializeUtgState, advanceUtgState } from '../../apps/pokernow-extension/src/firstUtgState.ts';
import { normalizePostflopAncillary } from '../../apps/pokernow-extension/src/postflopSourceFields.ts';
import { isDeepStrictEqual as equal } from 'node:util';
export const need=(ok,reason)=>{if(!ok)throw Error(reason);};
export const chips=v=>Number.isSafeInteger(v)&&v>=0;
export const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const own=(v,k)=>Object.hasOwn(v,k);
const bounded=new Set('id hI gN now pre r gT seats iHPI dealerID dealerSeat sBPI bBPI tB pGS cPI pITT smallBlind bigBlind ante deadButton gM mode oTC aD aS cM cR cRPI rHP rHC eventsData version fV nR mTB rIT sPM'.split(' '));
const fields=new Set([...bounded,...'players pC gameResult sBS sNA pASA sNAA mAVTB wBACPI mEV sN mR cHB pot uP aGC aVC dSB gDM pTB sG lE lSPI dLTWTB dLTWoTB ownerID status bigBlindCheck directToNexTurn recordChatForReplay allowStandaloneRebuy rH sPI tHC'.split(' ')]);
const settings='smallBlind bigBlind ante deadButton gM mode version rIT sPM aD aS cM cR mTB aGC aVC dSB gDM pTB sG lE lSPI dLTWTB dLTWoTB ownerID status directToNexTurn recordChatForReplay allowStandaloneRebuy rH sPI tHC'.split(' ');
const safe = v => {
  if(v && typeof v==='object') for(const [k,x] of Object.entries(v)) {
    need(!['__proto__','constructor','prototype'].includes(k),'Unsafe dictionary key'); safe(x);
  }
};
export function project(frame, previousProjection, hero) {
  need(object(frame)&&['registered','gC'].includes(frame.event),'Unsupported envelope');
  need(chips(frame.localReceiveSequence)&&frame.localReceiveSequence>0&&chips(frame.connectionGeneration)&&frame.connectionGeneration>0&&chips(frame.localReceivedAt),'Invalid receipt');
  need(JSON.stringify(frame).length<=2_000_000,'Oversized frame'); safe(frame);
  const registered=frame.event==='registered', raw=registered?frame.payload?.gameState:frame.payload;
  need(object(raw)&&Object.keys(raw).every(k=>fields.has(k)),'Unknown source field');
  need(equal(raw.eventsData,[])&&raw.fV==='0.1.72'&&raw.mEV===0&&chips(raw.now)&&chips(raw.sN),'Invalid transport/version/events');
  if(registered) hero=frame.payload.currentPlayer?.id;
  const previous=previousProjection?.state??null;
  const changed=previous&&raw.hI!==undefined&&raw.hI!==previous.hI;
  const standing=changed&&object(raw.players)?Object.keys(raw.players).find(id=>raw.players[id].status==='standingUp')??null:null;
  const n=normalizePostflopAncillary(raw,standing,hero,registered), normalized=n.normalized;
  for(const k of ['pot','cHB','mR','mAVTB','pASA']) if(own(raw,k)) need(chips(raw[k]),'Invalid monetary/clock field');
  if(own(raw,'sNAA')) need(raw.sNAA===null||chips(raw.sNAA),'Invalid action clock');
  if(own(raw,'sNA')) need(raw.sNA===null||['NSAA','NSAF','NSAGR'].includes(raw.sNA),'Unknown action flag');
  if(own(raw,'wBACPI')) need(Array.isArray(raw.wBACPI)&&raw.wBACPI.length<=10&&new Set(raw.wBACPI).size===raw.wBACPI.length,'Invalid blind obligations');
  if(own(raw,'bigBlindCheck')) need(typeof raw.bigBlindCheck==='boolean','Invalid blind option');
  if(own(raw,'gameResult')&&raw.gameResult!==null&&raw.gameResult!=='<D>') {
    need(object(raw.gameResult)&&Object.keys(raw.gameResult).length===1&&Object.values(raw.gameResult).every(x=>object(x)&&Object.keys(x).every(k=>['gained','position'].includes(k))&&chips(x.gained)&&x.position===1),'Unsupported settlement result');
  }
  const opaque={...(previousProjection?.opaque??{})};
  if(previous) for(const k of settings) if(own(raw,k)) need(equal(raw[k],own(opaque,k)?opaque[k]:previous[k]),`Unsupported settings mutation: ${k}`);
  const p=Object.fromEntries(Object.entries(normalized).filter(([k])=>bounded.has(k)));
  if(raw.gameResult!==undefined&&raw.gameResult!=='<D>') delete p.gameResult;
  if(own(normalized,'players')) p.players=normalized.players;
  if(own(normalized,'pC')) p.pC=Object.fromEntries(Object.entries(normalized.pC).map(([id,h])=>[id,{cards:h.cards.map(c=>({value:id===hero?c.value:null,showing:c.showing}))}]));
  if(own(raw,'tB')) p.tB=Object.fromEntries(Object.entries(raw.tB).map(([id,v])=>[id,v==='check'?0:v]));
  const state=registered?initializeUtgState(p,raw.id,hero):advanceUtgState(previous,p,previous.id,hero);
  for(const id of [...n.referenced,...(raw.wBACPI??[])]) need(own(state.players,id),'Unknown metadata/obligation player');
  for(const id of n.participation) need(previous&&equal(previous.gT,[1,5])&&previous.pGS[id]==='fold'&&id!==hero,'Unsafe participation mutation');
  if(standing) need(equal(previous.gT,[1,5])&&previous.players[standing]?.status==='inGame'&&
    equal(state.iHPI,previous.iHPI.filter(id=>id!==standing))&&state.pGS[standing]==='fold'&&!own(state.pC,standing)&&
    state.players[standing].stack===previous.players[standing].stack&&!['cPI','pITT','dealerID','sBPI','bBPI'].some(k=>state[k]===standing),'Invalid standing boundary');
  // Store opaque settings only to detect mutations; they never establish an action.
  for(const k of settings) if(!bounded.has(k)&&own(raw,k)) opaque[k]=structuredClone(raw[k]);
  need(state.gM==='th'&&state.rIT==='no'&&state.sPM===false&&state.rHP.length===0&&state.rHC===null,'Unsupported game/runout');
  need(state.ante===null||state.ante===0,'Antes need evidence');
  need(chips(state.bigBlind)&&state.bigBlind>0&&chips(state.smallBlind)&&state.smallBlind>0,'Unsupported chip units');
  need(state.iHPI.every(id=>state.players[id]&&['inGame','fold'].includes(state.pGS[id])),'Unsupported eligibility/all-in');
  need(Object.values(state.players).every(p=>chips(p.stack)),'Invalid stacks');
  need(Object.values(state.tB).every(chips),'Invalid contributions');
  const pot=own(raw,'pot')?raw.pot:previousProjection?.pot;
  return {state,raw,hero,opaque,pot,registered,changed:!!changed};
}
