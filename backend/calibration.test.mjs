import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('./worker.js', import.meta.url), 'utf8');
const load = text => import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
const { Rankings, calibrationK } = await load(source);
const data = new Map(); let chain = Promise.resolve();
const storage = {
 get: async key => structuredClone(data.get(key)),
 put: async (key, value) => data.set(key, structuredClone(value)),
 transaction(fn) { const p = chain.then(() => fn(storage)); chain = p.catch(() => {}); return p; }
};
let ready;
const start = async Class => { const service = new Class({storage, blockConcurrencyWhile(fn) { ready = fn(); }}, {ELO_K:'16'}); await ready; return service; };
let service = await start(Rankings);
const before = structuredClone(data.get('ratings'));
const expanded = await load(source.replace('export const duelEligible =', "seed.NewA = {elo:1000, legendary:false}; seed.NewB = {elo:1000, legendary:false};\nexport const duelEligible ="));
service = await start(expanded.Rankings);
for (const [name, rating] of Object.entries(before)) assert.deepEqual(data.get('ratings')[name], rating, 'Existing ratings/honors preserved exactly');
assert.equal(data.get('ratings').NewA.calibrationDuels, 0);
assert.equal(data.get('ratings').NewB.calibrationDuels, 0);
assert.equal(data.get('revision'), undefined, 'Migration does not add a vote revision');
const vote = (id, winner, loser) => service.fetch(new Request('https://test/votes', {method:'POST', body:JSON.stringify({id,winner,loser})}));
for (let duel = 1; duel <= 11; duel++) {
 const winner = duel % 2 ? 'NewA' : 'Darius', loser = duel % 2 ? 'Darius' : 'NewA';
 const prior = structuredClone(data.get('ratings'));
 const k = duel <= 3 ? 64 : duel <= 10 ? 32 : 16;
 const id = `calibration-duel-${duel.toString().padStart(3,'0')}`;
 assert.equal(calibrationK(prior.NewA), k);
 const expected = 1 / (1 + 10 ** ((prior[loser].elo - prior[winner].elo) / 400));
 const result = await (await vote(id,winner,loser)).json();
 assert.equal(result.ratings[winner].elo, prior[winner].elo + Math.round((winner === 'NewA' ? k : 16)*(1-expected)));
 assert.equal(result.ratings[loser].elo, prior[loser].elo - Math.round((loser === 'NewA' ? k : 16)*(1-expected)));
 assert.equal(result.ratings.NewA.calibrationDuels, Math.min(duel,10));
 assert.equal(data.get('vote:'+id).winnerK, winner === 'NewA' ? k : 16);
 assert.equal(data.get('vote:'+id).loserK, loser === 'NewA' ? k : 16);
 assert.deepEqual(await (await vote(id,winner,loser)).json(), result, 'Retry does not move Elo or counter');
 assert.equal((await vote(id,loser,winner)).status,409);
 service = await start(expanded.Rankings);
 assert.deepEqual(data.get('ratings'), result.ratings, 'Calibration survives restart');
}
await vote('two-newcomers-0001','NewA','NewB');
assert.equal(data.get('ratings').NewB.calibrationDuels,1);
await Promise.all([vote('concurrent-vote-0001','NewB','Darius'),vote('concurrent-vote-0002','Darius','NewB')]);
assert.equal(data.get('ratings').NewB.calibrationDuels,3);
const unchanged = structuredClone(data.get('ratings'));
assert.equal((await vote('invalid-vote-0001','NewB','NewB')).status,400);
assert.deepEqual(data.get('ratings'),unchanged);
console.log('Passed: additive newcomer migration, exact legacy preservation, both asymmetric outcomes, all K boundaries, counters, restart, retries, conflict, concurrency and invalid votes.');
