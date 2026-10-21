const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/fight.js', 'utf8');
function setup(protocol, fetch, squad = ['A', 'B', 'C'].map(name => ({ name, elo: 1000 }))) {
 const element = () => ({ disabled: false, style: {}, children: [], append(...items) { this.children.push(...items); }, replaceChildren() { this.children = []; }, setAttribute() {}, listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; }, showModal() { this.open = true; }, close() { this.open = false; this.listeners.close?.(); }, querySelectorAll() { return this.children.filter(item => item.tag === 'button'); } });
 const nodes = Object.fromEntries(['fight-arena', 'fight-options', 'fight-skip', 'fight-selection', 'fight-confirm-dialog', 'fight-confirm-submit', 'fight-confirm-cancel', 'fight-confirm-text'].map(id => ['#' + id, element()]));
 const saved = new Map();
 const timers = [];
 let now = 0;
 const context = vm.createContext({
  performance: { now: () => now },
  RATINGS_API: 'https://ratings.test', location: { protocol }, players: squad, ratingState: {},
  document: { querySelector: id => nodes[id], createElement: tag => Object.assign(element(), { tag }), addEventListener() {}, hidden: false },
  localStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) },
  crypto: { randomUUID: (() => { let id = 0; return () => 'vote-' + ++id; })() },
  window: { addEventListener() {} }, setInterval() {}, setTimeout: (fn, ms) => timers.push({fn, ms}), fetch,
  displayPlayerRecords: records => records, servicePlayerName: name => name,
  starsFromElo: elo => Math.round((elo - 400) / 100) / 2, renderPlayerGrid() {}, renderMvp() {}
 });
 vm.runInContext(source, context);
 return { context, nodes, saved, timers, advance: ms => { now += ms; }, run: code => vm.runInContext(code, context) };
}
(async () => {
 const rosterContext = vm.createContext({ RATINGS_API: '', localStorage: { getItem: () => null } });
 vm.runInContext(fs.readFileSync(__dirname + '/players.js', 'utf8').split('const grid =')[0], rosterContext);
 const squad = vm.runInContext('players', rosterContext);
 const rosterFight = setup('file:', () => { throw Error('No live votes in roster test'); }, squad);
 assert(rosterFight.run("players.some(player => player.name === '@~❄️')"), 'Snowflake retains his player profile');
 const seen = new Set();
 for (let i = 0; i < 5000; i++) {
  rosterFight.run('nextFight()');
  for (const player of rosterFight.run('pair')) {
   assert.notEqual(player.name, '@~❄️', 'Snowflake cannot be selected for either side');
   seen.add(player.name);
  }
 }
 assert(seen.has('Giorgios') && seen.has('Shahrom'), 'Both honorary Legendary players remain eligible');
 rosterFight.run("applyRatings({ Giorgios: { elo: 950, legendary: true } })");
 assert.equal(rosterFight.run("duelPlayers.find(player => player.name === 'Giorgios').elo"), 950, 'Duel pool uses current shared ratings');
 assert.equal(rosterFight.run("players.find(player => player.name === 'Giorgios').status"), 'Legendary');
 const local = setup('file:', () => { throw Error('Local preview must not contact the live API'); });
 assert.equal(local.run('eloPoints(1000, 1000)'), 8, 'Equal-rated players exchange 8 Elo with K=16');
 const oldId = local.run('voteId');
 const localPending = local.run('submitFight(0)');
 assert(local.saved.has('grande-amore-ratings'), 'A player click saves immediately');
 assert(local.nodes['#fight-confirm-dialog'].open);
 assert.equal(local.nodes['#fight-confirm-text'].textContent, 'Saving your vote…');
 assert.equal(local.timers[0].ms, 200, 'An instant save waits for the 200ms minimum');
 assert.equal(local.run('voteId'), oldId, 'Next duel waits for the extra display time');
 await local.run('submitFight(1)');
 local.timers[0].fn(); await localPending;
 assert.notEqual(local.run('voteId'), oldId);
 assert.equal(local.run('selected'), null);
 assert.equal(local.run('players.reduce((sum, p) => sum + p.elo, 0)'), 3000);
 assert(!local.nodes['#fight-confirm-dialog'].open);
 assert(local.nodes['#fight-options'].querySelectorAll().every(button => button.children[0].className === 'fighter-reveal'));
 let complete, posts = [];
 const online = setup('https:', async (url, options) => {
  if (!options.method) return { ok: true, json: async () => ({ revision: 0, ratings: {} }) };
  posts.push(JSON.parse(options.body));
  return new Promise(resolve => { complete = resolve; });
 });
 await new Promise(resolve => setImmediate(resolve));
 const firstId = online.run('voteId');
 const pending = online.run('submitFight(0)');
 await online.run('submitFight(1)');
 assert.equal(posts.length, 1, 'Rapid second click must not vote again');
 assert(online.nodes['#fight-options'].querySelectorAll().every(button => button.disabled));
 complete({ ok: false }); await pending;
 assert.equal(online.run('voteId'), firstId, 'Failure must preserve matchup vote ID');
 await online.run('submitFight(1)'); assert.equal(posts.length, 1);
 const retry = online.run('submitFight(0)');
 assert.equal(posts[1].id, posts[0].id, 'Retry must reuse ID for server deduplication');
 online.advance(80);
 complete({ ok: true, json: async () => ({ revision: 1, ratings: {} }) });
 await new Promise(resolve => setImmediate(resolve));
 assert.equal(online.timers[0].ms, 120);
 assert.equal(online.run('voteId'), firstId);
 online.timers[0].fn(); await retry;
 assert.notEqual(online.run('voteId'), firstId);
 assert.equal(online.run('selected'), null);
 let finishSlow;
 const slow = setup('https:', async (url, options) => {
  if (!options.method) return {ok:true,json:async()=>({revision:0,ratings:{}})};
  return new Promise(resolve => { finishSlow = resolve; });
 });
 await new Promise(resolve => setImmediate(resolve));
 const slowId = slow.run('voteId');
 const slowPending = slow.run('submitFight(0)');
 slow.advance(350);
 finishSlow({ok:true,json:async()=>({revision:1,ratings:{}})});
 await slowPending;
 assert.equal(slow.timers.length,0,'A save over 200ms adds no timer');
 assert.notEqual(slow.run('voteId'),slowId);
 console.log('Passed: local-only votes, Elo conservation, rapid-click lock, failure retry with same ID, immediate submission, 200ms total minimum with fast/slow response checks, reveal wrappers, and automatic next matchup.');
})();
