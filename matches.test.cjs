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
const upcomingGrid = new Element('div');
const bench = new Element('div');
const listeners = {};
let openedPlayer;
const context = vm.createContext({
  openPlayerCard: player => { openedPlayer = player.name; },
  document: {
    createElement: tag => new Element(tag),
    querySelector: selector => {
      if (selector === '#november-8-teams') return upcomingGrid;
      if (selector === '#november-8-bench') return bench;
      assert.equal(selector, '#match-teams');
      return grid;
    },
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
assert.deepEqual(lineups(), [...expected].reverse());
const players = vm.runInContext('players', context);
const before = JSON.stringify(players);
const originalCards = grid.children;
listeners['ratings-updated']();
assert.equal(grid.children, originalCards);
assert.equal(JSON.stringify(players), before);
for (const [i, card] of grid.children.entries()) {
 const all=descendants(card);
 assert.equal(all.filter(e=>e.className==='match-player-name').length,8);
 assert.equal(all.filter(e=>e.className==='stars').length,0);
 assert.equal(all.filter(e=>e.className==='match-average').length,0);
 assert.equal(all.find(e=>e.className==='match-points').textContent, `${i === 0 ? 3 : 0} pts`);
 assert.equal(all.filter(e=>e.className==='match-champions').length,i === 0 ? 1 : 0);
 const roles=all.filter(e=>e.className==='match-position').map(e=>e.textContent.split(' ·')[0]);
 assert.deepEqual(roles,config.roles);
}
const raul = descendants(grid).find(e => e.attributes['aria-label'] === 'View Teodor player card');
assert.equal(raul.tag, 'button');
raul.listeners.click(); assert.equal(openedPlayer, 'Teodor');
vm.runInContext("players.find(p => p.name === 'Hay').elo += 400; players.find(p => p.name === 'Hay').rating = 5;", context);
listeners['ratings-updated']();
assert.notEqual(grid.children, originalCards);
assert.deepEqual(lineups(), [...expected].reverse());
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
const afterSeason = new Map(build(fixtures.slice(0, 3), players).map(e => [e.player.name, e]));
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
 const item=vm.runInContext('matchPlayer',context)({player:{name:'Border check',position:'CM',elo,rating:3,status},role:'CM'}, config, config.captains);
 assert.equal(item.children[0].children[0].className, `match-portrait ${color}`);
}
assert.equal(JSON.parse(vm.runInContext('JSON.stringify(seasonFixtures)',context)).length,5);
console.log('Passed: current lineups, fixed team, paired players, captains, cards, read-only ratings, live refresh, and preserved historical season record.');

const november = JSON.parse(vm.runInContext('JSON.stringify(seasonFixtures[3])', context));
assert.equal(november.date, '2026-11-01');
assert.equal(november.matchesPlayed, 1);
assert.deepEqual(november.standings.map(s=>s.points), [0,3]);
assert.equal(november.goals.reduce((sum,[,n])=>sum+n,0),12);
assert.equal(november.assists.reduce((sum,[,n])=>sum+n,0),8);
const beforeNovember = new Map(build(fixtures.slice(0,3),players).map(e=>[e.player.name,e]));
const afterNovember = new Map(build(fixtures.slice(0,4),players).map(e=>[e.player.name,e]));
for(const [i,team] of expected.entries()) for(const name of team) {
 const old=beforeNovember.get(name)||{points:0,mp:0,goals:0,assists:0}, now=afterNovember.get(name);
 assert.equal(now.points,old.points+(i===1?3:0));assert.equal(now.mp,old.mp+1);
 assert.equal(now.goals,old.goals+(new Map(november.goals).get(name)||0));
 assert.equal(now.assists,old.assists+(new Map(november.assists).get(name)||0));
}
console.log('November 1 verified: 16 participants, points, one appearance, 12 supplied goals and 8 assists.');

const latest = fixtures[4];
assert.equal(latest.date,'2026-11-08');assert.equal(latest.matchesPlayed,3);
assert.deepEqual(latest.standings.map(s=>[s.team,s.points]),[[2,9],[4,6],[3,3],[1,0]]);
assert(latest.teams[0].includes('Teodor'));assert(latest.teams[1].includes('Alexandros'));assert(latest.teams[2].includes('Ali'));
const afterNovember8=new Map(build(fixtures,players).map(e=>[e.player.name,e]));
const participantPoints=new Map(latest.standings.flatMap(s=>latest.teams[s.team-1].map(n=>[n,s.points])));
assert.equal(participantPoints.size,28);assert(!participantPoints.has('Iacob'));
for(const [name,points] of participantPoints){const old=afterNovember.get(name)||{points:0,mp:0,goals:0,assists:0},now=afterNovember8.get(name);assert.equal(now.points,old.points+points);assert.equal(now.mp,old.mp+3);assert.equal(now.goals,old.goals);assert.equal(now.assists,old.assists);}
for(const [name,old] of afterNovember)if(!participantPoints.has(name))assert.deepEqual(afterNovember8.get(name),old);
assert.deepEqual(upcomingGrid.children.map(c=>descendants(c).find(e=>e.tag==='h2').textContent),['Team 2','Team 4','Team 3','Team 1']);
assert.deepEqual(upcomingGrid.children.map(c=>descendants(c).find(e=>e.className==='match-points').textContent),['9 pts','6 pts','3 pts','0 pts']);
assert.deepEqual(upcomingGrid.children.map(c=>descendants(c).filter(e=>e.className==='match-champions').length),[1,0,0,0]);
console.log('November 8 verified: 28 players gain their team points and 3 MP; bench, nonparticipants, prior goals/assists preserved; champion banner and 9/6/3/0 pts render.');
