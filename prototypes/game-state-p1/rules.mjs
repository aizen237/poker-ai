// Pure, offline poker rules. No source protocol, hand numbers, strategy or I/O.
const integer = v => Number.isSafeInteger(v) && v >= 0;
const need = (condition, reason) => { if (!condition) throw Error(reason); };
const unique = values => new Set(values).size === values.length;

export function startRound({street, order, stacks, bigBlind, contributions = {}, contenders = order, allIn = []}) {
  need(['preflop','flop','turn','river'].includes(street), 'Unsupported street');
  need(order.length >= 1 && order.length <= 10 && unique(order), 'Invalid round roster');
  need(contenders.length >= order.length && unique(contenders) && order.every(id => contenders.includes(id)), 'Invalid contender roster');
  need(integer(bigBlind) && bigBlind > 0, 'Invalid big blind');
  need(Object.values(stacks).every(integer) && order.every(id => integer(stacks[id])), 'Invalid stacks');
  need(Object.entries(contributions).every(([id,v]) => contenders.includes(id) && integer(v)), 'Invalid contributions');
  need(allIn.every(id => contenders.includes(id)) && unique(allIn) && order.every(id => !allIn.includes(id)), 'Invalid all-in roster');
  need(Object.values(contributions).every((v,i) => integer(v)), 'Invalid contributions');
  const currentBet = Math.max(0,...Object.values(contributions));
  return {street,order:[...order],active:[...order],contenders:[...contenders],allIn:[...allIn],stacks:{...stacks},contributions:{...contributions},
    currentBet,lastRaise:bigBlind,bigBlind,pending:[...order],actor:order[0],closed:false,actions:[]};
}

export function act(previous, event) {
  const s=structuredClone(previous), {type,actor}=event;
  need(!s.closed && actor === s.actor && s.active.includes(actor), 'Wrong actor or closed round');
  const before=s.contributions[actor]??0, owed=s.currentBet-before, stack=s.stacks[actor];
  need(owed >= 0 && before <= stack, 'Contribution exceeds current bet or stack');
  let becomesAllIn=false;
  if(type==='FOLD') {
    need(event.to===undefined&&event.allIn===undefined,'Invalid fold fields');
    s.active=s.active.filter(id=>id!==actor);
    s.contenders=s.contenders.filter(id=>id!==actor);
  } else if(type==='CHECK') {
    need(owed===0 && event.to===undefined && event.allIn===undefined, 'Check facing wager');
  } else {
    const to=event.to;
    need(integer(to) && to>before && to<=stack, 'Invalid amount');
    becomesAllIn=to===stack;
    need(becomesAllIn ? event.allIn===true : event.allIn!==true,
      becomesAllIn?'Missing all-in status':'Unexpected all-in status');
    if(type==='CALL') {
      need(owed>0 && (to===s.currentBet || becomesAllIn&&to<s.currentBet), 'Invalid call');
    } else {
      need(type==='BET' && s.currentBet===0 || type==='RAISE' && s.currentBet>0, 'Invalid bet/raise');
      need(to>s.currentBet, 'Bet must increase the current wager');
      const increment=to-s.currentBet;
      need(increment>=s.lastRaise || becomesAllIn, 'Below minimum full raise');
      if(increment>=s.lastRaise) s.lastRaise=increment;
      s.currentBet=to;
    }
    s.contributions[actor]=to;
    if(becomesAllIn) {
      s.allIn.push(actor);
      s.active=s.active.filter(id=>id!==actor);
    }
    if(type==='BET'||type==='RAISE') s.pending=[...s.active];
  }
  s.pending=s.pending.filter(id=>id!==actor && s.active.includes(id));
  s.actions.push(structuredClone(event));
  s.closed=s.contenders.length<=1 || s.pending.length===0;
  if(s.closed) s.actor=null;
  else {
    const at=s.order.indexOf(actor);
    s.actor=Array.from({length:s.order.length},(_,i)=>s.order[(at+i+1)%s.order.length]).find(id=>s.pending.includes(id));
    need(!!s.actor, 'Missing next actor');
  }
  return s;
}

export function decision(state, now) {
  const a=state?.activation;
  return a && state.actor && Number.isSafeInteger(now) && now>=a.receivedAt && now<a.expiresAt
    ? {actor:state.actor,receivedAt:a.receivedAt,expiresAt:a.expiresAt,liveAuthorized:false} : null;
}
