const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/fight.js', 'utf8');
function setup(protocol, fetch) {
 const element = () => ({ disabled: false, style: {}, children: [], append(...items) { this.children.push(...items); }, replaceChildren() { this.children = []; }, setAttribute() {}, listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; }, showModal() { this.open = true; }, close() { this.open = false; this.listeners.close?.(); }, querySelectorAll() { return this.children.filter(item => item.tag === 'button'); } });
 const nodes = Object.fromEntries(['fight-arena', 'fight-options', 'fight-skip', 'fight-selection', 'fight-confirm-dialog', 'fight-confirm-submit', 'fight-confirm-cancel', 'fight-confirm-text'].map(id => ['#' + id, element()]));
 const saved = new Map();
 const context = vm.createContext({
  RATINGS_API: 'https://ratings.test', location: { protocol }, players: ['A', 'B', 'C'].map(name => ({ name, elo: 1000 })), ratingState: {},
  document: { querySelector: id => nodes[id], createElement: tag => Object.assign(element(), { tag }), addEventListener() {}, hidden: false },
  localStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) },
  crypto: { randomUUID: (() => { let id = 0; return () => 'vote-' + ++id; })() },
  window: { addEventListener() {} }, setInterval() {}, setTimeout, fetch,
  starsFromElo: elo => Math.round((elo - 400) / 100) / 2, renderPlayerGrid() {}, renderMvp() {}
 });
 vm.runInContext(source, context);
 return { context, nodes, saved, run: code => vm.runInContext(code, context) };
}
(async () => {
 const local = setup('file:', () => { throw Error('Local preview must not contact the live API'); });
 assert.equal(local.run('eloPoints(1000, 1000)'), 8, 'Equal-rated players exchange 8 Elo with K=16');
 const oldId = local.run('voteId');
 local.run('confirmFightChoice(0)');
 assert.equal(local.saved.size, 0, 'Selection must not save a vote');
 assert(local.nodes['#fight-confirm-dialog'].open);
 local.nodes['#fight-confirm-dialog'].close();
 assert.equal(local.run('selected'), null, 'Cancel must clear an unsubmitted selection');
 local.run('confirmFightChoice(0)');
 await local.run('submitFight(0)');
 assert.notEqual(local.run('voteId'), oldId);
 assert(local.saved.has('grande-amore-ratings'));
 assert.equal(local.run('selected'), null);
 assert.equal(local.run('players.reduce((sum, p) => sum + p.elo, 0)'), 3000);
 let complete, posts = [];
 const online = setup('https:', async (url, options) => {
  if (!options.method) return { ok: true, json: async () => ({ revision: 0, ratings: {} }) };
  posts.push(JSON.parse(options.body));
  return new Promise(resolve => { complete = resolve; });
 });
 await new Promise(resolve => setImmediate(resolve));
 const firstId = online.run('voteId');
 online.run('confirmFightChoice(0)');
 assert.equal(posts.length, 0, 'Opening confirmation must not send a vote');
 const pending = online.run('submitFight(0)');
 await online.run('submitFight(1)');
 assert.equal(posts.length, 1, 'Rapid second click must not vote again');
 assert(online.nodes['#fight-options'].querySelectorAll().every(button => button.disabled));
 complete({ ok: false }); await pending;
 assert.equal(online.run('voteId'), firstId, 'Failure must preserve matchup vote ID');
 await online.run('submitFight(1)'); assert.equal(posts.length, 1);
 const retry = online.run('submitFight(0)');
 assert.equal(posts[1].id, posts[0].id, 'Retry must reuse ID for server deduplication');
 complete({ ok: true, json: async () => ({ revision: 1, ratings: {} }) }); await retry;
 assert.notEqual(online.run('voteId'), firstId);
 assert.equal(online.run('selected'), null);
 console.log('Passed: local-only votes, Elo conservation, rapid-click lock, failure retry with same ID, confirmation/cancel, and automatic next matchup without delay.');
})();
