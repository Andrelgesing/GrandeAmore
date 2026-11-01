import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('./worker.js', import.meta.url), 'utf8');
const { Rankings } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const data = new Map();
const storage = {
 get: async key => structuredClone(data.get(key)),
 put: async (key, value) => data.set(key, structuredClone(value)),
 transaction: async fn => fn(storage)
};
async function start(enabled) {
 let ready;
 new Rankings({ storage, blockConcurrencyWhile(fn) { ready = fn(); } }, { APPLY_BARAA_20261101: String(enabled) });
 await ready;
}
await start(false);
const ratings = data.get('ratings');
for (const [index, rating] of Object.values(ratings).entries()) {
 rating.elo += index + 17;
 rating.calibrationDuels = index % 11;
}
ratings.Baraa.legendary = true;
data.set('revision', 1800);
data.set('vote:existing', { winner: 'Baraa', loser: 'Andre' });
const before = structuredClone(ratings);
await start(true);
const expected = structuredClone(before);
expected.Baraa.elo = 1000;
assert.deepEqual(data.get('ratings'), expected, 'Only Baraa Elo changes; all other fields and players remain exact');
assert.equal(data.get('revision'), 1801);
const backup = structuredClone(data.get('elo-correction:baraa:2026-11-01'));
assert.deepEqual(backup.beforeRatings, before);
assert.deepEqual(backup.afterRatings, expected);
assert.equal(backup.beforeRevision, 1800);
assert.deepEqual(data.get('vote:existing'), { winner: 'Baraa', loser: 'Andre' });
data.get('ratings').Baraa.elo = 1016;
await start(true);
assert.equal(data.get('ratings').Baraa.elo, 1016, 'Restart preserves subsequent votes');
assert.equal(data.get('revision'), 1801);
assert.deepEqual(data.get('elo-correction:baraa:2026-11-01'), backup, 'Original backup remains immutable');
console.log('Passed: Baraa-only correction, complete backup, preserved progress/history and one-time execution.');
