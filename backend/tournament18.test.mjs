import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('./worker.js', import.meta.url), 'utf8');
const { Rankings } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const fixtureContext = vm.createContext({});
vm.runInContext(readFileSync(new URL('../matches.js', import.meta.url), 'utf8').split('function positionCost')[0], fixtureContext);
const teams = JSON.parse(vm.runInContext('JSON.stringify(october18Match.teams)', fixtureContext));
const serviceName = name => ({ Alexandre: 'Alexander', Paolo: 'Paolo (pac)' }[name] || name);
const deltas = Object.fromEntries(teams.flatMap((team, index) => team.map(name => [serviceName(name), [-30, 20, -30, 40][index]])));
let data = new Map();
const storage = {
 get: async key => structuredClone(data.get(key)),
 put: async (key, value) => data.set(key, structuredClone(value)),
 async transaction(fn) {
  const previous = structuredClone(data);
  try { return await fn(storage); } catch (error) { data = previous; throw error; }
 }
};
async function start(enabled) {
 let ready;
 const instance = new Rankings({ storage, blockConcurrencyWhile(fn) { ready = fn(); } }, { APPLY_TOURNAMENT_20261018: String(enabled) });
 await ready;
 return instance;
}
await start(false);
const ratings = data.get('ratings');
for (const [index, rating] of Object.values(ratings).entries()) {
 rating.elo += index + 19;
 rating.calibrationDuels = index % 11;
}
ratings.Hay.elo = 1330;
ratings.Giorgios.legendary = true;
data.set('revision', 1600);
data.set('tournament:2026-10-11:placement', { adjustments: { Enil: 40 } });
data.set('vote:existing', { winner: 'Loay', loser: 'Jack' });
data.set('mvp:unrelated', { totals: { Yahya: 7 } });
const before = structuredClone(ratings);
let instance = await start(true);
const expected = structuredClone(before);
for (const [name, delta] of Object.entries(deltas)) {
 expected[name].elo += delta;
 expected[name].legendary ||= expected[name].elo >= 1350;
}
assert.equal(Object.keys(deltas).length, 28);
assert.equal(Object.values(deltas).reduce((a, b) => a + b, 0), 0);
assert.deepEqual(data.get('ratings'), expected, 'Only the approved 28 placement deltas change Elo');
assert.equal(data.get('ratings').Hay.legendary, true);
assert.equal(data.get('ratings').Giorgios.legendary, true);
assert.equal(data.get('revision'), 1601);
const placement = structuredClone(data.get('tournament:2026-10-18:placement'));
assert.deepEqual(placement.beforeRatings, before);
assert.deepEqual(placement.afterRatings, expected);
assert.deepEqual(placement.adjustments, deltas);
assert.equal(placement.beforeRevision, 1600);
assert.equal(placement.revision, 1601);
assert.deepEqual(data.get('vote:existing'), { winner: 'Loay', loser: 'Jack' });
assert.deepEqual(data.get('mvp:unrelated'), { totals: { Yahya: 7 } });
assert.deepEqual(data.get('tournament:2026-10-11:placement'), { adjustments: { Enil: 40 } });
let response = await (await instance.fetch(new Request('https://test/ratings'))).json();
assert.deepEqual(response.tournamentAdjustments, deltas, 'Live Stats receives the latest colored adjustments');
assert.deepEqual(await (await instance.fetch(new Request('https://test/tournament-placement?date=2026-10-18'))).json(), placement);
assert.deepEqual(await (await instance.fetch(new Request('https://test/tournament-placement?date=2026-10-11'))).json(), { adjustments: { Enil: 40 } });
assert.equal((await instance.fetch(new Request('https://test/tournament-placement?date=bad'))).status, 400);
data.get('ratings').Loay.elo += 16;
instance = await start(true);
assert.equal(data.get('ratings').Loay.elo, expected.Loay.elo + 16, 'Restart preserves subsequent duel progress');
assert.equal(data.get('revision'), 1601, 'Placement is never applied twice');
assert.deepEqual(data.get('tournament:2026-10-18:placement'), placement, 'Exact before/after audit is immutable');
// A missing participant aborts the entire transaction instead of applying a partial bonus.
data = new Map([['ratings', { ...before }], ['revision', 1700]]);
const invalidSource = source.replace('"Vasilis": -30', '"MissingParticipant": -30');
const invalidModule = await import('data:text/javascript;base64,' + Buffer.from(invalidSource).toString('base64'));
let ready;
new invalidModule.Rankings({ storage, blockConcurrencyWhile(fn) { ready = fn(); } }, { APPLY_TOURNAMENT_20261018: 'true' });
await assert.rejects(ready, /Missing tournament player/);
assert.equal(data.get('revision'), 1700);
assert.deepEqual(data.get('ratings'), before);
assert.equal(data.has('tournament:2026-10-18:placement'), false);
console.log('Passed: 18 October Elo deltas, full atomic backup, exactly-once restart, unchanged nonparticipants/calibration/votes/poll, latest colors, dated archives and missing-player rollback.');
