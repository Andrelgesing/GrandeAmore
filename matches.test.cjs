const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.listeners = {}; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  setAttribute(name, value) { this.attributes[name] = value; }
}
const grid = new Element('div');
const listeners = {};
let openedPlayer;
const context = vm.createContext({
  openPlayerCard: player => { openedPlayer = player.name; },
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
const expected = [["Vasilis", "fabian", "Iacob", "Giorgios", "Alexandre", "Mostafa", "Andreeas"], ["Ronaldo", "Manuel", "Levi", "Jack", "Nikita", "Yahya", "gabi"], ["Shahrom", "Raul", "Momo", "Ali", "Paolo", "davideb", "Lucas"], ["Hay", "Loay", "David", "Martin", "Marco", "Johny", "Chris"]];
const config = JSON.parse(vm.runInContext('JSON.stringify(currentMatch)', context));
assert.deepEqual(config.teams, expected);
assert.equal(config.date, '2026-10-18');
assert.deepEqual(config.captains, ['Giorgios', 'Jack', 'Shahrom', 'Loay']);
assert.equal(new Set(config.teams.flat()).size, 28);
assert(!config.teams.flat().includes('Dejan'));
assert(config.teams[2].includes('Raul'));
assert(config.teams[0].includes('Giorgios') && config.teams[0].includes('Vasilis'));
assert.deepEqual([...config.teams[3]].sort(), ['Loay','Martin','Chris','Hay','Marco','Johny','David'].sort());
const descendants = element => [element, ...element.children.flatMap(descendants)];
const lineups = () => grid.children.map(card => descendants(card).filter(e => e.className === 'match-player-name').map(e => e.textContent));
assert.deepEqual(lineups(), expected);
const players = vm.runInContext('players', context);
const before = JSON.stringify(players);
const originalCards = grid.children;
listeners['ratings-updated']();
assert.equal(grid.children, originalCards);
assert.equal(JSON.stringify(players), before);
for (const [i, card] of grid.children.entries()) {
 const all = descendants(card);
 assert.equal(all.filter(e => e.className === 'match-captain').length, 1);
 const photo = all.find(e => e.className === 'match-photo' && e.children.some(c => c.className === 'match-captain'));
 assert.equal(photo.children[0].attributes['aria-label'], `View ${config.captains[i]} player card`);
 assert.equal(all.filter(e => e.className === 'match-points').length, 0);
 assert.equal(all.filter(e => e.className === 'match-champions').length, 0);
}
const raul = descendants(grid).find(e => e.attributes['aria-label'] === 'View Raul player card');
assert.equal(raul.tag, 'button');
raul.listeners.click(); assert.equal(openedPlayer, 'Raul');
vm.runInContext("players.find(p => p.name === 'Hay').elo += 400; players.find(p => p.name === 'Hay').rating = 5;", context);
listeners['ratings-updated']();
assert.notEqual(grid.children, originalCards);
assert.deepEqual(lineups(), expected);
for (const p of players.filter(p => expected.flat().includes(p.name) && p.photo)) assert(fs.existsSync(path.join(__dirname,p.photo)));
// The completed fixture still supplies the season table, never today's new players.
vm.runInContext('const tournamentGoals = []; const tournamentAssists = [];', context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'season.js'),'utf8').split('function buildSeasonStandings')[0],context);
const old = JSON.parse(vm.runInContext('JSON.stringify(seasonFixtures[0])', context));
assert.equal(old.date, '2026-10-11');
assert(old.teams[1].includes('Dejan'));
assert(!old.teams.flat().includes('Raul'));
assert.deepEqual(old.standings.map(s=>s.team), [3,4,1,2]);
assert.deepEqual(old.standings.map(s=>s.points), [7,4,3,3]);
for (const [elo,status,color] of [[800,null,'bronze'],[1000,null,'silver'],[1200,null,'gold'],[1000,'Legendary','legendary']]) {
 const item=vm.runInContext('matchPlayer',context)({player:{name:'Border check',position:'CM',elo,rating:3,status},role:'CM'});
 assert.equal(item.children[0].children[0].className, `match-portrait ${color}`);
}
console.log('Passed: current lineups, fixed team, paired players, captains, cards, read-only ratings, live refresh, and preserved historical season record.');
