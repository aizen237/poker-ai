import fs from 'node:fs';
import path from 'node:path';
export const root = path.resolve(import.meta.dirname, '../..');
export const cases = [
  [435, 'flop-live-evidence.json', 'flop', 13, 4],
  [459, 'flop-live-success-hand459.json', 'flop', 13, 4],
  [465, 'turn-live-failure-hand465.json', 'turn', 21, 4],
  [471, 'turn-model-abstention-hand471.json', 'turn', 21, 4],
  [477, 'turn-live-failure-hand477.json', 'turn', 21, 4],
  [482, 'turn-live-failure-hand482.json', 'turn', 21, 4],
  [493, 'turn-live-failure-hand493-paired.json', 'turn', 21, 4],
  [499, 'turn-live-failure-hand499-paired.json', 'turn', 21, 4],
  [511, 'river-live-failure-hand511-paired.json', 'river', 29, 4],
];
export function capture(file) {
  const target = path.join(process.env.P1_EVIDENCE_DIR ?? path.join(root, 'evidence'), file);
  return fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : null;
}
export const framesOf = c => c.rawSocket?.frames ?? c.frames;
