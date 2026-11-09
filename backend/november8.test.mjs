import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./worker.js',import.meta.url),'utf8');
const {Rankings,calculateTournamentElo,november8Input,november8CorrectedInput}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const calculation=calculateTournamentElo(november8Input);
assert.equal(november8Input.ratingRevision,1856);
assert.deepEqual(calculation.teams.map(t=>t.delta),[-40,40,-10,20]);
assert.deepEqual(calculation.teams.map(t=>t.points),[0,9,3,6]);
for(const [i,n] of [4.392191062679929,4.956930193946057,3.87494240015453,3.317012274981848].entries()) assert(Math.abs(calculation.teams[i].expectedPoints-n)<1e-10);
assert.equal(calculation.adjustments.Ali,40);assert.equal(calculation.adjustments.Teodor,-10);assert(!Object.hasOwn(calculation.adjustments,'Iacob'));
const ctx=vm.createContext({});vm.runInContext(readFileSync(new URL('../matches.js',import.meta.url),'utf8').split('function positionCost')[0],ctx);
const fixture=JSON.parse(vm.runInContext('JSON.stringify(november8Match)',ctx));
assert.equal(fixture.date,'2026-11-08');
assert.deepEqual(fixture.teams.map(t=>t.map(n=>n==='Alexandre'?'Alexander':n)),november8CorrectedInput.teams.map(t=>t.players));
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(november8Standings)',ctx)),[{team:2,points:9,champions:true},{team:4,points:6},{team:3,points:3},{team:1,points:0}]);
let data=new Map();
const storage={get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),async transaction(fn){const before=structuredClone(data);try{return await fn(storage);}catch(e){data=before;throw e;}}};
async function start(enabled,Class=Rankings){let ready;const service=new Class({storage,blockConcurrencyWhile(fn){ready=fn();}},{APPLY_TOURNAMENT_20261108:String(enabled)});await ready;return service;}
await start(false);
for(const [i,r] of Object.values(data.get('ratings')).entries()){r.elo+=i+17;r.calibrationDuels=i%11;}
data.set('revision',1900);data.set('vote:old',{points:7});data.set('mvp:2026-11-08-official:totals',{Daniel:4});data.set('tournament:2026-11-01:placement',{adjustments:{Hay:20}});
const before=structuredClone(data.get('ratings'));
let service=await start(true);
const expected=structuredClone(before);
for(const [name,delta] of Object.entries(calculation.adjustments)){expected[name].elo+=delta;expected[name].legendary ||= expected[name].elo>=1350;}
assert.deepEqual(data.get('ratings'),expected,'Apply deltas to current Elo while preserving nonparticipants, counters and honors');assert.equal(data.get('revision'),1901);
const saved=structuredClone(data.get('tournament:2026-11-08:placement'));
assert.deepEqual(saved.beforeRatings,before);assert.deepEqual(saved.afterRatings,expected);assert.deepEqual(saved.input,november8Input);assert.equal(Object.keys(saved.adjustments).length,28);
assert.deepEqual((await(await service.fetch(new Request('https://test/ratings'))).json()).tournamentAdjustments,calculation.adjustments);
assert.deepEqual(await(await service.fetch(new Request('https://test/tournament-placement?date=2026-11-08'))).json(),saved);
data.get('ratings').Ali.elo+=8;service=await start(true);assert.equal(data.get('ratings').Ali.elo,expected.Ali.elo+8);assert.equal(data.get('revision'),1901);assert.deepEqual(data.get('tournament:2026-11-08:placement'),saved);
assert.deepEqual(data.get('vote:old'),{points:7});assert.deepEqual(data.get('mvp:2026-11-08-official:totals'),{Daniel:4});
assert.deepEqual(data.get('tournament:2026-11-01:placement'),{adjustments:{Hay:20}});
data=new Map([['ratings',before],['revision',2000]]);
const invalid=source.replace('const calculation = calculateTournamentElo(november8Input);',"const calculation = calculateTournamentElo(november8Input); calculation.adjustments.MissingParticipant = 40;");
const invalidModule=await import('data:text/javascript;base64,'+Buffer.from(invalid).toString('base64'));
await assert.rejects(start(true,invalidModule.Rankings),/Missing tournament player/);assert.deepEqual(data.get('ratings'),before);assert.equal(data.get('revision'),2000);assert(!data.has('tournament:2026-11-08:placement'));
console.log('Passed: switched lineups, exact expectations/deltas, champion and points, frozen current-Elo application, atomic audit/rollback, repeat protection and unrelated records preserved.');
