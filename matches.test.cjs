const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, 'players.js'), 'utf8').split('let ratingState')[0], context);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'matches.js'), 'utf8').split('function matchPlayer')[0], context);
const available = vm.runInContext("roster.filter(entry => !sundayMatch.unavailable.includes(entry[0]) && !sundayMatch.squadOnly.includes(entry[0])).map(([name, position, elo, photo], rosterOrder) => ({ name, position, elo, photo, rosterOrder }))", context);
const recommend = vm.runInContext('recommendTeams', context);
const cost = vm.runInContext('positionCost', context);

function check(pool) {
  const teams = recommend(pool);
  assert.equal(teams.length, 4);
  const names = teams.flat().map(entry => entry.player.name);
  assert.equal(names.length, 28);
  assert.equal(new Set(names).size, 28);
  assert(!names.includes('Shahrom'));
  assert(!names.includes('Loay'));
  assert(!names.includes('Hay'));
  for (const team of teams) {
    assert.equal(team.length, 7);
    assert.deepEqual(Array.from(team.map(entry => entry.role)), ['ST', 'CM', 'CM', 'CB', 'CB', 'CB', 'GK']);
    assert(team.filter(entry => entry.player.position === 'GK').length <= 1);
    assert(team.filter(entry => entry.player.position.split('/').includes('CB')).length >= 2);
    assert(team.filter(entry => entry.player.position.split('/')[0] === 'ST').length <= 1);
    for (const entry of team.filter(entry => entry.player.position === 'GK')) assert.equal(entry.role, 'GK');
  }
  // Preferred strikers fill all four ST slots; two GK and two CB need cover.
  assert.equal(teams.flat().filter(entry => !entry.player.position.split('/').includes(entry.role)).length, 4);
  assert.equal(teams.flat().reduce((sum, entry) => sum + cost(entry.player, entry.role), 0), 10);
  assert.equal(JSON.stringify(recommend([...pool].reverse())), JSON.stringify(teams));
  return teams;
}
const initial = check(available);
const means = initial.map(team => team.reduce((sum, entry) => sum + entry.player.elo, 0) / 7);
assert(Math.max(...means) - Math.min(...means) <= 200 / 7 + 0.001);
check(available.map((player, index) => ({ ...player, elo: 600 + ((index * 137) % 801) })));
check(available.map(player => ({ ...player, elo: 1000 })));
for (let sample = 1; sample <= 12; sample++) {
  check(available.map((player, index) => ({ ...player, elo: 500 + ((index * 347 + sample * 113) % 1301) })));
}
for (const player of available.filter(player => player.photo)) assert(fs.existsSync(path.join(__dirname, player.photo)));

// Exercise the rendering and live-update event without browser dependencies.
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  setAttribute(name, value) { this.attributes[name] = value; }
}
const elements = { '#match-teams': new Element('div') };
const listeners = {};
context.document = {
  createElement: tag => new Element(tag),
  querySelector: selector => elements[selector],
  addEventListener: (name, listener) => { listeners[name] = listener; }
};
context.players = available.map(player => ({ ...player, rating: Math.round(Math.max(1, Math.min(5, (player.elo - 400) / 200)) * 2) / 2 }));
context.players.push({ name: 'Shahrom', position: 'ST', elo: 1400, rating: 5, rosterOrder: 28 });
context.players.push({ name: 'Loay', position: 'CM/ST', elo: 1100, rating: 3.5, rosterOrder: 29 });
context.players.push({ name: 'Hay', position: 'ST/CM', elo: 1000, rating: 3, rosterOrder: 30 });
const playerSource = fs.readFileSync(path.join(__dirname, 'players.js'), 'utf8');
vm.runInContext('function stars' + playerSource.split('function stars')[1].split('function cardContent')[0], context);
const matchSource = fs.readFileSync(path.join(__dirname, 'matches.js'), 'utf8');
vm.runInContext('function matchPlayer' + matchSource.split('function matchPlayer')[1], context);
const descendants = element => [element, ...element.children.flatMap(descendants)];
let rendered = descendants(elements['#match-teams']);
assert.equal(elements['#match-teams'].children.length, 4);
assert.equal(rendered.filter(element => element.className === 'match-player-name').length, 28);
assert.equal(rendered.filter(element => element.className === 'stars').length, 32);
assert.equal(rendered.filter(element => element.tag === 'img').length, available.filter(player => player.photo).length);
assert(!rendered.some(element => element.textContent === 'Shahrom'));
const originalCards = elements['#match-teams'].children;
listeners['ratings-updated']();
assert.equal(elements['#match-teams'].children, originalCards);
context.players[0].elo += 400;
context.players[0].rating = 5;
listeners['ratings-updated']();
assert.notEqual(elements['#match-teams'].children, originalCards);
rendered = descendants(elements['#match-teams']);
assert.equal(rendered.filter(element => element.className === 'match-player-name').length, 28);
assert.equal(rendered.filter(element => element.className === 'stars' && element.attributes['aria-label']).length, 32);
console.log('Passed: team sizes, unique attendance, Shahrom exclusion, keeper separation, minimal covering roles, Elo balance, deterministic recommendations, photo paths, pitch rendering, and live refresh.');
console.log('Baseline average Elo:', Array.from(means, value => value.toFixed(1)).join(', '));
