import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const source = readFileSync(process.argv[2] || new URL('./worker.js', import.meta.url), 'utf8');
const { Rankings, viennaDate, default: worker } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const frontendSource = readFileSync(new URL('../players.js', import.meta.url), 'utf8');
const { default: vm } = await import('node:vm');
const context = vm.createContext({ RATINGS_API: '', localStorage: { getItem: () => null } });
vm.runInContext(frontendSource.split('const grid =')[0], context);
const players = vm.runInContext('players', context);
const loay = players.find(player => player.name === 'Loay');
assert.equal(players.length, 53);
const inca = players.find(player => player.name === 'Inca');
assert.equal(inca.rating, 4);
assert.equal(inca.primaryPosition, 'CM');
assert.equal(inca.status, 'Legendary');
assert.equal(inca.title, 'The last dance');
const giorgios = players.find(player => player.name === 'Giorgios');
assert.equal(giorgios.rating, 3.5);
assert.equal(giorgios.primaryPosition, 'CB');
assert.equal(giorgios.status, 'Legendary');
assert.equal(loay.rating, 3.5);
assert.equal(loay.primaryPosition, 'CM');
assert.equal(loay.secondaryPosition, 'ST');
const hay = players.find(player => player.name === 'Hay');
assert.equal(hay.rating, 3);
assert.equal(hay.primaryPosition, 'ST');
assert.equal(hay.secondaryPosition, 'CM');
assert.equal(players.find(player => player.name === 'Daniel').secondaryPosition, 'ST');
assert(players.filter(player => !player.position.includes('/')).every(player => player.secondaryPosition === null));

const existing = Object.fromEntries(players.filter(player => !['Loay', 'Hay', 'Giorgios'].includes(player.name)).map(player => [vm.runInContext(`servicePlayerName(${JSON.stringify(player.name)})`, context), { elo: player.elo + 37, legendary: player.name === 'Shahrom' }]));
const savedVote = { winner: 'Andre', loser: 'AlexG', points: 16, at: 1 };
const data = new Map([['ratings', structuredClone(existing)], ['revision', 487], ['vote:old-vote-1234567', savedVote]]);
let ready, chain = Promise.resolve();
const storage = {
  get: async key => structuredClone(data.get(key)),
  put: async (key, value) => data.set(key, structuredClone(value)),
  list: async ({ prefix, startAfter = '', limit }) => new Map([...data].filter(([key]) => key.startsWith(prefix) && key > startAfter).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit).map(([key, value]) => [key, structuredClone(value)])),
  transaction(fn) { const result = chain.then(() => fn(storage)); chain = result.catch(() => {}); return result; }
};
const create = async (placement = false) => {
  const service = new Rankings({ storage, blockConcurrencyWhile(fn) { ready = fn(); } }, { ELO_K: '16', APPLY_TOURNAMENT_20261011: String(placement) });
  await ready;
  return service;
};
let service = await create();
const getRatings = async () => (await service.fetch(new Request('https://test/ratings'))).json();
let response = await getRatings();
assert.equal(response.revision, 487);
assert.deepEqual(response.ratings.Loay, { elo: 1100, legendary: false });
assert.deepEqual(response.ratings.Hay, { elo: 1000, legendary: false });
assert.deepEqual(response.ratings.Giorgios, { elo: 1100, legendary: true });
for (const [name, value] of Object.entries(existing)) assert.deepEqual(response.ratings[name], value);
assert.deepEqual(data.get('vote:old-vote-1234567'), savedVote);
const vote = () => service.fetch(new Request('https://test/votes', { method: 'POST', body: JSON.stringify({ id: 'loay-vote-123456789', winner: 'Loay', loser: 'Andre' }) }));
assert.equal((await vote()).status, 200);
response = await getRatings();
assert.equal(response.revision, 488);
assert.equal(response.ratings.Loay.elo + response.ratings.Andre.elo, 1100 + existing.Andre.elo);
const afterVote = structuredClone(response);
service = await create();
assert.deepEqual(await getRatings(), afterVote, 'Restart must preserve Loay and existing ratings');
assert.equal((await vote()).status, 200);
assert.deepEqual(await getRatings(), afterVote, 'Duplicate vote must not count twice');
assert.equal((await service.fetch(new Request('https://test/votes', { method: 'POST', body: JSON.stringify({ id: 'hay-vote-1234567890', winner: 'Hay', loser: 'Loay' }) }))).status, 200);
response = await getRatings();
assert.equal(response.revision, 489);
assert(response.ratings.Hay.elo > 1000);
assert.equal(response.ratings.Hay.elo + response.ratings.Loay.elo, 1000 + afterVote.ratings.Loay.elo);
const beforeGiorgiosVote = await getRatings();
assert.equal((await service.fetch(new Request('https://test/votes', { method: 'POST', body: JSON.stringify({ id: 'giorgios-vote-123456', winner: 'Andre', loser: 'Giorgios' }) }))).status, 200);
response = await getRatings();
assert(response.ratings.Giorgios.elo < 1100);
assert.equal(response.ratings.Giorgios.legendary, true, 'Honor survives losing Elo below five stars');
assert.equal(response.ratings.Giorgios.elo + response.ratings.Andre.elo, beforeGiorgiosVote.ratings.Giorgios.elo + beforeGiorgiosVote.ratings.Andre.elo);
const beforeExcludedVotes = await getRatings();
for (const [winner, loser] of [['@~❄️', 'Giorgios'], ['Giorgios', '@~❄️']]) {
 assert.equal((await service.fetch(new Request('https://test/votes', { method: 'POST', body: JSON.stringify({ id: 'excluded-vote-12345', winner, loser }) }))).status, 400);
}
service = await create();
assert.deepEqual(await getRatings(), beforeExcludedVotes, 'Excluded votes and restart preserve all ratings, including snowflake');
data.clear();
service = await create();
response = await getRatings();
assert.equal(Object.keys(response.ratings).length, 53);
assert.deepEqual(response.ratings.Inca, { elo: 1200, legendary: true });
assert.equal(response.ratings.Loay.elo, 1100);
assert.equal(response.ratings.Hay.elo, 1000);
assert.equal(response.revision, 0);
console.log('Passed: preferred/secondary positions, single positions, starting stars, additive roster migration, preserved Elo/honors/revision/history, restart, and Loay/Hay voting.');

// MVP totals, duplicate browser votes and Fight ratings remain independent.
const beforeMvp = await getRatings();
const mvp = (voter, player) => service.fetch(new Request('https://test/mvp', { method: 'POST', body: JSON.stringify({ voter, player }) }));
const actualNow = Date.now;
Date.now = () => Date.parse('2026-10-18T18:29:59+02:00');
assert.equal((await mvp('mvp-browser-00001', 'Jack')).status, 403);
assert.deepEqual((await (await service.fetch(new Request('https://test/mvp'))).json()).totals, {});
data.set('mvp:2026-10-11:totals', { Andre: 99 });
data.set('mvp:2026-10-11:voter:mvp-browser-00001', { player: 'Jack' });
Date.now = () => Date.parse('2026-10-18T18:30:00+02:00');
let poll = await (await mvp('mvp-browser-00001', 'Jack')).json();
assert.equal(poll.totals.Jack, 1);
poll = await (await mvp('mvp-browser-00001', 'Andreeas')).json();
assert.equal(poll.choice.player, 'Jack');
assert.equal(poll.totals.Andreeas, undefined);
await Promise.all([mvp('mvp-browser-00002', 'Andreeas'), mvp('mvp-browser-00003', 'Jack')]);
poll = await (await service.fetch(new Request('https://test/mvp?voter=mvp-browser-00001'))).json();
assert.equal(poll.totals.Jack, 2);
assert.equal(poll.totals.Andreeas, 1);
assert.equal((await mvp('mvp-browser-00004', 'Leandro')).status, 400);
assert.equal((await mvp('short', 'Jack')).status, 400);
assert.deepEqual(await getRatings(), beforeMvp);
service = await create();
assert.deepEqual((await (await service.fetch(new Request('https://test/mvp?voter=mvp-browser-00001'))).json()), poll);
console.log('MVP tests passed: persistence, duplicate prevention, concurrent totals, valid candidates and Elo isolation.');

Date.now = actualNow;

// Apply approved placements once to existing live ratings, preserving all other records.
const beforePlacement = await getRatings();
service = await create(true);
const afterPlacement = await getRatings();
assert.equal(afterPlacement.revision, beforePlacement.revision + 1);
assert.equal(Object.keys(afterPlacement.tournamentAdjustments).length, 28);
assert.equal(Object.values(afterPlacement.tournamentAdjustments).reduce((sum, n) => sum + n, 0), 0);
for (const [name, rating] of Object.entries(beforePlacement.ratings)) {
 assert.equal(afterPlacement.ratings[name].elo, rating.elo + (afterPlacement.tournamentAdjustments[name] || 0));
}
assert.deepEqual(data.get('tournament:2026-10-11:placement').beforeRatings, beforePlacement.ratings);
assert.equal(data.get('mvp:2026-10-18-official:totals').Jack, 2);
service = await create(true);
assert.deepEqual(await getRatings(), afterPlacement, 'Placement must not apply again on restart');
console.log('Placement tests passed: 28 changes applied once, exact backup, zero sum, absent players and MVP poll preserved.');

// Daily archive: Vienna summer/winter time, immutability, persistence, downloads.
assert.deepEqual(viennaDate(Date.parse('2026-10-13T21:55:00Z')), { date: '2026-10-13', time: '23:55' });
assert.deepEqual(viennaDate(Date.parse('2026-12-13T22:55:00Z')), { date: '2026-12-13', time: '23:55' });
assert.equal(viennaDate(Date.parse('2026-10-25T22:55:00Z')).time, '23:55');
const archiveEnv = { RANKINGS: { idFromName: () => 'test', get: () => ({ fetch: request => service.fetch(request) }) } };
const beforeArchive = await getRatings();
const initialHistory = await (await service.fetch(new Request('https://test/elo-history'))).json();
assert.equal(initialHistory.snapshots.length, 0);
assert(initialHistory.baseline.ratings.Andre);
await worker.scheduled({ scheduledTime: Date.parse('2026-10-13T22:55:00Z') }, archiveEnv);
assert.equal(data.has('elo-snapshot:2026-10-13'), false, 'Inactive UTC trigger does nothing');
await worker.scheduled({ scheduledTime: Date.parse('2026-10-13T21:55:00Z') }, archiveEnv);
let history = await (await service.fetch(new Request('https://test/elo-history'))).json();
assert.equal(history.snapshots.length, 1);
assert.deepEqual(history.snapshots[0].ratings, beforeArchive.ratings);
assert.equal(history.snapshots[0].revision, beforeArchive.revision);
assert.deepEqual(await getRatings(), beforeArchive, 'Archiving never changes Elo or revision');
const originalSnapshot = structuredClone(history.snapshots[0]);
await service.fetch(new Request('https://test/votes', { method: 'POST', body: JSON.stringify({ id: 'archive-vote-1234567', winner: 'Andre', loser: 'AlexG' }) }));
await worker.scheduled({ scheduledTime: Date.parse('2026-10-13T21:55:00Z') }, archiveEnv);
assert.deepEqual(data.get('elo-snapshot:2026-10-13'), originalSnapshot, 'Retry cannot overwrite archive');
await worker.scheduled({ scheduledTime: Date.parse('2026-12-13T22:55:00Z') }, archiveEnv);
service = await create(true);
history = await (await service.fetch(new Request('https://test/elo-history?after=2026-10-13'))).json();
assert.equal(history.snapshots.length, 1);
assert.equal(history.snapshots[0].date, '2026-12-13');
const csvResponse = await service.fetch(new Request('https://test/elo-history?date=2026-10-13&format=csv'));
assert.equal(csvResponse.headers.get('Content-Type'), 'text/csv; charset=utf-8');
assert.equal((await csvResponse.text()).split('\r\n').length, players.length + 2);
assert.equal((await service.fetch(new Request('https://test/elo-history?date=1999-01-01'))).status, 404);
assert.equal((await service.fetch(new Request('https://test/elo-history?after=bad'))).status, 400);
assert.equal((await worker.fetch(new Request('https://test/internal/elo-snapshot', {method:'POST'}), archiveEnv)).status, 404);
assert.equal((await worker.fetch(new Request('https://test/internal/elo-snapshot'), archiveEnv)).status, 404);
for (let day = 1; day <= 366; day++) {
 const date = new Date(Date.UTC(2027, 0, day)).toISOString().slice(0, 10);
 data.set('elo-snapshot:' + date, { ...originalSnapshot, date });
}
history = await (await service.fetch(new Request('https://test/elo-history?after=2026-12-31'))).json();
assert.equal(history.snapshots.length, 366);
assert.equal(history.nextAfter, history.snapshots.at(-1).date);
assert.deepEqual((await (await service.fetch(new Request('https://test/elo-history?after=' + history.nextAfter))).json()).snapshots, []);
console.log('Archive tests passed: summer/winter/DST, baseline, daily capture, no score changes, duplicate protection, restart, JSON/CSV, private write route and pagination.');

const closedService = new Rankings({ storage, blockConcurrencyWhile(fn) { ready = fn(); } }, { ELO_K: '16', MVP_CLOSED: 'true' });
await ready;
const beforeClosed = structuredClone([...data]);
const rejected = await closedService.fetch(new Request('https://test/mvp', { method: 'POST', body: JSON.stringify({ voter: 'closed-test-12345678', player: 'Loay' }) }));
assert.equal(rejected.status, 403);
assert.deepEqual([...data], beforeClosed);
assert.equal((await (await closedService.fetch(new Request('https://test/mvp'))).json()).closed, true);
console.log('Closed poll rejects votes without changing stored totals.');
