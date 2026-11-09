const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({});
vm.runInContext(fs.readFileSync('players.js','utf8').split('let ratingState')[0],c);
vm.runInContext('const players=roster.map(([name],rosterOrder)=>({name,rosterOrder}));',c);
vm.runInContext(fs.readFileSync('matches.js','utf8').split('function positionCost')[0],c);
vm.runInContext(fs.readFileSync('goals.js','utf8').split('const contributionLimits')[0],c);
vm.runInContext(fs.readFileSync('season.js','utf8').split('function renderSeason')[0],c);
const read=s=>JSON.parse(vm.runInContext(`JSON.stringify(${s})`,c));
const fixture=read('seasonFixtures.at(-1)');assert.equal(fixture.date,'2026-11-08');
assert.equal(fixture.goals.length,12);assert.equal(fixture.assists.length,11);
assert.equal(fixture.goals.reduce((sum,[,n])=>sum+n,0),32);
assert.equal(fixture.assists.reduce((sum,[,n])=>sum+n,0),25);
for(const entries of [fixture.goals,fixture.assists]){assert.equal(new Set(entries.map(e=>e[0])).size,entries.length);for(const [name] of entries) assert(fixture.teams.flat().includes(name),name);}
const actual=read('buildSeasonStandings(seasonFixtures,players)');
const prior=read('buildSeasonStandings(seasonFixtures.map((f,i)=>i===seasonFixtures.length-1?{...f,goals:[],assists:[]}:f),players)');
for(const a of actual){const b=prior.find(e=>e.player.name===a.player.name);assert.equal(a.points,b.points);assert.equal(a.mp,b.mp);assert.equal(a.goals,b.goals+(new Map(fixture.goals).get(a.player.name)||0));assert.equal(a.assists,b.assists+(new Map(fixture.assists).get(a.player.name)||0));}
const combined=new Map(read('combinedContributions(tournamentGoals,currentTournamentGoals,october25Goals,november1Goals,november8Goals)'));
for(const a of actual) assert.equal(a.goals,combined.get(a.player.name)||0);
assert.equal(new Map(fixture.assists).get('Ali K'),1);assert.equal(new Map(fixture.assists).get('Ali'),undefined);
console.log('Verified Nov 8: 32 goals, 25 assists, participant/name mapping, Stats/season agreement, unchanged points and appearances.');
