// Input must be freshly produced by the hash-checked Python replay; no network.
import { readFileSync, writeFileSync } from 'node:fs';
import { evaluatePhhPilot } from '../packages/range-engine/dist/phhPilot.js';

if (process.argv.length !== 4) throw new Error('Usage: node scripts/evaluate-phh-pilot.mjs REPLAY.json REPORT.json');
const replay = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const result = evaluatePhhPilot(replay);
writeFileSync(process.argv[3], JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ fitting: result.fitting, populations: result.populations,
  actionMarginal: { status: result.actionMarginal.status, models: result.actionMarginal.models.map(m => ({ scored: m.scored, failures: m.failures })) },
  revealedCombo: { status: result.revealedCombo.status, models: result.revealedCombo.models.map(m => ({ scored: m.scored, failures: m.failures })) } }, null, 2));
if ([result.actionMarginal, result.revealedCombo].some(r => r.models.length !== 1 || r.models[0].scored !== 6)) {
  throw new Error('Pinned pilot did not produce six held-out scores in each mode; inspect report');
}
