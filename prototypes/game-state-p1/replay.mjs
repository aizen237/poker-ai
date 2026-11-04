import { project, need, chips } from './source.mjs';
import { startRound, act } from './rules.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const cards=s=>s.oTC?.['1']??[];
const streetOf=n=>({0:'preflop',1:'flop',2:'turn',3:'river'}[n]??'settled');
const rawFrames=c=>c.rawSocket?.frames??c.frames??[];
const mass=p=>Object.values(p.state.players).reduce((n,x)=>n+x.stack,0)+(p.pot??0);
export function replay(capture,{targetHand=null}={}) {
  const frames=rawFrames(capture),trace=[];let prior=null,hero=null,round=null,state=null,failure=null,pending=null;
  const fail=(i,e)=>{failure={index:i,error:e.message??String(e)};prior=null;round=null;state=null;pending=null;};
  for(let i=0;i<frames.length;i++) {
    const frame=frames[i];if(failure){trace.push({accepted:false});continue;}
    try {
      if(prior){need(frame.localReceiveSequence===prior.frame.localReceiveSequence+1,'Missing or reordered source frame');
        need(frame.connectionGeneration===prior.frame.connectionGeneration,'Connection generation changed');
        need(frame.localReceivedAt>=prior.frame.localReceivedAt,'Receipt clock regressed');}
      else need(frame.event==='registered','Fresh registration required');
      const p=project(frame,prior?.projection??null,hero),s=p.state,old=prior?.projection.state??null;
      hero=p.hero;need(s.players[hero],'Hero absent from source roster');
      let event=null;
      if(old){need(frame.payload.pre===old.now,'Source predecessor mismatch');}
      const handChange=old&&(old.hI!==s.hI||old.gN!==s.gN);
      if(handChange){
        need(old.gN+1===s.gN&&old.hI!==s.hI&&same(s.gT,[1,0]),'Invalid hand transition');
        round=null;state=null;pending=null;
        if(targetHand!==null&&s.gN!==targetHand){event={type:'OBSERVE_HAND_START',actorEvidence:'observed-only',unresolved:'Outside acceptance hand'};
          trace.push({accepted:true,event,state:null});prior={frame,projection:p};continue;}
        const posts={[s.sBPI]:s.tB[s.sBPI],[s.bBPI]:s.tB[s.bBPI]};
        need(posts[s.sBPI]===s.smallBlind&&posts[s.bBPI]===s.bigBlind&&Object.keys(s.tB).length===2,'Unsupported blind posting');
        const active=s.iHPI.filter(id=>s.pGS[id]==='inGame');
        const order=clockwise(s,s.dealerID,0,active);
        need(order[0]===s.cPI&&s.cPI===s.pITT,'Preflop opening actor contradicts seat order');
        round=startRound({street:'preflop',order,stacks:stacks(s,active),bigBlind:s.bigBlind,contributions:s.tB});
        state=base(p,frame.localReceivedAt);state.coverage.fromHandStart=true;event={type:'HAND_START',actorEvidence:'observed',observed:{handNumber:s.gN,handId:s.hI,blinds:{...s.tB}}};
      }
      if(!old&&frame.event==='registered'&&same(s.gT,[1,0])&&Object.keys(s.tB).length===2&&s.sBPI&&s.bBPI){
        const active=s.iHPI.filter(id=>s.pGS[id]==='inGame'),order=clockwise(s,s.dealerID,0,active);
        if(order[0]===s.cPI&&s.cPI===s.pITT&&s.tB[s.sBPI]===s.smallBlind&&s.tB[s.bBPI]===s.bigBlind){
          round=startRound({street:'preflop',order,stacks:stacks(s,active),bigBlind:s.bigBlind,contributions:s.tB});state=base(p,frame.localReceivedAt);}
      }
      const historical=targetHand!==null&&s.gN!==targetHand;
      if(old&&!handChange){
        const actor=old.pITT,flag=frame.payload.sNA;
        if((flag==='NSAA'||flag==='NSAF')&&!historical){
          need(round&&state&&actor&&round.actor===actor,'Action is not by reconstructed actor');if(flag==='NSAA')need(s.cRPI?.includes(actor),'Action missing from source order');
          let a;
          if(flag==='NSAF'){need(old.pGS[actor]==='inGame'&&s.pGS[actor]==='fold','Invalid fold');a={type:'FOLD',actor};}
          else if(s.tB[actor]==='check'||s.tB[actor]===0&&(old.tB[actor]===undefined||old.tB[actor]===0)){
            need(s.cRPI.length===1&&s.pITT===null,'Invalid check');a={type:'CHECK',actor};}
          else {const to=s.tB[actor];need(chips(to)&&to>0&&s.pITT===null,'Invalid wager');a={type:to>round.currentBet?'BET':'CALL',actor,to};
            if(a.type==='BET'&&round.currentBet>0)a.type='RAISE';if(a.type==='CALL')need(to===round.currentBet,'Unsupported partial call');}
          round=act(round,a);const record={...a,street:round.street,actorEvidence:'observed:prior-activation',sourceCursor:s.now};
          state.actions.push(record);event={type:a.type,actor,amount:a.to??null,street:record.street,actorEvidence:record.actorEvidence,observed:{sourceActionFlag:flag,sourceCursor:s.now}};
          if(a.type==='CALL'&&old.gT[1]<3)pending={actor,street:old.gT[1],cursor:s.now,received:frame.localReceiveAt??frame.localReceivedAt,sequence:frame.localReceiveSequence,
            generation:frame.connectionGeneration,hand:s.hI,amount:a.to,activation:old,previous:s};
        }
        const directActivation=typeof p.raw.cPI==='string'&&p.raw.pITT===p.raw.cPI&&p.raw.pASA===s.now&&p.raw.sNA===null&&p.raw.sNAA===null;
        if(directActivation&&p.raw.cPI!==actor){
          if(round&&state&&!historical&&!round.closed)need(round.actor===p.raw.cPI,'Wrong actor activation');
          if(round)round.activation={receivedAt:frame.localReceivedAt,expiresAt:frame.localReceivedAt+10_000};
          if(state)state.activation={actor:p.raw.cPI,receivedAt:frame.localReceivedAt,expiresAt:frame.localReceivedAt+10_000,liveAuthorized:false};
          event={type:'ACTIVATE',actor:p.raw.cPI,actorEvidence:'observed:cPI+pITT+pASA',observed:{actor:p.raw.cPI,sourceCursor:s.now}};
        }
        if(s.gT[1]>old.gT[1]&&[1,2,3].includes(s.gT[1])&&!historical){
    if(!round||!state){
            need(mass(prior.projection)===mass(p),'Historical deal money does not conserve');
            event={type:'OBSERVE_DEAL',actorEvidence:'observed-only',unresolved:'Earlier action history is unavailable'};
            prior={frame,projection:p};trace.push({accepted:true,event,state:null});continue;
          }
          const street=s.gT[1],board=cards(s),committed=Object.values(old.tB).reduce((n,v)=>n+(chips(v)?v:0),0);
          need(board.length===street+2&&same(board.slice(0,cards(old).length),cards(old)),'Invalid board prefix');
          need(Object.keys(s.tB).length===0&&p.raw.cHB===0,'Deal retained prior contributions');
          need(committed===0||chips(p.pot)&&p.pot===(prior.projection.pot??0)+committed,'Pot collection contradiction');
          for(const [id,v] of Object.entries(old.tB))if(chips(v)&&v>0)need(s.players[id].stack===old.players[id].stack-v,'Collected stack debit contradiction');
          need(mass(prior.projection)===mass(p),'Money not conserved across collection');
          const active=s.iHPI.filter(id=>s.pGS[id]==='inGame');need(active.length>=2&&active.includes(hero),'Unsupported active roster');
          if(old.gT[1]===0||round)need(round?.closed,'Prior betting round has unresolved actors');
          let actor=s.cPI,actorEvidence='observed:cPI+pITT';
          if(!Object.hasOwn(frame.payload,'cPI')){
            need(pending&&pending.actor===hero&&pending.street===street-1&&pending.sequence+1===frame.localReceiveSequence&&
              pending.generation===frame.connectionGeneration&&pending.hand===s.hI&&frame.localReceivedAt-pending.received<2_000&&
              s.now-pending.cursor<2_000,'Paid deal lacks immediate CALL continuity');
            const call=pending.previous,activation=pending.activation;need(activation.pITT===hero&&activation.cPI===hero&&call.cPI===hero&&call.cRPI.includes(hero)&&Object.keys(call.tB).length===2&&
              Object.values(call.tB).every(v=>v===pending.amount),'Paid deal does not match prior call');
            for(const [id,v] of Object.entries(call.tB))need(s.players[id].stack===call.players[id].stack-v,'Paid call debit mismatch');
            actor=hero;actorEvidence='derived:adjacent-paid-call';
          }
          need(typeof actor==='string'&&s.pITT===actor,'Deal actor mismatch');
          if(round&&state){state.roundSummaries.push({street:round.street,actions:round.actions.map(x=>({...x})),closure:'all-required-actors-observed'});
            const order=clockwise(s,s.dealerID,street,active);need(order[0]===actor,'Postflop opening actor contradicts seats');
            round=startRound({street:streetOf(street),order,stacks:stacks(s,active),bigBlind:s.bigBlind});}
          if(!state)state=base(p,frame.localReceivedAt);
          state.identity={tableId:s.id,handId:s.hI,handNumber:s.gN};state.street=streetOf(street);state.board=[...board];state.actor=actor;
          state.currentBet=0;state.contributions={};state.collectedPot=p.pot;state.seats=seatFacts(s);state.activeSeats=state.seats.filter(x=>!x.folded);
          state.factProvenance={street:'observed:gT',board:'observed:oTC.1',actor:actorEvidence,pot:'observed:pot',contributions:'observed:cleared-tB',seats:'observed:iHPI+pGS+seats'};
          state.coverage.actionPrefixComplete=true;
          state.coverage.unresolvedPriorHand=true;
          event={type:'DEAL',street:state.street,actor,actorEvidence,observed:{board:[...board],collectedPot:p.pot,previousWagers:committed,sourceCursor:s.now}};pending=null;
        }
      }
      if(state&&s.gN===state.identity.handNumber){state.street=streetOf(s.gT[1]);state.actor=s.cPI??s.pITT??state.actor;state.collectedPot=p.pot??state.collectedPot;
        const activeActor=typeof p.raw.cPI==='string'&&p.raw.cPI===s.pITT&&p.raw.pASA===s.now&&p.raw.sNA===null&&p.raw.sNAA===null?p.raw.cPI:null;
        state.actor=activeActor;
        state.currentBet=Math.max(0,...Object.values(s.tB).filter(chips));state.contributions=Object.fromEntries(Object.entries(s.tB).filter(([,v])=>chips(v)));
        state.seats=seatFacts(s);state.activeSeats=state.seats.filter(x=>!x.folded);
        state.observedFacts={sourceCursor:s.now,street:s.gT[1],currentActor:activeActor,
          actorEvidence:activeActor?(event?.actorEvidence??'observed:cPI+pITT'):'unresolved:no-current-activation',communityCards:cards(s),
          collectedPot:p.pot??state.collectedPot,streetContributions:{...state.contributions},
          playerBalances:Object.fromEntries(state.seats.map(x=>[x.playerId,s.players[x.playerId].stack]))};
        state.derived={currentBet:state.currentBet,payableCall:Math.max(0,state.currentBet-(state.contributions[state.actor]??0)),
          grossPotBeforeCall:(state.collectedPot??0)+state.currentBet,activePlayerIds:state.activeSeats.map(x=>x.playerId)};}
      if(old&&s.gT[1]===5&&old.gT[1]!==5){need(mass(prior.projection)===mass(p),'Settlement chips do not reconcile');
        event={type:'SETTLEMENT',actorEvidence:'observed:gameResult',observed:{winnerIds:Object.keys(frame.payload.gameResult??{})}};round=null;state=null;pending=null;}
      trace.push({accepted:true,event,state:state?structuredClone(state):null});prior={frame,projection:p};
    }catch(e){fail(i,e);trace.push({accepted:false,error:failure.error});}
  }
  return {failure,state,trace};
}
function base(p,received){const s=p.state;return {identity:{tableId:s.id,handId:s.hI,handNumber:s.gN},street:streetOf(s.gT[1]),board:[...cards(s)],actor:s.cPI??s.pITT,
  currentBet:0,contributions:{},collectedPot:p.pot??null,seats:seatFacts(s),activeSeats:seatFacts(s).filter(x=>!x.folded),actions:[],roundSummaries:[],observed:{source:'PokerNow registered/gC',receivedAt:received},
  derived:{},unresolved:['PokerNow exports empty eventsData; whole-hand authoritative completeness is unresolved'],
  coverage:{fromHandStart:false,actionPrefixComplete:false,historyComplete:false},liveAuthorized:false};}
function stacks(s,ids){return Object.fromEntries(ids.map(id=>[id,s.players[id].stack]));}
function seatFacts(s){return s.seats.filter(([,id])=>s.iHPI.includes(id)).map(([seat,id])=>({playerId:id,seat,folded:s.pGS[id]==='fold',contribution:chips(s.tB[id])?s.tB[id]:0,
  remainingStack:s.players[id].stack-(chips(s.tB[id])?s.tB[id]:0)}));}
function clockwise(s,dealer,street,active){const ids=s.seats.map(x=>x[1]),d=ids.indexOf(dealer);need(d>=0,'Dealer seat missing');const offset=street===0?(ids.length===2?1:3):1;
  return Array.from({length:ids.length},(_,i)=>ids[(d+offset+i)%ids.length]).filter(id=>active.includes(id));}
