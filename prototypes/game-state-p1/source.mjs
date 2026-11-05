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
const fields=new Set([...bounded,...'players pC gameResult sBS sNA pASA sNAA mAVTB wBACPI mEV sN mR cHB pot uP aGC aVC dSB gDM pTB sG lE lSPI dLTWTB dLTWoTB ownerID status bigBlindCheck directToNexTurn recordChatForReplay allowStandaloneRebuy rH sPI tHC nB nBA'.split(' ')]);
const settings='deadButton gM mode version rIT sPM aS cM cR mTB aGC aVC dSB gDM pTB sG lE lSPI ownerID status recordChatForReplay allowStandaloneRebuy rH sPI tHC'.split(' ');
const levelFields=['smallBlind','bigBlind','ante'];
const timeFields=['pASA','sNAA','dLTWTB','dLTWoTB','nBA'];
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
  const changed=!!previous&&((raw.hI!==undefined&&raw.hI!==previous.hI)||(raw.gN!==undefined&&raw.gN!==previous.gN));
  const standing=changed&&object(raw.players)?Object.keys(raw.players).find(id=>raw.players[id].status==='standingUp')??null:null;
  const ancillaryRaw={...raw};delete ancillaryRaw.pC;
  const n=normalizePostflopAncillary(ancillaryRaw,standing,hero,registered), normalized=n.normalized;
  const cardIds=[];
  if(own(raw,'pC')) {
    need(object(raw.pC)&&Object.keys(raw.pC).length<=10,'Invalid opaque card dictionary');
    for(const [id,hand] of Object.entries(raw.pC)) {
      need(object(hand)&&Object.keys(hand).length<=8&&Object.keys(hand).every(k=>['cards','prob1','name1','name2','name1RH','name2RH'].includes(k)),'Invalid opaque card record');
      if(own(hand,'cards'))need(Array.isArray(hand.cards)&&hand.cards.length<=2&&hand.cards.every(object),'Invalid opaque card payload');
      for(const k of ['prob1','name1','name2','name1RH','name2RH'])if(own(hand,k))
        need(hand[k]===null||typeof hand[k]==='string'&&hand[k].length<=32||typeof hand[k]==='number'&&Number.isFinite(hand[k]),'Invalid opaque card metadata');
      cardIds.push(id);
    }
    // Hole cards and their descriptions are irrelevant to the state replay and
    // stay out of every derived snapshot. Keep only empty records for reducer shape.
    normalized.pC=Object.fromEntries(cardIds.map(id=>[id,{cards:[{value:null,showing:false},{value:null,showing:false}]}]));
  }
  for(const k of ['pot','cHB','mR','mAVTB',...timeFields]) if(own(raw,k)) need(raw[k]===null||chips(raw[k]),'Invalid monetary/clock field');
  if(own(raw,'sNAA')) need(raw.sNAA===null||chips(raw.sNAA),'Invalid action clock');
  if(own(raw,'sNA')) need(raw.sNA===null||['FCPFS','NSAA','NSAF','NSAGR','NSAAD'].includes(raw.sNA),'Unknown action flag');
  if(own(raw,'nB')) need(Array.isArray(raw.nB)&&raw.nB.length===4&&raw.nB.every(chips),'Invalid opaque next-level data');
  if(own(raw,'nBA')) need(raw.nBA===null||chips(raw.nBA),'Invalid opaque next-level timestamp');
  if(own(raw,'wBACPI')) need(Array.isArray(raw.wBACPI)&&raw.wBACPI.length<=10&&new Set(raw.wBACPI).size===raw.wBACPI.length,'Invalid blind obligations');
  if(own(raw,'bigBlindCheck')) need(raw.bigBlindCheck===null||typeof raw.bigBlindCheck==='boolean','Invalid blind option');
  if(own(raw,'gameResult')&&raw.gameResult!==null&&raw.gameResult!=='<D>') {
    need(object(raw.gameResult)&&Object.keys(raw.gameResult).length===1&&Object.values(raw.gameResult).every(x=>object(x)&&Object.keys(x).every(k=>['gained','position'].includes(k))&&chips(x.gained)&&x.position===1),'Unsupported settlement result');
  }
  const opaque={...(previousProjection?.opaque??{})};
  if(previous) for(const k of settings) if(own(raw,k)) need(equal(raw[k],own(opaque,k)?opaque[k]:previous[k]),`Unsupported settings mutation: ${k}`);
  if(previous&&!changed) for(const k of levelFields) if(own(raw,k))
    need(equal(raw[k],previous[k]),`Blind level changed inside hand: ${k}`);
  const p=Object.fromEntries(Object.entries(normalized).filter(([k])=>bounded.has(k)));
  if(raw.gameResult!==undefined&&raw.gameResult!=='<D>') delete p.gameResult;
  if(own(normalized,'players')) p.players=normalized.players;
  if(own(normalized,'pC')) p.pC=Object.fromEntries(Object.entries(normalized.pC).map(([id,h])=>[id,{cards:h.cards.map(c=>({value:id===hero?c.value:null,showing:c.showing}))}]));
  if(own(raw,'tB')) p.tB=Object.fromEntries(Object.entries(raw.tB).map(([id,v])=>[id,v==='check'?0:v]));
  const state=registered?initializeUtgState(p,raw.id,hero):advanceUtgState(previous,p,previous.id,hero);
  for(const id of [...n.referenced,...cardIds,...(raw.wBACPI??[])]) need(own(state.players,id),'Unknown metadata/obligation player');
  for(const id of n.participation) need(previous&&equal(previous.gT,[1,5])&&previous.pGS[id]==='fold'&&id!==hero,'Unsafe participation mutation');
  if(standing) need(equal(previous.gT,[1,5])&&previous.players[standing]?.status==='inGame'&&
    equal(state.iHPI,previous.iHPI.filter(id=>id!==standing))&&state.pGS[standing]==='fold'&&!own(state.pC,standing)&&
    state.players[standing].stack===previous.players[standing].stack&&!['cPI','pITT','dealerID','sBPI','bBPI'].some(k=>state[k]===standing),'Invalid standing boundary');
  // Future level descriptions and source countdowns stay validated, opaque data.
  for(const k of ['nB','nBA','dLTWTB','dLTWoTB','bigBlindCheck']) if(own(raw,k)) opaque[k]=structuredClone(raw[k]);
  // Stable table settings are retained only to detect mutations; they never establish an action.
  for(const k of settings) if(!bounded.has(k)&&own(raw,k)) opaque[k]=structuredClone(raw[k]);
  need(state.gM==='th'&&state.rIT==='no'&&state.sPM===false&&state.rHP.length===0&&state.rHC===null,'Unsupported game/runout');
  need(state.ante===null||chips(state.ante),'Invalid ante');
  need(chips(state.bigBlind)&&state.bigBlind>0&&chips(state.smallBlind)&&state.smallBlind>0,'Unsupported chip units');
  need(state.iHPI.every(id=>state.players[id]&&['inGame','fold','allIn'].includes(state.pGS[id])),'Unsupported eligibility/all-in');
  need(Object.values(state.players).every(p=>chips(p.stack)),'Invalid stacks');
  need(Object.values(state.tB).every(chips),'Invalid contributions');
  const pot=own(raw,'pot')?raw.pot:previousProjection?.pot;
  return {state,raw,hero,opaque,pot,registered,changed:!!changed};
}
