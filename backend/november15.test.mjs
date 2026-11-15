import fs from 'node:fs';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';import vm from 'node:vm';
const base=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');const source=fs.readFileSync(base+'/backend/worker.js','utf8');const {Rankings}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const before=process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2],'utf8')) : {ratings:JSON.parse(vm.runInNewContext(source.split('// Keep membership')[0]+'\nJSON.stringify(seed)')),revision:100};const input=JSON.parse(fs.readFileSync(base+'/backend/november15-input.json','utf8'));const deltas={1:0,2:0,3:40,4:-40};
const data=new Map([['ratings',structuredClone(before.ratings)],['revision',before.revision],['elo-calibration:v1',true],['elo-archive-baseline',{}]]);
const storage={get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),transaction:async fn=>fn(storage)};let ready;
async function start(){const s=new Rankings({storage,blockConcurrencyWhile(fn){ready=fn();}},{APPLY_TOURNAMENT_20261115:'true'});await ready;return s;}
const service=await start();const adjustments=Object.fromEntries(input.teams.flatMap(t=>t.players.map(n=>[n,deltas[t.team]])));
for(const [name,r] of Object.entries(before.ratings)){const actual=data.get('ratings')[name];assert.equal(actual.elo,r.elo+(adjustments[name]||0),name);assert.equal(actual.calibrationDuels,r.calibrationDuels,name);assert(!r.legendary||actual.legendary,name);if(!(name in adjustments))assert.deepEqual(actual,r,name);}
assert.equal(data.get('revision'),before.revision+1);const audit=data.get('tournament:2026-11-15:placement');assert.deepEqual(audit.beforeRatings,before.ratings);assert.equal(audit.teams.find(t=>t.team===3).calculatedDelta,20);assert.equal(audit.teams.find(t=>t.team===3).delta,40);assert.deepEqual(audit.adjustments,adjustments);
const after=structuredClone(data.get('ratings'));await start();assert.deepEqual(data.get('ratings'),after);assert.equal(data.get('revision'),before.revision+1);
const changed=data.get('ratings');changed.Loay.elo+=7;await storage.put('ratings',changed);await start();assert.equal(data.get('ratings').Loay.elo,after.Loay.elo+7,'Subsequent duel preserved');
const api=await(await service.fetch(new Request('https://test/tournament-placement?date=2026-11-15'))).json();assert.deepEqual(api.adjustments,adjustments);
// Check additive season points/MP while all historical goals and assists remain intact.
const context=vm.createContext({RATINGS_API:'',localStorage:{getItem:()=>null}});
vm.runInContext(fs.readFileSync(base+'/players.js','utf8').split('const grid =')[0],context);
vm.runInContext(fs.readFileSync(base+'/matches.js','utf8').split('function positionCost')[0],context);
vm.runInContext(fs.readFileSync(base+'/goals.js','utf8').split('function combinedContributions')[0],context);
vm.runInContext(fs.readFileSync(base+'/season.js','utf8').split('function renderSeason')[0],context);
const prior=JSON.parse(vm.runInContext('JSON.stringify(buildSeasonStandings(seasonFixtures.filter(f=>f.date!=="2026-11-15"),players))',context));const next=JSON.parse(vm.runInContext('JSON.stringify(buildSeasonStandings(seasonFixtures,players))',context));
const old=new Map(prior.map(r=>[r.player.name,r]));const points=Object.fromEntries(input.teams.flatMap(t=>t.players.map(n=>[n,t.points])));
for(const r of next){const b=old.get(r.player.name)||{points:0,goals:0,assists:0,mp:0};assert.equal(r.points,b.points+(points[r.player.name]||0),r.player.name);assert.equal(r.mp,b.mp+(r.player.name in points?3:0),r.player.name);assert.equal(r.goals,b.goals);assert.equal(r.assists,b.assists);}
assert.equal(next.filter(r=>r.player.name in points).length,28);
console.log('Passed: +40/0/0/-40 applied to current Elo exactly once; all other records/counters/honors preserved; audit, restart and intervening duel checks; 28 season point/MP updates; historical goals/assists unchanged.');
