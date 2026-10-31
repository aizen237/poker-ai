/* Offline shipped-bundle release gate. No browser connection, actions or fetch.
 * Usage: node scripts/replay-postflop.cjs [--baseline=REV] [--out=evidence/report.json]
 *        [--compare=evidence/baseline.json] [--gate]
 * Reports contain frame numbers and gates, never raw payloads or player IDs.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const arg = key => process.argv.find(a => a.startsWith(key + '='))?.slice(key.length + 1);
const baseline = arg('--baseline');
const bundle = name => baseline ? cp.execFileSync('git', ['show', `${baseline}:apps/pokernow-extension/${name}.js`], {cwd:root,encoding:'utf8',maxBuffer:10e6})
  : fs.readFileSync(path.join(root, 'apps/pokernow-extension', name + '.js'), 'utf8');
const content = bundle('contentScript'), event = bundle('eventSource');

function replay(capture) {
  const frames = capture.rawSocket?.frames ?? capture.frames;
  const first = frames[0]?.payload?.gameState;
  if (frames[0]?.event !== 'registered' || !first?.id) return {unsupported:'No initial registration',frames:frames.length};
  let now = frames[0].localReceivedAt, wallStart = null, clockStart = 0, network = 0;
  class Clock extends Date { static now() { return wallStart === null ? now : clockStart + Math.floor(performance.now() - wallStart); } }
  const ctx = {Date:Clock, URL, performance, structuredClone};
  const cut = content.indexOf('  // src/contentScript.ts'); assert.ok(cut > 0);
  vm.runInNewContext(content.slice(0,cut) + 'globalThis.api={createTimelineRuntime,buildLiveDecisionProofs,assessLiveState};})();',ctx);
  const runtime = ctx.api.createTimelineRuntime({tableId:first.id,sessionId:'offline',now:()=>Clock.now(),fetchLog:()=>{network++; throw Error('Offline replay attempted fetch');}});
  const location = new URL(`https://www.pokernow.com/games/${first.id}`);
  class Socket extends EventTarget { send() { network++; throw Error('Offline replay attempted send'); } }
  let last;
  const window = {WebSocket:Socket,location,addEventListener(){},sessionStorage:{getItem:()=>null},setTimeout:()=>1,clearTimeout(){},
    postMessage(m) { if(m.type==='source_metadata') last=m; runtime.accept(m); }};
  vm.runInNewContext(event,{window,location,Date:Clock,URL,structuredClone});
  const socket = new window.WebSocket(`wss://www.pokernow.com/socket.io/?gameID=${first.id}`);
  const trace=[], checkpoints=[];
  const savedRead=capture.checkpoint?.read??capture.read;
  const savedAt=capture.checkpoint?.completedAt??(typeof capture.capturedAt==='string'?Date.parse(capture.capturedAt):capture.capturedAt);
  const recorded = capture.checkpoints ?? (savedRead ? [{observation:{completedAt:savedAt,
    unverifiedObservations:{ui:savedRead},epochAfter:{decisionEpoch:capture.checkpoint?.decisionEpoch}}}] : []);
  for (let i=0; i<frames.length; i++) {
    const frame=frames[i]; now=frame.localReceivedAt;
    socket.dispatchEvent(new MessageEvent('message',{data:'42'+JSON.stringify([frame.event,frame.payload])}));
    const snapshot=runtime.snapshot(), status=snapshot.sourceStatus, w=status.riverObservation;
    trace.push({frame:i+1,projected:!!last?.riverSource,kind:last?.riverSource?.kind??null,
      diagnostic:status.riverObservationDiagnostic,window:w ? {street:w.street,call:w.payableCall,pot:w.collectedPot,
        receivedAt:w.receivedAt,expiresAt:w.expiresAt} : null});
    for (const checkpoint of recorded) {
      const ob=checkpoint.observation, time=ob?.completedAt;
      if (!ob?.unverifiedObservations?.ui || !Number.isSafeInteger(time) || time < frame.localReceivedAt ||
          i+1 < frames.length && frames[i+1].localReceivedAt <= time) continue;
      const read=structuredClone(ob.unverifiedObservations.ui);
      now=time; clockStart=time; wallStart=performance.now();
      const proof=ctx.api.buildLiveDecisionProofs(read,ctx.api.assessLiveState(read.raw,read.context),snapshot,null,ob.epochAfter?.decisionEpoch??'offline');
      const elapsedMs=performance.now()-wallStart; wallStart=null;
      const result=proof.flopCallFold??proof.turnCallFold??proof.riverCallFold;
      // Separately check deterministic recognition/binding at the actual read
      // time. Never count this frozen-clock result as a deadline success.
      const frozen=ctx.api.buildLiveDecisionProofs(read,ctx.api.assessLiveState(read.raw,read.context),snapshot,null,ob.epochAfter?.decisionEpoch??'offline');
      const atRead=frozen.flopCallFold??frozen.turnCallFold??frozen.riverCallFold;
      assert.equal(proof.activation.allowed,false,'Postflop replay must not authorize actions');
      if(result) assert.equal(result.liveAuthorized,false);
      checkpoints.push({frame:i+1,elapsedMs,remainingMs:w ? w.expiresAt-time : null,bound:!!result?.binding,
        boundAtRead:!!atRead?.binding,illustrationAtRead:atRead?.illustration?.status??null,
        illustration:result?.illustration?.status??null,modelAbstention:result?.modelAbstention??null,
        reasons:result?.reasons??[],liveAuthorized:proof.activation.allowed});
    }
  }
  assert.equal(network,0);
  return {frames:frames.length,accepted:trace.filter(t=>t.diagnostic.sequence===t.frame).length,
    windows:trace.filter(t=>t.window).map(t=>({frame:t.frame,...t.window})),checkpoints,trace};
}

const reports=[];
for(const dir of ['evidence','packages/browser-reader/src/fixtures']) {
  if(!fs.existsSync(path.join(root,dir))) continue;
  for(const file of fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.json')).sort()) {
    let capture; try {capture=JSON.parse(fs.readFileSync(path.join(root,dir,file),'utf8'));} catch {continue;}
    const frames=capture.rawSocket?.frames??capture.frames;
    if(!Array.isArray(frames) || !frames.some(f=>{const p=f.payload?.gameState??f.payload;return p?.gT?.[0]===1&&[1,2,3].includes(p.gT[1]);})) continue;
    // This historical source/read pairing is explicitly documented in the repo.
    // Keep the real (already expired) CALL receipt; never invent a fresh read.
    if(dir==='evidence'&&file==='river-raw.json'&&fs.existsSync(path.join(root,dir,'river-snapshot.json'))) {
      const snapshot=JSON.parse(fs.readFileSync(path.join(root,dir,'river-snapshot.json'),'utf8'));
      capture.read={raw:snapshot.raw,context:snapshot.context,callControl:snapshot.legality.callControl};
      capture.capturedAt=snapshot.capturedAt;
    }
    const result=replay(capture);
    reports.push({file:dir+'/'+file,...result});
    console.log(`${dir}/${file}: ${result.accepted??0}/${result.frames} accepted; windows ${result.windows?.map(w=>w.street+'@'+w.frame).join(',')||'none'}; DOM ${result.checkpoints?.map(c=>c.illustration??(c.modelAbstention?'model abstention':'withheld')).join(',')||'unavailable'}`);
  }
}
if(arg('--out')) fs.writeFileSync(path.resolve(root,arg('--out')),JSON.stringify({baseline:baseline??'working bundles',reports},null,2));
if(arg('--compare')) {
  const previous=JSON.parse(fs.readFileSync(path.resolve(root,arg('--compare')),'utf8')).reports;
  for(const before of previous) {
    const after=reports.find(r=>r.file===before.file); assert.ok(after,`Missing capture ${before.file}`);
    assert.ok(after.accepted>=before.accepted,`Lost accepted frames in ${before.file}`);
    for(const frame of before.trace??[]) if(frame.diagnostic.sequence===frame.frame)
      assert.equal(after.trace[frame.frame-1]?.diagnostic.sequence,frame.frame,`Lost accepted frame ${frame.frame} in ${before.file}`);
    for(const w of before.windows??[]) assert.deepEqual(after.windows.find(x=>x.frame===w.frame),w,`Lost positive window in ${before.file}`);
    for(const c of before.checkpoints??[]) if(c.illustrationAtRead??c.illustration)
      assert.equal(after.checkpoints.find(x=>x.frame===c.frame)?.illustrationAtRead,c.illustrationAtRead??c.illustration,`Lost DOM illustration in ${before.file}`);
  }
  console.log('PASS: every baseline accepted prefix, positive window and deterministic DOM illustration preserved.');
}
if(process.argv.includes('--gate')) {
  const failures=[];
  for(const report of reports) for(const c of report.checkpoints??[]) if(c.illustrationAtRead==='conditional')
    if(c.illustration!=='conditional'||c.elapsedMs>=c.remainingMs)
      failures.push(`Deadline failed: ${report.file} frame ${c.frame}: ${c.elapsedMs.toFixed(1)}ms / ${c.remainingMs}ms`);
  const hand499=reports.find(r=>r.file.endsWith('/pokernow-turn-499.json'));
  assert.equal(hand499?.accepted,81);
  assert.equal(hand499.checkpoints[0]?.illustration,'conditional');
  assert.equal(failures.length,0,failures.join('\n'));
  console.log('PASS: cold captured-DOM calculations fit their original deadlines; Hand499 accepts 81 frames.');
}
module.exports={replay};
