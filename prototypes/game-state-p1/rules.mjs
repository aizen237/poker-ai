// Pure, offline poker rules. No source protocol, hand numbers, strategy or I/O.
const integer = v => Number.isSafeInteger(v) && v >= 0;
const need = (condition, reason) => { if (!condition) throw Error(reason); };
export function startRound({street, order, stacks, bigBlind, contributions = {}}) {
  need(['preflop','flop','turn','river'].includes(street), 'Unsupported street');
  need(order.length >= 2 && new Set(order).size === order.length, 'Invalid round roster');
  need(integer(bigBlind) && bigBlind > 0, 'Invalid big blind');
  need(order.every(id => integer(stacks[id]) && stacks[id] > (contributions[id] ?? 0)), 'Unsupported stack/all-in');
  need(Object.values(contributions).every(integer), 'Invalid contributions');
  const currentBet = Math.max(0,...Object.values(contributions));
  return {street,order:[...order],active:[...order],stacks:{...stacks},contributions:{...contributions},
    currentBet,lastRaise:bigBlind,bigBlind,pending:[...order],actor:order[0],closed:false,actions:[]};
}
export function act(previous, event) {
  const s=structuredClone(previous), {type,actor}=event;
  need(!s.closed && actor === s.actor && s.active.includes(actor), 'Wrong actor or closed round');
  const before=s.contributions[actor]??0, owed=s.currentBet-before;
  need(owed >= 0, 'Contribution exceeds current bet');
  if(type==='FOLD') s.active=s.active.filter(id=>id!==actor);
  else if(type==='CHECK') need(owed===0 && event.to===undefined, 'Check facing wager');
  else {
    const to=event.to;
    need(integer(to) && to>before && to<s.stacks[actor], 'Invalid amount or unsupported all-in');
    if(type==='CALL') need(owed>0 && to===s.currentBet, 'Invalid call');
    else {
      need(type==='BET' && s.currentBet===0 || type==='RAISE' && s.currentBet>0, 'Invalid bet/raise');
      const increment=to-s.currentBet;
      need(increment>=s.lastRaise, 'Below minimum full raise');
      s.lastRaise=increment; s.currentBet=to; s.pending=[...s.active];
    }
    s.contributions[actor]=to;
  }
  s.pending=s.pending.filter(id=>id!==actor && s.active.includes(id));
  s.actions.push(structuredClone(event));
  s.closed=s.active.length===1 || s.pending.length===0;
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
