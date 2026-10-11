import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('./worker.js', import.meta.url), 'utf8');
const { Rankings } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const frontendSource = readFileSync(new URL('../players.js', import.meta.url), 'utf8');
const { default: vm } = await import('node:vm');
const context = vm.createContext({ RATINGS_API: '', localStorage: { getItem: () => null } });
vm.runInContext(frontendSource.split('const grid =')[0], context);
const players = vm.runInContext('players', context);
const loay = players.find(player => player.name === 'Loay');
assert.equal(players.length, 31);
assert.equal(loay.rating, 3.5);
assert.equal(loay.primaryPosition, 'CM');
assert.equal(loay.secondaryPosition, 'ST');
const hay = players.find(player => player.name === 'Hay');
assert.equal(hay.rating, 3);
assert.equal(hay.primaryPosition, 'ST');
assert.equal(hay.secondaryPosition, 'CM');
assert.equal(players.find(player => player.name === 'Daniel').secondaryPosition, 'ST');
assert(players.filter(player => !player.position.includes('/')).every(player => player.secondaryPosition === null));

const existing = Object.fromEntries(players.filter(player => !['Loay', 'Hay'].includes(player.name)).map(player => [player.name, { elo: player.elo + 37, legendary: player.name === 'Shahrom' }]));
const savedVote = { winner: 'Andre', loser: 'AlexG', points: 16, at: 1 };
const data = new Map([['ratings', structuredClone(existing)], ['revision', 487], ['vote:old-vote-1234567', savedVote]]);
let ready, chain = Promise.resolve();
const storage = {
  get: async key => structuredClone(data.get(key)),
  put: async (key, value) => data.set(key, structuredClone(value)),
  transaction(fn) { const result = chain.then(() => fn(storage)); chain = result.catch(() => {}); return result; }
};
const create = async () => {
  const service = new Rankings({ storage, blockConcurrencyWhile(fn) { ready = fn(); } }, { ELO_K: '32' });
  await ready;
  return service;
};
let service = await create();
const getRatings = async () => (await service.fetch(new Request('https://test/ratings'))).json();
let response = await getRatings();
assert.equal(response.revision, 487);
assert.deepEqual(response.ratings.Loay, { elo: 1100, legendary: false });
assert.deepEqual(response.ratings.Hay, { elo: 1000, legendary: false });
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
data.clear();
service = await create();
response = await getRatings();
assert.equal(Object.keys(response.ratings).length, 31);
assert.equal(response.ratings.Loay.elo, 1100);
assert.equal(response.ratings.Hay.elo, 1000);
assert.equal(response.revision, 0);
console.log('Passed: preferred/secondary positions, single positions, starting stars, additive roster migration, preserved Elo/honors/revision/history, restart, and Loay/Hay voting.');

// MVP totals, duplicate browser votes and Fight ratings remain independent.
const beforeMvp = await getRatings();
const mvp = (voter, player) => service.fetch(new Request('https://test/mvp', { method: 'POST', body: JSON.stringify({ voter, player }) }));
let poll = await (await mvp('mvp-browser-00001', 'Andre')).json();
assert.equal(poll.totals.Andre, 1);
poll = await (await mvp('mvp-browser-00001', 'Enil')).json();
assert.equal(poll.choice.player, 'Andre');
assert.equal(poll.totals.Enil, undefined);
await Promise.all([mvp('mvp-browser-00002', 'Enil'), mvp('mvp-browser-00003', 'Andre')]);
poll = await (await service.fetch(new Request('https://test/mvp?voter=mvp-browser-00001'))).json();
assert.equal(poll.totals.Andre, 2);
assert.equal(poll.totals.Enil, 1);
assert.equal((await mvp('mvp-browser-00004', 'Shahrom')).status, 400);
assert.equal((await mvp('short', 'Andre')).status, 400);
assert.deepEqual(await getRatings(), beforeMvp);
service = await create();
assert.deepEqual((await (await service.fetch(new Request('https://test/mvp?voter=mvp-browser-00001'))).json()), poll);
console.log('MVP tests passed: persistence, duplicate prevention, concurrent totals, valid candidates and Elo isolation.');
