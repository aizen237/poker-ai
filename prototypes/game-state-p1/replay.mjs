import { project, need, chips } from './source.mjs';
import { startRound, act } from './rules.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const cards=s=>s.oTC?.['1']??[];
const streetOf=n=>({0:'preflop',1:'flop',2:'turn',3:'river',5:'settled'}[n]??'unsupported');
const rawFrames=c=>c.rawSocket?.frames??c.frames??[];
const stackTotal=s=>Object.values(s.players).reduce((n,x)=>n+x.stack,0);
const mass=p=>stackTotal(p.state)+p.pot;
const total=map=>Object.values(map??{}).reduce((n,v)=>n+(chips(v)?v:0),0);
const wagers=s=>Object.fromEntries(Object.entries(s.tB??{}).filter(([,v])=>chips(v)));
const differs=(a,b)=>Object.keys(a).some(id=>a[id]!==b[id])||Object.keys(b).some(id=>a[id]!==b[id]);
const stacks=s=>Object.fromEntries(Object.entries(s.players).map(([id,p])=>[id,p.stack]));

function actorInfo(p) {
  const s=p.state,r=p.raw;
  if(typeof s.cPI!=='string'||s.cPI!==s.pITT)return null;
  if(s.ante!==null&&s.ante>0&&Object.hasOwn(r,'pASA')&&Object.hasOwn(r,'sNAA')&&r.pASA===s.now) {
    const sourceDuration=r.sNAA-r.pASA;
    need(sourceDuration===15_000,'Invalid 15 second source deadline');
    return {actor:s.cPI,sourceTimestamp:r.pASA,receivedAt:p.frame.localReceivedAt,
      expiresAt:p.frame.localReceivedAt+sourceDuration,sourceDeadline:r.sNAA};
  }
  // Older P1 recordings predate the captured PokerNow activation timestamps.
  // They can be replayed offline, but do not get a synthetic decision deadline.
  if((s.ante===null||s.ante===0)&&Object.hasOwn(r,'cPI'))
    return {actor:s.cPI,legacy:true,receivedAt:null,expiresAt:null};
  return null;
}

function maximumUncalled(contributions) {
  const ordered=Object.entries(contributions).filter(([,v])=>chips(v)).sort((a,b)=>b[1]-a[1]);
  if(!ordered.length)return {amount:0,recipient:null,unique:false};
  const top=ordered[0][1],second=ordered[1]?.[1]??0;
  return {amount:top-second,recipient:top>second?ordered[0][0]:null,unique:top>second};
}

function validateRefund(contributions,returned) {
  need(chips(returned),'Invalid returned amount');
  const uncalled=maximumUncalled(contributions);
  need(returned===uncalled.amount,'Returned amount does not equal the unique uncalled excess');
  return returned===0?null:uncalled.recipient;
}

function validateCollection(previous,next) {
  const old=previous.projection.state,s=next.state,contrib=wagers(old),sum=total(contrib);
  const returned=previous.projection.pot+sum-next.pot;
  need(returned>=0,'Collection pot is below prior pot plus wagers');
  const recipient=validateRefund(contrib,returned);
  need(total(s.tB)===0,'Collection retained street contributions');
  const before=stacks(old),after=stacks(s),ids=new Set([...Object.keys(before),...Object.keys(after)]);
  for(const id of ids) {
    const expected=(before[id]??0)-(contrib[id]??0)+(id===recipient?returned:0);
    need(after[id]===expected,`Collected stack debit/refund mismatch for source player ${id}`);
  }
  need(mass(previous.projection)===mass(next),'Money not conserved across collection');
  return returned;
}

function validateSettlement(previous,next) {
  const old=previous.projection.state,s=next.state,contrib=wagers(old),sum=total(contrib);
  const result=next.raw.gameResult;
  need(result&&result!=='<D>'&&Object.keys(result).length===1,'Settlement needs one observed winner');
  const [winner,record]=Object.entries(result)[0];
  const returned=previous.projection.pot+sum-record.gained;
  need(returned>=0&&next.pot===0&&total(s.tB)===0,'Invalid settlement pot');
  const recipient=validateRefund(contrib,returned);
  const before=stacks(old),after=stacks(s),ids=new Set([...Object.keys(before),...Object.keys(after)]);
  for(const id of ids) {
    const expected=(before[id]??0)-(contrib[id]??0)+(id===winner?record.gained:0)+(id===recipient?returned:0);
    need(after[id]===expected,`Settlement stack debit, award or refund mismatch for source player ${id}`);
  }
  need(mass(previous.projection)===mass(next),'Money not conserved at settlement');
  const contenders=old.iHPI.filter(id=>old.pGS[id]!=='fold');
  if(old.pGS&&Object.values(old.pGS).some(x=>x==='allIn'))
    need(contenders.length<=2,'Unsupported multiway all-in settlement: side pots are not implemented');
  return {returned,winner,gained:record.gained,recipient};
}

function boundaryFacts(previous,next) {
  const old=previous.projection.state,s=next.state;
  need(old.gN+1===s.gN&&old.hI!==s.hI&&same(s.gT,[1,0]),'Invalid hand transition');
  need(old.gT[1]===5,'New hand started before the prior hand settled');
  const ante=chips(s.ante)?s.ante:0;
  if(ante>0) {
    need(next.pot===ante*s.iHPI.length,'Hand-start pot does not account for each dealt-in ante');
    need(s.tB[s.sBPI]===s.smallBlind&&s.tB[s.bBPI]===s.bigBlind&&Object.keys(s.tB).length===2,
      'Hand start must show only the two blinds in contributions');
  }
  for(const [id,p] of Object.entries(s.players))if(p.status==='standingUp') {
    need(!s.iHPI.includes(id)&&(s.tB[id]??0)===0,'A standingUp player cannot be dealt or contribute');
    need(old.players[id]?.stack===p.stack,'A standingUp player stack changed at hand start');
  }
  // The first capture begins in a different table bankroll window, so player
  // deltas are checked only when the adjacent source snapshots preserve mass.
  const massContinuous=mass(previous.projection)===mass(next);
  if(ante>0&&massContinuous)for(const [id,p] of Object.entries(s.players)) {
    const prior=old.players[id];need(prior,'Hand-start roster changed without a captured stack baseline');
    const expected=prior.stack-(s.iHPI.includes(id)?s.ante:0);
    need(p.stack===expected,`Ante debit mismatch for source player ${id}`);
  }
  return {massContinuous};
}

function validateInitialStart(p) {
  const s=p.state;
  if(s.gT[1]!==0||s.ante===null||s.ante===0)return false;
  need(p.pot===s.ante*s.iHPI.length,'Initial captured hand-start pot does not match antes');
  need(s.tB[s.sBPI]===s.smallBlind&&s.tB[s.bBPI]===s.bigBlind&&Object.keys(s.tB).length===2,
    'Initial captured hand start must show only the two blinds');
  for(const [id,pl] of Object.entries(s.players))if(pl.status==='standingUp')
    need(!s.iHPI.includes(id)&&(s.tB[id]??0)===0,'A standingUp player cannot be dealt or contribute');
  return true;
}

export function replay(capture,{targetHand=null}={}) {
  const frames=rawFrames(capture),trace=[];
  let prior=null,hero=null,round=null,state=null,failure=null,pendingCall=null,activation=null;
  let selectedHand=null,returnedInHand=0,runout=false;
  const fail=(i,e)=>{failure={index:i,error:e.message??String(e)};prior=null;round=null;state=null;pendingCall=null;activation=null;};

  for(let i=0;i<frames.length;i++) {
    const frame=frames[i];if(failure){trace.push({accepted:false});continue;}
    try {
      if(prior) {
        need(frame.localReceiveSequence===prior.frame.localReceiveSequence+1,'Missing or reordered source frame');
        need(frame.connectionGeneration===prior.frame.connectionGeneration,'Connection generation changed');
        need(frame.localReceivedAt>=prior.frame.localReceivedAt,'Receipt clock regressed');
      } else need(frame.event==='registered','Fresh registration required');

      const p=project(frame,prior?.projection??null,hero);p.frame=frame;hero=p.hero;
      const s=p.state,old=prior?.projection.state??null;
      need(s.players[hero],'Hero absent from source roster');
      const raw=p.raw;
      if(old)need(frame.payload.pre===old.now,'Source predecessor mismatch');

      const handChange=!!old&&(old.hI!==s.hI||old.gN!==s.gN);
      if(p.pot===null||p.pot===undefined)need(false,'Missing source pot for chip conservation');
      need(chips(p.pot),'Invalid source pot');
      if(old&&!handChange) {
        need(mass(prior.projection)===mass(p),'Chip conservation changed within a hand');
      }

      let event=null,selected=targetHand===null||s.gN===targetHand;
      if(handChange) {
        const boundary=boundaryFacts(prior,p);
        round=null;activation=null;pendingCall=null;runout=false;returnedInHand=0;
        selectedHand=selected?s.gN:null;
        if(selected) {
          const eligible=s.iHPI.filter(id=>s.pGS[id]==='inGame');
          const contenders=s.iHPI.filter(id=>s.pGS[id]!=='fold');
          const order=clockwise(s,s.dealerID,0,eligible);
          const roundState=startRound({street:'preflop',order,contenders,allIn:s.iHPI.filter(id=>s.pGS[id]==='allIn'),
            stacks:stacks(s),bigBlind:s.bigBlind,contributions:wagers(s)});
          const info=actorInfo(p);
          if(info)need(order[0]===info.actor,'Preflop opening actor contradicts seat order');
          round=roundState;
          state=base(p);state.coverage.fromHandStart=true;state.coverage.actionPrefixComplete=true;
          if(!boundary.massContinuous) {
            state.unresolved.push('Prior hand bankroll total changed at the boundary; target-hand accounting starts from this captured hand.');
            state.coverage.unresolvedPriorHand=true;
          }
          event={type:'HAND_START',actorEvidence:'observed:new-hand-boundary',observed:{blinds:{...wagers(s)},participantCount:s.iHPI.length}};
        }
      } else if(!old) {
        selectedHand=selected?s.gN:null;returnedInHand=0;
        if(selected) {
          const fromHandStart=validateInitialStart(p);
          const info=actorInfo(p);
          const candidate=info?.actor??(s.cPI===s.pITT?s.cPI:null);
          const contenders=s.iHPI.filter(id=>s.pGS[id]!=='fold');
          const eligible=s.iHPI.filter(id=>s.pGS[id]==='inGame');
          if(candidate&&eligible.includes(candidate)) {
            const order=seededOrder(s,candidate,eligible);
            round=startRound({street:streetOf(s.gT[1]),order,contenders,allIn:s.iHPI.filter(id=>s.pGS[id]==='allIn'),
              stacks:stacks(s),bigBlind:s.bigBlind,contributions:wagers(s)});
          }
          state=base(p);state.coverage.fromHandStart=fromHandStart;
          state.coverage.actionPrefixComplete=fromHandStart;
          if(!fromHandStart)state.coverage.unresolvedPriorHand=true;
          if(round)event={type:fromHandStart?'HAND_START':'REGISTER_PARTIAL_HAND',actorEvidence:info?'observed:activation-tuple':'observed:cPI+pITT',unresolved:fromHandStart?undefined:'Earlier action history is unavailable'};
        }
      } else if(selected) selectedHand=s.gN;

      selected=targetHand===null||s.gN===targetHand;
      const oldStreet=old?.gT[1],streetChanged=!!old&&old.gT[1]!==s.gT[1];
      const settlement=!!old&&s.gT[1]===5&&old.gT[1]!==5;
      let collected=null,settled=null;

      if(old&&!handChange&&selected) {
        const actor=round?.actor??null;
        if(actor&&round&&!round.closed&&!settlement&&!streetChanged) {
          const oldW=chips(old.tB[actor])?old.tB[actor]:0;
          const nextW=chips(s.tB[actor])?s.tB[actor]:0;
          const foldTransition=old.pGS[actor]==='inGame'&&s.pGS[actor]==='fold';
          const allInTransition=s.pGS[actor]==='allIn'&&old.pGS[actor]!=='allIn';
          const wagerTransition=nextW!==oldW||!Object.hasOwn(old.tB,actor)&&Object.hasOwn(s.tB,actor);
          if(foldTransition||allInTransition||wagerTransition) {
            const legacyActorProof=(s.ante===null||s.ante===0)&&old.pITT===actor&&old.cPI===actor;
            need(activation?.actor===actor||legacyActorProof,'Action has no matching source actor activation');
            if(activation&&activation.expiresAt!==null) {
              need(frame.localReceivedAt>=activation.receivedAt&&frame.localReceivedAt<activation.expiresAt,
                'Action arrived after its source 15 second deadline');
            }
            let action;
            if(foldTransition)action={type:'FOLD',actor};
            else {
              const to=nextW,before=round.contributions[actor]??0,owed=round.currentBet-before,cap=s.players[actor].stack;
              const isAllIn=s.pGS[actor]==='allIn';
              if(to===before&&owed===0) {
                need(wagerTransition&&chips(to),'Unobserved check');action={type:'CHECK',actor};
              } else if(to>round.currentBet) {
                action={type:round.currentBet===0?'BET':'RAISE',actor,to,allIn:isAllIn};
              } else {
                need(owed>0,'Wager does not establish a call or check');
                action={type:'CALL',actor,to,allIn:isAllIn};
              }
              need(isAllIn?to===cap:to<cap,'All-in status contradicts the player stack');
            }
            round=act(round,action);
            const actorEvidence=activation?.actor===actor?'observed:prior-activation':'observed:legacy-cPI+pITT';
            const record={...action,street:round.street,actorEvidence,sourceCursor:s.now};
            state.actions.push(record);state.actor=null;state.activation=null;activation=null;
            event={type:action.type,actor,amount:action.to??null,street:record.street,actorEvidence:record.actorEvidence,
              observed:{sourceActionFlag:raw.sNA??null,sourceCursor:s.now,allIn:action.allIn??false}};
            if(action.type==='CALL'&&oldStreet<3)pendingCall={actor,street:oldStreet,cursor:s.now,receivedAt:frame.localReceivedAt,
              sequence:frame.localReceiveSequence,generation:frame.connectionGeneration,hand:s.hI,amount:action.to,
              activation:record,previous:old};
          }
        }
      }

      if(old&&!handChange) {
        if(settlement) {
          settled=validateSettlement(prior,p);returnedInHand+=settled.returned;
          if(selected&&state) {
            if(round?.allIn?.length&&round.contenders.length>2)
              need(false,'Unsupported multiway all-in settlement: side pots are not implemented');
            state.street='settled';state.actor=null;state.activation=null;state.collectedPot=0;
            state.currentBet=0;state.contributions={};state.seats=seatFacts(s);state.activeSeats=state.seats.filter(x=>!x.folded);
            state.returnedBet=returnedInHand;state.returnedBetEvents.push({amount:settled.returned,street:streetOf(oldStreet)});
            state.observedFacts=observedFacts(p,null);state.derived=derivedFacts(state);
            state.factProvenance.pot='observed:settled-pot';
            event={type:'SETTLEMENT',actorEvidence:'observed:gameResult-and-stack-ledger',observed:{gained:settled.gained,
              returned:settled.returned,refundTo:settled.recipient===null?null:seatNumber(s,settled.recipient)}};
          }
          round=null;activation=null;pendingCall=null;runout=false;
        } else {
          const priorWagers=total(wagers(old));
          const collectionDue=streetChanged||p.pot!==prior.projection.pot&&priorWagers>0;
          if(collectionDue) {
            collected=validateCollection(prior,p);returnedInHand+=collected;
            if(selected&&state) {
              if(collected>0)state.returnedBetEvents.push({amount:collected,street:streetOf(oldStreet)});
              state.returnedBet=returnedInHand;
              if(round?.closed&&round.allIn.length&&round.contenders.length>1) {
                need(round.contenders.length<=2,'Unsupported multiway all-in runout: side pots are not implemented');runout=true;
              }
              event={type:'COLLECT',actorEvidence:'observed:pot-and-stack-ledger',observed:{wagers:priorWagers,returned:collected,pot:p.pot}};
            }
          } else if(differs(stacks(old),stacks(s))) need(false,'Player stack changed outside a collection or settlement');

          if(streetChanged&&selected&&state) {
            need(s.gT[1]===oldStreet+1&&[1,2,3].includes(s.gT[1]),'Invalid street transition');
            const board=cards(s),oldBoard=cards(old);
            need(board.length===s.gT[1]+2&&same(board.slice(0,oldBoard.length),oldBoard),'Invalid community-card prefix');
            need(total(s.tB)===0,'Deal retained prior contributions');
            if(runout) {
              const live=s.iHPI.filter(id=>s.pGS[id]!=='fold');
              need(live.length<=2,'Unsupported multiway all-in runout: side pots are not implemented');
              need(s.pITT===null&&s.cPI===null,'Runout deal unexpectedly has an actor');
              state.actor=null;state.activation=null;activation=null;
              event={type:'RUNOUT_DEAL',street:streetOf(s.gT[1]),actor:null,actorEvidence:'observed:no-actor-runout',
                observed:{boardCount:board.length,collectedPot:p.pot}};
            } else {
              need(round?.closed,'Deal before all reconstructed actors completed the street');
              const live=s.iHPI.filter(id=>s.pGS[id]==='inGame');
              const liveContenders=s.iHPI.filter(id=>s.pGS[id]!=='fold');
              const info=actorInfo(p);
              let actor=info?.actor??null,actorEvidence=info?'observed:activation-tuple':'observed:cPI+pITT';
              if(!actor&&pendingCall&&pendingCall.actor===hero&&pendingCall.street===oldStreet&&
                pendingCall.sequence+1===frame.localReceiveSequence&&pendingCall.generation===frame.connectionGeneration&&
                pendingCall.hand===s.hI&&frame.localReceivedAt-pendingCall.receivedAt<2_000&&s.now-pendingCall.cursor<2_000) {
                actor=hero;actorEvidence='derived:adjacent-paid-call';
              }
              if(live.length<2) {
                need(round.allIn.length>0&&liveContenders.length<=2&&liveContenders.length>1,
                  'Deal without two actionable players or a supported all-in runout');
                need(!actor&&s.pITT===null&&s.cPI===null,'Actor present during all-in runout');runout=true;
                state.actor=null;state.activation=null;activation=null;
                event={type:'RUNOUT_DEAL',street:streetOf(s.gT[1]),actor:null,actorEvidence:'observed:no-actor-runout',
                  observed:{boardCount:board.length,collectedPot:p.pot}};
              } else {
                need(typeof actor==='string'&&s.pITT===actor,'Deal actor mismatch');
                const order=clockwise(s,s.dealerID,s.gT[1],live);
                need(order[0]===actor,'Postflop opening actor contradicts seats');
                state.roundSummaries.push({street:round.street,actions:round.actions.map(x=>({...x})),closure:'all-required-actors-observed'});
                round=startRound({street:streetOf(s.gT[1]),order,contenders:liveContenders,
                  allIn:liveContenders.filter(id=>s.pGS[id]==='allIn'),stacks:stacks(s),bigBlind:s.bigBlind});
                state.actor=actor;state.activation=null;activation=null;
                event={type:'DEAL',street:streetOf(s.gT[1]),actor,actorEvidence,
                  observed:{board:[...board],collectedPot:p.pot,previousWagers:priorWagers,sourceCursor:s.now}};
              }
              state.identity={tableId:s.id,handId:s.hI,handNumber:s.gN};state.street=streetOf(s.gT[1]);state.board=[...board];
              state.currentBet=Math.max(0,...Object.values(s.tB).filter(chips));state.contributions=wagers(s);
              state.collectedPot=p.pot;state.seats=seatFacts(s);state.activeSeats=state.seats.filter(x=>!x.folded);
              state.coverage.unresolvedPriorHand ||= !state.coverage.fromHandStart;
              state.factProvenance={...state.factProvenance,street:'observed:gT',board:'observed:oTC.1',
                actor:actorEvidence,pot:'observed:pot',contributions:'observed:cleared-tB',seats:'observed:iHPI+pGS+seats'};
              state.returnedBet=returnedInHand;state.observedFacts=observedFacts(p,state.actor);state.derived=derivedFacts(state);
              pendingCall=null;
            }
          }
        }
      }

      if(selected&&state&&s.gN===state.identity.handNumber) {
        const info=actorInfo(p);
        if(info) {
          need(round&&round.actor===info.actor,'Wrong actor activation');
          if(activation&&activation.actor===info.actor) {
            if(activation.legacy||activation.sourceTimestamp===info.sourceTimestamp)activation=activation;
            else activation=info; // The source timestamp/deadline pair itself proves a fresh window.
          } else activation=info;
          state.actor=info.actor;
          state.activation=info.legacy?null:{actor:info.actor,sourceTimestamp:info.sourceTimestamp,sourceDeadline:info.sourceDeadline,
            receivedAt:info.receivedAt,expiresAt:info.expiresAt,liveAuthorized:false};
          if(!event)event={type:'ACTIVATE',actor:info.actor,actorEvidence:info.legacy?'observed:cPI+pITT':'observed:source-15-second-tuple',
            observed:{sourceCursor:s.now,sourceActionFlag:raw.sNA??null,deadlineMs:info.legacy?null:15_000}};
        } else if(activation&&activation.expiresAt!==null)state.actor=activation.actor;
        state.street=streetOf(s.gT[1]);state.collectedPot=p.pot;state.returnedBet=returnedInHand;
        state.seats=seatFacts(s);state.activeSeats=state.seats.filter(x=>!x.folded);
        state.currentBet=Math.max(0,...Object.values(s.tB).filter(chips));state.contributions=wagers(s);
        state.observedFacts=observedFacts(p,state.actor);state.derived=derivedFacts(state);
      }

      if(!selected&&handChange)event={type:'OBSERVE_HAND_START',actorEvidence:'observed-only',unresolved:'Outside requested target hand'};
      trace.push({accepted:true,event,state:selected&&state?structuredClone(state):null});
      prior={frame,projection:p};
    } catch(e) {
      fail(i,e);trace.push({accepted:false,error:failure.error});
    }
  }
  return {failure,state,trace};
}

function base(p) {
  const s=p.state,seatList=seatFacts(s);
  return {identity:{tableId:s.id,handId:s.hI,handNumber:s.gN},street:streetOf(s.gT[1]),board:[...cards(s)],actor:null,activation:null,
    currentBet:0,contributions:{},collectedPot:p.pot??null,returnedBet:0,returnedBetEvents:[],seats:seatList,activeSeats:seatList.filter(x=>!x.folded),
    actions:[],roundSummaries:[],observed:{source:'PokerNow registered/gC'},observedFacts:observedFacts(p,null),factProvenance:{},derived:{},
    unresolved:['PokerNow exports empty eventsData; whole-hand authoritative completeness is unresolved'],
    coverage:{fromHandStart:false,actionPrefixComplete:false,historyComplete:false},liveAuthorized:false};
}
function seatFacts(s) {
  return s.seats.filter(([,id])=>s.iHPI.includes(id)).map(([seat,id])=>({playerId:id,seat,folded:s.pGS[id]==='fold',allIn:s.pGS[id]==='allIn',
    contribution:chips(s.tB[id])?s.tB[id]:0,remainingStack:s.players[id].stack-(chips(s.tB[id])?s.tB[id]:0)}));
}
function observedFacts(p,actor) {
  const s=p.state,contributions=wagers(s),seats=seatFacts(s);
  return {sourceCursor:s.now,street:s.gT[1],currentActor:actor,actorEvidence:actor?'observed:source-or-derived-actor':'unresolved:no-current-activation',
    communityCards:cards(s),collectedPot:p.pot,streetContributions:contributions,
    playerBalances:Object.fromEntries(seats.map(x=>[x.playerId,s.players[x.playerId].stack]))};
}
function derivedFacts(state) {
  return {currentBet:state.currentBet,payableCall:Math.max(0,state.currentBet-(state.contributions[state.actor]??0)),
    grossPotBeforeCall:(state.collectedPot??0)+state.currentBet,activePlayerIds:state.activeSeats.map(x=>x.playerId)};
}
function seatNumber(s,id){return s.seats.findIndex(([,player])=>player===id)+1;}
function clockwise(s,dealer,street,active) {
  const ids=s.seats.map(x=>x[1]),d=ids.indexOf(dealer);need(d>=0,'Dealer seat missing');
  const offset=street===0?(ids.length===2?1:3):1;
  return Array.from({length:ids.length},(_,i)=>ids[(d+offset+i)%ids.length]).filter(id=>active.includes(id));
}
function seededOrder(s,actor,eligible) {
  const ids=s.seats.map(x=>x[1]),start=ids.indexOf(actor);need(start>=0,'Initial actor seat missing');
  return Array.from({length:ids.length},(_,i)=>ids[(start+i)%ids.length]).filter(id=>eligible.includes(id));
}
