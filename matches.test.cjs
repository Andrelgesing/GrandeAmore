const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  setAttribute(name, value) { this.attributes[name] = value; }
}
const grid = new Element('div');
const listeners = {};
const context = vm.createContext({
  document: {
    createElement: tag => new Element(tag),
    querySelector: selector => { assert.equal(selector, '#match-teams'); return grid; },
    addEventListener: (name, listener) => { listeners[name] = listener; }
  }
});
const playerSource = fs.readFileSync(path.join(__dirname, 'players.js'), 'utf8');
vm.runInContext(playerSource.split('let ratingState')[0], context);
vm.runInContext('const players = roster.map(([name, position, elo, photo], rosterOrder) => ({name, position, elo, photo, rating: starsFromElo(elo), rosterOrder}));', context);
vm.runInContext(playerSource.slice(playerSource.indexOf('const tier ='), playerSource.indexOf('function stars')), context);
vm.runInContext('function stars' + playerSource.split('function stars')[1].split('function cardContent')[0], context);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'matches.js'), 'utf8'), context);
const expected = [
  ['Hay', 'Omar', 'Daniel', 'Paolo (pac)', 'Jack', 'Takunda', 'AlexG'],
  ['Samu', 'Iacob', 'Levi', 'Nikita', 'Dejan', 'davideb', 'Andre'],
  ['Ali', 'Loay', 'Andreeas', 'Danilo', 'Darius', 'Enil', 'Milan'],
  ['Lucas', 'gabi', 'fabian', 'Mohamed', 'Baraa', 'Valentin', '@Fabien Vjaceslavs']
];
const config = JSON.parse(vm.runInContext('JSON.stringify(sundayMatch)', context));
assert.deepEqual(config.teams, expected);
assert.equal(new Set(config.teams.flat()).size, 28);
assert.deepEqual(config.unavailable, ['Shahrom', 'Damien', '@~❄️']);
const descendants = element => [element, ...element.children.flatMap(descendants)];
const lineups = () => grid.children.map(card => descendants(card).filter(e => e.className === 'match-player-name').map(e => e.textContent));
// The pitch orders players by formation. All names are unique and assigned as approved.
assert.deepEqual(lineups(), [expected[2], expected[3], expected[0], expected[1]]);
const players = vm.runInContext('players', context);
for (const team of expected) {
  assert.equal(team.length, 7);
  if (team.includes('Andre')) for (const other of ['AlexG', 'Ali', 'Lucas']) assert(!team.includes(other));
  assert(team.slice(3, 6).filter(name => players.find(p => p.name === name).position.split('/').includes('CB')).length >= 2);
}
let rendered = descendants(grid);
assert.equal(rendered.filter(e => e.className === 'stars').length, 32);
assert.equal(rendered.filter(e => e.tag === 'img').length, players.filter(p => expected.flat().includes(p.name) && p.photo).length);
for (const player of players.filter(p => expected.flat().includes(p.name) && p.photo)) assert(fs.existsSync(path.join(__dirname, player.photo)));
const originalCards = grid.children;
listeners['ratings-updated']();
assert.equal(grid.children, originalCards);
vm.runInContext("players.find(p => p.name === 'Hay').elo += 400; players.find(p => p.name === 'Hay').rating = 5;", context);
listeners['ratings-updated']();
assert.notEqual(grid.children, originalCards);
assert.deepEqual(lineups(), [expected[2], expected[3], expected[0], expected[1]]); // Voting must never reshuffle approved lineups.
rendered = descendants(grid.children[2]);
assert(rendered.some(e => e.className === 'stars' && e.attributes['aria-label'] === '5 out of 5 stars'));
const averageElo = expected[0].reduce((sum, name) => sum + players.find(p => p.name === name).elo, 0) / 7;
assert(rendered.some(e => e.textContent === `Average stars · ${averageElo.toFixed(1)} Elo`));
assert(rendered.some(e => e.textContent === 'GK'));
assert(descendants(grid.children[0]).some(e => e.textContent === 'GK · covering (CM)'));
assert.deepEqual(grid.children.map(card => descendants(card).find(e => e.tag === 'h2').textContent), ['Team 3', 'Team 4', 'Team 1', 'Team 2']);
assert.equal(descendants(grid).filter(e => e.className === 'match-champions').length, 1);
assert.equal(descendants(grid.children[0]).find(e => e.className === 'match-champions').textContent, 'Champions');
assert.deepEqual(grid.children.map(card => descendants(card).find(e => e.className === 'match-points').textContent), ['7 pts', '4 pts', '3 pts', '3 pts']);
for (const [elo, status, color] of [[800, null, 'bronze'], [1000, null, 'silver'], [1200, null, 'gold'], [1000, 'Legendary', 'legendary']]) {
  const entry = { player: {name: 'Border check', position: 'CM', elo, rating: 3, status}, role: 'CM' };
  const portrait = vm.runInContext('matchPlayer', context)(entry).children[0];
  assert.equal(portrait.className, `match-portrait ${color}`);
}
console.log('Passed: approved lineups, attendance, separation rules, defender coverage, portraits, live rating refresh without reshuffling, and covering labels.');
