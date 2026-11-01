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
const october25Expected = [["Ahmad", "Inca", "Levi", "Samu", "Baraa", "Ali", "3rd GK"], ["Hay", "Carlo", "Omar Johny", "Steve Alex", "Johny", "Leo", "Andre"], ["Ronaldo", "davideb", "Enil", "Paolo", "Darius", "Mauro", "AlexG"], ["Obaida", "Omar", "gabi", "Alexandre", "Takunda", "Danilo", "Loay"]];
const expected = [["Ali", "Teodor", "fabian", "Omar B", "Baraa", "Paolo", "Ahmed", "Wesam"], ["Steve Alex", "Hay", "davideb", "Andreeas", "Takunda", "Nikita", "Johny", "Luka"]];
const config = JSON.parse(vm.runInContext('JSON.stringify(currentMatch)', context));
assert.deepEqual(config.teams, expected);
assert.equal(config.date,'2026-11-01');
assert.deepEqual(config.captains,[]);
assert.equal(config.showRatings,false);
assert.equal(new Set(config.teams.flat()).size,16);
assert(config.teams.some(t=>t.includes('Ahmed') && t.includes('Wesam')));
assert(!config.teams.some(t=>t.includes('fabian') && t.includes('davideb')));
assert.deepEqual(config.roles,['ST','ST','CM','CM','CB','CB','CB','GK']);
const descendants = element => [element, ...element.children.flatMap(descendants)];
const lineups = () => grid.children.map(card => descendants(card).filter(e => e.className === 'match-player-name').map(e => e.textContent));
assert.deepEqual(lineups(), expected);
const players = vm.runInContext('players', context);
const before = JSON.stringify(players);
const originalCards = grid.children;
listeners['ratings-updated']();
assert.equal(grid.children, originalCards);
assert.equal(JSON.stringify(players), before);
for (const card of grid.children) {
 const all=descendants(card);
 assert.equal(all.filter(e=>e.className==='match-player-name').length,8);
 assert.equal(all.filter(e=>e.className==='stars').length,0);
 assert.equal(all.filter(e=>e.className==='match-average').length,0);
 assert.equal(all.filter(e=>e.className==='match-points').length,0);
 assert.equal(all.filter(e=>e.className==='match-champions').length,0);
 const roles=all.filter(e=>e.className==='match-position').map(e=>e.textContent.split(' ·')[0]);
 assert.deepEqual(roles,config.roles);
}
const raul = descendants(grid).find(e => e.attributes['aria-label'] === 'View Teodor player card');
assert.equal(raul.tag, 'button');
raul.listeners.click(); assert.equal(openedPlayer, 'Teodor');
vm.runInContext("players.find(p => p.name === 'Hay').elo += 400; players.find(p => p.name === 'Hay').rating = 5;", context);
listeners['ratings-updated']();
assert.notEqual(grid.children, originalCards);
assert.deepEqual(lineups(), expected);
for (const p of players.filter(p => expected.flat().includes(p.name) && p.photo)) assert(fs.existsSync(path.join(__dirname,p.photo)));
// The first fixture keeps its historical participants and points.
vm.runInContext(fs.readFileSync(path.join(__dirname, 'goals.js'), 'utf8').split('const contributionLimits')[0], context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'season.js'),'utf8').split('function buildSeasonStandings')[0],context);
const old = JSON.parse(vm.runInContext('JSON.stringify(seasonFixtures[0])', context));
assert.equal(old.date, '2026-10-11');
assert(old.teams[1].includes('Dejan'));
assert(!old.teams.flat().includes('Raul'));
assert.deepEqual(old.standings.map(s=>s.team), [3,4,1,2]);
assert.deepEqual(old.standings.map(s=>s.points), [7,4,3,3]);
const previous = JSON.parse(vm.runInContext('JSON.stringify(seasonFixtures[1])', context));
assert.equal(previous.date, '2026-10-18');
assert(previous.teams[0].includes('Andreeas'));
assert(!previous.teams.flat().includes('Inca'));
assert.deepEqual(previous.standings.map(s=>s.team), [4,2,1,3]);
assert.deepEqual(previous.standings.map(s=>s.points), [7,4,3,3]);
const today = JSON.parse(vm.runInContext('JSON.stringify(seasonFixtures[2])', context));
assert.equal(today.date, '2026-10-25');
assert.equal(today.goals.length, 10);
assert.equal(today.goals.reduce((sum, [, n]) => sum + n, 0), 25);
assert.equal(today.assists.reduce((sum, [, n]) => sum + n, 0), 17);
for (const [name] of [...today.goals, ...today.assists]) assert(october25Expected.flat().includes(name));
assert.deepEqual(today.teams, october25Expected);
assert.deepEqual(today.standings.map(s => [s.team, s.points]), [[1,7],[4,6],[3,4],[2,0]]);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'season.js'), 'utf8').split('function renderSeason')[0].split('function buildSeasonStandings')[1].replace(/^/, 'function buildSeasonStandings'), context);
const build = vm.runInContext('buildSeasonStandings', context);
const fixtures = JSON.parse(vm.runInContext('JSON.stringify(seasonFixtures)', context));
const beforeSeason = new Map(build(fixtures.slice(0, 2), players).map(e => [e.player.name, e]));
const afterSeason = new Map(build(fixtures, players).map(e => [e.player.name, e]));
for (const [teamIndex, team] of october25Expected.entries()) for (const name of team) {
 const before = beforeSeason.get(name) || { points: 0, mp: 0, goals: 0, assists: 0 };
 const after = afterSeason.get(name);
 assert.equal(after.points, before.points + [7,0,4,6][teamIndex]);
 assert.equal(after.mp, before.mp + 3);
 assert.equal(after.goals, before.goals + (new Map(today.goals).get(name) || 0));
 assert.equal(after.assists, before.assists + (new Map(today.assists).get(name) || 0));
}
for (const [name, before] of beforeSeason) if (!october25Expected.flat().includes(name)) assert.deepEqual(afterSeason.get(name), before);
for (const [elo,status,color] of [[800,null,'bronze'],[1000,null,'silver'],[1200,null,'gold'],[1000,'Legendary','legendary']]) {
 const item=vm.runInContext('matchPlayer',context)({player:{name:'Border check',position:'CM',elo,rating:3,status},role:'CM'});
 assert.equal(item.children[0].children[0].className, `match-portrait ${color}`);
}
assert.equal(JSON.parse(vm.runInContext('JSON.stringify(seasonFixtures)',context)).length,3);
console.log('Passed: current lineups, fixed team, paired players, captains, cards, read-only ratings, live refresh, and preserved historical season record.');
