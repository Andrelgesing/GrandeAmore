const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({RATINGS_API:'',localStorage:{getItem:()=>null}});
const read=f=>fs.readFileSync(__dirname+'/'+f,'utf8');
vm.runInContext(read('players.js').split('const grid =')[0],c);
vm.runInContext(read('goals.js').split('const contributionLimits')[0],c);
vm.runInContext(read('matches.js').split('function positionCost')[0],c);
vm.runInContext(read('season.js').split('function renderSeason')[0],c);
const expectedGoals={fabian:4,Philipp:4,Loay:3,Shahrom:3,Iacob:2,Samu:2,Daniel:2,'Davide Polli':2,Baraa:1};
const expectedAssists={'Davide Polli':5,Mostafa:4,Iacob:3,Loay:2,Takunda:2,Giorgios:2,Andreeas:1,Shahrom:1,Philipp:1,Baraa:1,Jack:1};
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(Object.fromEntries(november15Goals))',c)),expectedGoals);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(Object.fromEntries(november15Assists))',c)),expectedAssists);
const get=x=>JSON.parse(vm.runInContext('JSON.stringify('+x+')',c));
const before=get('buildSeasonStandings(seasonFixtures.map(f=>f.date==="2026-11-15"?{...f,goals:[],assists:[]}:f),players)');const after=get('buildSeasonStandings(seasonFixtures,players)');
for(const a of after){const b=before.find(x=>x.player.name===a.player.name);assert.equal(a.goals,b.goals+(expectedGoals[a.player.name]||0));assert.equal(a.assists,b.assists+(expectedAssists[a.player.name]||0));assert.equal(a.points,b.points);assert.equal(a.mp,b.mp);}
assert.equal(Object.values(expectedGoals).reduce((a,b)=>a+b),23);assert.equal(Object.values(expectedAssists).reduce((a,b)=>a+b),23);
assert(read('goals.js').includes('november8Goals, november15Goals)'));assert(read('goals.js').includes('november8Assists, november15Assists)'));
console.log('Passed: all confirmed player totals, 23 goals and assists, Stats aggregation, season increments, points and MP preserved.');
