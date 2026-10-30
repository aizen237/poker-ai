// Offline timing probe: exact committed baseline and working content bundles.
// Uses the recorded read, production MAIN bundle and timeline. No browser actions.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';

const baseline = 'b6ffe3c26bc9debbdcf6cd03e3e21f68df30b027';
const capture = JSON.parse(readFileSync(process.env.HAND493_RAW_CAPTURE ??
  'packages/browser-reader/src/fixtures/pokernow-turn-493.json', 'utf8'));
const cp = capture.checkpoints[0], observation = cp.observation;
const gitFile = name => execFileSync('git', ['show', `${baseline}:apps/pokernow-extension/${name}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const baseMain = gitFile('eventSource.js');
const currentMain = readFileSync('apps/pokernow-extension/eventSource.js', 'utf8');
assert.equal(currentMain.replaceAll('\r\n', '\n'), baseMain.replaceAll('\r\n', '\n'));

function measure(content, main) {
  const frames = capture.rawSocket.frames;
  let now = frames[0].localReceivedAt;
  let clock = () => now;
  class LocalDate extends Date { static now() { return clock(); } }
  const tableId = frames[0].payload.gameState.id;
  const location = new URL(`https://www.pokernow.com/games/${tableId}`);
  class Socket extends EventTarget { constructor(url) { super(); this.url = url; } send() { throw new Error('No actions allowed'); } }
  let runtime;
  const window = { WebSocket: Socket, location, sessionStorage: { getItem: () => null }, addEventListener() {},
    setTimeout: () => 1, clearTimeout() {}, postMessage: message => runtime.accept(message) };
  const context = { Date: LocalDate, URL, window, location, console, structuredClone, EventTarget, MessageEvent };
  const boundary = content.indexOf('  // src/contentScript.ts');
  assert.ok(boundary > 0);
  runInNewContext(content.slice(0, boundary) +
    'globalThis.probe = { createTimelineRuntime, assessLiveState, buildLiveDecisionProofs }; })();', context);
  const api = context.probe;
  runtime = api.createTimelineRuntime({ tableId, sessionId: 'hand493-benchmark', now: () => clock(),
    fetchLog: () => { throw new Error('No network allowed'); } });
  runInNewContext(main, context);
  const socket = new window.WebSocket(`wss://www.pokernow.com/socket.io/?gameID=${tableId}`);
  for (const frame of frames) {
    now = frame.localReceivedAt;
    socket.dispatchEvent(new MessageEvent('message', { data: '42' + JSON.stringify([frame.event, frame.payload]) }));
    assert.equal(runtime.snapshot().sourceStatus.riverObservationDiagnostic.sequence, frame.localReceiveSequence);
  }
  now = observation.completedAt;
  const snapshot = runtime.snapshot(), w = snapshot.sourceStatus.riverObservation;
  assert.equal(w.sequence, 28);
  const read = structuredClone(observation.unverifiedObservations.ui);
  const assessment = api.assessLiveState(read.raw, read.context);
  const start = performance.now();
  clock = () => observation.completedAt + Math.floor(performance.now() - start);
  const timed = api.buildLiveDecisionProofs(read, assessment, snapshot, null, observation.epochAfter.decisionEpoch);
  const elapsedMs = performance.now() - start;
  // Frozen-clock isolation exposes the already computed result; never a live-success claim.
  clock = () => observation.completedAt;
  const frozen = api.buildLiveDecisionProofs(read, assessment, snapshot, null, observation.epochAfter.decisionEpoch);
  assert.equal(frozen.turnCallFold.illustration.status, 'conditional');
  assert.equal(timed.activation.allowed, false);
  return { elapsedMs, remainingMs: w.expiresAt - observation.completedAt,
    finishedInsideExpiry: elapsedMs < w.expiresAt - observation.completedAt,
    illustrationReturned: timed.turnCallFold.illustration !== null,
    receivedAt: w.receivedAt, expiresAt: w.expiresAt,
    calculation: frozen.turnCallFold.illustration };
}
const before = measure(gitFile('contentScript.js'), baseMain);
const after = measure(readFileSync('apps/pokernow-extension/contentScript.js', 'utf8'), currentMain);
assert.equal(JSON.stringify(before.calculation), JSON.stringify(after.calculation));
console.log(JSON.stringify({ baseline, mainBundleUnchanged: true, numericallyIdentical: true,
  before: { ...before, calculation: undefined }, after: { ...after, calculation: undefined } }, null, 2));
