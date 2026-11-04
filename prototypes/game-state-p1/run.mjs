import {cases,capture,framesOf} from './captures.mjs';
import {replay} from './replay.mjs';
let errors=0;
for(const [hand,file,street] of cases){
  const c=capture(file);if(!c){console.log(`CAPTURE ${hand}: unavailable`);errors++;continue;}
  const r=replay(c,{targetHand:hand});
  if(r.failure){console.log(`CAPTURE ${hand}: rejected frame ${r.failure.index+1}: ${r.failure.error}`);errors++;continue;}
  const f=framesOf(c),e=r.state.actions.reduce((m,a)=>(m[a.type]=(m[a.type]??0)+1,m),{});
  console.log(`CAPTURE ${hand}: ${r.state.street} ${r.state.board.length} cards, pot ${r.state.collectedPot}, call ${r.state.currentBet-(r.state.contributions[r.state.actor]??0)}, actions ${r.state.actions.length}, ${street===r.state.street?'PASS':'street mismatch'}, ${JSON.stringify(e)}, liveAuthorized=${r.state.liveAuthorized}; ${f.length} linked raw frames`);
}
if(errors)process.exitCode=1;
